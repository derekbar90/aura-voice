import argparse
import json
import os
import time

from tqdm.auto import tqdm as base_tqdm

from huggingface_hub import HfApi, hf_hub_download

try:
    from huggingface_hub.hf_api import RepoFile
except Exception:  # pragma: no cover - optional import for older versions
    RepoFile = None


def emit(payload: dict) -> None:
    print(f"MODEL_DOWNLOAD {json.dumps(payload)}", flush=True)


class ModelTqdm(base_tqdm):
    current_file = None
    file_base = 0
    total_bytes = 0
    started_at = None
    last_update_at = None
    last_downloaded = 0
    avg_rate = None
    current_file_total = None

    def __init__(self, *args, **kwargs):
        kwargs.setdefault("disable", False)
        kwargs.setdefault("mininterval", 0.2)
        kwargs.setdefault("miniters", 1)
        kwargs.setdefault("smoothing", 0.0)
        super().__init__(*args, **kwargs)

    def update(self, n=1):
        result = super().update(n)
        if self.total_bytes and self.started_at:
            downloaded = self.file_base + self.n
            now = time.time()
            elapsed = max(now - self.started_at, 1e-6)
            rate = downloaded / elapsed
            if self.last_update_at is not None:
                window = max(now - self.last_update_at, 1e-6)
                instant_rate = (downloaded - self.last_downloaded) / window
                if instant_rate > 0:
                    if self.avg_rate is None:
                        self.avg_rate = instant_rate
                    else:
                        self.avg_rate = (self.avg_rate * 0.85) + (instant_rate * 0.15)
            if self.avg_rate:
                rate = self.avg_rate
            remaining = max(self.total_bytes - downloaded, 0)
            eta_seconds = int(remaining / rate) if rate > 0 else None
            percent = int((downloaded / self.total_bytes) * 100)
            emit(
                {
                    "percent": percent,
                    "downloadedBytes": int(downloaded),
                    "totalBytes": int(self.total_bytes),
                    "etaSeconds": eta_seconds,
                    "currentFile": self.current_file,
                    "currentFileBytes": int(self.n),
                    "currentFileTotal": int(self.current_file_total or 0),
                }
            )
            self.last_update_at = now
            self.last_downloaded = downloaded
        return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True)
    parser.add_argument("--revision", default=None)
    args = parser.parse_args()

    os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "0")

    api = HfApi()
    repo_id = args.model
    revision = args.revision

    entries = api.list_repo_tree(repo_id, recursive=True, revision=revision)
    files = []
    for entry in entries:
        entry_type = getattr(entry, "type", None) or getattr(entry, "rtype", None)
        if entry_type == "file":
            files.append(entry)
            continue
        if RepoFile is not None and isinstance(entry, RepoFile):
            files.append(entry)
    total_bytes = sum(entry.size or 0 for entry in files)
    emit({"event": "start", "totalBytes": total_bytes})

    downloaded = 0
    started_at = time.time()

    for entry in files:
        ModelTqdm.current_file = entry.path
        ModelTqdm.file_base = downloaded
        ModelTqdm.total_bytes = total_bytes
        ModelTqdm.started_at = started_at
        ModelTqdm.current_file_total = entry.size or 0

        emit({"event": "file", "path": entry.path, "size": entry.size or 0})
        hf_hub_download(repo_id, entry.path, revision=revision, tqdm_class=ModelTqdm)
        downloaded += entry.size or 0

    emit({"event": "complete"})


if __name__ == "__main__":
    main()

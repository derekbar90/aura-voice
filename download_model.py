import argparse
import json
import os
import threading
import time

from tqdm.auto import tqdm as base_tqdm

from huggingface_hub import HfApi, hf_hub_download, constants
from huggingface_hub.file_download import repo_folder_name

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

    cache_dir = os.environ.get("HF_HUB_CACHE", constants.HF_HUB_CACHE)
    repo_folder = repo_folder_name(repo_id=repo_id, repo_type="model")
    blobs_dir = os.path.join(cache_dir, repo_folder, "blobs")

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

        stop_event = threading.Event()
        last_size = -1

        blob_id = getattr(entry, "blob_id", None)
        blob_path = os.path.join(blobs_dir, blob_id) if blob_id else None
        incomplete_path = f"{blob_path}.incomplete" if blob_path else None

        def find_latest_incomplete() -> str | None:
            if not blobs_dir or not os.path.isdir(blobs_dir):
                return None
            try:
                candidates = [
                    os.path.join(blobs_dir, name)
                    for name in os.listdir(blobs_dir)
                    if name.endswith(".incomplete")
                ]
            except OSError:
                return None
            if not candidates:
                return None
            return max(candidates, key=lambda path: os.path.getmtime(path))

        def poll_progress():
            nonlocal last_size
            while not stop_event.is_set():
                size = None
                fallback_incomplete = None
                if incomplete_path is None and blob_path is None:
                    fallback_incomplete = find_latest_incomplete()

                for path in (incomplete_path, fallback_incomplete, blob_path):
                    if path and os.path.exists(path):
                        try:
                            size = os.path.getsize(path)
                            break
                        except OSError:
                            size = None
                if size is not None and size != last_size:
                    last_size = size
                    emit(
                        {
                            "percent": int((downloaded + size) / total_bytes * 100)
                            if total_bytes
                            else 0,
                            "downloadedBytes": int(downloaded + size),
                            "totalBytes": int(total_bytes),
                            "currentFile": entry.path,
                            "currentFileBytes": int(size),
                            "currentFileTotal": int(entry.size or 0),
                        }
                    )
                stop_event.wait(0.5)

        poller = threading.Thread(target=poll_progress, daemon=True)
        poller.start()
        try:
            hf_hub_download(
                repo_id, entry.path, revision=revision, tqdm_class=ModelTqdm
            )
        finally:
            stop_event.set()
            poller.join(timeout=1)
        downloaded += entry.size or 0

    emit({"event": "complete"})


if __name__ == "__main__":
    main()

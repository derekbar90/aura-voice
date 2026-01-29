import argparse
import json
import time

from huggingface_hub import HfApi, hf_hub_download


def emit(payload: dict) -> None:
    print(f"MODEL_DOWNLOAD {json.dumps(payload)}", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", required=True)
    parser.add_argument("--revision", default=None)
    args = parser.parse_args()

    api = HfApi()
    repo_id = args.model
    revision = args.revision

    files = [
        entry
        for entry in api.list_repo_tree(repo_id, recursive=True, revision=revision)
        if entry.type == "file"
    ]
    total_bytes = sum(entry.size or 0 for entry in files)
    emit({"event": "start", "totalBytes": total_bytes})

    downloaded = 0
    started_at = time.time()

    for entry in files:
        hf_hub_download(repo_id, entry.path, revision=revision)
        downloaded += entry.size or 0
        elapsed = max(time.time() - started_at, 1e-6)
        rate = downloaded / elapsed
        remaining = max(total_bytes - downloaded, 0)
        eta_seconds = int(remaining / rate) if rate > 0 else None
        percent = int((downloaded / total_bytes) * 100) if total_bytes else 0
        emit(
            {
                "percent": percent,
                "downloadedBytes": downloaded,
                "totalBytes": total_bytes,
                "etaSeconds": eta_seconds,
            }
        )

    emit({"event": "complete"})


if __name__ == "__main__":
    main()

import os
import sys
from pathlib import Path

def verify_structure(root_path: Path):
    print(f"Verifying bundle structure at: {root_path}")
    
    required_paths = [
        "Qwen3-TTS-12Hz-0.6B-Base-6bit/config.json",
        ".venv/bin/python",
        "tts_server.py",
    ]
    
    missing = []
    for rel_path in required_paths:
        full_path = root_path / rel_path
        if not full_path.exists():
            missing.append(rel_path)
            print(f"[MISSING] {rel_path}")
        else:
            print(f"[OK]      {rel_path}")
            
    if missing:
        print(f"\nVerification FAILED. {len(missing)} files missing.")
        return False
    
    print("\nVerification PASSED. All critical engine files present.")
    return True

if __name__ == "__main__":
    # If run without args, check current directory
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")
    success = verify_structure(target)
    sys.exit(0 if success else 1)


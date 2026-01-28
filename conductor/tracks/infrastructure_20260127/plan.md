# Implementation Plan: Project Infrastructure Verification & Packaging

## Phase 1: Python Engine Verification [checkpoint: 1128c7f]
- [x] Task: Set up `pytest` infrastructure and coverage reporting. b1c58ad
- [x] Task: Implement health-check tests for `tts_server.py`. b6874b6
    - [x] Write tests for model loading and health endpoint.
    - [x] Implement health check logic.
- [x] Task: Implement verification tests for `mlx_audio` integration. 26344de
    - [x] Write tests for audio generation functionality.
    - [x] Ensure `HF_HUB_OFFLINE=1` is correctly utilized in tests.
- [ ] Task: Conductor - User Manual Verification 'Python Engine Verification' (Protocol in workflow.md)

## Phase 2: Electron Bridge & Service Verification [checkpoint: 55ff5ce]
- [x] Task: Implement unit tests for `TtsService.ts`. 7adb14b
    - [ ] Write tests for CLI argument generation.
    - [ ] Mock `spawn` to verify environment variables (HF_HUB_OFFLINE, PYTHONPATH).
- [x] Task: Implement unit tests for `PythonService.ts` and `VoiceService.ts`. 91ae818
- [ ] Task: Conductor - User Manual Verification 'Electron Bridge & Service Verification' (Protocol in workflow.md)

## Phase 3: Packaging Configuration & Verification
- [x] Task: Audit and update `electron-builder.json5` for macOS. 6f56b7b
    - [ ] Ensure all necessary assets and scripts are included in the bundle.
- [ ] Task: Configure the bundling of the Python `.venv` or equivalent distribution method.
- [ ] Task: Create a post-build verification script to check the integrity of the packaged app.
- [ ] Task: Conductor - User Manual Verification 'Packaging Configuration & Verification' (Protocol in workflow.md)

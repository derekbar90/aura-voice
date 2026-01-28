# Implementation Plan: Project Infrastructure Verification & Packaging

## Phase 1: Python Engine Verification
- [x] Task: Set up `pytest` infrastructure and coverage reporting. b1c58ad
- [x] Task: Implement health-check tests for `tts_server.py`. b6874b6
    - [x] Write tests for model loading and health endpoint.
    - [x] Implement health check logic.
- [ ] Task: Implement verification tests for `mlx_audio` integration.
    - [ ] Write tests for audio generation functionality.
    - [ ] Ensure `HF_HUB_OFFLINE=1` is correctly utilized in tests.
- [ ] Task: Conductor - User Manual Verification 'Python Engine Verification' (Protocol in workflow.md)

## Phase 2: Electron Bridge & Service Verification
- [ ] Task: Implement unit tests for `TtsService.ts`.
    - [ ] Write tests for CLI argument generation.
    - [ ] Mock `spawn` to verify environment variables (HF_HUB_OFFLINE, PYTHONPATH).
- [ ] Task: Implement unit tests for `PythonService.ts` and `VoiceService.ts`.
- [ ] Task: Conductor - User Manual Verification 'Electron Bridge & Service Verification' (Protocol in workflow.md)

## Phase 3: Packaging Configuration & Verification
- [ ] Task: Audit and update `electron-builder.json5` for macOS.
    - [ ] Ensure all necessary assets and scripts are included in the bundle.
- [ ] Task: Configure the bundling of the Python `.venv` or equivalent distribution method.
- [ ] Task: Create a post-build verification script to check the integrity of the packaged app.
- [ ] Task: Conductor - User Manual Verification 'Packaging Configuration & Verification' (Protocol in workflow.md)

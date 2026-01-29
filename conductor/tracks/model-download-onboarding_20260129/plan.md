# Implementation Plan: Model Download Onboarding & Progress UX

## Phase 1: Download Orchestration & IPC
- [x] Task: Define download state and lifecycle events in main process (start, progress, pause, cancel, error) 69bc85d
- [x] Task: Add IPC channels for download status + controls (start/pause/cancel/retry) ed62e48
- [x] Task: Implement download manager integration with model fetch (progress %, bytes, ETA) c01bb3c
- [x] Task: Add unit tests for download state transitions and IPC handlers bfb4848
- [ ] Task: Conductor - User Manual Verification 'Download Orchestration & IPC' (Protocol in workflow.md)

## Phase 2: Onboarding UI + Footer Status
- [ ] Task: Build onboarding download screen with progress, ETA, "why" copy, pause/cancel
- [ ] Task: Allow app exploration during onboarding while download runs
- [ ] Task: Implement blocking error state with Retry on failure
- [ ] Task: Surface download status in main footer status line
- [ ] Task: Add UI tests / component tests for onboarding states
- [ ] Task: Conductor - User Manual Verification 'Onboarding UI + Footer Status' (Protocol in workflow.md)

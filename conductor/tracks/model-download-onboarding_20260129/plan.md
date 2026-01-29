# Implementation Plan: Model Download Onboarding & Progress UX

## Phase 1: Download Orchestration & IPC [checkpoint: 7364b16]
- [x] Task: Define download state and lifecycle events in main process (start, progress, pause, cancel, error) 69bc85d
- [x] Task: Add IPC channels for download status + controls (start/pause/cancel/retry) ed62e48
- [x] Task: Implement download manager integration with model fetch (progress %, bytes, ETA) c01bb3c
- [x] Task: Add unit tests for download state transitions and IPC handlers bfb4848
- [ ] Task: Conductor - User Manual Verification 'Download Orchestration & IPC' (Protocol in workflow.md)

## Phase 2: Onboarding UI + Footer Status
- [x] Task: Build onboarding download screen with progress, ETA, "why" copy, pause/cancel c50586a
- [x] Task: Allow app exploration during onboarding while download runs ee6bc58
- [x] Task: Implement blocking error state with Retry on failure 5c481cf
- [x] Task: Surface download status in main footer status line 0133f2f
- [ ] Task: Add UI tests / component tests for onboarding states
- [ ] Task: Conductor - User Manual Verification 'Onboarding UI + Footer Status' (Protocol in workflow.md)

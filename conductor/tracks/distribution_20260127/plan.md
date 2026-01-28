# Implementation Plan: Distribution Readiness

## Phase 1: Automated Distribution (CI/CD) [checkpoint: 9067c8d]
- [x] Task: Create `.github/workflows/release.yml` for macOS builds. e881d9e
- [x] Task: Configure environment mapping for GitHub Secrets (APPLE_ID, APPLE_ID_PASSWORD, etc.). cf2b61a
- [x] Task: Implement automated versioning and release creation logic. cf1d375
- [ ] Task: Conductor - User Manual Verification 'Automated Distribution (CI/CD)' (Protocol in workflow.md)

## Phase 2: Code Signing & Notarization (Local)
- [x] Task: Set up local environment variables for signing (`CSC_LINK`, `CSC_KEY_PASSWORD`). e8125c0
- [x] Task: Implement notarization script in `menubar-tts/electron/notarize.cjs`. 2e966ef
- [x] Task: Update `electron-builder.json5` to call the notarization script `afterSign`. da566f2
- [ ] Task: Conductor - User Manual Verification 'Code Signing & Notarization (Local)' (Protocol in workflow.md)

## Phase 3: App Store Compliance & Final Polish
- [ ] Task: Audit `entitlements.mac.plist` for App Store sandboxing requirements.
- [ ] Task: Verify high-resolution icon assets and metadata.
- [ ] Task: Conduct a final "Fresh Install" verification from a GitHub Release artifact.
- [ ] Task: Conductor - User Manual Verification 'App Store Compliance & Final Polish' (Protocol in workflow.md)
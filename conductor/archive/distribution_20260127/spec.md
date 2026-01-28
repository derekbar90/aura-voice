# Specification: Distribution Readiness

## Overview
This track focuses on preparing "Qwen3 Voice Studio" for public distribution. It covers the essential security requirements for macOS (Code Signing and Notarization) and the automation required for seamless GitHub Releases and eventual Mac App Store submission.

## Goals
- Implement secure macOS code signing using Apple Developer certificates.
- Configure automated notarization to satisfy macOS Gatekeeper requirements.
- Establish a CI/CD pipeline using GitHub Actions for automated builds and releases.
- Ensure compliance with Mac App Store guidelines (Sandboxing, Entitlements).

## Requirements
- **Security:**
    - Integration of `CSC_LINK` and `CSC_KEY_PASSWORD` for code signing.
    - Post-build notarization script using `electron-notarize` and `appleIdPassword`.
- **Automation:**
    - A GitHub Actions workflow (`.github/workflows/release.yml`) that triggers on version tags.
    - Automatic uploading of artifacts (.dmg, .zip) to GitHub Releases.
- **Compliance:**
    - Properly configured `entitlements.mac.plist`.
    - Verification of application icons and metadata.

## Acceptance Criteria
- [ ] A local build that is successfully signed and notarized.
- [ ] A functional GitHub Action that builds and creates a draft release on a new tag.
- [ ] Verified `LSUIElement` (menubar-only) and `NSMicrophoneUsageDescription` behaviors in the signed app.
- [ ] Audit report of App Store submission readiness.

# Spec: Model Download Onboarding & Progress UX

## Overview
Improve first-run experience by initiating model download during onboarding (not on first TTS action), providing clear progress and context, and surfacing status in the main UI footer. Ensure users understand what's happening and are not left waiting without feedback.

## Functional Requirements
1. Onboarding flow starts the model download once onboarding begins.
2. Onboarding UI includes:
   - progress bar with percentage and size
   - ETA
   - "why" copy (local model, privacy, first-time setup)
   - pause/cancel controls
   - ability to continue exploring the app while download runs
3. If the download fails during onboarding, show a blocking error with Retry.
4. Outside onboarding, show download/progress status in the main footer status line.
5. Download should not be delayed until "Speak Selection" is clicked.

## Non-Functional Requirements
- Provide clear user feedback throughout download and error states.
- Keep onboarding responsive while the download is in progress.
- Respect current tech stack and onboarding patterns.

## Acceptance Criteria
- On first app run, the model download starts when onboarding begins.
- The onboarding view shows progress %, ETA, "why" copy, and pause/cancel controls.
- Users can continue exploring the app while download runs.
- If download fails, the onboarding view blocks with a Retry option.
- Footer status line reflects download state outside onboarding.
- "Speak Selection" does not trigger the initial model download.

## Out of Scope
- Bundling the model into the app package.
- Changes to the model or backend inference logic beyond download flow.

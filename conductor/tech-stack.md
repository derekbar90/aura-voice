# Technology Stack

## Core Engine (Python)
- **Language:** Python >= 3.14
- **Inference Framework:** [MLX](https://github.com/ml-explore/mlx) (Optimized for Apple Silicon)
- **TTS Library:** [mlx-audio](https://github.com/Blaizzy/mlx-audio)
- **Model:** Qwen3-TTS-12Hz-0.6B (6-bit quantized)
- **Environment Management:** [uv](https://github.com/astral-sh/uv)

## Desktop Application (Electron)
- **Shell:** Electron
- **Framework:** React 18 (TypeScript)
- **Build Tool:** Vite
- **Package Manager:** npm
- **Distribution:** electron-builder

## Styling & UI
- **CSS:** Tailwind CSS
- **Processor:** PostCSS
- **Icons:** Native SVG templates (macOS menubar compatible)

## Development Workflow
- **Linting:** ESLint (TS/React), Ruff (Python)
- **Formatting:** Prettier (TS), Ruff (Python)
- **Inference Strategy:** Local-only, utilizing `HF_HUB_OFFLINE=1` for privacy and performance.

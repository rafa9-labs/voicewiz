# VoiceWiz

Fully local desktop dictation with CUDA GPU acceleration. No cloud services, no accounts, no data leaves your PC.

## Features

- **100% Local** — Whisper.cpp runs on your machine. No API keys, no cloud accounts.
- **CUDA GPU Acceleration** — Auto-detects NVIDIA GPU at startup; falls back to CPU.
- **Push-to-Talk** — Global hotkey (Ctrl+Win by default) to start/stop dictation.
- **AI Agent** — Optional local LLM for command processing (e.g., "select all, bold, make blue").
- **Transcription History** — Searchable local database of past dictations.
- **Cross-Platform** — Windows, macOS, Linux.

## Download

Grab the latest installer from the [Releases page](https://github.com/rafa9-labs/voicewiz/releases).

### Windows

Download `VoiceWiz Setup X.X.X.exe` and run it. SmartScreen may show a warning (the installer is unsigned; click "More info" → "Run anyway").

### macOS / Linux

Pre-built installers are also available on the Releases page for each platform.

## Quick Start

1. Install VoiceWiz and launch it.
2. The **First-Run Wizard** will walk you through downloading a speech recognition model.
   - **Base** (142MB) is recommended — good balance of speed and accuracy.
   - For better accuracy choose **Small** (466MB) or **Turbo** (1.6GB).
3. After the model downloads, the main app opens.
4. Press **Ctrl+Win** (default hotkey) to start dictating. Press again to stop and paste.
5. To change settings or pick a different model, open the Control Panel from the system tray.

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | Any x64 | Any x64 |
| RAM | 4GB | 8GB+ |
| Storage | 500MB free | 2GB+ free (for models) |
| GPU (optional) | — | NVIDIA with 4GB+ VRAM |
| OS | Windows 10+, macOS 13+, Linux (x64) | Windows 11 |

## Building from Source

Requires Node.js 24.

```bash
git clone https://github.com/rafa9-labs/voicewiz.git
cd voicewiz
npm install

# Development (requires existing whisper binary)
npm run dev

# Production build (Windows)
npm run build:win

# Production build (macOS)
npm run build:mac

# Production build (Linux)
npm run build:linux
```

### Build Output

- `dist/win-unpacked/` — Unpacked app directory (portable).
- `dist/VoiceWiz Setup X.X.X.exe` — NSIS installer (Windows).

### Prebuild Scripts

Before packaging, the `prebuild` scripts download all required binaries:

- `whisper-cpp` (CPU inference)
- `whisper-cuda` (GPU-accelerated inference, ~1.2GB)
- `sherpa-onnx` (NVIDIA Parakeet support)
- `llama-server` (local LLM for AI agent)
- `qdrant` (local semantic search)
- Native key listeners and utilities

These are also available as individual npm scripts:

```bash
npm run download:whisper-cpp
npm run download:cuda-whisper:resources
npm run download:sherpa-onnx
```

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Vite
- **Desktop**: Electron 41
- **Speech**: Whisper.cpp (local), NVIDIA Parakeet (local), OpenAI API (optional cloud)
- **AI Agent**: Llama.cpp (local), OpenAI/Anthropic/Gemini (optional cloud)
- **Search**: Qdrant vector DB + ONNX MiniLM embeddings (local semantic search)
- **Database**: SQLite via better-sqlite3

## License

MIT © Rafael (rafa9-labs)

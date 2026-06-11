# VoiceWiz — Fully Local Voice Dictation

100% offline, zero cloud dependencies. Speak → Transcribe → Paste at cursor.  
Press **Win+Ctrl**, speak, release. Your words appear where you're typing.

No API keys. No accounts. No data leaves your machine.

---

## Quick Start (3 commands)

```
git clone https://github.com/rafa9-labs/voicewiz.git
cd voicewiz
npm install
```

Then download the whisper model and CUDA binary:

```
npm run download:whisper-cpp
npm run download:cuda-whisper
```

Create `.env` in the project root:

```
WHISPER_CUDA_ENABLED=true
```

Launch:

```
npm run dev
```

Press **Win+Ctrl** to dictate. The mic button turns red when recording.

> **First launch**: Go to Settings → Speech-to-Text to download a whisper model  
> (turbo — 1.5GB recommended). The app preloads it on startup so subsequent  
> dictation is instant.

---

## GPU / CUDA

CUDA acceleration drops transcription time from 30-60s (CPU) to <1s (GPU).

| Command | What it does |
|---------|-------------|
| `npm run download:cuda-whisper` | Downloads CUDA whisper-server + DLLs |
| Set `WHISPER_CUDA_ENABLED=true` in `.env` | Enables GPU inference |

Works on NVIDIA GPUs with 4GB+ VRAM (tested on RTX 2070 Super 8GB, RTX 3090 24GB).

---

## Models

| Model | Size | VRAM (GPU) | Speed | Accuracy |
|-------|------|-----------|-------|----------|
| `tiny` | 75 MB | ~113 MB | Fastest | Basic |
| `base` | 142 MB | ~213 MB | Fast | Good |
| `small` | 466 MB | ~700 MB | Balanced | Better |
| `turbo` | 1.5 GB | ~2.4 GB | Fast | Near-best |
| `large` | 3 GB | ~4.5 GB | Slower | Best |

**Recommendation**: `turbo` for 8GB+ GPUs. `small` for 4GB GPUs or instant-first setups.

All models run locally — no cloud, no API, no internet.

---

## Customizations (over upstream OpenWhispr)

- **All cloud/paid features removed** — no API URLs, no billing, no telemetry
- **CUDA optimized pipeline** — keep-alive HTTP, auto thread config, no-context mode
- **On-screen recording HUD** — visual indicator while recording
- **VAD disabled for push-to-talk** — faster dictation (no silence scanning)
- **Benchmark script** — `node scripts/benchmark-pipeline.js` measures your GPU speed
- **Test suite** — `npm run test` (13 tests), `npm run typecheck`

---

## Benchmarks

Run the pipeline benchmark to measure your hardware:

```
node scripts/benchmark-pipeline.js
```

Example output (RTX 3090, turbo model):
```
Avg infer:  1ms
Status:     GPU (CUDA)
Server:     1443ms startup
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `cuda: false` in startup log | CUDA binary not in `%APPDATA%/open-whispr/bin/` — run `npm run download:cuda-whisper` |
| `OpenWhispr API URL not configured` | Fixed in this fork — returns local defaults silently |
| Slow transcription (30s+) | CUDA not enabled — check `.env` has `WHISPER_CUDA_ENABLED=true` |
| No audio detected | Check microphone permissions in Windows Settings |
| Hotkey not working | Try restarting the app; Win+Ctrl is reserved but should work |

---

## Requirements

- **OS**: Windows 10/11 (x64) · macOS · Linux
- **Node.js**: v24+
- **GPU**: NVIDIA (optional, for CUDA) — 4GB+ VRAM recommended
- **Disk**: ~2GB for models + binary

---

## License

MIT — based on [OpenWhispr](https://github.com/OpenWhispr/openwhispr).

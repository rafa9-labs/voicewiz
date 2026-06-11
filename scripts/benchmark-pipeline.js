#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const os = require("os");
const http = require("http");
const { execSync, spawn } = require("child_process");

const APP_DATA = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
const USER_DATA = path.join(APP_DATA, "open-whispr");
const BIN_DIR = path.join(USER_DATA, "bin");
const MODELS_DIR = path.join(os.homedir(), ".cache", "openwhispr", "whisper-models");
const RESOURCES_BIN = path.resolve(__dirname, "..", "resources", "bin");

// Resolve whisper-server binary (CUDA first, then CPU)
function findWhisperBinary() {
  const candidates = [
    path.join(BIN_DIR, "whisper-server-win32-x64-cuda.exe"),
    path.join(BIN_DIR, "whisper-server-linux-x64-cuda"),
    path.join(RESOURCES_BIN, "whisper-server-win32-x64.exe"),
    path.join(RESOURCES_BIN, "whisper-server-linux-x64"),
    path.join(RESOURCES_BIN, "whisper-server-darwin-arm64"),
    path.join(RESOURCES_BIN, "whisper-server-darwin-x64"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

// Find a model file
function findModel() {
  const models = ["ggml-large-v3-turbo.bin", "ggml-small.bin", "ggml-base.bin", "ggml-tiny.bin"];
  for (const m of models) {
    const modelPath = path.join(MODELS_DIR, m);
    if (fs.existsSync(modelPath)) return { name: m.replace("ggml-", "").replace(".bin", ""), path: modelPath, size: fs.statSync(modelPath).size };
  }
  return null;
}

// Find available port
function findPort(start = 8178) {
  const net = require("net");
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(start, "127.0.0.1", () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on("error", () => {
      if (start < 8199) resolve(findPort(start + 1));
      else reject(new Error("No ports available"));
    });
  });
}

// Generate a synthetic test WAV file (16kHz mono, sine wave simulating speech)
function generateTestWav(outputPath, durationSec = 3) {
  const sampleRate = 16000;
  const numSamples = sampleRate * durationSec;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = numSamples * numChannels * (bitsPerSample / 8);

  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);

  // fmt chunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // chunk size
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 30);
  buffer.writeUInt16LE(bitsPerSample, 32);

  // data chunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Fill with speech-simulating audio: alternating frequency sine waves
  const frequencies = [200, 400, 600, 800, 300, 500, 700];
  let sampleIdx = 0;
  for (let i = 0; i < numSamples; i++) {
    const segmentIndex = Math.floor(i / (sampleRate * 0.3));
    const freq = frequencies[segmentIndex % frequencies.length];
    const t = i / sampleRate;
    const amplitude = 0.5;
    const value = Math.sin(2 * Math.PI * freq * t) * amplitude * 32767;
    buffer.writeInt16LE(Math.round(value), 44 + sampleIdx);
    sampleIdx += 2;
  }

  fs.writeFileSync(outputPath, buffer);
  return { path: outputPath, durationSec, sizeBytes: buffer.length };
}

// HTTP health check
function healthCheck(port) {
  return new Promise((resolve) => {
    const req = http.request({ hostname: "127.0.0.1", port, path: "/", method: "GET", timeout: 2000 }, (res) => {
      resolve(true);
      res.resume();
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => { req.destroy(); resolve(false); });
    req.end();
  });
}

// Wait for server ready
async function waitForReady(port, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await healthCheck(port)) return true;
    await new Promise(r => setTimeout(r, 200));
  }
  return false;
}

// Send audio to whisper-server for transcription
function transcribe(port, wavPath, language = "en") {
  return new Promise((resolve, reject) => {
    const boundary = "----WhisperBenchmark";
    const wavBuffer = fs.readFileSync(wavPath);
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.wav"\r\nContent-Type: audio/wav\r\n\r\n`),
      wavBuffer,
      Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\n${language}\r\n--${boundary}\r\nContent-Disposition: form-data; name="response_format"\r\n\r\njson\r\n--${boundary}--\r\n`),
    ]);

    const startTime = performance.now();
    const req = http.request({
      hostname: "127.0.0.1",
      port,
      path: "/inference",
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": body.length,
      },
      timeout: 300000,
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        const elapsed = performance.now() - startTime;
        try {
          const result = JSON.parse(data);
          resolve({ elapsed, text: result.text || "[no text]", segments: result.segments || [] });
        } catch {
          resolve({ elapsed, text: data.slice(0, 200), error: "json-parse-failed" });
        }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// --- MAIN ---
async function main() {
  console.log("╔══════════════════════════════════════╗");
  console.log("║   VoiceWiz Pipeline Benchmark        ║");
  console.log("╚══════════════════════════════════════╝");
  console.log();

  // 1. Check binaries
  const binary = findWhisperBinary();
  if (!binary) {
    console.error("ERROR: whisper-server binary not found.");
    console.error(`Looked in: ${BIN_DIR} and ${RESOURCES_BIN}`);
    console.error("Run: npm run download:whisper-cpp");
    process.exit(1);
  }
  const isCuda = binary.toLowerCase().includes("cuda");
  console.log(`[HW] Binary: ${path.basename(binary)}`);
  console.log(`[HW] CUDA:   ${isCuda ? "YES (GPU acceleration)" : "NO (CPU only)"}`);
  console.log(`[HW] CPUs:   ${os.cpus().length} logical cores`);
  console.log(`[HW] RAM:    ${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`);

  // 2. Check model
  const model = findModel();
  if (!model) {
    console.error("ERROR: No whisper model found.");
    console.error(`Looked in: ${MODELS_DIR}`);
    console.error("Download from Settings > Speech-to-Text in the app.");
    process.exit(1);
  }
  console.log(`[MODEL] ${model.name} (${Math.round(model.size / 1024 / 1024)}MB)`);
  console.log();

  // 3. Generate test audio
  console.log("[BENCH] Generating synthetic test audio (3 seconds, 16kHz mono WAV)...");
  const wavPath = path.join(os.tmpdir(), `voicewiz-bench-${Date.now()}.wav`);
  const audio = generateTestWav(wavPath, 3);

  // 4. Start whisper-server
  console.log("[BENCH] Starting whisper-server...");
  const port = await findPort();

  const child = spawn(binary, [
    "--model", model.path,
    "--host", "127.0.0.1",
    "--port", String(port),
    "--language", "en",
    ...(isCuda ? [] : ["--threads", String(Math.max(4, os.cpus().length))]),
  ], {
    stdio: "ignore",
    windowsHide: true,
  });

  const serverStartTime = performance.now();
  const ready = await waitForReady(port);
  if (!ready) {
    console.error("ERROR: whisper-server failed to start within 30s");
    child.kill();
    process.exit(1);
  }
  const serverStartupMs = Math.round(performance.now() - serverStartTime);
  console.log(`[BENCH] Server ready on port ${port} (startup: ${serverStartupMs}ms)`);
  console.log();

  // 5. Run benchmarks
  const runs = 3;
  const times = [];
  console.log(`[BENCH] Running ${runs} transcription passes...`);

  for (let i = 0; i < runs; i++) {
    const start = performance.now();
    const result = await transcribe(port, wavPath, "en");
    const totalMs = Math.round(result.elapsed);
    times.push(totalMs);
    console.log(`  Run ${i + 1}: ${totalMs}ms — "${result.text?.slice(0, 60) || "(empty)"}"`);
  }

  // 6. Stop server
  child.kill();

  // 7. Cleanup
  try { fs.unlinkSync(wavPath); } catch {}

  // 8. Results
  const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  const min = Math.min(...times);
  const max = Math.max(...times);

  console.log();
  console.log("═══════════════════════════════════════");
  console.log("  RESULTS");
  console.log("═══════════════════════════════════════");
  console.log(`  Status:     ${isCuda ? "GPU (CUDA)" : "CPU"}`);
  console.log(`  Model:      ${model.name} (${Math.round(model.size / 1024 / 1024)}MB)`);
  console.log(`  Server:     ${serverStartupMs}ms startup`);
  console.log(`  Avg infer:  ${avg}ms`);
  console.log(`  Min/Max:    ${min}ms / ${max}ms`);
  console.log();
  if (isCuda) {
    console.log("  GPU acceleration is ACTIVE.");
    if (avg < 1000) console.log("  Excellent — sub-second transcription.");
    else console.log("  Good — but check if other apps are using the GPU.");
  } else {
    console.log("  CPU-only mode. Expected: 10-60s per phrase.");
    console.log("  Run 'npm run download:cuda-whisper' to enable GPU.");
    console.log(`  Or switch to a smaller model in Settings (tiny/base).`);
  }
  console.log("═══════════════════════════════════════");

  if (avg > (isCuda ? 5000 : 60000)) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\nFATAL:", err.message);
  process.exit(1);
});

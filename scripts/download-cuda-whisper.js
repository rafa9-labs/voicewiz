#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const os = require("os");
const {
  downloadFile,
  extractZip,
  fetchLatestRelease,
  findBinaryInDir,
  setExecutable,
} = require("./lib/download-utils");

const WHISPER_CPP_REPO = "OpenWhispr/whisper.cpp";

const CUDA_BINARIES = {
  "win32-x64": {
    zipName: "whisper-server-win32-x64-cuda.zip",
    binaryName: "whisper-server-win32-x64-cuda.exe",
    outputName: "whisper-server-win32-x64-cuda.exe",
    dllPatterns: [/\.dll$/i],
  },
  "linux-x64": {
    zipName: "whisper-server-linux-x64-cuda.zip",
    binaryName: "whisper-server-linux-x64-cuda",
    outputName: "whisper-server-linux-x64-cuda",
    dllPatterns: [/\.so(\.\d+)*$/],
  },
};

function getResourcesBinDir() {
  return path.join(__dirname, "..", "resources", "bin");
}

function getOutputDir() {
  const useResources = process.argv.includes("--resources");
  if (useResources) {
    const dir = getResourcesBinDir();
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
  return path.join(appData, "open-whispr", "bin");
}

function findFiles(dir, patterns) {
  const results = [];
  function walk(currentDir) {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (patterns.some((p) => p.test(entry.name))) {
        results.push(fullPath);
      }
    }
  }
  walk(dir);
  return results;
}

async function main() {
  const platformArch = `${process.platform}-${process.arch}`;
  const config = CUDA_BINARIES[platformArch];

  if (!config) {
    console.error(`CUDA binaries not available for ${platformArch}`);
    process.exitCode = 1;
    return;
  }

  const binDir = getOutputDir();

  const outputPath = path.join(binDir, config.outputName);

  if (fs.existsSync(outputPath)) {
    console.log(`CUDA binary already exists: ${outputPath}`);
    const stats = fs.statSync(outputPath);
    console.log(`Size: ${Math.round(stats.size / 1024 / 1024)}MB`);
    return;
  }

  console.log("Fetching latest CUDA whisper release...");
  const release = await fetchLatestRelease(WHISPER_CPP_REPO);

  if (!release) {
    console.error(`Could not fetch release from ${WHISPER_CPP_REPO}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Release: ${release.tag}`);
  const asset = release.assets?.find((a) => a.name === config.zipName);
  if (!asset) {
    console.error(`Asset ${config.zipName} not found in release`);
    console.log("Available assets:", release.assets?.map((a) => a.name).join(", "));
    process.exitCode = 1;
    return;
  }

  const downloadUrl = asset.url || asset.browser_download_url;
  const sizeMb = asset.size ? ` (${Math.round(asset.size / 1024 / 1024)}MB)` : "";
  console.log(`Downloading ${config.zipName}${sizeMb}...`);
  const zipPath = path.join(binDir, config.zipName);

  try {
    await downloadFile(downloadUrl, zipPath);

    const extractDir = path.join(binDir, "cuda-extract");
    fs.mkdirSync(extractDir, { recursive: true });
    await extractZip(zipPath, extractDir);

    const binaryPath = findBinaryInDir(extractDir, config.binaryName);
    if (binaryPath) {
      fs.copyFileSync(binaryPath, outputPath);
      setExecutable(outputPath);
      console.log(`Extracted binary: ${outputPath}`);
    } else {
      console.error(`Binary ${config.binaryName} not found in archive`);
      process.exitCode = 1;
      return;
    }

    // Copy companion DLLs/SOs
    if (config.dllPatterns) {
      const companionFiles = findFiles(extractDir, config.dllPatterns);
      for (const file of companionFiles) {
        const destName = path.basename(file);
        const dest = path.join(binDir, destName);
        fs.copyFileSync(file, dest);
        console.log(`Copied: ${destName}`);
      }
    }

    fs.rmSync(extractDir, { recursive: true, force: true });
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

    console.log("\nCUDA whisper binary downloaded successfully!");
    const stats = fs.statSync(outputPath);
    console.log(`Size: ${Math.round(stats.size / 1024 / 1024)}MB`);
  } catch (error) {
    console.error(`Download failed: ${error.message}`);
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    process.exitCode = 1;
  }
}

main().catch(console.error);

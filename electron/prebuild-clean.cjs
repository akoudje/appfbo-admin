const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const unpackedDir = path.join(rootDir, "release-desktop", "win-unpacked");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stopPotentialLockingProcesses() {
  const commands = [
    'taskkill /F /IM "Forever Admin Desktop.exe" /T',
    'taskkill /F /IM "electron.exe" /T',
  ];

  for (const command of commands) {
    try {
      execSync(command, { stdio: "ignore" });
    } catch {
      // Ignore failures: process may not exist.
    }
  }
}

async function removeWithRetries(targetPath, retries = 5) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      fs.rmSync(targetPath, { recursive: true, force: true });
      return;
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      await sleep(400 * attempt);
    }
  }
}

async function run() {
  stopPotentialLockingProcesses();

  if (!fs.existsSync(unpackedDir)) {
    console.log("[desktop:clean] no win-unpacked directory to clean.");
    return;
  }

  await removeWithRetries(unpackedDir, 6);
  console.log("[desktop:clean] cleaned release-desktop/win-unpacked");
}

run().catch((error) => {
  const message = error?.message || String(error);
  console.warn(`[desktop:clean] skipped (locked): ${message}`);
  process.exit(0);
});

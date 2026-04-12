const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const releaseRoot = path.join(rootDir, "release-desktop");
const distributionDir = path.join(releaseRoot, "distribution");
const collectOnly = process.argv.includes("--collect-only");

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options,
  });

  if (result.status !== 0) {
    const rendered = `${command} ${args.join(" ")}`.trim();
    throw new Error(`Command failed (${rendered})`);
  }
}

function getLatestBuildDir() {
  if (!fs.existsSync(releaseRoot)) return null;

  const buildDirs = fs
    .readdirSync(releaseRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("build-"))
    .map((entry) => {
      const fullPath = path.join(releaseRoot, entry.name);
      const stats = fs.statSync(fullPath);
      return { name: entry.name, fullPath, mtimeMs: stats.mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return buildDirs[0]?.fullPath || null;
}

function ensureCleanDistributionDir() {
  fs.mkdirSync(distributionDir, { recursive: true });
  for (const name of fs.readdirSync(distributionDir)) {
    fs.rmSync(path.join(distributionDir, name), { recursive: true, force: true });
  }
}

function copyIfExists(sourceDir, fileName, copiedFiles) {
  const sourcePath = path.join(sourceDir, fileName);
  if (!fs.existsSync(sourcePath)) return;

  const destPath = path.join(distributionDir, fileName);
  fs.copyFileSync(sourcePath, destPath);
  copiedFiles.push(fileName);
}

function collectReleaseArtifacts() {
  const latestBuildDir = getLatestBuildDir();
  if (!latestBuildDir) {
    throw new Error("No desktop build found in release-desktop/build-*");
  }

  const files = fs.readdirSync(latestBuildDir);
  const setupExe = files.find((name) => /-Setup-.*\.exe$/i.test(name));
  if (!setupExe) {
    throw new Error(`No setup executable found in ${latestBuildDir}`);
  }

  ensureCleanDistributionDir();

  const copiedFiles = [];
  copyIfExists(latestBuildDir, setupExe, copiedFiles);
  copyIfExists(latestBuildDir, `${setupExe}.blockmap`, copiedFiles);
  copyIfExists(latestBuildDir, "latest.yml", copiedFiles);

  const manifest = {
    generatedAt: new Date().toISOString(),
    sourceBuildDir: latestBuildDir,
    files: copiedFiles,
  };

  fs.writeFileSync(
    path.join(distributionDir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8"
  );

  console.log("[desktop:release] distribution ready:");
  for (const file of copiedFiles) {
    console.log(` - ${path.join(distributionDir, file)}`);
  }
  console.log(` - ${path.join(distributionDir, "manifest.json")}`);
}

function main() {
  if (!collectOnly) {
    runCommand("npm", ["run", "desktop:build"]);
  }
  collectReleaseArtifacts();
}

try {
  main();
} catch (error) {
  console.error(`[desktop:release] failed: ${error?.message || String(error)}`);
  process.exit(1);
}

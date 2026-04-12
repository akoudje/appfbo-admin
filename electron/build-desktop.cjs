const path = require("path");
const { spawnSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
const now = new Date();
const stamp = [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, "0"),
  String(now.getDate()).padStart(2, "0"),
  "-",
  String(now.getHours()).padStart(2, "0"),
  String(now.getMinutes()).padStart(2, "0"),
  String(now.getSeconds()).padStart(2, "0"),
].join("");

const outputDir = process.env.DESKTOP_BUILD_OUTPUT || `release-desktop/build-${stamp}`;

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

function main() {
  console.log(`[desktop:build] output dir: ${outputDir}`);
  runCommand("npm", ["run", "build"], {
    env: {
      ...process.env,
      VITE_APP_TARGET: "desktop",
    },
  });

  runCommand("npx", [
    "electron-builder",
    "--win",
    "nsis",
    "--x64",
    `--config.directories.output=${outputDir}`,
  ]);
}

try {
  main();
} catch (error) {
  console.error(`[desktop:build] failed: ${error?.message || String(error)}`);
  process.exit(1);
}

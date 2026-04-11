const { spawn } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");
const isWin = process.platform === "win32";

function run(cmd, args, options = {}) {
  const child = spawn(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: isWin,
    ...options,
  });
  return child;
}

const vite = run("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", "5173"]);

let electron = null;
let attempts = 0;
const maxAttempts = 60;

function tryStartElectron() {
  attempts += 1;
  fetch("http://127.0.0.1:5173")
    .then(() => {
      if (electron) return;
      electron = run("npx", ["electron", "."], {
        env: {
          ...process.env,
          ELECTRON_START_URL: "http://127.0.0.1:5173",
        },
      });
      electron.on("exit", () => {
        if (vite && !vite.killed) vite.kill();
        process.exit(0);
      });
    })
    .catch(() => {
      if (attempts < maxAttempts) {
        setTimeout(tryStartElectron, 1000);
      } else {
        console.error("Impossible de demarrer Electron: serveur Vite non accessible.");
        if (vite && !vite.killed) vite.kill();
        process.exit(1);
      }
    });
}

tryStartElectron();

process.on("SIGINT", () => {
  if (electron && !electron.killed) electron.kill();
  if (vite && !vite.killed) vite.kill();
  process.exit(0);
});


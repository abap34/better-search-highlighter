import { createReadStream, existsSync, mkdirSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { platform } from "node:os";
import { extname, normalize, resolve, sep } from "node:path";
import { spawn } from "node:child_process";

const repoRoot = resolve(import.meta.dirname, "..");
const extensionDir = resolve(repoRoot, "extension");
const devDir = resolve(repoRoot, "dev");
const profileDir = process.env.BSH_REUSE_PROFILE === "1"
  ? resolve(repoRoot, ".tmp", "chrome-dev-profile")
  : resolve(repoRoot, ".tmp", `chrome-dev-profile-${process.pid}`);

const chromePath = process.env.CHROME_PATH || findChromePath();

if (!chromePath) {
  console.error("Chrome was not found. Set CHROME_PATH to your Chrome executable.");
  process.exit(1);
}

mkdirSync(profileDir, { recursive: true });

const server = await startDevServer();
const manualTestUrl = `http://127.0.0.1:${server.port}/manual-test.html`;

console.log(`Launching Chrome: ${chromePath}`);
console.log(`Extension: ${extensionDir}`);
console.log(`Profile: ${profileDir}`);
console.log(`Test page: ${manualTestUrl}`);

const args = [
  `--user-data-dir=${profileDir}`,
  `--disable-extensions-except=${extensionDir}`,
  `--load-extension=${extensionDir}`,
  "--no-first-run",
  "--no-default-browser-check",
  "--new-window",
  manualTestUrl,
  "chrome://extensions"
];

const child = spawn(chromePath, args, {
  stdio: "inherit"
});

child.on("exit", (code, signal) => {
  server.close();
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

process.on("SIGINT", () => {
  server.close();
  child.kill("SIGINT");
});

process.on("SIGTERM", () => {
  server.close();
  child.kill("SIGTERM");
});

async function startDevServer() {
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const pathname = url.pathname === "/" ? "/manual-test.html" : url.pathname;
    const filePath = resolve(devDir, `.${decodeURIComponent(pathname)}`);

    if (!isPathInside(filePath, devDir) || !existsSync(filePath) || !statSync(filePath).isFile()) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "content-type": contentTypeFor(filePath),
      "cache-control": "no-store"
    });
    createReadStream(filePath).pipe(response);
  });

  await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", resolveListen);
  });

  const address = server.address();
  return {
    port: address.port,
    close: () => server.close()
  };
}

function isPathInside(filePath, parentDir) {
  const normalizedParent = normalize(parentDir + sep);
  return normalize(filePath).startsWith(normalizedParent);
}

function contentTypeFor(filePath) {
  const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml"
  };
  return types[extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

function findChromePath() {
  const candidatesByPlatform = {
    darwin: [
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary"
    ],
    win32: [
      `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env["PROGRAMFILES(X86)"]}\\Google\\Chrome\\Application\\chrome.exe`,
      `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`
    ],
    linux: [
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser"
    ]
  };

  for (const candidate of candidatesByPlatform[platform()] ?? []) {
    if (candidate && existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

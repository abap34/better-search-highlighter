import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(repoRoot, "assets/icon.png");
const outputDir = resolve(repoRoot, "extension/assets/icons");

const icons = [
  { size: 16 },
  { size: 32 },
  { size: 48 },
  { size: 128 }
];

const magick = findMagick();

if (!existsSync(source)) {
  throw new Error(`Source icon not found: ${source}`);
}

mkdirSync(outputDir, { recursive: true });

for (const icon of icons) {
  const output = resolve(outputDir, `icon-${icon.size}.png`);
  const args = [
    source,
    "-gravity",
    "center",
    "-crop",
    "70%x70%+0+0",
    "+repage",
    "-resize",
    `${icon.size}x${icon.size}`,
    "-strip",
    "-define",
    "png:compression-level=9",
    output
  ];

  runMagick(args);
  console.log(`Generated ${relativePath(output)}`);
}

function findMagick() {
  const candidates = [
    process.env.MAGICK_PATH,
    "magick",
    "/opt/homebrew/bin/magick",
    "/usr/local/bin/magick"
  ].filter(Boolean);

  for (const candidate of candidates) {
    const result = spawnSync(candidate, ["-version"], { stdio: "ignore" });
    if (result.status === 0) {
      return candidate;
    }
  }

  throw new Error("ImageMagick was not found. Install it or set MAGICK_PATH.");
}

function runMagick(args) {
  const result = spawnSync(magick, args, { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`ImageMagick failed with status ${result.status}`);
  }
}

function relativePath(path) {
  return path.replace(`${repoRoot}/`, "");
}

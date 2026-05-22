import { readdirSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const roots = ["extension", "scripts", "tests"].map((entry) => resolve(repoRoot, entry));
const ignoredDirectories = new Set(["node_modules", ".git", ".tmp"]);
const files = roots.flatMap((root) => collectJavaScriptFiles(root)).sort();

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`Checked ${files.length} JavaScript files.`);

function collectJavaScriptFiles(path) {
  const stat = statSync(path);
  if (stat.isFile()) {
    return path.endsWith(".js") ? [path] : [];
  }

  if (!stat.isDirectory()) {
    return [];
  }

  const name = relative(repoRoot, path).split("/").at(-1);
  if (ignoredDirectories.has(name)) {
    return [];
  }

  return readdirSync(path).flatMap((entry) => collectJavaScriptFiles(resolve(path, entry)));
}

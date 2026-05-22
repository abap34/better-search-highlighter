import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const extensionRoot = resolve(repoRoot, "extension");
const manifest = readJson(resolve(extensionRoot, "manifest.json"));
const packageJson = readJson(resolve(repoRoot, "package.json"));
const errors = [];

checkRepositoryBasics();
checkManifestBasics();
checkLocales();
checkIcons(manifest.icons, "manifest.icons");
checkIcons(manifest.action?.default_icon, "manifest.action.default_icon");
checkWebAccessibleResources();

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log("Extension package checks passed.");

function checkRepositoryBasics() {
  requireEqual(packageJson.license, "MIT", "package license");
  if (!existsSync(resolve(repoRoot, "LICENSE"))) {
    errors.push("LICENSE file is missing");
  }
}

function checkManifestBasics() {
  requireEqual(manifest.manifest_version, 3, "manifest_version must be 3");
  requireString(manifest.name, "manifest.name");
  requireString(manifest.description, "manifest.description");
  requireString(manifest.version, "manifest.version");
  requireString(manifest.default_locale, "manifest.default_locale");
  requireString(manifest.background?.service_worker, "background.service_worker");
  requireFile(manifest.background?.service_worker, "background.service_worker");
  requireEqual(manifest.commands?._execute_action?.suggested_key?.mac, "Alt+Shift+F", "mac shortcut");
}

function checkLocales() {
  const defaultLocale = manifest.default_locale;
  const defaultMessages = readLocale(defaultLocale);
  const jaMessages = readLocale("ja");
  const defaultKeys = Object.keys(defaultMessages).sort();
  const jaKeys = Object.keys(jaMessages).sort();

  requireDeepEqual(jaKeys, defaultKeys, "ja locale keys must match default locale keys");

  for (const key of collectMessageTokens(manifest)) {
    if (!defaultMessages[key]) {
      errors.push(`default locale is missing manifest message key: ${key}`);
    }
    if (!jaMessages[key]) {
      errors.push(`ja locale is missing manifest message key: ${key}`);
    }
  }

  for (const [locale, messages] of [
    [defaultLocale, defaultMessages],
    ["ja", jaMessages]
  ]) {
    for (const [key, value] of Object.entries(messages)) {
      if (typeof value?.message !== "string" || value.message.length === 0) {
        errors.push(`${locale} message is empty: ${key}`);
      }
    }
  }
}

function checkIcons(icons, label) {
  if (!icons || typeof icons !== "object") {
    errors.push(`${label} is missing`);
    return;
  }

  for (const size of [16, 32, 48, 128]) {
    const path = icons[String(size)];
    requireString(path, `${label}.${size}`);
    if (!path) {
      continue;
    }

    const fullPath = resolve(extensionRoot, path);
    requireFile(path, `${label}.${size}`);
    if (existsSync(fullPath)) {
      const dimensions = readPngDimensions(fullPath);
      requireDeepEqual(dimensions, { width: size, height: size }, `${label}.${size} dimensions`);
    }
  }
}

function checkWebAccessibleResources() {
  for (const resourceBlock of manifest.web_accessible_resources ?? []) {
    for (const resource of resourceBlock.resources ?? []) {
      if (resource.endsWith("/*.js")) {
        const directory = resource.slice(0, -"/*.js".length);
        requireDirectory(directory, `web_accessible_resources ${resource}`);
      } else {
        requireFile(resource, `web_accessible_resources ${resource}`);
      }
    }
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readLocale(locale) {
  return readJson(resolve(extensionRoot, "_locales", locale, "messages.json"));
}

function collectMessageTokens(value, tokens = new Set()) {
  if (typeof value === "string") {
    const match = value.match(/^__MSG_([A-Za-z0-9_]+)__$/);
    if (match) {
      tokens.add(match[1]);
    }
  } else if (Array.isArray(value)) {
    for (const item of value) {
      collectMessageTokens(item, tokens);
    }
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      collectMessageTokens(item, tokens);
    }
  }
  return tokens;
}

function readPngDimensions(path) {
  const buffer = readFileSync(path);
  const signature = buffer.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") {
    errors.push(`${path} is not a PNG file`);
    return null;
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function requireFile(path, label) {
  if (!path || !existsSync(resolve(extensionRoot, path))) {
    errors.push(`${label} does not exist: ${path}`);
  }
}

function requireDirectory(path, label) {
  if (!path || !existsSync(resolve(extensionRoot, path))) {
    errors.push(`${label} directory does not exist: ${path}`);
  }
}

function requireString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    errors.push(`${label} must be a non-empty string`);
  }
}

function requireEqual(actual, expected, label) {
  if (actual !== expected) {
    errors.push(`${label}: expected ${expected}, got ${actual}`);
  }
}

function requireDeepEqual(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    errors.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

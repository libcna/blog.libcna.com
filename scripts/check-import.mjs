import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const importRoot = path.join(projectRoot, "import");
const mediaRoot = path.join(importRoot, "media");
const failures = [];

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function parseMetadata(source, relativePath) {
  const metadata = {};
  const lines = source.replaceAll("\r\n", "\n").split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) {
      failures.push(`${relativePath}:${index + 1}: expected key=value`);
      continue;
    }
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (!/^[a-z][a-z0-9_]*$/.test(key)) {
      failures.push(`${relativePath}:${index + 1}: invalid key '${key}'`);
      continue;
    }
    if (Object.hasOwn(metadata, key)) {
      failures.push(`${relativePath}:${index + 1}: duplicate key '${key}'`);
      continue;
    }
    metadata[key] = value;
  }
  return metadata;
}

function validateStringArray(value, key, relativePath) {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "string" || !item.trim())) {
      throw new Error();
    }
  } catch {
    failures.push(`${relativePath}: ${key} must be a JSON array of non-empty strings`);
  }
}

function validCalendarDate(year, month, day) {
  const date = new Date(`${year}-${month}-${day}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) &&
    String(date.getUTCFullYear()).padStart(4, "0") === year &&
    String(date.getUTCMonth() + 1).padStart(2, "0") === month &&
    String(date.getUTCDate()).padStart(2, "0") === day;
}

const files = await walk(importRoot);
const articleDirectories = new Set();

for (const filePath of files) {
  const relative = path.relative(importRoot, filePath).split(path.sep).join("/");
  const parts = relative.split("/");
  if (parts[0] === "_templates" || parts[0] === "media" || relative === "README.md") continue;

  if (parts.length !== 5) {
    failures.push(`${relative}: article files must use YYYY/MM/DD/slug_id/filename`);
    continue;
  }

  const [year, month, day, directory, filename] = parts;
  articleDirectories.add([year, month, day, directory].join("/"));

  if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month) || !/^\d{2}$/.test(day) ||
      !validCalendarDate(year, month, day)) {
    failures.push(`${relative}: invalid publication date path`);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*_[1-9]\d*$/.test(directory)) {
    failures.push(`${relative}: article directory must use lowercase-hyphenated-slug_numeric-id`);
  }
  if (!new Set(["index.html", "metadata.txt"]).has(filename)) {
    failures.push(`${relative}: article directories may contain only index.html and metadata.txt`);
  }
}

for (const articleDirectory of [...articleDirectories].sort()) {
  const directoryPath = path.join(importRoot, articleDirectory);
  const htmlPath = path.join(directoryPath, "index.html");
  const metadataPath = path.join(directoryPath, "metadata.txt");
  const relativeMetadata = `${articleDirectory}/metadata.txt`;

  if (!await exists(htmlPath)) failures.push(`${articleDirectory}: missing index.html`);
  if (!await exists(metadataPath)) {
    failures.push(`${articleDirectory}: missing metadata.txt`);
    continue;
  }

  if (await exists(htmlPath) && !(await readFile(htmlPath, "utf8")).trim()) {
    failures.push(`${articleDirectory}/index.html: article HTML is empty`);
  }

  const metadata = parseMetadata(await readFile(metadataPath, "utf8"), relativeMetadata);
  for (const key of ["title", "description", "categories", "tags"]) {
    if (!Object.hasOwn(metadata, key) || !metadata[key]) {
      failures.push(`${relativeMetadata}: missing required value '${key}'`);
    }
  }
  for (const key of ["categories", "tags", "aliases"]) {
    if (Object.hasOwn(metadata, key) && metadata[key]) validateStringArray(metadata[key], key, relativeMetadata);
  }
  if (metadata.draft && !new Set(["true", "false"]).has(metadata.draft)) {
    failures.push(`${relativeMetadata}: draft must be true or false`);
  }
  if (metadata.permalink && !metadata.permalink.startsWith("/")) {
    failures.push(`${relativeMetadata}: permalink must begin with /`);
  }
  if (metadata.featured_media) {
    if (path.basename(metadata.featured_media) !== metadata.featured_media) {
      failures.push(`${relativeMetadata}: featured_media must contain a filename only`);
    }
    if (!metadata.featured_media_alt) {
      failures.push(`${relativeMetadata}: featured_media_alt is required with featured_media`);
    }
    if (!await exists(path.join(mediaRoot, metadata.featured_media))) {
      failures.push(`${relativeMetadata}: featured media '${metadata.featured_media}' does not exist in import/media`);
    }
  }
}

const mediaFiles = files.filter((filePath) => {
  const relative = path.relative(importRoot, filePath).split(path.sep).join("/");
  return relative.startsWith("media/") && !path.basename(filePath).startsWith(".");
});

if (failures.length) {
  console.error(`Import validation failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Import validation passed: ${articleDirectories.size} article directories and ${mediaFiles.length} media files.`);
}

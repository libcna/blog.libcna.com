import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(projectRoot, "dist");
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

function localTarget(fromFile, rawUrl) {
  const clean = rawUrl.split("#")[0].split("?")[0];
  if (!clean || /^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(clean)) return null;

  let target;
  try {
    const baseRoute = `/${path.relative(outputRoot, fromFile).split(path.sep).join("/")}`;
    target = decodeURIComponent(new URL(clean, `https://local.invalid${baseRoute}`).pathname);
  } catch {
    return { invalid: true, value: rawUrl };
  }

  const relative = target.replace(/^\/+/, "");
  const resolved = path.resolve(outputRoot, relative);
  if (resolved !== outputRoot && !resolved.startsWith(`${outputRoot}${path.sep}`)) {
    return { invalid: true, value: rawUrl };
  }
  if (path.extname(resolved)) return { filePath: resolved, value: rawUrl };
  return { filePath: path.join(resolved, "index.html"), value: rawUrl };
}

const required = [
  "index.html",
  "404.html",
  "feed.xml",
  "sitemap.xml",
  "robots.txt",
  "favicon.svg",
  "assets/style.css",
  "archive/index.html",
  "categories/index.html",
  "tags/index.html",
  "about/index.html"
];

for (const relative of required) {
  if (!await exists(path.join(outputRoot, relative))) failures.push(`Missing output: ${relative}`);
}

const files = await walk(outputRoot);
const htmlFiles = files.filter((file) => file.endsWith(".html"));
const articleUrls = [];
for (const filePath of htmlFiles) {
  const source = await readFile(filePath, "utf8");
  if (!/^<!doctype html>/i.test(source)) failures.push(`${path.relative(outputRoot, filePath)}: missing doctype`);
  if (!/<html\s+lang="en"/i.test(source)) failures.push(`${path.relative(outputRoot, filePath)}: missing English document language`);

  if (/<meta\s+property="og:type"\s+content="article">/i.test(source)) {
    const canonical = source.match(/<link\s+rel="canonical"\s+href="([^"]+)">/i)?.[1];
    if (canonical) articleUrls.push(canonical);
    else failures.push(`${path.relative(outputRoot, filePath)}: article is missing a canonical URL`);
  }

  const references = [...source.matchAll(/\b(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
  for (const reference of references) {
    const target = localTarget(filePath, reference);
    if (!target) continue;
    if (target.invalid || !await exists(target.filePath)) {
      failures.push(`${path.relative(outputRoot, filePath)}: broken internal link ${target.value}`);
    }
  }
}

const feed = await readFile(path.join(outputRoot, "feed.xml"), "utf8");
const sitemap = await readFile(path.join(outputRoot, "sitemap.xml"), "utf8");
const feedItemCount = (feed.match(/<item>/g) || []).length;
const expectedFeedItemCount = Math.min(articleUrls.length, 30);
if (feedItemCount !== expectedFeedItemCount) {
  failures.push(`RSS contains ${feedItemCount} items; expected ${expectedFeedItemCount}`);
}
for (const articleUrl of articleUrls) {
  if (!sitemap.includes(`<loc>${articleUrl}</loc>`)) failures.push(`Sitemap does not contain ${articleUrl}`);
}

if (failures.length) {
  console.error(`Validation failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Validation passed: ${htmlFiles.length} HTML pages and all internal links are valid.`);
}

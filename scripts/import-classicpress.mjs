import { gunzipSync } from "node:zlib";
import { access, cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import site from "../site.config.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const postsRoot = path.join(projectRoot, "content", "posts");
const publicUploadsRoot = path.join(projectRoot, "public", "wp-content", "uploads");

const args = process.argv.slice(2);

function option(name) {
  const index = args.indexOf(name);
  return index === -1 ? "" : args[index + 1] ?? "";
}

const databasePath = option("--database");
if (!databasePath) {
  console.error(
    "Usage: node scripts/import-classicpress.mjs --database dump.sql[.gz] " +
    "[--uploads path/to/wp-content/uploads] [--report] [--write]"
  );
  process.exit(1);
}
const writeImport = args.includes("--write");
const uploadsRoot = path.resolve(option("--uploads") || path.join(projectRoot, "public", "wp-content", "uploads"));

function readSqlValue(source, state) {
  while (/\s/.test(source[state.index] ?? "")) state.index += 1;

  if (source[state.index] === "'") {
    state.index += 1;
    let value = "";
    const escapes = {
      "0": "\0",
      b: "\b",
      n: "\n",
      r: "\r",
      t: "\t",
      Z: "\x1a"
    };
    while (state.index < source.length) {
      const character = source[state.index];
      state.index += 1;
      if (character === "'") return value;
      if (character === "\\") {
        const escaped = source[state.index] ?? "";
        state.index += 1;
        value += Object.hasOwn(escapes, escaped) ? escapes[escaped] : escaped;
      } else {
        value += character;
      }
    }
    throw new Error("Unterminated SQL string value");
  }

  const start = state.index;
  while (state.index < source.length && !new Set([",", ")"]).has(source[state.index])) {
    state.index += 1;
  }
  const token = source.slice(start, state.index).trim();
  if (token === "NULL") return null;
  if (/^-?\d+(?:\.\d+)?$/.test(token)) return Number(token);
  return token;
}

function parseRows(source) {
  const rows = [];
  const state = { index: 0 };
  while (state.index < source.length) {
    while (/[,\s]/.test(source[state.index] ?? "")) state.index += 1;
    if (state.index >= source.length) break;
    if (source[state.index] !== "(") throw new Error(`Expected SQL row at offset ${state.index}`);
    state.index += 1;
    const row = [];
    while (state.index < source.length) {
      row.push(readSqlValue(source, state));
      while (/\s/.test(source[state.index] ?? "")) state.index += 1;
      if (source[state.index] === ",") {
        state.index += 1;
        continue;
      }
      if (source[state.index] === ")") {
        state.index += 1;
        break;
      }
      throw new Error(`Expected comma or closing parenthesis at offset ${state.index}`);
    }
    rows.push(row);
  }
  return rows;
}

function insertStatements(sql) {
  const statements = [];
  const marker = /INSERT INTO `([^`]+)` VALUES /g;
  let match;
  while ((match = marker.exec(sql)) !== null) {
    let index = marker.lastIndex;
    let quoted = false;
    let escaped = false;
    while (index < sql.length) {
      const character = sql[index];
      if (escaped) {
        escaped = false;
      } else if (quoted && character === "\\") {
        escaped = true;
      } else if (character === "'") {
        quoted = !quoted;
      } else if (!quoted && character === ";") {
        break;
      }
      index += 1;
    }
    if (index >= sql.length) throw new Error(`Unterminated INSERT for ${match[1]}`);
    statements.push({ table: match[1], values: sql.slice(marker.lastIndex, index) });
    marker.lastIndex = index + 1;
  }
  return statements;
}

function detectPrefix(sql) {
  const match = sql.match(/CREATE TABLE `([^`]+)posts`\s*\(/);
  if (!match) throw new Error("Could not detect the ClassicPress table prefix");
  return match[1];
}

const schemas = {
  posts: [
    "ID", "post_author", "post_date", "post_date_gmt", "post_content", "post_title",
    "post_excerpt", "post_status", "comment_status", "ping_status", "post_password",
    "post_name", "to_ping", "pinged", "post_modified", "post_modified_gmt",
    "post_content_filtered", "post_parent", "guid", "menu_order", "post_type",
    "post_mime_type", "comment_count"
  ],
  postmeta: ["meta_id", "post_id", "meta_key", "meta_value"],
  terms: ["term_id", "name", "slug", "term_group"],
  term_taxonomy: ["term_taxonomy_id", "term_id", "taxonomy", "description", "parent", "count"],
  term_relationships: ["object_id", "term_taxonomy_id", "term_order"],
  options: ["option_id", "option_name", "option_value", "autoload"],
  users: [
    "ID", "user_login", "user_pass", "user_nicename", "user_email", "user_url",
    "user_registered", "user_activation_key", "user_status", "display_name"
  ]
};

function toObjects(rows, columns, table) {
  return rows.map((row) => {
    if (row.length !== columns.length) {
      throw new Error(`${table}: expected ${columns.length} columns, found ${row.length}`);
    }
    return Object.fromEntries(columns.map((column, index) => [column, row[index]]));
  });
}

async function loadDatabase(filePath) {
  const buffer = await readFile(filePath);
  const sql = path.extname(filePath).toLowerCase() === ".gz"
    ? gunzipSync(buffer).toString("utf8")
    : buffer.toString("utf8");
  const prefix = detectPrefix(sql);
  const collected = Object.fromEntries(Object.keys(schemas).map((name) => [name, []]));
  for (const statement of insertStatements(sql)) {
    if (!statement.table.startsWith(prefix)) continue;
    const name = statement.table.slice(prefix.length);
    if (!Object.hasOwn(schemas, name)) continue;
    collected[name].push(...parseRows(statement.values));
  }
  const tables = Object.fromEntries(Object.entries(collected).map(([name, rows]) => [
    name,
    toObjects(rows, schemas[name], `${prefix}${name}`)
  ]));
  return { prefix, tables };
}

function contentTags(html) {
  return [...String(html).matchAll(/<\/?([a-z][a-z0-9:-]*)\b/gi)]
    .map((match) => match[1].toLowerCase());
}

const { prefix, tables } = await loadDatabase(databasePath);
const postCounts = new Map();
for (const post of tables.posts) {
  const key = `${post.post_type}/${post.post_status}`;
  postCounts.set(key, (postCounts.get(key) ?? 0) + 1);
}
const articles = tables.posts
  .filter((post) => post.post_type === "post" && new Set(["publish", "future"]).has(post.post_status))
  .sort((a, b) => String(a.post_date).localeCompare(String(b.post_date)) || a.ID - b.ID);
const pages = tables.posts
  .filter((post) => post.post_type === "page" && new Set(["publish", "future"]).has(post.post_status))
  .sort((a, b) => String(a.post_date).localeCompare(String(b.post_date)) || a.ID - b.ID);
const tags = new Set(articles.flatMap((post) => contentTags(post.post_content)));
const termsById = new Map(tables.terms.map((term) => [term.term_id, term]));
const taxonomiesById = new Map(tables.term_taxonomy.map((taxonomy) => [taxonomy.term_taxonomy_id, taxonomy]));

function groupBy(items, keyFor) {
  const groups = new Map();
  for (const item of items) {
    const key = keyFor(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
}

const relationshipsByPost = groupBy(tables.term_relationships, (relationship) => relationship.object_id);
const metadataByPost = groupBy(tables.postmeta, (metadata) => metadata.post_id);
const postsById = new Map(tables.posts.map((post) => [post.ID, post]));

function taxonomyNames(postId, taxonomyName) {
  return (relationshipsByPost.get(postId) ?? [])
    .map((relationship) => taxonomiesById.get(relationship.term_taxonomy_id))
    .filter((taxonomy) => taxonomy?.taxonomy === taxonomyName)
    .map((taxonomy) => termsById.get(taxonomy.term_id)?.name)
    .filter(Boolean);
}

function metadataValue(postId, key) {
  return (metadataByPost.get(postId) ?? []).find((metadata) => metadata.meta_key === key)?.meta_value ?? "";
}

function featuredMedia(postId) {
  const attachmentId = Number(metadataValue(postId, "_thumbnail_id"));
  if (!attachmentId) return "";
  const file = metadataValue(attachmentId, "_wp_attached_file");
  return file ? `wp-content/uploads/${file}` : `attachment:${attachmentId}`;
}

function decodeEntities(value) {
  const named = {
    amp: "&",
    apos: "'",
    gt: ">",
    hellip: "…",
    ldquo: "“",
    lsquo: "‘",
    lt: "<",
    mdash: "—",
    nbsp: " ",
    ndash: "–",
    quot: '"',
    rdquo: "”",
    rsquo: "’",
    rarr: "→",
    laquo: "«",
    raquo: "»"
  };
  return String(value).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, name) => {
    if (name.startsWith("#x")) return String.fromCodePoint(Number.parseInt(name.slice(2), 16));
    if (name.startsWith("#")) return String.fromCodePoint(Number.parseInt(name.slice(1), 10));
    return Object.hasOwn(named, name.toLowerCase()) ? named[name.toLowerCase()] : entity;
  });
}

function attributes(element) {
  const values = {};
  for (const match of String(element).matchAll(/([a-z_:][a-z0-9_.:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
    values[match[1].toLowerCase()] = decodeEntities(match[2] ?? match[3] ?? "");
  }
  return values;
}

function normalizeInternalUrl(value) {
  return decodeEntities(String(value).trim())
    .replace(/^https?:\/\/(?:www\.)?blog\.libcna\.com(?=\/)/i, "");
}

async function mediaInventory(directory) {
  const files = new Set();
  async function walk(current, prefix = "") {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await walk(path.join(current, entry.name), relative);
      if (entry.isFile()) files.add(relative);
    }
  }
  await walk(directory);
  return files;
}

function originalMediaPath(relative, mediaFiles) {
  const candidate = relative.replace(/-\d+x\d+(?=\.[^.]+$)/i, "");
  return candidate !== relative && mediaFiles.has(candidate) ? candidate : relative;
}

function mediaRelativePath(url) {
  const normalized = normalizeInternalUrl(url).split("?")[0].split("#")[0];
  const match = normalized.match(/^\/wp-content\/uploads\/(.+)$/i);
  if (!match) return "";
  let decoded;
  try {
    decoded = decodeURIComponent(match[1]);
  } catch {
    return "";
  }
  const safe = path.posix.normalize(decoded);
  return safe === decoded && safe !== ".." && !safe.startsWith("../") ? safe : "";
}

function markdownUrl(value, mediaFiles) {
  const normalized = normalizeInternalUrl(value);
  const relative = mediaRelativePath(normalized);
  if (!relative) return normalized.replaceAll(" ", "%20");
  return `/wp-content/uploads/${originalMediaPath(relative, mediaFiles).split("/").map(encodeURIComponent).join("/")}`;
}

function plainInline(value) {
  return decodeEntities(String(value).replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function humanizeMediaName(value) {
  const words = path.basename(String(value), path.extname(String(value)))
    .replace(/-\d+x\d+$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();
  return words ? `${words[0].toUpperCase()}${words.slice(1)}` : "Article image";
}

function htmlToMarkdown(source, mediaFiles, attachmentAltByPath) {
  const protectedBlocks = [];
  const protect = (value) => {
    const index = protectedBlocks.push(value) - 1;
    return `CLASSICPRESSBLOCKTOKEN${index}END`;
  };

  let value = String(source).replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  value = value.replace(/<!--(?:.|\n)*?-->/g, "");

  value = value.replace(
    /&lt;\?xml\b[\s\S]*?&lt;([a-z][\w:-]*)\b[\s\S]*?&lt;\/\1&gt;/gi,
    (xml) => protect(`\n\n\`\`\`xml\n${decodeEntities(xml).replace(/[ \t]+$/gm, "")}\n\`\`\`\n\n`)
  );

  value = value.replace(
    /<pre\b[^>]*>\s*(<img\b[^>]*>)\s*<code\b[^>]*>\s*<\/code>\s*<\/pre>/gi,
    "$1"
  );

  value = value.replace(/<pre\b[^>]*>\s*<code\b([^>]*)>([\s\S]*?)<\/code>\s*<\/pre>/gi,
    (_, codeAttributes, code) => {
      const language = attributes(`<code ${codeAttributes}>`).class?.match(/(?:^|\s)language-([\w+-]+)/)?.[1] ?? "";
      const decoded = decodeEntities(code).replace(/^\n|\n$/g, "").replace(/[ \t]+$/gm, "");
      return protect(`\n\n\`\`\`${language}\n${decoded}\n\`\`\`\n\n`);
    });
  value = value.replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, (_, code) =>
    protect(`\n\n\`\`\`\n${decodeEntities(code).replace(/^\n|\n$/g, "").replace(/[ \t]+$/gm, "")}\n\`\`\`\n\n`));

  value = value.replace(/<table\b[^>]*>([\s\S]*?)<\/table>/gi, (_, table) => {
    const rows = [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((row) =>
      [...row[1].matchAll(/<t([hd])\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((cell) => ({
        header: cell[1].toLowerCase() === "h",
        value: plainInline(cell[2]).replaceAll("|", "\\|")
      }))
    ).filter((row) => row.length);
    if (!rows.length) return "";
    const width = Math.max(...rows.map((row) => row.length));
    const pad = (row) => [...row, ...Array.from({ length: width - row.length }, () => ({ value: "" }))];
    const header = pad(rows[0]);
    const body = rows.slice(1).map(pad);
    const markdown = [
      `| ${header.map((cell) => cell.value).join(" | ")} |`,
      `| ${header.map(() => "---").join(" | ")} |`,
      ...body.map((row) => `| ${row.map((cell) => cell.value).join(" | ")} |`)
    ].join("\n");
    return protect(`\n\n${markdown}\n\n`);
  });

  value = value.replace(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, quote) => {
    const text = plainInline(quote);
    return text ? `\n\n> ${text}\n\n` : "";
  });

  value = value.replace(/<ol\b[^>]*>([\s\S]*?)<\/ol>/gi, (_, list) => {
    const items = [...list.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)];
    return `\n\n${items.map((item, index) => `${index + 1}. ${item[1].trim()}`).join("\n")}\n\n`;
  });
  value = value.replace(/<ul\b[^>]*>([\s\S]*?)<\/ul>/gi, (_, list) => {
    const items = [...list.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)];
    return `\n\n${items.map((item) => `- ${item[1].trim()}`).join("\n")}\n\n`;
  });

  value = value.replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_, rawLevel, heading) => {
    const level = Math.max(2, Number(rawLevel));
    return `\n\n${"#".repeat(level)} ${plainInline(heading)}\n\n`;
  });
  value = value.replace(/<p\b[^>]*>/gi, "\n\n").replace(/<\/p>/gi, "\n\n");
  value = value.replace(/<hr\b[^>]*\/?\s*>/gi, "\n\n---\n\n");
  value = value.replace(/<br\b[^>]*\/?\s*>/gi, "  \n");
  value = value.replace(/<(?:strong|b)\b[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, "**$1**");
  value = value.replace(/<(?:em|i)\b[^>]*>([\s\S]*?)<\/(?:em|i)>/gi, "*$1*");
  value = value.replace(/<(?:del|s|strike)\b[^>]*>([\s\S]*?)<\/(?:del|s|strike)>/gi, "~~$1~~");
  value = value.replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi,
    (_, code) => `\`${decodeEntities(code).replaceAll("`", "'")}\``);

  value = value.replace(/<img\b[^>]*>/gi, (image) => {
    const imageAttributes = attributes(image);
    if (!imageAttributes.src) return "";
    const relative = mediaRelativePath(imageAttributes.src);
    const original = relative ? originalMediaPath(relative, mediaFiles) : "";
    const alt = imageAttributes.alt || (original ? attachmentAltByPath.get(original) : "") ||
      humanizeMediaName(original || imageAttributes.src);
    const title = imageAttributes.title ? ` "${imageAttributes.title.replaceAll('"', "&quot;")}"` : "";
    return `\n\n![${alt.replaceAll("]", "\\]")}](${markdownUrl(imageAttributes.src, mediaFiles)}${title})\n\n`;
  });
  value = value.replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, (anchor, label) => {
    const href = attributes(anchor).href;
    if (!href) return label;
    return `[${label.trim() || normalizeInternalUrl(href)}](${markdownUrl(href, mediaFiles)})`;
  });

  value = value.replace(/<[^>]+>/g, "");
  value = decodeEntities(value);
  value = value.replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n").trim();
  value = value.replace(/CLASSICPRESSBLOCKTOKEN(\d+)END/g, (_, index) => protectedBlocks[Number(index)]);
  return value.replace(/\n{3,}/g, "\n\n").trim();
}

function descriptionFromMarkdown(markdown) {
  const paragraphs = String(markdown).split(/\n\s*\n/).map((part) => part.trim());
  const prose = paragraphs.filter((part) =>
    part && !/^(?:#{1,6}\s|[-*+]\s|>\s|\d+[.)]\s|```|!\[|\|)/.test(part)
  );
  let candidate = prose[0] ?? "";
  if (/[:;,]$/.test(candidate) && prose[1]) candidate = `${candidate} ${prose[1]}`;
  let plain = candidate
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replaceAll("**", "")
    .replaceAll("__", "")
    .replaceAll("~~", "")
    .replaceAll("`", "")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= 240) return plain;
  const firstSentence = plain.match(/^(.{40,}?[.!?])(?:\s|$)/)?.[1];
  if (firstSentence && firstSentence.length <= 320) return firstSentence;
  const shortened = plain.slice(0, 240);
  plain = shortened.replace(/\s+\S*$/, "");
  return `${plain}…`;
}

function indentedBlock(value) {
  return String(value).split("\n").map((line) => `  ${line}`).join("\n");
}

function frontmatterList(name, values) {
  if (!values.length) return `${name}: []`;
  return `${name}:\n${values.map((value) => `  - ${value}`).join("\n")}`;
}

function isoDate(value) {
  return `${String(value).replace(" ", "T")}Z`;
}

function attachmentDetails(postId, mediaFiles) {
  const attachmentId = Number(metadataValue(postId, "_thumbnail_id"));
  if (!attachmentId) return null;
  const attachment = postsById.get(attachmentId);
  const relative = metadataValue(attachmentId, "_wp_attached_file");
  if (!relative || !mediaFiles.has(relative)) return null;
  return {
    path: `/wp-content/uploads/${originalMediaPath(relative, mediaFiles)}`,
    alt: metadataValue(attachmentId, "_wp_attachment_image_alt") || humanizeMediaName(attachment?.post_title || relative),
    caption: attachment?.post_excerpt || ""
  };
}

function markdownPost(article, mediaFiles, attachmentAltByPath) {
  const body = htmlToMarkdown(article.post_content, mediaFiles, attachmentAltByPath);
  const description = article.post_excerpt ? plainInline(article.post_excerpt) : descriptionFromMarkdown(body);
  const published = isoDate(article.post_date);
  const updated = isoDate(article.post_modified);
  const categoryNames = taxonomyNames(article.ID, "category");
  const tagNames = taxonomyNames(article.ID, "post_tag");
  const featured = attachmentDetails(article.ID, mediaFiles);
  const fields = [
    "---",
    `title: ${article.post_title.replaceAll("\n", " ")}`,
    `date: ${published}`,
    `updated: ${updated}`,
    "description: |",
    indentedBlock(description),
    `author: ${site.author}`,
    frontmatterList("categories", categoryNames),
    frontmatterList("tags", tagNames),
    `originalUrl: ${site.url}/${String(article.post_date).slice(0, 10).replaceAll("-", "/")}/${article.post_name}/`,
    `classicpressId: ${article.ID}`,
    `classicpressStatus: ${article.post_status}`
  ];
  if (featured) {
    fields.push(`featuredImage: ${featured.path}`);
    fields.push("featuredImageAlt: |");
    fields.push(indentedBlock(featured.alt));
    if (featured.caption) {
      fields.push("featuredImageCaption: |");
      fields.push(indentedBlock(featured.caption));
    }
  }
  fields.push("draft: false", "---", "", body, "");
  return fields.join("\n");
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function validateArticleMedia(articlesToCheck, mediaFiles) {
  const missing = new Set();
  for (const article of articlesToCheck) {
    const candidates = [
      ...String(article.post_content).matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)
    ].map((match) => match[1]);
    const featured = featuredMedia(article.ID);
    if (featured) candidates.push(`/${featured}`);
    for (const candidate of candidates) {
      const relative = mediaRelativePath(candidate);
      if (relative && !mediaFiles.has(relative)) missing.add(relative);
    }
  }
  if (missing.size) {
    throw new Error(`Missing ClassicPress media files:\n${[...missing].sort().map((file) => `- ${file}`).join("\n")}`);
  }
}

async function writeArticles(articlesToWrite, mediaFiles, attachmentAltByPath) {
  await rm(postsRoot, { recursive: true, force: true });
  for (const article of articlesToWrite) {
    const [year, month, day] = String(article.post_date).slice(0, 10).split("-");
    const directory = path.join(postsRoot, year, month, day);
    await mkdir(directory, { recursive: true });
    await writeFile(
      path.join(directory, `${article.post_name}.md`),
      markdownPost(article, mediaFiles, attachmentAltByPath),
      "utf8"
    );
  }
}

async function copyUploadsToPublic(source) {
  const sourcePath = path.resolve(source);
  const targetPath = path.resolve(publicUploadsRoot);
  if (sourcePath === targetPath) return false;
  const sourceRelativeToTarget = path.relative(targetPath, sourcePath);
  const targetRelativeToSource = path.relative(sourcePath, targetPath);
  const overlaps = !sourceRelativeToTarget.startsWith("..") || !targetRelativeToSource.startsWith("..");
  if (overlaps) throw new Error("The source uploads directory must not overlap public/wp-content/uploads");
  await rm(targetPath, { recursive: true, force: true });
  await mkdir(path.dirname(targetPath), { recursive: true });
  await cp(sourcePath, targetPath, { recursive: true, preserveTimestamps: true });
  return true;
}

console.log(`Detected table prefix: ${prefix}`);
console.log(`Rows: ${Object.entries(tables).map(([name, rows]) => `${name}=${rows.length}`).join(", ")}`);
console.log("Post inventory:");
for (const [key, count] of [...postCounts].sort()) console.log(`- ${key}: ${count}`);
console.log(`Articles selected for migration: ${articles.length}`);
for (const article of articles) {
  const categories = taxonomyNames(article.ID, "category");
  const articleTags = taxonomyNames(article.ID, "post_tag");
  const featured = featuredMedia(article.ID);
  console.log(
    `- ${article.ID} | ${article.post_status} | published=${article.post_date} | modified=${article.post_modified}` +
    ` | ${article.post_name} | ${article.post_title}` +
    ` | categories=${JSON.stringify(categories)} | tags=${JSON.stringify(articleTags)}` +
    ` | excerpt=${article.post_excerpt ? "yes" : "no"} | featured=${featured || "none"}`
  );
}
console.log(`Published or scheduled pages not migrated as articles: ${pages.length}`);
for (const page of pages) {
  console.log(`- ${page.ID} | ${page.post_status} | ${page.post_name} | ${page.post_title}`);
}
console.log(`HTML tags used by selected articles: ${[...tags].sort().join(", ") || "none"}`);
const safeOptions = new Set(["siteurl", "home", "permalink_structure", "timezone_string", "date_format"]);
console.log("Relevant options:");
for (const row of tables.options.filter((item) => safeOptions.has(item.option_name))) {
  console.log(`- ${row.option_name}=${row.option_value}`);
}

const inspectId = Number(option("--inspect"));
if (inspectId) {
  const article = postsById.get(inspectId);
  if (!article) throw new Error(`Post ${inspectId} does not exist`);
  console.log(`\nRaw content for post ${inspectId}:\n`);
  console.log(article.post_content);
}

if (!await exists(uploadsRoot)) {
  throw new Error(`Uploads directory does not exist: ${uploadsRoot}`);
}
const mediaFiles = await mediaInventory(uploadsRoot);
const attachmentAltByPath = new Map();
for (const attachment of tables.posts.filter((post) => post.post_type === "attachment")) {
  const relative = metadataValue(attachment.ID, "_wp_attached_file");
  if (!relative) continue;
  attachmentAltByPath.set(
    originalMediaPath(relative, mediaFiles),
    metadataValue(attachment.ID, "_wp_attachment_image_alt") || humanizeMediaName(attachment.post_title || relative)
  );
}
await validateArticleMedia(articles, mediaFiles);
console.log(`Media validation passed: ${mediaFiles.size} files are available in ${uploadsRoot}`);

if (writeImport) {
  if (await copyUploadsToPublic(uploadsRoot)) {
    console.log(`Copied ClassicPress uploads to ${publicUploadsRoot}`);
  }
  await writeArticles(articles, mediaFiles, attachmentAltByPath);
  console.log(`Wrote ${articles.length} Markdown articles to ${postsRoot}`);
} else {
  console.log("Dry run only; pass --write to replace content/posts with the migrated articles.");
}

import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import site from "../site.config.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const postsRoot = path.join(projectRoot, "content", "posts");
const pagesRoot = path.join(projectRoot, "content", "pages");
const publicRoot = path.join(projectRoot, "public");
const outputRoot = path.join(projectRoot, "dist");
const includeDrafts = process.env.BUILD_DRAFTS === "1";
const includeFuture = process.env.BUILD_FUTURE === "1";

const englishMonths = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const escapeXml = escapeHtml;

function slugify(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function normalizeRoute(route, field = "permalink") {
  if (typeof route !== "string" || !route.startsWith("/")) {
    throw new Error(`${field} must be a path beginning with a slash: ${route}`);
  }
  if (route.includes("?") || route.includes("#") || route.includes("..")) {
    throw new Error(`${field} must not contain a query, fragment, or '..': ${route}`);
  }
  const compact = route.replace(/\/{2,}/g, "/");
  if (compact === "/") return compact;
  return path.posix.extname(compact) ? compact : `${compact.replace(/\/$/, "")}/`;
}

function outputPathForRoute(route) {
  const normalized = normalizeRoute(route, "output path");
  if (normalized === "/") return path.join(outputRoot, "index.html");
  const relative = normalized.replace(/^\//, "");
  return normalized.endsWith("/")
    ? path.join(outputRoot, relative, "index.html")
    : path.join(outputRoot, relative);
}

function absoluteUrl(route) {
  return new URL(route, `${site.url}/`).href;
}

function parseScalar(rawValue) {
  const value = rawValue.trim();
  if (value === "") return "";
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    return inner ? inner.split(",").map((item) => parseScalar(item)) : [];
  }
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function parseFrontmatter(source, filePath) {
  const normalized = source.replace(/^\uFEFF/, "").replaceAll("\r\n", "\n");
  if (!normalized.startsWith("---\n")) {
    throw new Error(`${filePath}: missing YAML front matter beginning with ---`);
  }

  const end = normalized.indexOf("\n---\n", 4);
  if (end === -1) {
    throw new Error(`${filePath}: YAML front matter is not terminated with ---`);
  }

  const frontmatter = normalized.slice(4, end);
  const body = normalized.slice(end + 5).trim();
  const lines = frontmatter.split("\n");
  const data = {};

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const match = line.match(/^([A-Za-z][A-Za-z0-9_-]*):(?:\s*(.*))?$/);
    if (!match) {
      throw new Error(`${filePath}: unsupported metadata line: ${line}`);
    }

    const [, key, rawValue = ""] = match;
    if (rawValue === "|") {
      const parts = [];
      while (index + 1 < lines.length && (lines[index + 1].startsWith("  ") || lines[index + 1] === "")) {
        index += 1;
        parts.push(lines[index].startsWith("  ") ? lines[index].slice(2) : "");
      }
      data[key] = parts.join("\n").trim();
      continue;
    }

    if (rawValue === "" && index + 1 < lines.length && /^\s+-\s+/.test(lines[index + 1])) {
      const values = [];
      while (index + 1 < lines.length) {
        const item = lines[index + 1].match(/^\s+-\s+(.+)$/);
        if (!item) break;
        index += 1;
        values.push(parseScalar(item[1]));
      }
      data[key] = values;
      continue;
    }

    data[key] = parseScalar(rawValue);
  }

  return { data, body };
}

async function findMarkdownFiles(directory) {
  const found = [];
  let entries = [];
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return found;
    throw error;
  }
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await findMarkdownFiles(fullPath));
    if (entry.isFile() && entry.name.endsWith(".md")) found.push(fullPath);
  }
  return found.sort();
}

function asList(value, field, filePath) {
  if (value === undefined || value === null || value === "") return [];
  if (!Array.isArray(value)) throw new Error(`${filePath}: ${field} must be a list`);
  return value.map(String).map((item) => item.trim()).filter(Boolean);
}

function parseDate(value, field, filePath) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(value)) {
    throw new Error(`${filePath}: ${field} must be a YYYY-MM-DD date or an ISO date and time`);
  }
  const date = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  if (Number.isNaN(date.getTime())) throw new Error(`${filePath}: ${field} is not a valid date`);
  return date;
}

function dateKeyInTimeZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function publicationCutoff() {
  if (!process.env.BUILD_DATE) return dateKeyInTimeZone(new Date(), site.timeZone);
  const value = process.env.BUILD_DATE;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(new Date(`${value}T12:00:00Z`).getTime())) {
    throw new Error("BUILD_DATE must be a valid YYYY-MM-DD date");
  }
  return value;
}

async function loadPosts() {
  const files = await findMarkdownFiles(postsRoot);
  const posts = [];
  const cutoff = publicationCutoff();

  for (const filePath of files) {
    const relative = path.relative(postsRoot, filePath).split(path.sep).join("/");
    const parts = relative.split("/");
    if (parts.length !== 4) {
      throw new Error(`${relative}: a post must be stored at YYYY/MM/DD/slug.md`);
    }
    const [year, month, day, filename] = parts;
    if (!/^\d{4}$/.test(year) || !/^\d{2}$/.test(month) || !/^\d{2}$/.test(day)) {
      throw new Error(`${relative}: the date path must use YYYY/MM/DD`);
    }

    const { data, body } = parseFrontmatter(await readFile(filePath, "utf8"), relative);
    for (const required of ["title", "date", "description"]) {
      if (!data[required]) throw new Error(`${relative}: missing required field ${required}`);
    }

    if (data.draft === true && !includeDrafts) continue;
    const date = parseDate(String(data.date), "date", relative);
    const publicationDate = String(data.date).slice(0, 10);
    const sourceDate = publicationDate.replaceAll("-", "/");
    if (sourceDate !== `${year}/${month}/${day}`) {
      throw new Error(`${relative}: date ${data.date} does not match directory ${year}/${month}/${day}`);
    }

    const slug = String(data.slug || filename.replace(/\.md$/, ""));
    if (!/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u.test(slug)) {
      throw new Error(`${relative}: invalid slug '${slug}'`);
    }
    const defaultRoute = `/${year}/${month}/${day}/${slug}/`;
    const route = normalizeRoute(data.permalink ? String(data.permalink) : defaultRoute);

    if (publicationDate > cutoff && !includeFuture) continue;

    const updatedSource = String(data.updated || data.date);
    const updatedDate = data.updated ? parseDate(updatedSource, "updated", relative) : date;
    if (updatedSource.slice(0, 10) < publicationDate) {
      throw new Error(`${relative}: updated date must not be earlier than publication date`);
    }

    posts.push({
      ...data,
      title: String(data.title),
      description: String(data.description),
      author: String(data.author || site.author),
      date,
      dateSource: String(data.date),
      updatedDate,
      updatedSource,
      slug,
      route,
      defaultRoute,
      year,
      month,
      day,
      categories: asList(data.categories, "categories", relative),
      tags: asList(data.tags, "tags", relative),
      aliases: asList(data.aliases, "aliases", relative).map((alias) => normalizeRoute(alias, "alias")),
      body,
      sourcePath: relative
    });
  }

  posts.sort((a, b) => b.date - a.date || a.title.localeCompare(b.title, site.locale));
  return posts;
}

async function loadPages() {
  const files = await findMarkdownFiles(pagesRoot);
  const pages = [];
  for (const filePath of files) {
    const relative = path.relative(projectRoot, filePath).split(path.sep).join("/");
    const { data, body } = parseFrontmatter(await readFile(filePath, "utf8"), relative);
    for (const required of ["title", "description", "permalink"]) {
      if (!data[required]) throw new Error(`${relative}: missing required field ${required}`);
    }
    pages.push({
      ...data,
      title: String(data.title),
      description: String(data.description),
      route: normalizeRoute(String(data.permalink)),
      body,
      sourcePath: relative
    });
  }
  return pages;
}

function safeUrl(value, image = false) {
  const url = String(value).trim();
  if (/^(?:https?:|mailto:|\/|#)/i.test(url)) return escapeHtml(url);
  if (image && /^data:image\/(?:png|gif|jpeg|webp);base64,/i.test(url)) return escapeHtml(url);
  return "#";
}

function renderInline(source) {
  const tokens = [];
  const token = (html) => {
    const index = tokens.push(html) - 1;
    return `\u0000${index}\u0000`;
  };

  let value = String(source);
  value = value.replace(/`([^`]+)`/g, (_, code) => token(`<code>${escapeHtml(code)}</code>`));
  value = value.replace(/!\[([^\]]*)\]\(([^\s)]+)(?:\s+["']([^"']*)["'])?\)/g,
    (_, alt, url, title) => token(`<img src="${safeUrl(url, true)}" alt="${escapeHtml(alt)}"${title ? ` title="${escapeHtml(title)}"` : ""} loading="lazy">`));
  value = value.replace(/\[([^\]]+)\]\(([^\s)]+)(?:\s+["']([^"']*)["'])?\)/g,
    (_, label, url, title) => token(`<a href="${safeUrl(url)}"${title ? ` title="${escapeHtml(title)}"` : ""}>${escapeHtml(label)}</a>`));
  value = escapeHtml(value);
  value = value.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  value = value.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  value = value.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  value = value.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  value = value.replace(/(^|[^_])_([^_]+)_/g, "$1<em>$2</em>");
  return value.replace(/\u0000(\d+)\u0000/g, (_, index) => tokens[Number(index)]);
}

function splitTableRow(line) {
  return line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
}

function isBlockStart(lines, index) {
  const line = lines[index] || "";
  const next = lines[index + 1] || "";
  return /^#{1,6}\s+/.test(line) || /^```/.test(line) || /^>\s?/.test(line) ||
    /^\s*[-*+]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line) ||
    /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line) ||
    (/\|/.test(line) && /^\s*\|?\s*:?-{3,}/.test(next)) ||
    /^<(?:address|article|aside|blockquote|details|div|figure|h[1-6]|hr|ol|p|pre|section|table|ul)\b/i.test(line);
}

function renderMarkdown(markdown) {
  const lines = String(markdown).replaceAll("\r\n", "\n").split("\n");
  const output = [];

  for (let index = 0; index < lines.length;) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = line.match(/^```\s*([\w+-]*)\s*$/);
    if (fence) {
      const code = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      if (index === lines.length) throw new Error("Unterminated fenced code block in Markdown");
      index += 1;
      const language = fence[1] ? ` class="language-${escapeHtml(fence[1])}"` : "";
      output.push(`<pre><code${language}>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2].replace(/\s+#+\s*$/, "");
      output.push(`<h${level} id="${slugify(text.replace(/[*_`~]/g, ""))}">${renderInline(text)}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      output.push("<hr>");
      index += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      output.push(`<blockquote>${renderMarkdown(quote.join("\n"))}</blockquote>`);
      continue;
    }

    const unordered = line.match(/^\s*[-*+]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (unordered || ordered) {
      const tag = unordered ? "ul" : "ol";
      const pattern = unordered ? /^\s*[-*+]\s+(.+)$/ : /^\s*\d+[.)]\s+(.+)$/;
      const items = [];
      while (index < lines.length) {
        const item = lines[index].match(pattern);
        if (!item) break;
        items.push(`<li>${renderInline(item[1])}</li>`);
        index += 1;
      }
      output.push(`<${tag}>${items.join("")}</${tag}>`);
      continue;
    }

    if (/\|/.test(line) && /^\s*\|?\s*:?-{3,}/.test(lines[index + 1] || "")) {
      const headers = splitTableRow(line);
      index += 2;
      const rows = [];
      while (index < lines.length && /\|/.test(lines[index]) && lines[index].trim()) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      output.push(`<div class="table-wrap"><table><thead><tr>${headers.map((cell) => `<th>${renderInline(cell)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      continue;
    }

    if (/^<(?:address|article|aside|blockquote|details|div|figure|h[1-6]|hr|ol|p|pre|section|table|ul)\b/i.test(line)) {
      const raw = [];
      while (index < lines.length && lines[index].trim()) {
        raw.push(lines[index]);
        index += 1;
      }
      output.push(raw.join("\n"));
      continue;
    }

    const paragraph = [line.trim()];
    index += 1;
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines, index)) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    output.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
  }

  return output.join("\n");
}

function formatDate(date, style = "long") {
  const options = style === "numeric"
    ? { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }
    : { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" };
  return new Intl.DateTimeFormat(site.locale, options).format(date);
}

function buildTaxonomy(posts, field) {
  const map = new Map();
  for (const post of posts) {
    for (const term of post[field]) {
      const key = term.toLocaleLowerCase(site.locale);
      if (!map.has(key)) map.set(key, { name: term, slug: slugify(term), posts: [] });
      map.get(key).posts.push(post);
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, site.locale));
}

function postMeta(post, showTags = false) {
  const categories = post.categories.map((name) => `<a href="/category/${slugify(name)}/">${escapeHtml(name)}</a>`).join(", ");
  const tags = post.tags.map((name) => `<a href="/tag/${slugify(name)}/">#${escapeHtml(name)}</a>`).join(" ");
  return `<div class="meta"><span>Published <time datetime="${escapeHtml(post.dateSource)}">${formatDate(post.date)}</time></span><span>Updated <time datetime="${escapeHtml(post.updatedSource)}">${formatDate(post.updatedDate)}</time></span><span>By ${escapeHtml(post.author)}</span>${categories ? `<span>${categories}</span>` : ""}${showTags && tags ? `<span class="meta-tags" aria-label="Tags">${tags}</span>` : ""}</div>`;
}

function postCard(post, heading = 2) {
  return `<article class="post-card">
    ${postMeta(post, true)}
    <h${heading}><a href="${post.route}">${escapeHtml(post.title)}</a></h${heading}>
    <p>${escapeHtml(post.description)}</p>
  </article>`;
}

function archiveList(posts) {
  if (!posts.length) return '<p class="empty-state">No articles have been published here yet.</p>';
  return `<ol class="archive-list">${posts.map((post) => {
    const tags = post.tags.map((name) => `<a href="/tag/${slugify(name)}/">#${escapeHtml(name)}</a>`).join("");
    return `<li><time datetime="${escapeHtml(post.dateSource)}">${formatDate(post.date, "numeric")}</time><div class="archive-entry"><a class="archive-title" href="${post.route}">${escapeHtml(post.title)}</a><div class="archive-updated">Updated <time datetime="${escapeHtml(post.updatedSource)}">${formatDate(post.updatedDate)}</time></div>${tags ? `<div class="archive-tags" aria-label="Tags">${tags}</div>` : ""}</div></li>`;
  }).join("")}</ol>`;
}

let allPosts = [];
let categoryTerms = [];
let tagTerms = [];

function sidebar() {
  const months = new Map();
  for (const post of allPosts) {
    const key = `${post.year}/${post.month}`;
    if (!months.has(key)) months.set(key, { year: post.year, month: post.month, count: 0 });
    months.get(key).count += 1;
  }
  return `<aside class="sidebar" aria-label="Additional information">
    <section class="sidebar-card">
      <h2>Recent Posts</h2>
      <ul>${allPosts.slice(0, 5).map((post) => `<li><a href="${post.route}">${escapeHtml(post.title)}</a></li>`).join("") || "<li>No recent posts</li>"}</ul>
    </section>
    <section class="sidebar-card">
      <h2>Archives</h2>
      <ul>${[...months.values()].sort((a, b) => `${b.year}${b.month}`.localeCompare(`${a.year}${a.month}`)).map(({ year, month, count }) => `<li><a href="/${year}/${month}/"><span>${englishMonths[Number(month) - 1]} ${year}</span><span class="count">${count}</span></a></li>`).join("") || "<li>The archive is empty</li>"}</ul>
    </section>
    <section class="sidebar-card">
      <h2>Categories</h2>
      <ul>${categoryTerms.map((term) => `<li><a href="/category/${term.slug}/"><span>${escapeHtml(term.name)}</span><span class="count">${term.posts.length}</span></a></li>`).join("") || "<li>No categories</li>"}</ul>
    </section>
    <section class="sidebar-card">
      <h2>Tags</h2>
      <div class="tag-cloud">${tagTerms.map((term) => `<a href="/tag/${term.slug}/">${escapeHtml(term.name)}</a>`).join("") || "No tags"}</div>
    </section>
  </aside>`;
}

function navLink(route, label, current) {
  return `<a href="${route}"${current === route ? ' aria-current="page"' : ""}>${label}</a>`;
}

function layout({ title, description, route, content, current = "", type = "website", noIndex = false, hero = "", single = false }) {
  const fullTitle = title === site.title ? site.title : `${title} | ${site.title}`;
  const canonical = absoluteUrl(route);
  return `<!doctype html>
<html lang="${site.language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(fullTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}">
${noIndex ? '  <meta name="robots" content="noindex">' : ""}
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <link rel="alternate" type="application/rss+xml" title="${escapeHtml(site.title)}" href="/feed.xml">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="stylesheet" href="/assets/style.css">
  <meta property="og:type" content="${type}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:site_name" content="${escapeHtml(site.title)}">
</head>
<body>
  <a class="skip-link" href="#content">Skip to content</a>
  <header class="site-header">
    <div class="header-inner">
      <div class="brand">
        <div class="brand-text">
          <p class="site-title"><a href="/">CNA's Blog</a></p>
          <p class="site-tagline">Blog for CNA – Reimplementation of XNA 4.0</p>
        </div>
      </div>
      <nav class="site-nav" aria-label="Primary navigation">
        ${navLink("/", "Articles", current)}
        ${navLink("/categories/", "Categories", current)}
        ${navLink("/tags/", "Tags", current)}
        ${navLink("/archive/", "Archive", current)}
        ${navLink("/about/", "About", current)}
      </nav>
    </div>
  </header>
${hero}
  <div class="page-shell${single ? " single-layout" : ""}">
    <main class="main-content" id="content">${content}</main>
    ${sidebar()}
  </div>
  <footer class="site-footer">
    <div class="footer-inner">
      <p>© ${new Date().getUTCFullYear()} ${escapeHtml(site.title)}.</p>
      <p><a href="https://libcna.com/">libcna.com</a> · <a href="https://github.com/libcna">GitHub</a> · <a href="/feed.xml">RSS</a></p>
    </div>
  </footer>
</body>
</html>`;
}

async function writeRoute(route, html, writtenRoutes) {
  const normalized = normalizeRoute(route);
  if (writtenRoutes.has(normalized)) throw new Error(`Duplicate output URL: ${normalized}`);
  writtenRoutes.add(normalized);
  const target = outputPathForRoute(normalized);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, html, "utf8");
}

function renderPost(post) {
  const categoryLinks = post.categories.map((name) => `<a href="/category/${slugify(name)}/">${escapeHtml(name)}</a>`);
  const tagLinks = post.tags.map((name) => `<a href="/tag/${slugify(name)}/">#${escapeHtml(name)}</a>`);
  const content = `<article class="article">
    <header class="article-header">
      ${postMeta(post)}
      <h1 class="article-title">${escapeHtml(post.title)}</h1>
      <p class="article-description">${escapeHtml(post.description)}</p>
    </header>
    <div class="article-body">${renderMarkdown(post.body)}</div>
    ${(categoryLinks.length || tagLinks.length) ? `<footer class="taxonomy-links">${[...categoryLinks, ...tagLinks].join("")}</footer>` : ""}
  </article>`;
  return layout({ title: post.title, description: post.description, route: post.route, content, type: "article", single: true });
}

function renderArchivePage({ title, description, route, posts, current = "/archive/" }) {
  const content = `<h1 class="section-heading">${escapeHtml(title)}</h1><p class="section-intro">${escapeHtml(description)}</p><section class="archive-panel">${archiveList(posts)}</section>`;
  return layout({ title, description, route, content, current });
}

function renderTermsIndex(title, description, route, terms, current, itemBase = route) {
  const items = terms.map((term) => `<li><a href="${itemBase}${term.slug}/"><span>${escapeHtml(term.name)}</span><span class="count">${term.posts.length}</span></a></li>`).join("");
  const content = `<h1 class="section-heading">${escapeHtml(title)}</h1><p class="section-intro">${escapeHtml(description)}</p><section class="archive-panel"><ul class="term-grid">${items || "<li>The list is empty.</li>"}</ul></section>`;
  return layout({ title, description, route, content, current });
}

function redirectPage(from, to) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="robots" content="noindex"><link rel="canonical" href="${escapeHtml(absoluteUrl(to))}"><meta http-equiv="refresh" content="0; url=${escapeHtml(to)}"><title>Redirect | ${escapeHtml(site.title)}</title></head><body><p>This article has moved to <a href="${escapeHtml(to)}">a new address</a>.</p></body></html>`;
}

function rss(posts) {
  const items = posts.slice(0, 30).map((post) => `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(absoluteUrl(post.route))}</link>
      <guid isPermaLink="true">${escapeXml(absoluteUrl(post.route))}</guid>
      <pubDate>${post.date.toUTCString()}</pubDate>
      <description>${escapeXml(post.description)}</description>
    </item>`).join("\n");
  const lastBuild = posts[0]?.date.toUTCString() || new Date().toUTCString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(site.title)}</title>
    <link>${escapeXml(`${site.url}/`)}</link>
    <description>${escapeXml(site.description)}</description>
    <language>${escapeXml(site.language)}</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
${items}
  </channel>
</rss>\n`;
}

function sitemap(routes) {
  const urls = [...routes]
    .filter((route) => !path.posix.extname(route) || route === "/")
    .sort()
    .map((route) => `  <url><loc>${escapeXml(absoluteUrl(route))}</loc></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>\n`;
}

async function build() {
  allPosts = await loadPosts();
  const pages = await loadPages();
  categoryTerms = buildTaxonomy(allPosts, "categories");
  tagTerms = buildTaxonomy(allPosts, "tags");
  const writtenRoutes = new Set();
  const aliasRoutes = new Set();

  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });
  await cp(publicRoot, outputRoot, { recursive: true });

  const homePosts = allPosts.slice(0, site.postsOnHome);
  const homeHero = `<section class="home-intro"><p class="eyebrow">CNA development blog</p><h1>${escapeHtml(site.description)}</h1><p>Follow the framework's development, architecture, graphics work, tools, releases, and related projects.</p></section>`;
  const homeContent = `<h2 class="section-heading">Latest articles</h2><div class="post-list">${homePosts.map((post) => postCard(post)).join("") || '<p class="empty-state">No articles have been published yet.</p>'}</div>`;
  await writeRoute("/", layout({ title: site.title, description: site.description, route: "/", content: homeContent, current: "/", hero: homeHero }), writtenRoutes);

  for (const post of allPosts) {
    await writeRoute(post.route, renderPost(post), writtenRoutes);
    for (const alias of post.aliases) {
      if (alias === post.route) continue;
      await writeRoute(alias, redirectPage(alias, post.route), writtenRoutes);
      aliasRoutes.add(alias);
    }
  }

  for (const page of pages) {
    const content = `<article class="article"><header class="article-header"><h1 class="article-title">${escapeHtml(page.title)}</h1><p class="article-description">${escapeHtml(page.description)}</p></header><div class="article-body">${renderMarkdown(page.body)}</div></article>`;
    await writeRoute(page.route, layout({ title: page.title, description: page.description, route: page.route, content, current: page.route, single: true }), writtenRoutes);
  }

  await writeRoute("/archive/", renderArchivePage({ title: "Article archive", description: "Every article, newest first.", route: "/archive/", posts: allPosts }), writtenRoutes);
  await writeRoute("/categories/", renderTermsIndex("Categories", "Broad topics used to organize published articles.", "/categories/", categoryTerms, "/categories/", "/category/"), writtenRoutes);
  await writeRoute("/tags/", renderTermsIndex("Tags", "Detailed labels used across the article collection.", "/tags/", tagTerms, "/tags/", "/tag/"), writtenRoutes);

  for (const term of categoryTerms) {
    const route = `/category/${term.slug}/`;
    await writeRoute(route, renderArchivePage({ title: `Category: ${term.name}`, description: `Articles in the ${term.name} category.`, route, posts: term.posts, current: "/categories/", trail: [{ label: "Categories", route: "/categories/" }] }), writtenRoutes);
  }
  for (const term of tagTerms) {
    const route = `/tag/${term.slug}/`;
    await writeRoute(route, renderArchivePage({ title: `Tag: ${term.name}`, description: `Articles tagged ${term.name}.`, route, posts: term.posts, current: "/tags/", trail: [{ label: "Tags", route: "/tags/" }] }), writtenRoutes);
  }

  const yearGroups = new Map();
  const monthGroups = new Map();
  const dayGroups = new Map();
  for (const post of allPosts) {
    const yearKey = post.year;
    const monthKey = `${post.year}/${post.month}`;
    const dayKey = `${post.year}/${post.month}/${post.day}`;
    if (!yearGroups.has(yearKey)) yearGroups.set(yearKey, []);
    if (!monthGroups.has(monthKey)) monthGroups.set(monthKey, []);
    if (!dayGroups.has(dayKey)) dayGroups.set(dayKey, []);
    yearGroups.get(yearKey).push(post);
    monthGroups.get(monthKey).push(post);
    dayGroups.get(dayKey).push(post);
  }

  for (const [year, posts] of yearGroups) {
    const route = `/${year}/`;
    await writeRoute(route, renderArchivePage({ title: year, description: `Articles published in ${year}.`, route, posts, trail: [{ label: "Archive", route: "/archive/" }] }), writtenRoutes);
  }
  for (const [key, posts] of monthGroups) {
    const [year, month] = key.split("/");
    const route = `/${year}/${month}/`;
    const title = `${englishMonths[Number(month) - 1]} ${year}`;
    await writeRoute(route, renderArchivePage({ title, description: `Articles published in ${title}.`, route, posts, trail: [{ label: "Archive", route: "/archive/" }, { label: year, route: `/${year}/` }] }), writtenRoutes);
  }
  for (const [key, posts] of dayGroups) {
    const [year, month, day] = key.split("/");
    const route = `/${year}/${month}/${day}/`;
    const title = `${englishMonths[Number(month) - 1]} ${Number(day)}, ${year}`;
    await writeRoute(route, renderArchivePage({ title, description: `Articles published on ${title}.`, route, posts, trail: [{ label: "Archive", route: "/archive/" }, { label: year, route: `/${year}/` }, { label: englishMonths[Number(month) - 1], route: `/${year}/${month}/` }] }), writtenRoutes);
  }

  const notFound = layout({ title: "Page not found", description: "The requested page does not exist on this blog.", route: "/404.html", noIndex: true, content: '<h1 class="section-heading">Page not found</h1><p class="section-intro">The link may be outdated. Continue to the <a href="/">latest articles</a> or browse the <a href="/archive/">archive</a>.</p>' });
  await writeRoute("/404.html", notFound, writtenRoutes);

  await writeFile(path.join(outputRoot, "feed.xml"), rss(allPosts), "utf8");
  const canonicalRoutes = [...writtenRoutes].filter((route) => !aliasRoutes.has(route));
  await writeFile(path.join(outputRoot, "sitemap.xml"), sitemap(canonicalRoutes), "utf8");

  const postLabel = allPosts.length === 1 ? "post" : "posts";
  const pageLabel = pages.length === 1 ? "page" : "pages";
  const routeLabel = writtenRoutes.size === 1 ? "HTML route" : "HTML routes";
  console.log(`Built ${allPosts.length} ${postLabel}, ${pages.length} ${pageLabel}, and ${writtenRoutes.size} ${routeLabel}.`);
  console.log(`Output: ${outputRoot}`);
}

build().catch((error) => {
  console.error(`Build failed: ${error.message}`);
  process.exitCode = 1;
});

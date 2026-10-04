import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(projectRoot, "dist");
const port = Number(process.env.PORT || 8080);
const hostname = process.env.HOST || "127.0.0.1";

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
  [".xml", "application/xml; charset=utf-8"]
]);

async function findFile(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  const relative = decoded.replace(/^\/+/, "");
  const candidate = path.resolve(outputRoot, relative || "index.html");
  if (candidate !== outputRoot && !candidate.startsWith(`${outputRoot}${path.sep}`)) return null;

  try {
    const info = await stat(candidate);
    if (info.isDirectory()) return path.join(candidate, "index.html");
    if (info.isFile()) return candidate;
  } catch {
    if (!path.extname(candidate)) {
      try {
        const fallback = path.join(candidate, "index.html");
        if ((await stat(fallback)).isFile()) return fallback;
      } catch {
        return null;
      }
    }
  }
  return null;
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  const filePath = await findFile(url.pathname);
  const selected = filePath || path.join(outputRoot, "404.html");

  if (!filePath) response.statusCode = 404;
  response.setHeader("Content-Type", contentTypes.get(path.extname(selected).toLowerCase()) || "application/octet-stream");
  response.setHeader("X-Content-Type-Options", "nosniff");
  createReadStream(selected).on("error", () => {
    response.statusCode = 500;
    response.end("Build the site first with npm run build.\n");
  }).pipe(response);
});

server.on("error", (error) => {
  console.error(`The local server could not start: ${error.message}`);
  process.exitCode = 1;
});

server.listen(port, hostname, () => {
  console.log(`Blog preview: http://${hostname}:${port}`);
  console.log("Press Ctrl+C to stop the server.");
});

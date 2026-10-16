import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 4173);
const publicFiles = new Set(["index.html", "nara.html", "my-room.css", "my-room.js", "fan-model.js", "styles.css", "app.js", "planner.js", "cart-model.js", "festival-data.js", "data/goods.json", "data/songs.json", "data/lives.json", "data/size-charts.json", "data/activity-slots.json", "assets/favicon.svg"]);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml" };
http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    if (!publicFiles.has(relative)) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }
    const content = await readFile(path.join(root, relative));
    response.writeHead(200, { "Content-Type": types[path.extname(relative)], "Cache-Control": "no-store" });
    response.end(content);
  } catch {
    response.writeHead(400);
    response.end("Bad request");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`ZUTOMAYO MY ROOM: http://127.0.0.1:${port}`);
});

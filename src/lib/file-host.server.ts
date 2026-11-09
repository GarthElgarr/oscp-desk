import { createServer, type Server } from "node:http";
import { listUploads, readUpload } from "./uploads.server.ts";

export const FILE_HOST_PORT = 80;
const HEADER = "x-oscp-files";

let server: Server | null = null;
let listenError = "";

/** OSCP_FILE_PORT overrides the uploads listener. The default is 80. */
export function fileHostPort(): number {
  const raw = process.env.OSCP_FILE_PORT?.trim() ?? "";
  if (/^\d+$/.test(raw)) {
    const n = Number(raw);
    if (n >= 1 && n <= 65535) return n;
  }
  return FILE_HOST_PORT;
}

function escape(value: string): string {
  return value
    .replaceAll("&", "\u0026amp;")
    .replaceAll("<", "\u0026lt;")
    .replaceAll(">", "\u0026gt;")
    .replaceAll('"', "\u0026quot;");
}

export function startFileHost(): void {
  if (server) return;
  const port = fileHostPort();
  server = createServer((req, res) => {
    void handle(req, res);
  });
  server.on("error", (err: NodeJS.ErrnoException) => {
    listenError = err.code === "EADDRINUSE" ? `Something else is already listening on port ${port}. On Kali that is often Apache. Run: systemctl stop apache2` : err.code === "EACCES" ? `Port ${port} needs the desk to be started as root.` : err.message;
    console.error("[file-host]", listenError);
  });
  server.listen(port, "0.0.0.0");
}

async function handle(req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse) {
  try {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { [HEADER]: "1" });
      res.end("GET only");
      return;
    }
    const pathname = new URL(req.url ?? "/", "http://127.0.0.1").pathname;
    let rel = "";
    try {
      rel = decodeURIComponent(pathname).replace(/^\/+/, "");
    } catch {
      res.writeHead(400, { [HEADER]: "1" });
      res.end("Bad path");
      return;
    }
    if (!rel) {
      const listing = await listUploads();
      const items = listing.files
        .map((file) => {
          const href = file.name.split("/").map(encodeURIComponent).join("/");
          return `<li><a href="/${escape(href)}">${escape(file.name)}</a> (${file.size} bytes)</li>`;
        })
        .join("");
      const body = `<!doctype html><meta charset="utf-8"><title>File transfer</title><h1>File transfer</h1><p>These files are the desk uploads folder.</p><ul>${items || "<li>The folder is empty.</li>"}</ul>`;
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", [HEADER]: "1", "cache-control": "no-store" });
      res.end(req.method === "HEAD" ? undefined : body);
      return;
    }
    const file = await readUpload(rel);
    if (!file) {
      res.writeHead(404, { [HEADER]: "1", "content-type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    const filename = file.name.replace(/["\r\n]/g, "");
    res.writeHead(200, {
      "content-type": "application/octet-stream",
      "content-length": String(file.bytes.byteLength),
      "content-disposition": `attachment; filename="${filename}"`,
      [HEADER]: "1",
      "cache-control": "no-store",
    });
    res.end(req.method === "HEAD" ? undefined : file.bytes);
  } catch {
    if (!res.headersSent) res.writeHead(500, { [HEADER]: "1" });
    res.end("Error");
  }
}

export async function fileHostStatus(): Promise<{ ok: boolean; error: string; port: number }> {
  const port = fileHostPort();
  if (listenError) return { ok: false, error: listenError, port };
  try {
    const response = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(800) });
    if (response.headers.get(HEADER) === "1") return { ok: true, error: "", port };
    return { ok: false, error: `Port ${port} answered, but it is not this uploads folder.`, port };
  } catch {
    return { ok: false, error: listenError || `Port ${port} is not listening yet.`, port };
  }
}

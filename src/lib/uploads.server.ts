import { lstat, mkdir, readdir, readFile, realpath } from "node:fs/promises";
import path from "node:path";

export type UploadFile = {
  name: string;
  size: number;
  mtime: number;
};

const MAX_BYTES = 200 * 1024 * 1024;

export function uploadsRoot(): string {
  const fromEnv = process.env.OSCP_UPLOADS?.trim();
  if (fromEnv) return path.resolve(fromEnv);
  return path.resolve(process.cwd(), "uploads");
}

/** Path segments inside the uploads folder, or null if the name tries to leave it. */
export function safeParts(rel: string): string[] | null {
  const cleaned = rel.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!cleaned || cleaned.includes("\0")) return null;
  const parts = cleaned.split("/");
  if (parts.some((part) => part === "" || part === "." || part === ".." || part.startsWith("."))) return null;
  return parts;
}

export async function listUploads(): Promise<{ root: string; files: UploadFile[] }> {
  const root = uploadsRoot();
  await mkdir(root, { recursive: true });
  const files: UploadFile[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        await walk(full);
        continue;
      }
      if (!entry.isFile()) continue;
      const st = await lstat(full);
      if (!st.isFile()) continue;
      files.push({
        name: path.relative(root, full).split(path.sep).join("/"),
        size: st.size,
        mtime: st.mtimeMs,
      });
    }
  }

  await walk(root);
  files.sort((a, b) => a.name.localeCompare(b.name));
  return { root, files };
}

export async function readUpload(rel: string): Promise<{ name: string; bytes: Buffer } | null> {
  const parts = safeParts(rel);
  if (!parts) return null;
  const root = uploadsRoot();
  const realRoot = await realpath(root).catch(() => null);
  if (!realRoot) return null;
  const full = path.resolve(realRoot, ...parts);
  const inside = path.relative(realRoot, full);
  if (inside.startsWith("..") || path.isAbsolute(inside)) return null;
  const st = await lstat(full).catch(() => null);
  if (!st?.isFile() || st.size > MAX_BYTES) return null;
  const real = await realpath(full);
  const stillInside = path.relative(realRoot, real);
  if (stillInside.startsWith("..") || path.isAbsolute(stillInside)) return null;
  return { name: path.basename(real), bytes: await readFile(real) };
}

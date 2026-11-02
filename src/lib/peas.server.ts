import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { STANDARD_PEAS, peasBytesOk, peasHostOk } from "./peas";
import { uploadsRoot } from "./uploads.server";

export type PeasResult = {
  lines: string[];
};

async function one(root: string, name: string, url: string, force: boolean): Promise<string> {
  const dest = path.join(root, name);
  if (!force) {
    const existing = await stat(dest).catch(() => null);
    if (existing?.isFile() && existing.size > 4096) return `${name}: already in the uploads folder`;
  }
  try {
    const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(90_000) });
    if (!response.ok) return `${name}: the download returned ${response.status}`;
    if (!peasHostOk(response.url)) return `${name}: the download left GitHub, so it was not saved`;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!peasBytesOk(name, bytes.length, bytes.subarray(0, 80))) return `${name}: the download was not the script, so it was not saved`;
    await writeFile(dest, bytes);
    return `${name}: saved (${Math.round(bytes.length / 1024)} KB)`;
  } catch (err) {
    const message = err instanceof Error ? err.message : "download failed";
    return `${name}: ${message}`;
  }
}

/** Fetch linpeas and winpeas into the uploads folder. Existing files stay unless force is set. */
export async function ensureStandardUploads(force = false): Promise<PeasResult> {
  const root = uploadsRoot();
  await mkdir(root, { recursive: true });
  const lines: string[] = [];
  for (const item of STANDARD_PEAS) lines.push(await one(root, item.name, item.url, force));
  return { lines };
}

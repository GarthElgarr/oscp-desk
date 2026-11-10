import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";

/** Create a desk directory and force 0700, including an existing scans/ or data/ parent. */
export function ensurePrivateDir(dir: string): void {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  chmodSync(dir, 0o700);
  const parent = path.dirname(dir);
  const name = path.basename(parent);
  if (parent !== dir && (name === "scans" || name === "data")) chmodSync(parent, 0o700);
}

export function writePrivateFile(file: string, data: string): void {
  ensurePrivateDir(path.dirname(file));
  writeFileSync(file, data, { mode: 0o600 });
  chmodSync(file, 0o600);
}

export async function writePrivateFileAsync(file: string, data: string): Promise<void> {
  ensurePrivateDir(path.dirname(file));
  await writeFile(file, data, { mode: 0o600 });
  chmodSync(file, 0o600);
}

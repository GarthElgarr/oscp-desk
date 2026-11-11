import { chmodSync, closeSync, constants, lstatSync, mkdirSync, openSync, writeSync } from "node:fs";
import path from "node:path";

/** Create a desk directory and force 0700, including an existing scans/ or data/ parent. */
export function ensurePrivateDir(dir: string): void {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  chmodSync(dir, 0o700);
  const parent = path.dirname(dir);
  const name = path.basename(parent);
  if (parent !== dir && (name === "scans" || name === "data")) chmodSync(parent, 0o700);
}

/** Write without following a symlink at the final path. A symlink is refused. */
function writeNoFollow(file: string, data: string): void {
  ensurePrivateDir(path.dirname(file));
  try {
    if (lstatSync(file).isSymbolicLink()) {
      const error = new Error("That file is a symlink. The desk will not follow it.") as NodeJS.ErrnoException;
      error.code = "ELOOP";
      throw error;
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
  const fd = openSync(file, constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | constants.O_NOFOLLOW, 0o600);
  try {
    writeSync(fd, data);
  } finally {
    closeSync(fd);
  }
  chmodSync(file, 0o600);
}

export function writePrivateFile(file: string, data: string): void {
  writeNoFollow(file, data);
}

export async function writePrivateFileAsync(file: string, data: string): Promise<void> {
  writeNoFollow(file, data);
}

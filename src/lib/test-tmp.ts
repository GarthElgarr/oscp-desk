import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { TestContext } from "node:test";

/** A directory under the OS temp dir, removed when the test ends. */
export function testTmp(t: TestContext, prefix: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), prefix));
  t.after(() => {
    rmSync(dir, { recursive: true, force: true });
  });
  return dir;
}

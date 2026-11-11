import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = path.resolve("src");
const STARTS = ["routes/index.tsx", "routes/ai.tsx", "routes/__root.tsx"];
const NODE_SPEC = /(?:from|import)\s*\(?\s*["'](node:|fs|path|child_process|os|crypto)["']/;

function resolveSpec(fromFile: string, spec: string): string | null {
  if (!spec.startsWith(".") && !spec.startsWith("@/")) return null;
  const base = spec.startsWith("@/") ? path.join(ROOT, spec.slice(2)) : path.resolve(path.dirname(fromFile), spec);
  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}.mjs`, path.join(base, "index.ts"), path.join(base, "index.tsx")];
  return candidates.find((file) => existsSync(file) && statSync(file).isFile()) ?? null;
}

function specs(file: string): string[] {
  const text = readFileSync(file, "utf8");
  const found: string[] = [];
  for (const match of text.matchAll(/from\s+["']([^"']+)["']/g)) found.push(match[1] ?? "");
  for (const match of text.matchAll(/import\s*\(\s*["']([^"']+)["']\s*\)/g)) found.push(match[1] ?? "");
  return found;
}

test("pages and components do not import node builtins", () => {
  const seen = new Set<string>();
  const queue = STARTS.map((file) => path.join(ROOT, file));
  const bad: string[] = [];
  while (queue.length) {
    const file = queue.pop();
    if (!file || seen.has(file)) continue;
    seen.add(file);
    const text = readFileSync(file, "utf8");
    if (!file.endsWith(".server.ts") && NODE_SPEC.test(text)) bad.push(path.relative(ROOT, file));
    if (file.endsWith(".server.ts")) continue;
    for (const spec of specs(file)) {
      if (spec.startsWith("node:")) {
        bad.push(`${path.relative(ROOT, file)} -> ${spec}`);
        continue;
      }
      const next = resolveSpec(file, spec);
      if (next) queue.push(next);
    }
  }
  assert.deepEqual(bad, []);
  assert.ok(seen.has(path.join(ROOT, "lib/hydra-args.ts")));
  assert.ok(seen.has(path.join(ROOT, "lib/wfuzz-args.ts")));
  assert.equal(seen.has(path.join(ROOT, "lib/output-path.ts")), false);
});

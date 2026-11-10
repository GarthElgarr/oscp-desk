import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { devPathDenied } from "./dev-private.ts";

test("the dev server hides the repo and still serves the uploads route", () => {
  const hidden = [
    "/scans/runs.json",
    "/scans/",
    "/uploads/",
    "/data/exam-ledger.json",
    "/.grok/",
    "/.grok/app-env.json",
    "/.git/config",
    "/package.json",
    "/.env",
    "/.env.local",
    "/loot-users-abc.txt",
    "/@fs/etc/passwd",
    "/files/%2e%2e/scans/runs.json",
    "/files/%252e%252e/scans/runs.json",
    "/src/lib/auth/preview.ts",
    "/src/lib/auth/preview.ts?raw",
    "/src/lib/auth/preview.ts?import",
    "/src//lib/auth/preview.ts",
    "/src/lib/auth/./preview.ts",
    "/src/lib/auth/preview",
    "/src/lib/auth/preview?raw",
    "/src/lib/auth/server.ts",
    "/src/lib/auth/server.ts?raw",
    "/src/lib/auth/server.ts?import",
    "/src/lib//auth/server.ts?raw",
    "/src/./lib/auth/server",
    "/src/lib/auth/server?raw",
    "/src/lib/live-jobs.server.ts",
    "/src/lib/live-jobs.server.ts?raw",
    "/src/lib/api-guard.server.ts?import",
  ];
  for (const url of hidden) assert.equal(devPathDenied(url), true, url);
  assert.equal(devPathDenied("/"), false);
  assert.equal(devPathDenied("/files/README.txt"), false);
  assert.equal(devPathDenied("/@fs/workspace/node_modules/react/index.js"), false);
  assert.equal(devPathDenied("/src/router.tsx"), false);
  assert.equal(devPathDenied("/src/lib/auth/provider.tsx"), false);
  assert.equal(devPathDenied("/src/routes/__root.tsx"), false);
});

test("the preview client does not keep a secret in source", () => {
  const source = readFileSync(new URL("./auth/preview.ts", import.meta.url), "utf8");
  assert.equal(/[0-9a-f]{32}/i.test(source), false);
});

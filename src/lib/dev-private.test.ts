import assert from "node:assert/strict";
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
  ];
  for (const url of hidden) assert.equal(devPathDenied(url), true, url);
  assert.equal(devPathDenied("/"), false);
  assert.equal(devPathDenied("/files/README.txt"), false);
  assert.equal(devPathDenied("/@fs/workspace/node_modules/react/index.js"), false);
});

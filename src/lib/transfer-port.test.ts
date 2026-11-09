import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { transferPortWarning } from "./transfer-plan.ts";

test("the transfer warning follows the file host, not every low port", () => {
  assert.equal(transferPortWarning("80", { port: 80, listening: true }), null);
  assert.match(transferPortWarning("80", { port: 80, listening: false }) ?? "", /running as root/);
  assert.match(transferPortWarning("8000", { port: 80, listening: true }) ?? "", /port 80 only/);
  assert.match(transferPortWarning("8000", { port: 80, listening: true }) ?? "", /python3 -m http\.server 8000/);
  assert.equal(transferPortWarning("1024", { port: 1024, listening: true }), null);
  const panel = readFileSync(new URL("../components/uploads-panel.tsx", import.meta.url), "utf8");
  assert.match(panel, /transferPortWarning\(port, \{ port: listing\.hostPort, listening: listing\.hostOk \}\)/);
  assert.match(panel, /hostPort/);
  const tunnel = readFileSync(new URL("../components/tunnel-builder.tsx", import.meta.url), "utf8");
  assert.match(tunnel, /if \(!listing \|\| portTouched\) return;/);
  assert.match(tunnel, /setFilePort\(String\(listing\.hostPort\)\)/);
  assert.match(tunnel, /setPortTouched\(true\)/);
  assert.match(tunnel, /transferPortWarning\(filePort, \{ port: listing\.hostPort, listening: listing\.hostOk \}\)/);
});

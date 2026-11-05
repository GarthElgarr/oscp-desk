import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { transferPortWarning } from "./transfer-plan.ts";

test("a transfer port below 1024 warns that the file host needs root", () => {
  assert.match(transferPortWarning("80") ?? "", /running as root/);
  assert.match(transferPortWarning("443") ?? "", /below 1024/);
  assert.equal(transferPortWarning("8000"), null);
  assert.equal(transferPortWarning("1024"), null);
  const panel = readFileSync(new URL("../components/uploads-panel.tsx", import.meta.url), "utf8");
  assert.match(panel, /transferPortWarning\(port\)/);
});

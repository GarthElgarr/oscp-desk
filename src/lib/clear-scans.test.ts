import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { readLedger, updateLedger } from "./exam-ledger.server.ts";
import { clearScanFiles } from "./live-jobs.server.ts";
import { testTmp } from "./test-tmp.ts";

test("clearing scans leaves the exam ledger in data/", async (t) => {
  const root = testTmp(t, "oscp-ledger-");
  mkdirSync(path.join(root, "scans"), { recursive: true });
  writeFileSync(path.join(root, "scans", "exam-ledger.json"), JSON.stringify({ on: true, startedAt: 0, meterpreterHost: "", scope: [], hosts: [], msf: [], audit: [] }));
  writeFileSync(path.join(root, "scans", "notes.txt"), "gone");
  writeFileSync(path.join(root, "scans", "keep.tmp"), "stay");
  const now = Date.now();
  const before = await updateLedger({ action: "host", ip: "10.10.10.5", note: "dc" }, now, root);
  assert.equal(before.error, undefined);
  assert.equal(before.ledger.hosts[0]?.ip, "10.10.10.5");
  clearScanFiles(root);
  const after = readLedger(root);
  assert.equal(after?.hosts[0]?.ip, "10.10.10.5");
  assert.equal(after?.hosts[0]?.note, "dc");
  assert.equal(readFileSync(path.join(root, "scans", "keep.tmp"), "utf8"), "stay");
  assert.throws(() => readFileSync(path.join(root, "scans", "notes.txt"), "utf8"));
  assert.equal(readFileSync(path.join(root, "data", "exam-ledger.json"), "utf8").includes("10.10.10.5"), true);
});

import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import test, { type TestContext } from "node:test";
import { ledgerFile, legacyLedgerFile, migrateLedger } from "./exam-ledger.server.ts";
import { testTmp } from "./test-tmp.ts";

const MOVED = '{"on":false,"scope":["10.10.10.5"]}\n';
const KEPT = '{"on":true,"scope":["10.10.10.0/24"]}\n';

function tempRoot(t: TestContext): string {
  return testTmp(t, "oscp-ledger-");
}

test("a legacy exam ledger moves into data and stays there", (t) => {
  const dir = tempRoot(t);
  mkdirSync(path.join(dir, "scans"));
  writeFileSync(legacyLedgerFile(dir), MOVED);

  migrateLedger(dir);
  assert.equal(readFileSync(ledgerFile(dir), "utf8"), MOVED);
  assert.equal(existsSync(legacyLedgerFile(dir)), false);

  const stamp = statSync(ledgerFile(dir)).mtimeMs;
  migrateLedger(dir);
  assert.equal(readFileSync(ledgerFile(dir), "utf8"), MOVED);
  assert.equal(existsSync(legacyLedgerFile(dir)), false);
  assert.equal(statSync(ledgerFile(dir)).mtimeMs, stamp);

  const both = tempRoot(t);
  mkdirSync(path.join(both, "scans"));
  mkdirSync(path.join(both, "data"));
  writeFileSync(legacyLedgerFile(both), MOVED);
  writeFileSync(ledgerFile(both), KEPT);
  migrateLedger(both);
  assert.equal(readFileSync(ledgerFile(both), "utf8"), KEPT);
  assert.equal(readFileSync(legacyLedgerFile(both), "utf8"), MOVED);
  migrateLedger(both);
  assert.equal(readFileSync(ledgerFile(both), "utf8"), KEPT);
  assert.equal(readFileSync(legacyLedgerFile(both), "utf8"), MOVED);
});

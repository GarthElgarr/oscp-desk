import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { ledgerFile, legacyLedgerFile, migrateLedger } from "./exam-ledger.server.ts";

const MOVED = '{"on":false,"scope":["10.10.10.5"]}\n';
const KEPT = '{"on":true,"scope":["10.10.10.0/24"]}\n';

function tempRoot(): string {
  return mkdtempSync(path.join(tmpdir(), "oscp-ledger-"));
}

test("a legacy exam ledger moves into data and stays there", () => {
  const dir = tempRoot();
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

  const both = tempRoot();
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

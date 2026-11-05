import assert from "node:assert/strict";
import test from "node:test";
import { transferOsForFile } from "./transfer-plan.ts";

test("a transfer file picks the target operating system from its extension", () => {
  assert.equal(transferOsForFile("linpeas.sh"), "linux");
  assert.equal(transferOsForFile("pspy64"), "linux");
  assert.equal(transferOsForFile("enum.py"), "linux");
  assert.equal(transferOsForFile("winPEAS.exe"), "windows");
  assert.equal(transferOsForFile("Get-Info.ps1"), "windows");
  assert.equal(transferOsForFile("seatbelt.dll"), "windows");
  assert.equal(transferOsForFile("run.bat"), "windows");
  assert.equal(transferOsForFile("notes.dat"), null);
});

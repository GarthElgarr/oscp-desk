import assert from "node:assert/strict";
import { type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";
import test from "node:test";
import { flushLiveJobs, setLiveJobHooks } from "./live-jobs.server.ts";
import { crackFile, hashcatRemoveOk, runHttp, stepsOk, writeCrackFile } from "./run-tool.server.ts";
import { testTmp } from "./test-tmp.ts";

function quietChild(): ChildProcess {
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const child = new EventEmitter() as ChildProcess;
  child.stdout = stdout;
  child.stderr = stderr;
  child.kill = () => true;
  setImmediate(() => {
    stdout.end();
    stderr.end();
    child.emit("close", 0, null);
  });
  return child;
}

test("john and hashcat files stay inside scans/crack", async (t) => {
  assert.equal(stepsOk([{ kind: "write", name: "vite.config.ts", text: "no" }]), false);
  assert.equal(stepsOk([{ kind: "write", name: ".env", text: "no" }]), false);
  assert.equal(stepsOk([{ kind: "exec", bin: "john", args: ["--show", "/etc/shadow"] }]), false);
  assert.equal(stepsOk([{ kind: "exec", bin: "hashcat", args: ["--outfile=/tmp/x", "h.txt"] }]), false);
  assert.equal(
    stepsOk([{ kind: "exec", bin: "hashcat", args: ["-m", "1000", "-a", "0", "scans/crack/h.txt", "/usr/share/wordlists/rockyou.txt"] }]),
    true,
  );
  assert.equal(
    stepsOk([{ kind: "exec", bin: "hashcat", args: ["-m", "0", "--remove", "hashes.txt", "/usr/share/wordlists/rockyou.txt"] }]),
    false,
  );
  assert.equal(
    stepsOk([{ kind: "exec", bin: "hashcat", args: ["-m", "0", "--remove", "scans/crack/hashes.txt", "/usr/share/wordlists/rockyou.txt"] }]),
    true,
  );
  assert.equal(hashcatRemoveOk(["-m", "0", "hashes.txt", "/usr/share/wordlists/rockyou.txt"]), true);
  assert.equal(hashcatRemoveOk(["--remove", "/usr/share/wordlists/dirb/common.txt"]), false);
  assert.equal(hashcatRemoveOk(["-a", "3", "--remove", "scans/crack/hashes.txt", "?a?a?a?a"]), true);
  assert.equal(hashcatRemoveOk(["--remove", "scans/crack/h.hash", "/usr/share/wordlists/rockyou.txt"]), true);
  assert.equal(hashcatRemoveOk(["--remove", "/usr/share/wordlists/rockyou.txt", "scans/crack/h.hash"]), false);
  assert.equal(
    stepsOk([{ kind: "exec", bin: "hashcat", args: ["-m0", "-a0", "scans/crack/h.hash", "/usr/share/wordlists/rockyou.txt"] }]),
    true,
  );
  assert.equal(
    stepsOk([{ kind: "exec", bin: "hashcat", args: ["-m1000", "scans/crack/h.hash", "/usr/share/wordlists/rockyou.txt"] }]),
    true,
  );
  assert.equal(crackFile("vite.config.ts"), null);
  const root = testTmp(t, "oscp-crack-");
  const written = await writeCrackFile("h.txt", "user:hash\n", root);
  assert.equal(written, path.join(root, "scans", "crack", "h.txt"));
  assert.equal(readFileSync(written ?? "", "utf8"), "user:hash\n");
});

test("hashcat --remove is refused when every file is a wordlist", async (t) => {
  const root = mkdtempSync(path.join(tmpdir(), "oscp-remove-"));
  setLiveJobHooks({
    runsFile: path.join(root, "scans", "runs.json"),
    spawn: () => quietChild(),
  });
  t.after(() => {
    try {
      flushLiveJobs();
      setLiveJobHooks({ runsFile: null, spawn: null });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  const wordlist = runHttp(
    { id: "rm-word", tool: "hashcat", steps: [{ kind: "exec", bin: "hashcat", args: ["-m", "0", "--remove", "/usr/share/wordlists/dirb/common.txt"] }] },
    root,
  );
  assert.equal(wordlist.status, 400);
  const hash = runHttp(
    {
      id: "rm-hash",
      tool: "hashcat",
      steps: [{ kind: "exec", bin: "hashcat", args: ["-m", "0", "--remove", "scans/crack/h.hash", "/usr/share/wordlists/rockyou.txt"] }],
    },
    root,
  );
  assert.equal(hash.status, 200);
  const reversed = runHttp(
    {
      id: "rm-rev",
      tool: "hashcat",
      steps: [{ kind: "exec", bin: "hashcat", args: ["-m", "0", "--remove", "/usr/share/wordlists/rockyou.txt", "scans/crack/h.hash"] }],
    },
    root,
  );
  assert.equal(reversed.status, 400);
  const glued = runHttp(
    {
      id: "rm-glued",
      tool: "hashcat",
      steps: [{ kind: "exec", bin: "hashcat", args: ["-m0", "-a0", "scans/crack/h.hash", "/usr/share/wordlists/rockyou.txt"] }],
    },
    root,
  );
  assert.equal(glued.status, 200);
  const mode = runHttp(
    {
      id: "rm-mode",
      tool: "hashcat",
      steps: [{ kind: "exec", bin: "hashcat", args: ["-m1000", "scans/crack/h.hash", "/usr/share/wordlists/rockyou.txt"] }],
    },
    root,
  );
  assert.equal(mode.status, 200);
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
});

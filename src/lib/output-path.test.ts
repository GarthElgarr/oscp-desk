import assert from "node:assert/strict";
import { type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";
import test, { type TestContext } from "node:test";
import { hydraHttp } from "./hydra.server.ts";
import { flushLiveJobs, setLiveJobHooks } from "./live-jobs.server.ts";
import { runHttp } from "./run-tool.server.ts";
import { wfuzzHttp } from "./wfuzz.server.ts";

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

function scoped(t: TestContext): { root: string; seen: { bin: string; args: string[]; cwd?: string }[] } {
  const root = mkdtempSync(path.join(tmpdir(), "oscp-out-"));
  mkdirSync(path.join(root, "data"));
  writeFileSync(
    path.join(root, "data", "exam-ledger.json"),
    JSON.stringify({
      on: true,
      startedAt: 0,
      meterpreterHost: "",
      scope: ["10.10.10.0/24"],
      hosts: [],
      msf: [],
      audit: [],
    }),
  );
  const seen: { bin: string; args: string[]; cwd?: string }[] = [];
  setLiveJobHooks({
    runsFile: path.join(root, "scans", "runs.json"),
    spawn: (bin, args, opts) => {
      seen.push({ bin, args: [...args], cwd: opts.cwd });
      return quietChild();
    },
  });
  t.after(() => {
    try {
      flushLiveJobs();
      setLiveJobHooks({ runsFile: null, spawn: null });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  return { root, seen };
}

const Z = ["-z", "file,/usr/share/wordlists/dirb/common.txt"];
const URL = ["-u", "http://10.10.10.5/FUZZ"];

test("tool output paths stay under scans and refuse repo files", async (t) => {
  const { root, seen } = scoped(t);

  const wfuzzTmp = wfuzzHttp({ id: "wfuzz-tmp", args: [...Z, "-f", "/tmp/x,json", ...URL] }, undefined, root);
  assert.equal(wfuzzTmp.status, 400);
  const wfuzzSrc = wfuzzHttp({ id: "wfuzz-src", args: [...Z, "-f", "src/x,raw", ...URL] }, undefined, root);
  assert.equal(wfuzzSrc.status, 400);
  const wfuzzRoot = wfuzzHttp({ id: "wfuzz-root", args: [...Z, "-f", "src/routes/__root.tsx,raw", ...URL] }, undefined, root);
  assert.equal(wfuzzRoot.status, 400);

  const hydraPkg = hydraHttp({ id: "hydra-pkg", args: ["-l", "user", "-p", "NOTREAL", "-o", "package.json", "10.10.10.5", "ssh"] }, undefined, root);
  assert.equal(hydraPkg.status, 400);
  const hydraUp = hydraHttp({ id: "hydra-up", args: ["-l", "user", "-p", "NOTREAL", "-o", "../x", "10.10.10.5", "ssh"] }, undefined, root);
  assert.equal(hydraUp.status, 400);
  assert.equal(seen.length, 0);

  const wfuzzOk = wfuzzHttp({ id: "wfuzz-ok", args: [...Z, "-f", "out.txt,json", ...URL] }, undefined, root);
  assert.equal(wfuzzOk.status, 200);
  const wfuzzFile = path.join(root, "scans", "wfuzz", "out.txt");
  assert.ok(seen.some((row) => row.args.includes(`${wfuzzFile},json`)));
  assert.ok(seen.some((row) => row.cwd === path.join(root, "scans", "wfuzz")));

  const hydraOk = hydraHttp({ id: "hydra-ok", args: ["-l", "user", "-p", "NOTREAL", "-o=out.txt", "10.10.10.5", "ssh"] }, undefined, root);
  assert.equal(hydraOk.status, 200);
  const hydraFile = path.join(root, "scans", "hydra", "out.txt");
  const hydraRun = seen.find((row) => row.bin === "hydra");
  assert.ok(hydraRun);
  assert.ok(hydraRun.args.includes(hydraFile));
  assert.equal(hydraRun.args[hydraRun.args.indexOf("-o") + 1], hydraFile);
  assert.equal(hydraRun.args.some((arg) => arg.startsWith("-o=")), false);
  assert.equal(hydraRun.cwd, path.join(root, "scans", "hydra"));
  assert.ok(hydraRun.args.includes("NOTREAL"));

  const hashBad = runHttp(
    { id: "hash-bad", tool: "hashcat", steps: [{ kind: "exec", bin: "hashcat", args: ["-m", "0", "hashes.txt", "/usr/share/wordlists/rockyou.txt", "-o", "src/lib/api-guard.server.ts"] }] },
    root,
  );
  assert.equal(hashBad.status, 400);
  const hashEq = runHttp(
    { id: "hash-eq", tool: "hashcat", steps: [{ kind: "exec", bin: "hashcat", args: ["-m", "0", "hashes.txt", "/usr/share/wordlists/rockyou.txt", "--outfile=x/y"] }] },
    root,
  );
  assert.equal(hashEq.status, 400);
  const hashRestore = runHttp(
    { id: "hash-restore", tool: "hashcat", steps: [{ kind: "exec", bin: "hashcat", args: ["-m", "0", "hashes.txt", "--restore-file-path=/tmp/x"] }] },
    root,
  );
  assert.equal(hashRestore.status, 400);
  const hashSession = runHttp(
    { id: "hash-session", tool: "hashcat", steps: [{ kind: "exec", bin: "hashcat", args: ["-m", "0", "hashes.txt", "--session=../x"] }] },
    root,
  );
  assert.equal(hashSession.status, 400);

  const johnBad = runHttp({ id: "john-bad", tool: "john", steps: [{ kind: "exec", bin: "john", args: ["--pot=src/x", "hashes.txt"] }] }, root);
  assert.equal(johnBad.status, 400);

  const before = seen.length;
  const hashOk = runHttp(
    { id: "hash-ok", tool: "hashcat", steps: [{ kind: "exec", bin: "hashcat", args: ["-m", "0", "hashes.txt", "/usr/share/wordlists/rockyou.txt", "-o", "out.txt"] }] },
    root,
  );
  assert.equal(hashOk.status, 200);
  const johnOk = runHttp({ id: "john-ok", tool: "john", steps: [{ kind: "exec", bin: "john", args: ["--pot=out.pot", "hashes.txt"] }] }, root);
  assert.equal(johnOk.status, 200);
  const crack = path.join(root, "scans", "crack");
  const spawned = seen.slice(before);
  assert.ok(spawned.some((row) => row.bin === "hashcat" && row.args.includes(path.join(crack, "out.txt")) && row.cwd === crack));
  assert.ok(spawned.some((row) => row.bin === "john" && row.args.includes(`--pot=${path.join(crack, "out.pot")}`) && row.cwd === crack));

  await new Promise((resolve) => setImmediate(resolve));
  flushLiveJobs();
});

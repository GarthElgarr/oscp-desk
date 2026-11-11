import assert from "node:assert/strict";
import { type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";
import test, { type TestContext } from "node:test";
import { adRequest } from "./ad.server.ts";
import { impacketRequest, startImpacket } from "./impacket.server.ts";
import { flushLiveJobs, setLiveJobHooks } from "./live-jobs.server.ts";
import { nmapHttp } from "./nmap-scan.server.ts";
import { PLAIN_OUTPUT } from "./output-name.ts";

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

function desk(t: TestContext): string {
  const root = mkdtempSync(path.join(tmpdir(), "oscp-writers-"));
  mkdirSync(path.join(root, "data"));
  writeFileSync(
    path.join(root, "data", "exam-ledger.json"),
    JSON.stringify({ on: true, startedAt: 0, meterpreterHost: "", scope: ["10.10.10.0/24"], hosts: [], msf: [], audit: [] }),
  );
  t.after(() => {
    try {
      flushLiveJobs();
      setLiveJobHooks({ runsFile: null, spawn: null });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  return root;
}

const tgt = {
  mode: "gettgt",
  host: "10.10.10.5",
  domain: "corp.local",
  user: "user",
  password: "NOTREAL",
  dc: "10.10.10.5",
};

test("impacket and AD output flags stay under scans, and script paths are refused", (t) => {
  const root = desk(t);
  for (const extra of [
    ["-outputfile", "/tmp/x"],
    ["-outputfile", "src/lib/api-guard.server.ts"],
  ]) {
    const plan = impacketRequest({ ...tgt, extra }, root);
    assert.ok("error" in plan, extra.join(" "));
    if ("error" in plan) assert.equal(plan.error, PLAIN_OUTPUT);
  }
  const adBase = { mode: "kb-users", domain: "corp.local", user: "user", dc: "10.10.10.5", usersFile: "/tmp/users.txt", password: "" };
  for (const extra of [
    ["-o", "/tmp/x"],
    ["-o", "package.json"],
    ["-out", "/tmp/x"],
    ["-op", "/tmp/x"],
  ]) {
    const plan = adRequest({ ...adBase, extra }, root);
    assert.ok("error" in plan, extra.join(" "));
    if ("error" in plan) assert.equal(plan.error, PLAIN_OUTPUT);
  }

  let cwd = "";
  let args: string[] = [];
  setLiveJobHooks({
    runsFile: path.join(root, "scans", "runs.json"),
    spawn: (_bin, spawned, opts) => {
      cwd = opts.cwd ?? "";
      args = [...spawned];
      return quietChild();
    },
  });
  const saved = impacketRequest({ ...tgt, extra: ["-outputfile", "loot.txt"] }, root);
  assert.ok(!("error" in saved));
  if (!("error" in saved)) {
    assert.equal(startImpacket("gettgt-cwd", saved.bin, saved.args, saved.display, saved.cwd), true);
    assert.equal(cwd, path.join(root, "scans", "impacket"));
    assert.ok(args.includes(path.join(root, "scans", "impacket", "loot.txt")));
  }
  const named = adRequest({ ...adBase, extra: ["-o", "out.txt"] }, root);
  assert.ok(!("error" in named));
  if (!("error" in named)) assert.ok(named.args.includes(path.join(root, "scans", "ad", "out.txt")));

  let started = false;
  const nmap = nmapHttp(
    { id: "nmap-fetch", profile: "custom", target: "10.10.10.5", name: "box", extra: "--script http-fetch --script-args http-fetch.destination=/tmp/x" },
    () => {
      started = true;
      return true;
    },
    root,
  );
  assert.equal(nmap.status, 400);
  assert.equal(started, false);
});

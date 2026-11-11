import assert from "node:assert/strict";
import { type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";
import test, { type TestContext } from "node:test";
import { hydraHttp } from "./hydra.server.ts";
import { impacketHttp, startImpacket } from "./impacket.server.ts";
import { flushLiveJobs, removeJob, setLiveJobHooks } from "./live-jobs.server.ts";

function hung(): ChildProcess {
  const child = new EventEmitter() as ChildProcess;
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.kill = () => {
    child.emit("close", null);
    return true;
  };
  return child;
}

function scoped(t: TestContext): string {
  const root = mkdtempSync(path.join(tmpdir(), "oscp-scope-file-"));
  mkdirSync(path.join(root, "data"));
  writeFileSync(
    path.join(root, "data", "exam-ledger.json"),
    JSON.stringify({ on: true, startedAt: 0, meterpreterHost: "", scope: ["10.10.10.5"], hosts: [], msf: [], audit: [] }),
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

test("hydra -M lists and impacket -dc-host stay inside the exam scope", (t) => {
  const root = scoped(t);
  const loot = path.join(root, "scans", "hydra", "loot-users-abc.txt");
  const hydra = hydraHttp(
    {
      id: "hydra-mod",
      args: ["-M", "scans/hydra/loot-users-abc.txt", "-p", "NOTREAL", "ssh"],
      lists: { users: "10.10.11.5\n" },
    },
    () => true,
    root,
  );
  assert.equal(hydra.status, 403);
  assert.equal(existsSync(loot), false);

  const host = impacketHttp(
    {
      id: "imp-host",
      mode: "gettgt",
      domain: "corp.local",
      user: "user",
      password: "NOTREAL",
      dc: "10.10.10.5",
      extra: ["-dc-host", "dc.corp.local"],
    },
    () => true,
    root,
  );
  assert.equal(host.status, 403);

  const ids = ["slot-a", "slot-b", "slot-c", "slot-d", "slot-e", "slot-f"];
  setLiveJobHooks({
    runsFile: path.join(root, "scans", "runs.json"),
    spawn: () => hung(),
  });
  for (const id of ids) assert.equal(startImpacket(id, "true", ["ok"], "true"), true);
  const full = hydraHttp(
    {
      id: "hydra-full",
      args: ["-L", "scans/hydra/loot-users-abc.txt", "-p", "NOTREAL", "10.10.10.5", "ssh"],
      lists: { users: "user\n" },
    },
    undefined,
    root,
  );
  assert.equal(full.status, 429);
  assert.equal(existsSync(loot), false);
  for (const id of ids) removeJob(id);
});

test("hydra -M refuses a basename that the scan directory would read", (t) => {
  const root = scoped(t);
  setLiveJobHooks({ runsFile: path.join(root, "scans", "runs.json"), spawn: null });
  const dir = path.join(root, "scans", "hydra");
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "targets.txt"), "10.10.10.99\n");
  const loot = path.join(dir, "loot-users-abc.txt");
  for (const args of [
    ["-M", "targets.txt", "-p", "NOTREAL", "ssh"],
    ["-M=targets.txt", "-p", "NOTREAL", "ssh"],
    ["-Mtargets.txt", "-p", "NOTREAL", "ssh"],
  ]) {
    let started = false;
    const response = hydraHttp({ id: "hydra-bare", args, lists: { users: "10.10.10.99\n" } }, () => {
      started = true;
      return true;
    }, root);
    assert.equal(response.status, 400, args[0]);
    assert.equal(started, false, args[0]);
  }
  assert.equal(existsSync(loot), false);

  let started = false;
  const ok = hydraHttp(
    {
      id: "hydra-loot",
      args: ["-M", "scans/hydra/loot-users-abc.txt", "-p", "NOTREAL", "ssh"],
      lists: { users: "10.10.10.5\n" },
    },
    () => {
      started = true;
      return true;
    },
    root,
  );
  assert.equal(ok.status, 200);
  assert.equal(started, true);
});

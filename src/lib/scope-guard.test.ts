import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { examBlock } from "./exam-block.ts";
import { hydraArgsOk } from "./hydra-args.ts";
import { hydraHttp } from "./hydra.server.ts";
import { nmapHttp } from "./nmap-scan.server.ts";
import { commandAllowed, targetAllowed } from "./scope-guard.server.ts";

function scopedRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), "oscp-scope-"));
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
  return root;
}

test("a target outside the exam scope is refused before hydra or nmap starts", async () => {
  const root = scopedRoot();
  assert.equal(targetAllowed("10.10.11.5", root), "That target is outside the exam scope.");
  assert.equal(targetAllowed("10.10.10.5", root), null);
  let nmapStarted = false;
  const nmap = nmapHttp(
    { id: "nmap-1", profile: "quick", target: "10.10.11.5", name: "box" },
    () => {
      nmapStarted = true;
      return true;
    },
    root,
  );
  assert.equal(nmap.status, 403);
  assert.match(await nmap.text(), /outside the exam scope/);
  assert.equal(nmapStarted, false);

  let hydraStarted = false;
  const hydra = hydraHttp(
    { id: "hydra-1", args: ["-l", "admin", "-p", "NOTREAL", "10.10.11.5", "ssh"] },
    () => {
      hydraStarted = true;
      return true;
    },
    root,
  );
  assert.equal(hydra.status, 403);
  assert.equal(hydraStarted, false);

  let allowed = false;
  const inside = nmapHttp(
    { id: "nmap-2", profile: "quick", target: "10.10.10.5", name: "inbox" },
    () => {
      allowed = true;
      return true;
    },
    root,
  );
  assert.equal(inside.status, 200);
  assert.equal(allowed, true);
});

test("an in-scope hydra target is started once", () => {
  const root = scopedRoot();
  let started = 0;
  const hydra = hydraHttp(
    { id: "hydra-in", args: ["-l", "admin", "-p", "NOTREAL", "10.10.10.5", "ssh"] },
    () => {
      started += 1;
      return true;
    },
    root,
  );
  assert.equal(hydra.status, 200);
  assert.equal(started, 1);
});

test("hydra refuses an output path outside the desk and still allows a wordlist", () => {
  assert.equal(hydraArgsOk(["-o", "/tmp/x", "-l", "admin", "-p", "NOTREAL", "10.10.10.5", "ssh"]), false);
  assert.equal(hydraArgsOk(["-L", "/etc/passwd", "10.10.10.5", "ssh"]), false);
  assert.equal(hydraArgsOk(["-o/tmp/x", "-l", "admin", "-p", "NOTREAL", "10.10.10.5", "ssh"]), false);
  assert.equal(hydraArgsOk(["-p", ""]), true);
  assert.equal(
    hydraArgsOk(["-l", "admin", "-P", "/usr/share/wordlists/rockyou.txt", "10.10.10.5", "ssh"]),
    true,
  );
  assert.equal(
    hydraArgsOk(["-L", "scans/hydra/loot-users-abc.txt", "-P", "found.txt", "10.10.10.5", "ssh"]),
    true,
  );
});

test("a banned command is refused only while the exam lock is on", () => {
  const locked = examBlock({ on: true, scope: [] }, ["10.10.10.5"], "sqlmap -u http://10.10.10.5");
  assert.match(locked ?? "", /sqlmap/);
  assert.equal(examBlock({ on: false, scope: [] }, ["10.10.10.5"], "sqlmap -u http://10.10.10.5"), null);
  const root = scopedRoot();
  assert.match(commandAllowed("sqlmap -u http://10.10.10.5", root) ?? "", /sqlmap/);
});

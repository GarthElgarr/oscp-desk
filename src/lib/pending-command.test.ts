import assert from "node:assert/strict";
import test from "node:test";
import { getJobs, launchJob } from "./live-jobs.ts";
import { pendingCommand } from "./pending-command.ts";

test("the run card masks hydra, wfuzz, and snmp secrets before the server answers", async () => {
  const hydraBody = { args: ["-l", "user", "-p", "NOT REAL", "ssh://10.10.10.5"] };
  const hydra = pendingCommand("hydra", hydraBody);
  assert.equal(hydra.includes("REAL"), false, hydra);
  assert.match(hydra, /-p \*\*\*\*/);
  assert.match(hydra, /ssh:\/\/10\.10\.10\.5/);

  const attached = pendingCommand("hydra", { args: ["-l", "user", "-pNOTREAL", "ssh://10.10.10.5"] });
  assert.equal(attached.includes("REAL"), false, attached);
  assert.match(attached, /-p\*\*\*\*/);

  const wfuzz = pendingCommand("wfuzz", {
    args: ["-z", "file,/usr/share/wordlists/dirb/common.txt", "-H", "Host: FUZZ.corp.local", "-H", "Authorization: Bearer NOTREAL", "-u", "http://10.10.10.5/FUZZ"],
  });
  assert.equal(wfuzz.includes("REAL"), false, wfuzz);
  assert.match(wfuzz, /Host: FUZZ\.corp\.local/);
  assert.match(wfuzz, /Authorization: \*\*\*\*/);
  assert.match(wfuzz, /http:\/\/10\.10\.10\.5\/FUZZ/);

  const walk = pendingCommand("snmp", { command: "snmpwalk -v 2c -c NOTREAL -Oa 10.10.10.5" });
  assert.equal(walk.includes("NOTREAL"), false, walk);
  assert.match(walk, /-c \*\*\*\*/);
  assert.match(walk, /10\.10\.10\.5/);

  const original = globalThis.fetch;
  globalThis.fetch = async (input) => {
    if (String(input) === "/api/jobs") return Response.json({ jobs: [] });
    return new Response("Those arguments are not a hydra command this desk will run.\n", { status: 400 });
  };
  try {
    await launchJob("/api/hydra", hydraBody, { tool: "hydra", title: hydra, command: hydra });
    const job = getJobs().find((item) => item.tool === "hydra");
    assert.ok(job);
    assert.equal(job.local, true);
    assert.equal(job.command.includes("REAL"), false, job.command);
    await new Promise((resolve) => setTimeout(resolve, 900));
  } finally {
    globalThis.fetch = original;
  }
});

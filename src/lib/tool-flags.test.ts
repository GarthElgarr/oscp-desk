import assert from "node:assert/strict";
import test from "node:test";
import { hydraArgsOk } from "./hydra-args.ts";
import { nmapExtra } from "./nmap-scan.ts";
import { stepsOk } from "./run-tool.server.ts";
import { TOOL_FLAGS, flagListed } from "./tool-flags.ts";
import { wfuzzArgsOk } from "./wfuzz-args.ts";

test("every tool's free-form flags are an exact list", () => {
  const names = new Set<string>();
  for (const row of TOOL_FLAGS) {
    assert.equal(names.has(row.tool), false, row.tool);
    names.add(row.tool);
    assert.equal(new Set(row.flags).size, row.flags.length, row.tool);
    if (row.spawned) assert.ok(row.cwd?.startsWith("scans/"), row.tool);
    assert.equal(flagListed(row.tool, "--not-a-real-flag"), false, row.tool);
    const sample = row.flags.find((flag) => flag.startsWith("-"));
    if (sample && row.parser !== "getopt_long_only") assert.equal(flagListed(row.tool, sample), true, `${row.tool} ${sample}`);
  }
  assert.ok(names.has("nikto"));
  assert.equal(nmapExtra("--not-a-real-flag").ok, false);
  assert.equal(nmapExtra("-F").ok, true);
  assert.equal(hydraArgsOk(["--debug", "10.10.10.5", "ssh"]), false);
  assert.equal(hydraArgsOk(["-l", "user", "-p", "NOTREAL", "-f", "10.10.10.5", "ssh"]), true);
  assert.equal(stepsOk([{ kind: "exec", bin: "hashcat", args: ["--not-a-real-flag", "scans/crack/h.txt"] }]), false);
  assert.equal(stepsOk([{ kind: "exec", bin: "john", args: ["--not-a-real-flag", "h.txt"] }]), false);
  const wfuzz = ["-z", "file,/usr/share/wordlists/dirb/common.txt", "-u", "http://10.10.10.5/FUZZ", "--not-a-real-flag"];
  assert.equal(wfuzzArgsOk(wfuzz), false);
});

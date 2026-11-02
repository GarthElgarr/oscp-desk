import assert from "node:assert/strict";
import test from "node:test";
import { nmapEditedCommand, nmapPlan } from "./nmap-scan.ts";

test("an unedited deep command is the one that runs", () => {
  const plan = nmapPlan({
    profile: "deep",
    target: "192.168.174.191",
    name: "deep",
    ports: "80,135,139,445,3389,5985,5986,47001",
    extra: ["-T4", "--reason"],
  });
  assert.ok(!("error" in plan));
  const edited = nmapEditedCommand(plan.command, "deep");
  assert.ok(!("error" in edited));
  assert.deepEqual(edited.args, plan.args);
  assert.equal(edited.target, "192.168.174.191");
});

test("an edited command keeps the new flag and still saves under the output name", () => {
  const edited = nmapEditedCommand(
    "nmap -Pn -sC -sV -p 22,80 --version-all -oA scans/somewhere 10.10.10.10",
    "deep",
  );
  assert.ok(!("error" in edited));
  assert.equal(edited.args.includes("--version-all"), true);
  assert.equal(edited.args[edited.args.indexOf("-oA") + 1], "scans/deep");
  assert.equal(edited.target, "10.10.10.10");
});

test("a pipe is not a scan", () => {
  const edited = nmapEditedCommand("nmap -Pn 10.10.10.10 | nc 1.2.3.4 1", "deep");
  assert.ok("error" in edited);
});

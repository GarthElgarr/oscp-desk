import assert from "node:assert/strict";
import test from "node:test";
import { nmapEditedCommand, nmapExtra, nmapPlan } from "./nmap-scan.ts";

test("an unedited deep command is the one that runs", () => {
  const plan = nmapPlan({
    profile: "deep",
    target: "10.10.10.5",
    name: "deep",
    ports: "80,135,139,445,3389,5985,5986,47001",
    extra: ["-T4", "--reason"],
  });
  assert.ok(!("error" in plan));
  const edited = nmapEditedCommand(plan.command, "deep");
  assert.ok(!("error" in edited));
  assert.deepEqual(edited.args, plan.args);
  assert.equal(edited.target, "10.10.10.5");
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

test("nmap refuses file-path flags and a second address", () => {
  const blocked = [
    "-iL/etc/passwd",
    "-iLlist",
    "--script=/tmp/x.nse",
    "--datadir=/tmp",
    "--excludefile=/etc/hosts",
    "--script-args-file=/x",
    "--stylesheet=http://x/y.xsl",
    "--servicedb=/tmp/db",
    "--versiondb=/tmp/db",
    "--resume=scan.xml",
    "--webxml",
  ];
  for (const flag of blocked) {
    const extra = nmapExtra(flag);
    assert.equal(extra.ok, false, flag);
    const edited = nmapEditedCommand(`nmap ${flag} 10.10.10.10`, "box");
    assert.ok("error" in edited, flag);
  }
  assert.equal(nmapExtra("--script=vuln,safe").ok, true);
  assert.equal(nmapExtra("-p 80,443 -sV").ok, true);
  const kept = nmapEditedCommand("nmap --script=vuln,safe -p 80,443 -sV 10.10.10.10", "box");
  assert.ok(!("error" in kept));
  assert.ok(kept.args.includes("(vuln,safe) and not (broadcast or dos or external)"));
  const second = nmapEditedCommand("nmap -sV 10.1.1.1 10.1.1.2", "box");
  assert.ok("error" in second);
});

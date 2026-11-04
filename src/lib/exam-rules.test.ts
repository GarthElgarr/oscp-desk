import assert from "node:assert/strict";
import test from "node:test";
import { bannedCommand, examClock, EXAM_MS, packCommands, passRule, SCALE_FROM } from "./exam-rules.ts";
import { nmapExtra, nmapEditedCommand, nmapTarget } from "./nmap-scan.ts";
import { hydraArgsOk, parseExtraFlags } from "./hydra-args.ts";

test("a glued nmap output flag does not bypass the save path", () => {
  const extra = nmapExtra("-oNout");
  assert.equal(extra.ok, false);
  const edited = nmapEditedCommand("nmap -Pn -oNout 10.10.10.10", "box");
  assert.ok(!("error" in edited));
  assert.equal(edited.args.includes("-oNout"), false);
  assert.equal(edited.args[edited.args.indexOf("-oA") + 1], "scans/box");
});

test("an address with a leading zero is not an IPv4 target", () => {
  assert.equal(nmapTarget("192.168.001.010"), null);
  assert.equal(nmapTarget("10.10.10.10"), "10.10.10.10");
});

test("an empty quoted hydra value is kept", () => {
  const parsed = parseExtraFlags(`-p ""`);
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.deepEqual(parsed.args, ["-p", ""]);
    assert.equal(hydraArgsOk(parsed.args), true);
  }
});

test("sqlmap is banned only while the exam lock is on", () => {
  assert.match(bannedCommand("sqlmap -u http://10.10.10.10", true) ?? "", /sqlmap/);
  assert.equal(bannedCommand("sqlmap -u http://10.10.10.10", false), null);
  assert.equal(bannedCommand("nmap -Pn 10.10.10.10", true), null);
});

test("the pass mark changes on 1 Dec 2026 and the timer has two windows", () => {
  assert.equal(passRule(SCALE_FROM - 1000).scaled, false);
  assert.equal(passRule(SCALE_FROM).scaled, true);
  assert.match(passRule(SCALE_FROM).text, /400 out of 500/);
  const start = 1_000_000;
  assert.equal(examClock(0, start).phase, "idle");
  assert.equal(examClock(start, start + 1000).phase, "exam");
  assert.equal(examClock(start, start + EXAM_MS + 1000).phase, "report");
  const pack = packCommands("OSCP-OS-12345-Exam-Report");
  assert.equal(pack.seven.includes("-p"), false);
  assert.match(pack.seven, /7z a OSCP-OS-12345-Exam-Report\.7z/);
});

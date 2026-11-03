import assert from "node:assert/strict";
import test from "node:test";
import { isMeterpreter, meterpreterBlock, relayBlock } from "./exam-lock.ts";

test("a normal shell is not meterpreter", () => {
  assert.equal(isMeterpreter("windows/x64/shell_reverse_tcp"), false);
  assert.equal(isMeterpreter("windows/x64/meterpreter_reverse_tcp"), true);
});

test("the first meterpreter machine is allowed and the second is not", () => {
  assert.equal(meterpreterBlock(true, "", "10.10.10.10"), null);
  assert.equal(meterpreterBlock(true, "10.10.10.10", "10.10.10.10"), null);
  assert.match(meterpreterBlock(true, "10.10.10.10", "10.10.10.11") ?? "", /second machine/);
  assert.equal(meterpreterBlock(false, "10.10.10.10", "10.10.10.11"), null);
});

test("a relay is blocked only while the exam lock is on", () => {
  assert.match(relayBlock(true) ?? "", /ntlmrelayx/);
  assert.equal(relayBlock(false), null);
});

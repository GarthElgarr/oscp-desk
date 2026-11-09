import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { applyLedger, emptyLedger, examApiBody, ipInScope, parseLedger, scopeNarrowed, type AuditEntry, type ExamLedger } from "./exam-ledger.ts";

const NOW = Date.parse("2026-06-01T12:00:00Z");

function ledger(over: Partial<ExamLedger> = {}): ExamLedger {
  return { ...emptyLedger(), ...over };
}

test("scope is hosts or one subnet no wider than /24", () => {
  const wide = applyLedger(emptyLedger(), { action: "patch", scope: ["10.10.10.0/16"] }, NOW);
  assert.match(wide.error ?? "", /\/24/);
  const both = applyLedger(emptyLedger(), { action: "patch", scope: ["10.10.10.0/24", "10.10.10.5"] }, NOW);
  assert.match(both.error ?? "", /Not both/);
  const two = applyLedger(emptyLedger(), { action: "patch", scope: ["10.10.10.0/24", "10.10.11.0/28"] }, NOW);
  assert.match(two.error ?? "", /second subnet/);
  const zeros = applyLedger(emptyLedger(), { action: "patch", scope: ["10.10.010.0/24"] }, NOW);
  assert.ok(zeros.error);
  const ok = applyLedger(emptyLedger(), { action: "patch", scope: ["10.10.10.5", "10.10.10.6"] }, NOW);
  assert.equal(ok.error, undefined);
  assert.deepEqual(ok.ledger.scope, ["10.10.10.5", "10.10.10.6"]);
  const net = applyLedger(emptyLedger(), { action: "patch", scope: ["10.10.10.0/24"] }, NOW);
  assert.deepEqual(net.ledger.scope, ["10.10.10.0/24"]);
});

test("scope cannot be narrowed after a meterpreter attempt", () => {
  const scoped = applyLedger(emptyLedger(), { action: "patch", scope: ["10.10.10.0/24"] }, NOW).ledger;
  const locked = applyLedger(scoped, { action: "msf", host: "10.10.10.5", payload: "meterpreter", ok: false }, NOW).ledger;
  const removed = applyLedger(locked, { action: "patch", scope: [] }, NOW);
  assert.match(removed.error ?? "", /Scope cannot be narrowed after a Meterpreter attempt/);
  assert.equal(removed.ledger, locked);
  const swapped = applyLedger(locked, { action: "patch", scope: ["10.10.10.0/28"] }, NOW);
  assert.match(swapped.error ?? "", /cannot be narrowed/);
  assert.equal(swapped.ledger, locked);
  const open = applyLedger(emptyLedger(), { action: "msf", host: "10.10.10.5", payload: "meterpreter", ok: false }, NOW).ledger;
  const added = applyLedger(open, { action: "patch", scope: ["10.10.11.0/24"] }, NOW);
  assert.equal(added.error, undefined);
  assert.deepEqual(added.ledger.scope, ["10.10.11.0/24"]);
  assert.equal(scopeNarrowed(["10.10.10.0/28"], ["10.10.10.0/24"]), false);
  const off = applyLedger(emptyLedger(), { action: "patch", on: false }, NOW).ledger;
  const labScope = applyLedger(off, { action: "patch", scope: ["10.10.10.0/24"] }, NOW).ledger;
  const cleared = applyLedger(labScope, { action: "patch", scope: [] }, NOW);
  assert.equal(cleared.error, undefined);
  assert.deepEqual(cleared.ledger.scope, []);
  const ui = readFileSync(new URL("../components/global-config.tsx", import.meta.url), "utf8");
  assert.match(ui, /exam\.on && ledger\.msf\.length > 0 \? null/);
  assert.match(ui, /entry\.includes\("\/"\)/);
  assert.match(ui, /Scope is one subnet and cannot be narrowed after a Meterpreter attempt\./);
  assert.match(ui, /You can still add a machine\./);
  const readme = readFileSync(new URL("../../README.md", import.meta.url), "utf8");
  assert.equal(readme.includes("Adding a subnet is still allowed"), false);
});

test("a host is kept only inside the declared scope", () => {
  assert.equal(ipInScope("10.10.10.15", ["10.10.10.0/28"]), true);
  assert.equal(ipInScope("10.10.10.16", ["10.10.10.0/28"]), false);
  assert.equal(ipInScope("10.10.10.5", ["10.10.10.9/28"]), true);
  assert.equal(ipInScope("10.10.11.5", ["10.10.10.0/24"]), false);
  const scoped = applyLedger(emptyLedger(), { action: "patch", scope: ["10.10.10.0/24"] }, NOW).ledger;
  const inside = applyLedger(scoped, { action: "host", ip: "10.10.10.5", note: "dc" }, NOW);
  assert.equal(inside.error, undefined);
  assert.equal(inside.ledger.hosts[0].note, "dc");
  const outside = applyLedger(scoped, { action: "host", ip: "10.10.11.5" }, NOW);
  assert.match(outside.error ?? "", /outside/);
  const narrow = applyLedger(inside.ledger, { action: "patch", scope: ["10.10.11.0/24"] }, NOW);
  assert.match(narrow.error ?? "", /tracker/);
});

test("a failed meterpreter attempt locks the machine and a second machine is refused", () => {
  const failed = applyLedger(emptyLedger(), { action: "msf", host: "10.10.10.10", payload: "windows/x64/meterpreter_reverse_tcp", ok: false }, NOW);
  assert.equal(failed.error, undefined);
  assert.equal(failed.ledger.meterpreterHost, "10.10.10.10");
  assert.equal(failed.ledger.msf[0].ok, false);
  const shell = applyLedger(emptyLedger(), { action: "msf", host: "10.10.10.10", payload: "windows/x64/shell_reverse_tcp", ok: true }, NOW);
  assert.match(shell.error ?? "", /normal msfvenom/);
  assert.equal(shell.ledger.meterpreterHost, "");
  const second = applyLedger(failed.ledger, { action: "msf", host: "10.10.10.11", payload: "meterpreter", ok: false }, NOW);
  assert.match(second.error ?? "", /second machine/);
  assert.equal(second.ledger.meterpreterHost, "10.10.10.10");
  assert.equal(second.ledger.audit.at(-1)?.kind, "msf-refused");
  const cleared = applyLedger(failed.ledger, { action: "patch", meterpreterHost: "" }, NOW);
  assert.match(cleared.error ?? "", /still locks/);
  const same = applyLedger(failed.ledger, { action: "msf", host: "10.10.10.10", payload: "meterpreter", ok: true }, NOW);
  assert.equal(same.error, undefined);
  assert.equal(same.ledger.msf.length, 2);
});

test("lab attempts on two machines cannot be turned into an exam lock", () => {
  const off = applyLedger(emptyLedger(), { action: "patch", on: false }, NOW).ledger;
  const first = applyLedger(off, { action: "msf", host: "10.10.10.10", payload: "meterpreter", ok: true }, NOW).ledger;
  const second = applyLedger(first, { action: "msf", host: "10.10.10.11", payload: "meterpreter", ok: false }, NOW).ledger;
  assert.equal(second.meterpreterHost, "");
  const locked = applyLedger(second, { action: "patch", on: true }, NOW);
  assert.match(locked.error ?? "", /only one/);
  const cleared = applyLedger(second, { action: "patch", clearMsf: true }, NOW);
  assert.equal(cleared.error, undefined);
  assert.equal(cleared.ledger.msf.length, 0);
  const refused = applyLedger(applyLedger(cleared.ledger, { action: "patch", on: true }, NOW).ledger, { action: "patch", clearMsf: true }, NOW);
  assert.match(refused.error ?? "", /stays while exam lock is on/);
});

test("an exam meterpreter attempt cannot be unlocked by toggling the lock", () => {
  const locked = applyLedger(emptyLedger(), { action: "msf", host: "10.10.10.5", payload: "meterpreter", ok: false }, NOW);
  assert.equal(locked.error, undefined);
  assert.equal(locked.ledger.msf[0].examLocked, true);
  for (const patch of [
    { action: "patch", on: false },
    { action: "patch", clearMsf: true },
    { action: "patch", meterpreterHost: "" },
  ]) {
    const next = applyLedger(locked.ledger, patch, NOW);
    assert.ok(next.error);
    if (patch.on === false) assert.match(next.error ?? "", /stays on after a Meterpreter attempt/);
    assert.equal(next.ledger, locked.ledger);
    const http = examApiBody(next);
    assert.equal(http.status, 400);
    assert.equal("ledger" in http.json && http.json.ledger, locked.ledger);
  }
  const second = applyLedger(locked.ledger, { action: "msf", host: "10.10.10.6", payload: "meterpreter", ok: true }, NOW);
  assert.match(second.error ?? "", /second machine/);
  assert.equal(second.ledger.meterpreterHost, "10.10.10.5");
  const lab = applyLedger(emptyLedger(), { action: "patch", on: false }, NOW).ledger;
  const labTry = applyLedger(lab, { action: "msf", host: "10.10.10.5", payload: "meterpreter", ok: true }, NOW).ledger;
  assert.equal(labTry.msf[0].examLocked, false);
  const cleared = applyLedger(labTry, { action: "patch", clearMsf: true }, NOW);
  assert.equal(cleared.error, undefined);
  assert.equal(cleared.ledger.msf.length, 0);
});

test("a restore during the exam cannot drop meterpreter history", () => {
  const locked = applyLedger(emptyLedger(), { action: "msf", host: "10.10.10.5", payload: "meterpreter", ok: false }, NOW).ledger;
  const wiped = applyLedger(locked, { action: "replace", ledger: emptyLedger() }, NOW);
  assert.match(wiped.error ?? "", /cannot drop Meterpreter history/);
  assert.equal(wiped.ledger, locked);
  const http = examApiBody(wiped);
  assert.equal(http.status, 400);
  const extra = { ...locked, audit: locked.audit.concat([{ at: NOW, kind: "note", detail: "kept" }]) };
  const kept = applyLedger(locked, { action: "replace", ledger: extra }, NOW);
  assert.equal(kept.error, undefined);
  assert.equal(kept.ledger.msf[0].host, "10.10.10.5");
  assert.equal(kept.ledger.audit.some((row) => row.detail === "kept"), true);
  assert.equal(kept.ledger.audit.at(-1)?.kind, "restore");
});

test("a restore cannot narrow scope after a meterpreter attempt", () => {
  const scoped = applyLedger(emptyLedger(), { action: "patch", scope: ["10.10.10.0/24"] }, NOW).ledger;
  const locked = applyLedger(scoped, { action: "msf", host: "10.10.10.5", payload: "meterpreter", ok: false }, NOW).ledger;
  const cleared = applyLedger(locked, { action: "replace", ledger: { ...locked, scope: [] } }, NOW);
  assert.match(cleared.error ?? "", /A restore cannot narrow scope after a Meterpreter attempt/);
  assert.equal(cleared.ledger, locked);
  const hostOnly = applyLedger(locked, { action: "replace", ledger: { ...locked, scope: ["10.10.10.5"] } }, NOW);
  assert.match(hostOnly.error ?? "", /A restore cannot narrow scope after a Meterpreter attempt/);
  assert.equal(hostOnly.ledger, locked);
  const extra = { ...locked, audit: locked.audit.concat([{ at: NOW, kind: "note", detail: "same scope" }]) };
  const kept = applyLedger(locked, { action: "replace", ledger: extra }, NOW);
  assert.equal(kept.error, undefined);
  assert.deepEqual(kept.ledger.scope, ["10.10.10.0/24"]);
  assert.equal(kept.ledger.audit.some((row) => row.detail === "same scope"), true);
  const off = applyLedger(emptyLedger(), { action: "patch", on: false }, NOW).ledger;
  const labScope = applyLedger(off, { action: "patch", scope: ["10.10.10.0/24"] }, NOW).ledger;
  const lab = applyLedger(labScope, { action: "msf", host: "10.10.10.5", payload: "meterpreter", ok: false }, NOW).ledger;
  const opened = applyLedger(lab, { action: "replace", ledger: { ...lab, scope: [] } }, NOW);
  assert.equal(opened.error, undefined);
  assert.deepEqual(opened.ledger.scope, []);
});

test("backup restore keeps the ledger and appends an audit line", () => {
  const saved = applyLedger(emptyLedger(), { action: "host", ip: "10.10.10.10", flagLocal: true }, NOW).ledger;
  const bad = applyLedger(saved, { action: "replace", ledger: { on: true } }, NOW);
  assert.match(bad.error ?? "", /not a valid/);
  assert.equal(bad.ledger.hosts.length, 1);
  const restored = applyLedger(emptyLedger(), { action: "replace", ledger: saved }, NOW);
  assert.equal(restored.error, undefined);
  assert.equal(restored.ledger.hosts[0].flagLocal, true);
  assert.equal(restored.ledger.audit.at(-1)?.kind, "restore");
  const lying = { ...saved, meterpreterHost: "10.10.10.10", msf: [{ host: "10.10.10.11", at: NOW, payload: "meterpreter", ok: false }] };
  assert.equal(parseLedger(lying, NOW), null);
});

test("the audit log drops the oldest line at the cap", () => {
  const audit: AuditEntry[] = Array.from({ length: 200 }, (_, index) => ({ at: NOW - 200 + index, kind: "host", detail: `n${index}` }));
  const full = ledger({ audit, hosts: [{ ip: "10.10.10.10", note: "", startedAt: 0, flagLocal: false, flagProof: false }] });
  const next = applyLedger(full, { action: "host", ip: "10.10.10.10", note: "updated" }, NOW);
  assert.equal(next.ledger.audit.length, 200);
  assert.equal(next.ledger.audit[0].detail, "n1");
  assert.equal(next.ledger.audit.at(-1)?.detail, "updated 10.10.10.10");
});

test("the tracker stops at 16 hosts and rejects a leading zero", () => {
  let current = emptyLedger();
  for (let index = 1; index <= 16; index += 1) {
    current = applyLedger(current, { action: "host", ip: `10.10.10.${index}` }, NOW).ledger;
  }
  assert.equal(current.hosts.length, 16);
  const extra = applyLedger(current, { action: "host", ip: "10.10.11.1" }, NOW);
  assert.match(extra.error ?? "", /16/);
  const zero = applyLedger(emptyLedger(), { action: "host", ip: "10.10.001.010" }, NOW);
  assert.match(zero.error ?? "", /leading zeros/);
});

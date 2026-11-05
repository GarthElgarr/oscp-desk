import { hostOrIp, hostOrSubnet, strictIpv4 } from "./scope-target.ts";

export const HOST_CAP = 16;
export const AUDIT_CAP = 200;
export const MSF_CAP = 32;
export const SCOPE_CAP = 16;

export type ExamHost = {
  ip: string;
  note: string;
  startedAt: number;
  flagLocal: boolean;
  flagProof: boolean;
};

export type MsfEntry = {
  host: string;
  at: number;
  payload: string;
  ok: boolean;
  /** True when the attempt was recorded while exam lock was on. That history cannot be cleared. */
  examLocked: boolean;
};

export type AuditEntry = {
  at: number;
  kind: string;
  detail: string;
};

export type ExamLedger = {
  on: boolean;
  startedAt: number;
  meterpreterHost: string;
  scope: string[];
  hosts: ExamHost[];
  msf: MsfEntry[];
  audit: AuditEntry[];
};

export function emptyLedger(): ExamLedger {
  return { on: true, startedAt: 0, meterpreterHost: "", scope: [], hosts: [], msf: [], audit: [] };
}

export function ledgerPristine(ledger: ExamLedger): boolean {
  return (
    ledger.startedAt === 0 &&
    ledger.meterpreterHost === "" &&
    ledger.scope.length === 0 &&
    ledger.hosts.length === 0 &&
    ledger.msf.length === 0 &&
    ledger.audit.length === 0
  );
}

const DAY = 24 * 60 * 60 * 1000;

function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  let out = "";
  for (const ch of value.trim()) {
    const code = ch.charCodeAt(0);
    if (code < 32 || code === 127) continue;
    out += ch;
    if (out.length >= max) break;
  }
  return out;
}

function stamp(value: unknown, now: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  if (value === 0) return 0;
  if (value > now + 60_000) return null;
  if (value < now - 40 * DAY) return null;
  return Math.floor(value);
}

function ipv4ToInt(ip: string): number | null {
  if (!strictIpv4(ip)) return null;
  const parts = ip.split(".").map(Number);
  return (((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0);
}

export function ipInScope(ip: string, scope: readonly string[]): boolean {
  if (scope.length === 0) return true;
  const host = hostOrIp(ip);
  if (!host) return false;
  const hostInt = ipv4ToInt(host);
  return scope.some((entry) => {
    const target = hostOrSubnet(entry);
    if (!target) return false;
    if (!target.includes("/")) return target === host;
    if (hostInt === null) return false;
    const [net, bitsText] = target.split("/");
    const netInt = ipv4ToInt(net);
    if (netInt === null) return false;
    const shift = 32 - Number(bitsText);
    return (hostInt >>> shift) === (netInt >>> shift);
  });
}

export function scopeOk(entries: readonly string[]): string[] | null {
  if (entries.length > SCOPE_CAP) return null;
  const clean: string[] = [];
  for (const entry of entries) {
    const next = hostOrSubnet(entry);
    if (!next) return null;
    clean.push(next);
  }
  const subnets = clean.filter((entry) => entry.includes("/"));
  if (subnets.length > 1) return null;
  if (subnets.length === 1 && clean.length !== 1) return null;
  if (new Set(clean).size !== clean.length) return null;
  return clean;
}

function withAudit(ledger: ExamLedger, at: number, kind: string, detail: string): ExamLedger {
  const next = ledger.audit.concat([{ at, kind, detail: cleanText(detail, 240) }]);
  return { ...ledger, audit: next.length > AUDIT_CAP ? next.slice(next.length - AUDIT_CAP) : next };
}

function sameBody(a: ExamLedger, b: ExamLedger): boolean {
  return JSON.stringify({ ...a, audit: [] }) === JSON.stringify({ ...b, audit: [] });
}

function consistent(ledger: ExamLedger): string | null {
  if (!ledger.on) return null;
  const hosts = new Set(ledger.msf.map((row) => row.host));
  if (!ledger.meterpreterHost && ledger.msf.length > 0) {
    return hosts.size === 1 ? null : "Exam lock is on, so the ledger can name only one Meterpreter machine. Clear the lab attempts first.";
  }
  if (ledger.meterpreterHost && [...hosts].some((host) => host !== ledger.meterpreterHost)) {
    return `Meterpreter is locked to ${ledger.meterpreterHost}. A failed attempt still counts, and a second machine is not allowed.`;
  }
  return null;
}

function normaliseMsfLock(ledger: ExamLedger): ExamLedger | { error: string } {
  if (!ledger.on) return ledger;
  const hosts = [...new Set(ledger.msf.map((row) => row.host))];
  if (!ledger.meterpreterHost && hosts.length === 1) return { ...ledger, meterpreterHost: hosts[0] };
  const problem = consistent(ledger);
  if (problem) return { error: problem };
  return ledger;
}

export function parseLedger(input: unknown, now = Date.now()): ExamLedger | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Record<string, unknown>;
  if (typeof row.on !== "boolean") return null;
  const startedAt = stamp(row.startedAt, now);
  if (startedAt === null) return null;
  const meterpreterHost = row.meterpreterHost === "" ? "" : hostOrIp(typeof row.meterpreterHost === "string" ? row.meterpreterHost : "");
  if (meterpreterHost === null) return null;
  if (!Array.isArray(row.scope) || row.scope.some((entry) => typeof entry !== "string")) return null;
  const scope = scopeOk(row.scope);
  if (!scope) return null;
  if (!Array.isArray(row.hosts) || row.hosts.length > HOST_CAP) return null;
  const hosts: ExamHost[] = [];
  for (const item of row.hosts) {
    if (!item || typeof item !== "object") return null;
    const host = item as Record<string, unknown>;
    const ip = hostOrIp(typeof host.ip === "string" ? host.ip : "");
    const hostStarted = stamp(host.startedAt, now);
    if (!ip || hostStarted === null || typeof host.flagLocal !== "boolean" || typeof host.flagProof !== "boolean") return null;
    if (hosts.some((existing) => existing.ip === ip)) return null;
    if (scope.length > 0 && !ipInScope(ip, scope)) return null;
    hosts.push({ ip, note: cleanText(host.note, 200), startedAt: hostStarted, flagLocal: host.flagLocal, flagProof: host.flagProof });
  }
  if (!Array.isArray(row.msf) || row.msf.length > MSF_CAP) return null;
  const msf: MsfEntry[] = [];
  for (const item of row.msf) {
    if (!item || typeof item !== "object") return null;
    const entry = item as Record<string, unknown>;
    const host = hostOrIp(typeof entry.host === "string" ? entry.host : "");
    const at = stamp(entry.at, now);
    const payload = cleanText(entry.payload, 80);
    if (!host || at === null || at === 0 || typeof entry.ok !== "boolean") return null;
    if (!/^[A-Za-z0-9_./-]+$/.test(payload) || !/meterpreter/i.test(payload)) return null;
    const examLocked = entry.examLocked === undefined ? true : entry.examLocked === true;
    if (entry.examLocked !== undefined && typeof entry.examLocked !== "boolean") return null;
    msf.push({ host, at, payload, ok: entry.ok, examLocked });
  }
  if (!Array.isArray(row.audit) || row.audit.length > AUDIT_CAP) return null;
  const audit: AuditEntry[] = [];
  for (const item of row.audit) {
    if (!item || typeof item !== "object") return null;
    const entry = item as Record<string, unknown>;
    const at = stamp(entry.at, now);
    const kind = cleanText(entry.kind, 24);
    if (at === null || at === 0 || !/^[a-z0-9-]{1,24}$/.test(kind)) return null;
    audit.push({ at, kind, detail: cleanText(entry.detail, 240) });
  }
  const ledger: ExamLedger = { on: row.on, startedAt, meterpreterHost, scope, hosts, msf, audit };
  const locked = normaliseMsfLock(ledger);
  if ("error" in locked) return null;
  return locked;
}

export function examApiBody(result: { ledger: ExamLedger; error?: string }): { status: number; json: ExamLedger | { error: string; ledger: ExamLedger } } {
  if (result.error) return { status: 400, json: { error: result.error, ledger: result.ledger } };
  return { status: 200, json: result.ledger };
}

function keepsMsfHistory(current: ExamLedger, next: ExamLedger): boolean {
  if (!(current.on && current.msf.length > 0)) return true;
  if (!next.on || next.meterpreterHost !== current.meterpreterHost) return false;
  return current.msf.every((row) => next.msf.some((item) => item.host === row.host && item.at === row.at && item.payload === row.payload));
}

export function applyLedger(current: ExamLedger, action: unknown, now = Date.now()): { ledger: ExamLedger; error?: string } {
  if (!action || typeof action !== "object") return { ledger: current, error: "That exam action is not valid." };
  const row = action as Record<string, unknown>;
  if (row.action === "replace") {
    const parsed = parseLedger(row.ledger, now);
    if (!parsed) return { ledger: current, error: "That backup is not a valid exam ledger." };
    if (!keepsMsfHistory(current, parsed)) {
      return { ledger: current, error: "A restore cannot drop Meterpreter history during the exam." };
    }
    return { ledger: withAudit(parsed, now, "restore", "restored from a backup") };
  }
  if (row.action === "patch") return applyPatch(current, row, now);
  if (row.action === "host") return applyHost(current, row, now);
  if (row.action === "msf") return applyMsf(current, row, now);
  return { ledger: current, error: "That exam action is not valid." };
}

function examAttemptLocked(ledger: ExamLedger): boolean {
  return ledger.msf.some((row) => row.examLocked);
}

function applyPatch(current: ExamLedger, row: Record<string, unknown>, now: number): { ledger: ExamLedger; error?: string } {
  if (examAttemptLocked(current) && row.on === false) {
    return { ledger: current, error: "Exam lock stays on after a Meterpreter attempt." };
  }
  if (examAttemptLocked(current) && row.clearMsf === true) {
    return { ledger: current, error: "The Metasploit ledger stays while exam lock is on. A failed attempt still counts." };
  }
  if (examAttemptLocked(current) && row.meterpreterHost === "") {
    return { ledger: current, error: "A Meterpreter attempt is already on the ledger. A failed attempt still locks this machine." };
  }
  let next: ExamLedger = { ...current, scope: [...current.scope], hosts: current.hosts.map((host) => ({ ...host })), msf: [...current.msf], audit: [...current.audit] };
  const notes: string[] = [];
  if (row.clearMsf === true) {
    if (next.on) return { ledger: current, error: "The Metasploit ledger stays while exam lock is on. A failed attempt still counts." };
    if (next.msf.length) {
      next = { ...next, msf: [] };
      notes.push("cleared the lab Metasploit ledger");
    }
  }
  if (typeof row.on === "boolean" && row.on !== next.on) {
    next = { ...next, on: row.on };
    notes.push(row.on ? "exam lock on" : "exam lock off, lab only");
  }
  if (row.startedAt !== undefined) {
    const startedAt = stamp(row.startedAt, now);
    if (startedAt === null) return { ledger: current, error: "That timer value is not a time this desk can store." };
    if (startedAt !== next.startedAt) {
      next = { ...next, startedAt };
      notes.push(startedAt ? "exam timer started" : "exam timer stopped");
    }
  }
  if (Array.isArray(row.scope)) {
    if (row.scope.some((entry) => typeof entry !== "string")) return { ledger: current, error: "Scope entries have to be a host or one /24." };
    const scope = scopeOk(row.scope);
    if (!scope) return { ledger: current, error: "Scope is a list of hosts, or one subnet no wider than /24. Not both, and not a second subnet." };
    const outside = next.hosts.find((host) => scope.length > 0 && !ipInScope(host.ip, scope));
    if (outside) return { ledger: current, error: `${outside.ip} is on the tracker and would fall outside that scope.` };
    if (scope.join(",") !== next.scope.join(",")) {
      next = { ...next, scope };
      notes.push(scope.length ? `scope set to ${scope.join(", ")}` : "scope cleared");
    }
  }
  if (row.meterpreterHost !== undefined) {
    if (typeof row.meterpreterHost !== "string") return { ledger: current, error: "The Meterpreter machine has to be one host." };
    if (row.meterpreterHost === "") {
      if (next.msf.length > 0) return { ledger: current, error: "A Meterpreter attempt is already on the ledger. A failed attempt still locks this machine." };
      if (next.meterpreterHost) {
        next = { ...next, meterpreterHost: "" };
        notes.push("Meterpreter lock cleared");
      }
    } else {
      const host = hostOrIp(row.meterpreterHost);
      if (!host) return { ledger: current, error: "The Meterpreter machine has to be one host. No leading zeros." };
      if (next.meterpreterHost && next.meterpreterHost !== host) {
        return { ledger: current, error: `Meterpreter is locked to ${next.meterpreterHost}. A failed attempt still counts.` };
      }
      if (!next.meterpreterHost) {
        next = { ...next, meterpreterHost: host };
        notes.push(`Meterpreter machine set to ${host}`);
      }
    }
  }
  const locked = normaliseMsfLock(next);
  if ("error" in locked) return { ledger: current, error: locked.error };
  next = locked;
  if (sameBody(current, next)) return { ledger: current };
  return { ledger: withAudit(next, now, "patch", notes.join("; ") || "updated") };
}

function applyHost(current: ExamLedger, row: Record<string, unknown>, now: number): { ledger: ExamLedger; error?: string } {
  const ip = hostOrIp(typeof row.ip === "string" ? row.ip : "");
  if (!ip) return { ledger: current, error: "A tracked host is one address or name. No leading zeros, and no subnet." };
  if (row.remove === true) {
    if (!current.hosts.some((host) => host.ip === ip)) return { ledger: current, error: "That host is not on the tracker." };
    const hosts = current.hosts.filter((host) => host.ip !== ip);
    return { ledger: withAudit({ ...current, hosts }, now, "host-remove", `removed ${ip}`) };
  }
  if (current.scope.length > 0 && !ipInScope(ip, current.scope)) {
    return { ledger: current, error: `${ip} is outside the exam scope.` };
  }
  const existing = current.hosts.find((host) => host.ip === ip);
  if (!existing && current.hosts.length >= HOST_CAP) return { ledger: current, error: `The tracker holds ${HOST_CAP} hosts. Remove one first.` };
  const note = row.note === undefined ? (existing?.note ?? "") : cleanText(row.note, 200);
  const startedAt = row.startedAt === undefined ? (existing?.startedAt ?? 0) : stamp(row.startedAt, now);
  if (startedAt === null) return { ledger: current, error: "That box timer is not a time this desk can store." };
  const flagLocal = typeof row.flagLocal === "boolean" ? row.flagLocal : (existing?.flagLocal ?? false);
  const flagProof = typeof row.flagProof === "boolean" ? row.flagProof : (existing?.flagProof ?? false);
  const host: ExamHost = { ip, note, startedAt, flagLocal, flagProof };
  if (existing && existing.note === note && existing.startedAt === startedAt && existing.flagLocal === flagLocal && existing.flagProof === flagProof) {
    return { ledger: current };
  }
  const hosts = existing ? current.hosts.map((item) => (item.ip === ip ? host : item)) : current.hosts.concat(host);
  const detail = existing ? `updated ${ip}` : `added ${ip}`;
  return { ledger: withAudit({ ...current, hosts }, now, "host", detail) };
}

function applyMsf(current: ExamLedger, row: Record<string, unknown>, now: number): { ledger: ExamLedger; error?: string } {
  const host = hostOrIp(typeof row.host === "string" ? row.host : "");
  const payload = cleanText(row.payload, 80);
  if (!host) return { ledger: current, error: "Meterpreter needs one target. No leading zeros." };
  if (!/^[A-Za-z0-9_./-]+$/.test(payload) || !/meterpreter/i.test(payload)) {
    return { ledger: current, error: "Only a Meterpreter payload is recorded here. A normal msfvenom shell does not use this lock." };
  }
  if (typeof row.ok !== "boolean") return { ledger: current, error: "Say whether the Meterpreter attempt worked." };
  if (current.on && current.meterpreterHost && current.meterpreterHost !== host) {
    const refused = withAudit(current, now, "msf-refused", `refused ${payload} on ${host}`);
    return { ledger: refused, error: `Meterpreter is locked to ${current.meterpreterHost}. A failed attempt still counts, and a second machine is not allowed.` };
  }
  const entry: MsfEntry = { host, at: now, payload, ok: row.ok, examLocked: current.on };
  const msf = current.msf.concat(entry);
  const trimmed = msf.length > MSF_CAP ? msf.slice(msf.length - MSF_CAP) : msf;
  let next: ExamLedger = { ...current, msf: trimmed };
  if (current.on && !current.meterpreterHost) next = { ...next, meterpreterHost: host };
  const how = row.ok ? "copied" : "failed";
  return { ledger: withAudit(next, now, "msf", `${how} ${payload} on ${host}`) };
}

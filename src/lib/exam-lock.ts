const KEY = "oscp-desk-exam-v1";

export type ExamLock = {
  on: boolean;
  host: string;
  startedAt: number;
};

const EMPTY: ExamLock = { on: true, host: "", startedAt: 0 };

let current: ExamLock = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function cleanHost(value: string): string {
  return value.trim().replace(/[^\w.:-]/g, "").slice(0, 64);
}

function emit() {
  for (const listener of listeners) listener();
}

function ensure() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<ExamLock>;
    current = {
      on: parsed.on !== false,
      host: cleanHost(typeof parsed.host === "string" ? parsed.host : ""),
      startedAt: typeof parsed.startedAt === "number" && parsed.startedAt > 0 ? parsed.startedAt : 0,
    };
  } catch {
    current = EMPTY;
  }
}

function save(next: ExamLock) {
  current = next;
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(current));
  emit();
}

export function getExam(): ExamLock {
  ensure();
  return current;
}

export function getExamServer(): ExamLock {
  return EMPTY;
}

export function subscribeExam(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setExam(patch: Partial<ExamLock>) {
  ensure();
  save({
    on: patch.on ?? current.on,
    host: patch.host === undefined ? current.host : cleanHost(patch.host),
    startedAt: patch.startedAt === undefined ? current.startedAt : patch.startedAt > 0 ? patch.startedAt : 0,
  });
}

/** A Meterpreter payload or handler. A normal msfvenom shell is not this. */
export function isMeterpreter(payload: string): boolean {
  return /meterpreter/i.test(payload);
}

/** Null means the command is allowed. A string is the reason it is not. */
export function meterpreterBlock(on: boolean, lockedHost: string, target: string): string | null {
  if (!on) return null;
  const host = cleanHost(target);
  if (!host) return "Meterpreter is your one Metasploit machine. Put that machine in Target IP, or pick a shell that is not Meterpreter. A normal msfvenom shell is allowed on every machine.";
  if (lockedHost && lockedHost !== host) return `Meterpreter is locked to ${lockedHost}. A failed attempt still counts, and a second machine is not allowed. Use a normal shell.`;
  return null;
}

export function relayBlock(on: boolean): string | null {
  if (!on) return null;
  return "ntlmrelayx stays off during the exam. The guide does not allow spoofing, and this desk does not treat a relay as an exam step. Turn exam lock off only in a lab.";
}

/** Call when the user copies a Meterpreter command that the lock already allowed. */
export function claimMeterpreter(target: string) {
  ensure();
  if (!current.on) return;
  const host = cleanHost(target);
  if (!host || current.host) return;
  save({ ...current, host });
}

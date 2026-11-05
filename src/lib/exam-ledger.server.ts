import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { applyLedger, emptyLedger, parseLedger, type ExamLedger } from "./exam-ledger.ts";

const FILE = path.resolve(process.cwd(), "scans", "exam-ledger.json");

let queue: Promise<void> = Promise.resolve();

function load(): { ledger: ExamLedger; corrupt: boolean } {
  try {
    const parsed = parseLedger(JSON.parse(readFileSync(FILE, "utf8")));
    if (!parsed) return { ledger: emptyLedger(), corrupt: true };
    return { ledger: parsed, corrupt: false };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return { ledger: emptyLedger(), corrupt: false };
    return { ledger: emptyLedger(), corrupt: true };
  }
}

export function readLedger(): ExamLedger | null {
  const found = load();
  return found.corrupt ? null : found.ledger;
}

function writeLedger(ledger: ExamLedger) {
  mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(ledger));
  renameSync(tmp, FILE);
}

function updateNow(action: unknown, now: number): { ledger: ExamLedger; error?: string } {
  const found = load();
  const replace = Boolean(action && typeof action === "object" && (action as { action?: unknown }).action === "replace");
  if (found.corrupt && !replace) {
    return { ledger: found.ledger, error: "The exam ledger file on disk is not valid. Restore a backup." };
  }
  const result = applyLedger(found.ledger, action, now);
  if (result.ledger !== found.ledger) writeLedger(result.ledger);
  return result;
}

export function updateLedger(action: unknown, now = Date.now()): Promise<{ ledger: ExamLedger; error?: string }> {
  const run = queue.then(() => updateNow(action, now));
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

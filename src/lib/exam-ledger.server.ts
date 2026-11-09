import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { applyLedger, emptyLedger, parseLedger, type ExamLedger } from "./exam-ledger.ts";

export function ledgerFile(root = process.cwd()): string {
  return path.join(root, "data", "exam-ledger.json");
}

export function legacyLedgerFile(root = process.cwd()): string {
  return path.join(root, "scans", "exam-ledger.json");
}

let queue: Promise<void> = Promise.resolve();

export function migrateLedger(root: string) {
  const next = ledgerFile(root);
  const old = legacyLedgerFile(root);
  if (existsSync(next) || !existsSync(old)) return;
  mkdirSync(path.dirname(next), { recursive: true });
  renameSync(old, next);
}

function load(root: string): { ledger: ExamLedger; corrupt: boolean } {
  migrateLedger(root);
  try {
    const parsed = parseLedger(JSON.parse(readFileSync(ledgerFile(root), "utf8")));
    if (!parsed) return { ledger: emptyLedger(), corrupt: true };
    return { ledger: parsed, corrupt: false };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return { ledger: emptyLedger(), corrupt: false };
    return { ledger: emptyLedger(), corrupt: true };
  }
}

export function readLedger(root = process.cwd()): ExamLedger | null {
  const found = load(root);
  return found.corrupt ? null : found.ledger;
}

function writeLedger(root: string, ledger: ExamLedger) {
  const file = ledgerFile(root);
  mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(ledger));
  renameSync(tmp, file);
}

function updateNow(action: unknown, now: number, root: string): { ledger: ExamLedger; error?: string } {
  const found = load(root);
  const replace = Boolean(action && typeof action === "object" && (action as { action?: unknown }).action === "replace");
  if (found.corrupt && !replace) {
    return { ledger: found.ledger, error: "The exam ledger file on disk is not valid. Restore a backup." };
  }
  const result = applyLedger(found.ledger, action, now);
  if (result.ledger !== found.ledger) writeLedger(root, result.ledger);
  return result;
}

export function updateLedger(action: unknown, now = Date.now(), root = process.cwd()): Promise<{ ledger: ExamLedger; error?: string }> {
  const run = queue.then(() => updateNow(action, now, root));
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

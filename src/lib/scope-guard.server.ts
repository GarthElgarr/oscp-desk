import { examBlock, OUTSIDE_SCOPE } from "./exam-block.ts";
import { readLedger } from "./exam-ledger.server.ts";
import { bannedCommand } from "./exam-rules.ts";
import { ipInScope } from "./exam-ledger.ts";

/** Null when the target is allowed. The message when the exam scope excludes it. */
export function targetAllowed(target: string, root = process.cwd()): string | null {
  const ledger = readLedger(root);
  if (!ledger) return "The exam ledger file on disk is not valid. Restore a backup.";
  if (ledger.scope.length === 0) return null;
  if (!target.trim() || !ipInScope(target.trim(), ledger.scope)) return OUTSIDE_SCOPE;
  return null;
}

export function commandAllowed(command: string, root = process.cwd()): string | null {
  const ledger = readLedger(root);
  if (!ledger) return "The exam ledger file on disk is not valid. Restore a backup.";
  return bannedCommand(command, ledger.on);
}

export function examGuard(targets: readonly string[], command: string, root = process.cwd()): string | null {
  const ledger = readLedger(root);
  if (!ledger) return "The exam ledger file on disk is not valid. Restore a backup.";
  return examBlock(ledger, targets, command);
}

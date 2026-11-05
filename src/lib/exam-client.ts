import { deskFetch } from "./desk-fetch";
import type { ExamLedger } from "./exam-ledger.ts";
import { setExam } from "./exam-lock";

export type ExamPost = { ledger: ExamLedger | null; error: string };

function isLedger(value: unknown): value is ExamLedger {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<ExamLedger>;
  return typeof row.on === "boolean" && typeof row.startedAt === "number" && typeof row.meterpreterHost === "string" && Array.isArray(row.hosts) && Array.isArray(row.scope) && Array.isArray(row.msf) && Array.isArray(row.audit);
}

function adopt(ledger: ExamLedger) {
  setExam({ on: ledger.on, host: ledger.meterpreterHost, startedAt: ledger.startedAt });
}

export async function postExam(body: unknown): Promise<ExamPost> {
  try {
    const res = await deskFetch("/api/exam", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    const wrapped = data && typeof data === "object" ? (data as { error?: unknown; ledger?: unknown }) : null;
    const ledger = isLedger(data) ? data : isLedger(wrapped?.ledger) ? wrapped.ledger : null;
    const fromJson = typeof wrapped?.error === "string" ? wrapped.error : "";
    const error = res.ok ? "" : fromJson || text.trim().slice(0, 240) || "The exam ledger refused that.";
    if (ledger) adopt(ledger);
    return { ledger, error };
  } catch {
    return { ledger: null, error: "The exam ledger did not answer." };
  }
}

/** OSCP exam rules the desk shows. OffSec Exam Guide, updated 21 Oct 2026. */

export const EXAM_MS = (23 * 60 + 45) * 60 * 1000;
export const REPORT_MS = 24 * 60 * 60 * 1000;
export const SCALE_FROM = Date.parse("2026-12-01T08:00:00Z");

export const POINTS = {
  standaloneAccess: 10,
  standalonePrivesc: 10,
  ad: 40,
  passRawBeforeScale: 70,
  scaledPass: 400,
  scaledMax: 500,
} as const;

const BANNED: { name: string; re: RegExp; why: string }[] = [
  { name: "sqlmap", re: /\bsqlmap\b/i, why: "Automatic exploitation is banned. The SQL injection stays manual." },
  { name: "sqlninja", re: /\bsqlninja\b/i, why: "Automatic exploitation is banned." },
  { name: "nessus", re: /\bnessus\b/i, why: "Mass vulnerability scanners are banned." },
  { name: "openvas", re: /\bopenvas\b/i, why: "Mass vulnerability scanners are banned." },
  { name: "nexpose", re: /\bnexpose\b/i, why: "Mass vulnerability scanners are banned." },
  { name: "responder", re: /\bresponder\b/i, why: "Spoofing, including LLMNR and NBT-NS poisoning, is banned." },
  { name: "mitm6", re: /\bmitm6\b/i, why: "Spoofing is banned." },
  { name: "bettercap", re: /\bbettercap\b/i, why: "Spoofing is banned." },
  { name: "ettercap", re: /\bettercap\b/i, why: "Spoofing is banned." },
  { name: "arpspoof", re: /\barpspoof\b/i, why: "Spoofing is banned." },
  { name: "ntlmrelayx", re: /\bntlmrelayx\b/i, why: "The guide does not allow the relay. It stays off while exam lock is on." },
];

export function bannedCommand(command: string, examOn: boolean): string | null {
  if (!examOn) return null;
  const hit = BANNED.find((item) => item.re.test(command));
  return hit ? `${hit.name}: ${hit.why}` : null;
}

export function passRule(when = Date.now()): { scaled: boolean; text: string } {
  if (when >= SCALE_FROM) {
    return {
      scaled: true,
      text: `Exams that start on or after 1 Dec 2026 08:00 GMT are a scaled score, ${POINTS.scaledPass} out of ${POINTS.scaledMax}. OffSec has not published the raw-point equivalent. A bar that says ${POINTS.passRawBeforeScale} points is wrong for this sitting.`,
    };
  }
  return {
    scaled: false,
    text: `This sitting starts before 1 Dec 2026 08:00 GMT. The pass mark is ${POINTS.passRawBeforeScale} raw points: three standalones at 20 (10 access, 10 privilege escalation) and the AD set at 40. From that date the score is scaled, and 70 is no longer the published bar.`,
  };
}

export function formatLeft(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
}

export function examClock(startedAt: number, now = Date.now()): { phase: "idle" | "exam" | "report" | "done"; leftMs: number; text: string } {
  if (!startedAt) return { phase: "idle", leftMs: EXAM_MS, text: "Timer not started. Start it when the proctor starts the clock. 23h 45m, then 24h to upload." };
  const examEnd = startedAt + EXAM_MS;
  const reportEnd = examEnd + REPORT_MS;
  if (now < examEnd) {
    const left = examEnd - now;
    const warn = left <= 60 * 60 * 1000 ? " Under an hour. Submit the flags you already have." : "";
    return { phase: "exam", leftMs: left, text: `Exam time left: ${formatLeft(left)}.${warn}` };
  }
  if (now < reportEnd) return { phase: "report", leftMs: reportEnd - now, text: `Exam time is over. Report upload left: ${formatLeft(reportEnd - now)}.` };
  return { phase: "done", leftMs: 0, text: "The 24 hour upload window has ended." };
}

/** Copy-only. No password on the archive. OffSec wants the PDF inside that .7z, under 200 MB. */
export function packCommands(fileBase: string): { seven: string; md5: string; note: string } {
  const safe = fileBase.replace(/[^A-Za-z0-9._-]/g, "") || "OSCP-OS-XXXXX-Exam-Report";
  return {
    seven: `7z a ${safe}.7z ${safe}.pdf`,
    md5: `md5sum ${safe}.7z`,
    note: "No password on the 7z. The PDF inside uses the same base name. The archive must be under 200 MB. Check the md5 against the portal.",
  };
}

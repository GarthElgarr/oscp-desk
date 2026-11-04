import { useEffect, useState, useSyncExternalStore } from "react";
import { getGlobals, getGlobalsServer, setGlobals, subscribeGlobals } from "@/lib/desk-globals";
import { getExam, getExamServer, setExam, subscribeExam } from "@/lib/exam-lock";
import { examClock, passRule } from "@/lib/exam-rules";
import { previewPathPrefix } from "@/lib/preview-path-prefix";

const control = "min-h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg outline-none";

function revshellHref(ip: string): string {
  const prefix = typeof window === "undefined" ? "" : (previewPathPrefix(window.location.hostname, window.location.pathname) ?? "");
  const query = ip ? `?ip=${encodeURIComponent(ip)}` : "";
  return `${prefix}/revshells/index.html${query}`;
}

export function GlobalConfig() {
  const globals = useSyncExternalStore(subscribeGlobals, getGlobals, getGlobalsServer);
  const exam = useSyncExternalStore(subscribeExam, getExam, getExamServer);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!exam.startedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [exam.startedAt]);
  const clock = examClock(exam.startedAt, now);
  const rule = passRule(exam.startedAt || now);
  return (
    <div className="mt-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">LOCAL IP</span>
          <input className={control} value={globals.localIp} onChange={(event) => setGlobals({ localIp: event.target.value })} placeholder="10.10.14.5" inputMode="decimal" spellCheck={false} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">INTERFACE</span>
          <input className={control} value={globals.iface} onChange={(event) => setGlobals({ iface: event.target.value })} placeholder="tun0" spellCheck={false} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">TARGET IP</span>
          <input className={control} value={globals.target} onChange={(event) => setGlobals({ target: event.target.value })} placeholder="10.10.10.10" inputMode="decimal" spellCheck={false} />
        </label>
        <div className="flex items-end">
          <a href={revshellHref(globals.localIp)} className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-primary bg-raised px-3 text-sm text-fg">
            Reverse shells
          </a>
        </div>
      </div>
      <p className="mt-2 text-sm text-muted">
        These fill nmap, UDP, hydra, nxc, impacket, wfuzz, SNMP, WinRM, msfvenom, the tunnel, uploads, and Penelope until you edit that box. Editing a box does not change these. Reverse shells opens the local copy of revshells, with your local IP filled in.
      </p>
      <div className="mt-3 rounded-lg border border-border bg-bg px-3 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-xs tracking-wide text-primary">EXAM LOCK</p>
          <button
            type="button"
            onClick={() => setExam({ on: !exam.on })}
            className={"inline-flex min-h-11 items-center rounded-lg border px-3 text-sm " + (exam.on ? "border-primary bg-raised text-fg" : "border-border text-muted")}
          >
            {exam.on ? "On" : "Off, lab only"}
          </button>
        </div>
        <p className="mt-2 text-sm text-muted">
          {exam.on
            ? "On for the OSCP exam. No spoofing, no sqlmap, no mass scanner, no Burp Pro, and no chatbot. The AI desk is hidden. Meterpreter and Metasploit modules are one machine, and not for pivoting. A failed attempt still locks. A normal msfvenom shell and multi/handler are allowed on every machine. This desk does not call a model."
            : "Off. The desk will build lab commands the exam does not allow, including a relay, Meterpreter on more than one machine, and the AI desk. Turn it back on before the exam."}
        </p>
        {exam.on ? <p className="mt-2 text-sm text-muted">{rule.text}</p> : null}
        {exam.on ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-sm text-fg">{clock.text}</p>
            <button type="button" onClick={() => setExam({ startedAt: Date.now() })} className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm text-fg">
              {exam.startedAt ? "Restart timer" : "Start timer"}
            </button>
            {exam.startedAt ? (
              <button type="button" onClick={() => setExam({ startedAt: 0 })} className="inline-flex min-h-11 items-center text-sm text-muted underline">
                Stop timer
              </button>
            ) : null}
          </div>
        ) : null}
        {exam.on ? (
          <p className="mt-2 text-sm text-fg">
            {exam.host ? `Meterpreter is locked to ${exam.host}.` : "Meterpreter is not locked yet. The first one you copy claims Target IP."}
            {exam.host ? (
              <button type="button" onClick={() => setExam({ host: "" })} className="ml-2 underline">
                Clear, only if you have not used it
              </button>
            ) : null}
          </p>
        ) : null}
      </div>
    </div>
  );
}
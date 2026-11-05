import { useEffect, useState, useSyncExternalStore } from "react";
import { deskFetch } from "@/lib/desk-fetch";
import { getGlobals, getGlobalsServer, setGlobals, subscribeGlobals } from "@/lib/desk-globals";
import { postExam } from "@/lib/exam-client";
import { getExam, getExamServer, setExam, subscribeExam } from "@/lib/exam-lock";
import { ipInScope, ledgerPristine, type ExamLedger } from "@/lib/exam-ledger";
import { examClock, formatLeft, passRule } from "@/lib/exam-rules";
import { previewPathPrefix } from "@/lib/preview-path-prefix";
import { hostOrIp } from "@/lib/scope-target";

const control = "min-h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg outline-none";
const btn = "inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm text-fg disabled:opacity-40";

function revshellHref(ip: string): string {
  const prefix = typeof window === "undefined" ? "" : (previewPathPrefix(window.location.hostname, window.location.pathname) ?? "");
  const query = ip ? `?ip=${encodeURIComponent(ip)}` : "";
  return `${prefix}/revshells/index.html${query}`;
}

function when(at: number): string {
  return new Date(at).toISOString().slice(0, 19).replace("T", " ");
}

function downloadLedger(ledger: ExamLedger) {
  const blob = new Blob([JSON.stringify(ledger, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "exam-ledger.json";
  link.click();
  URL.revokeObjectURL(url);
}

export function GlobalConfig() {
  const globals = useSyncExternalStore(subscribeGlobals, getGlobals, getGlobalsServer);
  const exam = useSyncExternalStore(subscribeExam, getExam, getExamServer);
  const [ledger, setLedger] = useState<ExamLedger | null>(null);
  const [ready, setReady] = useState(false);
  const [problem, setProblem] = useState("");
  const [scopeText, setScopeText] = useState("");
  const [hostText, setHostText] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const tracking = Boolean(exam.startedAt) || Boolean(ledger?.hosts.some((host) => host.startedAt));
  useEffect(() => {
    if (!tracking) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [tracking]);
  useEffect(() => {
    let cancel = false;
    (async () => {
      const local = getExam();
      try {
        const res = await deskFetch("/api/exam");
        if (cancel) return;
        if (!res.ok) {
          setProblem("The exam ledger did not load. Retry from a button once the desk answers.");
          return;
        }
        let next = (await res.json()) as ExamLedger;
        if (cancel) return;
        if (ledgerPristine(next) && (local.startedAt > 0 || local.host || local.on !== next.on)) {
          const migrated = await postExam({ action: "patch", on: local.on, startedAt: local.startedAt });
          if (migrated.ledger) next = migrated.ledger;
          if (local.host) {
            const claimed = await postExam({ action: "patch", meterpreterHost: local.host });
            if (claimed.ledger) next = claimed.ledger;
            if (!cancel) setProblem(claimed.error || migrated.error);
          } else if (!cancel && migrated.error) setProblem(migrated.error);
        } else {
          setExam({ on: next.on, host: next.meterpreterHost, startedAt: next.startedAt });
        }
        if (!cancel) setLedger(next);
      } catch {
        if (!cancel) setProblem("The exam ledger did not answer. Retry from a button once the desk answers.");
      } finally {
        if (!cancel) setReady(true);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  async function push(body: unknown) {
    setProblem("");
    const result = await postExam(body);
    if (result.ledger) setLedger(result.ledger);
    setProblem(result.error);
    return result;
  }

  const clock = examClock(exam.startedAt, now);
  const rule = passRule(exam.startedAt || now);
  const target = hostOrIp(globals.target);
  const outside = Boolean(ledger && ledger.scope.length > 0 && target && !ipInScope(target, ledger.scope));
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
            disabled={!ready}
            onClick={() => void push({ action: "patch", on: !exam.on })}
            className={"inline-flex min-h-11 items-center rounded-lg border px-3 text-sm disabled:opacity-40 " + (exam.on ? "border-primary bg-raised text-fg" : "border-border text-muted")}
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
            <button type="button" disabled={!ready} onClick={() => void push({ action: "patch", startedAt: Date.now() })} className={btn}>
              {exam.startedAt ? "Restart timer" : "Start timer"}
            </button>
            {exam.startedAt ? (
              <button type="button" disabled={!ready} onClick={() => void push({ action: "patch", startedAt: 0 })} className="inline-flex min-h-11 items-center text-sm text-muted underline disabled:opacity-40">
                Stop timer
              </button>
            ) : null}
          </div>
        ) : null}
        {exam.on ? (
          <p className="mt-2 text-sm text-fg">
            {exam.host ? `Meterpreter is locked to ${exam.host}.` : "Meterpreter is not locked yet. The first one you copy claims Target IP."}
            {exam.host && ledger && ledger.msf.length === 0 ? (
              <button type="button" disabled={!ready} onClick={() => void push({ action: "patch", meterpreterHost: "" })} className="ml-2 underline disabled:opacity-40">
                Clear, only if you have not used it
              </button>
            ) : null}
          </p>
        ) : null}
        {ledger && exam.on ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!ready || !target || Boolean(exam.host && target !== exam.host)}
              onClick={() => void push({ action: "msf", host: globals.target, payload: "meterpreter", ok: false })}
              className={btn}
            >
              Record a failed Meterpreter run
            </button>
            <p className="text-sm text-muted">Uses Target IP. A failed run still locks that one machine.</p>
          </div>
        ) : null}
        {ledger && !exam.on && ledger.msf.length > 0 ? (
          <button type="button" disabled={!ready} onClick={() => void push({ action: "patch", clearMsf: true })} className={"mt-2 " + btn}>
            Clear the lab Metasploit ledger
          </button>
        ) : null}
        <div className="mt-4 border-t border-border pt-3">
          <p className="font-mono text-xs tracking-wide text-primary">SCOPE</p>
          <p className="mt-1 text-sm text-muted">The machines for this sitting. A list of hosts, or one subnet no wider than /24. The ledger is stored on this desk, not only in the browser.</p>
          {outside ? <p className="mt-2 text-sm text-fg">Target IP is outside the declared scope.</p> : null}
          {ledger ? (
            <ul className="mt-2 flex flex-col gap-1">
              {ledger.scope.map((entry) => (
                <li key={entry} className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-mono text-fg">{entry}</span>
                  {exam.on && ledger.msf.length > 0 ? null : (
                    <button type="button" className="text-sm text-muted underline" onClick={() => void push({ action: "patch", scope: ledger.scope.filter((item) => item !== entry) })}>
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
          {exam.on && ledger && ledger.msf.length > 0 && ledger.scope.length > 0 ? (
            <p className="mt-1 text-sm text-muted">Scope cannot be narrowed after a Meterpreter attempt. You can still add a machine.</p>
          ) : null}
          <form
            className="mt-2 flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!ledger || !scopeText.trim()) return;
              void push({ action: "patch", scope: [...ledger.scope, scopeText.trim()] }).then((result) => {
                if (!result.error) setScopeText("");
              });
            }}
          >
            <input className={control + " max-w-xs"} value={scopeText} onChange={(event) => setScopeText(event.target.value)} placeholder="10.10.10.0/24" spellCheck={false} disabled={!ready || !ledger} />
            <button type="submit" className={btn} disabled={!ready || !ledger}>
              Add to scope
            </button>
          </form>
        </div>
        <div className="mt-4 border-t border-border pt-3">
          <p className="font-mono text-xs tracking-wide text-primary">HOSTS</p>
          <p className="mt-1 text-sm text-muted">
            One row per machine. The box timer is time on that host. The exam timer above is the proctor clock. local.txt and proof.txt are ticks, not a point total.
            {ledger ? ` Ticked: ${ledger.hosts.filter((host) => host.flagLocal).length} local, ${ledger.hosts.filter((host) => host.flagProof).length} proof.` : ""}
          </p>
          {ledger ? (
            <ul className="mt-2 flex flex-col gap-3">
              {ledger.hosts.map((host) => (
                <li key={host.ip} className="rounded-lg border border-border px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono text-sm text-fg">{host.ip}</p>
                    <button type="button" className="text-sm text-muted underline" onClick={() => void push({ action: "host", ip: host.ip, remove: true })}>
                      Remove
                    </button>
                  </div>
                  <p className="mt-1 text-sm text-fg">{host.startedAt ? `On this box: ${formatLeft(now - host.startedAt)}.` : "Box timer not started."}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" className={btn} onClick={() => void push({ action: "host", ip: host.ip, startedAt: host.startedAt ? 0 : Date.now() })}>
                      {host.startedAt ? "Stop box timer" : "Start box timer"}
                    </button>
                    <label className="inline-flex min-h-11 items-center gap-2 text-sm text-fg">
                      <input type="checkbox" checked={host.flagLocal} onChange={(event) => void push({ action: "host", ip: host.ip, flagLocal: event.target.checked })} />
                      local.txt
                    </label>
                    <label className="inline-flex min-h-11 items-center gap-2 text-sm text-fg">
                      <input type="checkbox" checked={host.flagProof} onChange={(event) => void push({ action: "host", ip: host.ip, flagProof: event.target.checked })} />
                      proof.txt
                    </label>
                  </div>
                  <input
                    className={control + " mt-2"}
                    key={host.ip}
                    defaultValue={host.note}
                    placeholder="Note. What you have, what is left."
                    spellCheck={false}
                    onBlur={(event) => {
                      if (event.target.value !== host.note) void push({ action: "host", ip: host.ip, note: event.target.value });
                    }}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted">{ready ? "The ledger is not loaded." : "Loading the exam ledger from this desk."}</p>
          )}
          <form
            className="mt-2 flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!hostText.trim()) return;
              void push({ action: "host", ip: hostText.trim() }).then((result) => {
                if (!result.error) setHostText("");
              });
            }}
          >
            <input className={control + " max-w-xs"} value={hostText} onChange={(event) => setHostText(event.target.value)} placeholder="10.10.10.10" spellCheck={false} disabled={!ready || !ledger} />
            <button type="submit" className={btn} disabled={!ready || !ledger}>
              Add host
            </button>
          </form>
        </div>
        {ledger && ledger.msf.length > 0 ? (
          <div className="mt-4 border-t border-border pt-3">
            <p className="font-mono text-xs tracking-wide text-primary">METASPLOIT LEDGER</p>
            <ul className="mt-2 flex flex-col gap-1">
              {ledger.msf.slice(-6).map((entry, index) => (
                <li key={`${entry.at}-${index}`} className="text-sm text-fg">
                  {when(entry.at)} {entry.ok ? "copied" : "failed"} {entry.payload} on {entry.host}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {ledger && ledger.audit.length > 0 ? (
          <div className="mt-4 border-t border-border pt-3">
            <p className="font-mono text-xs tracking-wide text-primary">AUDIT</p>
            <ul className="mt-2 flex flex-col gap-1">
              {ledger.audit.slice(-8).map((entry, index) => (
                <li key={`${entry.at}-${index}`} className="text-sm text-muted">
                  {when(entry.at)} {entry.kind}: {entry.detail}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <button type="button" className={btn} disabled={!ledger} onClick={() => ledger && downloadLedger(ledger)}>
            Download backup
          </button>
          <label className={btn + " cursor-pointer"}>
            Restore backup
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              disabled={!ready}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                if (file.size > 200_000) {
                  setProblem("That backup is too large.");
                  return;
                }
                void file.text().then((text) => {
                  try {
                    const parsed = JSON.parse(text) as unknown;
                    void push({ action: "replace", ledger: parsed });
                  } catch {
                    setProblem("That file is not JSON.");
                  }
                });
              }}
            />
          </label>
          <p className="text-sm text-muted">The backup is the ledger file. Restore checks it before it replaces this one.</p>
        </div>
        {problem ? <p className="mt-2 text-sm text-fg">{problem}</p> : null}
      </div>
    </div>
  );
}

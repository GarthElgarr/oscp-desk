import { useMemo, useState, useSyncExternalStore } from "react";
import { Copy } from "lucide-react";
import { JobList } from "@/components/job-list";
import { getJobs, getJobsServer, launchJob, sendJob, subscribeJobs } from "@/lib/live-jobs";
import { penelopeLine, penelopePlan } from "@/lib/penelope-plan";

const control = "min-h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg outline-none";

export function PenelopeCard() {
  const [mode, setMode] = useState<"listen" | "connect">("listen");
  const [port, setPort] = useState("443");
  const [iface, setIface] = useState("0.0.0.0");
  const [host, setHost] = useState("");
  const [session, setSession] = useState("1");
  const [local, setLocal] = useState("/home/kali/linpeas.sh");
  const [remote, setRemote] = useState("/tmp/linpeas.sh");
  const [typed, setTyped] = useState("");
  const [copied, setCopied] = useState("");
  const jobs = useSyncExternalStore(subscribeJobs, getJobs, getJobsServer);
  const running = jobs.find((job) => job.tool === "penelope" && job.running);
  const plan = useMemo(() => penelopePlan({ mode, port, iface, host }), [mode, port, iface, host]);
  const ready = !("error" in plan);

  async function copy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      window.setTimeout(() => setCopied(""), 1200);
    } catch {
      setCopied("");
    }
  }

  async function start() {
    if (!ready) return;
    await launchJob("/api/penelope", { mode, port, iface, host }, { tool: "penelope", title: plan.command, command: plan.command });
  }

  async function press(action: string) {
    if (!running) return;
    const line = penelopeLine(action, session, local, remote);
    if ("error" in line) return;
    await sendJob(running.id, line.text);
  }

  async function sendTyped() {
    if (!running) return;
    const text = typed.replace(/[\r\0]/g, "").slice(0, 200);
    if (!text.trim()) return;
    setTyped("");
    await sendJob(running.id, text.endsWith("\n") ? text : `${text}\n`);
  }

  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-primary bg-surface">
      <div className="border-b border-border px-4 py-3">
        <p className="font-mono text-xs text-primary">Listener</p>
        <h2 className="text-lg font-semibold">Penelope</h2>
        <p className="mt-1 text-sm text-muted">
          Starts Penelope in the desk. The buttons type its menu commands. Copy the line if you want the same listener in your own terminal.
        </p>
      </div>
      <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">MODE</span>
          <select className={control} value={mode} onChange={(event) => setMode(event.target.value === "connect" ? "connect" : "listen")}>
            <option value="listen">Listen for a reverse shell</option>
            <option value="connect">Connect to a bind shell</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">PORT</span>
          <input className={control} value={port} onChange={(event) => setPort(event.target.value.trim())} spellCheck={false} />
        </label>
        {mode === "listen" ? (
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-mono text-xs tracking-wide text-muted">LISTEN ON</span>
            <input className={control} value={iface} onChange={(event) => setIface(event.target.value.trim())} placeholder="0.0.0.0" spellCheck={false} />
          </label>
        ) : (
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-mono text-xs tracking-wide text-muted">BIND SHELL HOST</span>
            <input className={control} value={host} onChange={(event) => setHost(event.target.value.trim())} placeholder="10.10.10.10" spellCheck={false} />
          </label>
        )}
      </div>
      <div className="flex flex-col gap-3 px-4 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-xs tracking-wide text-muted">COMMAND</p>
          <button type="button" onClick={() => ready && void copy("penelope", plan.command)} disabled={!ready} className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs text-muted disabled:opacity-40">
            <Copy className="size-3.5" aria-hidden="true" />
            {copied === "penelope" ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="whitespace-pre-wrap break-all rounded-lg bg-bg p-3 font-mono text-xs leading-relaxed text-fg">{ready ? plan.command : plan.error}</pre>
        {ready ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-xs text-muted">{plan.nc}</p>
            <button type="button" onClick={() => void copy("nc", plan.nc)} className="inline-flex min-h-11 items-center rounded-lg px-2 text-xs text-muted">
              {copied === "nc" ? "Copied" : "Copy nc"}
            </button>
          </div>
        ) : null}
        {ready ? <p className="text-sm text-fg">{plan.why}</p> : null}
        <button type="button" onClick={() => void start()} disabled={!ready || Boolean(running)} className="inline-flex min-h-11 w-fit items-center rounded-lg border border-primary bg-raised px-3 text-sm text-fg disabled:opacity-40">
          {running ? "Penelope is running" : "Start Penelope"}
        </button>
        <div className="rounded-lg bg-bg px-3 py-3 text-sm text-fg">
          <p className="font-mono text-xs text-primary">HOW TO</p>
          <ol className="mt-2 list-decimal space-y-1 pl-4">
            <li>Start this before the payload. LHOST is your tun0 address. The port is the one above.</li>
            <li>You stay in the menu. A new session is listed. It is not entered. Interact opens it, then whoami.</li>
            <li>Detach before Upload, Download, or Sessions. Inside the shell those words run on the target.</li>
            <li>Kill drops one session. Stop on the run below stops Penelope. Ctrl-C in the menu does not.</li>
            <li>payloads prints a callback aimed at this listener. Copy that line onto the target if you do not already have one.</li>
          </ol>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-mono text-xs tracking-wide text-muted">SESSION</span>
            <input className={control} value={session} onChange={(event) => setSession(event.target.value.trim())} spellCheck={false} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-mono text-xs tracking-wide text-muted">KALI PATH</span>
            <input className={control} value={local} onChange={(event) => setLocal(event.target.value.trim())} spellCheck={false} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-mono text-xs tracking-wide text-muted">TARGET PATH</span>
            <input className={control} value={remote} onChange={(event) => setRemote(event.target.value.trim())} spellCheck={false} />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["sessions", "Sessions"],
              ["interact", "Interact"],
              ["detach", "Detach"],
              ["interrupt", "Ctrl-C"],
              ["upgrade", "Upgrade"],
              ["spawn", "Spawn"],
              ["upload", "Upload"],
              ["download", "Download"],
              ["payloads", "Payloads"],
              ["listeners", "Listeners"],
              ["kill", "Kill session"],
              ["menu-exit", "Leave menu"],
            ] as const
          ).map(([action, label]) => (
            <button key={action} type="button" disabled={!running || "error" in penelopeLine(action, session, local, remote)} onClick={() => void press(action)} className="inline-flex min-h-11 items-center rounded-lg border border-border bg-bg px-3 text-sm text-fg disabled:opacity-40">
              {label}
            </button>
          ))}
        </div>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void sendTyped();
          }}
        >
          <input className={control + " min-w-0 flex-1"} value={typed} onChange={(event) => setTyped(event.target.value)} placeholder="Or type a menu command, such as help upload" spellCheck={false} disabled={!running} />
          <button type="submit" disabled={!running || !typed.trim()} className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm text-fg disabled:opacity-40">
            Send
          </button>
        </form>
        <JobList tool="penelope" empty="Penelope is not running." />
      </div>
    </article>
  );
}

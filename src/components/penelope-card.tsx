import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Copy } from "lucide-react";
import { ShellTerm } from "@/components/shell-term";
import { getJobs, getJobsServer, launchJob, stopJob, subscribeJobs, syncJobs } from "@/lib/live-jobs";
import { penelopeLine, penelopePlan } from "@/lib/penelope-plan";

const control = "min-h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg outline-none";

function plain(output: string): string {
  return output.replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, "");
}

function shellOpen(output: string): boolean {
  const text = plain(output);
  let last = "";
  for (const match of text.matchAll(/Interacting with session|Session detached/g)) last = match[0];
  return last === "Interacting with session";
}

export function PenelopeCard() {
  const [mode, setMode] = useState<"listen" | "connect">("listen");
  const [port, setPort] = useState("443");
  const [iface, setIface] = useState("0.0.0.0");
  const [host, setHost] = useState("");
  const [session, setSession] = useState("1");
  const [local, setLocal] = useState("/home/kali/linpeas.sh");
  const [remote, setRemote] = useState("/tmp/linpeas.sh");
  const [copied, setCopied] = useState("");
  const [sendError, setSendError] = useState("");
  const [killNote, setKillNote] = useState("");
  const jobs = useSyncExternalStore(subscribeJobs, getJobs, getJobsServer);
  const running = jobs.find((job) => job.tool === "penelope" && job.running);
  const shown = running ?? jobs.find((job) => job.tool === "penelope");
  const caught = Boolean(shown && plain(shown.output).includes("Interacting with session"));
  const atShell = shellOpen(shown?.output ?? "");
  const plan = useMemo(() => penelopePlan({ mode, port, iface, host }), [mode, port, iface, host]);
  const ready = !("error" in plan);
  const chain = useRef(Promise.resolve());
  const hold = useRef(false);
  const pending = useRef("");
  const keyTimer = useRef(0);
  const runningId = useRef("");
  runningId.current = running?.id ?? "";

  async function copy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      window.setTimeout(() => setCopied(""), 1200);
    } catch {
      setCopied("");
    }
  }

  async function killListener() {
    setKillNote("");
    if (running) void stopJob(running.id);
    const response = await fetch("/api/penelope", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kill: true, port }),
    });
    setKillNote(await response.text());
    await syncJobs();
  }

  async function start() {
    if (!ready) return;
    await launchJob("/api/penelope", { mode, port, iface, host }, { tool: "penelope", title: plan.command, command: plan.command });
  }

  function enqueue(text: string): Promise<boolean> {
    const run = chain.current.then(() => deliver(text));
    chain.current = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  async function deliver(text: string): Promise<boolean> {
    const id = runningId.current;
    if (!id) return false;
    for (let i = 0; i < text.length; i += 4000) {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ write: id, text: text.slice(i, i + 4000), silent: true }),
      });
      if (!response.ok) {
        setSendError("That command did not reach Penelope. If the run has ended, start it again.");
        return false;
      }
    }
    setSendError("");
    await syncJobs();
    return true;
  }

  function flushKeys() {
    window.clearTimeout(keyTimer.current);
    keyTimer.current = 0;
    const text = pending.current;
    pending.current = "";
    if (text) void enqueue(text);
  }

  function onKeys(text: string) {
    if (hold.current || !caught || !runningId.current) return;
    pending.current += text;
    if (keyTimer.current) return;
    keyTimer.current = window.setTimeout(() => {
      keyTimer.current = 0;
      const next = pending.current;
      pending.current = "";
      if (next) void enqueue(next);
    }, 30);
  }

  async function write(text: string) {
    flushKeys();
    return enqueue(text);
  }

  async function press(action: string) {
    if (!running || !caught) return;
    const line = penelopeLine(action, session, local, remote);
    if ("error" in line) return;
    hold.current = true;
    try {
      const menu = action !== "detach" && action !== "interrupt";
      if (menu && atShell) {
        const left = await write("\u001b[24~");
        if (!left) return;
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
      await write(line.text);
    } finally {
      hold.current = false;
    }
  }

  async function useSession(n: number) {
    setSession(String(n));
    if (!running || !caught) return;
    hold.current = true;
    try {
      if (atShell) {
        const left = await write("\u001b[24~");
        if (!left) return;
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
      await write(`interact ${n}\n`);
    } finally {
      hold.current = false;
    }
  }

  return (
    <article id="panel-penelope" className="min-w-0 scroll-mt-4 overflow-hidden rounded-lg border border-primary bg-surface">
      <div className="border-b border-border px-4 py-3">
        <p className="font-mono text-xs text-primary">Listener</p>
        <h2 className="text-lg font-semibold">Penelope</h2>
        <p className="mt-1 text-sm text-muted">
          Click the terminal and type. It is the Penelope shell. The bar switches session, uploads, and downloads. Menu leaves the shell. Shell goes back in.
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
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void start()} disabled={!ready || Boolean(running)} className="inline-flex min-h-11 w-fit items-center rounded-lg border border-primary bg-raised px-3 text-sm text-fg disabled:opacity-40">
            {running ? "Penelope is running" : "Start Penelope"}
          </button>
          <button type="button" onClick={() => void killListener()} className="inline-flex min-h-11 w-fit items-center rounded-lg border border-dead px-3 text-sm text-dead">
            Kill listener
          </button>
        </div>
        {killNote ? <p className="text-sm text-muted">{killNote}</p> : null}
        <div className="flex flex-wrap items-center gap-1">
          <span className="px-1 font-mono text-xs text-muted">SESSION</span>
          {["1", "2", "3", "4", "5"].map((n) => (
            <button key={n} type="button" disabled={!running || !caught} onClick={() => void useSession(Number(n))} className={"inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-xs disabled:opacity-40 " + (session === n ? "border-primary bg-raised text-fg" : "border-border text-muted")}>
              {n}
            </button>
          ))}
          <button type="button" disabled={!running || !caught} onClick={() => void press("detach")} className="inline-flex h-9 items-center rounded-lg border border-border px-2 text-xs text-fg disabled:opacity-40">
            Menu
          </button>
          <button type="button" disabled={!running || !caught} onClick={() => void press("interact")} className="inline-flex h-9 items-center rounded-lg border border-border px-2 text-xs text-fg disabled:opacity-40">
            Shell
          </button>
          <button type="button" disabled={!running || !caught} onClick={() => void press("payloads")} className="inline-flex h-9 items-center rounded-lg border border-border px-2 text-xs text-fg disabled:opacity-40">
            Payloads
          </button>
          <button type="button" disabled={!running || !caught} onClick={() => void press("kill")} className="inline-flex h-9 items-center rounded-lg border border-border px-2 text-xs text-muted disabled:opacity-40">
            Kill session
          </button>
          <button type="button" onClick={() => void killListener()} className="inline-flex h-9 items-center rounded-lg border border-dead px-2 text-xs text-dead">
            Kill listener
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <input className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-bg px-2 font-mono text-xs text-fg outline-none" value={local} onChange={(event) => setLocal(event.target.value.trim())} aria-label="Kali path" spellCheck={false} />
          <input className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-bg px-2 font-mono text-xs text-fg outline-none" value={remote} onChange={(event) => setRemote(event.target.value.trim())} aria-label="Target path" spellCheck={false} />
          <button type="button" disabled={!running || !caught || "error" in penelopeLine("upload", session, local, remote)} onClick={() => void press("upload")} className="inline-flex h-9 items-center rounded-lg border border-primary bg-raised px-2 text-xs text-fg disabled:opacity-40">
            Upload
          </button>
          <button type="button" disabled={!running || !caught || "error" in penelopeLine("download", session, local, remote)} onClick={() => void press("download")} className="inline-flex h-9 items-center rounded-lg border border-border px-2 text-xs text-fg disabled:opacity-40">
            Download
          </button>
        </div>
        <p className="text-xs text-muted">Click the black terminal and type. Kill listener frees the port, including a Penelope that kept listening after an earlier run, so Start can use it again. Left box is the file on Kali. Right box is the path on the target.</p>
        {sendError ? <p className="text-sm text-dead">{sendError}</p> : null}
        {shown ? <ShellTerm jobId={shown.id} output={shown.output} active={Boolean(running)} onKeys={onKeys} /> : <p className="text-sm text-muted">Start Penelope. The terminal opens here when the listener is up.</p>}
      </div>
    </article>
  );
}

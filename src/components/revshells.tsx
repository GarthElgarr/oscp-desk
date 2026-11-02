import { useMemo, useState, useSyncExternalStore } from "react";
import { Copy } from "lucide-react";
import { getGlobals, getGlobalsServer, subscribeGlobals } from "@/lib/desk-globals";
import { REVSHELLS, fillShell, listenerCommand } from "@/lib/revshells";
import { useGlobalField } from "@/lib/use-global-field";

const control = "min-h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg outline-none";

export function RevShells() {
  const globals = useSyncExternalStore(subscribeGlobals, getGlobals, getGlobalsServer);
  const [shellId, setShellId] = useState(REVSHELLS[0].id);
  const [ip, setIp] = useGlobalField(globals.localIp);
  const [port, setPort] = useState("443");
  const [copied, setCopied] = useState("");
  const shell = REVSHELLS.find((item) => item.id === shellId) ?? REVSHELLS[0];
  const command = useMemo(() => (ip.trim() && port.trim() ? fillShell(shell.cmd, ip.trim(), port.trim()) : ""), [ip, port, shell]);
  const listen = listenerCommand(globals.iface, port.trim() || "443");

  async function copy(text: string, which: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      window.setTimeout(() => setCopied(""), 1200);
    } catch {
      setCopied("");
    }
  }

  return (
    <article id="panel-revshells" className="min-w-0 scroll-mt-4 overflow-hidden rounded-lg border border-primary bg-surface">
      <div className="border-b border-border px-4 py-3">
        <p className="font-mono text-xs text-primary">Shells</p>
        <h2 className="text-lg font-semibold">Reverse shells</h2>
        <p className="mt-1 text-sm text-muted">
          The same job as revshells.com, generated on this desk. It does not call that site. Local IP starts as the global value. Change it here without changing the global. Start the listener before you run the payload.
        </p>
      </div>
      <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="font-mono text-xs tracking-wide text-muted">SHELL</span>
          <select className={control} value={shell.id} onChange={(event) => setShellId(event.target.value)}>
            {REVSHELLS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.os} — {item.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">LHOST</span>
          <input className={control} value={ip} onChange={(event) => setIp(event.target.value)} placeholder="10.10.14.5" spellCheck={false} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">LPORT</span>
          <input className={control} value={port} onChange={(event) => setPort(event.target.value)} spellCheck={false} />
        </label>
      </div>
      <div className="flex flex-col gap-3 px-4 pb-4">
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-xs tracking-wide text-muted">ON THE TARGET</p>
          <button type="button" onClick={() => void copy(command, "shell")} disabled={!command} className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs text-muted disabled:opacity-40">
            <Copy className="size-3.5" aria-hidden="true" />
            {copied === "shell" ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="whitespace-pre-wrap break-all rounded-lg bg-bg p-3 font-mono text-xs leading-relaxed text-fg">{command || "Set a local IP in the globals, or type one here."}</pre>
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-xs tracking-wide text-muted">LISTENER ON KALI</p>
          <button type="button" onClick={() => void copy(listen, "listen")} className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs text-muted">
            <Copy className="size-3.5" aria-hidden="true" />
            {copied === "listen" ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="whitespace-pre-wrap break-all rounded-lg bg-bg p-3 font-mono text-xs leading-relaxed text-fg">{listen}</pre>
      </div>
    </article>
  );
}

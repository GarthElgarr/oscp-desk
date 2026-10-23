import { useMemo, useState } from "react";
import { Copy } from "lucide-react";
import { winrmPlan } from "@/lib/winrm-plan";
import { LootPick } from "@/components/loot-card";

const control = "min-h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg outline-none";

export function WinrmCard() {
  const [host, setHost] = useState("");
  const [user, setUser] = useState("");
  const [secret, setSecret] = useState("");
  const [mode, setMode] = useState<"pass" | "hash">("pass");
  const [ssl, setSsl] = useState(false);
  const [copied, setCopied] = useState(false);
  const plan = useMemo(() => winrmPlan({ host, user, secret, mode, ssl }), [host, user, secret, mode, ssl]);
  const ready = !("error" in plan);

  async function copy() {
    if (!ready) return;
    try {
      await navigator.clipboard.writeText(plan.command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-primary bg-surface">
      <div className="border-b border-border px-4 py-3">
        <p className="font-mono text-xs text-primary">Shell</p>
        <h2 className="text-lg font-semibold">evil-winrm</h2>
        <p className="mt-1 text-sm text-muted">
          The Windows shell after the login already worked. This card only builds the command. Paste it into your own terminal.
        </p>
      </div>
      <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">TARGET</span>
          <input className={control} value={host} onChange={(event) => setHost(event.target.value)} placeholder="10.10.10.10" spellCheck={false} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">USER</span>
          <input className={control} value={user} onChange={(event) => setUser(event.target.value)} placeholder="administrator" spellCheck={false} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">SECRET</span>
          <select className={control} value={mode} onChange={(event) => setMode(event.target.value === "hash" ? "hash" : "pass")}>
            <option value="pass">Password, -p</option>
            <option value="hash">NT hash, -H</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">{mode === "hash" ? "NT HASH" : "PASSWORD"}</span>
          <input className={control} value={secret} onChange={(event) => setSecret(event.target.value)} placeholder={mode === "hash" ? "32 hex characters" : ""} spellCheck={false} />
        </label>
        <LootPick
          kinds={["user", "pass", "nt"]}
          onPick={(item) => {
            if (item.user) setUser(item.user);
            if (item.kind === "pass" || item.kind === "nt") {
              setSecret(item.secret);
              setMode(item.kind === "nt" ? "hash" : "pass");
            }
          }}
        />
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="font-mono text-xs tracking-wide text-muted">PORT</span>
          <select className={control} value={ssl ? "https" : "http"} onChange={(event) => setSsl(event.target.value === "https")}>
            <option value="http">5985, plain</option>
            <option value="https">5986, HTTPS (-S)</option>
          </select>
        </label>
      </div>
      <div className="flex flex-col gap-3 px-4 pb-4">
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-xs tracking-wide text-muted">COMMAND</p>
          <button type="button" onClick={() => void copy()} disabled={!ready} className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs text-muted disabled:opacity-40">
            <Copy className="size-3.5" aria-hidden="true" />
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="whitespace-pre-wrap break-all rounded-lg bg-bg p-3 font-mono text-xs leading-relaxed text-fg">
          {ready ? plan.command : plan.error}
        </pre>
        {ready ? <p className="text-sm text-fg">{plan.why}</p> : null}
      </div>
    </article>
  );
}

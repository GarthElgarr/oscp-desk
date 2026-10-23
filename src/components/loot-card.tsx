import { useState, useSyncExternalStore } from "react";
import { Copy } from "lucide-react";
import { addLoot, getLoot, getLootServer, removeLoot, subscribeLoot, type LootItem } from "@/lib/loot";

const control = "min-h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg outline-none";

export function LootPick({
  kinds,
  onPick,
}: {
  kinds?: Array<LootItem["kind"]>;
  onPick: (item: LootItem) => void;
}) {
  const items = useSyncExternalStore(subscribeLoot, getLoot, getLootServer).filter((item) => !kinds || kinds.includes(item.kind));
  if (items.length === 0) return null;
  return (
    <label className="flex min-w-0 flex-col gap-1 text-sm sm:col-span-2">
      <span className="font-mono text-xs tracking-wide text-muted">FROM LOOT</span>
      <select
        className={control}
        value=""
        onChange={(event) => {
          const item = items.find((row) => row.id === event.target.value);
          if (item) onPick(item);
        }}
      >
        <option value="">Use a saved user and secret</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.user} · {item.kind === "hash" ? "hash" : "password"}
            {item.note ? ` · ${item.note}` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

export function LootCard() {
  const items = useSyncExternalStore(subscribeLoot, getLoot, getLootServer);
  const [user, setUser] = useState("");
  const [secret, setSecret] = useState("");
  const [kind, setKind] = useState<"pass" | "hash">("pass");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  function add() {
    const result = addLoot({ user, secret, kind, note });
    if (result) {
      setError(result.error);
      return;
    }
    setError("");
    setSecret("");
    setNote("");
  }

  async function copy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      window.setTimeout(() => setCopied(""), 1200);
    } catch {
      setCopied("");
    }
  }

  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-primary bg-surface">
      <div className="border-b border-border px-4 py-3">
        <p className="font-mono text-xs text-primary">Loot</p>
        <h2 className="text-lg font-semibold">Users, passwords, hashes</h2>
        <p className="mt-1 text-sm text-muted">
          Write it down once. evil-winrm, Impacket, Hydra, and nxc can pick it from here. Reset desk does not delete this list.
        </p>
      </div>
      <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">USER</span>
          <input className={control} value={user} onChange={(event) => setUser(event.target.value)} placeholder="administrator" spellCheck={false} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">KIND</span>
          <select className={control} value={kind} onChange={(event) => setKind(event.target.value === "hash" ? "hash" : "pass")}>
            <option value="pass">Password</option>
            <option value="hash">NT hash</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">{kind === "hash" ? "NT HASH" : "PASSWORD"}</span>
          <input className={control} value={secret} onChange={(event) => setSecret(event.target.value)} spellCheck={false} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">WHERE</span>
          <input className={control} value={note} onChange={(event) => setNote(event.target.value)} placeholder="web.config on .10" spellCheck={false} />
        </label>
      </div>
      <div className="flex flex-col gap-3 px-4 pb-4">
        {error ? <p className="text-sm text-dead">{error}</p> : null}
        <button type="button" onClick={add} className="inline-flex min-h-11 w-fit items-center rounded-lg border border-primary bg-raised px-3 text-sm text-fg">
          Save
        </button>
        {items.length === 0 ? <p className="text-sm text-muted">Nothing saved yet.</p> : null}
        {items.map((item) => (
          <div key={item.id} className="rounded-lg bg-bg px-3 py-3">
            <p className="text-sm font-semibold">{item.user}</p>
            <p className="mt-1 break-all font-mono text-xs text-muted">
              {item.kind === "hash" ? "hash" : "password"} {item.secret}
              {item.note ? ` · ${item.note}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => void copy(item.id, item.secret)} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-border px-3 text-sm text-muted">
                <Copy className="size-3.5" aria-hidden="true" />
                {copied === item.id ? "Copied" : "Copy secret"}
              </button>
              <button type="button" onClick={() => removeLoot(item.id)} className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm text-muted">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

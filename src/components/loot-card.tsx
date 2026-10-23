import { useState, useSyncExternalStore } from "react";
import { Copy } from "lucide-react";
import { addLoot, getLoot, getLootServer, lootLabel, LOOT_KINDS, removeLoot, sshKeyScript, subscribeLoot, unlinkLoot, type LootItem, type LootKind } from "@/lib/loot";
import { getNotes, getNotesServer, subscribeNotes } from "@/lib/notes";

const control = "min-h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg outline-none";

function boxName(id: string, notes: { id: string; title: string }[]): string {
  const title = notes.find((note) => note.id === id)?.title.trim();
  return title || "Untitled box";
}

export function LootPick({
  kinds,
  onPick,
}: {
  kinds?: LootKind[];
  onPick: (item: LootItem) => void;
}) {
  const items = useSyncExternalStore(subscribeLoot, getLoot, getLootServer).filter((item) => !kinds || kinds.includes(item.kind));
  const notes = useSyncExternalStore(subscribeNotes, getNotes, getNotesServer);
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
        <option value="">Use a saved user, password, or hash</option>
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {(item.user || "no user") + " · " + lootLabel(item.kind)}
            {item.boxes[0] ? ` · ${boxName(item.boxes[0], notes)}` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}

export function LootCard() {
  const items = useSyncExternalStore(subscribeLoot, getLoot, getLootServer);
  const notes = useSyncExternalStore(subscribeNotes, getNotes, getNotesServer);
  const [user, setUser] = useState("");
  const [secret, setSecret] = useState("");
  const [kind, setKind] = useState<LootKind>("pass");
  const [where, setWhere] = useState("");
  const [pass, setPass] = useState("");
  const [boxId, setBoxId] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  function add() {
    const result = addLoot({ user, secret, kind, note: where, boxes: boxId ? [boxId] : [], pass });
    if (result) {
      setError(result.error);
      return;
    }
    setError("");
    setSecret("");
    setPass("");
    setWhere("");
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
          Write it down once. A box in Notes can be where you found it, or a host it might still work on. An SSH key can have a password. Leave that empty when ssh does not ask. evil-winrm, Impacket, nxc, and Hydra only offer the kinds they can use. Reset desk does not delete this list.
        </p>
      </div>
      <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">KIND</span>
          <select className={control} value={kind} onChange={(event) => setKind(event.target.value as LootKind)}>
            {LOOT_KINDS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">USER</span>
          <input className={control} value={user} onChange={(event) => setUser(event.target.value)} placeholder={kind === "user" ? "administrator" : "optional"} spellCheck={false} />
        </label>
        {kind === "user" ? null : kind === "sshkey" ? (
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-mono text-xs tracking-wide text-muted">PRIVATE KEY</span>
            <textarea className={control + " min-h-36 font-mono text-xs"} value={secret} onChange={(event) => setSecret(event.target.value)} placeholder={"-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----"} spellCheck={false} />
          </label>
        ) : (
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-mono text-xs tracking-wide text-muted">{lootLabel(kind).toUpperCase()}</span>
            <input className={control} value={secret} onChange={(event) => setSecret(event.target.value)} spellCheck={false} />
          </label>
        )}
        {kind === "sshkey" ? (
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-mono text-xs tracking-wide text-muted">KEY PASSWORD</span>
            <input className={control} value={pass} onChange={(event) => setPass(event.target.value)} placeholder="Empty if ssh does not ask" spellCheck={false} />
          </label>
        ) : null}
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">WHERE</span>
          <input className={control} value={where} onChange={(event) => setWhere(event.target.value)} placeholder="web.config" spellCheck={false} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">BOX</span>
          <select className={control} value={boxId} onChange={(event) => setBoxId(event.target.value)}>
            <option value="">Not linked yet</option>
            {notes.map((note) => (
              <option key={note.id} value={note.id}>
                {note.title.trim() || "Untitled box"}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-col gap-3 px-4 pb-4">
        {notes.length === 0 ? <p className="text-sm text-muted">No boxes yet. A note on the Notes page is a box you can link.</p> : null}
        {error ? <p className="text-sm text-dead">{error}</p> : null}
        <button type="button" onClick={add} className="inline-flex min-h-11 w-fit items-center rounded-lg border border-primary bg-raised px-3 text-sm text-fg">
          Save
        </button>
        {items.length === 0 ? <p className="text-sm text-muted">Nothing saved yet.</p> : null}
        {items.map((item) => (
          <div key={item.id} className="rounded-lg bg-bg px-3 py-3">
            <p className="text-sm font-semibold">{item.user || "No user"} · {lootLabel(item.kind)}</p>
            {item.kind === "sshkey" ? (
              <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-all font-mono text-xs text-muted">{item.secret}</pre>
            ) : item.secret ? (
              <p className="mt-1 break-all font-mono text-xs text-muted">{item.secret}</p>
            ) : null}
            {item.kind === "sshkey" ? (
              <p className="mt-1 text-xs text-muted">{item.pass ? `Key password: ${item.pass}` : "No key password. ssh should not ask."}</p>
            ) : null}
            <p className="mt-1 text-xs text-muted">
              {item.note ? item.note : "No place written down"}
              {item.boxes.length ? ` · ${item.boxes.map((id) => boxName(id, notes)).join(", ")}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {item.secret ? (
                <button type="button" onClick={() => void copy(item.id, item.kind === "sshkey" ? sshKeyScript(item) : item.secret)} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-border px-3 text-sm text-muted">
                  <Copy className="size-3.5" aria-hidden="true" />
                  {copied === item.id ? "Copied" : item.kind === "sshkey" ? "Copy ssh lines" : "Copy"}
                </button>
              ) : null}
              {item.kind === "sshkey" && item.pass ? (
                <button type="button" onClick={() => void copy(`${item.id}-pass`, item.pass)} className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm text-muted">
                  {copied === `${item.id}-pass` ? "Copied" : "Copy key password"}
                </button>
              ) : null}
              {item.boxes.map((id) => (
                <button key={id} type="button" onClick={() => unlinkLoot(item.id, id)} className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm text-muted">
                  Unlink {boxName(id, notes)}
                </button>
              ))}
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

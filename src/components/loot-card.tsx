import { useEffect, useState, useSyncExternalStore } from "react";
import { Copy } from "lucide-react";
import { JobList } from "@/components/job-list";
import { addLoot, getLoot, getLootServer, lootLabel, lootLines, LOOT_KINDS, removeLoot, setLootLocked, setLootPass, sshCrackSteps, sshKeyScript, subscribeLoot, unlinkLoot, type LootItem, type LootKind } from "@/lib/loot";
import { launchJob } from "@/lib/live-jobs";
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

function SshCrack({ item }: { item: LootItem }) {
  const [list, setList] = useState("/usr/share/wordlists/rockyou.txt");
  const [custom, setCustom] = useState("");
  const [error, setError] = useState("");
  const [found, setFound] = useState("");
  const wordlist = list === "custom" ? custom.trim() : list;
  const tool = item.secret.startsWith("PuTTY-User-Key-File-") ? "putty2john" : "ssh2john";

  async function crack() {
    const plan = sshCrackSteps(item, wordlist);
    if ("error" in plan) {
      setError(plan.error);
      return;
    }
    setError("");
    await launchJob("/api/run", { steps: plan.steps }, { tool: "john", title: plan.command.split("\n")[0] ?? tool, command: plan.command });
  }

  function saveFound() {
    const result = setLootPass(item.id, found);
    setError(result ? result.error : "");
    if (!result) setFound("");
  }

  return (
    <div className="mt-3 flex flex-col gap-2">
      <p className="text-sm text-muted">The key asks for a password you do not have. This writes the key, runs {tool}, then john, then john --show. A second click uses a new file, so it does not interrupt the first run.</p>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-mono text-xs tracking-wide text-muted">WORDLIST</span>
        <select className={control} value={list} onChange={(event) => setList(event.target.value)}>
          <option value="/usr/share/wordlists/rockyou.txt">rockyou</option>
          <option value="found.txt">found.txt (passwords you already have)</option>
          <option value="custom">Other path</option>
        </select>
      </label>
      {list === "custom" ? (
        <input className={control} value={custom} onChange={(event) => setCustom(event.target.value)} placeholder="/usr/share/wordlists/fasttrack.txt" spellCheck={false} />
      ) : null}
      {error ? <p className="text-sm text-dead">{error}</p> : null}
      <button type="button" onClick={() => void crack()} disabled={!wordlist} className="inline-flex min-h-11 w-fit items-center rounded-lg border border-primary bg-raised px-3 text-sm text-fg disabled:opacity-40">
        Crack with John
      </button>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-mono text-xs tracking-wide text-muted">PASSWORD JOHN PRINTED</span>
        <input className={control} value={found} onChange={(event) => setFound(event.target.value)} placeholder="Paste it here" spellCheck={false} />
      </label>
      <button type="button" onClick={saveFound} disabled={!found.trim()} className="inline-flex min-h-11 w-fit items-center rounded-lg border border-border px-3 text-sm text-fg disabled:opacity-40">
        Save it on this key
      </button>
    </div>
  );
}

function ListRow({ label, lines, copyId, copied, onCopy }: { label: string; lines: string[]; copyId: string; copied: string; onCopy: (id: string, text: string) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-fg">
        {label} <span className="text-muted">({lines.length})</span>
      </p>
      <button type="button" disabled={lines.length === 0} onClick={() => onCopy(copyId, lines.join("\n"))} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-border px-3 text-sm text-muted disabled:opacity-40">
        <Copy className="size-3.5" aria-hidden="true" />
        {copied === copyId ? "Copied" : "Copy list"}
      </button>
    </div>
  );
}

export function LootCard({ focusId = "" }: { focusId?: string }) {
  const items = useSyncExternalStore(subscribeLoot, getLoot, getLootServer);
  const notes = useSyncExternalStore(subscribeNotes, getNotes, getNotesServer);
  const users = lootLines("user");
  const passwords = lootLines("pass");
  const [user, setUser] = useState("");
  const [secret, setSecret] = useState("");
  const [kind, setKind] = useState<LootKind>("pass");
  const [where, setWhere] = useState("");
  const [pass, setPass] = useState("");
  const [locked, setLocked] = useState(false);
  const [boxId, setBoxId] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  function add() {
    const result = addLoot({ user, secret, kind, note: where, boxes: boxId ? [boxId] : [], pass, locked });
    if (result) {
      setError(result.error);
      return;
    }
    setError("");
    setSecret("");
    setPass("");
    setLocked(false);
    setWhere("");
  }

  useEffect(() => {
    if (!focusId) return;
    document.getElementById(`loot-item-${focusId}`)?.scrollIntoView({ block: "center" });
  }, [focusId]);

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
          Write it down once. A box in Notes can be where you found it, or a host it might still work on. Open on a note jumps to that item, including a private key. Hydra can try every saved user and every saved password. Hashcat can take every hash of one type. Reset desk does not delete this list.
        </p>
      </div>
      <div className="flex flex-col gap-2 border-b border-border px-4 py-3">
        <p className="font-mono text-xs tracking-wide text-muted">SAVED LISTS</p>
        <ListRow label="Users" lines={users} copyId="list-users" copied={copied} onCopy={copy} />
        <ListRow label="Passwords" lines={passwords} copyId="list-passes" copied={copied} onCopy={copy} />
        {LOOT_KINDS.filter((item) => item.id !== "user" && item.id !== "pass" && item.id !== "sshkey").map((item) => {
          const lines = lootLines(item.id);
          if (lines.length === 0) return null;
          return <ListRow key={item.id} label={item.label} lines={lines} copyId={`list-${item.id}`} copied={copied} onCopy={copy} />;
        })}
        {items.some((item) => item.kind === "sshkey") ? (
          <p className="text-sm text-muted">{items.filter((item) => item.kind === "sshkey").length} private keys. Open the entry below to see the key. A key password is in the password list. The key itself is not.</p>
        ) : null}
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
            <input className={control} value={pass} onChange={(event) => setPass(event.target.value)} placeholder={locked ? "Leave empty to crack it" : "Empty if ssh does not ask"} spellCheck={false} />
          </label>
        ) : null}
        {kind === "sshkey" ? (
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={locked} onChange={(event) => setLocked(event.target.checked)} className="size-4" />
            <span>This key asks for a password</span>
          </label>
        ) : null}
        {kind === "sshkey" && locked ? (
          <p className="text-sm text-muted sm:col-span-2">If you know the password, type it above. If you do not, leave it empty. After you save, pick a wordlist and John will run ssh2john, then the list, then --show.</p>
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
          <div key={item.id} id={`loot-item-${item.id}`} className={"rounded-lg bg-bg px-3 py-3" + (focusId === item.id ? " ring-2 ring-primary" : "")}>
            <p className="text-sm font-semibold">{item.user || "No user"} · {lootLabel(item.kind)}</p>
            {item.kind === "sshkey" ? (
              <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-all font-mono text-xs text-muted">{item.secret}</pre>
            ) : item.secret ? (
              <p className="mt-1 break-all font-mono text-xs text-muted">{item.secret}</p>
            ) : null}
            {item.kind === "sshkey" ? (
              <p className="mt-1 text-xs text-muted">
                {item.pass ? `Key password: ${item.pass}` : item.locked ? "Key asks for a password. It is not saved yet." : "No key password. ssh should not ask."}
              </p>
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
              {item.kind === "sshkey" ? (
                <label className="inline-flex min-h-11 items-center gap-2 text-sm text-muted">
                  <input type="checkbox" checked={item.locked} onChange={(event) => setLootLocked(item.id, event.target.checked)} className="size-4" />
                  Asks for a password
                </label>
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
            {item.kind === "sshkey" && item.locked && !item.pass ? <SshCrack item={item} /> : null}
          </div>
        ))}
        {items.some((item) => item.kind === "sshkey" && item.locked) ? <JobList tool="john" empty="John has not been started from here." /> : null}
      </div>
    </article>
  );
}

import { useEffect, useState, useSyncExternalStore } from "react";
import { linkLoot, lootLabel, getLoot, getLootServer, subscribeLoot, unlinkBox, unlinkLoot } from "@/lib/loot";
import { addNote, clearNotes, getNotes, getNotesServer, removeNote, subscribeNotes, updateNote } from "@/lib/notes";

const control = "min-h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg outline-none";

export function NotesPanel() {
  const notes = useSyncExternalStore(subscribeNotes, getNotes, getNotesServer);
  const loot = useSyncExternalStore(subscribeLoot, getLoot, getLootServer);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("oscp-box-notes-v1") === null && getNotes().length === 0) addNote();
  }, []);

  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-primary bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="font-mono text-xs text-primary">Notes</p>
          <h2 className="text-lg font-semibold">This box</h2>
          <p className="mt-1 text-sm text-muted">
            One note is one box. Link loot that came from it, or loot that might work on it. The secret itself stays on the Loot page. Reset desk does not delete these.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => addNote()} className="inline-flex min-h-11 items-center rounded-lg border border-primary bg-raised px-3 text-sm text-fg">
            New note
          </button>
          <button
            type="button"
            onClick={() => {
              if (!confirmClear) {
                setConfirmClear(true);
                return;
              }
              for (const note of getNotes()) unlinkBox(note.id);
              clearNotes();
              setConfirmClear(false);
            }}
            className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm text-muted"
          >
            {confirmClear ? "Confirm clear" : "Clear notes"}
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-4 px-4 py-4">
        {notes.map((note) => {
          const linked = loot.filter((item) => item.boxes.includes(note.id));
          const rest = loot.filter((item) => !item.boxes.includes(note.id));
          return (
            <div key={note.id} className="rounded-lg border border-border bg-bg p-3">
              <div className="flex items-center gap-2">
                <input
                  value={note.title}
                  onChange={(event) => updateNote(note.id, { title: event.target.value })}
                  aria-label="Note title"
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-fg outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    unlinkBox(note.id);
                    removeNote(note.id);
                  }}
                  className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm text-muted"
                >
                  Delete
                </button>
              </div>
              <textarea
                value={note.body}
                onChange={(event) => updateNote(note.id, { body: event.target.value })}
                rows={8}
                placeholder={"10.10.10.10\nfoothold: unquoted service"}
                className="mt-2 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm leading-relaxed text-fg outline-none placeholder:text-muted"
              />
              <div className="mt-3 flex flex-col gap-2">
                <p className="font-mono text-xs tracking-wide text-muted">LOOT FOR THIS BOX</p>
                {linked.length === 0 ? <p className="text-sm text-muted">Nothing linked. A password found here, or one you want to try here, both belong in this list.</p> : null}
                {linked.map((item) => (
                  <div key={item.id} className="flex flex-wrap items-center justify-between gap-2">
                    <p className="min-w-0 break-all text-sm text-fg">
                      {(item.user || "no user") + " · " + lootLabel(item.kind)}
                      {item.note ? ` · ${item.note}` : ""}
                    </p>
                    <button type="button" onClick={() => unlinkLoot(item.id, note.id)} className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm text-muted">
                      Unlink
                    </button>
                  </div>
                ))}
                {rest.length > 0 ? (
                  <select
                    className={control}
                    value=""
                    onChange={(event) => {
                      if (event.target.value) linkLoot(event.target.value, note.id);
                    }}
                  >
                    <option value="">Link loot</option>
                    {rest.map((item) => (
                      <option key={item.id} value={item.id}>
                        {(item.user || "no user") + " · " + lootLabel(item.kind)}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
            </div>
          );
        })}
        {notes.length === 0 ? <p className="text-sm text-muted">No notes. New note starts a fresh box.</p> : null}
      </div>
    </article>
  );
}

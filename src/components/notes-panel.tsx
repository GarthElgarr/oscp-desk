import { useEffect, useState } from "react";

const STORE = "oscp-box-notes-v1";

type Note = {
  id: string;
  title: string;
  body: string;
};

function loadNotes(): Note[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORE);
    const parsed = raw ? (JSON.parse(raw) as Note[]) : [];
    return Array.isArray(parsed) ? parsed.filter((note) => note && typeof note.id === "string") : [];
  } catch {
    return [];
  }
}

function blank(): Note {
  return { id: crypto.randomUUID(), title: "Box", body: "" };
}

export function NotesPanel() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const existing = loadNotes();
    setNotes(existing.length > 0 ? existing : [blank()]);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORE, JSON.stringify(notes));
  }, [notes, ready]);

  function update(id: string, patch: Partial<Note>) {
    setNotes((prev) => prev.map((note) => (note.id === id ? { ...note, ...patch } : note)));
  }

  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-primary bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="font-mono text-xs text-primary">Notes</p>
          <h2 className="text-lg font-semibold">This box</h2>
          <p className="mt-1 text-sm text-muted">
            IPs, users, and what worked. Saved in this browser. Clear marks does not delete these.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setNotes((prev) => [blank(), ...prev])}
          className="inline-flex min-h-11 items-center rounded-lg border border-primary bg-raised px-3 text-sm text-fg"
        >
          New note
        </button>
      </div>
      <div className="flex flex-col gap-4 px-4 py-4">
        {notes.map((note) => (
          <div key={note.id} className="rounded-lg border border-border bg-bg p-3">
            <div className="flex items-center gap-2">
              <input
                value={note.title}
                onChange={(event) => update(note.id, { title: event.target.value })}
                aria-label="Note title"
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-fg outline-none"
              />
              <button
                type="button"
                onClick={() => setNotes((prev) => prev.filter((item) => item.id !== note.id))}
                className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm text-muted"
              >
                Delete
              </button>
            </div>
            <textarea
              value={note.body}
              onChange={(event) => update(note.id, { body: event.target.value })}
              rows={8}
              placeholder={"10.10.10.10\nuser / password\nfoothold: unquoted service"}
              className="mt-2 w-full resize-y rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm leading-relaxed text-fg outline-none placeholder:text-muted"
            />
          </div>
        ))}
        {notes.length === 0 ? (
          <p className="text-sm text-muted">No notes. New note starts a fresh box.</p>
        ) : null}
      </div>
    </article>
  );
}

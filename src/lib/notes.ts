export type BoxNote = {
  id: string;
  title: string;
  body: string;
};

const KEY = "oscp-box-notes-v1";
const EMPTY: BoxNote[] = [];
let notes: BoxNote[] = EMPTY;
let loaded = false;
let seq = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function valid(value: unknown): value is BoxNote {
  if (!value || typeof value !== "object") return false;
  const row = value as BoxNote;
  return typeof row.id === "string" && typeof row.title === "string" && typeof row.body === "string";
}

function ensure() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]") as unknown;
    notes = Array.isArray(parsed) ? parsed.filter(valid) : [];
  } catch {
    notes = [];
  }
}

function save(next: BoxNote[]) {
  notes = next;
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(notes));
  emit();
}

export function subscribeNotes(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getNotes(): BoxNote[] {
  ensure();
  return notes;
}

export function getNotesServer(): BoxNote[] {
  return EMPTY;
}

export function addNote(): BoxNote {
  ensure();
  const note: BoxNote = { id: `box-${Date.now().toString(36)}-${seq++}`, title: "Box", body: "" };
  save([note, ...getNotes()]);
  return note;
}

export function updateNote(id: string, patch: Partial<Pick<BoxNote, "title" | "body">>) {
  ensure();
  save(getNotes().map((note) => (note.id === id ? { ...note, ...patch } : note)));
}

export function removeNote(id: string) {
  ensure();
  save(getNotes().filter((note) => note.id !== id));
}

export function clearNotes() {
  save([]);
}

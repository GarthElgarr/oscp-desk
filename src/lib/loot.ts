export type LootItem = {
  id: string;
  user: string;
  secret: string;
  kind: "pass" | "hash";
  note: string;
};

const KEY = "oscp-loot-v1";
const EMPTY: LootItem[] = [];
let items: LootItem[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function valid(value: unknown): value is LootItem {
  if (!value || typeof value !== "object") return false;
  const row = value as LootItem;
  return (
    typeof row.id === "string" &&
    typeof row.user === "string" &&
    typeof row.secret === "string" &&
    (row.kind === "pass" || row.kind === "hash") &&
    typeof row.note === "string"
  );
}

function ensure() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]") as unknown;
    items = Array.isArray(parsed) ? parsed.filter(valid).slice(0, 40) : [];
  } catch {
    items = [];
  }
}

function save(next: LootItem[]) {
  items = next.slice(0, 40);
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(items));
  emit();
}

export function subscribeLoot(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLoot(): LootItem[] {
  ensure();
  return items;
}

export function getLootServer(): LootItem[] {
  return EMPTY;
}

export function addLoot(input: { user: string; secret: string; kind: "pass" | "hash"; note: string }): { error: string } | null {
  const user = input.user.trim();
  const secret = input.secret.trim();
  const note = input.note.trim().slice(0, 80);
  if (!/^[A-Za-z0-9][A-Za-z0-9._$@-]{0,64}$/.test(user)) return { error: "The user is the account name." };
  if (input.kind === "hash") {
    if (!/^[0-9a-fA-F]{32}$/.test(secret)) return { error: "The hash is 32 hex characters." };
  } else if (secret.length < 1 || secret.length > 128 || /[\r\n\0]/.test(secret)) {
    return { error: "The password is one line." };
  }
  ensure();
  save([{ id: `loot-${Date.now().toString(36)}`, user, secret, kind: input.kind, note }, ...getLoot()]);
  return null;
}

export function removeLoot(id: string) {
  ensure();
  save(getLoot().filter((item) => item.id !== id));
}

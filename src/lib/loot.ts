export const LOOT_KINDS = [
  { id: "user", label: "User" },
  { id: "pass", label: "Password" },
  { id: "nt", label: "NT hash" },
  { id: "lm", label: "LM hash" },
  { id: "netntlmv2", label: "NetNTLMv2" },
  { id: "asrep", label: "AS-REP" },
  { id: "tgs", label: "Kerberos TGS" },
  { id: "md5", label: "MD5" },
  { id: "sha1", label: "SHA1" },
  { id: "sha256", label: "SHA256" },
  { id: "sha512", label: "SHA512" },
  { id: "bcrypt", label: "bcrypt" },
] as const;

export type LootKind = (typeof LOOT_KINDS)[number]["id"];

/** Hashcat mode for a hash the cracker can take. Users and passwords are not modes. */
export const LOOT_HASHCAT: Partial<Record<LootKind, string>> = {
  nt: "1000",
  lm: "3000",
  netntlmv2: "5600",
  asrep: "18200",
  tgs: "13100",
  md5: "0",
  sha1: "100",
  sha256: "1400",
  sha512: "1700",
  bcrypt: "3200",
};

export type LootItem = {
  id: string;
  user: string;
  secret: string;
  kind: LootKind;
  note: string;
  boxes: string[];
};

const KEY = "oscp-loot-v1";
const EMPTY: LootItem[] = [];
const KINDS = new Set<string>(LOOT_KINDS.map((item) => item.id));
let items: LootItem[] = EMPTY;
let loaded = false;
let seq = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function kindOf(value: unknown): LootKind | null {
  if (value === "hash") return "nt";
  return typeof value === "string" && KINDS.has(value) ? (value as LootKind) : null;
}

function valid(value: unknown): value is LootItem {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<LootItem> & { kind?: unknown };
  const kind = kindOf(row.kind);
  if (!kind || typeof row.id !== "string" || typeof row.user !== "string" || typeof row.secret !== "string") return false;
  return true;
}

function normalise(value: LootItem & { kind?: unknown }): LootItem {
  const kind = kindOf((value as { kind?: unknown }).kind) ?? "pass";
  const boxes = Array.isArray(value.boxes) ? value.boxes.filter((id) => typeof id === "string") : [];
  return {
    id: value.id,
    user: value.user,
    secret: value.secret,
    kind,
    note: typeof value.note === "string" ? value.note : "",
    boxes,
  };
}

function ensure() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]") as unknown;
    items = Array.isArray(parsed) ? parsed.filter(valid).map((row) => normalise(row)).slice(0, 80) : [];
  } catch {
    items = [];
  }
}

function save(next: LootItem[]) {
  items = next.slice(0, 80);
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(items));
  emit();
}

function splitWindowsHash(secret: string): { user: string; lm: string; nt: string } | null {
  const pair = secret.match(/^([0-9a-fA-F]{32}):([0-9a-fA-F]{32})$/);
  if (pair) return { user: "", lm: pair[1], nt: pair[2] };
  const dump = secret.match(/^([^:\r\n]+):\d+:([0-9a-fA-F]{32}):([0-9a-fA-F]{32})(?::|$)/);
  if (dump) return { user: dump[1], lm: dump[2], nt: dump[3] };
  return null;
}

function secretOk(kind: LootKind, secret: string): string | null {
  if (kind === "user") return secret === "" ? null : "A user has no secret. Leave that box empty.";
  if (/[\r\n\0]/.test(secret)) return "The secret is one line.";
  if (kind === "pass") return secret.length >= 1 && secret.length <= 128 ? null : "The password is one line.";
  if (kind === "nt" || kind === "lm" || kind === "md5") return /^[0-9a-fA-F]{32}$/.test(secret) ? null : "That hash is 32 hex characters.";
  if (kind === "sha1") return /^[0-9a-fA-F]{40}$/.test(secret) ? null : "SHA1 is 40 hex characters.";
  if (kind === "sha256") return /^[0-9a-fA-F]{64}$/.test(secret) ? null : "SHA256 is 64 hex characters.";
  if (kind === "sha512") return /^[0-9a-fA-F]{128}$/.test(secret) ? null : "SHA512 is 128 hex characters.";
  if (kind === "bcrypt") return /^\$2[aby]\$/.test(secret) && secret.length <= 80 ? null : "bcrypt starts with $2a$, $2b$, or $2y$.";
  if (kind === "netntlmv2") return secret.includes("::") && secret.length >= 20 && secret.length <= 2000 ? null : "NetNTLMv2 is the whole line, with the double colon.";
  if (kind === "asrep") return /krb5asrep/i.test(secret) && secret.length <= 2000 ? null : "AS-REP is the hashcat line, the one containing krb5asrep.";
  if (kind === "tgs") return /krb5tgs/i.test(secret) && secret.length <= 2000 ? null : "A TGS is the hashcat line, the one containing krb5tgs.";
  return "That kind is not one this list stores.";
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

export function lootLabel(kind: LootKind): string {
  return LOOT_KINDS.find((item) => item.id === kind)?.label ?? kind;
}

export function addLoot(input: { user: string; secret: string; kind: LootKind; note: string; boxes?: string[] }): { error: string } | null {
  let user = input.user.trim();
  let secret = input.kind === "user" ? "" : input.secret.trim();
  if (input.kind === "nt" || input.kind === "lm") {
    const split = splitWindowsHash(secret);
    if (split) {
      secret = input.kind === "lm" ? split.lm : split.nt;
      if (!user && /^[A-Za-z0-9][A-Za-z0-9._$@-]{0,64}$/.test(split.user)) user = split.user;
    }
  }
  const note = input.note.trim().slice(0, 80);
  if (input.kind === "user" && !/^[A-Za-z0-9][A-Za-z0-9._$@-]{0,64}$/.test(user)) return { error: "The user is the account name." };
  if (user && !/^[A-Za-z0-9][A-Za-z0-9._$@-]{0,64}$/.test(user)) return { error: "The user is the account name, or leave it empty." };
  const bad = secretOk(input.kind, secret);
  if (bad) return { error: bad };
  ensure();
  const boxes = (input.boxes ?? []).filter((id) => typeof id === "string").slice(0, 12);
  save([{ id: `loot-${Date.now().toString(36)}-${seq++}`, user, secret, kind: input.kind, note, boxes }, ...getLoot()]);
  return null;
}

export function removeLoot(id: string) {
  ensure();
  save(getLoot().filter((item) => item.id !== id));
}

export function linkLoot(id: string, boxId: string) {
  ensure();
  save(getLoot().map((item) => (item.id === id && !item.boxes.includes(boxId) ? { ...item, boxes: [...item.boxes, boxId] } : item)));
}

export function unlinkLoot(id: string, boxId: string) {
  ensure();
  save(getLoot().map((item) => (item.id === id ? { ...item, boxes: item.boxes.filter((box) => box !== boxId) } : item)));
}

export function unlinkBox(boxId: string) {
  ensure();
  save(getLoot().map((item) => ({ ...item, boxes: item.boxes.filter((box) => box !== boxId) })));
}

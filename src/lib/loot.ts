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
  { id: "sshkey", label: "SSH private key" },
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
  /** Passphrase for an SSH private key. Empty when the key does not ask, or when you still have to crack it. */
  pass: string;
  /** The key asks for a password. */
  locked: boolean;
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
    pass: typeof value.pass === "string" ? value.pass : "",
    locked: value.locked === true,
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
  if (kind === "sshkey") return sshKeyOk(secret);
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

function sshKeyOk(secret: string): string | null {
  if (secret.includes("\0") || secret.length < 40 || secret.length > 16000) {
    return "Paste the private key, including the BEGIN and END lines.";
  }
  if (/^ssh-(rsa|ed25519|dss|ecdsa)\s/.test(secret)) return "That is a public key. Paste the private key.";
  const begin = /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/.test(secret);
  const end = /-----END [A-Z0-9 ]*PRIVATE KEY-----/.test(secret);
  if (begin && end) return null;
  if (/^PuTTY-User-Key-File-/.test(secret)) return null;
  return "Paste the private key, including the BEGIN and END lines.";
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

export function addLoot(input: { user: string; secret: string; kind: LootKind; note: string; boxes?: string[]; pass?: string; locked?: boolean }): { error: string } | null {
  let user = input.user.trim();
  let secret = input.kind === "user" ? "" : input.secret.replace(/\r\n/g, "\n").trim();
  const pass = input.kind === "sshkey" ? (input.pass ?? "").trim() : "";
  const locked = input.kind === "sshkey" && input.locked === true;
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
  if (pass.length > 128 || /[\r\n\0]/.test(pass)) return { error: "The key password is one line, or leave it empty." };
  ensure();
  const boxes = (input.boxes ?? []).filter((id) => typeof id === "string").slice(0, 12);
  save([{ id: `loot-${Date.now().toString(36)}-${seq++}`, user, secret, kind: input.kind, note, boxes, pass, locked }, ...getLoot()]);
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

/** Writes id_rsa, then the ssh command. The key password is not in this script. */
export function sshKeyScript(item: LootItem): string {
  const who = item.user || "<user>";
  return [`cat > id_rsa << 'EOF'`, item.secret.trim(), "EOF", "chmod 600 id_rsa", `ssh -i id_rsa '${who}'@<ip>`].join("\n");
}

export function setLootLocked(id: string, locked: boolean) {
  ensure();
  save(getLoot().map((item) => (item.id === id && item.kind === "sshkey" ? { ...item, locked } : item)));
}

export function setLootPass(id: string, pass: string): { error: string } | null {
  const raw = pass.trim();
  const shown = raw.match(/^[A-Za-z0-9._-]+\.(?:key|hash):([\s\S]+)$/);
  const next = shown ? shown[1] : raw;
  if (next.length < 1 || next.length > 128 || /[\r\n\0]/.test(next)) return { error: "The key password is one line." };
  ensure();
  const item = getLoot().find((row) => row.id === id && row.kind === "sshkey");
  if (!item) return { error: "That key is no longer in the list." };
  save(getLoot().map((row) => (row.id === id ? { ...row, pass: next } : row)));
  return null;
}

const WORDLIST = /^[A-Za-z0-9_./:@+=,~-]{1,200}$/;

/** ssh2john, then john, then --show. A PuTTY key uses putty2john instead. */
export function sshCrackSteps(item: LootItem, wordlist: string): { steps: { kind: string; name?: string; text?: string; bin?: string; args?: string[] }[]; command: string } | { error: string } {
  if (item.kind !== "sshkey" || !item.locked) return { error: "Tick the box when the key asks for a password." };
  if (item.pass) return { error: "This key already has a password. There is nothing to crack." };
  const list = wordlist.trim();
  if (!WORDLIST.test(list) || list.split("/").includes("..")) return { error: "The wordlist is rockyou, found.txt, or one path." };
  const base = `${item.id.replace(/[^A-Za-z0-9._-]/g, "").slice(0, 24) || "key"}-${Date.now().toString(36)}`;
  const keyName = `${base}.key`;
  const hashName = `${base}.hash`;
  const bin = item.secret.startsWith("PuTTY-User-Key-File-") ? "putty2john" : "ssh2john";
  const keyText = item.secret.endsWith("\n") ? item.secret : `${item.secret}\n`;
  const steps = [
    { kind: "write", name: keyName, text: keyText },
    { kind: "exec-to-file", bin, args: [keyName], name: hashName },
    { kind: "exec", bin: "john", args: [`--wordlist=${list}`, hashName] },
    { kind: "exec", bin: "john", args: ["--show", hashName] },
  ];
  const command = `${bin} ${keyName} > ${hashName}\njohn --wordlist=${list} ${hashName}\njohn --show ${hashName}`;
  return { steps, command };
}

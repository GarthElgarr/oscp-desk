export type BasicPairing = "each" | "line" | "same";

const MAX_LINES = 20000;

export function splitList(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || seen.has(line)) continue;
    seen.add(line);
    out.push(line);
  }
  return out;
}

function encode(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function basicList(input: { users: string; passwords: string; pairing: BasicPairing; delimiter: string; prefix: string }): { lines: string[]; total: number; cut: boolean } | { error: string } {
  if (input.delimiter.length > 8 || /[\r\n\0]/.test(input.delimiter)) return { error: "The delimiter is a short mark, such as : or nothing." };
  if (input.prefix.length > 20 || /[\r\n\0]/.test(input.prefix)) return { error: "The prefix is a short label, such as Basic." };
  const users = splitList(input.users);
  if (users.length === 0) return { error: "Add at least one username, one per line." };
  const passwords = input.pairing === "same" ? users : splitList(input.passwords);
  if (passwords.length === 0) return { error: "Add at least one password, one per line. Or set the password to the username." };
  const pairs: { user: string; pass: string }[] = [];
  if (input.pairing === "line") {
    const count = Math.min(users.length, passwords.length);
    for (let i = 0; i < count; i += 1) pairs.push({ user: users[i] ?? "", pass: passwords[i] ?? "" });
  } else if (input.pairing === "same") {
    for (const user of users) pairs.push({ user, pass: user });
  } else {
    for (const user of users) for (const pass of passwords) pairs.push({ user, pass });
  }
  if (pairs.length === 0) return { error: "Those lists do not make a pair. Line by line needs the same number of rows, or the shorter list wins and this one is empty." };
  const total = pairs.length;
  const cut = total > MAX_LINES;
  const lines = pairs.slice(0, MAX_LINES).map((pair) => input.prefix + encode(pair.user + input.delimiter + pair.pass));
  return { lines, total, cut };
}

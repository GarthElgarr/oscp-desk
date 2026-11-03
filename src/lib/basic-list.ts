export type BasicPairing = "each" | "line" | "same";

/** A short basic-auth list. Rockyou is a Hydra job, not a page of base64. */
export const BASIC_MAX_OUT = 5000;
const MAX_CHARS = 200_000;
const MAX_INPUT_LINES = 2_000;

export function splitList(text: string): string[] | { error: string } {
  if (text.length > MAX_CHARS) return { error: "That list is too big for this page. Rockyou will freeze the browser. Use a short list here. Hydra is the tool for rockyou." };
  const seen = new Set<string>();
  const out: string[] = [];
  let rows = 0;
  for (const raw of text.split(/\r?\n/)) {
    rows += 1;
    if (rows > MAX_INPUT_LINES) return { error: "That list is over 2,000 lines. This page builds a short basic-auth list, not a wordlist attack. Use Hydra for rockyou." };
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

export function basicList(input: { users: string; passwords: string; pairing: BasicPairing; delimiter: string; prefix: string }): { lines: string[]; total: number } | { error: string } {
  if (input.delimiter.length > 8 || /[\r\n\0]/.test(input.delimiter)) return { error: "The delimiter is a short mark, such as : or nothing." };
  if (input.prefix.length > 20 || /[\r\n\0]/.test(input.prefix)) return { error: "The prefix is a short label, such as Basic." };
  const users = splitList(input.users);
  if ("error" in users) return users;
  if (users.length === 0) return { error: "Add at least one username, one per line." };
  const passwords = input.pairing === "same" ? users : splitList(input.passwords);
  if ("error" in passwords) return passwords;
  if (passwords.length === 0) return { error: "Add at least one password, one per line. Or set the password to the username." };
  const total = input.pairing === "line" ? Math.min(users.length, passwords.length) : input.pairing === "same" ? users.length : users.length * passwords.length;
  if (total === 0) return { error: "Those lists do not make a pair." };
  if (total > BASIC_MAX_OUT) return { error: `${total.toLocaleString()} lines is too many. Every username with every password multiplies. Cut a list, or pair line by line. Hydra is the tool for rockyou.` };
  const lines: string[] = [];
  const push = (user: string, pass: string) => lines.push(input.prefix + encode(user + input.delimiter + pass));
  if (input.pairing === "line") {
    for (let i = 0; i < total; i += 1) push(users[i] ?? "", passwords[i] ?? "");
  } else if (input.pairing === "same") {
    for (const user of users) push(user, user);
  } else {
    for (const user of users) for (const pass of passwords) push(user, pass);
  }
  return { lines, total };
}

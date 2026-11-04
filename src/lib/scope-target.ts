import { bannedCommand } from "./exam-rules.ts";

/** One IPv4 address. A leading zero is rejected, so 010 is not treated as octal. */
export function strictIpv4(value: string): string | null {
  const text = value.trim();
  if (!/^(?:\d{1,3}\.){3}\d{1,3}$/.test(text)) return null;
  const parts = text.split(".");
  if (parts.some((part) => part.length > 1 && part.startsWith("0"))) return null;
  if (parts.some((part) => Number(part) > 255)) return null;
  return text;
}

/** An IPv4 address or a single host name. No scheme, no path, no leading zeros. */
export function hostOrIp(value: string): string | null {
  const text = value.trim();
  if (text.split(".").every((part) => /^\d+$/.test(part))) return strictIpv4(text);
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,62}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,62}[A-Za-z0-9])?)*$/.test(text)) return null;
  if (text.length > 253) return null;
  return text;
}

/** One host, or a subnet no wider than /24. Wider than that is a mass scan. */
export function hostOrSubnet(value: string): string | null {
  const text = value.trim();
  const slash = text.indexOf("/");
  if (slash === -1) return hostOrIp(text);
  const ip = strictIpv4(text.slice(0, slash));
  const mask = Number(text.slice(slash + 1));
  if (!ip || !/^\d{1,2}$/.test(text.slice(slash + 1)) || mask < 24 || mask > 32) return null;
  return `${ip}/${mask}`;
}

const LIST_ROOTS = ["/usr/share/seclists/", "/usr/share/wordlists/"];

/** A wordlist that already ships on Kali. Nothing outside those two trees, and no .. */
export function wordlistPath(value: string): string | null {
  const text = value.trim();
  if (!LIST_ROOTS.some((root) => text.startsWith(root))) return null;
  if (text.includes("..") || text.includes("\0") || /\s/.test(text)) return null;
  if (!/^[/A-Za-z0-9._+-]+$/.test(text)) return null;
  return text;
}

export function portNumber(value: string): string | null {
  if (!/^\d{1,5}$/.test(value)) return null;
  const port = Number(value);
  if (port < 1 || port > 65535) return null;
  return String(port);
}

export function cappedInt(value: string, min: number, max: number): string | null {
  if (!/^\d{1,4}$/.test(value)) return null;
  const n = Number(value);
  if (n < min || n > max) return null;
  return String(n);
}

/** A relative file under scans/. Not an absolute path. */
export function scansFile(value: string): string | null {
  const text = value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,40}$/.test(text)) return null;
  return `scans/${text}`;
}

export function extensionList(value: string): string | null {
  const parts = value.split(",").map((part) => part.trim().replace(/^\./, "")).filter(Boolean);
  if (parts.length === 0 || parts.length > 8) return null;
  if (parts.some((part) => !/^[a-z0-9]{1,8}$/.test(part))) return null;
  return parts.join(",");
}

export function numberList(value: string): string | null {
  const text = value.trim();
  if (!text) return null;
  if (!/^\d{1,7}(,\d{1,7})*$/.test(text)) return null;
  return text;
}

export function quoteArg(value: string): string {
  if (/^[A-Za-z0-9_./:@^+%=,~-]+$/.test(value)) return value;
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function finishCommand(command: string, examOn: boolean): { command: string; why: string } | { error: string } {
  if (unquotedUnsafe(command)) {
    return { error: "The command is one program and its flags. No pipes, redirects, or paths with .." };
  }
  const banned = bannedCommand(command, examOn);
  if (banned) return { error: `${banned} LAB ONLY. Turn exam lock off only in a lab.` };
  return { command, why: "" };
}

/** A flag token (starts with -) that is not on the allow-list is refused. Values are not flags. */
export function flagsAllowed(args: string[], allowed: ReadonlySet<string>): string | null {
  for (const arg of args) {
    if (arg.startsWith("-") && !allowed.has(arg)) return arg;
  }
  return null;
}

function unquotedUnsafe(command: string): boolean {
  let quote: "'" | '"' | null = null;
  for (let i = 0; i < command.length; i++) {
    const ch = command[i];
    if (quote) {
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      continue;
    }
    if (";|&`$<>\\\n\r".includes(ch)) return true;
    if (ch === "." && command[i + 1] === ".") return true;
  }
  return quote !== null;
}

import { outputBasename } from "./output-path.ts";
import { wordlistPath } from "./scope-target.ts";

const SHELL = /[;&|`$<>\\\n\r\0]/;
const FILE_FLAGS = ["-o", "-M", "-C", "-L", "-P"] as const;
const LOOT = /^scans\/hydra\/loot-(?:users|passwords)-[a-z0-9]+\.txt$/;
const PLAIN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/;

export function parseExtraFlags(input: string): { ok: true; args: string[] } | { ok: false; error: string } {
  const trimmed = input.trim();
  if (!trimmed) return { ok: true, args: [] };
  if (SHELL.test(trimmed)) {
    return { ok: false, error: "Extra flags are options for this tool only. No pipes, semicolons, or redirects." };
  }
  const args: string[] = [];
  let cur = "";
  let quote: "'" | '"' | null = null;
  let held = false;
  for (const ch of trimmed) {
    if (quote) {
      if (ch === quote) {
        quote = null;
        held = true;
      } else cur += ch;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      continue;
    }
    if (ch === " " || ch === "\t") {
      if (held || cur) args.push(cur);
      cur = "";
      held = false;
      continue;
    }
    held = false;
    cur += ch;
  }
  if (quote) return { ok: false, error: "A quote in the extra flags is not closed." };
  if (held || cur) args.push(cur);
  if (args.length > 16) return { ok: false, error: "Too many extra flags." };
  if (args.some((arg) => arg.length > 300 || SHELL.test(arg))) {
    return { ok: false, error: "One extra flag is not an option for this tool." };
  }
  return { ok: true, args };
}

export function hydraArgsOk(args: unknown): args is string[] {
  if (!Array.isArray(args) || args.length < 2 || args.length > 40) return false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (typeof arg !== "string" || arg.length > 500 || SHELL.test(arg)) return false;
    if (!rockyouOk(arg)) return false;
    const flagged = fileFlag(arg);
    if (!flagged) continue;
    const value = flagged.inline === null ? args[i + 1] : flagged.inline;
    if (typeof value !== "string" || !hydraFile(value, flagged.flag)) return false;
    if (flagged.inline === null) i += 1;
  }
  return true;
}

function rockyouOk(arg: string): boolean {
  if (!/rockyou/i.test(arg)) return true;
  if (wordlistPath(arg)) return true;
  const eq = arg.indexOf("=");
  return eq !== -1 && wordlistPath(arg.slice(eq + 1)) !== null;
}

function hydraFile(value: string, flag: string): boolean {
  if (flag === "-o") return outputBasename(value) !== null;
  if (!value || value.includes("..") || value.startsWith("~") || (/rockyou/i.test(value) && !wordlistPath(value))) return false;
  if (wordlistPath(value) || LOOT.test(value)) return true;
  return !value.includes("/") && PLAIN.test(value);
}

function fileFlag(arg: string): { flag: string; inline: string | null } | null {
  for (const flag of FILE_FLAGS) {
    if (arg === flag) return { flag, inline: null };
    if (arg.startsWith(`${flag}=`)) return { flag, inline: arg.slice(flag.length + 1) };
    if (arg.startsWith(flag) && arg.length > flag.length) return { flag, inline: arg.slice(flag.length) };
  }
  return null;
}

export function quoteHydraArg(arg: string): string {
  if (/^[A-Za-z0-9_./:@^+%=,~-]+$/.test(arg)) return arg;
  return `'${arg.replace(/'/g, `'\\''`)}'`;
}

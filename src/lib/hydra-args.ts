const SHELL = /[;&|`$<>\\\n\r\0]/;

export function parseExtraFlags(input: string): { ok: true; args: string[] } | { ok: false; error: string } {
  const trimmed = input.trim();
  if (!trimmed) return { ok: true, args: [] };
  if (SHELL.test(trimmed)) {
    return { ok: false, error: "Extra flags are options for this tool only. No pipes, semicolons, or redirects." };
  }
  const args: string[] = [];
  let cur = "";
  let quote: "'" | '"' | null = null;
  for (const ch of trimmed) {
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      continue;
    }
    if (ch === " " || ch === "\t") {
      if (cur) args.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (quote) return { ok: false, error: "A quote in the extra flags is not closed." };
  if (cur) args.push(cur);
  if (args.length > 16) return { ok: false, error: "Too many extra flags." };
  if (args.some((arg) => arg.length > 300 || SHELL.test(arg))) {
    return { ok: false, error: "One extra flag is not an option for this tool." };
  }
  return { ok: true, args };
}

export function hydraArgsOk(args: unknown): args is string[] {
  if (!Array.isArray(args) || args.length < 2 || args.length > 40) return false;
  return args.every(
    (arg) => typeof arg === "string" && arg.length > 0 && arg.length <= 500 && !SHELL.test(arg) && !/rockyou/i.test(arg),
  );
}

export function quoteHydraArg(arg: string): string {
  if (/^[A-Za-z0-9_./:@^+%=,~-]+$/.test(arg)) return arg;
  return `'${arg.replace(/'/g, `'\\''`)}'`;
}

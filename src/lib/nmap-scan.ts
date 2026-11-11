import { quoteHydraArg } from "./hydra-args.ts";

const SHELL = /[;|&`$<>\\\n\r\0]/;
const OUTPUT_FLAGS = ["-oA", "-oN", "-oX", "-oG", "-oS"];
const BARE_IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const FILE_FLAG = "That flag reads a host list or writes a file. The target and the save path stay in the form.";
const NOT_FLAG = "One custom flag is not an nmap option this desk will run.";
const SPOOF_FLAG = "Spoofing is banned. Leave -e, -S, -D, --proxies, --spoof-mac, and -g out of the scan.";
const AMBIGUOUS = "That nmap option is ambiguous. Type the full name.";

type ArgKind = "none" | "required" | "optional";
type Why = "safe" | "file" | "spoof" | "no";
type LongOpt = { name: string; arg: ArgKind; why: Why };

/**
 * nmap uses getopt_long_only. A single dash can be a long option, a short
 * cluster, or a short option with the rest of the token as its value
 * (-Fi/etc/hosts is -F -i /etc/hosts). Unsafe names stay in the table so a
 * prefix cannot collapse onto a safe option.
 */
const LONG_OPTS: LongOpt[] = [
  { name: "Pn", arg: "none", why: "safe" },
  { name: "open", arg: "none", why: "safe" },
  { name: "reason", arg: "none", why: "safe" },
  { name: "top-ports", arg: "required", why: "safe" },
  { name: "min-rate", arg: "required", why: "safe" },
  { name: "max-retries", arg: "required", why: "safe" },
  { name: "version-intensity", arg: "required", why: "safe" },
  { name: "version-all", arg: "none", why: "safe" },
  { name: "version-light", arg: "none", why: "safe" },
  { name: "script", arg: "required", why: "safe" },
  { name: "script-args", arg: "required", why: "safe" },
  { name: "iL", arg: "required", why: "file" },
  { name: "iR", arg: "required", why: "file" },
  { name: "oA", arg: "required", why: "file" },
  { name: "oN", arg: "required", why: "file" },
  { name: "oX", arg: "required", why: "file" },
  { name: "oG", arg: "required", why: "file" },
  { name: "oS", arg: "required", why: "file" },
  { name: "input-file", arg: "required", why: "file" },
  { name: "output", arg: "required", why: "file" },
  { name: "append-output", arg: "none", why: "file" },
  { name: "excludefile", arg: "required", why: "file" },
  { name: "exclude", arg: "required", why: "no" },
  { name: "datadir", arg: "required", why: "file" },
  { name: "servicedb", arg: "required", why: "file" },
  { name: "versiondb", arg: "required", why: "file" },
  { name: "resume", arg: "required", why: "file" },
  { name: "stylesheet", arg: "required", why: "file" },
  { name: "webxml", arg: "none", why: "file" },
  { name: "script-args-file", arg: "required", why: "file" },
  { name: "script-help", arg: "required", why: "no" },
  { name: "script-trace", arg: "none", why: "no" },
  { name: "script-updatedb", arg: "none", why: "file" },
  { name: "spoof-mac", arg: "required", why: "spoof" },
  { name: "source-port", arg: "required", why: "spoof" },
  { name: "source-ip", arg: "required", why: "spoof" },
  { name: "proxies", arg: "required", why: "spoof" },
  { name: "decoy", arg: "required", why: "spoof" },
  { name: "decoys", arg: "required", why: "spoof" },
  { name: "interface", arg: "required", why: "spoof" },
  { name: "osscan-guess", arg: "none", why: "no" },
  { name: "osscan-limit", arg: "none", why: "no" },
  { name: "send-eth", arg: "none", why: "no" },
  { name: "send-ip", arg: "none", why: "no" },
  { name: "privileged", arg: "none", why: "no" },
  { name: "unprivileged", arg: "none", why: "no" },
  { name: "system-dns", arg: "none", why: "no" },
  { name: "dns-servers", arg: "required", why: "no" },
  { name: "traceroute", arg: "none", why: "no" },
  { name: "packet-trace", arg: "none", why: "no" },
  { name: "max-rate", arg: "required", why: "no" },
  { name: "max-hostgroup", arg: "required", why: "no" },
  { name: "min-hostgroup", arg: "required", why: "no" },
  { name: "max-parallelism", arg: "required", why: "no" },
  { name: "min-parallelism", arg: "required", why: "no" },
  { name: "max-rtt-timeout", arg: "required", why: "no" },
  { name: "min-rtt-timeout", arg: "required", why: "no" },
  { name: "initial-rtt-timeout", arg: "required", why: "no" },
  { name: "host-timeout", arg: "required", why: "no" },
  { name: "scan-delay", arg: "required", why: "no" },
  { name: "max-scan-delay", arg: "required", why: "no" },
  { name: "stats-every", arg: "required", why: "no" },
  { name: "port-ratio", arg: "required", why: "no" },
  { name: "scanflags", arg: "required", why: "no" },
  { name: "data", arg: "required", why: "no" },
  { name: "data-string", arg: "required", why: "no" },
  { name: "data-length", arg: "required", why: "no" },
  { name: "ip-options", arg: "required", why: "no" },
  { name: "ttl", arg: "required", why: "no" },
  { name: "mtu", arg: "required", why: "no" },
  { name: "badsum", arg: "none", why: "no" },
  { name: "allports", arg: "none", why: "no" },
  { name: "fuzzy", arg: "none", why: "no" },
];

const SHORT_OPTS: Record<string, { arg: ArgKind; why: Why }> = {
  "4": { arg: "none", why: "no" },
  "6": { arg: "none", why: "no" },
  A: { arg: "none", why: "safe" },
  b: { arg: "required", why: "no" },
  D: { arg: "required", why: "spoof" },
  d: { arg: "optional", why: "safe" },
  e: { arg: "required", why: "spoof" },
  F: { arg: "none", why: "safe" },
  f: { arg: "none", why: "no" },
  g: { arg: "required", why: "spoof" },
  h: { arg: "none", why: "no" },
  I: { arg: "none", why: "no" },
  i: { arg: "required", why: "file" },
  M: { arg: "required", why: "no" },
  n: { arg: "none", why: "safe" },
  O: { arg: "optional", why: "safe" },
  o: { arg: "required", why: "file" },
  P: { arg: "required", why: "no" },
  p: { arg: "required", why: "safe" },
  r: { arg: "none", why: "no" },
  R: { arg: "none", why: "no" },
  S: { arg: "required", why: "spoof" },
  s: { arg: "required", why: "safe" },
  T: { arg: "required", why: "safe" },
  v: { arg: "none", why: "safe" },
  V: { arg: "none", why: "no" },
};

function matchLong(name: string): LongOpt | "ambiguous" | null {
  const exact = LONG_OPTS.filter((opt) => opt.name === name);
  if (exact.length === 1) return exact[0] ?? null;
  const prefix = LONG_OPTS.filter((opt) => opt.name.startsWith(name));
  if (prefix.length === 1) return prefix[0] ?? null;
  if (prefix.length > 1) return "ambiguous";
  return null;
}

const SCRIPT_WRAP = "and not (broadcast or dos or external)";

function scriptNameError(value: string): string | null {
  if (value.includes(SCRIPT_WRAP)) return null;
  const names = value.split(",").map((part) => part.trim()).filter(Boolean);
  if (names.some((name) => /^(?:all|dos|external)$/i.test(name))) {
    return "That script category runs broadcast, dos, or external scripts. Leave it out.";
  }
  if (names.some((name) => /^(?:broadcast|targets)/i.test(name))) {
    return "That script discovers hosts or adds targets. Leave it out.";
  }
  if (!/^[a-z0-9,_-]+$/i.test(value)) return "A script name is letters, numbers, commas, and dashes. Not a file path.";
  return null;
}

function wrapScript(value: string): string {
  if (value.includes(SCRIPT_WRAP)) return value;
  const names = value.split(",").map((part) => part.trim()).filter(Boolean);
  return `(${names.join(",")}) ${SCRIPT_WRAP}`;
}

const SCRIPT_FILE_KEYS = new Set([
  "out", "outfile", "file", "kmlfile", "save", "dir", "destination", "filename", "path",
  "rfile", "fingerprintfile", "fingerprints", "userdb", "passdb", "credfile", "db",
]);

function scriptArgsError(value: string): string | null {
  if (/newtargets/i.test(value)) return "newtargets adds hosts. Leave it out.";
  if (value.includes("/") || value.includes("\\")) return "That script argument writes a file. Leave the path out.";
  for (const part of value.split(",")) {
    const key = (part.includes("=") ? part.slice(0, part.indexOf("=")) : part).trim();
    const last = key.split(".").pop()?.toLowerCase() ?? "";
    if (SCRIPT_FILE_KEYS.has(last)) return "That script argument writes or reads a file. Leave it out.";
  }
  if (!/^[A-Za-z0-9_.=,:+-]{1,300}$/.test(value)) return NOT_FLAG;
  return null;
}

function portsOk(value: string): boolean {
  if (value === "-") return true;
  if (!value || value.length > 200) return false;
  return value.split(",").every((part) => {
    const range = /^(\d{1,5})(?:-(\d{1,5}))?$/.exec(part) ?? /^-(\d{1,5})$/.exec(part);
    if (!range) return false;
    const nums = range.slice(1).filter((item) => item !== undefined).map(Number);
    if (nums.some((n) => n < 1 || n > 65535)) return false;
    return range[2] === undefined || Number(range[2]) >= Number(range[1]);
  });
}

function safeValueError(name: string, value: string | null): string | null {
  if (name === "s") return /^[STUVC]+$/.test(value ?? "") ? null : NOT_FLAG;
  if (name === "p") return portsOk(value ?? "") ? null : NOT_FLAG;
  if (name === "T") return /^[0-5]$/.test(value ?? "") ? null : NOT_FLAG;
  if (name === "d" || name === "O") return value === null || /^[0-9]$/.test(value) ? null : NOT_FLAG;
  if (name === "top-ports") return /^[1-9]\d{0,4}$/.test(value ?? "") && Number(value) <= 65535 ? null : NOT_FLAG;
  if (name === "min-rate") return /^[1-9]\d{0,6}$/.test(value ?? "") ? null : NOT_FLAG;
  if (name === "max-retries") return /^\d{1,2}$/.test(value ?? "") ? null : NOT_FLAG;
  if (name === "version-intensity") return /^[0-9]$/.test(value ?? "") ? null : NOT_FLAG;
  if (name === "script") return scriptNameError(value ?? "");
  if (name === "script-args") return scriptArgsError(value ?? "");
  return null;
}

function whyError(why: Why): string | null {
  if (why === "safe") return null;
  if (why === "file") return FILE_FLAG;
  if (why === "spoof") return SPOOF_FLAG;
  return NOT_FLAG;
}

function decide(why: Why, name: string, value: string | null): string | null {
  return whyError(why) ?? safeValueError(name, value);
}

type Read = { next: number; drop: boolean } | { error: string };

function finish(why: Why, name: string, value: string | null, next: number): Read {
  const error = decide(why, name, value);
  if (error) return { error };
  return { next, drop: false };
}

/** One argv element, using nmap's getopt_long_only rules. */
function readOption(tokens: string[], index: number): Read {
  const token = tokens[index] ?? "";
  const dashed = token.startsWith("--");
  const body = dashed ? token.slice(2) : token.slice(1);
  const eq = body.indexOf("=");
  const name = eq === -1 ? body : body.slice(0, eq);
  const inline = eq === -1 ? null : body.slice(eq + 1);
  const longName = /^[A-Za-z0-9][A-Za-z0-9-]*$/.test(name);
  if (dashed || (longName && name.length > 1)) {
    if (!longName) return dashed ? { error: NOT_FLAG } : readShort(token, tokens, index);
    const matched = matchLong(name);
    if (matched === "ambiguous") return { error: AMBIGUOUS };
    if (matched) {
      let next = index + 1;
      let value = inline;
      if (matched.arg === "none" && inline !== null) return { error: NOT_FLAG };
      if (matched.arg === "required" && value === null) {
        const following = tokens[next];
        if (following === undefined) return { error: NOT_FLAG };
        value = following;
        next += 1;
      }
      return finish(matched.why, matched.name, value, next);
    }
    if (dashed) return { error: NOT_FLAG };
  }
  return readShort(token, tokens, index);
}

function readShort(token: string, tokens: string[], index: number): Read {
  let cursor = 1;
  let next = index + 1;
  if (cursor >= token.length) return { error: NOT_FLAG };
  while (cursor < token.length) {
    const letter = token[cursor] ?? "";
    const spec = SHORT_OPTS[letter];
    if (!spec) return { error: NOT_FLAG };
    cursor += 1;
    let value: string | null = null;
    if (spec.arg === "required") {
      if (cursor < token.length) {
        value = token.slice(cursor);
        cursor = token.length;
      } else {
        const following = tokens[next];
        if (following === undefined) return { error: NOT_FLAG };
        value = following;
        next += 1;
      }
    } else if (spec.arg === "optional" && cursor < token.length) {
      value = token.slice(cursor);
      cursor = token.length;
    }
    const error = decide(spec.why, letter, value);
    if (error) return { error };
  }
  return { next, drop: false };
}

/** Keep the flags nmap will actually see. Exact -oA/-oN/-oX/-oG/-oS in an edited command are replaced by the desk path. */
function screenNmapArgs(tokens: string[], mode: "extra" | "edit"): { keep: string[] } | { error: string } {
  const keep: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i] ?? "";
    if (token.length > 200 || token.includes("..") || token.startsWith("/")) return { error: NOT_FLAG };
    if (BARE_IPV4.test(token) || !token.startsWith("-") || token === "-" || token === "--") {
      const second = mode === "edit"
        ? "The target IP stays at the end of the command. A second address is not a flag."
        : "The target stays in the IP box, so a second address is not a flag.";
      return { error: second };
    }
    if (mode === "edit" && (OUTPUT_FLAGS.includes(token) || token === "--append-output")) {
      const following = tokens[i + 1];
      if (OUTPUT_FLAGS.includes(token) && following && !following.startsWith("-")) i += 1;
      continue;
    }
    const read = readOption(tokens, i);
    if ("error" in read) return read;
    if (!read.drop) {
      for (let j = i; j < read.next; j++) keep.push(tokens[j] ?? "");
    }
    i = read.next - 1;
  }
  return rewriteScripts(keep);
}

function rewriteScripts(tokens: string[]): { keep: string[] } | { error: string } {
  const keep: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i] ?? "";
    const head = token.split("=")[0] ?? token;
    if (head !== "--script" && head !== "-script") {
      keep.push(token);
      continue;
    }
    const inline = token.includes("=");
    const value = inline ? token.slice(token.indexOf("=") + 1) : tokens[i + 1] ?? "";
    if (!inline) i += 1;
    const problem = scriptNameError(value);
    if (problem) return { error: problem };
    keep.push("--script", wrapScript(value));
  }
  return { keep };
}

export const NMAP_PROFILES = ["quick", "alltcp", "udp", "deep", "custom"] as const;
export type NmapProfile = (typeof NMAP_PROFILES)[number];

const PROFILE_SET = new Set<string>(NMAP_PROFILES);

export function nmapProfile(value: unknown): NmapProfile | null {
  return typeof value === "string" && PROFILE_SET.has(value) ? (value as NmapProfile) : null;
}

/** One IPv4 address. No hostnames, ranges, or the cloud metadata address. */
export function nmapTarget(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const target = value.trim();
  if (!/^(?:\d{1,3}\.){3}\d{1,3}$/.test(target)) return null;
  const parts = target.split(".").map((part) => Number(part));
  if (parts.some((part) => part > 255)) return null;
  if (target.split(".").some((part) => part.length > 1 && part.startsWith("0"))) return null;
  if (target === "0.0.0.0" || target === "255.255.255.255" || target === "169.254.169.254") return null;
  if (parts[0] >= 224 || parts[0] === 127) return null;
  return target;
}

/** Basename only. The desk writes scans/<name>.nmap, .xml, and .gnmap. */
export function nmapName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,40}$/.test(name)) return null;
  return name;
}

export function nmapPorts(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || text.length > 200) return null;
  if (!/^(\d{1,5}|\d{1,5}-\d{1,5})(,(\d{1,5}|\d{1,5}-\d{1,5}))*$/.test(text)) return null;
  const ok = text.split(",").every((part) => {
    const [start, end] = part.split("-").map(Number);
    if (start < 1 || start > 65535) return false;
    if (end !== undefined && (end < start || end > 65535)) return false;
    return true;
  });
  return ok ? text : null;
}

export function nmapExtra(input: string): { ok: true; args: string[] } | { ok: false; error: string } {
  const trimmed = input.trim();
  if (!trimmed) return { ok: true, args: [] };
  if (SHELL.test(trimmed)) return { ok: false, error: "Custom flags are nmap options only. No pipes, semicolons, or redirects." };
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
  if (quote) return { ok: false, error: "A quote in the custom flags is not closed." };
  if (cur) args.push(cur);
  if (args.length > 24) return { ok: false, error: "Too many custom flags." };
  const screened = screenNmapArgs(args, "extra");
  if ("error" in screened) return { ok: false, error: screened.error };
  return { ok: true, args: screened.keep };
}

export function nmapPlan(input: {
  profile: NmapProfile;
  target: string;
  name: string;
  ports: string;
  extra: string[];
}): { args: string[]; command: string; sudo: boolean } | { error: string } {
  const args: string[] = ["-Pn"];
  if (input.profile === "quick") args.push("-sC", "-sV");
  else if (input.profile === "alltcp") args.push("-p-", "--min-rate", "2000");
  else if (input.profile === "udp") args.push("-sU", "--top-ports", "20", "-T4");
  else if (input.profile === "deep") {
    const ports = nmapPorts(input.ports);
    if (!ports) return { error: "Deep needs the ports, such as 8080,8443." };
    args.push("-sC", "-sV", "-p", ports);
  } else if (input.extra.length === 0) {
    return { error: "Custom needs at least one flag, such as -F or -p 80,443." };
  }
  if (input.profile === "custom") args.push(...input.extra);
  else if (input.extra.length) args.push(...input.extra);
  args.push("-oA", `scans/${input.name}`, input.target);
  const sudo = wantsRoot(input.profile === "udp", input.extra);
  const command = [sudo ? "sudo -n nmap" : "nmap", ...args.map(quoteHydraArg)].join(" ");
  return { args, command, sudo };
}

const ROOT_FLAGS = new Set(["-sS", "-sU", "-sA", "-sW", "-sM", "-sN", "-sF", "-sX", "-O", "--privileged"]);

function wantsRoot(udp: boolean, args: string[]): boolean {
  return udp || args.some((arg) => ROOT_FLAGS.has(arg.split("=")[0]));
}

/** The command box. Leave it and it matches the profile. Edit it and this is what runs. The saved files still use the output name. */
export function nmapEditedCommand(line: string, name: string): { args: string[]; command: string; sudo: boolean; target: string } | { error: string } {
  const trimmed = line.trim();
  if (!trimmed) return { error: "The command is empty." };
  if (SHELL.test(trimmed)) return { error: "The command is nmap only. No pipes, semicolons, or redirects." };
  const tokens = tokenize(trimmed);
  if ("error" in tokens) return tokens;
  let index = 0;
  let askedSudo = false;
  if (tokens.args[0] === "sudo") {
    askedSudo = true;
    index += 1;
    if (tokens.args[index] === "-n") index += 1;
  }
  if (tokens.args[index] !== "nmap") return { error: "The command has to start with nmap." };
  const body = tokens.args.slice(index + 1);
  if (body.length === 0) return { error: "The command needs the target IP at the end." };
  if (body.length > 40) return { error: "That command has too many arguments." };
  const target = body[body.length - 1] ?? "";
  const host = nmapTarget(target);
  if (!host) return { error: "The target IP stays at the end of the command." };
  const screened = screenNmapArgs(body.slice(0, -1), "edit");
  if ("error" in screened) return screened;
  const args = screened.keep;
  args.push("-oA", `scans/${name}`, host);
  const sudo = askedSudo || wantsRoot(false, args);
  const command = [sudo ? "sudo -n nmap" : "nmap", ...args.map(quoteHydraArg)].join(" ");
  return { args, command, sudo, target: host };
}

function tokenize(input: string): { args: string[] } | { error: string } {
  const args: string[] = [];
  let cur = "";
  let quote: "'" | '"' | null = null;
  for (const ch of input) {
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
  if (quote) return { error: "A quote in the command is not closed." };
  if (cur) args.push(cur);
  return { args };
}

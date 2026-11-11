import { quoteHydraArg } from "./hydra-args.ts";

const SHELL = /[;|&`$<>\\\n\r\0]/;
const OUTPUT_FLAGS = ["-oA", "-oN", "-oX", "-oG", "-oS"];
const GLUED_PATH = /^-(o[ANXGS]|i[LR])/;
const BANNED_LONG = new Set([
  "--script-args-file",
  "--datadir",
  "--servicedb",
  "--versiondb",
  "--excludefile",
  "--resume",
  "--stylesheet",
  "--webxml",
]);
const BARE_IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;

function flagHead(arg: string): string {
  const eq = arg.indexOf("=");
  return eq === -1 ? arg : arg.slice(0, eq);
}

/** Letters of a flag after the dashes and any =value. -i/etc/hosts is i. --oS=/tmp/x is oS. */
function nmapFlagLetters(arg: string): string {
  if (!arg.startsWith("-")) return "";
  const body = arg.startsWith("--") ? arg.slice(2) : arg.slice(1);
  const eq = body.indexOf("=");
  const head = eq === -1 ? body : body.slice(0, eq);
  return /^[A-Za-z]+/.exec(head)?.[0] ?? "";
}

/** Host-list and output flags. The desk picks the target and writes scans/<name>. */
function inputOrOutputFlag(arg: string): string | null {
  const letters = nmapFlagLetters(arg);
  if (!letters) return null;
  const input = letters === "i" || letters === "iL" || letters === "iR";
  const short = !arg.startsWith("--");
  const output = letters.startsWith("o") && (short || /^o[A-Za-z]{0,2}$/.test(letters));
  if (!input && !output) return null;
  return "That flag reads a host list or writes a file. The target and the save path stay in the form.";
}

/** Glued -oNout / -iL/etc/passwd, and the long flags that read or write a file. Exact -oA is left for the editor to strip. */
function pathFlagError(arg: string): string | null {
  const shape = inputOrOutputFlag(arg);
  if (shape && !OUTPUT_FLAGS.includes(arg)) return shape;
  if (GLUED_PATH.test(arg) && !OUTPUT_FLAGS.includes(arg)) {
    return "The output name sets where the scan is saved. Leave -oA and -iL out of the command.";
  }
  if (BANNED_LONG.has(flagHead(arg))) {
    return "That nmap flag reads or writes a file. Leave it out of the command.";
  }
  return null;
}

function flagValue(arg: string, next: string | undefined): string {
  if (arg.includes("=")) return arg.slice(arg.indexOf("=") + 1);
  return next && !next.startsWith("-") ? next : "";
}

function scriptError(arg: string, next: string | undefined): string | null {
  const letters = nmapFlagLetters(arg);
  if (letters === "script") {
    const value = flagValue(arg, next);
    const names = value.split(",").map((part) => part.trim()).filter(Boolean);
    if (names.some((name) => /^(?:broadcast-|targets-)/i.test(name))) {
      return "That script discovers hosts or adds targets. Leave it out.";
    }
    if (!/^[a-z0-9,_-]+$/.test(value)) {
      return "A script name is letters, numbers, commas, and dashes. Not a file path.";
    }
  }
  if (letters === "scriptargs" || flagHead(arg) === "--script-args") {
    if (/newtargets/i.test(flagValue(arg, next))) return "newtargets adds hosts. Leave it out.";
  }
  return null;
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
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? "";
    if (arg.length > 200 || SHELL.test(arg) || arg.includes("..") || arg.startsWith("/")) {
      return { ok: false, error: "One custom flag is not an nmap option this desk will run." };
    }
    const blocked = pathFlagError(arg) ?? scriptError(arg, args[i + 1]);
    if (blocked || OUTPUT_FLAGS.includes(arg) || arg === "--append-output") {
      return { ok: false, error: blocked ?? "The output name sets where the scan is saved. Leave -oA and -iL out of the custom flags." };
    }
    if (BARE_IPV4.test(arg)) {
      return { ok: false, error: "The target stays in the IP box, so a second address is not a flag." };
    }
  }
  return { ok: true, args };
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
  const args: string[] = [];
  for (let i = 0; i < body.length - 1; i++) {
    const arg = body[i] ?? "";
    const blocked = pathFlagError(arg) ?? scriptError(arg, body[i + 1]);
    if (blocked) return { error: blocked };
    if (OUTPUT_FLAGS.includes(arg) || arg === "--append-output") {
      if (OUTPUT_FLAGS.includes(arg) && !arg.includes("=") && body[i + 1] && !body[i + 1].startsWith("-")) i += 1;
      continue;
    }
    if (arg.length > 200 || arg.includes("..") || arg.startsWith("/")) {
      return { error: "One argument is not an nmap option this desk will run." };
    }
    if (BARE_IPV4.test(arg)) return { error: "The target IP stays at the end of the command. A second address is not a flag." };
    args.push(arg);
  }
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

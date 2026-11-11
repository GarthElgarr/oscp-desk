import { quoteHydraArg } from "./hydra-args.ts";
import { UDP_PROBES } from "./udp-scan.ts";

const PROBES = new Set<string>(UDP_PROBES);

/** -p is a password for these. A short number is still a password, not a port. */
const PASSWORD_P = new Set([
  "hydra",
  "nxc",
  "netexec",
  "crackmapexec",
  "cme",
  "evil-winrm",
  "smbmap",
  "enum4linux-ng",
  "bloodhound-python",
  "certipy-ad",
  "certipy",
  "medusa",
  "xfreerdp",
]);

/** -H is an NT hash for these, unless the value is actually a host. */
const HASH_H = new Set(["nxc", "netexec", "crackmapexec", "cme", "evil-winrm"]);

const SECRET_HEADERS = new Set(["authorization", "proxy-authorization", "cookie", "set-cookie", "x-api-key"]);

const SECRET_FLAG = /(?:^|\s)(--password|-password|--hashes|-hashes|-nthash|-computer-pass|-new-pass|-newpass|-aesKey|-H|-c|-p)(?:=|\s+)(?:"[^"]*"|'(?:[^']|'\\'')*'|\S+)/g;
const USER_PASS = /(^|[\s'"=/])((?:[^\s'":@/\\]+[/\\])?[^\s'":@]+):([^\s'":@]+)@/g;
const SECRET_NAMES = new Set(["-password", "--password", "-hashes", "--hashes", "-nthash", "-newpass", "-new-pass", "-aeskey", "-computer-pass"]);
const USER_PCT = /(^|[\s'"=/])([A-Za-z][A-Za-z0-9._@\\-]{0,63})%([^\s'"]+)/g;

function unquote(value: string): string {
  if (value.length >= 2 && (value[0] === "'" || value[0] === '"') && value.endsWith(value[0])) return value.slice(1, -1);
  return value;
}

function mask(value: string): string {
  if ((value.startsWith("'") || value.startsWith('"')) && value.length >= 2 && value.endsWith(value[0])) return `${value[0]}****${value[0]}`;
  return "****";
}

function toolOf(command: string): string {
  const parts = command.trim().split(/\s+/);
  const first = parts[0] === "sudo" ? parts[1] : parts[0];
  const base = (first ?? "").split(/[/\\]/).pop() ?? "";
  return base.replace(/\.exe$/i, "").toLowerCase();
}

/** A port list, not a password. nmap, Penelope, and chisel use -p this way. */
function isPortList(value: string): boolean {
  return /^\d{1,5}(?:-\d{1,5})?(?:,\d{1,5}(?:-\d{1,5})?)*$/.test(value);
}

function isProxy(value: string): boolean {
  return /^(?:127\.0\.0\.1|localhost):\d{1,5}$/.test(value);
}

function isNtHash(value: string): boolean {
  return /^(?:[0-9a-fA-F]{32}:)?[0-9a-fA-F]{32}$/.test(value) || /^:[0-9a-fA-F]{32}$/.test(value);
}

function isHost(value: string): boolean {
  if (/^(?:ldaps?|tcp|https?):\/\//i.test(value)) return true;
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value)) return value.split(".").every((part) => Number(part) <= 255);
  return /^(?=.{1,253}$)[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/.test(value);
}

function headerName(value: string): string | null {
  const match = /^([A-Za-z][A-Za-z0-9-]{0,40}):\s*\S/.exec(value);
  if (!match || /^[0-9a-fA-F]{8,}$/.test(match[1])) return null;
  return match[1].toLowerCase();
}

function keepPort(tool: string, value: string): boolean {
  if (PASSWORD_P.has(tool)) return false;
  if (tool === "searchsploit" && /^\d{1,7}$/.test(value)) return true;
  if (tool === "udp-proto-scanner.pl" && PROBES.has(value)) return true;
  return isPortList(value) || isProxy(value);
}

function keepH(tool: string, value: string): boolean {
  if (isNtHash(value)) return false;
  if (HASH_H.has(tool)) return isHost(value);
  const header = headerName(value);
  if (header) return !SECRET_HEADERS.has(header);
  return isHost(value);
}

/** snmpwalk -c is the community. onesixtyone -c is the file that holds it. */
function keepCommunity(tool: string, value: string): boolean {
  if (tool === "snmpwalk") return false;
  if (tool === "onesixtyone") return value.includes("/") || value === "communities.txt" || value.endsWith(".communities");
  return true;
}

function stripOnesixtyComment(command: string): string {
  if (toolOf(command) !== "onesixtyone") return command;
  return command.replace(/\s+#\s+[A-Za-z0-9_.:@-]{1,32}(?:,\s*[A-Za-z0-9_.:@-]{1,32})*\s*$/, "");
}

function scrub(arg: string, secrets: string[]): string {
  let next = arg;
  for (const secret of secrets) {
    if (next === secret) return "****";
    if (next.includes(`:${secret}`)) next = next.split(`:${secret}`).join(":****");
    if (next.includes(`%${secret}`)) next = next.split(`%${secret}`).join("%****");
  }
  return next;
}

/** Stars are the mask, not a glob. Quote only when something else still needs a quote. */
function quoteDisplay(arg: string): string {
  const plain = arg.replaceAll("****", "");
  if (/^[A-Za-z0-9_./:@^+%=,~-]*$/.test(plain)) return arg;
  return quoteHydraArg(arg);
}

function toolName(bin: string): string {
  return (bin.split(/[/\\]/).pop() ?? bin).replace(/\.exe$/i, "").toLowerCase();
}

function isSecretFlag(tool: string, flag: string): boolean {
  const name = flag.toLowerCase();
  if (SECRET_NAMES.has(name)) return true;
  return name === "-p" && PASSWORD_P.has(tool);
}

const NO_HOST_IMPACKET = new Set([
  "impacket-getuserspns",
  "impacket-getnpusers",
  "impacket-gettgt",
  "impacket-getst",
  "impacket-getadusers",
  "impacket-finddelegation",
  "impacket-addcomputer",
  "impacket-rbcd",
]);

/** No host on the identity. Everything after the first colon is the secret, including @. */
function maskNoHostIdent(ident: string): string {
  if (!ident || ident.startsWith("-") || /^(?:ldaps?|https?|tcp):\/\//i.test(ident)) return ident;
  const slash = Math.max(ident.lastIndexOf("/"), ident.lastIndexOf("\\"));
  const head = slash >= 0 ? ident.slice(0, slash + 1) : "";
  const userAndPass = slash >= 0 ? ident.slice(slash + 1) : ident;
  const colon = userAndPass.indexOf(":");
  if (colon <= 0) return ident;
  return `${head}${userAndPass.slice(0, colon)}:****`;
}

/** [domain/]user[:password][@host]. The password may contain :, space, @, or %. */
function maskIdent(ident: string): string {
  if (!ident || ident.startsWith("-") || /^(?:ldaps?|https?|tcp):\/\//i.test(ident)) return ident;
  const at = ident.lastIndexOf("@");
  const host = at >= 0 ? ident.slice(at) : "";
  const body = at >= 0 ? ident.slice(0, at) : ident;
  const slash = Math.max(body.lastIndexOf("/"), body.lastIndexOf("\\"));
  const head = slash >= 0 ? body.slice(0, slash + 1) : "";
  const userAndPass = slash >= 0 ? body.slice(slash + 1) : body;
  const colon = userAndPass.indexOf(":");
  if (colon <= 0) return ident;
  return `${head}${userAndPass.slice(0, colon)}:****${host}`;
}

/** The command stored in the run log. args stay real for the process. secrets are the passwords the plan already knows. */
export function displayArgs(bin: string, args: string[], secrets: string[] = []): string[] {
  const hidden = secrets.filter((secret) => secret.length > 0).sort((a, b) => b.length - a.length);
  const tool = toolName(bin);
  const spray = tool === "kerbrute" && args[0] === "passwordspray";
  return args.map((raw, index) => {
    const arg = scrub(raw, hidden);
    const eq = arg.indexOf("=");
    if (eq > 0 && isSecretFlag(tool, arg.slice(0, eq))) return `${arg.slice(0, eq)}=****`;
    const prev = index > 0 ? (args[index - 1] ?? "") : "";
    const prevName = prev.split("=")[0] ?? "";
    if (prevName && isSecretFlag(tool, prevName) && !prev.includes("=")) return "****";
    if (tool.startsWith("impacket-")) return NO_HOST_IMPACKET.has(tool) ? maskNoHostIdent(arg) : maskIdent(arg);
    if (spray && index === args.length - 1 && !arg.startsWith("-")) {
      const file = args[index - 1] ?? "";
      if (!file.startsWith("-") && (file.includes("/") || file.endsWith(".txt"))) return "****";
    }
    return arg;
  });
}

export function displayCommand(bin: string, args: string[], secrets: string[] = []): string {
  return [bin, ...displayArgs(bin, args, secrets).map(quoteDisplay)].join(" ");
}

/** Kerbrute spray puts the one password in the last argument, after the name list. */
function redactSpray(command: string): string {
  if (toolOf(command) !== "kerbrute" || !/\bpasswordspray\b/.test(command)) return command;
  const match = /(\s)('[^']*'|"[^"]*"|\S+)\s*$/.exec(command);
  if (!match || match.index === undefined) return command;
  const token = match[2];
  if (token.startsWith("-")) return command;
  const head = command.slice(0, match.index);
  const prev = /('[^']*'|"[^"]*"|\S+)\s*$/.exec(head);
  if (!prev || prev[1].startsWith("-")) return command;
  const prevBare = unquote(prev[1]);
  if (!prevBare.includes("/") && !prevBare.endsWith(".txt")) return command;
  return `${head}${match[1]}${mask(token)}`;
}

function redactPct(command: string): string {
  const quoted = command
    .replace(/'([A-Za-z][A-Za-z0-9._@\\-]{0,63})%([^']+)'/g, "'$1%****'")
    .replace(/"([A-Za-z][A-Za-z0-9._@\\-]{0,63})%([^"]+)"/g, '"$1%****"');
  return quoted.replace(USER_PCT, (_match, lead: string, user: string) => `${lead}${user}%****`);
}

function redactImpacket(command: string): string | null {
  if (!toolOf(command).startsWith("impacket-")) return null;
  const tokens = command.match(/'[^']*'|"[^"]*"|\S+/g);
  if (!tokens || tokens.length < 1) return null;
  const bin = unquote(tokens[0] ?? "");
  const args = tokens.slice(1).map(unquote);
  return displayCommand(bin, args);
}

function isFuzz(value: string): boolean {
  return /FUZ\d*Z/.test(value);
}

const SECRET_KEY = /pass|pwd|secret|token/i;
const SECRET_HEADER_NAME = /token|secret|key|auth/i;
const WFUZZ_AUTH = ["--basic", "--ntlm", "--digest"] as const;

/** Quote a displayed arg when it contains a space. The process still gets the raw arg. */
function quoteStored(arg: string): string {
  if (!/[\s"'{}$]/.test(arg)) return arg;
  return quoteHydraArg(arg);
}

function requote(token: string, next: string): string {
  const quote = token.length >= 2 && (token[0] === "'" || token[0] === '"') && token.endsWith(token[0]) ? token[0] : "";
  if (quote) return `${quote}${next}${quote}`;
  return quoteStored(next);
}

function maskAuthValue(value: string): string {
  const colon = value.indexOf(":");
  if (colon < 0) return "****";
  return `${value.slice(0, colon + 1)}****`;
}

/** Mask each cookie value. A value that is a FUZZ marker stays, including the name. */
function maskCookieValue(value: string): string {
  if (!value.includes("=")) return isFuzz(value) ? value : "****";
  return value
    .split(";")
    .map((part) => {
      const lead = /^\s*/.exec(part)?.[0] ?? "";
      const trimmed = part.trim();
      if (!trimmed) return part;
      const eq = trimmed.indexOf("=");
      if (eq < 0) return isFuzz(trimmed) ? part : `${lead}****`;
      const key = trimmed.slice(0, eq);
      const val = trimmed.slice(eq + 1);
      if (isFuzz(val)) return `${lead}${key}=${val}`;
      return `${lead}${key}=****`;
    })
    .join(";");
}

function maskFormBody(body: string): string {
  return body
    .split("&")
    .map((pair) => {
      const eq = pair.indexOf("=");
      if (eq < 0) return pair;
      const key = pair.slice(0, eq);
      const value = pair.slice(eq + 1);
      if (!SECRET_KEY.test(key) || isFuzz(value)) return pair;
      return `${key}=****`;
    })
    .join("&");
}

function jsonScalar(value: unknown): boolean {
  return value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function maskJsonNode(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => maskJsonNode(item));
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_KEY.test(key) && jsonScalar(item) && !(typeof item === "string" && isFuzz(item))) out[key] = "****";
    else out[key] = maskJsonNode(item);
  }
  return out;
}

/** Form bodies and JSON. Secret keys lose their values. FUZZ markers stay. */
function maskBody(body: string): string {
  const trimmed = body.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.stringify(maskJsonNode(JSON.parse(trimmed) as unknown));
    } catch {
      /* not JSON; fall through to a form body */
    }
  }
  return maskFormBody(body);
}

function secretHeader(name: string): boolean {
  if (SECRET_HEADERS.has(name.toLowerCase())) return true;
  return SECRET_HEADER_NAME.test(name);
}

/** Keep the header name. Mask the value when the name is a credential header. */
function maskHeaderValue(value: string): string {
  const match = /^([A-Za-z][A-Za-z0-9-]{0,40})(\s*:\s*)([\s\S]*)$/.exec(value);
  if (!match) return value;
  const name = match[1] ?? "";
  const sep = match[2] ?? ": ";
  const rest = match[3] ?? "";
  if (!secretHeader(name) || isFuzz(rest)) return value;
  return `${name}${sep}****`;
}

function maskHydraArg(prev: string, arg: string): string {
  if (prev === "-p") return "****";
  if (arg.startsWith("-p=")) return "-p=****";
  if (/^-p\S/.test(arg)) return "-p****";
  return arg;
}

function maskWfuzzArg(prev: string, arg: string): string {
  if (prev === "--basic" || prev === "--ntlm" || prev === "--digest") return maskAuthValue(arg);
  if (prev === "-H") return maskHeaderValue(arg);
  if (prev === "-b") return maskCookieValue(arg);
  if (prev === "-d") return maskBody(arg);
  for (const flag of WFUZZ_AUTH) {
    if (arg.startsWith(`${flag}=`)) return `${flag}=${maskAuthValue(arg.slice(flag.length + 1))}`;
  }
  if (arg.startsWith("-H=")) return `-H=${maskHeaderValue(arg.slice(3))}`;
  if (arg.startsWith("-b=")) return `-b=${maskCookieValue(arg.slice(3))}`;
  if (arg.startsWith("-d=")) return `-d=${maskBody(arg.slice(3))}`;
  return arg;
}

/**
 * The command written to the run log, built from the argv the process receives.
 * Hydra and wfuzz secrets are masked by position. Other tools are quoted only;
 * redactStoredCommand still masks those.
 */
export function storedCommand(bin: string, args: readonly string[]): string {
  const tool = toolName(bin);
  const shown = args.map((arg, index) => {
    const prev = index > 0 ? (args[index - 1] ?? "") : "";
    if (tool === "hydra") return maskHydraArg(prev, arg);
    if (tool === "wfuzz") return maskWfuzzArg(prev, arg);
    return arg;
  });
  const name = (bin.split(/[/\\]/).pop() ?? bin).replace(/\.exe$/i, "");
  return [name, ...shown.map(quoteStored)].join(" ");
}

function maskWfuzzCookie(token: string): string {
  const bare = unquote(token);
  if (bare.startsWith("-b=")) return requote(token, `-b=${maskCookieValue(bare.slice(3))}`);
  return requote(token, maskCookieValue(bare));
}

function maskWfuzzAuth(token: string): string {
  const bare = unquote(token);
  const eq = bare.startsWith("--") ? bare.indexOf("=") : -1;
  const flag = eq > 0 ? bare.slice(0, eq) : "";
  const value = eq > 0 ? bare.slice(eq + 1) : bare;
  const next = flag ? `${flag}=${maskAuthValue(value)}` : maskAuthValue(value);
  return requote(token, next);
}

function maskWfuzzHeader(token: string): string {
  const bare = unquote(token);
  const prefixed = bare.startsWith("-H=");
  const value = prefixed ? bare.slice(3) : bare;
  const next = maskHeaderValue(value);
  const joined = prefixed ? `-H=${next}` : next;
  return requote(token, joined);
}

/** Hide body values whose key looks like a password, secret, or token. A FUZZ marker stays. */
function maskWfuzzBody(token: string): string {
  const bare = unquote(token);
  const prefixed = bare.startsWith("-d=");
  const body = prefixed ? bare.slice(3) : bare;
  const next = maskBody(body);
  const joined = prefixed ? `-d=${next}` : next;
  return requote(token, joined);
}

function redactWfuzz(command: string): string {
  if (toolOf(command) !== "wfuzz") return command;
  const tokens = command.match(/'[^']*'|"[^"]*"|\S+/g);
  if (!tokens) return command;
  const out: string[] = [];
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index] ?? "";
    const bare = unquote(token);
    const prev = index > 0 ? unquote(tokens[index - 1] ?? "") : "";
    if (prev === "-b" || bare.startsWith("-b=")) {
      out.push(maskWfuzzCookie(token));
      continue;
    }
    if (prev === "-H" || bare.startsWith("-H=")) {
      out.push(maskWfuzzHeader(token));
      continue;
    }
    if (prev === "--basic" || prev === "--ntlm" || prev === "--digest" || /^(?:--basic|--ntlm|--digest)=/.test(bare)) {
      out.push(maskWfuzzAuth(token));
      continue;
    }
    if (prev === "-d" || bare.startsWith("-d=")) {
      out.push(maskWfuzzBody(token));
      continue;
    }
    out.push(token);
  }
  return out.join(" ");
}

function redactFlags(command: string): string {
  const tool = toolOf(command);
  return command.replace(SECRET_FLAG, (full, flag: string) => {
    if (tool === "wfuzz" && flag === "-H") return full;
    const at = full.indexOf(flag);
    const sepAndValue = full.slice(at + flag.length);
    const sep = sepAndValue.startsWith("=") ? "=" : (sepAndValue.match(/^\s+/)?.[0] ?? " ");
    const value = sepAndValue.slice(sep.length);
    const bare = unquote(value);
    if (flag === "-p" && keepPort(tool, bare)) return full;
    if (flag === "-H" && keepH(tool, bare)) return full;
    if (flag === "-c" && keepCommunity(tool, bare)) return full;
    return `${full.slice(0, at)}${flag}${sep}${mask(value)}`;
  });
}

/** Hide passwords and hashes before a command is stored or shown. The process still gets the real args. */
export function redactStoredCommand(command: string): string {
  const comments = stripOnesixtyComment(command);
  const impacket = redactImpacket(comments);
  if (impacket !== null) return impacket;
  const sprayed = redactSpray(comments);
  const users = sprayed.replace(USER_PASS, (_match, lead: string, user: string) => `${lead}${user}:****@`);
  const pct = redactPct(users);
  const flagged = redactFlags(pct);
  const hydra = toolOf(flagged) === "hydra" ? flagged.replace(/(^|\s)-p=\S+/g, "$1-p=****").replace(/(^|\s)-p(?![\s=])\S+/g, "$1-p****") : flagged;
  return redactWfuzz(hydra);
}

/** The echoed `$ command` line is stored with the run. Tool output after it stays as the tool printed it. */
export function redactStoredOutput(output: string): string {
  return output.replace(/^\$ [^\n]*/gm, (line) => `$ ${redactStoredCommand(line.slice(2))}`);
}

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
const USER_PCT = /(^|[\s'"=/])([A-Za-z][A-Za-z0-9._@\\-]{0,63})%([^\s'"%]+)/g;

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
    if (tool.startsWith("impacket-")) return maskIdent(arg);
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

function maskWfuzzCookie(token: string): string {
  const bare = unquote(token);
  const value = bare.startsWith("-b=") ? bare.slice(3) : bare;
  if (isFuzz(value)) return token;
  if (bare.startsWith("-b=")) return "-b=****";
  return mask(token);
}

function maskWfuzzAuth(token: string): string {
  const quote = token.length >= 2 && (token[0] === "'" || token[0] === '"') && token.endsWith(token[0]) ? token[0] : "";
  const bare = unquote(token);
  const eq = bare.startsWith("--") ? bare.indexOf("=") : -1;
  const flag = eq > 0 ? bare.slice(0, eq) : "";
  const value = eq > 0 ? bare.slice(eq + 1) : bare;
  const colon = value.indexOf(":");
  const masked = colon < 0 ? "****" : `${value.slice(0, colon + 1)}****`;
  const next = flag ? `${flag}=${masked}` : masked;
  return quote ? `${quote}${next}${quote}` : next;
}

/** Hide body values whose key looks like a password, secret, or token. A FUZZ marker stays. */
function maskWfuzzBody(token: string): string {
  const quote = token.length >= 2 && (token[0] === "'" || token[0] === '"') && token.endsWith(token[0]) ? token[0] : "";
  const bare = unquote(token);
  const prefixed = bare.startsWith("-d=");
  const body = prefixed ? bare.slice(3) : bare;
  const next = body
    .split("&")
    .map((pair) => {
      const eq = pair.indexOf("=");
      if (eq < 0) return pair;
      const key = pair.slice(0, eq);
      const value = pair.slice(eq + 1);
      if (!/pass|pwd|secret|token/i.test(key) || isFuzz(value)) return pair;
      return `${key}=****`;
    })
    .join("&");
  const joined = prefixed ? `-d=${next}` : next;
  return quote ? `${quote}${joined}${quote}` : joined;
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
  return redactWfuzz(redactFlags(pct));
}

/** The echoed `$ command` line is stored with the run. Tool output after it stays as the tool printed it. */
export function redactStoredOutput(output: string): string {
  return output.replace(/^\$ [^\n]*/gm, (line) => `$ ${redactStoredCommand(line.slice(2))}`);
}

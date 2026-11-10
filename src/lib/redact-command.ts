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

const SECRET_FLAG = /(?:^|\s)(--password|-password|--hashes|-hashes|-H|-c|-p)(?:=|\s+)(?:"[^"]*"|'(?:[^']|'\\'')*'|\S+)/g;
const USER_PASS = /(^|[\s'"=/])((?:[^\s'":@/\\]+[/\\])?[^\s'":@]+):([^\s'":@]+)@/g;
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

/** Kerbrute spray puts the one password in the last argument, after the name list. */
function redactSpray(command: string): string {
  if (toolOf(command) !== "kerbrute" || !/\bpasswordspray\b/.test(command)) return command;
  const match = /^(.*\s)(\S+)(\s+)('[^']*'|"[^"]*"|\S+)\s*$/.exec(command);
  if (!match) return command;
  const prev = unquote(match[2]);
  const token = match[4];
  if (token.startsWith("-") || match[2].startsWith("-")) return command;
  if (!prev.includes("/") && !prev.endsWith(".txt")) return command;
  return `${match[1]}${match[2]}${match[3]}${mask(token)}`;
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
  const sprayed = redactSpray(comments);
  const users = sprayed.replace(USER_PASS, (_match, lead: string, user: string) => `${lead}${user}:****@`);
  const pct = users.replace(USER_PCT, (_match, lead: string, user: string) => `${lead}${user}%****`);
  return redactFlags(pct);
}

/** The echoed `$ command` line is stored with the run. Tool output after it stays as the tool printed it. */
export function redactStoredOutput(output: string): string {
  return output.replace(/^\$ [^\n]*/gm, (line) => `$ ${redactStoredCommand(line.slice(2))}`);
}

const SECRET_FLAG = /(?:^|\s)(-p|--password|-H|--hashes|-hashes)(?:=|\s+)(?:"[^"]*"|'[^']*'|\S+)/g;
const USER_PASS = /(^|[\s'"=])((?:[^\s'":@/\\]+[/\\])?[^\s'":@]+):([^\s'":@]+)@/g;

function unquote(value: string): string {
  if (value.length >= 2 && (value[0] === "'" || value[0] === '"') && value.endsWith(value[0])) return value.slice(1, -1);
  return value;
}

/** A port list, not a password. nmap and Penelope use -p this way. */
function isPortList(value: string): boolean {
  return /^\d{1,5}(?:-\d{1,5})?(?:,\d{1,5}(?:-\d{1,5})?)*$/.test(value);
}

/** Hide passwords and hashes before a command is stored or shown. The process still gets the real args. */
export function redactStoredCommand(command: string): string {
  const users = command.replace(USER_PASS, (_match, lead: string, user: string) => `${lead}${user}:****@`);
  return users.replace(SECRET_FLAG, (full, flag: string) => {
    const at = full.indexOf(flag);
    const sepAndValue = full.slice(at + flag.length);
    const sep = sepAndValue.startsWith("=") ? "=" : (sepAndValue.match(/^\s+/)?.[0] ?? " ");
    const value = sepAndValue.slice(sep.length);
    if (flag === "-p" && isPortList(unquote(value))) return full;
    const quoted = value.startsWith("'") || value.startsWith('"');
    const redacted = quoted ? `${value[0]}****${value.endsWith(value[0]) ? value[0] : ""}` : "****";
    return `${full.slice(0, at)}${flag}${sep}${redacted}`;
  });
}

/** The echoed `$ command` line is stored with the run. Tool output after it stays as the tool printed it. */
export function redactStoredOutput(output: string): string {
  return output.replace(/^\$ [^\n]*/gm, (line) => `$ ${redactStoredCommand(line.slice(2))}`);
}

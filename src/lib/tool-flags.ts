/**
 * Exact option names for every tool that accepts operator-typed flags.
 * nmap is parsed with getopt_long_only in nmap-scan.ts. BloodHound's long
 * options are expanded with argparse's unique-prefix rule in bloodhoundArgv.
 * The others are exact: -flag, --flag, or --flag=value. A short value may be
 * glued on (-t4, -M<path>).
 */

export type FlagParser = "getopt_long_only" | "exact" | "argparse";

export type ToolFlags = {
  tool: string;
  parser: FlagParser;
  cwd: string | null;
  /** True when the desk spawns the tool. Copy-only cards stay false. */
  spawned: boolean;
  flags: readonly string[];
};

const HYDRA = ["-f", "-F", "-v", "-V", "-I", "-S", "-u", "-4", "-6", "-t", "-e", "-w", "-o", "-b", "-m", "-l", "-L", "-p", "-P", "-s", "-M", "-C", "-U", "-W"];
const HYDRA_VALUE = new Set(["-t", "-e", "-w", "-o", "-b", "-m", "-l", "-L", "-p", "-P", "-s", "-M", "-C", "-U", "-W"]);

const WFUZZ = [
  "-t", "-R", "-s", "-e", "-p", "-u", "-X", "-d", "-H", "-b", "-z", "-w", "-f", "-o",
  "--hc", "--hl", "--hw", "--hh", "--sc", "--sl", "--sw", "--sh", "--hs", "--ss",
  "--req-delay", "--conn-delay", "--basic", "--ntlm", "--digest", "--zE",
  "-c", "-v", "-V", "-L", "-Z", "--follow", "--dry-run",
];

const FFUF = ["-u", "-w", "-e", "-H", "-t", "-rate", "-fc", "-fs", "-fw"];
const GOBUSTER = ["dir", "vhost", "-u", "-w", "-t", "-q", "-s", "-x", "-o", "--append-domain"];
const FEROX = ["-u", "-w", "-x", "-t", "-s", "-C", "-o"];
const HASHCAT = [
  "-m", "--hash-type", "-a", "--attack-mode", "-o", "--outfile", "--outfile-format",
  "-r", "--rules-file", "-w", "--workload-profile", "-O", "--optimized-kernel-enable",
  "--force", "--username", "--potfile-disable", "--status", "--status-timer",
  "--show", "--left", "--stdout", "--remove", "--separator", "--hex-salt", "--hex-charset",
  "-1", "-2", "-3", "-4", "--increment", "--increment-min", "--increment-max",
  "-j", "--rule-left", "--rule-right", "-k", "--quiet", "--hwmon-disable", "--session", "--restore-file-path",
];
const JOHN = [
  "--wordlist", "--rules", "--format", "--show", "--users", "--single", "--incremental",
  "--mask", "--fork", "--session", "--pot", "--stdout", "--max-length", "--min-length",
];
const IMPACKET = [
  "-dc-ip", "-dc-host", "-target", "-target-ip", "-targets", "-outputfile", "-save",
  "-debug", "-ts", "-hashes", "-no-pass", "-k", "-aesKey", "-just-dc-ntlm", "-just-dc-user", "-codec",
];
const BLOODHOUND = [
  "-c", "--collectionmethod", "-d", "--domain", "-u", "--username", "-p", "--password",
  "-ns", "--nameserver", "--dns-tcp", "--dns-timeout", "--workers", "--disable-autogc",
  "--disable-pooling", "--zip", "--hashes", "-k", "--kerberos", "--no-pass", "-o", "-out", "-output", "-op", "--outputprefix",
  "-dc", "--use-ldaps",
];
const CERTIPY = [
  "-u", "-p", "-hashes", "-k", "-no-pass", "-dc-ip", "-ns", "-target", "-target-ip",
  "-o", "-op", "--outputprefix", "-out", "-output", "-save", "-bloodhound", "-stdout", "-vulnerable", "-pfx", "-password",
  "-template", "-ca", "-upn", "-ldap-scheme",
];
const KERBRUTE = ["-d", "--dc", "-o", "-out", "-output", "-op", "--outputprefix", "--safe", "--delay", "-v", "--verbose", "--downgrade"];
const SMBCLIENT = ["-N", "-L", "-U"];
const ENUM4LINUX_FLAGS = ["-A", "-u", "-p"];
const SMBMAP = ["-H", "-u", "-p"];
const RPCCLIENT = ["-U", "-N"];

export const TOOL_FLAGS: readonly ToolFlags[] = [
  { tool: "nmap", parser: "getopt_long_only", cwd: "scans/nmap", spawned: true, flags: ["-F", "-Pn", "-sC", "-sV", "-p", "--script", "--script-args"] },
  { tool: "hydra", parser: "exact", cwd: "scans/hydra", spawned: true, flags: HYDRA },
  { tool: "wfuzz", parser: "exact", cwd: "scans/wfuzz", spawned: true, flags: WFUZZ },
  { tool: "ffuf", parser: "exact", cwd: null, spawned: false, flags: FFUF },
  { tool: "gobuster", parser: "exact", cwd: null, spawned: false, flags: GOBUSTER },
  { tool: "feroxbuster", parser: "exact", cwd: null, spawned: false, flags: FEROX },
  { tool: "hashcat", parser: "exact", cwd: "scans/crack", spawned: true, flags: HASHCAT },
  { tool: "john", parser: "exact", cwd: "scans/crack", spawned: true, flags: JOHN },
  { tool: "impacket", parser: "exact", cwd: "scans/impacket", spawned: true, flags: IMPACKET },
  { tool: "bloodhound", parser: "argparse", cwd: "scans/ad", spawned: true, flags: BLOODHOUND },
  { tool: "certipy", parser: "exact", cwd: "scans/ad", spawned: true, flags: CERTIPY },
  { tool: "kerbrute", parser: "exact", cwd: "scans/ad", spawned: true, flags: KERBRUTE },
  { tool: "smbclient", parser: "exact", cwd: null, spawned: false, flags: SMBCLIENT },
  { tool: "enum4linux-ng", parser: "exact", cwd: null, spawned: false, flags: ENUM4LINUX_FLAGS },
  { tool: "smbmap", parser: "exact", cwd: null, spawned: false, flags: SMBMAP },
  { tool: "rpcclient", parser: "exact", cwd: null, spawned: false, flags: RPCCLIENT },
  { tool: "nikto", parser: "exact", cwd: null, spawned: false, flags: ["-h", "-o"] },
];

const BY_TOOL = new Map(TOOL_FLAGS.map((row) => [row.tool, row]));

/** A flag token, not a positional. =value and a glued short value still count. */
export function flagListed(tool: string, arg: string): boolean {
  const row = BY_TOOL.get(tool);
  if (!row || !arg.startsWith("-")) return false;
  const names = new Set(row.flags);
  if (names.has(arg)) return true;
  const eq = arg.indexOf("=");
  const head = eq === -1 ? arg : arg.slice(0, eq);
  if (names.has(head)) return true;
  if (tool === "hydra" && arg.length > 2 && HYDRA_VALUE.has(arg.slice(0, 2))) return true;
  if (tool === "bloodhound") return bloodhoundPrefix(head.slice(2)) !== null;
  return false;
}

/** argparse allow_abbrev. Null when the prefix is missing or matches two long options. */
export function bloodhoundPrefix(name: string): string | null {
  if (!name) return null;
  const longs = BLOODHOUND.filter((flag) => flag.startsWith("--")).map((flag) => flag.slice(2));
  const exact = longs.filter((flag) => flag === name);
  if (exact.length === 1) return exact[0] ?? null;
  const prefix = longs.filter((flag) => flag.startsWith(name));
  if (prefix.length === 1) return prefix[0] ?? null;
  return null;
}

/** Rewrite BloodHound long options to the canonical name argparse would store. */
export function bloodhoundArgv(args: readonly string[]): { args: string[] } | { error: string } {
  const next: string[] = [];
  for (const arg of args) {
    if (!arg.startsWith("--")) {
      next.push(arg);
      continue;
    }
    const eq = arg.indexOf("=");
    const name = (eq === -1 ? arg.slice(2) : arg.slice(2, eq));
    const canon = bloodhoundPrefix(name);
    if (!canon) return { error: "That flag is not a BloodHound option this desk will run." };
    const value = eq === -1 ? "" : arg.slice(eq);
    next.push(`--${canon}${value}`);
  }
  return { args: next };
}

export function hydraFlagListed(arg: string): boolean {
  return flagListed("hydra", arg);
}

export function impacketExtraOk(extra: readonly string[]): boolean {
  return extra.every((arg) => !arg.startsWith("-") || flagListed("impacket", arg));
}

export function adExtraOk(bin: string, extra: readonly string[]): boolean {
  const tool = bin === "bloodhound-python" ? "bloodhound" : bin === "certipy-ad" ? "certipy" : bin === "kerbrute" ? "kerbrute" : "";
  if (!tool) return false;
  return extra.every((arg) => !arg.startsWith("-") || flagListed(tool, arg));
}

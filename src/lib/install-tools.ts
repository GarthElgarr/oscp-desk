/** Packages the desk's Run buttons and service cards expect on Kali. */
export const INSTALL_PACKAGES = [
  "hydra",
  "hashcat",
  "john",
  "metasploit-framework",
  "netexec",
  "nmap",
  "smbclient",
  "python3-impacket",
  "socat",
  "proxychains4",
  "ligolo-ng",
  "chisel",
  "exploitdb",
  "linux-exploit-suggester",
  "wordlists",
  "wfuzz",
  "seclists",
  "penelope",
  "snmp",
  "onesixtyone",
] as const;

/** Names the desk actually calls, including binaries that live inside a package. */
export const INSTALL_TOOL_LABELS = [
  "hydra",
  "msfvenom (metasploit-framework)",
  "hashcat",
  "john",
  "nxc (netexec)",
  "nmap",
  "smbclient",
  "impacket",
  "socat",
  "proxychains4",
  "ligolo-ng",
  "chisel",
  "searchsploit (exploitdb)",
  "linux-exploit-suggester",
  "rockyou (wordlists)",
  "wfuzz",
  "seclists",
  "penelope",
  "snmpwalk (snmp)",
  "onesixtyone",
] as const;

export function manualInstallCommand(): string {
  return [
    "sudo apt-get update",
    `sudo DEBIAN_FRONTEND=noninteractive apt-get install -y ${INSTALL_PACKAGES.join(" ")}`,
    "sudo gzip -dkf /usr/share/wordlists/rockyou.txt.gz",
  ].join(" && ");
}

/** What the install checks after apt. A file check is for things that are not a command. */
export const TOOL_CHECKS = [
  { label: "hydra", bin: "hydra" },
  { label: "msfvenom", bin: "msfvenom" },
  { label: "hashcat", bin: "hashcat" },
  { label: "john", bin: "john" },
  { label: "nxc", bin: "nxc" },
  { label: "nmap", bin: "nmap" },
  { label: "smbclient", bin: "smbclient" },
  { label: "impacket", bin: "impacket-secretsdump" },
  { label: "socat", bin: "socat" },
  { label: "proxychains4", bin: "proxychains4" },
  { label: "ligolo-ng", bin: "ligolo-proxy" },
  { label: "chisel", bin: "chisel" },
  { label: "searchsploit", bin: "searchsploit" },
  { label: "linux-exploit-suggester", bin: "linux-exploit-suggester" },
  { label: "rockyou", file: "/usr/share/wordlists/rockyou.txt" },
  { label: "wfuzz", bin: "wfuzz" },
  { label: "seclists", file: "/usr/share/seclists" },
  { label: "penelope", bin: "penelope" },
  { label: "snmpwalk", bin: "snmpwalk" },
  { label: "onesixtyone", bin: "onesixtyone" },
] as const;

export type InstallSummary = {
  verdict: "pass" | "partial" | "fail";
  title: string;
  outstanding: string[];
};

export function takeInstallStatus(text: string): { output: string; summary: InstallSummary | null } {
  const at = text.lastIndexOf("@@STATUS ");
  if (at === -1) return { output: text, summary: null };
  const end = text.indexOf("@@", at + "@@STATUS ".length);
  if (end === -1) return { output: text.slice(0, at), summary: null };
  let summary: InstallSummary | null = null;
  try {
    const parsed = JSON.parse(text.slice(at + "@@STATUS ".length, end)) as Partial<InstallSummary>;
    const verdict = parsed.verdict;
    if (verdict === "pass" || verdict === "partial" || verdict === "fail") {
      const outstanding = Array.isArray(parsed.outstanding)
        ? parsed.outstanding.filter((item): item is string => typeof item === "string").slice(0, 40)
        : [];
      summary = {
        verdict,
        title: typeof parsed.title === "string" ? parsed.title.slice(0, 200) : "",
        outstanding,
      };
    }
  } catch {
    summary = null;
  }
  return { output: text.slice(0, at) + text.slice(end + 2), summary };
}


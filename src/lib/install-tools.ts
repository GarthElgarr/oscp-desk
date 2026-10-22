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
  "wordlists",
  "wfuzz",
  "seclists",
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
  "rockyou (wordlists)",
  "wfuzz",
  "seclists",
] as const;

export function manualInstallCommand(): string {
  return [
    "sudo apt-get update",
    `sudo DEBIAN_FRONTEND=noninteractive apt-get install -y ${INSTALL_PACKAGES.join(" ")}`,
    "sudo gzip -dkf /usr/share/wordlists/rockyou.txt.gz",
  ].join(" && ");
}

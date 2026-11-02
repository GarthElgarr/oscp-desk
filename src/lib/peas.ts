/** Files the desk keeps in the uploads folder. They are not committed. */
export const STANDARD_UPLOADS = [
  {
    name: "linpeas.sh",
    pack: "raw",
    url: "https://github.com/peass-ng/PEASS-ng/releases/latest/download/linpeas.sh",
  },
  {
    name: "winPEASx64.exe",
    pack: "raw",
    url: "https://github.com/peass-ng/PEASS-ng/releases/latest/download/winPEASx64.exe",
  },
  {
    name: "chisel",
    pack: "gzip",
    repo: "jpillora/chisel",
    asset: "^chisel_[0-9][0-9.]*_linux_amd64\\.gz$",
  },
  {
    name: "chisel.exe",
    pack: "zip",
    repo: "jpillora/chisel",
    asset: "^chisel_[0-9][0-9.]*_windows_amd64\\.zip$",
  },
  {
    name: "agent",
    pack: "tar",
    repo: "nicocha30/ligolo-ng",
    asset: "^ligolo-ng_agent_[0-9][0-9.]*_linux_amd64\\.tar\\.gz$",
  },
  {
    name: "agent.exe",
    pack: "zip",
    repo: "nicocha30/ligolo-ng",
    asset: "^ligolo-ng_agent_[0-9][0-9.]*_windows_amd64\\.zip$",
  },
] as const;

export type StandardUpload = (typeof STANDARD_UPLOADS)[number];

export function peasHostOk(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname;
    return host === "github.com" || host === "objects.githubusercontent.com" || host === "release-assets.githubusercontent.com" || host === "api.github.com";
  } catch {
    return false;
  }
}

/** One asset, or nothing. Two matches is a different file, so it is not a guess. */
export function pickAsset(names: string[], pattern: string): string | null {
  let re: RegExp;
  try {
    re = new RegExp(pattern);
  } catch {
    return null;
  }
  const hits = names.filter((name) => re.test(name));
  return hits.length === 1 ? hits[0] : null;
}

/** Reject an HTML error page. A script starts with #, a Windows file with MZ, a Linux file with ELF. */
export function peasBytesOk(name: string, size: number, head: Uint8Array): boolean {
  if (size < 4096 || size > 80 * 1024 * 1024) return false;
  const text = new TextDecoder("latin1").decode(head.subarray(0, 80)).toLowerCase();
  if (text.startsWith("<!") || text.includes("<html")) return false;
  if (name.endsWith(".sh")) return head[0] === 0x23;
  if (name.endsWith(".exe")) return head[0] === 0x4d && head[1] === 0x5a;
  return head[0] === 0x7f && head[1] === 0x45 && head[2] === 0x4c && head[3] === 0x46;
}

/** Official PEASS-ng release files. They live in the uploads folder, not in git. */
export const STANDARD_PEAS = [
  {
    name: "linpeas.sh",
    url: "https://github.com/peass-ng/PEASS-ng/releases/latest/download/linpeas.sh",
  },
  {
    name: "winPEASx64.exe",
    url: "https://github.com/peass-ng/PEASS-ng/releases/latest/download/winPEASx64.exe",
  },
] as const;

export function peasHostOk(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname;
    return host === "github.com" || host === "objects.githubusercontent.com" || host === "release-assets.githubusercontent.com";
  } catch {
    return false;
  }
}

/** Reject an HTML error page or a tiny file. linpeas is a script. winpeas is a PE. */
export function peasBytesOk(name: string, size: number, head: Uint8Array): boolean {
  if (size < 4096 || size > 80 * 1024 * 1024) return false;
  const text = new TextDecoder("latin1").decode(head.subarray(0, 80)).toLowerCase();
  if (text.startsWith("<!") || text.includes("<html")) return false;
  if (name.endsWith(".sh")) return head[0] === 0x23;
  if (name.endsWith(".exe")) return head[0] === 0x4d && head[1] === 0x5a;
  return false;
}

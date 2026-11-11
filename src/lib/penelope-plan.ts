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
    const args = ["-O", "-c", host, "-p", port];
    return {
      args,
      command: `penelope ${args.join(" ")}`,
      nc: `nc ${host} ${port}`,
      why: "This connects out to a shell that is already listening on the target. -c is that host. -p is its port. -O leaves the exam modules off. When the shell is caught, Penelope enters it. The box below types on that shell. Sessions, Upload, and Download step back to the menu first. Paste the command into your own terminal if you would rather not run it here.",
    };
  }
  if (!ifaceOk(iface)) {
    return iface === "127.0.0.1" || iface.startsWith("127.")
      ? { error: "127.0.0.1 only accepts connections from this desk. Listen on 0.0.0.0. The payload LHOST is still your tun0 address." }
      : { error: "The interface is 0.0.0.0, tun0, or your tun0 address." };
  }
  const args = ["-O", "-p", port];
  if (iface && iface !== "0.0.0.0") args.push("-i", iface);
  return {
    args,
    command: `penelope ${args.join(" ")}`,
    nc: `nc -lvnp ${port}`,
    why: "Penelope listens here. The payload LHOST is your tun0 address, not 127.0.0.1, and the port is this port. -O keeps the exam modules off. When a shell arrives, Penelope enters it, and the box below runs on that shell. Sessions, Upload, and Download leave the shell first, then run. Detach is that same step without a command after it.",
  };
}

const PATH = /^[A-Za-z0-9_./:@+=,~-]{1,180}$/;

/** F12. Penelope detaches only when this is the entire chunk it reads. */
export const PENELOPE_DETACH = "\u001b[24~";

/** Drop Penelope's color codes, including the readline SOH/STX brackets around them. */
export function stripPenelopeAnsi(output: string): string {
  const esc = String.fromCharCode(27);
  return output
    .replace(new RegExp(`${esc}\\[[0-9;?]*[ -/]*[@-~]`, "g"), "")
    .split(String.fromCharCode(1)).join("")
    .split(String.fromCharCode(2)).join("");
}

export function penelopeInShell(output: string): boolean {
  const text = stripPenelopeAnsi(output);
  let last = "";
  for (const match of text.matchAll(/Interacting with session|Session detached/g)) last = match[0];
  return last === "Interacting with session";
}

export const PENELOPE_WAIT = {
  detached: /Session detached/,
  attached: /Interacting with session/,
  os: /Target OS\?/,
} as const;

export type PenelopeBeat =
  | { kind: "only"; data: string }
  | { kind: "line"; text: string; when?: "os" }
  | { kind: "until"; what: "detached" | "attached" | "transfer" | "os"; ms: number; stop: boolean };

/** 1 is Linux. Sent only after Penelope prints the Target OS question. */
export const PENELOPE_LINUX = "1\n";

/** Menu actions as separate writes. F12 is never in the same write as anything else. */
export function penelopeBeats(
  action: string,
  inShell: boolean,
  session: string,
  local: string,
  remote: string,
  forceLeave = false,
): PenelopeBeat[] | { error: string } {
  const line = penelopeLine(action, session, local, remote);
  if ("error" in line) return line;
  const id = session.trim() || "1";
  if (action === "interrupt") return [{ kind: "only", data: "\u0003" }];
  if (action === "interact" && inShell && !forceLeave) return [];
  const beats: PenelopeBeat[] = [];
  if (inShell) {
    beats.push({ kind: "only", data: PENELOPE_DETACH });
    beats.push({ kind: "until", what: "detached", ms: 4000, stop: true });
  }
  if (action !== "detach") beats.push({ kind: "line", text: line.text });
  if (action === "payloads") {
    beats.push({ kind: "until", what: "os", ms: 4000, stop: false });
    beats.push({ kind: "line", text: PENELOPE_LINUX, when: "os" });
  }
  if (action === "upload" || action === "download") {
    beats.push({ kind: "until", what: "transfer", ms: 180_000, stop: false });
    beats.push({ kind: "line", text: `interact ${id}\n` });
    beats.push({ kind: "until", what: "attached", ms: 5000, stop: false });
  } else if (action === "interact") {
    beats.push({ kind: "until", what: "attached", ms: 5000, stop: false });
  }
  return beats;
}

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
    const localError = pathError("Kali", local);
    if (localError) return { error: localError };
    const remoteError = pathError("target", remote);
    if (remoteError) return { error: remoteError };
    const line = action === "upload"
      ? `upload ${local} -o ${penelopeFolder(remote)}\n`
      : `download ${remote} -o ${penelopeFolder(local)}\n`;
    return { text: line, label: line.trim() };
  }
  return { error: "That is not a Penelope menu command." };
}

function pathError(side: "Kali" | "target", value: string): string | null {
  if (!PATH.test(value) || value.split("/").includes("..")) {
    return side === "Kali" ? "The Kali path has no spaces and no .." : "The target path has no spaces and no ..";
  }
  if (value.startsWith("-")) return "The path is a file, not a flag.";
  return null;
}

/** Current Penelope takes -o as a folder. A trailing slash is that folder. Otherwise it is the parent of the file. */
export function penelopeFolder(filePath: string): string {
  if (filePath.endsWith("/")) {
    const trimmed = filePath.replace(/\/+$/, "");
    return trimmed || "/";
  }
  const slash = filePath.lastIndexOf("/");
  if (slash < 0) return ".";
  if (slash === 0) return "/";
  return filePath.slice(0, slash);
}

const TRANSFER_OK = /Uploaded|Downloaded/;
const TRANSFER_HARD = /\[-\]|Download Failed|No such file|Not enough space/;
const TRANSFER_WARN = /\[!\]/;

export type PenelopeTransferVerdict = "success" | "failure" | "pending";

/**
 * Uploaded and Downloaded are success. [-], Download Failed, No such file, and
 * Not enough space are failure. [!] is a warning: it is not success, and it
 * becomes a failure once the menu prompt returns without a success line.
 * A warning while the transfer is still running stays pending so a later
 * Uploaded can still win.
 */
export function penelopeTransferVerdict(delta: string): PenelopeTransferVerdict {
  const text = stripPenelopeAnsi(delta);
  let last: PenelopeTransferVerdict = "pending";
  let sawWarn = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const ok = TRANSFER_OK.test(line);
    const hard = /\[-\]|Download Failed|Not enough space/.test(line) || (!ok && /No such file/.test(line));
    const warn = TRANSFER_WARN.test(line);
    const backAtMenu = /\(Penelope\)/.test(line);
    if (ok && !hard && !warn) last = "success";
    else if (hard) last = "failure";
    else if (warn) {
      sawWarn = true;
      if (last === "success") continue;
      last = backAtMenu ? "failure" : "pending";
    } else if (backAtMenu && sawWarn && last !== "success") {
      last = "failure";
    }
  }
  return last;
}

export type PenelopeTransferRead =
  | { status: "pending" }
  | { status: "success" }
  | { status: "failure"; message: string };

/** Classify only the output that arrived after the transfer command was sent. */
export function penelopeReadTransfer(before: string, now: string): PenelopeTransferRead {
  const delta = now.startsWith(before) ? now.slice(before.length) : now.slice(Math.max(0, now.length - 8000));
  const verdict = penelopeTransferVerdict(delta);
  if (verdict === "success") return { status: "success" };
  if (verdict === "failure") return { status: "failure", message: transferFailureMessage(delta) };
  return { status: "pending" };
}

/** Interact goes back only after a reported upload or download. A refusal stays at the menu. */
export function penelopeTransferReturns(status: "success" | "failure" | "timeout"): boolean {
  return status === "success";
}

export function penelopeTransferTimeoutMessage(before: string, now: string): string {
  const delta = now.startsWith(before) ? now.slice(before.length) : now.slice(Math.max(0, now.length - 8000));
  if (TRANSFER_WARN.test(stripPenelopeAnsi(delta)) || TRANSFER_HARD.test(stripPenelopeAnsi(delta))) return transferFailureMessage(delta);
  return "The file did not report back. The shell was left at the menu. Press Shell if the prompt is still Penelope.";
}

function transferFailureMessage(delta: string): string {
  const text = stripPenelopeAnsi(delta);
  const line = text
    .split(/\r?\n/)
    .map((row) => row.replace(/[^\x20-\x7e]/g, " ").replace(/\s+/g, " ").trim())
    .reverse()
    .find((row) => TRANSFER_HARD.test(row) || TRANSFER_WARN.test(row));
  const detail = line ? line.slice(0, 160) : "";
  return detail
    ? `Penelope refused the transfer (${detail}). The shell was left at the menu. Press Shell after the path is right.`
    : "Penelope refused the transfer. The shell was left at the menu. Press Shell after the path is right.";
}

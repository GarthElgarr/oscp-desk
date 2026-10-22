import { spawn } from "node:child_process";
import path from "node:path";
import { udpArgs, udpCommand, udpProbe, udpTarget } from "./udp-scan";

const MAX_OUT = 500_000;
const TIMEOUT_MS = 4 * 60 * 1000;

function scriptPath(): string {
  return path.resolve(process.cwd(), "tools/udp-proto-scanner/udp-proto-scanner.pl");
}

export function udpRequest(body: unknown): { command: string; args: string[] } | null {
  if (!body || typeof body !== "object") return null;
  const row = body as { target?: unknown; probe?: unknown };
  const target = udpTarget(row.target);
  const probe = udpProbe(row.probe);
  if (!target || !probe) return null;
  return { command: udpCommand(target, probe), args: udpArgs(target, probe) };
}

export function udpScanStream(command: string, args: string[], signal: AbortSignal): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let sent = 0;
  let killed = false;
  let child: ReturnType<typeof spawn> | null = null;
  const kill = () => {
    killed = true;
    child?.kill("SIGTERM");
  };
  const timer = setTimeout(kill, TIMEOUT_MS);
  signal.addEventListener("abort", kill);

  return new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        clearTimeout(timer);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      const push = (text: string) => {
        if (!text || sent >= MAX_OUT || closed) return;
        const slice = text.slice(0, MAX_OUT - sent);
        sent += slice.length;
        try {
          controller.enqueue(encoder.encode(slice));
        } catch {
          killed = true;
        }
        if (sent >= MAX_OUT) kill();
      };
      const script = scriptPath();
      push(`$ ${command}\n`);
      child = spawn("perl", [script, ...args], { shell: false, stdio: ["ignore", "pipe", "pipe"] });
      const take = (buf: Buffer) => push(buf.toString());
      child.stdout?.on("data", take);
      child.stderr?.on("data", take);
      child.on("error", (err: NodeJS.ErrnoException) => {
        push(
          err.code === "ENOENT"
            ? "perl was not found. Run the desk on Kali.\n"
            : `${err.message}\n`,
        );
        close();
      });
      child.on("close", (code) => {
        if (killed) push("[stopped]\n");
        else push(`[udp-proto-scanner exit ${code ?? "unknown"}]\n`);
        if (!killed && code === 0) {
          push("A named service means that probe got a reply. Silence on a probe means that service did not answer. This is not a list of open ports.\n");
        }
        close();
      });
    },
    cancel() {
      kill();
    },
  });
}

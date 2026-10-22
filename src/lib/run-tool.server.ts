import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const BINS = new Set([
  "hashcat",
  "john",
  "ssh2john",
  "unshadow",
  "zip2john",
  "rar2john",
  "7z2john",
  "keepass2john",
  "office2john",
  "pdf2john",
  "pfx2john",
  "putty2john",
]);

const SHELL = /[;&|`$<>\\\n\r\0]/;
const NAME = /^[A-Za-z0-9._-]{1,80}$/;
const MAX_OUT = 500_000;
const TIMEOUT_MS = 10 * 60 * 1000;

export type ToolStep =
  | { kind: "write"; name: string; text: string }
  | { kind: "exec"; bin: string; args: string[] }
  | { kind: "exec-to-file"; bin: string; args: string[]; name: string };

function argOk(arg: unknown): arg is string {
  return (
    typeof arg === "string" &&
    arg.length > 0 &&
    arg.length <= 500 &&
    !SHELL.test(arg) &&
    !arg.split(/[\\/]/).includes("..")
  );
}

export function stepsOk(value: unknown): value is ToolStep[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 6) return false;
  return value.every((step) => {
    if (!step || typeof step !== "object") return false;
    const item = step as ToolStep;
    if (item.kind === "write") {
      return NAME.test(item.name) && typeof item.text === "string" && item.text.length <= 256_000 && !item.text.includes("\0");
    }
    if ((item.kind === "exec" || item.kind === "exec-to-file") && BINS.has(item.bin)) {
      if (!Array.isArray(item.args) || item.args.length < 1 || item.args.length > 40 || !item.args.every(argOk)) return false;
      return item.kind === "exec" || NAME.test(item.name);
    }
    return false;
  });
}

export function streamSteps(steps: ToolStep[], signal: AbortSignal): ReadableStream<Uint8Array> {
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
    async start(controller) {
      const push = (text: string) => {
        if (!text || sent >= MAX_OUT) return;
        const slice = text.slice(0, MAX_OUT - sent);
        sent += slice.length;
        controller.enqueue(encoder.encode(slice));
        if (sent >= MAX_OUT) kill();
      };
      try {
        for (const step of steps) {
          if (killed) break;
          if (step.kind === "write") {
            await writeFile(path.join(process.cwd(), step.name), step.text);
            push(`wrote ${step.name} (${step.text.length} bytes)\n`);
            continue;
          }
          push(`$ ${step.bin} ${step.args.join(" ")}\n`);
          let captured = "";
          const code = await new Promise<number | null>((resolve) => {
            child = spawn(step.bin, step.args, { shell: false, stdio: ["ignore", "pipe", "pipe"] });
            let settled = false;
            const done = (value: number | null) => {
              if (settled) return;
              settled = true;
              resolve(value);
            };
            child.stdout?.on("data", (buf: Buffer) => {
              const text = buf.toString();
              if (step.kind === "exec") push(text);
              else captured += text;
            });
            child.stderr?.on("data", (buf: Buffer) => push(buf.toString()));
            child.on("error", (err: NodeJS.ErrnoException) => {
              push(
                err.code === "ENOENT"
                  ? `${step.bin} was not found. Run the desk on Kali, where it is already installed.\n`
                  : `${err.message}\n`,
              );
              done(null);
            });
            child.on("close", (exitCode) => done(exitCode));
          });
          child = null;
          if (step.kind === "exec-to-file") {
            await writeFile(path.join(process.cwd(), step.name), captured);
            if (captured) push(captured.endsWith("\n") ? captured : `${captured}\n`);
            push(`wrote ${step.name}\n`);
            if (code !== 0) {
              push(`[${step.bin} exit ${code ?? "unknown"}]\n`);
              break;
            }
          }
          push(`[${step.bin} exit ${code ?? "unknown"}]\n`);
        }
      } catch (err) {
        push(err instanceof Error ? `${err.message}\n` : "The run failed.\n");
      } finally {
        clearTimeout(timer);
        if (killed) push("[stopped]\n");
        controller.close();
      }
    },
    cancel() {
      kill();
    },
  });
}

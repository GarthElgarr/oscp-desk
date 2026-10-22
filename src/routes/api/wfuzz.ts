import { createFileRoute } from "@tanstack/react-router";
import { spawn } from "node:child_process";
import { wfuzzArgsOk } from "@/lib/wfuzz-args";

const MAX_OUT = 300_000;
const TIMEOUT_MS = 5 * 60 * 1000;

function visible(text: string): string {
  return text.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "").replace(/\r(?!\n)/g, "\n");
}

export const Route = createFileRoute("/api/wfuzz")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("The request was not JSON.\n", { status: 400 });
        }
        const args = (body as { args?: unknown }).args;
        if (!wfuzzArgsOk(args)) {
          return new Response("Those arguments are not a wfuzz command this desk will run.\n", { status: 400 });
        }
        const child = spawn("wfuzz", args, { shell: false, stdio: ["ignore", "pipe", "pipe"] });
        const encoder = new TextEncoder();
        let sent = 0;
        let killed = false;
        let closed = false;
        const kill = () => {
          if (killed) return;
          killed = true;
          child.kill("SIGTERM");
        };
        const timer = setTimeout(kill, TIMEOUT_MS);
        request.signal.addEventListener("abort", kill);
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            const close = (line: string) => {
              if (closed) return;
              closed = true;
              clearTimeout(timer);
              try {
                controller.enqueue(encoder.encode(line));
                controller.close();
              } catch {
                /* already closed */
              }
            };
            const push = (chunk: Buffer | string) => {
              if (closed || sent >= MAX_OUT) {
                kill();
                return;
              }
              const text = visible(typeof chunk === "string" ? chunk : chunk.toString());
              const room = MAX_OUT - sent;
              sent += text.length;
              try {
                controller.enqueue(encoder.encode(text.slice(0, room)));
              } catch {
                killed = true;
              }
            };
            child.stdout?.on("data", push);
            child.stderr?.on("data", push);
            child.on("error", (err: NodeJS.ErrnoException) => {
              push(
                err.code === "ENOENT"
                  ? "wfuzz was not found. On Kali, the install button includes it.\n"
                  : `${err.message}\n`,
              );
              close("\n[stopped]\n");
            });
            child.on("close", (code) => {
              close(killed ? "\n[stopped]\n" : `\n[wfuzz exit ${code ?? "unknown"}]\n`);
            });
          },
          cancel() {
            kill();
          },
        });
        return new Response(stream, {
          headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
        });
      },
    },
  },
});

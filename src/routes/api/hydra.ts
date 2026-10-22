import { createFileRoute } from "@tanstack/react-router";
import { spawn } from "node:child_process";
import { hydraArgsOk } from "@/lib/hydra-args";

const MAX_OUT = 200_000;
const TIMEOUT_MS = 180_000;

export const Route = createFileRoute("/api/hydra")({
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
        if (!hydraArgsOk(args)) {
          return new Response("Those arguments are not a hydra command this desk will run.\n", { status: 400 });
        }
        const child = spawn("hydra", args, { shell: false, stdio: ["ignore", "pipe", "pipe"] });
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
            const finish = (line: string) => {
              if (closed) return;
              closed = true;
              clearTimeout(timer);
              controller.enqueue(encoder.encode(line));
              controller.close();
            };
            const push = (chunk: Buffer | string) => {
              if (closed || sent >= MAX_OUT) {
                kill();
                return;
              }
              const text = typeof chunk === "string" ? chunk : chunk.toString();
              sent += text.length;
              controller.enqueue(encoder.encode(text.slice(0, MAX_OUT - (sent - text.length))));
            };
            child.stdout?.on("data", push);
            child.stderr?.on("data", push);
            child.on("error", (err: NodeJS.ErrnoException) => {
              const missing = err.code === "ENOENT";
              push(
                missing
                  ? "hydra was not found on this machine. Run the desk on Kali, where hydra is already installed.\n"
                  : `${err.message}\n`,
              );
            });
            child.on("close", (code) => {
              if (killed && code === null) finish("\n[stopped]\n");
              else finish(`\n[exit ${code ?? "unknown"}]\n`);
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

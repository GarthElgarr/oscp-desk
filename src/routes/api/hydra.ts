import { createFileRoute } from "@tanstack/react-router";
import { hydraArgsOk } from "@/lib/hydra-args";
import { jobId, spawnLiveJob } from "@/lib/live-jobs.server";

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
        if (!hydraArgsOk(args)) return new Response("Those arguments are not a hydra command this desk will run.\n", { status: 400 });
        const id = jobId((body as { id?: unknown }).id);
        if (!id) return new Response("The scan id is missing.\n", { status: 400 });
        const command = ["hydra", ...args].join(" ");
        const started = spawnLiveJob({
          id,
          tool: "hydra",
          title: command.slice(0, 80),
          command,
          bin: "hydra",
          args,
          timeoutMs: 180_000,
          maxOut: 200_000,
          missing: "hydra was not found on this machine. Run the desk on Kali, where hydra is already installed.\n",
          doneLine: (code, stopped) => (stopped ? "\n[stopped]\n" : `\n[exit ${code ?? "unknown"}]\n`),
        });
        if (!started) return new Response("Too many scans are already running. Stop one before starting another.\n", { status: 429 });
        return Response.json({ ok: true });
      },
    },
  },
});
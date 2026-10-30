import { createFileRoute } from "@tanstack/react-router";
import { jobId, spawnLiveJob } from "@/lib/live-jobs.server";
import { wfuzzArgsOk } from "@/lib/wfuzz-args";

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
        if (!wfuzzArgsOk(args)) return new Response("Those arguments are not a wfuzz command this desk will run.\n", { status: 400 });
        const id = jobId((body as { id?: unknown }).id);
        if (!id) return new Response("The scan id is missing.\n", { status: 400 });
        const command = ["wfuzz", ...args].join(" ");
        const started = spawnLiveJob({
          id,
          tool: "wfuzz",
          title: command.slice(0, 80),
          command,
          bin: "wfuzz",
          args,
          timeoutMs: 5 * 60 * 1000,
          maxOut: 300_000,
          tty: true,
          env: { ...process.env, PYTHONWARNINGS: "ignore:Pycurl is not compiled:UserWarning" },
          missing: "wfuzz was not found. On Kali, the install button includes wfuzz.\n",
          doneLine: (code, stopped) => (stopped ? "\n[stopped]\n" : `\n[exit ${code ?? "unknown"}]\n`),
        });
        if (!started) return new Response("Too many scans are already running. Stop one before starting another.\n", { status: 429 });
        return Response.json({ ok: true });
      },
    },
  },
});
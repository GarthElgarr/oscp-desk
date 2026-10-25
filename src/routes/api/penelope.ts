import { createFileRoute } from "@tanstack/react-router";
import { jobId } from "@/lib/live-jobs.server";
import { killPenelope, penelopeRequest, startPenelope } from "@/lib/penelope.server";

export const Route = createFileRoute("/api/penelope")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("The request was not JSON.\n", { status: 400 });
        }
        const row = body as { kill?: unknown; port?: unknown; id?: unknown };
        if (row.kill === true) {
          const port = typeof row.port === "string" ? row.port : "";
          return new Response(killPenelope(port), { headers: { "content-type": "text/plain; charset=utf-8" } });
        }
        const plan = penelopeRequest(body);
        if ("error" in plan) return new Response(`${plan.error}\n`, { status: 400 });
        const id = jobId(row.id);
        if (!id) return new Response("The scan id is missing.\n", { status: 400 });
        const started = startPenelope(id, plan.command, plan.args);
        if (started === false) return new Response("Too many scans are already running. Stop one before starting another.\n", { status: 429 });
        if (typeof started === "string") return new Response(started, { status: 400 });
        return Response.json({ ok: true });
      },
    },
  },
});

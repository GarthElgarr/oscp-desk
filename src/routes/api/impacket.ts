import { createFileRoute } from "@tanstack/react-router";
import { impacketRequest, startImpacket } from "@/lib/impacket.server";
import { jobId } from "@/lib/live-jobs.server";

export const Route = createFileRoute("/api/impacket")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("The request was not JSON.\n", { status: 400 });
        }
        const plan = impacketRequest(body);
        if ("error" in plan) return new Response(`${plan.error}\n`, { status: 400 });
        const id = jobId((body as { id?: unknown }).id);
        if (!id) return new Response("The scan id is missing.\n", { status: 400 });
        if (!startImpacket(id, plan.bin, plan.args, plan.command)) {
          return new Response("Too many scans are already running. Stop one before starting another.\n", { status: 429 });
        }
        return Response.json({ ok: true });
      },
    },
  },
});

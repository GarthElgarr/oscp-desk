import { createFileRoute } from "@tanstack/react-router";
import { jobId } from "@/lib/live-jobs.server";
import { startSuggest, suggestRequest } from "@/lib/suggest.server";

export const Route = createFileRoute("/api/suggest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("The request was not JSON.\n", { status: 400 });
        }
        const plan = suggestRequest(body);
        if ("error" in plan) return new Response(`${plan.error}\n`, { status: 400 });
        const id = jobId((body as { id?: unknown }).id);
        if (!id) return new Response("The scan id is missing.\n", { status: 400 });
        if (!startSuggest(id, plan)) return new Response("Too many scans are already running. Stop one before starting another.\n", { status: 429 });
        return Response.json({ ok: true });
      },
    },
  },
});

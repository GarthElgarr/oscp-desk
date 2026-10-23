import { createFileRoute } from "@tanstack/react-router";
import { jobId } from "@/lib/live-jobs.server";
import { startInstall } from "@/lib/install-tools.server";

export const Route = createFileRoute("/api/install")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown = {};
        try {
          body = await request.json();
        } catch {
          body = {};
        }
        const id = jobId((body as { id?: unknown }).id);
        if (!id) return new Response("The scan id is missing.\n", { status: 400 });
        if (!startInstall(id)) return new Response("Too many scans are already running. Stop one before starting another.\n", { status: 429 });
        return Response.json({ ok: true });
      },
    },
  },
});
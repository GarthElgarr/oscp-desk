import { createFileRoute } from "@tanstack/react-router";
import { clearJobs, clearScanFiles, jobId, listJobs, removeJob, stopJob } from "@/lib/live-jobs.server";

export const Route = createFileRoute("/api/jobs")({
  server: {
    handlers: {
      GET: async () => Response.json({ jobs: listJobs() }),
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("The request was not JSON.\n", { status: 400 });
        }
        const row = body as { stop?: unknown; remove?: unknown; clear?: unknown };
        if (row.clear === true) {
          clearJobs();
          clearScanFiles();
          return Response.json({ jobs: [] });
        }
        const id = jobId(row.stop ?? row.remove);
        if (!id) return new Response("That scan id is not valid.\n", { status: 400 });
        if (row.remove) removeJob(id);
        else stopJob(id);
        return Response.json({ jobs: listJobs() });
      },
    },
  },
});

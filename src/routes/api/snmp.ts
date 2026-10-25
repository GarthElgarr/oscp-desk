import { createFileRoute } from "@tanstack/react-router";
import { jobId } from "@/lib/live-jobs.server";
import { snmpRequest, startSnmp } from "@/lib/snmp.server";

export const Route = createFileRoute("/api/snmp")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("The request was not JSON.\n", { status: 400 });
        }
        const job = snmpRequest(body);
        if ("error" in job) return new Response(`${job.error}\n`, { status: 400 });
        const id = jobId((body as { id?: unknown }).id);
        if (!id) return new Response("The scan id is missing.\n", { status: 400 });
        if (!startSnmp(id, job)) {
          return new Response("Too many scans are already running. Stop one before starting another.\n", { status: 429 });
        }
        return Response.json({ ok: true });
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { adRequest, startAd } from "@/lib/ad.server";
import { ipv4Targets, namedTargets } from "@/lib/exam-block";
import { jobId } from "@/lib/live-jobs.server";
import { examGuard } from "@/lib/scope-guard.server";

export const Route = createFileRoute("/api/ad")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("The request was not JSON.\n", { status: 400 });
        }
        const plan = adRequest(body);
        if ("error" in plan) return new Response(`${plan.error}\n`, { status: 400 });
        const id = jobId((body as { id?: unknown }).id);
        if (!id) return new Response("The scan id is missing.\n", { status: 400 });
        const row = body as { dc?: unknown };
        const blocked = examGuard([...namedTargets(row.dc), ...ipv4Targets(plan.args)], plan.command);
        if (blocked) return new Response(`${blocked}\n`, { status: 403 });
        if (!startAd(id, plan.bin, plan.args, plan.command, plan.mode)) {
          return new Response("Too many scans are already running. Stop one before starting another.\n", { status: 429 });
        }
        return Response.json({ ok: true });
      },
    },
  },
});

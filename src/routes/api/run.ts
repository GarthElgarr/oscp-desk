import { createFileRoute } from "@tanstack/react-router";
import { jobId } from "@/lib/live-jobs.server";
import { startSteps, stepsOk } from "@/lib/run-tool.server";

export const Route = createFileRoute("/api/run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("The request was not JSON.\n", { status: 400 });
        }
        const steps = (body as { steps?: unknown }).steps;
        if (!stepsOk(steps)) return new Response("Those arguments are not a john or hashcat command this desk will run.\n", { status: 400 });
        const id = jobId((body as { id?: unknown }).id);
        if (!id) return new Response("The scan id is missing.\n", { status: 400 });
        const requested = (body as { tool?: unknown }).tool;
        const tool = requested === "hashcat" || requested === "john" ? requested : "crack";
        const first = steps.find((step) => step.kind !== "write");
        const title = first ? `${first.bin} ${first.args.slice(0, 4).join(" ")}` : tool;
        if (!startSteps(id, tool, title, steps)) return new Response("Too many scans are already running. Stop one before starting another.\n", { status: 429 });
        return Response.json({ ok: true });
      },
    },
  },
});
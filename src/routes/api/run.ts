import { createFileRoute } from "@tanstack/react-router";
import { stepsOk, streamSteps } from "@/lib/run-tool.server";

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
        if (!stepsOk(steps)) {
          return new Response("Those arguments are not a john or hashcat command this desk will run.\n", { status: 400 });
        }
        return new Response(streamSteps(steps, request.signal), {
          headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
        });
      },
    },
  },
});

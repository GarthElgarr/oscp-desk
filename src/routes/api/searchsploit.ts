import { createFileRoute } from "@tanstack/react-router";
import { searchsploitRequest, searchsploitStream } from "@/lib/searchsploit.server";

export const Route = createFileRoute("/api/searchsploit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("The request was not JSON.\n", { status: 400 });
        }
        const job = searchsploitRequest(body);
        if ("error" in job) return new Response(`${job.error}\n`, { status: 400 });
        return new Response(searchsploitStream(job.command, job.args, request.signal), {
          headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
        });
      },
    },
  },
});

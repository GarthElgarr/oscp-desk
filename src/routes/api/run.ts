import { createFileRoute } from "@tanstack/react-router";
import { runHttp } from "@/lib/run-tool.server";

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
        return runHttp(body);
      },
    },
  },
});
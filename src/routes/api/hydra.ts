import { createFileRoute } from "@tanstack/react-router";
import { hydraHttp } from "@/lib/hydra.server";

export const Route = createFileRoute("/api/hydra")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("The request was not JSON.\n", { status: 400 });
        }
        return hydraHttp(body);
      },
    },
  },
});
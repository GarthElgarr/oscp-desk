import { createFileRoute } from "@tanstack/react-router";
import { adHttp } from "@/lib/ad.server";

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
        return adHttp(body);
      },
    },
  },
});

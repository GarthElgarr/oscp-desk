import { createFileRoute } from "@tanstack/react-router";
import { impacketHttp } from "@/lib/impacket.server";

export const Route = createFileRoute("/api/impacket")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("The request was not JSON.\n", { status: 400 });
        }
        return impacketHttp(body);
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { wfuzzHttp } from "@/lib/wfuzz.server";

export const Route = createFileRoute("/api/wfuzz")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("The request was not JSON.\n", { status: 400 });
        }
        return wfuzzHttp(body);
      },
    },
  },
});
import { createFileRoute } from "@tanstack/react-router";
import { installRequirementsStream } from "@/lib/install-tools.server";

export const Route = createFileRoute("/api/install")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        return new Response(installRequirementsStream(request.signal), {
          headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
        });
      },
    },
  },
});

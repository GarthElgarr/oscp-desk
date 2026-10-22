import { createFileRoute } from "@tanstack/react-router";
import { udpRequest, udpScanStream } from "@/lib/udp-scan.server";

export const Route = createFileRoute("/api/udp")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("The request was not JSON.\n", { status: 400 });
        }
        const scan = udpRequest(body);
        if (!scan) {
          return new Response("Give one IPv4 address and a probe name. This page only runs Cisco's udp-proto-scanner.\n", {
            status: 400,
          });
        }
        return new Response(udpScanStream(scan.command, scan.args, request.signal), {
          headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
        });
      },
    },
  },
});

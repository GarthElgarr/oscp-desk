import { createFileRoute } from "@tanstack/react-router";
import { listScanNames, nmapRequest, nmapScanStream, readScanXml } from "@/lib/nmap-scan.server";

export const Route = createFileRoute("/api/nmap")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const name = new URL(request.url).searchParams.get("name");
        if (!name) return Response.json({ names: listScanNames() });
        const xml = readScanXml(name);
        if (xml === null) return new Response("That scan is not in the scans folder.\n", { status: 404 });
        return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "no-store" } });
      },
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("The request was not JSON.\n", { status: 400 });
        }
        const scan = nmapRequest(body);
        if ("error" in scan) return new Response(`${scan.error}\n`, { status: 400 });
        const stream = nmapScanStream(scan.command, scan.bin, scan.args, scan.profile, request.signal);
        if (!stream) {
          return new Response("Four scans are already running. Stop one before starting another.\n", { status: 429 });
        }
        return new Response(stream, {
          headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
        });
      },
    },
  },
});

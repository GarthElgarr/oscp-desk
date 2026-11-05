import { createFileRoute } from "@tanstack/react-router";
import { nmapReportHtml } from "@/lib/nmap-html";
import { listScanNames, nmapHttp, readScanXml } from "@/lib/nmap-scan.server";

export const Route = createFileRoute("/api/nmap")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const name = url.searchParams.get("name");
        if (!name) return Response.json({ names: listScanNames() });
        const xml = readScanXml(name);
        if (xml === null) return new Response("That scan is not in the scans folder.\n", { status: 404 });
        if (url.searchParams.get("html") === "1") {
          return new Response(nmapReportHtml(xml, name), {
            headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
          });
        }
        return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "no-store" } });
      },
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("The request was not JSON.\n", { status: 400 });
        }
        return nmapHttp(body);
      },
    },
  },
});
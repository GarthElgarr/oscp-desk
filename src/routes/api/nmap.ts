import { createFileRoute } from "@tanstack/react-router";
import { jobId } from "@/lib/live-jobs.server";
import { nmapReportHtml } from "@/lib/nmap-html";
import { listScanNames, nmapRequest, readScanXml, startNmapScan } from "@/lib/nmap-scan.server";

const TITLES = { quick: "1. Quick TCP", alltcp: "2. All TCP", udp: "3. UDP top 20", deep: "4. Deep", custom: "Custom" };

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
        const scan = nmapRequest(body);
        if ("error" in scan) return new Response(`${scan.error}\n`, { status: 400 });
        const id = jobId((body as { id?: unknown }).id);
        if (!id) return new Response("The scan id is missing.\n", { status: 400 });
        const title = `${TITLES[scan.profile]} ${scan.args[scan.args.length - 1]}`;
        const name = scan.args[scan.args.indexOf("-oA") + 1]?.split("/").pop() ?? "scan";
        const started = startNmapScan(scan.command, scan.bin, scan.args, scan.profile, { id, name, title });
        if (!started) return new Response("Too many scans are already running. Stop one before starting another.\n", { status: 429 });
        return Response.json({ ok: true });
      },
    },
  },
});
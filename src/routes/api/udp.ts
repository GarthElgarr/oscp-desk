import { createFileRoute } from "@tanstack/react-router";
import { namedTargets } from "@/lib/exam-block";
import { jobId } from "@/lib/live-jobs.server";
import { examGuard } from "@/lib/scope-guard.server";
import { startUdpScan, udpRequest } from "@/lib/udp-scan.server";

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
          return new Response("Give one IPv4 address and a probe name. This page only runs Cisco's udp-proto-scanner.\n", { status: 400 });
        }
        const id = jobId((body as { id?: unknown }).id);
        if (!id) return new Response("The scan id is missing.\n", { status: 400 });
        const blocked = examGuard(namedTargets((body as { target?: unknown }).target), scan.command);
        if (blocked) return new Response(`${blocked}\n`, { status: 403 });
        if (!startUdpScan(id, scan.command, scan.args)) {
          return new Response("Too many scans are already running. Stop one before starting another.\n", { status: 429 });
        }
        return Response.json({ ok: true });
      },
    },
  },
});
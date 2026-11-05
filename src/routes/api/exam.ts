import { createFileRoute } from "@tanstack/react-router";
import { examApiBody } from "@/lib/exam-ledger";
import { readLedger, updateLedger } from "@/lib/exam-ledger.server";

export const Route = createFileRoute("/api/exam")({
  server: {
    handlers: {
      GET: async () => {
        const ledger = readLedger();
        if (!ledger) return new Response("The exam ledger file is not valid. Restore a backup.\n", { status: 500 });
        return Response.json(ledger);
      },
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("The request was not JSON.\n", { status: 400 });
        }
        const result = await updateLedger(body);
        const http = examApiBody(result);
        return Response.json(http.json, { status: http.status });
      },
    },
  },
});

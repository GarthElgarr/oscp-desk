import { createFileRoute } from "@tanstack/react-router";
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
        if (result.error) return Response.json({ error: result.error, ledger: result.ledger }, { status: 400 });
        return Response.json(result.ledger);
      },
    },
  },
});

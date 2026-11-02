import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/revshells/raw/$")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        const rawName = params._splat ?? "";
        let name = rawName;
        try {
          name = decodeURIComponent(rawName);
        } catch {
          name = rawName;
        }
        const { rawShellFromQuery } = await import("@/lib/revshell-raw.server");
        const text = rawShellFromQuery({
          name,
          ip: url.searchParams.get("ip") ?? "",
          port: url.searchParams.get("port") ?? "",
          shell: url.searchParams.get("shell") ?? "",
          value: url.searchParams.get("value"),
        });
        if (text == null) {
          return new Response("Command name not found\n", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
        }
        return new Response(text, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
      },
    },
  },
});

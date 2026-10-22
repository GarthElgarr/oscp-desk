import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/files/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const rel = params._splat ?? "";
        const { readUpload } = await import("@/lib/uploads.server");
        const file = await readUpload(rel);
        if (!file) return new Response("Not found", { status: 404 });
        const filename = file.name.replace(/["\r\n]/g, "");
        return new Response(new Uint8Array(file.bytes), {
          headers: {
            "content-type": "application/octet-stream",
            "content-length": String(file.bytes.byteLength),
            "content-disposition": `attachment; filename="${filename}"`,
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});

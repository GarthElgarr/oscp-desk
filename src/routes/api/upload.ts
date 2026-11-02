import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return new Response("The upload was not a file.\n", { status: 400 });
        }
        const { saveUpload } = await import("@/lib/uploads.server");
        const saved: string[] = [];
        const errors: string[] = [];
        for (const item of form.getAll("file")) {
          if (!(item instanceof File)) continue;
          const bytes = Buffer.from(await item.arrayBuffer());
          const result = await saveUpload(item.name, bytes);
          if ("error" in result) errors.push(result.error);
          else saved.push(result.name);
        }
        if (saved.length === 0) {
          return new Response(`${errors[0] ?? "Choose a file."}\n`, { status: 400 });
        }
        return Response.json({ ok: true, saved, errors });
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { saveUpload, uploadLengthStatus, UPLOAD_BATCH_CAP } = await import("@/lib/uploads.server");
        const lengthStatus = uploadLengthStatus(request.headers.get("content-length"));
        if (lengthStatus === 411) return new Response("Send the upload with a length.\n", { status: 411 });
        if (lengthStatus === 413) return new Response("That upload is over 210 MB.\n", { status: 413 });
        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return new Response("The upload was not a file.\n", { status: 400 });
        }
        const files = form.getAll("file").filter((item): item is File => item instanceof File);
        if (files.length > UPLOAD_BATCH_CAP) return new Response("Ten files at a time.\n", { status: 400 });
        const overwrite = form.get("overwrite") === "1";
        const saved: string[] = [];
        const errors: string[] = [];
        for (const item of files) {
          const bytes = Buffer.from(await item.arrayBuffer());
          const result = await saveUpload(item.name, bytes, overwrite);
          if ("error" in result) errors.push(result.error);
          else saved.push(result.name);
        }
        if (saved.length === 0) {
          return new Response(`${errors[0] ?? "Choose a file."}\n`, { status: 400 });
        }
        return Response.json({ ok: true, saved, errors });
      },
      DELETE: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("The request was not JSON.\n", { status: 400 });
        }
        const name = body && typeof body === "object" && "name" in body && typeof body.name === "string" ? body.name : "";
        const { removeUpload } = await import("@/lib/uploads.server");
        const result = await removeUpload(name);
        if ("error" in result) return new Response(`${result.error}\n`, { status: 400 });
        return Response.json({ ok: true, name: result.name });
      },
    },
  },
});

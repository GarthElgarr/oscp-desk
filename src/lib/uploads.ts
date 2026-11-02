import { createServerFn } from "@tanstack/react-start";
import type { UploadFile } from "./uploads.server";

export type UploadsListing = {
  root: string;
  files: UploadFile[];
  note: string;
};

export const listUploadFiles = createServerFn({ method: "GET" }).handler(async (): Promise<UploadsListing> => {
  const { listUploads } = await import("./uploads.server");
  const { ensureStandardUploads } = await import("./peas.server");
  const peas = await ensureStandardUploads(false);
  const listing = await listUploads();
  const failed = peas.lines.filter((line) => !/: (already|saved )/.test(line));
  const saved = peas.lines.filter((line) => /: saved /.test(line));
  const note = failed.length ? failed.join(" ") : saved.length ? saved.join(" ") : "";
  return { ...listing, note };
});

export const updateStandardPeas = createServerFn({ method: "POST" }).handler(async (): Promise<UploadsListing> => {
  const { listUploads } = await import("./uploads.server");
  const { ensureStandardUploads } = await import("./peas.server");
  const peas = await ensureStandardUploads(true);
  const listing = await listUploads();
  return { ...listing, note: peas.lines.join(" ") };
});

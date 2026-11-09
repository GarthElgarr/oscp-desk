import { createServerFn } from "@tanstack/react-start";
import type { UploadFile } from "./uploads.server";

export type UploadsListing = {
  root: string;
  files: UploadFile[];
  note: string;
  hostOk: boolean;
  hostError: string;
  hostPort: number;
};

export const listUploadFiles = createServerFn({ method: "GET" }).handler(async (): Promise<UploadsListing> => {
  const { listUploads } = await import("./uploads.server");
  const { fileHostStatus } = await import("./file-host.server");
  const { ensureStandardUploads } = await import("./peas.server");
  const peas = await ensureStandardUploads(false);
  const listing = await listUploads();
  const host = await fileHostStatus();
  const failed = peas.lines.filter((line) => !/: (already|saved )/.test(line));
  const saved = peas.lines.filter((line) => /: saved /.test(line));
  const note = failed.length ? failed.join(" ") : saved.length ? saved.join(" ") : "";
  return { ...listing, note, hostOk: host.ok, hostError: host.error, hostPort: host.port };
});

export const updateStandardPeas = createServerFn({ method: "POST" }).handler(async (): Promise<UploadsListing> => {
  const { listUploads } = await import("./uploads.server");
  const { fileHostStatus } = await import("./file-host.server");
  const { ensureStandardUploads } = await import("./peas.server");
  const peas = await ensureStandardUploads(true);
  const listing = await listUploads();
  const host = await fileHostStatus();
  return { ...listing, note: peas.lines.join(" "), hostOk: host.ok, hostError: host.error, hostPort: host.port };
});

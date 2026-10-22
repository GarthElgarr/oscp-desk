import { createServerFn } from "@tanstack/react-start";
import type { UploadFile } from "./uploads.server";

export type UploadsListing = {
  root: string;
  files: UploadFile[];
};

export const listUploadFiles = createServerFn({ method: "GET" }).handler(
  async (): Promise<UploadsListing> => {
    const { listUploads } = await import("./uploads.server");
    return listUploads();
  },
);

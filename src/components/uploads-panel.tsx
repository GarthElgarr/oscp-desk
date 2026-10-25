import { useEffect, useMemo, useState } from "react";
import { Copy, RefreshCw } from "lucide-react";
import { listUploadFiles, type UploadsListing } from "@/lib/uploads";
import { transferPlan, type TransferClient, type TransferOs } from "@/lib/transfer-plan";

const control = "min-h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg outline-none";

function formatSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadsPanel() {
  const [listing, setListing] = useState<UploadsListing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [host, setHost] = useState("");
  const [port, setPort] = useState("8080");
  const [file, setFile] = useState("");
  const [os, setOs] = useState<TransferOs>("windows");
  const [client, setClient] = useState<TransferClient>("certutil");
  const [copied, setCopied] = useState(false);

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

  const plan = useMemo(() => transferPlan({ host, port, file, os, client }), [host, port, file, os, client]);
  const ready = !("error" in plan);

  function pickOs(next: TransferOs) {
    setOs(next);
    setClient(next === "windows" ? "certutil" : "curl");
  }

  async function copy() {
    if (!ready) return;
    try {
      await navigator.clipboard.writeText(plan.command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <article id="panel-uploads" className="min-w-0 scroll-mt-4 overflow-hidden rounded-lg border border-primary bg-surface">
      <div className="border-b border-border px-4 py-3">
        <p className="font-mono text-xs text-primary">Transfer</p>
        <h2 className="text-lg font-semibold">Pull a file onto the target</h2>
        <p className="mt-1 text-sm text-muted">
          Put the file in the uploads folder, then paste this on the target. The address is your tun0 address. 127.0.0.1 is this desk, and the target cannot reach it. Nothing here is executed.
        </p>
      </div>
      <div className="flex flex-col gap-4 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="min-w-0 break-all font-mono text-xs text-muted">{listing ? listing.root : "Reading the folder"}</p>
          <button type="button" onClick={() => void load()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-bg px-3 text-sm text-muted">
            <RefreshCw className="size-4" aria-hidden="true" />
            Refresh
          </button>
        </div>
        {error ? <p className="text-sm text-dead">{error}</p> : null}
        {listing && listing.files.length === 0 ? <p className="text-sm text-muted">The folder is empty. Copy a file into it and refresh.</p> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-mono text-xs tracking-wide text-muted">FILE</span>
            <select className={control} value={file} onChange={(event) => setFile(event.target.value)}>
              <option value="">Choose a file</option>
              {listing?.files.map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name} ({formatSize(item.size)})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-mono text-xs tracking-wide text-muted">TUN0 ADDRESS</span>
            <input className={control} value={host} onChange={(event) => setHost(event.target.value.trim())} placeholder="10.10.14.5" spellCheck={false} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-mono text-xs tracking-wide text-muted">PORT</span>
            <input className={control} value={port} onChange={(event) => setPort(event.target.value.trim())} spellCheck={false} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-mono text-xs tracking-wide text-muted">TARGET</span>
            <select className={control} value={os} onChange={(event) => pickOs(event.target.value === "linux" ? "linux" : "windows")}>
              <option value="windows">Windows</option>
              <option value="linux">Linux</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-mono text-xs tracking-wide text-muted">CLIENT</span>
            <select className={control} value={client} onChange={(event) => setClient(event.target.value as TransferClient)}>
              {os === "windows" ? (
                <>
                  <option value="certutil">certutil</option>
                  <option value="iwr">PowerShell IWR</option>
                </>
              ) : (
                <>
                  <option value="curl">curl</option>
                  <option value="wget">wget</option>
                </>
              )}
            </select>
          </label>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-xs tracking-wide text-muted">PASTE ON THE TARGET</p>
          <button type="button" onClick={() => void copy()} disabled={!ready} className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs text-muted disabled:opacity-40">
            <Copy className="size-3.5" aria-hidden="true" />
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="whitespace-pre-wrap break-all rounded-lg bg-bg p-3 font-mono text-xs leading-relaxed text-fg">{ready ? plan.command : plan.error}</pre>
        {ready ? <p className="text-sm text-fg">{plan.why}</p> : null}
      </div>
    </article>
  );
}

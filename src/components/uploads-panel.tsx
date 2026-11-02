import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Copy, RefreshCw } from "lucide-react";
import { listUploadFiles, updateStandardPeas, type UploadsListing } from "@/lib/uploads";
import { transferPlan, type TransferClient, type TransferOs } from "@/lib/transfer-plan";
import { getGlobals, getGlobalsServer, subscribeGlobals } from "@/lib/desk-globals";
import { useGlobalField } from "@/lib/use-global-field";

const control = "min-h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg outline-none";

function formatSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadsPanel() {
  const globals = useSyncExternalStore(subscribeGlobals, getGlobals, getGlobalsServer);
  const [listing, setListing] = useState<UploadsListing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [host, setHost] = useGlobalField(globals.localIp);
  const [port, setPort] = useState("80");
  const [file, setFile] = useState("");
  const [os, setOs] = useState<TransferOs>("windows");
  const [client, setClient] = useState<TransferClient>("certutil");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState("");
  const picker = useRef<HTMLInputElement>(null);

  async function load(update = false) {
    setError(null);
    setBusy(update ? "Updating the standard files." : "");
    try {
      setListing(update ? await updateStandardPeas() : await listUploadFiles());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read the folder");
    } finally {
      setBusy("");
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

  async function uploadChosen(list: FileList | null) {
    if (!list?.length) return;
    setError(null);
    setBusy("Uploading.");
    const body = new FormData();
    for (const item of list) body.append("file", item);
    try {
      const response = await fetch("/api/upload", { method: "POST", body });
      const text = await response.text();
      if (!response.ok) {
        setError(text.trim() || "The upload failed.");
        return;
      }
      await load(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The upload failed.");
    } finally {
      setBusy("");
      if (picker.current) picker.current.value = "";
    }
  }

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
          Put the file in the uploads folder, or use Upload for file transfer. Port 80 serves that folder, so anyone who can reach this machine on port 80 can download the files. Paste the command on the target. The address is your tun0 address. 127.0.0.1 is this desk, and the target cannot reach it. linpeas, winpeas, chisel, and the Ligolo agent are fetched into this folder when it is opened. The tunnel builder uses the names chisel, chisel.exe, agent, and agent.exe. Nothing here is executed.
        </p>
      </div>
      <div className="flex flex-col gap-4 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="min-w-0 break-all font-mono text-xs text-muted">{listing ? listing.root : busy || "Reading the folder. Standard files are added if they are missing."}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => picker.current?.click()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-primary bg-raised px-3 text-sm text-fg">
              Upload for file transfer
            </button>
            <input ref={picker} type="file" multiple className="hidden" onChange={(event) => void uploadChosen(event.target.files)} />
            <button type="button" onClick={() => void load(false)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-bg px-3 text-sm text-muted">
              <RefreshCw className="size-4" aria-hidden="true" />
              Refresh
            </button>
            <button type="button" onClick={() => void load(true)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-bg px-3 text-sm text-fg">
              Update standard files
            </button>
          </div>
        </div>
        {listing ? (
          <p className={listing.hostOk ? "text-sm text-alive" : "text-sm text-dead"}>
            {listing.hostOk
              ? "Port 80 is serving this folder. Anyone who can reach this machine on port 80 can download these files."
              : `Port 80 is not serving the folder. Start the desk as root, and make sure nothing else is using port 80. ${listing.hostError}`}
          </p>
        ) : null}
        {error ? <p className="text-sm text-dead">{error}</p> : null}
        {busy ? <p className="text-sm text-muted">{busy}</p> : null}
        {listing?.note ? <p className="text-sm text-muted">{listing.note}</p> : null}
        {listing && listing.files.length === 0 ? <p className="text-sm text-muted">The folder is empty. The standard files did not download. Press Update standard files, or copy a file in and refresh.</p> : null}
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

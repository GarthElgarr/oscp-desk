import { useMemo, useState } from "react";
import { Copy } from "lucide-react";
import { basicList, type BasicPairing } from "@/lib/basic-list";
import { lootLines } from "@/lib/loot";

const control = "min-h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg outline-none";
const area = "min-h-28 w-full rounded-lg border border-border bg-bg px-3 py-2 font-mono text-sm text-fg outline-none";
const MAX_FILE = 200_000;

export function BasicList() {
  const [users, setUsers] = useState("");
  const [passwords, setPasswords] = useState("");
  const [pairing, setPairing] = useState<BasicPairing>("each");
  const [mark, setMark] = useState(":");
  const [custom, setCustom] = useState("");
  const [prefix, setPrefix] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fileError, setFileError] = useState("");
  const delimiter = mark === "custom" ? custom : mark;
  const list = useMemo(() => {
    if (users.length > MAX_FILE || passwords.length > MAX_FILE) {
      return { error: "That list is too big for this page. Rockyou will freeze the browser. Use a short list here. Hydra is the tool for rockyou." };
    }
    return basicList({ users, passwords, pairing, delimiter, prefix: prefix ? "Basic " : "" });
  }, [users, passwords, pairing, delimiter, prefix]);
  const ready = !("error" in list) && list.lines.length > 0;
  const shown = ready ? list.lines.slice(0, 40).join("\n") : "";
  const text = ready ? list.lines.join("\n") : "";
  const problem = fileError || ("error" in list ? list.error : "");

  function takeText(value: string, into: (next: string) => void) {
    if (value.length > MAX_FILE) {
      setFileError("That paste is too big. Rockyou will freeze the browser. Use a short list here. Hydra is the tool for rockyou.");
      return;
    }
    setFileError("");
    into(value);
  }

  async function copy() {
    if (!ready) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  function download() {
    if (!ready) return;
    const blob = new Blob([text + "\n"], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "basic.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function openTab() {
    if (!ready) return;
    const blob = new Blob([text + "\n"], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  function readFile(file: File | undefined, into: (value: string) => void) {
    if (!file) return;
    if (file.size > MAX_FILE) {
      setFileError(`${file.name} is too big. Rockyou will freeze this page. Use a short list. Hydra is the tool for rockyou.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => takeText(typeof reader.result === "string" ? reader.result : "", into);
    reader.readAsText(file);
  }

  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-primary bg-surface">
      <div className="border-b border-border px-4 py-3">
        <p className="font-mono text-xs text-primary">Builder</p>
        <h2 className="text-lg font-semibold">Base64 user and password</h2>
        <p className="mt-1 text-sm text-muted">
          Burp encodes each payload position on its own, so admin:admin becomes two encodings with a colon left in the middle. This joins the username and the password first, then base64-encodes that one string. Keep the lists short. Rockyou belongs in Hydra, and loading it here froze the page.
        </p>
      </div>
      <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">USERNAMES</span>
          <textarea className={area} value={users} onChange={(event) => takeText(event.target.value, setUsers)} placeholder={"admin\nadministrator"} spellCheck={false} />
          <span className="flex flex-wrap gap-2">
            <button type="button" onClick={() => takeText(lootLines("user").join("\n"), setUsers)} className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-xs text-muted">
              Use loot usernames
            </button>
            <label className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-border px-3 text-xs text-muted">
              Load a file
              <input type="file" accept=".txt,text/plain" className="hidden" onChange={(event) => readFile(event.target.files?.[0], setUsers)} />
            </label>
          </span>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">PASSWORDS</span>
          <textarea className={area} value={passwords} onChange={(event) => takeText(event.target.value, setPasswords)} placeholder={"admin\npassword"} spellCheck={false} disabled={pairing === "same"} />
          <span className="flex flex-wrap gap-2">
            <button type="button" onClick={() => takeText(lootLines("pass").join("\n"), setPasswords)} disabled={pairing === "same"} className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-xs text-muted disabled:opacity-40">
              Use loot passwords
            </button>
            <label className={"inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-xs text-muted " + (pairing === "same" ? "pointer-events-none opacity-40" : "cursor-pointer")}>
              Load a file
              <input type="file" accept=".txt,text/plain" className="hidden" disabled={pairing === "same"} onChange={(event) => readFile(event.target.files?.[0], setPasswords)} />
            </label>
          </span>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">HOW THEY PAIR</span>
          <select className={control} value={pairing} onChange={(event) => setPairing(event.target.value as BasicPairing)}>
            <option value="each">Every username with every password</option>
            <option value="line">Line by line</option>
            <option value="same">Password is the username</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">DELIMITER</span>
          <select className={control} value={mark} onChange={(event) => setMark(event.target.value)}>
            <option value=":">Colon, for basic auth</option>
            <option value="">No delimiter</option>
            <option value=" ">Space</option>
            <option value="custom">Type one</option>
          </select>
        </label>
        {mark === "custom" ? (
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-mono text-xs tracking-wide text-muted">CUSTOM DELIMITER</span>
            <input className={control} value={custom} onChange={(event) => setCustom(event.target.value)} placeholder=":" spellCheck={false} />
          </label>
        ) : null}
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={prefix} onChange={(event) => setPrefix(event.target.checked)} />
          Start each line with Basic, so it can go straight in the Authorization header
        </label>
      </div>
      <div className="flex flex-col gap-3 px-4 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-mono text-xs tracking-wide text-muted">{ready ? `${list.lines.length} ${list.lines.length === 1 ? "line" : "lines"}` : "LIST"}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void copy()} disabled={!ready} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-border px-3 text-xs text-muted disabled:opacity-40">
              <Copy className="size-3.5" aria-hidden="true" />
              {copied ? "Copied" : "Copy"}
            </button>
            <button type="button" onClick={download} disabled={!ready} className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-xs text-muted disabled:opacity-40">
              Save .txt
            </button>
            <button type="button" onClick={openTab} disabled={!ready} className="inline-flex min-h-11 items-center rounded-lg border border-primary bg-raised px-3 text-xs text-fg disabled:opacity-40">
              Open in a tab
            </button>
          </div>
        </div>
        <pre className="max-h-64 max-w-full overflow-auto whitespace-pre-wrap break-all rounded-lg bg-bg p-3 font-mono text-xs leading-relaxed text-fg">{problem ? problem : shown}</pre>
        {ready && list.lines.length > 40 ? <p className="text-xs text-muted">The box shows the first 40. Copy, Save, and Open in a tab have the full list.</p> : null}
      </div>
    </article>
  );
}

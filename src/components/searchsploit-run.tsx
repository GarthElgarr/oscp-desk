import { useEffect, useMemo, useState } from "react";
import { JobList } from "@/components/job-list";
import { launchJob } from "@/lib/live-jobs";
import { searchsploitPlan } from "@/lib/searchsploit";

const control = "min-h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg outline-none";
const INTEREST = "oscp-search-interest-v1";
const NOTES = "oscp-search-notes-v1";

type Interest = { id: string; note: string };

function exploitId(value: string) {
  const trimmed = value.trim();
  if (/^\d{1,7}$/.test(trimmed)) return trimmed;
  return trimmed.match(/(\d{2,7})(?:\.[A-Za-z0-9]+)?$/)?.[1] ?? "";
}

function loadInterest(): Interest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(INTEREST) ?? "[]") as unknown;
    if (!Array.isArray(raw)) return [];
    return raw
      .flatMap((row) => {
        if (!row || typeof row !== "object") return [];
        const id = "id" in row && typeof row.id === "string" ? row.id : "";
        const note = "note" in row && typeof row.note === "string" ? row.note : "";
        return /^\d{1,7}$/.test(id) ? [{ id, note: note.slice(0, 240) }] : [];
      })
      .slice(0, 40);
  } catch {
    return [];
  }
}

export function SearchsploitRun({ initialFile = "" }: { initialFile?: string }) {
  const [mode, setMode] = useState<"terms" | "nmap" | "path">(initialFile ? "nmap" : "terms");
  const [terms, setTerms] = useState("");
  const [title, setTitle] = useState(true);
  const [exact, setExact] = useState(false);
  const [web, setWeb] = useState(false);
  const [exclude, setExclude] = useState("");
  const [nmapFile, setNmapFile] = useState(initialFile);
  const [edb, setEdb] = useState("");
  const [lookId, setLookId] = useState("");
  const [lookNote, setLookNote] = useState("");
  const [lookError, setLookError] = useState("");
  const [interest, setInterest] = useState<Interest[]>([]);
  const [notes, setNotes] = useState("");
  const [notesReady, setNotesReady] = useState(false);

  const plan = useMemo(
    () => searchsploitPlan({ mode, terms, title, exact, web, exclude, nmapFile, edb }),
    [mode, terms, title, exact, web, exclude, nmapFile, edb],
  );
  const ready = !("error" in plan);

  async function run() {
    if (!ready || "error" in plan) return;
    await launchJob(
      "/api/searchsploit",
      { mode, terms, title, exact, web, exclude, nmapFile, edb },
      { tool: "search", title: plan.command, command: plan.command },
    );
  }

  useEffect(() => {
    setInterest(loadInterest());
    setNotes(localStorage.getItem(NOTES) ?? "");
    setNotesReady(true);
  }, []);

  useEffect(() => {
    if (!notesReady) return;
    localStorage.setItem(INTEREST, JSON.stringify(interest));
  }, [interest, notesReady]);

  useEffect(() => {
    if (!notesReady) return;
    localStorage.setItem(NOTES, notes);
  }, [notes, notesReady]);

  async function showExploit(raw: string) {
    const id = exploitId(raw);
    if (!id) {
      setLookError("Use the number from the search line, such as 50383.");
      return;
    }
    setLookError("");
    setLookId(id);
    await launchJob(
      "/api/searchsploit",
      { mode: "examine", terms: "", title: false, exact: false, web: false, exclude: "", nmapFile: "", edb: id },
      { tool: "search", title: `searchsploit -x ${id}`, command: `searchsploit -x ${id} | head -n 80` },
    );
  }

  function saveInterest() {
    const id = exploitId(lookId);
    if (!id) {
      setLookError("Use the number from the search line, such as 50383.");
      return;
    }
    setLookError("");
    const note = lookNote.replace(/\s+/g, " ").trim().slice(0, 240);
    setInterest((prev) => [{ id, note }, ...prev.filter((row) => row.id !== id)].slice(0, 40));
    setLookNote("");
  }

  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-primary bg-surface">
      <div className="border-b border-border px-4 py-3">
        <p className="font-mono text-xs text-primary">Search</p>
        <h2 className="text-lg font-semibold">searchsploit</h2>
        <p className="mt-1 text-sm text-muted">
          Search the local exploit-db copy. Use the product and version from the scan, not the whole banner. -w adds the
          Exploit-DB page. This does not copy the exploit into the folder. That is searchsploit -m, and you do it by hand
          once you have chosen one.
        </p>
      </div>
      <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="font-mono text-xs tracking-wide text-muted">WHAT TO SEARCH</span>
          <select className={control} value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}>
            <option value="terms">Words from the version banner</option>
            <option value="nmap">A saved nmap XML</option>
            <option value="path">The path of one exploit id</option>
          </select>
        </label>
        {mode === "terms" ? (
          <>
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="font-mono text-xs tracking-wide text-muted">TERMS</span>
              <input className={control} value={terms} onChange={(event) => setTerms(event.target.value)} placeholder="Apache 2.4.49" spellCheck={false} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-mono text-xs tracking-wide text-muted">TITLE -t</span>
              <select className={control} value={title && !exact ? "yes" : "no"} onChange={(event) => setTitle(event.target.value === "yes")} disabled={exact}>
                <option value="yes">Title only. Skip the exploit text</option>
                <option value="no">Title and the text inside the exploit</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-mono text-xs tracking-wide text-muted">EXACT -e</span>
              <select className={control} value={exact ? "yes" : "no"} onChange={(event) => setExact(event.target.value === "yes")}>
                <option value="no">Every word can match on its own</option>
                <option value="yes">The words together, in the title</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-mono text-xs tracking-wide text-muted">WEB -w</span>
              <select className={control} value={web ? "yes" : "no"} onChange={(event) => setWeb(event.target.value === "yes")}>
                <option value="no">Local path only</option>
                <option value="yes">Include the Exploit-DB link</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-mono text-xs tracking-wide text-muted">EXCLUDE</span>
              <input className={control} value={exclude} onChange={(event) => setExclude(event.target.value)} placeholder="dos" spellCheck={false} />
            </label>
          </>
        ) : null}
        {mode === "nmap" ? (
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-mono text-xs tracking-wide text-muted">SAVED SCAN</span>
            <input className={control} value={nmapFile} onChange={(event) => setNmapFile(event.target.value)} placeholder="quick" spellCheck={false} />
          </label>
        ) : null}
        {mode === "path" ? (
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-mono text-xs tracking-wide text-muted">EXPLOIT ID</span>
            <input className={control} value={edb} onChange={(event) => setEdb(event.target.value)} placeholder="50383" inputMode="numeric" spellCheck={false} />
          </label>
        ) : null}
      </div>
      <div className="flex flex-col gap-3 px-4 pb-4">
        <pre className="whitespace-pre-wrap break-words rounded-lg bg-bg p-3 font-mono text-xs text-fg">
          {"error" in plan ? plan.error : plan.command}
        </pre>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void run()} disabled={!ready} className="inline-flex min-h-11 items-center rounded-lg border border-primary bg-raised px-3 text-sm text-fg disabled:opacity-40">
            Search
          </button>
        </div>
        <p className="text-sm text-fg">
          -t searches titles, which is what you want for a version. Without it, a word from the exploit instructions can match and the list gets long. --nmap reads the versions out of a saved XML. -p prints the file path of one id so you can open it. Leaving this page does not stop the search.
        </p>
        <div className="rounded-lg border border-border px-3 py-3">
          <p className="font-mono text-xs tracking-wide text-muted">EXPLOITS OF INTEREST</p>
          <p className="mt-1 text-sm text-muted">
            Keep the ids you may come back to. Show runs <span className="font-mono">searchsploit -x</span> and prints the first 80 lines. The list stays in this browser.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-mono text-xs tracking-wide text-muted">EXPLOIT ID</span>
              <input className={control} value={lookId} onChange={(event) => setLookId(event.target.value)} placeholder="50383" spellCheck={false} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-mono text-xs tracking-wide text-muted">NOTE</span>
              <input className={control} value={lookNote} onChange={(event) => setLookNote(event.target.value)} placeholder="Apache 2.4.49 traversal, matches the banner" spellCheck={false} />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => void showExploit(lookId)} className="inline-flex min-h-11 items-center rounded-lg border border-primary bg-raised px-3 text-sm text-fg">
              Show
            </button>
            <button type="button" onClick={saveInterest} className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm text-fg">
              Save
            </button>
          </div>
          {lookError ? <p className="mt-2 text-sm text-dead">{lookError}</p> : null}
          {interest.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-2">
              {interest.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-bg px-3 py-2">
                  <span className="font-mono text-sm text-fg">{row.id}</span>
                  <span className="min-w-0 flex-1 text-sm text-muted">{row.note || "No note"}</span>
                  <button type="button" onClick={() => void showExploit(row.id)} className="inline-flex min-h-9 items-center rounded-lg border border-border px-2 text-xs text-fg">
                    Show
                  </button>
                  <button
                    type="button"
                    onClick={() => setInterest((prev) => prev.filter((item) => item.id !== row.id))}
                    className="inline-flex min-h-9 items-center rounded-lg border border-border px-2 text-xs text-muted"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <JobList tool="search" />
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">NOTES</span>
          <textarea
            className="min-h-28 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg outline-none"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Notes on this search"
            spellCheck={true}
          />
        </label>
      </div>
    </article>
  );
}

import { useMemo, useState } from "react";
import { JobList } from "@/components/job-list";
import { launchJob } from "@/lib/live-jobs";
import { searchsploitPlan } from "@/lib/searchsploit";

const control = "min-h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg outline-none";

export function SearchsploitRun({ initialFile = "" }: { initialFile?: string }) {
  const [mode, setMode] = useState<"terms" | "nmap" | "path">(initialFile ? "nmap" : "terms");
  const [terms, setTerms] = useState("");
  const [title, setTitle] = useState(true);
  const [exact, setExact] = useState(false);
  const [web, setWeb] = useState(false);
  const [exclude, setExclude] = useState("");
  const [nmapFile, setNmapFile] = useState(initialFile);
  const [edb, setEdb] = useState("");

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
      { tool: "search", title: plan.command.slice(0, 80), command: plan.command },
    );
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
        <JobList tool="search" />
      </div>
    </article>
  );
}

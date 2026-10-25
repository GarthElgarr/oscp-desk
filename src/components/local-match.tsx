import { useMemo, useState } from "react";
import { JobList } from "@/components/job-list";
import { launchJob } from "@/lib/live-jobs";
import { matchLocal } from "@/lib/local-match";
import { suggestPlan } from "@/lib/suggest";

const control =
  "min-h-36 w-full rounded-lg border border-border bg-bg px-3 py-2 font-mono text-xs text-fg outline-none";

const SAMPLE = `Linux victim 5.15.11 #1 SMP x86_64 GNU/Linux
Sudo version 1.8.31`;

export function LocalMatch() {
  const [text, setText] = useState("");
  const result = useMemo(() => matchLocal(text), [text]);
  const suggest = useMemo(() => (text.trim() ? suggestPlan(text) : null), [text]);
  const ready = Boolean(suggest && !("error" in suggest));

  async function run() {
    if (!ready) return;
    await launchJob("/api/suggest", { text }, { tool: "suggest", title: "Exploit suggester", command: suggest && !("error" in suggest) ? suggest.command : "suggest" });
  }

  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-primary bg-surface">
      <div className="border-b border-border px-4 py-3">
        <p className="font-mono text-xs text-primary">Builder</p>
        <h2 className="text-lg font-semibold">Kernel / sudo exploit</h2>
        <p className="mt-1 text-sm text-muted">
          Linux, sudo, and Windows. Paste <span className="font-mono">uname -a</span>,{" "}
          <span className="font-mono">sudo --version</span>, or <span className="font-mono">systeminfo</span>. The
          short list reads the kernel and the sudo version on the same paste. A lead is passed to linux-exploit-suggester,
          searchsploit, or wes. A dead row is not. Baron is sudo 1.8.2–1.8.31p1 or 1.9.0–1.9.5p1. 1.8.31p2 and 1.9.5p2
          are patched.
        </p>
      </div>
      <div className="px-4 py-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">PASTE</span>
          <textarea
            className={control}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={SAMPLE}
            spellCheck={false}
          />
        </label>
      </div>
      {result ? (
        <div className="flex flex-col gap-3 px-4 pb-4">
          <p className="text-sm text-muted">
            Read as {result.kind}. {result.read}
          </p>
          {result.hits.map((hit) => (
            <div key={hit.title} className="rounded-lg bg-bg px-3 py-3">
              <p className="text-sm font-semibold">{hit.title}</p>
              <p
                className={
                  "mt-2 text-sm " +
                  (hit.state === "lead" ? "text-alive" : hit.state === "dead" ? "text-dead" : "text-muted")
                }
              >
                {hit.why}
              </p>
              <p className="mt-2 text-sm text-fg">{hit.next}</p>
            </div>
          ))}
          <div className="rounded-lg border border-border px-3 py-3">
            <p className="font-mono text-xs text-primary">PASS ON</p>
            <p className="mt-1 text-sm text-fg">{suggest && !("error" in suggest) ? suggest.note : suggest && "error" in suggest ? suggest.error : ""}</p>
            {suggest && !("error" in suggest) ? (
              <pre className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-bg p-3 font-mono text-xs text-fg">{suggest.command}</pre>
            ) : null}
            <button
              type="button"
              onClick={() => void run()}
              disabled={!ready}
              className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-primary bg-raised px-3 text-sm text-fg disabled:opacity-40"
            >
              Run suggester
            </button>
          </div>
          <JobList tool="suggest" />
        </div>
      ) : null}
    </article>
  );
}

import { useEffect, useSyncExternalStore } from "react";
import { getJobs, getJobsServer, removeJob, stopJob, subscribeJobs, syncJobs, type LiveJob } from "@/lib/live-jobs";

function plain(text: string) {
  const stripped = text
    .replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, "")
    .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, "");
  let current = "";
  let out = "";
  for (let i = 0; i < stripped.length; i += 1) {
    const c = stripped[i];
    if (c === "\r") {
      if (stripped[i + 1] === "\n") {
        out += `${current}\n`;
        current = "";
        i += 1;
      } else current = "";
    } else if (c === "\n") {
      out += `${current}\n`;
      current = "";
    } else current += c;
  }
  return out + current;
}
function jobState(job: LiveJob): "running" | "done" | "partial" | "failed" {
  if (job.running) return "running";
  if (job.output.includes('"verdict":"partial"')) return "partial";
  if (job.output.includes("[stopped]") || job.output.includes('"verdict":"fail"')) return "failed";
  if (job.output.includes('"verdict":"pass"')) return "done";
  const exits = [...job.output.matchAll(/\[[^\]]*exit (\d+|unknown)\]/g)];
  const code = exits.at(-1)?.[1];
  if (code === "0") return "done";
  const wfuzzWorked = job.tool === "wfuzz" && job.output.includes("Total requests:") && !job.output.includes("Traceback");
  if (wfuzzWorked && (code === "1" || code === undefined)) return "done";
  return "failed";
}

export function JobList({ tool, empty, onRead }: { tool?: string; empty?: string; onRead?: (job: LiveJob) => void }) {
  const jobs = useSyncExternalStore(subscribeJobs, getJobs, getJobsServer);
  useEffect(() => {
    void syncJobs();
  }, []);
  const shown = tool ? jobs.filter((job) => job.tool === tool) : jobs;
  if (shown.length === 0) return empty ? <p className="text-sm text-muted">{empty}</p> : null;
  return (
    <div className="flex flex-col gap-3">
      {shown.map((job) => {
        const state = jobState(job);
        const header =
          state === "running"
            ? "nmap-lamp-run border-[#8a5a20]"
            : state === "done"
              ? "border-alive bg-alive-bg text-alive"
              : state === "partial"
                ? "border-[#8a5a20] bg-[#3a2a14] text-[#e0a15a]"
                : "border-dead bg-dead-bg text-dead";
        const label = state === "running" ? "RUNNING" : state === "done" ? "DONE" : state === "partial" ? "PARTIAL" : "FAILED";
        return (
          <section key={job.id} className="overflow-hidden rounded-lg border border-border">
            <div className={"flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2 " + header}>
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span className={"size-3 shrink-0 rounded-full " + (state === "running" || state === "partial" ? "bg-[#e0a15a]" : state === "done" ? "bg-alive" : "bg-dead")} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs">{label}</p>
                  <p className="text-sm break-all">{job.command.length > job.title.length ? job.command : job.title}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {onRead ? (
                  <button type="button" onClick={() => onRead(job)} className="inline-flex min-h-11 items-center rounded-lg border border-primary bg-bg px-3 text-sm text-fg">
                    Read it
                  </button>
                ) : null}
                {state === "done" && job.tool === "nmap" && job.name ? (
                  <a href={`/api/nmap?name=${encodeURIComponent(job.name)}&html=1`} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center rounded-lg border border-alive bg-bg px-3 text-sm text-alive">
                    Open HTML report
                  </a>
                ) : null}
                <button type="button" onClick={() => void stopJob(job.id)} disabled={!job.running} className="inline-flex min-h-11 items-center rounded-lg border border-border bg-bg px-3 text-sm text-fg disabled:opacity-40">
                  Kill
                </button>
                <button type="button" onClick={() => void removeJob(job.id)} className="inline-flex min-h-11 items-center rounded-lg border border-border bg-bg px-3 text-sm text-muted">
                  Remove
                </button>
              </div>
            </div>
            <pre className="max-h-96 w-full min-w-0 max-w-full overflow-x-hidden overflow-y-auto whitespace-pre-wrap break-all bg-black p-3 font-mono text-xs leading-relaxed text-[#d6f5d6]">
              {plain(job.output).replace(/@@STATUS .*@@\n?/g, "") || (job.running ? "Waiting for output…" : "")}
            </pre>
          </section>
        );
      })}
    </div>
  );
}

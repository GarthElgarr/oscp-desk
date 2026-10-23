import { useEffect, useSyncExternalStore } from "react";
import { getJobs, getJobsServer, removeJob, stopJob, subscribeJobs, syncJobs, type LiveJob } from "@/lib/live-jobs";

function jobState(job: LiveJob): "running" | "done" | "partial" | "failed" {
  if (job.running) return "running";
  if (job.output.includes('"verdict":"partial"')) return "partial";
  if (job.output.includes("[stopped]") || job.output.includes('"verdict":"fail"')) return "failed";
  if (job.output.includes('"verdict":"pass"')) return "done";
  const exits = [...job.output.matchAll(/\[[^\]]*exit (\d+|unknown)\]/g)];
  return exits.at(-1)?.[1] === "0" ? "done" : "failed";
}

export function JobList({ tool, empty }: { tool?: string; empty?: string }) {
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
              <div className="flex min-w-0 items-center gap-2">
                <span className={"size-3 shrink-0 rounded-full " + (state === "running" || state === "partial" ? "bg-[#e0a15a]" : state === "done" ? "bg-alive" : "bg-dead")} aria-hidden="true" />
                <div className="min-w-0">
                  <p className="font-mono text-xs">{label}</p>
                  <p className="truncate text-sm">{job.title}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
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
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words bg-black p-3 font-mono text-xs leading-relaxed text-[#d6f5d6]">
              {job.output.replace(/@@STATUS .*@@\n?/g, "") || (job.running ? "Waiting for output…" : "")}
            </pre>
          </section>
        );
      })}
    </div>
  );
}

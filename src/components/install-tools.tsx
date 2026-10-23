import { useState, useSyncExternalStore } from "react";
import { Check, CircleX, TriangleAlert } from "lucide-react";
import { JobList } from "@/components/job-list";
import { INSTALL_TOOL_LABELS, manualInstallCommand, takeInstallStatus, type InstallSummary } from "@/lib/install-tools";
import { getJobs, getJobsServer, launchJob, subscribeJobs } from "@/lib/live-jobs";

function Verdict({ summary }: { summary: InstallSummary }) {
  if (summary.verdict === "pass") {
    return (
      <p className="mt-3 flex items-center gap-2 text-sm text-alive">
        <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-alive text-bg">
          <Check className="size-4" aria-hidden="true" />
        </span>
        {summary.title}
      </p>
    );
  }
  if (summary.verdict === "partial") {
    return (
      <div className="mt-3 rounded-lg border border-[#8a5a20] bg-[#2a2116] px-3 py-3">
        <p className="flex items-center gap-2 text-sm text-[#e0a15a]">
          <TriangleAlert className="size-5 shrink-0" aria-hidden="true" />
          {summary.title}
        </p>
        <ul className="mt-2 list-disc pl-5 text-sm text-fg">
          {summary.outstanding.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <div className="mt-3 rounded-lg border border-dead/40 bg-dead-bg px-3 py-3">
      <p className="flex items-center gap-2 text-sm text-dead">
        <CircleX className="size-5 shrink-0" aria-hidden="true" />
        {summary.title || "The install failed."}
      </p>
      {summary.outstanding.length > 0 ? (
        <ul className="mt-2 list-disc pl-5 text-sm text-fg">
          {summary.outstanding.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function InstallTools() {
  const [copied, setCopied] = useState(false);
  const jobs = useSyncExternalStore(subscribeJobs, getJobs, getJobsServer);
  const install = jobs.find((job) => job.tool === "install");
  const summary: InstallSummary | null = install ? takeInstallStatus(install.output).summary : null;
  const running = install?.running ?? false;
  const command = manualInstallCommand();

  async function run() {
    await launchJob("/api/install", {}, { tool: "install", title: "Install requirements", command: "apt-get update && apt-get install" });
  }

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void run()}
          disabled={running}
          className="inline-flex min-h-11 items-center rounded-lg border border-primary bg-raised px-3 text-sm text-fg disabled:opacity-40"
        >
          {running ? "Updating and installing…" : "Install requirements"}
        </button>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(command).then(
              () => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1200);
              },
              () => setCopied(false),
            );
          }}
          className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm text-muted"
        >
          {copied ? "Copied" : "Copy command"}
        </button>
      </div>
      <p className="mt-2 text-sm text-muted">
        Installs {INSTALL_TOOL_LABELS.join(", ")}. On Kali it runs apt-get update, then the packages, then unpacks
        rockyou. This preview is not Kali, so the same click only prints that command. It never types a sudo password.
        Leaving this page does not stop it. Kill and Remove are on the run, and every run is also under Runs.
      </p>
      {summary && !running ? <Verdict summary={summary} /> : null}
      <div className="mt-3">
        <JobList tool="install" />
      </div>
    </div>
  );
}

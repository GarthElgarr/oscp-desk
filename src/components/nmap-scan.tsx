import { useMemo, useState, useSyncExternalStore } from "react";
import { JobList } from "@/components/job-list";
import { getJobs, getJobsServer, launchJob, subscribeJobs } from "@/lib/live-jobs";
import { nmapExtra, nmapName, nmapPlan, nmapPorts, nmapTarget, type NmapProfile } from "@/lib/nmap-scan";

const control = "min-h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg outline-none";

const PROFILES: { id: NmapProfile; label: string }[] = [
  { id: "quick", label: "1. Quick TCP — common ports, scripts, versions" },
  { id: "alltcp", label: "2. All TCP — every port" },
  { id: "udp", label: "3. UDP top 20 — required on every host" },
  { id: "deep", label: "4. Deep — scripts and versions on ports you name" },
  { id: "custom", label: "Custom flags" },
];

export function NmapScan() {
  const [target, setTarget] = useState("");
  const [profile, setProfile] = useState<NmapProfile>("quick");
  const [name, setName] = useState("quick");
  const [nameTouched, setNameTouched] = useState(false);
  const [ports, setPorts] = useState("");
  const [extra, setExtra] = useState("");
  const jobs = useSyncExternalStore(subscribeJobs, getJobs, getJobsServer);

  const host = nmapTarget(target);
  const parsedExtra = nmapExtra(extra);
  const safeName = nmapName(name);
  const plan = useMemo(() => {
    if (!host || !safeName || !parsedExtra.ok) return null;
    const next = nmapPlan({ profile, target: host, name: safeName, ports, extra: parsedExtra.args });
    return "error" in next ? null : next;
  }, [host, safeName, parsedExtra, profile, ports]);

  const runningCount = jobs.filter((job) => job.running && job.tool === "nmap").length;
  const problem = !target.trim()
    ? ""
    : !host
      ? "The target is one IPv4 address."
      : !safeName
        ? "The output name is letters, numbers, hyphens, and underscores."
        : !parsedExtra.ok
          ? parsedExtra.error
          : profile === "deep" && !nmapPorts(ports)
            ? "Deep needs the ports, such as 8080,8443."
            : profile === "custom" && parsedExtra.args.length === 0
              ? "Custom needs at least one flag, such as -F or -p 80,443."
              : "";

  async function run() {
    if (!plan || !host || !safeName || runningCount >= 4) return;
    const title = `${PROFILES.find((item) => item.id === profile)?.label.split("—")[0]?.trim() ?? profile} ${host}`;
    await launchJob("/api/nmap", { profile, target: host, name: safeName, ports, extra }, { tool: "nmap", title, command: plan.command, name: safeName });
  }

  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-primary bg-surface">
      <div className="border-b border-border px-4 py-3">
        <p className="font-mono text-xs text-primary">Scanner</p>
        <h2 className="text-lg font-semibold">nmap</h2>
        <p className="mt-1 text-sm text-muted">
          The four passes from the order of work. Quick and all-TCP can run together. Each scan keeps its own terminal.
          The output name is the file: scans/name.nmap, .xml, and .gnmap. Read the XML in the Nmap tab.
        </p>
      </div>
      <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">IP</span>
          <input className={control} value={target} onChange={(event) => setTarget(event.target.value)} placeholder="10.10.10.10" inputMode="decimal" spellCheck={false} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">PROFILE</span>
          <select
            className={control}
            value={profile}
            onChange={(event) => {
              const next = event.target.value as NmapProfile;
              setProfile(next);
              if (!nameTouched) setName(next === "custom" ? "custom" : next);
            }}
          >
            {PROFILES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">OUTPUT NAME</span>
          <input
            className={control}
            value={name}
            onChange={(event) => {
              setNameTouched(true);
              setName(event.target.value);
            }}
            placeholder="quick"
            spellCheck={false}
          />
        </label>
        {profile === "deep" ? (
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-mono text-xs tracking-wide text-muted">PORTS</span>
            <input className={control} value={ports} onChange={(event) => setPorts(event.target.value)} placeholder="8080,8443" spellCheck={false} />
          </label>
        ) : null}
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="font-mono text-xs tracking-wide text-muted">CUSTOM FLAGS</span>
          <input className={control} value={extra} onChange={(event) => setExtra(event.target.value)} placeholder="-T4 --reason" spellCheck={false} />
        </label>
      </div>
      <div className="flex flex-col gap-3 px-4 pb-4">
        <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-bg p-3 font-mono text-xs leading-relaxed text-fg">
          {plan?.command || "Type the IP. The command appears here."}
        </pre>
        {problem ? <p className="text-sm text-dead">{problem}</p> : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void run()}
            disabled={!plan || runningCount >= 4}
            className="inline-flex min-h-11 items-center rounded-lg border border-primary bg-raised px-3 text-sm text-fg disabled:opacity-40"
          >
            {runningCount >= 4 ? "Four scans running" : "Run scan"}
          </button>
        </div>
        <p className="text-sm text-muted">
          Up to four scans run at once. Leaving this page does not stop them. Come back here, or open the Nmap tab, and the same terminal is still there. UDP uses sudo -n, so a password prompt stops that scan instead of waiting. The same output name replaces the previous files.
        </p>
        {profile === "quick" ? <p className="text-sm text-fg">-sC is the default scripts. -sV asks the service for its version. Read this while the all-TCP scan is still going.</p> : null}
        {profile === "alltcp" ? <p className="text-sm text-fg">-p- is every TCP port. --min-rate 2000 keeps it moving. Ports that were not in the quick scan are the ones the deep pass is for.</p> : null}
        {profile === "udp" ? <p className="text-sm text-fg">Top 20 is the required UDP pass. It is not a full UDP sweep, and it will not show SNMP or TFTP the way the protocol scanner does. Run both.</p> : null}
        {profile === "deep" ? <p className="text-sm text-fg">-p is only the new ports. Sending every open port through the scripts again repeats the quick scan.</p> : null}
        {profile === "custom" ? <p className="text-sm text-fg">Your flags are added to -Pn, then the output name and the IP. -oA and -iL stay out. Those are the name box and a file this page will not open.</p> : null}
        <JobList tool="nmap" />
      </div>
    </article>
  );
}

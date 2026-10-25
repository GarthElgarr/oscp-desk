import { useMemo, useState } from "react";
import { Copy } from "lucide-react";
import { JobList } from "@/components/job-list";
import { launchJob } from "@/lib/live-jobs";
import type { LiveJob } from "@/lib/live-jobs";
import {
  CISCO_SSID_OID,
  QUICK_COMMUNITIES,
  SSID_OID,
  onesixtyPlan,
  parseSnmpOutput,
  snmpCommunity,
  snmpOid,
  snmpTarget,
  walkPlan,
  type SnmpView,
} from "@/lib/snmp-plan";

const control = "min-h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg outline-none";

function Table({ columns, rows }: { columns: string[]; rows: string[][] }) {
  if (rows.length === 0) return null;
  return (
    <div className="max-w-full overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column} className="border-b border-border px-2 py-1 font-mono text-xs text-muted">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="border-b border-border px-2 py-1 align-top break-words text-fg">
                  {cell || "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Readout({ view }: { view: SnmpView }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-bg p-3">
      <p className="text-sm text-fg">{view.note}</p>
      <Table columns={["Host", "Community", "Reply"]} rows={view.hits.map((hit) => [hit.host, hit.community, hit.detail])} />
      {view.ssids.length ? (
        <div>
          <p className="font-mono text-xs text-primary">SSIDS</p>
          <Table columns={["SSID", "Index", "Where"]} rows={view.ssids.map((row) => [row.ssid, row.index, row.where])} />
        </div>
      ) : null}
      {view.system.length ? (
        <div>
          <p className="font-mono text-xs text-primary">SYSTEM</p>
          <Table columns={["Name", "Value"]} rows={view.system.map((row) => [row.name, row.value])} />
        </div>
      ) : null}
      {view.interfaces.length ? (
        <div>
          <p className="font-mono text-xs text-primary">INTERFACES</p>
          <Table columns={["Interface", "State"]} rows={view.interfaces.map((row) => [row.name, row.value])} />
        </div>
      ) : null}
      {view.listeners.length ? (
        <div>
          <p className="font-mono text-xs text-primary">LISTENERS</p>
          <Table columns={["Socket", "State"]} rows={view.listeners.map((row) => [row.name, row.value])} />
        </div>
      ) : null}
      {view.software.length ? (
        <div>
          <p className="font-mono text-xs text-primary">SOFTWARE</p>
          <p className="mt-1 text-sm text-fg">{view.software.join(", ")}</p>
        </div>
      ) : null}
      {view.processes.length ? (
        <div>
          <p className="font-mono text-xs text-primary">PROCESSES</p>
          <p className="mt-1 text-sm text-fg">{view.processes.join(", ")}</p>
        </div>
      ) : null}
      {view.other.length ? (
        <div>
          <p className="font-mono text-xs text-muted">OTHER</p>
          <Table columns={["OID", "Value"]} rows={view.other.map((row) => [row.name, row.value])} />
          {view.otherLeft ? <p className="mt-1 text-xs text-muted">{view.otherLeft} more lines were left out.</p> : null}
        </div>
      ) : null}
    </div>
  );
}

export function SnmpBuilder() {
  const [target, setTarget] = useState("");
  const [version, setVersion] = useState<"1" | "2c">("2c");
  const [community, setCommunity] = useState("public");
  const [oid, setOid] = useState("");
  const [communities, setCommunities] = useState(QUICK_COMMUNITIES.join("\n"));
  const [copied, setCopied] = useState("");
  const [view, setView] = useState<SnmpView | null>(null);
  const host = snmpTarget(target);
  const communityOk = snmpCommunity(community);
  const oidOk = snmpOid(oid);
  const walk = useMemo(
    () => (host && communityOk && oidOk != null ? walkPlan(host, version, communityOk, oidOk) : null),
    [host, communityOk, oidOk, version],
  );
  const quickWalk = host ? walkPlan(host, "2c", "public", "") : null;
  const ssidWalk = host ? walkPlan(host, "2c", communityOk || "public", SSID_OID) : null;
  const ciscoWalk = host ? walkPlan(host, "2c", communityOk || "public", CISCO_SSID_OID) : null;
  const listed = communities
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const one = host && listed.length ? onesixtyPlan(host, listed.length ? listed : [...QUICK_COMMUNITIES]) : null;

  async function copy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      window.setTimeout(() => setCopied(""), 1200);
    } catch {
      setCopied("");
    }
  }

  async function runWalk(plan: { command: string; args: string[] }, ver: "1" | "2c", modeCommunity: string, modeOid: string) {
    if (!host) return;
    await launchJob(
      "/api/snmp",
      { mode: "walk", target: host, version: ver, community: modeCommunity, oid: modeOid },
      { tool: "snmp", title: plan.command, command: plan.command },
    );
  }

  async function runOne(quick: boolean) {
    if (!host) return;
    const plan = onesixtyPlan(host, quick ? [...QUICK_COMMUNITIES] : listed);
    await launchJob(
      "/api/snmp",
      { mode: "onesixty", target: host, quick, communities },
      { tool: "snmp", title: `${plan.command}  # ${plan.communities.join(", ")}`, command: plan.command },
    );
  }

  function read(job: LiveJob) {
    setView(parseSnmpOutput(job.output));
  }

  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-primary bg-surface">
      <div className="border-b border-border px-4 py-3">
        <p className="font-mono text-xs text-primary">Scanner</p>
        <h2 className="text-lg font-semibold">snmpwalk and onesixtyone</h2>
        <p className="mt-1 text-sm text-muted">
          onesixtyone tries community strings. snmpwalk dumps the MIB, which is a wall of OIDs. Read it turns that wall into tables. SSIDs are pulled out on their own when the walk contains them.
        </p>
      </div>
      <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">TARGET</span>
          <input className={control} value={target} onChange={(event) => setTarget(event.target.value)} placeholder="10.10.10.10" spellCheck={false} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">VERSION</span>
          <select className={control} value={version} onChange={(event) => setVersion(event.target.value === "1" ? "1" : "2c")}>
            <option value="2c">2c</option>
            <option value="1">1</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">COMMUNITY</span>
          <input className={control} value={community} onChange={(event) => setCommunity(event.target.value)} spellCheck={false} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">OID, OPTIONAL</span>
          <input className={control} value={oid} onChange={(event) => setOid(event.target.value)} placeholder="blank walks the whole tree" spellCheck={false} />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="font-mono text-xs tracking-wide text-muted">ONESIXTYONE COMMUNITIES</span>
          <textarea className={control + " min-h-24 py-2 font-mono"} value={communities} onChange={(event) => setCommunities(event.target.value)} spellCheck={false} />
        </label>
      </div>
      <div className="flex flex-col gap-3 px-4 pb-4">
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="font-mono text-xs tracking-wide text-muted">COMMAND</p>
            <button type="button" onClick={() => void copy("walk", walk?.command ?? "")} disabled={!walk} className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs text-muted disabled:opacity-40">
              <Copy className="size-3.5" aria-hidden="true" />
              {copied === "walk" ? "Copied" : "Copy walk"}
            </button>
          </div>
          <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-bg p-3 font-mono text-xs leading-relaxed text-fg">
            {walk?.command || "Type the target. The walk command appears here."}
            {one ? `\n${one.command}` : ""}
          </pre>
        </div>
        <p className="text-sm text-fg">
          Quick onesixtyone tries public, private, manager, and community. Quick walk uses public and version 2c. Quick SSID walk asks the IEEE wireless tree. Cisco SSID asks a controller. Read it is the parser: system, interfaces, listeners, software, and any SSID, instead of the raw dump.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={!host} onClick={() => void runOne(true)} className="inline-flex min-h-11 items-center rounded-lg border border-primary bg-raised px-3 text-sm text-fg disabled:opacity-40">
            Quick onesixtyone
          </button>
          <button type="button" disabled={!quickWalk} onClick={() => quickWalk && void runWalk(quickWalk, "2c", "public", "")} className="inline-flex min-h-11 items-center rounded-lg border border-primary bg-raised px-3 text-sm text-fg disabled:opacity-40">
            Quick snmpwalk
          </button>
          <button type="button" disabled={!ssidWalk} onClick={() => ssidWalk && void runWalk(ssidWalk, version, communityOk || "public", SSID_OID)} className="inline-flex min-h-11 items-center rounded-lg border border-border bg-bg px-3 text-sm text-fg disabled:opacity-40">
            Quick SSID walk
          </button>
          <button type="button" disabled={!ciscoWalk} onClick={() => ciscoWalk && void runWalk(ciscoWalk, version, communityOk || "public", CISCO_SSID_OID)} className="inline-flex min-h-11 items-center rounded-lg border border-border bg-bg px-3 text-sm text-fg disabled:opacity-40">
            Quick Cisco SSID
          </button>
          <button type="button" disabled={!walk} onClick={() => walk && communityOk && oidOk != null && void runWalk(walk, version, communityOk, oidOk)} className="inline-flex min-h-11 items-center rounded-lg border border-border bg-bg px-3 text-sm text-muted disabled:opacity-40">
            Run this walk
          </button>
          <button type="button" disabled={!one} onClick={() => void runOne(false)} className="inline-flex min-h-11 items-center rounded-lg border border-border bg-bg px-3 text-sm text-muted disabled:opacity-40">
            Run onesixtyone list
          </button>
        </div>
        <JobList tool="snmp" empty="No SNMP run yet." onRead={read} />
        {view ? <Readout view={view} /> : null}
      </div>
    </article>
  );
}

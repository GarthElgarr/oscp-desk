import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnLiveJob } from "./live-jobs.server";
import { communityList, onesixtyPlan, snmpCommunity, snmpOid, snmpTarget, walkPlan } from "./snmp-plan";

export function snmpRequest(body: unknown): { command: string; args: string[]; communities?: string[]; bin: "onesixtyone" | "snmpwalk" } | { error: string } {
  if (!body || typeof body !== "object") return { error: "The request was not JSON." };
  const row = body as { mode?: unknown; target?: unknown; version?: unknown; community?: unknown; oid?: unknown; communities?: unknown; quick?: unknown };
  const target = snmpTarget(row.target);
  if (!target) return { error: "Give one IPv4 address." };
  if (row.mode === "onesixty") {
    const communities = communityList(row.communities, row.quick === true);
    if (!communities) return { error: "Each community is one line, letters and numbers only, up to 40 lines." };
    const plan = onesixtyPlan(target, communities);
    return { ...plan, bin: "onesixtyone" };
  }
  if (row.mode !== "walk") return { error: "Pick snmpwalk or onesixtyone." };
  const version = row.version === "1" ? "1" : row.version === "2c" ? "2c" : null;
  if (!version) return { error: "SNMP version is 1 or 2c." };
  const community = snmpCommunity(row.community);
  if (!community) return { error: "The community string may only use letters, numbers, and . _ : @ -" };
  const oid = snmpOid(row.oid);
  if (oid == null) return { error: "The OID is a name, such as system, or numbers separated by dots." };
  const plan = walkPlan(target, version, community, oid);
  return { ...plan, bin: "snmpwalk" };
}

export function startSnmp(id: string, job: { command: string; args: string[]; communities?: string[]; bin: "onesixtyone" | "snmpwalk" }): boolean {
  const args = [...job.args];
  let command = job.command;
  if (job.bin === "onesixtyone" && job.communities) {
    const dir = path.resolve(process.cwd(), "scans");
    mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${id}.communities`);
    writeFileSync(file, `${job.communities.join("\n")}\n`);
    const at = args.indexOf("communities.txt");
    if (at >= 0) args[at] = file;
    command = `onesixtyone -c ${file} ${args[args.length - 1]}  # ${job.communities.join(", ")}`;
  }
  return spawnLiveJob({
    id,
    tool: "snmp",
    title: job.command.slice(0, 80),
    command,
    bin: job.bin,
    args,
    timeoutMs: job.bin === "snmpwalk" ? 180_000 : 60_000,
    maxOut: 800_000,
    missing:
      job.bin === "snmpwalk"
        ? "snmpwalk was not found. On Kali, the install button includes the snmp package.\n"
        : "onesixtyone was not found. On Kali, the install button includes it.\n",
    doneLine: (code, stopped) => (stopped ? "\n[stopped]\n" : `\n[${job.bin} exit ${code ?? "unknown"}]\n`),
  });
}

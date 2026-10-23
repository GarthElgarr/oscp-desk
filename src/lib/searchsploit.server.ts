import { existsSync } from "node:fs";
import path from "node:path";
import { scansDir } from "./nmap-scan.server";
import { spawnLiveJob } from "./live-jobs.server";
import { searchsploitArgsOk, searchsploitPlan } from "./searchsploit";

export function searchsploitRequest(body: unknown): { command: string; args: string[] } | { error: string } {
  if (!body || typeof body !== "object") return { error: "The request was not JSON." };
  const row = body as {
    mode?: unknown;
    terms?: unknown;
    title?: unknown;
    exact?: unknown;
    web?: unknown;
    exclude?: unknown;
    nmapFile?: unknown;
    edb?: unknown;
  };
  const mode = row.mode === "nmap" || row.mode === "path" ? row.mode : "terms";
  const plan = searchsploitPlan({
    mode,
    terms: typeof row.terms === "string" ? row.terms : "",
    title: row.title === true,
    exact: row.exact === true,
    web: row.web === true,
    exclude: typeof row.exclude === "string" ? row.exclude : "",
    nmapFile: typeof row.nmapFile === "string" ? row.nmapFile : "",
    edb: typeof row.edb === "string" ? row.edb : "",
  });
  if ("error" in plan) return plan;
  if (!searchsploitArgsOk(plan.args)) return { error: "Those arguments are not a searchsploit command this desk will run." };
  const nmapArg = plan.args.indexOf("--nmap");
  if (nmapArg >= 0) {
    const file = path.join(scansDir(), path.basename(plan.args[nmapArg + 1] ?? ""));
    if (!existsSync(file)) return { error: "That saved scan has no XML yet. Run the scan first, or pick another name." };
    plan.args[nmapArg + 1] = file;
  }
  return plan;
}

export function startSearchsploit(id: string, command: string, args: string[]): boolean {
  return spawnLiveJob({
    id,
    tool: "search",
    title: command.slice(0, 80),
    command,
    bin: "searchsploit",
    args,
    timeoutMs: 30_000,
    maxOut: 200_000,
    missing: "searchsploit was not found. On Kali, the install button includes exploitdb.\n",
    doneLine: (code, stopped) => (stopped ? "\n[stopped]\n" : `\n[searchsploit exit ${code ?? "unknown"}]\n`),
  });
}

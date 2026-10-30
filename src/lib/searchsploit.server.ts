import { spawn } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { scansDir } from "./nmap-scan.server";
import { openJob, spawnLiveJob } from "./live-jobs.server";
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
  const mode = row.mode === "nmap" || row.mode === "path" || row.mode === "examine" ? row.mode : "terms";
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
  if (args[0] === "-x" && /^\d{1,7}$/.test(args[1] ?? "")) return startExamine(id, command, args[1]);
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

const HEAD_LINES = 80;

function startExamine(id: string, command: string, edb: string): boolean {
  const handle = openJob({
    id,
    tool: "search",
    title: command.slice(0, 80),
    command,
    timeoutMs: 20_000,
    maxOut: 80_000,
  });
  if (!handle) return false;
  handle.push(`$ ${command}\n`);
  const child = spawn("searchsploit", ["-p", edb], {
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, PAGER: "cat" },
  });
  handle.attach(child);
  let out = "";
  let failed = false;
  const take = (buf: Buffer) => {
    if (out.length < 20_000) out += buf.toString();
  };
  child.stdout?.on("data", take);
  child.stderr?.on("data", take);
  child.on("error", (err: NodeJS.ErrnoException) => {
    failed = true;
    handle.finish(err.code === "ENOENT" ? "searchsploit was not found. On Kali, the install button includes exploitdb.\n" : `${err.message}\n`);
  });
  child.on("close", (code) => {
    if (failed) return;
    if (handle.stopped()) {
      handle.finish("\n[stopped]\n");
      return;
    }
    const file = out.match(/^\s*Path:\s+(\S+)/m)?.[1] ?? "";
    if (!file || code !== 0) {
      if (out.trim()) handle.push(`${out.trim()}\n`);
      handle.finish(`\n[searchsploit exit ${code ?? "unknown"}]\n`);
      return;
    }
    let resolved = "";
    try {
      resolved = realpathSync(file);
    } catch {
      handle.push(`${out.trim()}\n`);
      handle.finish("\n[searchsploit exit 1]\n");
      return;
    }
    if (!/\/exploit-?db\//.test(resolved)) {
      handle.finish("searchsploit did not point at an exploitdb file.\n[searchsploit exit 1]\n");
      return;
    }
    let text = "";
    try {
      text = readFileSync(resolved, "utf8");
    } catch (err) {
      handle.finish(`${err instanceof Error ? err.message : "Could not read that exploit."}\n[searchsploit exit 1]\n`);
      return;
    }
    const lines = text.split(/\r?\n/);
    handle.push(lines.slice(0, HEAD_LINES).join("\n") + "\n");
    if (lines.length > HEAD_LINES) handle.push(`[first ${HEAD_LINES} lines of ${lines.length}]\n`);
    handle.finish("\n[searchsploit exit 0]\n");
  });
  return true;
}

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { scansDir } from "./nmap-scan.server";
import { searchsploitArgsOk, searchsploitPlan } from "./searchsploit";

const MAX_OUT = 200_000;
const TIMEOUT_MS = 30_000;

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

export function searchsploitStream(command: string, args: string[], signal: AbortSignal): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let sent = 0;
  let killed = false;
  let child: ReturnType<typeof spawn> | null = null;
  const kill = () => {
    killed = true;
    child?.kill("SIGTERM");
  };
  const timer = setTimeout(kill, TIMEOUT_MS);
  signal.addEventListener("abort", kill);
  return new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        clearTimeout(timer);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      const push = (text: string) => {
        if (!text || sent >= MAX_OUT || closed) return;
        const slice = text.slice(0, MAX_OUT - sent);
        sent += slice.length;
        try {
          controller.enqueue(encoder.encode(slice));
        } catch {
          killed = true;
        }
        if (sent >= MAX_OUT) kill();
      };
      push(`$ ${command}\n`);
      child = spawn("searchsploit", args, { shell: false, stdio: ["ignore", "pipe", "pipe"] });
      const take = (buf: Buffer) => push(buf.toString());
      child.stdout?.on("data", take);
      child.stderr?.on("data", take);
      child.on("error", (err: NodeJS.ErrnoException) => {
        push(err.code === "ENOENT" ? "searchsploit was not found. On Kali, the install button includes exploitdb.\n" : `${err.message}\n`);
        close();
      });
      child.on("close", (code) => {
        push(killed ? "\n[stopped]\n" : `\n[searchsploit exit ${code ?? "unknown"}]\n`);
        close();
      });
    },
    cancel() {
      kill();
    },
  });
}

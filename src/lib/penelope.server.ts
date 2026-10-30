import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { attachWriter, listJobs, openJob, stopJob } from "./live-jobs.server";
import { penelopePlan } from "./penelope-plan";

const listeners = new Map<string, number>();
const usedPorts = new Set<string>();

function listenPort(args: string[]): string {
  const at = args.indexOf("-p");
  const port = at >= 0 ? args[at + 1] ?? "" : "";
  return /^\d{1,5}$/.test(port) && Number(port) >= 1 && Number(port) <= 65535 ? port : "";
}

function freePort(port: string) {
  if (!listenPort(["-p", port])) return;
  spawnSync("fuser", ["-k", `${port}/tcp`], { timeout: 3000 });
}

export function killPenelope(port: string): string {
  for (const job of listJobs()) {
    if (job.tool === "penelope" && job.running) stopJob(job.id);
  }
  for (const pid of listeners.values()) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      /* the wrapper has already exited */
    }
  }
  listeners.clear();
  const ports = new Set(usedPorts);
  if (listenPort(["-p", port])) ports.add(port);
  for (const item of ports) freePort(item);
  usedPorts.clear();
  spawnSync("pkill", ["-9", "-x", "penelope"], { timeout: 3000 });
  return "Penelope is killed and the port is free. Start can listen again.\n";
}

export function penelopeRequest(body: unknown): { command: string; args: string[] } | { error: string } {
  if (!body || typeof body !== "object") return { error: "The request was not JSON." };
  const row = body as { mode?: unknown; port?: unknown; iface?: unknown; host?: unknown };
  const plan = penelopePlan({
    mode: row.mode === "connect" ? "connect" : "listen",
    port: typeof row.port === "string" ? row.port : "",
    iface: typeof row.iface === "string" ? row.iface : "",
    host: typeof row.host === "string" ? row.host : "",
  });
  if ("error" in plan) return plan;
  return { command: plan.command, args: plan.args };
}

export function startPenelope(id: string, command: string, args: string[]): boolean | string {
  if (listJobs().some((job) => job.running && job.tool === "penelope")) {
    return "Penelope is already running. Stop that one before you start another.\n";
  }
  const bridge = path.join(process.cwd(), "tools", "penelope-bridge.py");
  const script = "/opt/penelope/penelope.py";
  const bundled = existsSync(script);
  const found = bundled ? null : spawnSync("which", ["penelope"], { encoding: "utf8" });
  const bin = bundled ? "python3" : found && found.status === 0 ? found.stdout.trim().split("\n")[0] : "";
  const commandArgs = bundled ? [script, ...args] : args;
  const handle = openJob({
    id,
    tool: "penelope",
    title: command,
    command,
    timeoutMs: 6 * 60 * 60 * 1000,
    maxOut: 2_000_000,
    trim: true,
  });
  if (!handle) return false;
  handle.push(`$ ${command}\n`);
  if (!bin || !existsSync(bridge)) {
    handle.finish(`${bin ? "The Penelope bridge is missing from tools/." : "penelope was not found. On Kali, the install button includes it."}\n[penelope exit 1]\n`);
    return true;
  }
  const child = spawn("python3", [bridge, bin, ...commandArgs], { shell: false, stdio: ["pipe", "pipe", "pipe"] });
  if (child.pid) listeners.set(id, child.pid);
  const port = listenPort(args);
  if (port) usedPorts.add(port);
  handle.attach(child);
  if (child.stdin) {
    attachWriter(id, (text) => {
      try {
        child.stdin?.write(text);
      } catch {
        /* the listener already closed */
      }
    });
  }
  const take = (buf: Buffer) => handle.push(buf.toString("utf8").replace(/\0/g, ""));
  child.stdout?.on("data", take);
  child.stderr?.on("data", take);
  child.on("error", (err: NodeJS.ErrnoException) => {
    handle.finish(err.code === "ENOENT" ? "python3 was not found, so Penelope could not be started.\n" : `${err.message}\n`);
  });
  child.on("close", (code) => {
    handle.finish(handle.stopped() ? "\n[stopped]\n" : `\n[penelope exit ${code ?? "unknown"}]\n`);
  });
  return true;
}

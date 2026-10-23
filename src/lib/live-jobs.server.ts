import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, readdirSync, unlinkSync } from "node:fs";
import path from "node:path";

export type LiveJob = {
  id: string;
  tool: string;
  title: string;
  command: string;
  name: string;
  output: string;
  running: boolean;
};

const MAX_RUNNING = 6;
const jobs: LiveJob[] = [];
const killers = new Map<string, () => void>();
const writers = new Map<string, (text: string) => void>();
const dropped = new Set<string>();

export function jobId(value: unknown): string | null {
  if (typeof value !== "string" || !/^[a-z][a-z0-9-]{0,40}$/.test(value)) return null;
  return value;
}

export function listJobs(): LiveJob[] {
  return jobs.map((job) => ({ ...job }));
}

function remember(job: LiveJob) {
  const rest = jobs.filter((item) => item.id !== job.id);
  const running = rest.filter((item) => item.running);
  const done = rest.filter((item) => !item.running);
  jobs.splice(0, jobs.length, job, ...running, ...done.slice(0, 19));
}

export function openJob(input: {
  id: string;
  tool: string;
  title: string;
  command: string;
  name?: string;
  timeoutMs: number;
  maxOut?: number;
}): { push: (text: string) => void; finish: (line: string) => void; kill: () => void; stopped: () => boolean; attach: (child: ChildProcess) => void } | null {
  if (!jobId(input.id)) return null;
  if (jobs.some((job) => job.running && job.id === input.id)) return null;
  if (jobs.filter((job) => job.running).length >= MAX_RUNNING) return null;
  const job: LiveJob = {
    id: input.id,
    tool: input.tool,
    title: input.title.slice(0, 80),
    command: input.command.slice(0, 500),
    name: (input.name ?? "").slice(0, 48),
    output: "",
    running: true,
  };
  remember(job);
  const maxOut = input.maxOut ?? 400_000;
  let sent = 0;
  let finished = false;
  let stopped = false;
  let child: ChildProcess | null = null;
  const kill = () => {
    stopped = true;
    child?.kill("SIGTERM");
  };
  killers.set(job.id, kill);
  const timer = setTimeout(kill, input.timeoutMs);
  const push = (text: string) => {
    if (!text || sent >= maxOut) return;
    const slice = text.slice(0, maxOut - sent);
    sent += slice.length;
    job.output += slice;
    if (sent >= maxOut) kill();
  };
  const finish = (line: string) => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    killers.delete(job.id);
    writers.delete(job.id);
    if (dropped.delete(job.id)) return;
    push(line);
    job.running = false;
    remember(job);
  };
  return { push, finish, kill, stopped: () => stopped, attach(next: ChildProcess) { child = next; } };
}

export function spawnLiveJob(input: {
  id: string;
  tool: string;
  title: string;
  command: string;
  name?: string;
  bin: string;
  args: string[];
  timeoutMs: number;
  maxOut?: number;
  env?: NodeJS.ProcessEnv;
  missing: string;
  doneLine: (code: number | null, stopped: boolean) => string;
}): boolean {
  const handle = openJob(input);
  if (!handle) return false;
  handle.push(`$ ${input.command}\n`);
  const child = spawn(input.bin, input.args, { shell: false, stdio: ["ignore", "pipe", "pipe"], env: input.env });
  handle.attach(child);
  const take = (buf: Buffer) => handle.push(buf.toString().replace(/\x1b\[[0-9;]*[A-Za-z]/g, "").replace(/\r(?!\n)/g, "\n"));
  child.stdout?.on("data", take);
  child.stderr?.on("data", take);
  child.on("error", (err: NodeJS.ErrnoException) => {
    handle.finish(err.code === "ENOENT" ? input.missing : `${err.message}\n`);
  });
  child.on("close", (code) => {
    handle.finish(input.doneLine(code, handle.stopped()));
  });
  return true;
}

export function writeJob(id: string, text: string): boolean {
  const write = writers.get(id);
  if (!write || text.length < 1 || text.length > 400 || text.includes("\0")) return false;
  write(text);
  const job = jobs.find((item) => item.id === id);
  const preview = text.replace(/[^\x20-\x7e\n]/g, "").trim();
  if (job && job.output.length < 800_000) job.output += preview ? `\n> ${preview}\n` : "\n> (key)\n";
  return true;
}

export function attachWriter(id: string, write: (text: string) => void) {
  writers.set(id, write);
}

export function stopJob(id: string): boolean {
  const kill = killers.get(id);
  if (!kill) return false;
  kill();
  return true;
}

export function removeJob(id: string): boolean {
  const job = jobs.find((item) => item.id === id);
  if (killers.has(id)) dropped.add(id);
  stopJob(id);
  if (job?.name) deleteScanFiles(job.name);
  const before = jobs.length;
  const next = jobs.filter((item) => item.id !== id);
  jobs.splice(0, jobs.length, ...next);
  return next.length !== before;
}

function deleteScanFiles(name: string) {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,40}$/.test(name)) return;
  const dir = path.resolve(process.cwd(), "scans");
  if (!existsSync(dir)) return;
  for (const ext of [".nmap", ".xml", ".gnmap"]) {
    const file = path.join(dir, `${name}${ext}`);
    if (existsSync(file)) unlinkSync(file);
  }
}

export function clearJobs(): void {
  for (const id of killers.keys()) dropped.add(id);
  for (const kill of killers.values()) kill();
  killers.clear();
  jobs.splice(0, jobs.length);
}

export function clearScanFiles(): void {
  const dir = path.resolve(process.cwd(), "scans");
  if (!existsSync(dir)) return;
  for (const file of readdirSync(dir)) {
    if (file === "README.txt") continue;
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/.test(file)) continue;
    unlinkSync(path.join(dir, file));
  }
}

import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync, unlinkSync } from "node:fs";
import path from "node:path";
import { writePrivateFile } from "./private-file.ts";
import { redactStoredCommand, redactStoredOutput } from "./redact-command.ts";
import { createTerminalFeed } from "./terminal-feed.ts";

export { createTerminalFeed } from "./terminal-feed.ts";

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
const KEEP = 200;
const RUNS_FILE = path.resolve(process.cwd(), "scans", "runs.json");
const jobs: LiveJob[] = [];
const killers = new Map<string, () => void>();
const writers = new Map<string, (text: string) => void>();
const dropped = new Set<string>();
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function saveRuns() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    writeRunsNow();
  }, 500);
}

function writeRunsNow() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  try {
    const body = jobs.map((job) => ({
      ...job,
      title: redactStoredCommand(job.title).slice(0, 500),
      command: redactStoredCommand(job.command).slice(0, 500),
      output: redactStoredOutput(job.output).slice(-120_000),
    }));
    writePrivateFile(RUNS_FILE, JSON.stringify(body));
  } catch {
    /* the next change tries again */
  }
}

function loadRuns() {
  try {
    const raw = JSON.parse(readFileSync(RUNS_FILE, "utf8")) as unknown;
    if (!Array.isArray(raw)) return;
    const loaded: LiveJob[] = [];
    let dirty = false;
    for (const row of raw) {
      if (!row || typeof row !== "object") continue;
      const job = row as Partial<LiveJob>;
      if (typeof job.id !== "string" || !jobId(job.id) || typeof job.tool !== "string") continue;
      const rawTitle = typeof job.title === "string" ? job.title.slice(0, 500) : "";
      const rawCommand = typeof job.command === "string" ? job.command.slice(0, 500) : "";
      const rawOutput = typeof job.output === "string" ? job.output.slice(-120_000) : "";
      const title = redactStoredCommand(rawTitle).slice(0, 500);
      const command = redactStoredCommand(rawCommand).slice(0, 500);
      const output = redactStoredOutput(rawOutput);
      const storedOutput = job.running ? `${output}\n[desk restarted before this finished]\n` : output;
      if (title !== rawTitle || command !== rawCommand || storedOutput !== rawOutput) dirty = true;
      loaded.push({
        id: job.id,
        tool: job.tool.slice(0, 24),
        title,
        command,
        name: typeof job.name === "string" ? job.name.slice(0, 48) : "",
        output: storedOutput,
        running: false,
      });
    }
    jobs.splice(0, jobs.length, ...loaded.slice(0, KEEP));
    if (dirty) writeRunsNow();
  } catch {
    /* no saved runs yet */
  }
}

export function jobId(value: unknown): string | null {
  if (typeof value !== "string" || !/^[a-z][a-z0-9-]{0,40}$/.test(value)) return null;
  return value;
}

export function listJobs(): LiveJob[] {
  return jobs.map((job) => ({
    ...job,
    title: redactStoredCommand(job.title).slice(0, 500),
    command: redactStoredCommand(job.command).slice(0, 500),
    output: redactStoredOutput(job.output),
  }));
}

function remember(job: LiveJob) {
  const rest = jobs.filter((item) => item.id !== job.id);
  const running = rest.filter((item) => item.running);
  const done = rest.filter((item) => !item.running);
  jobs.splice(0, jobs.length, job, ...running, ...done.slice(0, KEEP - 1));
  saveRuns();
}

export function openJob(input: {
  id: string;
  tool: string;
  title: string;
  command: string;
  name?: string;
  timeoutMs: number;
  maxOut?: number;
  trim?: boolean;
}): { push: (text: string) => void; finish: (line: string) => void; kill: () => void; paint: (full: string, block: { value: string }) => void; stopped: () => boolean; attach: (child: ChildProcess) => void } | null {
  if (!jobId(input.id)) return null;
  if (jobs.some((job) => job.running && job.id === input.id)) return null;
  if (jobs.filter((job) => job.running).length >= MAX_RUNNING) return null;
  const job: LiveJob = {
    id: input.id,
    tool: input.tool,
    title: redactStoredCommand(input.title).slice(0, 500),
    command: redactStoredCommand(input.command).slice(0, 500),
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
    saveRuns();
    if (sent >= maxOut) {
      if (input.trim) {
        job.output = job.output.slice(-Math.floor(maxOut / 2));
        sent = job.output.length;
      } else kill();
    }
  };
  const finish = (line: string) => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    killers.delete(job.id);
    writers.delete(job.id);
    if (dropped.delete(job.id)) return;
    if (line) {
      if (sent >= maxOut) job.output += line.slice(0, 400);
      else push(line);
    }
    job.running = false;
    remember(job);
  };
  const paint = (full: string, block: { value: string }) => {
    paintJob(job, full, block);
    sent = job.output.length;
    saveRuns();
    if (sent >= maxOut) {
      if (input.trim) {
        job.output = job.output.slice(-Math.floor(maxOut / 2));
        block.value = "";
        sent = job.output.length;
      } else kill();
    }
  };
  return { push, finish, kill, paint, stopped: () => stopped, attach(next: ChildProcess) { child = next; } };
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
  tty?: boolean;
  missing: string;
  doneLine: (code: number | null, stopped: boolean) => string;
}): boolean {
  const handle = openJob(input);
  if (!handle) return false;
  handle.push(`$ ${redactStoredCommand(input.command)}\n`);
  const env = { ...process.env, COLUMNS: "200", LINES: "50", ...(input.env ?? {}) };
  const child = input.tty
    ? spawn("python3", ["-c", PTY_WRAP, input.bin, ...input.args], { shell: false, stdio: ["ignore", "pipe", "pipe"], env })
    : spawn(input.bin, input.args, { shell: false, stdio: ["ignore", "pipe", "pipe"], env });
  handle.attach(child);
  const block = { value: "" };
  const feed = createTerminalFeed((full) => handle.paint(full, block));
  const take = (buf: Buffer) => feed.write(buf.toString());
  child.stdout?.on("data", take);
  child.stderr?.on("data", take);
  child.on("error", (err: NodeJS.ErrnoException) => {
    feed.flush();
    handle.finish(err.code === "ENOENT" ? input.missing : `${err.message}\n`);
  });
  child.on("close", (code) => {
    feed.flush();
    handle.finish(input.doneLine(code, handle.stopped()));
  });
  return true;
}

function paintJob(job: LiveJob, full: string, block: { value: string }) {
  if (block.value && job.output.endsWith(block.value)) job.output = job.output.slice(0, -block.value.length) + full;
  else if (!block.value) job.output += full;
  block.value = full;
}

const PTY_WRAP = [
  "import fcntl, os, struct, sys, termios",
  "pid, fd = __import__('pty').fork()",
  "if pid == 0:",
  "    try:",
  "        os.execvp(sys.argv[1], sys.argv[1:])",
  "    except OSError as err:",
  "        sys.stderr.write((err.strerror or 'exec failed') + '\\n')",
  "        os._exit(127)",
  "try:",
  "    fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack('HHHH', 50, 200, 0, 0))",
  "except OSError:",
  "    pass",
  "while True:",
  "    try:",
  "        data = os.read(fd, 4096)",
  "    except OSError:",
  "        break",
  "    if not data:",
  "        break",
  "    sys.stdout.buffer.write(data)",
  "    sys.stdout.buffer.flush()",
  "_, status = os.waitpid(pid, 0)",
  "code = os.waitstatus_to_exitcode(status)",
  "sys.exit(code if 0 <= code <= 255 else 1)",
].join("\n");

export function writeJob(id: string, text: string, silent = false): boolean {
  const write = writers.get(id);
  if (!write || text.length < 1 || text.length > 8000 || text.includes("\0")) return false;
  write(text);
  if (silent) return true;
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
  const nameStillUsed = jobs.some((item) => item.id !== id && item.tool === "nmap" && item.name && item.name === job?.name);
  if (job?.tool === "nmap" && job.name && !nameStillUsed) deleteScanFiles(job.name);
  const before = jobs.length;
  const next = jobs.filter((item) => item.id !== id);
  jobs.splice(0, jobs.length, ...next);
  saveRuns();
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
  writers.clear();
  jobs.splice(0, jobs.length);
  writeRunsNow();
}

function unlinkTree(dir: string) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) unlinkTree(full);
    else unlinkSync(full);
  }
}

/** Delete the run log, hydra/crack files, and SNMP community files. Leave the readme, nmap output, and the exam ledger. Refuses while a job is running. */
export function clearRunsAndLoot(root = process.cwd(), busy = jobs.some((job) => job.running)): boolean {
  if (busy) return false;
  if (path.resolve(root) === path.resolve(process.cwd())) {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    jobs.splice(0, jobs.length);
  }
  const runs = path.resolve(root, "scans", "runs.json");
  if (existsSync(runs)) unlinkSync(runs);
  unlinkTree(path.resolve(root, "scans", "hydra"));
  unlinkTree(path.resolve(root, "scans", "crack"));
  const scans = path.resolve(root, "scans");
  if (existsSync(scans)) {
    for (const name of readdirSync(scans)) {
      if (!/^[a-z][a-z0-9-]{0,40}\.communities$/.test(name)) continue;
      const full = path.join(scans, name);
      if (statSync(full).isFile()) unlinkSync(full);
    }
  }
  return true;
}

export function clearScanFiles(root = process.cwd()): void {
  const dir = path.resolve(root, "scans");
  if (!existsSync(dir)) return;
  for (const file of readdirSync(dir)) {
    if (file === "README.txt" || file === "runs.json" || file === "exam-ledger.json") continue;
    if (file.endsWith(".tmp")) continue;
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/.test(file)) continue;
    const full = path.join(dir, file);
    if (!statSync(full).isFile()) continue;
    unlinkSync(full);
  }
}

loadRuns();

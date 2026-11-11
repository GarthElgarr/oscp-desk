import { deskFetch } from "./desk-fetch.ts";
import { redactStoredCommand } from "./redact-command.ts";

export type LiveJob = {
  id: string;
  tool: string;
  title: string;
  command: string;
  name: string;
  output: string;
  running: boolean;
  /** A start that the server rejected. Kept so the error does not vanish on the next poll. */
  local?: boolean;
};

const EMPTY: LiveJob[] = [];
let jobs: LiveJob[] = EMPTY;
const listeners = new Set<() => void>();
let seq = 0;
let timer: ReturnType<typeof setInterval> | null = null;

function publish(next: LiveJob[]) {
  jobs = next;
  for (const listener of listeners) listener();
}

export function getJobs(): LiveJob[] {
  return jobs;
}

export function getJobsServer(): LiveJob[] {
  return EMPTY;
}

export function subscribeJobs(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function syncJobs(): Promise<void> {
  try {
    const response = await deskFetch("/api/jobs");
    if (!response.ok) return;
    const body = (await response.json()) as { jobs?: LiveJob[] };
    if (!Array.isArray(body.jobs)) return;
    const server = body.jobs.filter((job) => job && typeof job.id === "string");
    const ids = new Set(server.map((job) => job.id));
    const pending = jobs.filter((job) => job.running && job.output === "" && !ids.has(job.id));
    const local = jobs.filter((job) => job.local && !ids.has(job.id));
    publish([...pending, ...local, ...server]);
    if (jobs.some((job) => job.running)) {
      if (!timer) timer = setInterval(() => void syncJobs(), 700);
    } else if (timer) {
      clearInterval(timer);
      timer = null;
    }
  } catch {
    /* the next poll tries again */
  }
}

export async function launchJob(
  endpoint: string,
  body: Record<string, unknown>,
  pending: { tool: string; title: string; command: string; name?: string },
): Promise<void> {
  const id = `${pending.tool}-${Date.now().toString(36)}-${++seq}`;
  const title = redactStoredCommand(pending.title).slice(0, 500);
  const command = redactStoredCommand(pending.command).slice(0, 500);
  publish([{ id, tool: pending.tool, title, command, name: pending.name ?? "", output: "", running: true }, ...jobs]);
  if (!timer) timer = setInterval(() => void syncJobs(), 700);
  let response: Response;
  try {
    response = await deskFetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...body, id, tool: pending.tool }),
    });
  } catch {
    publish(jobs.map((job) => (job.id === id ? { ...job, output: "The desk did not answer. Try again.\n", running: false, local: true } : job)));
    return;
  }
  if (!response.ok) {
    const text = await response.text();
    publish(jobs.map((job) => (job.id === id ? { ...job, output: text, running: false, local: true } : job)));
    return;
  }
  await syncJobs();
}

async function post(body: Record<string, unknown>) {
  await deskFetch("/api/jobs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  await syncJobs();
}

export function stopJob(id: string) {
  return post({ stop: id });
}

export function removeJob(id: string) {
  publish(jobs.filter((job) => job.id !== id));
  return post({ remove: id });
}

export function sendJob(id: string, text: string) {
  return post({ write: id, text });
}

export function clearJobs() {
  publish([]);
  return post({ clear: true });
}

export async function clearRunsAndLoot(): Promise<string | null> {
  let response: Response;
  try {
    response = await deskFetch("/api/jobs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clearRuns: true }),
    });
  } catch {
    return "The run log was not cleared. Try again.";
  }
  if (response.status === 409) {
    const text = (await response.text()).trim();
    await syncJobs();
    return text || "A run is still going. Stop it before clearing runs and loot files.";
  }
  if (!response.ok) {
    const text = (await response.text()).trim();
    return text || "The run log was not cleared.";
  }
  publish([]);
  await syncJobs();
  return null;
}

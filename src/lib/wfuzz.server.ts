import { urlTargets } from "./exam-block.ts";
import { jobId, spawnLiveJob } from "./live-jobs.server.ts";
import { storedCommand } from "./redact-command.ts";
import { examGuard } from "./scope-guard.server.ts";
import { wfuzzArgsOk } from "./wfuzz-args.ts";

export type WfuzzStart = (input: { id: string; command: string; args: string[] }) => boolean;

export function startWfuzz(input: { id: string; command: string; args: string[] }): boolean {
  return spawnLiveJob({
    id: input.id,
    tool: "wfuzz",
    title: input.command,
    command: input.command,
    bin: "wfuzz",
    args: input.args,
    timeoutMs: 5 * 60 * 1000,
    maxOut: 300_000,
    tty: true,
    env: { ...process.env, PYTHONWARNINGS: "ignore:Pycurl is not compiled:UserWarning" },
    missing: "wfuzz was not found. On Kali, the install button includes wfuzz.\n",
    doneLine: (code, stopped) => (stopped ? "\n[stopped]\n" : `\n[exit ${code ?? "unknown"}]\n`),
  });
}

export function wfuzzHttp(body: unknown, start: WfuzzStart = startWfuzz): Response {
  const args = (body as { args?: unknown } | null)?.args;
  if (!wfuzzArgsOk(args)) return new Response("Those arguments are not a wfuzz command this desk will run.\n", { status: 400 });
  const id = jobId((body as { id?: unknown }).id);
  if (!id) return new Response("The scan id is missing.\n", { status: 400 });
  const raw = ["wfuzz", ...args].join(" ");
  const command = storedCommand("wfuzz", args);
  const blocked = examGuard(urlTargets(args), raw);
  if (blocked) return new Response(`${blocked}\n`, { status: 403 });
  const started = start({ id, command, args });
  if (!started) return new Response("Too many scans are already running. Stop one before starting another.\n", { status: 429 });
  return Response.json({ ok: true });
}

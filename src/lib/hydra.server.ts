import { writePrivateFile } from "./private-file.ts";
import path from "node:path";
import { ipv4Targets } from "./exam-block.ts";
import { hydraArgsOk } from "./hydra-args.ts";
import { jobId, spawnLiveJob } from "./live-jobs.server.ts";
import { confineHydraArgs, ensureToolDir } from "./output-path.ts";
import { storedCommand } from "./redact-command.ts";
import { examGuard } from "./scope-guard.server.ts";

const LOOT = /^scans\/hydra\/loot-(users|passwords)-[a-z0-9]+\.txt$/;

function listFile(text: unknown): string | null {
  if (typeof text !== "string" || text.length > 20_000 || text.includes("\0")) return null;
  const lines = text
    .split("\n")
    .map((line) => line.replace(/\r/g, "").trim())
    .filter(Boolean);
  if (lines.length < 1 || lines.length > 200 || lines.some((line) => line.length > 200)) return null;
  return `${lines.join("\n")}\n`;
}

function lootName(args: string[], kind: "users" | "passwords"): string | null {
  return args.find((arg) => new RegExp(`^scans/hydra/loot-${kind}-[a-z0-9]+\\.txt$`).test(arg)) ?? null;
}

function lootDest(root: string, name: string): string | null {
  if (!LOOT.test(name)) return null;
  const dir = path.resolve(root, "scans", "hydra");
  const full = path.resolve(root, name);
  const rel = path.relative(dir, full);
  if (rel.startsWith("..") || path.isAbsolute(rel) || rel.includes(path.sep)) return null;
  return full;
}

export type HydraStart = (input: { id: string; command: string; args: string[]; cwd?: string }) => boolean;

export function startHydra(input: { id: string; command: string; args: string[]; cwd?: string }): boolean {
  if (input.cwd) ensureToolDir(input.cwd);
  return spawnLiveJob({
    id: input.id,
    tool: "hydra",
    title: input.command,
    command: input.command,
    bin: "hydra",
    args: input.args,
    cwd: input.cwd,
    timeoutMs: 180_000,
    maxOut: 200_000,
    missing: "hydra was not found on this machine. Run the desk on Kali, where hydra is already installed.\n",
    doneLine: (code, stopped) => (stopped ? "\n[stopped]\n" : `\n[exit ${code ?? "unknown"}]\n`),
  });
}

export function hydraHttp(body: unknown, start: HydraStart = startHydra, root = process.cwd()): Response {
  const args = (body as { args?: unknown } | null)?.args;
  if (!hydraArgsOk(args)) return new Response("Those arguments are not a hydra command this desk will run.\n", { status: 400 });
  const id = jobId((body as { id?: unknown }).id);
  if (!id) return new Response("The scan id is missing.\n", { status: 400 });
  const placed = confineHydraArgs(root, args);
  if (!placed) return new Response("That output file has to be a plain name, such as out.txt. It is saved under scans/hydra/.\n", { status: 400 });
  const raw = ["hydra", ...args].join(" ");
  const command = storedCommand("hydra", placed.args);
  const blocked = examGuard(ipv4Targets(args), raw, root);
  if (blocked) return new Response(`${blocked}\n`, { status: 403 });
  const lists = (body as { lists?: { users?: unknown; passwords?: unknown } }).lists;
  const userFile = lootName(args, "users");
  const passFile = lootName(args, "passwords");
  if (userFile) {
    const file = listFile(lists?.users);
    const dest = lootDest(root, userFile);
    if (!file || !dest) return new Response("There are no saved users to try.\n", { status: 400 });
    writePrivateFile(dest, file);
  }
  if (passFile) {
    const file = listFile(lists?.passwords);
    const dest = lootDest(root, passFile);
    if (!file || !dest) return new Response("There are no saved passwords to try.\n", { status: 400 });
    writePrivateFile(dest, file);
  }
  const started = start({ id, command, args: placed.args, cwd: placed.cwd });
  if (!started) return new Response("Too many scans are already running. Stop one before starting another.\n", { status: 429 });
  return Response.json({ ok: true });
}

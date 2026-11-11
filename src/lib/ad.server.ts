import { jobId, spawnLiveJob } from "./live-jobs.server.ts";
import { quoteHydraArg } from "./hydra-args.ts";
import { PLAIN_OUTPUT } from "./output-name.ts";
import { confineFlagArgs, ensureToolDir } from "./output-path.ts";
import { displayCommand } from "./redact-command.ts";
import { AD_MODES, adArgsOk, adPlan, type AdInput, type AdMode } from "./ad-plan.ts";
import { adExtraOk, bloodhoundArgv } from "./tool-flags.ts";
import { ipv4Targets, namedTargets } from "./exam-block.ts";
import { examGuard } from "./scope-guard.server.ts";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function mode(value: unknown): AdMode {
  return typeof value === "string" && (AD_MODES as readonly string[]).includes(value) ? (value as AdMode) : "bh-all";
}

const TIMEOUT: Record<AdMode, number> = {
  "bh-all": 20 * 60 * 1000,
  "bh-dc": 15 * 60 * 1000,
  "bh-session": 15 * 60 * 1000,
  "cert-find": 10 * 60 * 1000,
  "cert-bh": 10 * 60 * 1000,
  "cert-req": 5 * 60 * 1000,
  "cert-auth": 3 * 60 * 1000,
  "cert-shadow": 5 * 60 * 1000,
  "kb-users": 15 * 60 * 1000,
  "kb-spray": 15 * 60 * 1000,
  "kb-user": 15 * 60 * 1000,
};

export function adRequest(body: unknown, root = process.cwd()): { bin: string; args: string[]; command: string; display: string; mode: AdMode; cwd: string } | { error: string } {
  if (!body || typeof body !== "object") return { error: "The request was not JSON." };
  const row = body as Partial<AdInput> & { extra?: unknown };
  const picked = mode(row.mode);
  const plan = adPlan({
    mode: picked,
    domain: text(row.domain),
    user: text(row.user),
    password: typeof row.password === "string" ? row.password : "",
    hash: text(row.hash),
    dc: text(row.dc),
    usersFile: text(row.usersFile),
    passwordFile: text(row.passwordFile),
    ca: text(row.ca),
    template: text(row.template),
    upn: text(row.upn),
    pfx: text(row.pfx),
    pfxPass: typeof row.pfxPass === "string" ? row.pfxPass : "",
    account: text(row.account),
    kerberos: row.kerberos === true,
  });
  if ("error" in plan) return plan;
  const extra = Array.isArray(row.extra) ? row.extra.filter((arg): arg is string => typeof arg === "string") : [];
  if (!adExtraOk(plan.bin, extra)) return { error: "That flag is not an option this desk will run." };
  const expanded = plan.bin === "bloodhound-python" ? bloodhoundArgv(splitAttachedPrefix(extra)) : { args: extra };
  if ("error" in expanded) return expanded;
  const args = [...plan.args, ...expanded.args];
  if (!adArgsOk(plan.bin, args)) return { error: "Those arguments are not a command this desk will run." };
  const placed = confineFlagArgs(root, "ad", args, ["-o", "-out", "-output"], ["-op", "--outputprefix"]);
  if (!placed) return { error: PLAIN_OUTPUT };
  const command = [plan.bin, ...placed.args.map((arg) => quoteHydraArg(arg))].join(" ");
  const secrets = [typeof row.password === "string" ? row.password : "", typeof row.pfxPass === "string" ? row.pfxPass : "", text(row.hash)];
  const display = displayCommand(plan.bin, placed.args, secrets);
  return { bin: plan.bin, args: placed.args, command, display, mode: picked, cwd: placed.cwd };
}

function splitAttachedPrefix(args: string[]): string[] {
  const next: string[] = [];
  for (const arg of args) {
    if (arg.startsWith("-op") && arg.length > 3 && !arg.startsWith("-op=") && !/^[A-Za-z]/.test(arg[3] ?? "")) next.push("-op", arg.slice(3));
    else next.push(arg);
  }
  return next;
}

export function adHttp(body: unknown, start: typeof startAd = startAd, root = process.cwd()): Response {
  const plan = adRequest(body, root);
  if ("error" in plan) return new Response(`${plan.error}\n`, { status: 400 });
  const id = jobId((body as { id?: unknown }).id);
  if (!id) return new Response("The scan id is missing.\n", { status: 400 });
  const row = body as { dc?: unknown };
  const blocked = examGuard([...namedTargets(row.dc), ...ipv4Targets(plan.args)], plan.command, root);
  if (blocked) return new Response(`${blocked}\n`, { status: 403 });
  if (!start(id, plan.bin, plan.args, plan.display, plan.mode, plan.cwd)) {
    return new Response("Too many scans are already running. Stop one before starting another.\n", { status: 429 });
  }
  return Response.json({ ok: true });
}

export function startAd(id: string, bin: string, args: string[], command: string, picked: AdMode, cwd?: string): boolean {
  if (cwd) ensureToolDir(cwd);
  return spawnLiveJob({
    id,
    tool: "ad",
    title: command,
    command,
    bin,
    args,
    cwd,
    timeoutMs: TIMEOUT[picked],
    maxOut: 800_000,
    missing: `${bin} was not found. On Kali, the install button includes bloodhound-python, certipy, and kerbrute.\n`,
    doneLine: (code, stopped) => (stopped ? "\n[stopped]\n" : `\n[${bin} exit ${code ?? "unknown"}]\n`),
  });
}

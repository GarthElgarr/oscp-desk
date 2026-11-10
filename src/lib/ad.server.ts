import { spawnLiveJob } from "./live-jobs.server.ts";
import { quoteHydraArg } from "./hydra-args.ts";
import { displayCommand } from "./redact-command.ts";
import { AD_MODES, adArgsOk, adPlan, type AdInput, type AdMode } from "./ad-plan.ts";

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

export function adRequest(body: unknown): { bin: string; args: string[]; command: string; display: string; mode: AdMode } | { error: string } {
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
  const extra = Array.isArray(row.extra) ? row.extra : [];
  const args = [...plan.args, ...extra];
  if (!adArgsOk(plan.bin, args)) return { error: "Those arguments are not a command this desk will run." };
  const command = [plan.bin, ...args.map((arg) => quoteHydraArg(arg))].join(" ");
  const secrets = [typeof row.password === "string" ? row.password : "", typeof row.pfxPass === "string" ? row.pfxPass : "", text(row.hash)];
  const display = displayCommand(plan.bin, args, secrets);
  return { bin: plan.bin, args, command, display, mode: picked };
}

export function startAd(id: string, bin: string, args: string[], command: string, picked: AdMode): boolean {
  return spawnLiveJob({
    id,
    tool: "ad",
    title: command,
    command,
    bin,
    args,
    timeoutMs: TIMEOUT[picked],
    maxOut: 800_000,
    missing: `${bin} was not found. On Kali, the install button includes bloodhound-python, certipy, and kerbrute.\n`,
    doneLine: (code, stopped) => (stopped ? "\n[stopped]\n" : `\n[${bin} exit ${code ?? "unknown"}]\n`),
  });
}

import { spawnLiveJob } from "./live-jobs.server";
import { quoteHydraArg } from "./hydra-args";
import { impacketArgsOk, impacketPlan, type ImpacketInput, type ImpacketMode, IMPACKET_MODES } from "./impacket-plan";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function mode(value: unknown): ImpacketMode {
  return typeof value === "string" && (IMPACKET_MODES as readonly string[]).includes(value) ? (value as ImpacketMode) : "secrets-remote";
}

export function impacketRequest(body: unknown): { bin: string; args: string[]; command: string } | { error: string } {
  if (!body || typeof body !== "object") return { error: "The request was not JSON." };
  const row = body as Partial<ImpacketInput> & { extra?: unknown };
  const plan = impacketPlan({
    mode: mode(row.mode),
    host: text(row.host),
    domain: text(row.domain),
    user: text(row.user),
    password: typeof row.password === "string" ? row.password : "",
    hash: text(row.hash),
    dc: text(row.dc),
    command: typeof row.command === "string" ? row.command.trim() : "",
    share: text(row.share),
    file: text(row.file),
    file2: text(row.file2),
    file3: text(row.file3),
    spn: text(row.spn),
    impersonate: text(row.impersonate),
    sid: text(row.sid),
    usersFile: text(row.usersFile),
    computer: text(row.computer),
    delegateTo: text(row.delegateTo),
    keyName: text(row.keyName),
    newPass: typeof row.newPass === "string" ? row.newPass : "",
    kerberos: row.kerberos === true,
    ntlmOnly: row.ntlmOnly === true,
    hashcat: row.hashcat === true,
    action: row.action === "write" ? "write" : "read",
  });
  if ("error" in plan) return plan;
  if (!plan.run) return { error: "This one opens a shell. Copy it into a terminal. The desk would close it." };
  const extra = Array.isArray(row.extra) ? row.extra : [];
  const args = [...plan.args, ...extra];
  if (!impacketArgsOk(plan.bin, args)) return { error: "Those arguments are not an Impacket command this desk will run." };
  const command = extra.length ? `${plan.command} ${extra.map(quoteHydraArg).join(" ")}` : plan.command;
  return { bin: plan.bin, args, command };
}

export function startImpacket(id: string, bin: string, args: string[], command: string): boolean {
  return spawnLiveJob({
    id,
    tool: "impacket",
    title: command,
    command,
    bin,
    args,
    timeoutMs: 3 * 60 * 1000,
    maxOut: 400_000,
    missing: `${bin} was not found. On Kali, the install button includes impacket.\n`,
    doneLine: (code, stopped) => (stopped ? "\n[stopped]\n" : `\n[${bin} exit ${code ?? "unknown"}]\n`),
  });
}

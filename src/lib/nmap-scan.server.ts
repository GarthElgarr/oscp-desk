import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { jobId, spawnLiveJob } from "./live-jobs.server.ts";
import { ensureToolDir } from "./output-path.ts";
import { nmapEditedCommand, nmapExtra, nmapName, nmapPlan, nmapPorts, nmapProfile, nmapTarget, type NmapProfile } from "./nmap-scan.ts";
import { examGuard } from "./scope-guard.server.ts";

const TIMEOUT_MS: Record<NmapProfile, number> = {
  quick: 10 * 60 * 1000,
  alltcp: 25 * 60 * 1000,
  udp: 15 * 60 * 1000,
  deep: 10 * 60 * 1000,
  custom: 15 * 60 * 1000,
};

export function scansDir(): string {
  return path.resolve(process.cwd(), "scans");
}

function asRoot(): boolean {
  return typeof process.getuid === "function" && process.getuid() === 0;
}

export function listScanNames(): string[] {
  const dir = scansDir();
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => file.endsWith(".xml") && nmapName(file.slice(0, -4)))
    .map((file) => file.slice(0, -4))
    .sort();
}

export function readScanXml(name: string): string | null {
  const safe = nmapName(name);
  if (!safe) return null;
  const file = path.join(scansDir(), `${safe}.xml`);
  if (!file.startsWith(`${scansDir()}${path.sep}`)) return null;
  if (!existsSync(file)) return null;
  return readFileSync(file, "utf8").slice(0, 2_000_000);
}

export function nmapRequest(body: unknown): { command: string; bin: string; args: string[]; profile: NmapProfile } | { error: string } {
  if (!body || typeof body !== "object") return { error: "The request was not JSON." };
  const row = body as { profile?: unknown; target?: unknown; name?: unknown; ports?: unknown; extra?: unknown; command?: unknown };
  const profile = nmapProfile(row.profile);
  const target = nmapTarget(row.target);
  const name = nmapName(row.name);
  if (!profile) return { error: "Pick one of the four profiles, or custom." };
  if (!name) return { error: "The output name is letters, numbers, hyphens, and underscores." };
  const typed = typeof row.command === "string" ? row.command.trim() : "";
  let plan: { args: string[]; command: string; sudo: boolean } | { error: string };
  if (typed) {
    plan = nmapEditedCommand(typed, name);
  } else {
    if (!target) return { error: "The target is one IPv4 address." };
    const extraText = typeof row.extra === "string" ? row.extra : "";
    const extra = nmapExtra(extraText);
    if (!extra.ok) return { error: extra.error };
    const ports = typeof row.ports === "string" ? row.ports : "";
    if (profile === "deep" && !nmapPorts(ports)) return { error: "Deep needs the ports, such as 8080,8443." };
    plan = nmapPlan({ profile, target, name, ports, extra: extra.args });
  }
  if ("error" in plan) return plan;
  const useSudo = plan.sudo && !asRoot();
  const nmapArgs = plan.args.map((arg, index) => (plan.args[index - 1] === "-oA" ? path.join(scansDir(), name) : arg));
  return {
    command: useSudo ? plan.command : plan.command.replace(/^sudo -n /, ""),
    bin: useSudo ? "sudo" : "nmap",
    args: useSudo ? ["-n", "nmap", ...nmapArgs] : nmapArgs,
    profile,
  };
}

export function startNmapScan(
  command: string,
  bin: string,
  args: string[],
  profile: NmapProfile,
  meta: { id: string; name: string; title: string },
  cwd?: string,
): boolean {
  if (cwd) ensureToolDir(cwd);
  else mkdirSync(scansDir(), { recursive: true });
  return spawnLiveJob({
    id: meta.id,
    tool: "nmap",
    title: meta.title,
    command,
    name: meta.name,
    bin,
    args,
    cwd,
    timeoutMs: TIMEOUT_MS[profile],
    maxOut: 800_000,
    missing: `${bin} was not found. On Kali, the install button includes nmap.\n`,
    doneLine: (code, stopped) =>
      stopped ? "\n[stopped]\n" : `\n[nmap exit ${code ?? "unknown"}]\nSaved scans/${meta.name}.{nmap,xml,gnmap}\n`,
  });
}

const NMAP_TITLES = { quick: "1. Quick TCP", alltcp: "2. All TCP", udp: "3. UDP top 20", deep: "4. Deep", custom: "Custom" };

export function nmapHttp(body: unknown, start: typeof startNmapScan = startNmapScan, root = process.cwd()): Response {
  const scan = nmapRequest(body);
  if ("error" in scan) return new Response(`${scan.error}\n`, { status: 400 });
  const id = jobId((body as { id?: unknown }).id);
  if (!id) return new Response("The scan id is missing.\n", { status: 400 });
  const target = scan.args[scan.args.length - 1] ?? "";
  const blocked = examGuard([target], scan.command, root);
  if (blocked) return new Response(`${blocked}\n`, { status: 403 });
  const title = `${NMAP_TITLES[scan.profile]} ${target}`;
  const saved = scan.args[scan.args.indexOf("-oA") + 1]?.split("/").pop() ?? "scan";
  const started = start(scan.command, scan.bin, scan.args, scan.profile, { id, name: saved, title }, path.join(root, "scans", "nmap"));
  if (!started) return new Response("Too many scans are already running. Stop one before starting another.\n", { status: 429 });
  return Response.json({ ok: true });
}

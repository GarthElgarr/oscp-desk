import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { nmapExtra, nmapName, nmapPlan, nmapProfile, nmapPorts, nmapTarget, type NmapProfile } from "./nmap-scan";

const MAX_OUT = 800_000;
const MAX_SCANS = 4;
const TIMEOUT_MS: Record<NmapProfile, number> = {
  quick: 10 * 60 * 1000,
  alltcp: 25 * 60 * 1000,
  udp: 15 * 60 * 1000,
  deep: 10 * 60 * 1000,
  custom: 15 * 60 * 1000,
};

let slots = 0;

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
  const row = body as { profile?: unknown; target?: unknown; name?: unknown; ports?: unknown; extra?: unknown };
  const profile = nmapProfile(row.profile);
  const target = nmapTarget(row.target);
  const name = nmapName(row.name);
  if (!profile) return { error: "Pick one of the four profiles, or custom." };
  if (!target) return { error: "The target is one IPv4 address." };
  if (!name) return { error: "The output name is letters, numbers, hyphens, and underscores." };
  const extraText = typeof row.extra === "string" ? row.extra : "";
  const extra = nmapExtra(extraText);
  if (!extra.ok) return { error: extra.error };
  const ports = typeof row.ports === "string" ? row.ports : "";
  if (profile === "deep" && !nmapPorts(ports)) return { error: "Deep needs the ports, such as 8080,8443." };
  const plan = nmapPlan({ profile, target, name, ports, extra: extra.args });
  if ("error" in plan) return plan;
  const useSudo = plan.sudo && !asRoot();
  const nmapArgs = plan.args.map((arg, index) => (index === plan.args.length - 2 ? path.join(scansDir(), name) : arg));
  return {
    command: useSudo ? plan.command : plan.command.replace(/^sudo -n /, ""),
    bin: useSudo ? "sudo" : "nmap",
    args: useSudo ? ["-n", "nmap", ...nmapArgs] : nmapArgs,
    profile,
  };
}

export function nmapScanStream(
  command: string,
  bin: string,
  args: string[],
  profile: NmapProfile,
  signal: AbortSignal,
): ReadableStream<Uint8Array> | null {
  if (slots >= MAX_SCANS) return null;
  slots += 1;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    slots = Math.max(0, slots - 1);
  };
  const encoder = new TextEncoder();
  let sent = 0;
  let killed = false;
  let child: ReturnType<typeof spawn> | null = null;
  const kill = () => {
    killed = true;
    child?.kill("SIGTERM");
  };
  const timer = setTimeout(kill, TIMEOUT_MS[profile]);
  signal.addEventListener("abort", kill);
  mkdirSync(scansDir(), { recursive: true });

  return new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        clearTimeout(timer);
        release();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      const push = (text: string) => {
        if (!text || sent >= MAX_OUT || closed) return;
        const slice = text.slice(0, MAX_OUT - sent);
        sent += slice.length;
        try {
          controller.enqueue(encoder.encode(slice));
        } catch {
          killed = true;
        }
        if (sent >= MAX_OUT) kill();
      };
      push(`$ ${command}\n`);
      child = spawn(bin, args, { shell: false, stdio: ["ignore", "pipe", "pipe"] });
      const take = (buf: Buffer) => push(buf.toString());
      child.stdout?.on("data", take);
      child.stderr?.on("data", take);
      child.on("error", (err: NodeJS.ErrnoException) => {
        push(err.code === "ENOENT" ? `${bin} was not found. On Kali, the install button includes nmap.\n` : `${err.message}\n`);
        close();
      });
      child.on("close", (code) => {
        if (killed) push("\n[stopped]\n");
        else push(`\n[nmap exit ${code ?? "unknown"}]\nSaved scans/${path.basename(args[args.indexOf("-oA") + 1] ?? "")}.{nmap,xml,gnmap}\nOpen the Nmap tab to read the XML.\n`);
        close();
      });
    },
    cancel() {
      kill();
      release();
    },
  });
}

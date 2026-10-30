import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createTerminalFeed, openJob } from "./live-jobs.server";
import { scansDir } from "./nmap-scan.server";
import { suggestPlan, type SuggestPlan } from "./suggest";

const LES = [
  "/usr/bin/linux-exploit-suggester",
  "/usr/bin/linux-exploit-suggester.sh",
  "/usr/share/linux-exploit-suggester/linux-exploit-suggester.sh",
];
const WES = ["/usr/bin/wes", "/usr/local/bin/wes", "/usr/bin/wes.py"];

function firstExisting(paths: string[]): string | null {
  return paths.find((file) => existsSync(file)) ?? null;
}

function lesArgs(bin: string, kernel: string): string[] {
  let head = "";
  try {
    head = readFileSync(bin, "utf8").slice(0, 5000);
  } catch {
    head = "";
  }
  if (head.includes("--kernel")) return ["--kernel", kernel];
  return ["-k", kernel];
}

function run(bin: string, args: string[], handle: NonNullable<ReturnType<typeof openJob>>, timeoutMs: number) {
  return new Promise<number | null>((resolve) => {
    if (handle.stopped()) {
      resolve(null);
      return;
    }
    handle.push(`$ ${bin} ${args.join(" ")}\n`);
    const child = spawn(bin, args, { shell: false, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, COLUMNS: "400", LINES: "80" } });
    handle.attach(child);
    const timer = setTimeout(() => child.kill("SIGTERM"), timeoutMs);
    let settled = false;
    const done = (code: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(code);
    };
    const feed = createTerminalFeed((text) => handle.push(text));
    const take = (buf: Buffer) => feed.write(buf.toString());
    child.stdout?.on("data", take);
    child.stderr?.on("data", take);
    child.on("error", (err: NodeJS.ErrnoException) => {
      feed.flush();
      handle.push(err.code === "ENOENT" ? `${bin} was not found.\n` : `${err.message}\n`);
      done(null);
    });
    child.on("close", (code) => {
      feed.flush();
      done(code);
    });
  });
}

export function suggestRequest(body: unknown): SuggestPlan | { error: string } {
  if (!body || typeof body !== "object") return { error: "The request was not JSON." };
  const text = (body as { text?: unknown }).text;
  if (typeof text !== "string" || !text.trim()) return { error: "Paste uname -a, sudo --version, or systeminfo first." };
  return suggestPlan(text);
}

export function startSuggest(id: string, plan: SuggestPlan): boolean {
  const handle = openJob({
    id,
    tool: "suggest",
    title: plan.command.split("\n")[0] || "exploit suggester",
    command: plan.command,
    timeoutMs: 3 * 60 * 1000,
    maxOut: 400_000,
  });
  if (!handle) return false;
  void (async () => {
    let ran = false;
    let bad = false;
    handle.push(plan.preamble + "\n");
    if (plan.kernel) {
      const bin = firstExisting(LES);
      if (!bin) handle.push("linux-exploit-suggester was not found. On Kali the install button includes it.\n");
      else {
        const code = await run(bin, lesArgs(bin, plan.kernel), handle, 60_000);
        handle.push(`[linux-exploit-suggester exit ${code ?? "unknown"}]\n`);
        ran = true;
        if (code !== 0) bad = true;
      }
    }
    for (const query of plan.queries) {
      if (handle.stopped()) break;
      handle.push(`\nDesk lead "${query.label}" passed to searchsploit.\n`);
      const code = await run("searchsploit", query.terms, handle, 30_000);
      handle.push(`[searchsploit exit ${code ?? "unknown"}]\n`);
      if (code !== null) ran = true;
      if (code !== 0) bad = true;
    }
    if (plan.windowsText && !handle.stopped()) {
      const bin = firstExisting(WES);
      if (!bin) handle.push("wes was not found. On Kali: pipx install wesng, then wes --update. The desk does not run a Windows suggester it cannot see.\n");
      else {
        mkdirSync(scansDir(), { recursive: true });
        const file = path.join(scansDir(), `systeminfo-${id.replace(/[^a-z0-9-]/g, "").slice(0, 40)}.txt`);
        writeFileSync(file, plan.windowsText);
        const code = await run(bin, [file], handle, 90_000);
        handle.push(`[wes exit ${code ?? "unknown"}]\n`);
        ran = true;
        if (code !== 0) bad = true;
      }
    }
    handle.finish(handle.stopped() ? "\n[stopped]\n" : `\n[suggest exit ${ran && !bad ? 0 : 1}]\n`);
  })();
  return true;
}

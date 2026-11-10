import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { createTerminalFeed, openJob } from "./live-jobs.server.ts";
import { writePrivateFileAsync } from "./private-file.ts";
import { wordlistPath } from "./scope-target.ts";

const BINS = new Set([
  "hashcat",
  "john",
  "ssh2john",
  "unshadow",
  "zip2john",
  "rar2john",
  "7z2john",
  "keepass2john",
  "office2john",
  "pdf2john",
  "pfx2john",
  "putty2john",
]);

const HASHCAT_FLAGS = new Set([
  "-m", "--hash-type", "-a", "--attack-mode", "-o", "--outfile", "--outfile-format",
  "-r", "--rules-file", "-w", "--workload-profile", "-O", "--optimized-kernel-enable",
  "--force", "--username", "--potfile-disable", "--status", "--status-timer",
  "--show", "--left", "--stdout", "--remove", "--separator", "--hex-salt", "--hex-charset",
  "-1", "-2", "-3", "-4", "--increment", "--increment-min", "--increment-max",
  "-j", "--rule-left", "-k", "--rule-right", "--quiet", "--hwmon-disable", "--session",
]);

const JOHN_FLAGS = new Set([
  "--wordlist", "--rules", "--format", "--show", "--users", "--single", "--incremental",
  "--mask", "--fork", "--session", "--pot", "--stdout", "--max-length", "--min-length",
]);

const SHELL = /[;&|`$<>\\\n\r\0]/;
const CRACK_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;
const CRACK_EXT = /\.(txt|hash|hc|pot|john|lst|rule|rules|out|caps|krb|asrep|key)$/i;
const RULE_FILE = /^\/usr\/share\/hashcat\/rules\/[A-Za-z0-9._+-]+$/;
const MAX_OUT = 500_000;
const TIMEOUT_MS = 10 * 60 * 1000;

export type ToolStep =
  | { kind: "write"; name: string; text: string }
  | { kind: "exec"; bin: string; args: string[] }
  | { kind: "exec-to-file"; bin: string; args: string[]; name: string };

/** A basename under scans/crack, or null. Nothing at the repo root, and no leading dot. */
export function crackFile(name: string, root = process.cwd()): string | null {
  if (typeof name !== "string" || !CRACK_NAME.test(name) || !CRACK_EXT.test(name)) return null;
  const dir = path.resolve(root, "scans", "crack");
  const full = path.resolve(dir, name);
  const rel = path.relative(dir, full);
  if (rel.startsWith("..") || path.isAbsolute(rel) || rel.includes(path.sep)) return null;
  return full;
}

export async function writeCrackFile(name: string, text: string, root = process.cwd()): Promise<string | null> {
  const dest = crackFile(name, root);
  if (!dest) return null;
  await writePrivateFileAsync(dest, text);
  return dest;
}

/** Point a later john/hashcat arg at the file this job already wrote under scans/crack. */
function locateCrackArg(arg: string, root: string): string {
  const full = crackFile(arg, root);
  if (!full || !existsSync(full)) return arg;
  return path.join("scans", "crack", arg);
}

function flagAllowed(bin: string, arg: string): boolean {
  if (!arg.startsWith("-")) return true;
  const name = arg.split("=")[0] ?? arg;
  if (bin === "hashcat") return HASHCAT_FLAGS.has(name);
  if (bin === "john") return JOHN_FLAGS.has(name);
  return true;
}

function absoluteAllowed(arg: string): boolean {
  if (wordlistPath(arg) !== null) return true;
  return RULE_FILE.test(arg) && !arg.includes("..");
}

function argOk(arg: unknown, bin: string): arg is string {
  if (typeof arg !== "string" || arg.length === 0 || arg.length > 500 || SHELL.test(arg)) return false;
  if (arg.split(/[\\/]/).includes("..")) return false;
  if (arg.startsWith("/") || arg.startsWith("~")) return absoluteAllowed(arg);
  if (arg.includes("=/") || arg.includes("=~")) {
    const value = arg.slice(arg.indexOf("=") + 1);
    return absoluteAllowed(value) && flagAllowed(bin, arg);
  }
  return flagAllowed(bin, arg);
}

export function stepsOk(value: unknown): value is ToolStep[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 6) return false;
  return value.every((step) => {
    if (!step || typeof step !== "object") return false;
    const item = step as ToolStep;
    if (item.kind === "write") {
      return crackFile(item.name) !== null && typeof item.text === "string" && item.text.length <= 256_000 && !item.text.includes("\0");
    }
    if ((item.kind === "exec" || item.kind === "exec-to-file") && BINS.has(item.bin)) {
      if (!Array.isArray(item.args) || item.args.length < 1 || item.args.length > 40 || !item.args.every((arg) => argOk(arg, item.bin))) return false;
      return item.kind === "exec" || crackFile(item.name) !== null;
    }
    return false;
  });
}

export function startSteps(id: string, tool: string, title: string, steps: ToolStep[]): boolean {
  const handle = openJob({ id, tool, title, command: title, timeoutMs: TIMEOUT_MS, maxOut: MAX_OUT });
  if (!handle) return false;
  const root = process.cwd();
  void (async () => {
    try {
      for (const step of steps) {
        if (handle.stopped()) break;
        if (step.kind === "write") {
          const dest = await writeCrackFile(step.name, step.text, root);
          if (!dest) throw new Error("That file is not under scans/crack.");
          handle.push(`wrote scans/crack/${step.name} (${step.text.length} bytes)\n`);
          continue;
        }
        const args = step.args.map((arg) => locateCrackArg(arg, root));
        handle.push(`$ ${step.bin} ${args.join(" ")}\n`);
        let captured = "";
        const code = await new Promise<number | null>((resolve) => {
          const child = spawn(step.bin, args, { shell: false, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, COLUMNS: "400", LINES: "80" } });
          handle.attach(child);
          let settled = false;
          const done = (value: number | null) => {
            if (settled) return;
            settled = true;
            resolve(value);
          };
          const block = { value: "" };
          const feed = createTerminalFeed((full) => handle.paint(full, block));
          child.stdout?.on("data", (buf: Buffer) => {
            const text = buf.toString();
            if (step.kind === "exec") feed.write(text);
            else captured += text;
          });
          child.stderr?.on("data", (buf: Buffer) => feed.write(buf.toString()));
          child.on("error", (err: NodeJS.ErrnoException) => {
            feed.flush();
            handle.push(err.code === "ENOENT" ? `${step.bin} was not found. Run the desk on Kali, where it is already installed.\n` : `${err.message}\n`);
            done(null);
          });
          child.on("close", (exitCode) => {
            feed.flush();
            done(exitCode);
          });
        });
        if (step.kind === "exec-to-file") {
          const dest = await writeCrackFile(step.name, captured, root);
          if (!dest) throw new Error("That file is not under scans/crack.");
          if (captured) handle.push(captured.endsWith("\n") ? captured : `${captured}\n`);
          handle.push(`wrote scans/crack/${step.name}\n`);
          if (code !== 0) {
            handle.push(`[${step.bin} exit ${code ?? "unknown"}]\n`);
            break;
          }
        }
        handle.push(`[${step.bin} exit ${code ?? "unknown"}]\n`);
      }
    } catch (err) {
      handle.push(err instanceof Error ? `${err.message}\n` : "The run failed.\n");
    } finally {
      handle.finish(handle.stopped() ? "\n[stopped]\n" : "");
    }
  })();
  return true;
}

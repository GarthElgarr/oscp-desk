import { mkdirSync } from "node:fs";
import path from "node:path";
import { outputBasename, sessionBasename, wfuzzOutput } from "./output-name.ts";

export { outputBasename, sessionBasename, wfuzzOutput } from "./output-name.ts";

export function toolDir(root: string, tool: string): string {
  return path.resolve(root, "scans", tool);
}

export function toolFile(root: string, tool: string, name: string): string {
  return path.join(toolDir(root, tool), name);
}

export function ensureToolDir(dir: string): void {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
}

function splitFlag(arg: string, flags: readonly string[]): { flag: string; inline: string | null } | null {
  for (const flag of flags) {
    if (arg === flag) return { flag, inline: null };
    if (arg.startsWith(`${flag}=`)) return { flag, inline: arg.slice(flag.length + 1) };
  }
  return null;
}

function rewriteValue(root: string, tool: string, kind: "file" | "session", value: string): string | null {
  if (kind === "session") return sessionBasename(value);
  const name = outputBasename(value);
  if (!name) return null;
  return toolFile(root, tool, name);
}

/** Rewrite output and session values. Null when a value is absolute, nested, a dotfile, or not a plain output name. */
export function confineFlagArgs(
  root: string,
  tool: string,
  args: readonly string[],
  fileFlags: readonly string[],
  sessionFlags: readonly string[] = [],
): { args: string[]; cwd: string } | null {
  const cwd = toolDir(root, tool);
  const next: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? "";
    const file = splitFlag(arg, fileFlags);
    const session = splitFlag(arg, sessionFlags);
    const hit = file ?? session;
    if (!hit) {
      next.push(arg.startsWith("scans/") && !arg.includes("..") ? path.resolve(root, arg) : arg);
      continue;
    }
    const kind = file ? "file" : "session";
    const value = hit.inline === null ? args[i + 1] : hit.inline;
    if (typeof value !== "string") return null;
    const placed = rewriteValue(root, tool, kind, value);
    if (!placed) return null;
    if (hit.inline === null) {
      next.push(hit.flag, placed);
      i += 1;
    } else {
      next.push(`${hit.flag}=${placed}`);
    }
  }
  return { args: next, cwd };
}

export function confineHydraArgs(root: string, args: readonly string[]): { args: string[]; cwd: string } | null {
  const cwd = toolDir(root, "hydra");
  const next: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? "";
    const inline = arg === "-o" ? null : arg.startsWith("-o=") ? arg.slice(3) : arg.startsWith("-o") && arg.length > 2 && !arg.startsWith("-o-") ? arg.slice(2) : undefined;
    if (arg === "-o" || inline !== undefined) {
      const value = inline === null ? args[i + 1] : inline;
      if (typeof value !== "string") return null;
      const name = outputBasename(value);
      if (!name) return null;
      const file = toolFile(root, "hydra", name);
      next.push("-o", file);
      if (inline === null) i += 1;
      continue;
    }
    next.push(arg.startsWith("scans/") && !arg.includes("..") ? path.resolve(root, arg) : arg);
  }
  return { args: next, cwd };
}

export function confineWfuzzArgs(root: string, args: readonly string[]): { args: string[]; cwd: string } | null {
  const cwd = toolDir(root, "wfuzz");
  const next: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? "";
    if (arg !== "-f") {
      next.push(arg);
      continue;
    }
    const value = args[i + 1];
    const parsed = typeof value === "string" ? wfuzzOutput(value) : null;
    if (!parsed) return null;
    next.push("-f", `${toolFile(root, "wfuzz", parsed.name)},${parsed.printer}`);
    i += 1;
  }
  return { args: next, cwd };
}

const CRACK_FILES: Record<string, readonly string[]> = {
  hashcat: ["-o", "--outfile", "--restore-file-path"],
  john: ["--pot"],
};

export function crackOutputsOk(bin: string, args: readonly string[]): boolean {
  const files = CRACK_FILES[bin] ?? [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] ?? "";
    const file = splitFlag(arg, files);
    const session = splitFlag(arg, ["--session"]);
    const hit = file ?? session;
    if (!hit) continue;
    const value = hit.inline === null ? args[i + 1] : hit.inline;
    if (typeof value !== "string") return false;
    if (hit.inline === null) i += 1;
    if (file ? !outputBasename(value) : !sessionBasename(value)) return false;
  }
  return true;
}

export function confineCrackArgs(root: string, bin: string, args: readonly string[]): { args: string[]; cwd: string } | null {
  const files = CRACK_FILES[bin] ?? [];
  return confineFlagArgs(root, "crack", args, files, ["--session"]);
}

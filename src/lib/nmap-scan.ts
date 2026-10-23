import { quoteHydraArg } from "./hydra-args";

const SHELL = /[;|&`$<>\\\n\r\0]/;
const BANNED = new Set(["-oA", "-oN", "-oX", "-oG", "-oS", "-iL", "-iR", "--append-output"]);

export const NMAP_PROFILES = ["quick", "alltcp", "udp", "deep", "custom"] as const;
export type NmapProfile = (typeof NMAP_PROFILES)[number];

const PROFILE_SET = new Set<string>(NMAP_PROFILES);

export function nmapProfile(value: unknown): NmapProfile | null {
  return typeof value === "string" && PROFILE_SET.has(value) ? (value as NmapProfile) : null;
}

/** One IPv4 address. No hostnames, ranges, or the cloud metadata address. */
export function nmapTarget(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const target = value.trim();
  if (!/^(?:\d{1,3}\.){3}\d{1,3}$/.test(target)) return null;
  const parts = target.split(".").map((part) => Number(part));
  if (parts.some((part) => part > 255)) return null;
  if (target === "0.0.0.0" || target === "255.255.255.255" || target === "169.254.169.254") return null;
  if (parts[0] >= 224 || parts[0] === 127) return null;
  return target;
}

/** Basename only. The desk writes scans/<name>.nmap, .xml, and .gnmap. */
export function nmapName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,40}$/.test(name)) return null;
  return name;
}

export function nmapPorts(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || text.length > 200) return null;
  if (!/^(\d{1,5}|\d{1,5}-\d{1,5})(,(\d{1,5}|\d{1,5}-\d{1,5}))*$/.test(text)) return null;
  const ok = text.split(",").every((part) => {
    const [start, end] = part.split("-").map(Number);
    if (start < 1 || start > 65535) return false;
    if (end !== undefined && (end < start || end > 65535)) return false;
    return true;
  });
  return ok ? text : null;
}

export function nmapExtra(input: string): { ok: true; args: string[] } | { ok: false; error: string } {
  const trimmed = input.trim();
  if (!trimmed) return { ok: true, args: [] };
  if (SHELL.test(trimmed)) return { ok: false, error: "Custom flags are nmap options only. No pipes, semicolons, or redirects." };
  const args: string[] = [];
  let cur = "";
  let quote: "'" | '"' | null = null;
  for (const ch of trimmed) {
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      continue;
    }
    if (ch === " " || ch === "\t") {
      if (cur) args.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (quote) return { ok: false, error: "A quote in the custom flags is not closed." };
  if (cur) args.push(cur);
  if (args.length > 24) return { ok: false, error: "Too many custom flags." };
  for (const arg of args) {
    if (arg.length > 200 || SHELL.test(arg) || arg.includes("..") || arg.startsWith("/")) {
      return { ok: false, error: "One custom flag is not an nmap option this desk will run." };
    }
    if (BANNED.has(arg) || BANNED.has(arg.split("=")[0])) {
      return { ok: false, error: "The output name sets where the scan is saved. Leave -oA and -iL out of the custom flags." };
    }
    if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(arg)) {
      return { ok: false, error: "The target stays in the IP box, so a second address is not a flag." };
    }
  }
  return { ok: true, args };
}

export function nmapPlan(input: {
  profile: NmapProfile;
  target: string;
  name: string;
  ports: string;
  extra: string[];
}): { args: string[]; command: string; sudo: boolean } | { error: string } {
  const args: string[] = ["-Pn"];
  if (input.profile === "quick") args.push("-sC", "-sV");
  else if (input.profile === "alltcp") args.push("-p-", "--min-rate", "2000");
  else if (input.profile === "udp") args.push("-sU", "--top-ports", "20", "-T4");
  else if (input.profile === "deep") {
    const ports = nmapPorts(input.ports);
    if (!ports) return { error: "Deep needs the ports, such as 8080,8443." };
    args.push("-sC", "-sV", "-p", ports);
  } else if (input.extra.length === 0) {
    return { error: "Custom needs at least one flag, such as -F or -p 80,443." };
  }
  if (input.profile === "custom") args.push(...input.extra);
  else if (input.extra.length) args.push(...input.extra);
  args.push("-oA", `scans/${input.name}`, input.target);
  const rootFlags = new Set(["-sS", "-sU", "-sA", "-sW", "-sM", "-sN", "-sF", "-sX", "-O", "--privileged"]);
  const sudo = input.profile === "udp" || input.extra.some((arg) => rootFlags.has(arg.split("=")[0]));
  const command = [sudo ? "sudo -n nmap" : "nmap", ...args.map(quoteHydraArg)].join(" ");
  return { args, command, sudo };
}

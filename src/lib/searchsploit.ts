import { quoteHydraArg } from "./hydra-args";
import { nmapName } from "./nmap-scan";

const TERM = /^[A-Za-z0-9._+-]{1,48}$/;

function terms(value: string, label: string): { ok: true; args: string[] } | { ok: false; error: string } {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { ok: false, error: `${label} is empty.` };
  if (parts.length > 8) return { ok: false, error: "Keep it to eight words." };
  if (parts.some((part) => !TERM.test(part))) {
    return { ok: false, error: `${label} can use letters, numbers, dots, plus, and hyphens. No slashes or quotes.` };
  }
  return { ok: true, args: parts };
}

export function searchsploitPlan(input: {
  mode: "terms" | "nmap" | "path";
  terms: string;
  title: boolean;
  exact: boolean;
  web: boolean;
  exclude: string;
  nmapFile: string;
  edb: string;
}): { args: string[]; command: string } | { error: string } {
  const args: string[] = [];
  if (input.mode === "path") {
    const id = input.edb.trim();
    if (!/^\d{1,7}$/.test(id)) return { error: "The exploit id is the number from the search, such as 50383." };
    args.push("-p", id);
  } else if (input.mode === "nmap") {
    const name = nmapName(input.nmapFile);
    if (!name) return { error: "Pick a saved scan name. searchsploit reads scans/<name>.xml." };
    args.push("--nmap", `scans/${name}.xml`);
  } else {
    const parsed = terms(input.terms, "The search");
    if (!parsed.ok) return parsed;
    if (input.exact) args.push("-e");
    else if (input.title) args.push("-t");
    if (input.web) args.push("-w");
    if (input.exclude.trim()) {
      const excluded = terms(input.exclude, "The exclude");
      if (!excluded.ok) return excluded;
      args.push(`--exclude=${excluded.args.join(",")}`);
    }
    args.push(...parsed.args);
  }
  return { args, command: ["searchsploit", ...args.map(quoteHydraArg)].join(" ") };
}

export function searchsploitArgsOk(args: unknown): args is string[] {
  if (!Array.isArray(args) || args.length < 1 || args.length > 16) return false;
  const flags = new Set(["-e", "-t", "-w", "-p", "--nmap"]);
  return args.every((arg) => {
    if (typeof arg !== "string" || arg.length === 0 || arg.length > 120) return false;
    if (/[;|&`$<>\\\n\r\0]/.test(arg) || arg.includes("..") || arg.startsWith("/")) return false;
    if (flags.has(arg)) return true;
    if (arg.startsWith("--exclude=")) return arg.slice("--exclude=".length).split(",").every((part) => TERM.test(part));
    if (arg.startsWith("scans/")) return /^scans\/[A-Za-z0-9][A-Za-z0-9_-]{0,40}\.xml$/.test(arg);
    if (arg.startsWith("-")) return false;
    return TERM.test(arg) || /^\d{1,7}$/.test(arg);
  });
}

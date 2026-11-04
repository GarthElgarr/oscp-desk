import { cappedInt, extensionList, finishCommand, flagsAllowed, hostOrIp, numberList, portNumber, quoteArg, wordlistPath } from "./scope-target.ts";

export const FFUF_LISTS = {
  dirs: "/usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt",
  common: "/usr/share/seclists/Discovery/Web-Content/common.txt",
  files: "/usr/share/seclists/Discovery/Web-Content/raft-small-files.txt",
  params: "/usr/share/seclists/Discovery/Web-Content/burp-parameter-names.txt",
  dns: "/usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt",
} as const;

const FFUF_FLAGS = new Set(["-u", "-w", "-e", "-H", "-t", "-rate", "-fc", "-fs", "-fw"]);

export type FfufMode = "dir" | "ext" | "vhost" | "param";

export function ffufPlan(input: {
  mode: FfufMode;
  target: string;
  port: string;
  https: boolean;
  wordlist: string;
  extensions: string;
  vhost: string;
  filters: { fc: string; fs: string; fw: string };
  threads: string;
  rate: string;
  examOn: boolean;
}): { command: string; why: string } | { error: string } {
  const host = hostOrIp(input.target);
  if (!host) return { error: "The target is one IPv4 address or one host name. No leading zeros." };
  const port = portNumber(input.port);
  if (!port) return { error: "The port is 1 to 65535." };
  const list = wordlistPath(input.wordlist);
  if (!list) return { error: "The wordlist has to be under /usr/share/seclists or /usr/share/wordlists." };
  const threads = cappedInt(input.threads, 1, 40);
  const rate = cappedInt(input.rate, 1, 150);
  if (!threads || !rate) return { error: "Threads stop at 40 and the rate stops at 150. Faster than that is a load test, not a check." };
  const scheme = input.https ? "https" : "http";
  const base = `${scheme}://${host}:${port}`;
  const fc = input.filters.fc.trim() ? numberList(input.filters.fc) : "";
  const fs = input.filters.fs.trim() ? numberList(input.filters.fs) : "";
  const fw = input.filters.fw.trim() ? numberList(input.filters.fw) : "";
  if ((input.filters.fc.trim() && !fc) || (input.filters.fs.trim() && !fs) || (input.filters.fw.trim() && !fw)) {
    return { error: "A filter is a comma-separated list of numbers, such as 404 or 1234." };
  }
  const args = ["ffuf"];
  let url = "";
  if (input.mode === "dir") {
    url = `${base}/FUZZ`;
  } else if (input.mode === "ext") {
    const ext = extensionList(input.extensions);
    if (!ext) return { error: "Extensions are a short list, such as php,html,txt." };
    url = `${base}/FUZZ`;
    args.push("-e", ext.split(",").map((item) => `.${item}`).join(","));
  } else if (input.mode === "vhost") {
    if (!/^[A-Za-z0-9][A-Za-z0-9.-]{0,80}$/.test(input.vhost.trim()) || input.vhost.includes("..")) return { error: "The vhost suffix is the domain, such as exam.local." };
    if (!fs) return { error: "A vhost fuzz needs -fs, the size of the default page. Without it every word looks the same." };
    url = `${base}/`;
    args.push("-H", `Host: FUZZ.${input.vhost.trim()}`);
  } else {
    url = `${base}/index.php?FUZZ=1`;
  }
  args.push("-u", url, "-w", list, "-t", threads, "-rate", rate);
  if (fc) args.push("-fc", fc);
  if (fs) args.push("-fs", fs);
  if (fw) args.push("-fw", fw);
  const unknown = flagsAllowed(args.slice(1), FFUF_FLAGS);
  if (unknown) return { error: `ffuf flag ${unknown} is not on the allow-list. There is no output-path flag here.` };
  const built = finishCommand(args.map(quoteArg).join(" "), input.examOn);
  if ("error" in built) return built;
  return {
    command: built.command,
    why: "FUZZ is the one position ffuf replaces from the wordlist. -t is threads and -rate is requests per second, both capped. -fc hides status codes, -fs hides a response size, and -fw hides a word count. A vhost run hides the size of the default site, or every name is a hit. This is one path, not a scanner across a range. There is no -o. You read the hits in the terminal.",
  };
}
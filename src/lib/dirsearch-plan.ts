import { cappedInt, extensionList, finishCommand, flagsAllowed, hostOrIp, numberList, portNumber, quoteArg, scansFile, wordlistPath } from "./scope-target.ts";

export type DirTool = "gobuster" | "feroxbuster";
export type DirMode = "dir" | "vhost";

const GOBUSTER_FLAGS = new Set(["dir", "vhost", "-u", "-w", "-t", "-q", "-s", "-x", "-o", "--append-domain"]);
const FEROX_FLAGS = new Set(["-u", "-w", "-x", "-t", "-s", "-C", "-o"]);

export function dirsearchPlan(input: {
  tool: DirTool;
  mode: DirMode;
  target: string;
  port: string;
  https: boolean;
  wordlist: string;
  extensions: string;
  status: string;
  threads: string;
  outfile: string;
  examOn: boolean;
}): { command: string; why: string } | { error: string } {
  const host = hostOrIp(input.target);
  if (!host) return { error: "The target is one IPv4 address or one host name. No leading zeros." };
  const port = portNumber(input.port);
  if (!port) return { error: "The port is 1 to 65535." };
  const list = wordlistPath(input.wordlist);
  if (!list) return { error: "The wordlist has to be under /usr/share/seclists or /usr/share/wordlists." };
  const threads = cappedInt(input.threads, 1, input.tool === "feroxbuster" ? 50 : 40);
  if (!threads) return { error: "Threads are capped. Gobuster stops at 40. Feroxbuster stops at 50." };
  if (input.tool === "gobuster" && input.mode === "vhost" && input.extensions.trim()) {
    return { error: "Gobuster vhost does not take file extensions. Use dir mode for those." };
  }
  const scheme = input.https ? "https" : "http";
  const url = `${scheme}://${host}:${port}/`;
  const status = input.status.trim() ? numberList(input.status) : "200,204,301,302,307,401";
  if (!status) return { error: "Status codes are numbers, such as 200,301,302." };
  const out = input.outfile.trim() ? scansFile(input.outfile) : null;
  if (input.outfile.trim() && !out) return { error: "The output name is a file under scans/. Not an absolute path." };
  const args: string[] = [];
  if (input.tool === "gobuster" && input.mode === "dir") {
    const ext = input.extensions.trim() ? extensionList(input.extensions) : null;
    if (input.extensions.trim() && !ext) return { error: "Extensions are a short list, such as php,html,txt." };
    args.push("gobuster", "dir", "-u", url, "-w", list, "-t", threads, "-q", "-s", status);
    if (ext) args.push("-x", ext);
    if (out) args.push("-o", out);
  } else if (input.tool === "gobuster") {
    args.push("gobuster", "vhost", "-u", url, "-w", list, "--append-domain", "-t", threads);
    if (out) args.push("-o", out);
  } else {
    if (input.mode === "vhost") return { error: "Feroxbuster here is directory mode. Use gobuster vhost or ffuf for names." };
    const ext = input.extensions.trim() ? extensionList(input.extensions) : "php,html,txt,bak,old";
    if (!ext) return { error: "Extensions are a short list, such as php,html,txt,bak,old." };
    args.push("feroxbuster", "-u", url.replace(/\/$/, ""), "-w", list, "-x", ext, "-t", threads, "-s", status, "-C", "404");
    if (out) args.push("-o", out);
  }
  const allowed = input.tool === "gobuster" ? GOBUSTER_FLAGS : FEROX_FLAGS;
  const unknown = flagsAllowed(args.slice(1), allowed);
  if (unknown) return { error: `${input.tool} flag ${unknown} is not on the allow-list.` };
  const built = finishCommand(args.map(quoteArg).join(" "), input.examOn);
  if ("error" in built) return built;
  const why =
    input.tool === "feroxbuster"
      ? "feroxbuster -u is the site, -w is the medium directory list, and -x adds extensions so it tries page.php as well as a directory. -t stops at 50. -s keeps those status codes and -C 404 drops the miss. -o writes under scans/. Start there, then stop when a path is alive."
      : input.mode === "vhost"
        ? "gobuster vhost guesses names in front of the domain. --append-domain adds that suffix. A hit is a name you put in /etc/hosts, not a second wordlist."
        : "gobuster dir -u is the site and -w is the wordlist. -t stops at 40. -s is the status codes you keep. -q hides the misses. One list, then read the hits.";
  return { command: built.command, why };
}
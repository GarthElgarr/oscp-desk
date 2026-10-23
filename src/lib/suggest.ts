import { matchLocal } from "./local-match";

const LEADS: Record<string, string[]> = {
  "Dirty Pipe": ["2022-0847"],
  "Dirty Cow": ["2016-5195"],
  "eBPF verifier, only with the sysctl": ["2017-16995"],
  "Ubuntu OverlayFS, only if the string is Ubuntu": ["2021-3493"],
  "Baron Samedit, version only": ["2021-3156"],
};

export type SuggestPlan = {
  kind: "kernel" | "windows" | "sudo";
  preamble: string;
  kernel: string;
  uname: string;
  windowsText: string;
  queries: { label: string; terms: string[] }[];
  command: string;
  note: string;
};

function kernelOf(text: string): string {
  const match = text.match(/(\d+)\.(\d+)\.(\d+)(?:-\d+)?/);
  return match ? match[0] : "";
}

function unameLine(text: string): string {
  const line = text.split("\n").find((item) => /Linux /.test(item)) ?? text.split("\n")[0] ?? "";
  const clean = line.replace(/[^\x20-\x7e]/g, "").trim().slice(0, 180);
  if (!clean || /[;&|`$<>\\]/.test(clean)) return "";
  return clean;
}

/** Desk leads first. Only those leads are handed to a suggester. Dead rows are not. */
export function suggestPlan(raw: string): SuggestPlan | { error: string } {
  const text = raw.replace(/\r/g, "").slice(0, 200_000);
  const match = matchLocal(text);
  if (!match) return { error: "Paste uname -a, sudo --version, or systeminfo first." };
  const queries = match.hits
    .filter((hit) => hit.state !== "dead" && LEADS[hit.title])
    .map((hit) => ({ label: hit.title, terms: LEADS[hit.title] }));
  const kernel = kernelOf(text);
  const windows = match.kind === "systeminfo";
  const look = windows && match.hits.some((hit) => hit.title.startsWith("Old enough"));
  const sudoOnly = match.kind === "sudo";
  if (!windows && !sudoOnly && !kernel) return { error: "No kernel version to pass on." };
  if (queries.length === 0 && !look) {
    return { error: "The short list has no lead. Nothing is sent to a suggester. A dead row is not a search." };
  }

  const lines = ["Desk read. Dead rows are not passed on."];
  for (const hit of match.hits) {
    const passed = hit.state !== "dead" && Boolean(LEADS[hit.title]);
    lines.push(`- ${hit.state}${passed ? ", passed on" : ""}: ${hit.title}. ${hit.why}`);
  }
  const commands: string[] = [];
  const upstream = match.kind === "upstream kernel";
  const runLes = upstream && queries.some((item) => item.label !== "Baron Samedit, version only");
  if (runLes) commands.push(`linux-exploit-suggester --kernel ${kernel.split("-")[0]}`);
  for (const query of queries) commands.push(`searchsploit ${query.terms.join(" ")}`);
  if (look) commands.push("wes systeminfo.txt");
  if (commands.length === 0) return { error: "The short list has no lead. Nothing is sent to a suggester." };

  const kind = windows ? "windows" : sudoOnly ? "sudo" : "kernel";
  const note =
    kind === "windows"
      ? "wes reads the systeminfo you pasted. The desk already said this build is old enough to look, and only after the misconfig cards. A long wes list is not a list of exploits to run."
      : runLes
        ? "linux-exploit-suggester gets the upstream kernel number. searchsploit gets the CVE from each lead. A distro build is not sent there, because the number after the hyphen is not the patch."
        : "searchsploit gets the CVE from each lead. linux-exploit-suggester is not run for sudo, and not for a distro kernel.";

  return {
    kind,
    preamble: lines.join("\n") + "\n",
    kernel: runLes ? kernel.split("-")[0] : "",
    uname: kind === "kernel" ? unameLine(text) : "",
    windowsText: look ? text : "",
    queries: kind === "windows" ? [] : queries,
    command: commands.join("\n"),
    note,
  };
}

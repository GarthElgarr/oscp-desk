import { accessLabel, hostKindIndex, hostLabel, hostStarted, hostTitle, normaliseOsid, SCORE_CAVEAT, type ExamReport, type HostReport } from "./report-model.ts";

function body(text: string, empty = "Not recorded."): string {
  const value = text.trim();
  return value || empty;
}

function hostPart(report: ExamReport, host: HostReport, number: string): string {
  const index = hostKindIndex(report.hosts, host);
  const vuln = [host.vulnName.trim() && `Name: ${host.vulnName.trim()}`, host.severity.trim() && `Severity: ${host.severity.trim()}`, host.vulnExplanation.trim()].filter(Boolean).join("\n");
  const exploit = [host.exploitUrl.trim() && `Original: ${host.exploitUrl.trim()}`, host.exploitCode.trim() && `Modified code:\n${host.exploitCode.trim()}`, host.exploitChanges.trim() && `Changes: ${host.exploitChanges.trim()}`].filter(Boolean).join("\n\n");
  const figures = host.shots.map((shot) => `- Figure (file ${shot.id.slice(0, 8)}): ${shot.caption.trim() || "Proof screenshot."}`).join("\n");
  return [
    `### ${number} ${hostTitle(host, index)}`,
    "",
    `Reached: ${accessLabel(host.access)}.`,
    "",
    `#### ${number}.1 Service enumeration`,
    "",
    body(host.enumeration),
    "",
    `#### ${number}.2 Vulnerability`,
    "",
    body(vuln),
    "",
    `#### ${number}.3 Initial access`,
    "",
    body(host.foothold),
    "",
    `#### ${number}.4 Privilege escalation`,
    "",
    body(host.privesc, host.access === "full" ? "Not recorded." : "Privilege escalation was not reached."),
    "",
    `#### ${number}.5 Exploit code`,
    "",
    body(exploit),
    "",
    `#### ${number}.6 Fix`,
    "",
    body(host.fix),
    "",
    `#### ${number}.7 Proof`,
    "",
    `local.txt: ${host.localFlag.trim() || "Not obtained."}`,
    "",
    `proof.txt: ${host.proofFlag.trim() || "Not obtained."}`,
    "",
    figures || "No screenshot listed.",
  ].join("\n");
}

export function reportMarkdown(report: ExamReport): string {
  const started = report.hosts.filter(hostStarted);
  const rows = started.map((host) => {
    const index = hostKindIndex(report.hosts, host);
    const kind = host.kind === "ad" ? "Active Directory" : "Standalone";
    return `| ${hostLabel(host, index)} | ${host.ip.trim() || "-"} | ${kind} | ${accessLabel(host.access)} |`;
  });
  const stand = started.filter((host) => host.kind === "standalone");
  const ad = started.filter((host) => host.kind === "ad");
  const fixes = started.filter((host) => host.fix.trim()).map((host) => `- **${hostLabel(host, hostKindIndex(report.hosts, host))}** — ${host.fix.trim()}`);
  const appendix = started
    .flatMap((host) => {
      if (!host.exploitCode.trim() && !host.exploitUrl.trim()) return [];
      const index = hostKindIndex(report.hosts, host);
      return [`### ${hostLabel(host, index)}\n\n${[host.exploitUrl.trim() && `Original: ${host.exploitUrl.trim()}`, host.exploitCode.trim(), host.exploitChanges.trim() && `Changes: ${host.exploitChanges.trim()}`].filter(Boolean).join("\n\n")}`];
    })
    .concat(report.pocAppendix.trim() ? [report.pocAppendix.trim()] : []);
  return [
    "# OSCP Exam Report",
    "",
    `**Student:** ${body(report.name)}`,
    `**OSID:** ${normaliseOsid(report.osid)}`,
    `**Email:** ${body(report.email)}`,
    `**Exam date:** ${body(report.examDate)}`,
    `**Report date:** ${body(report.reportDate)}`,
    "",
    "## 1. Introduction",
    "",
    body(report.intro),
    "",
    "## 2. High-level summary",
    "",
    rows.length ? ["| Host | IP | Set | Reached |", "| --- | --- | --- | --- |", ...rows].join("\n") : "",
    "",
    body(report.summary),
    "",
    "## 3. Recommendations",
    "",
    body(report.recommendations, fixes.length ? "" : "Not recorded."),
    "",
    fixes.join("\n"),
    "",
    "## 4. Methodologies",
    "",
    body(report.methodologies),
    "",
    "## 5. Independent challenges",
    "",
    stand.length ? stand.map((host, index) => hostPart(report, host, `5.${index + 1}`)).join("\n\n") : "No standalone host is included.",
    "",
    "## 6. Active Directory",
    "",
    "### 6.1 Domain",
    "",
    body([report.domain.trim() && `Domain: ${report.domain.trim()}`, report.adUser.trim() && `Starting credential: ${report.adUser.trim()}`, report.adNarrative.trim()].filter(Boolean).join("\n")),
    "",
    ad.length ? ad.map((host, index) => hostPart(report, host, `6.${index + 2}`)).join("\n\n") : "No Active Directory host is included.",
    "",
    "## 7. Appendix: proof of concept code",
    "",
    appendix.join("\n\n") || "Not recorded.",
    "",
    "## 8. Scoring note",
    "",
    body(report.rawPoints),
    "",
    SCORE_CAVEAT,
    "",
  ].join("\n");
}

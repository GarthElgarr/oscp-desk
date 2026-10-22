import { accessLabel, hostLabel, hostStarted, type ExamReport, type HostReport } from "./report-model";

export type ShotFile = { dataUrl: string; w: number; h: number };

function esc(value: string): string {
  const amp = String.fromCharCode(38);
  return value
    .replaceAll(amp, amp + "amp;")
    .replaceAll("<", amp + "lt;")
    .replaceAll(">", amp + "gt;")
    .replaceAll('"', amp + "quot;");
}

function jpegSrc(url: string): string | null {
  const prefix = "data:image/jpeg;base64,";
  if (!url.startsWith(prefix)) return null;
  const body = url.slice(prefix.length);
  if (body.length < 16 || body.length > 12_000_000) return null;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(body)) return null;
  return url;
}

function block(text: string, empty: string): string {
  const body = text.trim() || empty.trim();
  if (!body) return "";
  return `<div class="prose">${esc(body)}</div>`;
}

function flagLine(label: string, value: string): string {
  return `<p><strong>${label}</strong> ${esc(value.trim() || "Not obtained.")}</p>`;
}

function figures(host: HostReport, shots: Map<string, ShotFile>, start: number): { html: string; next: number } {
  if (host.shots.length === 0) return { html: "", next: start };
  let n = start;
  const parts = host.shots.map((shot) => {
    n += 1;
    const file = shots.get(shot.id);
    const caption = shot.caption.trim() || "Proof screenshot. The flag, the identity, and the IP are in this frame.";
    const src = file ? jpegSrc(file.dataUrl) : null;
    const img = src
      ? `<img alt="${esc(caption)}" src="${src}" />`
      : `<p class="missing">Screenshot file was not in this browser.</p>`;
    return `<figure>${img}<figcaption>Figure ${n}. ${esc(caption)}</figcaption></figure>`;
  });
  return { html: parts.join("\n"), next: n };
}

function hostSection(host: HostReport, number: string, index: number, shots: Map<string, ShotFile>, figure: number): { html: string; next: number } {
  const figs = figures(host, shots, figure);
  const os = host.os.trim() ? ` (${esc(host.os.trim())})` : "";
  return {
    next: figs.next,
    html: `<section>
      <h2>${number} ${esc(hostLabel(host, index))} — ${esc(host.ip.trim() || "IP not recorded")}${os}</h2>
      <p class="reached">Reached: ${esc(accessLabel(host.access))}.</p>
      <h3>${number}.1 Service enumeration</h3>
      ${block(host.enumeration, "Not recorded.")}
      <h3>${number}.2 Initial access</h3>
      ${block(host.foothold, "Not recorded.")}
      <h3>${number}.3 Privilege escalation</h3>
      ${block(host.privesc, host.access === "full" ? "Not recorded." : "Privilege escalation was not reached.")}
      <h3>${number}.4 Proof</h3>
      ${flagLine("local.txt:", host.localFlag)}
      ${flagLine("proof.txt:", host.proofFlag)}
      ${figs.html}
    </section>`,
  };
}

export function reportHtml(report: ExamReport, shots: Map<string, ShotFile>): string {
  const stand = report.hosts.filter((host) => host.kind === "standalone" && hostStarted(host));
  const ad = report.hosts.filter((host) => host.kind === "ad" && hostStarted(host));
  let figure = 0;
  const standHtml: string[] = [];
  stand.forEach((host, index) => {
    const part = hostSection(host, `4.${index + 1}`, index, shots, figure);
    figure = part.next;
    standHtml.push(part.html);
  });
  const adHtml: string[] = [];
  ad.forEach((host, index) => {
    const part = hostSection(host, `5.${index + 2}`, index, shots, figure);
    figure = part.next;
    adHtml.push(part.html);
  });
  const fixes = report.hosts.filter(hostStarted).filter((host) => host.fix.trim());
  const rows = report.hosts.filter(hostStarted).map((host) => {
    const index = report.hosts.filter((item) => item.kind === host.kind).indexOf(host);
    const kind = host.kind === "ad" ? "Active Directory" : "Standalone";
    return `<tr><td>${esc(hostLabel(host, index))}</td><td>${esc(host.ip.trim() || "—")}</td><td>${kind}</td><td>${esc(accessLabel(host.access))}</td></tr>`;
  });
  const title = `OSCP Exam Report${report.osid.trim() ? ` — ${report.osid.trim()}` : ""}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(title)}</title>
  <style>
    @page { size: A4; margin: 18mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #1a1a1a; background: #fff; font: 11.5pt/1.45 Georgia, "Times New Roman", serif; }
    main { max-width: 42rem; margin: 0 auto; padding: 1.5rem 0 3rem; }
    h1, h2, h3 { font-family: Calibri, "Segoe UI", sans-serif; line-height: 1.25; page-break-after: avoid; }
    h1 { font-size: 22pt; font-weight: 700; margin: 0 0 0.4rem; }
    h2 { font-size: 15pt; margin: 1.6rem 0 0.4rem; }
    h3 { font-size: 12.5pt; margin: 1rem 0 0.3rem; }
    p { margin: 0.35rem 0 0.7rem; }
    .kicker { font-family: Calibri, "Segoe UI", sans-serif; letter-spacing: 0.14em; font-size: 10pt; margin: 0 0 0.4rem; }
    .cover { page-break-after: always; min-height: 70vh; padding-top: 18vh; }
    .meta { border-collapse: collapse; margin-top: 1.4rem; }
    .meta th { text-align: left; font-family: Calibri, "Segoe UI", sans-serif; font-weight: 600; padding: 0.2rem 1rem 0.2rem 0; vertical-align: top; }
    .meta td { padding: 0.2rem 0; }
    table.findings { width: 100%; border-collapse: collapse; margin: 0.6rem 0 1rem; font-family: Calibri, "Segoe UI", sans-serif; font-size: 10.5pt; }
    table.findings th, table.findings td { border: 1px solid #bbb; padding: 0.35rem 0.45rem; text-align: left; vertical-align: top; }
    table.findings th { background: #f3f3f3; }
    .prose { white-space: pre-wrap; font-family: Consolas, "Courier New", monospace; font-size: 10pt; line-height: 1.4; background: #f6f6f6; padding: 0.6rem 0.7rem; margin: 0.3rem 0 0.8rem; }
    .reached { font-family: Calibri, "Segoe UI", sans-serif; }
    figure { margin: 0.8rem 0 1.2rem; page-break-inside: avoid; }
    img { max-width: 100%; height: auto; border: 1px solid #ccc; }
    figcaption { font-family: Calibri, "Segoe UI", sans-serif; font-size: 10pt; margin-top: 0.3rem; }
    .missing { font-family: Calibri, "Segoe UI", sans-serif; }
    ul { margin: 0.3rem 0 0.8rem; padding-left: 1.2rem; }
  </style>
</head>
<body>
<main>
  <section class="cover">
    <p class="kicker">OFFENSIVE SECURITY</p>
    <h1>OSCP Exam Report</h1>
    <table class="meta">
      <tr><th>Student</th><td>${esc(report.name.trim() || "Not recorded")}</td></tr>
      <tr><th>OSID</th><td>${esc(report.osid.trim() || "Not recorded")}</td></tr>
      <tr><th>Email</th><td>${esc(report.email.trim() || "Not recorded")}</td></tr>
      <tr><th>Exam date</th><td>${esc(report.examDate.trim() || "Not recorded")}</td></tr>
      <tr><th>Report date</th><td>${esc(report.reportDate.trim() || "Not recorded")}</td></tr>
    </table>
  </section>
  <h2>1. Introduction</h2>
  ${block(report.intro, "Not recorded.")}
  <h2>2. High-level summary</h2>
  ${rows.length ? `<table class="findings"><thead><tr><th>Host</th><th>IP</th><th>Set</th><th>Reached</th></tr></thead><tbody>${rows.join("")}</tbody></table>` : ""}
  ${block(report.summary, "Not recorded.")}
  <h2>3. Recommendations</h2>
  ${block(report.recommendations, fixes.length ? "" : "Not recorded.")}
  ${fixes.length ? `<ul>${fixes.map((host) => `<li><strong>${esc(hostLabel(host, report.hosts.filter((item) => item.kind === host.kind).indexOf(host)))}</strong> — ${esc(host.fix.trim())}</li>`).join("")}</ul>` : ""}
  <h2>4. Independent challenges</h2>
  ${standHtml.length ? standHtml.join("\n") : block("", "No standalone host is included.")}
  <h2>5. Active Directory</h2>
  ${report.domain.trim() || report.adUser.trim() || report.adNarrative.trim() ? `<h3>5.1 Domain</h3>${block([report.domain.trim() && `Domain: ${report.domain.trim()}`, report.adUser.trim() && `Starting credential: ${report.adUser.trim()}`, report.adNarrative.trim()].filter(Boolean).join("\n\n"), "Not recorded.")}` : `<h3>5.1 Domain</h3>${block("", "Not recorded.")}`}
  ${adHtml.length ? adHtml.join("\n") : block("", "No Active Directory host is included.")}
</main>
</body>
</html>`;
}

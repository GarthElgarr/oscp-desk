import { passRule, POINTS } from "./exam-rules.ts";

export type Access = "none" | "local" | "full";

export type ShotMeta = { id: string; caption: string };

export type HostReport = {
  id: string;
  kind: "standalone" | "ad";
  hostname: string;
  ip: string;
  os: string;
  access: Access;
  localFlag: string;
  proofFlag: string;
  enumeration: string;
  foothold: string;
  privesc: string;
  fix: string;
  vulnName: string;
  vulnExplanation: string;
  severity: string;
  exploitUrl: string;
  exploitCode: string;
  exploitChanges: string;
  shots: ShotMeta[];
  /** True once the user picks REACHED. The default of none is not that choice. */
  accessSet?: boolean;
};

export type ExamReport = {
  name: string;
  osid: string;
  email: string;
  examDate: string;
  reportDate: string;
  intro: string;
  summary: string;
  recommendations: string;
  domain: string;
  adUser: string;
  adNarrative: string;
  methodologies: string;
  rawPoints: string;
  pocAppendix: string;
  hosts: HostReport[];
};

export type Gap = { level: "miss" | "warn"; text: string };

const STORE = "oscp-exam-report-v1";

export function hostTemplate(kind: HostReport["kind"], id: string): HostReport {
  return {
    id,
    kind,
    hostname: "",
    ip: "",
    os: "",
    access: "none",
    localFlag: "",
    proofFlag: "",
    enumeration: "",
    foothold: "",
    privesc: "",
    fix: "",
    vulnName: "",
    vulnExplanation: "",
    severity: "",
    exploitUrl: "",
    exploitCode: "",
    exploitChanges: "",
    shots: [],
  };
}

export function blankReport(): ExamReport {
  return {
    name: "",
    osid: "",
    email: "",
    examDate: "",
    reportDate: "",
    intro:
      "This is the penetration test report for the OSCP exam. It records the steps that obtained a shell or a privilege change. A reader who was not in the exam should be able to repeat each step from the commands and the screenshots.",
    summary: "",
    recommendations: "",
    domain: "",
    adUser: "",
    adNarrative: "",
    methodologies: "",
    rawPoints: "",
    pocAppendix: "",
    hosts: [
      hostTemplate("standalone", "standalone-1"),
      hostTemplate("standalone", "standalone-2"),
      hostTemplate("standalone", "standalone-3"),
      hostTemplate("ad", "ad-1"),
      hostTemplate("ad", "ad-2"),
      hostTemplate("ad", "ad-3"),
    ],
  };
}

function isAccess(value: unknown): value is Access {
  return value === "none" || value === "local" || value === "full";
}

function asHost(value: unknown): HostReport | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Partial<HostReport>;
  if (typeof row.id !== "string" || (row.kind !== "standalone" && row.kind !== "ad")) return null;
  const shots = Array.isArray(row.shots)
    ? row.shots.filter((shot): shot is ShotMeta => Boolean(shot) && typeof shot.id === "string" && typeof shot.caption === "string")
    : [];
  return {
    id: row.id,
    kind: row.kind,
    hostname: typeof row.hostname === "string" ? row.hostname : "",
    ip: typeof row.ip === "string" ? row.ip : "",
    os: typeof row.os === "string" ? row.os : "",
    access: isAccess(row.access) ? row.access : "none",
    localFlag: typeof row.localFlag === "string" ? row.localFlag : "",
    proofFlag: typeof row.proofFlag === "string" ? row.proofFlag : "",
    enumeration: typeof row.enumeration === "string" ? row.enumeration : "",
    foothold: typeof row.foothold === "string" ? row.foothold : "",
    privesc: typeof row.privesc === "string" ? row.privesc : "",
    fix: typeof row.fix === "string" ? row.fix : "",
    vulnName: typeof row.vulnName === "string" ? row.vulnName : "",
    vulnExplanation: typeof row.vulnExplanation === "string" ? row.vulnExplanation : "",
    severity: typeof row.severity === "string" ? row.severity : "",
    exploitUrl: typeof row.exploitUrl === "string" ? row.exploitUrl : "",
    exploitCode: typeof row.exploitCode === "string" ? row.exploitCode : "",
    exploitChanges: typeof row.exploitChanges === "string" ? row.exploitChanges : "",
    shots,
    accessSet: row.accessSet === true,
  };
}

export function parseReport(raw: string | null): ExamReport | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<ExamReport>;
    if (!value || typeof value !== "object" || !Array.isArray(value.hosts)) return null;
    const seen = new Set<string>();
    const hosts: HostReport[] = [];
    for (const item of value.hosts) {
      const host = asHost(item);
      if (!host) continue;
      let id = host.id;
      if (seen.has(id)) {
        let n = 2;
        while (seen.has(`${host.id}-${n}`)) n += 1;
        id = `${host.id}-${n}`;
      }
      seen.add(id);
      hosts.push(id === host.id ? host : { ...host, id });
    }
    const base = blankReport();
    return {
      ...base,
      name: typeof value.name === "string" ? value.name : "",
      osid: typeof value.osid === "string" ? value.osid : "",
      email: typeof value.email === "string" ? value.email : "",
      examDate: typeof value.examDate === "string" ? value.examDate : "",
      reportDate: typeof value.reportDate === "string" ? value.reportDate : "",
      intro: typeof value.intro === "string" ? value.intro : base.intro,
      summary: typeof value.summary === "string" ? value.summary : "",
      recommendations: typeof value.recommendations === "string" ? value.recommendations : "",
      domain: typeof value.domain === "string" ? value.domain : "",
      adUser: typeof value.adUser === "string" ? value.adUser : "",
      adNarrative: typeof value.adNarrative === "string" ? value.adNarrative : "",
      methodologies: typeof value.methodologies === "string" ? value.methodologies : "",
      rawPoints: typeof value.rawPoints === "string" ? value.rawPoints : "",
      pocAppendix: typeof value.pocAppendix === "string" ? value.pocAppendix : "",
      hosts,
    };
  } catch {
    return null;
  }
}

export function loadReport(): ExamReport | null {
  if (typeof window === "undefined") return null;
  try {
    return parseReport(localStorage.getItem(STORE));
  } catch {
    return null;
  }
}

export function saveReport(report: ExamReport) {
  localStorage.setItem(STORE, JSON.stringify(report));
}

export function hostStarted(host: HostReport): boolean {
  return (
    effectiveAccess(host) !== "none" ||
    host.shots.length > 0 ||
    [host.hostname, host.ip, host.os, host.localFlag, host.proofFlag, host.enumeration, host.foothold, host.privesc, host.fix, host.vulnName, host.vulnExplanation, host.severity, host.exploitUrl, host.exploitCode, host.exploitChanges].some(
      (value) => value.trim(),
    )
  );
}

export function hostLabel(host: HostReport, index: number): string {
  if (host.hostname.trim()) return host.hostname.trim();
  if (host.ip.trim()) return host.ip.trim();
  return host.kind === "ad" ? `AD host ${index + 1}` : `Standalone ${index + 1}`;
}

export function accessLabel(access: Access): string {
  if (access === "full") return "local.txt and proof.txt";
  if (access === "local") return "local.txt only";
  return "not compromised";
}

export function proofsPresent(host: HostReport): boolean {
  return Boolean(host.localFlag.trim() || host.proofFlag.trim());
}

/** The access the export should treat as true. An explicit REACHED wins. Otherwise both proofs, or proof.txt alone, are full, and local.txt alone is local. */
export function effectiveAccess(host: HostReport): Access {
  if (host.accessSet === true || host.access !== "none") return host.access;
  if (host.proofFlag.trim()) return "full";
  if (host.localFlag.trim()) return "local";
  return "none";
}

export const REACHED_DEFAULT_WARNING =
  "local.txt or proof.txt is filled, but REACHED is still the default. Set it, or the export will not say not compromised.";

/** The export line. Filled proofs do not stay "not compromised" unless the user picked that. */
export function reachedLabel(host: HostReport): string {
  if (host.access === "none" && host.accessSet !== true && proofsPresent(host)) {
    if (host.localFlag.trim() && host.proofFlag.trim()) return "local.txt and proof.txt";
    if (host.proofFlag.trim()) return "proof.txt only";
    return "local.txt only";
  }
  return accessLabel(host.access);
}

export function reachedWarning(host: HostReport): string | null {
  if (host.access === "none" && host.accessSet !== true && proofsPresent(host)) return REACHED_DEFAULT_WARNING;
  return null;
}

export function moveHost(hosts: HostReport[], id: string, dir: -1 | 1): HostReport[] {
  const index = hosts.findIndex((host) => host.id === id);
  if (index < 0) return hosts;
  const kind = hosts[index].kind;
  let next = -1;
  for (let i = index + dir; i >= 0 && i < hosts.length; i += dir) {
    if (hosts[i].kind === kind) {
      next = i;
      break;
    }
  }
  if (next < 0) return hosts;
  const copy = [...hosts];
  [copy[index], copy[next]] = [copy[next], copy[index]];
  return copy;
}

export function hostKindIndex(hosts: HostReport[], host: HostReport): number {
  return hosts.filter((item) => item.kind === host.kind).indexOf(host);
}

export function hostTitle(host: HostReport, index: number): string {
  const label = hostLabel(host, index);
  const ip = host.ip.trim();
  const os = host.os.trim() ? ` (${host.os.trim()})` : "";
  if (!ip) return `${label} - IP not recorded${os}`;
  if (label === ip) return `${label}${os}`;
  return `${label} - ${ip}${os}`;
}

export function normaliseOsid(osid: string): string {
  const raw = osid.trim().replace(/[^A-Za-z0-9-]/g, "");
  const body = /^os-/i.test(raw) ? raw.slice(3) : /^os\d/i.test(raw) ? raw.slice(2) : raw;
  return body ? `OS-${body}` : "OS-XXXXX";
}

export function examWhen(examDate: string): number {
  const text = examDate.trim();
  if (!text) return Date.now();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return Date.parse(`${text}T00:00:00Z`);
  const parsed = Date.parse(text);
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

export function scoreCaveat(examDate: string): string {
  if (examDate.trim() === "2026-12-01") {
    return `Exam date is 1 Dec 2026 with no start time. Before 08:00 GMT the pass mark is ${POINTS.passRawBeforeScale} raw points. From 08:00 GMT it is a scaled ${POINTS.scaledPass} out of ${POINTS.scaledMax}. Confirm the start time. This number is not the score on the result letter. Confirm the live exam guide on the day.`;
  }
  const rule = passRule(examWhen(examDate));
  if (rule.scaled) {
    return `The tally above is a raw point count. This sitting is a scaled score, ${POINTS.scaledPass} out of ${POINTS.scaledMax}. OffSec scales that total before it publishes a result. This number is not the score on the result letter. Confirm the live exam guide on the day.`;
  }
  return `The tally above is the raw point count. This sitting starts before 1 Dec 2026 08:00 GMT, so the pass mark is ${POINTS.passRawBeforeScale} raw points. OffSec scales that total only after the cutoff. This number is not the score on a later result letter. Confirm the live exam guide on the day.`;
}

export function reportFileBase(report: ExamReport): string {
  return `OSCP-${normaliseOsid(report.osid)}-Exam-Report`;
}

export function reportGaps(report: ExamReport, loadedShotIds?: ReadonlySet<string>): Gap[] {
  const gaps: Gap[] = [];
  if (!report.osid.trim()) gaps.push({ level: "miss", text: "OSID is empty. The file OffSec expects is OSCP-OS-XXXXX-Exam-Report.pdf." });
  else if (!/^OS-\d{3,}$/i.test(report.osid.trim())) gaps.push({ level: "warn", text: "OSID usually looks like OS-12345." });
  if (report.examDate.trim() === "2026-12-01") {
    gaps.push({ level: "warn", text: "Exam date is 1 Dec 2026. Confirm whether the sitting started before 08:00 GMT." });
  }
  if (!report.summary.trim()) gaps.push({ level: "warn", text: "High-level summary is empty. Two or three sentences on what fell, then the table carries the hosts." });
  if (!report.methodologies.trim()) gaps.push({ level: "warn", text: "Methodologies is empty. OffSec expects the process you used, not only the commands that worked." });
  const started = report.hosts.filter(hostStarted);
  if (started.length === 0) gaps.push({ level: "miss", text: "No host has an IP or a write-up yet." });
  const fixes = report.recommendations.trim() || started.some((host) => host.fix.trim());
  if (!fixes) gaps.push({ level: "warn", text: "Recommendations are empty. One sentence per host on what would have stopped the step." });
  started.forEach((host) => {
    const name = hostLabel(host, hostKindIndex(report.hosts, host));
    if (!host.ip.trim()) gaps.push({ level: "miss", text: `${name}: no IP address.` });
    if (!host.enumeration.trim()) gaps.push({ level: "warn", text: `${name}: service enumeration is empty. The scan command and the ports that mattered.` });
    const access = effectiveAccess(host);
    if (access !== "none" && !host.vulnName.trim()) gaps.push({ level: "warn", text: `${name}: vulnerability name is empty.` });
    if (access !== "none" && !host.foothold.trim()) gaps.push({ level: "miss", text: `${name}: access is marked, but initial access has no command.` });
    if (access === "full" && !host.privesc.trim()) gaps.push({ level: "miss", text: `${name}: proof.txt is claimed, but privilege escalation is empty.` });
    if (access !== "none" && !host.localFlag.trim()) gaps.push({ level: "warn", text: `${name}: local.txt value is empty.` });
    if (access === "full" && !host.proofFlag.trim()) gaps.push({ level: "warn", text: `${name}: proof.txt value is empty.` });
    if (access !== "none" && host.shots.length === 0) {
      gaps.push({ level: "warn", text: `${name}: no screenshot. One frame needs the flag, id or whoami, and the IP.` });
    }
    if (reachedWarning(host)) gaps.push({ level: "warn", text: `${name}: ${REACHED_DEFAULT_WARNING}` });
    if (loadedShotIds) {
      for (const shot of host.shots) {
        if (loadedShotIds.has(shot.id)) continue;
        const caption = shot.caption.trim() || "untitled screenshot";
        gaps.push({ level: "warn", text: `${name}: screenshot file is missing (${caption}).` });
      }
    }
  });
  return gaps;
}

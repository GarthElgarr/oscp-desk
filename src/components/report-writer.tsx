import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Download } from "lucide-react";
import {
  accessLabel,
  blankReport,
  hostLabel,
  hostStarted,
  hostTemplate,
  loadReport,
  moveHost,
  reportFileBase,
  reportGaps,
  saveReport,
  type Access,
  type ExamReport,
  type HostReport,
} from "@/lib/report-model";
import { reportHtml } from "@/lib/report-html";
import { buildReportPdf } from "@/lib/report-pdf";
import { deleteShot, fileToShot, loadShots, putShot, shotBytes, type StoredShot } from "@/lib/report-shots";

const input = "w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg outline-none";
const area = `${input} min-h-28 font-mono text-xs leading-relaxed`;

function download(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-sm">
      <span className="font-mono text-xs tracking-wide text-muted">{label}</span>
      {children}
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function ReportWriter() {
  const [report, setReport] = useState<ExamReport | null>(null);
  const [shots, setShots] = useState<Map<string, StoredShot>>(new Map());
  const [shotsReady, setShotsReady] = useState(false);
  const [openId, setOpenId] = useState<string>("standalone-1");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState<"html" | "pdf" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const loaded = loadReport() ?? blankReport();
    setReport(loaded);
    setOpenId(loaded.hosts[0]?.id ?? "");
    const ids = loaded.hosts.flatMap((host) => host.shots.map((shot) => shot.id));
    void loadShots(ids)
      .then(setShots)
      .catch(() => setError("Screenshots saved in this browser could not be opened."))
      .finally(() => setShotsReady(true));
  }, []);

  useEffect(() => {
    if (!report) return;
    try {
      saveReport(report);
    } catch {
      setError("This browser could not save the report text. The last edit may be lost on refresh.");
    }
  }, [report]);

  const html = useMemo(() => (report ? reportHtml(report, shots) : ""), [report, shots]);
  const gaps = report ? reportGaps(report) : [];

  function patch(partial: Partial<ExamReport>) {
    setReport((current) => (current ? { ...current, ...partial } : current));
  }

  function patchHost(id: string, partial: Partial<HostReport>) {
    setReport((current) =>
      current ? { ...current, hosts: current.hosts.map((host) => (host.id === id ? { ...host, ...partial } : host)) } : current,
    );
  }

  function move(id: string, dir: -1 | 1) {
    setReport((current) => (current ? { ...current, hosts: moveHost(current.hosts, id, dir) } : current));
  }

  async function filesFor(current: ExamReport) {
    const ids = current.hosts.flatMap((host) => host.shots.map((shot) => shot.id));
    let stored = new Map<string, StoredShot>();
    try {
      stored = await loadShots(ids);
    } catch {
      stored = new Map();
    }
    const merged = new Map(stored);
    for (const id of ids) {
      const local = shots.get(id);
      if (local) merged.set(id, local);
    }
    setShots((prev) => {
      const next = new Map(prev);
      for (const [id, shot] of merged) next.set(id, shot);
      return next;
    });
    return merged;
  }

  async function addShot(hostId: string, file: File) {
    setError("");
    try {
      const shot = await fileToShot(file);
      const id = crypto.randomUUID();
      await putShot(id, shot);
      setShots((current) => new Map(current).set(id, shot));
      setReport((current) =>
        current
          ? {
              ...current,
              hosts: current.hosts.map((host) =>
                host.id === hostId ? { ...host, shots: [...host.shots, { id, caption: "" }] } : host,
              ),
            }
          : current,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add that image.");
    }
  }

  async function removeShot(hostId: string, shotId: string) {
    setReport((current) =>
      current
        ? {
            ...current,
            hosts: current.hosts.map((host) =>
              host.id === hostId ? { ...host, shots: host.shots.filter((shot) => shot.id !== shotId) } : host,
            ),
          }
        : current,
    );
    setShots((current) => {
      const next = new Map(current);
      next.delete(shotId);
      return next;
    });
    await deleteShot(shotId).catch(() => undefined);
  }

  async function removeHost(id: string) {
    const host = report?.hosts.find((item) => item.id === id);
    setReport((current) => (current ? { ...current, hosts: current.hosts.filter((item) => item.id !== id) } : current));
    setConfirmId(null);
    if (!host) return;
    for (const shot of host.shots) {
      setShots((current) => {
        const next = new Map(current);
        next.delete(shot.id);
        return next;
      });
      await deleteShot(shot.id).catch(() => undefined);
    }
  }

  async function exportHtml() {
    if (!report) return;
    setBusy("html");
    setError("");
    try {
      const files = await filesFor(report);
      download(`${reportFileBase(report)}.html`, new Blob([reportHtml(report, files)], { type: "text/html" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "The HTML could not be built.");
    } finally {
      setBusy(null);
    }
  }

  async function exportPdf() {
    if (!report) return;
    setBusy("pdf");
    setError("");
    try {
      const files = await filesFor(report);
      const images = new Map(
        [...files.entries()].map(([id, shot]) => [id, { jpeg: shotBytes(shot), w: shot.w, h: shot.h }] as const),
      );
      const bytes = buildReportPdf(report, images);
      const copy = new Uint8Array(bytes);
      download(`${reportFileBase(report)}.pdf`, new Blob([copy], { type: "application/pdf" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "The PDF could not be built.");
    } finally {
      setBusy(null);
    }
  }

  if (!report) return null;

  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-primary bg-surface">
      <div className="border-b border-border px-4 py-3">
        <p className="font-mono text-xs text-primary">Report</p>
        <h2 className="text-lg font-semibold">OSCP exam report</h2>
        <p className="mt-1 text-sm text-muted">
          Same shape OffSec grades: who you are, a short summary, then each host as enumeration, initial access, privilege escalation, and proof. The PDF is the file you submit. HTML is the same document. Saved in this browser. A flag still needs one screenshot with id or whoami, the IP, and the file.
        </p>
      </div>
      <div className="flex flex-col gap-4 px-4 py-4">
        {gaps.length ? (
          <ul className="flex flex-col gap-1">
            {gaps.map((gap) => (
              <li key={gap.text} className={"text-sm " + (gap.level === "miss" ? "text-dead" : "text-muted")}>
                {gap.level === "miss" ? "Missing. " : "Check. "}
                {gap.text}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-alive">The hosts you started have a write-up, the flags you claimed, and a screenshot.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void exportPdf()} disabled={busy !== null} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-primary bg-raised px-3 text-sm text-fg disabled:opacity-40">
            <Download className="size-4" aria-hidden="true" />
            {busy === "pdf" ? "Building PDF" : "Download PDF"}
          </button>
          <button type="button" onClick={() => void exportHtml()} disabled={busy !== null} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm text-fg disabled:opacity-40">
            <Download className="size-4" aria-hidden="true" />
            {busy === "html" ? "Building HTML" : "Download HTML"}
          </button>
          <button type="button" aria-pressed={preview} onClick={() => setPreview((value) => !value)} className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm text-muted">
            {preview ? "Hide preview" : "Preview"}
          </button>
        </div>
        {error ? <p className="text-sm text-dead">{error}</p> : null}
        {preview ? <iframe title="Report preview" className="h-[70vh] w-full rounded-lg border border-border bg-white" srcDoc={html} /> : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="STUDENT NAME">
            <input className={input} value={report.name} onChange={(event) => patch({ name: event.target.value })} />
          </Field>
          <Field label="OSID" hint="OS-12345. The filename is built from this.">
            <input className={input} value={report.osid} onChange={(event) => patch({ osid: event.target.value })} placeholder="OS-12345" />
          </Field>
          <Field label="EMAIL">
            <input className={input} value={report.email} onChange={(event) => patch({ email: event.target.value })} />
          </Field>
          <Field label="EXAM DATE">
            <input className={input} type="date" value={report.examDate} onChange={(event) => patch({ examDate: event.target.value })} />
          </Field>
          <Field label="REPORT DATE">
            <input className={input} type="date" value={report.reportDate} onChange={(event) => patch({ reportDate: event.target.value })} />
          </Field>
        </div>

        <Field label="1. INTRODUCTION" hint="A few sentences. Do not explain what OSCP is.">
          <textarea className={area} value={report.intro} onChange={(event) => patch({ intro: event.target.value })} />
        </Field>
        <Field label="2. HIGH-LEVEL SUMMARY" hint="What fell, in plain language. The host table is added for you.">
          <textarea className={area} value={report.summary} onChange={(event) => patch({ summary: event.target.value })} placeholder="Three standalone hosts and one Active Directory set. The path that worked is in the sections below." />
        </Field>
        <Field label="3. RECOMMENDATIONS" hint="Optional overview. Each host can also carry its own fix.">
          <textarea className={area} value={report.recommendations} onChange={(event) => patch({ recommendations: event.target.value })} />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="DOMAIN" hint="AD set only. Leave blank on a single practice box.">
            <input className={input} value={report.domain} onChange={(event) => patch({ domain: event.target.value })} placeholder="exam.local" />
          </Field>
          <Field label="STARTING CREDENTIAL" hint="The user the exam panel gave you. Not a password list.">
            <input className={input} value={report.adUser} onChange={(event) => patch({ adUser: event.target.value })} placeholder="exam.local\examuser" />
          </Field>
        </div>
        <Field label="AD CHAIN" hint="How you moved, in order. The host sections below are the detail.">
          <textarea className={area} value={report.adNarrative} onChange={(event) => patch({ adNarrative: event.target.value })} />
        </Field>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              const id = crypto.randomUUID();
              setReport((current) => (current ? { ...current, hosts: [...current.hosts, hostTemplate("standalone", id)] } : current));
              setOpenId(id);
            }}
            className="inline-flex min-h-11 items-center rounded-lg border border-primary bg-raised px-3 text-sm text-fg"
          >
            Add standalone
          </button>
          <button
            type="button"
            onClick={() => {
              const id = crypto.randomUUID();
              setReport((current) => (current ? { ...current, hosts: [...current.hosts, hostTemplate("ad", id)] } : current));
              setOpenId(id);
            }}
            className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm text-fg"
          >
            Add AD host
          </button>
        </div>

        {(["standalone", "ad"] as const).map((kind) => {
          const group = report.hosts.filter((host) => host.kind === kind);
          if (!group.length) return null;
          return (
            <div key={kind} className="flex flex-col gap-3">
              <p className="font-mono text-xs tracking-wide text-muted">
                {kind === "ad" ? "ACTIVE DIRECTORY HOSTS" : "STANDALONE HOSTS"}
              </p>
              {group.map((host) => {
          const index = group.indexOf(host);
          const open = openId === host.id;
          return (
            <div key={host.id} className="rounded-lg border border-border bg-bg">
              <button type="button" onClick={() => setOpenId(open ? "" : host.id)} className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left">
                <span className="min-w-0">
                  <span className="font-mono text-xs text-primary">{host.kind === "ad" ? "AD" : "STANDALONE"}</span>
                  <span className="mt-0.5 block truncate text-sm font-semibold">{hostLabel(host, index)}</span>
                </span>
                <span className="shrink-0 text-xs text-muted">{hostStarted(host) ? accessLabel(host.access) : "empty"}</span>
              </button>
              {open ? (
                <div className="flex flex-col gap-3 border-t border-border px-3 py-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="HOSTNAME">
                      <input className={input} value={host.hostname} onChange={(event) => patchHost(host.id, { hostname: event.target.value })} />
                    </Field>
                    <Field label="IP">
                      <input className={input} value={host.ip} onChange={(event) => patchHost(host.id, { ip: event.target.value })} />
                    </Field>
                    <Field label="OS">
                      <input className={input} value={host.os} onChange={(event) => patchHost(host.id, { os: event.target.value })} placeholder="Linux or Windows" />
                    </Field>
                    <Field label="REACHED">
                      <select className={input} value={host.access} onChange={(event) => patchHost(host.id, { access: event.target.value as Access })}>
                        <option value="none">Not compromised</option>
                        <option value="local">local.txt only</option>
                        <option value="full">local.txt and proof.txt</option>
                      </select>
                    </Field>
                    <Field label="LOCAL.TXT">
                      <input className={input} value={host.localFlag} onChange={(event) => patchHost(host.id, { localFlag: event.target.value })} />
                    </Field>
                    <Field label="PROOF.TXT">
                      <input className={input} value={host.proofFlag} onChange={(event) => patchHost(host.id, { proofFlag: event.target.value })} />
                    </Field>
                  </div>
                  <Field label="SERVICE ENUMERATION" hint="The scan you ran and the ports that mattered. Not every filtered port.">
                    <textarea className={area} value={host.enumeration} onChange={(event) => patchHost(host.id, { enumeration: event.target.value })} />
                  </Field>
                  <Field label="INITIAL ACCESS" hint="What was vulnerable, the exact command, and the user you landed as.">
                    <textarea className={area} value={host.foothold} onChange={(event) => patchHost(host.id, { foothold: event.target.value })} />
                  </Field>
                  <Field label="PRIVILEGE ESCALATION" hint="The check that was alive, the command, and the privileged user. If you stopped at local.txt, say that.">
                    <textarea className={area} value={host.privesc} onChange={(event) => patchHost(host.id, { privesc: event.target.value })} />
                  </Field>
                  <Field label="FIX" hint="The one change that would have stopped this step.">
                    <textarea className={area} value={host.fix} onChange={(event) => patchHost(host.id, { fix: event.target.value })} />
                  </Field>
                  <div className="flex flex-col gap-2">
                    <span className="font-mono text-xs tracking-wide text-muted">SCREENSHOTS</span>
                    <p className="text-xs text-muted">One frame per flag: the command, id or whoami, the IP, and the flag. Do not crop the prompt.</p>
                    {host.shots.map((shot) => {
                      const file = shots.get(shot.id);
                      return (
                        <div key={shot.id} className="rounded-lg border border-border p-2">
                          {file && file.dataUrl.startsWith("data:image/jpeg;base64,") ? (
                            <img alt="" src={file.dataUrl} className="mb-2 max-h-48 max-w-full rounded" />
                          ) : (
                            <p className={"mb-2 text-sm " + (shotsReady ? "text-dead" : "text-muted")}>
                              {shotsReady ? "This image did not load." : "Opening screenshot."}
                            </p>
                          )}
                          <input
                            className={input}
                            value={shot.caption}
                            placeholder="local.txt as www-data, with id and the IP"
                            onChange={(event) =>
                              patchHost(host.id, {
                                shots: host.shots.map((item) => (item.id === shot.id ? { ...item, caption: event.target.value } : item)),
                              })
                            }
                          />
                          <button type="button" onClick={() => void removeShot(host.id, shot.id)} className="mt-2 inline-flex min-h-11 items-center text-sm text-muted">
                            Remove screenshot
                          </button>
                        </div>
                      );
                    })}
                    <label className="inline-flex min-h-11 w-fit items-center rounded-lg border border-border px-3 text-sm text-fg">
                      Add screenshot
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = "";
                          if (file) void addShot(host.id, file);
                        }}
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => move(host.id, -1)} disabled={moveHost(report.hosts, host.id, -1) === report.hosts} className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm text-muted disabled:opacity-40">Up</button>
                    <button type="button" onClick={() => move(host.id, 1)} disabled={moveHost(report.hosts, host.id, 1) === report.hosts} className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm text-muted disabled:opacity-40">Down</button>
                    <button type="button" onClick={() => setConfirmId(confirmId === host.id ? null : host.id)} className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm text-muted">
                      {confirmId === host.id ? "Cancel" : "Remove host"}
                    </button>
                    {confirmId === host.id ? (
                      <button type="button" onClick={() => void removeHost(host.id)} className="inline-flex min-h-11 items-center rounded-lg border border-dead px-3 text-sm text-dead">
                        Confirm remove
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          );
              })}
            </div>
          );
        })}
      </div>
    </article>
  );
}

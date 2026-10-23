import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Check, ChevronDown, Copy, Download, Search } from "lucide-react";
import { SECTIONS, TECHNIQUES, type Technique } from "@/data/methodology";
import { LAB_SCRIPTS, type LabScript } from "@/data/lab-scripts";
import { WHY as BASE_WHY } from "@/data/why";
import { SERVICE_WHY } from "@/data/why-services";
import { API_WHY } from "@/data/why-api";
import { JwtCheck } from "@/components/jwt-check";
import { ReportWriter } from "@/components/report-writer";
import { Builders, type ToolId } from "@/components/tool-builders";
import { UploadsPanel } from "@/components/uploads-panel";
import { WinrmCard } from "@/components/winrm-card";
import { PenelopeCard } from "@/components/penelope-card";
import { getLoot, getLootServer, subscribeLoot } from "@/lib/loot";
import { LootCard } from "@/components/loot-card";
import { NotesPanel } from "@/components/notes-panel";
import { InstallTools } from "@/components/install-tools";
import { CoverImage } from "@/components/cover-image";
import { NmapReports } from "@/components/nmap-reports";
import { JobList } from "@/components/job-list";
import { clearJobs, getJobs, getJobsServer, subscribeJobs, syncJobs } from "@/lib/live-jobs";

const WHY: Record<string, string> = { ...BASE_WHY, ...SERVICE_WHY, ...API_WHY };

const STORE = "oscp-field-notes-v1";

function loadDone(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORE);
    const ids = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(ids);
  } catch {
    return new Set();
  }
}

export function MethodDesk() {
  const [query, setQuery] = useState("");
  const [section, setSection] = useState<string>("Exam");
  const [lootFocus, setLootFocus] = useState("");
  const [openOnly, setOpenOnly] = useState(false);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [openSource, setOpenSource] = useState<string | null>(null);
  const [openCard, setOpenCard] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const runs = useSyncExternalStore(subscribeJobs, getJobs, getJobsServer);

  useEffect(() => {
    void syncJobs();
  }, []);

  useEffect(() => {
    setDone(loadDone());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORE, JSON.stringify([...done]));
  }, [done, ready]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of SECTIONS) map.set(s, 0);
    for (const t of TECHNIQUES) map.set(t.section, (map.get(t.section) ?? 0) + 1);
    return map;
  }, []);

  const visibleScripts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return LAB_SCRIPTS.filter((s) => {
      if (openOnly && done.has(s.id)) return false;
      if (!q) return section === "Scripts";
      const blob = `${s.title} ${s.file} ${s.look} ${s.run} ${s.alive} ${s.dead} ${s.next} ${WHY[s.id] ?? ""}`.toLowerCase();
      if (!blob.includes(q)) return false;
      return true;
    });
  }, [query, section, openOnly, done]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TECHNIQUES.filter((t) => {
      if (!q) {
        if (section === "Scripts" || section === "Builders" || section === "Uploads" || section === "Notes" || section === "Nmap" || section === "Runs") return false;
        if (section !== "All" && t.section !== section) return false;
      }
      if (openOnly && done.has(t.id)) return false;
      if (!q) return true;
      const blob = `${t.section} ${t.title} ${t.look} ${t.cmd} ${t.alive} ${t.dead} ${t.next} ${WHY[t.id] ?? ""}`.toLowerCase();
      return blob.includes(q);
    });
  }, [query, section, openOnly, done]);

  function toggle(id: string) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function copy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      window.setTimeout(() => setCopied((c) => (c === id ? null : c)), 1200);
    } catch {
      setCopied(null);
    }
  }

  function download(file: string, source: string) {
    const blob = new Blob([source], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  const showTransfer = (!query.trim() && (section === "Uploads" || section === "Shells")) || /certutil|wget|\biwr\b|transfer|tun0|uploads/i.test(query);
  const showWinrm = (!query.trim() && (section === "Windows" || section === "Shells")) || /evil-winrm|winrm/i.test(query);
  const showPenelope = (!query.trim() && section === "Shells") || /penelope|listener|\bnc\b/i.test(query);
  const showLoot = section === "Loot" || /\bloot\b|nthash|netntlm/i.test(query);
  const lootCount = useSyncExternalStore(subscribeLoot, getLoot, getLootServer).length;
  const builderTools = useMemo(() => {
    const q = query.trim();
    const tools: ToolId[] = [];
    const want = (id: ToolId, onSection: boolean, pattern: RegExp) => {
      if ((section === "Builders" && !q) || (onSection && !q) || (q && pattern.test(q))) tools.push(id);
    };
    want("msfvenom", section === "Shells", /msfvenom|venom|payload/i);
    want("identify", section === "Passwords", /hashid|identify|secretsdump|separator unmatched|token length|\bntlm\b|krb5/i);
    want("hashcat", section === "Passwords", /hashcat/i);
    want("john", section === "Passwords", /john|ssh2john|zip2john|unshadow/i);
    want("hydra", section === "Passwords", /hydra/i);
    want("nxc", section === "Active Directory", /\bnxc\b|netexec/i);
    want(
      "local",
      section === "Linux" || section === "Windows",
      /uname|systeminfo|\/proc\/version|dirty ?(?:cow|pipe)|local vuln|kernel version|sudo --version/i,
    );
    want("udp", section === "Recon" || section === "Services", /udp|nmap|snmp|tftp/i);
    want("tunnel", section === "Tunneling", /chisel|ligolo|tunnel|pivot|socks/i);
    want("wfuzz", section === "Web", /wfuzz|fuzz|vhost|seclist|parameter/i);
    want("impacket", section === "Active Directory" || section === "Windows" || section === "Passwords", /impacket|secretsdump|psexec|wmiexec|smbexec|atexec|kerberoast|asrep|ticketer|ntlmrelay|mssqlclient/i);
    return tools;
  }, [section, query]);

  const total = TECHNIQUES.length + LAB_SCRIPTS.length;
  const marked = [...TECHNIQUES, ...LAB_SCRIPTS].filter((t) => done.has(t.id)).length;

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6">
          <CoverImage />
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-xs tracking-widest text-primary">FIELD NOTES</p>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">OSCP methodology</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted">
                Look for, the command, and what alive versus dead output means. Click a title to open that card, and click it again to close it. Mark only ticks it. Reset desk clears the ticks and the runs. Notes, loot, and the report stay until you delete those yourself.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-sm text-muted">
                {marked}/{total} checked
              </p>
              <button
                type="button"
                onClick={() => {
                  if (!confirmClear) {
                    setConfirmClear(true);
                    return;
                  }
                  setDone(new Set());
                  setQuery("");
                  setSection("Exam");
                  setOpenCard(null);
                  setOpenOnly(false);
                  setConfirmClear(false);
                  void clearJobs();
                }}
                className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm text-muted"
              >
                {confirmClear ? "Confirm reset" : "Reset desk"}
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2">
              <Search className="size-4 shrink-0 text-muted" aria-hidden="true" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search: jwt, api, hydra, nxc"
                className="w-full min-w-0 bg-transparent text-sm text-fg outline-none placeholder:text-muted"
              />
            </label>
            <button
              type="button"
              aria-pressed={openOnly}
              onClick={() => setOpenOnly((v) => !v)}
              className={
                "inline-flex min-h-11 items-center justify-center rounded-lg border px-3 text-sm " +
                (openOnly
                  ? "border-primary bg-raised text-fg"
                  : "border-border bg-bg text-muted")
              }
            >
              {openOnly ? "Showing open" : "Hide checked"}
            </button>
          </div>
          <InstallTools />
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[13.75rem_minmax(0,1fr)]">
        <nav className="flex w-full min-w-0 gap-2 overflow-x-auto pb-1 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:flex-col lg:overflow-y-auto lg:pb-0">
          <SectionButton
            label="All"
            count={TECHNIQUES.length}
            active={section === "All"}
            onClick={() => setSection("All")}
          />
          {SECTIONS.map((s) => (
            <SectionButton
              key={s}
              label={s}
              count={counts.get(s) ?? 0}
              active={section === s}
              onClick={() => setSection(s)}
            />
          ))}
          <SectionButton
            label="Notes"
            count={0}
            active={section === "Notes"}
            onClick={() => setSection("Notes")}
          />
          <SectionButton
            label="Loot"
            count={lootCount}
            active={section === "Loot"}
            onClick={() => setSection("Loot")}
          />
          <SectionButton
            label="Uploads"
            count={0}
            active={section === "Uploads"}
            onClick={() => setSection("Uploads")}
          />
          <SectionButton
            label="Runs"
            count={runs.length}
            active={section === "Runs"}
            onClick={() => setSection("Runs")}
          />
          <SectionButton
            label="Nmap"
            count={0}
            active={section === "Nmap"}
            onClick={() => setSection("Nmap")}
          />
          <SectionButton
            label="Scripts"
            count={LAB_SCRIPTS.length}
            active={section === "Scripts"}
            onClick={() => setSection("Scripts")}
          />
          <SectionButton
            label="Builders"
            count={9}
            active={section === "Builders"}
            onClick={() => setSection("Builders")}
          />
        </nav>

        <main className="flex min-w-0 flex-col gap-4">
          {showTransfer ? <UploadsPanel /> : null}
          {showLoot ? <LootCard focusId={lootFocus} /> : null}
          {showPenelope ? <PenelopeCard /> : null}
          {showWinrm ? <WinrmCard /> : null}
          {section === "Notes" ? <NotesPanel onOpenLoot={(id) => { setLootFocus(id); setSection("Loot"); }} /> : null}
          {section === "Runs" ? (
            <article className="min-w-0 overflow-hidden rounded-lg border border-primary bg-surface">
              <div className="border-b border-border px-4 py-3">
                <p className="font-mono text-xs text-primary">Runs</p>
                <h2 className="text-lg font-semibold">Scans and tools</h2>
                <p className="mt-1 text-sm text-muted">
                  Nmap, the UDP scanner, searchsploit, the local exploit suggester, hydra, wfuzz, hashcat, john, impacket, and the install. Leaving a page does not stop one.
                  Kill ends that process and keeps the output. Remove drops that one, and for nmap it also deletes the saved files. Reset desk clears every run. It does not touch notes or the report.
                </p>
              </div>
              <div className="px-4 py-4">
                <JobList empty="Nothing running or finished in this session yet." />
              </div>
            </article>
          ) : null}
          {section === "Nmap" ? <NmapReports withSearch /> : null}
          {builderTools.length > 0 ? <Builders key={builderTools.join(",")} tools={builderTools} /> : null}
          {section === "API" || /jwt|bearer|openapi|swagger/i.test(query) ? <JwtCheck /> : null}
          {section === "Report" ? <ReportWriter /> : null}
          {visibleScripts.map((s) => (
            <ScriptCard
              key={s.id}
              item={s}
              open={openCard === s.id}
              checked={done.has(s.id)}
              copied={copied === s.id}
              sourceOpen={openSource === s.id}
              onOpen={() => setOpenCard((id) => (id === s.id ? null : s.id))}
              onToggle={() => toggle(s.id)}
              onCopy={() => copy(s.id, s.source)}
              onDownload={() => download(s.file, s.source)}
              onToggleSource={() => setOpenSource((id) => (id === s.id ? null : s.id))}
            />
          ))}
          {(query.trim() || section !== "Scripts") &&
            visible.map((t) => (
              <Card
                key={t.id}
                item={t}
                open={openCard === t.id}
                checked={done.has(t.id)}
                copied={copied === t.id}
                onOpen={() => setOpenCard((id) => (id === t.id ? null : t.id))}
                onToggle={() => toggle(t.id)}
                onCopy={() => copy(t.id, t.cmd)}
              />
            ))}
          {section !== "Uploads" &&
          section !== "Notes" &&
          visibleScripts.length === 0 &&
          builderTools.length === 0 &&
          (query.trim() || section !== "Scripts" ? visible.length === 0 : true) ? (
            <p className="rounded-lg border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
              Nothing matches. Try a port, a tool, or a privilege name.
            </p>
          ) : null}
        </main>
      </div>
    </div>
  );
}

function ScriptCard({
  item,
  open,
  checked,
  copied,
  sourceOpen,
  onOpen,
  onToggle,
  onCopy,
  onDownload,
  onToggleSource,
}: {
  item: LabScript;
  open: boolean;
  checked: boolean;
  copied: boolean;
  sourceOpen: boolean;
  onOpen: () => void;
  onToggle: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onToggleSource: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (open) ref.current?.scrollIntoView({ block: "nearest" });
  }, [open]);
  return (
    <article ref={ref} className="min-w-0 overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={onOpen}
          aria-expanded={open}
          className="flex min-h-14 min-w-0 flex-1 items-start gap-3 px-4 py-3 text-left"
        >
          <ChevronDown className={"mt-1 size-4 shrink-0 text-muted " + (open ? "rotate-180" : "")} aria-hidden="true" />
          <span className="min-w-0">
            <span className="block font-mono text-xs text-primary">Scripts</span>
            <span className="block text-lg font-semibold text-fg">{item.title}</span>
            {open ? (
              <span className="mt-1 block break-all font-mono text-xs text-muted">{item.file}</span>
            ) : (
              <span className="mt-1 line-clamp-2 block text-sm text-muted">{item.look}</span>
            )}
          </span>
        </button>
        <div className="flex shrink-0 items-center pr-3">
          <button
            type="button"
            onClick={onToggle}
            aria-pressed={checked}
            className={
              "inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm " +
              (checked
                ? "border-alive bg-alive-bg text-alive"
                : "border-border bg-bg text-muted")
            }
          >
            <Check className="size-4" aria-hidden="true" />
            {checked ? "Done" : "Mark"}
          </button>
        </div>
      </div>
      {open ? (
      <div className="flex flex-col gap-4 border-t border-border px-4 py-4">
        <Block label="Look for" body={item.look} />
        <div>
          <p className="font-mono text-xs tracking-wide text-muted">RUN</p>
          <pre className="mt-2 max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-bg p-3 font-mono text-xs leading-relaxed text-fg">
            {item.run}
          </pre>
          <WhyBlock id={item.id} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="min-w-0 rounded-lg bg-alive-bg p-3">
            <p className="font-mono text-xs text-alive">ALIVE</p>
            <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-fg">
              {item.alive}
            </pre>
          </div>
          <div className="min-w-0 rounded-lg bg-dead-bg p-3">
            <p className="font-mono text-xs text-dead">DEAD — SKIP</p>
            <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-fg">
              {item.dead}
            </pre>
          </div>
        </div>
        <Block label="Next" body={item.next} />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-primary bg-raised px-3 text-sm text-fg"
          >
            <Copy className="size-4" aria-hidden="true" />
            {copied ? "Copied" : "Copy script"}
          </button>
          <button
            type="button"
            onClick={onDownload}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-bg px-3 text-sm text-muted"
          >
            <Download className="size-4" aria-hidden="true" />
            Download
          </button>
          <button
            type="button"
            onClick={onToggleSource}
            aria-expanded={sourceOpen}
            className="inline-flex min-h-11 items-center rounded-lg border border-border bg-bg px-3 text-sm text-muted"
          >
            {sourceOpen ? "Hide source" : "Show source"}
          </button>
        </div>
        {sourceOpen ? (
          <pre className="max-h-96 max-w-full overflow-auto whitespace-pre rounded-lg bg-bg p-3 font-mono text-xs leading-relaxed text-fg">
            {item.source}
          </pre>
        ) : null}
      </div>
      ) : null}
    </article>
  );
}

function SectionButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex shrink-0 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm lg:w-full " +
        (active
          ? "border-primary bg-raised text-fg"
          : "border-border bg-surface text-muted hover:text-fg")
      }
    >
      <span>{label}</span>
      <span className="font-mono text-xs">{count}</span>
    </button>
  );
}

function Card({
  item,
  open,
  checked,
  copied,
  onOpen,
  onToggle,
  onCopy,
}: {
  item: Technique;
  open: boolean;
  checked: boolean;
  copied: boolean;
  onOpen: () => void;
  onToggle: () => void;
  onCopy: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (open) ref.current?.scrollIntoView({ block: "nearest" });
  }, [open]);
  return (
    <article ref={ref} className="min-w-0 overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={onOpen}
          aria-expanded={open}
          className="flex min-h-14 min-w-0 flex-1 items-start gap-3 px-4 py-3 text-left"
        >
          <ChevronDown className={"mt-1 size-4 shrink-0 text-muted " + (open ? "rotate-180" : "")} aria-hidden="true" />
          <span className="min-w-0">
            <span className="block font-mono text-xs text-primary">{item.section}</span>
            <span className="block text-lg font-semibold text-fg">{item.title}</span>
            {open ? null : <span className="mt-1 line-clamp-2 block text-sm text-muted">{item.look}</span>}
          </span>
        </button>
        <div className="flex shrink-0 items-center pr-3">
          <button
            type="button"
            onClick={onToggle}
            aria-pressed={checked}
            className={
              "inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm " +
              (checked
                ? "border-alive bg-alive-bg text-alive"
                : "border-border bg-bg text-muted")
            }
          >
            <Check className="size-4" aria-hidden="true" />
            {checked ? "Done" : "Mark"}
          </button>
        </div>
      </div>

      {open ? (
      <div className="flex flex-col gap-4 border-t border-border px-4 py-4">
        <Block label="Look for" body={item.look} />
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="font-mono text-xs tracking-wide text-muted">COMMAND</p>
            <button
              type="button"
              onClick={onCopy}
              className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs text-muted hover:text-fg"
            >
              <Copy className="size-3.5" aria-hidden="true" />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-bg p-3 font-mono text-xs leading-relaxed text-fg">
            {item.cmd}
          </pre>
          <WhyBlock id={item.id} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="min-w-0 rounded-lg bg-alive-bg p-3">
            <p className="font-mono text-xs text-alive">ALIVE</p>
            <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-fg">
              {item.alive}
            </pre>
          </div>
          <div className="min-w-0 rounded-lg bg-dead-bg p-3">
            <p className="font-mono text-xs text-dead">DEAD — SKIP</p>
            <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-fg">
              {item.dead}
            </pre>
          </div>
        </div>
        <Block label="Next" body={item.next} />
      </div>
      ) : null}
    </article>
  );
}

function WhyBlock({ id }: { id: string }) {
  const text = WHY[id];
  if (!text) return null;
  return (
    <div className="mt-3 rounded-lg bg-raised px-3 py-3">
      <p className="font-mono text-xs tracking-wide text-primary">WHAT IT DOES</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-fg">{text}</p>
    </div>
  );
}

function Block({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <p className="font-mono text-xs tracking-wide text-muted">{label.toUpperCase()}</p>
      <p className="mt-1 text-sm break-words text-fg">{body}</p>
    </div>
  );
}

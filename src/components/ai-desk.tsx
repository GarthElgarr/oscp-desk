import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, CircleHelp, Copy, Search } from "lucide-react";
import { AI_SECTIONS, AI_TECHNIQUES } from "@/data/pen300";
import { AI_WHY } from "@/data/pen300-why";
import type { Technique } from "@/data/methodology";
import { MatrixRain } from "@/components/matrix-rain";
import { RainColor } from "@/components/rain-color";
import { CoverImage } from "@/components/cover-image";
import { previewPathPrefix } from "@/lib/preview-path-prefix";

const STORE = "kerberos-ai-done-v1";
const UNSURE_STORE = "kerberos-ai-unsure-v1";

function loadIds(key: string): Set<string> {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return new Set();
  }
}

function homeHref(): string {
  if (typeof window === "undefined") return "/";
  const prefix = previewPathPrefix(window.location.hostname, window.location.pathname) ?? "";
  return `${prefix}/`;
}

export function AiDesk() {
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [section, setSection] = useState<string>("Start");
  const [openOnly, setOpenOnly] = useState(false);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [unsure, setUnsure] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [openCard, setOpenCard] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    const previous = document.title;
    document.title = "Kerberos AI Desk";
    setDone(loadIds(STORE));
    setUnsure(loadIds(UNSURE_STORE));
    setReady(true);
    return () => {
      document.title = previous;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORE, JSON.stringify([...done]));
  }, [done, ready]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(UNSURE_STORE, JSON.stringify([...unsure]));
  }, [unsure, ready]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of AI_TECHNIQUES) map.set(item.section, (map.get(item.section) ?? 0) + 1);
    return map;
  }, []);

  const hits = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return AI_TECHNIQUES.filter((item) => {
      const blob = `${item.section} ${item.title} ${item.look} ${item.cmd}`.toLowerCase();
      return words.every((word) => blob.includes(word));
    }).slice(0, 12);
  }, [query]);

  const visible = AI_TECHNIQUES.filter((item) => {
    if (section !== "All" && item.section !== section) return false;
    if (openOnly && done.has(item.id)) return false;
    return true;
  });

  const marked = AI_TECHNIQUES.filter((item) => done.has(item.id)).length;
  const unsureCount = AI_TECHNIQUES.filter((item) => unsure.has(item.id)).length;

  function openHit(item: Technique) {
    setQuery("");
    setSearchOpen(false);
    setOpenOnly(false);
    setSection(item.section);
    setOpenCard(item.id);
  }

  return (
    <div className="relative min-h-screen text-fg">
      <MatrixRain />
      <div className="relative z-10">
        <header className="border-b border-border">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 bg-bg px-4 py-5 sm:px-6">
            <CoverImage />
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-xs tracking-widest text-primary">PEN-300</p>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Kerberos AI Desk</h1>
                <p className="mt-1 max-w-2xl text-sm text-muted">
                  The lab method for breaching a defense. Name the control, make one change, and write the hop. This page does not build the payload for you. The other desk has the builders.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono text-sm text-muted">
                  {marked}/{AI_TECHNIQUES.length} checked{unsureCount ? ` · ${unsureCount} unsure` : ""}
                </p>
                <RainColor />
                <a href={homeHref()} className="inline-flex min-h-11 items-center rounded-lg border border-primary bg-raised px-3 text-sm text-fg">
                  Kerberos Security Desk
                </a>
                <button
                  type="button"
                  onClick={() => {
                    if (!confirmClear) {
                      setConfirmClear(true);
                      return;
                    }
                    setDone(new Set());
                    setUnsure(new Set());
                    setQuery("");
                    setSection("Start");
                    setOpenCard(null);
                    setOpenOnly(false);
                    setConfirmClear(false);
                  }}
                  className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm text-muted"
                >
                  {confirmClear ? "Confirm reset" : "Reset desk"}
                </button>
              </div>
            </div>
            <div className="relative flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <label className="flex items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2">
                  <Search className="size-4 shrink-0 text-muted" aria-hidden="true" />
                  <input
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setSearchOpen(true);
                    }}
                    onFocus={() => setSearchOpen(true)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") setSearchOpen(false);
                    }}
                    placeholder="Search: AMSI, AppLocker, proxy, injection"
                    className="w-full min-w-0 bg-transparent text-sm text-fg outline-none placeholder:text-muted"
                  />
                </label>
                {searchOpen && query.trim() ? (
                  <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded-lg border border-border bg-surface shadow-lg">
                    {hits.length === 0 ? <p className="px-3 py-3 text-sm text-muted">Nothing with those words.</p> : null}
                    {hits.map((item) => (
                      <button key={item.id} type="button" onClick={() => openHit(item)} className="block w-full px-3 py-2 text-left hover:bg-raised">
                        <span className="font-mono text-xs text-primary">{item.section}</span>
                        <span className="block text-sm text-fg">{item.title}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setOpenOnly((value) => !value)}
                className={"inline-flex min-h-11 items-center justify-center rounded-lg border px-3 text-sm " + (openOnly ? "border-primary bg-raised text-fg" : "border-border bg-bg text-muted")}
              >
                {openOnly ? "Showing open" : "Hide checked"}
              </button>
            </div>
          </div>
        </header>
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[13.75rem_minmax(0,1fr)]">
          <nav className="flex w-full min-w-0 gap-2 overflow-x-auto pb-1 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:flex-col lg:overflow-y-auto lg:pb-0">
            <SectionButton label="All" count={AI_TECHNIQUES.length} active={section === "All"} onClick={() => setSection("All")} />
            {AI_SECTIONS.map((name) => (
              <SectionButton key={name} label={name} count={counts.get(name) ?? 0} active={section === name} onClick={() => setSection(name)} />
            ))}
          </nav>
          <div className="flex min-w-0 flex-col gap-3">
            {visible.map((item) => (
              <AiCard
                key={item.id}
                item={item}
                why={AI_WHY[item.id] ?? ""}
                open={openCard === item.id}
                checked={done.has(item.id)}
                unsure={unsure.has(item.id)}
                copied={copied === item.id}
                onOpen={() => setOpenCard((current) => (current === item.id ? null : item.id))}
                onToggle={() =>
                  setDone((current) => {
                    const next = new Set(current);
                    if (next.has(item.id)) next.delete(item.id);
                    else next.add(item.id);
                    return next;
                  })
                }
                onUnsure={() =>
                  setUnsure((current) => {
                    const next = new Set(current);
                    if (next.has(item.id)) next.delete(item.id);
                    else next.add(item.id);
                    return next;
                  })
                }
                onCopy={() => {
                  void navigator.clipboard.writeText(item.cmd).then(() => {
                    setCopied(item.id);
                    window.setTimeout(() => setCopied(null), 1200);
                  });
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionButton({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={"flex shrink-0 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm lg:w-full " + (active ? "border-primary bg-raised text-fg" : "border-border bg-surface text-muted hover:text-fg")}
    >
      <span>{label}</span>
      <span className="font-mono text-xs">{count}</span>
    </button>
  );
}

function AiCard({
  item,
  why,
  open,
  checked,
  unsure,
  copied,
  onOpen,
  onToggle,
  onUnsure,
  onCopy,
}: {
  item: Technique;
  why: string;
  open: boolean;
  checked: boolean;
  unsure: boolean;
  copied: boolean;
  onOpen: () => void;
  onToggle: () => void;
  onUnsure: () => void;
  onCopy: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (open) ref.current?.scrollIntoView({ block: "nearest" });
  }, [open]);
  return (
    <article id={`card-${item.id}`} ref={ref} className={"min-w-0 scroll-mt-4 overflow-hidden rounded-lg border bg-surface " + (unsure ? "border-[#8a5a20]" : "border-border")}>
      <div className="flex items-stretch">
        <button type="button" onClick={onOpen} aria-expanded={open} className="flex min-h-14 min-w-0 flex-1 items-start gap-3 px-4 py-3 text-left">
          <ChevronDown className={"mt-1 size-4 shrink-0 text-muted " + (open ? "rotate-180" : "")} aria-hidden="true" />
          <span className="min-w-0">
            <span className="block font-mono text-xs text-primary">{item.section}</span>
            <span className="block text-lg font-semibold text-fg">{item.title}</span>
            {open ? null : <span className="mt-1 line-clamp-2 block text-sm text-muted">{item.look}</span>}
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-1 py-2 pr-3">
          <button type="button" onClick={onToggle} className={"inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm " + (checked ? "border-alive bg-alive-bg text-alive" : "border-border bg-bg text-muted")}>
            <Check className="size-4" aria-hidden="true" />
            {checked ? "Done" : "Mark"}
          </button>
          <button type="button" onClick={onUnsure} className={"inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm " + (unsure ? "border-[#8a5a20] bg-[#3a2a14] text-[#e0a15a]" : "border-border bg-bg text-muted")}>
            <CircleHelp className="size-4" aria-hidden="true" />
            {unsure ? "Check later" : "Unsure"}
          </button>
        </div>
      </div>
      {open ? (
        <div className="flex flex-col gap-4 border-t border-border px-4 py-4">
          <div>
            <p className="font-mono text-xs tracking-wide text-muted">WHAT THIS CHECK IS</p>
            <p className="mt-1 text-sm text-fg">{item.look}</p>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="font-mono text-xs tracking-wide text-muted">COMMAND</p>
              <button type="button" onClick={onCopy} className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs text-muted">
                <Copy className="size-3.5" aria-hidden="true" />
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-bg p-3 font-mono text-xs leading-relaxed text-fg">{item.cmd}</pre>
            {why ? (
              <div className="mt-3 rounded-lg bg-raised px-3 py-3">
                <p className="font-mono text-xs tracking-wide text-primary">WHAT IT DOES</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-fg">{why}</p>
              </div>
            ) : null}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="min-w-0 rounded-lg bg-alive-bg p-3">
              <p className="font-mono text-xs text-alive">PURSUE</p>
              <p className="mt-1 text-sm text-muted">You saw something like this. Stay on it.</p>
              <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-fg">{item.alive}</pre>
            </div>
            <div className="min-w-0 rounded-lg bg-dead-bg p-3">
              <p className="font-mono text-xs text-dead">STOP</p>
              <p className="mt-1 text-sm text-muted">You saw something like this. Tick it and move on.</p>
              <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-fg">{item.dead}</pre>
            </div>
          </div>
          <div>
            <p className="font-mono text-xs tracking-wide text-muted">NEXT</p>
            <p className="mt-1 text-sm text-fg">{item.next}</p>
          </div>
        </div>
      ) : null}
    </article>
  );
}

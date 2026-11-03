import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Check, ChevronDown, CircleHelp, Copy, Download, Search } from "lucide-react";
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
import { GlobalConfig } from "@/components/global-config";
import { CoverImage } from "@/components/cover-image";
import { MatrixRain } from "@/components/matrix-rain";
import { RainColor } from "@/components/rain-color";
import { NmapReports } from "@/components/nmap-reports";
import { JobList } from "@/components/job-list";
import { clearJobs, getJobs, getJobsServer, subscribeJobs, syncJobs } from "@/lib/live-jobs";

const WHY: Record<string, string> = { ...BASE_WHY, ...SERVICE_WHY, ...API_WHY };

const STORE = "oscp-field-notes-v1";
const UNSURE_STORE = "oscp-field-unsure-v1";

type DeskLink = { label: string; section: string; tool?: ToolId; anchor: string };

const CARD_LINKS: Record<string, DeskLink[]> = {
  "recon-nmap": [{ label: "Nmap scanner", section: "Nmap", tool: "nmap", anchor: "builder-nmap" }],
  "recon-search": [{ label: "searchsploit", section: "Builders", tool: "search", anchor: "builder-search" }],
  "recon-udp": [{ label: "UDP scanner", section: "Builders", tool: "udp", anchor: "builder-udp" }],
  "svc-ntp": [{ label: "UDP scanner", section: "Builders", tool: "udp", anchor: "builder-udp" }],
  "svc-snmp": [{ label: "SNMP", section: "Builders", tool: "snmp", anchor: "builder-snmp" }, { label: "UDP scanner", section: "Builders", tool: "udp", anchor: "builder-udp" }],
  "svc-tftp": [{ label: "UDP scanner", section: "Builders", tool: "udp", anchor: "builder-udp" }],
  "svc-ftp": [{ label: "hydra", section: "Passwords", tool: "hydra", anchor: "builder-hydra" }],
  "svc-ssh": [{ label: "hydra", section: "Passwords", tool: "hydra", anchor: "builder-hydra" }, { label: "Loot", section: "Loot", anchor: "panel-loot" }],
  "svc-smb": [{ label: "nxc", section: "Active Directory", tool: "nxc", anchor: "builder-nxc" }, { label: "impacket", section: "Active Directory", tool: "impacket", anchor: "builder-impacket" }],
  "svc-http": [{ label: "wfuzz", section: "Web", tool: "wfuzz", anchor: "builder-wfuzz" }],
  "svc-smtp": [{ label: "hydra", section: "Passwords", tool: "hydra", anchor: "builder-hydra" }],
  "svc-ldap": [{ label: "nxc", section: "Active Directory", tool: "nxc", anchor: "builder-nxc" }, { label: "impacket", section: "Active Directory", tool: "impacket", anchor: "builder-impacket" }],
  "svc-mysql": [{ label: "hydra", section: "Passwords", tool: "hydra", anchor: "builder-hydra" }],
  "svc-mssql": [{ label: "impacket", section: "Active Directory", tool: "impacket", anchor: "builder-impacket" }, { label: "nxc", section: "Active Directory", tool: "nxc", anchor: "builder-nxc" }],
  "svc-rdp": [{ label: "hydra", section: "Passwords", tool: "hydra", anchor: "builder-hydra" }],
  "svc-winrm": [{ label: "evil-winrm", section: "Windows", anchor: "panel-winrm" }, { label: "nxc", section: "Active Directory", tool: "nxc", anchor: "builder-nxc" }],
  "svc-telnet": [{ label: "hydra", section: "Passwords", tool: "hydra", anchor: "builder-hydra" }],
  "svc-mail": [{ label: "hydra", section: "Passwords", tool: "hydra", anchor: "builder-hydra" }],
  "svc-vnc": [{ label: "hydra", section: "Passwords", tool: "hydra", anchor: "builder-hydra" }],
  "svc-postgres": [{ label: "hydra", section: "Passwords", tool: "hydra", anchor: "builder-hydra" }],
  "svc-krb": [{ label: "impacket", section: "Active Directory", tool: "impacket", anchor: "builder-impacket" }],
  "web-dirs": [{ label: "wfuzz", section: "Web", tool: "wfuzz", anchor: "builder-wfuzz" }],
  "web-finger": [{ label: "wfuzz", section: "Web", tool: "wfuzz", anchor: "builder-wfuzz" }],
  "web-cms": [{ label: "searchsploit", section: "Builders", tool: "search", anchor: "builder-search" }],
  "web-wp": [{ label: "searchsploit", section: "Builders", tool: "search", anchor: "builder-search" }],
  "web-tomcat": [{ label: "searchsploit", section: "Builders", tool: "search", anchor: "builder-search" }],
  "web-jenkins": [{ label: "searchsploit", section: "Builders", tool: "search", anchor: "builder-search" }],
  "sh-penelope": [{ label: "Penelope", section: "Shells", anchor: "panel-penelope" }],
  "sh-penelope-sheet": [{ label: "Penelope", section: "Shells", anchor: "panel-penelope" }],
  "sh-msfvenom": [{ label: "msfvenom", section: "Shells", tool: "msfvenom", anchor: "builder-msfvenom" }],
  "sh-which": [{ label: "msfvenom", section: "Shells", tool: "msfvenom", anchor: "builder-msfvenom" }],
  "sh-bash": [{ label: "msfvenom", section: "Shells", tool: "msfvenom", anchor: "builder-msfvenom" }],
  "sh-php": [{ label: "msfvenom", section: "Shells", tool: "msfvenom", anchor: "builder-msfvenom" }],
  "sh-ps": [{ label: "msfvenom", section: "Shells", tool: "msfvenom", anchor: "builder-msfvenom" }],
  "sh-xfer-lin": [{ label: "Uploads", section: "Uploads", anchor: "panel-uploads" }],
  "sh-xfer-win": [{ label: "Uploads", section: "Uploads", anchor: "panel-uploads" }],
  "lin-kernel": [{ label: "Kernel / sudo", section: "Linux", tool: "local", anchor: "builder-local" }],
  "lin-baron": [{ label: "Kernel / sudo", section: "Linux", tool: "local", anchor: "builder-local" }],
  "lin-dirtypipe": [{ label: "Kernel / sudo", section: "Linux", tool: "local", anchor: "builder-local" }],
  "lin-pkexec": [{ label: "searchsploit", section: "Builders", tool: "search", anchor: "builder-search" }],
  "lin-creds": [{ label: "Loot", section: "Loot", anchor: "panel-loot" }],
  "win-kernel": [{ label: "Kernel / sudo", section: "Windows", tool: "local", anchor: "builder-local" }],
  "win-creds": [{ label: "Loot", section: "Loot", anchor: "panel-loot" }],
  "win-sam": [{ label: "impacket", section: "Windows", tool: "impacket", anchor: "builder-impacket" }, { label: "Identify", section: "Passwords", tool: "identify", anchor: "builder-identify" }],
  "ad-enum": [{ label: "nxc", section: "Active Directory", tool: "nxc", anchor: "builder-nxc" }, { label: "BloodHound", section: "Builders", tool: "ad", anchor: "builder-ad" }],
  "ad-roast": [{ label: "impacket", section: "Active Directory", tool: "impacket", anchor: "builder-impacket" }, { label: "nxc", section: "Active Directory", tool: "nxc", anchor: "builder-nxc" }],
  "ad-pth": [{ label: "impacket", section: "Active Directory", tool: "impacket", anchor: "builder-impacket" }],
  "ad-dcsync": [{ label: "impacket", section: "Active Directory", tool: "impacket", anchor: "builder-impacket" }],
  "ad-nocreds": [{ label: "nxc", section: "Active Directory", tool: "nxc", anchor: "builder-nxc" }, { label: "Kerbrute", section: "Builders", tool: "ad", anchor: "builder-ad" }],
  "ad-bh": [{ label: "nxc", section: "Active Directory", tool: "nxc", anchor: "builder-nxc" }, { label: "BloodHound", section: "Builders", tool: "ad", anchor: "builder-ad" }],
  "ad-deleg": [{ label: "impacket", section: "Active Directory", tool: "impacket", anchor: "builder-impacket" }],
  "ad-laps": [{ label: "nxc", section: "Active Directory", tool: "nxc", anchor: "builder-nxc" }],
  "ad-gpp": [{ label: "nxc", section: "Active Directory", tool: "nxc", anchor: "builder-nxc" }],
  "ad-shares": [{ label: "nxc", section: "Active Directory", tool: "nxc", anchor: "builder-nxc" }],
  "ad-ptt": [{ label: "impacket", section: "Active Directory", tool: "impacket", anchor: "builder-impacket" }],
  "ad-adcs": [{ label: "nxc", section: "Active Directory", tool: "nxc", anchor: "builder-nxc" }, { label: "Certipy", section: "Builders", tool: "ad", anchor: "builder-ad" }],
  "ad-zerologon": [{ label: "nxc", section: "Active Directory", tool: "nxc", anchor: "builder-nxc" }],
  "pw-id": [{ label: "Identify", section: "Passwords", tool: "identify", anchor: "builder-identify" }],
  "pw-john": [{ label: "john", section: "Passwords", tool: "john", anchor: "builder-john" }],
  "pw-hashcat": [{ label: "hashcat", section: "Passwords", tool: "hashcat", anchor: "builder-hashcat" }],
  "pw-landed": [{ label: "Loot", section: "Loot", anchor: "panel-loot" }],
  "pw-linuxhash": [{ label: "john", section: "Passwords", tool: "john", anchor: "builder-john" }],
  "pw-sshkey": [{ label: "Loot", section: "Loot", anchor: "panel-loot" }],
  "pw-hydra": [{ label: "hydra", section: "Passwords", tool: "hydra", anchor: "builder-hydra" }, { label: "base64", section: "Passwords", tool: "basic", anchor: "builder-basic" }],
  "pw-hydra-form": [{ label: "hydra", section: "Passwords", tool: "hydra", anchor: "builder-hydra" }],
  "pw-spray": [{ label: "nxc", section: "Active Directory", tool: "nxc", anchor: "builder-nxc" }],
  "pw-reuse": [{ label: "hydra", section: "Passwords", tool: "hydra", anchor: "builder-hydra" }],
  "pv-when": [{ label: "Tunnel builder", section: "Tunneling", tool: "tunnel", anchor: "builder-tunnel" }],
  "tun-which": [{ label: "Tunnel builder", section: "Tunneling", tool: "tunnel", anchor: "builder-tunnel" }],
  "pv-ssh": [{ label: "Tunnel builder", section: "Tunneling", tool: "tunnel", anchor: "builder-tunnel" }],
  "pv-chisel": [{ label: "Tunnel builder", section: "Tunneling", tool: "tunnel", anchor: "builder-tunnel" }],
  "pv-ligolo": [{ label: "Tunnel builder", section: "Tunneling", tool: "tunnel", anchor: "builder-tunnel" }],
  "pv-proxy": [{ label: "Tunnel builder", section: "Tunneling", tool: "tunnel", anchor: "builder-tunnel" }],
  "pv-px-use": [{ label: "Tunnel builder", section: "Tunneling", tool: "tunnel", anchor: "builder-tunnel" }],
  "tun-ligolo-agent": [{ label: "Tunnel builder", section: "Tunneling", tool: "tunnel", anchor: "builder-tunnel" }],
  "tun-ligolo-back": [{ label: "Tunnel builder", section: "Tunneling", tool: "tunnel", anchor: "builder-tunnel" }],
  "tun-chisel-win": [{ label: "Tunnel builder", section: "Tunneling", tool: "tunnel", anchor: "builder-tunnel" }],
  "tun-ssh-r": [{ label: "Tunnel builder", section: "Tunneling", tool: "tunnel", anchor: "builder-tunnel" }],
  "tun-socat": [{ label: "Tunnel builder", section: "Tunneling", tool: "tunnel", anchor: "builder-tunnel" }],
  "pv-files": [{ label: "Uploads", section: "Uploads", anchor: "panel-uploads" }],
  "jwt-read": [{ label: "JWT reader", section: "API", anchor: "panel-jwt" }],
  "jwt-trust": [{ label: "JWT reader", section: "API", anchor: "panel-jwt" }],
  "jwt-hmac": [{ label: "JWT reader", section: "API", anchor: "panel-jwt" }],
  "jwt-rs": [{ label: "JWT reader", section: "API", anchor: "panel-jwt" }],
  "jwt-kid": [{ label: "JWT reader", section: "API", anchor: "panel-jwt" }],
  "rep-live": [{ label: "Report", section: "Report", anchor: "panel-report" }],
  "rep-map": [{ label: "Report", section: "Report", anchor: "panel-report" }],
  "rep-flags": [{ label: "Report", section: "Report", anchor: "panel-report" }],
};

function loadIds(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(key);
    const ids = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(ids);
  } catch {
    return new Set();
  }
}

function queryWords(value: string): string[] {
  return value.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

/** Every word must match. Another word narrows the list. */
function matchesAll(blob: string, value: string): boolean {
  const words = queryWords(value);
  if (words.length === 0) return false;
  const hay = blob.toLowerCase();
  return words.every((word) => hay.includes(word));
}

type SearchHit = {
  key: string;
  label: string;
  section: string;
  anchor: string;
  blob: string;
  tool?: ToolId;
  cardId?: string;
};

const PLACES: SearchHit[] = [
  { key: "uploads", label: "Uploads — file transfer", section: "Uploads", anchor: "panel-uploads", blob: "uploads transfer certutil wget tun0 file" },
  { key: "loot", label: "Loot", section: "Loot", anchor: "panel-loot", blob: "loot hash password nthash netntlm ssh key" },
  { key: "notes", label: "Notes", section: "Notes", anchor: "panel-notes", blob: "notes box write" },
  { key: "penelope", label: "Penelope listener", section: "Shells", anchor: "panel-penelope", blob: "penelope listener shell nc" },
  { key: "winrm", label: "Evil-WinRM", section: "Shells", anchor: "panel-winrm", blob: "evil-winrm winrm" },
  { key: "jwt", label: "JWT reader", section: "API", anchor: "panel-jwt", blob: "jwt bearer token api openapi swagger" },
  { key: "report", label: "Report", section: "Report", anchor: "panel-report", blob: "report write findings" },
  { key: "nmap-page", label: "Nmap reports", section: "Nmap", anchor: "panel-nmap", blob: "nmap scan report xml" },
  { key: "runs", label: "Runs", section: "Runs", anchor: "panel-runs", blob: "runs jobs terminal scan output" },
  { key: "msfvenom", label: "msfvenom builder", section: "Builders", anchor: "builder-msfvenom", tool: "msfvenom", blob: "msfvenom venom payload" },
  { key: "identify", label: "Hash identify", section: "Builders", anchor: "builder-identify", tool: "identify", blob: "hashid identify ntlm" },
  { key: "hashcat", label: "hashcat builder", section: "Builders", anchor: "builder-hashcat", tool: "hashcat", blob: "hashcat crack" },
  { key: "john", label: "john builder", section: "Builders", anchor: "builder-john", tool: "john", blob: "john ssh2john zip2john unshadow" },
  { key: "hydra", label: "hydra builder", section: "Builders", anchor: "builder-hydra", tool: "hydra", blob: "hydra password spray" },
  { key: "nxc", label: "NetExec builder", section: "Builders", anchor: "builder-nxc", tool: "nxc", blob: "nxc netexec smb" },
  { key: "local", label: "Kernel and sudo suggester", section: "Builders", anchor: "builder-local", tool: "local", blob: "kernel sudo suggester linpeas privesc" },
  { key: "udp", label: "UDP protocol scanner", section: "Builders", anchor: "builder-udp", tool: "udp", blob: "udp tftp snmp proto scanner" },
  { key: "nmap", label: "nmap builder", section: "Builders", anchor: "builder-nmap", tool: "nmap", blob: "nmap scan" },
  { key: "search", label: "searchsploit builder", section: "Builders", anchor: "builder-search", tool: "search", blob: "searchsploit exploit-db exploitdb" },
  { key: "snmp", label: "SNMP builder", section: "Builders", anchor: "builder-snmp", tool: "snmp", blob: "snmp onesixtyone snmpwalk" },
  { key: "tunnel", label: "Tunnel builder", section: "Builders", anchor: "builder-tunnel", tool: "tunnel", blob: "chisel ligolo tunnel pivot socks" },
  { key: "wfuzz", label: "wfuzz builder", section: "Builders", anchor: "builder-wfuzz", tool: "wfuzz", blob: "wfuzz fuzz vhost" },
  { key: "impacket", label: "Impacket builder", section: "Builders", anchor: "builder-impacket", tool: "impacket", blob: "impacket secretsdump psexec smb wmiexec" },
  { key: "ad", label: "BloodHound, Certipy, Kerbrute", section: "Builders", anchor: "builder-ad", tool: "ad", blob: "bloodhound certipy kerbrute adcs shadow spray userenum" },
  { key: "basic", label: "Base64 user and password", section: "Passwords", anchor: "builder-basic", tool: "basic", blob: "base64 basic auth delimiter burp username password" },
];

function hitScore(label: string, value: string): number {
  const words = queryWords(value);
  const title = label.toLowerCase();
  let score = 0;
  for (const word of words) {
    if (title.startsWith(word)) score += 5;
    else if (title.includes(word)) score += 3;
    else score += 1;
  }
  return score;
}

export function MethodDesk() {
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [section, setSection] = useState<string>("Exam");
  const [lootFocus, setLootFocus] = useState("");
  const [openOnly, setOpenOnly] = useState(false);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [unsure, setUnsure] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [openSource, setOpenSource] = useState<string | null>(null);
  const [openCard, setOpenCard] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [builderTab, setBuilderTab] = useState<ToolId | null>(null);
  const [jump, setJump] = useState<{ anchor: string; n: number } | null>(null);
  const runs = useSyncExternalStore(subscribeJobs, getJobs, getJobsServer);

  useEffect(() => {
    void syncJobs();
  }, []);

  useEffect(() => {
    setDone(loadIds(STORE));
    setUnsure(loadIds(UNSURE_STORE));
    setReady(true);
  }, []);

  useEffect(() => {
    const card = new URLSearchParams(window.location.search).get("card");
    if (!card) return;
    const item = TECHNIQUES.find((technique) => technique.id === card);
    if (!item) return;
    setQuery("");
    setOpenOnly(false);
    setSection(item.section);
    setOpenCard(item.id);
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
    for (const s of SECTIONS) map.set(s, 0);
    for (const t of TECHNIQUES) map.set(t.section, (map.get(t.section) ?? 0) + 1);
    return map;
  }, []);

  const visibleScripts = useMemo(() => {
    return LAB_SCRIPTS.filter((s) => {
      if (openOnly && done.has(s.id)) return false;
      return section === "Scripts";
    });
  }, [section, openOnly, done]);

  const visible = useMemo(() => {
    return TECHNIQUES.filter((t) => {
      if (section === "Scripts" || section === "Builders" || section === "Uploads" || section === "Notes" || section === "Nmap" || section === "Runs") return false;
      if (section !== "All" && t.section !== section) return false;
      if (openOnly && done.has(t.id)) return false;
      return true;
    });
  }, [section, openOnly, done]);

  function toggle(id: string) {
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setUnsure((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function toggleUnsure(id: string) {
    setUnsure((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setDone((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
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

  function jumpTo(link: DeskLink) {
    setQuery("");
    setOpenOnly(false);
    setSection(link.section);
    if (link.tool) setBuilderTab(link.tool);
    setJump({ anchor: link.anchor, n: Date.now() });
  }

  useEffect(() => {
    if (!jump) return;
    let tries = 0;
    let timer = 0;
    const go = () => {
      const node = document.getElementById(jump.anchor);
      if (!node && tries < 20) {
        tries += 1;
        timer = window.setTimeout(go, 40);
        return;
      }
      if (!node) return;
      node.scrollIntoView({ behavior: "smooth", block: "start" });
      node.classList.add("ring-2", "ring-primary");
      window.setTimeout(() => node.classList.remove("ring-2", "ring-primary"), 1600);
    };
    timer = window.setTimeout(go, 0);
    return () => window.clearTimeout(timer);
  }, [jump]);

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

  const showTransfer = section === "Uploads" || section === "Shells";
  const showWinrm = section === "Windows" || section === "Shells";
  const showPenelope = section === "Shells";
  const showLoot = section === "Loot";
  const lootCount = useSyncExternalStore(subscribeLoot, getLoot, getLootServer).length;
  const builderTools = useMemo(() => {
    const tools: ToolId[] = [];
    const want = (id: ToolId, onSection: boolean) => {
      if (section === "Builders" || onSection) tools.push(id);
    };
    want("msfvenom", section === "Shells");
    want("identify", section === "Passwords");
    want("hashcat", section === "Passwords");
    want("john", section === "Passwords");
    want("hydra", section === "Passwords");
    want("basic", section === "Passwords");
    want("nxc", section === "Active Directory");
    want("local", section === "Linux" || section === "Windows");
    want("udp", false);
    want("nmap", section === "Nmap");
    want("snmp", false);
    want("search", false);
    want("tunnel", section === "Tunneling");
    want("wfuzz", section === "Web");
    want("impacket", section === "Active Directory" || section === "Windows" || section === "Passwords");
    want("ad", section === "Active Directory");
    return tools;
  }, [section]);

  const hits = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    const found: SearchHit[] = [];
    for (const place of PLACES) {
      if (matchesAll(`${place.label} ${place.blob}`, q)) found.push(place);
    }
    for (const item of TECHNIQUES) {
      const blob = `${item.section} ${item.title} ${item.look} ${item.cmd}`;
      if (!matchesAll(blob, q)) continue;
      found.push({ key: `card-${item.id}`, label: item.title, section: item.section, anchor: `card-${item.id}`, blob, cardId: item.id });
    }
    for (const item of LAB_SCRIPTS) {
      const blob = `${item.title} ${item.file} ${item.look}`;
      if (!matchesAll(blob, q)) continue;
      found.push({ key: `script-${item.id}`, label: item.title, section: "Scripts", anchor: `script-${item.id}`, blob, cardId: item.id });
    }
    found.sort((a, b) => hitScore(b.label, q) - hitScore(a.label, q));
    return found;
  }, [query]);

  function openSearch(hit: SearchHit) {
    setQuery("");
    setSearchOpen(false);
    setOpenOnly(false);
    setSection(hit.section);
    if (hit.tool) setBuilderTab(hit.tool);
    if (hit.cardId) setOpenCard(hit.cardId);
    setJump({ anchor: hit.anchor, n: Date.now() });
  }
  const total = TECHNIQUES.length + LAB_SCRIPTS.length;
  const marked = [...TECHNIQUES, ...LAB_SCRIPTS].filter((t) => done.has(t.id)).length;
  const unsureCount = [...TECHNIQUES, ...LAB_SCRIPTS].filter((t) => unsure.has(t.id)).length;

  return (
    <div className="relative min-h-screen text-fg">
      <MatrixRain />
      <div className="relative z-10">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 bg-bg px-4 py-5 sm:px-6">
          <CoverImage />
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-xs tracking-widest text-primary">FIELD NOTES</p>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">OSCP methodology</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted">
                Each check is a description, then an example of a result that means pursue, and an example that means stop and move on. Click a title to open that card, and click it again to close it. Mark ticks it done. Unsure means you think it is done and you will check it later. Reset desk clears both ticks and the runs. Notes, loot, and the report stay until you delete those yourself.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-sm text-muted">
                {marked}/{total} checked{unsureCount ? ` · ${unsureCount} unsure` : ""}
              </p>
              <RainColor />
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
                  placeholder="Search: smb, uploads, hydra, nxc"
                  className="w-full min-w-0 bg-transparent text-sm text-fg outline-none placeholder:text-muted"
                  role="combobox"
                  aria-expanded={searchOpen && hits.length > 0}
                  aria-autocomplete="list"
                />
                {query.trim() ? <span className="shrink-0 font-mono text-xs text-primary">{hits.length}</span> : null}
              </label>
              {searchOpen && query.trim() ? (
                <div
                  className="absolute left-0 right-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded-lg border border-border bg-surface shadow-lg"
                  onMouseDown={(event) => event.preventDefault()}
                >
                  {hits.length === 0 ? (
                    <p className="px-3 py-3 text-sm text-muted">Nothing matches. Add a different word.</p>
                  ) : (
                    <>
                      <p className="border-b border-border px-3 py-2 font-mono text-xs text-muted">
                        {hits.length} {hits.length === 1 ? "match" : "matches"}. Keep typing to narrow, then click.
                      </p>
                      {hits.slice(0, 12).map((hit) => (
                        <button
                          key={hit.key}
                          type="button"
                          onClick={() => openSearch(hit)}
                          className="flex w-full min-w-0 items-baseline gap-3 border-b border-border px-3 py-2 text-left last:border-b-0 hover:bg-raised"
                        >
                          <span className="min-w-0 flex-1 text-sm text-fg">{hit.label}</span>
                          <span className="shrink-0 font-mono text-xs text-primary">{hit.section}</span>
                        </button>
                      ))}
                      {hits.length > 12 ? <p className="px-3 py-2 text-xs text-muted">Add another word. {hits.length - 12} more are hidden.</p> : null}
                    </>
                  )}
                </div>
              ) : null}
            </div>
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
          <GlobalConfig />
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
            count={14}
            active={section === "Builders"}
            onClick={() => setSection("Builders")}
          />
        </nav>

        <main id="desk-results" className="flex min-w-0 scroll-mt-4 flex-col gap-4">
          {showTransfer ? <UploadsPanel /> : null}
          {showLoot ? <LootCard focusId={lootFocus} /> : null}
          {showPenelope ? <PenelopeCard /> : null}
          {showWinrm ? <WinrmCard /> : null}
          {section === "Notes" ? <NotesPanel onOpenLoot={(id) => { setLootFocus(id); setSection("Loot"); }} /> : null}
          {section === "Runs" ? (
            <article id="panel-runs" className="min-w-0 overflow-hidden rounded-lg border border-primary bg-surface">
              <div className="border-b border-border px-4 py-3">
                <p className="font-mono text-xs text-primary">Runs</p>
                <h2 className="text-lg font-semibold">Scans and tools</h2>
                <p className="mt-1 text-sm text-muted">
                  Nmap, the UDP scanner, searchsploit, the kernel and sudo suggester, hydra, wfuzz, hashcat, john, impacket, and the install. Leaving a page does not stop one, and a finished run stays after you restart the desk.
                  Kill ends that process and keeps the output. Remove drops that one, and for nmap it also deletes the saved files. Reset desk is the only way to clear every run. It does not touch notes, loot, or the report.
                </p>
              </div>
              <div className="px-4 py-4">
                <JobList empty="Nothing here yet. A finished run stays until you remove that one, or press Reset desk." />
              </div>
            </article>
          ) : null}
          {builderTools.length > 0 ? <Builders key={builderTools.join(",")} tools={builderTools} tab={builderTab} onTab={setBuilderTab} /> : null}
          {section === "Nmap" ? (
            <NmapReports
              onOpenCard={(id, next) => {
                setQuery("");
                setOpenOnly(false);
                setSection(next);
                setOpenCard(id);
              }}
            />
          ) : null}
          {section === "API" ? <JwtCheck /> : null}
          {section === "Report" ? <ReportWriter /> : null}
          {visibleScripts.map((s) => (
            <ScriptCard
              key={s.id}
              item={s}
              open={openCard === s.id}
              checked={done.has(s.id)}
              unsure={unsure.has(s.id)}
              copied={copied === s.id}
              sourceOpen={openSource === s.id}
              onOpen={() => setOpenCard((id) => (id === s.id ? null : s.id))}
              onToggle={() => toggle(s.id)}
              onUnsure={() => toggleUnsure(s.id)}
              onCopy={() => copy(s.id, s.source)}
              onDownload={() => download(s.file, s.source)}
              onToggleSource={() => setOpenSource((id) => (id === s.id ? null : s.id))}
            />
          ))}
          {section !== "Scripts" &&
            visible.map((t) => (
              <Card
                key={t.id}
                item={t}
                open={openCard === t.id}
                checked={done.has(t.id)}
                unsure={unsure.has(t.id)}
                copied={copied === t.id}
                onOpen={() => setOpenCard((id) => (id === t.id ? null : t.id))}
                onToggle={() => toggle(t.id)}
                onUnsure={() => toggleUnsure(t.id)}
                onCopy={() => copy(t.id, t.cmd)}
                links={CARD_LINKS[t.id] ?? []}
                onJump={jumpTo}
              />
            ))}
        </main>
      </div>
      </div>
    </div>
  );
}

function ScriptCard({
  item,
  open,
  checked,
  unsure,
  copied,
  sourceOpen,
  onOpen,
  onToggle,
  onUnsure,
  onCopy,
  onDownload,
  onToggleSource,
}: {
  item: LabScript;
  open: boolean;
  checked: boolean;
  unsure: boolean;
  copied: boolean;
  sourceOpen: boolean;
  onOpen: () => void;
  onToggle: () => void;
  onUnsure: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onToggleSource: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (open) ref.current?.scrollIntoView({ block: "nearest" });
  }, [open]);
  return (
    <article id={`script-${item.id}`} ref={ref} className={"min-w-0 scroll-mt-4 overflow-hidden rounded-lg border bg-surface " + (unsure ? "border-[#8a5a20]" : "border-border")}>
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
        <div className="flex shrink-0 items-center gap-1 pr-3">
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
          <button
            type="button"
            onClick={onUnsure}
            aria-pressed={unsure}
            className={
              "inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm " +
              (unsure
                ? "border-[#8a5a20] bg-[#3a2a14] text-[#e0a15a]"
                : "border-border bg-bg text-muted")
            }
          >
            <CircleHelp className="size-4" aria-hidden="true" />
            {unsure ? "Check later" : "Unsure"}
          </button>
        </div>
      </div>
      {open ? (
      <div className="flex flex-col gap-4 border-t border-border px-4 py-4">
        <Block label="What this check is" body={item.look} />
        <div>
          <p className="font-mono text-xs tracking-wide text-muted">RUN</p>
          <pre className="mt-2 max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-bg p-3 font-mono text-xs leading-relaxed text-fg">
            {item.run}
          </pre>
          <WhyBlock id={item.id} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="min-w-0 rounded-lg bg-alive-bg p-3">
            <p className="font-mono text-xs text-alive">PURSUE</p>
            <p className="mt-1 text-sm text-muted">You saw something like this. Stay on it.</p>
            <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-fg">
              {item.alive}
            </pre>
          </div>
          <div className="min-w-0 rounded-lg bg-dead-bg p-3">
            <p className="font-mono text-xs text-dead">STOP</p>
            <p className="mt-1 text-sm text-muted">You saw something like this. Tick it and move on.</p>
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
  unsure,
  copied,
  onOpen,
  onToggle,
  onUnsure,
  onCopy,
  links,
  onJump,
}: {
  item: Technique;
  open: boolean;
  checked: boolean;
  unsure: boolean;
  copied: boolean;
  onOpen: () => void;
  onToggle: () => void;
  onUnsure: () => void;
  onCopy: () => void;
  links: DeskLink[];
  onJump: (link: DeskLink) => void;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (open) ref.current?.scrollIntoView({ block: "nearest" });
  }, [open]);
  return (
    <article id={`card-${item.id}`} ref={ref} className={"min-w-0 scroll-mt-4 overflow-hidden rounded-lg border bg-surface " + (unsure ? "border-[#8a5a20]" : "border-border")}>
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
        <div className="flex shrink-0 flex-col items-end justify-center gap-2 py-2 pr-3">
          {links.map((link) => (
            <button
              key={link.anchor + link.label}
              type="button"
              onClick={() => onJump(link)}
              className="inline-flex min-h-8 items-center font-mono text-xs text-primary underline decoration-primary/40 underline-offset-2"
            >
              {link.label}
            </button>
          ))}
          <div className="flex items-center gap-1">
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
            <button
              type="button"
              onClick={onUnsure}
              aria-pressed={unsure}
              className={
                "inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm " +
                (unsure
                  ? "border-[#8a5a20] bg-[#3a2a14] text-[#e0a15a]"
                  : "border-border bg-bg text-muted")
              }
            >
              <CircleHelp className="size-4" aria-hidden="true" />
              {unsure ? "Check later" : "Unsure"}
            </button>
          </div>
        </div>
      </div>

      {open ? (
      <div className="flex flex-col gap-4 border-t border-border px-4 py-4">
        <Block label="What this check is" body={item.look} />
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
            <p className="font-mono text-xs text-alive">PURSUE</p>
            <p className="mt-1 text-sm text-muted">You saw something like this. Stay on it.</p>
            <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-fg">
              {item.alive}
            </pre>
          </div>
          <div className="min-w-0 rounded-lg bg-dead-bg p-3">
            <p className="font-mono text-xs text-dead">STOP</p>
            <p className="mt-1 text-sm text-muted">You saw something like this. Tick it and move on.</p>
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

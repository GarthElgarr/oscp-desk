import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { Copy } from "lucide-react";
import { AD_HOUR_STEPS, adHourCommand } from "@/lib/ad-hour";
import { bofSteps } from "@/lib/bof-plan";
import { CLIENT_NOTES, clientCommand } from "@/lib/client-side";
import { dirsearchPlan, type DirMode, type DirTool } from "@/lib/dirsearch-plan";
import { getExam, getExamServer, subscribeExam } from "@/lib/exam-lock";
import { bannedCommand } from "@/lib/exam-rules";
import { FFUF_LISTS, ffufPlan, type FfufMode } from "@/lib/ffuf-plan";
import { getGlobals, getGlobalsServer, subscribeGlobals } from "@/lib/desk-globals";
import { smbEnumPlan, type SmbAuth, type SmbTool } from "@/lib/smb-enum-plan";
import { sqliPlan, type SqliStep } from "@/lib/sqli-plan";
import { useGlobalField } from "@/lib/use-global-field";

const control = "min-h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg outline-none";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-sm">
      <span className="font-mono text-xs tracking-wide text-muted">{label}</span>
      {children}
    </label>
  );
}

function Shell({ title, blurb, command, why, error }: { title: string; blurb: string; command: string; why: string; error: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-primary bg-surface">
      <div className="border-b border-border px-4 py-3">
        <p className="font-mono text-xs text-primary">Builder</p>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted">{blurb}</p>
      </div>
      <div className="flex flex-col gap-3 px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-xs tracking-wide text-muted">COMMAND</p>
          <button
            type="button"
            disabled={!command}
            onClick={() => {
              void navigator.clipboard.writeText(command).then(() => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1200);
              }).catch(() => setCopied(false));
            }}
            className="inline-flex min-h-11 items-center gap-1 text-xs text-muted disabled:opacity-40"
          >
            <Copy className="size-3.5" aria-hidden="true" />
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="whitespace-pre-wrap break-all rounded-lg bg-bg p-3 font-mono text-xs leading-relaxed text-fg">{command || error}</pre>
        {command ? <p className="text-sm text-fg">{why}</p> : null}
      </div>
    </article>
  );
}

export function FfufBuilder() {
  const globals = useSyncExternalStore(subscribeGlobals, getGlobals, getGlobalsServer);
  const exam = useSyncExternalStore(subscribeExam, getExam, getExamServer);
  const [target, setTarget] = useGlobalField(globals.target);
  const [mode, setMode] = useState<FfufMode>("dir");
  const [port, setPort] = useState("80");
  const [list, setList] = useState<string>(FFUF_LISTS.dirs);
  const [ext, setExt] = useState("php,html,txt");
  const [vhost, setVhost] = useState("exam.local");
  const [fc, setFc] = useState("404");
  const [fs, setFs] = useState("");
  const [fw, setFw] = useState("");
  const [threads, setThreads] = useState("40");
  const [rate, setRate] = useState("80");
  const [https, setHttps] = useState(false);
  const plan = ffufPlan({ mode, target, port, https, wordlist: list, extensions: ext, vhost, filters: { fc, fs, fw }, threads, rate, examOn: exam.on });
  return (
    <div id="builder-ffuf" className="scroll-mt-4 flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="MODE"><select className={control} value={mode} onChange={(e) => setMode(e.target.value as FfufMode)}><option value="dir">directory</option><option value="ext">extensions</option><option value="vhost">vhost</option><option value="param">parameter</option></select></Field>
        <Field label="TARGET"><input className={control} value={target} onChange={(e) => setTarget(e.target.value)} spellCheck={false} /></Field>
        <Field label="PORT"><input className={control} value={port} onChange={(e) => setPort(e.target.value)} spellCheck={false} /></Field>
        <Field label="HTTPS"><input className="mt-3 size-4" type="checkbox" checked={https} onChange={(e) => setHttps(e.target.checked)} /></Field>
        <Field label="WORDLIST"><select className={control} value={list} onChange={(e) => setList(e.target.value)}>{Object.entries(FFUF_LISTS).map(([id, path]) => <option key={id} value={path}>{id}</option>)}</select></Field>
        <Field label="THREADS, MAX 40"><input className={control} value={threads} onChange={(e) => setThreads(e.target.value)} /></Field>
        <Field label="RATE, MAX 150"><input className={control} value={rate} onChange={(e) => setRate(e.target.value)} /></Field>
        <Field label="-fc"><input className={control} value={fc} onChange={(e) => setFc(e.target.value)} placeholder="404" /></Field>
        <Field label="-fs"><input className={control} value={fs} onChange={(e) => setFs(e.target.value)} placeholder="size to hide" /></Field>
        <Field label="-fw"><input className={control} value={fw} onChange={(e) => setFw(e.target.value)} /></Field>
        {mode === "ext" ? <Field label="EXTENSIONS"><input className={control} value={ext} onChange={(e) => setExt(e.target.value)} /></Field> : null}
        {mode === "vhost" ? <Field label="DOMAIN"><input className={control} value={vhost} onChange={(e) => setVhost(e.target.value)} /></Field> : null}
      </div>
      <Shell title="ffuf" blurb="One fuzz position. Directory, extension, vhost, or a parameter name. Threads and rate are capped." command={"command" in plan ? plan.command : ""} why={"command" in plan ? plan.why : ""} error={"error" in plan ? plan.error : ""} />
    </div>
  );
}

export function DirBuilder() {
  const globals = useSyncExternalStore(subscribeGlobals, getGlobals, getGlobalsServer);
  const exam = useSyncExternalStore(subscribeExam, getExam, getExamServer);
  const [tool, setTool] = useState<DirTool>("feroxbuster");
  const [mode, setMode] = useState<DirMode>("dir");
  const [target, setTarget] = useGlobalField(globals.target);
  const [port, setPort] = useState("80");
  const [list, setList] = useState<string>(FFUF_LISTS.dirs);
  const [ext, setExt] = useState("php,html,txt,bak,old");
  const [status, setStatus] = useState("200,204,301,302,307,401");
  const [threads, setThreads] = useState("40");
  const [outfile, setOutfile] = useState("");
  const [https, setHttps] = useState(false);
  const plan = dirsearchPlan({ tool, mode, target, port, https, wordlist: list, extensions: ext, status, threads, outfile, examOn: exam.on });
  return (
    <div id="builder-dirs" className="scroll-mt-4 flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="TOOL"><select className={control} value={tool} onChange={(e) => setTool(e.target.value as DirTool)}><option value="feroxbuster">feroxbuster</option><option value="gobuster">gobuster</option></select></Field>
        <Field label="MODE"><select className={control} value={mode} onChange={(e) => setMode(e.target.value as DirMode)}><option value="dir">dir</option><option value="vhost">vhost</option></select></Field>
        <Field label="TARGET"><input className={control} value={target} onChange={(e) => setTarget(e.target.value)} spellCheck={false} /></Field>
        <Field label="PORT"><input className={control} value={port} onChange={(e) => setPort(e.target.value)} /></Field>
        <Field label="HTTPS"><input className="mt-3 size-4" type="checkbox" checked={https} onChange={(e) => setHttps(e.target.checked)} /></Field>
        <Field label="WORDLIST"><select className={control} value={list} onChange={(e) => setList(e.target.value)}>{Object.entries(FFUF_LISTS).map(([id, path]) => <option key={id} value={path}>{id}</option>)}</select></Field>
        <Field label="THREADS"><input className={control} value={threads} onChange={(e) => setThreads(e.target.value)} /></Field>
        <Field label="STATUS CODES"><input className={control} value={status} onChange={(e) => setStatus(e.target.value)} /></Field>
        <Field label="EXTENSIONS"><input className={control} value={ext} onChange={(e) => setExt(e.target.value)} /></Field>
        <Field label="OUTPUT NAME"><input className={control} value={outfile} onChange={(e) => setOutfile(e.target.value)} placeholder="ferox.txt" /></Field>
      </div>
      <Shell title="gobuster / feroxbuster" blurb="Directory or vhost. The ferox default is the medium directory list, extensions, and status filters. Output stays under scans/." command={"command" in plan ? plan.command : ""} why={"command" in plan ? plan.why : ""} error={"error" in plan ? plan.error : ""} />
    </div>
  );
}

export function SmbBuilder() {
  const globals = useSyncExternalStore(subscribeGlobals, getGlobals, getGlobalsServer);
  const exam = useSyncExternalStore(subscribeExam, getExam, getExamServer);
  const [tool, setTool] = useState<SmbTool>("enum4linux-ng");
  const [auth, setAuth] = useState<SmbAuth>("null");
  const [target, setTarget] = useGlobalField(globals.target);
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [share, setShare] = useState("");
  const plan = smbEnumPlan({ tool, auth, target, user, password, share, examOn: exam.on });
  return (
    <div id="builder-smb" className="scroll-mt-4 flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="TOOL"><select className={control} value={tool} onChange={(e) => setTool(e.target.value as SmbTool)}><option value="enum4linux-ng">enum4linux-ng</option><option value="smbclient">smbclient</option><option value="smbmap">smbmap</option><option value="rpcclient">rpcclient</option></select></Field>
        <Field label="AUTH"><select className={control} value={auth} onChange={(e) => setAuth(e.target.value as SmbAuth)}><option value="null">null</option><option value="guest">guest</option><option value="creds">credentials</option></select></Field>
        <Field label="TARGET"><input className={control} value={target} onChange={(e) => setTarget(e.target.value)} spellCheck={false} /></Field>
        <Field label="SHARE"><input className={control} value={share} onChange={(e) => setShare(e.target.value)} placeholder="optional" /></Field>
        {auth === "creds" ? <Field label="USER"><input className={control} value={user} onChange={(e) => setUser(e.target.value)} /></Field> : null}
        {auth === "creds" ? <Field label="PASSWORD"><input className={control} value={password} onChange={(e) => setPassword(e.target.value)} /></Field> : null}
      </div>
      <Shell title="SMB enumeration" blurb="Null, guest, or an account you already have. enum4linux-ng, smbclient, smbmap, and rpcclient." command={"command" in plan ? plan.command : ""} why={"command" in plan ? plan.why : ""} error={"error" in plan ? plan.error : ""} />
    </div>
  );
}

export function BofBuilder() {
  const globals = useSyncExternalStore(subscribeGlobals, getGlobals, getGlobalsServer);
  const [lhost, setLhost] = useGlobalField(globals.localIp);
  const [lport, setLport] = useState("443");
  const [offset, setOffset] = useState("0");
  const plan = bofSteps(lhost, lport, offset);
  return (
    <div id="builder-bof" className="scroll-mt-4 flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="LHOST"><input className={control} value={lhost} onChange={(e) => setLhost(e.target.value)} spellCheck={false} /></Field>
        <Field label="LPORT"><input className={control} value={lport} onChange={(e) => setLport(e.target.value)} /></Field>
        <Field label="OFFSET"><input className={control} value={offset} onChange={(e) => setOffset(e.target.value)} placeholder="from pattern_offset" /></Field>
      </div>
      {"error" in plan ? <p className="text-sm text-dead">{plan.error}</p> : plan.steps.map((step) => (
        <Shell key={step.id} title={step.title} blurb={`${step.look} Alive: ${step.alive} Dead: ${step.dead}`} command={step.command} why="Immunity Debugger with mona. !mona modules, then !mona jmp -r esp. The desk does not send this." error="" />
      ))}
    </div>
  );
}

export function SqliBuilder() {
  const globals = useSyncExternalStore(subscribeGlobals, getGlobals, getGlobalsServer);
  const exam = useSyncExternalStore(subscribeExam, getExam, getExamServer);
  const [step, setStep] = useState<SqliStep>("columns");
  const [target, setTarget] = useGlobalField(globals.target);
  const [port, setPort] = useState("80");
  const [path, setPath] = useState("/page.php");
  const [param, setParam] = useState("id");
  const [columns, setColumns] = useState("2");
  const [injectable, setInjectable] = useState("1");
  const [table, setTable] = useState("users");
  const plan = sqliPlan({ step, target, port, path, param, columns, injectable, table, examOn: exam.on });
  return (
    <div id="builder-sqli" className="scroll-mt-4 flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="STEP"><select className={control} value={step} onChange={(e) => setStep(e.target.value as SqliStep)}><option value="error">error</option><option value="columns">column count</option><option value="union">union</option><option value="schema">schema</option><option value="tables">tables</option><option value="names">column names</option><option value="dump">dump</option><option value="xp">xp_cmdshell</option><option value="sqlmap">sqlmap, lab only</option></select></Field>
        <Field label="COLUMNS"><input className={control} value={columns} onChange={(e) => setColumns(e.target.value)} /></Field>
        <Field label="INJECTABLE COLUMN"><input className={control} value={injectable} onChange={(e) => setInjectable(e.target.value)} /></Field>
        <Field label="TABLE"><input className={control} value={table} onChange={(e) => setTable(e.target.value)} /></Field>
        <Field label="TARGET"><input className={control} value={target} onChange={(e) => setTarget(e.target.value)} spellCheck={false} /></Field>
        <Field label="PORT"><input className={control} value={port} onChange={(e) => setPort(e.target.value)} /></Field>
        <Field label="PATH"><input className={control} value={path} onChange={(e) => setPath(e.target.value)} /></Field>
        <Field label="PARAMETER"><input className={control} value={param} onChange={(e) => setParam(e.target.value)} /></Field>
      </div>
      <Shell title="Manual SQL injection" blurb="One step at a time. sqlmap is lab only and stays blocked while exam lock is on. xp_cmdshell is the MSSQL enable sequence, typed, not fired from here." command={"command" in plan ? plan.command : ""} why={"command" in plan ? plan.why : ""} error={"error" in plan ? plan.error : ""} />
    </div>
  );
}

export function AdHourBuilder() {
  const globals = useSyncExternalStore(subscribeGlobals, getGlobals, getGlobalsServer);
  const exam = useSyncExternalStore(subscribeExam, getExam, getExamServer);
  const [subnet, setSubnet] = useGlobalField(globals.target);
  const [dc, setDc] = useState("");
  const [user, setUser] = useState("");
  const [domain, setDomain] = useState("");
  const [password, setPassword] = useState("");
  const [hash, setHash] = useState("");
  const [share, setShare] = useState("");
  const [hosts, setHosts] = useState("");
  const [done, setDone] = useState<string[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("oscp-desk-ad-hour-v1");
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      if (Array.isArray(parsed)) setDone(parsed.filter((item) => typeof item === "string"));
    } catch {
      setDone([]);
    }
  }, []);
  function toggle(key: string) {
    setDone((current) => {
      const next = current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
      localStorage.setItem("oscp-desk-ad-hour-v1", JSON.stringify(next));
      return next;
    });
  }
  const rows = hosts.split(/[\s,]+/).map((item) => item.trim()).filter(Boolean).slice(0, 16);
  const buckets = rows.length > 0 ? rows : [subnet.trim() || "set"];
  return (
    <div id="builder-adhour" className="scroll-mt-4 flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="SUBNET OR HOST"><input className={control} value={subnet} onChange={(e) => setSubnet(e.target.value)} placeholder="10.10.10.0/24" spellCheck={false} /></Field>
        <Field label="DC"><input className={control} value={dc} onChange={(e) => setDc(e.target.value)} spellCheck={false} /></Field>
        <Field label="USER"><input className={control} value={user} onChange={(e) => setUser(e.target.value)} /></Field>
        <Field label="DOMAIN"><input className={control} value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="exam.local" /></Field>
        <Field label="PASSWORD"><input className={control} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <Field label="NT HASH, OPTIONAL"><input className={control} value={hash} onChange={(e) => setHash(e.target.value)} spellCheck={false} /></Field>
        <Field label="SHARE TO SPIDER"><input className={control} value={share} onChange={(e) => setShare(e.target.value)} placeholder="Scripts" /></Field>
        <Field label="HOSTS TO TICK"><input className={control} value={hosts} onChange={(e) => setHosts(e.target.value)} placeholder="10.10.10.10 10.10.10.11" spellCheck={false} /></Field>
      </div>
      {AD_HOUR_STEPS.map((step) => {
        const plan = adHourCommand(step.id, { subnet, dc, user, domain, password, hash, share, examOn: exam.on });
        return (
          <div key={step.id} className="rounded-lg border border-border bg-bg px-3 py-3">
            <p className="font-semibold">{step.title}</p>
            <pre className="mt-2 whitespace-pre-wrap break-all font-mono text-xs text-fg">{"command" in plan ? plan.command : plan.error}</pre>
            {"command" in plan ? <p className="mt-1 text-sm text-muted">{plan.why}</p> : null}
          </div>
        );
      })}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[40rem] text-left text-xs">
          <thead>
            <tr className="border-b border-border text-muted">
              <th className="px-2 py-2 font-mono">HOST</th>
              {AD_HOUR_STEPS.map((step) => (
                <th key={step.id} className="px-2 py-2 font-mono">{step.title}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {buckets.map((host) => (
              <tr key={host} className="border-b border-border">
                <td className="px-2 py-2 font-mono">{host}</td>
                {AD_HOUR_STEPS.map((step) => {
                  const key = `${host}:${step.id}`;
                  return (
                    <td key={key} className="px-2 py-2">
                      <input type="checkbox" checked={done.includes(key)} onChange={() => toggle(key)} aria-label={`${host} ${step.title}`} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ClientSideBuilder() {
  const globals = useSyncExternalStore(subscribeGlobals, getGlobals, getGlobalsServer);
  const exam = useSyncExternalStore(subscribeExam, getExam, getExamServer);
  const [target, setTarget] = useGlobalField(globals.target);
  const [localIp, setLocalIp] = useGlobalField(globals.localIp);
  return (
    <div id="builder-client" className="scroll-mt-4 flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="TARGET"><input className={control} value={target} onChange={(e) => setTarget(e.target.value)} spellCheck={false} /></Field>
        <Field label="TUN0"><input className={control} value={localIp} onChange={(e) => setLocalIp(e.target.value)} spellCheck={false} /></Field>
      </div>
      {CLIENT_NOTES.map((note) => {
        const built = clientCommand(note, target, localIp);
        const command = "command" in built ? built.command : "";
        const banned = command ? bannedCommand(command, exam.on) : null;
        return (
          <Shell
            key={note.id}
            title={`${note.title}${note.labOnly ? " — lab only" : " — exam ok"}`}
            blurb={`${note.look} Alive: ${note.alive} Dead: ${note.dead}`}
            command={banned ? "" : command}
            why={note.labOnly ? "Lab only. Phishing a person is not an exam step." : "This is a bug in the target application. You are not sending it to a person."}
            error={banned ?? ("error" in built ? built.error : "")}
          />
        );
      })}
    </div>
  );
}

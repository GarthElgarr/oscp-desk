import { useMemo, useState, type ReactNode } from "react";
import { Copy } from "lucide-react";
import { ToolRun } from "@/components/hydra-run";
import { impacketPlan, type ImpacketInput, type ImpacketMode } from "@/lib/impacket-plan";
import { quoteHydraArg } from "@/lib/hydra-args";
import { LootPick } from "@/components/loot-card";

const control = "min-h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg outline-none";

const MODES: { id: ImpacketMode; label: string }[] = [
  { id: "secrets-remote", label: "secretsdump — remote hashes" },
  { id: "secrets-sam", label: "secretsdump — local SAM" },
  { id: "secrets-ntds", label: "secretsdump — local NTDS" },
  { id: "psexec", label: "psexec — one command, or a shell" },
  { id: "smbexec", label: "smbexec — one command, or a shell" },
  { id: "wmiexec", label: "wmiexec — one command, or a shell" },
  { id: "atexec", label: "atexec — one command via a task" },
  { id: "mssql", label: "mssqlclient — SQL shell" },
  { id: "smbclient", label: "smbclient — share shell" },
  { id: "asrep", label: "GetNPUsers — AS-REP" },
  { id: "kerberoast", label: "GetUserSPNs — Kerberoast" },
  { id: "gettgt", label: "getTGT — write a ccache" },
  { id: "getst", label: "getST — impersonate a service ticket" },
  { id: "ticketer", label: "ticketer — golden or silver" },
  { id: "ticket", label: "describeTicket — read a ccache" },
  { id: "lookupsid", label: "lookupsid — account names" },
  { id: "samrdump", label: "samrdump — account names" },
  { id: "rpcdump", label: "rpcdump — RPC endpoints" },
  { id: "adusers", label: "GetADUsers — domain users" },
  { id: "delegation", label: "findDelegation" },
  { id: "services", label: "services — list services" },
  { id: "reg", label: "reg — read one key" },
  { id: "passwd", label: "changepasswd — write a new password" },
  { id: "addcomputer", label: "addcomputer — create a machine account" },
  { id: "rbcd", label: "rbcd — read or write delegation" },
  { id: "relay", label: "ntlmrelayx — socks listener" },
  { id: "smbserver", label: "smbserver — share a Kali folder" },
];

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-sm">
      <span className="font-mono text-xs tracking-wide text-muted">{label}</span>
      {children}
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

const blank: ImpacketInput = {
  mode: "secrets-remote",
  host: "",
  domain: "",
  user: "",
  password: "",
  hash: "",
  dc: "",
  command: "",
  share: "",
  file: "",
  file2: "",
  file3: "",
  spn: "",
  impersonate: "Administrator",
  sid: "",
  usersFile: "",
  computer: "",
  delegateTo: "",
  keyName: "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run",
  newPass: "",
  kerberos: false,
  ntlmOnly: false,
  hashcat: true,
  action: "read",
};

export function ImpacketBuilder() {
  const [form, setForm] = useState<ImpacketInput>(blank);
  const [extra, setExtra] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const set = (patch: Partial<ImpacketInput>) => setForm((prev) => ({ ...prev, ...patch }));
  const plan = useMemo(() => impacketPlan(form), [form]);
  const ready = !("error" in plan);
  const shown = ready ? [plan.command, ...extra.map(quoteHydraArg)].join(" ") : "";
  const show = (modes: ImpacketMode[]) => modes.includes(form.mode);
  const auth = show(["secrets-remote", "psexec", "smbexec", "wmiexec", "atexec", "mssql", "smbclient", "kerberoast", "gettgt", "getst", "lookupsid", "rpcdump", "samrdump", "adusers", "delegation", "services", "reg", "passwd", "addcomputer", "rbcd"]);

  async function copy() {
    if (!ready) return;
    try {
      await navigator.clipboard.writeText(shown);
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
        <h2 className="text-lg font-semibold">impacket</h2>
        <p className="mt-1 text-sm text-muted">
          The exam tools, with the target syntax filled in. A hash is the NT half, or LM:NT. Kerberos means you already exported KRB5CCNAME. A shell is copied into your own terminal. Everything else can run here.
        </p>
      </div>
      <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
        <Field label="TOOL" hint={ready ? plan.note : ""}>
          <select className={control} value={form.mode} onChange={(event) => set({ mode: event.target.value as ImpacketMode })}>
            {MODES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        {show(["secrets-remote", "psexec", "smbexec", "wmiexec", "atexec", "mssql", "smbclient", "lookupsid", "rpcdump", "samrdump", "services", "reg", "passwd"]) ? (
          <Field label="TARGET" hint="One host. For a password change this is the DC if you leave DC IP empty.">
            <input className={control} value={form.host} onChange={(event) => set({ host: event.target.value })} placeholder="10.10.10.10" spellCheck={false} />
          </Field>
        ) : null}
        {auth ? (
          <>
            <Field label="DOMAIN" hint="Empty for a local account. corp.local for a domain account.">
              <input className={control} value={form.domain} onChange={(event) => set({ domain: event.target.value })} placeholder="corp.local" spellCheck={false} />
            </Field>
            <Field label="USER">
              <input className={control} value={form.user} onChange={(event) => set({ user: event.target.value })} placeholder="user" spellCheck={false} />
            </Field>
            <Field label="PASSWORD" hint="Leave empty if you use a hash or Kerberos. No @ in the password.">
              <input className={control} value={form.password} onChange={(event) => set({ password: event.target.value })} spellCheck={false} />
            </Field>
            <Field label="NT HASH" hint="32 hex characters, or LM:NT. This replaces the password.">
              <input className={control} value={form.hash} onChange={(event) => set({ hash: event.target.value })} spellCheck={false} />
            </Field>
            <Field label="DC IP" hint={form.mode === "mssql" ? "mssqlclient does not use a DC IP. Leave it empty." : "The domain controller, when the target is not the DC."}>
              <input className={control} value={form.dc} onChange={(event) => set({ dc: event.target.value })} placeholder="10.10.10.10" spellCheck={false} />
            </Field>
            <Field label="KERBEROS" hint="-k -no-pass. Only after KRB5CCNAME points at a ccache.">
              <select className={control} value={form.kerberos ? "yes" : "no"} onChange={(event) => set({ kerberos: event.target.value === "yes" })}>
                <option value="no">Password or hash</option>
                <option value="yes">Use the ccache</option>
              </select>
            </Field>
            <LootPick
              onPick={(item) =>
                set(
                  item.kind === "hash"
                    ? { user: item.user, hash: item.secret, password: "", kerberos: false }
                    : { user: item.user, password: item.secret, hash: "", kerberos: false },
                )
              }
            />
          </>
        ) : null}
        {show(["psexec", "smbexec", "wmiexec", "atexec"]) ? (
          <Field label="COMMAND" hint="Empty means a shell you copy. whoami is the one-shot check.">
            <input className={control} value={form.command} onChange={(event) => set({ command: event.target.value })} placeholder="whoami" spellCheck={false} />
          </Field>
        ) : null}
        {show(["secrets-remote"]) ? (
          <>
            <Field label="ONE ACCOUNT" hint="-just-dc-user. Empty dumps the accounts the login can see.">
              <input className={control} value={form.computer} onChange={(event) => set({ computer: event.target.value })} placeholder="Administrator" spellCheck={false} />
            </Field>
            <Field label="NTLM ONLY" hint="-just-dc-ntlm skips the extra lines.">
              <select className={control} value={form.ntlmOnly ? "yes" : "no"} onChange={(event) => set({ ntlmOnly: event.target.value === "yes" })}>
                <option value="no">Full dump</option>
                <option value="yes">NTLM only</option>
              </select>
            </Field>
          </>
        ) : null}
        {show(["secrets-sam", "secrets-ntds", "ticket", "smbserver"]) ? (
          <Field label={form.mode === "smbserver" ? "FOLDER ON KALI" : form.mode === "ticket" ? "TICKET FILE" : form.mode === "secrets-ntds" ? "NTDS.DIT" : "SAM FILE"}>
            <input className={control} value={form.file} onChange={(event) => set({ file: event.target.value })} placeholder={form.mode === "smbserver" ? "/tmp/share" : "/tmp/sam.save"} spellCheck={false} />
          </Field>
        ) : null}
        {show(["secrets-sam", "secrets-ntds"]) ? (
          <>
            <Field label="SYSTEM FILE">
              <input className={control} value={form.file2} onChange={(event) => set({ file2: event.target.value })} placeholder="/tmp/system.save" spellCheck={false} />
            </Field>
            <Field label="SECURITY FILE" hint="Optional. LSA secrets need it. A SAM dump does not.">
              <input className={control} value={form.file3} onChange={(event) => set({ file3: event.target.value })} placeholder="/tmp/security.save" spellCheck={false} />
            </Field>
          </>
        ) : null}
        {show(["smbclient", "smbserver"]) ? (
          <Field label="SHARE" hint={form.mode === "smbserver" ? "The name the target will use." : "Optional. C$ is the admin share."}>
            <input className={control} value={form.share} onChange={(event) => set({ share: event.target.value })} placeholder={form.mode === "smbserver" ? "share" : "C$"} spellCheck={false} />
          </Field>
        ) : null}
        {show(["asrep"]) ? (
          <>
            <Field label="DOMAIN">
              <input className={control} value={form.domain} onChange={(event) => set({ domain: event.target.value })} placeholder="corp.local" spellCheck={false} />
            </Field>
            <Field label="DC IP">
              <input className={control} value={form.dc} onChange={(event) => set({ dc: event.target.value })} placeholder="10.10.10.10" spellCheck={false} />
            </Field>
          </>
        ) : null}
        {show(["asrep", "relay"]) ? (
          <Field label={form.mode === "relay" ? "TARGETS FILE" : "USER LIST"} hint="A path on Kali.">
            <input className={control} value={form.usersFile} onChange={(event) => set({ usersFile: event.target.value })} placeholder="/tmp/users.txt" spellCheck={false} />
          </Field>
        ) : null}
        {show(["asrep", "kerberoast"]) ? (
          <Field label="HASHCAT" hint={form.mode === "asrep" ? "-format hashcat" : "Writes kerberoast.txt"}>
            <select className={control} value={form.hashcat ? "yes" : "no"} onChange={(event) => set({ hashcat: event.target.value === "yes" })}>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </Field>
        ) : null}
        {show(["getst", "ticketer"]) ? (
          <Field label="SPN" hint="Empty on ticketer makes a golden ticket. cifs/host.corp.local is a silver ticket.">
            <input className={control} value={form.spn} onChange={(event) => set({ spn: event.target.value })} placeholder="cifs/dc.corp.local" spellCheck={false} />
          </Field>
        ) : null}
        {show(["getst"]) ? (
          <Field label="IMPERSONATE">
            <input className={control} value={form.impersonate} onChange={(event) => set({ impersonate: event.target.value })} spellCheck={false} />
          </Field>
        ) : null}
        {show(["ticketer"]) ? (
          <>
            <Field label="DOMAIN">
              <input className={control} value={form.domain} onChange={(event) => set({ domain: event.target.value })} placeholder="corp.local" spellCheck={false} />
            </Field>
            <Field label="USER" hint="The account name inside the ticket.">
              <input className={control} value={form.user} onChange={(event) => set({ user: event.target.value })} placeholder="Administrator" spellCheck={false} />
            </Field>
            <Field label="NT HASH" hint="krbtgt for golden. The service account for silver.">
              <input className={control} value={form.hash} onChange={(event) => set({ hash: event.target.value })} spellCheck={false} />
            </Field>
            <Field label="DOMAIN SID">
              <input className={control} value={form.sid} onChange={(event) => set({ sid: event.target.value })} placeholder="S-1-5-21-1-2-3" spellCheck={false} />
            </Field>
          </>
        ) : null}
        {show(["reg"]) ? (
          <Field label="KEY">
            <input className={control} value={form.keyName} onChange={(event) => set({ keyName: event.target.value })} spellCheck={false} />
          </Field>
        ) : null}
        {show(["passwd", "addcomputer"]) ? (
          <Field label={form.mode === "passwd" ? "NEW PASSWORD" : "COMPUTER PASSWORD"}>
            <input className={control} value={form.newPass} onChange={(event) => set({ newPass: event.target.value })} spellCheck={false} />
          </Field>
        ) : null}
        {show(["addcomputer", "rbcd"]) ? (
          <Field label={form.mode === "rbcd" ? "FROM COMPUTER" : "COMPUTER NAME"} hint={form.mode === "rbcd" ? "Ends with $, such as HELP$." : "15 characters. The machine you are creating."}>
            <input className={control} value={form.computer} onChange={(event) => set({ computer: event.target.value })} placeholder={form.mode === "rbcd" ? "HELP$" : "HELP"} spellCheck={false} />
          </Field>
        ) : null}
        {show(["rbcd"]) ? (
          <>
            <Field label="TO COMPUTER" hint="The host you want to impersonate to. Ends with $.">
              <input className={control} value={form.delegateTo} onChange={(event) => set({ delegateTo: event.target.value })} placeholder="DC$" spellCheck={false} />
            </Field>
            <Field label="ACTION" hint="Read changes nothing.">
              <select className={control} value={form.action} onChange={(event) => set({ action: event.target.value === "write" ? "write" : "read" })}>
                <option value="read">Read</option>
                <option value="write">Write</option>
              </select>
            </Field>
          </>
        ) : null}
      </div>
      <div className="flex flex-col gap-3 px-4 pb-4">
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-xs tracking-wide text-muted">COMMAND</p>
          <button type="button" onClick={() => void copy()} disabled={!ready} className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs text-muted disabled:opacity-40">
            <Copy className="size-3.5" aria-hidden="true" />
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-bg p-3 font-mono text-xs leading-relaxed text-fg">
          {ready ? shown : "error" in plan ? plan.error : ""}
        </pre>
        {ready ? <p className="text-sm text-fg">{plan.why}</p> : null}
        {ready && plan.run ? (
          <ToolRun
            endpoint="/api/impacket"
            tool="impacket"
            disabled={false}
            placeholder="-debug"
            onFlags={setExtra}
            buildBody={(flags) => ({ ...form, extra: flags, command: [plan.command, ...flags.map(quoteHydraArg)].join(" ") })}
          />
        ) : ready ? (
          <p className="text-sm text-muted">Copy the command. This one waits for you to type, and a run from the desk would close that.</p>
        ) : null}
      </div>
    </article>
  );
}

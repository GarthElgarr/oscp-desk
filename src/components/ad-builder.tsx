import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Copy } from "lucide-react";
import { ToolRun } from "@/components/hydra-run";
import { LootPick } from "@/components/loot-card";
import { adPlan, type AdInput, type AdMode } from "@/lib/ad-plan";
import { quoteHydraArg } from "@/lib/hydra-args";
import { getGlobals, getGlobalsServer, subscribeGlobals } from "@/lib/desk-globals";

const control = "min-h-11 w-full rounded-lg border border-border bg-bg px-3 text-sm text-fg outline-none";

const MODES: { id: AdMode; label: string }[] = [
  { id: "bh-all", label: "BloodHound — collect All, write a zip" },
  { id: "bh-dc", label: "BloodHound — DC only" },
  { id: "bh-session", label: "BloodHound — sessions" },
  { id: "cert-find", label: "Certipy — find vulnerable templates" },
  { id: "cert-bh", label: "Certipy — find, BloodHound output" },
  { id: "cert-req", label: "Certipy — request a certificate" },
  { id: "cert-auth", label: "Certipy — pfx to an NT hash" },
  { id: "cert-shadow", label: "Certipy — shadow credentials" },
  { id: "kb-users", label: "Kerbrute — which names exist" },
  { id: "kb-spray", label: "Kerbrute — one password, many names" },
  { id: "kb-user", label: "Kerbrute — one name, a password list" },
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

const blank: AdInput = {
  mode: "bh-all",
  domain: "",
  user: "",
  password: "",
  hash: "",
  dc: "",
  usersFile: "",
  passwordFile: "",
  ca: "",
  template: "",
  upn: "",
  pfx: "",
  pfxPass: "",
  account: "",
  kerberos: false,
};

export function AdBuilder() {
  const globals = useSyncExternalStore(subscribeGlobals, getGlobals, getGlobalsServer);
  const dcEdited = useRef(false);
  const [form, setForm] = useState<AdInput>(blank);
  const [extra, setExtra] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!dcEdited.current && globals.target) setForm((prev) => ({ ...prev, dc: globals.target }));
  }, [globals.target]);
  const set = (patch: Partial<AdInput>) => {
    if ("dc" in patch) dcEdited.current = true;
    setForm((prev) => ({ ...prev, ...patch }));
  };
  const plan = useMemo(() => adPlan(form), [form]);
  const ready = !("error" in plan);
  const shown = ready ? [plan.command, ...extra.map(quoteHydraArg)].join(" ") : "";
  const show = (modes: AdMode[]) => modes.includes(form.mode);
  const needsLogin = show(["bh-all", "bh-dc", "bh-session", "cert-find", "cert-bh", "cert-req", "cert-shadow", "kb-user"]);

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
        <h2 className="text-lg font-semibold">BloodHound, Certipy, Kerbrute</h2>
        <p className="mt-1 text-sm text-muted">
          The three Active Directory commands that are still typed by hand. BloodHound writes a zip. Certipy reads templates, requests a certificate, or turns a pfx into a hash. Kerbrute checks names, or one password. Impacket is the other builder.
        </p>
      </div>
      <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
        <Field label="TOOL" hint={ready ? plan.note : ""}>
          <select className={control} value={form.mode} onChange={(event) => set({ mode: event.target.value as AdMode })}>
            {MODES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="DC IP" hint="The domain controller. BloodHound uses it as the DNS server. Certipy and Kerbrute use it as the DC.">
          <input className={control} value={form.dc} onChange={(event) => set({ dc: event.target.value })} placeholder="10.10.10.10" spellCheck={false} />
        </Field>
        {form.mode !== "cert-auth" ? (
          <Field label="DOMAIN" hint="corp.local. Kerbrute and Certipy need the real name, not the IP.">
            <input className={control} value={form.domain} onChange={(event) => set({ domain: event.target.value })} placeholder="corp.local" spellCheck={false} />
          </Field>
        ) : null}
        {needsLogin ? (
          <Field label="USER" hint={form.mode.startsWith("cert-") ? "The account, without @domain. The builder adds it." : "The account you already have."}>
            <input className={control} value={form.user} onChange={(event) => set({ user: event.target.value })} placeholder="alice" spellCheck={false} />
          </Field>
        ) : null}
        {show(["bh-all", "bh-dc", "bh-session", "cert-find", "cert-bh", "cert-req", "cert-shadow", "kb-spray"]) ? (
          <>
            <Field label="PASSWORD" hint="Leave empty if you use a hash or Kerberos. Kerbrute spray uses this as the one guess.">
              <input className={control} value={form.password} onChange={(event) => set({ password: event.target.value })} spellCheck={false} />
            </Field>
            {form.mode.startsWith("kb-") ? null : (
              <Field label="NT HASH" hint="32 hex characters, or LM:NT. This replaces the password.">
                <input className={control} value={form.hash} onChange={(event) => set({ hash: event.target.value })} spellCheck={false} />
              </Field>
            )}
            {form.mode.startsWith("kb-") ? null : (
              <Field label="KERBEROS" hint="Only after KRB5CCNAME points at a ccache.">
                <select className={control} value={form.kerberos ? "yes" : "no"} onChange={(event) => set({ kerberos: event.target.value === "yes" })}>
                  <option value="no">Password or hash</option>
                  <option value="yes">Use the ccache</option>
                </select>
              </Field>
            )}
            <LootPick
              kinds={["user", "pass", "nt"]}
              onPick={(item) =>
                set(
                  item.kind === "nt"
                    ? { user: item.user || form.user, hash: item.secret, password: "", kerberos: false }
                    : item.kind === "pass"
                      ? { user: item.user || form.user, password: item.secret, hash: "", kerberos: false }
                      : { user: item.user || form.user },
                )
              }
            />
          </>
        ) : null}
        {show(["kb-users", "kb-spray"]) ? (
          <Field label="USER LIST" hint="One name per line. A spray uses names you already know exist.">
            <input className={control} value={form.usersFile} onChange={(event) => set({ usersFile: event.target.value })} placeholder="/tmp/users.txt" spellCheck={false} />
          </Field>
        ) : null}
        {show(["kb-user"]) ? (
          <Field label="PASSWORD LIST" hint="One password per line. This is aimed at the one user above.">
            <input className={control} value={form.passwordFile} onChange={(event) => set({ passwordFile: event.target.value })} placeholder="/tmp/passwords.txt" spellCheck={false} />
          </Field>
        ) : null}
        {show(["cert-req"]) ? (
          <>
            <Field label="CA" hint="The name Certipy printed, not the IP.">
              <input className={control} value={form.ca} onChange={(event) => set({ ca: event.target.value })} placeholder="corp-CA" spellCheck={false} />
            </Field>
            <Field label="TEMPLATE" hint="Only a template the find mode marked vulnerable.">
              <input className={control} value={form.template} onChange={(event) => set({ template: event.target.value })} placeholder="User" spellCheck={false} />
            </Field>
            <Field label="UPN" hint="The name you want on the certificate.">
              <input className={control} value={form.upn} onChange={(event) => set({ upn: event.target.value })} placeholder="administrator@corp.local" spellCheck={false} />
            </Field>
          </>
        ) : null}
        {show(["cert-auth"]) ? (
          <>
            <Field label="PFX" hint="The file Certipy saved.">
              <input className={control} value={form.pfx} onChange={(event) => set({ pfx: event.target.value })} placeholder="/tmp/administrator.pfx" spellCheck={false} />
            </Field>
            <Field label="PFX PASSWORD" hint="Empty if Certipy did not set one.">
              <input className={control} value={form.pfxPass} onChange={(event) => set({ pfxPass: event.target.value })} spellCheck={false} />
            </Field>
          </>
        ) : null}
        {show(["cert-shadow"]) ? (
          <Field label="TARGET ACCOUNT" hint="The account you want a certificate for. No @domain.">
            <input className={control} value={form.account} onChange={(event) => set({ account: event.target.value })} placeholder="bob" spellCheck={false} />
          </Field>
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
        <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-bg p-3 font-mono text-xs leading-relaxed text-fg">{ready ? shown : "error" in plan ? plan.error : ""}</pre>
        {ready ? <p className="text-sm text-fg">{plan.why}</p> : null}
        {ready ? (
          <ToolRun
            endpoint="/api/ad"
            tool="ad"
            disabled={false}
            placeholder="-debug"
            onFlags={setExtra}
            buildBody={(flags) => ({ ...form, extra: flags, command: [plan.display, ...flags.map(quoteHydraArg)].join(" ") })}
          />
        ) : null}
        <p className="text-sm text-muted">Copy stays available if you would rather paste it into your own terminal.</p>
      </div>
    </article>
  );
}

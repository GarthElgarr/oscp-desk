import { useMemo, useState } from "react";
import { Copy } from "lucide-react";
import { identifyPaste, type HashRow } from "@/lib/hash-id";
import { LootPick } from "@/components/loot-card";
import { LOOT_HASHCAT, type LootKind } from "@/lib/loot";

const control =
  "min-h-36 w-full rounded-lg border border-border bg-bg px-3 py-2 font-mono text-xs text-fg outline-none";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1200);
        } catch {
          setCopied(false);
        }
      }}
      className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs text-muted hover:text-fg"
    >
      <Copy className="size-3.5" aria-hidden="true" />
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function scriptFor(file: string, lines: string[], command: string) {
  const body = [...new Set(lines)].join("\n");
  return `cat > ${file} << 'EOF'\n${body}\nEOF\n${command}`;
}

function hashcatScript(rows: HashRow[]) {
  const mode = rows[0]?.hashcatMode;
  const file = rows[0]?.file;
  if (!mode || !file) return "";
  const lines = rows.map((row) => row.hashcatLine).filter((line): line is string => Boolean(line));
  return scriptFor(
    file,
    lines,
    `hashcat -m ${mode} ${file} /usr/share/wordlists/rockyou.txt\nhashcat -m ${mode} ${file} --show`,
  );
}

function johnScript(rows: HashRow[]) {
  const format = rows[0]?.johnFormat;
  const file = rows[0]?.file.replace(/\.txt$/, ".john.txt") || "hashes.john.txt";
  if (!format) return "";
  const lines = rows.map((row) => row.johnLine).filter((line): line is string => Boolean(line));
  return scriptFor(
    file,
    lines,
    `john --format=${format} --wordlist=/usr/share/wordlists/rockyou.txt ${file}\njohn --format=${format} --show ${file}`,
  );
}

function group(rows: HashRow[], side: "hashcat" | "john") {
  const map = new Map<string, HashRow[]>();
  for (const row of rows) {
    if (!row.ok || row.cracked) continue;
    const key = side === "hashcat" ? row.hashcatMode : row.johnFormat;
    const line = side === "hashcat" ? row.hashcatLine : row.johnLine;
    if (!key || !line) continue;
    const id = `${side}:${key}:${row.file}`;
    const list = map.get(id) ?? [];
    list.push(row);
    map.set(id, list);
  }
  return [...map.values()];
}

export function HashIdentifier() {
  const [text, setText] = useState("");
  const rows = useMemo(() => identifyPaste(text), [text]);
  const hashcat = group(rows, "hashcat");
  const john = group(rows, "john");
  const cracked = rows.filter((row) => row.cracked);
  const rejected = rows.filter((row) => !row.ok);

  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-primary bg-surface">
      <div className="border-b border-border px-4 py-3">
        <p className="font-mono text-xs text-primary">Builder</p>
        <h2 className="text-lg font-semibold">Hash identifier</h2>
        <p className="mt-1 text-sm text-muted">
          Paste the messy line. Secretsdump, Mimikatz, a shadow entry, a Kerberos hash. It rewrites each one into
          the line hashcat accepts and the line John accepts.
        </p>
      </div>
      <div className="px-4 py-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-mono text-xs tracking-wide text-muted">PASTE</span>
          <textarea
            className={control}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Administrator:500:aad3b435b51404eeaad3b435b51404ee:8846f7eaee8fb117ad06bdd830b7586c:::"}
            spellCheck={false}
          />
        </label>
        <div className="mt-3">
          <LootPick
            kinds={Object.keys(LOOT_HASHCAT) as LootKind[]}
            onPick={(item) => setText(item.secret)}
          />
        </div>
      </div>
      {text.trim() ? (
        <div className="flex flex-col gap-4 px-4 pb-4">
          {hashcat.length > 1 || john.length > 1 ? (
            <p className="text-sm text-dead">
              More than one hash type. Hashcat runs one mode per file. Do not paste these into the same file.
            </p>
          ) : null}
          {hashcat.map((bundle) => (
            <FileBlock key={`h-${bundle[0].hashcatMode}`} title={`Hashcat ${bundle[0].hashcatLabel}`} command={hashcatScript(bundle)} />
          ))}
          {john.map((bundle) => (
            <FileBlock key={`j-${bundle[0].johnFormat}`} title={`John ${bundle[0].johnFormat}`} command={johnScript(bundle)} />
          ))}
          {rows.map((row, index) => (
            <div key={`${row.raw}-${index}`} className="rounded-lg bg-bg px-3 py-3">
              <p className="text-sm font-semibold">{row.title}</p>
              {row.hashcatLine ? (
                <p className="mt-2 font-mono text-xs break-words text-fg">
                  <span className="text-muted">hashcat -m {row.hashcatMode} </span>
                  {row.hashcatLine}
                </p>
              ) : null}
              {row.johnLine ? (
                <p className="mt-1 font-mono text-xs break-words text-fg">
                  <span className="text-muted">john --format={row.johnFormat} </span>
                  {row.johnLine}
                </p>
              ) : null}
              <p className={"mt-2 text-sm " + (row.ok && !row.note.includes("blank password") ? "text-muted" : "text-dead")}>
                {row.note}
              </p>
            </div>
          ))}
          {cracked.length > 0 ? (
            <p className="text-sm text-alive">
              Already cracked: {cracked.map((row) => row.cracked).join(", ")}. Use the password. Do not put it in a hash file.
            </p>
          ) : null}
          {rejected.length > 0 ? (
            <p className="text-sm text-dead">{rejected.length} line{rejected.length === 1 ? "" : "s"} left out of the files.</p>
          ) : null}
          <div>
            <p className="font-mono text-xs tracking-wide text-primary">WHAT IT DOES</p>
            <p className="mt-1 text-sm text-fg">
              Hashcat mode 1000 compares a 32 hex NT hash. A secretsdump line has the user, the RID, the LM hash, and
              the NT hash, so hashcat sees extra colons and stops. The identifier keeps only the NT half. John does
              not want that bare hex. It wants $NT$ in front, and the username before a colon, or it reports no
              password hashes loaded. NetNTLMv2 and Kerberos are the opposite: both tools want the long line, and
              cutting it down to 32 hex cracks the wrong thing.
            </p>
          </div>
        </div>
      ) : (
        <p className="px-4 pb-4 text-sm text-muted">
          One hash per line, or a Mimikatz block with User Name and NTLM. Mixed types come back as separate files.
        </p>
      )}
    </article>
  );
}

function FileBlock({ title, command }: { title: string; command: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono text-xs tracking-wide text-muted">{title}</p>
        <CopyButton text={command} />
      </div>
      <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-bg p-3 font-mono text-xs leading-relaxed text-fg">
        {command}
      </pre>
    </div>
  );
}

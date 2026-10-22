export type HashRow = {
  raw: string;
  ok: boolean;
  title: string;
  hashcatMode: string | null;
  hashcatLabel: string;
  hashcatLine: string | null;
  johnFormat: string | null;
  johnLine: string | null;
  file: string;
  note: string;
  cracked: string | null;
};

const EMPTY_NT = "31d6cfe0d16ae931b73c59d7e0c089c0";
const EMPTY_LM = "aad3b435b51404eeaad3b435b51404ee";

function sam(user: string) {
  const trimmed = user.trim();
  const parts = trimmed.split("\\");
  return parts[parts.length - 1] || trimmed;
}

function ntRow(user: string | null, nt: string, source: string): HashRow {
  const hash = nt.toLowerCase();
  const name = user ? sam(user) : null;
  const empty = hash === EMPTY_NT;
  return {
    raw: "",
    ok: true,
    title: name ? `NTLM for ${name}` : "NTLM",
    hashcatMode: "1000",
    hashcatLabel: "1000 NTLM",
    hashcatLine: hash,
    johnFormat: "NT",
    johnLine: name ? `${name}:$NT$${hash}` : `$NT$${hash}`,
    file: "ntlm.txt",
    cracked: null,
    note: empty
      ? "This NT hash is the blank password. Do not crack it. The password is empty."
      : `${source} Hashcat -m 1000 wants only the 32 hex characters. A secretsdump line, or user:hash, makes hashcat say Separator unmatched. John wants $NT$ in front of the same hex, with the username if you have it. If this is a domain account, pass it with nxc -H before you crack it. A 32 hex string from a website is MD5, mode 0, and the hashcat line stays the same hex.`,
  };
}

function row(partial: Omit<HashRow, "raw" | "cracked"> & { cracked?: string | null }): HashRow {
  return { raw: "", cracked: partial.cracked ?? null, ...partial };
}

function cryptKind(body: string): { mode: string | null; label: string; john: string; file: string; note: string } | null {
  if (body.startsWith("$y$") || body.startsWith("$gy$")) {
    return {
      mode: null,
      label: "no hashcat mode",
      john: "yescrypt",
      file: "yescrypt.txt",
      note: "This is yescrypt. John cracks it. Hashcat does not have a mode you should use for $y$ here.",
    };
  }
  if (body.startsWith("$6$")) {
    return {
      mode: "1800",
      label: "1800 sha512crypt",
      john: "sha512crypt",
      file: "sha512.txt",
      note: "Linux SHA-512. Hashcat gets the $6$ string only. John gets username:$6$... so --show prints the user.",
    };
  }
  if (body.startsWith("$5$")) {
    return {
      mode: "7400",
      label: "7400 sha256crypt",
      john: "sha256crypt",
      file: "sha256crypt.txt",
      note: "Linux SHA-256. Same split as $6$: hash only for hashcat, username kept for John.",
    };
  }
  if (body.startsWith("$1$")) {
    return {
      mode: "500",
      label: "500 md5crypt",
      john: "md5crypt",
      file: "md5crypt.txt",
      note: "$1$ is md5crypt. It is not unsalted MD5.",
    };
  }
  if (body.startsWith("$apr1$")) {
    return {
      mode: "1600",
      label: "1600 Apache MD5",
      john: "md5crypt",
      file: "apr1.txt",
      note: "$apr1$ is Apache htpasswd. Hashcat mode 1600. If John says it loaded nothing, the hashcat line is still the one to run.",
    };
  }
  if (/^\$2[aby]\$/.test(body)) {
    return {
      mode: "3200",
      label: "3200 bcrypt",
      john: "bcrypt",
      file: "bcrypt.txt",
      note: "bcrypt is slow. One pass of rockyou, then stop. Both tools want the full $2y$ (or $2a$ / $2b$) string. Hashcat does not want the username.",
    };
  }
  return null;
}

function identifyOne(input: string): HashRow {
  let line = input.trim().replace(/^\[.*?\]\s*/, "");
  const labelled = line.match(/^(?:Hash|NTLMv2-SSP Hash)\s*[:=]\s*(.+)$/i);
  if (labelled) line = labelled[1].trim();
  const ntlmLabel = line.match(/^(?:NTLM|NT)\s*[:=]\s*([0-9a-fA-F]{32})$/i);
  if (ntlmLabel) line = ntlmLabel[1];

  if (/^(krb5tgs\$|krb5asrep\$)/i.test(line)) line = `$${line}`;
  const embedded = line.match(/(\$krb5tgs\$\d+\$.+|\$krb5asrep\$.+|\$DCC2\$.+)/i);
  if (embedded) line = embedded[1];

  const base = (partial: Omit<HashRow, "raw" | "cracked"> & { cracked?: string | null }): HashRow => ({
    ...row(partial),
    raw: input,
  });

  const tgs = line.match(/^\$krb5tgs\$(\d+)\$/i);
  if (tgs) {
    const etype = tgs[1];
    const mode = etype === "23" ? "13100" : etype === "17" ? "19600" : etype === "18" ? "19700" : "";
    return base({
      ok: Boolean(mode),
      title: mode ? `Kerberos TGS etype ${etype}` : "Kerberos TGS, unknown etype",
      hashcatMode: mode || null,
      hashcatLabel: mode ? `${mode} Kerberos TGS etype ${etype}` : "unknown",
      hashcatLine: mode ? line : null,
      johnFormat: "krb5tgs",
      johnLine: line,
      file: "kerb.txt",
      note: mode
        ? "Both tools want this whole $krb5tgs$ line. Do not put a username and a colon in front of it. Etype 23 is 13100. 17 is 19600. 18 is 19700."
        : "The etype is not 23, 17, or 18. Do not guess a mode.",
    });
  }

  if (/^\$krb5asrep\$/i.test(line)) {
    const etype23 = /\$krb5asrep\$23\$/i.test(line) || !/\$krb5asrep\$\d+\$/i.test(line);
    return base({
      ok: etype23,
      title: "AS-REP",
      hashcatMode: etype23 ? "18200" : null,
      hashcatLabel: etype23 ? "18200 AS-REP etype 23" : "AS-REP, not etype 23",
      hashcatLine: etype23 ? line : null,
      johnFormat: "krb5asrep",
      johnLine: line,
      file: "asrep.txt",
      note: etype23
        ? "Both tools want the whole $krb5asrep$ line. Mode 18200 is etype 23 only. Leave the username that is already inside the hash."
        : "This AS-REP is not etype 23. Mode 18200 will reject it.",
    });
  }

  if (/^\$DCC2\$/i.test(line)) {
    return base({
      ok: true,
      title: "Domain cached credential",
      hashcatMode: "2100",
      hashcatLabel: "2100 DCC2",
      hashcatLine: line,
      johnFormat: "mscash2",
      johnLine: line,
      file: "dcc2.txt",
      note: "Both tools want the $DCC2$ line unchanged. This is a cached logon, not an NT hash.",
    });
  }

  const v2 = line.match(/^([^:]+)::([^:]*):([0-9a-fA-F]{16}):([0-9a-fA-F]+):([0-9a-fA-F]+)$/);
  if (v2) {
    return base({
      ok: true,
      title: `NetNTLMv2 for ${v2[1]}`,
      hashcatMode: "5600",
      hashcatLabel: "5600 NetNTLMv2",
      hashcatLine: line,
      johnFormat: "netntlmv2",
      johnLine: line,
      file: "netntlmv2.txt",
      note: "Do not strip this line. Hashcat and John both want the username, the empty LM field, the domain, and every colon. There is no -H pass for this. It is a challenge response, not an NT hash.",
    });
  }

  const v1 = line.match(/^([^:]+)::([^:]*):([0-9a-fA-F]{48}):([0-9a-fA-F]{48})$/);
  if (v1) {
    return base({
      ok: true,
      title: `NetNTLMv1 for ${v1[1]}`,
      hashcatMode: "5500",
      hashcatLabel: "5500 NetNTLMv1",
      hashcatLine: line,
      johnFormat: "netntlm",
      johnLine: line,
      file: "netntlmv1.txt",
      note: "Keep the whole line, same as v2. Mode 5500. John format netntlm.",
    });
  }

  const shadow = line.match(/^([^:\s]+):(\$(?:6|5|1|y|gy|apr1|2[aby])\$[^:\s]+)/);
  const bareCrypt = line.match(/^(\$(?:6|5|1|y|gy|apr1|2[aby])\$\S+)$/);
  const cryptBody = shadow?.[2] ?? bareCrypt?.[1] ?? null;
  if (cryptBody) {
    const kind = cryptKind(cryptBody);
    if (kind) {
      const user = shadow?.[1] ?? null;
      return base({
        ok: true,
        title: user ? `${kind.john} for ${user}` : kind.john,
        hashcatMode: kind.mode,
        hashcatLabel: kind.label,
        hashcatLine: kind.mode ? cryptBody : null,
        johnFormat: kind.john,
        johnLine: user ? `${user}:${cryptBody}` : cryptBody,
        file: kind.file,
        note: kind.note,
      });
    }
  }

  if (/^\$[PH]\$[A-Za-z0-9./]{20,}$/.test(line)) {
    return base({
      ok: true,
      title: "phpass",
      hashcatMode: "400",
      hashcatLabel: "400 phpass",
      hashcatLine: line,
      johnFormat: "phpass",
      johnLine: line,
      file: "phpass.txt",
      note: "WordPress and phpBB use this. Both tools want the $P$ or $H$ line as it is.",
    });
  }

  const mysql = line.match(/^\*?([0-9a-fA-F]{40})$/);
  if (mysql && (line.startsWith("*") || line.startsWith("*".toLowerCase()))) {
    const hash = mysql[1].toLowerCase();
    return base({
      ok: true,
      title: "MySQL 4.1 / 5",
      hashcatMode: "300",
      hashcatLabel: "300 MySQL",
      hashcatLine: hash,
      johnFormat: "mysql-sha1",
      johnLine: `*${hash.toUpperCase()}`,
      file: "mysql.txt",
      note: "The star is not part of the hashcat hash. John wants the star and uppercase hex. Using one line for both tools is why this fails.",
    });
  }

  if (/^0x[0-9a-fA-F]+$/.test(line)) {
    const hex = line.slice(2).toLowerCase();
    const body = `0x${hex}`;
    let mode: string | null = null;
    let label = "MSSQL";
    let johnFormat: string | null = null;
    let note = "The 0x stays. Do not turn this into raw hex.";
    if (hex.startsWith("0200")) {
      mode = "1731";
      label = "1731 MSSQL 2012";
      johnFormat = "mssql12";
      note = "0x0200 is SQL Server 2012 and later. Hashcat 1731. John format mssql12. Keep the 0x.";
    } else if (hex.startsWith("0100") && hex.length === 52) {
      mode = "132";
      label = "132 MSSQL 2005";
      johnFormat = "mssql05";
      note = "0x0100 and 52 hex digits is SQL Server 2005. The longer 0x0100 blob is mode 131, not this one.";
    } else if (hex.startsWith("0100") && hex.length >= 90) {
      mode = "131";
      label = "131 MSSQL 2000";
      johnFormat = "mssql";
      note = "The long 0x0100 blob is SQL Server 2000, mode 131. The short one is 132.";
    } else {
      note = "This starts with 0x but the length is not a SQL Server hash I know. Do not guess a mode.";
    }
    return base({
      ok: Boolean(mode),
      title: label,
      hashcatMode: mode,
      hashcatLabel: label,
      hashcatLine: mode ? body : null,
      johnFormat,
      johnLine: mode ? body : null,
      file: "mssql.txt",
      note,
    });
  }

  const dump = line.match(/^(.+?):(\d+):([0-9a-fA-F]{32}):([0-9a-fA-F]{32}):*$/);
  if (dump) {
    const made = ntRow(dump[1], dump[4], "This is a secretsdump or SAM line.");
    const lm = dump[3].toLowerCase();
    made.raw = input;
    if (lm === EMPTY_LM) made.note = `The LM half is empty. ${made.note}`;
    return made;
  }

  const pair = line.match(/^([0-9a-fA-F]{32}):([0-9a-fA-F]{32})$/);
  if (pair) {
    const made = ntRow(null, pair[2], "The first half is the LM hash and the second half is the NT hash.");
    made.raw = input;
    if (pair[1].toLowerCase() === EMPTY_LM) made.note = `The LM half is empty. ${made.note}`;
    return made;
  }

  const cracked = line.match(/^([0-9a-fA-F]{32}):([^:]+)$/);
  if (cracked && !/^[0-9a-fA-F]{32}$/.test(cracked[2])) {
    return base({
      ok: true,
      title: "Already cracked",
      hashcatMode: null,
      hashcatLabel: "already cracked",
      hashcatLine: null,
      johnFormat: null,
      johnLine: null,
      file: "",
      cracked: cracked[2],
      note: `The password is ${cracked[2]}. Nothing to crack.`,
    });
  }

  const named = line.match(/^([^:\s]+):([0-9a-fA-F]{32})$/);
  if (named) {
    const made = ntRow(named[1], named[2], "This was username:hash.");
    made.raw = input;
    return made;
  }

  if (/^[0-9a-fA-F]{32}$/.test(line)) {
    const made = ntRow(null, line, "A bare 32 hex string from Windows is NTLM.");
    made.raw = input;
    return made;
  }
  if (/^[0-9a-fA-F]{40}$/.test(line)) {
    return base({
      ok: true,
      title: "SHA1",
      hashcatMode: "100",
      hashcatLabel: "100 SHA1",
      hashcatLine: line.toLowerCase(),
      johnFormat: "raw-sha1",
      johnLine: line.toLowerCase(),
      file: "sha1.txt",
      note: "40 hex with no star is SHA1, not MySQL. MySQL has a star in front.",
    });
  }
  if (/^[0-9a-fA-F]{64}$/.test(line)) {
    return base({
      ok: true,
      title: "SHA256",
      hashcatMode: "1400",
      hashcatLabel: "1400 SHA256",
      hashcatLine: line.toLowerCase(),
      johnFormat: "raw-sha256",
      johnLine: line.toLowerCase(),
      file: "sha256.txt",
      note: "64 hex with no $5$ is unsalted SHA256. $5$ is a different mode.",
    });
  }
  if (/^[0-9a-fA-F]{128}$/.test(line)) {
    return base({
      ok: true,
      title: "SHA512",
      hashcatMode: "1700",
      hashcatLabel: "1700 SHA512",
      hashcatLine: line.toLowerCase(),
      johnFormat: "raw-sha512",
      johnLine: line.toLowerCase(),
      file: "sha512raw.txt",
      note: "128 hex with no $6$ is unsalted SHA512. A Linux shadow hash is $6$ and a different mode.",
    });
  }

  if (/^[^:\s]+:[^:]+$/.test(line) && !line.includes("$")) {
    return base({
      ok: false,
      title: "Not a hash",
      hashcatMode: null,
      hashcatLabel: "",
      hashcatLine: null,
      johnFormat: null,
      johnLine: null,
      file: "",
      note: "This looks like a username and a password. There is no hash to format.",
    });
  }

  return base({
    ok: false,
    title: "Not recognised",
    hashcatMode: null,
    hashcatLabel: "",
    hashcatLine: null,
    johnFormat: null,
    johnLine: null,
    file: "",
    note: "Leave this line out of the hash file. One bad line makes hashcat reject the whole file.",
  });
}

export function identifyPaste(text: string): HashRow[] {
  const lines = text.split(/\r?\n/);
  const pending: string[] = [];
  let user = "";
  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const name = trimmed.match(/^(?:\*\s*)?(?:User(?:name)?|User Name|Account)\s*[:=]\s*(.+)$/i);
    const ntlm = trimmed.match(/^(?:NTLM|NT Hash|Hash NTLM)\s*[:=]\s*([0-9a-fA-F]{32})\s*$/i);
    if (name && !trimmed.includes("::")) {
      user = name[1].trim();
      continue;
    }
    if (ntlm && user) {
      pending.push(`${user}:${ntlm[1]}`);
      user = "";
      continue;
    }
    pending.push(trimmed);
  }
  return pending.map((line) => identifyOne(line));
}

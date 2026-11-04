import { finishCommand, flagsAllowed, hostOrIp, quoteArg } from "./scope-target.ts";

export type SmbTool = "enum4linux-ng" | "smbclient" | "smbmap" | "rpcclient";
export type SmbAuth = "null" | "guest" | "creds";

const SMB_FLAGS: Record<SmbTool, Set<string>> = {
  "enum4linux-ng": new Set(["-A", "-u", "-p"]),
  smbclient: new Set(["-N", "-L", "-U"]),
  smbmap: new Set(["-H", "-u", "-p"]),
  rpcclient: new Set(["-U", "-N"]),
};

export function smbEnumPlan(input: {
  tool: SmbTool;
  auth: SmbAuth;
  target: string;
  user: string;
  password: string;
  share: string;
  examOn: boolean;
}): { command: string; why: string } | { error: string } {
  const host = hostOrIp(input.target);
  if (!host) return { error: "The target is one IPv4 address or one host name. No leading zeros." };
  const creds = input.auth === "creds";
  const user = input.user.trim();
  const password = input.password;
  if (creds && !/^[A-Za-z0-9][A-Za-z0-9._@\\-]{0,63}$/.test(user)) return { error: "The user is one account name. It cannot start with a dash." };
  if (creds && (password.length === 0 || password.length > 80 || /[\n\r']/.test(password) || password.startsWith("-"))) {
    return { error: "The password is one line, with no quotes, and it cannot start with a dash." };
  }
  if ((input.tool === "smbclient" || input.tool === "rpcclient") && creds && password.includes("%")) {
    return { error: "A % in the password splits smbclient's user%password form. Use smbmap, which takes -p on its own." };
  }
  if (/rockyou/i.test(password) || /rockyou/i.test(user)) return { error: "Rockyou does not belong here. Use a password you already found." };
  const share = input.share.trim();
  if (share && !/^[A-Za-z0-9$._-]{1,40}$/.test(share)) return { error: "The share name is letters, numbers, and $." };
  const args: string[] = [];
  if (input.tool === "enum4linux-ng") {
    args.push("enum4linux-ng", "-A");
    if (creds) args.push("-u", user, "-p", password);
    args.push(host);
  } else if (input.tool === "smbclient") {
    if (input.auth === "null" && !share) {
      args.push("smbclient", "-N", "-L", `//${host}/`);
    } else {
      const where = share ? `//${host}/${share}` : `//${host}/`;
      const login = input.auth === "guest" ? "guest%" : input.auth === "creds" ? `${user}%${password}` : "";
      args.push("smbclient", where, "-U", login);
      if (input.auth === "null") args.push("-N");
    }
  } else if (input.tool === "smbmap") {
    const login = input.auth === "guest" ? "guest" : creds ? user : "";
    const secret = input.auth === "guest" ? "" : creds ? password : "";
    args.push("smbmap", "-H", host, "-u", login, "-p", secret);
  } else {
    const login = input.auth === "guest" ? "guest%" : creds ? `${user}%${password}` : "";
    args.push("rpcclient", "-U", login);
    if (input.auth !== "guest") args.push("-N");
    args.push(host);
  }
  const unknown = flagsAllowed(args.slice(1), SMB_FLAGS[input.tool]);
  if (unknown) return { error: `${input.tool} flag ${unknown} is not on the allow-list.` };
  const built = finishCommand(args.map(quoteArg).join(" "), input.examOn);
  if ("error" in built) return built;
  const why =
    input.tool === "enum4linux-ng"
      ? "-A is the full safe listing: users, shares, groups, and the policy. A null run that prints users means the host still answers anonymously. A credentialed run is the same listing with the account you already have."
      : input.tool === "smbclient"
        ? "-N is no password. -L lists shares. With a share name you are inside that share, and ls is the next thing you type. Guest is the account name guest with an empty password."
        : input.tool === "smbmap"
          ? "-H is the host. -u and -p are the account. READ on a share is worth opening in smbclient. An empty user and password is the null session."
          : "-U '' -N is a null rpcclient. enumdomusers and netshareenum are the two commands to type next. Stop if the session is denied. Do not loop every RID by hand until the null session is actually open.";
  return { command: built.command, why };
}
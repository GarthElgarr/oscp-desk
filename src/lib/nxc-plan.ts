import { bannedCommand } from "./exam-rules.ts";
import { hostOrSubnet } from "./scope-target.ts";

const RELAY = /\b(coerce_plus|petitpotam|printerbug|dfscoerce|shadowcoerce|ntlmrelayx|ntlmrelay|-M\s+coerce)\b/i;

/** Flags the nxc builder is allowed to emit. Relay and coerce are not in this set. */
export const NXC_FLAGS = new Set([
  "-u",
  "-p",
  "-H",
  "-d",
  "-M",
  "-x",
  "-q",
  "-c",
  "--local-auth",
  "--port",
  "--shares",
  "--users",
  "--groups",
  "--active-users",
  "--pass-pol",
  "--rid-brute",
  "--spider",
  "--pattern",
  "--laps",
  "--trusted-for-delegation",
  "--kerberoasting",
  "--asreproast",
  "--bloodhound",
  "--sam",
  "--lsa",
  "--ntds",
  "--loggedon-users",
  "--continue-on-success",
  "--use-kcache",
  "--key",
]);

const NXC_MODULES = new Set(["gpp_password", "laps", "adcs", "zerologon"]);

export function nxcTarget(value: string): string | null {
  return hostOrSubnet(value);
}

function leadingZeroIp(value: string): boolean {
  const text = value.trim();
  if (!/^(?:\d{1,3}\.){3}\d{1,3}$/.test(text)) return false;
  return text.split(".").some((part) => part.length > 1 && part.startsWith("0"));
}

/** A specific reason for a bad target or user. Null when those two fields are usable. */
export function nxcInputError(input: { target: string; user: string }): string | null {
  const target = input.target.trim();
  const user = input.user.trim();
  if (target.includes("/")) {
    const slash = target.indexOf("/");
    const ip = target.slice(0, slash);
    const maskText = target.slice(slash + 1);
    if (leadingZeroIp(ip)) return "A leading zero is not an address.";
    if (/^\d{1,2}$/.test(maskText) && Number(maskText) < 24) return "A subnet wider than /24 is refused.";
  } else if (leadingZeroIp(target)) {
    return "A leading zero is not an address.";
  }
  if (user && (user.startsWith("-") || user.includes("..") || !/^[A-Za-z0-9_./\\@+-]+$/.test(user))) {
    return "The user name has characters this builder will not accept.";
  }
  return null;
}

export function nxcGuard(command: string, examOn: boolean): string | null {
  const banned = bannedCommand(command, examOn);
  if (banned) return `${banned} LAB ONLY. Turn exam lock off only in a lab.`;
  if (examOn && RELAY.test(command)) {
    return "Relay and coerce stay off during the exam. The guide does not allow spoofing, and this is the same class of attack. Turn exam lock off only in a lab.";
  }
  return null;
}

/** Walks the built command. A flag that is not on the allow-list, or a module that is not a safe one, is refused. */
export function nxcUnknownFlag(command: string): string | null {
  const tokens = splitArgs(command);
  for (let i = 3; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token.startsWith("-")) continue;
    if (!NXC_FLAGS.has(token)) return token;
    if (token === "-M") {
      const mod = tokens[i + 1] ?? "";
      if (!NXC_MODULES.has(mod)) return `-M ${mod || "(missing)"}`;
    }
    if ((token === "--kerberoasting" || token === "--asreproast") && !/^[A-Za-z0-9._-]{1,64}$/.test(tokens[i + 1] ?? "")) {
      return `${token} output`;
    }
  }
  return null;
}

function splitArgs(command: string): string[] {
  const tokens: string[] = [];
  let quote: "'" | '"' | null = null;
  let token = "";
  const flush = () => {
    if (token) tokens.push(token);
    token = "";
  };
  for (const ch of command) {
    if (quote) {
      if (ch === quote) quote = null;
      else token += ch;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      continue;
    }
    if (ch === " " || ch === "\n" || ch === "\t") {
      flush();
      continue;
    }
    token += ch;
  }
  flush();
  return tokens;
}
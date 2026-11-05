import { bannedCommand } from "./exam-rules.ts";
import type { ExamLedger } from "./exam-ledger.ts";
import { ipInScope } from "./exam-ledger.ts";
import { strictIpv4 } from "./scope-target.ts";

export const OUTSIDE_SCOPE = "That target is outside the exam scope.";

/** Scope first, then the exam banned-command list. An empty scope does not restrict targets. */
export function examBlock(ledger: Pick<ExamLedger, "on" | "scope">, targets: readonly string[], command: string): string | null {
  if (ledger.scope.length > 0) {
    for (const target of targets) {
      const text = target.trim();
      if (!text) continue;
      if (!ipInScope(text, ledger.scope)) return OUTSIDE_SCOPE;
    }
  }
  return bannedCommand(command, ledger.on);
}

const IPV4 = /(?:\d{1,3}\.){3}\d{1,3}/g;

/** IPv4 addresses inside arguments. Usernames and plain filenames are not targets. */
export function ipv4Targets(args: readonly string[]): string[] {
  const out: string[] = [];
  for (const arg of args) {
    if (typeof arg !== "string") continue;
    for (const match of arg.match(IPV4) ?? []) {
      const ip = strictIpv4(match);
      if (ip && !out.includes(ip)) out.push(ip);
    }
  }
  return out;
}

export function namedTargets(...values: unknown[]): string[] {
  const out: string[] = [];
  for (const value of values) {
    if (typeof value !== "string") continue;
    const text = value.trim();
    if (text && !out.includes(text)) out.push(text);
  }
  return out;
}

/** Host of an http(s) URL only, so a proxy on 127.0.0.1 is not treated as the target. */
export function urlTargets(args: readonly string[]): string[] {
  const hosts: string[] = [];
  for (const arg of args) {
    const host = /^https?:\/\/([^/:]+)/.exec(arg)?.[1];
    if (host && !hosts.includes(host)) hosts.push(host);
  }
  return hosts;
}

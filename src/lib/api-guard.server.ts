import { randomBytes } from "node:crypto";
import { networkInterfaces } from "node:os";
import { guardDecision, type GuardDenial } from "./api-guard.ts";

/**
 * Vite dev loads this module twice: the guard plugin via ssrLoadModule, and the
 * root loader via the SSR graph. A module-level `let` would mint two tokens and
 * the page would 401 its own calls. The symbol slot is one value per process.
 */
export const DESK_TOKEN_SLOT = Symbol.for("oscp.desk.token");

type TokenBag = typeof globalThis & { [DESK_TOKEN_SLOT]?: string };

/** Created once per server process. The page receives it in the first HTML, not in a cookie or a URL. */
export function deskToken(): string {
  const bag = globalThis as TokenBag;
  const existing = bag[DESK_TOKEN_SLOT];
  if (typeof existing === "string" && /^[0-9a-f]{64}$/.test(existing)) return existing;
  const minted = randomBytes(32).toString("hex");
  bag[DESK_TOKEN_SLOT] = minted;
  return minted;
}

export function deskNames(): Set<string> {
  const names = new Set<string>(["localhost", "127.0.0.1", "::1"]);
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.address) names.add(entry.address.toLowerCase());
    }
  }
  return names;
}

export function guardNodeRequest(input: {
  method: string | undefined;
  url: string | undefined;
  host: string | undefined;
  origin: string | undefined;
  contentType: string | undefined;
  token: string | undefined;
  listenPort: number;
}): GuardDenial | null {
  const path = (input.url ?? "").split("?", 1)[0] || "/";
  return guardDecision({
    method: input.method || "GET",
    path,
    host: input.host,
    origin: input.origin,
    contentType: input.contentType,
    token: input.token,
    listenPort: input.listenPort,
    names: deskNames(),
    expectedToken: deskToken(),
  });
}

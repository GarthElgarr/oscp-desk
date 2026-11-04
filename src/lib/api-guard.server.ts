import { randomBytes } from "node:crypto";
import { networkInterfaces } from "node:os";
import { guardDecision, type GuardDenial } from "./api-guard";

let token = "";

/** Created once per server process. The page receives it in the first HTML, not in a cookie or a URL. */
export function deskToken(): string {
  if (!token) token = randomBytes(32).toString("hex");
  return token;
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

import { timingSafeEqual } from "node:crypto";

/** Every desk API lives under this prefix. A new route file is covered because the check is the prefix, not a list. */
export const API_PREFIX = "/api/";

export type GuardInput = {
  method: string;
  path: string;
  host: string | undefined;
  origin: string | undefined;
  contentType: string | undefined;
  token: string | undefined;
  listenPort: number;
  names: ReadonlySet<string>;
  expectedToken: string;
};

export type GuardDenial = { status: number; body: string };

const TOKEN_BODY = "The desk token is missing or wrong.\n";
const HOST_BODY = "This request is not from the desk host.\n";
const TYPE_BODY = "This request is not JSON.\n";

export function tokensEqual(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

export function splitHost(value: string): { hostname: string; port: number | null } | null {
  const text = value.trim().toLowerCase();
  if (!text || text.includes("/") || text.includes(" ")) return null;
  if (text.startsWith("[")) {
    const end = text.indexOf("]");
    if (end <= 1) return null;
    const hostname = text.slice(1, end);
    const rest = text.slice(end + 1);
    if (!rest) return { hostname, port: null };
    if (!rest.startsWith(":")) return null;
    return { hostname, port: portOf(rest.slice(1)) };
  }
  const colon = text.lastIndexOf(":");
  if (colon === -1) return { hostname: text, port: null };
  const hostname = text.slice(0, colon);
  if (!hostname) return null;
  return { hostname, port: portOf(text.slice(colon + 1)) };
}

function portOf(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const port = Number(value);
  if (port < 1 || port > 65535) return null;
  return port;
}

function nameAllowed(hostname: string, names: ReadonlySet<string>): boolean {
  return names.has(hostname.toLowerCase());
}

function originAllowed(origin: string, names: ReadonlySet<string>, listenPort: number): boolean {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.username || url.password) return false;
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  const port = url.port ? Number(url.port) : url.protocol === "https:" ? 443 : 80;
  if (port !== listenPort) return false;
  return nameAllowed(url.hostname, names);
}

function jsonType(value: string | undefined): boolean {
  const mime = value?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  return mime === "application/json";
}

function uploadType(value: string | undefined): boolean {
  const mime = value?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  return mime === "multipart/form-data";
}

/** Null means the request may continue. The file upload is the one POST that is not JSON. */
export function guardDecision(input: GuardInput): GuardDenial | null {
  if (!input.path.startsWith(API_PREFIX) && input.path !== "/api") return null;
  const method = input.method.toUpperCase();
  if (method === "OPTIONS") return { status: 403, body: HOST_BODY };
  const host = input.host ? splitHost(input.host) : null;
  if (!host || host.port !== input.listenPort || !nameAllowed(host.hostname, input.names)) {
    return { status: 403, body: HOST_BODY };
  }
  if (input.origin !== undefined && input.origin !== "" && !originAllowed(input.origin, input.names, input.listenPort)) {
    return { status: 403, body: HOST_BODY };
  }
  if (method === "POST" || method === "PUT" || method === "PATCH") {
    const upload = method === "POST" && input.path === "/api/upload";
    if (upload ? !uploadType(input.contentType) : !jsonType(input.contentType)) {
      return { status: 415, body: TYPE_BODY };
    }
  }
  if (!tokensEqual(input.token ?? "", input.expectedToken)) return { status: 401, body: TOKEN_BODY };
  return null;
}

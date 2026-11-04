let memory = "";

type DeskWindow = Window & { __DESK_TOKEN?: string };

export function setDeskToken(value: string) {
  if (typeof value === "string" && value) memory = value;
}

export function readDeskToken(): string {
  if (memory) return memory;
  if (typeof window === "undefined") return "";
  const fromPage = (window as DeskWindow).__DESK_TOKEN;
  if (typeof fromPage === "string" && fromPage) memory = fromPage;
  return memory;
}

/** Same-origin fetch that attaches the desk token. Do not set Content-Type here when the body is a file. */
export function deskFetch(input: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  const token = readDeskToken();
  if (token) headers.set("x-desk-token", token);
  return fetch(input, { ...init, headers });
}

import { deskFetch } from "./desk-fetch.ts";
import { nmapName } from "./nmap-scan.ts";

export type ReportWindow = {
  opener: unknown;
  document: {
    open: () => void;
    write: (html: string) => void;
    close: () => void;
    querySelector: (selector: string) => { textContent: string | null } | null;
  };
};

/** The HTML report URL. The token stays in the request header, never in this path. */
export function nmapHtmlPath(name: string): string | null {
  const safe = nmapName(name);
  if (!safe) return null;
  return `/api/nmap?name=${encodeURIComponent(safe)}&html=1`;
}

export async function loadNmapReport(
  name: string,
  fetchImpl: (input: string, init?: RequestInit) => Promise<Response> = deskFetch,
): Promise<{ html: string } | { error: string }> {
  const path = nmapHtmlPath(name);
  if (!path) return { error: "That scan name is not valid." };
  let response: Response;
  try {
    response = await fetchImpl(path);
  } catch {
    return { error: "The report did not open. Try again." };
  }
  if (!response.ok) {
    const text = (await response.text()).trim();
    return { error: text || "The report did not open." };
  }
  return { html: await response.text() };
}

const REPORT_CSP = `<meta http-equiv="Content-Security-Policy" content="script-src 'none'">`;

function writeError(popup: ReportWindow, message: string) {
  popup.document.open();
  popup.document.write(`<!doctype html><head>${REPORT_CSP}<title>Nmap report</title></head><pre></pre>`);
  popup.document.close();
  const pre = popup.document.querySelector("pre");
  if (pre) pre.textContent = message;
}

/** Fetch the saved report with the desk token and write it into a window opened from the click. */
export async function presentNmapReport(
  name: string,
  popup: ReportWindow | null,
  fetchImpl?: (input: string, init?: RequestInit) => Promise<Response>,
): Promise<string | null> {
  if (!popup) return "The browser blocked the report window.";
  popup.opener = null;
  const loaded = await loadNmapReport(name, fetchImpl);
  if ("error" in loaded) {
    writeError(popup, loaded.error);
    return loaded.error;
  }
  popup.document.open();
  popup.document.write(loaded.html);
  popup.document.close();
  return null;
}

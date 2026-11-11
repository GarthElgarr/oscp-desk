import assert from "node:assert/strict";
import test from "node:test";
import { nmapHtmlPath, presentNmapReport, type ReportWindow } from "./nmap-report.ts";

function popup(): { view: ReportWindow; written: () => string; shownError: () => string; opener: () => unknown } {
  const state = { written: "", errorText: "", opener: { token: "desk" } as unknown };
  const view: ReportWindow = {
    get opener() {
      return state.opener;
    },
    set opener(value: unknown) {
      state.opener = value;
    },
    document: {
      open() {},
      write(html: string) {
        state.written = html;
      },
      close() {},
      querySelector() {
        return {
          get textContent() {
            return state.errorText;
          },
          set textContent(value: string | null) {
            state.errorText = value ?? "";
          },
        };
      },
    },
  };
  return { view, written: () => state.written, shownError: () => state.errorText, opener: () => state.opener };
}

test("the nmap HTML report is loaded through the API path and the token stays out of the URL", async () => {
  const path = nmapHtmlPath("lab");
  assert.equal(path, "/api/nmap?name=lab&html=1");
  assert.equal(path?.includes("token"), false);
  assert.equal(nmapHtmlPath("../scans/other"), null);
  let seen = "";
  const opened = popup();
  const error = await presentNmapReport("lab", opened.view, async (input) => {
    seen = input;
    return new Response("<html><title>lab</title></html>", { status: 200 });
  });
  assert.equal(error, null);
  assert.equal(opened.opener(), null);
  assert.equal(seen, "/api/nmap?name=lab&html=1");
  assert.match(opened.written(), /<title>lab<\/title>/);
});

test("a refused nmap report shows the API error instead of a blank window", async () => {
  const opened = popup();
  const error = await presentNmapReport("lab", opened.view, async () => new Response("The desk token is missing or wrong.\n", { status: 401 }));
  assert.match(error ?? "", /desk token/);
  assert.match(opened.shownError(), /desk token/);
  const invalid = await presentNmapReport("../etc/passwd", opened.view, async () => {
    throw new Error("should not fetch");
  });
  assert.match(invalid ?? "", /not valid/);
});

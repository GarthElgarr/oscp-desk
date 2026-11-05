import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AD_HOUR_STEPS } from "./ad-hour.ts";
import { AdHourSteps } from "./ad-hour-view.ts";

test("every AD hour step has a copy button", () => {
  const html = renderToStaticMarkup(
    createElement(AdHourSteps, {
      subnet: "10.10.10.0/24",
      dc: "10.10.10.5",
      user: "exam",
      domain: "exam.local",
      password: "ExamPass1",
      hash: "",
      share: "Scripts",
      examOn: true,
    }),
  );
  const buttons = html.match(/<button\b[^>]*>/g) ?? [];
  assert.equal(buttons.length, AD_HOUR_STEPS.length);
  assert.equal((html.match(/>Copy</g) ?? []).length, AD_HOUR_STEPS.length);
  assert.equal(buttons.some((button) => /\sdisabled(?:[\s=]|>)/.test(button)), false);
  assert.match(html, /nxc smb 10\.10\.10\.0\/24/);
  assert.equal(html.includes("<pre class=\"mt-2"), false);
});

import assert from "node:assert/strict";
import test from "node:test";
import { peasBytesOk, peasHostOk } from "./peas.ts";

test("only the GitHub release hosts are accepted", () => {
  assert.equal(peasHostOk("https://github.com/peass-ng/PEASS-ng/releases/latest/download/linpeas.sh"), true);
  assert.equal(peasHostOk("https://objects.githubusercontent.com/github-production-release-asset-1/linpeas.sh"), true);
  assert.equal(peasHostOk("https://example.com/linpeas.sh"), false);
  assert.equal(peasHostOk("http://github.com/linpeas.sh"), false);
});

test("an HTML page is not saved as linpeas or winpeas", () => {
  const html = new TextEncoder().encode("<!DOCTYPE html><html>");
  assert.equal(peasBytesOk("linpeas.sh", 9000, html), false);
  assert.equal(peasBytesOk("winPEASx64.exe", 9000, html), false);
  const script = new Uint8Array(80);
  script[0] = 0x23;
  assert.equal(peasBytesOk("linpeas.sh", 9000, script), true);
  const exe = new Uint8Array(80);
  exe[0] = 0x4d;
  exe[1] = 0x5a;
  assert.equal(peasBytesOk("winPEASx64.exe", 9000, exe), true);
  assert.equal(peasBytesOk("linpeas.sh", 20, script), false);
});

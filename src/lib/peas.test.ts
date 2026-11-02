import assert from "node:assert/strict";
import test from "node:test";
import { peasBytesOk, peasHostOk, pickAsset } from "./peas.ts";

test("only the GitHub release hosts are accepted", () => {
  assert.equal(peasHostOk("https://github.com/peass-ng/PEASS-ng/releases/latest/download/linpeas.sh"), true);
  assert.equal(peasHostOk("https://objects.githubusercontent.com/github-production-release-asset-1/linpeas.sh"), true);
  assert.equal(peasHostOk("https://api.github.com/repos/jpillora/chisel/releases/latest"), true);
  assert.equal(peasHostOk("https://example.com/linpeas.sh"), false);
  assert.equal(peasHostOk("http://github.com/linpeas.sh"), false);
});

test("an HTML page is not saved as a transfer file", () => {
  const html = new TextEncoder().encode("<!DOCTYPE html><html>");
  assert.equal(peasBytesOk("linpeas.sh", 9000, html), false);
  assert.equal(peasBytesOk("winPEASx64.exe", 9000, html), false);
  assert.equal(peasBytesOk("chisel", 9000, html), false);
  const script = new Uint8Array(80);
  script[0] = 0x23;
  assert.equal(peasBytesOk("linpeas.sh", 9000, script), true);
  const exe = new Uint8Array(80);
  exe[0] = 0x4d;
  exe[1] = 0x5a;
  assert.equal(peasBytesOk("chisel.exe", 9000, exe), true);
  assert.equal(peasBytesOk("agent.exe", 9000, exe), true);
  const elf = new Uint8Array(80);
  elf.set([0x7f, 0x45, 0x4c, 0x46]);
  assert.equal(peasBytesOk("chisel", 9000, elf), true);
  assert.equal(peasBytesOk("agent", 9000, elf), true);
  assert.equal(peasBytesOk("linpeas.sh", 20, script), false);
});

test("release assets are the 64-bit client or agent, not the proxy", () => {
  const chisel = ["chisel_1.12.0_linux_amd64.gz", "chisel_1.12.0_windows_amd64.zip", "chisel_1.12.0_linux_arm64.gz"];
  assert.equal(pickAsset(chisel, "^chisel_[0-9][0-9.]*_linux_amd64\\.gz$"), "chisel_1.12.0_linux_amd64.gz");
  assert.equal(pickAsset(chisel, "^chisel_[0-9][0-9.]*_windows_amd64\\.zip$"), "chisel_1.12.0_windows_amd64.zip");
  const ligolo = ["ligolo-ng_agent_0.9.2_linux_amd64.tar.gz", "ligolo-ng_proxy_0.9.2_linux_amd64.tar.gz", "ligolo-ng_agent_0.9.2_windows_amd64.zip"];
  assert.equal(pickAsset(ligolo, "^ligolo-ng_agent_[0-9][0-9.]*_linux_amd64\\.tar\\.gz$"), "ligolo-ng_agent_0.9.2_linux_amd64.tar.gz");
  assert.equal(pickAsset(ligolo, "^ligolo-ng_agent_[0-9][0-9.]*_linux_386\\.tar\\.gz$"), null);
});

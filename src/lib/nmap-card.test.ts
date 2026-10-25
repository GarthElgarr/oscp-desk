import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deskCard, deskCardHref } from "./nmap-card.ts";
import { nmapReportHtml } from "./nmap-html.ts";

describe("deskCard", () => {
  it("links a port and a renamed service to the service card", () => {
    assert.equal(deskCard("22", "ssh")?.id, "svc-ssh");
    assert.equal(deskCard("2222", "ssh")?.title, "SSH and private keys");
    assert.equal(deskCard("443", "", "ssl")?.id, "svc-https");
    assert.equal(deskCard("445", "microsoft-ds")?.section, "Services");
    assert.equal(deskCard("1", "unknown"), null);
  });
});

describe("nmapReportHtml", () => {
  it("puts a desk link on an open SSH port", () => {
    const xml = `<?xml version="1.0"?><nmaprun><host><status state="up"/><address addr="10.10.10.10" addrtype="ipv4"/><ports><port protocol="tcp" portid="22"><state state="open"/><service name="ssh" product="OpenSSH" version="8.2"/></port><port protocol="tcp" portid="1"><state state="closed"/></port></ports></host></nmaprun>`;
    const html = nmapReportHtml(xml, "lab");
    assert.match(html, /card=svc-ssh/);
    assert.match(html, /Open the SSH and private keys card/);
    assert.doesNotMatch(html, /card=svc-odd/);
  });
});

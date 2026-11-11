import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deskCard } from "./nmap-card.ts";
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

  it("renders hostile XML as text and allows no scripts", () => {
    const xml = `<?xml version="1.0"?><nmaprun><host><status state="up"/><address addr="10.10.10.5" addrtype="ipv4"/><ports><port protocol="tcp" portid="80"><state state="open"/><service name="http" product="&lt;script&gt;alert(1)&lt;/script&gt;&quot;&gt;&lt;script src=https://evil.example/a.js&gt;&lt;/script&gt;"/></port></ports></host></nmaprun>`;
    const html = nmapReportHtml(xml, "lab");
    assert.match(html, /script-src 'none'/);
    assert.equal(html.match(/<script\b/gi), null);
    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.match(html, /10\.10\.10\.5/);
  });
});

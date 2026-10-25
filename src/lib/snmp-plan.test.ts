import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseSnmpOutput } from "./snmp-plan.ts";

describe("parseSnmpOutput", () => {
  it("reads onesixtyone communities", () => {
    const view = parseSnmpOutput("Scanning 1 hosts, 4 communities\n10.10.10.10 [public] Linux server 3.2\n10.10.10.10 [private] Hardware: Intel64\n");
    assert.equal(view.kind, "onesixtyone");
    assert.deepEqual(
      view.hits.map((hit) => hit.community),
      ["public", "private"],
    );
  });

  it("turns a numeric walk into system, interface, and SSID rows", () => {
    const view = parseSnmpOutput(`
iso.3.6.1.2.1.1.1.0 = STRING: "Linux lab"
iso.3.6.1.2.1.1.5.0 = STRING: "web01"
iso.3.6.1.2.1.2.2.1.2.2 = STRING: eth0
iso.3.6.1.2.1.2.2.1.8.2 = INTEGER: up(1)
1.2.840.10036.1.1.1.9.3 = STRING: "CorpWiFi"
1.3.6.1.4.1.14179.2.2.1.4.1 = STRING: "Guest"
`);
    assert.equal(view.kind, "walk");
    assert.equal(view.system.find((row) => row.name === "sysName")?.value, "web01");
    assert.equal(view.interfaces[0]?.name, "eth0");
    assert.match(view.interfaces[0]?.value ?? "", /up/);
    assert.deepEqual(
      view.ssids.map((row) => row.ssid),
      ["CorpWiFi", "Guest"],
    );
    assert.equal(view.ssids[1]?.where, "Cisco");
  });
});

import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import test, { type TestContext } from "node:test";
import { nmapHttp } from "./nmap-scan.server.ts";
import { testTmp } from "./test-tmp.ts";

function scoped(t: TestContext): string {
  const root = testTmp(t, "oscp-nmap-flag-");
  mkdirSync(path.join(root, "data"));
  writeFileSync(
    path.join(root, "data", "exam-ledger.json"),
    JSON.stringify({
      on: true,
      startedAt: 0,
      meterpreterHost: "",
      scope: ["10.10.10.0/24"],
      hosts: [],
      msf: [],
      audit: [],
    }),
  );
  return root;
}

const refused = [
  "--iR=0",
  "--iR 5",
  "--iL=/etc/hosts",
  "--iL /etc/hosts",
  "-i/etc/hosts",
  "-iL=/x",
  "--oS=/tmp/x",
  "--oN=/tmp/x",
  "-oM=/tmp/x",
  "-oMx.txt",
  "-opackage.json",
  "-o package.json",
  "--append-output",
  "--script-args=newtargets",
  "--script targets-asn",
  "--script broadcast-dhcp-discover",
  "-Fi/etc/hosts",
  "-4i/etc/hosts",
  "-ni/x",
  "-Ri/x",
  "-4o/tmp/x",
  "-Fo/tmp/x",
  "-Fopackage.json",
  "--input-file=/etc/hosts",
  "--output=/tmp/x",
];

test("nmap custom flags cannot read a host list or add targets while the exam lock is on", (t) => {
  const root = scoped(t);
  for (const extra of refused) {
    let started = false;
    const response = nmapHttp(
      { id: "nmap-flag", profile: "custom", target: "10.10.10.5", name: "box", extra },
      () => {
        started = true;
        return true;
      },
      root,
    );
    assert.equal(response.status, 400, extra);
    assert.equal(started, false, extra);
  }
  for (const extra of ["-F", "-Pn", "-sC -sV", "-sC -sV -p-", "--script http-title", "--script=http-title"]) {
    let started = false;
    const response = nmapHttp(
      { id: "nmap-ok", profile: "custom", target: "10.10.10.5", name: "box", extra },
      () => {
        started = true;
        return true;
      },
      root,
    );
    assert.equal(response.status, 200, extra);
    assert.equal(started, true, extra);
  }
});

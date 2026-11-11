import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { AD_MODES, adPlan, type AdInput, type AdMode } from "./ad-plan.ts";
import { quoteHydraArg } from "./hydra-args.ts";
import { IMPACKET_MODES, impacketPlan, type ImpacketInput, type ImpacketMode } from "./impacket-plan.ts";
import { startImpacket } from "./impacket.server.ts";
import { removeJob } from "./live-jobs.server.ts";
import { redactStoredCommand } from "./redact-command.ts";

const SECRETS = ["NOTREAL", "NOT:REAL", "NOT REAL", "N0t@Real", "NOT%REAL", "1234"] as const;

function impacketInput(mode: ImpacketMode, secret: string): ImpacketInput {
  return {
    mode,
    host: "10.10.10.5",
    domain: "corp.local",
    user: "alice",
    password: secret,
    hash: mode === "ticketer" ? "b".repeat(32) : "",
    dc: "10.10.10.5",
    remoteCommand: "whoami",
    share: "share",
    file: "/tmp/a.txt",
    file2: "/tmp/b.txt",
    file3: "",
    spn: "cifs/dc.corp.local",
    impersonate: "Administrator",
    sid: "S-1-5-21-1-2-3",
    usersFile: "/tmp/users.txt",
    computer: mode === "rbcd" ? "HELP$" : "HELP",
    delegateTo: "DC$",
    keyName: "HKLM\\SOFTWARE",
    newPass: secret,
    kerberos: false,
    ntlmOnly: false,
    hashcat: false,
    action: "read",
  };
}

function adInput(mode: AdMode, secret: string): AdInput {
  return {
    mode,
    domain: "corp.local",
    user: "alice",
    password: secret,
    hash: "",
    dc: "10.10.10.5",
    usersFile: "/tmp/users.txt",
    passwordFile: "/tmp/pass.txt",
    ca: "corp-CA",
    template: "User",
    upn: "administrator@corp.local",
    pfx: "/tmp/a.pfx",
    pfxPass: secret,
    account: "bob",
    kerberos: false,
  };
}

function staysVisible(real: string, stored: string, mode: string) {
  for (const part of ["10.10.10.5", "corp.local", "alice", "-dc-ip"]) {
    if (real.includes(part)) assert.ok(stored.includes(part), `${mode} hid ${part}`);
  }
}

test("every Impacket and AD mode stores the password as stars", () => {
  for (const secret of SECRETS) {
    for (const mode of IMPACKET_MODES) {
      const plan = impacketPlan(impacketInput(mode, secret));
      assert.ok(!("error" in plan), `${mode} ${secret} ${"error" in plan ? plan.error : ""}`);
      if ("error" in plan) continue;
      assert.equal(plan.command, [plan.bin, ...plan.args.map(quoteHydraArg)].join(" "), `${mode} copy box`);
      assert.equal(plan.display.includes(secret), false, `${mode} stored ${secret}: ${plan.display}`);
      if (mode === "ticketer") assert.equal(plan.display.includes("b".repeat(32)), false, "ticketer stored the hash");
      if (plan.args.some((arg) => arg.includes(secret))) assert.ok(plan.command.includes(secret), `${mode} copy box dropped ${secret}`);
      staysVisible(plan.command, plan.display, `impacket ${mode}`);
    }
    for (const mode of AD_MODES) {
      const plan = adPlan(adInput(mode, secret));
      assert.ok(!("error" in plan), `${mode} ${secret} ${"error" in plan ? plan.error : ""}`);
      if ("error" in plan) continue;
      assert.equal(plan.command, [plan.bin, ...plan.args.map(quoteHydraArg)].join(" "), `${mode} copy box`);
      assert.equal(plan.display.includes(secret), false, `${mode} stored ${secret}: ${plan.display}`);
      if (plan.args.some((arg) => arg.includes(secret))) assert.ok(plan.command.includes(secret), `${mode} copy box dropped ${secret}`);
      staysVisible(plan.command, plan.display, `ad ${mode}`);
    }
  }
});

test("a quoted smbclient password and a kerbrute spray with a space are masked", () => {
  const smb = redactStoredCommand("smbclient //10.10.10.5/share -U 'user%NOT REAL'");
  assert.equal(smb.includes("NOT REAL"), false);
  assert.match(smb, /-U 'user%\*\*\*\*'/);
  assert.match(smb, /10\.10\.10\.5/);
  const spray = redactStoredCommand("kerbrute passwordspray -d corp.local --dc 10.10.10.5 /tmp/users.txt 'NOT REAL'");
  assert.equal(spray.includes("NOT REAL"), false);
  assert.match(spray, /\/tmp\/users\.txt '\*\*\*\*'/);
  assert.match(spray, /corp\.local/);
  const changed = redactStoredCommand("impacket-changepasswd corp.local/alice:NOT:REAL@10.10.10.5 -newpass 'NOT REAL' -aesKey N0t@Real");
  assert.equal(changed.includes("NOT:REAL"), false);
  assert.equal(changed.includes("NOT REAL"), false);
  assert.equal(changed.includes("N0t@Real"), false);
  assert.match(changed, /corp\.local\/alice:\*\*\*\*@10\.10\.10\.5/);
  assert.match(changed, /-newpass \*\*\*\*/);
  assert.match(changed, /-aesKey \*\*\*\*/);
});

test("a live getTGT run does not write the password into scans/runs.json", async () => {
  const secret = "NOTREAL";
  const plan = impacketPlan(impacketInput("gettgt", secret));
  assert.ok(!("error" in plan));
  if ("error" in plan) return;
  const id = "gettgt-store";
  const file = path.resolve(process.cwd(), "scans", "runs.json");
  const before = existsSync(file) ? readFileSync(file, "utf8") : "";
  const had = before.includes(secret);
  removeJob(id);
  try {
    assert.equal(startImpacket(id, plan.bin, plan.args, plan.display), true);
    await new Promise((resolve) => setTimeout(resolve, 900));
    const body = readFileSync(file, "utf8");
    const saved = JSON.parse(body) as { id?: string }[];
    const job = saved.find((row) => row.id === id);
    assert.ok(job, "gettgt run was not stored");
    assert.equal(JSON.stringify(job).includes(secret), false, JSON.stringify(job));
    if (!had) assert.equal(body.includes(secret), false);
  } finally {
    removeJob(id);
    await new Promise((resolve) => setTimeout(resolve, 700));
  }
});

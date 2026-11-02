import assert from "node:assert/strict";
import test from "node:test";
import { adPlan } from "./ad-plan.ts";

const base = {
  domain: "corp.local",
  user: "alice",
  password: "Secret!23",
  hash: "",
  dc: "10.10.10.10",
  usersFile: "/tmp/users.txt",
  passwordFile: "/tmp/pass.txt",
  ca: "corp-CA",
  template: "User",
  upn: "administrator@corp.local",
  pfx: "/tmp/administrator.pfx",
  pfxPass: "",
  account: "bob",
  kerberos: false,
};

test("BloodHound All writes a zip with the password", () => {
  const plan = adPlan({ ...base, mode: "bh-all" });
  assert.ok(!("error" in plan));
  assert.equal(plan.command, "bloodhound-python -u alice -p 'Secret!23' -d corp.local -ns 10.10.10.10 -c All --zip");
});

test("Certipy find uses user@domain and the NT hash", () => {
  const plan = adPlan({ ...base, mode: "cert-find", password: "", hash: "a".repeat(32) });
  assert.ok(!("error" in plan));
  assert.match(plan.command, /^certipy find -u alice@corp\.local -hashes :a{32} -dc-ip 10\.10\.10\.10 -vulnerable -stdout$/);
});

test("Kerbrute spray is one password against a name list", () => {
  const plan = adPlan({ ...base, mode: "kb-spray" });
  assert.ok(!("error" in plan));
  assert.equal(plan.bin, "kerbrute");
  assert.deepEqual(plan.args.slice(0, 2), ["passwordspray", "-d"]);
  assert.equal(plan.args.at(-1), "Secret!23");
});

test("a missing DC is not a scan", () => {
  const plan = adPlan({ ...base, mode: "kb-users", dc: "" });
  assert.ok("error" in plan);
});

import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { AD_MODES, adPlan, type AdInput, type AdMode } from "./ad-plan.ts";
import { quoteHydraArg } from "./hydra-args.ts";
import { removeUpload, saveUpload } from "./uploads.server.ts";

const filled: AdInput = {
  mode: "bh-all",
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

/** What a filled form must produce. This is the command the Copy button shows. */
const EXPECTED: Record<AdMode, { bin: string; includes: string[] }> = {
  "bh-all": { bin: "bloodhound-python", includes: ["-c", "All", "--zip"] },
  "bh-dc": { bin: "bloodhound-python", includes: ["-c", "DCOnly", "--zip"] },
  "bh-session": { bin: "bloodhound-python", includes: ["-c", "Session", "--zip"] },
  "cert-find": { bin: "certipy-ad", includes: ["find", "-vulnerable", "-stdout"] },
  "cert-bh": { bin: "certipy-ad", includes: ["find", "-bloodhound"] },
  "cert-req": { bin: "certipy-ad", includes: ["req", "-template", "User", "-upn", "administrator@corp.local"] },
  "cert-auth": { bin: "certipy-ad", includes: ["auth", "-pfx", "/tmp/administrator.pfx"] },
  "cert-shadow": { bin: "certipy-ad", includes: ["shadow", "auto", "-account", "bob"] },
  "kb-users": { bin: "kerbrute", includes: ["userenum", "/tmp/users.txt"] },
  "kb-spray": { bin: "kerbrute", includes: ["passwordspray", "Secret!23"] },
  "kb-user": { bin: "kerbrute", includes: ["bruteuser", "/tmp/pass.txt", "alice"] },
};

test("every AD tool builds a command a person can copy, and Run uses that same command", () => {
  for (const mode of AD_MODES) {
    const plan = adPlan({ ...filled, mode });
    assert.ok(!("error" in plan), `${mode} should build`);
    if ("error" in plan) continue;
    const want = EXPECTED[mode];
    assert.equal(plan.bin, want.bin, mode);
    for (const part of want.includes) assert.ok(plan.args.includes(part), `${mode} is missing ${part}`);
    assert.ok(plan.why.length > 40, `${mode} does not explain what the output means`);
    assert.ok(plan.note.length > 10, `${mode} does not say what to do next`);
    assert.equal(plan.command.includes("\n"), false);
    assert.equal(plan.command, [plan.bin, ...plan.args.map(quoteHydraArg)].join(" "), `${mode} Copy is not the command Run would send`);
    if (mode === "kb-users") assert.equal(plan.args.includes(filled.password), false);
  }
});

test("an empty form explains the missing field instead of building a command", () => {
  const plan = adPlan({ ...filled, mode: "bh-all", dc: "", user: "", domain: "", password: "" });
  assert.ok("error" in plan);
  assert.match(plan.error, /DC IP/);
});

test("a password that looks like a flag is refused", () => {
  const plan = adPlan({ ...filled, mode: "kb-spray", password: "-debug" });
  assert.ok("error" in plan);
});

test("deleting a transfer file removes it, and a path outside the folder is refused", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "oscp-desk-use-"));
  const previous = process.env.OSCP_UPLOADS;
  process.env.OSCP_UPLOADS = dir;
  try {
    const saved = await saveUpload("linpeas.sh", Buffer.from("echo hi\n"));
    assert.ok(!("error" in saved));
    const removed = await removeUpload("linpeas.sh");
    assert.ok(!("error" in removed));
    const again = await removeUpload("linpeas.sh");
    assert.ok("error" in again);
    const outside = await removeUpload("../etc/passwd");
    assert.ok("error" in outside);
    await writeFile(path.join(dir, "keep.txt"), "stay");
    const sneaky = await removeUpload("keep.txt/../../etc/passwd");
    assert.ok("error" in sneaky);
    const still = await removeUpload("keep.txt");
    assert.ok(!("error" in still));
  } finally {
    if (previous === undefined) delete process.env.OSCP_UPLOADS;
    else process.env.OSCP_UPLOADS = previous;
    await rm(dir, { recursive: true, force: true });
  }
});

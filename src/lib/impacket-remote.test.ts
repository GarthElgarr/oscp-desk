import assert from "node:assert/strict";
import test from "node:test";
import { impacketPlan, impacketRunBody, type ImpacketInput, type ImpacketMode } from "./impacket-plan.ts";
import { impacketRequest } from "./impacket.server.ts";

const EXEC: ImpacketMode[] = ["psexec", "wmiexec", "smbexec", "atexec"];

function form(mode: ImpacketMode): ImpacketInput {
  return {
    mode,
    host: "10.10.10.5",
    domain: "corp.local",
    user: "user",
    password: "NOTREAL",
    hash: "",
    dc: "10.10.10.5",
    remoteCommand: "whoami",
    share: "",
    file: "",
    file2: "",
    file3: "",
    spn: "",
    impersonate: "Administrator",
    sid: "",
    usersFile: "",
    computer: "",
    delegateTo: "",
    keyName: "",
    newPass: "",
    kerberos: false,
    ntlmOnly: false,
    hashcat: false,
    action: "read",
  };
}

test("psexec, wmiexec, smbexec, and atexec run the remote command, not the displayed line", () => {
  for (const mode of EXEC) {
    const input = form(mode);
    const plan = impacketPlan(input);
    assert.ok(!("error" in plan), `${mode} ${"error" in plan ? plan.error : ""}`);
    if ("error" in plan) continue;
    const flags: string[] = [];
    const body = impacketRunBody(input, flags);
    assert.equal("command" in body, false, `${mode} body still sends command`);
    assert.equal(body.remoteCommand, "whoami");
    const started = impacketRequest(body);
    assert.ok(!("error" in started), `${mode} ${"error" in started ? started.error : ""}`);
    if ("error" in started) continue;
    assert.equal(started.args.at(-1), "whoami", `${mode} argv does not end with the remote command`);
    assert.equal(
      started.args.some((arg) => arg.includes("impacket-")),
      false,
      `${mode} argv includes the tool name: ${started.args.join(" | ")}`,
    );
    assert.equal(
      started.args.some((arg) => arg.includes("****")),
      false,
      `${mode} argv includes the masked display: ${started.args.join(" | ")}`,
    );
    assert.ok(started.args.some((arg) => arg.includes("user:NOTREAL@10.10.10.5")), `${mode} dropped the real password`);
    assert.match(plan.display, /impacket-/);
    assert.match(plan.display, /\*\*\*\*/);
  }
});

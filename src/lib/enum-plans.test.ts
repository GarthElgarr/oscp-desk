import assert from "node:assert/strict";
import test from "node:test";
import { adHourCommand } from "./ad-hour.ts";
import { bofSteps } from "./bof-plan.ts";
import { dirsearchPlan } from "./dirsearch-plan.ts";
import { ffufPlan, FFUF_LISTS } from "./ffuf-plan.ts";
import { nxcGuard, nxcTarget, nxcUnknownFlag } from "./nxc-plan.ts";
import { smbEnumPlan } from "./smb-enum-plan.ts";
import { sqliPlan } from "./sqli-plan.ts";
import { CLIENT_NOTES, clientCommand } from "./client-side.ts";
import { hostOrIp, finishCommand } from "./scope-target.ts";
import { transferBundle } from "./transfer-plan.ts";
import { STANDARD_UPLOADS } from "./peas.ts";

const ffufBase = {
  mode: "dir" as const,
  target: "10.10.10.10",
  port: "80",
  https: false,
  wordlist: FFUF_LISTS.dirs,
  extensions: "php,txt",
  vhost: "exam.local",
  filters: { fc: "404", fs: "", fw: "" },
  threads: "40",
  rate: "80",
  examOn: true,
};

test("a leading zero is not a target", () => {
  assert.equal(hostOrIp("192.168.001.010"), null);
  assert.equal(hostOrIp("10.10.10.10"), "10.10.10.10");
  assert.equal(nxcTarget("10.10.10.0/16"), null);
  assert.equal(nxcTarget("10.10.10.0/24"), "10.10.10.0/24");
});

test("ffuf stays inside the caps and the wordlist roots", () => {
  const plan = ffufPlan(ffufBase);
  assert.ok("command" in plan);
  if ("command" in plan) {
    assert.match(plan.command, /^ffuf /);
    assert.match(plan.command, /-t 40/);
    assert.match(plan.command, /-rate 80/);
    assert.equal(plan.command.includes("/etc/"), false);
  }
  assert.ok("error" in ffufPlan({ ...ffufBase, threads: "400" }));
  assert.ok("error" in ffufPlan({ ...ffufBase, wordlist: "/tmp/list.txt" }));
  const vhost = ffufPlan({ ...ffufBase, mode: "vhost", filters: { fc: "", fs: "4242", fw: "" } });
  assert.ok("command" in vhost);
});

test("feroxbuster keeps the directory template and a relative output", () => {
  const plan = dirsearchPlan({
    tool: "feroxbuster",
    mode: "dir",
    target: "10.10.10.10",
    port: "80",
    https: false,
    wordlist: FFUF_LISTS.dirs,
    extensions: "php,html,txt,bak,old",
    status: "200,301",
    threads: "40",
    outfile: "ferox.txt",
    examOn: true,
  });
  assert.ok("command" in plan);
  if ("command" in plan) {
    assert.match(plan.command, /^feroxbuster /);
    assert.match(plan.command, /-o scans\/ferox\.txt/);
    assert.match(plan.command, /-C 404/);
  }
  assert.ok("error" in dirsearchPlan({
    tool: "gobuster",
    mode: "dir",
    target: "10.10.10.10",
    port: "80",
    https: false,
    wordlist: FFUF_LISTS.common,
    extensions: "",
    status: "200",
    threads: "10",
    outfile: "/tmp/out.txt",
    examOn: true,
  }));
});

test("nxc refuses coerce while the exam lock is on", () => {
  assert.match(nxcGuard("nxc smb 10.10.10.10 -M coerce_plus", true) ?? "", /coerce/i);
  assert.equal(nxcGuard("nxc smb 10.10.10.10 --shares", true), null);
  assert.equal(nxcGuard("nxc smb 10.10.10.10 -M coerce_plus", false), null);
  assert.match(nxcGuard("ntlmrelayx -tf hosts", true) ?? "", /ntlmrelayx/);
  assert.equal(nxcUnknownFlag("nxc smb 10.10.10.10 -u user -p secret --shares"), null);
  assert.match(nxcUnknownFlag("nxc smb 10.10.10.10 -M coerce_plus") ?? "", /coerce/);
  assert.match(nxcUnknownFlag("nxc smb 10.10.10.10 --kerberoasting /tmp/kerb.txt") ?? "", /output/);
});

test("smb enumeration builds null and credentialed commands", () => {
  const nul = smbEnumPlan({ tool: "enum4linux-ng", auth: "null", target: "10.10.10.10", user: "", password: "", share: "", examOn: true });
  assert.ok("command" in nul);
  if ("command" in nul) assert.match(nul.command, /^enum4linux-ng -A 10\.10\.10\.10$/);
  const cred = smbEnumPlan({ tool: "smbmap", auth: "creds", target: "10.10.10.10", user: "admin", password: "secret", share: "", examOn: true });
  assert.ok("command" in cred);
  assert.ok("error" in smbEnumPlan({ tool: "rpcclient", auth: "null", target: "010.1.1.1", user: "", password: "", share: "", examOn: true }));
});

test("the transfer bundle names every client and the share copy", () => {
  const bundle = transferBundle({ host: "10.10.14.5", port: "80", file: "linpeas.sh" });
  assert.ok("lines" in bundle);
  if ("lines" in bundle) {
    assert.deepEqual(bundle.lines.map((line) => line.label), ["curl", "wget", "certutil", "iwr", "smb"]);
    assert.match(bundle.lines[2].command, /certutil/);
    assert.match(bundle.lines[4].command, /impacket-smbserver/);
  }
  assert.ok("error" in transferBundle({ host: "10.10.014.5", port: "80", file: "linpeas.sh" }));
  const names = STANDARD_UPLOADS.map((item) => item.name);
  assert.ok(names.includes("pspy64"));
  assert.ok(names.includes("GodPotato-NET4.exe"));
  assert.ok(names.includes("linpeas.sh"));
  assert.ok(names.includes("winPEASx64.exe"));
});

test("the buffer helper fills the listener and does not invent a jump", () => {
  const plan = bofSteps("10.10.14.5", "443", "260");
  assert.ok("steps" in plan);
  if ("steps" in plan) {
    const shell = plan.steps.find((step) => step.id === "shell");
    assert.match(shell?.command ?? "", /LHOST=10\.10\.14\.5/);
    assert.match(shell?.command ?? "", /shell_reverse_tcp/);
    assert.match(plan.steps.find((step) => step.id === "jmp")?.command ?? "", /mona jmp/);
  }
});

test("sqlmap is refused during the exam and the union step is manual", () => {
  const blocked = sqliPlan({ step: "sqlmap", target: "10.10.10.10", port: "80", path: "/page.php", param: "id", columns: "2", injectable: "1", table: "users", examOn: true });
  assert.ok("error" in blocked);
  if ("error" in blocked) assert.match(blocked.error, /sqlmap/);
  const union = sqliPlan({ step: "union", target: "10.10.10.10", port: "80", path: "/page.php", param: "id", columns: "3", injectable: "2", table: "users", examOn: true });
  assert.ok("command" in union);
  if ("command" in union) assert.match(union.command, /UNION SELECT NULL,VERSION\(\),NULL/);
  const error = sqliPlan({ step: "error", target: "10.10.10.10", port: "80", path: "/page.php", param: "id", columns: "2", injectable: "1", table: "users", examOn: true });
  assert.ok("command" in error);
  if ("command" in error) assert.match(error.command, /extractvalue/);
  const dump = sqliPlan({ step: "dump", target: "10.10.10.10", port: "80", path: "/page.php", param: "id", columns: "3", injectable: "2", table: "users", examOn: true });
  assert.ok("command" in dump);
  if ("command" in dump) assert.match(dump.command, /FROM users/);
  const piped = finishCommand("ffuf -u http://10.10.10.10/FUZZ | tee out", true);
  assert.ok("error" in piped);
});

test("the AD first hour starts with the given account and stays off sqlmap", () => {
  const plan = adHourCommand("nxc", { subnet: "10.10.10.0/24", dc: "10.10.10.5", user: "exam", domain: "exam.local", password: "ExamPass1", hash: "", examOn: true });
  assert.ok("command" in plan);
  if ("command" in plan) {
    assert.match(plan.command, /^nxc smb 10\.10\.10\.0\/24/);
    assert.match(plan.command, /-u exam/);
  }
  const spider = adHourCommand("spider", { subnet: "10.10.10.0/24", dc: "10.10.10.5", user: "exam", domain: "exam.local", password: "ExamPass1", hash: "", share: "Scripts", examOn: true });
  assert.ok("command" in spider);
  if ("command" in spider) assert.match(spider.command, /--spider Scripts/);
  assert.ok("error" in adHourCommand("spider", { subnet: "10.10.10.0/24", dc: "10.10.10.5", user: "exam", domain: "exam.local", password: "ExamPass1", hash: "", examOn: true }));
  const dump = adHourCommand("secrets", { subnet: "10.10.10.0/24", dc: "10.10.10.5", user: "exam", domain: "exam.local", password: "ExamPass1", hash: "", examOn: true });
  assert.ok("command" in dump);
  if ("command" in dump) assert.match(dump.command, /^impacket-secretsdump/);
  assert.ok("error" in adHourCommand("nxc", { subnet: "10.10.10.0/24", dc: "10.10.10.5", user: "-p", domain: "exam.local", password: "ExamPass1", hash: "", examOn: true }));
  assert.ok("error" in adHourCommand("nxc", { subnet: "10.10.10.0/24", dc: "10.10.10.5", user: "exam", domain: "exam.local", password: "p@ss:word", hash: "", examOn: true }));
});

test("a quote in the target does not become part of a client command", () => {
  const note = CLIENT_NOTES.find((item) => item.id === "xss-r");
  assert.ok(note);
  if (!note) return;
  const broken = clientCommand(note, "10.10.10.10'; id; echo '", "10.10.14.5");
  assert.ok("error" in broken);
  const ok = clientCommand(note, "10.10.10.10", "10.10.14.5");
  assert.ok("command" in ok);
  if ("command" in ok) {
    assert.match(ok.command, /http:\/\/10\.10\.10\.10\/search/);
    assert.equal(ok.command.includes("id"), false);
  }
  assert.ok("error" in transferBundle({ host: "10.10.14.5", port: "80", file: "../../etc/passwd" }));
  assert.ok("error" in smbEnumPlan({ tool: "smbclient", auth: "creds", target: "10.10.10.10", user: "-p", password: "secret", share: "", examOn: true }));
  assert.ok("error" in smbEnumPlan({ tool: "smbclient", auth: "creds", target: "10.10.10.10", user: "admin", password: "a%b", share: "", examOn: true }));
});

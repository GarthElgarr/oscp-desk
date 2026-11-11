import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { updateLedger } from "./exam-ledger.server.ts";
import { hydraHttp } from "./hydra.server.ts";
import { clearRunsAndLoot } from "./live-jobs.server.ts";
import { redactStoredCommand, redactStoredOutput } from "./redact-command.ts";
import { writeCommunityFile } from "./snmp.server.ts";
import { writeCrackFile } from "./run-tool.server.ts";
import { testTmp } from "./test-tmp.ts";

test("a stored hydra command with -p NOTREAL shows -p ****", () => {
  const raw = "hydra -l user -p NOTREAL ssh://10.10.10.5";
  const stored = redactStoredCommand(raw);
  assert.match(stored, /-p \*\*\*\*/);
  assert.equal(stored.includes("NOTREAL"), false);
  const echoed = redactStoredOutput(`$ ${raw}\nhydra output still has NOTREAL\n`);
  assert.match(echoed, /^\$ hydra -l user -p \*\*\*\* ssh:\/\/10\.10\.10\.5\n/);
  assert.match(echoed, /hydra output still has NOTREAL/);
  assert.equal(echoed.split("\n")[0]?.includes("NOTREAL"), false);
  assert.match(redactStoredCommand("secretsdump corp/user:NOTREAL@10.10.10.5"), /corp\/user:\*\*\*\*@10\.10\.10\.5/);
  assert.match(redactStoredCommand("secretsdump -hashes aad3b435:NOTREAL corp/user@10.10.10.5"), /-hashes \*\*\*\*/);
  assert.match(redactStoredCommand("nxc smb 10.10.10.5 -u user --password NOTREAL"), /--password \*\*\*\*/);
  assert.match(redactStoredCommand("nxc smb 10.10.10.5 -u user --password=NOTREAL"), /--password=\*\*\*\*/);
  assert.match(redactStoredCommand("nmap -sC -sV -p 22,80,443 10.10.10.5"), /-p 22,80,443/);
  assert.match(redactStoredCommand("penelope -p 4444"), /-p 4444/);
  assert.equal(redactStoredCommand("hydra -l user -p 12345 ssh://10.10.10.5").includes("12345"), false);
  assert.match(redactStoredCommand("nmap -p 12345 10.10.10.5"), /-p 12345/);
});

test("stored commands keep scan details and hide the secret", () => {
  const hash = "a".repeat(32);
  assert.match(redactStoredCommand("udp-proto-scanner.pl -p DNSStatusRequest 10.10.10.5"), /-p DNSStatusRequest/);
  assert.match(redactStoredCommand("udp-proto-scanner.pl -p snmp-public 10.10.10.5"), /-p snmp-public/);
  assert.equal(redactStoredCommand("udp-proto-scanner.pl -p NOTREAL 10.10.10.5").includes("NOTREAL"), false);
  assert.match(redactStoredCommand("searchsploit -p 503830"), /-p 503830/);
  assert.match(redactStoredCommand("wfuzz -z file,names.txt -H 'Host: FUZZ.exam.htb' -p 127.0.0.1:8080 -u http://10.10.10.5/"), /-p 127\.0\.0\.1:8080/);
  assert.match(redactStoredCommand("wfuzz -H 'Host: FUZZ.exam.htb' -u http://10.10.10.5/"), /Host: FUZZ\.exam\.htb/);
  assert.equal(redactStoredCommand("wfuzz -H 'Authorization: Bearer NOTREAL' -u http://10.10.10.5/").includes("NOTREAL"), false);
  assert.match(redactStoredCommand("smbmap -H 10.10.10.5 -u alice -p NOTREAL"), /-H 10\.10\.10\.5/);
  assert.equal(redactStoredCommand("smbmap -H 10.10.10.5 -u alice -p NOTREAL").includes("NOTREAL"), false);
  assert.equal(redactStoredCommand(`nxc smb 10.10.10.5 -u user -H ${hash}`).includes(hash), false);
  assert.match(redactStoredCommand("ldapsearch -H ldap://10.10.10.5 -x"), /ldap:\/\/10\.10\.10\.5/);
  assert.match(redactStoredCommand("docker -H tcp://127.0.0.1:2375 ps"), /tcp:\/\/127\.0\.0\.1:2375/);
  assert.equal(redactStoredCommand("ssh://alice:NOTREAL@10.10.10.5").includes("NOTREAL"), false);
  assert.match(redactStoredCommand("ssh://alice:NOTREAL@10.10.10.5"), /alice:\*\*\*\*@/);
  assert.equal(redactStoredCommand("https://alice:NOTREAL@10.10.10.5/").includes("NOTREAL"), false);
  assert.match(redactStoredCommand("smbclient //10.10.10.5/ -U alice%NOTREAL"), /-U alice%\*\*\*\*/);
  const pct = redactStoredCommand("smbclient //10.10.10.5/share -U user%NOT%REAL");
  assert.equal(pct.includes("NOT"), false, pct);
  assert.equal(pct.includes("REAL"), false, pct);
  assert.match(pct, /-U user%\*\*\*\*/);
  assert.match(pct, /10\.10\.10\.5/);
  for (const bin of [
    "impacket-GetUserSPNs",
    "impacket-GetNPUsers",
    "impacket-getTGT",
    "impacket-getST",
    "impacket-GetADUsers",
    "impacket-findDelegation",
    "impacket-addcomputer",
    "impacket-rbcd",
  ]) {
    const stored = redactStoredCommand(`${bin} user:N0t@Real -dc-ip 10.10.10.5`);
    assert.equal(stored.includes("N0t"), false, stored);
    assert.equal(stored.includes("@Real"), false, stored);
    assert.match(stored, /user:\*\*\*\*/);
    assert.match(stored, /-dc-ip 10\.10\.10\.5/);
  }
  assert.equal(redactStoredCommand("smbclient //10.10.10.5/ -U guest%"), "smbclient //10.10.10.5/ -U guest%");
  assert.equal(redactStoredCommand("echo 100%"), "echo 100%");
  assert.equal(redactStoredCommand("snmpwalk -v 2c -c NOTREAL -Oa 10.10.10.5").includes("NOTREAL"), false);
  assert.match(redactStoredCommand("snmpwalk -v 2c -c NOTREAL -Oa 10.10.10.5"), /-c \*\*\*\*/);
  const listed = redactStoredCommand("onesixtyone -c /tmp/scans/snmp-1.communities 10.10.10.5  # public, NOTREAL");
  assert.match(listed, /-c \/tmp\/scans\/snmp-1\.communities/);
  assert.equal(listed.includes("NOTREAL"), false);
  assert.equal(listed.includes("#"), false);
  assert.match(redactStoredCommand("bloodhound-python -u alice -p 'Secret!23' -d corp.local -c All --zip"), /-c All/);
  assert.equal(redactStoredCommand("bloodhound-python -u alice -p 'Secret!23' -d corp.local -c All --zip").includes("Secret"), false);
  assert.equal(redactStoredCommand("bloodhound-python -p 'Sec'\\''ret' -c All").includes("ret"), false);
  assert.match(redactStoredCommand("bloodhound-python -p 'Sec'\\''ret' -c All"), /-c All/);
  assert.equal(redactStoredCommand("certipy-ad auth -pfx /tmp/a.pfx -password NOTREAL").includes("NOTREAL"), false);
  assert.match(redactStoredCommand("certipy-ad auth -pfx /tmp/a.pfx -password NOTREAL"), /-password \*\*\*\*/);
  const spray = redactStoredCommand("kerbrute passwordspray -d corp.local --dc 10.10.10.10 /tmp/users.txt 'Secret!23'");
  assert.match(spray, /\/tmp\/users\.txt '\*\*\*\*'/);
  assert.equal(spray.includes("Secret"), false);
  assert.equal(redactStoredCommand("kerbrute passwordspray -d corp.local"), "kerbrute passwordspray -d corp.local");
  assert.match(redactStoredCommand("chisel server -p 8000 --reverse"), /-p 8000/);
  assert.match(redactStoredCommand("penelope -O -c 10.10.10.5 -p 4444"), /-c 10\.10\.10\.5 -p 4444/);
  assert.equal(redactStoredCommand("impacket-GetUserSPNs corp.local/alice:NOTREAL -dc-ip 10.10.10.5 -request").includes("NOTREAL"), false);
  assert.match(redactStoredCommand("impacket-GetUserSPNs corp.local/alice:NOTREAL -dc-ip 10.10.10.5 -request"), /corp\.local\/alice:\*\*\*\*/);
  assert.match(redactStoredCommand("impacket-secretsdump corp/user:NOTREAL@10.10.10.5"), /corp\/user:\*\*\*\*@10\.10\.10\.5/);
  assert.equal(redactStoredCommand("impacket-ticketer -nthash " + hash + " -domain-sid S-1-5-21-1-2-3 -domain corp.local alice").includes(hash), false);
  assert.match(redactStoredCommand("impacket-ticketer -nthash " + hash + " -domain-sid S-1-5-21-1-2-3 -domain corp.local alice"), /-nthash \*\*\*\*/);
  assert.equal(redactStoredCommand("chisel client 10.10.10.5:8000 R:1080:socks"), "chisel client 10.10.10.5:8000 R:1080:socks");
  assert.equal(redactStoredCommand("curl http://10.10.10.5:80/"), "curl http://10.10.10.5:80/");
});

test("the clear action leaves the readme and the exam ledger and removes the rest", (t) => {
  const root = testTmp(t, "oscp-clear-runs-");
  mkdirSync(path.join(root, "scans", "hydra"), { recursive: true });
  mkdirSync(path.join(root, "scans", "crack"), { recursive: true });
  mkdirSync(path.join(root, "scans", "wfuzz"), { recursive: true });
  mkdirSync(path.join(root, "scans", "impacket"), { recursive: true });
  mkdirSync(path.join(root, "scans", "ad"), { recursive: true });
  mkdirSync(path.join(root, "data"), { recursive: true });
  writeFileSync(path.join(root, "scans", "README.txt"), "keep\n");
  writeFileSync(path.join(root, "scans", "runs.json"), '[{"command":"hydra -p NOTREAL"}]');
  writeFileSync(path.join(root, "scans", "hydra", "loot-passwords-abc.txt"), "NOTREAL\n");
  writeFileSync(path.join(root, "scans", "crack", "h.txt"), "hash\n");
  writeFileSync(path.join(root, "scans", "wfuzz", "out.txt"), "hit\n");
  writeFileSync(path.join(root, "scans", "impacket", "user.ccache"), "ticket\n");
  writeFileSync(path.join(root, "scans", "ad", "bloodhound.zip"), "zip\n");
  writeFileSync(path.join(root, "data", "exam-ledger.json"), '{"on":false}\n');
  writeFileSync(path.join(root, "scans", "exam-ledger.json"), '{"on":false}\n');
  writeFileSync(path.join(root, "scans", "snmp-1.communities"), "NOTREAL\n");
  writeFileSync(path.join(root, "scans", "systeminfo-suggest.txt"), "NOTREAL\n");
  writeFileSync(path.join(root, "scans", "lab.nmap"), "open 22\n");
  assert.equal(clearRunsAndLoot(root, true), false);
  assert.equal(existsSync(path.join(root, "scans", "runs.json")), true);
  assert.equal(existsSync(path.join(root, "scans", "snmp-1.communities")), true);
  assert.equal(existsSync(path.join(root, "scans", "systeminfo-suggest.txt")), true);
  assert.equal(clearRunsAndLoot(root), true);
  assert.equal(existsSync(path.join(root, "scans", "runs.json")), false);
  assert.equal(existsSync(path.join(root, "scans", "hydra", "loot-passwords-abc.txt")), false);
  assert.equal(existsSync(path.join(root, "scans", "crack", "h.txt")), false);
  assert.equal(existsSync(path.join(root, "scans", "wfuzz", "out.txt")), false);
  assert.equal(existsSync(path.join(root, "scans", "impacket", "user.ccache")), false);
  assert.equal(existsSync(path.join(root, "scans", "ad", "bloodhound.zip")), false);
  assert.equal(readFileSync(path.join(root, "scans", "README.txt"), "utf8"), "keep\n");
  assert.equal(readFileSync(path.join(root, "data", "exam-ledger.json"), "utf8"), '{"on":false}\n');
  assert.equal(readFileSync(path.join(root, "scans", "exam-ledger.json"), "utf8"), '{"on":false}\n');
  assert.equal(existsSync(path.join(root, "scans", "snmp-1.communities")), false);
  assert.equal(existsSync(path.join(root, "scans", "systeminfo-suggest.txt")), false);
  assert.equal(readFileSync(path.join(root, "scans", "lab.nmap"), "utf8"), "open 22\n");
});

test("a written loot file and the exam ledger are mode 0o600", async (t) => {
  const root = testTmp(t, "oscp-private-");
  const crack = await writeCrackFile("h.txt", "NOTREAL\n", root);
  assert.ok(crack);
  assert.equal(statSync(crack).mode & 0o777, 0o600);
  assert.equal(statSync(path.join(root, "scans")).mode & 0o777, 0o700);
  assert.equal(statSync(path.join(root, "scans", "crack")).mode & 0o777, 0o700);

  const hydra = hydraHttp(
    {
      id: "hydra-mode",
      args: ["-L", "scans/hydra/loot-users-abc.txt", "-p", "NOTREAL", "10.10.10.5", "ssh"],
      lists: { users: "user\n" },
    },
    (input) => {
      assert.ok(input.args.includes("NOTREAL"));
      assert.equal(input.command.includes("NOTREAL"), false);
      assert.match(input.command, /-p '\*\*\*\*'/);
      return true;
    },
    root,
  );
  assert.equal(hydra.status, 200);
  const list = path.join(root, "scans", "hydra", "loot-users-abc.txt");
  assert.equal(statSync(list).mode & 0o777, 0o600);
  assert.equal(statSync(path.join(root, "scans", "hydra")).mode & 0o777, 0o700);

  const saved = await updateLedger({ action: "host", ip: "10.10.10.5", note: "dc" }, Date.now(), root);
  assert.equal(saved.error, undefined);
  const ledger = path.join(root, "data", "exam-ledger.json");
  assert.equal(statSync(ledger).mode & 0o777, 0o600);
  assert.equal(statSync(path.join(root, "data")).mode & 0o777, 0o700);
});

test("an SNMP community file is private and clear removes it", (t) => {
  const root = testTmp(t, "oscp-snmp-");
  const file = writeCommunityFile("snmp-1", ["public", "NOTREAL"], root);
  assert.match(file, /snmp-1\.communities$/);
  assert.equal(statSync(file).mode & 0o777, 0o600);
  assert.equal(statSync(path.join(root, "scans")).mode & 0o777, 0o700);
  assert.equal(readFileSync(file, "utf8").includes("NOTREAL"), true);
  assert.equal(clearRunsAndLoot(root), true);
  assert.equal(existsSync(file), false);
});

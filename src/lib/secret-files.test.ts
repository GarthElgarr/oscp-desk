import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { updateLedger } from "./exam-ledger.server.ts";
import { hydraHttp } from "./hydra.server.ts";
import { clearRunsAndLoot } from "./live-jobs.server.ts";
import { redactStoredCommand, redactStoredOutput } from "./redact-command.ts";
import { writeCrackFile } from "./run-tool.server.ts";
import { testTmp } from "./test-tmp.ts";

test("a stored hydra command with -p NOTREAL shows -p ****", () => {
  const stored = redactStoredCommand("hydra -l user -p NOTREAL ssh://10.10.10.5");
  assert.match(stored, /-p \*\*\*\*/);
  assert.equal(stored.includes("NOTREAL"), false);
  const echoed = redactStoredOutput(`$ ${stored}\nhydra output\n`);
  assert.equal(echoed.includes("NOTREAL"), false);
  assert.match(redactStoredCommand("secretsdump corp/user:NOTREAL@10.10.10.5"), /corp\/user:\*\*\*\*@10\.10\.10\.5/);
  assert.match(redactStoredCommand("secretsdump -hashes aad3b435:NOTREAL corp/user@10.10.10.5"), /-hashes \*\*\*\*/);
  assert.match(redactStoredCommand("nxc smb 10.10.10.5 -u user --password NOTREAL"), /--password \*\*\*\*/);
  assert.match(redactStoredCommand("nxc smb 10.10.10.5 -u user --password=NOTREAL"), /--password=\*\*\*\*/);
  assert.match(redactStoredCommand("nmap -sC -sV -p 22,80,443 10.10.10.5"), /-p 22,80,443/);
  assert.match(redactStoredCommand("penelope -p 4444"), /-p 4444/);
});

test("the clear action leaves the readme and the exam ledger and removes the rest", (t) => {
  const root = testTmp(t, "oscp-clear-runs-");
  mkdirSync(path.join(root, "scans", "hydra"), { recursive: true });
  mkdirSync(path.join(root, "scans", "crack"), { recursive: true });
  mkdirSync(path.join(root, "data"), { recursive: true });
  writeFileSync(path.join(root, "scans", "README.txt"), "keep\n");
  writeFileSync(path.join(root, "scans", "runs.json"), '[{"command":"hydra -p NOTREAL"}]');
  writeFileSync(path.join(root, "scans", "hydra", "loot-passwords-abc.txt"), "NOTREAL\n");
  writeFileSync(path.join(root, "scans", "crack", "h.txt"), "hash\n");
  writeFileSync(path.join(root, "data", "exam-ledger.json"), '{"on":false}\n');
  writeFileSync(path.join(root, "scans", "exam-ledger.json"), '{"on":false}\n');
  assert.equal(clearRunsAndLoot(root, true), false);
  assert.equal(existsSync(path.join(root, "scans", "runs.json")), true);
  assert.equal(clearRunsAndLoot(root), true);
  assert.equal(existsSync(path.join(root, "scans", "runs.json")), false);
  assert.equal(existsSync(path.join(root, "scans", "hydra", "loot-passwords-abc.txt")), false);
  assert.equal(existsSync(path.join(root, "scans", "crack", "h.txt")), false);
  assert.equal(readFileSync(path.join(root, "scans", "README.txt"), "utf8"), "keep\n");
  assert.equal(readFileSync(path.join(root, "data", "exam-ledger.json"), "utf8"), '{"on":false}\n');
  assert.equal(readFileSync(path.join(root, "scans", "exam-ledger.json"), "utf8"), '{"on":false}\n');
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
      assert.match(input.command, /-p NOTREAL/);
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

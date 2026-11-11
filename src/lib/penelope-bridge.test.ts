import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { penelopeLine, penelopeReadTransfer } from "./penelope-plan.ts";
import { testTmp } from "./test-tmp.ts";

const bridge = fileURLToPath(new URL("../../tools/penelope-bridge.py", import.meta.url));

const stub = `import sys
sys.stdout.write("READY\\n")
sys.stdout.flush()
buf = b""
while True:
    chunk = sys.stdin.buffer.read(1)
    if not chunk:
        break
    buf += chunk
    if chunk != b"\\n":
        continue
    line = buf.decode("utf-8", "replace")
    buf = b""
    if line.startswith("upload ") and "missing" in line and " -o " in line:
        sys.stdout.write("[-] No such file or directory: /home/kali/missing\\n(Penelope)> ")
    elif line.startswith("upload ") and " -o " in line:
        sys.stdout.write("[+] Uploaded '/tmp/linpeas.sh'\\n(Penelope)> ")
    elif line.startswith("download ") and " -o " in line:
        sys.stdout.write("[-] Download Failed '/root/missing'\\n(Penelope)> ")
    else:
        sys.stdout.write("[-] No such file or directory: old-syntax\\n(Penelope)> ")
    sys.stdout.flush()
`;

function command(action: "upload" | "download", local: string, remote: string): string {
  const built = penelopeLine(action, "1", local, remote);
  if ("error" in built) throw new Error(built.error);
  return built.text;
}

function watch(child: ChildProcess) {
  let output = "";
  const waiters: Array<() => void> = [];
  child.stdout?.on("data", (chunk: Buffer) => {
    output += chunk.toString("utf8");
    for (const wake of [...waiters]) wake();
  });
  return {
    text: () => output,
    until(ready: (output: string) => boolean, ms = 8000): Promise<string> {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          const at = waiters.indexOf(check);
          if (at >= 0) waiters.splice(at, 1);
          reject(new Error(`stub did not answer\n${output}`));
        }, ms);
        const check = () => {
          if (!ready(output)) return;
          clearTimeout(timer);
          const at = waiters.indexOf(check);
          if (at >= 0) waiters.splice(at, 1);
          resolve(output);
        };
        waiters.push(check);
        check();
      });
    },
  };
}

test("the bridge relays a transfer success and a transfer failure", async (t) => {
  const dir = testTmp(t, "penelope-stub-");
  const script = path.join(dir, "stub.py");
  writeFileSync(script, stub);
  const child = spawn("python3", [bridge, "python3", script], { stdio: ["pipe", "pipe", "pipe"] });
  const stderr: Buffer[] = [];
  child.stderr?.on("data", (chunk: Buffer) => stderr.push(chunk));
  t.after(() => {
    child.kill("SIGTERM");
  });
  if (!child.stdin || !child.stdout) throw new Error("the bridge has no pipes");
  const seen = watch(child);
  await seen.until((output) => output.includes("READY"));

  const upload = command("upload", "/home/kali/linpeas.sh", "/tmp/linpeas.sh");
  assert.equal(upload, "upload /home/kali/linpeas.sh -o /tmp\n");
  child.stdin.write(upload);
  const moved = await seen.until((output) => penelopeReadTransfer("", output).status !== "pending");
  assert.equal(penelopeReadTransfer("", moved).status, "success");

  const missing = command("upload", "/home/kali/missing", "/tmp/missing");
  child.stdin.write(missing);
  const refused = await seen.until((output) => penelopeReadTransfer(moved, output).status !== "pending");
  const refusedRead = penelopeReadTransfer(moved, refused);
  assert.equal(refusedRead.status, "failure");
  if (refusedRead.status === "failure") assert.match(refusedRead.message, /No such file/);

  const download = command("download", "/home/kali/proof.txt", "/root/missing");
  assert.equal(download, "download /root/missing -o /home/kali\n");
  child.stdin.write(download);
  const failed = await seen.until((output) => penelopeReadTransfer(refused, output).status !== "pending");
  const failedRead = penelopeReadTransfer(refused, failed);
  assert.equal(failedRead.status, "failure");
  if (failedRead.status === "failure") assert.match(failedRead.message, /Download Failed/);
  assert.equal(stderr.length, 0);
  child.stdin.end();
});

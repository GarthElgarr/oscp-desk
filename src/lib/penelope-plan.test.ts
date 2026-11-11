import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  PENELOPE_DETACH,
  PENELOPE_LINUX,
  PENELOPE_WAIT,
  penelopeBeats,
  penelopeInShell,
  penelopeLine,
  penelopeReadTransfer,
  penelopeTransferReturns,
  penelopeTransferTimeoutMessage,
  penelopeTransferVerdict,
  type PenelopeBeat,
} from "./penelope-plan.ts";

function writes(beats: PenelopeBeat[]): string[] {
  return beats.filter((beat) => beat.kind !== "until").map((beat) => (beat.kind === "only" ? beat.data : beat.text));
}

test("F12 is never glued to another key", () => {
  const samples = [
    penelopeBeats("upload", true, "1", "/home/kali/linpeas.sh", "/tmp/linpeas.sh"),
    penelopeBeats("download", true, "1", "/tmp/proof.txt", "/root/proof.txt"),
    penelopeBeats("detach", true, "1", "", ""),
    penelopeBeats("payloads", true, "1", "", ""),
    penelopeBeats("interact", false, "2", "", ""),
  ];
  for (const beats of samples) {
    assert.ok(!("error" in beats));
    for (const data of writes(beats)) {
      if (data.includes(PENELOPE_DETACH)) assert.equal(data, PENELOPE_DETACH);
    }
  }
});

test("upload from the shell detaches, transfers, then comes back", () => {
  const beats = penelopeBeats("upload", true, "1", "/home/kali/linpeas.sh", "/tmp/linpeas.sh");
  assert.ok(!("error" in beats));
  assert.deepEqual(writes(beats), [PENELOPE_DETACH, "upload /home/kali/linpeas.sh -o /tmp\n", "interact 1\n"]);
  const stop = beats.find((beat) => beat.kind === "until" && beat.what === "detached");
  assert.ok(stop && stop.kind === "until" && stop.stop);
});

test("upload from the menu does not send F12", () => {
  const beats = penelopeBeats("upload", false, "1", "/home/kali/linpeas.sh", "/tmp/linpeas.sh");
  assert.ok(!("error" in beats));
  assert.equal(writes(beats).includes(PENELOPE_DETACH), false);
  assert.equal(writes(beats)[0], "upload /home/kali/linpeas.sh -o /tmp\n");
});

test("upload and download use -o for the destination folder", () => {
  const upload = penelopeLine("upload", "1", "/home/kali/linpeas.sh", "/tmp/linpeas.sh");
  const download = penelopeLine("download", "1", "/home/kali/exam/loot/proof.txt", "/root/proof.txt");
  assert.equal("error" in upload, false);
  assert.equal("error" in download, false);
  if ("error" in upload || "error" in download) return;
  assert.equal(upload.text, "upload /home/kali/linpeas.sh -o /tmp\n");
  assert.equal(download.text, "download /root/proof.txt -o /home/kali/exam/loot\n");
  assert.equal(upload.text.includes("/tmp/linpeas.sh"), false);
  assert.equal(download.text.includes("/home/kali/exam/loot/proof.txt"), false);
});

test("a destination that already ends in a slash is the folder", () => {
  const upload = penelopeLine("upload", "1", "/home/kali/linpeas.sh", "/dev/shm/");
  const download = penelopeLine("download", "1", "/tmp/", "/root/proof.txt");
  assert.ok(!("error" in upload) && upload.text === "upload /home/kali/linpeas.sh -o /dev/shm\n");
  assert.ok(!("error" in download) && download.text === "download /root/proof.txt -o /tmp\n");
});

test("a bare file name uploads into the remote working directory", () => {
  const upload = penelopeLine("upload", "1", "linpeas.sh", "linpeas.sh");
  assert.ok(!("error" in upload) && upload.text === "upload linpeas.sh -o .\n");
});

test("a flag is not accepted as a path", () => {
  const upload = penelopeLine("upload", "1", "-o", "/tmp/linpeas.sh");
  assert.ok("error" in upload);
});

test("a path that climbs with .. is refused", () => {
  const upload = penelopeLine("upload", "1", "/tmp/../etc/passwd", "/tmp/x");
  assert.ok("error" in upload);
});

test("payloads waits for the OS question, then answers Linux", () => {
  const beats = penelopeBeats("payloads", true, "1", "", "");
  assert.ok(!("error" in beats));
  assert.deepEqual(writes(beats), [PENELOPE_DETACH, "payloads\n", PENELOPE_LINUX]);
  const ask = beats.find((beat) => beat.kind === "until" && beat.what === "os");
  const answer = beats.find((beat) => beat.kind === "line" && beat.text === PENELOPE_LINUX);
  assert.ok(ask && ask.kind === "until");
  assert.ok(answer && answer.kind === "line" && answer.when === "os");
  assert.match("[?] Target OS? (1/linux, 2/windows, 3/both): ", PENELOPE_WAIT.os);
  assert.equal(PENELOPE_WAIT.os.test("payloads"), false);
});

test("Shell does nothing when the session is already open", () => {
  const beats = penelopeBeats("interact", true, "1", "", "");
  assert.ok(!("error" in beats));
  assert.equal(beats.length, 0);
});

test("a session button leaves the shell before interact", () => {
  const beats = penelopeBeats("interact", true, "2", "", "", true);
  assert.ok(!("error" in beats));
  assert.deepEqual(writes(beats), [PENELOPE_DETACH, "interact 2\n"]);
});

test("the latest detach wins over an older interact line", () => {
  const output = "Interacting with session [1]\n$ id\nSession detached ⇲\n(Penelope)─(Session [1])> ";
  assert.equal(penelopeInShell(output), false);
  assert.equal(penelopeInShell(output + "Interacting with session [1]\n"), true);
});

test("Uploaded and Downloaded are success, and an error banner is not", () => {
  assert.equal(penelopeTransferVerdict("[+] Uploaded '/tmp/linpeas.sh'\n"), "success");
  assert.equal(penelopeTransferVerdict("[+] Downloaded '/home/kali/exam/loot/proof.txt'\n"), "success");
  assert.equal(penelopeTransferVerdict("[-] No such file or directory: /tmp/linpeas.sh\n"), "failure");
  assert.equal(penelopeTransferVerdict("[-] Download Failed '/root/missing'\n"), "failure");
  assert.equal(penelopeTransferVerdict("[-] --- Not enough space on target... We need 12 more bytes...\n"), "failure");
  assert.equal(penelopeTransferVerdict("[!] Could not determine remote block size; assuming 4096"), "pending");
  assert.equal(penelopeTransferVerdict("[!] Could not determine remote block size; assuming 4096\n[+] Uploaded '/tmp/linpeas.sh'\n"), "success");
  assert.equal(penelopeTransferVerdict("[!] No files or directories specified\n(Penelope)─(Session [1])> "), "failure");
  assert.equal(penelopeTransferVerdict("[+] Uploaded '/tmp/linpeas.sh'\n[!] late note\n(Penelope)─(Session [1])> "), "success");
  const painted = `${String.fromCharCode(1)}\u001b[38;5;2m${String.fromCharCode(2)}[+] Uploaded '/tmp/linpeas.sh'\u001b[0m`;
  assert.equal(penelopeTransferVerdict(painted), "success");
});

test("a transfer wait ignores output from before the command", () => {
  const before = "[+] Uploaded '/tmp/old'\n[-] No such file or directory: /tmp/old\n";
  const failed = penelopeReadTransfer(before, `${before}upload /home/kali/missing -o /tmp\n[-] No such file or directory: /home/kali/missing\n`);
  const moved = penelopeReadTransfer(before, `${before}[+] Downloaded '/home/kali/proof.txt'\n`);
  assert.equal(failed.status, "failure");
  if (failed.status === "failure") assert.match(failed.message, /No such file/);
  if (failed.status === "failure") assert.match(failed.message, /left at the menu/);
  assert.equal(moved.status, "success");
  assert.equal(penelopeTransferReturns("success"), true);
  assert.equal(penelopeTransferReturns("failure"), false);
  assert.equal(penelopeTransferReturns("timeout"), false);
});

test("a warning that never finishes is reported as a refusal when the wait ends", () => {
  const before = "(Penelope)> ";
  const now = `${before}[!] Could not determine remote block size; assuming 4096\n`;
  assert.match(penelopeTransferTimeoutMessage(before, now), /refused the transfer/);
  assert.match(penelopeTransferTimeoutMessage(before, `${before}upload /home/kali/linpeas.sh -o /tmp\n`), /did not report back/);
});

test("the card does not treat an error banner as a finished transfer", () => {
  const card = readFileSync(new URL("../components/penelope-card.tsx", import.meta.url), "utf8");
  const sheet = readFileSync(new URL("../data/methodology.ts", import.meta.url), "utf8");
  const why = readFileSync(new URL("../data/why.ts", import.meta.url), "utf8");
  assert.equal(card.includes("Uploaded|Downloaded|\\[!\\]"), false);
  assert.match(card, /penelopeTransferReturns/);
  assert.match(card, /KALI FILE/);
  assert.match(card, /TARGET FILE/);
  assert.match(sheet, /upload \/home\/kali\/linpeas\.sh -o \/tmp/);
  assert.equal(sheet.includes("upload /home/kali/linpeas.sh /tmp/linpeas.sh"), false);
  assert.match(why, /-o and the folder on the target/);
});

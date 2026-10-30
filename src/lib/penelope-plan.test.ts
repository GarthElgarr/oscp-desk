import assert from "node:assert/strict";
import test from "node:test";
import { PENELOPE_DETACH, penelopeBeats, penelopeInShell, type PenelopeBeat } from "./penelope-plan.ts";

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
  assert.deepEqual(writes(beats), [PENELOPE_DETACH, "upload /home/kali/linpeas.sh /tmp/linpeas.sh\n", "interact 1\n"]);
  const stop = beats.find((beat) => beat.kind === "until" && beat.what === "detached");
  assert.ok(stop && stop.kind === "until" && stop.stop);
});

test("upload from the menu does not send F12", () => {
  const beats = penelopeBeats("upload", false, "1", "/home/kali/linpeas.sh", "/tmp/linpeas.sh");
  assert.ok(!("error" in beats));
  assert.equal(writes(beats).includes(PENELOPE_DETACH), false);
  assert.equal(writes(beats)[0], "upload /home/kali/linpeas.sh /tmp/linpeas.sh\n");
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

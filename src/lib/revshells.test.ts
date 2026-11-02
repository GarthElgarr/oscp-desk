import assert from "node:assert/strict";
import test from "node:test";
import { REVSHELLS, fillShell, listenerCommand } from "./revshells.ts";

test("every shell takes the local IP and port", () => {
  for (const shell of REVSHELLS) {
    const line = fillShell(shell.cmd, "10.10.14.5", "443");
    assert.equal(line.includes("{ip}"), false);
    assert.equal(line.includes("{port}"), false);
    assert.equal(line.includes("10.10.14.5"), true);
    assert.equal(line.includes("443"), true);
  }
});

test("the listener uses the interface only when one is set", () => {
  assert.equal(listenerCommand("tun0", "443"), "penelope -O -i tun0 -p 443");
  assert.equal(listenerCommand("", "443"), "penelope -O -p 443");
});

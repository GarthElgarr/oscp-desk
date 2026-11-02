import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { rawShell, type RevshellData } from "./revshell-raw.ts";

function load(): RevshellData {
  const code = readFileSync(new URL("../../public/revshells/js/data.js", import.meta.url), "utf8");
  const sandbox: { exports: { rsgData?: RevshellData } } = { exports: {} };
  vm.runInNewContext(code, sandbox);
  if (!sandbox.exports.rsgData) throw new Error("missing data");
  return sandbox.exports.rsgData;
}

test("a named shell is filled from the vendored list", () => {
  const data = load();
  const bash = data.reverseShellCommands.find((item) => item.name === "Bash -i");
  assert.ok(bash);
  const text = rawShell(data, { name: "Bash -i", ip: "10.10.14.5", port: "443", shell: "/bin/sh", value: null });
  assert.equal(text?.includes("10.10.14.5"), true);
  assert.equal(text?.includes("443"), true);
});

test("an unknown name is not a shell", () => {
  const text = rawShell(load(), { name: "nope", ip: "1.1.1.1", port: "1", shell: "sh", value: null });
  assert.equal(text, null);
});

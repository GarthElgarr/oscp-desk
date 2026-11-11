import assert from "node:assert/strict";
import test from "node:test";
import { hydraHttp } from "./hydra.server.ts";
import { redactStoredCommand } from "./redact-command.ts";
import { wfuzzHttp } from "./wfuzz.server.ts";

const PAYLOAD = "file,/usr/share/wordlists/dirb/common.txt";
const URL = "http://10.10.10.5/FUZZ";

function stored(command: string): string {
  const again = redactStoredCommand(command);
  assert.equal(again.includes("REAL"), false, again);
  return again;
}

test("hydra and wfuzz routes store a masked command built from the args array", () => {
  const hydraSpaced = ["-l", "user", "-p", "NOT REAL", "ssh://10.10.10.5"];
  let hydraCommand = "";
  const hydra = hydraHttp({ id: "hydra-spaced", args: hydraSpaced }, (input) => {
    assert.deepEqual(input.args, hydraSpaced);
    hydraCommand = input.command;
    return true;
  });
  assert.equal(hydra.status, 200);
  assert.equal(hydraCommand.includes("REAL"), false, hydraCommand);
  assert.match(hydraCommand, /-p \*\*\*\*/);
  assert.match(hydraCommand, /ssh:\/\/10\.10\.10\.5/);
  assert.match(stored(hydraCommand), /-l user/);

  const hydraAttached = ["-l", "user", "-pNOTREAL", "ssh://10.10.10.5"];
  let attached = "";
  const hydra2 = hydraHttp({ id: "hydra-attached", args: hydraAttached }, (input) => {
    assert.deepEqual(input.args, hydraAttached);
    attached = input.command;
    return true;
  });
  assert.equal(hydra2.status, 200);
  assert.equal(attached.includes("REAL"), false, attached);
  assert.match(attached, /-p\*\*\*\*/);
  assert.match(stored(attached), /10\.10\.10\.5/);

  const wfuzzArgs = [
    "-z",
    PAYLOAD,
    "-H",
    "Authorization: Bearer NOTREAL",
    "-H",
    "Proxy-Authorization: Basic NOTREAL",
    "-H",
    "Cookie: session=NOTREAL",
    "-H",
    "Set-Cookie: session=NOTREAL",
    "-H",
    "X-Api-Key: NOTREAL",
    "-H",
    "X-Auth-Token: NOTREAL",
    "-H",
    "Host: FUZZ.corp.local",
    "-b",
    "session=NOTREAL",
    "-b",
    "theme=FUZZ",
    "--basic",
    "user:NOT REAL",
    "--ntlm",
    "user:NOT REAL",
    "--digest",
    "user:NOT REAL",
    "-d",
    "a=1&password=NOT REAL&note=keep",
    "-u",
    URL,
  ];
  let wfuzzCommand = "";
  const wfuzz = wfuzzHttp({ id: "wfuzz-secrets", args: wfuzzArgs }, (input) => {
    assert.deepEqual(input.args, wfuzzArgs);
    wfuzzCommand = input.command;
    return true;
  });
  assert.equal(wfuzz.status, 200, wfuzzCommand);
  const shown = stored(wfuzzCommand);
  assert.equal(wfuzzCommand.includes("REAL"), false, wfuzzCommand);
  assert.match(shown, /Authorization: \*\*\*\*/);
  assert.match(shown, /Proxy-Authorization: \*\*\*\*/);
  assert.match(shown, /Cookie: \*\*\*\*/);
  assert.match(shown, /Set-Cookie: \*\*\*\*/);
  assert.match(shown, /X-Api-Key: \*\*\*\*/);
  assert.match(shown, /X-Auth-Token: \*\*\*\*/);
  assert.match(shown, /Host: FUZZ\.corp\.local/);
  assert.match(shown, /-b session=\*\*\*\*/);
  assert.match(shown, /-b theme=FUZZ/);
  assert.match(shown, /--basic user:\*\*\*\*/);
  assert.match(shown, /--ntlm user:\*\*\*\*/);
  assert.match(shown, /--digest user:\*\*\*\*/);
  assert.match(shown, /a=1&password=\*\*\*\*&note=keep/);
  assert.match(shown, new RegExp(PAYLOAD.replaceAll("/", "\\/")));
  assert.match(shown, /http:\/\/10\.10\.10\.5\/FUZZ/);

  const jsonArgs = ["-z", PAYLOAD, "-d", '{"password":12345678,"secret":true,"token":false,"pwd":"NOTREAL","user":"alice","note":"FUZZ"}', "-u", URL];
  let jsonCommand = "";
  const json = wfuzzHttp({ id: "wfuzz-json", args: jsonArgs }, (input) => {
    assert.deepEqual(input.args, jsonArgs);
    jsonCommand = input.command;
    return true;
  });
  assert.equal(json.status, 200);
  const jsonShown = stored(jsonCommand);
  assert.equal(jsonCommand.includes("REAL"), false, jsonCommand);
  assert.equal(jsonShown.includes("12345678"), false, jsonShown);
  assert.equal(jsonShown.includes("true"), false, jsonShown);
  assert.equal(jsonShown.includes("false"), false, jsonShown);
  assert.match(jsonShown, /"password":"\*\*\*\*"/);
  assert.match(jsonShown, /"secret":"\*\*\*\*"/);
  assert.match(jsonShown, /"token":"\*\*\*\*"/);
  assert.match(jsonShown, /"pwd":"\*\*\*\*"/);
  assert.match(jsonShown, /"user":"alice"/);
  assert.match(jsonShown, /"note":"FUZZ"/);
  assert.match(jsonShown, new RegExp(PAYLOAD.replaceAll("/", "\\/")));
  assert.match(jsonShown, /\/FUZZ/);
});

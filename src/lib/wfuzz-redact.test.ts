import assert from "node:assert/strict";
import test from "node:test";
import { redactStoredCommand } from "./redact-command.ts";

test("wfuzz hides a basic password, a session cookie, and a body secret", () => {
  const basic = redactStoredCommand("wfuzz --basic user:NOTREAL -u http://10.10.10.5/FUZZ");
  assert.equal(basic.includes("NOTREAL"), false);
  assert.match(basic, /--basic 'user:\*\*\*\*'/);
  assert.match(basic, /http:\/\/10\.10\.10\.5\/FUZZ/);

  const ntlm = redactStoredCommand("wfuzz --ntlm alice:NOTREAL -u http://10.10.10.5/");
  assert.match(ntlm, /--ntlm 'alice:\*\*\*\*'/);
  assert.equal(ntlm.includes("NOTREAL"), false);
  const digest = redactStoredCommand("wfuzz --digest alice:NOTREAL -u http://10.10.10.5/");
  assert.match(digest, /--digest 'alice:\*\*\*\*'/);

  const cookie = redactStoredCommand("wfuzz -b PHPSESSID=NOTREAL -u http://10.10.10.5/FUZZ");
  assert.equal(cookie.includes("NOTREAL"), false);
  assert.match(cookie, /-b 'PHPSESSID=\*\*\*\*'/);
  assert.match(cookie, /\/FUZZ/);
  assert.match(redactStoredCommand("wfuzz -b session=FUZZ -u http://10.10.10.5/"), /-b session=FUZZ/);

  const body = redactStoredCommand("wfuzz -d 'username=admin&password=NOTREAL&token=abc' -u http://10.10.10.5/");
  assert.equal(body.includes("NOTREAL"), false);
  assert.equal(body.includes("token=abc"), false);
  assert.match(body, /username=admin/);
  assert.match(body, /password=\*\*\*\*/);
  assert.match(body, /token=\*\*\*\*/);
  assert.match(redactStoredCommand("wfuzz -d 'user=FUZZ&password=FUZ2Z' -u http://10.10.10.5/"), /password=FUZ2Z/);

  const host = "wfuzz -H 'Host: FUZZ.corp.local' -u http://10.10.10.5/";
  assert.equal(redactStoredCommand(host), host);
});

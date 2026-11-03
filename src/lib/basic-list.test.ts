import assert from "node:assert/strict";
import test from "node:test";
import { basicList } from "./basic-list.ts";

test("a username and password joined by a colon become one basic-auth value", () => {
  const list = basicList({ users: "admin\n", passwords: "admin\n", pairing: "each", delimiter: ":", prefix: "" });
  assert.ok(!("error" in list));
  if ("error" in list) return;
  assert.deepEqual(list.lines, ["YWRtaW46YWRtaW4="]);
});

test("no delimiter sticks the two words together", () => {
  const list = basicList({ users: "admin", passwords: "admin", pairing: "each", delimiter: "", prefix: "" });
  assert.ok(!("error" in list));
  if ("error" in list) return;
  assert.deepEqual(list.lines, ["YWRtaW5hZG1pbg=="]);
});

test("every username is tried with every password", () => {
  const list = basicList({ users: "a\nb", passwords: "1\n2", pairing: "each", delimiter: ":", prefix: "" });
  assert.ok(!("error" in list));
  if ("error" in list) return;
  assert.equal(list.lines.length, 4);
});

test("line by line keeps row 1 with row 1", () => {
  const list = basicList({ users: "a\nb", passwords: "1\n2", pairing: "line", delimiter: ":", prefix: "" });
  assert.ok(!("error" in list));
  if ("error" in list) return;
  assert.deepEqual(list.lines, ["YTox", "Yjoy"]);
});

test("the same word can be both the username and the password", () => {
  const list = basicList({ users: "admin\nroot", passwords: "", pairing: "same", delimiter: ":", prefix: "Basic " });
  assert.ok(!("error" in list));
  if ("error" in list) return;
  assert.deepEqual(list.lines, ["Basic YWRtaW46YWRtaW4=", "Basic cm9vdDpyb290"]);
});

import assert from "node:assert/strict";
import test from "node:test";
import { addLoot, clearLoot, getLoot } from "./loot.ts";

test("removing all loot leaves the list empty", () => {
  assert.equal(addLoot({ user: "user", secret: "NOTREAL", kind: "pass", note: "lab" }), null);
  assert.equal(getLoot().some((item) => item.secret === "NOTREAL"), true);
  clearLoot();
  assert.equal(getLoot().length, 0);
});

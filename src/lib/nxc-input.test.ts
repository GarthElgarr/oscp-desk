import assert from "node:assert/strict";
import test from "node:test";
import { nxcInputError } from "./nxc-plan.ts";

test("nxc names the bad field instead of one generic error", () => {
  assert.match(nxcInputError({ target: "10.10.10.0/16", user: "user" }) ?? "", /wider than \/24/);
  assert.match(nxcInputError({ target: "10.10.10.05", user: "user" }) ?? "", /leading zero/);
  assert.match(nxcInputError({ target: "10.10.010.0/24", user: "user" }) ?? "", /leading zero/);
  assert.match(nxcInputError({ target: "10.10.10.5", user: "user; id" }) ?? "", /user name/);
  assert.equal(nxcInputError({ target: "10.10.10.5", user: "user" }), null);
  assert.equal(nxcInputError({ target: "10.10.10.0/24", user: "exam" }), null);
});

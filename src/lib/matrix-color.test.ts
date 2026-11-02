import assert from "node:assert/strict";
import test from "node:test";
import { rainPalette } from "./matrix-color.ts";

test("a picked colour tints the head, the body, and the fade", () => {
  const blue = rainPalette("#4696ff");
  assert.match(blue.body, /70, 150, 255/);
  assert.match(blue.head, /rgba\(/);
  assert.notEqual(blue.body, rainPalette("#5aa878").body);
});

test("a bad colour falls back to the desk green", () => {
  assert.equal(rainPalette("nope").body, rainPalette("#5aa878").body);
});

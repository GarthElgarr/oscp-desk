import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("the desk stylesheet does not import a remote font", () => {
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  assert.equal(/@import\s+(?:url\(\s*)?["']?https?:/i.test(css), false);
});

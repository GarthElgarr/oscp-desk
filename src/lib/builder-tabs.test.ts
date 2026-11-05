import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("the directory and buffer tabs are named dirs and bof", () => {
  const builders = readFileSync(new URL("../components/tool-builders.tsx", import.meta.url), "utf8");
  assert.match(builders, /dirs: "dirs"/);
  assert.match(builders, /bof: "bof"/);
  assert.equal(builders.includes('dirs: "gobuster"'), false);
  assert.equal(builders.includes('bof: "buffer"'), false);
  assert.match(builders, /"dirs" \| "smb" \| "bof"/);
  const study = readFileSync(new URL("../components/study-builders.tsx", import.meta.url), "utf8");
  assert.match(study, /id="builder-dirs"/);
  assert.match(study, /id="builder-bof"/);
});

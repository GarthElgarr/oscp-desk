import assert from "node:assert/strict";
import test from "node:test";
import { matchLocal } from "./local-match.ts";

function titles(version: string) {
  const match = matchLocal(`Sudo version ${version}\n`);
  return match?.hits.map((hit) => `${hit.state}:${hit.title}`) ?? [];
}

test("sudoedit covers 1.8.0 through 1.9.12p1 and not the fix", () => {
  assert.ok(titles("1.8.0").includes("lead:sudoedit extra arguments, version only"));
  assert.ok(titles("1.8.0").includes("dead:Not Baron Samedit"));
  assert.ok(titles("1.9.9").includes("lead:sudoedit extra arguments, version only"));
  assert.ok(titles("1.9.12p1").includes("lead:sudoedit extra arguments, version only"));
  assert.ok(titles("1.9.12p2").includes("dead:Not sudoedit CVE-2023-22809"));
  assert.ok(titles("1.9.15").includes("dead:Not sudoedit CVE-2023-22809"));
});

test("Baron and sudoedit can both be leads", () => {
  const both = titles("1.8.31");
  assert.ok(both.includes("lead:Baron Samedit, version only"));
  assert.ok(both.includes("lead:sudoedit extra arguments, version only"));
  const baronFixed = titles("1.8.31p2");
  assert.ok(baronFixed.includes("dead:Not Baron Samedit"));
  assert.ok(baronFixed.includes("lead:sudoedit extra arguments, version only"));
  const bothFixed = titles("1.9.5p2");
  assert.ok(bothFixed.includes("dead:Not Baron Samedit"));
  assert.ok(bothFixed.includes("lead:sudoedit extra arguments, version only"));
});

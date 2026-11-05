import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("an exam ledger error sits at the top of the lock box and a success clears it", () => {
  const ui = readFileSync(new URL("../components/global-config.tsx", import.meta.url), "utf8");
  const banner = ui.indexOf("data-exam-problem");
  const title = ui.indexOf("EXAM LOCK");
  const scope = ui.indexOf(">SCOPE<");
  assert.ok(banner > 0 && banner < title && title < scope);
  assert.match(ui, /setProblem\(result\.error \? result\.error : ""\)/);
  assert.equal(ui.includes('{problem ? <p className="mt-2 text-sm text-fg">{problem}</p>'), false);
});

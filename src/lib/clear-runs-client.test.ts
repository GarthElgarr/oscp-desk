import assert from "node:assert/strict";
import test from "node:test";
import { clearRunsAndLoot, getJobs, launchJob } from "./live-jobs.ts";
import { pendingCommand } from "./pending-command.ts";

test("clear run log drops a failed local card and does not keep its secret", async () => {
  const original = globalThis.fetch;
  const body = { args: ["-l", "user", "-p", "NOT REAL", "ssh://10.10.10.5"] };
  const line = pendingCommand("hydra", body);
  let cleared = false;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === "/api/jobs" && init?.method === "POST") {
      const posted = JSON.parse(String(init.body)) as { clearRuns?: boolean };
      assert.equal(posted.clearRuns, true);
      cleared = true;
      return Response.json({ jobs: [] });
    }
    if (url === "/api/jobs") return Response.json({ jobs: [] });
    return new Response("Those arguments are not a hydra command this desk will run.\n", { status: 400 });
  };
  try {
    await launchJob("/api/hydra", body, { tool: "hydra", title: line, command: line });
    const failed = getJobs().find((job) => job.local);
    assert.ok(failed);
    assert.equal(failed.command.includes("REAL"), false, failed.command);
    const error = await clearRunsAndLoot();
    assert.equal(error, null);
    assert.equal(cleared, true);
    assert.equal(getJobs().length, 0);
  } finally {
    globalThis.fetch = original;
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import { AI_TECHNIQUES } from "../data/pen300.ts";
import { AI_WHY } from "../data/pen300-why.ts";

const ADDED = [
  "ai-recon-deps",
  "ai-recon-rag-config",
  "ai-recon-prompts",
  "ai-recon-supply",
  "ai-recon-history",
  "ai-recon-js",
  "ai-recon-gateway",
  "ai-recon-identity",
  "ai-recon-cutoff",
  "ai-recon-behavior",
  "ai-recon-context",
  "ai-recon-sources",
  "ai-recon-meta",
  "ai-recon-threshold",
  "ai-recon-detect",
  "ai-recon-canary",
];

test("every AI card explains its command", () => {
  for (const item of AI_TECHNIQUES) {
    const why = AI_WHY[item.id];
    assert.equal(typeof why, "string", item.id);
    assert.ok(why.length > 40, item.id);
  }
});

test("the AI recon cards cover repo files, discovery, fingerprinting, and RAG metadata", () => {
  const ids = new Set(AI_TECHNIQUES.map((item) => item.id));
  for (const id of ADDED) assert.equal(ids.has(id), true, id);
  const recon = AI_TECHNIQUES.filter((item) => item.section === "Recon");
  const blob = recon.map((item) => `${item.look}\n${item.cmd}`).join("\n");
  assert.equal(blob.includes("lab123"), false);
  assert.equal(blob.includes("AKIA"), false);
  assert.equal(/sqlmap/i.test(blob), false);
  const gateway = recon.find((item) => item.id === "ai-recon-gateway");
  assert.ok(gateway);
  assert.match(gateway.cmd, /v1\/chat\/completions/);
  assert.equal(gateway.cmd.includes("seclists"), false);
  const threshold = recon.find((item) => item.id === "ai-recon-threshold");
  assert.ok(threshold);
  assert.match(threshold.cmd, /vaycation/);
  const canary = recon.find((item) => item.id === "ai-recon-canary");
  assert.ok(canary);
  assert.match(canary.dead, /Do not test it/);
});

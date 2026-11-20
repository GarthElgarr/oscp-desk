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
  "ai-recon-wordlist",
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
  const wordlist = recon.find((item) => item.id === "ai-recon-wordlist");
  assert.ok(wordlist);
  assert.match(wordlist.cmd, /api-endpoints-res\.txt/);
  assert.match(wordlist.cmd, /!= "404"/);
  assert.match(wordlist.cmd, /http:\/\/<ip>:<port>\/v1\//);
  assert.equal(wordlist.cmd.includes(":9000"), false);
  assert.match(AI_WHY["ai-recon-wordlist"], /401/);
  assert.match(AI_WHY["ai-recon-wordlist"], /remaining/);
  const deps = recon.find((item) => item.id === "ai-recon-deps");
  assert.ok(deps);
  assert.match(deps.look, /Aurora/);
  assert.match(deps.look, /Phoenix/);
  assert.match(deps.look, /Pinecone/);
  assert.match(deps.look, /Milvus/);
  assert.match(deps.look, /codet5p/);
  const prompts = recon.find((item) => item.id === "ai-recon-prompts");
  assert.ok(prompts);
  assert.match(prompts.look, /read-only/);
  assert.match(prompts.look, /create only/);
  assert.match(AI_WHY["ai-recon-identity"], /1B/);
  const context = recon.find((item) => item.id === "ai-recon-context");
  assert.ok(context);
  assert.match(context.cmd, /ZEBRA-42/);
  const meta = recon.find((item) => item.id === "ai-recon-meta");
  assert.ok(meta);
  assert.match(meta.look, /API_Documentation/);
  assert.match(meta.look, /Architecture_Overview/);
  assert.match(meta.look, /ntk_prod_/);
  const detect = recon.find((item) => item.id === "ai-recon-detect");
  assert.ok(detect);
  assert.match(detect.look, /E01/);
  assert.match(detect.look, /what sources/);
  assert.match(detect.look, /E04/);
  assert.match(detect.cmd, /employee handbook/);
  const threshold = recon.find((item) => item.id === "ai-recon-threshold");
  assert.ok(threshold);
  assert.match(threshold.cmd, /vaycation/);
  const canary = recon.find((item) => item.id === "ai-recon-canary");
  assert.ok(canary);
  assert.match(canary.look, /HONEYPOT/);
  assert.match(canary.look, /CompanyName2024!/);
  assert.match(canary.look, /does not resolve/);
  assert.match(canary.dead, /Do not test it/);
});

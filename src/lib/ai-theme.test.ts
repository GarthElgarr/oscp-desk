import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("the AI desk keeps an electric theme of its own", () => {
  const desk = readFileSync(new URL("../components/ai-desk.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  const rain = readFileSync(new URL("../components/matrix-rain.tsx", import.meta.url), "utf8");
  assert.match(desk, /className="ai-desk relative min-h-screen text-fg"/);
  assert.match(desk, /<AiEnergy \/>/);
  assert.match(desk, /<MatrixRain tint="#39f3ff" \/>/);
  assert.match(css, /\.ai-desk \{/);
  assert.match(css, /--color-primary: #3df0ff/);
  assert.match(rain, /tint\?: string/);
});

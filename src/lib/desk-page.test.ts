import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DeskNotFound, NOT_FOUND_TEXT } from "./desk-not-found.ts";

test("a missing page says it is not on this desk and links home", () => {
  const html = renderToStaticMarkup(DeskNotFound());
  assert.match(html, new RegExp(NOT_FOUND_TEXT));
  assert.match(html, /href="\/"/);
  const root = readFileSync(new URL("../routes/__root.tsx", import.meta.url), "utf8");
  assert.match(root, /notFoundComponent:\s*DeskNotFound/);
});

test("the session picker is not named like a hook", () => {
  const card = readFileSync(new URL("../components/penelope-card.tsx", import.meta.url), "utf8");
  assert.match(card, /function pickSession/);
  assert.equal(card.includes("function useSession"), false);
});

test("the dev server does not add CORS in front of the API guard", () => {
  const vite = readFileSync(new URL("../../vite.config.ts", import.meta.url), "utf8");
  assert.match(vite, /cors:\s*false/);
});

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { guardDecision, tokensEqual } from "./api-guard.ts";
import { DESK_TOKEN_SLOT, deskToken, guardNodeRequest } from "./api-guard.server.ts";

const token = "ab".repeat(32);
const names = new Set(["localhost", "127.0.0.1", "::1", "10.10.14.5"]);

function decide(over: Partial<Parameters<typeof guardDecision>[0]>) {
  return guardDecision({
    method: "GET",
    path: "/api/jobs",
    host: "127.0.0.1:81",
    origin: undefined,
    contentType: undefined,
    token,
    listenPort: 81,
    names,
    expectedToken: token,
    ...over,
  });
}

test("the happy path is allowed and a missing or wrong token is the same refusal", () => {
  assert.equal(decide({}), null);
  assert.equal(decide({ token: undefined })?.status, 401);
  assert.equal(decide({ token: "" })?.status, 401);
  assert.equal(decide({ token: "nope" })?.status, 401);
  assert.equal(decide({ token: undefined })?.body, decide({ token: "nope" })?.body);
  assert.equal(tokensEqual("short", token), false);
  assert.equal(tokensEqual(token, token), true);
});

test("a foreign host or origin is refused, including a rebinding name on the desk port", () => {
  assert.equal(decide({ host: "evil.example:81" })?.status, 403);
  assert.equal(decide({ host: "127.0.0.1:80" })?.status, 403);
  assert.equal(decide({ host: "127.0.0.1" })?.status, 403);
  assert.equal(decide({ origin: "http://evil.example:81" })?.status, 403);
  assert.equal(decide({ origin: "http://127.0.0.1:80" })?.status, 403);
  assert.equal(decide({ origin: "http://10.10.14.5:81" }), null);
  assert.equal(decide({ method: "OPTIONS" })?.status, 403);
});

test("a post must be JSON, except the file upload", () => {
  assert.equal(decide({ method: "POST", contentType: "application/json" }), null);
  assert.equal(decide({ method: "POST" })?.status, 415);
  assert.equal(decide({ method: "POST", contentType: "text/plain" })?.status, 415);
  assert.equal(decide({ method: "PATCH", path: "/api/jobs", contentType: "application/json; charset=utf-8" }), null);
  assert.equal(decide({ method: "POST", path: "/api/upload", contentType: "multipart/form-data; boundary=x" }), null);
  assert.equal(decide({ method: "POST", path: "/api/upload", contentType: "application/json" })?.status, 415);
});

test("the desk token is one process-wide value, so a second module copy cannot mint another", () => {
  const bag = globalThis as typeof globalThis & { [DESK_TOKEN_SLOT]?: string };
  const previous = bag[DESK_TOKEN_SLOT];
  delete bag[DESK_TOKEN_SLOT];
  try {
    const minted = deskToken();
    assert.match(minted, /^[0-9a-f]{64}$/);
    assert.equal(deskToken(), minted);
    const shared = "cd".repeat(32);
    bag[DESK_TOKEN_SLOT] = shared;
    assert.equal(deskToken(), shared);
  } finally {
    if (previous === undefined) delete bag[DESK_TOKEN_SLOT];
    else bag[DESK_TOKEN_SLOT] = previous;
  }
});

function apiPaths(): { files: string[]; tree: string[] } {
  const files = readdirSync(new URL("../routes/api/", import.meta.url))
    .filter((name) => name.endsWith(".ts"))
    .map((name) => `/api/${name.replace(/\.ts$/, "")}`)
    .sort();
  const tree = readFileSync(new URL("../routeTree.gen.ts", import.meta.url), "utf8");
  const listed = [...tree.matchAll(/path: '(\/api\/[^']+)'/g)].map((match) => match[1] ?? "").sort();
  return { files, tree: [...new Set(listed)] };
}

test("every api route refuses a missing token, a wrong token, a bad origin, and a bad host", () => {
  const { files, tree } = apiPaths();
  const token = deskToken();
  assert.deepEqual(files, tree);
  for (const url of files) {
    const base = { url, listenPort: 81, contentType: undefined as string | undefined };
    assert.equal(guardNodeRequest({ ...base, method: "GET", host: "127.0.0.1:81", origin: undefined, token: undefined })?.status, 401, url);
    assert.equal(guardNodeRequest({ ...base, method: "GET", host: "127.0.0.1:81", origin: undefined, token: "nope" })?.status, 401, url);
    assert.equal(guardNodeRequest({ ...base, method: "GET", host: "127.0.0.1:81", origin: "http://evil.example:81", token })?.status, 403, url);
    assert.equal(guardNodeRequest({ ...base, method: "GET", host: "evil.example:81", origin: undefined, token })?.status, 403, url);
    const postType = url === "/api/upload" ? "multipart/form-data; boundary=x" : "application/json";
    assert.equal(guardNodeRequest({ ...base, method: "POST", host: "127.0.0.1:81", origin: undefined, contentType: postType, token: undefined })?.status, 401, url);
    assert.equal(guardNodeRequest({ ...base, method: "POST", host: "127.0.0.1:81", origin: undefined, contentType: postType, token: "nope" })?.status, 401, url);
    assert.equal(guardNodeRequest({ ...base, method: "POST", host: "127.0.0.1:81", origin: "http://evil.example:81", contentType: postType, token })?.status, 403, url);
    assert.equal(guardNodeRequest({ ...base, method: "POST", host: "evil.example:81", origin: undefined, contentType: postType, token })?.status, 403, url);
  }
});

test("every route under src/routes/api is covered by the prefix guard", () => {
  const { files, tree } = apiPaths();
  const vite = readFileSync(new URL("../../vite.config.ts", import.meta.url), "utf8");
  const pluginAt = vite.indexOf("apiGuardPlugin()");
  const startAt = vite.indexOf("tanstackStart()");
  assert.ok(pluginAt >= 0 && startAt > pluginAt);
  assert.deepEqual(files, tree);
  for (const path of files) {
    assert.equal(decide({ path, token: undefined })?.status, 401, path);
  }
});

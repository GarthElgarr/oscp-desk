import assert from "node:assert/strict";
import test from "node:test";
import { PLAIN_OUTPUT } from "./output-name.ts";
import { wfuzzCanRun, wfuzzPlan, type WfuzzInput } from "./wfuzz-args.ts";

const base: WfuzzInput = {
  mode: "dir",
  url: "http://10.10.10.5/",
  listId: "dirb",
  customList: "",
  listTwo: "",
  extension: ".php",
  param: "id",
  postField: "q",
  postExtra: "",
  userField: "username",
  passField: "password",
  domain: "",
  headerName: "X-Forwarded-For",
  cookieName: "session",
  rangeStart: "1",
  rangeEnd: "20",
  hideCodes: "404",
  hideWords: "",
  hideChars: "",
  hideLines: "",
  showCodes: "",
  hideRegex: "",
  showRegex: "",
  threads: "20",
  follow: false,
  recursion: "",
  delay: "",
  verbose: true,
  encoder: "",
  proxy: "",
  outfile: "",
  printer: "raw",
  extraHeader: "",
};

test("a wfuzz save name that is not a plain output name disables Run", () => {
  for (const outfile of ["out.json", "scans/x.txt"]) {
    const plan = wfuzzPlan({ ...base, outfile });
    assert.equal(plan.ready, false, outfile);
    assert.equal(plan.note.includes(PLAIN_OUTPUT), true, outfile);
    assert.equal(wfuzzCanRun(plan, []), false);
  }
  const ok = wfuzzPlan({ ...base, outfile: "out.txt" });
  assert.equal(ok.ready, true);
  assert.equal(wfuzzCanRun(ok, []), true);
  const plain = wfuzzPlan(base);
  assert.equal(wfuzzCanRun(plain, []), true);
});

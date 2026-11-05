import assert from "node:assert/strict";
import test from "node:test";
import { buildReportPdf } from "./report-pdf.ts";
import { reportHtml } from "./report-html.ts";
import { reportMarkdown } from "./report-md.ts";
import { blankReport, hostTitle, normaliseOsid, reachedWarning, reportFileBase, reportGaps } from "./report-model.ts";

test("the filename and the header use the same OSID", () => {
  const report = blankReport();
  report.osid = "os-12345";
  assert.equal(normaliseOsid(report.osid), "OS-12345");
  assert.equal(reportFileBase(report), "OSCP-OS-12345-Exam-Report");
  const pdf = Buffer.from(buildReportPdf(report, new Map())).toString("latin1");
  assert.match(pdf, /OS-12345/);
  assert.equal(pdf.includes("os-12345"), false);
});

test("an emoji is one character, not two question marks", () => {
  const report = blankReport();
  report.intro = "ok \u{1F44D} done";
  const pdf = Buffer.from(buildReportPdf(report, new Map())).toString("latin1");
  assert.equal(pdf.includes("??"), false);
  assert.match(pdf, /ok {1,2}done/);
});

test("a missing screenshot keeps its number and caption", () => {
  const report = blankReport();
  const host = report.hosts[0];
  host.ip = "192.0.2.10";
  host.access = "local";
  host.foothold = "the command";
  host.shots = [{ id: "gone", caption: "local flag" }];
  assert.equal(hostTitle(host, 0), "192.0.2.10");
  assert.ok(reportGaps(report, new Set()).some((gap) => gap.text.includes("file is missing")));
  const html = reportHtml(report, new Map());
  assert.match(html, /<h3>5\.1 192\.0\.2\.10</);
  assert.match(html, /Figure 1\. local flag File missing\./);
  const pdf = Buffer.from(buildReportPdf(report, new Map())).toString("latin1");
  assert.match(pdf, /Figure 1\. local flag File missing\./);
  assert.match(pdf, /Standalone/);
});

test("an empty earlier host does not renumber the label", () => {
  const report = blankReport();
  report.hosts[2].enumeration = "22/tcp ssh";
  const html = reportHtml(report, new Map());
  assert.match(html, /Standalone 3 - IP not recorded/);
  assert.equal(html.includes("Standalone 1 - IP not recorded"), false);
});

test("the scoring note follows the exam date", () => {
  const before = blankReport();
  before.examDate = "2026-11-05";
  const beforeMd = reportMarkdown(before);
  assert.match(beforeMd, /70 raw points/);
  assert.equal(beforeMd.includes("400 out of 500"), false);
  assert.match(reportHtml(before, new Map()), /70 raw points/);
  const beforePdf = Buffer.from(buildReportPdf(before, new Map())).toString("latin1");
  assert.match(beforePdf, /70 raw points/);
  const after = blankReport();
  after.examDate = "2026-12-01T08:00:00Z";
  const afterMd = reportMarkdown(after);
  assert.match(afterMd, /400 out of 500/);
  assert.equal(afterMd.includes("70 raw points"), false);
  assert.match(reportHtml(after, new Map()), /scaled score, 400 out of 500/);
  const afterPdf = Buffer.from(buildReportPdf(after, new Map())).toString("latin1");
  assert.match(afterPdf, /400 out of 500/);
});

test("filled proofs are not exported as not compromised unless REACHED was chosen", () => {
  const report = blankReport();
  const host = report.hosts[0];
  host.ip = "10.10.10.5";
  host.localFlag = "localflag";
  host.proofFlag = "proofflag";
  assert.ok(reachedWarning(host));
  assert.ok(reportGaps(report).some((gap) => gap.text.includes("REACHED is still the default")));
  const md = reportMarkdown(report);
  assert.match(md, /Reached: local\.txt and proof\.txt\./);
  assert.equal(md.includes("not compromised"), false);
  assert.match(reportHtml(report, new Map()), /Reached: local\.txt and proof\.txt\./);
  const pdf = Buffer.from(buildReportPdf(report, new Map())).toString("latin1");
  assert.equal(pdf.includes("not compromised"), false);
  host.accessSet = true;
  assert.equal(reachedWarning(host), null);
  assert.match(reportMarkdown(report), /not compromised/);
  host.accessSet = false;
  host.proofFlag = "";
  assert.match(reportMarkdown(report), /Reached: local\.txt only\./);
});

test("markdown carries the methodologies, the set, and the score caveat", () => {
  const report = blankReport();
  report.hosts[0].ip = "10.10.10.10";
  report.methodologies = "nmap then the service cards";
  report.rawPoints = "Raw total: 20";
  const md = reportMarkdown(report);
  assert.match(md, /## 4\. Methodologies/);
  assert.match(md, /\| Set \|/);
  assert.match(md, /scales that total/);
  assert.match(md, /nmap then the service cards/);
});

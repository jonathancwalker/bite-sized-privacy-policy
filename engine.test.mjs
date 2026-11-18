import test from "node:test";
import assert from "node:assert/strict";
import { analyzePolicy, TOPICS, SAMPLE_POLICY, SAMPLE_TITLE } from "./app/engine.js";

function assertSourceRecovery(source, result) {
  assert.deepEqual(result.points.map(({ start, end }) => source.slice(start, end)), result.points.map(point => point.text));
  assert.equal(result.points.map(point => point.text).join(""), source);
  let previousEnd = 0;
  for (const point of result.points) {
    assert.equal(point.start, previousEnd);
    assert.ok(point.end > point.start);
    previousEnd = point.end;
  }
  assert.equal(previousEnd, source.length);
}

test("segments sample policy into source-linked points across all topic areas", () => {
  const result = analyzePolicy(SAMPLE_POLICY);
  assertSourceRecovery(SAMPLE_POLICY, result);
  assert.ok(result.points.length >= 8);
  assert.ok(result.points.length <= 12);
  assert.ok(result.topics.includes("collection"));
  assert.ok(result.topics.includes("sharing"));
  assert.ok(result.topics.includes("advertising"));
  assert.ok(result.topics.includes("retention"));
  assert.ok(result.topics.includes("controls"));
  assert.ok(result.topics.includes("security"));
  assert.equal(result.unclassifiedCount, 0);
  assert.equal(result.mode, "source-first");
  assert.equal(SAMPLE_TITLE, "Mosslight Journal Privacy Policy");
  assert.deepEqual(Object.keys(TOPICS), ["collection", "sharing", "advertising", "retention", "controls", "security", "other"]);
});

test("keeps negation, exceptions, punctuation, and exact whitespace in contiguous ranges", () => {
  const source = "We do not sell account data.\r\n\r\nLocation is off unless you turn it on; if enabled, you can disable it.\nThe exception does not apply to backups!";
  const result = analyzePolicy(source);
  assertSourceRecovery(source, result);
  assert.ok(result.points.some(point => point.text.includes("do not sell")));
  assert.ok(result.points.some(point => point.text.includes("unless you turn it on")));
  assert.ok(result.points.some(point => point.text.includes("does not apply")));
  assert.ok(result.points.some(point => point.text.includes("\r\n\r\n")));
});

test("splits long paragraphs into manageable source ranges without truncation", () => {
  const sentences = Array.from({ length: 80 }, (_, i) => `We collect detail ${i + 1}, including an exception that applies only when the account is active.`);
  const source = sentences.join(" ");
  const result = analyzePolicy(source);
  assertSourceRecovery(source, result);
  assert.ok(result.points.length > 5);
  assert.ok(result.points.every(point => point.text.length <= 900));
});

test("handles adversarial punctuation and regex metacharacters deterministically", () => {
  const source = `(${".*+?^${}[]|\\".repeat(40)})\nnot a pattern; still text.\n\n`;
  const first = analyzePolicy(source);
  const second = analyzePolicy(source);
  assertSourceRecovery(source, first);
  assert.deepEqual(first, second);
  assert.equal(first.wordCount, 5);
});

test("uses explicit terms for priority and keeps the negated wording intact", () => {
  const source = "We do not sell your precise location or sensitive health information.\n\nOrdinary settings remain available.";
  const result = analyzePolicy(source);
  assertSourceRecovery(source, result);
  assert.equal(result.points[0].priority, "high");
  assert.ok(result.points[0].text.includes("do not sell"));
  assert.equal(result.points.at(-1).priority, "standard");
  assert.ok(result.points.every(point => ["high", "standard"].includes(point.priority)));
});

test("empty and whitespace-only documents stay recoverable", () => {
  for (const source of ["", " \t\r\n "]) {
    const result = analyzePolicy(source);
    assertSourceRecovery(source, result);
    assert.equal(result.wordCount, 0);
  }
});

test('leading blank lines do not become an empty review card', () => {
  const source = '\n\nWe collect email addresses when you register.\n\n';
  const result = analyzePolicy(source);
  assertSourceRecovery(source, result);
  assert.equal(result.points.length, 1);
  assert.ok(result.points.every(point => point.text.trim()));
});

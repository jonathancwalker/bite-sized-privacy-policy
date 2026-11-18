import test from "node:test";
import assert from "node:assert/strict";
import { decompose } from "./decompose.mjs";

function assertExactCoverage(text, result) {
  assert.equal(result.coverage.complete, true);
  assert.equal(result.units.map(unit => unit.text).join(""), text);
  let cursor = 0;
  for (const unit of result.units) {
    assert.equal(unit.start, cursor);
    assert.equal(text.slice(unit.start, unit.end), unit.text);
    assert.ok(unit.end > unit.start);
    cursor = unit.end;
  }
  assert.equal(cursor, text.length);
}

test("decomposes a realistic policy with hierarchy and nearby context links", () => {
  const text = `Mosslight Journal Privacy Policy\n\n1. Information We Collect\n\nWhen you register, we collect your email address and password credential. You may add an optional profile picture. If you enable location tagging, we collect the location attached to an entry; location tagging is off unless you turn it on.\n\n2. Sharing and Service Providers\n\nWe do not sell personal information. We share account data with hosting providers that process it for us under service agreements. They may not use the information to advertise their own products.\n\n2.1 Public Links\n\nIf you choose to share a public link, selected content is visible to anyone with that link. Recipients may save a copy, even after you disable the link.`;
  const result = decompose({ text, title: "Mosslight", source: "paste" });
  assertExactCoverage(text, result);
  assert.equal(result.document.title, "Mosslight");
  assert.deepEqual(result.sections.map(section => section.title), ["Mosslight Journal Privacy Policy", "Information We Collect", "Sharing and Service Providers", "Public Links"]);
  assert.deepEqual(result.sections.at(-1).path, ["Mosslight Journal Privacy Policy", "Sharing and Service Providers", "Public Links"]);
  assert.ok(result.units.some(unit => unit.text.includes("off unless you turn it on")));
  assert.ok(result.units.some(unit => unit.text.includes("We do not sell")));
  assert.ok(result.units.every((unit, index) => unit.previousId === (index ? result.units[index - 1].id : null)));
  assert.ok(result.units.every(unit => unit.contextIds.length <= 2));
});

test("keeps negation and condition or exception wording verbatim", () => {
  const text = "We do not sell or share your precise location.\n\nWe retain records unless deletion is required by law; if an exception applies, we will keep only what is necessary.\n\nYou can turn off analytics, but this does not disable essential security logs.";
  const result = decompose({ text });
  assertExactCoverage(text, result);
  const joined = result.units.map(unit => unit.text).join("");
  for (const phrase of ["do not sell or share", "unless deletion is required by law", "if an exception applies", "does not disable"]) assert.ok(joined.includes(phrase));
  assert.ok(result.units.some(unit => unit.text.includes("unless deletion is required by law") && unit.text.includes("if an exception applies")));
});

test("targets bite-sized units and reports unavoidable long-clause splitting", () => {
  const sentence = `We collect information ${Array.from({ length: 145 }, (_, i) => `detail${i + 1}`).join(" ")}.`;
  const text = `# Collection\n\n${sentence}\n\nWe retain information for as long as your account remains active.`;
  const result = decompose({ text });
  assertExactCoverage(text, result);
  assert.ok(result.units.some(unit => unit.wordCount > 100));
  assert.ok(result.warnings.some(warning => warning.code === "split-clause"));
  assert.ok(result.units.every(unit => unit.wordCount <= 120));
});

test("warns when table or HTML presentation is reduced to pasted text", () => {
  const text = `<table><tr><th>Data</th><th>Purpose</th></tr><tr><td>Email</td><td>Account</td></tr></table>\n\n| Data | Purpose |\n| Email | Account |`;
  const result = decompose({ text });
  assertExactCoverage(text, result);
  assert.ok(result.warnings.some(warning => warning.code === "html-formatting-loss"));
  assert.ok(result.warnings.some(warning => warning.code === "table-formatting-loss"));
});

test("handles empty text, plain pasted prose, and exact CRLF offsets", () => {
  for (const text of ["", "  \t\r\n", "We collect data.\r\n\r\nWe do not sell it."]) {
    const result = decompose({ text });
    assertExactCoverage(text, result);
  }
  const result = decompose({ text: "We collect data.\r\n\r\nWe do not sell it." });
  assert.ok(result.units[0].text.includes("\r\n\r\n"));
});

test("keeps list items out of section paths and recognizes governing purpose headings", () => {
  const text='Personalizing Meta Products\n\nWe use information to personalize products.\n\nProviding marketing communications\n\nWhy and how we process your information:\n\nWe send messages subject to your settings.\n\nFriends, followers and other connections\n\nApp, browser and device information\n\nSupplemental Disclosures for Residents of Brazil\n\nBrazilian residents may have additional rights.';
  const result=decompose({text});
  assertExactCoverage(text,result);
  assert.ok(result.sections.some(section=>section.title==='Providing marketing communications'));
  assert.ok(result.sections.some(section=>section.title==='Supplemental Disclosures for Residents of Brazil'));
  assert.ok(!result.sections.some(section=>section.title==='Friends, followers and other connections'));
  assert.ok(result.units.some(unit=>unit.text.includes('Friends, followers')&&unit.sectionPath.includes('Providing marketing communications')));
});

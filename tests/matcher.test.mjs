import test from "node:test";
import assert from "node:assert/strict";
import { matchField, isSensitiveOrAttestation } from "../src/matcher.js";

test("matches common application fields", () => {
  assert.equal(matchField("candidate_first_name"), "first_name");
  assert.equal(matchField("What is your LinkedIn profile?"), "linkedin");
  assert.equal(matchField("Will you now or in the future require visa sponsorship?"), "sponsorship");
  assert.equal(matchField("Highest degree earned"), "degree");
});
test("does not guess an unknown question", () => assert.equal(matchField("Describe a difficult technical decision"), null));
test("recognizes sensitive fields and attestations", () => {
  assert.equal(isSensitiveOrAttestation("Social Security Number"), true);
  assert.equal(isSensitiveOrAttestation("I certify this is correct"), true);
  assert.equal(isSensitiveOrAttestation("GitHub URL"), false);
});

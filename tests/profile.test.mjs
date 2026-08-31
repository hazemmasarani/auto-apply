import test from "node:test";
import assert from "node:assert/strict";
import { flattenedFacts, mergeProfile } from "../src/profile.js";

test("preserves every education and work entry for form filling", () => {
  const profile = mergeProfile({
    education: [{ school: "Stony Brook University" }, { school: "New York University", degree: "MS" }],
    work: [{ company: "Acme", title: "Engineer" }, { company: "Globex", title: "Developer" }]
  });
  const facts = flattenedFacts(profile);
  assert.equal(facts.education_entries.length, 2);
  assert.equal(facts.education_entries[1].school, "New York University");
  assert.equal(facts.work_entries.length, 2);
  assert.equal(facts.work_entries[1].title, "Developer");
});

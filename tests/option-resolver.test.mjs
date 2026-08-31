import test from "node:test";
import assert from "node:assert/strict";
import "../src/option-resolver.js";

const { parseOptionAliases, resolveSelectOptions, shouldAutoFill } = globalThis.JobOptionResolver;
const countries = [
  { value: "", label: "Select a country", disabled: false },
  { value: "US", label: "+1 United States", disabled: false },
  { value: "CA", label: "+1 Canada", disabled: false }
];

test("resolves USA to a site option with a calling code", () => {
  const result = resolveSelectOptions({ field: "country", value: "USA", options: countries });
  assert.equal(result.selected.value, "US");
  assert.equal(result.selected.label, "+1 United States");
  assert.equal(result.reason, "alias");
});

test("prefers an exact option value", () => {
  const result = resolveSelectOptions({ field: "country", value: "CA", options: countries });
  assert.equal(result.selected.value, "CA");
  assert.equal(result.reason, "exact");
});

test("uses a field-specific custom alias before a global alias", () => {
  const result = resolveSelectOptions({
    field: "work_authorization", value: "eligible", options: [{ value: "yes", label: "Yes, authorized to work", disabled: false }],
    aliases: [{ field: "*", source: "eligible", target: "missing" }, { field: "work_authorization", source: "eligible", target: "Yes, authorized to work" }]
  });
  assert.equal(result.selected.value, "yes");
  assert.equal(result.reason, "custom");
});

test("selects the first best custom-alias suggestion", () => {
  const result = resolveSelectOptions({
    field: "country", value: "north america", options: countries,
    aliases: [{ field: "country", source: "north america", target: "+1 United States" }, { field: "country", source: "north america", target: "+1 Canada" }]
  });
  assert.equal(result.selected.value, "US");
  assert.equal(result.candidates.length, 2);
  assert.equal(result.reason, "best");
});

test("only auto-fills saved values into empty, unprotected fields", () => {
  assert.equal(shouldAutoFill({ value: "Ada", hasExistingValue: false }), true);
  assert.equal(shouldAutoFill({ value: "Ada", hasExistingValue: true }), false);
  assert.equal(shouldAutoFill({ value: "", hasExistingValue: false }), false);
  assert.equal(shouldAutoFill({ value: "Ada", hasExistingValue: false, isProtected: true }), false);
});

test("validates duplicate and malformed aliases", () => {
  assert.deepEqual(parseOptionAliases("country | USA | +1 United States"), [{ field: "country", source: "USA", target: "+1 United States" }]);
  assert.throws(() => parseOptionAliases("country | USA"), /Alias line 1/);
  assert.throws(() => parseOptionAliases("country | USA | United States\ncountry | USA | US"), /duplicates/);
});

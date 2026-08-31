(() => {
  const COUNTRY_ALIASES = new Map([
    ["united states", "united states"], ["united states of america", "united states"], ["us", "united states"], ["usa", "united states"], ["america", "united states"],
    ["united kingdom", "united kingdom"], ["uk", "united kingdom"], ["great britain", "united kingdom"], ["britain", "united kingdom"],
    ["canada", "canada"], ["ca", "canada"], ["australia", "australia"], ["au", "australia"],
    ["germany", "germany"], ["de", "germany"], ["france", "france"], ["fr", "france"],
    ["india", "india"], ["in", "india"], ["japan", "japan"], ["jp", "japan"],
    ["south korea", "south korea"], ["korea republic of", "south korea"], ["republic of korea", "south korea"],
    ["uae", "united arab emirates"], ["united arab emirates", "united arab emirates"]
  ]);
  const US_STATES = new Map([
    ["alabama", "al"], ["al", "al"], ["alaska", "ak"], ["ak", "ak"], ["arizona", "az"], ["az", "az"], ["arkansas", "ar"], ["ar", "ar"], ["california", "ca"], ["ca", "ca"], ["colorado", "co"], ["co", "co"], ["connecticut", "ct"], ["ct", "ct"], ["delaware", "de"], ["de", "de"], ["florida", "fl"], ["fl", "fl"], ["georgia", "ga"], ["ga", "ga"], ["hawaii", "hi"], ["hi", "hi"], ["idaho", "id"], ["id", "id"], ["illinois", "il"], ["il", "il"], ["indiana", "in"], ["in", "in"], ["iowa", "ia"], ["ia", "ia"], ["kansas", "ks"], ["ks", "ks"], ["kentucky", "ky"], ["ky", "ky"], ["louisiana", "la"], ["la", "la"], ["maine", "me"], ["me", "me"], ["maryland", "md"], ["md", "md"], ["massachusetts", "ma"], ["ma", "ma"], ["michigan", "mi"], ["mi", "mi"], ["minnesota", "mn"], ["mn", "mn"], ["mississippi", "ms"], ["ms", "ms"], ["missouri", "mo"], ["mo", "mo"], ["montana", "mt"], ["mt", "mt"], ["nebraska", "ne"], ["ne", "ne"], ["nevada", "nv"], ["nv", "nv"], ["new hampshire", "nh"], ["nh", "nh"], ["new jersey", "nj"], ["nj", "nj"], ["new mexico", "nm"], ["nm", "nm"], ["new york", "ny"], ["ny", "ny"], ["north carolina", "nc"], ["nc", "nc"], ["north dakota", "nd"], ["nd", "nd"], ["ohio", "oh"], ["oh", "oh"], ["oklahoma", "ok"], ["ok", "ok"], ["oregon", "or"], ["or", "or"], ["pennsylvania", "pa"], ["pa", "pa"], ["rhode island", "ri"], ["ri", "ri"], ["south carolina", "sc"], ["sc", "sc"], ["south dakota", "sd"], ["sd", "sd"], ["tennessee", "tn"], ["tn", "tn"], ["texas", "tx"], ["tx", "tx"], ["utah", "ut"], ["ut", "ut"], ["vermont", "vt"], ["vt", "vt"], ["virginia", "va"], ["va", "va"], ["washington", "wa"], ["wa", "wa"], ["west virginia", "wv"], ["wv", "wv"], ["wisconsin", "wi"], ["wi", "wi"], ["wyoming", "wy"], ["wy", "wy"], ["district of columbia", "dc"], ["dc", "dc"]
  ]);

  function normalizeOptionText(value) {
    return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
  }
  function withoutCallingCode(value) { return normalizeOptionText(value).replace(/^\d{1,4}\s+/, ""); }
  function optionForms(option) { return [normalizeOptionText(option.label), normalizeOptionText(option.value), withoutCallingCode(option.label), withoutCallingCode(option.value)].filter(Boolean); }
  function unique(options) { return [...new Map(options.map(option => [option.value, option])).values()]; }
  function canonical(field, value) {
    const clean = withoutCallingCode(value);
    if (field === "country") return COUNTRY_ALIASES.get(clean) || clean;
    if (field === "state") return US_STATES.get(clean) || clean;
    return clean;
  }
  function matchingOptions(options, target) { const normalized = normalizeOptionText(target); return unique(options.filter(option => optionForms(option).includes(normalized) || optionForms(option).includes(withoutCallingCode(target)))); }

  function resolveSelectOptions({ field, value, options, aliases = [] }) {
    const available = options.filter(option => !option.disabled && String(option.value || "").trim());
    const raw = normalizeOptionText(value);
    if (!raw) return { selected: null, candidates: [], reason: "empty" };
    const exact = matchingOptions(available, value);
    if (exact.length === 1) return { selected: exact[0], candidates: exact, reason: "exact" };
    if (exact.length > 1) return { selected: null, candidates: exact, reason: "ambiguous" };

    const applicableAliases = aliases.filter(alias => (alias.field === field || alias.field === "*") && normalizeOptionText(alias.source) === raw);
    const aliasesForField = applicableAliases.filter(alias => alias.field === field);
    const aliasMatches = (aliasesForField.length ? aliasesForField : applicableAliases).flatMap(alias => matchingOptions(available, alias.target));
    const custom = unique(aliasMatches);
    if (custom.length === 1) return { selected: custom[0], candidates: custom, reason: "custom" };
    if (custom.length > 1) return { selected: null, candidates: custom, reason: "ambiguous" };

    if (field === "country" || field === "state") {
      const target = canonical(field, value);
      const semantic = unique(available.filter(option => optionForms(option).some(form => canonical(field, form) === target)));
      if (semantic.length === 1) return { selected: semantic[0], candidates: semantic, reason: "alias" };
      if (semantic.length > 1) return { selected: null, candidates: semantic, reason: "ambiguous" };
    }
    return { selected: null, candidates: [], reason: "none" };
  }

  function parseOptionAliases(text) {
    const aliases = [];
    const seen = new Set();
    String(text || "").split(/\r?\n/).forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const parts = trimmed.split("|").map(value => value.trim());
      if (parts.length !== 3 || !parts.every(Boolean)) throw new Error(`Alias line ${index + 1} must use: field | saved value | site option label.`);
      const [field, source, target] = parts;
      if (field !== "*" && !/^[a-z_]+$/.test(field)) throw new Error(`Alias line ${index + 1} has an invalid field name.`);
      const key = `${field}\u0000${normalizeOptionText(source)}`;
      if (seen.has(key)) throw new Error(`Alias line ${index + 1} duplicates an earlier field and saved value.`);
      seen.add(key); aliases.push({ field, source, target });
    });
    return aliases;
  }
  function formatOptionAliases(aliases = []) { return aliases.map(alias => `${alias.field} | ${alias.source} | ${alias.target}`).join("\n"); }

  globalThis.JobOptionResolver = { normalizeOptionText, parseOptionAliases, formatOptionAliases, resolveSelectOptions };
})();

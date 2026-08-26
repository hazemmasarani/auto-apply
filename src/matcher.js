const RULES = [
  ["first_name", /\b(first|given)\s*name\b/i], ["last_name", /\b(last|family|sur)\s*name\b/i],
  ["full_name", /\b(full|legal)\s*name\b|^name$/i], ["email", /e-?mail/i], ["phone", /phone|mobile/i],
  ["linkedin", /linked\s*in/i], ["github", /git\s*hub/i], ["portfolio", /portfolio|personal\s*(site|website)/i],
  ["postal_code", /zip|postal/i], ["address", /street|address\s*(line)?\s*1/i], ["city", /\bcity\b/i],
  ["state", /state|province|region/i], ["country", /\bcountry\b/i], ["degree", /degree|qualification/i],
  ["school", /school|university|college|institution/i], ["field_of_study", /field\s*of\s*study|major/i],
  ["graduation_year", /graduat.*(year|date)/i], ["employer", /employer|company/i], ["job_title", /job\s*title|position\s*title/i],
  ["skills", /\bskills?\b|technologies/i], ["work_authorization", /authori[sz].*(work|employment)|legally.*work/i],
  ["sponsorship", /sponsor|visa/i], ["preferred_locations", /preferred.*location/i], ["remote", /remote.*(work|preference)/i],
  ["salary", /salary|compensation|pay\s*(range|expectation)/i], ["notice_period", /notice\s*period|start\s*date|availability/i],
  ["why_interested", /why.*(interested|apply|company|role)|interest.*position/i]
];

export function matchField(text) {
  const normalized = String(text || "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  for (const [key, pattern] of RULES) if (pattern.test(normalized)) return key;
  return null;
}

export function isSensitiveOrAttestation(text) {
  return /social security|ssn|passport|driver.?s license|bank|credit card|date of birth|birth date|gender|race|ethnicity|disability|veteran|signature|certif(y|ication)|agree|terms|captcha/i.test(text || "");
}

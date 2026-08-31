export const EMPTY_PROFILE = {
  contact: { firstName: "", lastName: "", email: "", phone: "", address: "", city: "", state: "", postalCode: "", country: "" },
  links: { linkedin: "", github: "", portfolio: "" },
  authorization: { authorized: "", sponsorship: "" },
  preferences: { locations: "", remote: "" },
  education: [{ school: "", degree: "", field: "", graduationYear: "" }],
  work: [{ company: "", title: "", startDate: "", endDate: "", description: "" }],
  skills: "",
  optionAliases: [],
  standardAnswers: { whyInterested: "", salary: "", noticePeriod: "" },
  generator: { endpoint: "https://api.openai.com/v1/chat/completions", model: "", apiKey: "" }
};

export function mergeProfile(value = {}) {
  return {
    ...structuredClone(EMPTY_PROFILE), ...value,
    contact: { ...EMPTY_PROFILE.contact, ...value.contact },
    links: { ...EMPTY_PROFILE.links, ...value.links },
    authorization: { ...EMPTY_PROFILE.authorization, ...value.authorization },
    preferences: { ...EMPTY_PROFILE.preferences, ...value.preferences },
    standardAnswers: { ...EMPTY_PROFILE.standardAnswers, ...value.standardAnswers },
    generator: { ...EMPTY_PROFILE.generator, ...value.generator },
    optionAliases: Array.isArray(value.optionAliases) ? value.optionAliases.filter(alias => alias && typeof alias.field === "string" && typeof alias.source === "string" && typeof alias.target === "string") : [],
    education: value.education?.length ? value.education : structuredClone(EMPTY_PROFILE.education),
    work: value.work?.length ? value.work : structuredClone(EMPTY_PROFILE.work)
  };
}

export function flattenedFacts(profile) {
  const p = mergeProfile(profile);
  return {
    first_name: p.contact.firstName, last_name: p.contact.lastName,
    full_name: `${p.contact.firstName} ${p.contact.lastName}`.trim(),
    email: p.contact.email, phone: p.contact.phone, address: p.contact.address,
    city: p.contact.city, state: p.contact.state, postal_code: p.contact.postalCode,
    country: p.contact.country, linkedin: p.links.linkedin, github: p.links.github,
    portfolio: p.links.portfolio, work_authorization: p.authorization.authorized,
    sponsorship: p.authorization.sponsorship, preferred_locations: p.preferences.locations,
    remote: p.preferences.remote, school: p.education[0]?.school || "",
    degree: p.education[0]?.degree || "", field_of_study: p.education[0]?.field || "",
    graduation_year: p.education[0]?.graduationYear || "", employer: p.work[0]?.company || "",
    job_title: p.work[0]?.title || "", skills: p.skills,
    salary: p.standardAnswers.salary, notice_period: p.standardAnswers.noticePeriod,
    why_interested: p.standardAnswers.whyInterested,
    option_aliases: p.optionAliases
  };
}

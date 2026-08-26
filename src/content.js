(() => {
  const PANEL_ID = "job-copilot-panel";
  const fieldMap = new Map();

  function visible(element) { const style = getComputedStyle(element); const box = element.getBoundingClientRect(); return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0 && !element.disabled && !element.readOnly; }
  function fieldText(element) {
    const labels = element.labels ? [...element.labels].map(label => label.innerText) : [];
    const ariaId = element.getAttribute("aria-labelledby");
    const ariaText = ariaId ? ariaId.split(/\s+/).map(id => document.getElementById(id)?.innerText || "").join(" ") : "";
    return [element.name, element.id, element.placeholder, element.getAttribute("aria-label"), ariaText, ...labels].filter(Boolean).join(" ");
  }
  function normalize(text) { return String(text || "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim(); }
  const rules = [
    ["first_name", /\b(first|given)\s*name\b/i],["last_name", /\b(last|family|sur)\s*name\b/i],["full_name", /\b(full|legal)\s*name\b|^name$/i],
    ["email", /e-?mail/i],["phone", /phone|mobile/i],["linkedin", /linked\s*in/i],["github", /git\s*hub/i],["portfolio", /portfolio|personal\s*(site|website)/i],
    ["postal_code", /zip|postal/i],["address", /street|address\s*(line)?\s*1/i],["city", /\bcity\b/i],["state", /state|province|region/i],["country", /\bcountry\b/i],
    ["degree", /degree|qualification/i],["school", /school|university|college|institution/i],["field_of_study", /field\s*of\s*study|major/i],["graduation_year", /graduat.*(year|date)/i],
    ["employer", /employer|company/i],["job_title", /job\s*title|position\s*title/i],["skills", /\bskills?\b|technologies/i],["work_authorization", /authori[sz].*(work|employment)|legally.*work/i],
    ["sponsorship", /sponsor|visa/i],["preferred_locations", /preferred.*location/i],["remote", /remote.*(work|preference)/i],["salary", /salary|compensation|pay\s*(range|expectation)/i],
    ["notice_period", /notice\s*period|start\s*date|availability/i],["why_interested", /why.*(interested|apply|company|role)|interest.*position/i]
  ];
  const sensitive = /social security|ssn|passport|driver.?s license|bank|credit card|date of birth|birth date|gender|race|ethnicity|disability|veteran|signature|certif(y|ication)|agree|terms|captcha/i;
  function match(text) { const clean = normalize(text); for (const [key, regex] of rules) if (regex.test(clean)) return key; return null; }
  function setNativeValue(element, value) {
    const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
    setter ? setter.call(element, value) : element.value = value;
    element.dispatchEvent(new Event("input", { bubbles: true })); element.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function selectValue(element, value) {
    const option = [...element.options].find(item => normalize(item.textContent).toLowerCase() === normalize(value).toLowerCase() || normalize(item.value).toLowerCase() === normalize(value).toLowerCase());
    if (option) setNativeValue(element, option.value);
  }
  function pageContext() {
    const selectors = ["[class*=description]", "[id*=description]", "main", "article"];
    for (const selector of selectors) { const text = document.querySelector(selector)?.innerText?.trim(); if (text?.length > 200) return text.slice(0, 12000); }
    return document.body.innerText.slice(0, 12000);
  }
  function make(tag, attributes = {}, text = "") { const element = document.createElement(tag); Object.entries(attributes).forEach(([key, value]) => key === "class" ? element.className = value : element.setAttribute(key, value)); element.textContent = text; return element; }
  async function scan() {
    document.getElementById(PANEL_ID)?.remove(); fieldMap.clear();
    const response = await chrome.runtime.sendMessage({ type: "GET_FACTS" });
    if (response.error) return alert(response.error);
    const panel = make("aside", { id: PANEL_ID });
    const header = make("div", { class: "jac-header" }); header.append(make("strong", {}, "Application Copilot"));
    const close = make("button", { type: "button", title: "Close" }, "×"); close.onclick = () => panel.remove(); header.append(close); panel.append(header);
    panel.append(make("p", { class: "jac-note" }, "Review each value. Nothing is submitted automatically."));
    const fields = [...document.querySelectorAll("input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=file]), textarea, select")].filter(visible);
    let count = 0;
    fields.forEach((field, index) => {
      const text = fieldText(field); if (!text || sensitive.test(text)) return;
      const key = match(text); const value = key ? response.facts[key] : "";
      const isUnknownLongForm = !key && field instanceof HTMLTextAreaElement;
      if (!value && !isUnknownLongForm) return;
      const id = `jac-${index}`; fieldMap.set(id, field); count++;
      const row = make("div", { class: "jac-row" }); row.append(make("label", {}, text.slice(0, 100)));
      const editor = make("textarea", { "data-field-id": id, rows: value?.length > 100 ? "3" : "2" }); editor.value = value || ""; row.append(editor);
      if (isUnknownLongForm) { const generate = make("button", { type: "button", class: "jac-secondary" }, "Generate grounded draft"); generate.onclick = async () => { generate.disabled = true; generate.textContent = "Drafting…"; const result = await chrome.runtime.sendMessage({ type: "GENERATE", question: text, jobContext: pageContext() }); generate.disabled = false; generate.textContent = "Generate grounded draft"; if (result.error) alert(result.error); else editor.value = result.answer; }; row.append(generate); }
      const fill = make("button", { type: "button" }, "Fill this field"); fill.onclick = () => { field instanceof HTMLSelectElement ? selectValue(field, editor.value) : setNativeValue(field, editor.value); field.scrollIntoView({ behavior: "smooth", block: "center" }); }; row.append(fill); panel.append(row);
    });
    if (!count) panel.append(make("p", {}, "No safe, recognized fields were found on this page."));
    document.documentElement.append(panel);
  }
  chrome.runtime.onMessage.addListener(message => { if (message.type === "SCAN") scan(); });
})();

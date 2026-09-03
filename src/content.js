(() => {
  const PANEL_ID = "job-copilot-panel";
  const fieldMap = new Map();
  const customOptionCache = new WeakMap();
  const { resolveSelectOptions, shouldAutoFill, isPlaceholderOption } = globalThis.JobOptionResolver;

  function isCustomDropdown(element) { return !(element instanceof HTMLSelectElement) && (element.getAttribute("role") === "combobox" || /listbox/i.test(element.getAttribute("aria-haspopup") || "")); }
  function visible(element) { const style = getComputedStyle(element); const box = element.getBoundingClientRect(); return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0 && !element.disabled && (!element.readOnly || isCustomDropdown(element)); }
  function openRoots(root = document) {
    const roots = [root];
    for (let index = 0; index < roots.length; index++) roots[index].querySelectorAll("*").forEach(element => { if (element.shadowRoot) roots.push(element.shadowRoot); });
    return roots;
  }
  function queryAllDeep(selector) { return [...new Set(openRoots().flatMap(root => [...root.querySelectorAll(selector)]))]; }
  function byIdDeep(id) { return openRoots().map(root => root.getElementById?.(id) || root.querySelector?.(`#${CSS.escape(id)}`)).find(Boolean); }
  function fieldText(element) {
    const labels = element.labels ? [...element.labels].map(label => label.innerText) : [];
    const wrappingLabel = element.closest("label")?.innerText;
    const associatedLabel = element.id ? element.getRootNode().querySelector?.(`label[for="${CSS.escape(element.id)}"]`)?.innerText : "";
    const displayedText = isCustomDropdown(element) ? element.innerText || element.textContent : "";
    const ariaId = element.getAttribute("aria-labelledby");
    const ariaText = ariaId ? ariaId.split(/\s+/).map(id => byIdDeep(id)?.innerText || "").join(" ") : "";
    return [element.name, element.id, element.placeholder, element.getAttribute("aria-label"), ariaText, associatedLabel, wrappingLabel, displayedText, ...labels].filter(Boolean).join(" ");
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
  function selectValue(element, value) { const option = [...element.options].find(item => item.value === value); if (!option) return false; setNativeValue(element, option.value); return true; }
  function selectOptions(element) { return [...element.options].map(option => ({ value: option.value, label: option.textContent.trim(), disabled: option.disabled })); }
  function hasExistingValue(element) {
    if (element instanceof HTMLSelectElement) return !isPlaceholderOption({ value: element.value, label: element.selectedOptions[0]?.textContent, disabled: element.selectedOptions[0]?.disabled }, element.selectedIndex);
    if (isCustomDropdown(element)) {
      const value = element instanceof HTMLInputElement ? element.value : element.getAttribute("data-value") || element.textContent;
      return Boolean(String(value || "").trim()) && !/^(select|choose|pick)( an?| one| option| value)?/i.test(String(value).trim());
    }
    return Boolean(String(element.value || "").trim());
  }
  function matchingFields() {
    const selector = "input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=file]), textarea, select, [role=combobox], [aria-haspopup=listbox]";
    return queryAllDeep(selector).filter(element => !element.closest(`#${PANEL_ID}`) && visible(element));
  }
  function aiFieldId(field, index) { const id = `jac-ai-field-${index}`; field.setAttribute("data-jac-ai-id", id); return id; }
  function fieldOptions(field) {
    if (field instanceof HTMLSelectElement) return [...field.options].filter(option => !option.disabled).map(option => option.textContent.trim()).filter(Boolean).slice(0, 200);
    return customOptionCache.get(field)?.map(option => option.label).slice(0, 200) || [];
  }
  function choiceQuestion(fields) { return fields[0]?.closest("fieldset")?.querySelector("legend")?.innerText?.trim() || fieldText(fields[0]); }
  function choiceLabel(field) { return field.labels?.[0]?.innerText?.trim() || field.getAttribute("aria-label") || field.value || "Option"; }
  function setChecked(field, checked) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "checked")?.set;
    setter ? setter.call(field, checked) : field.checked = checked;
    field.dispatchEvent(new Event("input", { bubbles: true })); field.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function sanitizedFormHtml() {
    const clone = document.documentElement.cloneNode(true);
    clone.querySelectorAll("script, style, noscript, iframe, svg, canvas, input[type=password], input[type=hidden]").forEach(element => element.remove());
    clone.querySelectorAll("input, textarea").forEach(element => { element.removeAttribute("value"); element.textContent = ""; });
    clone.querySelectorAll("option").forEach(option => option.removeAttribute("selected"));
    clone.querySelectorAll("[onclick], [onchange], [oninput]").forEach(element => { element.removeAttribute("onclick"); element.removeAttribute("onchange"); element.removeAttribute("oninput"); });
    return clone.outerHTML.slice(0, 50000);
  }
  async function aiFieldValues(fields) {
    const choiceGroups = new Map();
    const allowed = fields.flatMap((field, index) => {
      const text = fieldText(field);
      if (field instanceof HTMLInputElement && ["checkbox", "radio"].includes(field.type)) {
        const groupKey = `${field.type}:${field.name || index}`;
        const group = choiceGroups.get(groupKey) || []; group.push(field); choiceGroups.set(groupKey, group); return [];
      }
      if (!text || sensitive.test(text)) return [];
      return [{ id: aiFieldId(field, index), label: text.slice(0, 300), type: field instanceof HTMLSelectElement || isCustomDropdown(field) ? "select" : field.tagName.toLowerCase(), options: fieldOptions(field) }];
    });
    const groups = [...choiceGroups.values()].map((fields, index) => {
      const id = `jac-ai-choice-${index}`;
      const options = fields.map((field, optionIndex) => { const optionId = `${id}-option-${optionIndex}`; field.setAttribute("data-jac-ai-choice-option", optionId); return { id: optionId, label: choiceLabel(field) }; });
      return { id, fields, type: fields[0].type === "radio" ? "single_choice" : "multi_choice", label: choiceQuestion(fields).slice(0, 300), options };
    }).filter(group => !sensitive.test(group.label) && !group.fields.some(field => sensitive.test(fieldText(field))));
    allowed.push(...groups.map(group => ({ id: group.id, label: group.label, type: group.type, options: group.options })));
    if (!allowed.length) return { values: new Map(), groups };
    const result = await chrome.runtime.sendMessage({ type: "AI_FORM_FILL", fields: allowed, formHtml: sanitizedFormHtml() });
    if (result.error) throw new Error(result.error);
    return { values: new Map((result.values || []).map(item => [item.id, item.value])), groups };
  }
  function applyChoiceValues(groups, values) {
    let filled = 0;
    groups.forEach(group => {
      if (group.fields.some(field => field.checked)) return;
      const selected = values.get(group.id); const ids = Array.isArray(selected) ? selected : [selected];
      const options = group.fields.filter(field => ids.includes(field.getAttribute("data-jac-ai-choice-option")));
      const chosen = group.type === "single_choice" ? options.slice(0, 1) : options;
      chosen.forEach(field => setChecked(field, true)); if (chosen.length) filled++;
    });
    return filled;
  }
  function countRepeatedFields(kind) {
    const startKey = kind === "education" ? "school" : "employer";
    return matchingFields().filter(field => match(fieldText(field)) === startKey).length;
  }
  function addButton(kind) {
    const pattern = kind === "education" ? /add\s+(another\s+)?(education|school|degree)/i : /add\s+(another\s+)?(work|experience|employment|position|job)/i;
    return [...document.querySelectorAll("button, [role=button]")].find(button => visible(button) && pattern.test(`${button.innerText || ""} ${button.getAttribute("aria-label") || ""}`));
  }
  function waitForFieldCount(kind, before, timeout = 1200) {
    if (countRepeatedFields(kind) > before) return Promise.resolve(true);
    return new Promise(resolve => {
      const observer = new MutationObserver(() => { if (countRepeatedFields(kind) > before) { observer.disconnect(); clearTimeout(timer); resolve(true); } });
      const timer = setTimeout(() => { observer.disconnect(); resolve(countRepeatedFields(kind) > before); }, timeout);
      observer.observe(document.documentElement, { childList: true, subtree: true });
    });
  }
  async function expandRepeatedFields(kind, wanted) {
    let current = countRepeatedFields(kind);
    while (current < wanted) {
      const button = addButton(kind); if (!button) break;
      const before = current; button.click();
      if (!await waitForFieldCount(kind, before)) break;
      current = countRepeatedFields(kind);
    }
    return current;
  }
  function profileValue(key, facts, cursors) {
    const educationKeys = { school: "school", degree: "degree", field_of_study: "field", graduation_year: "graduationYear" };
    const workKeys = { employer: "company", job_title: "title" };
    if (key in educationKeys) {
      if (key === "school" && cursors.seenEducation) cursors.education++;
      cursors.seenEducation = true; const entry = facts.education_entries?.[cursors.education] || {}; return entry[educationKeys[key]] || "";
    }
    if (key in workKeys) {
      if (key === "employer" && cursors.seenWork) cursors.work++;
      cursors.seenWork = true; const entry = facts.work_entries?.[cursors.work] || {}; return entry[workKeys[key]] || "";
    }
    return facts[key] || "";
  }
  function setInputValue(element, value) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter ? setter.call(element, value) : element.value = value;
    element.dispatchEvent(new Event("input", { bubbles: true }));
  }
  function autocompleteEnabled(field, key) {
    return field instanceof HTMLInputElement && (field.getAttribute("role") === "combobox" || field.hasAttribute("aria-autocomplete") || field.hasAttribute("aria-controls") || field.hasAttribute("aria-owns") || field.hasAttribute("aria-haspopup") || ["school", "city", "state", "country"].includes(key));
  }
  function suggestionElements(field) {
    const ids = [field.getAttribute("aria-controls"), field.getAttribute("aria-owns")].filter(Boolean).flatMap(value => value.split(/\s+/));
    const linked = ids.map(id => byIdDeep(id)).filter(Boolean);
    const roots = linked.length ? linked : queryAllDeep("[role=listbox], [role=menu]");
    const elements = roots.flatMap(root => [...root.querySelectorAll("[role=option], [role=menuitem], li")]);
    return elements.filter(element => !element.closest(`#${PANEL_ID}`) && visible(element) && (element.innerText || element.textContent).trim());
  }
  function suggestionOptions(field) {
    return suggestionElements(field).map((element, index) => ({
      value: element.getAttribute("data-value") || element.getAttribute("value") || `${index}:${element.innerText.trim()}`,
      label: element.innerText.trim(), disabled: element.getAttribute("aria-disabled") === "true", element
    }));
  }
  function waitForSuggestions(field, timeout = 900) {
    const available = suggestionOptions(field); if (available.length) return Promise.resolve(available);
    return new Promise(resolve => {
      const observer = new MutationObserver(() => { const options = suggestionOptions(field); if (options.length) { observer.disconnect(); clearTimeout(timer); resolve(options); } });
      const timer = setTimeout(() => { observer.disconnect(); resolve(suggestionOptions(field)); }, timeout);
      observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-expanded", "style", "class"] });
    });
  }
  function activateSuggestion(option) {
    const eventNames = ["pointerdown", "mousedown", "pointerup", "mouseup", "click"];
    eventNames.forEach(type => option.element.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window })));
  }
  function openDropdown(field) {
    field.focus();
    ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach(type => field.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window })));
    if (field.getAttribute("aria-expanded") !== "true") field.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", code: "ArrowDown", bubbles: true, cancelable: true }));
  }
  async function prepareCustomOptions(fields) {
    for (const field of fields.filter(isCustomDropdown)) {
      openDropdown(field);
      const options = await waitForSuggestions(field, 600);
      if (options.length) customOptionCache.set(field, options);
      field.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true, cancelable: true }));
    }
  }
  async function applyValue(field, key, value, aliases) {
    if (field instanceof HTMLSelectElement) {
      const result = resolveSelectOptions({ field: key, value, options: selectOptions(field), aliases });
      return { filled: Boolean(result.selected && selectValue(field, result.selected.value)), result };
    }
    if (!isCustomDropdown(field) && (!(field instanceof HTMLInputElement) || !autocompleteEnabled(field, key))) { setNativeValue(field, value); return { filled: true, result: null }; }
    openDropdown(field);
    if (field instanceof HTMLInputElement && !field.readOnly) setInputValue(field, value);
    const options = await waitForSuggestions(field);
    if (!options.length) {
      if (field instanceof HTMLInputElement && !field.readOnly) { field.dispatchEvent(new Event("change", { bubbles: true })); return { filled: true, result: null }; }
      return { filled: false, result: null };
    }
    const result = resolveSelectOptions({ field: key, value, options, aliases });
    if (!result.selected) { field.dispatchEvent(new Event("change", { bubbles: true })); return { filled: true, result }; }
    activateSuggestion(result.selected);
    return { filled: true, result };
  }
  function pageContext() {
    const selectors = ["[class*=description]", "[id*=description]", "main", "article"];
    for (const selector of selectors) { const text = document.querySelector(selector)?.innerText?.trim(); if (text?.length > 200) return text.slice(0, 12000); }
    return document.body.innerText.slice(0, 12000);
  }
  function firstText(selectors) {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      const text = element?.innerText?.trim() || element?.getAttribute?.("content")?.trim();
      if (text) return text.replace(/\s+/g, " ").slice(0, 180);
    }
    return "";
  }
  function detectedJob() {
    return {
      title: firstText(["[data-qa*=job-title]", "[data-testid*=job-title]", "[class*=job-title]", "h1", "meta[property='og:title']"]),
      company: firstText(["[data-qa*=company]", "[data-testid*=company]", "[class*=company-name]", "[class*=companyName]", "[itemprop='hiringOrganization']"]),
      description: pageContext(), link: location.href
    };
  }
  function make(tag, attributes = {}, text = "") { const element = document.createElement(tag); Object.entries(attributes).forEach(([key, value]) => key === "class" ? element.className = value : element.setAttribute(key, value)); element.textContent = text; return element; }
  function resumeFields() {
    const fields = [...document.querySelectorAll("input[type=file]")].filter(field => !field.disabled);
    const explicit = fields.filter(field => /\b(resume|curriculum\s+vitae|cv)\b/i.test(fieldText(field)));
    if (explicit.length) return explicit;
    const pdfFields = fields.filter(field => /pdf|application\/pdf/i.test(field.accept || ""));
    return pdfFields.length === 1 ? pdfFields : [];
  }
  function coverLetterFields() {
    return [...document.querySelectorAll("input[type=file], textarea")].filter(field => !field.disabled && !hasExistingValue(field) && /\bcover[\s_-]*letter\b/i.test(fieldText(field)));
  }
  async function addCoverLetter(panel, job) {
    const fields = coverLetterFields();
    if (!fields.length) return;
    const section = make("div", { class: "jac-cover-letter" }); section.append(make("strong", {}, "Cover letter"));
    const state = make("p", { class: "jac-cover-letter-state" }, "Generating a cover letter…"); section.append(state); panel.append(section);
    const result = await chrome.runtime.sendMessage({ type: "GENERATE_COVER_LETTER", job });
    if (result.error) { state.textContent = result.error; return; }
    const file = new File([result.document], "Cover Letter.doc", { type: "application/msword" }); let filled = 0;
    for (const field of fields) {
      try {
        if (field instanceof HTMLTextAreaElement) setNativeValue(field, result.letter);
        else { const transfer = new DataTransfer(); transfer.items.add(file); field.files = transfer.files; field.dispatchEvent(new Event("input", { bubbles: true })); field.dispatchEvent(new Event("change", { bubbles: true })); }
        filled++;
      } catch { /* Leave protected custom widgets for manual upload. */ }
    }
    state.textContent = `Created ${result.fileName} and filled ${filled} cover-letter field${filled === 1 ? "" : "s"}.`;
  }
  async function addResumePicker(panel) {
    const fields = resumeFields();
    const result = await chrome.runtime.sendMessage({ type: "GET_RESUMES" });
    if (result.error || !result.resumes?.length) return;
    const section = make("div", { class: "jac-resumes" }); section.append(make("strong", {}, "Resume"));
    const select = make("select", { "aria-label": "Choose a resume" });
    result.resumes.forEach(resume => select.append(make("option", { value: resume.id }, resume.name))); section.append(select);
    const state = make("p", { class: "jac-resume-state" }, fields.length ? `${fields.length} resume upload field${fields.length === 1 ? "" : "s"} found.` : "No resume upload field was found on this page."); section.append(state);
    const upload = make("button", { type: "button" }, "Use selected resume"); upload.disabled = !fields.length;
    upload.onclick = async () => {
      upload.disabled = true; state.textContent = "Loading resume…";
      const fileResult = await chrome.runtime.sendMessage({ type: "GET_RESUME_FILE", id: select.value });
      if (fileResult.error) { state.textContent = fileResult.error; upload.disabled = false; return; }
      const file = new File([new Uint8Array(fileResult.bytes)], fileResult.fileName, { type: "application/pdf" }); let filled = 0;
      for (const field of fields) {
        try { const transfer = new DataTransfer(); transfer.items.add(file); field.files = transfer.files; field.dispatchEvent(new Event("input", { bubbles: true })); field.dispatchEvent(new Event("change", { bubbles: true })); filled++; }
        catch { /* Some custom upload widgets require manual file selection. */ }
      }
      state.textContent = filled ? `${fileResult.fileName} added to ${filled} upload field${filled === 1 ? "" : "s"}.` : "This site requires the resume to be selected manually."; upload.disabled = false;
    };
    section.append(upload); panel.append(section);
  }
  async function addTracker(panel) {
    const job = detectedJob();
    const section = make("div", { class: "jac-tracker" });
    section.append(make("strong", {}, "Application tracker"));
    section.append(make("p", { class: "jac-note" }, "Confirm the detected job details before saving."));
    const company = make("input", { type: "text", placeholder: "Company name", "aria-label": "Company name" }); company.value = job.company; section.append(company);
    const title = make("input", { type: "text", placeholder: "Position title", "aria-label": "Position title" }); title.value = job.title; section.append(title);
    const state = make("p", { class: "jac-tracker-state" }); section.append(state);
    const actions = make("div", { class: "jac-tracker-actions" }); section.append(actions);
    const lookup = await chrome.runtime.sendMessage({ type: "TRACK_JOB_LOOKUP", job });
    if (lookup.error) state.textContent = "Enter the company and position title to start tracking this application.";
    function show(application) { state.textContent = application ? `Saved as ${application.status.replace("_", " ")} on ${new Date(application.updatedAt).toLocaleDateString()}.` : "Not yet saved to your application history."; }
    async function save(status) {
      job.company = company.value;
      job.title = title.value;
      actions.querySelectorAll("button").forEach(button => button.disabled = true);
      const result = await chrome.runtime.sendMessage({ type: "SAVE_APPLICATION", job, status });
      actions.querySelectorAll("button").forEach(button => button.disabled = false);
      state.textContent = result.error || "";
      if (result.application) show(result.application);
    }
    [["draft", "Save draft"], ["in_progress", "Mark in progress"], ["applied", "Mark as applied"]].forEach(([status, label]) => {
      const button = make("button", { type: "button", class: status === "applied" ? "" : "jac-secondary" }, label);
      button.onclick = () => save(status); actions.append(button);
    });
    if (!lookup.error) show(lookup.application); panel.append(section);
  }
  async function scan() {
    document.getElementById(PANEL_ID)?.remove(); fieldMap.clear();
    const response = await chrome.runtime.sendMessage({ type: "GET_FACTS" });
    if (response.error) { if (window === window.top) alert(response.error); return; }
    const panel = make("aside", { id: PANEL_ID });
    const header = make("div", { class: "jac-header" }); header.append(make("strong", {}, "Application Copilot"));
    const close = make("button", { type: "button", title: "Close" }, "×"); close.onclick = () => panel.remove(); header.append(close); panel.append(header);
    panel.append(make("p", { class: "jac-note" }, "Recognized safe empty fields are filled automatically. Nothing is submitted automatically."));
    await addCoverLetter(panel, detectedJob());
    await addResumePicker(panel);
    await addTracker(panel);
    const [educationFields, workFields] = await Promise.all([
      expandRepeatedFields("education", response.facts.education_entries?.length || 1),
      expandRepeatedFields("work", response.facts.work_entries?.length || 1)
    ]);
    if (educationFields < (response.facts.education_entries?.length || 1) || workFields < (response.facts.work_entries?.length || 1)) panel.append(make("p", { class: "jac-note" }, "Some additional education or work sections could not be added automatically; use the page's Add button, then run Review fields again."));
    const fields = matchingFields();
    await prepareCustomOptions(fields);
    let aiValues = new Map();
    let aiChoiceGroups = [];
    try {
      const ai = await aiFieldValues(fields); aiValues = ai.values; aiChoiceGroups = ai.groups;
      const choicesFilled = applyChoiceValues(aiChoiceGroups, aiValues);
      const prepared = aiValues.size - choicesFilled;
      panel.append(make("p", { class: "jac-note" }, aiValues.size ? `AI prepared ${prepared} text field value${prepared === 1 ? "" : "s"} and selected ${choicesFilled} choice field${choicesFilled === 1 ? "" : "s"}.` : "AI found no additional confident field values; profile values remain available."));
    } catch (error) { panel.append(make("p", { class: "jac-note" }, `AI fill unavailable: ${error.message}`)); }
    let count = 0;
    const cursors = { education: 0, work: 0, seenEducation: false, seenWork: false };
    for (const [index, field] of fields.entries()) {
      const text = fieldText(field); if (!text || sensitive.test(text)) continue;
      if (field instanceof HTMLInputElement && ["checkbox", "radio"].includes(field.type)) continue;
      const key = match(text); const fallbackValue = key ? profileValue(key, response.facts, cursors) : "";
      const value = aiValues.get(field.getAttribute("data-jac-ai-id")) || fallbackValue;
      const isUnknownLongForm = !key && field instanceof HTMLTextAreaElement;
      if (!value && !isUnknownLongForm) continue;
      const id = `jac-${index}`; fieldMap.set(id, field); count++;
      const row = make("div", { class: "jac-row" }); row.append(make("label", {}, text.slice(0, 100)));
      let editor;
      let optionResult = null;
      let autoFilled = false;
      const canAutoFill = shouldAutoFill({ value, hasExistingValue: hasExistingValue(field) });
      if (field instanceof HTMLSelectElement) {
        optionResult = resolveSelectOptions({ field: key, value, options: selectOptions(field), aliases: response.facts.option_aliases || [] });
        editor = make("select", { "data-field-id": id, class: "jac-option-editor" });
        const placeholder = make("option", { value: "" }, optionResult.selected ? "Matched site option" : optionResult.candidates.length ? "Choose a suggested option" : "No matching site option");
        placeholder.disabled = true; editor.append(placeholder);
        const shownOptions = optionResult.candidates;
        shownOptions.forEach(option => editor.append(make("option", { value: option.value }, option.label)));
        editor.value = optionResult.selected?.value || "";
        if (canAutoFill && optionResult.selected) autoFilled = selectValue(field, optionResult.selected.value);
        const note = optionResult.selected ? `Matched: ${optionResult.selected.label}` : `No option matched saved value: ${value}`;
        row.append(make("p", { class: "jac-option-note" }, note));
      } else {
        editor = make("textarea", { "data-field-id": id, rows: value?.length > 100 ? "3" : "2" }); editor.value = value || "";
        if (canAutoFill && !isUnknownLongForm) {
          const applied = await applyValue(field, key, value, response.facts.option_aliases || []);
          autoFilled = applied.filled; optionResult = applied.result;
          if (optionResult?.selected) { editor.value = optionResult.selected.label; row.append(make("p", { class: "jac-option-note" }, `Selected suggestion: ${optionResult.selected.label}`)); }
          else if (autocompleteEnabled(field, key)) row.append(make("p", { class: "jac-option-note" }, "Typed saved value; no selectable suggestion was found."));
        }
      }
      const fillState = make("p", { class: "jac-fill-state" }, autoFilled ? "Filled automatically." : hasExistingValue(field) && !autoFilled ? "Existing page value kept." : "Not filled automatically.");
      row.append(fillState);
      row.append(editor);
      if (isUnknownLongForm) { const generate = make("button", { type: "button", class: "jac-secondary" }, "Generate grounded draft"); generate.onclick = async () => { generate.disabled = true; generate.textContent = "Drafting…"; const result = await chrome.runtime.sendMessage({ type: "GENERATE", question: text, jobContext: pageContext() }); generate.disabled = false; generate.textContent = "Generate grounded draft"; if (result.error) alert(result.error); else editor.value = result.answer; }; row.append(generate); }
      const fill = make("button", { type: "button" }, "Fill this field"); fill.onclick = async () => {
        fill.disabled = true;
        const applied = field instanceof HTMLSelectElement ? { filled: selectValue(field, editor.value), result: null } : await applyValue(field, key, editor.value, response.facts.option_aliases || []);
        fill.disabled = false;
        if (!applied.filled) { const note = row.querySelector(".jac-option-note"); if (note) note.textContent = "Choose a suggested site option before filling."; return; }
        const note = row.querySelector(".jac-option-note"); if (applied.result?.selected) { editor.value = applied.result.selected.label; if (note) note.textContent = `Selected suggestion: ${applied.result.selected.label}`; }
        fillState.textContent = "Filled from sidebar.";
        field.scrollIntoView({ behavior: "smooth", block: "center" });
      }; row.append(fill); panel.append(row);
    }
    if (!count) panel.append(make("p", {}, "No safe, recognized fields were found on this page."));
    if (window === window.top) document.documentElement.append(panel);
  }
  chrome.runtime.onMessage.addListener(message => { if (message.type === "SCAN") scan(); });
})();

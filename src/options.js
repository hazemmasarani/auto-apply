import { EMPTY_PROFILE, EMPTY_EDUCATION, EMPTY_WORK, mergeProfile } from "./profile.js";
import { saveProfile, unlockProfile, hasProfile } from "./storage.js";
import "./option-resolver.js";

const form = document.querySelector("#profile-form");
const status = document.querySelector("#status");

function getAtPath(object, path) { return path.split(".").reduce((value, key) => value?.[key], object); }
function setAtPath(object, path, value) {
  const parts = path.split("."); let target = object;
  parts.slice(0, -1).forEach(part => { target = target[part]; });
  target[parts.at(-1)] = value;
}
function input(labelText, value, path, multiline = false) { const label = document.createElement("label"); label.textContent = labelText; const control = document.createElement(multiline ? "textarea" : "input"); control.dataset.entryPath = path; control.value = value || ""; if (multiline) control.rows = 4; label.append(control); return label; }
function renderEntries(kind, entries) {
  const container = document.querySelector(`#${kind}-entries`); container.replaceChildren();
  entries.forEach((entry, index) => {
    const card = document.createElement("article"); card.className = "repeat-entry";
    const header = document.createElement("header"); const title = document.createElement("strong"); title.textContent = `${kind === "education" ? "Education" : "Work experience"} ${index + 1}`; header.append(title);
    if (entries.length > 1) { const remove = document.createElement("button"); remove.type = "button"; remove.className = "secondary"; remove.textContent = "Remove"; remove.onclick = () => { const current = readEntries(kind, kind === "education" ? EMPTY_EDUCATION : EMPTY_WORK); current.splice(index, 1); renderEntries(kind, current); }; header.append(remove); }
    card.append(header); const grid = document.createElement("div"); grid.className = "grid";
    if (kind === "education") { grid.append(input("School", entry.school, "school"), input("Degree", entry.degree, "degree"), input("Field of study", entry.field, "field"), input("Graduation year", entry.graduationYear, "graduationYear")); }
    else { grid.append(input("Company", entry.company, "company"), input("Title", entry.title, "title"), input("Start date", entry.startDate, "startDate"), input("End date", entry.endDate, "endDate"), input("Factual experience summary", entry.description, "description", true)); }
    card.append(grid); container.append(card);
  });
}
function readEntries(kind, template) { return [...document.querySelectorAll(`#${kind}-entries .repeat-entry`)].map(card => { const entry = structuredClone(template); card.querySelectorAll("[data-entry-path]").forEach(control => entry[control.dataset.entryPath] = control.value.trim()); return entry; }); }
function showProfile(profile) { document.querySelectorAll("[data-path]").forEach(input => { input.value = getAtPath(profile, input.dataset.path) || ""; }); renderEntries("education", profile.education); renderEntries("work", profile.work); document.querySelector("#option-aliases").value = globalThis.JobOptionResolver.formatOptionAliases(profile.optionAliases); }
function readProfile() { const profile = mergeProfile(EMPTY_PROFILE); document.querySelectorAll("[data-path]").forEach(input => setAtPath(profile, input.dataset.path, input.value.trim())); profile.education = readEntries("education", EMPTY_EDUCATION); profile.work = readEntries("work", EMPTY_WORK); profile.optionAliases = globalThis.JobOptionResolver.parseOptionAliases(document.querySelector("#option-aliases").value); return profile; }
function message(text, good = false) { status.textContent = text; status.className = good ? "success" : ""; }
const historyStatus = document.querySelector("#history-status");
const history = document.querySelector("#application-history");

function statusLabel(value) { return value.replace("_", " "); }
function renderHistory(applications) {
  history.replaceChildren();
  if (!applications.length) { history.textContent = "No tracked applications yet."; return; }
  for (const application of applications) {
    const item = document.createElement("article"); item.className = "history-item";
    const heading = document.createElement("strong"); heading.textContent = `${application.title} at ${application.company}`; item.append(heading);
    const link = document.createElement("a"); link.href = application.link; link.target = "_blank"; link.rel = "noreferrer"; link.textContent = "Open application"; item.append(link);
    const updated = document.createElement("span"); updated.className = "muted"; updated.textContent = `Updated ${new Date(application.updatedAt).toLocaleString()}`; item.append(updated);
    const select = document.createElement("select");
    [["draft", "Draft"], ["in_progress", "In progress"], ["applied", "Applied"]].forEach(([value, label]) => { const option = document.createElement("option"); option.value = value; option.textContent = label; option.selected = application.status === value; select.append(option); });
    select.addEventListener("change", async () => { const result = await chrome.runtime.sendMessage({ type: "SET_APPLICATION_STATUS", hash: application.hash, status: select.value }); if (result.error) { historyStatus.textContent = result.error; select.value = application.status; } else loadHistory(); });
    item.append(select); history.append(item);
  }
}
async function loadHistory() {
  const result = await chrome.runtime.sendMessage({ type: "GET_APPLICATIONS" });
  historyStatus.textContent = result.error || "";
  if (result.applications) renderHistory(result.applications);
}

showProfile(EMPTY_PROFILE);
document.querySelector("#add-education").addEventListener("click", () => { const entries = readEntries("education", EMPTY_EDUCATION); entries.push(structuredClone(EMPTY_EDUCATION)); renderEntries("education", entries); });
document.querySelector("#add-work").addEventListener("click", () => { const entries = readEntries("work", EMPTY_WORK); entries.push(structuredClone(EMPTY_WORK)); renderEntries("work", entries); });
document.querySelector("#unlock").addEventListener("click", async () => {
  try { showProfile(await unlockProfile(document.querySelector("#passphrase").value)); message("Profile unlocked. Edit it and save when ready.", true); await loadHistory(); }
  catch (error) { message(error.message); }
});
form.addEventListener("submit", async event => {
  event.preventDefault();
  try { await saveProfile(readProfile(), document.querySelector("#passphrase").value); message("Encrypted profile saved locally.", true); await loadHistory(); }
  catch (error) { message(error.message); }
});
if (!await hasProfile()) message("Create your first profile and choose a strong passphrase.", true);
document.querySelector("#refresh-history").addEventListener("click", loadHistory);

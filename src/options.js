import { EMPTY_PROFILE, mergeProfile } from "./profile.js";
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
function showProfile(profile) { document.querySelectorAll("[data-path]").forEach(input => { input.value = getAtPath(profile, input.dataset.path) || ""; }); document.querySelector("#option-aliases").value = globalThis.JobOptionResolver.formatOptionAliases(profile.optionAliases); }
function readProfile() { const profile = mergeProfile(EMPTY_PROFILE); document.querySelectorAll("[data-path]").forEach(input => setAtPath(profile, input.dataset.path, input.value.trim())); profile.optionAliases = globalThis.JobOptionResolver.parseOptionAliases(document.querySelector("#option-aliases").value); return profile; }
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

import { EMPTY_PROFILE, mergeProfile } from "./profile.js";
import { saveProfile, unlockProfile, hasProfile } from "./storage.js";

const form = document.querySelector("#profile-form");
const status = document.querySelector("#status");

function getAtPath(object, path) { return path.split(".").reduce((value, key) => value?.[key], object); }
function setAtPath(object, path, value) {
  const parts = path.split("."); let target = object;
  parts.slice(0, -1).forEach(part => { target = target[part]; });
  target[parts.at(-1)] = value;
}
function showProfile(profile) { document.querySelectorAll("[data-path]").forEach(input => { input.value = getAtPath(profile, input.dataset.path) || ""; }); }
function readProfile() { const profile = mergeProfile(EMPTY_PROFILE); document.querySelectorAll("[data-path]").forEach(input => setAtPath(profile, input.dataset.path, input.value.trim())); return profile; }
function message(text, good = false) { status.textContent = text; status.className = good ? "success" : ""; }

showProfile(EMPTY_PROFILE);
document.querySelector("#unlock").addEventListener("click", async () => {
  try { showProfile(await unlockProfile(document.querySelector("#passphrase").value)); message("Profile unlocked. Edit it and save when ready.", true); }
  catch (error) { message(error.message); }
});
form.addEventListener("submit", async event => {
  event.preventDefault();
  try { await saveProfile(readProfile(), document.querySelector("#passphrase").value); message("Encrypted profile saved locally.", true); }
  catch (error) { message(error.message); }
});
if (!await hasProfile()) message("Create your first profile and choose a strong passphrase.", true);

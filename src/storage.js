import { encryptJson, decryptJson } from "./crypto.js";
import { mergeProfile } from "./profile.js";

const PROFILE_KEY = "encryptedProfile";
const SYNC_PROFILE_KEY = "encryptedProfileSync";
const SESSION_KEY = "unlockedProfile";
const APPLICATION_KEY_KEY = "encryptedApplicationHistoryKey";
const APPLICATION_KEY_SESSION = "applicationHistoryKey";
const APPLICATION_PREFIX = "application:";
const VALID_APPLICATION_STATUSES = new Set(["draft", "in_progress", "applied"]);

export async function hasProfile() {
  const [local, synced] = await Promise.all([chrome.storage.local.get(PROFILE_KEY), chrome.storage.sync.get(SYNC_PROFILE_KEY)]);
  return Boolean(local[PROFILE_KEY] || synced[SYNC_PROFILE_KEY]);
}

export async function saveProfile(profile, passphrase) {
  const clean = mergeProfile(profile);
  await ensureApplicationKey(passphrase);
  const encrypted = await encryptJson(clean, passphrase);
  await Promise.all([
    chrome.storage.local.set({ [PROFILE_KEY]: encrypted }),
    chrome.storage.sync.set({ [SYNC_PROFILE_KEY]: encrypted })
  ]);
  await chrome.storage.session.set({ [SESSION_KEY]: clean });
}

export async function unlockProfile(passphrase) {
  const [local, synced] = await Promise.all([chrome.storage.local.get(PROFILE_KEY), chrome.storage.sync.get(SYNC_PROFILE_KEY)]);
  const payloads = [local[PROFILE_KEY], synced[SYNC_PROFILE_KEY]].filter(Boolean);
  if (!payloads.length) throw new Error("No encrypted profile was found.");
  let decrypted;
  for (const payload of payloads) {
    try { decrypted = await decryptJson(payload, passphrase); break; } catch { /* try the synced copy */ }
  }
  if (!decrypted) throw new Error("Could not unlock the profile. Check your passphrase.");
  const profile = mergeProfile(decrypted);
  await chrome.storage.session.set({ [SESSION_KEY]: profile });
  await ensureApplicationKey(passphrase);
  await chrome.storage.local.set({ [PROFILE_KEY]: await encryptJson(profile, passphrase) });
  return profile;
}

export async function getUnlockedProfile() { return (await chrome.storage.session.get(SESSION_KEY))[SESSION_KEY] || null; }
export async function lockProfile() { await chrome.storage.session.remove([SESSION_KEY, APPLICATION_KEY_SESSION]); }

function newHistoryKey() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes));
}

async function ensureApplicationKey(passphrase) {
  const cached = (await chrome.storage.session.get(APPLICATION_KEY_SESSION))[APPLICATION_KEY_SESSION];
  const stored = (await chrome.storage.sync.get(APPLICATION_KEY_KEY))[APPLICATION_KEY_KEY];
  let key = cached;
  if (!key && stored) key = await decryptJson(stored, passphrase);
  if (!key) key = newHistoryKey();
  await chrome.storage.sync.set({ [APPLICATION_KEY_KEY]: await encryptJson(key, passphrase) });
  await chrome.storage.session.set({ [APPLICATION_KEY_SESSION]: key });
  return key;
}

async function historyKey() {
  const key = (await chrome.storage.session.get(APPLICATION_KEY_SESSION))[APPLICATION_KEY_SESSION];
  if (!key) throw new Error("Unlock your profile to access application history.");
  return key;
}

function cleanText(value, maxLength) { return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength); }

export async function listApplications() {
  const key = await historyKey();
  const stored = await chrome.storage.sync.get(null);
  const applications = await Promise.all(Object.entries(stored)
    .filter(([name]) => name.startsWith(APPLICATION_PREFIX))
    .map(([, payload]) => decryptJson(payload, key)));
  return applications.filter(Boolean).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getApplication(hash) {
  const key = await historyKey();
  const payload = (await chrome.storage.sync.get(`${APPLICATION_PREFIX}${hash}`))[`${APPLICATION_PREFIX}${hash}`];
  return payload ? decryptJson(payload, key) : null;
}

export async function saveApplication(application) {
  const key = await historyKey();
  const hash = String(application.hash || "");
  if (!/^[a-f0-9]{64}$/i.test(hash)) throw new Error("This job could not be identified safely.");
  const status = VALID_APPLICATION_STATUSES.has(application.status) ? application.status : "draft";
  const previous = await getApplication(hash);
  const now = new Date().toISOString();
  const record = {
    hash, company: cleanText(application.company, 180), title: cleanText(application.title, 180),
    link: cleanText(application.link, 2000), status,
    createdAt: previous?.createdAt || now, updatedAt: now
  };
  if (!record.company || !record.title || !record.link) throw new Error("A company, position title, and application link are required.");
  await chrome.storage.sync.set({ [`${APPLICATION_PREFIX}${hash}`]: await encryptJson(record, key) });
  return record;
}

export async function setApplicationStatus(hash, status) {
  const application = await getApplication(hash);
  if (!application) throw new Error("That application was not found in synced history.");
  return saveApplication({ ...application, status });
}

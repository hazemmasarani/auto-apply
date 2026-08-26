import { encryptJson, decryptJson } from "./crypto.js";
import { mergeProfile } from "./profile.js";

const PROFILE_KEY = "encryptedProfile";
const SESSION_KEY = "unlockedProfile";

export async function hasProfile() {
  return Boolean((await chrome.storage.local.get(PROFILE_KEY))[PROFILE_KEY]);
}

export async function saveProfile(profile, passphrase) {
  const clean = mergeProfile(profile);
  await chrome.storage.local.set({ [PROFILE_KEY]: await encryptJson(clean, passphrase) });
  await chrome.storage.session.set({ [SESSION_KEY]: clean });
}

export async function unlockProfile(passphrase) {
  const stored = (await chrome.storage.local.get(PROFILE_KEY))[PROFILE_KEY];
  const profile = mergeProfile(await decryptJson(stored, passphrase));
  await chrome.storage.session.set({ [SESSION_KEY]: profile });
  return profile;
}

export async function getUnlockedProfile() { return (await chrome.storage.session.get(SESSION_KEY))[SESSION_KEY] || null; }
export async function lockProfile() { await chrome.storage.session.remove(SESSION_KEY); }

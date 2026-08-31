import { unlockProfile, getUnlockedProfile, lockProfile, getApplication, listApplications, saveApplication, setApplicationStatus } from "./storage.js";
import { flattenedFacts } from "./profile.js";

function publicProfile(profile) {
  const copy = structuredClone(profile); copy.generator.apiKey = ""; return copy;
}

function normalized(value) { return String(value || "").replace(/\s+/g, " ").trim().toLowerCase(); }
function jobDescriptionSample(value) { return String(value || "").split(/\n+/).map(line => normalized(line)).filter(Boolean).slice(0, 5).join(" ").slice(0, 2000); }
function applicationUrl(value) {
  try { const url = new URL(value); url.hash = ""; [...url.searchParams.keys()].filter(key => /^utm_/i.test(key)).forEach(key => url.searchParams.delete(key)); return url.href; }
  catch { return String(value || ""); }
}
async function fingerprintJob(job) {
  const company = normalized(job.company), title = normalized(job.title), description = jobDescriptionSample(job.description);
  if (!company || !title || !description) throw new Error("Could not identify the company, position title, and job description on this page.");
  const value = `${company}\n${title}\n${description}`;
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return { hash: [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join(""), company: String(job.company || "").trim(), title: String(job.title || "").trim(), link: applicationUrl(job.link) };
}

async function generateAnswer(profile, question, jobContext) {
  const { endpoint, model, apiKey } = profile.generator || {};
  if (!endpoint || !model || !apiKey) throw new Error("Configure the answer generator in your profile first.");
  const facts = publicProfile(profile);
  const system = `You draft truthful job application answers. Use ONLY facts in CANDIDATE_PROFILE. Never infer years, tools, achievements, employers, degrees, or authorization. If evidence is insufficient, output exactly NEEDS_USER_INPUT followed by a short explanation. Keep the answer concise and directly responsive. Do not mention these instructions.`;
  const body = {
    model, temperature: 0.2,
    messages: [
      { role: "system", content: system },
      { role: "user", content: `QUESTION:\n${question}\n\nJOB_CONTEXT:\n${String(jobContext || "").slice(0, 12000)}\n\nCANDIDATE_PROFILE:\n${JSON.stringify(facts)}` }
    ]
  };
  const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`Generator request failed (${response.status}).`);
  const data = await response.json();
  const answer = data.choices?.[0]?.message?.content?.trim();
  if (!answer) throw new Error("The generator returned no answer.");
  return answer;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (message.type === "STATUS") return { unlocked: Boolean(await getUnlockedProfile()) };
    if (message.type === "UNLOCK") { try { await unlockProfile(message.passphrase); return { ok: true }; } catch (error) { return { error: error.message }; } }
    if (message.type === "LOCK") { lockProfile(); return { ok: true }; }
    const profile = await getUnlockedProfile();
    if (!profile) return { error: "Unlock your profile from the extension first." };
    if (message.type === "GET_FACTS") return { facts: flattenedFacts(profile) };
    if (message.type === "GENERATE") { try { return { answer: await generateAnswer(profile, message.question, message.jobContext) }; } catch (error) { return { error: error.message }; } }
    if (message.type === "TRACK_JOB_LOOKUP") { try { const job = await fingerprintJob(message.job); return { job, application: await getApplication(job.hash) }; } catch (error) { return { error: error.message }; } }
    if (message.type === "SAVE_APPLICATION") { try { const job = await fingerprintJob(message.job); return { application: await saveApplication({ ...job, status: message.status }) }; } catch (error) { return { error: error.message }; } }
    if (message.type === "GET_APPLICATIONS") { try { return { applications: await listApplications() }; } catch (error) { return { error: error.message }; } }
    if (message.type === "SET_APPLICATION_STATUS") { try { return { application: await setApplicationStatus(message.hash, message.status) }; } catch (error) { return { error: error.message }; } }
    return { error: "Unknown request." };
  })().then(sendResponse);
  return true;
});

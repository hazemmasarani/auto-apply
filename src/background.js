import { unlockProfile, getUnlockedProfile, lockProfile } from "./storage.js";
import { flattenedFacts } from "./profile.js";

function publicProfile(profile) {
  const copy = structuredClone(profile); copy.generator.apiKey = ""; return copy;
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
    return { error: "Unknown request." };
  })().then(sendResponse);
  return true;
});

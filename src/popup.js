const status = document.querySelector("#status");
async function request(type, extra = {}) { return chrome.runtime.sendMessage({ type, ...extra }); }
async function refresh() { const { unlocked } = await request("STATUS"); document.querySelector("#locked").hidden = unlocked; document.querySelector("#ready").hidden = !unlocked; }
document.querySelector("#unlock").addEventListener("click", async () => { const result = await request("UNLOCK", { passphrase: document.querySelector("#passphrase").value }); status.textContent = result.error || ""; await refresh(); });
document.querySelector("#lock").addEventListener("click", async () => { await request("LOCK"); await refresh(); });
document.querySelector("#settings").addEventListener("click", () => chrome.runtime.openOptionsPage());
document.querySelector("#review").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try { await chrome.tabs.sendMessage(tab.id, { type: "SCAN" }); window.close(); }
  catch { status.textContent = "This browser page cannot be filled."; }
});
refresh();

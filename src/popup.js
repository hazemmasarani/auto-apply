const status = document.querySelector("#status");
async function request(type, extra = {}) { return chrome.runtime.sendMessage({ type, ...extra }); }
async function refresh() { const { unlocked } = await request("STATUS"); document.querySelector("#locked").hidden = unlocked; document.querySelector("#ready").hidden = !unlocked; }
document.querySelector("#unlock").addEventListener("click", async () => { const result = await request("UNLOCK", { passphrase: document.querySelector("#passphrase").value }); status.textContent = result.error || ""; await refresh(); });
document.querySelector("#lock").addEventListener("click", async () => { await request("LOCK"); await refresh(); });
document.querySelector("#settings").addEventListener("click", () => chrome.runtime.openOptionsPage());
document.querySelector("#history").addEventListener("click", () => chrome.runtime.openOptionsPage());
async function sendScan(tab) {
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "SCAN" });
    return;
  } catch { /* The tab may predate the latest extension reload. Inject and retry. */ }
  if (!/^https?:/i.test(tab.url || "")) throw new Error("Open a regular HTTP or HTTPS application page. Browser settings, new-tab, PDF viewer, and extension pages cannot be filled.");
  await chrome.scripting.insertCSS({ target: { tabId: tab.id, allFrames: true }, files: ["src/content.css"] });
  await chrome.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, files: ["src/option-resolver.js", "src/content.js"] });
  await chrome.tabs.sendMessage(tab.id, { type: "SCAN" });
}
document.querySelector("#review").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const button = document.querySelector("#review"); button.disabled = true; status.textContent = "Connecting to this page…";
  try { await sendScan(tab); window.close(); }
  catch (error) {
    const detail = String(error?.message || "");
    status.textContent = /cannot access|extensions gallery|chrome:\/\//i.test(detail)
      ? "This browser-protected page cannot be filled. Open the employer's application page in a regular tab."
      : detail || "Could not connect to this page. Refresh the application tab and try again.";
    button.disabled = false;
  }
});
refresh();

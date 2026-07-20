const { chromium } = require("./node_modules/playwright-core");
(async () => {
  try {
    const b = await chromium.launch({ headless: true });
    const p = await b.newPage();
    const errors = [];
    p.on("pageerror", err => errors.push(err.message));
    await p.goto("http://127.0.0.1:5173", { waitUntil: "networkidle", timeout: 15000 });
    await p.click(".profile-header-btn");
    await p.waitForSelector(".profile-page", { timeout: 5000 });
    
    const ta = await p.$(".p-resume-textarea");
    if (ta) {
      await ta.fill("Python JavaScript React Node.js SQL Git Docker");
      await p.click(".p-resume-btn");
      await p.waitForTimeout(2000);
      
      const kwDiv = await p.$(".p-keywords");
      const matchDiv = await p.$(".p-matches");
      if (kwDiv) {
        const tags = await kwDiv.$$(".tag");
        console.log("Keywords found:", tags.length);
        for (const t of tags) console.log("  -", await t.textContent());
      } else { console.log("No .p-keywords found"); }
      
      if (matchDiv) {
        const items = await matchDiv.$$(".p-match-item");
        console.log("Matches found:", items.length);
      } else { console.log("No .p-matches found"); }
    } else { console.log("No textarea"); }
    
    console.log("Errors:", errors.length, errors);
    await b.close();
  } catch(e) { console.log("FATAL:", e.message); }
})();

// Records a real run of CokeZerope Marketing with Playwright (take 3):
// v1 Ace run (Cola demo mask) → Pulse Coke Zero social scan → Ace marketing
// brief + Gradium read-aloud → Approve → Ace drafts a promo visual (Nano
// Banana) that is only generated after Approve. Logs step markers for the edit.
const { createRequire } = require("module");
const fs = require("fs");
const req = createRequire(
  process.env.PW_CORE_DIR
    ? require("path").join(process.env.PW_CORE_DIR, "package.json")
    : require("path").join(process.cwd(), "node_modules", "playwright-core", "package.json"),
);
const { chromium } = req("playwright-core");

const BASE = process.env.APP_URL ?? "http://localhost:8080";
const marks = [];
let t0 = 0;
const mark = (name) => {
  const t = (Date.now() - t0) / 1000;
  marks.push({ name, t });
  console.log(name.padEnd(14), t.toFixed(1));
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitCount(page, re, n, timeout) {
  await page.waitForFunction(
    ([src, count]) => {
      const t = document.querySelector("[role=dialog]")?.innerText ?? "";
      return (t.match(new RegExp(src, "g")) ?? []).length >= count;
    },
    [re.source, n],
    { timeout, polling: 1000 },
  );
}

async function smoothScroll(page, dy, ms) {
  const steps = Math.max(1, Math.round(ms / 50));
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, dy / steps);
    await sleep(50);
  }
}

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: "raw", size: { width: 1280, height: 720 } },
  });
  await context.addInitScript(() => {
    try {
      localStorage.setItem("dashboard-lang", "en");
      if (!sessionStorage.getItem("mask-init")) {
        localStorage.setItem("ace-demo-mask", "cola");
        localStorage.removeItem("ace-watchlist");
        localStorage.removeItem("ace-activity");
        sessionStorage.setItem("mask-init", "1");
      }
    } catch {}
  });
  const page = await context.newPage();
  const tts = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/tts") && r.method() === "POST") {
      try {
        tts.push({
          file: `voice/live_tts_${tts.length}.wav`,
          text: JSON.parse(r.postData() ?? "{}").text ?? "",
        });
      } catch {}
    }
  });
  t0 = Date.now();
  await page.mouse.move(640, 360);

  // ---- v1 (Cola mask): dashboard hook
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await sleep(2500);
  mark("v1");
  await page.mouse.move(250, 160, { steps: 20 });
  await sleep(5000);
  await smoothScroll(page, 300, 1800);
  await sleep(2000);
  await smoothScroll(page, -300, 1000);
  await sleep(800);

  // ---- v1: Ace multi-step run
  mark("ace_open");
  await page.getByRole("button", { name: /Ask Ace/ }).click();
  await sleep(1500);
  await page
    .getByRole("button", { name: /down vs 2025\?/ })
    .first()
    .click();
  await waitCount(page, /tool calls|Error:/, 1, 240000);
  mark("agent_done");
  await sleep(6000);
  const chip = page.locator("[role=dialog] button", { hasText: "Cushion Foundation ›" }).first();
  const anyChip = page.locator("[role=dialog] button", { hasText: " › " }).first();
  mark("cite");
  await ((await chip.count()) ? chip : anyChip).click();
  await sleep(4500);
  mark("cite_done");

  // ---- Pulse: Coke Zero social scan
  await page.goto(BASE + "/v2", { waitUntil: "networkidle" });
  await sleep(2500);
  mark("v2");
  await sleep(1500);
  mark("scan_start");
  await page.getByRole("button", { name: "Scan", exact: true }).click();
  await page.waitForFunction(
    () => {
      const t = document.querySelector("main")?.innerText ?? "";
      return !t.includes("Scanning") && t.includes("Share of voice");
    },
    null,
    { timeout: 240000, polling: 1000 },
  );
  mark("scan_done");
  await sleep(2500);
  await smoothScroll(page, 330, 2200);
  await sleep(3500);
  await smoothScroll(page, 420, 2200);
  await sleep(3000);
  await smoothScroll(page, -750, 1300);
  await sleep(600);
  mark("tour_done");

  // ---- Ace marketing brief via Run demo (live momo search for 零卡可樂)
  await page.getByRole("button", { name: /Run demo/ }).click();
  mark("ace2_start");
  await waitCount(page, /tool calls|Error:/, 1, 300000);
  mark("ace2_done");
  for (let i = 0; i < 40 && tts.length === 0; i++) await sleep(500);
  mark("read");
  await sleep(8000);

  // ---- approve one proposal
  mark("approve");
  const cards = page.locator("[role=dialog] .rounded-lg.border", { hasText: "Approve" });
  for (const label of ["Add to watchlist", "Flag price gap", "Export brief"]) {
    const c = cards.filter({ hasText: label }).first();
    if (await c.count()) {
      await c.scrollIntoViewIfNeeded();
      await sleep(900);
      await c.getByRole("button", { name: /Approve/ }).click();
      break;
    }
  }
  await sleep(2500);
  mark("approve_done");

  // ---- Ace drafts a counter-promo visual; Nano Banana only runs after Approve
  const box = page.locator("[role=dialog] textarea");
  await box.click();
  await box.fill("Draft a promo visual for a Coke Zero counter-campaign on momo this week.");
  await sleep(900);
  mark("visual_ask");
  await box.press("Enter");
  await waitCount(page, /tool calls|Error:/, 2, 240000);
  mark("visual_proposed");
  await sleep(1500);
  const vcard = page
    .locator("[role=dialog] .rounded-lg.border", { hasText: "Draft promo visual" })
    .last();
  if (await vcard.count()) {
    await vcard.scrollIntoViewIfNeeded();
    await sleep(1500);
    mark("visual_approve");
    await vcard.getByRole("button", { name: /Approve/ }).click();
    await page
      .waitForFunction(() => !!document.querySelector("[role=dialog] img[alt]"), null, {
        timeout: 90000,
        polling: 1000,
      })
      .catch(() => undefined);
    mark("visual_shown");
    await page
      .locator("[role=dialog] img[alt]")
      .last()
      .scrollIntoViewIfNeeded()
      .catch(() => undefined);
    await sleep(5000);
  } else {
    mark("visual_approve");
    mark("visual_shown");
  }
  mark("end");

  const videoPath = await page.video().path();
  await context.close();
  await browser.close();
  fs.writeFileSync("marks.json", JSON.stringify({ marks, tts, videoPath }, null, 2));
  console.log("video:", videoPath);
})().catch((e) => {
  console.log("ERR", e.message);
  fs.writeFileSync("marks.json", JSON.stringify({ marks, error: e.message }, null, 2));
  process.exit(1);
});

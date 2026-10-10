// Records a real run of CokeZerope Marketing with Playwright: v1 (Cola mask),
// then v2 switching the demo mask to Pika and K-pop on camera. Logs step
// markers for the edit and captures the real Gradium read-aloud audio.
const { createRequire } = require("module");
const fs = require("fs");
const req = createRequire(
  process.env.PW_CORE_DIR
    ? require("path").join(process.env.PW_CORE_DIR, "package.json")
    : __filename,
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

async function waitDialog(page, re, timeout) {
  await page.waitForFunction(
    (src) => new RegExp(src).test(document.querySelector("[role=dialog]")?.innerText ?? ""),
    re.source,
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

async function pickMask(page, label) {
  await page.getByLabel("Demo mask: replace brand names").click();
  await sleep(700);
  await page.getByRole("option", { name: label }).click();
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
        sessionStorage.setItem("mask-init", "1");
      }
    } catch {}
  });
  const page = await context.newPage();
  const tts = [];
  page.on("response", async (res) => {
    if (!res.url().includes("/api/tts") || res.status() !== 200) return;
    try {
      const body = await res.body();
      const text = JSON.parse(res.request().postData() ?? "{}").text ?? "";
      const file = `voice/live_tts_${tts.length}.wav`;
      fs.mkdirSync("voice", { recursive: true });
      fs.writeFileSync(file, body);
      tts.push({ file, text, t: (Date.now() - t0) / 1000 });
      console.log("captured tts", file, body.length);
    } catch (e) {
      console.log("tts capture failed", e.message);
    }
  });
  t0 = Date.now();
  await page.mouse.move(640, 360);

  // ---- v1 (Cola mask): dashboard hook
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await sleep(2500);
  mark("v1");
  await page.mouse.move(250, 160, { steps: 20 });
  await sleep(6000);
  await smoothScroll(page, 300, 2000);
  await sleep(2500);
  await smoothScroll(page, -300, 1200);
  await sleep(1000);

  // ---- v1: Ace multi-step run
  mark("ace_open");
  await page.getByRole("button", { name: /Ask Ace/ }).click();
  await sleep(1800);
  await page
    .getByRole("button", { name: /down vs 2025\?/ })
    .first()
    .click();
  mark("agent_start");
  await waitDialog(page, /tool calls|Error:/, 240000);
  mark("agent_done");
  await sleep(7000);
  const chip = page.locator("[role=dialog] button", { hasText: "Cushion Foundation ›" }).first();
  const anyChip = page.locator("[role=dialog] button", { hasText: " › " }).first();
  mark("cite");
  await ((await chip.count()) ? chip : anyChip).click();
  await sleep(5500);
  mark("cite_done");

  // ---- v2: switch mask to Pika on camera, then scan
  await page.goto(BASE + "/v2", { waitUntil: "networkidle" });
  await sleep(2500);
  mark("v2");
  await sleep(1200);
  await pickMask(page, "Pika ⚡");
  await sleep(2600);
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
  await smoothScroll(page, 330, 2500);
  await sleep(3000);
  // ---- switch to K-pop live: the whole page re-skins
  mark("switch_kpop");
  await page.mouse.move(1000, 30, { steps: 10 });
  await pickMask(page, "K-pop 🎤");
  await sleep(3500);
  await smoothScroll(page, 420, 2500);
  await sleep(3000);
  await smoothScroll(page, -750, 1500);
  await sleep(800);
  mark("tour_done");

  // ---- v2: Ace marketing brief via Run demo (scan already done → asks with a live momo URL)
  await page.getByRole("button", { name: /Run demo/ }).click();
  mark("ace2_start");
  await waitDialog(page, /tool calls|Error:/, 300000);
  mark("ace2_done");
  for (let i = 0; i < 40 && tts.length === 0; i++) await sleep(500);
  mark("read");
  await sleep(9000);

  // ---- human approval
  mark("approve");
  const cards = page.locator("[role=dialog] .rounded-lg.border", { hasText: "Approve" });
  let target = null;
  for (const label of ["Add to watchlist", "Flag price gap", "Export brief"]) {
    const c = cards.filter({ hasText: label }).first();
    if (await c.count()) {
      target = c;
      break;
    }
  }
  if (target) {
    await target.scrollIntoViewIfNeeded();
    await sleep(1200);
    await target.getByRole("button", { name: /Approve/ }).click();
  }
  await sleep(3000);
  await page.keyboard.press("Escape");
  await sleep(1200);
  const wl = page.getByText("Watchlist", { exact: true }).first();
  if (await wl.count()) await wl.scrollIntoViewIfNeeded();
  else await page.getByText("Live competitor resource").first().scrollIntoViewIfNeeded();
  await sleep(4500);
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

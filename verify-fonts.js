"use strict";

const puppeteer = require("puppeteer-core");
const path = require("path");

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const URL = "file:///" + path.join(__dirname, "index.html").replace(/\\/g, "/");

const WIDTHS = [320, 360, 375, 414, 480, 640, 768, 900, 1023, 1024, 1180, 1280, 1366, 1440, 1600, 1920, 2560];

let failures = 0;

const MEASURE = () => {
  const t = document.querySelector(".hero__monument-text");
  const range = document.createRange();
  range.selectNodeContents(t);
  const textRect = range.getBoundingClientRect();
  const boxRect = t.getBoundingClientRect();
  return {
    textW: +textRect.width.toFixed(2),
    boxW: +boxRect.width.toFixed(2),
    overflowPx: +(textRect.width - boxRect.width).toFixed(2),
    size: getComputedStyle(t).fontSize,
    ratio: +(textRect.width / parseFloat(getComputedStyle(t).fontSize)).toFixed(3),
    sgLoaded: document.fonts.check('700 100px "Space Grotesk"'),
    docW: document.documentElement.scrollWidth,
    winW: window.innerWidth
  };
};

async function run(label, block) {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--allow-file-access-from-files"]
  });
  const page = await browser.newPage();
  if (block) {
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (/fonts\.(googleapis|gstatic)\.com/.test(req.url())) req.abort();
      else req.continue();
    });
  }
  console.log("\n--- " + label + " ---");
  console.log("  width   font-size   text-w    box-w   em-ratio  space  overflow");
  const ratios = [];
  for (const w of WIDTHS) {
    await page.setViewport({ width: w, height: 900 });
    await page.goto(URL, { waitUntil: block ? "domcontentloaded" : "networkidle0" });
    if (!block) await page.evaluate(() => document.fonts.ready);
    await new Promise((r) => setTimeout(r, 300));
    const m = await page.evaluate(MEASURE);
    ratios.push(m.ratio);
    const spacer = m.overflowPx > 1 ? "-" : (m.boxW - m.textW).toFixed(0) + "px";
    console.log(
      "  " + String(w).padEnd(7) + m.size.padEnd(12) + String(m.textW).padEnd(10) +
      String(m.boxW).padEnd(8) + String(m.ratio).padEnd(10) + spacer.padEnd(7) +
      (m.overflowPx > 1 ? "CLIPPED " + m.overflowPx + "px" : "ok")
    );
    if (m.overflowPx > 1) {
      failures += 1;
      console.log("    ! monument text overflows its clip box at " + w + "px");
    }
    if (m.docW > m.winW + 1) {
      failures += 1;
      console.log("    ! page horizontal overflow at " + w + "px");
    }
  }
  const min = Math.min(...ratios);
  const max = Math.max(...ratios);
  console.log("  em-ratio range: " + min + " .. " + max + "  (divisor in CSS = 13.9)");
  if (max > 13.9) {
    failures += 1;
    console.log("    ! ratio " + max + " exceeds the 13.9 divisor -> can clip");
  }
  await browser.close();
}

(async () => {
  await run("webfont ALLOWED (Space Grotesk real metrics)", false);
  await run("webfont BLOCKED (metric-matched fallback)", true);
  console.log(
    "\n" + (failures === 0 ? "=== MONUMENT NEVER CLIPS, FONT LOADED OR NOT ===" : "=== " + failures + " FAILURE(S) ===")
  );
  process.exit(failures === 0 ? 0 : 1);
})();

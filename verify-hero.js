const puppeteer = require("puppeteer-core");
const path = require("path");
const fs = require("fs");

const ROOT = __dirname;
const URL = "file:///" + path.join(ROOT, "index.html").replace(/\\/g, "/");
const exe = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
].find((p) => fs.existsSync(p));
if (!exe) {
  console.error("chrome not found");
  process.exit(1);
}

const VIEWPORTS = [
  { name: "375 mobile", width: 375, height: 812 },
  { name: "414 mobile", width: 414, height: 896 },
  { name: "768 tablet", width: 768, height: 1024 },
  { name: "1023 tablet", width: 1023, height: 900 },
  { name: "1024 desktop", width: 1024, height: 900 },
  { name: "1280 desktop", width: 1280, height: 900 },
  { name: "1920 desktop", width: 1920, height: 1080 },
];

const PROBE = () => {
  const rect = (s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom };
  };
  const cs = (s, p) => getComputedStyle(document.querySelector(s))[p];
  const title = document.querySelector(".hero__title");
  const copy = document.querySelector(".hero__copy");
  const csT = getComputedStyle(title);
  const fs = parseFloat(csT.fontSize);
  const lh = parseFloat(csT.lineHeight);
  const rTitle = title.getBoundingClientRect();
  const lineCount = Math.round(rTitle.height / lh);
  const rCopy = copy.getBoundingClientRect();
  const csCopy = getComputedStyle(copy);
  const copyLines = Math.round(rCopy.height / parseFloat(csCopy.lineHeight));

  return {
    problems: [],
    metrics: {
      titleFont: csT.fontSize,
      titleLH: csT.lineHeight,
      titleFS: fs,
      titleLHratio: (lh / fs).toFixed(2),
      titleLines: lineCount,
      titleH: Math.round(rTitle.height),
      titleMaxW: cs(".hero__title", "maxWidth"),
      copyFont: csCopy.fontSize,
      copyLines: copyLines,
      copyH: Math.round(rCopy.height),
      introH: Math.round(rect(".hero__intro").h),
      portraitH: rect(".media--portrait") ? Math.round(rect(".media--portrait").h) : 0,
      introW: Math.round(rect(".hero__intro").w),
      titleColOverflow: Math.round(title.scrollWidth - title.clientWidth),
      eyebrowText: document.querySelector(".eyebrow span:last-child").textContent.trim(),
    },
  };
};

(async () => {
  const browser = await puppeteer.launch({ executablePath: exe, headless: "new" });
  let bad = 0;

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });
    await page.goto(URL, { waitUntil: "networkidle0" });
    const { metrics: m, problems } = await page.evaluate(PROBE);

    const ratio = parseFloat(m.titleLHratio);
    if (ratio < 1.0) problems.push(`line-height ${m.titleLHratio}x is below font-size (overlap)`);
    if (m.titleColOverflow > 1)
      problems.push(`title overflows its column by ${m.titleColOverflow}px`);
    if (m.titleLines > 6) problems.push(`title wraps to ${m.titleLines} lines (too tall)`);

    const flag = problems.length ? "!" : "+";
    if (problems.length) bad++;
    console.log(
      `\n${flag} ${vp.name} (${vp.width}x${vp.height})` +
        `\n  title  ${m.titleFont}/${m.titleLH} (${m.titleLHratio}x)  ${m.titleLines} lines  h=${m.titleH}px  maxW=${m.titleMaxW}` +
        `\n  copy   ${m.copyFont}  ${m.copyLines} lines  h=${m.copyH}px` +
        `\n  block  intro=${m.introH}px  portrait=${m.portraitH}px  delta=${m.introH - m.portraitH}px`
    );
    problems.forEach((p) => console.log("  !! " + p));
    await page.close();
  }

  await browser.close();
  console.log(bad ? `\n=== ${bad} viewport(s) WITH ISSUES ===` : "\n=== HERO TEXT OK ===");
})();
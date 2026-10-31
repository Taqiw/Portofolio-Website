const puppeteer = require("puppeteer-core");
const path = require("path");
const fs = require("fs");

const CHROME =
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const ROOT = __dirname;
const URL = "file:///" + path.join(ROOT, "index.html").replace(/\\/g, "/");

const exe = [CHROME, "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"].find(
  (p) => fs.existsSync(p)
);
if (!exe) {
  console.error("chrome not found");
  process.exit(1);
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: exe, headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(URL, { waitUntil: "networkidle0" });

  const out = await page.evaluate(() => {
    const img = document.querySelector(".media--portrait img");
    const r = img.getBoundingClientRect();
    const frame = img.parentElement.getBoundingClientRect();
    return {
      src: img.getAttribute("src"),
      isRemote: /^https?:/i.test(img.getAttribute("src")),
      complete: img.complete,
      naturalW: img.naturalWidth,
      naturalH: img.naturalHeight,
      decodedRatio: (img.naturalWidth / img.naturalHeight).toFixed(3),
      renderedW: Math.round(r.width),
      renderedH: Math.round(r.height),
      renderedRatio: (r.width / r.height).toFixed(3),
      frameRatio: (frame.width / frame.height).toFixed(3),
      alt: img.alt,
    };
  });

  const scale = Math.max(out.renderedW / out.naturalW, out.renderedH / out.naturalH);
  const scaledW = out.naturalW * scale;
  const cropPerSidePct =
    ((scaledW - out.renderedW) / 2 / out.naturalW) * 100;

  console.log("src attribute      : " + out.src);
  console.log("remote hotlink?    : " + out.isRemote);
  console.log("img.complete       : " + out.complete);
  console.log("natural size       : " + out.naturalW + " x " + out.naturalH + "  (ratio " + out.decodedRatio + ")");
  console.log("rendered size      : " + out.renderedW + " x " + out.renderedH + "  (ratio " + out.renderedRatio + ")");
  console.log("frame ratio        : " + out.frameRatio + "  (should be 3:4 = 0.750)");
  console.log("alt text           : " + JSON.stringify(out.alt));
  console.log("cover scale factor : " + scale.toFixed(4));
  console.log(
    "crop per side      : " +
      cropPerSidePct.toFixed(1) +
      "% of width, " +
      ((scaledW - out.renderedW) / 2).toFixed(0) +
      " rendered px (vertical crop: 0%)"
  );
  console.log(
    "\nverdict: " +
      (!out.isRemote && out.naturalW === 1280 && out.complete ? "PASS" : "CHECK")
  );

  await browser.close();
})();
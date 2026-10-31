"use strict";

const puppeteer = require("puppeteer-core");
const path = require("path");

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const URL = "file:///" + path.join(__dirname, "index.html").replace(/\\/g, "/");

let failures = 0;
const fail = (m) => {
  failures += 1;
  console.log("    ! " + m);
};
const pass = (m) => console.log("    + " + m);

const CASES = [
  { name: "1024x600 short", width: 1024, height: 600 },
  { name: "1280x500 very short", width: 1280, height: 500 },
  { name: "1440x720", width: 1440, height: 720 },
  { name: "768x600 tablet short", width: 768, height: 600 },
  { name: "375x568 small phone", width: 375, height: 568 },
  { name: "360x640 narrow phone", width: 360, height: 640 }
];

const PROBE = () => {
  const out = { problems: [] };
  const b = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom };
  };
  const push = (m) => out.problems.push(m);

  out.sidebarCount = document.querySelectorAll(".rail, [class*='rail']").length;
  if (out.sidebarCount > 0) {
    push(out.sidebarCount + " sidebar element(s) still in the DOM");
  }

  const docW = document.documentElement.clientWidth;
  const bar = b(".topbar");
  out.topbarW = Math.round(bar.w);
  out.docW = docW;
  if (bar.x > 1) push(`.topbar starts at x=${Math.round(bar.x)} (should be 0)`);
  if (bar.w < docW - 1) {
    push(`.topbar spans ${Math.round(bar.w)}px of ${docW}px viewport (sidebar offset not removed)`);
  }
  const shell = b(".shell");
  if (shell.x > 1) push(`.shell starts at x=${Math.round(shell.x)} (should be 0)`);

  const brand = b(".topbar__brand");
  const actions = b(".topbar__actions");
  if (brand && actions && actions.w > 0) {
    out.brandRight = Math.round(brand.right);
    out.actionsLeft = Math.round(actions.x);
    out.gap = Math.round(actions.x - brand.right);
    out.brandW = Math.round(brand.w);
    const name = document.querySelector(".topbar__name");
    out.nameClipped = name ? name.scrollWidth > name.clientWidth + 1 : null;
    if (actions.x < brand.right) {
      push(
        `topbar overlap: brand ends ${Math.round(brand.right)} but actions start ${Math.round(
          actions.x
        )}`
      );
    }
    if (out.gap < 8) {
      push(`topbar brand/actions gap only ${out.gap}px (cramped)`);
    }
    if (brand.w < 60) {
      push(`topbar brand collapsed to ${Math.round(brand.w)}px`);
    }
    if (out.nameClipped) {
      push(`topbar name text is truncated (scrollW > clientW)`);
    }
  }

  const doc = document.documentElement;
  if (doc.scrollWidth > window.innerWidth + 1) {
    push(`h-overflow ${doc.scrollWidth} > ${window.innerWidth}`);
  }

  // Overlap is only meaningful between siblings inside the same row, so group by
  // parent element. Comparing a flattened page-wide list would flag unrelated
  // rows (e.g. the About stats against the Work stats) as overlapping.
  const rowProblems = (selector, label, sameRowOnly) => {
    const groups = new Map();
    for (const el of document.querySelectorAll(selector)) {
      const key = el.parentElement;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(el.getBoundingClientRect());
    }
    for (const [parent, rects] of groups) {
      if (rects.length < 2) continue;
      for (let i = 1; i < rects.length; i += 1) {
        const sameRow = !sameRowOnly || Math.abs(rects[i].y - rects[i - 1].y) < 1;
        if (rects[i].x < rects[i - 1].right - 0.5 && sameRow) {
          push(
            `${label} overlap in .${parent.className.split(" ")[0]} at index ${i}`
          );
        }
      }
    }
  };

  rowProblems(".stat", "stat tiles", true);
  rowProblems(".stack-tile", "stack tiles", true);

  const chipRows = [...document.querySelectorAll(".chip-row")].map((r) => r.getBoundingClientRect());
  for (const r of chipRows) {
    if (r.right > window.innerWidth + 1) {
      push(`chip row overflows viewport (right=${Math.round(r.right)})`);
    }
  }

  const btn = b(".btn--solid");
  const btnGhost = b(".btn--ghost");
  if (btn && btnGhost) {
    if (btn.right > window.innerWidth + 1) push("primary CTA overflows viewport");
  }

  out.pageH = document.body.scrollHeight;
  return out;
};

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--allow-file-access-from-files", "--font-render-hinting=none"]
  });

  for (const c of CASES) {
    const page = await browser.newPage();
    await page.setViewport({ width: c.width, height: c.height, deviceScaleFactor: 1 });
    await page.goto(URL, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = "auto";
    });
    await new Promise((r) => setTimeout(r, 400));

    const res = await page.evaluate(PROBE);
    console.log("\n=== " + c.name + " ===");
    console.log("  canvas sidebar=" + res.sidebarCount + "  topbar=" + res.topbarW + "/" + res.docW + "px");
    if (res.gap !== undefined) {
      console.log(
        "  topbar brand=" + res.brandW + "px gap=" + res.gap + "px nameClipped=" + res.nameClipped
      );
    }
    if (res.problems.length === 0) pass("no overflow / overlap issues");
    res.problems.forEach((p) => fail(p));
    await page.close();
  }

  await browser.close();
  console.log("\n" + (failures === 0 ? "=== STRESS CHECKS PASSED ===" : "=== " + failures + " ISSUE(S) ==="));
  process.exit(failures === 0 ? 0 : 1);
})();

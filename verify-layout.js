"use strict";

const puppeteer = require("puppeteer-core");
const path = require("path");
const fs = require("fs");

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const URL = "file:///" + path.join(__dirname, "index.html").replace(/\\/g, "/");

const VIEWPORTS = [
  { name: "mobile-375", width: 375, height: 812 },
  { name: "mobile-414", width: 414, height: 896 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "tablet-1023", width: 1023, height: 800 },
  { name: "laptop-1024", width: 1024, height: 768 },
  { name: "desktop-1280", width: 1280, height: 900 },
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "desktop-1920", width: 1920, height: 1080 }
];

let failures = 0;
const fail = (msg) => {
  failures += 1;
  console.log("    ! " + msg);
};
const pass = (msg) => console.log("    + " + msg);

const PROBE = () => {
  const out = { problems: [], metrics: {} };
  const push = (m) => out.problems.push(m);

  const m = out.metrics;
  m.docScrollW = document.documentElement.scrollWidth;
  m.winW = window.innerWidth;
  m.pageH = document.body.scrollHeight;
  if (m.docScrollW > m.winW + 1) {
    push(`horizontal overflow: scrollWidth ${m.docScrollW} > innerWidth ${m.winW}`);
  }

  const rect = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { w: +r.width.toFixed(1), h: +r.height.toFixed(1), x: +r.x.toFixed(1) };
  };

  const cs = (sel) => {
    const el = document.querySelector(sel);
    if (!el) throw new Error("probe selector missing from DOM: " + sel);
    return getComputedStyle(el);
  };

  m.topbarLeft = cs(".topbar").left;
  m.topbarH = rect(".topbar").h;
  m.topbarW = rect(".topbar").w;
  m.shellPadLeft = cs(".shell").paddingLeft;
  m.railPresent = document.querySelectorAll(".rail, [class*='rail']").length;
  m.docW = document.documentElement.clientWidth;
  m.mainPadTop = cs(".shell__main").paddingTop;
  m.navDisplay = cs(".nav__list").display;
  m.burgerDisplay = cs(".burger").display;
  m.padX = cs("section.section").paddingLeft;
  m.padBlock = cs("#about").paddingTop;
  m.contactPadBlock = cs("#contact").paddingTop;
  m.heroMinH = cs(".hero").minHeight;
  m.heroTitleFont = cs(".hero__title").fontSize;
  m.sectionTitleFont = cs(".section__title").fontSize;
  m.stackTitleFont = cs(".stack__title").fontSize;
  m.heroTitleCopyFont = cs(".hero__copy").fontSize;
  m.navLinkFont = cs(".nav__link").fontSize;
  m.navLinkLS = cs(".nav__link").letterSpacing;
  m.actionFont = cs(".action").fontSize;
  m.statFont = cs(".stat__value").fontSize;
  m.monoFont = cs(".service-row__index").fontFamily;
  m.btnRadius = cs(".btn--solid").borderRadius;
  m.btnBg = cs(".btn--solid").backgroundColor;
  m.btnColor = cs(".btn--solid").color;
  m.chipRadius = cs(".chip").borderRadius;
  m.caseRadius = cs(".case").borderRadius;
  m.pillRadius = cs(".pip").borderRadius;
  m.avatarPresent = document.querySelectorAll(".avatar").length;
  m.stackTileH = cs(".stack-tile").height;
  m.stackTileBorder = cs(".stack-tile").borderTopColor;
  m.tileCount = document.querySelectorAll(".stack-tile").length;
  m.serviceCount = document.querySelectorAll(".service-row").length;
  m.workCount = document.querySelectorAll(".case").length;
  m.chipCount = document.querySelectorAll(".chip--filter").length;
  m.sectionCount = document.querySelectorAll("section.section").length;
  m.channelSocials = document.querySelectorAll(".channel__value[target='_blank']").length;
  m.headings = [...document.querySelectorAll("h1,h2")].map((h) => h.tagName);
  m.imgsNoAlt = [...document.querySelectorAll("img")].filter(
    (i) => !i.alt && i.getAttribute("alt") !== ""
  ).length;
  m.monumentFont = cs(".hero__monument-text").fontSize;
  m.monumentScrollW = document.querySelector(".hero__monument-text").scrollWidth;
  m.monumentClientW = document.querySelector(".hero__monument-text").clientWidth;
  if (m.monumentScrollW > m.monumentClientW + 1) {
    push(`monument clipped: ${m.monumentScrollW} > ${m.monumentClientW}`);
  }
  m.revealTotal = document.querySelectorAll("[data-reveal]").length;
  m.revealVisible = document.querySelectorAll("[data-reveal].is-visible").length;
  m.hiddenReveal = [...document.querySelectorAll("[data-reveal]")].filter(
    (el) => getComputedStyle(el).opacity === "0"
  ).length;

  return out;
};

async function testScrollspy(page, label) {
  const ids = ["about", "service", "work", "contact"];
  for (const id of ids) {
    await page.evaluate((sectionId) => {
      const el = document.getElementById(sectionId);
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + 40, behavior: "instant" });
    }, id);
    await new Promise((r) => setTimeout(r, 350));
    const active = await page.evaluate(() =>
      [...document.querySelectorAll('[data-nav-link][aria-current="page"]')].map((a) =>
        a.getAttribute("href")
      )
    );
    const uniq = [...new Set(active)];
    if (uniq.length === 0) {
      fail(`${label}: no active nav link while in #${id}`);
    } else if (uniq.length > 1) {
      fail(`${label}: multiple active nav links in #${id}: ${uniq.join(",")}`);
    } else if (uniq[0] !== "#" + id) {
      fail(`${label}: active link is ${uniq[0]} but expected #${id}`);
    } else {
      pass(`${label}: scrollspy -> #${id} active`);
    }
  }

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await new Promise((r) => setTimeout(r, 350));
  const top = await page.evaluate(() =>
    [...document.querySelectorAll('[data-nav-link][aria-current="page"]')].length
  );
  if (top !== 0) {
    fail(`${label}: ${top} nav link(s) still active at page top, expected 0`);
  } else {
    pass(`${label}: no active nav link at page top`);
  }
}

async function testMobileNav(page) {
  const before = await page.evaluate(() => {
    const d = document.querySelector("[data-nav-drawer]");
    return { hidden: d.hidden, expanded: document.querySelector("[data-nav-toggle]").getAttribute("aria-expanded") };
  });
  if (!before.hidden) fail("drawer should start hidden");

  await page.click("[data-nav-toggle]");
  await new Promise((r) => setTimeout(r, 250));
  const open = await page.evaluate(() => {
    const d = document.querySelector("[data-nav-drawer]");
    const s = document.querySelector("[data-nav-scrim]");
    return {
      hidden: d.hidden,
      expanded: document.querySelector("[data-nav-toggle]").getAttribute("aria-expanded"),
      scrimVisible: s ? !s.hidden && s.classList.contains("is-visible") : null,
      locked: document.body.classList.contains("is-locked"),
      links: d.querySelectorAll("a").length
    };
  });
  if (open.hidden || open.expanded !== "true") fail("drawer did not open on burger click");
  else if (!open.scrimVisible) fail("scrim not visible when drawer open");
  else if (!open.locked) fail("body scroll not locked when drawer open");
  else if (open.links < 4) fail(`drawer has only ${open.links} links`);
  else pass(`drawer opens (${open.links} links, scrim, scroll lock)`);

  await page.evaluate(() => {
    document.querySelector("[data-nav-drawer] a[href='#work']").click();
  });
  await new Promise((r) => setTimeout(r, 700));
  const after = await page.evaluate(() => {
    const d = document.querySelector("[data-nav-drawer]");
    return {
      hidden: d.hidden,
      expanded: document.querySelector("[data-nav-toggle]").getAttribute("aria-expanded"),
      locked: document.body.classList.contains("is-locked"),
      hash: location.hash
    };
  });
  if (!after.hidden) fail("drawer did not close after link click");
  else if (after.expanded !== "false") fail("aria-expanded not reset");
  else if (after.locked) fail("body scroll still locked after close");
  else if (after.hash !== "#work") fail(`hash is ${after.hash}, expected #work`);
  else pass("drawer closes on link click and scrolls to #work");

  await page.click("[data-nav-toggle]");
  await new Promise((r) => setTimeout(r, 200));
  await page.keyboard.press("Escape");
  await new Promise((r) => setTimeout(r, 250));
  const esc = await page.evaluate(() => document.querySelector("[data-nav-drawer]").hidden);
  if (!esc) fail("Escape did not close drawer");
  else pass("Escape closes drawer");
}

/*
 * Image integrity. The project thumbnail used to be hotlinked from a Google
 * CDN and carried alt text claiming it was a Power BI dashboard, which is how
 * a template screenshot passes itself off as real work. These checks run on
 * disk so a missing file is reported by name instead of a browser timeout.
 */
function testImageFiles() {
  const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
  const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
  const get = (tag, attr) => {
    const m = tag.match(new RegExp(attr + '="([^"]*)"', "i"));
    return m ? m[1] : null;
  };

  let bad = 0;
  for (const tag of imgs) {
    const src = get(tag, "src");
    if (!src) {
      fail("an <img> has no src");
      bad++;
      continue;
    }
    if (/^https?:\/\//i.test(src)) {
      fail(`image is hotlinked instead of local: ${src.slice(0, 60)}...`);
      bad++;
      continue;
    }
    const abs = path.join(__dirname, src.split("?")[0]);
    if (!fs.existsSync(abs)) {
      fail(`image file referenced but missing on disk: ${src}`);
      bad++;
      continue;
    }
    if (!/\bwidth="/.test(tag) || !/\bheight="/.test(tag)) {
      fail(`image missing width/height (layout shift): ${src}`);
      bad++;
      continue;
    }
    if (!get(tag, "alt")) {
      fail(`image missing alt: ${src}`);
      bad++;
    }
  }

  const dash = imgs.filter((t) => /power-bi-dashboard/.test(get(t, "src") || "")).length;
  if (dash !== 2) {
    fail(`expected the Global Superstore dashboard in 2 places (hero thumb + case figure), found ${dash}`);
    bad++;
  }

  if (!bad) pass(`${imgs.length} images local, sized, alt-texted; dashboard wired in hero + case study`);
}

/*
 * The hero tile grid is specified as four equal boxes in a 2x2 arrangement.
 * Guard the geometry itself, not just the absence of overflow, so a stray
 * auto-fit or a missing tile is caught before it reaches a screenshot.
 */
async function testThumbGrid(page) {
  const r = await page.evaluate(() => {
    const g = document.querySelector(".hero__thumbs-grid");
    if (!g) return null;
    const kids = [...g.children].map((c) => {
      const b = c.getBoundingClientRect();
      return { w: Math.round(b.width), h: Math.round(b.height), link: c.tagName === "A" };
    });
    return {
      cols: getComputedStyle(g).gridTemplateColumns.split(" ").length,
      kids,
      links: g.querySelectorAll("a").length,
    };
  });
  if (!r) return fail(".hero__thumbs-grid not found");

  if (r.kids.length !== 4) {
    fail(`expected 4 tiles in .hero__thumbs-grid, found ${r.kids.length}`);
  }
  const heights = new Set(r.kids.map((k) => k.h));
  if (heights.size !== 1) fail(`tiles are not equal height: ${[...heights].join(", ")}`);
  const widths = new Set(r.kids.map((k) => k.w));
  if (widths.size !== 1) fail(`tiles are not equal width: ${[...widths].join(", ")}`);

  const stacked = r.cols === 1;
  if (r.kids.length === 4 && !stacked && r.cols !== 2) {
    fail(`expected a 2-column grid on wide viewports, got ${r.cols}`);
  }
  if (r.links !== 1) {
    fail(`expected exactly 1 linked tile, found ${r.links} (empty tiles must not be clickable)`);
  }
  if (r.kids.length === 4 && heights.size === 1 && widths.size === 1 && r.links === 1 && (stacked || r.cols === 2)) {
    pass(
      `4 equal tiles ${stacked ? "stacked (1 col)" : "in a 2x2 grid"}; ` +
        `${r.kids[0].w}x${r.kids[0].h}, 1 linked + 3 empty`
    );
  }
}

async function testFilter(page) {
  const r = await page.evaluate(() => {
    const cases = [...document.querySelectorAll(".case")];
    return {
      ids: cases.map((c) => c.id),
      count: cases.length,
      chipCount: document.querySelectorAll("[data-filter]").length,
      filterStatusExists: !!document.getElementById("work-filter-status"),
      orphanCategories: document.querySelectorAll("[data-category]").length,
      findings: document.querySelectorAll(".case__finding").length,
      recs: document.querySelectorAll(".case__rec").length,
      linkItems: document.querySelectorAll(".case__links-item").length,
      stats: document.querySelectorAll(".case__stats .stat").length,
      metaItems: document.querySelectorAll(".case__meta-item").length,
      links: [...document.querySelectorAll(".case__links-item a")].map((a) => ({
        label: a.querySelector("span").textContent.trim(),
        href: a.getAttribute("href"),
        target: a.getAttribute("target"),
        rel: a.getAttribute("rel"),
      })),
    };
  });

  if (r.count !== 1 || r.ids[0] !== "case-1") {
    fail(`expected exactly one .case with id case-1, found ${r.count} [${r.ids}]`);
  } else {
    pass("single case study card (#case-1)");
  }
  if (r.chipCount !== 0) {
    fail(`${r.chipCount} filter chip(s) still in the DOM for a single-project section`);
  }
  if (r.filterStatusExists) {
    fail("#work-filter-status still present but no filter controls exist");
  }
  if (r.orphanCategories !== 0) {
    fail(`${r.orphanCategories} data-category attribute(s) left with no filter to read them`);
  }

  const expectCounts = [
    ["case__finding", r.findings, 3],
    ["case__rec", r.recs, 4],
    ["case__links-item", r.linkItems, 3],
    ["case__meta-item", r.metaItems, 3],
  ];
  for (const [name, got, want] of expectCounts) {
    if (got !== want) fail(`expected ${want} .${name}, found ${got}`);
  }
  if (r.stats < 1) fail("case__stats row is empty");

  // Every supporting link that is filled in must be a real absolute https URL
  // opening in a new tab. Unfilled ones are reported as pending, not as failures,
  // so a half-finished link list cannot mask a genuine regression.
  const live = [];
  const pending = [];
  for (const l of r.links) {
    if (!/^https?:\/\//.test(l.href || "")) {
      if (l.href !== "#") fail(`"${l.label}" has non-absolute href "${l.href}"`);
      pending.push(l.label);
      continue;
    }
    if (l.target !== "_blank") fail(`"${l.label}" is missing target="_blank"`);
    if (!/noopener/.test(l.rel || "")) fail(`"${l.label}" is missing rel="noopener"`);
    live.push(l.label);
  }

  if (pending.length > 0) {
    pass(
      `supporting links: ${live.length} live (${live.join(", ") || "none"}); ` +
        `${pending.length} still href="#" awaiting URL (${pending.join(", ")})`
    );
  } else {
    pass(
      `all ${live.length} supporting links live, target="_blank" + rel=noopener verified`
    );
  }

  if (
    r.count === 1 &&
    r.chipCount === 0 &&
    !r.filterStatusExists &&
    r.orphanCategories === 0 &&
    r.stats >= 1 &&
    expectCounts.every(([, got, want]) => got === want)
  ) {
    pass(
      `content complete: ${r.findings} findings, ${r.recs} recommendations, ` +
        `${r.linkItems} supporting links, ${r.metaItems} meta fields, ${r.stats} stats`
    );
  }
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--allow-file-access-from-files", "--font-render-hinting=none"]
  });

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    const errors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
    page.on("requestfailed", (r) => {
      const u = r.url();
      if (u.startsWith("file://")) errors.push("missing local file: " + u);
    });

    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });
    await page.goto(URL, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      document.documentElement.style.scrollBehavior = "auto";
    });
    await new Promise((r) => setTimeout(r, 400));

    const res = await page.evaluate(PROBE);
    const m = res.metrics;

    console.log("\n=== " + vp.name + " (" + vp.width + "x" + vp.height + ") ===");
    console.log(
      "  layout  rail=" + m.railPresent + "  topbar=" + Math.round(m.topbarW) + "/" + m.docW +
      "  topbarLeft=" + m.topbarLeft + "  shellPad=" + m.shellPadLeft +
      "  padX=" + m.padX + "  padBlock=" + m.padBlock + "/" + m.contactPadBlock
    );
    console.log(
      "  nav     list=" + m.navDisplay + " burger=" + m.burgerDisplay + " socials=" + m.channelSocials
    );
    console.log(
      "  type    heroTitle=" + m.heroTitleFont + " secTitle=" + m.sectionTitleFont +
      " stackTitle=" + m.stackTitleFont + " body=" + m.heroTitleCopyFont + " stat=" + m.statFont +
      " action=" + m.actionFont + " navLS=" + m.navLinkLS
    );
    console.log(
      "  shape   btn=" + m.btnRadius + " chip=" + m.chipRadius + " case=" + m.caseRadius +
      " pip=" + m.pillRadius + " avatar=" + m.avatarPresent + "  mono=" + m.monoFont.split(",")[0]
    );
    console.log(
      "  counts  sections=" + m.sectionCount + " services=" + m.serviceCount + " work=" + m.workCount +
      " tiles=" + m.tileCount + " filters=" + m.chipCount + "  headings=" + m.headings.join("/")
    );
    console.log(
      "  content pageH=" + m.pageH + " monument=" + m.monumentFont + " (" + m.monumentScrollW + "/" + m.monumentClientW + ")"
    );
    console.log("  a11y    imgsMissingAlt=" + m.imgsNoAlt + "  navLinkFont=" + m.navLinkFont);

    if (m.revealTotal === 0) fail("no [data-reveal] elements found");
    if (m.hiddenReveal > 3) fail(m.hiddenReveal + " reveal element(s) still at opacity 0 after full scroll");
    if (m.imgsNoAlt > 0) fail(m.imgsNoAlt + " image(s) without alt attribute");
    if (m.avatarPresent > 0) fail(m.avatarPresent + " .avatar element(s) still present in header");
    if (m.railPresent > 0) fail(m.railPresent + " sidebar element(s) still in the DOM");
    if (parseFloat(m.shellPadLeft) > 0) fail(".shell still has left padding " + m.shellPadLeft);
    if (parseFloat(m.topbarLeft) > 0) fail(".topbar still offset by " + m.topbarLeft);
    if (m.topbarW < m.docW - 1) fail(".topbar spans " + Math.round(m.topbarW) + "px of " + m.docW + "px viewport");
    if (errors.length) errors.forEach((e) => fail("JS/asset: " + e));
    res.problems.forEach((p) => fail(p));
    if (!res.problems.length && !errors.length) pass("layout + assets + a11y ok");

    if (vp.width < 768) {
      await testMobileNav(page);
    } else {
      await testScrollspy(page, vp.name);
    }

    await testFilter(page);
    await testThumbGrid(page);
    await page.close();
  }

  await browser.close();
  testImageFiles();
  console.log("\n" + (failures === 0 ? "=== ALL CHECKS PASSED ===" : "=== " + failures + " ISSUE(S) ==="));
  process.exit(failures === 0 ? 0 : 1);
})();

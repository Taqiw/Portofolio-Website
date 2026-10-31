"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const SRC = path.join(ROOT, "src");
const PARTIALS = path.join(SRC, "partials");
const ENTRY = path.join(SRC, "index.html");
const OUT = path.join(ROOT, "index.html");
const WATCH = process.argv.includes("--watch");

const INCLUDE = /<!--\s*@include\s+partials\/([\w.-]+)\s*-->/g;

function readPartials() {
  return fs
    .readdirSync(PARTIALS)
    .filter((name) => name.endsWith(".html"))
    .reduce((acc, name) => {
      acc[name] = fs.readFileSync(path.join(PARTIALS, name), "utf8").trim();
      return acc;
    }, {});
}

function render(source, partials, depth = 0) {
  if (depth > 10) {
    throw new Error("Partial include depth exceeded (circular include?).");
  }

  const missing = [];

  const output = source.replace(INCLUDE, (match, name) => {
    if (typeof partials[name] !== "string") {
      missing.push(name);
      return match;
    }
    return render(partials[name], partials, depth + 1);
  });

  if (missing.length > 0) {
    throw new Error(`Missing partial(s): ${[...new Set(missing)].join(", ")}`);
  }

  return output;
}

function build() {
  const source = fs.readFileSync(ENTRY, "utf8");
  const partials = readPartials();
  const html = render(source, partials);

  fs.writeFileSync(OUT, html, "utf8");

  const bytes = Buffer.byteLength(html, "utf8");
  console.log(
    `built index.html  ${Object.keys(partials).length} partials  ${(bytes / 1024).toFixed(1)} kB`
  );

  return html;
}

function verify(html) {
  const problems = [];

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (duplicates.length > 0) {
    problems.push(`Duplicate id(s): ${[...new Set(duplicates)].join(", ")}`);
  }

  const targets = [...new Set([...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]))];
  const broken = targets.filter((id) => !ids.includes(id));
  if (broken.length > 0) {
    problems.push(`Anchor(s) with no matching id: ${broken.join(", ")}`);
  }

  const leftovers = [...html.matchAll(/<!--\s*@include/g)];
  if (leftovers.length > 0) {
    problems.push(`${leftovers.length} unresolved @include marker(s)`);
  }

  const classes = new Set(
    [...html.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/))
  );
  const css = [
    "tokens",
    "base",
    "layout",
    "components",
    "sections"
  ]
    .map((name) => fs.readFileSync(path.join(ROOT, "assets", "css", `${name}.css`), "utf8"))
    .join("\n");

  const undefinedClasses = [...classes].filter(
    (cls) => cls && !css.includes(`.${cls}`)
  );
  if (undefinedClasses.length > 0) {
    problems.push(`Class(es) with no CSS rule: ${undefinedClasses.join(", ")}`);
  }

  if (problems.length > 0) {
    console.error("\nverify failed:");
    problems.forEach((p) => console.error(`  - ${p}`));
    process.exitCode = 1;
  } else {
    console.log(
      `verify ok        ${ids.length} ids, ${targets.length} anchors, ${classes.size} classes`
    );
  }
}

const html = build();
verify(html);

if (WATCH) {
  console.log("watching src/ ...");
  fs.watch(SRC, { recursive: true }, () => {
    try {
      verify(build());
    } catch (error) {
      console.error(error.message);
    }
  });
}

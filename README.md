# MTW Portfolio &mdash; Cinematic Luxe Editorial

A zero-dependency static portfolio built from the design in `stitchexport/`
(`DESIGN.md` + `code.html`). Semantic HTML, hand-written token-driven CSS, and
vanilla JavaScript. No build tooling required to view it &mdash; open
`index.html` in a browser.

## Quick start

```bash
open index.html            # works directly, no install
npm run build              # regenerate index.html from src/
npm run watch              # rebuild + verify on every change
npm run verify             # headless browser layout + interaction tests
```

`npm run verify` needs Chrome and a one-off `npm i -D puppeteer-core`.

## File structure

```
.
├─ index.html                 GENERATED output — do not edit by hand
├─ build.js                   partial assembler + static verifier
├─ verify-layout.js           responsive + interaction tests (8 viewports)
├─ verify-stress.js           overflow / overlap tests (6 edge viewports)
├─ verify-fonts.js            webfont-loaded vs blocked metrics
├─ verify-portrait.js         local portrait decodes at true size, crop is horizontal only
├─ verify-hero.js             hero headline line-height, wrap count, column overflow
├─ package.json
│
├─ src/
│  ├─ index.html              SOURCE template with @include markers
│  └─ partials/
│     ├─ nav-drawer.html      mobile drawer panel
│     ├─ header.html          fixed topbar + primary nav
│     ├─ hero.html            01 portrait / intro / monument type / thumbnails
│     ├─ about.html           02 background, stats, tenet
│     ├─ services.html        03 expertise list
│     ├─ work.html            03 single case study (Global Superstore)
│     ├─ stack.html           05 arsenal grid
│     ├─ contact.html         06 engagement + channels
│     └─ footer.html          closing bar + footer
│
└─ assets/
   ├─ css/
   │  ├─ main.css             @import manifest (load order matters)
   │  ├─ tokens.css           colors, type scale, spacing, layout metrics
   │  ├─ base.css             reset, .type-* utilities, reveal, a11y
   │  ├─ layout.css           topbar, nav, drawer, shell, section frames
   │  ├─ components.css       buttons, chips, media, stats, service rows, case cards
   │  └─ sections.css         per-section layout
   ├─ js/modules/
   │  ├─ nav.js               drawer toggle, scrim, Escape, scroll lock
   │  ├─ scroll.js            smooth scroll w/ header offset, scrollspy, hash
   │  ├─ reveal.js            IntersectionObserver reveal
   │  └─ filter.js            case-study category filter
   └─ img/
      ├─ logo-mtw.svg         local geometric monogram
      ├─ favicon.svg
      └─ README.md            how to host the photos locally
```

## Editing workflow

Edit anything in `src/partials/` or `src/index.html`, then `npm run build`.
The build inlines partials into root `index.html` and fails loudly on:
missing partials, circular includes, duplicate `id`s, anchors pointing at
non-existent `id`s, unresolved `@include` markers, or class names with no CSS
rule.

CSS and JS are **not** inlined &mdash; edit them directly in `assets/`, no
rebuild needed.

## Design system

All values come from `stitchexport/DESIGN.md`. They live as custom properties
in `assets/css/tokens.css`.

**Breakpoints** (Tailwind-equivalent, so the export's `lg:` maps to 1024px):

| Range | Layout |
| --- | --- |
| `< 768px` | 4-column, 1.25rem margins, drawer nav, 1.5rem headlines |
| `768 &ndash; 1023px` | 8-column, 2rem margins, topbar nav |
| `>= 1024px` | 12-column, 4rem margins, full-bleed canvas |

**Type**

| Token | Font | Size / Line | Weight | Tracking |
| --- | --- | --- | --- | --- |
| `display-xl` | Space Grotesk | 5rem / 5.5rem | 700 | 0.08em |
| `display-outline` | Space Grotesk | 4.5rem / 5rem | 700 | 0.15em |
| `headline-lg` | Space Grotesk | 2rem / 2.6rem | 600 | 0.02em |
| `headline-md` | Space Grotesk | 1.25rem / 1.75rem | 500 | 0.02em |
| `body-lg` | Plus Jakarta Sans | 1.125rem / 1.85rem | 400 | &mdash; |
| `body-md` | Plus Jakarta Sans | 0.9375rem / 1.6rem | 400 | &mdash; |
| `body-sm` | Plus Jakarta Sans | 0.8125rem / 1.4rem | 400 | &mdash; |
| `label-caps` | Inter | 0.6875rem / 1rem | 600 | 0.22em |
| `label-md` | Inter | 0.8125rem / 1.25rem | 500 | 0.05em |

**Surfaces** are tone-on-tone (`--surface-container-lowest` &rarr; `-highest`),
never drop shadows. Elevation comes from `backdrop-filter: blur()` and radial
gold glows. Borders are hairlines: `--hairline*` (white 0.05&ndash;0.2) and
`--hairline-gold*` (gold 0.25 / 0.45). Accent gold is `--primary-container`
(`#E6C84A`); only active states, CTAs, tags, and pips use it.

**Sharp corners everywhere** (`border-radius: 0`) except functional status
dots &mdash; `.pip` and `.avatar` are the only circles, per the design's
"circular micro-dots used strictly as functional status indicators".

## Deliberate deviations from the export

The export (`code.html`) was a static Tailwind CDN mockup. These changes were
needed to make it a working responsive site:

1. **The mobile nav was incomplete.** The export shipped a hamburger button
   with no handler and no panel markup. Built `nav-drawer.html` plus
   `nav.js` (open/close, scrim, Escape, scroll lock, auto-close on link click
   and on resize past 768px).
2. **The scrollspy was incomplete.** The export hardcoded
   `aria-current="page"` on "WORK". Now derived from scroll position, with the
   header height accounted for.
3. **"FILTER: ALL ARCHIVES" was a dead label.** Implemented a real filter:
   `data-filter` buttons + `data-category` on each case study, with
   `aria-pressed` and a live count in the status label. *Later removed again
   when the section was reduced to a single case study &mdash; see below.
   `filter.js` is retained and no-ops safely when no `[data-filter]` buttons
   exist.*
4. **The monument headline was clipped at 5 of 7 widths.** The export used
   `whitespace-nowrap` with a fixed `font-size`, and `overflow:hidden` silently
   cut the name off between 375px and 1440px. Now sized from its container:
   `font-size: min(6.5rem, calc(100cqw / 13.9))` with
   `container-type: inline-size` on the clip box. `13.9` is the widest measured
   em-ratio of "MUHAMMAD TAQI WIJDAN" plus a safety margin. A
   metric-matched `@font-face` fallback (`size-adjust: 91.9%`) keeps it from
   overflowing while Space Grotesk loads or if it never loads. Verified across
   17 widths with the font both loaded and blocked &mdash; see
   `verify-fonts.js`.
5. **Scrollbars are styled, not hidden.** The export set
   `::-webkit-scrollbar { display: none }`, which removes the scrollbar
   affordance entirely. Replaced with a thin tonal scrollbar.
6. **Body scroll is `overflow-x: hidden`, not `none`.** The export set
   `body { overscroll-behavior: none }`, which also disables pull-to-refresh
   and breaks keyboard scrolling edge cases. Only the x-axis is clipped.
7. **Scroll-reveal degrades safely.** `[data-reveal]` starts at `opacity: 0`,
   so a `<noscript>` block resets it and `prefers-reduced-motion` disables the
   transition &mdash; content is never trapped invisible.

## Changes made after the initial build

These are deliberate departures from the export, done on request:

- **The fixed left utility rail was removed entirely** (`rail.html` deleted,
  all `.rail*` rules dropped, `--rail-width` token removed). `.shell` no longer
  carries `padding-left` and `.topbar` is pinned at `left: 0`, so the canvas is
  edge-to-edge and horizontally symmetric at every breakpoint. Both `verify-layout.js`
  and `verify-stress.js` assert this, so the offset cannot silently return.
Side effect: the rail held the only Dribbble and Behance links, so those two
   platforms are no longer linked anywhere on the page. The header still carries
   the monogram, and LinkedIn/GitHub/Instagram remain in the contact section.
- **The four template case studies were replaced with one real project.** The
   Work section now contains a single `.case` card for *Global Superstore Data
   Analytics: Increasing Corporate Profitability in Central US* (RevoU capstone),
   built from the `.case*` component set: meta grid, stat row, Background,
   Key Findings, Business Recommendations, and a Supporting Links row.
   Consequently the category filter was dropped (useless with one project) along
   with the `.work-item`, `.work-panel`, `.chip--filter` and `.work__list` rules
   &mdash; roughly 90 lines of dead CSS. `verify-layout.js` now asserts the
   section holds exactly one card and zero filter controls.
   Two content decisions were made and are easy to reverse:
   - The body copy is **English**, matching the rest of the site.
   - Indiana's profit is written **`$9,627.96`** (en-US), not the Indonesian
     `$9.627,96`, which an English reader would parse as about nine dollars.

- **The hero copy was rewritten.** The headline is now two-tone, matching the
  export's structure: `Informatics Graduate &amp; Technology Enthusiast,` in
  `--on-surface` and `turning ideas into meaningful solutions.` in the muted
  `.hero__title-accent`. `font-size` / `line-height` were deliberately left
  untouched so the typography stays on the existing scale -- the longer headline
  wraps to 4 lines max at every breakpoint, with line-height ratios of
  1.18&ndash;1.33 (no overlap) and no column overflow. Measured by
  `verify-hero.js`.

## Before deploying

- [ ] **Re-export the dashboard screenshot at a higher resolution.**
      `assets/img/power-bi-dashboard.png` is 621x349. It reads fine in the Work
      card but is upscaled and soft in the hero thumbnail on a laptop, and
      worse on a retina display. Re-export around 1600x900, keep the filename,
      and update `width`/`height` on both `<img>` tags to match.
- [ ] Fill in the two remaining `href="#"` placeholders in `work.html`
      (`data-placeholder-link="power-bi"` and `"issue-tree"`) with the real URLs
      for the Power BI dashboard and the Issue Tree. The Dataset button is live
      (`https://bit.ly/Dataset_Tim2`, opens in a new tab).
      `verify-layout.js` asserts every filled-in link is absolute `https`,
      carries `target="_blank"` and `rel="noopener"`, and reports the unfilled
      ones as pending rather than failing.
- [ ] Add `assets/resume.pdf` (the "Download R&eacute;sum&eacute;" button
      points there).
- [ ] Replace the placeholder social URLs in `contact.html`
      (`linkedin.com`, `github.com`, `instagram.com` are bare domains).
- [ ] Replace `taqi@wijdan.studio` and the footer year.
- [ ] Self-host the three font families if you need GDPR/privacy compliance
      &mdash; they load from Google Fonts.

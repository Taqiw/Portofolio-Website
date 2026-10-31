# Images

`logo-mtw.svg`, `favicon.svg` and `Foto-Taqi.jpeg` are local and ready to use.

The hero portrait is now `Foto-Taqi.jpeg` (1280x1280, no EXIF rotation flag). The
`.media--portrait` frame is `3 / 4` with `object-fit: cover`, so the square source is
scaled to fill the frame height and loses roughly 12.5% off the left and right edges.
Nothing is cropped vertically, so headshots stay safe. If you ever need to shift the
crop horizontally, adjust `object-position` in `assets/css/components.css`.

The hero thumbnail and the Work case-study figure now both use `power-bi-dashboard.png`,
the real Power BI screenshot from the Global Superstore analysis. This replaced the
template's "Aura AI" mockup, which was previously hotlinked from a Google CDN while
carrying alt text that described it as a Power BI dashboard. `verify-layout.js` now
fails on any hotlinked `<img>` and on any image file missing from disk, so a template
screenshot cannot quietly re-enter the portfolio again.

Dashboard images use `.media--dashboard`, not plain `.media`. That class switches
`object-fit` to `contain` and removes the sitewide `grayscale(1)` filter, because a
Power BI visual loses the bar and axis labels under `cover` and loses the red/green
profit coding under grayscale.

## Expected files

| File | Used by | Intrinsic size |
| --- | --- | --- |
| `Foto-Taqi.jpeg` | `partials/hero.html` portrait | 1:1 square (1280x1280), rendered in a 3:4 frame |
| `power-bi-dashboard.png` | `partials/hero.html` thumb + `partials/work.html` figure | 16:9 (621x349) |

### Resolution warning

`power-bi-dashboard.png` is only **621x349**. That is fine at the card size in the
Work section, but the hero thumbnail renders around 700-900px wide on a laptop and
wider on a desktop, so the image is upscaled and the KPI labels will look soft. On a
retina display it is worse. Re-export from Power BI at roughly 1600x900 (or at least
1242x698 for a clean 2x) and replace the file; keep the filename so no markup changes.
Update `width`/`height` on both `<img>` tags to match the new file.

## Swapping in local files

1. Save the images here using URL-safe names: lowercase, hyphens, no spaces.
   A name like `Power BI.png` has to be percent-encoded (`Power%20BI.png`) and breaks
   on some static hosts, so files are renamed to slugs such as `power-bi-dashboard.png`.
2. In `src/partials/hero.html` and `src/partials/work.html`, change each `src` to
   `assets/img/<name>.<ext>`.
3. Run `npm run build` to regenerate `index.html`.
4. Update the matching `width`/`height` attributes so the aspect ratio stays reserved and
   layout shift is avoided. They are already set to the correct ratios, so you only need to
   change them if you change the crop.
5. Run `npm run verify` — the image checks report missing files by name.

## Placeholder behaviour

Every `.media` frame has a `background-color` of `--surface-container-low` and a
`media__scrim` overlay. If an image is missing or fails to load, the frame still renders as a
solid tonal block with its gradient scrim and caption intact rather than collapsing.

## Resume

`contact.html` links to `assets/resume.pdf` with the `download` attribute. Drop a PDF at
`assets/resume.pdf` or change the `href` to wherever your CV is hosted.

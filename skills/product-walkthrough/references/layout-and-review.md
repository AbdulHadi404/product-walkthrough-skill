# Layout, build and review

`scripts/build.mjs` turns a content module plus the capture manifest into a self-contained HTML file and an A4 PDF (headless Chrome, footer with page numbers). The defaults below are the result of several review rounds; change them deliberately.

## Layout decisions and why

- **A4, 16 mm side margins, 11.5 pt body, Inter with system fallbacks.** Large enough for older readers on paper; fits one screen with legend, steps and tips on one page most of the time.
- **One section per page** (`break-before: page`). Readers open the guide at a screen; a page that starts mid-section is disorienting.
- **Screenshot at 88 % of the text width**, centred, thin border, badges as 22 px accent-coloured circles with a white ring, placed just left of the element so they cover no words. Full-page (tall) screenshots are capped at 160 mm so the heading, the figure and its legend share a page.
- **Legend in two columns, three when seven or more callouts.** Keeps the figure and its legend on the same page.
- **Order inside a section**: summary → figure(s) → steps → tables → tips. Tables come before the tips box so a status table never dangles after it; both are `break-inside: avoid`.
- **Contents on its own page** after the overview; otherwise the last contents row spills into a near-empty page before the first part divider.
- **Part dividers** are soft-tinted panels with the part number, title, one-sentence summary and section list — a deliberate pause, not an accidental blank page.
- **Chips** for UI labels: `[[Label]]` in steps, tips, legends, summaries, raw HTML blocks and the appendix.
- **Images at 1.5× device scale, JPEG 86** (`scripts/shrink.py` from the 2× captures). A 57-page guide lands under 10 MB; 2× originals doubled it for no visible gain in print. `shrink.py` never upscales, so 1080 px phone shots stay 1080 px.
- **Phone screens in a row**: `shots: [{ row: [shot, shot, shot] }]` puts two or three portrait shots side by side, each with its own caption, badge numbers running on across the row and one legend under it. Frames get a **definite height** (98 mm for three, 122 mm for two) — an auto-width flex child holding a percent-width image collapses to a thumbnail. Three 9:16 phones at 98 mm are 58 mm wide each, which fits the 178 mm text width.
- **Per-shot height**: `{ name, height: 118 }` (mm) pins one figure's height when the page must also hold six steps, or when a wide crop would otherwise be treated as a tall figure.
- **Commands** go in `<pre class="cmd">` inside `extra`/`appendix` (dark box, wrapped, `<b>` for the program name); backticks in steps, tips and legends render as `<code>`.

## Theme

`theme` in the content module sets the tokens the CSS is written against: `accent`, `accentSoft`, `ink`, `ink2`, `muted`, `line`, `tip`, `tipLine`. Take them from the product's own design tokens; the accent is what makes the guide read as that product's, and the soft tint is used for the cover pill, the journey tiles and the part dividers, so pick one that stays legible under dark text.

## Build

```bash
python3 shrink.py                                   # .work/shots → .work/shots/pdf
node build.mjs content-company.mjs COMPANY-GUIDE    # writes COMPANY-GUIDE.pdf to WALKTHROUGH_OUT (repo root by default)
```

Google Fonts are fetched at build time when the network allows; the fallbacks are chosen so the PDF still reads well offline. A transient Chrome failure on back-to-back builds is real — run the second build again rather than debugging it.

## Review loop

```bash
pdftoppm -r 50 -png GUIDE.pdf .work/preview/p       # every page as a small PNG
python3 contact-sheet.py --pages .work/preview       # 10 pages per sheet
```

No poppler (Windows)? PyMuPDF does the same in one line:

```bash
pip install pymupdf
python -c "import fitz;d=fitz.open('GUIDE.pdf');[p.get_pixmap(dpi=50).save(f'.work/preview/p-{i+1:02}.png') for i,p in enumerate(d)]"
python -c "import fitz;print(''.join(p.get_text() for p in fitz.open('GUIDE.pdf')).count('localhost'))"   # the pdftotext grep
```

**Pagination depends on the font actually loaded.** Inter comes from Google
Fonts at build time; when the network is down Chrome falls back to Segoe/Arial,
which is narrower, and a page that fit offline spills its tips box once Inter
loads. Review the page sheets of the build you deliver, not an earlier one, and
leave a few lines of slack on full pages.

Look at every sheet. The defects that keep coming back:

| Defect | Cause | Fix |
| --- | --- | --- |
| A page containing only a "Good to know" box | section slightly too long | shorten a step or two, or drop a callout; do not let the box split |
| Status table split across pages | table placed after tips, or `break-inside` missing | tables before tips, `break-inside: avoid` |
| Contents spilling one row onto a blank-looking page | contents shared a page with the overview | contents on its own page |
| Legend numbers skip (1, 2, 4) | a callout selector did not resolve at capture | fix the selector and recapture that audience, or remove the label |
| Badge in the wrong place | element moved between capture and manifest write | recapture; the kit writes the manifest per shot, so a crash is not the cause |
| Screenshot shows "Unknown"/nameless rows or leftover test data | seed or pre-run gap | fix the data, recapture |
| `[[Label]]` printed literally | raw HTML block not passed through the chip filter | keep `extra`, `intro` and `appendix` going through `chips()` |
| Test-environment strings in a screenshot ("simulated", localhost URLs, an error toast) | capture too early or a state the environment cannot reach | wait for the right state, or stage the component honestly and declare it |
| Tall form screenshot squeezed to ~4 pt labels | full-page shot of a page with a sidebar | capture with `clip:` on the form's container |
| Phone screenshots render as thumbnails in a row | flex frame without a definite height | the row CSS sets `height`; keep it |
| Steps and tips spill after a tall figure | 160 mm figure + long legend + six steps | shorten legend labels to noun phrases, move the steps to the "filled in" page, or set `height` on the shot |
| Badge points at nothing / sits at (−250, −90) | callout selector resolved a hidden `input[type=file]` | point at the visible card title (`text:Logo`) or the upload button |
| `ERR_UNSUPPORTED_ESM_URL_SCHEME` on build | `import('C:\\…')` on Windows | `build.mjs` imports the content module through `pathToFileURL` |

## Final checks before delivery

```bash
pdftotext CUSTOMER-GUIDE.pdf - | grep -i -c 'twilio\|telnyx\|<engine>\|<vendor>\|supabase\|vercel\|localhost'   # must print 0
pdfinfo GUIDE.pdf | grep Pages
```

Build the forbidden-word list from the project's golden rules and its infrastructure names. The admin guide may legitimately name the providers the admin configures; check it against the shorter list (keys, hostnames, internal tooling).

Then send the PDFs to the user, commit them with the generator, and report: page counts, file sizes, which screenshots were staged, which screens are placeholders in the product, and the one-line command sequence to regenerate.

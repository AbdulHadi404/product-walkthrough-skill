# Layout, build and review

`scripts/build.mjs` turns a content module plus the capture manifest into a self-contained HTML file and an A4 PDF (headless Chrome, footer with page numbers). The defaults below are the result of several review rounds; change them deliberately.

## Layout decisions and why

- **A4, 16 mm side margins, 11.5 pt body, Inter with system fallbacks.** Large enough for older readers on paper; fits one screen with legend, steps and tips on one page most of the time.
- **One section per page** (`break-before: page`). Readers open the guide at a screen; a page that starts mid-section is disorienting.
- **Screenshot at 88 % of the text width**, centred, thin border, badges as 22 px indigo circles with a white ring. Full-page (tall) screenshots are capped at 200 mm high and centred; they are overviews, not something to read.
- **Legend in two columns, three when seven or more callouts.** Keeps the figure and its legend on the same page.
- **Order inside a section**: summary → figure(s) → steps → tables → tips. Tables come before the tips box so a status table never dangles after it; both are `break-inside: avoid`.
- **Contents on its own page** after the overview; otherwise the last contents row spills into a near-empty page before the first part divider.
- **Part dividers** are soft-tinted panels with the part number, title, one-sentence summary and section list — a deliberate pause, not an accidental blank page.
- **Chips** for UI labels: `[[Label]]` in steps, tips, legends, summaries, raw HTML blocks and the appendix.
- **Images at 1.5× device scale, JPEG 86** (`scripts/shrink.py` from the 2× captures). A 57-page guide lands under 10 MB; 2× originals doubled it for no visible gain in print.

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

## Final checks before delivery

```bash
pdftotext CUSTOMER-GUIDE.pdf - | grep -i -c 'twilio\|telnyx\|<engine>\|<vendor>\|supabase\|vercel\|localhost'   # must print 0
pdfinfo GUIDE.pdf | grep Pages
```

Build the forbidden-word list from the project's golden rules and its infrastructure names. The admin guide may legitimately name the providers the admin configures; check it against the shorter list (keys, hostnames, internal tooling).

Then send the PDFs to the user, commit them with the generator, and report: page counts, file sizes, which screenshots were staged, which screens are placeholders in the product, and the one-line command sequence to regenerate.

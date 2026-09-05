# Walkthrough guides — generator

Produces the stakeholder guides at the repo root:

- `<PRODUCT>-WALKTHROUGH-COMPANIES.pdf` — every customer-side screen (safe to send to clients)
- `<PRODUCT>-WALKTHROUGH-ADMIN.pdf` — the platform owner's screens

Real screenshots of the product, driven with puppeteer against the **local
stack** in its safe/mock mode, with numbered callouts and plain-language
text. Rerun this after UI changes so the guides stay truthful.

## One-time

```bash
cd scripts/walkthrough && npm install        # puppeteer (downloads Chromium)
```

Local stack: <how to run the product locally in mock mode, ports, every
migration applied, feature switches to turn on>.

`.work/creds.env` (gitignored) holds the **local fixture** logins:

```
SUPER_EMAIL=…
SUPER_PASSWORD=…
DEMO_EMAIL=…
DEMO_PASSWORD=…
```

Environment (export once per shell): `WALKTHROUGH_BASE_URL` (web app),
`<API/auth vars the seed needs>`, optionally `WALKTHROUGH_WORK` (default
`./.work`) and `WALKTHROUGH_OUT` (default: repo root when run from there).

## Generate

```bash
cd scripts/walkthrough
node --env-file=.work/creds.env seed.mjs        # example company through the real API (idempotent)
./pre-run.sh                                    # undo side effects of an earlier capture
node --env-file=.work/creds.env prep-run.mjs    # make live states exist right now
node scenes.mjs                                 # all audiences; or: node scenes.mjs company|member|admin
python3 contact-sheet.py --shots                # look at every screenshot before writing
python3 shrink.py                               # 1.5x JPEGs for the PDF
node build.mjs content-company.mjs <PRODUCT>-WALKTHROUGH-COMPANIES
node build.mjs content-admin.mjs   <PRODUCT>-WALKTHROUGH-ADMIN
pdftoppm -r 50 -png <PRODUCT>-WALKTHROUGH-COMPANIES.pdf .work/preview/p && python3 contact-sheet.py --pages
```

Check the page sheets, then grep the customer guide for internal names
before committing:

```bash
pdftotext <PRODUCT>-WALKTHROUGH-COMPANIES.pdf - | grep -i -c '<vendor>\|<engine>\|localhost'   # must be 0
```

## Files

- `seed.mjs` — builds the example data through the API (agents, contacts,
  users, jobs, CRM…). Idempotent: find by name, else create.
- `pre-run.sh` / `prep-run.mjs` — cleanup of capture side effects / make
  activity exist for live screens.
- `capture-kit.mjs` — puppeteer helpers (login contexts, waits, callouts,
  masking, manifest).
- `scenes.mjs` — the screens, in order, per audience. Callout numbers match
  the label order in the content modules.
- `content-*.mjs` — the words: parts → sections → shots + legends, steps, tips.
- `build.mjs` — HTML + A4 PDF; `shrink.py`, `contact-sheet.py` — image
  budget and review sheets.

Staged screenshots (states the local environment cannot reach for real):
<list them here>.

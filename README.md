# product-walkthrough — a Claude Code skill

A skill that makes Claude Code produce **walkthrough guides of a web product that anyone can follow** — stakeholders of any age, clients, new team members — as PDFs (and HTML), one guide per audience, built from real screenshots of the running app with numbered callouts, plain-language steps and tips, a glossary and quick answers. The whole pipeline (seed → capture → write → build → review) is scripted and committed to the project, so the guides can be regenerated after UI changes instead of rotting.

It was extracted from producing a 57-page customer guide and a 19-page platform-admin guide for a multi-tenant SaaS in one session, and it encodes what made those pages trustworthy and readable rather than what that product looked like.

> Truth over polish: every picture is the real product in a real state, seeded through its own API. If a state cannot be reached locally, the component is staged honestly and the hand-off says so.

## What it does

- **Scope** the guides from the product's own navigation: one guide per audience (customers, platform admins, a "what a member sees" section), the screens and the states worth showing, one example persona for every screenshot.
- **Environment**: run the product locally in its safe/mock mode, verify migrations and background jobs against the database (a silent gap here empties half a guide), turn on the switches the guide needs, create fixture logins.
- **Seed** a believable example company through the product's API — idempotent, with `pre-run` (undo capture side effects) and `prep-run` (make live states exist now) scripts.
- **Capture** with `capture-kit.mjs`: one browser context per audience, case-insensitive text waits, retries for simulated failures, callout boxes recorded into a manifest after every shot, one-time passwords masked before the picture.
- **Write** one content module per guide following a fixed page template: summary, screenshot + legend, "How to do it", "Good to know", status tables; glossary and quick answers at the back; customer guides free of internal and third-party names.
- **Build** A4 PDFs with headless Chrome (`build.mjs`), keep them light (`shrink.py`), and **review** every page on contact sheets (`contact-sheet.py`) until no page is a spilled tips box or a split table; grep the text for leaks before delivering.

## Install

**Copy into Claude Code's skills folder** (personal, available in every project):

```bash
git clone https://github.com/AbdulHadi404/product-walkthrough-skill.git
cp -r product-walkthrough-skill/skills/product-walkthrough ~/.claude/skills/product-walkthrough
```

Or into one project only: copy it to `<repo>/.claude/skills/product-walkthrough`.

**Or as a plugin** (Claude Code plugin marketplace):

```bash
claude plugin marketplace add AbdulHadi404/product-walkthrough-skill
claude plugin install product-walkthrough@product-walkthrough-skill
```

Restart the session (or open a new one) so the skill is listed.

Runtime needs on the machine that captures: Node 20+, `puppeteer` (installed by the generator's `package.json`), Python 3 with Pillow, and poppler (`pdftoppm`, `pdftotext`) for the review loop.

## Use

Ask in plain language; the skill triggers on walkthrough / user guide / product tour / "document every screen" / "explain the platform to stakeholders or clients" requests, or invoke it directly:

```
Prepare a walkthrough PDF of the whole platform for stakeholders of mixed ages —
one for super admins and one for companies. It should cover everything and be
easy enough to share with clients.
```

```
/product-walkthrough — make an onboarding guide for the customer side of this app.
Real screenshots, not mockups; our support team will send it to new accounts.
```

```
Document the admin console for the ops team: every screen, what each control does,
and what happens when it's used. PDF, with pictures.
```

Claude then scopes the guides from the app's navigation, brings the product up locally, seeds an example company through the API, captures every screen, writes the guides, builds and reviews the PDFs, sends them to you, and commits them with the generator under `scripts/walkthrough/` and a README for reruns. It stops to ask only for things you own: fixture credentials it cannot create itself, an environment it cannot bring up, or a decision about what a client may see.

## Layout

```
skills/product-walkthrough/
├── SKILL.md                         # the workflow, gates and gotchas
├── references/
│   ├── environment-and-seeding.md   # safe local run, API-first seed, pre-run/prep-run
│   ├── capture.md                   # capture-kit usage, waits, selectors, masking, staging
│   ├── writing.md                   # voice, page template, per-audience rules
│   └── layout-and-review.md         # print CSS decisions, defect catalogue, final checks
├── scripts/
│   ├── capture-kit.mjs              # puppeteer helpers (login, goto, shot+callouts, manifest)
│   ├── build.mjs                    # content module + manifest → HTML → A4 PDF
│   ├── shrink.py                    # 1.5x JPEGs for the PDF
│   ├── contact-sheet.py             # review sheets of screenshots or PDF pages
│   └── package.json                 # puppeteer dependency for the copied generator
└── templates/
    ├── scenes.example.mjs           # a complete multi-audience capture script
    ├── content.example.mjs          # a content module skeleton
    ├── README.generator.md          # README for the project's scripts/walkthrough folder
    └── sample-contacts.csv          # upload fixture with a duplicate and an invalid row
```

## License

MIT.

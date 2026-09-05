# Capture

`scripts/capture-kit.mjs` wraps puppeteer with the helpers a walkthrough needs; `templates/scenes.example.mjs` shows a complete scenes file. Copy both into the project's `scripts/walkthrough/`, adapt the selectors, run `node scenes.mjs` (or `node scenes.mjs company` for one audience).

## The kit

```js
import { createKit } from './capture-kit.mjs';
const kit = await createKit({ baseUrl: 'http://localhost:3400', workDir: '.work' });
const ctx = await kit.context();                      // isolated cookies per audience
const page = await kit.login(ctx, { email, password }); // fills #email/#password, submits, waits for navigation
await kit.goto(page, '/agents', 'Aria');              // navigate + wait for text (case-insensitive) + settle
await kit.clickBtn(page, 'New agent');                // first visible <button> whose trimmed textContent === label
await kit.type(page, 'input[name=name]', 'Ella');     // select-all then type
await kit.shot(page, 'agents-new', { full: true, callouts: [
  { n: 1, sel: 'input[name=name]' }, { n: 2, sel: '[aria-label=Voice]' }, { n: 3, sel: 'btn:Create agent' },
]});
await kit.close();
```

`shot` hides dev overlays, scrolls to the top, resolves every callout to a bounding box in document coordinates, saves a JPEG (quality 92, device scale 2) and rewrites `.work/shots/manifest.json` immediately. Missing callouts are warned about and skipped, never fatal — decide afterwards whether the legend line should go.

Selector forms for callouts and clicks: `btn:Label` (button by exact text), `a:Label` (link by exact text), `text:Fragment` (puppeteer text selector, first match), anything else is CSS. Prefer stable hooks: `aria-label`, `name`, ids, exact button text. Avoid nth-child chains.

## Waiting correctly

- `goto(page, path, text)` waits for `text` in `document.body.innerText`, **case-insensitively**, because `innerText` applies CSS `text-transform` — an uppercase table header or a capitalised tab never matches its source string exactly. If the text does not appear within 90 s it reloads once (first-compile stalls in dev servers) and waits again.
- After navigation, `settle` waits for network idle plus font loading. Pages that poll every few seconds still settle because the idle window is shorter than the poll interval.
- For content that arrives later (a chart, a canvas, table rows), wait for a selector (`.recharts-wrapper`, `.react-flow__node`, `tbody tr td`) rather than a fixed sleep.
- For live views, wait for a condition that proves activity (`/([2-9]|\d{2,}) active/`) with a fallback that creates activity (place two ad-hoc actions) and waits again.

## Interactions that need care

- **Custom dropdowns** (listbox components): click the trigger (`[aria-label=…]`), wait for `[role=listbox]`, click the option by text inside it, then wait for navigation if choosing it reloads.
- **File uploads**: `page.$('input[type=file]')` then `uploadFile(path)`; the mapping UI appears without a native dialog. Keep the sample file in the generator folder and make its rows recognisably fictional; include one duplicate and one invalid row so the result banner shows all three counters.
- **Forms**: fill sensible values before the shot so the picture shows what "filled in" looks like; cancel afterwards unless the created record is wanted in later screens. Toggle buttons that open a form usually close it too — use that instead of hunting for Cancel.
- **Actions with random failure** in simulated backends: retry up to four times, detecting success by a DOM change (a new row) or failure by `[role=alert]`.
- **Modals**: capture right after the modal's content is present; close with its `[aria-label=Close]` and fall back to Escape.
- **Theme**: click the product's theme toggle for the one dark-mode shot, then toggle back so later shots stay light.

## Roles

Use one browser context per audience so sessions never mix. The admin acting inside a customer workspace (via a switcher that stores state in localStorage) is a distinct screen from the customer's own view and should be captured in the admin context. Member views: log in with the invited member's one-time password, capture the forced password change, set a new password and persist it (`.work/member-state.json`) so reruns skip the change.

## Masking and staging

- **Mask one-time secrets** in the DOM before the shot (`maskCredentials` replaces the password part of `email / password` banners with dots). Never ship a screenshot with a token, key or real password, even a fixture's.
- **Stage only what the environment cannot reach**, using the component's real states. Example: a test-call window in a simulated environment errors immediately; set its status line to the component's own "Connecting…" label and remove the error so the picture shows the state a real user sees. Record every staged screenshot and declare it in the hand-off.
- Do not fabricate rows, numbers or messages that the product never produced.

## Order and side effects

Capture in an order where each screen's side effects cannot appear in a later screen you want clean: CRM and history before test actions that create records; the users list before inviting the sample colleague; admin "create company" last in the admin run. Pre-run resets those side effects before the next capture.

## Review before writing

Tile the screenshots into a contact sheet (`scripts/contact-sheet.py --shots`) and look at every one: empty states where rows were expected, "Unknown" labels, leftover test data, a dev overlay, an error toast, cut-off modals, the wrong theme. Fix the seed or the scene and recapture the affected audience (`node scenes.mjs admin`) — the manifest merges per screenshot name.

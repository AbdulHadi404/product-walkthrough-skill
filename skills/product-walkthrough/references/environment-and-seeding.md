# Environment and seeding

The guide is only as truthful as the data behind the screenshots. This file covers getting the product running safely, building a believable example, and keeping captures repeatable.

## 1. A safe local run

Prefer the product's own "local / mock / simulated" mode over pointing at staging: no real messages, calls or payments can leave the machine, and the capture can place activity freely. Confirm four things before seeding:

1. **Every migration is applied.** Compare the migration files in the repo with the versions recorded in the local database. A missing column shows up as a background job logging `column … does not exist` on every pass while every page still renders — history, reports and notifications simply stay empty. Apply the missing files and record them.
2. **Background loops run and write.** After a small seed, query the tables those loops fill (jobs, events, derived records). Rows appearing is the test; a green health endpoint is not.
3. **Feature switches.** Fresh databases often ship with kill switches off (an outbound-calling switch, a maintenance flag, a "signup closed" toggle). Turn on what the guide needs through the admin UI or API so the captured product behaves as the customer's will.
4. **Fixture logins.** Create the platform-admin and example-company logins with the repo's own seed scripts, or reset their passwords through the auth provider's admin API. Store them in a gitignored env file (`.work/creds.env`); the capture script reads them from there. These are test fixtures you created, never the user's credentials.

Also verify the web dev server serves the app with no leftover processes on the port from earlier sessions (a stale process serves stale code and old data).

## 2. Designing the example

Pick one made-up company and stay with it in every screenshot: a name, a sector readers understand instantly (a solar installer, a dental group, a travel agency), a handful of staff with roles, and data volumes large enough to look real but small enough to read: 3–4 agents/products, 30–60 contacts split across 2–3 lists, 3–4 jobs in different statuses (running, completed, draft, paused), a dozen CRM records across every stage, one or two disabled users, one archived item. Include the states that explain the product: a suspended account in the admin list, one account on the alternative mode (bring-your-own vs platform), an item that failed for a legitimate reason.

Names and numbers must be unmistakably fictional (`example.com` emails, reserved `555` phone ranges, obviously invented company names) so a client can never mistake them for real customers.

## 3. Seed through the API, not the database

```js
const tok = await token(email, password);          // auth provider password grant
const api = client(tok);                            // adds Authorization + JSON headers
const agent = await post(api, '/agents', {...});    // the same endpoints the UI calls
```

Why: the UI's derived data (leads created from call outcomes, notifications from events, activity logs, counters) only appears when product code runs. SQL fixtures skip all of it and produce screens that contradict each other. The API route also validates your payloads against the real schemas.

Make every step idempotent — "find by name, else create" — so the seed can be rerun after a failed capture without duplicating rows. Write the important ids and one-time passwords to a JSON file (`.work/seed-out.json`) for the capture script.

Include, in this order, the things later steps depend on: platform-level entities (companies, providers, switches) → the example company's core objects (agents, knowledge, flows) → contacts → phone numbers/channels → users → jobs/campaigns (started last, so they run while you capture) → manual CRM records with notes and tasks (one overdue, one today, one upcoming — the tasks view needs all three buckets).

## 4. Two scripts you will run before every capture

**pre-run** — undo what the previous capture created: the user invited on the Users page, the company created on the admin page, contacts imported from the sample CSV, ad-hoc records created by test actions, nameless leads born from those actions, and the notifications that reference them. Delete in dependency order (notifications → derived records → parents). Keep it as SQL or API calls scoped by the fixture names so it can never touch anything else.

**prep-run** — make live states exist *now*: if fewer than N items are in flight, start a fresh job with a fresh list (name it "… · wave 2" on reruns). "Running" jobs whose remaining work is scheduled retries produce empty live views; a freshly started one produces named rows with ticking timers within seconds.

## 5. Cleaning old fixture data

Previous test runs leave "E2E …" companies, "UI check" campaigns and probe users behind. Remove them before capturing the admin views: they look like real customers to a stakeholder and they distort the usage columns. Delete by the unmistakable name patterns those tests use, children first (tables without cascade rules — notifications, activity logs, calls — need explicit deletes).

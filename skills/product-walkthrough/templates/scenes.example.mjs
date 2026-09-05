// scenes.example.mjs — a complete capture script for a multi-tenant SaaS
// (adapted from a real walkthrough). Copy next to capture-kit.mjs, rename to
// scenes.mjs, and replace routes, selectors and fixture names with yours.
//
//   node scenes.mjs            # every audience
//   node scenes.mjs company    # one audience (manifest entries merge by name)
//
// Callout numbers (n) must match the order of the labels in the content
// module, because the builder pairs them by position.
import fs from 'node:fs';
import path from 'node:path';
import { createKit } from './capture-kit.mjs';

const WORK = process.env.WALKTHROUGH_WORK ?? '.work';
const creds = Object.fromEntries(
  fs.readFileSync(path.join(WORK, 'creds.env'), 'utf8').split('\n').filter(Boolean).map((l) => {
    const i = l.indexOf('=');
    return [l.slice(0, i), l.slice(i + 1)];
  }),
);
const seed = JSON.parse(fs.readFileSync(path.join(WORK, 'seed-out.json'), 'utf8'));
const ONLY = process.argv[2] ? new Set(process.argv[2].split(',')) : null;

const kit = await createKit({
  baseUrl: process.env.WALKTHROUGH_BASE_URL ?? 'http://localhost:3400',
  workDir: WORK,
  loginReadyText: 'Sign in to your workspace',
});
const { goto, shot, clickBtn, type, hasText, settle, sleep, maskCredentials } = kit;

// ───────────── company admin: the customer-facing guide ─────────────
if (!ONLY || ONLY.has('company')) {
  const ctx = await kit.context();

  // The login page itself, with the email typed so the picture is not empty.
  {
    const p = await kit.newPage(ctx);
    await goto(p, '/login', 'Sign in to your workspace');
    await type(p, '#email', 'jordan.blake@example.com');
    await shot(p, 'login', {
      callouts: [{ n: 1, sel: '#email' }, { n: 2, sel: '#password' }, { n: 3, sel: 'button[type=submit]' }],
    });
    await p.close();
  }

  const page = await kit.login(ctx, { email: creds.DEMO_EMAIL, password: creds.DEMO_PASSWORD });
  await hasText(page, 'Active campaigns');
  await settle(page);
  await shot(page, 'dashboard', {
    callouts: [{ n: 1, sel: 'aside nav' }, { n: 2, sel: 'main .grid > div' }, { n: 3, sel: 'header' }],
  });

  // A list screen, then its create form filled with sensible values.
  await goto(page, '/agents', 'Aria');
  await shot(page, 'agents', {
    callouts: [
      { n: 1, sel: 'btn:New agent' },
      { n: 2, sel: 'main .grid > div' },
      { n: 3, sel: 'btn:Edit' },
      { n: 4, sel: 'btn:Test call' },
      { n: 5, sel: 'btn:Archive' },
    ],
  });
  await clickBtn(page, 'New agent');
  await page.waitForSelector('input[name=name]');
  await type(page, 'input[name=name]', 'Ella');
  await type(page, 'textarea[name=greeting]', 'Hi, this is Ella. Do you have a quick minute?');
  await shot(page, 'agents-new', {
    full: true,
    callouts: [
      { n: 1, sel: 'input[name=name]' },
      { n: 2, sel: '[aria-label=Language]' },
      { n: 3, sel: 'textarea[name=greeting]' },
      { n: 4, sel: 'btn:Create agent' },
    ],
  });
  await clickBtn(page, 'Cancel');

  // A modal the environment cannot drive for real: stage the component's own
  // "connecting" state and declare it in the hand-off.
  await clickBtn(page, 'Test call');
  await hasText(page, 'Test call —');
  await sleep(300);
  await page.evaluate(() => {
    const h2 = [...document.querySelectorAll('h2')].find((h) => h.textContent.startsWith('Test call —'));
    const status = h2?.nextElementSibling;
    if (status) status.textContent = 'Connecting…';
    h2?.closest('.fixed')?.querySelector('[role=alert]')?.remove();
  });
  await shot(page, 'agents-testcall', { callouts: [{ n: 1, sel: 'text:Test call —' }, { n: 2, sel: 'btn:End call' }] });
  await page.click('[aria-label=Close]').catch(() => page.keyboard.press('Escape'));

  // A file upload with the mapping step and the result banner.
  await goto(page, '/contacts', 'Spring Solar Leads');
  await page.click('::-p-text(Website Enquiries)');
  await settle(page, 300);
  const fileInput = await page.$('input[type=file]');
  await fileInput.uploadFile(path.resolve('sample-contacts.csv'));
  await hasText(page, 'Map columns');
  await shot(page, 'contacts-import', { callouts: [{ n: 1, sel: 'text:Map columns' }, { n: 2, sel: 'btn:Import' }] });
  await clickBtn(page, 'Import');
  await hasText(page, 'Imported ');
  await shot(page, 'contacts-imported', { callouts: [{ n: 1, sel: 'text:Imported ' }] });

  // A live view: make sure activity exists, with a fallback that creates some.
  await goto(page, '/live-calls', 'Live Calls');
  const enough = () =>
    page.waitForFunction(() => /([2-9]|\d{2,}) active/.test(document.body.innerText), { timeout: 60000 }).then(() => true).catch(() => false);
  if (!(await enough())) {
    await goto(page, '/calls', 'Outbound call');
    await type(page, 'input[name=phone]', '+14155550778');
    await kit.clickWithRetry(page, 'Place call', () => document.body.innerText.toLowerCase().includes('this session'));
    await goto(page, '/live-calls', 'Live Calls');
    await enough();
  }
  await shot(page, 'live-calls', { callouts: [{ n: 1, sel: 'text: active' }, { n: 2, sel: 'main .space-y-3 > div' }, { n: 3, sel: 'btn:End call' }] });

  // Inviting a colleague: the one-time password is masked before the shot.
  await goto(page, '/users', 'Invite user');
  await clickBtn(page, 'Invite user');
  await page.waitForSelector('input[name=email]');
  await type(page, 'input[name=email]', 'alex.morgan@example.com');
  await shot(page, 'users-invite', { callouts: [{ n: 1, sel: 'input[name=email]' }, { n: 2, sel: 'fieldset' }, { n: 3, sel: 'button[type=submit]' }] });
  await page.click('button[type=submit]');
  await hasText(page, 'User invited');
  await settle(page, 300);
  await maskCredentials(page);
  await shot(page, 'users-invited', { callouts: [{ n: 1, sel: 'text:User invited' }] });

  // One dark-mode picture, then back to light for anything after.
  await goto(page, '/dashboard', 'Active campaigns');
  await page.click('[aria-label="Toggle theme"]');
  await sleep(400);
  await shot(page, 'dark-dashboard', { callouts: [{ n: 1, sel: '[aria-label="Toggle theme"]' }] });
  await page.click('[aria-label="Toggle theme"]');
  await ctx.close();
}

// ───────────── invited member: forced password change + limited menu ─────────────
if (!ONLY || ONLY.has('member')) {
  const ctx = await kit.context();
  const email = 'priya.nair@example.com';
  const stateFile = path.join(WORK, 'member-state.json');
  const state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : {};
  const page = await kit.login(ctx, { email, password: state.password ?? seed.users[email] });
  if (page.url().includes('/change-password')) {
    const newPw = 'Walkthrough-' + Math.random().toString(36).slice(2, 10) + '!A1';
    await type(page, '#password', newPw);
    await type(page, '#confirm', newPw);
    await shot(page, 'change-password', { callouts: [{ n: 1, sel: '#password' }, { n: 2, sel: '#confirm' }, { n: 3, sel: 'button[type=submit]' }] });
    await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {}), page.click('button[type=submit]')]);
    fs.writeFileSync(stateFile, JSON.stringify({ password: newPw }));
    await settle(page);
  }
  await goto(page, '/dashboard', 'Active campaigns');
  await shot(page, 'member-dashboard', { callouts: [{ n: 1, sel: 'aside nav' }] });
  await goto(page, '/agents', 'AI Agents');
  await shot(page, 'member-denied', { callouts: [{ n: 1, sel: '[role=alert]' }] });
  await ctx.close();
}

// ───────────── platform admin ─────────────
if (!ONLY || ONLY.has('admin')) {
  const ctx = await kit.context();
  const page = await kit.login(ctx, { email: creds.SUPER_EMAIL, password: creds.SUPER_PASSWORD });
  await hasText(page, 'platform view');
  await shot(page, 'sa-dashboard', { callouts: [{ n: 1, sel: '[aria-label=Workspace]' }, { n: 2, sel: 'a[href="/admin/companies"]' }] });

  await goto(page, '/admin/companies', 'New company');
  await shot(page, 'sa-companies', { callouts: [{ n: 1, sel: 'btn:New company' }, { n: 2, sel: '[role=switch]' }, { n: 3, sel: 'btn:Suspend' }] });
  await clickBtn(page, 'New company');
  await page.waitForSelector('input[name=name]');
  await type(page, 'input[name=name]', 'Pioneer Logistics');
  await type(page, 'input[name=adminEmail]', 'grace.kim@example.com');
  await page.click('button[type=submit]');
  await hasText(page, 'Share these credentials');
  await maskCredentials(page);
  await shot(page, 'sa-companies-created', { callouts: [{ n: 1, sel: 'text:Share these credentials' }] });

  // Acting inside a customer workspace through a custom listbox switcher.
  await goto(page, '/dashboard', 'platform view');
  await page.click('[aria-label=Workspace]');
  await page.waitForSelector('[role=listbox]');
  await shot(page, 'sa-switcher', { callouts: [{ n: 1, sel: '[role=listbox]' }] });
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {}),
    page.click('[role=listbox] ::-p-text(Northwind Solar)'),
  ]);
  await hasText(page, 'Active campaigns');
  await shot(page, 'sa-inside-workspace', { callouts: [{ n: 1, sel: '[aria-label=Workspace]' }, { n: 2, sel: 'main .grid > div' }] });
  await ctx.close();
}

await kit.close();

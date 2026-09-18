// capture-kit — puppeteer helpers for product walkthroughs.
//
// Usage (see ../templates/scenes.example.mjs):
//   import { createKit } from './capture-kit.mjs';
//   const kit = await createKit({ baseUrl: 'http://localhost:3000', workDir: '.work' });
//   const ctx = await kit.context();
//   const page = await kit.login(ctx, { email, password });
//   await kit.goto(page, '/dashboard', 'Dashboard');
//   await kit.shot(page, 'dashboard', { callouts: [{ n: 1, sel: 'aside nav' }] });
//   await kit.close();
//
// Every shot appends to <workDir>/shots/manifest.json immediately, so a crash
// halfway through a run keeps everything captured so far. Reruns replace
// entries by name, so `node scenes.mjs admin` refreshes one audience only.
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function createKit({
  baseUrl = process.env.WALKTHROUGH_BASE_URL ?? 'http://localhost:3000',
  workDir = process.env.WALKTHROUGH_WORK ?? '.work',
  viewport = { width: 1440, height: 900 },
  deviceScaleFactor = 2,
  colorScheme = 'light',
  jpegQuality = 92,
  // CSS injected before every shot: hide dev overlays and anything else that
  // must never appear in a guide.
  hideCss = 'nextjs-portal{display:none!important}',
  // Where the login form lives and how to find its fields.
  loginPath = '/login',
  loginReadyText = 'Sign in',
  loginSelectors = { email: '#email', password: '#password', submit: 'button[type=submit]' },
  headless = true,
} = {}) {
  const shotsDir = path.join(workDir, 'shots');
  fs.mkdirSync(shotsDir, { recursive: true });
  const manifestPath = path.join(shotsDir, 'manifest.json');
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : [];

  const browser = await puppeteer.launch({
    headless,
    args: ['--no-sandbox', '--font-render-hinting=none', '--hide-scrollbars'],
  });

  async function context() {
    return browser.createBrowserContext();
  }

  async function newPage(ctx) {
    const page = await ctx.newPage();
    await page.setViewport({ ...viewport, deviceScaleFactor });
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: colorScheme }]);
    page.setDefaultTimeout(60000);
    return page;
  }

  async function settle(page, idle = 700) {
    await page.waitForNetworkIdle({ idleTime: idle, timeout: 45000 }).catch(() => {});
    await page.evaluate(() => document.fonts.ready);
    await sleep(350);
  }

  /** Wait for text anywhere on the page, case-insensitively (innerText reflects CSS text-transform). */
  const hasText = (page, text, timeout = 120000) =>
    page.waitForFunction(
      (t) => document.body.innerText.toLowerCase().includes(t.toLowerCase()),
      { timeout },
      text,
    );

  /** Navigate, wait for a text fragment (reloading once if a first compile stalls), settle. */
  async function goto(page, p, waitText) {
    await page.goto(baseUrl + p, { waitUntil: 'domcontentloaded' });
    if (waitText) {
      try {
        await hasText(page, waitText, 90000);
      } catch {
        console.warn(`  retrying ${p} (no "${waitText}" yet)`);
        await page.reload({ waitUntil: 'domcontentloaded' });
        await hasText(page, waitText, 120000);
      }
    }
    await settle(page);
  }

  /** First visible <button> (or other tag) whose trimmed textContent equals label. */
  async function btn(page, label, tag = 'button') {
    const h = await page.evaluateHandle(
      (label, tag) =>
        [...document.querySelectorAll(tag)].find(
          (b) => b.textContent.trim() === label && b.getClientRects().length > 0,
        ) ?? null,
      label,
      tag,
    );
    const el = h.asElement();
    if (!el) throw new Error(`button not found: ${label}`);
    return el;
  }
  const clickBtn = async (page, label, tag) => (await btn(page, label, tag)).click();

  /** Resolve a callout selector: 'btn:Label', 'a:Label', 'text:Fragment', or CSS. */
  async function resolve(page, sel) {
    if (sel.startsWith('btn:')) return btn(page, sel.slice(4)).catch(() => null);
    if (sel.startsWith('a:')) return btn(page, sel.slice(2), 'a').catch(() => null);
    if (sel.startsWith('text:')) return page.$(`::-p-text(${sel.slice(5)})`).catch(() => null);
    return page.$(sel).catch(() => null);
  }

  /** Select-all then type into an input/textarea. */
  async function type(page, sel, text) {
    await page.click(sel, { clickCount: 3 });
    await page.keyboard.type(text, { delay: 5 });
  }

  /** Replace the password half of "email / password" banners with dots before capturing. */
  async function maskCredentials(page) {
    await page.evaluate(() => {
      for (const s of document.querySelectorAll('span, code, p')) {
        const t = s.textContent.trim();
        if (/^\S+@\S+ \/ \S+$/.test(t) && s.children.length === 0) {
          s.textContent = t.replace(/ \/ \S+$/, ' / ••••••••••••');
        }
      }
    });
  }

  /** Screenshot + callout boxes → manifest. `full` captures the whole document;
   *  `focus` (a selector) scrolls that element to the middle of the viewport
   *  first, for a viewport-sized shot of something below the fold; `clip` (a
   *  selector) captures just that element plus `clipPad` px around it — a
   *  form without the sidebar stays readable where a full-page shot would be
   *  squeezed to fit the page. */
  async function shot(page, name, { full = false, callouts = [], focus = null, clip = null, clipPad = 12 } = {}) {
    await page.addStyleTag({ content: hideCss }).catch(() => {});
    const target = focus && !full && !clip ? await resolve(page, focus) : null;
    if (target) await target.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    else await page.evaluate(() => window.scrollTo(0, 0));
    await sleep(250);
    let clipBox = null;
    if (clip) {
      const h = await resolve(page, clip);
      if (!h) console.warn(`  ! clip missing on ${name}: ${clip}`);
      else {
        clipBox = await h.evaluate((el, pad) => {
          const r = el.getBoundingClientRect();
          return {
            x: Math.max(0, r.left + window.scrollX - pad),
            y: Math.max(0, r.top + window.scrollY - pad),
            width: Math.round(r.width + 2 * pad),
            height: Math.round(r.height + 2 * pad),
          };
        }, clipPad);
      }
    }
    const boxes = [];
    for (const c of callouts) {
      const h = await resolve(page, c.sel);
      if (!h) {
        console.warn(`  ! callout ${c.n} missing on ${name}: ${c.sel}`);
        continue;
      }
      // Viewport coordinates for a viewport shot; document coordinates for a
      // full-page or clipped one (both are taken from the top), shifted by
      // the clip origin so they land inside the clipped image.
      const b = await h.evaluate((el, doc) => {
        const r = el.getBoundingClientRect();
        return {
          x: r.left + (doc ? window.scrollX : 0),
          y: r.top + (doc ? window.scrollY : 0),
          w: r.width,
          h: r.height,
        };
      }, full || !!clipBox);
      if (clipBox) {
        b.x -= clipBox.x;
        b.y -= clipBox.y;
      }
      boxes.push({ n: c.n, ...b });
    }
    const file = `${name}.jpg`;
    await page.screenshot({
      path: path.join(shotsDir, file),
      type: 'jpeg',
      quality: jpegQuality,
      ...(clipBox ? { clip: clipBox, captureBeyondViewport: true } : { fullPage: full }),
    });
    const dims = clipBox
      ? { w: clipBox.width, h: clipBox.height }
      : await page.evaluate(
          (full) => ({
            w: window.innerWidth,
            h: full ? document.documentElement.scrollHeight : window.innerHeight,
          }),
          full,
        );
    const entry = { name, file, ...dims, callouts: boxes };
    // Read-merge-write, not write-from-memory: several kits (a laptop, a
    // phone, a tablet) can share one shots directory, and each must add to
    // the manifest the others are writing rather than replace it.
    const current = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : [];
    const i = current.findIndex((m) => m.name === name);
    if (i >= 0) current[i] = entry;
    else current.push(entry);
    manifest.splice(0, manifest.length, ...current);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('shot', name, boxes.length ? `(${boxes.length} callouts)` : '');
  }

  /** Open the login page in a fresh page of `ctx`, sign in, wait for the app to load. */
  async function login(ctx, { email, password }) {
    const page = await newPage(ctx);
    await goto(page, loginPath, loginReadyText);
    await type(page, loginSelectors.email, email);
    await type(page, loginSelectors.password, password);
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }),
      page.click(loginSelectors.submit),
    ]);
    await settle(page);
    return page;
  }

  /**
   * Click a button whose action may legitimately fail sometimes (simulated
   * backends refuse a share of requests). Succeeds when `success(page)` is
   * true; retries when a [role=alert] appears instead.
   */
  async function clickWithRetry(page, label, success, attempts = 4) {
    for (let i = 0; i < attempts; i++) {
      await clickBtn(page, label);
      const ok = await page
        .waitForFunction(
          (fn) => new Function('return ' + fn)()() || document.querySelector('[role=alert]'),
          { timeout: 20000 },
          success.toString(),
        )
        .then(() => page.evaluate(() => !document.querySelector('[role=alert]')))
        .catch(() => false);
      if (ok) return;
      await sleep(500);
    }
    throw new Error(`${label}: no success after ${attempts} attempts`);
  }

  async function close() {
    await browser.close();
    console.log('done:', manifest.length, 'screenshots in', manifestPath);
  }

  return {
    browser,
    manifest,
    context,
    newPage,
    settle,
    hasText,
    goto,
    btn,
    clickBtn,
    clickWithRetry,
    resolve,
    type,
    maskCredentials,
    shot,
    login,
    close,
    sleep,
  };
}

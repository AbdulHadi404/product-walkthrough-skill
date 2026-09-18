// build.mjs — renders a walkthrough (content module + capture manifest) to a
// self-contained HTML file and an A4 PDF.
//   node build.mjs <content.mjs> <OUT-BASENAME>
// Reads <WALKTHROUGH_WORK>/shots/manifest.json (+ shots/pdf/*.jpg when shrink.py
// has run), writes <OUT-BASENAME>.html into the work dir and <OUT-BASENAME>.pdf
// into WALKTHROUGH_OUT (default: current directory). Layout notes:
// ../references/layout-and-review.md
import puppeteer from 'puppeteer';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const S = path.resolve(process.env.WALKTHROUGH_WORK ?? '.work');
const OUT_DIR = path.resolve(process.env.WALKTHROUGH_OUT ?? '.');
const SHOTS = path.join(S, 'shots');
const [, , contentPath, outBase] = process.argv;
// A file URL, not a bare path: on Windows `import('C:\…')` is read as a URL with scheme "c:".
const doc = (await import(pathToFileURL(path.resolve(contentPath)).href)).default;

// The guide wears the product's colours, not the template's. `theme` in the
// content module overrides any of these; the defaults are a neutral slate
// with a green "good to know" box, and the accent is the one to change.
const theme = {
  ink: '#0f172a',
  ink2: '#334155',
  muted: '#64748b',
  line: '#e2e8f0',
  accent: '#4f46e5',
  accentSoft: '#eef2ff',
  tip: '#f0fdf4',
  tipLine: '#86efac',
  ...(doc.theme ?? {}),
};
const manifest = Object.fromEntries(
  JSON.parse(fs.readFileSync(path.join(SHOTS, 'manifest.json'), 'utf8')).map((m) => [m.name, m]),
);

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** Tiny inline markup: **bold**, [[ui label]] → rendered as a chip. */
const md = (s) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[\[(.+?)\]\]/g, '<span class="ui">$1</span>');

/** Chip markup inside raw HTML blocks (intro, extras, appendix). */
const chips = (html) => String(html ?? '').replace(/\[\[(.+?)\]\]/g, '<span class="ui">$1</span>');

const imgData = (file) => {
  const small = path.join(SHOTS, 'pdf', file);
  const p = fs.existsSync(small) ? small : path.join(SHOTS, file);
  const buf = fs.readFileSync(p);
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
};

/** One framed image with its badges. `offset` shifts badge numbers when
 *  several frames share a legend (a row of phone screens). */
function frame(shot, m, offset = 0) {
  const badges = (shot.callouts ?? [])
    .map((label, i) => {
      const n = i + 1;
      const box = m.callouts.find((c) => c.n === n);
      if (!box) return '';
      // The badge sits just left of the element, level with its first line,
      // so it never covers the words it points at. Where the element starts
      // at the very edge it hangs half outside the frame — the frame lets it.
      const cx = ((box.x / m.w) * 100).toFixed(2);
      const cy = (((box.y + Math.min(14, box.h / 2)) / m.h) * 100).toFixed(2);
      return `<span class="badge" style="left:calc(${cx}% - 13px);top:${cy}%">${n + offset}</span>`;
    })
    .join('');
  // `height` (mm) pins the frame's height; with the aspect ratio that fixes
  // its width too, which is what a row of phones or a picture that must
  // leave room for its text needs.
  const size = shot.height ? `height:${shot.height}mm;width:auto;` : '';
  return `<div class="frame${shot.height ? ' fixed' : ''}" style="aspect-ratio:${m.w}/${m.h};${size}">
      <img src="${imgData(m.file)}" alt="${esc(shot.caption ?? shot.name)}">
      ${badges}
    </div>`;
}

/** Legend lines for one or more shots, numbered continuously. */
function legend(shots, ms) {
  const items = [];
  shots.forEach((shot, s) => {
    const offset = shots.slice(0, s).reduce((n, x) => n + (x.callouts?.length ?? 0), 0);
    (shot.callouts ?? []).forEach((label, i) => {
      if (!ms[s].callouts.find((c) => c.n === i + 1)) return;
      items.push(`<li><span class="num">${i + 1 + offset}</span><span>${md(label)}</span></li>`);
    });
  });
  if (!items.length) return '';
  return `<ol class="legend${items.length >= 7 ? ' legend-3' : ''}">${items.join('')}</ol>`;
}

function figure(shot) {
  // A row of phone-shaped shots side by side: { row: [shot, shot, shot] }.
  // Each keeps its own caption; badge numbers run on across the row and one
  // legend sits under the row.
  if (shot.row) {
    const ms = shot.row.map((s) => manifest[s.name]);
    const missing = shot.row.find((s, i) => !ms[i]);
    if (missing) {
      console.warn('missing screenshot', missing.name);
      return '';
    }
    let offset = 0;
    const cells = shot.row
      .map((s, i) => {
        const html = `<div class="cell">${frame(s, ms[i], offset)}${s.caption ? `<figcaption>${md(s.caption)}</figcaption>` : ''}</div>`;
        offset += s.callouts?.length ?? 0;
        return html;
      })
      .join('');
    return `<figure class="shot row row-${shot.row.length}">
    <div class="row">${cells}</div>
    ${shot.caption ? `<figcaption class="row-caption">${md(shot.caption)}</figcaption>` : ''}
    ${legend(shot.row, ms)}
  </figure>`;
  }
  const m = manifest[shot.name];
  if (!m) {
    console.warn('missing screenshot', shot.name);
    return '';
  }
  const tall = m.h / m.w > 0.8;
  return `<figure class="shot${tall ? ' tall' : ''}">
    ${frame(shot, m)}
    ${shot.caption ? `<figcaption>${md(shot.caption)}</figcaption>` : ''}
    ${legend([shot], [m])}
  </figure>`;
}

function list(items, cls, ordered) {
  if (!items?.length) return '';
  const tag = ordered ? 'ol' : 'ul';
  return `<${tag} class="${cls}">${items.map((s) => `<li>${md(s)}</li>`).join('')}</${tag}>`;
}

function section(sec, partNo, chapterTitle) {
  return `<section class="screen" id="${sec.id}">
    <p class="eyebrow">Part ${partNo} · ${esc(chapterTitle)}</p>
    <h2>${esc(sec.title)}</h2>
    ${sec.summary ? `<p class="summary">${md(sec.summary)}</p>` : ''}
    ${(sec.shots ?? []).map(figure).join('')}
    ${sec.steps?.length ? `<h3>How to do it</h3>${list(sec.steps, 'steps', true)}` : ''}
    ${chips(sec.extra)}
    ${sec.tips?.length ? `<div class="tips"><h3>Good to know</h3>${list(sec.tips, 'tiplist')}</div>` : ''}
  </section>`;
}

const toc = doc.parts
  .map(
    (part, i) => `<li><span class="part-no">Part ${i + 1}</span><div><strong>${esc(part.title)}</strong>
      <span class="toc-sub">${part.sections.map((s) => esc(s.title)).join(' · ')}</span></div></li>`,
  )
  .join('');

const body = doc.parts
  .map(
    (part, i) => `<section class="part-cover">
      <p class="eyebrow">Part ${i + 1}</p>
      <h1>${esc(part.title)}</h1>
      <p class="summary">${md(part.summary)}</p>
      ${part.sections.length > 1 ? `<ol class="part-toc">${part.sections.map((s) => `<li>${esc(s.title)}</li>`).join('')}</ol>` : ''}
    </section>
    ${part.sections.map((s) => section(s, i + 1, part.title)).join('')}`,
  )
  .join('');

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${esc(doc.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">
<style>
  @page { size: A4; margin: 18mm 16mm 20mm 16mm; }
  :root { --ink:${theme.ink}; --ink2:${theme.ink2}; --muted:${theme.muted}; --line:${theme.line}; --accent:${theme.accent}; --accent-soft:${theme.accentSoft}; --tip:${theme.tip}; --tip-line:${theme.tipLine}; }
  * { box-sizing:border-box; }
  html, body { margin:0; padding:0; }
  body { font-family: Inter, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color:var(--ink); font-size:11.5pt; line-height:1.55; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  p { margin:0 0 .7em; }
  h1 { font-size:30pt; line-height:1.1; letter-spacing:-.02em; margin:.2em 0 .4em; font-weight:800; }
  h2 { font-size:21pt; line-height:1.15; letter-spacing:-.015em; margin:.15em 0 .35em; font-weight:700; }
  h3 { font-size:12pt; margin:.9em 0 .35em; font-weight:700; break-after:avoid; }
  .eyebrow { font-size:9pt; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:var(--accent); margin:0 0 .3em; }
  .summary { font-size:12pt; color:var(--ink2); max-width:66ch; margin-bottom:.8em; }
  .ui { display:inline-block; font-weight:600; font-size:.92em; padding:.02em .42em; border:1px solid #cbd5e1; border-radius:5px; background:#f8fafc; color:#1e293b; white-space:nowrap; }

  /* cover */
  .cover { min-height:250mm; display:flex; flex-direction:column; justify-content:space-between; break-after:page; }
  .cover .brand { display:flex; align-items:center; gap:10px; font-weight:700; font-size:14pt; }
  .cover .brand svg { width:34px; height:34px; }
  .cover h1 { font-size:44pt; max-width:12ch; }
  .cover .lede { font-size:15pt; color:var(--ink2); max-width:52ch; }
  .cover .meta { color:var(--muted); font-size:10pt; border-top:1px solid var(--line); padding-top:12px; display:flex; justify-content:space-between; }
  .pill { display:inline-block; background:var(--accent-soft); color:var(--accent); font-weight:700; border-radius:999px; padding:.25em .9em; font-size:10pt; }

  /* intro + toc */
  .intro { break-after:page; }
  .contents { break-before:page; break-after:page; }
  .intro .cards { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:12px 0 18px; }
  .card { border:1px solid var(--line); border-radius:10px; padding:12px 14px; background:#fff; }
  .card h3 { margin:0 0 .3em; font-size:11.5pt; }
  .card p { margin:0; color:var(--ink2); font-size:10.5pt; }
  ol.toc { list-style:none; padding:0; margin:8px 0 0; }
  ol.toc li { display:flex; gap:14px; padding:9px 0; border-bottom:1px solid var(--line); align-items:flex-start; }
  .part-no { flex:0 0 64px; color:var(--accent); font-weight:700; font-size:10pt; padding-top:2px; }
  .toc-sub { display:block; color:var(--muted); font-size:9.5pt; margin-top:2px; }
  .journey { display:grid; grid-template-columns:repeat(4, 1fr); gap:8px; margin:10px 0 6px; }
  .journey div { background:var(--accent-soft); border-radius:10px; padding:10px 10px; font-size:10pt; }
  .journey b { display:block; color:var(--accent); font-size:9pt; margin-bottom:2px; }

  /* parts */
  .part-cover { break-before:page; margin-top:34mm; background:var(--accent-soft); border-radius:18px; padding:26mm 18mm 24mm; min-height:130mm; }
  .part-cover h1 { font-size:34pt; }
  .part-cover .eyebrow { font-size:11pt; }
  .part-cover .summary { color:var(--ink); }
  .part-toc { color:var(--ink2); font-size:11.5pt; columns:2; column-gap:24px; padding-left:1.3em; margin-top:1.4em; }
  .part-toc li { padding:2px 0; break-inside:avoid; }

  /* screens */
  .screen { break-before:page; }
  figure.shot { margin:6px 0 8px; break-inside:avoid; }
  .frame { position:relative; width:88%; margin:0 auto; border:1px solid #cbd5e1; border-radius:8px; overflow:visible; background:#fff; box-shadow:0 1px 2px rgba(15,23,42,.06); }
  .frame img { display:block; width:100%; height:100%; border-radius:7px; }
  /* 160mm leaves room on the same page for the heading above and the legend
     below — a heading alone on a page, with its picture overleaf, is the
     layout fault this guards against. */
  figure.tall .frame { max-height:160mm; width:auto; max-width:100%; margin:0 auto; }
  figure.tall .frame img { max-height:160mm; width:auto; }
  /* Phone screens in a row. The frame gets a definite height, and with the
     aspect ratio that fixes its width: an auto-width flex child with a
     percent-width image collapses to nothing. Three 9:16 phones at 98mm are
     58mm wide each, which fits the 178mm text width with the gaps. */
  figure.row .row { display:flex; justify-content:center; gap:5mm; align-items:flex-start; }
  figure.row .cell { display:flex; flex-direction:column; align-items:center; }
  figure.row .frame { width:auto; margin:0; height:98mm; }
  figure.row-2 .frame { height:122mm; }
  figure.row .frame img, .frame.fixed img { height:100%; width:auto; }
  figure.row .cell figcaption { max-width:58mm; }
  figure.row-2 .cell figcaption { max-width:80mm; }
  figure.row .row-caption { margin-top:8px; }
  .frame.fixed { margin:0 auto; }
  .badge { position:absolute; transform:translate(-50%,-50%); width:22px; height:22px; border-radius:50%; background:var(--accent); color:#fff; font-weight:800; font-size:11px; display:flex; align-items:center; justify-content:center; box-shadow:0 0 0 2.5px #fff, 0 2px 6px rgba(0,0,0,.35); }
  figcaption { font-size:9.5pt; color:var(--muted); margin-top:5px; text-align:center; }
  ol.legend { list-style:none; padding:0; margin:8px 0 0; display:grid; grid-template-columns:1fr 1fr; gap:4px 18px; }
  ol.legend.legend-3 { grid-template-columns:1fr 1fr 1fr; gap:4px 14px; }
  ol.legend li { display:flex; gap:8px; align-items:flex-start; font-size:10pt; line-height:1.38; break-inside:avoid; }
  ol.legend .num { flex:0 0 18px; height:18px; border-radius:50%; background:var(--accent); color:#fff; font-size:9.5px; font-weight:800; display:flex; align-items:center; justify-content:center; margin-top:2px; }
  ol.steps { padding-left:1.4em; margin:0; }
  ol.steps li { margin:0 0 .25em; padding-left:.2em; font-size:11pt; }
  .tips { background:var(--tip); border:1px solid var(--tip-line); border-radius:10px; padding:8px 14px 6px; margin-top:10px; break-inside:avoid; font-size:10pt; }
  .tips h3 { margin:0 0 .3em; color:#166534; }
  ul.tiplist { margin:0; padding-left:1.2em; }
  ul.tiplist li { margin:0 0 .3em; }
  /* A table breaks between rows, never inside one: a long table kept whole would push itself to the next page and leave its heading alone. */
  table.plain { border-collapse:collapse; width:100%; font-size:10.5pt; margin:8px 0 12px; break-inside:auto; }
  table.plain tr { break-inside:avoid; }
  table.plain thead { display:table-header-group; }
  table.plain th, table.plain td { text-align:left; padding:6px 8px; border-bottom:1px solid var(--line); vertical-align:top; }
  table.plain th { font-size:9pt; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); }
  .glossary dt { font-weight:700; margin-top:.6em; }
  .glossary dd { margin:0 0 .2em; color:var(--ink2); }
  .callout { border-left:4px solid var(--accent); background:var(--accent-soft); padding:8px 12px; border-radius:0 8px 8px 0; margin:10px 0; }
  /* Commands a reader copies into a terminal: one per line, wrapped rather than clipped. */
  pre.cmd { background:#0f172a; color:#e2e8f0; font:9.5pt/1.5 Consolas, "SF Mono", Menlo, monospace; padding:10px 14px; border-radius:8px; white-space:pre-wrap; word-break:break-all; margin:8px 0 12px; break-inside:avoid; }
  pre.cmd b { color:#fdba74; font-weight:600; }
  code { font:.92em Consolas, "SF Mono", Menlo, monospace; background:#f1f5f9; padding:.05em .35em; border-radius:4px; }
</style></head><body>
<section class="cover">
  <div>
    <div class="brand">${doc.logo ?? ''} ${esc(doc.brand ?? '')}</div>
  </div>
  <div>
    <span class="pill">${esc(doc.audience)}</span>
    <h1>${esc(doc.title)}</h1>
    <p class="lede">${md(doc.subtitle)}</p>
  </div>
  <div class="meta"><span>${esc(doc.edition)}</span><span>${esc(doc.date)}</span></div>
</section>
<section class="intro">
  ${chips(doc.intro)}
</section>
<section class="contents">
  <p class="eyebrow">Contents</p>
  <h2>What's in this guide</h2>
  <ol class="toc">${toc}</ol>
</section>
${body}
${chips(doc.appendix)}
</body></html>`;

const htmlOut = path.join(S, `${outBase}.html`);
fs.writeFileSync(htmlOut, html);

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto('file://' + htmlOut, { waitUntil: 'networkidle0', timeout: 120000 });
await page.evaluate(() => document.fonts.ready);
const footer = `<div style="font-family:Inter,Arial,sans-serif;font-size:8pt;color:${theme.muted};width:100%;padding:0 16mm;display:flex;justify-content:space-between;">
  <span>${esc(doc.title)}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`;
await page.pdf({
  path: path.join(OUT_DIR, `${outBase}.pdf`),
  format: 'A4',
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate: footer,
  margin: { top: '16mm', right: '16mm', bottom: '18mm', left: '16mm' },
  preferCSSPageSize: false,
});
await browser.close();
const kb = Math.round(fs.statSync(path.join(OUT_DIR, `${outBase}.pdf`)).size / 1024);
console.log(`wrote ${outBase}.pdf (${kb} KB)`);

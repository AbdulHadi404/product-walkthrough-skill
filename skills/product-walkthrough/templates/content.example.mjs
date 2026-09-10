// content.example.mjs — the words of one guide. Copy per audience
// (content-company.mjs, content-admin.mjs) and build with:
//   node build.mjs content-company.mjs COMPANY-GUIDE
//
// Markup inside strings: **bold**, [[Button label]] → chip. Callout labels are
// paired with the badge numbers in scenes.mjs by position (first label = 1).
const logo = `<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14" fill="#4f46e5"/></svg>`;

export default {
  brand: 'Acme',
  // The product's own colours, read from its design tokens (primary/accent,
  // a soft tint of it, the ink). A guide in the template's indigo is a guide
  // that looks like somebody else's product.
  theme: { accent: '#4f46e5', accentSoft: '#eef2ff' },
  title: 'Acme Walkthrough for Companies',
  subtitle: 'A plain-language tour of every screen in your Acme workspace, from your first agent to reading the results.',
  audience: 'For company admins and their teams',
  edition: 'Acme · Guide version 1.0',
  date: 'September 2026',
  logo,

  // Raw HTML. Chips ([[Label]]) work here too.
  intro: `
    <p class="eyebrow">Welcome</p>
    <h1>What Acme does, in one minute</h1>
    <p class="summary">Acme gives your company AI callers. You describe who the agent is and what it knows; Acme makes the calls and keeps a record of every conversation.</p>
    <div class="journey">
      <div><b>Step 1</b>Create an agent and give it a voice, a personality and knowledge.</div>
      <div><b>Step 2</b>Add the people you want to reach, usually from a spreadsheet.</div>
      <div><b>Step 3</b>Launch a campaign. Acme dials the list within your calling hours.</div>
      <div><b>Step 4</b>Watch calls live, read the results, follow up in the CRM.</div>
    </div>
    <div class="cards">
      <div class="card"><h3>How to read this guide</h3><p>Every screen gets its own page: a picture, a numbered list of what the numbers point to, and short steps. Button names look like this: <span class="ui">New agent</span>.</p></div>
      <div class="card"><h3>The example company</h3><p>The pictures show a made-up company called Northwind Solar. Your workspace shows your own data.</p></div>
      <div class="card"><h3>Who this is for</h3><p>Company admins see everything here. Team members see only the parts their admin switched on.</p></div>
      <div class="card"><h3>Need help?</h3><p>Each page ends with a "Good to know" box. A glossary at the back explains the words used.</p></div>
    </div>`,

  parts: [
    {
      title: 'Getting started',
      summary: 'Signing in, the dashboard, and how the screen is laid out.',
      sections: [
        {
          id: 'signin',
          title: 'Signing in',
          summary: 'Your administrator gives you an email address and a temporary password. The first time you sign in, Acme asks you to choose your own.',
          shots: [{ name: 'login', caption: 'The sign-in page.', callouts: ['Your email address', 'Your password', 'The [[Sign in]] button'] }],
          steps: [
            'Open the web address you were given in any modern browser.',
            'Type your email address and password, then click [[Sign in]].',
            'On your first sign-in, choose a new password of at least 8 characters.',
          ],
          tips: [
            'If you see "Invalid email or password", check for typing mistakes first.',
            'You can change your password later under **Settings → Security**.',
          ],
        },
        {
          id: 'dashboard',
          title: 'Your dashboard',
          summary: 'The first screen after signing in. Six tiles summarise what is happening now and over the last seven days.',
          shots: [{ name: 'dashboard', caption: 'The dashboard for Northwind Solar.', callouts: ['The menu: every part of Acme is one click away', 'Summary tiles', 'Top bar: notifications, light/dark mode and sign out'] }],
          steps: ['Read the tiles left to right. The numbers refresh on their own.'],
          // Optional table, placed before the tips by the builder.
          extra: `<table class="plain"><tr><th>Tile</th><th>Meaning</th></tr>
            <tr><td>Connect rate</td><td>The share of dialed calls a person answered.</td></tr></table>`,
          tips: ['A dash (—) means there is no data yet.'],
        },
      ],
    },
  ],

  appendix: `
    <section class="screen" id="glossary">
      <p class="eyebrow">Appendix</p>
      <h2>Glossary</h2>
      <dl class="glossary">
        <dt>Campaign</dt><dd>An automatic run of calls to a contact list using one agent and a set of rules.</dd>
        <dt>Workspace</dt><dd>Your company's private area in Acme. No other company can see it.</dd>
      </dl>
    </section>
    <section class="screen" id="faq">
      <p class="eyebrow">Appendix</p>
      <h2>Quick answers</h2>
      <h3>Nothing is being called after I clicked Start</h3>
      <p>Check the campaign's calling hours; outside them it waits. Click [[End]] if you do not want to wait.</p>
    </section>`,
};

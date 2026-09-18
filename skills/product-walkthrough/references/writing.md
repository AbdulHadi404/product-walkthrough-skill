# Writing for a mixed audience

The reader may be a seventy-year-old board member, a twenty-two-year-old sales rep, or a client's office manager, and none of them will read the guide front to back. Write so any page works on its own.

## Voice

- Short sentences, one idea each. About fifteen words. No semicolons, no parentheses, no dashes as connectors.
- Plain words. "Person" not "user" where a person is meant; "the call was answered" not "the call connected", unless the product's own screen uses the term — then use the screen's term and define it once.
- Say what the reader does and what they will see: "Click **Start**. Within a few seconds the first calls begin and the progress bar starts to move."
- No "simply", "just", "easily". If it were easy they would not need the page.
- Present tense, second person. Address the reader as "you"; refer to the product by its name.

## Product terms

- Button, menu and tab names exactly as they appear on screen, wrapped as chips (`[[New agent]]`). A reader scans the page for the chip and then for the same words on the screen.
- Define a term once, on first use, in the sentence where it appears — then rely on the glossary at the back. "A **campaign** calls a whole list of people automatically."
- Never invent names for things the product does not name. If a panel has no title, describe it ("the details panel on the right").

## Page template

Every screen section has the same shape, so the reader learns it once:

1. **Title** — the screen's own name ("Call History"), or the task ("Creating a campaign") when the page shows a form.
2. **Summary** — two sentences: what this screen is for, and the one thing to understand about it.
3. **Screenshot** with a caption that states the situation shown ("Four campaigns: two running, one completed, one still a draft.").
4. **Legend** — one line per numbered badge, in the same order as the badges, starting with a noun phrase: "The agent that will make the call". At most nine badges; more means the page needs splitting.
5. **How to do it** — numbered steps, at most six, each one action. Include what the reader sees after the action when it is not obvious.
6. **Good to know** — two to four bullets answering the questions a first-time reader asks on this screen: what a label means, what happens automatically, what cannot be undone, where a related setting lives.
7. Optional **table** of statuses, stages or modes with one-line meanings, placed before the tips.

Callout labels in the content module must follow the badge numbering in the scenes file exactly; the builder pairs them by position.

## Structure of a guide

- **Cover**: title, one-sentence subtitle, audience pill, edition and date.
- **One-minute overview**: what the product does in four plain sentences, then the core journey as four to six numbered steps in boxes, then four small cards: how to read the guide, the example company, who it is for, where to get help.
- **Contents** on its own page: parts with their section titles underneath.
- **Parts** follow the menu order that the reader's role sees, each opened by a divider page with a one-sentence summary and the list of sections.
- **Appendix**: glossary (every term defined in the guide, alphabetical, one line each) and quick answers (six to eight "Something looks wrong" questions with two-sentence answers).

## Setup guides (several tools, one journey)

A guide that walks a team through *setting something up* — an admin panel,
then a cloud console, then a build service, then the result on a phone — is
still one journey and one part per tool, in the order the team performs them.
Two differences from a screen-by-screen product guide:

- **A part without screenshots is allowed** when the tool cannot be captured
  (a third-party dashboard the capture cannot reach). Write it as numbered
  steps with the *exact labels* the reader will click, a table of the real
  values used in the example (ids, names, colours), and commands in a dark
  box. Say in the hand-off that the part has no pictures and why.
- **Close with a checklist**: one row per manual step, where it happens and
  who does it, plus a table of the example's values. That page is what a
  developer opens the second time.

## Per-audience rules

- **Customer / company guide**: no third-party provider names, no internal system names, no infrastructure words (server, database, API, migration, deploy). Describe what the product does for them; the admin's tools are "your platform administrator". Verify with a text grep before delivery.
- **Platform admin guide**: may name the providers the admin configures, because those names appear on their screens; still no keys, hostnames or internal tooling. Point to the customer guide for the customer-side screens instead of repeating them.
- **Member view**: a short section inside the customer guide — the forced password change, the shorter menu, a refused screen — so admins know what their colleagues will see.

## Honesty

- Placeholder screens ("coming soon") are documented as placeholders, not skipped and not dressed up.
- Staged states are captioned as the state they show and listed in the hand-off.
- Numbers in screenshots are example data; say so once, on the overview page, not on every caption.

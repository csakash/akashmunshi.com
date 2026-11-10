# AGENTS.md

House rules for anyone, human or coding agent, who edits this site. Read this before you change `public/index.html`.

## What this repo is

Akash Munshi's personal site: one static page (`public/index.html`) plus `public/site.js` for behaviour and `public/vendor/rough-4.6.6.js` for the hero sketch. It is served by a small Cloudflare Worker (`src/worker.js`, `wrangler.jsonc`) that only redirects www and serves `public/`. No framework, no build step, no package manager. Keep it that way.

## Structure (keep it)

Sections, in this order:

1. **Hero** (`#top`) and the **stats** row
2. **01 · Work** (`#work`): Motiontic first, with its clients in this order: Quantum Heaps (AI engineer, AI lead), PulseCorp (founding engineer), NeevCloud (product engineer, Fring), Bloom Markets (AI content), mirrAR (AI lead, as a Motiontic client). Then Narrative, mirrAR (the employment years, separate from the client work), Durbin, Quinch.
3. **02 · Motiontic lab** (`#lab`): the experiments grid, most active first. ARI-42 and gstack-loops are the highlighted `.hi` cards. Renumber the cards if you add one.
4. **03 · Writing** (`#writing`), newest first
5. **04 · Journey** (`#journey`), newest first
6. **05 · About** (`#about`) and the footer

Rules for content:

- Motiontic is a solo applied AI lab. All independent work since October 2025 sits under it.
- Name clients only in Work. Never name a client in the lab grid, and keep client work out of the journey.
- No product previews, mockups or screenshots of client products. Text only.
- No revenue figures, and no commit or PR counts for client work.

## Essays

- Each essay is one page at `public/<slug>.html`, served at `akashmunshi.com/<slug>`. Never change a slug: these URLs were live on the old site and are linked from elsewhere.
- To add an essay, copy an existing essay page, change the title, description, dates, canonical URL and body, put any images in `public/images/`, link the previous newest essay to it in the Older/Newer nav, and add a row at the top of Writing in `public/index.html`.

## ARI-42

- `public/ari-42.html` is the ARI-42 page; its numbers come from the research in `~/Projects/warden/research/ari42`. Only use figures that appear there.
- Show at most 10 of the 42 questions publicly. The full list is sent on request.
- The request form must never collect passwords, API keys or tokens. The Worker rejects anything that looks like a secret; keep it that way.
- ARI-42 is the current highlight: it is linked from the hero, the nav, the lab card and the footer.

## Voice

- First person, plain words, short sentences.
- No "seamless", "leverage", "unlock" or "robust". No emoji. No em dashes: use a comma, a colon or " - ".
- Only use numbers Akash can back (his CV, his own posts).
- Never put a phone number on the page.

## Design

- Use the tokens in `:root` (`--bg`, `--ink`, `--muted`, `--line` and the rest). No new colours, no new fonts.
- Fonts: Inter Tight for display, Inter for body, Geist Mono for meta. Architects Daughter only inside the pencil sketch.
- Reuse the existing classes: `.h1`, `.h2`, `.h3`, `.label`, `.lead`, `.cell`, `.grid4`, `.cards`, `.xp`, `.jobs`, `.client`, `.rows`, `.tl`.
- It must work at 375px wide with no horizontal scroll, and with reduced motion turned on.

## Check your work

```bash
python3 -m http.server 8000 --directory public
```

Open <http://localhost:8000>, check desktop and a 375px viewport, then confirm the browser console has no errors.

## Deploy

`npx wrangler deploy` from the repo root. Only files in `public/` are served.

## Commits

Small commits, one section at a time, with a message that says what changed and why.

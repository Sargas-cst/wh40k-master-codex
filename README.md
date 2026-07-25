# Warhammer 40,000 Master Codex

An unofficial, independently written reference to the Warhammer 40,000 setting, built so
that **every load-bearing claim is traceable to a source that was actually retrieved** —
and so that the places where the setting contradicts itself are recorded rather than
quietly resolved.

Ten volumes · 49 titles · 171 chapters · ~210,000–250,000 words when complete.

**Live site:** https://sargas-cst.github.io/wh40k-master-codex/

> **Status: scaffolding only.** The structure, toolchain and CI are in place. Almost no
> content exists. Research has not begun.

---

## Repository layout

| Path | What it holds |
|---|---|
| `PROMPT.md` | The project brief. Defines scope, rules, voice, depth and the full table of contents |
| `frame/schema.md` | **The data contract.** Definitive — if prose and this disagree, this wins |
| `frame/validate.mjs` | Structural validator. Runs before every build |
| `frame/build.mjs` | Resolves cross-references, generates footnotes, compiles the appendix |
| `frame/retrieve.mjs` | Polite batch retriever for Lexicanum |
| `frame/cite-map.mjs` | Resolves a page's citation markers to books and pages |
| `frame/scaffold.mjs` | Generates the 171-Chapter skeleton and the nav tree from PROMPT.md |
| `frame/example-chapter.md` | Syntax fixture. Deliberately not in `book/` |
| `frame/specimen.md` | Design specimen. Local preview only, never deployed |
| `theme/overrides/` | The design layer: `main.html` and `codex.css` |
| `book/` | The codex itself. One Markdown file per Chapter |
| `data/` | The four registries: sources, glossary, subjects, contradictions |
| `audit/` | One audit trail per Title: queries run, sources found, what could not be verified |
| `sources/raw/` | Cached retrievals. **Gitignored — never committed** (see below) |
| `build/` | Generated. Deleted and rebuilt every run |

## Building

```bash
npm install
npm run validate
```

The validator needs only Node. It reports the codex's state and fails on any structural
defect. Building the actual site additionally needs Python:

```bash
npm run build
pip install -r requirements.txt
mkdocs build --strict
```

For live preview while writing or designing:

```bash
node frame/build.mjs --specimen && mkdocs serve --watch-theme
```

`--watch-theme` matters: the design lives in `theme/overrides/`, outside `docs_dir`,
so without it CSS edits do not trigger a reload. `--specimen` adds `frame/specimen.md`
to the preview only — CI builds without the flag, so it can never reach the site.

## Design

**Brutalist.** Notched steel plates, rivets, hard unblurred shadows, hazard striping,
heavy condensed display caps, and a fractal-noise grain overlay. The apparatus —
bibliography, registries, audit trail — shifts to a denser technical register, since the
brief permits only the appendix to break voice.

One deliberate restraint: the reading column keeps a serif at roughly 68 characters.
Everything around it is brutal, but a quarter of a million words set in condensed heavy
caps would go unread.

### Liveries

29 selectable colour schemes named for Legions and Chapters, picked from a control in the
bottom-right corner and remembered across visits.

**Every palette is sourced.** A Chapter's livery is a fact about the setting, and rule
3.1 forbids writing facts from memory — so each was taken from that Chapter's Lexicanum
`Colours=` infobox field, retrieved 2026-07-25 and cached with hashes in
`sources/manifest.json`. Where the article gives an explicit hex it is used verbatim and
the entry in `liveries.css` is marked **SOURCED** (Salamanders `#1E7331`, Space Wolves
`#4E5067`, Lamenters `#FFF56B`, Crimson Fists `#002151`, and others). Where it names a
colour — "Brass", "Putrid Green" — the keyword anchors the hue and the exact shade is a
design choice, marked **NAMED**.

No Chapter insignia, iconography or artwork is reproduced anywhere. These are colour
palettes only.

All 29 liveries were contrast-audited in both light and dark schemes — 58 combinations,
**zero failures**. Worst body text measures 12.3:1 and worst accent 5.2:1, against a
4.5:1 AA threshold. Callout colours deliberately do *not* change with livery: a disputed
fact must look the same whichever Chapter's colours the reader picked, or the signal
moves.

Components exist for the things the content actually needs, rather than being decorative:

| Component | Job |
|---|---|
| `.cite-what` / `.cite-hearsay` | Renders the two citation levels differently. What we read, versus the print source a wiki cites — set apart, muted, and labelled *unverified by us* |
| `.cx-xref` | A cross-reference is navigation, not citation, and must not look like an outbound link |
| `.cx-term` | Glossary terms carry their definition as a hover tooltip, so the reader is not thrown to the appendix mid-sentence |
| `disputed` callout | Ochre. A live source conflict, linking to the register |
| `undefined-term` callout | Slate, dashed, deliberately quiet. Reports an absence honestly rather than flagging a problem |
| `unverified` callout | A claim that could not be sourced |
| Chapter eyebrow | Volume / Title / Chapter plus status and depth badges, rendered from frontmatter so the label cannot drift from the validated ID |

### Typography

"Ecclesiarchy & Forge" — **two display registers on purpose**, because the Imperium is a
gothic theocracy running on assembly lines.

| Role | Face |
|---|---|
| Chapter titles | **Grenze Gotisch** — blackletter, the cathedral half |
| Headings, badges, all labels | **Big Shoulders Stencil Display** — industrial stencil, the factory half |
| Body prose | **Vollkorn** — sturdy, slightly rough, readable across 250,000 words |
| Citation apparatus, registries | **Share Tech Mono** — cogitator output |

Blackletter is confined to chapter titles: a few words per page where atmosphere is free.
It never touches a heading the reader scans repeatedly, and never body text. Nor does it
head the apparatus — a bibliography set in gothic script would be claiming a register it
does not have.

All four faces are **self-hosted** (319 KB of woff2, generated by
`node frame/fetch-fonts.mjs`), so the site still makes **zero third-party requests** on any
page load — verified in the network log. All are OFL 1.1; see
[`LICENSES.md`](theme/overrides/assets/fonts/LICENSES.md). None imitates Games Workshop's
own brand typography.

Body text measures **70 characters a line** — measured by rendering a real sentence in the
actual face rather than assumed. Vollkorn is narrower than the system serif it replaced,
which had pushed the measure to 79 characters, so the column was tightened from 34rem to
30rem. Both colour schemes clear WCAG AA across all 29 liveries.

## Deployment

CI runs validate → prepare → build → deploy on every push to `main`, publishing to
[GitHub Pages](https://sargas-cst.github.io/wh40k-master-codex/). Pull requests build but
never deploy.

The ordering is the safeguard: `deploy` runs only after `build`, and `build` runs the
structural validator first. So a dangling cross-reference, a citation to an unrecorded
source, or a subject claimed by two canonical homes fails the pipeline — and the live site
keeps serving the last good version instead of publishing a broken one.

## Researching

```bash
npm run retrieve -- Astronomican Cadia Segmentum_Tempestus
npm run cites -- lex-astronomican
npm run cites -- lex-astronomican --yaml     # paste-ready data/sources.yaml entry
npm run cached                               # what is already on disk
```

Retrieval goes through `Special:Export`, which returns raw wikitext for up to eight
pages per request. Wikitext is preferable to rendered HTML here because Lexicanum marks
citations structurally — `{{Fn|1b}}` inline, `{{Endn|1b}}: pg. 140` in the Sources
section — so resolving a claim to a book and page is mechanical rather than a matter of
squinting at `[1b]` in rendered output. `cite-map.mjs` does that resolution and also
surfaces the wiki's own reliability tags (`{{Uncited}}`, `{{Cite Marker End}}`,
`{{Conflicting Sources}}`), which summaries tend to bury.

The retriever honours `robots.txt`: `Crawl-delay: 5` between requests, sequential only,
and it never re-fetches a page already cached. Lexicanum is fan-run on limited hardware
and deserves the courtesy; batching plus caching also cuts total requests by more than
an order of magnitude against page-at-a-time browsing.

## What the validator enforces

Some of the brief's rules can be checked by a machine, and those are checked on every
push rather than trusted to memory across 171 chapters:

- no cross-reference dangles — every `[[...]]` resolves to a real chapter, section,
  registered subject or glossary term
- no citation points at a source absent from `data/sources.yaml`
- **no subject has two canonical homes** — the rule that keeps the book from
  contradicting itself
- no drafted chapter contains zero citations, which would mean prose written from memory
- no term is defined twice, including via variant spellings
- derived values (word counts, depth bands, volume numbers) are never stored, so they
  cannot drift from what they describe
- word counts reach their depth band — **warning when short, silent when long**, because
  the brief permits dense sections to run over and forbids padding thin ones

What no validator can check is whether a claim is *true*. See the limits below.

## Two things this project is honest about

**The sources have a ceiling.** Codices, rulebooks and Black Library novels are the
authoritative texts for this setting and exist only in print. They were not consulted.
Where a wiki cites a printed page, that citation is reproduced and labelled *unverified
by us*. This codex can confirm what a wiki claims; it cannot confirm whether the wiki is
right, and it never phrases things as though it could.

**The retrieval cache is never committed.** Cached wikitext lives in `sources/raw/`
locally, because it makes claims re-checkable without new requests and preserves the
work if a source hardens against automated access mid-project. But this repository is
public, and committing bulk wikitext would republish someone else's expression. Only the
source *metadata* — URL, retrieval date, tier, what it cites — is committed. A reader can
see exactly what was consulted and when; reproducing the evidence means retrieving it
themselves.

## Open decisions

- Whether to mirror Lexicanum locally. Not needed for ordinary research now that batch
  retrieval works, but the Master Index needs corpus-wide visibility rather than
  page-at-a-time reads.
- Pace: Title-by-title with an approval gate each time (49 cycles), or pilot one Title
  and then batch by Volume (11 cycles).

## Licence

Original prose, structure and code: **[CC BY-SA 4.0](LICENSE)** — share and adapt with
attribution, under the same licence.

That licence covers only what was created here. It does not extend to Games Workshop's
intellectual property, which is not ours to license, nor to third-party source material,
which keeps its own terms. See [LICENSE](LICENSE) for the full scoping.

## Legal

Warhammer 40,000, Games Workshop, and all associated names, marks, characters, races,
vehicles, locations and units are trademarks or registered trademarks of Games Workshop
Limited.

This is an **unofficial** work, not endorsed by, affiliated with or connected to Games
Workshop Limited, and no challenge to their intellectual property is intended. All prose
is original and written from research; no Games Workshop artwork or logos are reproduced;
quotation is limited to short attributed extracts.

Rights holders who want something changed or removed are asked to open an issue.

# Warhammer 40,000 Master Codex

An unofficial, independently written reference to the Warhammer 40,000 setting, built so
that **every load-bearing claim is traceable to a source that was actually retrieved** —
and so that the places where the setting contradicts itself are recorded rather than
quietly resolved.

Ten volumes · 49 titles · 171 chapters · ~210,000–250,000 words when complete.

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

The book proper reads as a **scholarly critical edition**; the apparatus — bibliography,
registries, audit trail — shifts to a **denser technical register**.

That split is not decoration. The brief fixes the voice as encyclopedic and
out-of-universe, analytical and willing to call something contradictory or unknowable.
An in-universe gothic treatment would fight that on every page, and would sit far closer
to Games Workshop's trade dress than original prose does. The brief separately permits
only the appendix to break voice, so the design breaks register in exactly the same
place the writing does.

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

No web fonts are loaded — a curated system serif stack costs no third-party request and
raises no privacy or licensing question. Body text sits at roughly 68 characters a line.
Both colour schemes clear WCAG AA (light mode measures 16.8:1 body, 9.0:1 links).

CI runs validate → prepare → build on every push. **Deployment is off by default**: the
site is published only by running the *Build codex* workflow manually with
`publish = true`. GitHub Pages must also be enabled once under Settings → Pages with
Source set to *GitHub Actions*.

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

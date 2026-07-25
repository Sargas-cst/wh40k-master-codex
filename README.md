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
| `frame/example-chapter.md` | Syntax fixture. Deliberately not in `book/` |
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

For live preview while writing:

```bash
mkdocs serve
```

CI runs validate → prepare → build on every push. **Deployment is off by default**: the
site is published only by running the *Build codex* workflow manually with
`publish = true`. GitHub Pages must also be enabled once under Settings → Pages with
Source set to *GitHub Actions*.

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

- Version pins in `requirements.txt` are deliberately loose pending the first successful
  CI run, then should be pinned exactly.
- Retrieval has not yet been verified against Lexicanum, and no content may be written
  until it has been.

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

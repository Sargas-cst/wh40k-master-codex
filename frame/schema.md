# The Data Contract

This file is **definitive**. If prose and this document disagree, this document wins.
Everything here exists to make Appendix A (Master Index, Consolidated Glossary,
Disputed Facts Register) *compile* from the finished book rather than require a second
research project.

---

## 1. Identity

IDs mirror the brief's own fixed/flexible distinction: **Volumes, Titles and Chapters
are fixed, so their IDs are numeric. Sections flex, so their IDs are slugs.**

| Level | ID form | Example |
|---|---|---|
| Volume | Roman numeral, or `APX` for Appendix A | `IV` |
| Title | `T<n>` | `IV.T9` |
| Chapter | `Ch<n>` — numbered continuously *within a Volume* | `IV.T9.Ch31` |
| Section | `<chapter-id>.<slug>` | `IV.T9.Ch31.emperors-beacon` |

Section IDs are slugs, not indices, **on purpose**. The brief allows a Chapter to carry
2–5 Sections and to change count as sources dictate. If Sections were `S1..S5`,
deleting one would silently renumber the rest and break every inbound link. Slugs
survive insertion, deletion and reordering. A Section's *display name* may be reworded
freely without breaking links; its `slug` must never change once published.

Chapter numbers come from the table of contents in `PROMPT.md` and are not ours to
reassign.

---

## 2. File layout

One file per **Chapter**. The Chapter is the unit of storage because §8 of the brief
makes it the unit of *ownership* — one file therefore equals one subject's canonical
home.

```
book/vol-04-imperium/t9-telepathica-navis/ch-31-astronomican.md
```

Directory and file names carry zero-padded numeric prefixes so that filesystem order
equals reading order without any tooling.

---

## 3. Chapter frontmatter

```yaml
---
id: IV.T9.Ch31
name: The Astronomican
status: stub            # stub | drafted | audited
owns:                   # subject slugs whose canonical home this Chapter is
  - astronomican
sections:
  - name: The Emperor's Beacon
    slug: emperors-beacon
    sources: [lex-astronomican]     # ids from data/sources.yaml
    unverified:                     # claims we could NOT source; may be empty
      - Whether the Emperor's will is required continuously or intermittently
    contradictions: []              # ids from data/contradictions.yaml
---
```

Notes:

- `volume`, `title_no`, `chapter_no` and `depth` are **derived from `id`** and must not
  be stored. Duplicated data drifts.
- **Word counts are never stored.** They are computed from the body. A stored count is
  a lie waiting to happen.
- `status` is the honest state of the file. `audited` means step 8 of the brief's
  per-Title workflow actually ran.

## 4. Section bodies

Sections are `##` headings carrying an explicit anchor that must equal the declared
slug:

```markdown
## The Emperor's Beacon {#emperors-beacon}
```

The explicit anchor exists so the HTML anchor can never drift from the ID, regardless
of how the Markdown renderer happens to slugify headings. The validator enforces that
the `##` headings match the frontmatter `sections` list in name, slug and order.

---

## 5. Links — one syntax family, all validated

| Syntax | Means | Resolves to |
|---|---|---|
| `[[IV.T9.Ch31]]` | Chapter cross-reference | link, text = Chapter name |
| `[[IV.T9.Ch31.emperors-beacon]]` | Section cross-reference | link + `#anchor` |
| `[[IV.T9.Ch31\|the beacon]]` | Either, with custom link text | link, text = as given |
| `[[s:cadia]]` | **Subject** cross-reference | link to whichever Chapter *owns* `cadia` |
| `[[g:gellar-field]]` | Glossary term | link to the glossary entry |
| `[^lex-astronomican]` | Citation | footnote, generated from `data/sources.yaml` |

`[[s:...]]` is the important one. It is indirect: it points at a *subject*, and
`data/subjects.yaml` says which Chapter owns that subject. If ownership ever moves,
every inbound link follows automatically. Prefer it over a hard Chapter ID whenever
what you mean is "the place that covers X".

**Every link is checked at build time and a dangling one fails the build.** For a
reference work of ~500 Sections this is not fussiness; unvalidated cross-references
rot silently and the whole dip-in premise collapses.

---

## 6. Citations — deliberately two-level

The brief is unambiguous: reading Lexicanum's claim about *Codex: Necrons* page 42 is
**not** reading page 42. That distinction is structural here, not a matter of care.

```yaml
lex-astronomican:
  tier: 2
  what: Lexicanum article "Astronomican"
  url: https://wh40k.lexicanum.com/wiki/Astronomican
  retrieved: 2026-07-25
  raw: sources/raw/lex-astronomican-2026-07-25.wikitext
  cites:                                    # what the WIKI claims. NOT verified by us.
    - Warhammer 40,000 Rulebook 5th Ed., pg. 152
```

`what` / `url` / `retrieved` are **our evidence**: we read this, on this date.
`cites` is **hearsay**: the wiki's own citation, which we cannot check because the book
is print-only. Rendered output labels it as such. Nothing may ever collapse the two
into "verified against official source".

`raw` points at the cached retrieval on local disk. **The cache is gitignored** — see
§8.

---

## 7. The four registries

Each defines its subject **exactly once**, globally. Prose references; prose never
redefines. One correction propagates everywhere, which is the whole point of §8 of the
brief.

| File | Defines | Compiles into |
|---|---|---|
| `data/sources.yaml` | Every source ever retrieved | Bibliography |
| `data/glossary.yaml` | Every term, defined once | Appendix A · Ch 5 |
| `data/subjects.yaml` | Subject → owning Chapter, plus aliases | Appendix A · Ch 4 |
| `data/contradictions.yaml` | Every recorded source conflict | Appendix A · Ch 6 |

`subjects.yaml` is also how the canonical-home rule becomes *enforceable*: two Chapters
declaring `owns:` on the same subject is a hard build failure, not a matter of
remembering.

---

## 8. What must never be committed

`sources/raw/**` — the cached wikitext of retrieved pages.

Caching retrievals is required: it makes claims re-checkable without new requests, and
it means work survives if Lexicanum hardens against us mid-project. But this repository
is public, and committing bulk wikitext would republish Lexicanum's *expression*, which
§5 of the brief forbids. So the evidence lives on local disk and only the **metadata**
(URL, retrieval date, tier, what it cites) is committed.

Consequence worth stating plainly: the public repo lets a reader see exactly what was
consulted and when, but reproducing the evidence requires re-retrieving it themselves.
That is the correct trade.

---

## 9. Depth bands

Derived from the Volume, per §7 of the brief. Not stored per file.

| Band | Words / Section | Volumes |
|---|---|---|
| Full | 400–500 | I, III, IV, V, VI, and VIII·T1 |
| Medium | 350–450 | II, VII, and the rest of VIII |
| Reference | 300–400 | IX, Appendix A |

The validator **warns when a Section falls short of its band and stays quiet when it
runs over.** That asymmetry is deliberate and comes straight from the brief: dense
material is allowed to exceed, thin material must never be inflated to reach a number.
A short Section is a signal to check whether the sources really support more — not an
instruction to pad.

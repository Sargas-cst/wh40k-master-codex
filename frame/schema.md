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
| `[[g:gellar-field]]` | Glossary term | link to the glossary entry, definition on hover |
| `[[a:disputed-facts]]` | Appendix page | link to the compiled page |
| `[[d:fenris-segmentum]]` | One **register entry** | link to that entry in the Disputed Facts Register |
| `[^lex-astronomican]` | Citation | footnote, generated from `data/sources.yaml` |

`[[s:...]]` is the important one. It is indirect: it points at a *subject*, and
`data/subjects.yaml` says which Chapter owns that subject. If ownership ever moves,
every inbound link follows automatically. Prefer it over a hard Chapter ID whenever
what you mean is "the place that covers X".

`[[d:...]]` exists because a `!!! disputed` callout is not the only honest way to show
a reader a source conflict. Where a conflict belongs in running argument rather than in
a box — a deliberately undefined date, a spelling variant — this links the passage to the
register entry, and satisfies the rule in §11 that a declared contradiction must
actually reach the reader.

### Glossary terms are marked by the build, not by hand

`[[g:...]]` may be written by hand, but it usually is not. The build marks the **first
use per Section** of every registered term automatically, from `data/glossary.yaml`.

This is not a convenience. Hand-marking was tried and it failed measurably: an audit
after Volume II found 95 registered terms against 13 hand-placed marks, all 13 in
Volume I. The registry grew and the prose never caught up, because remembering to mark
a term is a discipline that does not survive 171 Chapters. Generating the marks means
they cannot fall out of step with the registry.

Rules the marker follows:

- **First use per Section**, because the Section is the addressable unit: it carries the
  anchor, it is what the contents tree links to, and it is where a reader arriving from
  search lands. Resetting per *Chapter* left anyone deep-linked into a later Section with
  no tooltip, the term having been marked screens above in a Section they never saw.
- **No exceptions.** `mark_scope: chapter` used to exempt a handful of ubiquitous terms
  because per-Section marking gave "the Warp" forty dotted underlines. That was the wrong
  fix: forty underlines is a question about how the mark LOOKS, and it was answered by
  making the word harder to find. The exemption is gone — every term follows the Section
  rule, and 28 Sections that carried no tooltip at all now carry one.
- **`term` and `mark:`, never `variants`.** `variants` are aliases for the glossary page
  and for search. As auto-link triggers they are dangerous — the first run used them and
  produced 36 wrong links, pointing every adjectival "psychic" at *psyker*, every
  "force" and "forces" at *psionics*, and every material "tithe" at the *psyker tithe*.
  An entry with a second spelling genuinely worth marking lists it under `mark:`.
- **Inflections are matched.** The registry holds "Tomb World" while the prose only ever
  writes "Tomb Worlds"; plurals and a leading article are handled.
- **A proper noun matches only where the prose capitalises it.** Matched
  case-insensitively, "the Conduit" put the Astropathic Conduit's definition on "bundles
  of cables, wires and conduits"; "the Purging" put the atomic bombardment of Krieg on
  "he was purging their souls"; and "the Old Ones" put the galaxy's first sentient species
  on "new islands rising and old ones being subsumed". An earlier version of this rule
  applied only to SINGLE-word forms, on the reasoning that a multi-word name could not
  collide with ordinary English. "old ones" collides. The test is what the name IS, not
  how many words it has. The check looks past a leading article, so "the Awakening" passes
  and "the awakening of Ynnead" does not.
- **A lowercase form must be declared to be matched.** `mark:` outranks the rule above,
  and only a form written in lower case earns the exemption — declaring "the Warp" must
  not license "the warp". `warp:` and `hive:` both declare theirs, because "warp routes"
  and "a hive" are the same referent and several quoted source passages write them that
  way. Changing the quotations instead would misquote.
- **Subjects are hover vocabulary too.** The glossary holds the words a reader needs;
  the subject registry holds the proper nouns — the Schola Progenium, corpse-starch,
  bastion worlds — and someone arriving from a search engine trips over the second kind at
  least as often as the first. 83 subject glosses were written and reaching nobody. Marked
  from `name` and `mark:` ONLY: `aliases:` is 507 forms including "vellum", "Adept" and
  "sector", and marking off it would repeat the variants accident.
- **A subject that duplicates a glossary term is not marked.** Seven do. Registering both
  put two underlines on one idea in a single paragraph — "his soul restored to his body…
  The soul was restored by Ynnead". The glossary entry carries the real definition and
  wins; the subject keeps its Glossary-page entry, where the canonical home is what it adds.
- **A hand-written `[[g:]]` wins.** If a Chapter marks a term itself, the marker leaves
  that term alone in that Chapter — which is how you mark a *later* mention on purpose.
- **The owning Chapter is no longer skipped.** The old rule assumed the reader started
  at the top of the Chapter that defines a term. Someone arriving from a search lands in
  the middle, and the rule blanked whole Sections: the Hive Worlds Chapter, 1,033 words on
  spires and heat sinks, offered no definitions at all because it was the hive Chapter.
- **Protected regions are never touched:** code, headings, admonition title lines,
  footnote definitions, existing links and attribute blocks, and raw HTML. Admonition
  *bodies* are fair game — they are prose the reader reads.

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
| `data/non-terms.yaml` | Bolded names deliberately left undefined | nothing — validator only |

`subjects.yaml` is also how the canonical-home rule becomes *enforceable*: two Chapters
declaring `owns:` on the same subject is a hard build failure, not a matter of
remembering.

### Glossary entry fields

```yaml
gellar-field:
  term: Gellar field          # the canonical form. AUTO-MARKED in prose.
  variants: [Geller Field]    # aliases for the glossary page and search. NOT auto-marked.
  mark: [Geller field]        # optional: extra forms that ARE safe to auto-mark.
  mark_scope: chapter         # optional: reset marking per Chapter, not per Section.
                              #   Only for terms so common that per-Section is noise.
  short: >                    # optional: tooltip text, where the definition is too long.
    The field that keeps a ship's crew alive in the Warp.
  definition: >               # required: the full definition, for the appendix page.
    A protective system used by warp-capable vessels …
  category: technology
  sources: [lex-gellar-field]
  full_treatment: I.T1.Ch3    # the Chapter that treats it in full; skipped when marking.
```

`definition` is written for the appendix, where there is room. `short` exists for the
hover box, which has less; without it the definition is truncated at a word boundary.

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

## 9. Retrieval — verified 2026-07-25

| Route | Result |
|---|---|
| Plain URL fetch (default user-agent) | ❌ **HTTP 402 / 403** |
| Node `fetch()`, any headers tried | ❌ **HTTP 403** — see below |
| **curl with a browser user-agent** | ✅ **HTTP 200** |
| **Browser navigation** | ✅ full article, citation markers, Sources list |
| **`Special:Export`, batched** | ✅ raw wikitext, ~64 KB for 3 pages in one request |
| `api.php` | ⛔ **not probed and never to be** — PROMPT.md §5 records that it took the browser down |

The block is on the user-agent, not the IP. Node's `fetch()` returns 403 even with an
identical browser UA, and header variants do not help (curl-minimal, a full browser set
including `Sec-Fetch-*`, and `identity` encoding were all tried). The discrimination is
below the HTTP layer — undici's TLS handshake fingerprints differently from curl's — so
`frame/retrieve.mjs` shells out to curl deliberately. **Do not refactor it back to
`fetch()`.**

`robots.txt` allows everything under `/wiki/`, `Special:Export` included, and asks for
`Crawl-delay: 5`. That is the site's own stated term and is what the retriever waits.
Lexicanum is fan-run on limited hardware, so the retriever also batches 8 titles per
request and **never re-fetches a cached page**, which cuts total requests by more than
an order of magnitude over page-at-a-time browsing.

### Why raw wikitext, not rendered pages

Lexicanum marks citations *structurally*, which makes claim → book → page mechanical:

```
inline    ...across around fifty thousand light years of the Galaxy{{Fn|1b}}
endnote   *1: [[Warhammer 40,000: Rogue Trader]]:
          **{{Endn|1b}}: pg. 140
```

`frame/cite-map.mjs` resolves that mapping and prints each marker with the sentence it
is attached to; `--yaml` emits a paste-ready `sources.yaml` entry. It also surfaces the
wiki's own reliability tags — `{{Uncited}}`, `{{Cite Marker End}}`,
`{{Conflicting Sources}}` — which rendered summaries bury and which §5 insists stay
visible.

Two traps this has already caught, both worth knowing before relying on a page:

- **Redirects export as stubs.** `Immaterium` returns 18 bytes: `#REDIRECT [[Warp]]`.
  Cached silently, that would leave a Section apparently sourced to a page with no
  content in it. The retriever detects and reports them.
- **Listed ≠ cited.** An article's Sources section can include works under
  `{{Uncited}}` that support no specific claim. They are not evidence for anything.

## 10. Depth bands

Derived from the Volume, per §7 of the brief. Not stored per file.

| Band | Words / Section | Volumes |
|---|---|---|
| Full | 400–500 | I, III, IV, V, VI, and VIII·T1 |
| Medium | 350–450 | II, VII, and the rest of VIII |
| Reference | 300–400 | IX, Appendix A |

**No band is enforced, in either direction.** The bands above are kept as a record of
the original plan, and the validator reports the observed distribution, but they are not
a target: a Section runs as long as its material warrants and no longer. There is no
floor to reach and no ceiling to respect, and nothing is ever padded to hit a number.

---

## 11. The reverse direction — registered, but never used

Passes 1–4 of the validator all check the same direction: that nothing in the prose
points at something missing from a registry. That is a real guarantee, and it is why the
build stayed green through two Volumes while drift accumulated in the other direction,
invisibly. An audit found 23 defects of that kind, none of which any check could see:

- a Section declaring a source it never cites, and a Section citing one it never declares
- a contradiction declared in frontmatter that no prose ever shows the reader
- a contradiction shown to the reader that no frontmatter declares
- `full_treatment`, `see_also` and `positions[].source` pointers into nothing
- glossary entries whose term appears in no Chapter at all

Pass 5 checks all of it. The rules that matter for writing:

**A Section's `sources:` is exactly the set of sources that Section cites.** Not
"consulted", not "relevant" — cited. Both directions are errors, because the frontmatter
*is* the audit trail and an audit trail that disagrees with the text is worse than none.

**A declared contradiction must reach the reader**, by a callout titled `… — <key>` or by
a `[[d:<key>]]` link. Either counts; see §5.

**Registered-but-unused is a warning, not an error.** Recording a conflict or retrieving
a source before the Chapter that will carry it is legitimate — Volume II opened conflicts
due in Volume IV. Forgetting is not, so the count stays visible in every build. A source
that supports a *registry entry* counts as used: a glossary definition could not exist
without the article it rests on.

**Used-but-unregistered is also a warning.** The prose bolds a term where it introduces
it, so a bolded proper-noun phrase that no registry defines is a coverage gap — and every
check before this one asked only the opposite question. Only candidates appearing in
**two or more Chapters** are reported: a term introduced and used inside the single
Chapter that explains it needs no entry, and counting those overstated the backlog
sixfold. Three outcomes are available for each — add a glossary entry, register it as a
subject, or record the decision not to in `data/non-terms.yaml`.

**A Chapter title must not carry the possessive.** `[[ID]]'s subject` renders as the
*name* of the target, so the reader gets "Gauss Tech, Destroyers & Dynasties's subject".
Where the title ends in a plural that is a grammatical error; where it already contains an
apostrophe-s the sentence carries two ("The Silent King's Rebellion & Sleep's"); and past
about thirty characters it is simply unreadable. 41 of these shipped, and none of the
existing checks could see them because the source — `[[III.T4.Ch21]]'s` — looks fine. It
is the *rendered* label that breaks.

Prefer, in order: **`treated in [[ID]]`**, **`the X of [[ID]]`**, or explicit display text
**`[[ID|short phrase]]`** where the full title would stutter against the sentence. That
last one is what fixed "the breach of Magnus's Folly & the Terra *Breach*" and "The Plague
Wars are *The Plague Wars* of Ultramar" — both produced by mechanically de-possessing the
first two without reading the result. A warning, not an error, because the remedy is a
judgement about phrasing rather than a substitution.

**Read the rendered page, not the source.** Three of the defects in this section were
invisible in the Markdown and obvious in the HTML. Any check on how a reference *reads*
has to run against `build/site`.

### `data/non-terms.yaml`

A fifth, small registry: bolded names that deliberately get no entry, each with a reason.
It exists so "we looked at this and decided against it" is recorded once instead of
re-decided every build. Two kinds live there — fragments of a longer term already defined
(`Solar`, for `Segmentum Solar`), and values on a scale a Chapter tabulates in full
(`Omega`, a grade on the Assignment).

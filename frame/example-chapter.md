# Worked example of a Chapter file

**This file is a syntax fixture, not content.** It lives in `frame/` and not in `book/`
precisely so that it is never part of the codex and never reaches the site. The prose
below is deliberate nonsense — placeholder wording that could not be mistaken for a lore
claim, because no research has been done and rule §3.1 of the brief forbids writing from
memory.

Copy the structure. Do not copy the words.

---

```markdown
---
id: IV.T9.Ch31
name: The Astronomican
status: drafted
owns:
  - astronomican
sections:
  - name: The Emperor's Beacon
    slug: emperors-beacon
    sources: [lex-astronomican, lex-emperor-of-mankind]
    unverified:
      - Whether the beacon requires continuous or intermittent direction
    contradictions: []
  - name: The Psyker Toll and its Disputed Cost
    slug: psyker-toll
    sources: [lex-astronomican]
    contradictions: [astronomican-psyker-toll]
---

## The Emperor's Beacon {#emperors-beacon}

PLACEHOLDER PROSE. A first sentence establishing what the subject is and why it
matters, in an analytical out-of-universe register.[^lex-astronomican] A load-bearing
number or date carries its own citation rather than relying on the paragraph's
first.[^lex-astronomican]

Where a subject belongs to another chapter, it gets a framing clause and a pointer —
never a retelling. Navigation depends on it[[s:navis-nobilite]], and so does the
integrity of the canonical-home rule. A term defined once is referenced, not
redefined: [[g:gellar-field]].

Cross-references may target a whole chapter, [[II.T3.Ch8]], a specific section,
[[II.T3.Ch8.cadia-and-the-gate]], or carry their own wording:
[[III.T5.Ch22|the destruction of the world]].

## The Psyker Toll and its Disputed Cost {#psyker-toll}

PLACEHOLDER PROSE. Where sources genuinely conflict, the prose says so in the prose —
the register in `data/contradictions.yaml` is the structured record, not a substitute
for an honest sentence.[^lex-astronomican]

Where nothing can be sourced, the text says that plainly and stops. It does not
speculate, and it does not reach for a plausible figure to round the paragraph off.
```

---

## What the toolchain does with this

`node frame/validate.mjs` checks that:

- `id` parses, is unique, and its Volume maps to a known depth band
- the two `##` headings match the frontmatter `sections` in **name, slug and order**
- each explicit `{#anchor}` equals the declared slug, so HTML anchors cannot drift
- every `[[...]]` resolves — chapter, section, subject or glossary term
- every `[^...]` names a source that exists in `data/sources.yaml`
- no other chapter also declares `owns: [astronomican]`
- each Section's word count reaches its depth band, **warning when short and staying
  silent when long** — because the brief permits dense sections to run over and forbids
  padding thin ones
- derived fields (`volume`, `depth`, `words`) are absent, since stored duplicates drift

`node frame/build.mjs` then rewrites the page for MkDocs: `[[...]]` becomes real
relative links, and `[^lex-astronomican]` gains a generated footnote definition that
states what was read and when — and separately, labelled *unverified by us*, whichever
print source the wiki cites.

## Two conventions worth stating explicitly

**Cite per claim, not per paragraph.** A paragraph-level citation makes it impossible to
tell later which sentence rested on which source. Numbers, dates and names each carry
their own marker.

**Prefer `[[s:subject]]` to a hard chapter ID.** It resolves through
`data/subjects.yaml`, so if ownership of a subject ever moves to a different chapter,
every inbound link follows it automatically. Use a raw ID only when you mean that
specific chapter rather than "wherever X is covered".

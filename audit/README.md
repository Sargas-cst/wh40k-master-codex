# Audit Trail

One file per Title, named for its ID: `vol-01-t1.yaml`, `vol-04-t9.yaml`.

PROMPT.md §3.6 requires this and explains why: across some five hundred Sections, an
audit trail is the only way anyone can later tell a sourced claim from a
confident-sounding one.

## What goes here, and what does not

Deliberately **not** here: the mapping from individual facts to their sources. That
lives in the prose itself, as `[^source-id]` markers keyed to `data/sources.yaml`. It
belongs there because a citation next to its claim cannot drift away from it, whereas a
restatement in a separate file can and will.

Restating every fact here would also roughly double the length of the book for no gain.
So this file records the **process**: what was searched, what came back, what conflicted,
and what could not be confirmed.

## Template

```yaml
title: I.T1
name: Foundations of Reality & Dual Realities
completed: 2026-07-26

queries:
  - query: lexicanum astronomican
    route: browser
    outcome: found article; exported via Special:Export
  - query: lexicanum "the veil" immaterium boundary
    route: browser
    outcome: no article defines it as a structure — recorded as undefined

retrieved:                       # ids added to data/sources.yaml
  - lex-astronomican
  - lex-immaterium

contradictions_found:            # ids added to data/contradictions.yaml
  - imperial-year-fraction

unverified:                      # claims deliberately omitted or marked uncertain
  - subject: the Veil as a physical structure
    reason: no source defines it; treated as metaphor per the brief
    disposition: written as an absence, not filled

departures_from_plan:            # §1: Section counts are indicative, not binding
  - chapter: I.T1.Ch4
    change: 2 Sections instead of 3
    reason: sources do not support a third; padding refused

notes: >
  Free text. Anything a later reader would need in order to judge how much weight
  this Title's claims can carry.
```

## Rules

- Written during step 3 of the per-Title workflow, **before** drafting — not
  reconstructed afterwards. A trail assembled after the fact records what you remember,
  which is the thing it exists to replace.
- `unverified` is expected to have entries. An empty one across a whole Title is a
  reason for suspicion, not a sign of quality.
- Departures from the proposed Section counts are recorded, not silently absorbed.

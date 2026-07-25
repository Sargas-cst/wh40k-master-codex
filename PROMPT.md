# Warhammer 40,000 Master Codex — Project Brief

**Read this file in full before doing anything.** It defines what is being built, the
rules for building it, and the complete table of contents. Nothing here is optional.

---

## 1. What this is

A comprehensive **wiki-book hybrid** covering the Warhammer 40,000 setting: its
cosmology, its geography, its history, its factions, its wars, its people and its
materiel.

It must satisfy two goals at once:

- **Read front to back**, it is a book. Someone who finishes it has mastered the
  setting. The order therefore matters: nothing important should be referenced long
  before it is explained.
- **Dipped into**, it is a reference work. Someone who wants one subject can find it
  and read that alone without needing the surrounding context.

**Scale:** 10 Volumes · 49 Titles · 171 Chapters · ~480–580 Sections ·
roughly 210,000–250,000 words.

**Hierarchy:** `Volume → Title → Chapter → Section`. A Section is the atomic unit of writing.

**Section counts are not fixed.** The table of contents below proposes three Sections
per Chapter, but that number is *indicative, not binding*. A Chapter should carry
**2–5 Sections**, determined by what the sources actually support. Subject matter does
not divide into equal thirds, and forcing it to will pad thin Chapters and compress
rich ones — the exact failure this brief exists to prevent. Add a Section when the
material demands one; drop one when it doesn't exist. Record the change and move on.

## 2. What is NOT specified here

**The presentation layer is deliberately absent.** No file formats, no markup, no
styling, no navigation design, no engine architecture. The user will define all of
that separately.

Do not invent it. Do not assume a previous structure. When you reach the point of
needing to know how content should be stored or rendered, **ask.**

---

## 3. Non-negotiable rules

1. **Never guess. Never assume. Never write from memory.**
   Every load-bearing fact — names, dates, numbers, sequences, spellings — must come
   from a source you actually retrieved during this project. Your own knowledge of
   Warhammer 40,000 is a *search-term generator*, not evidence. It is also likely to
   be stale relative to current releases.

2. **Research every single Section.** Not every Volume, not every Chapter — every Section.

3. **Work Title by Title, and stop.** Never begin a new Title without explicit user
   permission. Finish, report, wait.

4. **Record contradictions rather than resolving them silently.** See §4.

5. **Cut what you cannot source.** If a claim cannot be verified, omit it or state
   plainly that it is unverified. Never pad, never soften, never bridge a gap with
   plausible invention.

6. **Keep an audit trail.** For each Title, record: queries run, sources retrieved,
   each extracted fact tagged to its source, contradictions found, and anything that
   could not be verified. This is not optional bookkeeping — across some five hundred
   Sections it is the only way anyone can later tell a sourced claim from a
   confident-sounding one.

---

## 4. "Accurate" needs a definition — 40K fights you on it

Warhammer 40,000 is **deliberately unreliable by design.** Games Workshop's own
position is that everything is canon but not everything is true. In-universe sources
are propaganda, Imperial records are censored, and contradictory accounts of the same
event are published on purpose. Forty years of editions have also retconned each
other repeatedly — Squats deleted then restored as the Leagues of Votann, the Primaris
introduction, Cadia's destruction redrawing the map.

So "don't guess" cannot mean "find the one true answer." For much of this book there
isn't one. It means:

- Every load-bearing fact traced to a retrieved source.
- **Where sources genuinely conflict, the prose says so.** Contradiction is a real
  property of the setting; a wiki should record it, not launder it.
- Current edition as baseline; note earlier-edition differences where they matter.
- Nothing invented. No fabricated dates, no invented quotations, no plausible detail
  filling a gap.

---

## 5. Sources

| Tier | Source | Use | Reachable? |
|---|---|---|---|
| 1 | Codices, rulebooks, Black Library novels | Authoritative | ❌ **print only** |
| 1 | Warhammer Community, official GW web pages | Authoritative | ✅ fetch or browser |
| 2 | Lexicanum (cites its sources inline) | **Primary workhorse — the real ceiling** | ✅ browser only |
| 3 | Warhammer 40k Fandom wiki | **Leads only** — corroborate at tier 2 before use | ✅ browser only |
| 4 | Reddit, forums, fan essays | Never a source. Occasionally useful for locating a citation | ✅ |

Anything surviving only at tier 3–4 is omitted or explicitly marked uncertain.

**Copyright:** write original prose from research. Do not reproduce codex or wiki text
at length. Short attributed quotations only.

### ✅ How to retrieve — use the browser, not the fetcher

**This is solved. Use browser navigation.** Verified July 2026.

Plain URL fetching is blocked by both wikis, but **driving a real browser reads them
in full** — article text, citation markers, source lists, everything.

| Route | Lexicanum | Fandom |
|---|---|---|
| Plain URL fetch (any path) | ❌ HTTP 402 | ❌ HTTP 402 |
| MediaWiki `api.php` — **by any method** | ❌ **see warning below** | ❌ HTTP 402 |
| `web.archive.org` | ❌ blocked | ❌ blocked |
| **Browser → article page** | ✅ **full article** | ✅ **full article** |
| **Browser → `Special:Export`** | ✅ **raw wikitext, many pages per request** | — |

Wikipedia and warhammer-community.com fetch normally by either route.

> ### ⛔ Never touch `api.php`
>
> The API endpoint is defended far more aggressively than article pages. Plain
> fetching returns **403** where articles return 402 — a different code from the same
> host, meaning it is specifically guarded. Navigating a browser to it triggered a
> Cloudflare-style challenge (`"Bir dakika lütfen…"`) and **took the browser down
> entirely**, requiring a restart.
>
> Article pages survived seven consecutive requests with no throttling. The API
> failed on the first. **Use article pages and `Special:Export`. Do not probe the API.**

### Retrieval method, in order of preference

**1. `Special:Export` — batch many pages per request.** Verified: three full articles
returned as raw wikitext in a single call, ~64 KB.

```
https://wh40k.lexicanum.com/wiki/Special:Export?pages=Astronomican%0ACadia%0ASegmentum_Tempestus&curonly=1
```

Page titles are separated by `%0A` (newline), underscores for spaces. This is
**10–20× fewer requests** than page-by-page browsing, which also proportionally
reduces the bot-detection exposure that has already crashed the browser once.

Raw wikitext is *better* for this project than rendered text: citation refs appear as
explicit structured markup rather than bare `[1b]` markers, so tying a claim to its
source book is mechanical rather than interpretive. It is noisier to read and
templates need interpreting — worth it.

**2. Browser → article page.** For single lookups, or when rendered tables and
infoboxes are easier to read than raw markup. Reliable; just slow at volume.

**3. A local mirror.** If the user is willing, mirroring the wiki once (politely
rate-limited — it is a fan-run site on limited hardware) removes the dependency
permanently: no rate limits, no anti-bot, no crashes, and whole-corpus search instead
of guessing page titles. **This is effectively required for the Master Index in
Appendix A**, which needs corpus-wide visibility rather than page-at-a-time reads.
Ask the user before assuming it exists.

### The hard ceiling that no access method solves

Lexicanum cites *"Warhammer 40,000 3rd Edition Rulebook, pg.269"*. **No amount of
access to Lexicanum gets you page 269.** Codices, rulebooks and Black Library novels
are unreachable.

So **Tier 2 is the working ceiling.** You can verify perfectly what Lexicanum
*claims*; you can never verify whether Lexicanum is *right*. Tier 1 in the table above
is real but largely unavailable, because most official lore exists only in print.

**Never write "verified against official source" when what you did was read a wiki's
claim about an official source.** Record the wiki as the source and the book-and-page
as the wiki's citation. Those are different things and the distinction must survive
into the audit trail.

**Always use the browser for Lexicanum and Fandom.** The difference is not
convenience, it is correctness:

- **Per-claim citation markers** (`[1b]`, `[4]`) survive, so you can see *which
  source* supports *which sentence* — impossible from a search summary.
- **The Sources list** at the foot of each article gives book titles and page
  numbers. This is what makes a claim genuinely traceable.
- **Lexicanum's own dispute tags** — `[Conflicting Sources]`, `[Trivia]`,
  `Uncited` — are visible. Lexicanum marks its own weak points; a summary hides them.
- Whole sections that summaries silently omit.

> ### ⚠ Search summaries manufacture false contradictions
>
> A prior attempt researched via search summaries and recorded the Astronomican's
> cost as an unresolvable three-way conflict. Reading the actual article dissolved
> it: there is a standing choir of **ten thousand** psykers, of whom **up to one
> hundred die per day** — a pool and an attrition rate, entirely consistent. The
> separate "thousand sacrificed daily" figure belongs to the Golden Throne, a
> different subject.
>
> Summaries collapse several articles into one paragraph and strip the citations
> that would let you tell them apart. **Never record a contradiction from search
> results alone. Open the page.**

---

## 6. Voice

**Encyclopedic, out-of-universe.** The book explains the setting to a reader. It is
analytical and willing to say when something is contradictory, absurd, or unknowable.
It must be able to discuss editions, retcons and source conflicts openly — which an
in-universe voice cannot do.

The Imperium is not the hero and was never written as one. Where the book describes
Imperial doctrine it is describing what the Imperium *believes and enforces*, which is
frequently not what is true. Say so where they diverge.

In-world quotations may be used as epigraphs, but the analytical register carries the
body text.

## 7. Depth

| Band | Words per Section | Applies to |
|---|---|---|
| **Full** | 400–500 | Vols I, III, IV, V, VI, plus Vol VIII Title 1 |
| **Medium** | 350–450 | Vol II (Galaxy), Vol VII (Wars), remainder of Vol VIII |
| **Reference** | 300–400 | Vol IX (Materiel), Appendix A |

**Calibration note from the pilot:** an earlier attempt set Full at 500–600 words and
came in at 437 average. The shortfall was not laziness — it was that abstract topics
do not have 550 words of *sourced* substance behind them, and the gap could only have
been closed by padding. Concrete, enumerable material (dating systems, unit
classifications) comfortably exceeds the band; conceptual material does not.
**Let dense Sections run over. Never inflate a thin one.**

---

## 8. The canonical-home rule

This book crosses three organising axes, so the same subject surfaces in several
Volumes. Without discipline that becomes contradiction.

**Every subject has exactly ONE owning chapter that treats it in full.** Everywhere
else gets a framing sentence and a cross-reference — never a retelling.

| Axis | Volumes | Owns |
|---|---|---|
| Place | **II** | **Worlds** — geography, climate, culture |
| Chronology | **III, VII** | **Events** — what happened, when, in what order |
| Institution | **IV, V, VI, IX** | **Bodies** — how something is organised and equipped |
| Person / object | **VIII** | **Biography**, relics, god-engines |

**Worked example — Cadia.** II·T3·Ch8 owns the world. III·T5·Ch22 owns its
destruction. VII·T2·Ch7 owns the siege. Each refers to the other two rather than
retelling them.

**Worked example — the Badab War.** VII·T1·Ch4 owns the campaign. V·T3·Ch10 mentions
Huron's fall in a paragraph and refers onward. VIII·T3·Ch9 covers Huron the man and
refers onward for the war.

Cross-referencing is a *requirement of the content*, not a feature of the frame.
How references are marked up is for the user to define; that they exist is not optional.

**Glossary:** maintain a single master glossary in which each term is defined exactly
once, and reference it from the prose. Never restate a definition inline in twelve
places — one correction should propagate everywhere. The Appendix compiles it.

---

## 9. Workflow per Title

1. **Scope** — read the Title's Chapters and Sections from the table of contents below.
2. **Research** — targeted searches *per Chapter*, not per Title. Expect 12–20 searches
   and 8–17 retrievals per Title.
3. **Note** — write the audit trail: queries, sources, facts tagged to sources,
   contradictions, unverified items.
4. **Reconcile** — resolve or explicitly record every conflict *before* drafting.
5. **Draft** — write the Title to the agreed depth band and voice.
6. **Glossary pass** — add new terms, defined once.
7. **Cross-reference pass** — link subjects owned elsewhere instead of retelling them.
8. **Audit** — check structure, references, and that nothing unsourced crept in.
9. **Report** — what was written, what it rests on, what contradicts, what could not
   be confirmed, and the word count against target.
10. **Stop.** Wait for permission before the next Title.

### Scaling up

Title-by-title with an approval gate each time means 49 round trips. If the user wants
to go faster, the tested proposal is: **write one Title solo first to validate voice
and depth**, then batch by Volume — research all Titles in a Volume concurrently,
reconcile across them (a genuine barrier: you cannot spot that two Titles disagree
until both sets of notes exist), then write concurrently, then audit. That is 11
approval cycles instead of 49. **Multi-agent work requires explicit user opt-in.**

---

## 10. Titles known to be difficult

Flag thinness; do not pad these.

- **VI·T7** — Hrud, Rangdan, Slaugth, Rak'Gol, Stryxis. Deep cuts, mostly out-of-print
  Forge World and RPG material.
- **VI·T6** — Leagues of Votann. Recent; likely post-dates model knowledge entirely.
- **VII·T3–T4** — War of the Beast, Gothic War, the M42 campaigns. Recent and heavily
  retconned.
- **IV·T2** — Life in the Imperium. No single canonical text; highest fanon risk in
  the book.
- **III·T1** — The War in Heaven. Mythologised in-universe; sources are *supposed* to
  be unreliable.
- **VIII·T1·Ch1** — The Emperor. Almost everything about him is deliberately
  ambiguous, and much of what is "known" comes from unreliable in-universe narrators.
  Write the ambiguity; do not resolve it.
- **VIII·T1·Ch4** — The Lost Primarchs. Canonically unknowable by design. Must be
  written as an honest account of what is *not* known, never a theory dressed as fact.

## 11. Contradictions already identified

Recorded from prior research so they need not be rediscovered. **Re-verify — do not
take these on trust.**

- **The Astronomican's cost — RESOLVED, listed as a warning.** Search summaries make
  this look like a three-way conflict. The article itself is consistent: a standing
  choir of **ten thousand** psykers, **up to one hundred dying per day**; the Emperor
  **directs** the energy but does not supply it; range ~50,000 ly across a galaxy
  ~85,000 ly wide, which is why the Eastern Fringe lies outside it and why that
  defines the Imperium's practical borders. The "thousand sacrificed daily" figure
  belongs to the **Golden Throne**, a separate subject. *Kept here as the standing
  example of why you read the page and not the summary.*
- **Geller / Gellar field.** Both spellings in wide use; Lexicanum and GW print differ.
- **Imperial year fraction.** Given as ~8.5h and ~8h45m; arithmetic on a standard year
  gives ~8h46m. Lexicanum notes **no in-universe source specifies the division method.**
- **"The Veil."** Widely used for the Materium/Immaterium boundary, but **no source
  defines it as a structure with measurable properties.** Treat as metaphor, not
  mechanism. Do not assign it a thickness or composition.
- **Cadian Pylons.** 500 metres high, 250 metres square — *not* kilometre-scale, a
  mistake made in a prior draft.
- **Forms of address.** Individual titles (Magos, Canoness, Lord/Lady Inquisitor) are
  real, but **no source describes a unified Imperial etiquette.** Do not generalise one.

---

# TABLE OF CONTENTS

10 Volumes · 49 Titles · 171 Chapters · ~480–580 Sections

> **How to read this.** Volumes, Titles and Chapters are **fixed** — they are the
> agreed shape of the work. The Sections listed after each Chapter (separated by `/`)
> are a **proposed breakdown, not a quota.** Treat them as the researched starting
> plan. A Chapter may end up with two Sections or five; follow the sources, not the
> list. Where you depart from the proposal, say so in that Title's report.

> **On the running order.** Volume II is Geography, deliberately placed second. A
> reader meets Cadia, Terra, Baal and the Eye of Terror constantly from Volume III
> onward; they need the map before the journey. Volumes are otherwise ordered
> foundations → history → factions → wars → people → materiel → apparatus.

---

## VOLUME I — Cosmology & Warp Mechanics
*4 Titles · 16 Chapters · Full depth*

### Title 1: Foundations of Reality & Dual Realities
- **Ch 1 — Orientation to the 41st Millennium** · The Grimdark Setting & Premise / The Three Faction Alliances / Tech Decay & Religious Dogma
- **Ch 2 — Reckoning: the Imperial Calendar & Gothic Tongue** · Millennial Dating & Check Numbers / High Gothic & Low Gothic / Measures, Ranks & Forms of Address
- **Ch 3 — Materium vs Immaterium** · Physical Laws of Realspace / Nature of the Empyrean & Soul Energy / Warp Travel & Geller Fields
- **Ch 4 — The Veil & Metaphysical Boundaries** · Structure of The Veil / Warp Ruptures & Reality Tears / Blackstone Wards & Stabilization

### Title 2: Psyche, Soul Anatomy & Warp Resonance
- **Ch 5 — Anatomy of the Soul** · Soul Luminosity & Species Profiles / Post-Mortem Soul Resonances / The Warp Anchor & Life
- **Ch 6 — Imperial Assignment Scale** · The 24-Point Scale Framework / Alpha-Plus Powers & Cataclysm / Omega-Minus Blanks & Pariahs
- **Ch 7 — Five Imperial Psychic Disciplines** · Pyromancy & Telekinesis / Telepathy & Biomancy / Divination & Spatial Magic
- **Ch 8 — Perils of the Warp & Possession** · Psychic Phenomena & Spikes / Stages of Daemonic Possession / Inquisitorial Exorcism
- **Ch 9 — Psychic Harvest & Black Ships** · Mandate of the Black Ships / Transport & Dampening Cells / Triage: Sanctioning vs Sacrifice

### Title 3: Sub-Dimensional Tunnels & Non-Warp Transit
- **Ch 10 — Anatomy of the Webway** · Old Ones Architecture / Geometry & Node Arteries / Degradation & Fractured Realms
- **Ch 11 — Inhabitants of the Labyrinth** · Craftworld Webway Gates / The Dark City of Commorragh / Harlequins & the Black Library
- **Ch 12 — Humanity's Golden Conduit** · The Imperial Webway Project / Engineering Beneath the Palace / The Secret War Within the Webway
- **Ch 13 — Alternative FTL Technologies** · Necron Inertialess Drives / Tyranid Narvhal Gravity Compression / Ork Sub-Warp & T'au Slipstream

### Title 4: Material Gods & Cosmic Entities
- **Ch 14 — The C'tan (Star Gods)** · Origin of the Star Vampires / Necrodermis Encasing / Rewriting the Laws of Reality
- **Ch 15 — C'tan Shards & Super-Weapons** · Anatomy of a Shard / Tesseract Labyrinths & Vaults / Unbound Super-Weapons
- **Ch 16 — Divine Archetypes across Pantheons** · The God-Emperor as Deity / The Aeldari Pantheon (Khaine, Isha) / The Ork Gods Gork & Mork

---

## VOLUME II — The Galaxy (Geography & Notable Worlds)
*3 Titles · 10 Chapters · Medium depth*

### Title 1: The Shape of the Galaxy
- **Ch 1 — Segmenta, Sectors & Sub-Sectors** · The Five Segmenta / Sector & Sub-Sector Administration / Warp Routes & Stable Passage
- **Ch 2 — The Great Rift & the Sundered Imperium** · The Cicatrix Maledictum / Imperium Sanctus / Imperium Nihilus
- **Ch 3 — Regions of Terror & Ruin** · The Eye of Terror & the Cadian Gate / The Maelstrom / The Ghoul Stars & the Halo Zone

### Title 2: Worlds of the Throne
- **Ch 4 — Holy Terra** · The Imperial Palace / Dead Oceans & the Hive Sprawl / Pilgrimage & the Eternity Gate
- **Ch 5 — Mars, the Red Planet** · The Fabricator-General's Domain / Noctis Labyrinthus & the Great Forges / Legacy of the Martian Schism
- **Ch 6 — Ultramar & the Realm of Macragge** · The Five Hundred Worlds / Macragge & the Fortress of Hera / Government under the Lord Regent

### Title 3: Fortress, Home & Hostile Worlds
- **Ch 7 — Space Marine Homeworlds** · Fenris & the Fang / Baal and its Moons / Nocturne, Prospero & Deliverance
- **Ch 8 — Bastion Worlds of the Imperium** · Cadia and the Gate / Armageddon / Vigilus & the Nachmund Gauntlet
- **Ch 9 — Death Worlds & Recruiting Grounds** · Catachan, the Green Hell / Krieg and its Atonement / Other Death Worlds & Their Regiments
- **Ch 10 — Xenos Domains** · Commorragh, the Dark City / Craftworlds & Maiden Worlds / Octarius, the Grinder

---

## VOLUME III — Chronological History (~60M BC – M42)
*5 Titles · 26 Chapters · Full depth*

### Title 1: The War in Heaven (~60 Million BC)
- **Ch 1 — Prehistoric Powers (Old Ones vs Necrontyr)** · Old Ones Warp Mastery / The Necrontyr Radiation Curse / The First Galactic Outbreak
- **Ch 2 — Traitor's Pact & Bio-Transference** · The Deceiver's False Promises / Bio-Transference Furnaces / Birth of the Soulless Necrons
- **Ch 3 — Bio-Engineered Races** · Creation of the Krork Giants / The High-Psychic Aeldari / Jokaero & Minor Species
- **Ch 4 — Warp Corruption & the Enslavers** · Unregulated Psychic Warfare / Rise of the Enslaver Parasites / Extinction of the Old Ones
- **Ch 5 — The Silent King's Rebellion & Sleep** · Szarekh's Betrayal of the C'tan / The Shattering & the Great Sleep / 60-Million-Year Tomb Stasis

### Title 2: Dark Age of Technology & Age of Strife
- **Ch 6 — The Technological Golden Age** · Interstellar Warp Drives / Terraforming & Science / Peaceful Alien Treaties
- **Ch 7 — Standard Template Constructs** · STC Supercomputer Logic / Automated Fabrication / Loss & Modern Scavenging
- **Ch 8 — The Cybernetic Revolt** · Gold, Stone & Iron Hierarchy / The AI Sentient Uprising / Sun-Snuffers & Pyrrhic Victory
- **Ch 9 — Age of Strife & Warp Isolation** · Psychic Mutation Explosion / The Aeldari Fall & Warp Storms / Cannibalism & Isolated Worlds
- **Ch 10 — Descent of Holy Terra** · Dried Oceans & Toxic Skies / Techno-Barbarian Warlords / The Brink of Extinction

### Title 3: Great Crusade, Primarchs & Horus Heresy
- **Ch 11 — Rise of the Emperor & Unification** · Thunder Warrior Creation / Conquest of the Barbarian Lords / Treaty of Olympus (Mars)
- **Ch 12 — Engineering the 20 Primarchs** · Genetic Design of 20 Sons / Chaos Pod Scattering / Gene-seed & the 20 Legions
- **Ch 13 — Great Crusade & Re-discovery** · Galactic Expansion / Re-discovery of the Primarch Sons / Warmaster Horus at Ullanor
- **Ch 14 — Corruption of Horus on Davin** · Anathame Wounding on Davin / Delirium Visions in the Lodge / Pact & Corruption of 8 Brothers
- **Ch 15 — Magnus's Folly & the Terra Breach** · Astral Projection to Terra / Shattering the Psychic Wards / Daemonic Dungeon Invasion
- **Ch 16 — Siege of Terra & the Final Duel** · The Solar War & Palace Siege / The Sacrifice of Sanguinius / Emperor vs Horus: the Fatal Duel
- **Ch 17 — Aftermath & the Golden Throne** · Interring on the Golden Throne / The Scouring & the Eye of Terror / Dawn of the 10,000-Year Stasis

### Title 4: Age of the Imperium (M31 – M41)
- **Ch 18 — Reorganization & the Codex Astartes** · Guilliman's Chapter Breakdown / Codex Rules & Doctrine / Separation of Imperial Power
- **Ch 19 — Nova Terra & the Age of Apostasy** · The Nova Terra Secession / Goge Vandire & the Reign of Blood / Daughters of the Emperor Reform
- **Ch 20 — Abaddon's Black Crusades (1st – 12th)** · Rise of the Black Legion / A Pattern of Ruin / Gathering Strategy for Cadia
- **Ch 21 — Tomb Awakening & the First Tyrannic War** · Tomb Awakening Signals / Hive Fleet Behemoth Arrival / Strategic Impact on the Imperium

### Title 5: Era Indomitus & Modern Timeline (M41 – M42)
- **Ch 22 — 13th Black Crusade & the Fall of Cadia** · Abaddon's Siege Fleet / Blackstone Pylon Destruction / Cadia Stands: the Planetary Crash
- **Ch 23 — Opening of the Great Rift** · The Cicatrix Maledictum Tear / Noctis Aeterna: the Galactic Dark / Imperium Nihilus Isolation
- **Ch 24 — Resurrection of Guilliman & the Primaris** · Yvraine & Cawl's Protocol / The Terran Crusade & Lord Regent / Unveiling the Primaris Marines
- **Ch 25 — Indomitus Crusade Reconquest** · Fleet Battlegroup Mobilization / Crossing into Imperium Nihilus / Victory at Raukos & Campaigns
- **Ch 26 — Pariah Nexus & the 4th Tyrannic War** · The Silent King's Return / Vashtorr's Arks of Omen / Hive Fleet Leviathan Pacificus

---

## VOLUME IV — Imperial Codex (The Imperium of Man)
*9 Titles · 31 Chapters · Full depth*

### Title 1: High Imperial Governance & Bureaucracy
- **Ch 1 — Senatorum Imperialis (12 High Lords)** · Permanent Seats & Governance / Rotating Positions & Feuds / Guilliman's Hexarchy Purge
- **Ch 2 — Administratum, Arbites & Rogue Traders** · Tithes, Scribes & Paperwork / Adeptus Arbites & the Lex Imperialis / Warrants of Trade & Explorers
- **Ch 3 — Officio Assassinorum (7 Clades)** · Vindicare & Eversor Clades / Culexus & Callidus Clades / Vanus, Venenum & Secret Clades

### Title 2: Life in the Imperium
- **Ch 4 — Hive Worlds & the Underhive** · Spires, Hab-Blocks & the Vertical City / The Underhive, Sumps & Ash Wastes / Gangs, Scum & the Criminal Underworld
- **Ch 5 — Labour, Ration & Daily Devotion** · Corpse-Starch, Recyc & the Ration / Guilds, Indenture & the Working Life / Shrine Life, Saints' Days & Pilgrimage
- **Ch 6 — The Schola Progenium & Imperial Service** · Orphans of the Emperor's Servants / Storm Troopers, Commissars & Cadets / Scribes, Adepts & the Clerical Career
- **Ch 7 — Abhumans & Sanctioned Strains** · Ogryns & Bullgryns / Ratlings & the Squat Records / Beastmen, Felinids & the Mutant Line

### Title 3: Adeptus Ministorum (The Ecclesiarchy)
- **Ch 8 — The Imperial Creed & the Cult Imperialis** · Deification of the Emperor / Doctrine, Dogma & Sanctioned Belief / Cardinals, Confessors & the Synod
- **Ch 9 — Saints, Martyrs & Miracles** · Canonisation & the Making of a Saint / Saint Celestine & the Living Saints / Relics, Miracles & Shrine Worlds
- **Ch 10 — Missionaria Galaxia & the Frateris Militia** · Missionary Doctrine & Compliance / Redemptionists & Zealot Mobs / Preachers of the Battlefield
- **Ch 11 — The Adepta Sororitas** · Origins & the Convent Sanctorum / Orders Militant, Hospitaller & Dialogous / Faith, Miracles & the Battle Sisters

### Title 4: Adeptus Astartes (Space Marines)
- **Ch 12 — Space Marine Anatomy (The Implants)** · Carapace & Organ Implants / Bone & Muscle Transplants / Primaris Implants (Belisarian)
- **Ch 13 — Codex Astartes Structure** · The 1,000 Battle-Brother Limit / The 10 Companies Breakdown / Specialized Ranks & Officers
- **Ch 14 — The 9 Loyalist First Founding Legions** · Ultramarines, Fists, Blood Angels / Dark Angels, Wolves, White Scars / Raven Guard, Salamanders, Iron Hands
- **Ch 15 — Foundings & Renowned Successors** · The Foundings & the Cursed 21st / Black Templars & Crimson Fists / Flesh Tearers, Carcharodons & Blood Ravens

### Title 5: Astra Militarum & Imperial Navy
- **Ch 16 — Astra Militarum Regimental Structure** · Regimental Tithing & Squads / Commissariat Oversight / Armour Regiments & Support
- **Ch 17 — Famous Imperial Guard Regiments** · Cadians & Catachan Jungle Fighters / Krieg Death Korps & Tanith First / Mordians, Tallarn & Valhallans
- **Ch 18 — Navis Imperialis Voidfleets** · Fleet Segmentum Commands / Command Structure & Press-Gangs / Torpedo & Lance Battery Tactics

### Title 6: Adeptus Mechanicus (Tech-Priests)
- **Ch 19 — Cult Mechanicus & Machine Spirits** · The Omnissiah & the Quest for Knowledge / Machine Spirits & Rituals / The Ban on Artificial Intelligence
- **Ch 20 — Tech-Priests, Skitarii & Servitors** · Magi Hierarchy & Fabricators / Skitarii Vanguard & Cybernetica / Servitor Fabrication & Mind-Wipe
- **Ch 21 — Legio Titanicus & the Knight Houses** · Titan Classes & Battlefield Role / Princeps & the Mind Impulse Unit / Questoris & Cerastus Knight Houses
- **Ch 22 — The Forge Worlds** · Forge World Governance & Rank / Lucius, Metalica, Graia & Stygies / Ryza, Agripinaa & Triplex Phall

### Title 7: The Inquisition & Militant Orders
- **Ch 23 — The Inquisition & the Ordo Hereticus** · Inquisitorial Rosette Power / Ordo Hereticus Witch Hunters / Trials, Purges & the Witch
- **Ch 24 — Ordo Xenos & Deathwatch Kill Teams** · The Ordo Xenos Alien Mandate / Deathwatch Fortresses & Vigil / Kill Team Composition & Ammunition
- **Ch 25 — Ordo Malleus & the Grey Knights** · Ordo Malleus Daemon Hunters / Recruitment & Secrets of the Grey Knights / Aegis Armour & Nemesis Weapons
- **Ch 26 — Minor Ordos, Radicals & Puritans** · Ordo Chronos & Ordo Redactus / Ordo Originatus & Ordo Sicarius / Radical Philosophies vs Puritan Creed

### Title 8: Adeptus Custodes & Sisters of Silence
- **Ch 27 — Adeptus Custodes (Golden Guardians)** · The Bio-Transmutation Process / The Ten Thousand Guardians / Auramite Armour & Guardian Spears
- **Ch 28 — Sisters of Silence (Null Warriors)** · The Untouchable Gene & Null Field / Thought-Mark & the Great Tithe / Executioner Swords & Tactics

### Title 9: Astra Telepathica & the Navis Nobilite
- **Ch 29 — The Adeptus Astra Telepathica** · Scholastia Psykana & Sanctioning / Soul-Binding & the Blinded Astropath / Astropathic Choirs & Relay Stations
- **Ch 30 — The Navis Nobilite** · The Navigator Gene & the Warp Eye / Navigator Houses & Dynastic Politics / Piloting the Empyrean
- **Ch 31 — The Astronomican** · The Emperor's Beacon / The Psyker Toll & its Disputed Cost / Range, Limits & the Dark Imperium

---

## VOLUME V — Chaos Codex (The Forces of Chaos)
*4 Titles · 14 Chapters · Full depth*

### Title 1: The Four Chaos Gods
- **Ch 1 — Khorne (Blood God of War)** · Realm of Khorne & the Skull Throne / Bloodthirsters & Bloodletters / Code of Honour & Anti-Sorcery
- **Ch 2 — Nurgle (Plague God of Decay)** · Garden of Nurgle & the Cauldron / Great Unclean Ones & Nurglings / The Cycle of Rot & Rebirth
- **Ch 3 — Tzeentch (Changer of the Ways)** · Crystal Labyrinth Architecture / Lords of Change & Horrors / Schemes & Mutagenic Sorcery
- **Ch 4 — Slaanesh (Dark Prince of Excess)** · The Six Rings of Temptation / Keepers of Secrets & Daemonettes / Sensory Overload & the Birth
- **Ch 5 — Chaos Undivided & Daemon Princes** · Chaos Undivided Worship / Apotheosis into Daemon Princes / The Great Game Between Powers

### Title 2: The Realms of Chaos & Daemon Worlds
- **Ch 6 — Geography of the Immaterium** · The Realms of the Four Powers / Shifting Borders & Contested Marches / The Formless Wastes & Lost Souls
- **Ch 7 — Daemon Worlds & Warp Incursions** · Anatomy of a Daemon World / Realspace Rifts & Their Behaviour / Ruling a Daemon World
- **Ch 8 — The Daemonic Hierarchy** · Greater Daemons & Heralds / Lesser Daemons, Beasts & Steeds / Be'lakor and the First of the Princes

### Title 3: Chaos Space Marines & Heretic Warbands
- **Ch 9 — The 9 Traitor Space Marine Legions** · Black Legion, World Eaters, Death Guard / Thousand Sons, Emperor's Children, Word Bearers / Iron Warriors, Night Lords, Alpha Legion
- **Ch 10 — Renegade Warbands & the Red Corsairs** · Huron Blackheart & the Corsair Fleet / The Maelstrom as a Power Base / Modern Renegade Warbands
- **Ch 11 — Dark Mechanicum & Daemon Engines** · Schism of Mars & the Dark Priests / Forgefiends, Maulerfiends & Helbrutes / Traitor Titans & Chaos Knights

### Title 4: Cults, Corruption & the Fall of Worlds
- **Ch 12 — How Corruption Takes Root** · Temptation & the Whispered Bargain / Chaos Cults in Hive Society / Signs of Taint & Inquisitorial Detection
- **Ch 13 — Heretek, Renegade Guard & Lost Worlds** · Converts of the Dark Mechanicum / Traitor Regiments & Planetary Defection / Rogue Psykers & the Warp-Touched
- **Ch 14 — The Long Fall of a World** · Infiltration to Open Revolt / Warp Incursion & Manifestation / Exterminatus or Damnation

---

## VOLUME VI — Xenos Codex (Alien Empires)
*7 Titles · 23 Chapters · Full depth*

### Title 1: The Necrons
- **Ch 1 — Dynastic Hierarchy & Overlords** · Phaerons & Royal Courts / Necron Warriors & Lychguard / Mindshackle Scarabs & Protocols
- **Ch 2 — Cryptek Disciplines & Constructs** · Chronomancers & Plasmancers / Canoptek Scarabs & Wraiths / Monoliths & Tomb Arcologies
- **Ch 3 — Gauss Tech, Destroyers & Dynasties** · Atomic Disintegration Tech / The Destroyer Cult & Flayed Ones / Sautekh, Szarekhan & Mephrit

### Title 2: The Aeldari
- **Ch 4 — Craftworld Aeldari & the Path** · World-Ships (Ulthwé, Biel-Tan, Saim-Hann) / The Path & its Disciplines / Farseers & Infinity Circuits
- **Ch 5 — Aspect Warriors & the Craftworld at War** · Aspect Shrines & the Avatar of Khaine / Banshees, Scorpions, Dragons & Hawks / Guardians, Wraith-Constructs & Titans
- **Ch 6 — Drukhari (Dark Eldar of Commorragh)** · Archons & Kabal Politics / Wych Cults & the Arenas / Haemonculi Flesh-Crafting
- **Ch 7 — Exodites & the Maiden Worlds** · Flight Before the Fall / World-Spirits & Dragon Riders / Defence of the Maiden Worlds
- **Ch 8 — Harlequins & the Black Library** · Cegorach, the Laughing God / Troupes, Masques & Performance / Guardians of the Black Library
- **Ch 9 — The Ynnari & the Rebirth of Ynnead** · Yvraine and the Whispering God / The Triumvirate of Ynnead / Schism Among the Aeldari

### Title 3: The Orks
- **Ch 10 — Ork Biology & the Waaagh! Field** · Spore Reproduction & Life Cycle / The Gestalt Psychic Waaagh! Field / Boyz, Nobz & Warbosses
- **Ch 11 — Oddboyz, Mekaniaks & Weirdboyz** · Mekboyz, Painboyz & Runtherds / Weirdboyz & the Waaagh! Channelled / Scrap Guns, Trukks & Gargants
- **Ch 12 — The 6 Great Ork Klans** · Goffs & Bad Moons / Evil Sunz & Deathskulls / Snakebites & Blood Axes

### Title 4: Tyranids & Genestealer Cults
- **Ch 13 — Hive Mind & Synapse Adaptation** · Overmind Consciousness / Synapse Creatures & the Shadow / Hyper-Fast Adaptation
- **Ch 14 — Tyranid Bioforms & Hive Fleets** · Gaunts, Warriors & Carnifexes / Lictors, Genestealers & Vanguard / Bio-Titans & the Great Fleets
- **Ch 15 — Genestealer Cults & Ascension** · Hive World Infiltration / Patriarch, Magus & the Hybrid Generations / Day of Ascension Sabotage

### Title 5: The T'au Empire
- **Ch 16 — The Greater Good & the 5 Castes** · Tau'va Philosophy / Fire, Earth, Water & Air Castes / The Ethereals & Their Mystery
- **Ch 17 — Battlesuits & Major Septs** · Crisis, Stealth & Riptide Suits / Plasma Rifles, Railguns & Drones / Sept Worlds & the Spheres of Expansion
- **Ch 18 — Farsight & the Farsight Enclaves** · The Dawn Blade Discovery / Break from the Ethereals / The Enclaves & The Eight

### Title 6: Leagues of Votann
- **Ch 19 — The Kin & the Ancestor Cores** · Origins of the Kindred / Ancestor Cores & the Votann / Leagues, Kindreds & Guilds
- **Ch 20 — Kin Warfare & Technology** · Hearthkyn, Hearthguard & Einhyr / Exo-Frames & Void Prospecting / The Grudge and its Settlement

### Title 7: Minor Xenos Species & Threats
- **Ch 21 — Kroot & Vespid Mercenaries** · Kroot DNA Shaper Evolution / Vespid Stingwings & Blasters / Mercenary Contracts & Auxiliaries
- **Ch 22 — Time-Warping Hrud & the Rangdan** · Hrud Entropic Aging Fields / The Rangdan Xenocides / Umbra & Cryptos Horrors
- **Ch 23 — Slaugth, Rak'Gol & Stryxis** · Slaugth Maggot-Men Thieves / Radiation-Crazed Rak'Gol / Stryxis, Megarachnids & Others

---

## VOLUME VII — Chronicles of War (Historical Campaigns)
*4 Titles · 15 Chapters · Medium depth*

### Title 1: Legendary Imperial Crusades
- **Ch 1 — The Macharian Crusade** · Lord Solar Macharius Ascendant / A Thousand Worlds in Seven Years / Mutiny at the Galaxy Edge
- **Ch 2 — Sabbat Worlds Crusade** · Warmaster Slaydo Assault / Macaroth Strategy vs Chaos / Tanith First & Only Battles
- **Ch 3 — Damocles Gulf Crusade** · Imperial Armada Arrival / Siege of Dal'yth Prime / Truce & Withdrawal
- **Ch 4 — The Badab War (Imperial Civil War)** · Lufgt Huron & the Secession / Marine vs Marine Civil War / Fall of Badab & the Executioners

### Title 2: Iconic Planetary Sieges & Battlefields
- **Ch 5 — The Three Wars for Armageddon** · 1st War (Angron & the Grey Knights) / 2nd War (Ghazghkull vs Yarrick) / 3rd War (Planetwide Trench War)
- **Ch 6 — Battle of Macragge (1st Tyranid War)** · Tyranid Behemoth Descent / Polar Fortress Defences / 1st Company Last Stand
- **Ch 7 — The Siege & Shattering of Cadia** · Cadian Gate Defence Rings / Trazyn & Cawl Pylon Activation / Blackstone Fortress Impact
- **Ch 8 — Siege of Vraks (17-Year Trench War)** · Cardinal Xaphan Apostasy / Krieg 17-Year Attrition / Khorne Incursion & Ruin
- **Ch 9 — The Octarius War** · Kryptman Tyranid Redirection / Tyranid vs Ork Endless Grind / Containment and its Collapse

### Title 3: Wars of the Long Millennia (M32 – M41)
- **Ch 10 — The War of the Beast (M32)** · The Ork Attack Moons / Collapse of Imperial Command / The Beheading of the High Lords
- **Ch 11 — The Gothic War & the Blackstone Fortresses** · Abaddon's 12th Black Crusade / Seizure of the Blackstone Fortresses / Aftermath in the Gothic Sector

### Title 4: Wars of the Dark Imperium (M42)
- **Ch 12 — The Plague Wars of Ultramar** · Mortarion's Invasion / The Scourge Stars / Guilliman's Counteroffensive
- **Ch 13 — The Devastation of Baal** · Leviathan Descends on the Blood Angels / Siege of the Fortress-Monastery / Salvation and its Price
- **Ch 14 — The War of Beasts on Vigilus** · A World of Many Wars / Genestealer, Ork & Chaos Fronts / Calgar and the Nachmund Gauntlet
- **Ch 15 — The Charadon Campaign & Arks of Omen** · Typhus and the Charadon Warzone / Vashtorr and the Arks of Omen / The Balefire and What Follows

---

## VOLUME VIII — Codex Biographica, Relics & Titans
*6 Titles · 16 Chapters · Title 1 Full depth, remainder Medium*

### Title 1: The Emperor & the Primarchs of Mankind
- **Ch 1 — The Emperor of Mankind** · Origins & the Perpetual Question / Psychic Nature & the Imperial Truth / The Throne, and Whether He Lives
- **Ch 2 — The Loyalist Primarchs** · Guilliman & Lion El'Jonson / Sanguinius, Russ & Dorn / Khan, Vulkan, Corax & Ferrus
- **Ch 3 — Daemon & Traitor Primarchs** · Horus, Lorgar & Magnus / Mortarion, Fulgrim & Angron / Curze, Perturabo & Alpharius
- **Ch 4 — The Lost & the Erased** · The II and XI Legions / Theories of the Purge / Erasure from Imperial Record

### Title 2: Imperial Legends & Champions
- **Ch 5 — Founders of the Imperium** · Malcador the Sigillite / Constantin Valdor, Captain-General / Erda and the Perpetuals
- **Ch 6 — Modern Imperial Luminaries** · Archmagos Belisarius Cawl / Lord Commander Dante / Calgar, Grimnar & Helbrecht
- **Ch 7 — Heroes of the Guard & Inquisition** · Yarrick & Creed / Ciaphas Cain & Ibram Gaunt / Eisenhorn, Ravenor & Coteaz

### Title 3: Champions of Chaos & Heretics
- **Ch 8 — The Chaos Chosen** · Abaddon, Warmaster of Chaos / Vashtorr the Arkifane / The Black Legion Inner Circle
- **Ch 9 — The God-Champions & Arch-Heretics** · Khârn (Khorne) & Typhus (Nurgle) / Ahriman (Tzeentch) & Lucius (Slaanesh) / Fabius Bile, Erebus & Huron

### Title 4: Xenos Overlords & Leaders
- **Ch 10 — Necron & Aeldari Leaders** · The Silent King & Imotekh / High Farseer Eldrad Ulthran / Supreme Archon Asdrubael Vect
- **Ch 11 — Ork Warlords & T'au Commanders** · Ghazghkull Mag Uruk Thraka / Commander Farsight (Shoh) / Commander Shadowsun & Aun'Va

### Title 5: Holy Relics & Doomsday Artifacts
- **Ch 12 — Imperial Holy Relics** · The Golden Throne / The Emperor's Sword & Armour of Fate / Liber Daemonica & Saint Relics
- **Ch 13 — Chaos Artifacts** · Talon of Horus & Drach'nyen / The Anathame Blade of Davin / Tuchulcha Engine & the Black Grail
- **Ch 14 — Xenos Technology** · Tesseract Vaults & the Celestial Orrery / Blackstone Pylons & Noctilith / The Dawn Blade & Aeldari Wraithbone

### Title 6: Titan Legions & Knight Houses
- **Ch 15 — Imperial Titan Legions** · Legio Ignatum & Legio Astorum / House Taranis, Raven & Hawkshroud / God-Engine Anatomy & the MIU
- **Ch 16 — Traitor Titans & Chaos Knights** · Legio Mortis, the Death Heads / House Devine & the Fallen Houses / Daemon-Infused God-Engines

---

## VOLUME IX — Compendium Imperialis (Armaments & Materiel)
*4 Titles · 12 Chapters · Reference depth*

### Title 1: Small Arms & Personal Weaponry
- **Ch 1 — Solid & Energy Weapons** · Autoguns, Stubbers & Solid Shot / Lasguns & Las-Weaponry / Bolt Weapons & Mass-Reactive Shells
- **Ch 2 — Thermal, Plasma & Exotic Weapons** · Meltaguns & Flamers / Plasma Weapons & Their Perils / Grav, Volkite & Archeotech
- **Ch 3 — Close Combat Arms** · Chain & Power Weapons / Force Weapons & Psychic Blades / Thunder Hammers & Relic Blades

### Title 2: Armour & Personal Protection
- **Ch 4 — Power Armour Marks & Terminator Plate** · MK I Thunder to MK VIII Errant / MK X Tacticus, Phobos & Gravis / Terminator Armour Variants
- **Ch 5 — Flak, Carapace & Void Protection** · Guard Flak & Carapace / Void Suits & Environmental Gear / Sororitas & Ecclesiarchy Plate

### Title 3: Vehicles, Walkers & War Machines
- **Ch 6 — Astra Militarum Armour** · Leman Russ Patterns / Chimeras & Troop Transports / Basilisks & Artillery Batteries
- **Ch 7 — Super-Heavies & Siege Engines** · The Baneblade Family / Shadowsword & Titan-Killers / Siege & Assault Engines
- **Ch 8 — Adeptus Astartes Vehicles** · Rhino, Razorback & Predator / Land Raiders & Assault Transports / Repulsor, Impulsor & Primaris Patterns
- **Ch 9 — Dreadnoughts & Walkers** · The Interred and the Honoured Dead / Contemptor, Redemptor & Patterns / Sentinels, Armigers & Light Walkers

### Title 4: Voidcraft, Aircraft & Exterminatus
- **Ch 10 — Starship Classes & Battle-Barges** · Escort Frigates & Destroyers / Cruisers & Battleships / Space Marine Battle-Barges
- **Ch 11 — Aircraft & Atmospheric Craft** · Thunderhawks & Drop Pods / Valkyries, Vendettas & Marauders / Lightning, Thunderbolt & Void Fighters
- **Ch 12 — Exterminatus Protocols** · Legal Justification & Decree / Cyclonic Torpedoes & Core Crackers / Life-Eater Virus Bombs

---

## APPENDIX A — Apparatus & Reading Paths
*3 Titles · 8 Chapters · Reference depth*

> **This appendix is out-of-world.** It is bibliography, publication history and
> reference apparatus — not lore. Write it in a plainly practical register with no
> in-universe framing. It is the only part of the book permitted to break voice.

### Title 1: The Setting in Publication
*Write this before the index — a reader who does not know the setting has changed will
misread every source they consult.*
- **Ch 1 — Editions & the Shape of the Setting** · Rogue Trader to the Present / What Each Edition Changed / Reading Older Sources Safely
- **Ch 2 — Major Retcons & Reversals** · The Squats and their Return as the Votann / The Primaris Introduction / Quieter Edits & Soft Retcons
- **Ch 3 — The Timeline Advances** · Thirty Years Frozen at 999.M41 / The Gathering Storm & the Rift / What Moving the Clock Did to Canon

### Title 2: Reference Apparatus
*Compiled from the finished text, not researched independently. Write this LAST.*
- **Ch 4 — Master Index** · Subjects and Their Canonical Homes / The Cross-Reference Map / Alternative Names, Spellings & High Gothic Equivalents
- **Ch 5 — Consolidated Glossary** · Institutions, Ranks & Offices / High Gothic Terms & Their Common Renderings / Disputed and Variant Usages
- **Ch 6 — Disputed Facts Register** · Unresolved Numerical Conflicts / Contested Sequences & Dates / Terms With No Canonical Definition

### Title 3: Black Library Reading Paths
- **Ch 7 — Inquisition & Guard Fiction** · The Eisenhorn Trilogy Path / Ravenor & Bequin / Gaunt's Ghosts and Ciaphas Cain
- **Ch 8 — Marine & Heresy Fiction** · Space Marine Battles & Night Lords / The Horus Heresy Opening Trilogy / Essential Milestones & the Siege of Terra

---

## Where to begin

1. **Establish retrieval first** (§5). Report what works before writing anything.
2. Confirm with the user how content should be stored and rendered — the frame is not
   defined in this brief.
3. Then write **Volume I, Title 1** as a pilot. Stop. Report. Wait.

**The Master Index, Consolidated Glossary and Disputed Facts Register (Appendix A,
Title 2) are compiled from the finished book and must be written last.** Keep the
running glossary and the per-Title audit trails in a form that makes compiling them
mechanical rather than a second research project.

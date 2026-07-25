#!/usr/bin/env node
//
// Structural validator for the codex. Runs BEFORE the site build, in CI and locally.
//
//   node frame/validate.mjs           report, exit 1 on any error
//   node frame/validate.mjs --strict   also exit 1 on warnings
//
// This enforces the parts of PROMPT.md that can be checked mechanically. It cannot
// check whether a claim is TRUE — nothing can, at tier 2. What it can guarantee is
// that no cross-reference dangles, no citation points at a source that was never
// recorded, and no subject has two canonical homes.

import {
  loadChapters, loadRegistries, parseChapterId, depthFor, BANDS,
  SLUG_OK, collectMarkup, CITE_RE, DATA_DIR, loadYaml,
  glossaryForms, glossaryRegex, glossaryKeysIn,
  namedTermCandidates, mentionsTerm,
} from './lib.mjs';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const strict = process.argv.includes('--strict');

const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

const registries = loadRegistries();
const { sources, glossary, subjects, contradictions } = registries;
const parsed = loadChapters();

// ---------------------------------------------------------------------------
// Pass 1 — every file is a well-formed Chapter, and IDs/Sections are coherent
// ---------------------------------------------------------------------------

const chapters = new Map();   // id -> chapter
const sectionIds = new Set(); // "chapterId.slug"
const ownership = new Map();  // subject slug -> [chapter ids]

// Chapters live under book/vol-*/. Anything at the top level of book/ is
// apparatus — the homepage, the about page — and is not held to the Chapter
// contract. It may still carry frontmatter: the homepage uses `template:` and
// `hide:`, which are MkDocs meta and have nothing to do with Chapter IDs.
const isChapterPath = (rel) => /^book\/vol-/.test(rel);

for (const ch of parsed) {
  if (!ch.ok) {
    if (!isChapterPath(ch.rel)) continue;
    err(ch.rel, ch.error);
    continue;
  }
  // A file outside a Volume directory that nonetheless declares an id is a
  // Chapter filed in the wrong place — worth saying so rather than ignoring.
  if (!isChapterPath(ch.rel) && !ch.front.id) continue;
  if (!isChapterPath(ch.rel) && ch.front.id) {
    err(ch.rel, `declares Chapter id "${ch.front.id}" but is not under book/vol-*/`);
    continue;
  }

  const { rel, front } = ch;
  const ids = parseChapterId(front.id);
  if (!ids) {
    err(rel, `id "${front.id}" is not a valid Chapter ID (expected e.g. IV.T9.Ch31)`);
    continue;
  }
  if (chapters.has(front.id)) {
    err(rel, `duplicate Chapter id "${front.id}" (also in ${chapters.get(front.id).rel})`);
    continue;
  }

  const depth = depthFor(ids);
  if (!depth) err(rel, `no depth band known for volume "${ids.volume}"`);
  if (!front.name) err(rel, 'frontmatter has no `name`');

  const STATUSES = ['stub', 'drafted', 'audited'];
  if (!STATUSES.includes(front.status)) {
    err(rel, `status "${front.status ?? '(none)'}" must be one of ${STATUSES.join(', ')}`);
  }

  // Fields the schema says are DERIVED and must not be stored, because stored
  // duplicates drift out of step with the thing they duplicate.
  for (const banned of ['volume', 'title_no', 'chapter_no', 'depth', 'words', 'word_count']) {
    if (banned in front) err(rel, `\`${banned}\` is derived — remove it from frontmatter (schema.md §3)`);
  }

  ch.ids = ids;
  ch.depth = depth;
  chapters.set(front.id, ch);

  // --- ownership ---------------------------------------------------------
  for (const subject of front.owns ?? []) {
    if (!ownership.has(subject)) ownership.set(subject, []);
    ownership.get(subject).push(front.id);
  }

  // --- Sections: frontmatter list vs `##` headings in the body ----------
  const declared = front.sections ?? [];
  if (!Array.isArray(declared) || declared.length === 0) {
    if (front.status !== 'stub') err(rel, 'no `sections` declared in frontmatter');
  }
  if (declared.length > 5 || (declared.length > 0 && declared.length < 2)) {
    warn(rel, `${declared.length} Section(s) — the brief expects 2–5 (§1). Justify in the Title report.`);
  }

  const bodySections = ch.sections;
  if (front.status !== 'stub' && declared.length !== bodySections.length) {
    err(rel, `frontmatter declares ${declared.length} Section(s) but the body has ${bodySections.length} \`##\` heading(s)`);
  }

  declared.forEach((sec, i) => {
    const at = `${rel} §${i + 1}`;
    if (!sec?.name) err(at, 'Section has no `name`');
    if (!sec?.slug) { err(at, 'Section has no `slug`'); return; }
    if (!SLUG_OK.test(sec.slug)) err(at, `slug "${sec.slug}" must be lowercase-hyphenated`);

    const sid = `${front.id}.${sec.slug}`;
    if (sectionIds.has(sid)) err(at, `duplicate Section id "${sid}"`);
    sectionIds.add(sid);

    const inBody = bodySections[i];
    const headingLine = inBody ? ch.bodyOffset + inBody.start + 1 : null;
    if (!inBody) {
      if (front.status !== 'stub') err(at, `Section "${sec.name}" has no matching \`##\` heading in the body`);
      return;
    }
    if (inBody.slug === null) {
      err(`${rel}:${headingLine}`, `heading "${inBody.name}" is missing its explicit {#${sec.slug}} anchor (schema.md §4)`);
    } else if (inBody.slug !== sec.slug) {
      err(`${rel}:${headingLine}`, `heading anchor {#${inBody.slug}} does not match declared slug "${sec.slug}"`);
    }
    if (inBody.name !== sec.name) {
      err(`${rel}:${headingLine}`, `heading "${inBody.name}" does not match declared name "${sec.name}"`);
    }

    // --- length --------------------------------------------------------
    // NO BAND IS ENFORCED, by the user's explicit direction: a Section runs as
    // long as its material warrants and no longer. PROMPT.md §7's bands are kept
    // in lib.mjs as documentation of the original plan, but they are not a target
    // in either direction — there is no floor to reach and no ceiling to respect.
    //
    // Length is still measured and reported in the summary, because knowing the
    // distribution is useful. It is information, not a verdict.

    // --- sources cited by this Section --------------------------------
    for (const sid2 of sec.sources ?? []) {
      if (!(sid2 in sources)) err(at, `\`sources\` lists "${sid2}", which is not in data/sources.yaml`);
    }
    if (front.status !== 'stub' && (sec.sources ?? []).length === 0) {
      err(at, 'no sources — every Section must be researched (PROMPT.md §3.2)');
    }
    for (const cid of sec.contradictions ?? []) {
      if (!(cid in contradictions)) err(at, `\`contradictions\` lists "${cid}", not in data/contradictions.yaml`);
    }
  });
}

// ---------------------------------------------------------------------------
// Pass 2 — the canonical-home rule (PROMPT.md §8)
// ---------------------------------------------------------------------------

for (const [subject, owners] of ownership) {
  if (owners.length > 1) {
    err('canonical-home', `subject "${subject}" is owned by ${owners.length} Chapters: ${owners.join(', ')}. Exactly one may own it.`);
  }
  if (!(subject in subjects)) {
    warn('canonical-home', `subject "${subject}" is owned by ${owners[0]} but has no entry in data/subjects.yaml — it will be missing from the Master Index.`);
  }
}
for (const subject of Object.keys(subjects)) {
  if (!ownership.has(subject)) {
    warn('canonical-home', `subject "${subject}" is registered but no Chapter declares \`owns: [${subject}]\` — [[s:${subject}]] links cannot resolve.`);
  }
}

// ---------------------------------------------------------------------------
// Pass 3 — every link resolves, every citation is recorded
// ---------------------------------------------------------------------------

const usedSources = new Set();

for (const ch of chapters.values()) {
  const { links, cites } = collectMarkup(ch.body, ch.bodyOffset);

  for (const { target, line } of links) {
    const at = `${ch.rel}:${line}`;

    if (target.startsWith('g:')) {
      const term = target.slice(2);
      if (!(term in glossary)) err(at, `[[g:${term}]] — no such glossary term in data/glossary.yaml`);
      continue;
    }
    if (target.startsWith('d:')) {
      const key = target.slice(2);
      if (!(key in contradictions)) {
        err(at, `[[d:${key}]] — no such contradiction in data/contradictions.yaml`);
      }
      continue;
    }
    if (target.startsWith('a:')) {
      const APPENDIX_NAMES = ['glossary', 'master-index', 'disputed-facts', 'bibliography'];
      const key = target.slice(2);
      if (!APPENDIX_NAMES.includes(key)) {
        err(at, `[[a:${key}]] — not an appendix page. Expected one of: ${APPENDIX_NAMES.join(', ')}`);
      }
      continue;
    }

    if (target.startsWith('s:')) {
      const subject = target.slice(2);
      if (!ownership.has(subject)) {
        err(at, `[[s:${subject}]] — no Chapter declares ownership of this subject, so the link has nowhere to go`);
      }
      continue;
    }
    // Chapter or Section reference
    if (chapters.has(target)) {
      if (target === ch.front.id) warn(at, `[[${target}]] links to its own Chapter`);
      continue;
    }
    if (sectionIds.has(target)) continue;

    const guess = parseChapterId(target.split('.').slice(0, 3).join('.'));
    err(at, guess
      ? `[[${target}]] — Chapter ${guess ? target.split('.').slice(0, 3).join('.') : ''} exists in the plan but has no file yet, or the Section slug is wrong`
      : `[[${target}]] — not a Chapter ID, Section ID, [[s:subject]] or [[g:term]]`);
  }

  for (const { id, line } of cites) {
    usedSources.add(id);
    if (!(id in sources)) {
      err(`${ch.rel}:${line}`, `[^${id}] — no such source in data/sources.yaml. Nothing may be cited that was not recorded.`);
    }
  }

  // A drafted Section with no citation marker anywhere is prose from memory,
  // which rule §3.1 forbids outright.
  if (ch.front.status !== 'stub' && cites.length === 0) {
    err(ch.rel, 'not a stub, but contains no [^citation] markers at all (PROMPT.md §3.1)');
  }

  // -----------------------------------------------------------------------
  // Process commentary must not reach the reader
  // -----------------------------------------------------------------------
  // The prose is for someone who wants to read about Warhammer 40,000. It is not
  // the place to discuss the table of contents, which sources were retrievable, or
  // what this project could and could not do — that is what audit/ is for, and
  // duplicating it into the chapters talks past the reader.
  //
  // A statement about the SETTING is fine and often valuable: "nothing defines the
  // Veil as a structure" tells a reader something real. A statement about our
  // WORKFLOW is not: "the Section proposed here was X, and no retrieved source
  // supports it" refers to a document the reader has never seen.
  const PROCESS_PATTERNS = [
    [/\b(Section|Chapter)(?:'s)? (?:originally )?(?:proposed|planned) (?:here|for this)/i,
      'refers to the planning document; the reader has not seen it'],
    [/\bproposed (?:breakdown|Section|section titles)\b/i,
      'refers to the planning document'],
    [/\bno retrieved source\b/i, 'say what the setting does not state, not what we could not retrieve'],
    [/\bretrieved (?:source|material)s?\b/i, '"retrieved" describes our process, not the setting'],
    [/\bthis (?:codex|project) (?:declines|cannot|could not|has not verified)\b/i,
      'state the fact instead of narrating the decision'],
    [/\bCould not be sourced\b/i, 'reframe as what the setting does not say'],
    [/\bat this project\b/i, 'process commentary'],
    [/\{\{(?:Uncited|Trivia|WIP|Quarantine|Cite Marker End|Conflicting Sources)\}\}/,
      'wiki template names are project plumbing; describe the uncertainty in plain words'],
  ];
  for (const [re, why] of PROCESS_PATTERNS) {
    const m = re.exec(ch.body);
    if (m) err(ch.rel, `process commentary in prose — "${m[0]}": ${why}`);
  }
}

// A source is "used" if a Chapter footnotes it OR a registry entry rests on it. A
// glossary definition sourced to an article is a real use of that article — the entry
// could not exist without it — and reporting those as unused made three legitimate
// entries into permanent noise.
{
  const inRegistries = new Set();
  for (const entry of Object.values(glossary))
    for (const id of entry?.sources ?? []) inRegistries.add(id);
  for (const entry of Object.values(contradictions))
    for (const pos of entry?.positions ?? []) if (pos?.source) inRegistries.add(pos.source);

  for (const id of Object.keys(sources)) {
    if (usedSources.has(id)) continue;
    warn('sources', inRegistries.has(id)
      ? `"${id}" supports a registry entry but is not yet cited in any Chapter.`
      : `"${id}" is recorded but never cited in any Chapter.`);
  }
}

// ---------------------------------------------------------------------------
// Pass 4 — registry hygiene
// ---------------------------------------------------------------------------

const seenTerms = new Map();
for (const [key, entry] of Object.entries(glossary)) {
  if (!SLUG_OK.test(key)) err('glossary', `key "${key}" must be lowercase-hyphenated`);
  if (!entry?.term) err('glossary', `"${key}" has no \`term\``);
  if (!entry?.definition) err('glossary', `"${key}" has no \`definition\``);
  // Dedupe WITHIN the entry first. An entry whose term is "real space" and whose
  // variants include "Real Space" is not defining the term twice — it is recording a
  // capitalisation the sources use. Only collisions ACROSS entries matter.
  const ownNames = new Set(
    [entry?.term, ...(entry?.variants ?? [])].filter(Boolean).map(n => String(n).toLowerCase())
  );
  for (const norm of ownNames) {
    if (seenTerms.has(norm) && seenTerms.get(norm) !== key) {
      err('glossary', `"${norm}" is defined by both "${seenTerms.get(norm)}" and "${key}" — a term is defined exactly once (§8)`);
    }
    seenTerms.set(norm, key);
  }
  for (const sid of entry?.sources ?? []) {
    if (!(sid in sources)) err('glossary', `"${key}" cites "${sid}", not in data/sources.yaml`);
  }
}

for (const [key, entry] of Object.entries(sources)) {
  if (!entry?.what) err('sources', `"${key}" has no \`what\``);
  if (entry?.tier === undefined) err('sources', `"${key}" has no \`tier\``);
  if (![0, 1, 2, 3].includes(entry?.tier)) err('sources', `"${key}" has tier ${entry?.tier}; expected 0, 1, 2 or 3`);
  if (!entry?.retrieved) err('sources', `"${key}" has no \`retrieved\` date — an unretrieved source is not a source`);
  if (entry?.tier === 3) warn('sources', `"${key}" is tier 3 (Fandom). Leads only — corroborate at tier 2 or mark the claim uncertain (§5).`);
}

for (const [key, entry] of Object.entries(contradictions)) {
  const KINDS = ['numerical', 'sequence', 'terminology', 'undefined', 'edition'];
  const STATUS = ['open', 'resolved', 'undefined'];
  if (!KINDS.includes(entry?.kind)) err('contradictions', `"${key}" kind "${entry?.kind}" must be one of ${KINDS.join(', ')}`);
  if (!STATUS.includes(entry?.status)) err('contradictions', `"${key}" status "${entry?.status}" must be one of ${STATUS.join(', ')}`);
  if (!entry?.summary) err('contradictions', `"${key}" has no \`summary\``);
  if (entry?.reverified !== true && entry?.reverified !== false) {
    err('contradictions', `"${key}" must state \`reverified: true|false\``);
  }
}

// A seeded-but-unreverified contradiction must not yet be leaned on in prose.
for (const ch of chapters.values()) {
  for (const sec of ch.front.sections ?? []) {
    for (const cid of sec.contradictions ?? []) {
      if (contradictions[cid]?.reverified === false) {
        err(`${ch.rel} §${sec.name}`, `cites contradiction "${cid}", which is seeded from PROMPT.md §11 and not yet re-verified. Re-verify it first.`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Pass 5 — the reverse direction: registered, but never used
// ---------------------------------------------------------------------------
//
// Passes 1–4 check one direction only: that nothing in the prose points at something
// missing from a registry. That is why the build stayed green while real drift
// accumulated — a stale frontmatter entry, a contradiction recorded and never
// surfaced, a source declared for a Section that never cites it. All of it was
// invisible because it fails in the OTHER direction.
//
// An audit by hand found 23 such defects across the first two Volumes. This pass
// exists so the twenty-sixth Chapter cannot quietly become the hundred-and-first.

// --- a link must not span a line break ------------------------------------
// LINK_RE deliberately forbids newlines inside a [[...]], so a link whose display text
// wraps is not a link at all: it is invisible to the resolver AND to every check that
// walks links, and it reaches the reader as literal double brackets. That happened
// once, to a [[d:...]] added in this very pass, and nothing caught it — the build was
// green and the page showed raw markup. Cheap to detect, so detect it.
for (const ch of chapters.values()) {
  ch.body.split(/\r?\n/).forEach((line, i) => {
    const opens = (line.match(/\[\[/g) ?? []).length;
    const closes = (line.match(/\]\]/g) ?? []).length;
    if (opens !== closes) {
      err(`${ch.rel}:${ch.bodyOffset + i + 1}`,
        `unbalanced [[ ]] on this line — a link cannot span a line break, and one that does is silently not a link`);
    }
  });
}

// --- a Section's declared sources must be the sources it actually cites -----
// schema.md §6: `sources` on a Section is the list of sources that Section cites.
// Not "consulted", not "relevant" — cited. If the two lists disagree, one of them is
// wrong, and the audit trail is only as good as the agreement.
for (const ch of chapters.values()) {
  if (ch.front.status === 'stub') continue;
  (ch.front.sections ?? []).forEach((sec, i) => {
    const at = `${ch.rel} §${i + 1} ${sec.slug ?? ''}`.trimEnd();
    const bodyText = ch.sections[i]?.text ?? '';
    const cited = new Set([...bodyText.matchAll(CITE_RE)].map((m) => m[1]));
    const declared = new Set(sec.sources ?? []);

    for (const id of declared) {
      if (!cited.has(id)) {
        err(at, `declares source "${id}" but the Section never cites [^${id}] — remove the declaration or add the citation`);
      }
    }
    for (const id of cited) {
      if (!declared.has(id)) {
        err(at, `cites [^${id}] but does not declare it in \`sources\` — the frontmatter is the audit trail`);
      }
    }
  });
}

// --- a declared contradiction must actually reach the reader ---------------
// A Chapter surfaces a conflict in one of two ways, and both count:
//
//   a `!!! disputed "… — <key>"` callout, or
//   a [[d:<key>]] link from the prose into the register entry.
//
// The first version of this check demanded a callout. That was wrong, and it would
// have damaged good prose to satisfy it: two Volume I Chapters carry a conflict in
// running argument — the deliberately undefined date, and the Gellar/Geller
// spelling — where boxing it would be heavier than the point deserves. What matters is
// that the reader is told, not the shape of the telling.
const CALLOUT_KEY_RE = /^\s*!!!\s+\w+\s+"[^"]*?—\s*([a-z0-9][a-z0-9-]*)"/gm;
const REGISTER_LINK_RE = /\[\[d:([a-z0-9][a-z0-9-]*)(?:\|[^\]]*)?\]\]/g;

for (const ch of chapters.values()) {
  if (ch.front.status === 'stub') continue;
  const inCallouts = new Set([...ch.body.matchAll(CALLOUT_KEY_RE)].map((m) => m[1]));
  const inLinks = new Set([...ch.body.matchAll(REGISTER_LINK_RE)].map((m) => m[1]));
  const surfaced = new Set([...inCallouts, ...inLinks]);
  const declared = new Set((ch.front.sections ?? []).flatMap((s) => s.contradictions ?? []));

  for (const key of inCallouts) {
    if (!(key in contradictions)) {
      err(ch.rel, `a callout is titled for contradiction "${key}", which is not in data/contradictions.yaml`);
    }
  }
  for (const key of surfaced) {
    if (key in contradictions && !declared.has(key)) {
      err(ch.rel, `surfaces contradiction "${key}" to the reader but no Section declares it in \`contradictions\``);
    }
  }
  for (const key of declared) {
    if (!surfaced.has(key)) {
      err(ch.rel, `declares contradiction "${key}" but nothing in the prose surfaces it — add a callout titled "… — ${key}" or a [[d:${key}]] link`);
    }
  }
}

// --- registry pointers must resolve ----------------------------------------
for (const [key, entry] of Object.entries(glossary)) {
  if (entry?.full_treatment && !chapters.has(entry.full_treatment)) {
    err('glossary', `"${key}" has full_treatment "${entry.full_treatment}", which is not a Chapter that exists`);
  }
}
for (const [key, entry] of Object.entries(subjects)) {
  for (const other of entry?.see_also ?? []) {
    if (!(other in subjects)) err('subjects', `"${key}" see_also "${other}", which is not a registered subject`);
  }
}
for (const [key, entry] of Object.entries(contradictions)) {
  for (const pos of entry?.positions ?? []) {
    if (pos?.source && !(pos.source in sources)) {
      err('contradictions', `"${key}" has a position sourced to "${pos.source}", not in data/sources.yaml`);
    }
  }
}

// --- a contradiction nobody surfaces, and a term nobody uses ---------------
// Both are warnings, not errors. Recording a conflict before the Chapter that will
// carry it is legitimate — Volume II opened conflicts due in Volume IV. What is not
// legitimate is forgetting, so the count stays visible in every build.
{
  const surfaced = new Set();
  for (const ch of chapters.values())
    for (const sec of ch.front.sections ?? [])
      for (const key of sec.contradictions ?? []) surfaced.add(key);
  for (const key of Object.keys(contradictions)) {
    if (!surfaced.has(key)) {
      warn('contradictions', `"${key}" is recorded but no Chapter surfaces it yet.`);
    }
  }
}

// --- terms the prose introduces that no registry defines -------------------
// The mirror of the check above, and the one that was missing entirely: every earlier
// check asked whether registered terms get used, never whether used terms get
// registered. Only CROSS-CHAPTER candidates are reported — a term introduced and used
// inside the single Chapter that explains it is handled in situ, and counting those as
// gaps overstated the backlog by a factor of six.
let undefinedTerms = [];
{
  const nonTermsPath = join(DATA_DIR, 'non-terms.yaml');
  const nonTerms = existsSync(nonTermsPath) ? loadYaml(nonTermsPath) : {};
  const waived = new Set(Object.keys(nonTerms).map((k) => k.toLowerCase()));

  const byForm = glossaryForms(glossary, { variants: true });
  const known = new Set([...byForm.keys()]);
  for (const entry of Object.values(subjects))
    for (const n of [entry?.name, ...(entry?.aliases ?? [])].filter(Boolean)) {
      known.add(String(n).toLowerCase());
    }

  const drafted = [...chapters.values()].filter((c) => c.front.status !== 'stub');
  const candidates = new Map(); // normalised -> display
  for (const ch of drafted) {
    for (const term of namedTermCandidates(ch.body)) {
      const norm = term.toLowerCase();
      if (known.has(norm) || waived.has(norm) || candidates.has(norm)) continue;
      candidates.set(norm, term);
    }
  }

  for (const [, term] of candidates) {
    const inChapters = drafted.filter((ch) => mentionsTerm(ch.body, term)).length;
    if (inChapters >= 2) undefinedTerms.push({ term, chapters: inChapters });
  }
  undefinedTerms.sort((a, b) => b.chapters - a.chapters || a.term.localeCompare(b.term));

  for (const { term, chapters: n } of undefinedTerms) {
    warn('glossary', `"${term}" is introduced in bold and used across ${n} Chapters, but no registry defines it — add a glossary entry, register it as a subject, or waive it in data/non-terms.yaml.`);
  }
}

const glossaryUse = new Map(); // key -> count of Chapters whose prose contains it
{
  // The looser question here: does this entry appear under ANY of its names? An
  // entry the prose only ever writes by a variant spelling is still in use.
  const byForm = glossaryForms(glossary, { variants: true });
  const re = glossaryRegex(byForm);
  for (const ch of chapters.values()) {
    if (ch.front.status === 'stub') continue;
    for (const key of glossaryKeysIn(ch.body, byForm, re)) {
      glossaryUse.set(key, (glossaryUse.get(key) ?? 0) + 1);
    }
  }
  for (const key of Object.keys(glossary)) {
    if (!glossaryUse.has(key)) {
      warn('glossary', `"${key}" is defined but its term appears in no Chapter — dead registry weight, or the registered form does not match how the prose writes it.`);
    }
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const drafted = [...chapters.values()].filter(c => c.front.status !== 'stub');
const stubs = chapters.size - drafted.length;
// Stubs only, deliberately excluded: counting the "not yet written" boilerplate
// as prose would report thousands of words of progress that do not exist.
const totalWords = drafted.flatMap(c => c.sections).reduce((n, s) => n + s.words, 0);

console.log('');
console.log('  Codex structural validation');
console.log('  ' + '-'.repeat(52));
console.log(`  Chapters found        ${chapters.size} of 171`);
console.log(`  Stubs                 ${stubs}`);
console.log(`  Drafted (not stub)    ${drafted.length}`);
console.log(`  Sections              ${sectionIds.size}`);
console.log(`  Words of prose        ${totalWords.toLocaleString('en-US')} of ~210,000–250,000`);
{
  // Reported, never enforced. No band applies.
  const lens = drafted.flatMap(c => c.sections).map(s => s.words).filter(n => n > 0);
  if (lens.length) {
    const mean = Math.round(lens.reduce((a, b) => a + b, 0) / lens.length);
    const sorted = [...lens].sort((a, b) => a - b);
    console.log(`  Section length        ${sorted[0]}–${sorted[sorted.length - 1]} words, mean ${mean}`);
  }
}
console.log(`  Sources recorded      ${Object.keys(sources).length}`);
console.log(`  Glossary terms        ${Object.keys(glossary).length} (${glossaryUse.size} appear in the prose)`);
console.log(`  Subjects registered   ${Object.keys(subjects).length}`);
const unrev = Object.values(contradictions).filter(c => c?.reverified === false).length;
console.log(`  Contradictions        ${Object.keys(contradictions).length} (${unrev} awaiting re-verification)`);
console.log('');

if (warnings.length) {
  console.log(`  WARNINGS (${warnings.length})`);
  for (const w of warnings) console.log(`    ~ ${w}`);
  console.log('');
}
if (errors.length) {
  console.log(`  ERRORS (${errors.length})`);
  for (const e of errors) console.log(`    x ${e}`);
  console.log('');
  console.log('  FAILED');
  process.exit(1);
}
if (strict && warnings.length) {
  console.log('  FAILED (--strict: warnings are errors)');
  process.exit(1);
}
console.log('  OK');

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
  SLUG_OK, collectMarkup,
} from './lib.mjs';

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

    // --- depth band ----------------------------------------------------
    // Asymmetric ON PURPOSE (PROMPT.md §7): short is a signal to re-check the
    // sources, long is permitted. "Let dense Sections run over. Never inflate
    // a thin one."
    if (depth && front.status !== 'stub') {
      const band = BANDS[depth];
      if (inBody.words < band.min) {
        warn(at, `${inBody.words} words, below the ${depth} band (${band.min}–${band.max}). Check whether the sources support more — do NOT pad.`);
      }
    }

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
}

for (const id of Object.keys(sources)) {
  if (!usedSources.has(id)) warn('sources', `"${id}" is recorded but never cited in any Chapter.`);
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
console.log(`  Sources recorded      ${Object.keys(sources).length}`);
console.log(`  Glossary terms        ${Object.keys(glossary).length}`);
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

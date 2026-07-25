#!/usr/bin/env node
//
// Prepares the MkDocs input tree:  book/ + data/  ->  build/docs/
//
//   1. resolves [[...]] into real relative links
//   2. turns [^source-id] into rendered footnotes generated from data/sources.yaml
//   3. compiles the registries into the Appendix A reference pages
//
// Nothing here writes to book/. The source tree stays exactly as authored, and
// build/docs is disposable — which is what keeps the choice of site generator cheap
// to reverse. Run frame/validate.mjs first; this assumes the tree is already sound.

import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import {
  ROOT, BOOK_DIR, loadChapters, loadRegistries, parseChapterId, depthFor,
  LINK_RE, CITE_RE,
  glossaryForms, glossaryRegex, markGlossaryFirstUse,
} from './lib.mjs';

const OUT = join(ROOT, 'build', 'docs');

const { sources, glossary, subjects, contradictions } = loadRegistries();
const parsed = loadChapters().filter(c => c.ok);

// ---------------------------------------------------------------------------
// Index what exists, so links can be resolved
// ---------------------------------------------------------------------------

const byId = new Map();       // chapter id  -> { name, docPath }
const bySection = new Map();  // section id  -> { chapterId, slug }
const ownerOf = new Map();    // subject     -> chapter id

for (const ch of parsed) {
  const docPath = relative(BOOK_DIR, ch.file).split(sep).join('/');
  byId.set(ch.front.id, { name: ch.front.name, docPath, front: ch.front });
  for (const sec of ch.front.sections ?? []) {
    bySection.set(`${ch.front.id}.${sec.slug}`, { chapterId: ch.front.id, slug: sec.slug, name: sec.name });
  }
  for (const subject of ch.front.owns ?? []) ownerOf.set(subject, ch.front.id);
}

const APPENDIX = {
  glossary: 'appendix/glossary.md',
  disputed: 'appendix/disputed-facts.md',
  sources: 'appendix/bibliography.md',
};

// Reader-facing names for [[a:...]] links, so prose never hand-writes a path.
// No master-index entry: there is no published page, so [[a:master-index]] must
// not be able to compile into a link that goes nowhere.
const APPENDIX_BY_NAME = {
  'glossary': APPENDIX.glossary,
  'disputed-facts': APPENDIX.disputed,
  'bibliography': APPENDIX.sources,
};
const APPENDIX_LABELS = {
  'glossary': 'Consolidated Glossary',
  'disputed-facts': 'Disputed Facts Register',
  'bibliography': 'Bibliography',
};

/** Relative link from one docs-relative page to another. */
function linkFrom(fromDocPath, toDocPath) {
  const rel = relative(dirname(fromDocPath), toDocPath).split(sep).join('/');
  return rel.startsWith('.') ? rel : `./${rel}`;
}

// ---------------------------------------------------------------------------
// Transform one page
// ---------------------------------------------------------------------------

function resolveLinks(text, fromDocPath) {
  return text.replace(LINK_RE, (whole, rawTarget, rawText) => {
    const target = rawTarget.trim();
    const label = rawText?.trim() ?? null;

    // A glossary term carries its definition as a title attribute, so Material's
    // tooltips show it on hover. The reader gets the definition without being
    // thrown to the appendix mid-sentence, and it is still the single definition
    // from data/glossary.yaml rather than a copy.
    // `g:` covers both registries — a plain key is a glossary term, an `s:`-prefixed
    // one a subject. Both land on the compiled Glossary page, which carries an entry
    // for each, so a tooltip always has somewhere to click through to.
    if (target.startsWith('g:')) {
      const key = target.slice(2);
      const entry = tooltipVocab[key];
      if (!entry) return label ?? key;
      const anchor = key.startsWith(SUBJECT_PREFIX) ? `subject-${key.slice(2)}` : key;
      const href = `${linkFrom(fromDocPath, APPENDIX.glossary)}#${anchor}`;
      return `[${label ?? entry.term}](${href}){ .cx-term title="${tooltipFor(entry)}" }`;
    }

    // [[d:contradiction-key]] — a link to one ENTRY in the Disputed Facts Register,
    // rather than to the register as a whole.
    //
    // Added because a `!!! disputed` callout is not the only honest way to surface a
    // source conflict, and treating it as the only way was distorting the prose. Two
    // Volume I Chapters handle a conflict in running argument — the deliberately
    // undefined date, and the Gellar/Geller spelling — where a boxed callout would be
    // heavier than the point deserves. This gives those passages a way to point the
    // reader at the register entry, and gives the validator a way to see that they do.
    if (target.startsWith('d:')) {
      const key = target.slice(2);
      if (!contradictions[key]) return label ?? key;
      const href = `${linkFrom(fromDocPath, APPENDIX.disputed)}#${key}`;
      return `[${label ?? APPENDIX_LABELS['disputed-facts']}](${href}){ .cx-xref }`;
    }

    // [[a:disputed-facts]] and friends. Added because the first hand-written
    // relative link to an appendix page was wrong by one directory level and only
    // surfaced in a --strict build. Depth-relative paths written by hand are a bug
    // waiting to happen; the resolver already knows where these pages are.
    if (target.startsWith('a:')) {
      const key = target.slice(2);
      const path = APPENDIX_BY_NAME[key];
      if (!path) return label ?? key;
      return `[${label ?? APPENDIX_LABELS[key]}](${linkFrom(fromDocPath, path)}){ .cx-xref }`;
    }

    if (target.startsWith('s:')) {
      const key = target.slice(2);
      const owner = ownerOf.get(key);
      const entry = subjects[key];
      if (!owner) return label ?? entry?.name ?? key;
      const chapter = byId.get(owner);
      return `[${label ?? entry?.name ?? chapter.name}](${linkFrom(fromDocPath, chapter.docPath)}){ .cx-xref }`;
    }

    if (byId.has(target)) {
      const chapter = byId.get(target);
      return `[${label ?? chapter.name}](${linkFrom(fromDocPath, chapter.docPath)}){ .cx-xref }`;
    }

    const sec = bySection.get(target);
    if (sec) {
      const chapter = byId.get(sec.chapterId);
      const href = `${linkFrom(fromDocPath, chapter.docPath)}#${sec.slug}`;
      return `[${label ?? sec.name}](${href}){ .cx-xref }`;
    }

    // validate.mjs already failed the build on this; leave it visible rather than
    // silently swallowing it, in case someone runs build without validate.
    return `${label ?? target} <!-- UNRESOLVED LINK: ${whole} -->`;
  });
}

/**
 * Generate footnote definitions for the sources a page cites.
 *
 * The two-level distinction from PROMPT.md §5 is kept in the rendering: what WE read
 * sits inline, and the print source the wiki cites is set apart as "Cited there to
 * …". The wording carries the distinction — "there", not here — so no verdict badge
 * is needed. This is a reference work, not a body certifying what is or is not true
 * about Warhammer 40,000.
 */
function footnotesFor(text) {
  const used = [...new Set([...text.matchAll(CITE_RE)].map(m => m[1]))];
  if (!used.length) return '';
  const defs = used.map(id => {
    const s = sources[id];
    if (!s) return `[^${id}]: **Unrecorded source \`${id}\`.**`;

    // Two levels, rendered two ways. `.cite-what` is our own evidence: the page
    // we read and the date we read it. `.cite-hearsay` is the printed source the
    // wiki cites, set apart so the two are never read as one claim.
    let line = `[^${id}]: <span class="cite-what">${esc(s.what ?? id)}</span>`;
    if (s.retrieved) line += ` <span class="cite-retrieved">retrieved ${esc(s.retrieved)}</span>`;
    if (s.url) line += ` <span class="cite-url">[${esc(hostOf(s.url))}](${s.url})</span>`;
    if (s.cites?.length) {
      // "Cited there to …" already says whose citation this is: the wiki's, not
      // ours. An added "unverified by us" badge claimed a role this project does
      // not have — it is a reference work, not an authority auditing Games
      // Workshop. The distinction that matters is kept by the wording and by the
      // separate styling; it does not need a verdict attached.
      line += ` <span class="cite-hearsay">Cited there to ${esc(s.cites.join('; '))}</span>`;
    }
    if (s.notes) line += ` <span class="cite-note">${esc(String(s.notes).trim())}</span>`;
    return line;
  });
  return `\n\n${defs.join('\n')}\n`;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function attrEsc(s) {
  return esc(s).replace(/"/g, '&quot;').replace(/\s+/g, ' ').trim();
}

/**
 * Tooltip text for a glossary entry.
 *
 * Glossary definitions are written for the appendix page, where there is room. A
 * hover box has less, so an entry may carry an optional `short:` written for this
 * purpose. Where it does not, the definition is used — truncated at a word boundary
 * with an ellipsis, because the previous hard 240-character cut ended mid-word.
 */
const TOOLTIP_MAX = 220;

function tooltipFor(entry) {
  const raw = attrEsc(entry.short ?? entry.definition ?? '');
  if (raw.length <= TOOLTIP_MAX) return raw;
  const cut = raw.slice(0, TOOLTIP_MAX);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > TOOLTIP_MAX * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\s]+$/, '')}…`;
}

// ---------------------------------------------------------------------------
// Glossary tooltips — marked here, not by hand
// ---------------------------------------------------------------------------
//
// A drift audit found 95 registered terms against 13 hand-placed [[g:]] marks, all
// of them in Volume I: the registry grew and the prose never caught up. Marking by
// hand is a discipline that demonstrably does not hold across 171 Chapters, so the
// build does it — first use per Chapter, generated from data/glossary.yaml, which
// means it cannot fall out of step with the registry the way hand-marking did.
//
// FIRST use, not every use: there are 235 occurrences of "the Warp" in the drafted
// book, and 235 dotted underlines would be a rash rather than an aid.
//
// [[g:...]] written by hand still wins. It is how an author marks a LATER mention
// deliberately, and this pass leaves any term already marked in a Chapter alone.

// The hover vocabulary is BOTH registries. The glossary holds the vocabulary a reader
// needs — psyker, Gellar field, noctilith — and the subject registry holds the proper
// nouns — the Schola Progenium, corpse-starch, bastion worlds. A reader arriving from
// a search engine trips over the second kind at least as often as the first, and for
// 83 subjects a one-line gloss was already written and reaching nobody.
//
// Subject keys are namespaced `s:` because two of them (ultramar, age-of-strife) collide
// with glossary keys, and an anchor collision on the compiled Glossary page would send
// one of the pair to the wrong definition.
const SUBJECT_PREFIX = 's:';
const tooltipVocab = { ...glossary };

// Seven subjects name the same thing as a glossary term — the Warp, the soul, the
// Webway, the C'tan, Ultramar, the Age of Strife, the Webway Project. Registering both
// for hover put two dotted underlines on one idea in a single paragraph: "his soul
// restored to his body… The soul was restored by Ynnead". The glossary entry carries
// the real definition, so it wins and the subject is left out of the hover vocabulary.
// It still appears on the Glossary page, where its canonical home is what it adds.
const glossaryForm = new Set(
  Object.values(glossary).flatMap((e) => [e?.term, ...(e?.mark ?? [])])
    .filter(Boolean)
    .map((s) => String(s).toLowerCase().replace(/^(the|a|an)\s+/, '')),
);

for (const [key, entry] of Object.entries(subjects)) {
  const name = String(entry?.name ?? key).toLowerCase().replace(/^(the|a|an)\s+/, '');
  if (glossaryForm.has(name)) continue;
  tooltipVocab[SUBJECT_PREFIX + key] = {
    term: entry?.name ?? key,
    definition: entry?.gloss,
    short: entry?.short,
    // `mark:` is the same opt-in the glossary uses: extra surface forms an author
    // has judged safe. `aliases:` is NOT used — it is a much looser field, 507
    // forms including "vellum", "Adept" and "sector", and auto-marking off it would
    // repeat the variants accident that once produced 36 wrong links.
    mark: entry?.mark,
  };
}

const glossaryByForm = glossaryForms(tooltipVocab);
const glossaryPattern = glossaryRegex(glossaryByForm);

/** Terms this Chapter must not auto-mark. */
function skipKeysFor(ch) {
  const skip = new Set();
  // Already marked by hand somewhere in this Chapter. A hand-placed [[g:...]] is a
  // deliberate choice about WHICH mention to mark, and the marker defers to it.
  for (const m of ch.body.matchAll(/\[\[g:([^\]|]+)/g)) skip.add(m[1].trim());
  return skip;
}

function hostOf(url) {
  try { return new URL(url).host.replace(/^www\./, ''); } catch { return url; }
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

if (existsSync(BOOK_DIR)) {
  cpSync(BOOK_DIR, OUT, { recursive: true });
}

let pages = 0;
let tooltipsAdded = 0;
let tooltipsByHand = 0;
for (const ch of parsed) {
  const docPath = relative(BOOK_DIR, ch.file).split(sep).join('/');
  const outFile = join(OUT, docPath);
  const raw = readFileSync(outFile, 'utf8');
  const fmMatch = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/.exec(raw);
  let front = fmMatch ? fmMatch[0] : '';
  const body = raw.slice(front.length);

  // Inject the derived depth band into the GENERATED frontmatter so the template
  // can render it. The schema forbids storing it in source (it is derived from the
  // Volume and would drift), but build/docs is disposable — deriving it once here
  // keeps one source of truth and still puts it on the page.
  const depth = depthFor(parseChapterId(ch.front.id) ?? {});
  if (front && depth) {
    front = front.replace(/\r?\n---(\r?\n?)$/, `\ndepth: ${depth}\n---$1`);
  }

  const heading = `# ${ch.front.name}\n\n`;

  // Auto-mark BEFORE resolution, while the text is still authored markdown: the
  // protected-region rules are written against that shape, and emitting [[g:key|as
  // written]] lets the existing resolver do the rest. Running afterwards would risk
  // marking terms inside generated cross-reference labels and footnote definitions.
  tooltipsByHand += [...body.matchAll(/\[\[g:/g)].length;
  const { text: withTerms, marks } = ch.front.status === 'stub'
    ? { text: body, marks: 0 }
    : markGlossaryFirstUse(body, {
        byForm: glossaryByForm,
        regex: glossaryPattern,
        skipKeys: skipKeysFor(ch),
      });
  tooltipsAdded += marks;

  const resolved = resolveLinks(withTerms, docPath);
  const hasH1 = /^\s*#\s+/m.test(body.split('\n').slice(0, 3).join('\n'));

  writeFileSync(outFile, front + (hasH1 ? '' : heading) + resolved + footnotesFor(resolved), 'utf8');
  pages++;
}

// Non-chapter pages (homepage, about) still get link resolution.
for (const ch of loadChapters().filter(c => !c.ok)) {
  const docPath = relative(BOOK_DIR, ch.file ?? '').split(sep).join('/');
  if (!docPath || docPath.startsWith('..')) continue;
  const outFile = join(OUT, docPath);
  if (!existsSync(outFile)) continue;
  const raw = readFileSync(outFile, 'utf8');
  writeFileSync(outFile, resolveLinks(raw, docPath) + footnotesFor(raw), 'utf8');
}

// ---------------------------------------------------------------------------
// Appendix A · Title 2 — compiled, not written
// ---------------------------------------------------------------------------

mkdirSync(join(OUT, 'appendix'), { recursive: true });

const NOTE = (what) =>
  `!!! note "Compiled page"\n    ${what} It is generated from the registries at build time, ` +
  `not written by hand, so it cannot drift out of step with the book.\n\n`;

// --- Consolidated Glossary -------------------------------------------------
{
  const keys = Object.keys(glossary).sort((a, b) =>
    (glossary[a].term ?? a).localeCompare(glossary[b].term ?? b));
  let md = `# Consolidated Glossary\n\n${NOTE('Every term in the codex, defined exactly once.')}`;
  if (!keys.length) md += '_No terms defined yet._\n';
  for (const key of keys) {
    const e = glossary[key];
    md += `### ${e.term} {#${key}}\n\n${String(e.definition).trim()}\n\n`;
    if (e.variants?.length) md += `*Also written:* ${e.variants.join(', ')}\n\n`;
    if (e.full_treatment && byId.has(e.full_treatment)) {
      md += `*Discussed in full:* [${byId.get(e.full_treatment).name}](${linkFrom(APPENDIX.glossary, byId.get(e.full_treatment).docPath)})\n\n`;
    }
    if (e.sources?.length) md += `*Sources:* ${e.sources.map(s => `\`${s}\``).join(', ')}\n\n`;
  }

  // Subjects share the page, because they share the hover vocabulary. A reader who
  // hovers "bastion worlds" and wants more must be able to click through to
  // something, and the honest destination is the Chapter that owns the subject.
  const subjectKeys = Object.keys(subjects).sort((a, b) =>
    (subjects[a].name ?? a).localeCompare(subjects[b].name ?? b));
  if (subjectKeys.length) {
    md += `## Subjects\n\nNamed things the codex treats in full somewhere. Each entry says where.\n\n`;
    for (const key of subjectKeys) {
      const e = subjects[key];
      md += `### ${e.name ?? key} {#subject-${key}}\n\n${String(e.gloss ?? '').trim()}\n\n`;
      const owner = ownerOf.get(key);
      if (owner && byId.has(owner)) {
        md += `*Treated in full:* [${byId.get(owner).name}](${linkFrom(APPENDIX.glossary, byId.get(owner).docPath)})\n\n`;
      }
      if (e.aliases?.length) md += `*Also written:* ${e.aliases.join(', ')}\n\n`;
    }
  }
  writeFileSync(join(OUT, APPENDIX.glossary), md, 'utf8');
}

// --- Master Index ----------------------------------------------------------
//
// APX.T2.Ch4 in the brief, with three Sections: Subjects and Their Canonical
// Homes / The Cross-Reference Map / Alternative Names, Spellings & High Gothic
// Equivalents. The brief says write it LAST, and only the first of those three
// can be compiled today.
//
// There is no reader-facing page. The register is an authoring tool — one
// owning Chapter per subject, and which subjects are still homeless — so it
// compiles to audit/canonical-homes.md, outside docs_dir. Nothing is published
// and nothing appears in the nav.
{
  const keys = Object.keys(subjects).sort((a, b) =>
    (subjects[a].name ?? a).localeCompare(subjects[b].name ?? b));

  // The working register. Links are repo-relative so they resolve in an editor.
  let reg = '# Register of Canonical Homes\n\n'
    + '<!-- GENERATED by frame/build.mjs. Not published; not in docs_dir. -->\n\n'
    + 'Working file. Section 1 of three for APX.T2.Ch4, which the brief says to write last.\n\n'
    + '| Subject | Canonical home | Also known as |\n|---|---|---|\n';
  let homeless = 0;
  for (const key of keys) {
    const e = subjects[key];
    const owner = ownerOf.get(key);
    let home = '**no owner**';
    if (owner && byId.has(owner)) {
      const o = byId.get(owner);
      const stub = o.front.status === 'stub' ? ' _(stub)_' : '';
      home = `[${owner} · ${o.name}](../book/${o.docPath})${stub}`;
    } else if (owner) {
      home = `${owner} _(no such Chapter)_`;
    } else {
      homeless += 1;
    }
    reg += `| ${e.name ?? key} | ${home} | ${(e.aliases ?? []).join(', ') || '—'} |\n`;
  }
  reg += `\n${keys.length} subject(s) registered · ${homeless} without an owning Chapter.\n`;
  mkdirSync(join(ROOT, 'audit'), { recursive: true });
  writeFileSync(join(ROOT, 'audit', 'canonical-homes.md'), reg, 'utf8');
}

// --- Disputed Facts Register ----------------------------------------------
{
  const keys = Object.keys(contradictions).sort();
  let md = `# Disputed Facts Register\n\n${NOTE('Every source conflict the codex has recorded rather than resolved.')}`;
  md += 'Warhammer 40,000 contradicts itself by design, and this register is where the '
     + 'codex says so plainly instead of quietly picking a winner.\n\n';
  if (!keys.length) md += '_No contradictions recorded yet._\n';
  for (const key of keys) {
    const e = contradictions[key];
    md += `### ${key} {#${key}}\n\n`;
    md += `**Kind:** ${e.kind} · **Status:** ${e.status}`;
    md += e.reverified ? ' · re-verified in this project\n\n' : ' · **not yet re-verified**\n\n';
    md += `${String(e.summary).trim()}\n\n`;
    if (e.handling) md += `!!! warning "How this must be handled"\n    ${String(e.handling).trim().replace(/\n/g, '\n    ')}\n\n`;
    if (e.why_kept) md += `*Why this is kept:* ${String(e.why_kept).trim()}\n\n`;
    for (const p of e.positions ?? []) {
      md += `- ${p.claim ?? p} ${p.source ? `— \`${p.source}\`` : ''}\n`;
    }
    if (e.positions?.length) md += '\n';
  }
  writeFileSync(join(OUT, APPENDIX.disputed), md, 'utf8');
}

// --- Bibliography ----------------------------------------------------------
{
  const keys = Object.keys(sources).sort();
  const TIER = {
    0: 'Out-of-universe reference',
    1: 'Official Games Workshop web',
    2: 'Lexicanum',
    3: 'Fandom — leads only',
  };
  let md = `# Bibliography\n\n${NOTE('Every source retrieved during this project.')}`;
  md += 'Each entry records **what was read, and when**. Where a wiki cites a printed '
     + 'codex, rulebook or novel, that citation is reproduced under *Cited there to* — '
     + 'it is the wiki\'s reference, not ours, and those books are print-only and were '
     + 'not consulted.\n\n';
  if (!keys.length) md += '_No sources retrieved yet._\n';
  for (const key of keys) {
    const s = sources[key];
    md += `### \`${key}\` {#${key}}\n\n`;
    md += `**${s.what}** · ${TIER[s.tier] ?? `tier ${s.tier}`} · retrieved ${s.retrieved ?? '—'}\n\n`;
    if (s.url) md += `<${s.url}>\n\n`;
    if (s.cites?.length) {
      md += `*Cited there to:*\n\n`;
      for (const c of s.cites) md += `- ${c}\n`;
      md += '\n';
    }
    if (s.notes) md += `${s.notes}\n\n`;
  }
  writeFileSync(join(OUT, APPENDIX.sources), md, 'utf8');
}

// ---------------------------------------------------------------------------
// Design specimen — local preview only, never part of the book
// ---------------------------------------------------------------------------
// `node frame/build.mjs --specimen` copies frame/specimen.md into the preview
// tree. It lives outside book/ so it is not a Chapter, is not validated as one,
// and cannot reach the deployed site: CI runs build.mjs without the flag.
//
// It exists because designing typography against two nearly-empty pages is
// guesswork. It is a fixture for looking at, not content.

if (process.argv.includes('--specimen')) {
  const src = join(ROOT, 'frame', 'specimen.md');
  if (existsSync(src)) {
    const raw = readFileSync(src, 'utf8');
    const fm = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/.exec(raw);
    const front = fm ? fm[0] : '';
    const body = raw.slice(front.length);
    const resolved = resolveLinks(body, 'design-specimen.md');
    writeFileSync(join(OUT, 'design-specimen.md'),
      front + resolved + footnotesFor(resolved), 'utf8');
    console.log('  + design-specimen.md (local preview only — excluded from CI builds)');
  }

  const lab = join(ROOT, 'frame', 'font-lab.html');
  if (existsSync(lab)) {
    cpSync(lab, join(OUT, 'font-lab.html'));
    console.log('  + font-lab.html (local preview only — excluded from CI builds)');
  }
}

console.log(`  build/docs ready — ${pages} chapter page(s) + 3 compiled appendix pages`);
console.log('  audit/canonical-homes.md — register refreshed (not published)');
console.log(`  glossary tooltips — ${tooltipsAdded} auto-marked (first use per Section) + ${tooltipsByHand} placed by hand`);

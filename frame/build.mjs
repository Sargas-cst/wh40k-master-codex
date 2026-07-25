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
  subjects: 'appendix/master-index.md',
  disputed: 'appendix/disputed-facts.md',
  sources: 'appendix/bibliography.md',
};

// Reader-facing names for [[a:...]] links, so prose never hand-writes a path.
const APPENDIX_BY_NAME = {
  'glossary': APPENDIX.glossary,
  'master-index': APPENDIX.subjects,
  'disputed-facts': APPENDIX.disputed,
  'bibliography': APPENDIX.sources,
};
const APPENDIX_LABELS = {
  'glossary': 'Consolidated Glossary',
  'master-index': 'Master Index',
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
    if (target.startsWith('g:')) {
      const key = target.slice(2);
      const entry = glossary[key];
      if (!entry) return label ?? key;
      const href = `${linkFrom(fromDocPath, APPENDIX.glossary)}#${key}`;
      const def = attrEsc(entry.definition ?? '').slice(0, 240);
      return `[${label ?? entry.term}](${href}){ .cx-term title="${def}" }`;
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
 * The two-level distinction from PROMPT.md §5 is rendered explicitly: what WE read,
 * and separately what the wiki CLAIMS its own source is. The words "unverified by us"
 * are not decoration — they are the difference between honest sourcing and laundering
 * a wiki's citation into an authority we never consulted.
 */
function footnotesFor(text) {
  const used = [...new Set([...text.matchAll(CITE_RE)].map(m => m[1]))];
  if (!used.length) return '';
  const defs = used.map(id => {
    const s = sources[id];
    if (!s) return `[^${id}]: **Unrecorded source \`${id}\`.**`;

    // Two levels, rendered two ways. `.cite-what` is our own evidence: the page
    // we read and the date we read it. `.cite-hearsay` is the printed source the
    // wiki cites, which nobody here opened — set apart and labelled, because the
    // stylesheet cannot enforce a distinction the markup has already collapsed.
    let line = `[^${id}]: <span class="cite-what">${esc(s.what ?? id)}</span>`;
    if (s.retrieved) line += ` <span class="cite-retrieved">retrieved ${esc(s.retrieved)}</span>`;
    if (s.url) line += ` <span class="cite-url">[${esc(hostOf(s.url))}](${s.url})</span>`;
    if (s.cites?.length) {
      line += ` <span class="cite-hearsay">Cited there to ${esc(s.cites.join('; '))} ` +
              `<span class="cite-flag">print source, unverified by us</span></span>`;
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
  const resolved = resolveLinks(body, docPath);
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
  writeFileSync(join(OUT, APPENDIX.glossary), md, 'utf8');
}

// --- Master Index ----------------------------------------------------------
{
  const keys = Object.keys(subjects).sort((a, b) =>
    (subjects[a].name ?? a).localeCompare(subjects[b].name ?? b));
  let md = `# Master Index\n\n${NOTE('Every subject and the single Chapter that owns it, per the canonical-home rule.')}`;
  if (!keys.length) md += '_No subjects registered yet._\n';
  else md += '| Subject | Canonical home | Also known as |\n|---|---|---|\n';
  for (const key of keys) {
    const e = subjects[key];
    const owner = ownerOf.get(key);
    const home = owner && byId.has(owner)
      ? `[${byId.get(owner).name}](${linkFrom(APPENDIX.subjects, byId.get(owner).docPath)})`
      : '_not yet written_';
    md += `| ${e.name ?? key} | ${home} | ${(e.aliases ?? []).join(', ') || '—'} |\n`;
  }
  writeFileSync(join(OUT, APPENDIX.subjects), md, 'utf8');
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
  md += 'Each entry records **what was actually read, and when.** Where a wiki cites a '
     + 'printed codex, rulebook or novel, that citation is reproduced and labelled as '
     + '*unverified by us* — those books are print-only and were not consulted. '
     + 'The distinction is deliberate: this codex can confirm what a wiki claims, never '
     + 'whether the wiki is right.\n\n';
  if (!keys.length) md += '_No sources retrieved yet._\n';
  for (const key of keys) {
    const s = sources[key];
    md += `### \`${key}\` {#${key}}\n\n`;
    md += `**${s.what}** · ${TIER[s.tier] ?? `tier ${s.tier}`} · retrieved ${s.retrieved ?? '—'}\n\n`;
    if (s.url) md += `<${s.url}>\n\n`;
    if (s.cites?.length) {
      md += `*Cited there to (print, unverified by us):*\n\n`;
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

console.log(`  build/docs ready — ${pages} chapter page(s) + 4 compiled appendix pages`);

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
  ROOT, BOOK_DIR, loadChapters, loadRegistries, parseChapterId, LINK_RE, CITE_RE,
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

    if (target.startsWith('g:')) {
      const key = target.slice(2);
      const entry = glossary[key];
      if (!entry) return label ?? key;
      const href = `${linkFrom(fromDocPath, APPENDIX.glossary)}#${key}`;
      return `[${label ?? entry.term}](${href})`;
    }

    if (target.startsWith('s:')) {
      const key = target.slice(2);
      const owner = ownerOf.get(key);
      const entry = subjects[key];
      if (!owner) return label ?? entry?.name ?? key;
      const chapter = byId.get(owner);
      return `[${label ?? entry?.name ?? chapter.name}](${linkFrom(fromDocPath, chapter.docPath)})`;
    }

    if (byId.has(target)) {
      const chapter = byId.get(target);
      return `[${label ?? chapter.name}](${linkFrom(fromDocPath, chapter.docPath)})`;
    }

    const sec = bySection.get(target);
    if (sec) {
      const chapter = byId.get(sec.chapterId);
      const href = `${linkFrom(fromDocPath, chapter.docPath)}#${sec.slug}`;
      return `[${label ?? sec.name}](${href})`;
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
    const bits = [];
    bits.push(s.what ?? id);
    if (s.retrieved) bits.push(`retrieved ${s.retrieved}`);
    let line = `[^${id}]: ${bits.join(' — ')}.`;
    if (s.url) line += ` <${s.url}>`;
    if (s.cites?.length) {
      line += ` Cited there to ${s.cites.join('; ')} — *print source, unverified by us.*`;
    }
    if (s.notes) line += ` ${s.notes}`;
    return line;
  });
  return `\n\n${defs.join('\n')}\n`;
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
  const front = fmMatch ? fmMatch[0] : '';
  const body = raw.slice(front.length);

  const heading = `# ${ch.front.name}\n\n`;
  const resolved = resolveLinks(body, docPath);
  const hasH1 = /^\s*#\s+/m.test(body.split('\n').slice(0, 3).join('\n'));

  writeFileSync(outFile, (hasH1 ? '' : heading) + resolved + footnotesFor(resolved), 'utf8');
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

console.log(`  build/docs ready — ${pages} chapter page(s) + 4 compiled appendix pages`);

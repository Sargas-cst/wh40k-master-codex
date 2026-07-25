#!/usr/bin/env node
//
// Extract the citation structure from a cached Lexicanum page.
//
//   node frame/cite-map.mjs lex-astronomican
//   node frame/cite-map.mjs lex-astronomican --yaml   # paste-ready sources.yaml stub
//
// ---------------------------------------------------------------------------
// Why this exists
// ---------------------------------------------------------------------------
// Lexicanum's wikitext marks citations structurally, which is the single most useful
// property of retrieving raw wikitext instead of rendered HTML:
//
//   inline    ...directs this energy across around fifty thousand light years{{Fn|1b}}
//   endnote   *1: [[Warhammer 40,000: Rogue Trader]]:
//             **{{Endn|1b}}: pg. 140
//
// So a specific sentence resolves to a specific book and page mechanically, rather
// than by squinting at "[1b]" in rendered output and guessing which claim it covers.
// This script does that resolution and prints what each marker points at, together
// with the sentence it is attached to.
//
// It also surfaces Lexicanum's own reliability tags — {{Uncited}}, {{Cite Marker End}},
// {{Conflicting Sources}} — which a rendered-page summary tends to bury. Those tags
// are the wiki telling you where it is weak, and PROMPT.md §5 is emphatic that they
// must stay visible.
//
// What this does NOT do is verify anything. The page numbers below are what LEXICANUM
// CLAIMS. The books are print-only and unreachable. Anything emitted here belongs in
// a source's `cites:` list, which the build renders labelled "unverified by us".

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib.mjs';

const args = process.argv.slice(2);
const asYaml = args.includes('--yaml');
const id = args.find(a => !a.startsWith('--'));

if (!id) {
  console.error('usage: node frame/cite-map.mjs <cached-id> [--yaml]');
  console.error('  e.g. node frame/cite-map.mjs lex-astronomican');
  process.exit(2);
}

const file = join(ROOT, 'sources', 'raw', `${id}.wikitext`);
if (!existsSync(file)) {
  console.error(`Not cached: ${file}`);
  console.error(`Retrieve it first:  node frame/retrieve.mjs <PageTitle>`);
  process.exit(1);
}

const text = readFileSync(file, 'utf8');

const manifestPath = join(ROOT, 'sources', 'manifest.json');
const manifest = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, 'utf8')).retrievals?.[id] ?? {}
  : {};

// ---------------------------------------------------------------------------
// The Sources section: resolve each endnote key to a book and a locator
// ---------------------------------------------------------------------------

const sourcesBlock = /(?:^|\n)==+\s*Sources\s*==+([\s\S]*)$/i.exec(text)?.[1] ?? '';
const uncitedBlock = /(?:^|\n)==+\s*Uncited\s*==+([\s\S]*?)(?=\n==|\n\[\[Category|$)/i.exec(sourcesBlock)?.[1] ?? '';
const citedBlock = sourcesBlock.replace(uncitedBlock, '');

const endnotes = new Map();   // "1b" -> { work, locator }
let currentWork = null;

for (const line of citedBlock.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('*')) continue;

  const depth = /^\*+/.exec(trimmed)[0].length;
  const rest = trimmed.replace(/^\*+\s*/, '');

  // Grouped parent line, e.g.  *1: [[Warhammer 40,000: Rogue Trader]]:
  const group = /^(\d+):\s*(.+?):?\s*$/.exec(rest);
  if (depth === 1 && group && !/\{\{Endn/i.test(rest)) {
    currentWork = cleanWork(group[2]);
    continue;
  }

  // An endnote line, e.g.  **{{Endn|1b}}: pg. 140    or   *{{Endn|2}}: [[Codex...]], pg. 28
  const endn = /\{\{Endn\|([^}|]+)\}\}\s*:?\s*(.*)$/i.exec(rest);
  if (!endn) continue;

  const key = endn[1].trim();
  let tail = endn[2].trim().replace(/:$/, '');

  if (depth >= 2 && currentWork) {
    endnotes.set(key, { work: currentWork, locator: cleanWork(tail) || '(no page given)' });
  } else {
    // Flat entry: the work and the locator are on the same line.
    const split = /^(\[\[[^\]]+\]\][^,]*)(?:,\s*(.*))?$/.exec(tail);
    endnotes.set(key, {
      work: cleanWork(split?.[1] ?? tail),
      locator: cleanWork(split?.[2] ?? '') || '(no page given)',
    });
    currentWork = null;
  }
}

function cleanWork(s) {
  return (s ?? '')
    .replace(/\{\{Cite Marker End\}\}/gi, '[incomplete citation]')
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/''+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// Inline markers, with the sentence each is attached to
// ---------------------------------------------------------------------------

const body = text.split(/\n==+\s*Sources\s*==+/i)[0];
const claims = [];   // { key, sentence }

const FN = /\{\{Fn\|([^}|]+)\}\}/gi;
for (const m of body.matchAll(FN)) {
  const before = body.slice(0, m.index);
  // Back up to the start of the sentence the marker terminates.
  const start = Math.max(
    before.lastIndexOf('. '), before.lastIndexOf('\n'),
    before.lastIndexOf('! '), before.lastIndexOf('? '),
  );
  const sentence = cleanWork(before.slice(start + 1))
    .replace(/^[*#:;\s]+/, '')
    .replace(/\{\{Fn\|[^}]*\}\}/gi, '');
  claims.push({ key: m[1].trim(), sentence: sentence.slice(-260) });
}

// ---------------------------------------------------------------------------
// Reliability tags the wiki applies to itself
// ---------------------------------------------------------------------------

const flags = [];
if (/\{\{Uncited/i.test(text)) flags.push('{{Uncited}} — the article lists sources it has not tied to any claim');
if (/\{\{Cite Marker End\}\}/i.test(text)) flags.push('{{Cite Marker End}} — at least one citation is incomplete');
if (/\{\{Conflicting/i.test(text)) flags.push('{{Conflicting Sources}} — the wiki records a conflict here');
if (/\{\{Trivia/i.test(text)) flags.push('{{Trivia}}');
if (/^#REDIRECT/i.test(text.trim())) flags.push('THIS PAGE IS A REDIRECT — it contains no article text');

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

if (asYaml) {
  const cites = [...endnotes.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true }))
    .map(([key, v]) => `    - "${v.work}${v.locator && v.locator !== '(no page given)' ? `, ${v.locator}` : ''}"   # {{Fn|${key}}}`);

  console.log(`${id}:`);
  console.log(`  tier: 2`);
  console.log(`  what: Lexicanum article "${manifest.title ?? id}"`);
  if (manifest.url) console.log(`  url: ${manifest.url}`);
  console.log(`  retrieved: ${manifest.retrieved ?? 'YYYY-MM-DD'}`);
  if (manifest.file) console.log(`  raw: ${manifest.file}`);
  console.log(`  cites:                                  # print sources, UNVERIFIED BY US`);
  console.log(cites.length ? cites.join('\n') : '    []');
  if (flags.length) {
    console.log(`  notes: >`);
    for (const f of flags) console.log(`    ${f}`);
  }
  process.exit(0);
}

const uncitedWorks = uncitedBlock.split(/\r?\n/)
  .map(l => l.trim()).filter(l => l.startsWith('*'))
  .map(l => cleanWork(l.replace(/^\*+\s*/, ''))).filter(Boolean);

console.log('');
console.log(`  ${manifest.title ?? id}`);
console.log(`  ${manifest.url ?? ''}`);
console.log(`  retrieved ${manifest.retrieved ?? '?'} · ${manifest.bytes ?? '?'} bytes · ` +
            `${claims.length} inline marker(s) · ${endnotes.size} endnote(s)`);
console.log('  ' + '-'.repeat(74));

if (flags.length) {
  console.log('\n  LEXICANUM\'S OWN RELIABILITY FLAGS');
  for (const f of flags) console.log(`    ! ${f}`);
}

console.log('\n  ENDNOTES — what each marker resolves to');
console.log('  (This is what Lexicanum CLAIMS. The books are print-only and unverified.)\n');
for (const [key, v] of [...endnotes].sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true }))) {
  console.log(`    ${key.padEnd(5)} ${v.work}`);
  console.log(`          ${v.locator}`);
}
if (!endnotes.size) console.log('    (none found)');

if (uncitedWorks.length) {
  console.log('\n  LISTED BUT UNCITED — tied to no specific claim. Do not use as support:\n');
  for (const w of uncitedWorks) console.log(`    ? ${w}`);
}

console.log('\n  CLAIMS, in article order\n');
const byKey = new Map();
for (const c of claims) {
  if (!byKey.has(c.key)) byKey.set(c.key, []);
  byKey.get(c.key).push(c.sentence);
}
for (const [key, sentences] of byKey) {
  const src = endnotes.get(key);
  console.log(`    {{Fn|${key}}} -> ${src ? `${src.work}, ${src.locator}` : 'NO MATCHING ENDNOTE'}`);
  for (const s of sentences) console.log(`        "...${s.trim()}"`);
  console.log('');
}

const orphans = [...byKey.keys()].filter(k => !endnotes.has(k));
if (orphans.length) {
  console.log(`  WARNING: ${orphans.length} inline marker(s) have no endnote: ${orphans.join(', ')}`);
  console.log('  A claim whose marker resolves to nothing is unsourced. Treat it as such.\n');
}

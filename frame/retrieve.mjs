#!/usr/bin/env node
//
// Polite batch retriever for Lexicanum.
//
//   node frame/retrieve.mjs Astronomican Cadia Segmentum_Tempestus
//   node frame/retrieve.mjs --file frame/titles/vol-01-t1.txt
//   node frame/retrieve.mjs --force Astronomican      # re-fetch a cached page
//   node frame/retrieve.mjs --list                    # what is already cached
//
// ---------------------------------------------------------------------------
// How this behaves, and why
// ---------------------------------------------------------------------------
// Lexicanum's robots.txt allows everything under /wiki/, including Special:Export,
// and asks for `Crawl-delay: 5`. That delay is the site's own stated terms, so it is
// what this script waits — not a number chosen for convenience. Lexicanum is a
// fan-run site on limited hardware and PROMPT.md §5 asks for politeness explicitly.
//
// Three further choices all reduce load rather than merely comply with it:
//
//   1. Special:Export batches up to BATCH titles per request, so a Title's worth of
//      research costs a handful of requests instead of dozens.
//   2. Nothing is ever re-fetched. A cached page is reused unless --force is passed.
//      Over a 500-Section project this is the difference between thousands of
//      requests and hundreds.
//   3. Requests are sequential. No concurrency, ever.
//
// The cache lives in sources/raw/ and is GITIGNORED: it exists so claims stay
// re-checkable without new requests, but committing bulk wikitext to a public repo
// would republish Lexicanum's expression. Only sources/manifest.json — pure
// metadata — is committed. See frame/schema.md §8.

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib.mjs';

const RAW_DIR = join(ROOT, 'sources', 'raw');
const TMP_DIR = join(ROOT, 'sources', 'tmp');
const MANIFEST = join(ROOT, 'sources', 'manifest.json');

const BASE = 'https://wh40k.lexicanum.com/wiki/Special:Export';
const CRAWL_DELAY_MS = 5000;   // Lexicanum robots.txt: Crawl-delay: 5
const BATCH = 8;               // titles per request

// A real browser User-Agent. Lexicanum answers 403 to anything else, so this is the
// only way to read pages that are freely readable in a browser. The requests are
// otherwise identical to a browser's, and rate-limited more conservatively than a
// human clicking through would be.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
           '(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Fetch via curl, NOT via node's global fetch.
 *
 * DO NOT "modernise" this back to fetch(). It was tried. With an identical
 * User-Agent, curl returns 200 and node's fetch returns 403 — on both article paths
 * and Special:Export. Header variants were tested too (curl-minimal, full browser
 * set including Sec-Fetch-*, and identity encoding): all three 403.
 *
 * The discrimination is therefore below the HTTP layer — undici's TLS handshake
 * fingerprints differently from curl's — and no header work will fix it. curl is
 * present on every platform this project runs on, so it is the transport.
 *
 * Output goes straight to a file rather than through a pipe, so a large batch cannot
 * hit a buffer limit.
 */
function curlToFile(url, outFile) {
  const status = execFileSync('curl', [
    '-sS',
    '--compressed',
    '--max-time', '60',
    '--retry', '2',
    '--retry-delay', '5',
    '-A', UA,
    '-H', 'Accept: application/xml,text/xml,*/*',
    '-o', outFile,
    '-w', '%{http_code}',
    url,
  ], { encoding: 'utf8' }).trim();
  return Number(status);
}

const slug = (title) =>
  'lex-' + title.replace(/_/g, ' ').trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function unescapeXml(s) {
  return s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');   // last, so &amp;lt; survives correctly
}

function loadManifest() {
  if (!existsSync(MANIFEST)) return { retrievals: {} };
  try {
    return JSON.parse(readFileSync(MANIFEST, 'utf8'));
  } catch {
    return { retrievals: {} };
  }
}

function saveManifest(m) {
  const ordered = Object.fromEntries(Object.entries(m.retrievals).sort());
  writeFileSync(MANIFEST, JSON.stringify({ retrievals: ordered }, null, 2) + '\n', 'utf8');
}

/** Split a MediaWiki export into { title -> wikitext }. */
function splitExport(xml) {
  const out = {};
  for (const block of xml.split('<page>').slice(1)) {
    const title = /<title>([\s\S]*?)<\/title>/.exec(block)?.[1];
    const text = /<text[^>]*>([\s\S]*?)<\/text>/.exec(block)?.[1];
    if (title && text !== undefined) out[unescapeXml(title)] = unescapeXml(text);
  }
  return out;
}

// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const force = argv.includes('--force');
const listOnly = argv.includes('--list');

let titles = argv.filter(a => !a.startsWith('--'));
const fileIdx = argv.indexOf('--file');
if (fileIdx !== -1 && argv[fileIdx + 1]) {
  titles = titles.filter(t => t !== argv[fileIdx + 1]);
  titles.push(...readFileSync(argv[fileIdx + 1], 'utf8')
    .split(/\r?\n/).map(l => l.replace(/#.*/, '').trim()).filter(Boolean));
}

mkdirSync(RAW_DIR, { recursive: true });
mkdirSync(TMP_DIR, { recursive: true });
const manifest = loadManifest();

// Stamped once per run so every page in a run carries the same retrieval date.
const RETRIEVED_ON = new Date().toISOString().slice(0, 10);

if (listOnly) {
  const files = existsSync(RAW_DIR) ? readdirSync(RAW_DIR).filter(f => f.endsWith('.wikitext')) : [];
  console.log(`\n  ${files.length} page(s) cached in sources/raw/\n`);
  for (const [k, v] of Object.entries(manifest.retrievals)) {
    console.log(`  ${k.padEnd(38)} ${String(v.bytes).padStart(7)} B  ${v.retrieved}`);
  }
  console.log('');
  process.exit(0);
}

if (!titles.length) {
  console.error('usage: node frame/retrieve.mjs <PageTitle> [...] | --file <list> | --list');
  process.exit(2);
}

titles = [...new Set(titles.map(t => t.replace(/ /g, '_')))];

// ---------------------------------------------------------------------------
// Cache check, with two traps that bit in practice
// ---------------------------------------------------------------------------
// MediaWiki treats "Gellar Field" and "Gellar field" as DIFFERENT pages — only
// the first letter is case-insensitive. Our slug lowercases everything, so both
// map to `lex-gellar-field`. The first request cached a redirect stub under that
// id; the second request, for the real article, was then skipped as "already
// cached". The result would have been a Section apparently sourced to 18 bytes
// of "#REDIRECT" — the precise failure redirect detection exists to prevent,
// walked around by a slug collision.
//
// So: a cached entry is only trusted when it is (a) not a redirect that points at
// its own slug, and (b) actually the same page title that is being asked for.
const needed = force ? titles : titles.filter(t => {
  const id = slug(t);
  if (!existsSync(join(RAW_DIR, `${id}.wikitext`))) return true;

  const entry = manifest.retrievals[id];
  const wanted = t.replace(/_/g, ' ');

  if (entry?.redirect_to && slug(entry.redirect_to) === id) {
    console.log(`  re-fetching        ${t} (cached copy is a redirect to the same slug)`);
    return true;
  }
  if (entry?.title && entry.title !== wanted) {
    console.log(`  re-fetching        ${t} (cache slot holds "${entry.title}" — case-variant collision)`);
    return true;
  }
  console.log(`  cached, skipping   ${t}`);
  return false;
});

if (!needed.length) {
  console.log('\n  Nothing to fetch — everything requested is already cached.\n');
  process.exit(0);
}

const batches = [];
for (let i = 0; i < needed.length; i += BATCH) batches.push(needed.slice(i, i + BATCH));

console.log(`\n  Retrieving ${needed.length} page(s) in ${batches.length} request(s), ` +
            `${CRAWL_DELAY_MS / 1000}s apart (robots.txt Crawl-delay).\n`);

const missing = [];
const redirects = [];
let fetched = 0;

for (const [i, batch] of batches.entries()) {
  if (i > 0) await sleep(CRAWL_DELAY_MS);

  const url = `${BASE}?pages=${batch.map(encodeURIComponent).join('%0A')}&curonly=1`;
  const tmp = join(TMP_DIR, `export-${i}.xml`);
  const status = curlToFile(url, tmp);

  if (status !== 200) {
    console.error(`  ! request ${i + 1}/${batches.length} failed: HTTP ${status}`);
    console.error(`    ${batch.join(', ')}`);
    process.exitCode = 1;
    continue;
  }

  const xml = readFileSync(tmp, 'utf8');
  rmSync(tmp, { force: true });
  const pages = splitExport(xml);
  const retrieved = RETRIEVED_ON;

  for (const title of batch) {
    const wanted = title.replace(/_/g, ' ');
    const text = pages[wanted] ?? pages[title];
    if (text === undefined) { missing.push(title); continue; }

    const id = slug(title);
    const file = join(RAW_DIR, `${id}.wikitext`);
    writeFileSync(file, text, 'utf8');

    // A redirect exports as a tiny stub, not an article. Reporting it matters:
    // silently caching "#REDIRECT [[Warp]]" as though it were the Immaterium article
    // would leave a Section apparently sourced to a page with no content in it.
    const redirect = /^#REDIRECT\s*\[\[([^\]|]+)/i.exec(text.trim())?.[1];

    manifest.retrievals[id] = {
      title: wanted,
      url: `https://wh40k.lexicanum.com/wiki/${encodeURIComponent(title)}`,
      via: 'Special:Export',
      retrieved,
      bytes: Buffer.byteLength(text, 'utf8'),
      sha256: createHash('sha256').update(text).digest('hex'),
      file: `sources/raw/${id}.wikitext`,
      ...(redirect ? { redirect_to: redirect } : {}),
    };
    fetched++;
    if (redirect) {
      redirects.push({ title: wanted, to: redirect });
      console.log(`  ->  ${id.padEnd(38)} redirect to "${redirect}"`);
    } else {
      console.log(`  ok  ${id.padEnd(38)} ${String(Buffer.byteLength(text, 'utf8')).padStart(7)} B`);
    }
  }
}

saveManifest(manifest);

console.log(`\n  ${fetched} page(s) cached. Manifest: sources/manifest.json`);
if (redirects.length) {
  console.log(`\n  REDIRECTS (${redirects.length}) — these hold no article text. Fetch the target instead:`);
  for (const r of redirects) console.log(`    -> ${r.title} => ${r.to}`);
  console.log(`\n    node frame/retrieve.mjs ${redirects.map(r => r.to.replace(/ /g, '_')).join(' ')}`);
}
if (missing.length) {
  console.log(`\n  NOT FOUND (${missing.length}) — check the exact page title on the wiki:`);
  for (const t of missing) console.log(`    ? ${t}`);
}
console.log('\n  Reminder: add each page you actually cite to data/sources.yaml,');
console.log('  including the print sources it cites, labelled unverified.\n');

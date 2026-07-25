#!/usr/bin/env node
//
// Generates the book's skeleton from the table of contents in PROMPT.md.
//
//   node frame/scaffold.mjs            # create missing stubs, rewrite nav
//   node frame/scaffold.mjs --dry      # report what it would do
//
// ---------------------------------------------------------------------------
// Why generate rather than transcribe
// ---------------------------------------------------------------------------
// 171 Chapter names, 49 Title names and their exact numbering are already
// written down once, in PROMPT.md. Retyping them into 171 files would introduce
// transcription errors into the one part of the project that is supposed to be
// fixed — and PROMPT.md's own framing is that Volumes, Titles and Chapters are
// "the agreed shape of the work", not ours to reassign. So this parses the
// source of truth and emits from it.
//
// It NEVER overwrites an existing file. Once a Chapter has been researched and
// drafted, re-running this is a no-op for that Chapter.
//
// What a stub contains: the frontmatter the schema requires, a note saying it is
// not yet written, and the *proposed* Sections from the table of contents —
// labelled indicative, because §1 of the brief is explicit that the section
// breakdown is "a proposed breakdown, not a quota" and a Chapter may end up with
// two Sections or five.

import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { ROOT, BOOK_DIR } from './lib.mjs';

const dry = process.argv.includes('--dry');
const PROMPT = join(ROOT, 'PROMPT.md');
const MKDOCS = join(ROOT, 'mkdocs.yml');

const NAV_START = '  # >>> GENERATED NAV — frame/scaffold.mjs. Do not edit by hand.';
const NAV_END = '  # <<< END GENERATED NAV';

// Volume order for directory prefixes. Appendix A sorts last.
const VOL_ORDER = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, APX: 10 };

// ---------------------------------------------------------------------------
// Appendix A · Title 2 is a special case, and deliberately so.
//
// Its three Chapters — Master Index, Consolidated Glossary, Disputed Facts
// Register — are COMPILED from the finished book by frame/build.mjs, not written
// by hand. The brief says so explicitly ("Compiled from the finished text, not
// researched independently"). Creating stubs for them would produce two rival
// pages for each: an empty stub and the real generated one.
//
// So these Chapters are not scaffolded. The nav points at the compiled pages.
// ---------------------------------------------------------------------------
const COMPILED = {
  'APX.T2.Ch5': 'appendix/glossary.md',
  'APX.T2.Ch6': 'appendix/disputed-facts.md',
};

// Not scaffolded and not in the nav. The Master Index is compiled to
// audit/canonical-homes.md for the authoring job it does — one owning Chapter
// per subject — and there is no reader-facing page for it at all.
const UNPUBLISHED = new Set(['APX.T2.Ch4']);

function slug(s, max = 48) {
  const base = s
    .replace(/&/g, ' and ')
    .replace(/[’']/g, '')
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .trim().toLowerCase()
    .replace(/[\s-]+/g, '-');
  if (base.length <= max) return base.replace(/^-|-$/g, '');
  // Truncate on a word boundary so slugs stay readable.
  return base.slice(0, max).replace(/-[^-]*$/, '').replace(/^-|-$/g, '');
}

// ---------------------------------------------------------------------------
// Parse the table of contents
// ---------------------------------------------------------------------------

const lines = readFileSync(PROMPT, 'utf8').split(/\r?\n/);

const RE_VOL = /^##\s+VOLUME\s+([IVX]+)\s+[—-]\s+(.+?)\s*$/;
const RE_APX = /^##\s+APPENDIX\s+A\s+[—-]\s+(.+?)\s*$/;
const RE_TITLE = /^###\s+Title\s+(\d+):\s+(.+?)\s*$/;
const RE_CH = /^-\s+\*\*Ch\s+(\d+)\s+[—-]\s+(.+?)\*\*(?:\s*·\s*(.+))?\s*$/;

const volumes = [];
let vol = null, title = null;

for (const line of lines) {
  const mv = RE_VOL.exec(line);
  if (mv) { vol = { roman: mv[1], name: mv[2], titles: [] }; volumes.push(vol); title = null; continue; }

  const ma = RE_APX.exec(line);
  if (ma) { vol = { roman: 'APX', name: ma[1], titles: [] }; volumes.push(vol); title = null; continue; }

  const mt = RE_TITLE.exec(line);
  if (mt && vol) { title = { no: Number(mt[1]), name: mt[2], chapters: [] }; vol.titles.push(title); continue; }

  const mc = RE_CH.exec(line);
  if (mc && vol && title) {
    title.chapters.push({
      no: Number(mc[1]),
      name: mc[2].trim(),
      proposed: (mc[3] ?? '').split('/').map(s => s.trim()).filter(Boolean),
    });
  }
}

const chapterCount = volumes.reduce((n, v) => n + v.titles.reduce((m, t) => m + t.chapters.length, 0), 0);
const titleCount = volumes.reduce((n, v) => n + v.titles.length, 0);

console.log('');
console.log(`  Parsed PROMPT.md: ${volumes.length} Volumes, ${titleCount} Titles, ${chapterCount} Chapters`);
if (volumes.length !== 10 || titleCount !== 49 || chapterCount !== 171) {
  console.log(`  ! Expected 10 / 49 / 171. The table of contents may have changed —`);
  console.log(`    check the parse before trusting the output.`);
}

// ---------------------------------------------------------------------------
// Emit stubs and build the nav
// ---------------------------------------------------------------------------

const nav = [];
let created = 0, skipped = 0, compiled = 0;

for (const v of volumes) {
  const vn = String(VOL_ORDER[v.roman]).padStart(2, '0');
  const vDir = `vol-${vn}-${slug(v.name, 32)}`;
  const vLabel = v.roman === 'APX'
    ? `Appendix A — ${v.name}`
    : `Volume ${v.roman} — ${v.name}`;

  const vNav = [];

  for (const t of v.titles) {
    const tDir = `t${t.no}-${slug(t.name, 36)}`;
    const tNav = [];

    for (const c of t.chapters) {
      const id = `${v.roman}.T${t.no}.Ch${c.no}`;

      if (UNPUBLISHED.has(id)) continue;

      if (COMPILED[id]) {
        tNav.push({ label: c.name, path: COMPILED[id] });
        compiled++;
        continue;
      }

      const file = `${vDir}/${tDir}/ch-${String(c.no).padStart(2, '0')}-${slug(c.name, 44)}.md`;
      const abs = join(BOOK_DIR, file);
      tNav.push({ label: c.name, path: file });

      if (existsSync(abs)) { skipped++; continue; }

      const body = [
        '---',
        `id: ${id}`,
        `name: ${c.name.includes(':') ? JSON.stringify(c.name) : c.name}`,
        'status: stub',
        'owns: []',
        'sections: []',
        '---',
        '',
        `# ${c.name}`,
        '',
        '!!! note "Not yet written"',
        '',
        '    This Chapter is part of the agreed structure of the codex but has not',
        '    yet been researched or drafted. Nothing is written here until it has a',
        '    source, so the page is empty rather than filled with placeholder prose.',
        '',
      ];

      if (c.proposed.length) {
        body.push(
          '## Planned Sections',
          '',
          'Indicative, not binding. A Chapter carries two to five Sections depending on',
          'what the sources actually support — this list is the researched starting plan,',
          'and it will change where the material demands it.',
          '',
          ...c.proposed.map(p => `- ${p}`),
          '',
        );
      }

      if (!dry) {
        mkdirSync(dirname(abs), { recursive: true });
        writeFileSync(abs, body.join('\n'), 'utf8');
      }
      created++;
    }

    vNav.push({ label: `Title ${t.no} — ${t.name}`, children: tNav });
  }

  nav.push({ label: vLabel, children: vNav });
}

// --- render nav YAML ------------------------------------------------------

function esc(s) {
  // Quote anything YAML would misread as structure.
  return /[:#{}\[\]&*!|>'"%@`]/.test(s) ? JSON.stringify(s) : s;
}

const navLines = [NAV_START];
for (const v of nav) {
  navLines.push(`  - ${esc(v.label)}:`);
  for (const t of v.children) {
    navLines.push(`      - ${esc(t.label)}:`);
    for (const c of t.children) {
      navLines.push(`          - ${esc(c.label)}: ${c.path}`);
    }
  }
}
navLines.push('  - Bibliography: appendix/bibliography.md');
navLines.push(NAV_END);

if (!dry) {
  const cfg = readFileSync(MKDOCS, 'utf8');
  const s = cfg.indexOf(NAV_START);
  const e = cfg.indexOf(NAV_END);
  if (s === -1 || e === -1) {
    console.error(`\n  ! Could not find the nav markers in mkdocs.yml.`);
    console.error(`    Expected these two lines to exist:\n      ${NAV_START}\n      ${NAV_END}`);
    process.exit(1);
  }
  const next = cfg.slice(0, s) + navLines.join('\n') + cfg.slice(e + NAV_END.length);
  writeFileSync(MKDOCS, next, 'utf8');
}

console.log(`  Chapters created   ${created}`);
console.log(`  Already existed    ${skipped} (left untouched)`);
console.log(`  Compiled pages     ${compiled} (Appendix A Title 2 — generated, not stubbed)`);
console.log(`  Nav entries        ${nav.length} Volumes -> ${titleCount} Titles -> ${chapterCount} Chapters`);
console.log(dry ? '\n  --dry: nothing written\n' : `\n  Wrote stubs to book/ and the nav block in mkdocs.yml\n`);

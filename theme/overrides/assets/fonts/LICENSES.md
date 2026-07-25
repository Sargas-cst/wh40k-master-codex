# Font licences

The typefaces in this directory are redistributed with this project under their
own open licences. They are self-hosted so that the site makes no third-party
request on page load.

None of these faces imitates Games Workshop's brand typography. They are
independent, openly licensed families chosen for genre suitability.

| Family | Licence | Role |
|---|---|---|
| Grenze Gotisch | SIL Open Font License 1.1 | Chapter titles. Blackletter — the cathedral half of the Imperium. |
| Big Shoulders Stencil Display | SIL Open Font License 1.1 | Section headings, eyebrows, badges, all UI labels. Industrial stencil — the factory-floor half. |
| Vollkorn | SIL Open Font License 1.1 | Body prose. Sturdy and slightly rough — grimdark without fighting the reader across 250,000 words. |
| Share Tech Mono | SIL Open Font License 1.1 | The citation apparatus, registries and source keys. Cogitator output. |

## SIL Open Font License 1.1

Full licence text: <https://openfontlicense.org/open-font-license-official-text/>

Each family is also published with its licence in the Google Fonts repository,
e.g. <https://github.com/google/fonts/blob/main/ofl/vollkorn/OFL.txt>.

Under OFL 1.1 these fonts may be used, studied, modified and redistributed
freely, including bundled with a work such as this one. The Reserved Font Names
may not be used for modified versions — no font here has been modified; the
woff2 files are the upstream Google Fonts builds, subset to `latin` and
`latin-ext` by Google's own service.

## Regenerating

```bash
node frame/fetch-fonts.mjs
```

That rewrites `assets/stylesheets/fonts.css` and this file.

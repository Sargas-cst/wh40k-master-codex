"""
MkDocs build hooks.

CACHE BUSTING FOR extra_css / extra_javascript
----------------------------------------------
Material fingerprints its own bundles — main.ec1eaa64.min.css — so a new release
gets a new URL and browsers fetch it. Files listed in `extra_css` do NOT get that
treatment: they keep whatever name you gave them.

GitHub Pages serves them with `Cache-Control: max-age=600`, so after any style
change a returning visitor keeps the old stylesheet until their cache expires,
and a normal reload will not necessarily pick it up. The symptom is a deploy that
demonstrably contains the change while the reader sees nothing — which is exactly
what happened, twice, before this hook existed.

This appends a short content hash to each asset URL at build time:

    assets/stylesheets/codex.css  ->  assets/stylesheets/codex.css?v=3f9a1c2b

The hash changes only when the file's bytes change, so caching still works
normally; it just cannot serve a stale version. Nothing on disk is rewritten,
so the repository stays clean.
"""

import hashlib
import os


def _fingerprint(config, entries, label):
    """Return `entries` with ?v=<hash> appended, hashing from the source tree."""
    out = []
    roots = [
        config.get("theme").custom_dir if config.get("theme") else None,
        config.get("docs_dir"),
    ]
    roots = [r for r in roots if r]

    for entry in entries:
        # Leave absolute URLs and anything already carrying a query alone.
        if entry.startswith(("http://", "https://", "//")) or "?" in entry:
            out.append(entry)
            continue

        digest = None
        for root in roots:
            path = os.path.join(root, entry)
            if os.path.isfile(path):
                with open(path, "rb") as fh:
                    digest = hashlib.sha256(fh.read()).hexdigest()[:8]
                break

        if digest is None:
            # Not found in either root — pass it through untouched rather than
            # inventing a hash and breaking the link.
            print(f"  [cache-bust] {label}: could not locate {entry}, left as-is")
            out.append(entry)
            continue

        out.append(f"{entry}?v={digest}")
    return out


def on_config(config, **kwargs):
    if config.get("extra_css"):
        config["extra_css"] = _fingerprint(config, config["extra_css"], "extra_css")
    if config.get("extra_javascript"):
        config["extra_javascript"] = _fingerprint(
            config, config["extra_javascript"], "extra_javascript"
        )
    return config

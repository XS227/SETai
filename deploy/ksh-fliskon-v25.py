#!/usr/bin/env python3
"""KSH / Fliskonkurrenten v25: keep catalogue and outlet inside SETAEI proposal.

Run on the authorized SETAEI VPS. Preserves existing catalogue, scripts and footer.
Only edits /var/www/setai/ksh/fliskonkurrenten/index.html.
"""
from pathlib import Path
from datetime import datetime, timezone
import re

P = Path("/var/www/setai/ksh/fliskonkurrenten/index.html")
CSS_MARK = 'id="ksh-v25-black-header"'

CSS = r"""
<style id="ksh-v25-black-header">
/* Black presentation header so the existing white Fliskonkurrenten logo is legible. */
html body[data-ksh-brand="fliskonkurrenten"] .topbar,
html body[data-ksh-brand="fliskonkurrenten"] header.nav {
  background:#171718!important;
  color:#f8f6f2!important;
  border-color:#373536!important;
  box-shadow:0 4px 20px rgba(0,0,0,.16)!important;
}
html body[data-ksh-brand="fliskonkurrenten"] .topbar,
html body[data-ksh-brand="fliskonkurrenten"] .topbar a,
html body[data-ksh-brand="fliskonkurrenten"] header.nav .logo,
html body[data-ksh-brand="fliskonkurrenten"] header.nav .logo small,
html body[data-ksh-brand="fliskonkurrenten"] header.nav .navlinks a,
html body[data-ksh-brand="fliskonkurrenten"] header.nav .nav-actions .tel {
  color:#f8f6f2!important;
}
html body[data-ksh-brand="fliskonkurrenten"] header.nav .navlinks a:hover,
html body[data-ksh-brand="fliskonkurrenten"] header.nav .navlinks .outletlink {
  color:#d7b391!important;
}
html body[data-ksh-brand="fliskonkurrenten"] header.nav .btn.btn-dark {
  background:#cfb08e!important;color:#1a1715!important;border-color:#cfb08e!important;
}
html body[data-ksh-brand="fliskonkurrenten"] header.nav .hamb{
  color:#fff!important;border-color:rgba(255,255,255,.3)!important;
}
html body[data-ksh-brand="fliskonkurrenten"] header.nav .navlinks {
  background:#171718!important;
}
@media (max-width:850px) {
  html body[data-ksh-brand="fliskonkurrenten"] header.nav .navlinks {
    border-color:#3d3936!important;
    box-shadow:0 19px 30px rgba(0,0,0,.28)!important;
  }
  html body[data-ksh-brand="fliskonkurrenten"] header.nav .navlinks a {
    color:#f8f6f2!important;
    border-color:rgba(255,255,255,.14)!important;
  }
}
</style>
"""

def main():
    before = P.read_text(encoding="utf-8")
    after = before
    changes = []
    link_fixes = [
        ("https://fliskonkurrenten.no/nettbutikk/", "/ksh/fliskonkurrenten/varer/", "shop"),
        ("https://fliskonkurrenten.no/product-category/outlet/", "/ksh/fliskonkurrenten/outlet/", "outlet"),
    ]
    for old_url, new_url, kind in link_fixes:
        # Both rel/target attribute orders are used across the existing HTML.
        pattern = re.compile(r'href="' + re.escape(old_url) +
                             r'"(?:\s+(?:target="_blank"|rel="noopener"))*')
        after, n = pattern.subn('href="' + new_url + '"', after)
        if n:
            changes.append(f"{kind} links: {n}")
    if CSS_MARK not in after:
        assert "</head>" in after, "Head close tag missing"
        after = after.replace("</head>", CSS + "\n</head>", 1)
        changes.append("black header + responsive menu styles")
    assert "<section" in after
    assert 'href="/ksh/fliskonkurrenten/varer/"' in after
    assert 'href="/ksh/fliskonkurrenten/outlet/"' in after
    assert CSS_MARK in after
    assert 'https://fliskonkurrenten.no/nettbutikk/' not in after
    assert 'https://fliskonkurrenten.no/product-category/outlet/' not in after
    assert after.count(CSS_MARK) == 1, "Duplicate style block"
    if after == before:
        print("Already up to date – no changes.")
        return
    backup = P.with_name("index.html.backup-ksh-v25-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ"))
    backup.write_text(before, encoding="utf-8")
    P.write_text(after, encoding="utf-8")
    print("Updated:", P)
    print("Backup:", backup)
    print("Changes:", ", ".join(changes))
    print("Bytes:", len(after.encode("utf-8")))

if __name__ == "__main__":
    main()

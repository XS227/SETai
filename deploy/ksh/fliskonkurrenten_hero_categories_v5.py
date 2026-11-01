#!/usr/bin/env python3
"""Deploy KSH Fliskonkurrenten homepage v5: editorial hero and accessible category cards."""
from pathlib import Path
from datetime import datetime, timezone
import shutil
import urllib.request

site = Path("/var/www/setai/ksh/fliskonkurrenten")
page = site / "index.html"
assets = site / "assets"
new_hero = assets / "ksh-hero-v5.jpg"
new_css = assets / "ksh-home-v5.css"

url = "https://cdn.sanity.io/images/t1bbgubc/production-v2/50a02783d7f9dad58b6c921520b6ce5e72742469-5000x3334.jpg?fit=max&w=2300&q=83&fm=jpg"
if not new_hero.exists():
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=25) as response:
        data = response.read()
        content_type = response.headers.get("Content-Type", "")
    if not content_type.startswith("image/") or len(data) < 120000:
        raise RuntimeError("Hero image invalid: " + content_type)
    new_hero.write_bytes(data)
    new_hero.chmod(0o644)
    print("HERO", len(data), content_type)
else:
    print("HERO_EXISTS", new_hero.stat().st_size)

css = """
/* SETAEI KSH | HOMEPAGE-V5 | 2026-11-01 */
/* Architectural lifestyle photo rather than a tile chart with printed labels */
body[data-ksh-brand="fliskonkurrenten"] .hero .hero-img {
  background-image: url("/ksh/fliskonkurrenten/assets/ksh-hero-v5.jpg") !important;
  background-position: 57% 52%;
  background-repeat: no-repeat;
  background-size: cover;
}
body[data-ksh-brand="fliskonkurrenten"] .hero::after {
  background:
    linear-gradient(90deg,rgba(12,15,15,.87) 0%,rgba(14,16,16,.77) 26%,rgba(14,16,16,.48) 51%,rgba(14,16,16,.08) 100%),
    linear-gradient(0deg,rgba(11,13,13,.46) 0%,transparent 32%);
}
body[data-ksh-brand="fliskonkurrenten"] .hero .wrap {
  padding-block: clamp(45px,7vh,95px);
  box-sizing:border-box;
}
body[data-ksh-brand="fliskonkurrenten"] .hero h1 {
  text-wrap: balance;
  max-width: 940px;
  text-shadow: 0 2px 20px rgba(0,0,0,.14);
}
body[data-ksh-brand="fliskonkurrenten"] .hero p {
  max-width: 540px;
  color: #f0f0ed;
}
/* A real solid-text area below every category photo: no overlapping typography */
body[data-ksh-brand="fliskonkurrenten"] #kategorier .cat:not(.outletcat) {
  display:flex;
  flex-direction:column;
  justify-content:flex-end;
  background:#20221f;
  isolation:isolate;
}
body[data-ksh-brand="fliskonkurrenten"] #kategorier .cat:not(.outletcat) > img {
  display:block;
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
  object-fit:cover;
  z-index:-2;
}
body[data-ksh-brand="fliskonkurrenten"] #kategorier .cat:not(.outletcat)::after {
  background: linear-gradient(180deg,rgba(0,0,0,0) 0%,rgba(0,0,0,.06) 52%,rgba(0,0,0,.28) 100%);
}
body[data-ksh-brand="fliskonkurrenten"] #kategorier .cat:not(.outletcat) .cat-content {
  position:relative;
  inset:auto;
  z-index:1;
  display:flex;
  flex-direction:column;
  gap:8px;
  width:100%;
  margin-top:auto;
  padding:23px 28px 24px;
  background:#191c1a;
  box-sizing:border-box;
  min-height:154px;
  box-shadow:0 -1px 0 rgba(255,255,255,.06);
}
body[data-ksh-brand="fliskonkurrenten"] #kategorier .cat:not(.outletcat) .cat-content h3 {
  margin:0;
  color:#fff;
  font-size:clamp(30px,3.1vw,42px);
  line-height:1.13;
  letter-spacing:-.045em;
  overflow-wrap:anywhere;
}
body[data-ksh-brand="fliskonkurrenten"] #kategorier .cat:not(.outletcat) .cat-content .eyebrow {
  color:#d5ac98;
  font-size:10px;
  font-weight:700;
  letter-spacing:.14em;
}
body[data-ksh-brand="fliskonkurrenten"] #kategorier .cat:not(.outletcat) .cat-content p {
  margin:0;
  padding-right:clamp(35px,5vw,67px);
  color:#e1e4df;
  line-height:1.55;
  font-size:13px;
  max-width:620px;
  text-wrap:pretty;
}
body[data-ksh-brand="fliskonkurrenten"] #kategorier .cat:not(.outletcat) .go {
  position:absolute;
  bottom:20px;
  right:20px;
  width:42px;
  height:42px;
  color:#fff;
  border:1px solid rgba(255,255,255,.68);
  background:rgba(255,255,255,.04);
  transition:background .2s ease;
}
body[data-ksh-brand="fliskonkurrenten"] #kategorier .cat:not(.outletcat):hover .go {
  background:rgba(255,255,255,.2);
}
body[data-ksh-brand="fliskonkurrenten"] #kategorier .cat:not(.outletcat) img {
  object-position:center 40%;
}
@media (max-width:1250px) {
  /* The v13 header needs a fold/tablet breakpoint, not desktop navigation overflow */
  body[data-ksh-brand="fliskonkurrenten"] .ksh2-head .ksh2-nav {
    display:none !important;
  }
  body[data-ksh-brand="fliskonkurrenten"] .ksh2-head .ksh2-toggle {
    display:flex !important;
    align-items:center;
    justify-content:center;
    flex:none;
    margin-left:auto;
  }
  body[data-ksh-brand="fliskonkurrenten"] .ksh2-head .ksh2-shop {
    display:none !important;
  }
  body[data-ksh-brand="fliskonkurrenten"] .ksh2-head[data-open="true"] .ksh2-nav {
    display:flex !important;
    position:absolute;
    top:100%;
    left:0;
    right:0;
    width:100%;
    max-height:min(72svh,680px);
    overflow-y:auto;
    flex-direction:column;
    align-items:stretch;
    background:#f6f5f0;
    color:#191b1b;
    box-shadow:0 20px 44px rgba(0,0,0,.18);
    padding:14px 22px 22px;
    box-sizing:border-box;
    z-index:50;
  }
  body[data-ksh-brand="fliskonkurrenten"] .ksh2-head[data-open="true"] .ksh2-nav a {
    color:#1b1e1b;
    display:block;
    width:100%;
    border-bottom:1px solid #d5d6d2;
    padding:13px 12px;
    box-sizing:border-box;
  }
}
@media (max-width:720px) {
  body[data-ksh-brand="fliskonkurrenten"] .hero .hero-img {
    background-position:63% center;
  }
  body[data-ksh-brand="fliskonkurrenten"] .hero::after {
    background:linear-gradient(90deg,rgba(11,13,13,.89),rgba(11,13,13,.55) 65%,rgba(11,13,13,.24)),
      linear-gradient(0deg,rgba(12,13,13,.34),transparent 52%);
  }
  body[data-ksh-brand="fliskonkurrenten"] .hero {
    min-height:min(670px,86svh);
  }
  body[data-ksh-brand="fliskonkurrenten"] #kategorier .cat:not(.outletcat) {
    min-height:405px;
  }
  body[data-ksh-brand="fliskonkurrenten"] #kategorier .cat:not(.outletcat) .cat-content {
    padding:21px 20px 22px;
    min-height:150px;
  }
  body[data-ksh-brand="fliskonkurrenten"] #kategorier .cat:not(.outletcat) .cat-content h3 {
    font-size:34px;
  }
  body[data-ksh-brand="fliskonkurrenten"] #kategorier .cat:not(.outletcat) .cat-content p {
    padding-right:55px;
    font-size:12.5px;
  }
  body[data-ksh-brand="fliskonkurrenten"] #kategorier .cat:not(.outletcat) .go {
    bottom:18px;
    right:17px;
  }
}
@media (max-width:355px) {
  body[data-ksh-brand="fliskonkurrenten"] #kategorier .cat:not(.outletcat) .cat-content h3{font-size:30px}
  body[data-ksh-brand="fliskonkurrenten"] #kategorier .cat:not(.outletcat) .cat-content{padding-inline:16px}
}
@media(prefers-reduced-motion:reduce){
  body[data-ksh-brand="fliskonkurrenten"] #kategorier .cat img{transition:none!important}
}
""".strip() + "\n"

new_css.write_text(css, encoding="utf-8")
new_css.chmod(0o644)
original = page.read_text(encoding="utf-8")
marker = '<link rel="stylesheet" href="/ksh/fliskonkurrenten/assets/ksh-home-v5.css?v=5">'
if marker in original:
    print("PAGE_ALREADY_UPDATED")
else:
    assert original.count("</head>")==1
    assert "ksh-v13/entry.css" in original
    backup = page.with_name("index.html.bak.hero-cat-v5-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ"))
    shutil.copy2(page,backup)
    updated = original.replace("</head>", marker + "</head>", 1)
    tmp = page.with_name("index.html.tmp.hero-category")
    tmp.write_text(updated, encoding="utf-8")
    tmp.chmod(0o644)
    tmp.replace(page)
    print("PUBLISHED",page,"BACKUP",backup)
print("ASSET",new_hero,new_hero.stat().st_size)
print("STYLE",new_css,new_css.stat().st_size)

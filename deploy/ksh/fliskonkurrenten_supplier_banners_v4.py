#!/usr/bin/env python3
"""SETAEI KSH: five supplier banners with authentic supplier logos and imagery."""
from pathlib import Path
from datetime import datetime, timezone
import html
import re
import urllib.request
import shutil

BASE = Path("/var/www/setai/ksh/fliskonkurrenten")
PAGE = BASE / "index.html"
ASSETS = BASE / "assets" / "suppliers-v4"
ASSETS.mkdir(parents=True, exist_ok=True)

IMAGES = {
    "cosentino": ("cosentino.jpg", "https://assetstools.cosentino.com/api/v1/bynder/image/BDD79DB4-E2D9-4F3B-9394A6268CC59A9E/michael-ohayon.jpg?w=1400&h=1100"),
    "inr": ("inr.jpg", "https://www.inr.no/contentassets/b8e9c093cca84aa488c505f8bde69ddf/meny-duschlist.jpg?maxwidth=1100&maxheight=1100&mode=crop&format=jpg&quality=80"),
    "korsbakken": ("korsbakken.webp", "https://cdn.sanity.io/images/t1bbgubc/production-v2/b440d985a5f5319bbf8e29abd797b82fc7a94275-4000x2857.png?fit=max&auto=format&w=1500&q=78"),
    "minera": ("minera.jpg", "https://mineraskifer.no/app/uploads/2021/06/Offerdalskifer-flis-entre-gang-hall_oss2.jpeg"),
    "vedum": ("vedum.jpg", "https://www.vedum.no/globalassets/bad/miljoer/free/free-900-edit-dimgron/219/vedum_badrum_free_900_edit_dimgron_00_2025_toppbild.jpg?w=1600&q=80&a=4:3&f=jpg"),
}
LOGOS = {
    "cosentino": ("logo-cosentino.png", "https://images.seeklogo.com/logo-png/39/1/cosentino-logo-png_seeklogo-397008.png"),
    "inr": ("logo-inr.svg", "https://www.inr.no/Content/images/inr-logo.svg"),
    "korsbakken": ("logo-korsbakken.png", "https://baderingen.no/wp-content/uploads/2026/09/Korsbakken-Bad-copy.png"),
    "minera": ("logo-minera.svg", "https://mineraskifer.no/app/themes/minera-skifer/assets/profiles/minera/logo.svg"),
    "vedum": ("logo-vedum.svg", "https://www.vedum.se/resources/images/vedum-logo.svg"),
}

def fetch(name, filename, url):
    path = ASSETS / filename
    if path.exists() and path.stat().st_size > 1500:
        print("EXISTS", name, filename, path.stat().st_size)
        return
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (SETAEI KSH supplier presentation)", "Accept": "image/jpeg,image/png,image/webp,image/svg+xml,*/*;q=0.8"})
    with urllib.request.urlopen(req, timeout=25) as response:
        data = response.read()
        mime = response.headers.get("Content-Type", "")
    if not mime.startswith("image/") or len(data) < 700:
        raise RuntimeError("Invalid supplier asset: " + name + " " + mime)
    path.write_bytes(data)
    print("FETCHED", name, filename, len(data), mime)

for key, (filename, url) in IMAGES.items():
    fetch(key, filename, url)
for key, (filename, url) in LOGOS.items():
    fetch(key, filename, url)

SUPPLIERS = [
    ("cosentino", "Cosentino", "01", "ARKITEKTONISKE OVERFLATER", "Design som setter spor.", "Dekton, Silestone og uttrykksfulle overflater.", "COSENTINO"),
    ("inr", "INR", "02", "BADEROM & DUSJ", "Detaljene skaper helheten.", "Tidløse dusjløsninger og møbler til badet.", "INR"),
    ("korsbakken", "Korsbakken Bad", "03", "DESIGN TIL BADET", "Hver dag begynner her.", "Gjennomtenkte detaljer, innredning og armatur.", "KORSBAKKEN BAD"),
    ("minera", "Minera Skifer", "04", "NORSK NATURSTEIN", "Skapt av naturen.", "Skifer med ekte karakter, inne og ute.", "MINERA SKIFER"),
    ("vedum", "Vedum", "05", "SKANDINAVISK INNREDNING", "Rom for hverdagen.", "Baderom og vaskerom med varme og funksjon.", "VEDUM KÖK & BAD"),
]

cards = []
for key, name, number, label, heading, description, logoname in SUPPLIERS:
    image = IMAGES[key][0]
    logo = LOGOS[key][0]
    cards.append(f"""<a class="supplier supplier--{key}" href="https://fliskonkurrenten.no/leverandorer/" target="_blank" rel="noopener noreferrer" aria-label="Se {html.escape(name)} hos Fliskonkurrenten">
<img class="supplier-photo" src="assets/suppliers-v4/{image}" width="1200" height="940" loading="lazy" decoding="async" alt="Miljøbilde fra {html.escape(name)}">
<span class="supplier-topline"><span class="supplier-index">{number} / 05</span><span class="supplier-overline">UTVALGTE LEVERANDØRER</span></span>
<span class="supplier-brand"><img class="supplier-logo" src="assets/suppliers-v4/{logo}" loading="lazy" decoding="async" alt="{html.escape(logoname)} logo">{'<span class="supplier-brand-name">MINERA SKIFER</span>' if key == 'minera' else ''}</span>
<span class="supplier-info"><span class="supplier-category">{html.escape(label)}</span><h3>{html.escape(heading)}</h3><span class="supplier-desc">{html.escape(description)}</span><span class="supplier-action">Oppdag leverandøren <span aria-hidden="true">↗</span></span></span>
</a>""")

CSS = """
/* KSH-SUPPLIERS-V4 | independent supplier imagery / authentic logos */
#leverandorer .supplier-scroll{gap:16px;scroll-padding-inline:1px;overscroll-behavior-inline:contain;scrollbar-width:thin;-webkit-overflow-scrolling:touch}
#leverandorer .supplier{flex:0 0 clamp(320px,42vw,530px);width:auto;min-width:0;height:475px;border-radius:3px;background:#34312c;isolation:isolate;box-shadow:0 1px 2px rgba(0,0,0,.05)}
#leverandorer .supplier img.supplier-photo{display:block;position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;transition:transform 1s cubic-bezier(.2,.7,.2,1);z-index:-2}
#leverandorer .supplier:after{content:"";pointer-events:none;position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.27) 0%,rgba(0,0,0,0) 36%,rgba(0,0,0,.14) 48%,rgba(0,0,0,.88) 100%);z-index:-1}
#leverandorer .supplier:hover img.supplier-photo{transform:scale(1.045)}
#leverandorer .supplier-topline{position:absolute;top:22px;left:25px;right:25px;display:flex;justify-content:space-between;gap:10px;align-items:center;color:#fff;letter-spacing:.17em;font:600 10px/1.3 Manrope,Arial,sans-serif;text-shadow:0 1px 4px rgba(0,0,0,.3)}
#leverandorer .supplier-index{border:1px solid rgba(255,255,255,.58);padding:8px 10px}
#leverandorer .supplier-brand{position:absolute;top:74px;left:25px;display:flex;align-items:center;gap:10px;max-width:calc(100% - 50px);padding:13px 17px;background:rgba(255,255,255,.96);color:#121212;border-radius:2px;box-shadow:0 5px 24px rgba(0,0,0,.07)}
#leverandorer .supplier img.supplier-logo{width:auto;height:auto;max-width:206px;max-height:46px;object-fit:contain;transform:none!important;filter:none}
#leverandorer .supplier--minera img.supplier-logo{max-width:42px;max-height:42px}
#leverandorer .supplier-brand-name{font:650 14px/1.2 Manrope,Arial,sans-serif;letter-spacing:.05em;white-space:nowrap}
#leverandorer .supplier-info{position:absolute;left:27px;right:27px;bottom:27px;z-index:2;display:flex;flex-direction:column;align-items:flex-start;gap:9px}
#leverandorer .supplier-category{font:650 10px/1.35 Manrope,Arial,sans-serif;color:#e0c3a5;letter-spacing:.19em}
#leverandorer .supplier-info h3{font:500 clamp(29px,3.1vw,39px)/1.09 Manrope,Arial,sans-serif;letter-spacing:-.045em;color:#fff;margin:2px 0 0;max-width:420px;text-wrap:balance}
#leverandorer .supplier-desc{font:400 13px/1.5 Manrope,Arial,sans-serif;color:rgba(255,255,255,.87);max-width:350px}
#leverandorer .supplier-action{display:flex;align-items:center;justify-content:space-between;gap:22px;min-width:208px;border-bottom:1px solid rgba(255,255,255,.65);padding:10px 0 9px;margin-top:8px;font:600 11px/1.35 Manrope,Arial,sans-serif;color:#fff;letter-spacing:.02em}
#leverandorer .supplier-action span{font-size:20px;line-height:1}
#leverandorer .supplier--minera .supplier-category{color:#d5decd}
#leverandorer .supplier--vedum .supplier-category{color:#f0d6b5}
#leverandorer .supplier--inr .supplier-category{color:#eedacb}
#leverandorer .supplier-photo-credit{display:block;font-size:11px;line-height:1.5;color:#8a8883;margin-top:9px}
@media(max-width:750px){
#leverandorer .supplier{flex-basis:min(83vw,415px);height:460px}
#leverandorer .supplier-info h3{font-size:clamp(28px,6vw,36px)}
#leverandorer .supplier-brand{top:65px;left:20px;padding:11px 14px}
#leverandorer .supplier-topline{left:20px;right:20px;top:18px}
#leverandorer .supplier-info{left:21px;right:21px;bottom:21px}
}
@media(max-width:420px){
#leverandorer .supplier{flex-basis:calc(100vw - 50px);height:min(110vw,430px)}
#leverandorer .supplier-overline{font-size:9px;letter-spacing:.10em}
#leverandorer .supplier-brand img.supplier-logo{max-width:170px;max-height:38px}
#leverandorer .supplier-desc{font-size:12px}
}
@media(prefers-reduced-motion:reduce){#leverandorer .supplier img.supplier-photo{transition:none!important}}
"""

page = PAGE.read_text(encoding="utf-8")
if 'KSH-SUPPLIERS-V4' in page:
    print("Already installed; no page changes")
    raise SystemExit(0)
opening = '<div class="supplier-scroll" id="supplier-scroll">'
ending = '</div><div style="display:flex;justify-content:space-between'
start = page.index(opening)
stop = page.index(ending, start)
replacement = opening + "\n" + "\n".join(cards) + "\n"
page = page[:start] + replacement + page[stop:]
page = page.replace('</style>', CSS + '</style>', 1)
credit_marker = '<span>Dra sidelengs for flere leverandører →</span>'
assert credit_marker in page
page = page.replace('</div></div></section>\n<section class="feature">', '</div><small class="supplier-photo-credit">Miljøfoto: Cosentino, INR, Korsbakken Bad, Minera Skifer og Vedum.</small></div></section>\n<section class="feature">', 1)
assert page.count('class="supplier supplier--') == 5
assert page.count("KSH-SUPPLIERS-V4") == 1
backup = PAGE.with_name("index.html.bak.supplier-v4-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ"))
shutil.copy2(PAGE, backup)
temp = PAGE.with_name("index.html.tmp.suppliers")
temp.write_text(page, encoding="utf-8")
temp.chmod(0o644)
temp.replace(PAGE)
print("PUBLISHED", PAGE, "backup", backup, "cards", 5)

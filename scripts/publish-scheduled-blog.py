from pathlib import Path
from datetime import date
import shutil
root=Path("/var/www/setai"); queue=Path("/var/lib/setai-scheduled")
today=date.today().isoformat()
for d in list(queue.iterdir()):
    m=d/"meta.txt"
    if not m.exists(): continue
    publish,slug,title,cat,summary=m.read_text().split("|",4)
    if publish>today: continue
    target=root/"blog"/slug
    if target.exists(): shutil.rmtree(target)
    target.mkdir(parents=True)
    shutil.copy2(d/"index.html",target/"index.html")
    bp=root/"blog/index.html"; s=bp.read_text(); href=f"/blog/{slug}/"
    if href not in s:
        marker='<section id="seo">' if cat=="SEO" else ('<section id="saas">' if cat=="SaaS" else '<section id="automatisering">')
        idx=s.find(marker)
        if idx!=-1:
            tpos=s.find('<div class="timeline">',idx)+len('<div class="timeline">')
            card=f'\n<div class="tl-item"><span class="tl-dot" aria-hidden="true"></span><a class="tl-content" href="{href}"><span class="cat">{cat}</span><div class="meta">{publish}</div><h3>{title}</h3><p>{summary}</p><span class="tl-more">Les mer →</span></a></div>'
            s=s[:tpos]+card+s[tpos:]; bp.write_text(s)
    sm=root/"sitemap.xml"; x=sm.read_text(); url=f"https://setai.no/blog/{slug}/"
    if url not in x:
        x=x.replace("</urlset>",f'  <url><loc>{url}</loc><lastmod>{publish}</lastmod></url>\n</urlset>'); sm.write_text(x)
    shutil.rmtree(d)

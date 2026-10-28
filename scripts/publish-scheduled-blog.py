#!/usr/bin/env python3
"""Publish due articles and update the current blog layout before archiving a queue item."""
from pathlib import Path
from datetime import datetime, date
from zoneinfo import ZoneInfo
import argparse, fcntl, html, json, os, re, shutil, sys
import xml.etree.ElementTree as ET

ROOT = Path("/var/www/setai")
QUEUE = Path("/var/lib/setai-scheduled")
NS = "http://www.sitemaps.org/schemas/sitemap/0.9"

# Every published article must use the full blog template (header v4 with language switch,
# author box, footer, page background, translations, structured data). A stripped-down
# template (old text wordmark, no menu/language switch, no i18n) is rejected and left in the queue.
TEMPLATE_CHECKS = [
    ("header.site-nav", r'<header\b[^>]*class=["\'][^"\']*\bsite-nav\b'),
    ("header v4 stylesheet", r'/assets/css/setaei-header-v4\.css'),
    ("header v4 script", r'/assets/js/setaei-header-v4\.js'),
    ("brand stylesheet", r'/assets/css/setaei-brand-v2\.css'),
    ("blog stylesheet", r'/blog/blog-dark\.css'),
    ("language switch", r'class=["\']lang-switch["\']'),
    ("page-i18n stylesheet", r'/assets/i18n/page-i18n\.css'),
    ("translation pack (setaei-page-i18n)", r'<script\b[^>]*id=["\']setaei-page-i18n["\']'),
    ("page-i18n script", r'/assets/i18n/page-i18n\.js'),
    ("page background canvas", r'<canvas\b[^>]*id=["\']page-bg["\']'),
    ("page background script", r'/assets/home/page-bg\.js'),
    ("article body", r'class=["\']article-body["\']'),
    ("author box", r'class=["\']author-box["\']'),
    ("footer", r'<footer\b'),
    ("BlogPosting structured data", r'"@type"\s*:\s*"BlogPosting"'),
]
FORBIDDEN_MARKUP = [
    ("old text wordmark (SET<span>AEI</span>)", r'SET<span>AEI</span>'),
]

def validate_article_template(article):
    problems = [name for name, pattern in TEMPLATE_CHECKS if not re.search(pattern, article)]
    problems += [f"forbidden: {name}" for name, pattern in FORBIDDEN_MARKUP if re.search(pattern, article)]
    pack = re.search(r'<script\b[^>]*id=["\']setaei-page-i18n["\'][^>]*>(.*?)</script>', article, re.S)
    if pack:
        try:
            data = json.loads(pack[1])
            for lang in ("en", "fa"):
                if not isinstance(data.get(lang), dict) or len(data[lang]) < 10:
                    problems.append(f"translation pack missing or too small for '{lang}'")
        except ValueError:
            problems.append("translation pack is not valid JSON")
    return problems

def update_blog_index(source, publish, slug, title, category, summary):
    href = f"/blog/{slug}/"
    if not re.search(r'href=["\']' + re.escape(href) + r'["\']', source):
        sub = {"SEO": "seo", "SaaS": "saas", "Automatisering": "automatisering", "CTO": "cto"}.get(category)
        if sub is None:
            raise ValueError(f"Unsupported article category: {category}")
        marker = re.search(r'<div\b[^>]*\bclass="group"[^>]*\bdata-cat="bedrift"[^>]*>.*?<ul\b[^>]*\bclass="posts"[^>]*>', source, re.S)
        if marker is None:
            raise ValueError("Blog layout not recognized; article remains in the queue.")
        card = f'\n<li data-sub="{sub}"><a href="{href}"><h3>{html.escape(title)}</h3><span class="meta">{html.escape(category)} · {publish}<br>5 min</span><p>{html.escape(summary)}</p></a></li>'
        source = source[:marker.end()] + card + source[marker.end():]
    counts = {}
    for group in re.finditer(r'<div\b[^>]*\bclass="group"[^>]*\bdata-cat="([^"]+)"[^>]*>.*?<ul\b[^>]*\bclass="posts"[^>]*>(.*?)</ul>', source, re.S):
        counts[group[1]] = len(re.findall(r'<li\b', group[2]))
    if not counts:
        raise ValueError("Cannot determine blog article counts.")
    counts["alle"] = sum(counts.values())
    for cat, count in counts.items():
        source = re.sub(r'(<button\b[^>]*\bdata-cat="' + re.escape(cat) + r'"[^>]*>[^<]*<small>)\d+(</small>)', lambda m: m[1]+str(count)+m[2], source)
    source = re.sub(r'(<p class="count"[^>]*>)Viser alle \d+ artikler', lambda m: m[1]+f'Viser alle {counts["alle"]} artikler', source)
    def add_schema(m):
        obj = json.loads(m[1])
        if isinstance(obj, dict) and obj.get("@type") == "Blog":
            posts = obj.setdefault("blogPost", [])
            url = "https://setai.no" + href
            if not any(p.get("url") == url for p in posts):
                posts.insert(0, {"@type":"BlogPosting","headline":title,"url":url,"datePublished":publish})
            return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False) + '</script>'
        return m[0]
    return re.sub(r'<script type="application/ld\+json">(.*?)</script>', add_schema, source, flags=re.S)

def update_sitemap(source, publish, slug):
    tree = ET.fromstring(source)
    url = f"https://setai.no/blog/{slug}/"
    if not any(e.text == url for e in tree.findall(f".//{{{NS}}}loc")):
        source = source.replace("</urlset>", f"  <url><loc>{url}</loc><lastmod>{publish}</lastmod></url>\n</urlset>")
    ET.fromstring(source)
    return source

def atomic_write(path, content):
    temp = path.with_name(path.name+".publishing")
    temp.write_text(content)
    os.replace(temp, path)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--as-of", help="Date override is only allowed with --dry-run")
    args = parser.parse_args()
    if args.as_of and not args.dry_run:
        parser.error("--as-of requires --dry-run")
    today = date.fromisoformat(args.as_of) if args.as_of else datetime.now(ZoneInfo("Europe/Oslo")).date()
    QUEUE.mkdir(parents=True, exist_ok=True)
    rejected = 0
    with (QUEUE/".publish.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        for directory in sorted(p for p in QUEUE.iterdir() if p.is_dir()):
            metadata = directory/"meta.txt"
            if not metadata.exists():
                continue
            publish, slug, title, category, summary = metadata.read_text().strip().split("|",4)
            publish_date = date.fromisoformat(publish)
            if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug):
                raise ValueError("Unsafe article slug")
            if publish_date > today:
                print(f"NOT DUE {publish} {slug}", flush=True)
                continue
            article = (directory/"index.html").read_text()
            if f"https://setai.no/blog/{slug}/" not in article:
                raise ValueError("Article canonical does not match its queue metadata.")
            problems = validate_article_template(article)
            if problems:
                rejected += 1
                print(f"REJECTED {publish} {slug}: not the standard blog template; left in the queue. Problems: {'; '.join(problems)}", flush=True)
                continue
            index_path, sitemap_path = ROOT/"blog/index.html", ROOT/"sitemap.xml"
            new_index = update_blog_index(index_path.read_text(), publish, slug, title, category, summary)
            new_sitemap = update_sitemap(sitemap_path.read_text(), publish, slug)
            if args.dry_run:
                print(f"READY {publish} {slug}: article, blog listing, schema and sitemap validated; no files changed.", flush=True)
                continue
            target = ROOT/"blog"/slug
            target.mkdir(parents=True, exist_ok=True)
            backup = Path("/var/backups/setai-blog-publisher")/datetime.now(ZoneInfo("Europe/Oslo")).strftime("%Y%m%d-%H%M%S-%f")
            backup.mkdir(parents=True)
            for p in [target/"index.html", index_path, sitemap_path]:
                if p.exists():
                    dest = backup/p.relative_to(ROOT)
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(p,dest)
            atomic_write(target/"index.html",article)
            atomic_write(index_path,new_index)
            atomic_write(sitemap_path,new_sitemap)
            archive = Path("/var/lib/setai-scheduled-archive")
            archive.mkdir(parents=True,exist_ok=True)
            archive_target = archive/f"{publish}-{slug}-{backup.name}"
            shutil.move(str(directory), str(archive_target))
            print(f"PUBLISHED {publish} {slug}: article + listing + schema + sitemap; queue archived.",flush=True)
    return 1 if rejected else 0

if __name__ == "__main__":
    sys.exit(main())

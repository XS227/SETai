#!/usr/bin/env python3
"""Render public English results and SEO from the validated official archive."""
import argparse,datetime as dt,html,json,re,os
from pathlib import Path
from preview_gate import preview_gate

def read_js(path,prefix):
 s=path.read_text().strip();assert s.startswith(prefix);return json.loads(s[len(prefix):].rstrip(';'))
def atomic(path,text):
 temp=path.with_suffix(path.suffix+'.site-tmp');temp.write_text(text);os.chmod(temp,0o644);os.replace(temp,path)
def date_label(value):return dt.date.fromisoformat(value).strftime('%-d %B %Y')
def balls(numbers,stars=False):return ''.join(f'<span class="ball{ " star" if stars else ""}">{n}</span>' for n in numbers)
def table_row(r):return f'<tr><td class="result-date"><time datetime="{r["date"]}">{date_label(r["date"])}</time></td><td><div class="balls">{balls(r["main"])}</div></td><td><div class="balls">{balls(r["stars"],True)}</div></td></tr>'
def replace_block(text,name,content):
 start=f'<!-- {name}_START -->';end=f'<!-- {name}_END -->';assert text.count(start)==1 and text.count(end)==1
 return re.sub(re.escape(start)+r'.*?'+re.escape(end),lambda _:start+content+end,text,flags=re.S)
def build(public):
 h=read_js(public/'history.js','window.EJ_HISTORY=');rows=h['draws'];assert rows and rows[0]['date']=='2012-03-23';last=rows[-1]
 keys=set();previous=''
 for r in rows:
  assert r['date']>previous;previous=r['date'];assert len(r['main'])==5 and len(set(r['main']))==5 and len(r['stars'])==2 and len(set(r['stars']))==2
  keys.add(r['date'])
 latest=f'<section class="card latest-panel" aria-label="Latest EuroJackpot winning numbers"><div><div class="eyebrow">Latest recorded winning numbers</div><h2 id="latest-result-date"><time datetime="{last["date"]}">{date_label(last["date"])}</time></h2><a href="results.html">Full results archive ↗</a></div><div id="latest-result-balls" class="balls">{balls(last["main"])}<span class="plus" aria-hidden="true">★</span>{balls(last["stars"],True)}</div></section>'
 faqs=[('Can AI predict the EuroJackpot winning numbers?','AI can analyse past draws and generate testable selections. This lab has not established a reliable predictive advantage. In a fair independent draw, past outcomes do not determine the next winning line.'),('How many numbers do you choose in EuroJackpot?','A line contains five distinct main numbers from 1 to 50 and two distinct Euro numbers from 1 to 12. Draws take place on Tuesdays and Fridays.'),('Can the same EuroJackpot numbers be drawn again?','Yes. A previously drawn combination remains eligible. The history filter changes the suggested selection pool, not the lottery odds.'),('Can I buy a EuroJackpot ticket here?','No. SETAEI is an independent research and number-selection tool. Use a licensed lottery operator where you are eligible to play.')]
 graph={'@context':'https://schema.org','@graph':[{'@type':'WebSite','@id':'https://setai.no/EuroJackpot/#website','name':'SETAEI EuroJackpot Number Lab','url':'https://setai.no/EuroJackpot/','inLanguage':'en'},{'@type':'WebPage','@id':'https://setai.no/EuroJackpot/#webpage','url':'https://setai.no/EuroJackpot/','name':'EuroJackpot Winning Numbers, AI Picks & Numerology','inLanguage':'en','dateModified':h['fetchedAt'],'isPartOf':{'@id':'https://setai.no/EuroJackpot/#website'}},{'@type':'Dataset','name':'EuroJackpot winning-number archive','description':'Official drawn winning numbers, presented by SETAEI with source attribution to WestLotto. Main and Euro-number pools are kept separate.','url':'https://setai.no/EuroJackpot/results.html','temporalCoverage':rows[0]['date']+'/'+last['date'],'inLanguage':'en','isBasedOn':'https://www.westlotto.de/service/downloads/downloads.html'},{'@type':'FAQPage','mainEntity':[{'@type':'Question','name':q,'acceptedAnswer':{'@type':'Answer','text':a}} for q,a in faqs]}]}
 main=(public/'index.html').read_text();main=replace_block(main,'LATEST_RESULT',latest);main=replace_block(main,'ARCHIVE',''.join(table_row(r) for r in rows[-20:][::-1]));main=replace_block(main,'SEO_GRAPH','<script type="application/ld+json">'+json.dumps(graph,separators=(',',':')).replace('<','\\u003c')+'</script>')
 main=re.sub(r'(<strong id="draw-count">).*?(</strong>)',lambda m:m[1]+f'{len(rows):,}'+m[2],main);main=re.sub(r'(<strong id="latest-date">).*?(</strong>)',lambda m:m[1]+date_label(last['date'])+m[2],main)
 # Keep archive-derived summary numbers current as new rows arrive.
 for kind,fields in [('all7',('main','stars')),('main5',('main',)),('stars2',('stars',))]:
  groups={}
  for r in rows:
   key=tuple(tuple(sorted(r[f])) for f in fields);groups[key]=groups.get(key,0)+1
  repeated=sum(v>1 for v in groups.values());main=re.sub(r'(<strong id="repeat-'+kind+r'">).*?(</strong>)',lambda m:m[1]+str(repeated)+m[2],main)
 atomic(public/'index.html',preview_gate(main))
 years=sorted({r['date'][:4] for r in rows},reverse=True)
 archive=[]
 for y in years:
  rs=[r for r in rows if r['date'].startswith(y)]
  archive.append(f'<details id="year-{y}" class="archive-year"'+(' open' if y==years[0] else '')+f'><summary>{y} · {len(rs)} draws</summary><div class="table-scroll"><table class="archive-table"><thead><tr><th>Date</th><th>Main numbers</th><th>Euro numbers</th></tr></thead><tbody>'+''.join(table_row(r) for r in rs[::-1])+'</tbody></table></div></details>')
 page='''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EuroJackpot Winning Numbers &amp; Results Archive 2012–YEAR | SETAEI</title><meta name="description" content="Check every EuroJackpot winning-number result since 2012. Browse draw dates, five main numbers and two Euro numbers by year, from official WestLotto data."><link rel="canonical" href="https://setai.no/EuroJackpot/results.html"><meta name="robots" content="index,follow,max-image-preview:large"><meta property="og:title" content="EuroJackpot winning numbers and complete archive"><meta property="og:image" content="https://setai.no/EuroJackpot/social.png"><link rel="stylesheet" href="style.css?v=2"></head><body><header class="topbar"><div class="wrap nav"><a class="logo" href="/">SETAEI</a><nav class="navlinks"><a href="./#trekninger">Your ticket</a><a href="eksperiment.html">Research</a></nav></div></header><main class="wrap"><div class="hero"><div><div class="eyebrow">Official source. Open archive.</div><h1>EuroJackpot<br><em>winning numbers.</em></h1><p>Every recorded draw from 23 March 2012. Five main numbers, two Euro numbers, and the date they were drawn.</p></div><div class="orbit" aria-hidden="true"><div class="core">5+2<small>RESULTS SINCE 2012</small></div></div></div>LATEST<p>COUNT draws · Archive through LAST. The complete results below are available without JavaScript.</p><nav class="year-links" aria-label="Archive years">YEARS</nav>ARCHIVE<section style="margin-top:45px"><h2>How to read EuroJackpot results</h2><p>Main numbers come from 1–50. The Euro-number pool was 1–8 before 10 October 2014, 1–10 until March 2022, and 1–12 from 25 March 2022. The archive preserves the rules that applied to each draw.</p><p>Drawn numbers are recorded whether or not any player matched the jackpot. Use <a class="audit-link" href="./#gjentakelser">the repetition analysis</a> to compare complete combinations, main-number sets and Euro-number pairs.</p><p>Source: <a class="audit-link" href="https://www.westlotto.de/service/downloads/downloads.html" target="_blank" rel="noopener">WestLotto official results downloads</a>. Compare current outcomes with your licensed lottery operator before relying on a result.</p><a class="button-link" href="./#trekninger">Explore AI, mathematics and numerology lines →</a></section></main><footer><div class="wrap footerinner"><span>SETAEI · Independent number lab</span><a href="./">Back to the lab</a></div></footer></body></html>'''
 page=page.replace('YEARS',''.join(f'<a href="#year-{y}">{y}</a>' for y in years)).replace('YEAR',years[0]).replace('LATEST',latest).replace('COUNT',f'{len(rows):,}').replace('LAST',date_label(last['date'])).replace('ARCHIVE',''.join(archive))
 atomic(public/'results.html',preview_gate(page))
 research=read_js(public/'research.js','window.EJ_RESEARCH=') if (public/'research.js').exists() else {}
 meta={'drawCount':len(rows),'latestDate':last['date'],'fetchedAt':h['fetchedAt'],'announcedPots':research.get('announcedPots',[])}
 atomic(public/'site-data.js','window.EJ_SITE_DATA='+json.dumps(meta,separators=(',',':'))+';\n')
 print(f'English SEO/results refreshed: {len(rows)} draws through {last["date"]}')
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--public-dir',type=Path,required=True);build(parser.parse_args().public_dir)


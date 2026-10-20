#!/usr/bin/env python3
"""Collect official prize/count data and timestamp future advertised jackpots."""
import argparse, csv, datetime as dt, io, json, math, re, xml.etree.ElementTree as ET, zipfile
from decimal import Decimal
from pathlib import Path
from zoneinfo import ZoneInfo
import update_history as H

RESULTS='https://www.westlotto.de/eurojackpot/gewinnzahlen/gewinnzahlen.html'

def money(value,german=False):
    text=str(value or '').strip()
    if not text or text.lower() in ['unbesetzt','jackpot','-','--']:return None
    if german:text=text.replace('.','').replace(',','.')
    try:
        number=Decimal(text)
        if not number.is_finite() or number<0:raise ValueError('Invalid money')
        return float(number.quantize(Decimal('.01')))
    except Exception as exc:raise ValueError('Unrecognized money field: '+text) from exc

def count(value):
    text=str(value or '').strip().lower()
    if text in ['','-','--']:return None
    if text in ['jackpot','unbesetzt']:return 0
    n=int(text.replace('.',''))
    if n<0:raise ValueError('Negative winning count')
    return n

def col(number):
    out=''
    while number:
        number,r=divmod(number-1,26);out=chr(65+r)+out
    return out

def old_prizes(blob):
    z=zipfile.ZipFile(io.BytesIO(blob));w=zipfile.ZipFile(io.BytesIO(z.read('Eurojackpot.xlsx')))
    shared=[''.join(x.itertext()) for x in ET.fromstring(w.read('xl/sharedStrings.xml')).findall('s:si',H.NS)]
    output=[]
    for filename in w.namelist():
        if not re.fullmatch(r'xl/worksheets/sheet\d+\.xml',filename):continue
        for row in ET.fromstring(w.read(filename)).findall('.//s:row',H.NS):
            cells={}
            for c in row:
                v=c.find('s:v',H.NS)
                if v is not None:cells[re.sub(r'\d+','',c.get('r'))]=shared[int(v.text)] if c.get('t')=='s' else v.text
            if not all(k in cells for k in 'BDEFGHIJ'):continue
            try:date=(dt.date(1899,12,30)+dt.timedelta(days=int(float(cells['B'])))).isoformat()
            except ValueError:continue
            if not '2012-03-23'<=date<'2022-01-01':continue
            prizes=[]
            for rank in range(1,13):
                c=12+(rank-1)*2
                if col(c) not in cells or col(c+1) not in cells:raise ValueError('Missing prize cells '+date)
                prizes.append({'rank':rank,'winningRows':count(cells[col(c)]),'reportedEUR':money(cells[col(c+1)])})
            output.append({'date':date,'stakeEUR':money(cells.get('K')), 'prizes':prizes})
    return output

def new_prizes(blob):
    z=zipfile.ZipFile(io.BytesIO(blob));name=next(n for n in z.namelist() if n.lower().endswith('.csv'))
    output=[]
    for r in csv.reader(io.StringIO(z.read(name).decode('utf-8-sig',errors='replace')),delimiter=';'):
        if not r or not re.fullmatch(r'\d{2}\.\d{2}\.\d{4}',r[0].strip()):continue
        if len(r)<33:raise ValueError('Incomplete prize CSV row')
        date=dt.datetime.strptime(r[0].strip(),'%d.%m.%Y').date().isoformat()
        prizes=[{'rank':rank,'winningRows':count(r[9+(rank-1)*2]),'reportedEUR':money(r[10+(rank-1)*2],True)} for rank in range(1,13)]
        output.append({'date':date,'stakeEUR':money(r[8],True),'prizes':prizes})
    return output

def build(old,new):
    draws=H.validate(H.historic(old)+H.recent(new),dt.datetime.now(dt.timezone.utc).date())
    prize_rows={}
    for row in old_prizes(old)+new_prizes(new):
        if row['date'] in prize_rows and row!=prize_rows[row['date']]:raise ValueError('Conflicting prize rows')
        prize_rows[row['date']]=row
    for draw in draws:
        if draw['date'] not in prize_rows:raise ValueError('Missing prize row '+draw['date'])
        p=prize_rows[draw['date']];draw.update(p)
        if draw['date']=='2023-01-13' and draw['prizes'][0]['winningRows'] is None:
            draw['prizes'][0]['winningRows']=0
            draw['supplementarySource']='https://www.norsk-tipping.no/artikler/eurojackpot13012023'
            draw['supplementaryNote']='WestLotto CSV mangler førstepremiefeltet. Norsk Tipping bekrefter at ingen hadde 5+2 rette. Beløpsfeltet beholdes ukjent.'
        for item in draw['prizes']:
            wins=item['winningRows'];reported=item['reportedEUR']
            if wins is not None and wins>0 and reported is None:raise ValueError('Winning prize lacks amount')
            item['paidPerWinningRowEUR']=reported if wins else None
            item['totalPaidEUR']=None if wins is None else round(wins*reported,2) if wins else 0
        draw['jackpotWinningRows']=draw['prizes'][0]['winningRows']
        draw['jackpotTotalPaidEUR']=draw['prizes'][0]['totalPaidEUR']
    return draws

def announcement(html,draws,now):
    plain=re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',html))
    result_date=re.search(r'Ergebnisse vom (?:Dienstag|Freitag),? den (\d{2}\.\d{2}\.\d{4})',plain)
    if not result_date or dt.datetime.strptime(result_date[1],'%d.%m.%Y').date().isoformat()!=draws[-1]['date']:return None
    part=re.search(r'<!-- Start MegaJackpot.Anzeige -->(.*?)<!-- End MegaJackpot.Anzeige -->',html,re.S)
    if not part:return None
    weekday=re.search(r'class="prize-level__date">\s*(Dienstag|Freitag)',part[1])
    amount=re.search(r'class="prize-level__sum">\s*([\d.,]+)\s*</p>',part[1])
    if not weekday or not amount or 'Mio.' not in part[1]:return None
    date=dt.date.fromisoformat(draws[-1]['date'])+dt.timedelta(days=1)
    while date.weekday() not in [1,4]:date+=dt.timedelta(days=1)
    if date.weekday()!=({'Dienstag':1,'Freitag':4}[weekday[1]]):return None
    cutoff=dt.datetime.combine(date,dt.time(19),ZoneInfo('Europe/Oslo'))
    if now>=cutoff:return None
    return {'drawDate':date.isoformat(),'amountEUR':money(amount[1],True)*1_000_000,'observedAt':now.isoformat(),'sourceUrl':RESULTS,'type':'Offentlig annonsert før trekningen'}

def completed_fields(before,after,path=''):
    """Accept publication of previously unknown payouts, never revise known values."""
    if before==after:return []
    if before is None and after is not None:return [{'field':path,'before':None,'after':after}]
    if isinstance(before,dict) and isinstance(after,dict) and before.keys()==after.keys():
        return [change for key in before for change in completed_fields(before[key],after[key],path+'.'+key)]
    if isinstance(before,list) and isinstance(after,list) and len(before)==len(after):
        return [change for i,(a,b) in enumerate(zip(before,after)) for change in completed_fields(a,b,path+f'[{i}]')]
    raise ValueError('Published known value changed: '+path)

def main():
    a=argparse.ArgumentParser();a.add_argument('--output',type=Path,default=Path(__file__).parent/'research.js');a.add_argument('--archive-cache',type=Path);a.add_argument('--recent-cache',type=Path);a.add_argument('--banner-cache',type=Path);args=a.parse_args()
    old=args.archive_cache.read_bytes() if args.archive_cache else H.fetch(H.ARCHIVE)
    new=args.recent_cache.read_bytes() if args.recent_cache else H.fetch(H.RECENT)
    draws=build(old,new);now=dt.datetime.now(dt.timezone.utc);previous=None;completions=[]
    if args.output.exists():
        previous=json.loads(args.output.read_text().split('=',1)[1].strip().rstrip(';'))
        earlier={r['date']:r for r in previous['draws']}
        if len(draws)<len(earlier):raise ValueError('Research refresh would shorten history')
        for row in draws:
            if row['date'] in earlier and row!=earlier[row['date']]:
                before=earlier[row['date']]
                if any(before[k]!=row[k] for k in ['date','main','stars']):raise ValueError('Published winning numbers changed: '+row['date'])
                changes=completed_fields(before,row)
                completions.append({'date':row['date'],'observedAt':now.isoformat(),'reason':'Official source completed previously unknown prize fields','changes':changes})
    announcements=previous.get('announcedPots',[]) if previous else []
    status='Ingen ny bekreftet forhåndspott'
    try:
        html=args.banner_cache.read_text() if args.banner_cache else H.fetch(RESULTS).decode()
        seen=announcement(html,draws,now)
        if seen:
            if not any(x['drawDate']==seen['drawDate'] and x['amountEUR']==seen['amountEUR'] for x in announcements):announcements.append(seen)
            status='Forhåndspott kontrollert mot operatør'
    except Exception:status='Forhåndspott kunne ikke oppdateres; tidligere tidsstempler beholdt'
    cases=json.loads(Path(__file__).with_name('research_cases.json').read_text())
    data={'version':'research-data-v1','sourceUrl':'https://www.westlotto.de/service/downloads/downloads.html','currency':'EUR','fetchedAt':now.isoformat(),'draws':draws,'cases':cases,'announcedPots':announcements,'announcementStatus':status,
          'prizeCompletions':(previous.get('prizeCompletions',[]) if previous else [])+completions,
          'notes':['Premiebeløp fra resultatfilene er kjent etter trekningen. De brukes kun beskrivende, aldri som historisk forhåndspott.','Vinnertall, antall vinnerrekker og alle 12 premieklasser er hentet fra operatørens originalfiler.','Premieklassene følger kildens historiske rangering. Bare de tre øverste klassene brukes til sammenligning på tvers av regelendringer.','Bursdagshistoriene er et lite utvalg funnet via søk, ikke en representativ undersøkelse av alle vinnere.','Ukjente fødselsår og valgte stjernetall er null, ikke gjetninger.']}
    tmp=args.output.with_suffix('.tmp');tmp.write_text('window.EJ_RESEARCH='+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n');tmp.replace(args.output)
    counts={'zero':sum(r['jackpotWinningRows']==0 for r in draws),'one':sum(r['jackpotWinningRows']==1 for r in draws),'multiple':sum(r['jackpotWinningRows'] is not None and r['jackpotWinningRows']>1 for r in draws),'unknown':sum(r['jackpotWinningRows'] is None for r in draws)}
    print(json.dumps({'draws':len(draws),'winnerCounts':counts,'cases':len(cases),'announcementStatus':status}))

if __name__=='__main__':main()

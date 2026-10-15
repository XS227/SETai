#!/usr/bin/env python3
"""Official Norwegian draw history. No third-party or synthetic draw data."""
import concurrent.futures,datetime as dt,json,os,time,urllib.request
from pathlib import Path
ROOT=Path(os.environ.get('LOTTERY_LAB_ROOT',Path(__file__).resolve().parents[2]))
CONFIG={'lotto':dict(name='Lotto',folder='Lotto',n=34,k=7,special=0,weekday=5,start='2016-01-01',rulesUrl='https://www.norsk-tipping.no/artikler/testsisde-slik-spiller-du-lotto?returnPage=1'), 'vikinglotto':dict(name='Vikinglotto',folder='Vikinglotto',n=48,k=6,special=5,weekday=2,start='2021-06-09',rulesUrl='https://www.norsk-tipping.no/lotteri/vikinglotto/slik-spiller-du')}
def atomic(path,text):
 path.parent.mkdir(parents=True,exist_ok=True);tmp=path.with_suffix(path.suffix+'.tmp');tmp.write_text(text);os.chmod(tmp,0o644);os.replace(tmp,path)
def fetch(game,a,b):
 u=f'https://api.norsk-tipping.no/LotteryGameInfo/v2/api/results/{game}?fromDate={a}&toDate={b}'
 for attempt in range(3):
  try:
   req=urllib.request.Request(u,headers={'User-Agent':'SETAEI Number Lab/1.0 (official public results)'});data=json.load(urllib.request.urlopen(req,timeout=25));assert isinstance(data.get('gameResult'),list);return data['gameResult']
  except Exception:
   if attempt==2:raise
   time.sleep(attempt+1)
def collect(game):
 c=CONFIG[game];out=ROOT/c['folder']/'history.json';old=json.loads(out.read_text()) if out.exists() else {'draws':[]};today=dt.datetime.now(dt.timezone.utc).date();begin=dt.date.fromisoformat(old['draws'][-1]['date'])-dt.timedelta(days=14) if old['draws'] else dt.date.fromisoformat(c['start']);end=today+dt.timedelta(days=1);intervals=[]
 while begin<end:
  stop=min(begin+dt.timedelta(days=98),end);intervals.append((game,begin.isoformat(),stop.isoformat()));begin=stop
 found={r['date']:r for r in old['draws']};sourceRows=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as ex:
  for i,rows in enumerate(ex.map(lambda q:fetch(*q),intervals),1):
   sourceRows.extend(rows);print(game,'source batches',i,'/',len(intervals),flush=True)
 for item in sourceRows:
  if not item.get('isFinalized'):continue
  date=item['drawDate'][:10]
  if date<c['start'] or date>today.isoformat():continue
  numbers=item['winnerNumber'];main=sorted(int(x['number']) for x in numbers if x['type']==1);extra=[int(x['number']) for x in numbers if x['type']==2]
  assert len(main)==c['k'] and len(set(main))==c['k'] and all(1<=x<=c['n'] for x in main),(game,date,'main')
  assert len(extra)==1 and 1<=extra[0]<=(c['special'] or c['n']),(game,date,'extra')
  if not c['special']:assert extra[0] not in main
  assert dt.date.fromisoformat(date).weekday()==c['weekday'],(game,date,'weekday')
  r={'date':date,'main':main,'special':extra if c['special'] else [],'bonus':extra if not c['special'] else [],'drawId':item['drawId'],'prizes':[{'id':x['id'],'winners':int(x['winners']),'amountNOK':float(x['value'])} for x in item.get('prize',[]) if str(x.get('winners','')).isdigit()]}
  if date in found:assert all(found[date][k]==r[k] for k in ['main','special','bonus']),(game,date,'changed result')
  found[date]=r
 rows=sorted(found.values(),key=lambda r:r['date']);assert rows
 first=dt.date.fromisoformat(c['start']);first+=dt.timedelta(days=(c['weekday']-first.weekday())%7)
 expected=[]
 while first<=dt.date.fromisoformat(rows[-1]['date']):expected.append(first.isoformat());first+=dt.timedelta(days=7)
 assert [r['date'] for r in rows]==expected,(game,'missing weekly draws',sorted(set(expected)-set(found)))
 result={'game':game,'config':c,'fetchedAt':dt.datetime.now(dt.timezone.utc).isoformat(),'source':'https://api.norsk-tipping.no/LotteryGameInfo/v2/api/results/'+game,'coverageNote':'Official archive from '+rows[0]['date']+'; not a claim of complete history since game launch.','draws':rows}
 atomic(out,json.dumps(result,separators=(',',':'))+'\n');print(game,'COMPLETE',len(rows),rows[0]['date'],rows[-1]['date'],flush=True)
 return result
if __name__=='__main__':
 import sys
 for game in sys.argv[1:] or CONFIG:collect(game)

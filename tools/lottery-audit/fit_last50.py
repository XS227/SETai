#!/usr/bin/env python3
"""Answer-fitted lottery models: explicit hindsight, one-week-lagged features.

Never call per-result fitting a historical prediction. All known answers used
to choose coefficients are disclosed. The frozen replay also uses hindsight.
"""
import argparse,csv,datetime as dt,hashlib,itertools,json,math,os
from pathlib import Path
from zoneinfo import ZoneInfo
import numpy as np
from scipy.optimize import linprog

VERSION='inverse-polynomial-audit-v1'
POOLS=[('main',50,5),('stars',12,2)]
def read_js(p):return json.loads(p.read_text().split('=',1)[1].strip().rstrip(';'))
def terms(degree):return [e for e in itertools.product(range(degree+1),repeat=3) if 1<=sum(e)<=degree]
def cutoff(date):return (dt.date.fromisoformat(date)-dt.timedelta(days=7)).isoformat()
def features(history,field,n,k,limit):
 rows=[r for r in history if r['date']<=limit and (field=='main' or r['date']>='2022-03-25')]
 if len(rows)<50:raise ValueError('Insufficient eligible history')
 t=len(rows);p=k/n;counts=np.zeros(n);recent=np.zeros(n);last=np.full(n,-1)
 for i,r in enumerate(rows):
  for value in r[field]:counts[value-1]+=1;last[value-1]=i
 for r in rows[-50:]:
  for value in r[field]:recent[value-1]+=1
 gap=np.where(last<0,np.minimum(t,1/p),t-1-last)
 recent_z=np.clip((recent/50-p)/math.sqrt(p*(1-p)/50),-3,3)
 long=(counts+30*p)/(t+30);long_z=np.clip((long-p)/math.sqrt(p*(1-p)/(t+30)),-3,3)
 gap_scaled=np.clip(gap*p-1,-1,3)
 return np.stack([recent_z,long_z,gap_scaled],axis=1),{'cutoff':limit,'asOf':rows[-1]['date'],'count':t}
def expand(f,exponents):return np.stack([np.prod(f**np.array(e),axis=1) for e in exponents],axis=1)
def select(f,weights,k):
 scores=f@np.asarray(weights);return sorted((np.lexsort((np.arange(len(scores)),-scores))[:k]+1).tolist())
def fit(f,winners,k,degree):
 exp=terms(degree);x=expand(f,exp);win=[v-1 for v in winners];lose=[i for i in range(len(f)) if i not in win]
 a=np.array([np.r_[x[j]-x[i],1.] for i in win for j in lose])
 result=linprog(np.r_[np.zeros(len(exp)),-1],A_ub=a,b_ub=np.zeros(len(a)),bounds=[(-1,1)]*len(exp)+[(None,None)],method='highs')
 if not result.success:raise ValueError('LP solver failed: '+result.message)
 margin=float(result.x[-1]);weights=result.x[:-1].tolist()
 exact=margin>1e-7 and select(x,weights,k)==winners
 return {'degree':degree,'terms':exp,'weightCount':len(exp),'weights':weights,'margin':margin,'exact':bool(exact)}
def hits(row,actual):
 m=len(set(row['main'])&set(actual['main']));s=len(set(row['stars'])&set(actual['stars']))
 return {'main':m,'stars':s,'total':m+s,'full':m==5 and s==2}
def atomic(p,obj):
 p.parent.mkdir(parents=True,exist_ok=True);tmp=p.with_suffix(p.suffix+'.tmp');tmp.write_text(json.dumps(obj,indent=2)+'\n');os.chmod(tmp,0o644);os.replace(tmp,p)
def build(history,out,now=None):
 now=now or dt.datetime.now(dt.timezone.utc);history=[r for r in history if r['date']<='2026-10-20'];assert len(history)>=100
 assert all(r['date']<history[i+1]['date'] for i,r in enumerate(history[:-1]))
 target=next(r for r in history if r['date']=='2026-10-20')
 # Keep the original single-answer fit fixed even when the archive grows.
 model={'version':'inverse-quadratic-20261020-v1','fitLabelDate':target['date'],'featureCutoff':cutoff(target['date']),'trainingStatus':'Fitted after the 20 October answer was known; not a pre-draw forecast','pools':{}}
 for field,n,k in POOLS:
  f,meta=features(history,field,n,k,model['featureCutoff']);m=fit(f,target[field],k,2);assert m['exact'];model['pools'][field]={**m,**meta,'n':n,'k':k}
 selected=history[-50:];results=[]
 for actual in selected:
  limit=cutoff(actual['date']);fixed={'main':[],'stars':[]};refit={};available={}
  for field,n,k in POOLS:
   f,meta=features(history,field,n,k,limit);available[field]=meta
   fixed[field]=select(expand(f,model['pools'][field]['terms']),model['pools'][field]['weights'],k)
   attempts=[];chosen=None
   for degree in [2,3,4]:
    candidate=fit(f,actual[field],k,degree);attempts.append({'degree':degree,'margin':candidate['margin'],'exact':candidate['exact']})
    if candidate['exact']:chosen=candidate;break
   refit[field]={'attempts':attempts,'fit':chosen,'selected':select(expand(f,chosen['terms']),chosen['weights'],k) if chosen else None}
  exact=all(refit[field]['fit'] is not None for field,_,_ in POOLS)
  row={'date':actual['date'],'cutoffDate':limit,'available':available,'actual':actual,'frozen':{**fixed,'hits':hits(fixed,actual)},'answerRefit':{'status':'exact' if exact else 'not separated by the tested family','main':refit['main'],'stars':refit['stars'],'exactBoth':exact}}
  results.append(row)
 same_hits=[r['frozen']['hits'] for r in results];others=[r['frozen']['hits'] for r in results if r['date']!=model['fitLabelDate']]
 summary={'draws':len(results),'from':selected[0]['date'],'through':selected[-1]['date'],'frozenMainHits':sum(h['main'] for h in same_hits),'frozenStarHits':sum(h['stars'] for h in same_hits),'frozenMeanHits':sum(h['total'] for h in same_hits)/len(same_hits),'frozenFullMatches':sum(h['full'] for h in same_hits),'frozenOtherDraws':len(others),'frozenOtherMeanHits':sum(h['total'] for h in others)/len(others),'frozenOtherFullMatches':sum(h['full'] for h in others),'refittedExactBoth':sum(r['answerRefit']['exactBoth'] for r in results),'degreeCounts':{field:{str(d):sum(r['answerRefit'][field]['fit'] is not None and r['answerRefit'][field]['fit']['degree']==d for r in results) for d in [2,3,4]} for field,_,_ in POOLS},'uniformExpectedMean':5*5/50+2*2/12}
 joint={}
 for field,n,k in POOLS:
  joint[field]=[]
  for degree in [2,3,4]:
   exp=terms(degree);constraints=[]
   for actual in selected:
    f,_=features(history,field,n,k,cutoff(actual['date']));x=expand(f,exp);win=[v-1 for v in actual[field]];lose=[i for i in range(n) if i not in win]
    constraints.extend(np.r_[x[j]-x[i],1.] for i in win for j in lose)
   a=np.asarray(constraints);res=linprog(np.r_[np.zeros(len(exp)),-1],A_ub=a,b_ub=np.zeros(len(a)),bounds=[(-1,1)]*len(exp)+[(None,None)],method='highs');assert res.success
   joint[field].append({'degree':degree,'weightCount':len(exp),'maximumCommonMargin':float(res.x[-1]),'all50StrictlySeparated':bool(res.x[-1]>1e-7)})
 report={'version':VERSION,'builtAt':now.isoformat(),'historyThrough':history[-1]['date'],'historySha256':hashlib.sha256(json.dumps(history,separators=(',',':'),sort_keys=True).encode()).hexdigest(),'protocol':{'lastDraws':50,'featureLagDays':7,'features':['last50 frequency z-score, clipped to [-3,3]','long frequency with 30-draw prior, z-score clipped to [-3,3]','absence times k/n minus one, clipped to [-1,3]'],'perAnswerDegreesTried':[2,3,4],'lp':'Maximise the strict winner/non-winner score margin; coefficient bounds [-1,1]; require margin > 1e-7; deterministic ascending-number tie-break','important':'Feature histories exclude later draws. Coefficients use known answers, so neither this per-answer fitting nor the frozen retrospective replay is a clean prospective validation. The 20 October case trained the frozen model and is reported separately from other draws.'},'model':model,'summary':summary,'jointFitWithOneCoefficientSet':joint,'draws':results}
 atomic(out/'inverse-50-20261020.json',report);atomic(out/'inverse-model-20261020.json',model)
 with (out/'inverse-50-20261020.csv').open('w',newline='') as f:
  w=csv.writer(f);w.writerow(['date','cutoff','main_history_through','stars_history_through','actual_main','actual_stars','same_rule_main','same_rule_stars','same_rule_hits','per_answer_exact','main_degree','star_degree'])
  for r in results:w.writerow([r['date'],r['cutoffDate'],r['available']['main']['asOf'],r['available']['stars']['asOf'],' '.join(map(str,r['actual']['main'])),' '.join(map(str,r['actual']['stars'])),' '.join(map(str,r['frozen']['main'])),' '.join(map(str,r['frozen']['stars'])),str(r['frozen']['hits']['main'])+'+'+str(r['frozen']['hits']['stars']),r['answerRefit']['exactBoth'],r['answerRefit']['main']['fit']['degree'] if r['answerRefit']['main']['fit'] else '',r['answerRefit']['stars']['fit']['degree'] if r['answerRefit']['stars']['fit'] else ''])
 return report
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--root',type=Path,required=True);p.add_argument('--out',type=Path,required=True);args=p.parse_args();history=read_js(args.root/'EuroJackpot/history.js')['draws'];report=build(history,args.out);print(json.dumps(report['summary']))

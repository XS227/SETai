#!/usr/bin/env python3
"""Exploratory draw-date / winning-sum study with rule-aware null models."""
import csv,datetime as dt,hashlib,html,itertools,json,math,sys
from pathlib import Path
import numpy as np

BASE=Path(sys.argv[1] if len(sys.argv)>1 else 'EuroJackpot')
S=BASE.joinpath('history.js').read_text().strip()
H=json.loads(S.removeprefix('window.EJ_HISTORY=').removesuffix(';'))
D=H['draws'];N=len(D);SEED=20261013;B=9999
def root(n):return 1+(int(n)-1)%9
def pool(date):return 8 if date<'2014-10-10' else 10 if date<'2022-03-25' else 12
def sum_dist(n,k):
 a=[[0]*(n*k+1) for _ in range(k+1)];a[0][0]=1
 for v in range(1,n+1):
  for j in range(k,0,-1):
   for s in range(n*k,v-1,-1):a[j][s]+=a[j-1][s-v]
 assert sum(a[k])==math.comb(n,k)
 return np.array(a[k],dtype=float)/math.comb(n,k)
def roots_dist(a):
 out=np.zeros(9)
 for s,p in enumerate(a):
  if p:out[root(s)-1]+=p
 assert abs(out.sum()-1)<1e-12
 return out
main=sum_dist(50,5);NULL={}
for n in [8,10,12]:
 stars=sum_dist(n,2);NULL[n]=np.array([roots_dist(main),roots_dist(stars),roots_dist(np.convolve(main,stars))])
records=[]
for r in D:
 y,m,d=map(int,r['date'].split('-'));a=sum(r['main']);b=sum(r['stars'])
 records.append(dict(date=r['date'],main=' '.join(map(str,r['main'])),stars=' '.join(map(str,r['stars'])),star_pool=pool(r['date']),date_root=root(y+m+d),day_root=root(d),month_root=root(m),year_root=root(y),main_sum=a,star_sum=b,all_sum=a+b,main_root=root(a),star_root=root(b),all_root=root(a+b)))
labels=['Five main numbers','Two Euro numbers','All seven numbers'];keys=['main_root','star_root','all_root'];factors=['date_root','day_root','month_root','year_root']
O=np.array([[r[k]-1 for k in keys] for r in records]);F=np.array([[r[k]-1 for k in factors] for r in records]);eras=np.array([r['star_pool'] for r in records]);P=np.array([NULL[n] for n in eras])
counts=np.array([np.bincount(O[:,j],minlength=9) for j in range(3)]);expected=P.sum(axis=0);tests=[]
for j,k in enumerate(keys):
 stat=float(((counts[j]-expected[j])**2/expected[j]).sum())
 sim=np.zeros((50000,9),dtype=int);gen=np.random.default_rng(SEED+j)
 for n in [8,10,12]:sim+=gen.multinomial(int((eras==n).sum()),NULL[n][j],size=len(sim))
 ref=((sim-expected[j])**2/expected[j]).sum(axis=1)
 tests.append(dict(kind='Root frequency vs fair draws',outcome=k,statistic=stat,p=float((np.count_nonzero(ref>=stat-1e-12)+1)/(len(sim)+1)),method='Pearson discrepancy against exact sum probabilities; 50000 independent parametric simulations respecting each historical Euro-number pool'))
def assoc(a,b):
 t=np.bincount(a*9+b,minlength=81).reshape(9,9).astype(float);e=t.sum(axis=1)[:,None]*t.sum(axis=0)[None,:]/N
 return float(np.divide((t-e)**2,e,out=np.zeros_like(e),where=e>0).sum()),t
stats=np.array([[assoc(F[:,i],O[:,j])[0] for j in range(3)] for i in range(4)]);exceed=np.zeros((4,3),dtype=int);rng=np.random.default_rng(SEED)
ixs=[np.where(eras==n)[0] for n in [8,10,12]]
for _ in range(B):
 perm=np.arange(N)
 for ix in ixs:perm[ix]=rng.permutation(ix)
 for i in range(4):
  for j in range(3):exceed[i,j]+=assoc(F[:,i],O[perm,j])[0]>=stats[i,j]-1e-12
for i,k in enumerate(factors):
 for j,l in enumerate(keys):tests.append(dict(kind='Date / sum-root association',dateFactor=k,outcome=l,statistic=float(stats[i,j]),p=float((exceed[i,j]+1)/(B+1)),method='Two-sided dependence statistic; '+str(B)+' permutations within historical Euro-number-pool regimes'))
def poisson_binomial(probs):
 p=np.zeros(len(probs)+1);p[0]=1
 for i,q in enumerate(probs):
  old=p[:i+1].copy();p[1:i+2]=p[1:i+2]*(1-q)+old*q;p[0]*=1-q
 assert abs(p.sum()-1)<1e-10
 return p
matches=[]
for i,k in enumerate(factors):
 for j,l in enumerate(keys):
  probs=P[np.arange(N),j,F[:,i]];obs=int((F[:,i]==O[:,j]).sum());e=float(probs.sum());pmf=poisson_binomial(probs)
  p=min(1,float(pmf[:obs+1].sum()*2),float(pmf[obs:].sum()*2))
  idx=len(tests);tests.append(dict(kind='Exact root equality',dateFactor=k,outcome=l,observed=obs,expected=e,p=p,method='Two-sided equal-tail Poisson-binomial test of rule-aware independent fair draws'))
  matches.append(dict(dateFactor=k,outcome=l,observed=obs,expected=e,percent=100*obs/N,testIndex=idx))
# Correct all 27 tested comparisons together. Labels/root rankings are descriptive.
order=sorted(range(len(tests)),key=lambda i:tests[i]['p']);last=0
for rank,i in enumerate(order):
 last=min(1,max(last,(len(tests)-rank)*tests[i]['p']));tests[i]['pHolm']=last
for m in matches:m['pHolm']=tests[m['testIndex']]['pHolm']
freq=[dict(root=i+1,**{keys[j]:int(counts[j,i]) for j in range(3)},**{keys[j]+'_expected':float(expected[j,i]) for j in range(3)}) for i in range(9)]
raw={k:sorted([dict(sum=v,count=sum(r[k]==v for r in records)) for v in {r[k] for r in records}],key=lambda x:(-x['count'],x['sum'])) for k in ['main_sum','star_sum','all_sum']}
offsets={k:[dict(offset=i,count=int(((O[:,j]-F[:,0])%9==i).sum()),expected=float(P[np.arange(N),j,(F[:,0]+i)%9].sum())) for i in range(9)] for j,k in enumerate(keys)}
report=dict(drawCount=N,fromDate=D[0]['date'],throughDate=D[-1]['date'],dateDefinition='Digital root of calendar year + month + day; equivalent to reducing all date digits to 1–9. Master numbers are not retained.',personalDayDefinition='Personal day equals the date root shifted cyclically by the digital root of birth day + birth month. Player birth year and name do not enter this daily number.',frequencies=freq,rawSums=raw,matches=matches,tests=tests,testCount=len(tests),permutations=B,seed=SEED,latest=records[-1],personalDayOffsets=offsets,associationTables={k:{l:assoc(F[:,i],O[:,j])[1].astype(int).tolist() for j,l in enumerate(keys)} for i,k in enumerate(factors)},nullProbabilities={str(n):NULL[n].tolist() for n in NULL},limitations=['Exploratory analysis of a previously inspected archive, not an independent confirmation or preregistered prediction test.','Drawn numbers, not individual jackpot winners or their birthdays.','Raw sums and digit roots are related transformations of the same draw, not independent evidence.','All-seven root is algebraically determined by main and Euro sum roots.','Different roots and sums need not have equal probability; the baseline follows historical 2-of-8, 2-of-10 and 2-of-12 rules.','Personal-day offset rankings are descriptive; they are not selected, validated player prediction strategies.'],source='https://www.westlotto.de/service/downloads/downloads.html')
report['historyFetchedAt']=H['fetchedAt'];report['historySHA256']=hashlib.sha256(S.encode()).hexdigest()
report['personalDayOffsetExplanation']='Offsets 0–8 are (birth day + birth month) modulo 9. Changing the birthday cycles the date-root labels; it does not add independent draw information or change the overall date-root association statistic.'
assert N==998 and report['latest']['date']=='2026-10-13'
assert sum(r['main_root'] for r in freq)==N and all(len(t['main_root'])==9 for t in report['associationTables'].values())
BASE.joinpath('numerology-study-20261013.json').write_text(json.dumps(report,indent=2)+'\n')
with BASE.joinpath('numerology-draws-20261013.csv').open('w') as f:
 w=csv.DictWriter(f,fieldnames=records[0].keys());w.writeheader();w.writerows(records)
print(json.dumps({k:report[k] for k in ['drawCount','throughDate','frequencies','latest','testCount']}))
print(json.dumps({'dateMatches':[m for m in matches if m['dateFactor']=='date_root'],'minimumP':min(t['p'] for t in tests),'significantAfterCorrection':[t for t in tests if t['pHolm']<.05],'topRawSums':{k:v[:3] for k,v in raw.items()}}))

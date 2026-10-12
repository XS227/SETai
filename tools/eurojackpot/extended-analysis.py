import json,pathlib,datetime,hashlib,math,time
import numpy as np
from scipy.stats import hypergeom
import sys
ROOT=pathlib.Path(sys.argv[1]) if len(sys.argv)>1 else pathlib.Path(__file__).resolve().parents[2]/'EuroJackpot'
text=(ROOT/'history.js').read_text()
rows=json.loads(text.split('=',1)[1].rstrip(';\n'))['draws']
dates=[datetime.date.fromisoformat(r['date']) for r in rows]
D=np.array([d.toordinal() for d in dates]); YY={}
for field,n in [('main',50),('stars',12)]:
 y=np.zeros((len(rows),n))
 for i,r in enumerate(rows): y[i,np.array(r[field])-1]=1
 YY[field]=y
star_start=next(i for i,r in enumerate(rows) if r['date']>='2022-03-25')
def root(n): return 1+(n-1)%9
cal={
 'weekday':np.array([d.weekday() for d in dates]),
 'month':np.array([d.month for d in dates]),
 'dayroot':np.array([root(d.day) for d in dates]),
 'monthroot':np.array([root(d.month) for d in dates]),
 'dateroot':np.array([root(sum(map(int,d.isoformat().replace('-','')))) for d in dates])}
methods=[]
def add(family,param,sign):methods.append((family,param,sign))
for w in [5,10,20,30,50,100,200,400,0]:
 for sign in [-1,1]:add('frequency',w,sign)
for h in [2,3,5,10,20,50,100]:
 for sign in [-1,1]:add('decay',h,sign)
for key in cal:
 for w in [100,400,0]:
  for sign in [-1,1]:add('calendar',(key,w),sign)
for lag in [1,2,3]:
 for w in [100,400,0]:
  for sign in [-1,1]:add('transition',(lag,w),sign)
for sign in [-1,1]:add('gap',0,sign);add('pair_follow',0,sign)
assert len(methods)==84
# Fixed ahead of scoring; input sorting/ties cannot depend on target outcome.
def scores(y,indices,t,method):
 family,param,sign=method
 if family=='frequency':
  use=indices[-param:] if param else indices
  raw=y[use].mean(axis=0)
 elif family=='decay':
  weights=np.exp2(-np.arange(len(indices)-1,-1,-1)/param)
  raw=weights@y[indices]/weights.sum()
 elif family=='calendar':
  key,w=param; use=indices[-w:] if w else indices
  use=use[cal[key][use]==cal[key][t]]
  # 20 equivalent draws of shrinkage protects sparse calendar subsets.
  base=y[indices].mean(axis=0)
  raw=(y[use].sum(axis=0)+20*base)/(len(use)+20)
 elif family=='transition':
  lag,w=param; use=indices[-w:] if w else indices
  old=y[use[:-lag]];new=y[use[lag:]]
  counts=old.sum(axis=0)
  base=y[indices].mean(axis=0)
  conditional=(old.T@new+20*base[None,:])/(counts[:,None]+20)
  raw=y[indices[-1]]@conditional/y[indices[-1]].sum()
 elif family=='gap':
  use=y[indices]; rev=use[::-1]
  present=rev.any(axis=0);raw=np.where(present,rev.argmax(axis=0),len(use)).astype(float)
 elif family=='pair_follow':
  use=indices; seed=y[use[-1]]
  overlaps=y[use[:-2]]@seed
  match=use[2:][overlaps>=2]
  base=y[indices].mean(axis=0)
  raw=(y[match].sum(axis=0)+20*base)/(len(match)+20)
 return sign*raw
H=np.zeros((len(methods),400,2),dtype=int)
start=len(rows)-400
for j,t in enumerate(range(start,len(rows))):
 # Exclude the target and every draw less than seven days before it.
 cutoff=D[t]-7
 end=int(np.searchsorted(D,cutoff,side='right'))
 assert end<=t and D[end-1]<=cutoff
 for field,k in [('main',5),('stars',2)]:
  y=YY[field];indices=np.arange(star_start if field=='stars' else 0,end)
  assert len(indices)>3
  tie=np.array([int.from_bytes(hashlib.sha256(f'extended-v1|{rows[t]["date"]}|{field}|{i+1}'.encode()).digest()[:8],'big')/2**64 for i in range(y.shape[1])])
  for m,method in enumerate(methods):
   sc=scores(y,indices,t,method)
   picked=np.lexsort((tie,sc))[-k:]
   H[m,j,0 if field=='main' else 1]=int(y[t,picked].sum())
 if (j+1)%100==0:print(f'Scored {j+1}/400 dates',flush=True)
# Choose strictly by the earlier 200 dates, deterministic method-order ties.
selection=H[:,:200].sum(axis=2).mean(axis=1)
chosen=int(np.argmax(selection))
validation=H[:,200:].sum(axis=2)
# Exact null distribution: 200 independent 5-of-50 and 2-of-12 overlaps.
pm=hypergeom.pmf(np.arange(6),50,5,5)
ps=hypergeom.pmf(np.arange(3),12,2,2)
one=np.convolve(pm,ps)
null=np.array([1.0])
for i in range(200):null=np.convolve(null,one)
null/=null.sum();cdf=np.cumsum(null)
lo=int(np.searchsorted(cdf,.025));hi=int(np.searchsorted(cdf,.975))
pvals=np.array([null[int(v.sum()):].sum() for v in validation])
best_diag=int(np.argmax(validation.mean(axis=1)))
def report(m):
 return {'method':methods[m],'selectionMeanTotal':float(selection[m]),'validationMainMean':float(H[m,200:,0].mean()),'validationStarMean':float(H[m,200:,1].mean()),'validationMeanTotal':float(validation[m].mean()),'validationPAboveUniform':float(pvals[m]),'familywiseBonferroniP':float(min(1,84*pvals[m])),'fullJackpots':int(((H[m,200:,0]==5)&(H[m,200:,1]==2)).sum())}
out={'protocol':'extended-v1','historicalDraws':len(rows),'methods':len(methods),'cutoff':'target minus seven calendar days, inclusive','selection':{'from':rows[start]['date'],'to':rows[start+199]['date'],'count':200},'validation':{'from':rows[start+200]['date'],'to':rows[-1]['date'],'count':200},'chosen':report(chosen),'bestValidationDiagnosticNotSelected':report(best_diag),'randomExpectedMeanTotal':5*5/50+2*2/12,'randomCentral95MeanInterval':[lo/200,hi/200],'variantsNumericallyAboveRandom':int((validation.mean(axis=1)>5/6).sum()),'variantsPassingBonferroni05':int((pvals<.05/84).sum()),'caveat':'Exploratory retrospective protocol developed after outcomes were public. Historical validation reused; not prospective proof of a betting edge.'}
print(json.dumps(out,ensure_ascii=False,indent=2),flush=True)
# Temporary analysis output only; production and registered forecasts unchanged.
if len(sys.argv)>2: pathlib.Path(sys.argv[2]).write_text(json.dumps(out,ensure_ascii=False,indent=2))

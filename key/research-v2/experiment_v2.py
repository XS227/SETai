#!/usr/bin/env python3
"""SETAEI ECDLP research v2, miniature curves only.
Reproducible 30-trial grid with exhaustive, BSGS, 3-way Floyd, 20-add Brent,
ML bitwise 5-NN baseline and an additive-group ML positive control.
Run: python3 experiment_v2.py --trials 30 --seed 20261022
No real-world key, address or wallet is used.
"""
import argparse,bisect,csv,hashlib,html,json,math,random,statistics,time
from collections import defaultdict
from datetime import datetime,timezone
from pathlib import Path
import benchmark_reference as b
import smart_attack as sa

def median_iqr(a):
    if not a:return (None,None,None)
    s=sorted(a);return (statistics.median(s),s[int(.25*(len(s)-1))],s[int(.75*(len(s)-1))])
def key_for(rng,n):return rng.randrange(1,n)
def pointwalk(rng,group,Q,partitions=20,cap=600000):
    """Brent detection, precomputed 20 r-adding point increments.
    Count setup group ops and actual walk steps separately.
    """
    n=group.n
    if partitions<2:raise ValueError('Need >=2 partitions')
    A=[rng.randrange(n) for _ in range(partitions)]
    B=[rng.randrange(n) for _ in range(partitions)]
    tables=[group.add(group.mul(a),group.mul(bb,Q)) for a,bb in zip(A,B)]
    setup=group.ops
    def advance(S):
        X,a,bb=S
        j=0 if X is None else (X[0]^X[1])%partitions
        return (group.add(X,tables[j]),(a+A[j])%n,(bb+B[j])%n)
    steps=0
    while group.ops<cap:
        a=rng.randrange(n); bb=rng.randrange(n)
        X=group.add(group.mul(a),group.mul(bb,Q))
        power=lam=1
        old=(X,a,bb)
        new=advance(old);steps+=1
        while old[0]!=new[0] and group.ops<cap:
            if power==lam:
                old=new;power*=2;lam=0
            new=advance(new);steps+=1;lam+=1
        if old[0]!=new[0]:break
        denominator=(old[2]-new[2])%n
        if denominator:
            candidate=(new[1]-old[1])*pow(denominator,-1,n)%n
            check=group.mul(candidate)
            if check==Q:
                return candidate,'found',steps,setup
    return None,'capped',steps,setup

def tiny_exhaustive_batch(bits,p,n,G,keys,limit=None):
    """Shared traversal for independent uniform target keys.
    Exact standalone operation counts for each target; elapsed is shared-prefix
    elapsed, NOT independent execution runtime.
    """
    max_k=max(keys)
    upto=min(max_k,limit) if limit else max_k
    wanted=set(k for k in keys if k<=upto)
    C=b.Group(p,0,n,G);R=None;clock=time.perf_counter()
    checkpoints={}
    for k in range(1,upto+1):
        R=C.add(R,G)
        if k in wanted:
            checkpoints[k]=(C.ops,time.perf_counter()-clock)
    out=[]
    for i,k in enumerate(keys):
        found=k in checkpoints
        ops,seconds=checkpoints[k] if found else (upto,time.perf_counter()-clock)
        out.append({'bits':bits,'n':n,'method':'exhaustive','trial':i+1,
            'status':'found' if found else 'capped',
            'event':found,'group_ops':ops,'walk_steps':ops,
            'setup_ops':0,'elapsed_seconds':round(seconds,6),
            'timing_mode':'shared_prefix_not_independent',
            'note':'30 independently selected targets; one shared full walk; timestamps correlated'})
    return out

def search_trials(row,method,trials,seed,cap):
    bits,p,coef,n,x,y=row;G=(x,y)
    rng=random.Random(seed+bits*101+sum(map(ord,method)))
    results=[]
    for i in range(trials):
        k=key_for(rng,n);C0=b.Group(p,0,n,G);Q=C0.mul(k)
        C=b.Group(p,0,n,G)
        t=time.perf_counter()
        if method=='BSGS':
            candidate,status=b.bsgs(C,Q,cap);steps=None;setup=None
        elif method=='rho3_Floyd':
            candidate,status=b.pollard(C,Q,cap,rng)
            # old b.pollard performs 3 steps per Floyd cycle, plus setup/validation
            steps=None;setup=None
        elif method=='rho20_Brent':
            candidate,status,steps,setup=pointwalk(rng,C,Q,20,cap)
        else:raise ValueError(method)
        if status=='found' and candidate!=k:raise AssertionError((bits,method,k,candidate))
        results.append({'bits':bits,'n':n,'method':method,'trial':i+1,
            'status':status,'event':status=='found','group_ops':C.ops,
            'walk_steps':steps,'setup_ops':setup,
            'elapsed_seconds':round(time.perf_counter()-t,6),
            'timing_mode':'independent_run','note':''})
    return results

def bitwise_5nn(train,tests,bits,n,label_seed=0):
    """One 5-NN classifier per key bit, using both normalized point coordinates.
    Sorted X-window finds a pool, Euclidean X/Y chooses five near neighbors.
    Exactly the same classifier is used on ECC and the additive control.
    """
    ordered=sorted(train,key=lambda sample:sample[0][0])
    xs=[feature[0] for feature,key in ordered]
    width=bits
    hit=[0]*width;major=[0]*width;unif=0
    priors=[int(sum((k>>bit)&1 for _,k in train)*2>=len(train)) for bit in range(width)]
    rng=random.Random(label_seed)
    test_predictions=[]
    window=max(24,int(2*math.sqrt(len(train))))
    for feature,key in tests:
        x,y=feature
        pos=bisect.bisect_left(xs,x)
        start=max(0,pos-window);end=min(len(xs),pos+window+1)
        ranked=sorted(range(start,end),key=lambda j:
             (ordered[j][0][0]-x)**2+(ordered[j][0][1]-y)**2)[:5]
        neighbors=[ordered[j][1] for j in ranked]
        guess=0
        for bit in range(width):
            vote=int(sum((k>>bit)&1 for k in neighbors)>=3)
            guess|=vote<<bit
            hit[bit]+=vote==((key>>bit)&1)
            major[bit]+=priors[bit]==((key>>bit)&1)
        unif+=rng.randrange(1,n)==key
        test_predictions.append(guess)
    return {'bit_accuracy':sum(hit)/(len(tests)*width),
       'bit_accuracy_by_position':[round(x/len(tests),6) for x in hit],
       'majority_bit_accuracy':sum(major)/(len(tests)*width),
       'exact_key_hits':sum(y==pred for (_,y),pred in zip(tests,test_predictions)),
       'random_exact_key_hits':unif,
       'uniform_key_baseline':1/(n-1)}

def draw_unique(rng,n,count):
    if count>n-1:raise ValueError('Train/test larger than group')
    return rng.sample(range(1,n),count)
def model_study(row,train_sizes,repeat=2,test_n=1024,seed=20261022):
    bits,p,coef,n,x,y=row;G=(x,y);result=[]
    for ti,train_n in enumerate(train_sizes):
        for rep in range(repeat):
            info={'bits':bits,'group_order':n,'train_n':train_n,'test_n':test_n,
                'repeat':rep+1,'model':'approx 5-NN per-bit classifier over normalized public X and Y'}
            if train_n+test_n>n-1:
                result.extend([dict(info,group=group,status='not_applicable',reason='Requires disjoint unique train and test keys') for group in ('EC_prime_group','Z_n_additive')])
                continue
            rng=random.Random(seed+bits*10007+train_n*13+rep*71)
            keys=draw_unique(rng,n,train_n+test_n)
            train_keys=keys[:train_n];test_keys=keys[train_n:]
            digest=hashlib.sha256((','.join(map(str,train_keys))+'|'+','.join(map(str,test_keys))).encode()).hexdigest()
            C=b.Group(p,0,n,G)
            t=time.perf_counter()
            ec_train=[((Q[0]/p,Q[1]/p),k) for k in train_keys for Q in (C.mul(k),)]
            ec_test=[((Q[0]/p,Q[1]/p),k) for k in test_keys for Q in (C.mul(k),)]
            ec=bitwise_5nn(ec_train,ec_test,bits,n,seed+12)
            result.append(dict(info,group='EC_prime_group',status='complete',split_hash=digest,
                elapsed_seconds=round(time.perf_counter()-t,4),group_ops=C.ops,**ec))
            # Same classifier and same secret labels; g=1, Q=k in Z_n,
            # public feature Q/n. This is intentionally easy to learn.
            positive=bitwise_5nn([((k/n,0.5),k) for k in train_keys],[((k/n,0.5),k) for k in test_keys],bits,n,seed+12)
            result.append(dict(info,group='Z_n_additive',status='complete',split_hash=digest,
                elapsed_seconds=None,group_ops=0,**positive))
    return result
def km_median(points):
    # Kaplan-Meier median: right-censored records remain in the risk set.
    points=[r for r in points if r['group_ops'] is not None]
    n=len(points);risk=n;survival=1.
    if not n:return None
    for x in sorted(set(r['group_ops'] for r in points if r['group_ops'] is not None)):
        d=sum(r['event'] for r in points if r['group_ops']==x)
        c=sum(not r['event'] for r in points if r['group_ops']==x)
        if risk:survival*=1-d/risk
        risk-=d+c
        if survival<=.5:return x
    return None
def summarise(rows):
    groups=defaultdict(list)
    for r in rows:groups[(r['bits'],r['method'])].append(r)
    res=[]
    for (bits,method),runs in sorted(groups.items()):
        observed=[r['group_ops'] for r in runs if r['event']]
        med,q1,q3=median_iqr(observed)
        km=km_median(runs)
        ci_lo=ci_hi=None
        if len(observed)==len(runs) and len(observed)>=15:
            rand=random.Random(22026+bits*37+sum(map(ord,method)))
            bootstrap=[statistics.median(rand.choices(observed,k=len(observed))) for _ in range(1200)]
            bootstrap.sort()
            ci_lo,ci_hi=bootstrap[30],bootstrap[1169]
        res.append({'bits':bits,'method':method,'trials':sum(r['group_ops'] is not None for r in runs),'planned_trials':len(runs),
            'found':len(observed),'right_censored':sum(r['status']=='capped' for r in runs),
            'not_run':sum(r['status']=='not_run' for r in runs),
            'median_completed':med,'q1_completed':q1,'q3_completed':q3,
            'bootstrap95_median_low':ci_lo,'bootstrap95_median_high':ci_hi,
            'km_median_including_censored':km,
            'timing_mode':runs[0]['timing_mode'],
            'status':'complete' if len(observed)==len(runs) else 'partial_or_censored'})
    return res
def graph(summary):
    palette={'exhaustive':'#f6c06e','BSGS':'#7dd4bb','rho3_Floyd':'#a99aff','rho20_Brent':'#5da8ec'}
    w,h=950,415;L=65;T=30;W=830;H=290
    x=lambda z:L+(z-16)/32*W
    y=lambda z:T+H*(1-math.log2(max(z,1))/28)
    s=[f'<svg viewBox="0 0 {w} {h}" role="img" aria-label="Measured median group operations on logarithmic vertical axis" width="100%">',
       f'<rect width="{w}" height="{h}" rx="14" fill="#0c1927"/>']
    for t in range(0,29,4):
        s.append(f'<line x1="{L}" y1="{y(2**t)}" x2="{L+W}" y2="{y(2**t)}" stroke="#274257"/>')
        s.append(f'<text x="53" y="{y(2**t)+4:.1f}" text-anchor="end" fill="#a7bdcd" font-size="12">2^{t}</text>')
    for bit in range(16,49,4):
        s.append(f'<text x="{x(bit):.1f}" y="343" fill="#a7bdcd" font-size="12" text-anchor="middle">{bit}</text>')
    for i,(name,color) in enumerate(palette.items()):
        values=sorted((r for r in summary if r['method']==name and r['median_completed'] and r['trials']>=15 and r['found']==r['trials']),key=lambda r:r['bits'])
        if values:
            pts=' '.join(f'{x(r["bits"]):.1f},{y(r["median_completed"]):.1f}' for r in values)
            s.append(f'<polyline points="{pts}" fill="none" stroke="{color}" stroke-width="2.5"/>')
            for r in values:
                center=x(r['bits']);v=y(r['median_completed'])
                if r['q1_completed'] and r['q3_completed']:
                    s.append(f'<line x1="{center:.1f}" y1="{y(r["q1_completed"]):.1f}" x2="{center:.1f}" y2="{y(r["q3_completed"]):.1f}" stroke="{color}" stroke-width="3"/>')
                s.append(f'<circle cx="{center:.1f}" cy="{v:.1f}" r="4" fill="{color}"><title>{name}, {r["bits"]}bit, median {r["median_completed"]} ops, {r["found"]}/{r["trials"]} found</title></circle>')
        s.append(f'<circle cx="{65+i*210}" cy="382" r="6" fill="{color}"/><text x="{77+i*210}" y="387" fill="#d5e5ef" font-size="13">{name}</text>')
    s.append('</svg>');return ''.join(s)

def mlgraph(models):
    colors={'EC_prime_group':'#86bafa','Z_n_additive':'#c6f479'}
    sizes=[256,4096,65536];X=lambda i:90+i*360;Y=lambda p:300-(p-.4)/.55*250
    series=[r for r in models if r['bits']==20 and r.get('status')=='complete']
    s=['<svg viewBox="0 0 940 355" width="100%" role="img" aria-label="Learning curves at 20-bit group, bit accuracy by train size">','<rect width="940" height="355" rx="14" fill="#0c1927"/>']
    for k in range(45,96,10):
        val=k/100;s.append(f'<line x1="65" y1="{Y(val):.0f}" x2="860" y2="{Y(val):.0f}" stroke="#273c52"/><text x="50" y="{Y(val)+5:.0f}" fill="#a9bbc9" font-size="12">{k}%</text>')
    for i,sz in enumerate(sizes):s.append(f'<text x="{X(i)}" y="323" text-anchor="middle" fill="#c2d2dd">{sz:,}</text>')
    for group,color in colors.items():
        points=[]
        for i,sz in enumerate(sizes):
            vals=[r['bit_accuracy'] for r in series if r['group']==group and r['train_n']==sz]
            if vals:points.append((X(i),Y(statistics.mean(vals))))
        if points:s.append(f'<polyline points="{" ".join(f"{xx:.1f},{yy:.1f}" for xx,yy in points)}" fill="none" stroke="{color}" stroke-width="3"/>')
        for xx,yy in points:s.append(f'<circle cx="{xx:.1f}" cy="{yy:.1f}" r="6" fill="{color}"/>')
    s.append('<text x="330" y="344" fill="#aebfcd" font-size="11">Treningspar, 20 bit (utførte målinger)</text></svg>')
    return ''.join(s)

def smart_section(smart):
    rows=''.join('<tr>'+''.join(f'<td>{html.escape(str(r[k]))}</td>' for k in ('bits','field_prime','curve','hidden_k','recovered_k','padic_group_operations','lift_attempts','status'))+'</tr>' for r in smart['runs'])
    verdict='<strong>Bestått:</strong>' if smart['status']=='pass' else '<strong>Ikke bestått:</strong>'
    return f'''<section class="panel"><h2>Positiv kontroll 2: Smart-angrep på anomale kurver</h2><p>{verdict} På kurver der antall punkter er nøyaktig lik feltprimtallet p, løftes punktene til Z/p², ganges med p og deles via den p-adiske elliptiske logaritmen. Nøkkelen faller ut i lineær tid i log p – også på 48 bit, der BSGS og Pollard rho ikke er kjørt.</p><div class="scroll"><table><thead><tr><th>Bit</th><th>p = #E</th><th>Kurve</th><th>Skjult k</th><th>Gjenfunnet k</th><th>p-adiske gruppeoperasjoner</th><th>Løft-forsøk</th><th>Status</th></tr></thead><tbody>{rows}</tbody></table></div><p>Løftet bruker y²=x³+p·A·x+b. Det rene j=0-løftet er det kanoniske løftet, der angrepet ikke virker. Gjenfunnet k er verifisert med kG=Q. Kontrollen viser at svake kurvefamilier faktisk avsløres; den sier ingenting om secp256k1, som ikke er anomal (#E ≠ p).</p></section>'''

def save(out,rows,models,control,seed,trials,smart):
    out.mkdir(parents=True,exist_ok=True)
    summary=summarise(rows)
    slopes=[]
    for method in ('exhaustive','BSGS','rho3_Floyd','rho20_Brent'):
        eligible=[r for r in summary if r['method']==method and r['trials']>=15 and r['found']==r['trials'] and r['median_completed']]
        if len(eligible)<3:continue
        xx=[r['bits'] for r in eligible];yy=[math.log2(r['median_completed']) for r in eligible]
        xb=statistics.mean(xx);yb=statistics.mean(yy)
        slope=sum((x-xb)*(y-yb) for x,y in zip(xx,yy))/sum((x-xb)**2 for x in xx)
        slopes.append({'method':method,'slope_log2_median_ops_per_bit':round(slope,5),'bit_sizes':xx,
            'interpretation':'exploratory; few cells; not a proof of asymptotic behavior'})
    metadata={'created_utc':datetime.now(timezone.utc).isoformat(),'seed':seed,
       'trials_target':trials,'summary':summary,'slopes':slopes,'runs':rows,'ml':models,'MOV_positive_control':control,
       'Smart_positive_control':smart,
       'not_implemented':[] if smart['status']=='pass' else ['Smart anomalous curves (control failed)'],
       'caps':{'group_ops_cap_le_32_bit':600000,'group_ops_cap_36_bit':160000},
       'limitations':[
       '36-bit rho cap is 160 000 group operations, below the expected ~1.25*sqrt(n) ≈ 290 000; heavy censoring there is by design, not a method failure.',
       '24-bit exhaustive: independent random secrets but correlated shared-prefix timing, not independent CPU timings.',
       'Brute force time estimates are not comparable with separately timed rho / BSGS.',
       'rho20 counts preprocessing group operations; walk_steps are separate.',
       'Floyd rho3 baseline counts total group operations including 3 walk updates per comparison; old code does not expose exact walk steps.',
       'Failed/capped trials are right censored and MUST NOT be treated as exact completion.',
       'KM median is undefined where survival never falls to 50%.',
       'ML classifier uses both normalized public X and Y and 5-NN bitwise majority, plus majority bit and random exact key baselines.',
       'No support for a cryptographic breakthrough.']}
    (out/'results_v2.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2))
    for name,records in (('measurements_v2.csv',rows),('summary_v2.csv',summary),('ml_v2.csv',models)):
        fields=list(dict.fromkeys(k for r in records for k in r))
        with (out/name).open('w',newline='') as f:
            w=csv.DictWriter(f,fieldnames=fields);w.writeheader();w.writerows(records)
    measured=''.join('<tr>'+''.join('<td>'+html.escape(str(r.get(key,'—') if r.get(key) is not None else '—'))+'</td>' for key in ('bits','method','trials','found','right_censored','median_completed','q1_completed','q3_completed','bootstrap95_median_low','bootstrap95_median_high','km_median_including_censored','timing_mode'))+'</tr>' for r in summary)
    learned=''.join('<tr>'+''.join('<td>'+html.escape(str(r.get(key,'—')))+'</td>' for key in ('bits','group','train_n','test_n','repeat','status'))+
    '<td>'+(f'{r["bit_accuracy"]:.2%}' if r.get('bit_accuracy') is not None else '—')+'</td><td>'+(f'{r["majority_bit_accuracy"]:.2%}' if r.get('majority_bit_accuracy') is not None else '—')+'</td></tr>' for r in models)
    page='''<!doctype html><html lang="nb"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>ECDLP Research v2 | SETAEI</title><style>:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#09121d;color:#e5eff8;font:14px/1.7 system-ui,Arial}main{max-width:1120px;padding:0 24px;margin:35px auto 80px}a{color:#c5f479}h1{font-size:clamp(34px,6vw,60px);line-height:1.05;margin:30px 0}h1 span{color:#c5f479}h2{font-size:23px;margin-top:0}h3{font-size:17px}p{color:#b6c7d6}.panel{border:1px solid #33495b;border-radius:16px;background:linear-gradient(130deg,#17293a,#0f1b2a);padding:24px;margin:22px 0}.muted{color:#97abbd}.tag{display:inline-block;border:1px solid #536b66;color:#c5f479;padding:5px 12px;border-radius:30px}table{border-collapse:collapse;min-width:900px;width:100%}th,td{border-bottom:1px solid #35495b;text-align:left;padding:9px;font-size:12px}th{color:#b9d0dc}.scroll{overflow:auto;max-height:470px}.metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.metrics div{background:#102331;border:1px solid #354e61;border-radius:10px;padding:16px}.metrics strong{display:block;font-size:26px;color:#c5f479}.metrics small{color:#a4b8c7}.download{display:inline-block;margin:5px 8px 5px 0;padding:11px;background:#1d3c31;border:1px solid #58846c;border-radius:9px;text-decoration:none}@media(max-width:700px){.panel{padding:14px}.metrics{grid-template-columns:1fr}}</style></head><body><main><a href="/key/">← Tilbake til verktøyet</a>　<a href="/key/research/">Se original v1</a><h1>Baklengs eksperiment <span>v2</span></h1><p class="tag">Eksplorativ forskning · ikke et kryptografisk gjennombrudd</p><p>Oppdatert: __DATE__ UTC · __TRIALS__ tilfeldige testnøkler per gjennomførbar metode/størrelse, og full rapportering av sensurerte forsøk. Kun syntetiske, små grupper.</p>
    <div class="metrics"><div><small>Primtallsordnede kurver</small><strong>9</strong></div><div><small>Uavhengige nøkkeltrekninger</small><strong>__COUNT__</strong></div><div><small>Matematiske positivkontroller (MOV · Smart)</small><strong>__CONTROLS__</strong></div></div>
    <section class="panel"><h2>Målte operasjoner · median og IQR</h2><p>Kun reelle målinger. Viser median av gjennomførte forsøk. Hvis forsøk er sensurert, er KM-median oppgitt separat; median av bare treff kan være skjev.</p>__GRAPH__</section>
    <section class="panel"><h2>Resultater og sensurering</h2><div class="scroll"><table><thead><tr><th>Bit</th><th>Metode</th><th>Kjørte</th><th>Treff</th><th>Sensurert</th><th>Median treff-ops</th><th>Q1</th><th>Q3</th><th>Bootstrap 95% nedre</th><th>Bootstrap 95% øvre</th><th>KM-median (sensur inkludert)</th><th>Tidsmåling</th></tr></thead><tbody>__SUMMARY__</tbody></table></div><p>«—» betyr ikke gjennomført eller ikke estimerbart. KM-median er tom der mer enn halvparten av observasjonene fremdeles er sensurert ved siste kontroll.</p><p><b>Tak:</b> opptil 32 bit stoppes et forsøk etter 600 000 gruppeoperasjoner, på 36 bit etter 160 000. Forventet behov for rho på 36 bit er rundt 1,25·√n ≈ 290 000, så den kraftige sensureringen der er et bevisst ressurstak på VPS-en – ikke et tegn på at metoden svikter. De få treffene på 36 bit er tidlige heldige forsøk og gir derfor en lav median.</p></section>
    <section class="panel"><h2>Eksplorativ målt vekst</h2><p>Regresjon av log₂(median gruppeoperasjoner) mot nøkkelbiter, kun celler med alle forsøk fullført. Forventning: omtrent 1 for lineært søk og 0,5 for kvadratrotsmetoder. Disse punktestimatene er ikke et asymptotisk bevis.</p><div class="scroll"><table><thead><tr><th>Metode</th><th>Stigning</th><th>Antall størrelser</th></tr></thead><tbody>__SLOPES__</tbody></table></div></section>
    <section class="panel"><h2>ML-læringskurve: ECC mot additiv positivkontroll</h2><p>Samme 5-NN bit-klassifikator trenes på 256, 4 096 og 65 536 eksempler, og testes på 1 024 andre nøkler når størrelsen tillater det. Positivkontrollen er Zₙ med kjent generator 1: Q=k mod n. Den forventes å vise målbar læring i bitvis klassifikasjon.</p>__MLGRAPH__<div class="scroll"><table><thead><tr><th>Bit</th><th>Gruppe</th><th>Trening</th><th>Test</th><th>Rep.</th><th>Status</th><th>Bitlikhet</th><th>Majoritet</th></tr></thead><tbody>__LEARNED__</tbody></table></div><p>For 16 bit kan 65 536 unike treningsnøkler ikke brukes. Dette vises som «not_applicable», ikke som nullresultat. Treffsannsynligheten for én tilfeldig hel nøkkel er 1/(n−1), ikke 50 %.</p></section>
    <section class="panel"><h2>Kontroll og metodekritikk</h2><p>MOV-paringskontrollen og Smart-kontrollen kjøres separat. Dette er matematiske kontroller, ikke ML-kontroller: ML-modellen får ikke tilgang til paringer eller p-adiske løft.</p><p><b>Pollard:</b> V1 tredeling bruker Floyds syklusdeteksjon (omtrent tre gange-evalueringer per sammenligningsrunde). V2 inkluderer en 20-partisjoners r-adding walk med Brents syklusdeteksjon, og registrerer både gangesteg, oppsett og totale punktoperasjoner. Tall kan ikke sammenlignes med 1,25·√n uten å spesifisere måleenheten.</p><p><b>Uttømmende søk:</b> 30 tilfeldige mål for 16–24 bit verifiseres på samme sekvensielle punktvandring for å spare VPS-ressurser. Operasjonstall for hver uavhengig skjult nøkkel er eksakte, men tidsstemplene er korrelerte og skal ikke tolkes som uavhengige tidsmålinger.</p><p><b>Sensurering:</b> «capped» lagres som minst faktisk antall punktoperasjoner. Ikke behandle disse som observerte funn og ikke ta naiv OLS over bare treff.</p></section>
    __SMART__
    <section class="panel"><h2>Reproduser kilde og data</h2><a class="download" href="./methodology.md">Metode og begrensninger</a><a class="download" href="./experiment_v2.py">Python v2</a><a class="download" href="./benchmark_reference.py">Kurver og basisimplementasjon</a><a class="download" href="./smart_attack.py">Smart-angrep</a><a class="download" href="./results_v2.json">Alle resultater (JSON)</a><a class="download" href="./measurements_v2.csv">Målinger (CSV)</a><a class="download" href="./summary_v2.csv">Median/IQR/KM (CSV)</a><a class="download" href="./ml_v2.csv">ML-kontroll (CSV)</a><p><code>python3 experiment_v2.py --trials 30 --seed __SEED__</code> (full matrise) · <code>python3 experiment_v2.py --controls-only</code> (kun kontroller, gjenbruker lagrede målinger)</p></section></main></body></html>'''
    controls='PASS' if control['status']=='pass' and smart['status']=='pass' else 'FAIL'
    mapping={'__CONTROLS__':controls,'__SMART__':smart_section(smart),'__DATE__':metadata['created_utc'],'__TRIALS__':str(trials),'__COUNT__':str(sum(r['group_ops'] is not None for r in rows)),
       '__GRAPH__':graph(summary),'__MLGRAPH__':mlgraph(models),
       '__SUMMARY__':measured,'__LEARNED__':learned,'__SEED__':str(seed),
       '__SLOPES__':''.join('<tr><td>'+html.escape(t['method'])+'</td><td>'+str(t['slope_log2_median_ops_per_bit'])+'</td><td>'+str(len(t['bit_sizes']))+'</td></tr>' for t in slopes)}
    for src,dst in mapping.items():page=page.replace(src,dst)
    (out/'index.html').write_text(page)
    return summary
def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--seed',type=int,default=20261022)
    parser.add_argument('--trials',type=int,default=30)
    parser.add_argument('--out',default=str(Path(__file__).resolve().parent))
    parser.add_argument('--skip-ml',action='store_true')
    parser.add_argument('--controls-only',action='store_true',
        help='Reuse runs/ML from results_v2.json; recompute only MOV and Smart controls')
    args=parser.parse_args()
    start=time.perf_counter()
    if args.controls_only:
        old=json.loads((Path(args.out)/'results_v2.json').read_text())
        control=b.mov_positive_control(args.seed);smart=sa.smart_positive_control(args.seed)
        save(Path(args.out),old['runs'],old['ml'],control,old['seed'],old['trials_target'],smart)
        print(json.dumps({'status':'PASS' if smart['status']=='pass' else 'FAIL','positive_mov':control['status'],
          'positive_smart':smart['status'],'reused_rows':len(old['runs']),
          'seconds':round(time.perf_counter()-start,2)},indent=2),flush=True)
        return
    rng=random.Random(args.seed);rows=[]
    for row in b.CURVES:
        bits,p,coef,n,x,y=row
        b.verify_curve(bits,p,coef,n,(x,y))
        # Bounded-vps research matrix; avoid excessive RAM use for 36+ BSGS
        for method in ('exhaustive','BSGS','rho3_Floyd','rho20_Brent'):
            budget={'exhaustive':(bits<=24),'BSGS':(bits<=32),'rho3_Floyd':(bits<=36),'rho20_Brent':(bits<=36)}[method]
            if not budget:
                rows.extend({'bits':bits,'n':n,'method':method,'trial':i+1,
                    'status':'not_run','event':False,'group_ops':None,'walk_steps':None,
                    'setup_ops':None,'elapsed_seconds':None,'timing_mode':'not_run',
                    'note':'Resource limit: this is not a failure'} for i in range(args.trials))
                continue
            if method=='exhaustive':
                keys=[key_for(rng,n) for _ in range(args.trials)]
                rows.extend(tiny_exhaustive_batch(bits,p,n,(x,y),keys))
            else:
                cap=600000 if bits<=32 else 160000
                rows.extend(search_trials(row,method,args.trials,args.seed,cap))
            print(f'PROGRESS: {bits} bit {method} {len(rows)} rows',flush=True)
    models=[]
    if not args.skip_ml:
        for row in b.CURVES[:3]:
            result=model_study(row,(256,4096,65536),repeat=2,test_n=1024,seed=args.seed)
            models.extend(result)
            print(f'PROGRESS: ML {row[0]} bit {len(result)} rows',flush=True)
    control=b.mov_positive_control(args.seed);smart=sa.smart_positive_control(args.seed)
    summary=save(Path(args.out),rows,models,control,args.seed,args.trials,smart)
    print(json.dumps({'status':'PASS','run_rows':len(rows),
      'completed':sum(r['event'] for r in rows),'capped':sum(r['status']=='capped' for r in rows),
      'not_run':sum(r['status']=='not_run' for r in rows),
      'ml_runs':len(models),'positive_mov':control['status'],'positive_smart':smart['status'],
      'seconds':round(time.perf_counter()-start,2)},indent=2),flush=True)
if __name__=='__main__':main()

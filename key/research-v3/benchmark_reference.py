#!/usr/bin/env python3
"""Reproducible miniature ECDLP study: prime-order subgroups, 16..48 bits.
No private keys, real wallets or live blockchain interaction.
Standard library only. Run: python3 benchmark.py [--seed 20261022] [--extended]
"""
import argparse,csv,html,json,math,random,statistics,time
from datetime import datetime,timezone
from pathlib import Path

# E: y^2=x^3+b (mod p), ordinary j=0, FULL elliptic group of prime order.
# The Hasse interval plus an n-torsion generator certifies #E(Fp)=n.
CURVES=[
(16,49177,5,48799,1,35853),
(20,786433,100000,784897,1,432451),
(24,12582919,17,12587563,1,6211686),
(28,201326707,32,201298843,2,720710),
(32,3221225563,32,3221180089,2,1316874620),
(36,51539607793,5,51539513437,1,30036951039),
(40,824633721253,32,824635470601,1,589248034951),
(44,13194139533493,3125,13194144388501,1,10994730794884),
(48,211106232533407,3,211106205190693,1,2)]
PRIME_BASES=[2,325,9375,28178,450775,9780504,1795265022]
def isprime(n):
    if n<2:return False
    for p in (2,3,5,7,11,13,17,19,23,29,31,37):
        if n%p==0:return n==p
    d=n-1;s=0
    while d%2==0:d//=2;s+=1
    for a in PRIME_BASES:
        if a%n==0:continue
        x=pow(a,d,n)
        if x in (1,n-1):continue
        for _ in range(s-1):
            x=x*x%n
            if x==n-1:break
        else:return False
    return True
class Group:
    def __init__(self,p,a,n,G):
        self.p,self.a,self.n,self.G=p,a,n,G
        self.ops=0
    def add(self,A,B):
        self.ops+=1;p=self.p
        if A is None:return B
        if B is None:return A
        x,y=A;X,Y=B
        if x==X and (y+Y)%p==0:return None
        if A==B:
            k=(3*x*x+self.a)*pow(2*y,-1,p)%p
        else:
            k=(Y-y)*pow((X-x)%p,-1,p)%p
        nx=(k*k-x-X)%p
        return nx,(k*(x-nx)-y)%p
    def mul(self,k,P=None):
        if P is None:P=self.G
        R=None
        while k:
            if k&1:R=self.add(R,P)
            P=self.add(P,P);k>>=1
        return R
def verify_curve(bits,p,a,n,g):
    assert isprime(p) and isprime(n) and n.bit_length()==bits
    assert p%3==1 and (27*a*a)%p != 0
    x,y=g;assert (y*y-x*x*x-a)%p==0
    C=Group(p,0,n,g)
    assert C.mul(n) is None and C.mul(1)==g
    # Hasse: |#E(Fp) - (p+1)| <= 2*sqrt(p).
    # Since G is an n-torsion point of prime order, n divides #E.
    # Only the multiple n falls in Hasse's interval, proving #E=n.
    bound=2*math.isqrt(p)+2
    low,high=p+1-bound,p+1+bound
    assert low <= n <= high and 2*n > high
    return {'bits':bits,'p':p,'a':0,'b':a,'n':n,'cofactor':1,
            'Gx':x,'Gy':y,'prime_order_verified':True,
            'embedding_degree_gt_32':all(pow(p,k,n)!=1 for k in range(1,33))}
def brute(C,Q,cap):
    R=None
    for k in range(1,C.n):
        if C.ops>=cap:return None,'capped'
        R=C.add(R,C.G)
        if R==Q:return k,'found'
    return None,'not_found'
def bsgs(C,Q,cap):
    m=math.isqrt(C.n)+1
    if 2*m+100>=cap:return None,'skipped_budget'
    baby={};P=None
    for j in range(m):
        if P not in baby:baby[P]=j
        P=C.add(P,C.G)
    neg_m=C.mul(C.n-(m%C.n))
    R=Q
    for i in range(m+1):
        if R in baby:
            k=(i*m+baby[R])%C.n
            if C.mul(k)==Q:return k,'found'
        if C.ops>=cap:return None,'capped'
        R=C.add(R,neg_m)
    return None,'not_found'
def pollard(C,Q,cap,rng):
    n=C.n
    def advance(S):
        X,a,b=S
        if X is None:return C.add(X,C.G),(a+1)%n,b
        j=X[0]%3
        if j==0:return C.add(X,C.G),(a+1)%n,b
        if j==1:return C.add(X,X),2*a%n,2*b%n
        return C.add(X,Q),a,(b+1)%n
    while C.ops<cap:
        a=rng.randrange(n);b=rng.randrange(n)
        X=C.add(C.mul(a),C.mul(b,Q))
        slow=(X,a,b);fast=slow
        for _ in range(cap//3+1):
            if C.ops>=cap:return None,'capped'
            slow=advance(slow)
            fast=advance(advance(fast))
            if slow[0]==fast[0]:
                den=(fast[2]-slow[2])%n
                if den:
                    k=(slow[1]-fast[1])*pow(den,-1,n)%n
                    if C.mul(k)==Q:return k,'found'
                break
    return None,'capped'
def key_ml(C,rng,train_n=256,test_n=60):
    # 5-nearest-neighbour numerical regression, NOT trained on test keys.
    n=C.n
    train_n=min(train_n,(n-1)//3)
    samples=rng.sample(range(1,n),train_n+test_n)
    train=samples[:train_n];tests=samples[train_n:]
    coords=[C.mul(k) for k in train]
    features=[(P[0]/C.p,P[1]/C.p) for P in coords]
    trainlabels=train
    predicted=[];bit_correct=0
    start=time.perf_counter();hits=0;rand_hits=0
    for k in tests:
        P=C.mul(k);x=P[0]/C.p;y=P[1]/C.p
        nn=sorted(range(train_n),key=lambda j:(features[j][0]-x)**2+(features[j][1]-y)**2)[:5]
        guess=max(1,min(n-1,round(sum(trainlabels[j] for j in nn)/len(nn))))
        baseline=rng.randrange(1,n)
        hits+=(guess==k);rand_hits+=(baseline==k)
        bit_correct+=((~(guess^k))&((1<<C.n.bit_length())-1)).bit_count()
        predicted.append(guess)
    elapsed=time.perf_counter()-start
    assert set(train).isdisjoint(tests)
    return {'train':train_n,'test':test_n,'hits':hits,'random_hits':rand_hits,
            'expected_random_hits':test_n/(n-1),
            'exact_accuracy':hits/test_n,'guess_accuracy':1/(n-1),
            'bit_accuracy':bit_correct/(test_n*C.n.bit_length()),
            'training_keys_disjoint':True,'inference_seconds':elapsed,
            'group_ops_for_dataset':C.ops,
            'model':'5-NN coordinate-to-scalar regression'}
class F2:
    """Field F_(p²) = F_p[i]/(i²+1), for p ≡3 (mod 4)."""
    def __init__(self,p,a,b=0):self.p=p;self.a=a%p;self.b=b%p
    def cast(self,o):return o if isinstance(o,F2) else F2(self.p,o)
    def __add__(self,o):o=self.cast(o);return F2(self.p,self.a+o.a,self.b+o.b)
    def __sub__(self,o):o=self.cast(o);return F2(self.p,self.a-o.a,self.b-o.b)
    def __mul__(self,o):o=self.cast(o);return F2(self.p,self.a*o.a-self.b*o.b,self.a*o.b+self.b*o.a)
    def __truediv__(self,o):
        o=self.cast(o);d=pow((o.a*o.a+o.b*o.b)%self.p,-1,self.p)
        return F2(self.p,(self.a*o.a+self.b*o.b)*d,(-self.a*o.b+self.b*o.a)*d)
    def __pow__(self,n):
        r=F2(self.p,1);a=self
        while n:
            if n&1:r=r*a
            a=a*a;n>>=1
        return r
    def __eq__(self,o):o=self.cast(o);return self.a==o.a and self.b==o.b
    def __hash__(self):return hash((self.a,self.b))
def tate(P,T,p,r):
    """Reduced Tate pairing evaluated at supersingular distortion of G."""
    C=Group(p,1,r,P);f=F2(p,1);R=P
    def line(A,B):
        if A[0]==B[0] and (A[1]+B[1])%p==0:return T[0]-A[0],F2(p,1)
        if A==B:k=(3*A[0]*A[0]+1)*pow(2*A[1],-1,p)%p
        else:k=(B[1]-A[1])*pow((B[0]-A[0])%p,-1,p)%p
        S=C.add(A,B)
        num=T[1]-A[1]-(T[0]-A[0])*k
        return num,(F2(p,1) if S is None else T[0]-S[0])
    for bit in bin(r)[3:]:
        numerator,denominator=line(R,R)
        f=f*f*numerator/denominator;R=C.add(R,R)
        if bit=='1':
            numerator,denominator=line(R,P)
            f=f*numerator/denominator;R=C.add(R,P)
    return f**((p*p-1)//r),C.ops
def finite_bsgs(g,h,p,n):
    m=math.isqrt(n)+1;table={};a=F2(p,1);ops=0
    for i in range(m):table.setdefault(a,i);a=a*g;ops+=1
    factor=g**(n-m);R=h
    for j in range(m+1):
        if R in table:return (j*m+table[R])%n,ops
        R=R*factor;ops+=1
    return None,ops
def mov_positive_control(seed):
    """True MOV-style pairing reduction, not just a low-embedding-degree flag."""
    start=time.perf_counter();p=131203;r=(p+1)//4
    assert p%4==3 and isprime(p) and isprime(r)
    C=Group(p,1,r,None)
    # Curve y²=x³+x, p ≡3 mod 4: |E(Fp)|=p+1=4r, embedding degree=2.
    for x in range(1,300):
        rhs=(x*x*x+x)%p
        if rhs and pow(rhs,(p-1)//2,p)==1:
            y=pow(rhs,(p+1)//4,p)
            P=C.mul(4,(x,y))
            if P is not None and C.mul(r,P) is None:break
    else:raise RuntimeError('No MOV base point')
    k=5271;Q=C.mul(k,P)
    # Distortion map (x,y)→(-x, i*y) provides independent r-torsion.
    T=(F2(p,-P[0]),F2(p,0,P[1]))
    u,op1=tate(P,T,p,r);v,op2=tate(Q,T,p,r)
    assert u!=F2(p,1) and u**r==F2(p,1) and u**k==v
    recovered,field_ops=finite_bsgs(u,v,p,r)
    assert recovered==k and C.mul(recovered,P)==Q
    return {'status':'pass','control':'supersingular_MOV_pairing','field_prime':p,
      'subgroup_prime':r,'subgroup_bits':r.bit_length(),'embedding_degree':2,
      'hidden_k':k,'recovered_k':recovered,'pairing_operations_EC':op1+op2,
      'finite_field_multiplications_BSGS':field_ops,
      'elapsed_seconds':time.perf_counter()-start,
      'note':'Genuine reduced Tate pairing followed by Fp² discrete log.'}
def fit(rows,method):
    v=[r for r in rows if r['method']==method and r['status']=='found']
    xs=[float(r['bits']) for r in v];ys=[math.log2(r['group_ops']) for r in v]
    if len(set(xs))<3:return None
    xm=statistics.mean(xs);ym=statistics.mean(ys)
    slope=sum((x-xm)*(y-ym) for x,y in zip(xs,ys))/sum((x-xm)**2 for x in xs)
    return {'method':method,'slope_log2_ops_vs_bits':slope,'samples':len(v)}
def svg(rows):
    colors={'exhaustive':'#f9c56b','BSGS':'#82d7bb','Pollard rho':'#82a9fa'}
    width,height=830,370;padl=64;top=30;ww=720;hh=280
    vals=[r for r in rows if r['status']=='found' and r['group_ops']>0]
    if not vals:return '<p>No measured series.</p>'
    hi=max(20,max(math.log2(r['group_ops']) for r in vals)+2)
    xp=lambda b:padl+(b-16)/(48-16)*ww
    yp=lambda op:top+hh*(1-math.log2(max(1,op))/hi)
    parts=[f'<svg viewBox="0 0 {width} {height}" width="100%" role="img" aria-label="Actual measured group operations by key bit length on log2 scale">',
      '<rect x="0" y="0" width="830" height="370" rx="14" fill="#0d1827"/>']
    for b in range(16,49,4):
        x=xp(b);parts.append(f'<line x1="{x:.1f}" y1="{top}" x2="{x:.1f}" y2="{top+hh}" stroke="#203447"/>')
        parts.append(f'<text x="{x:.1f}" y="330" text-anchor="middle" fill="#9eb4ca" font-size="11">{b}</text>')
    for power in range(0,int(hi)+1,4):
        y=yp(2**power)
        parts.append(f'<line x1="{padl}" y1="{y:.1f}" x2="{padl+ww}" y2="{y:.1f}" stroke="#32455c"/>')
        parts.append(f'<text x="54" y="{y+4:.1f}" text-anchor="end" fill="#9eb4ca" font-size="11">2^{power}</text>')
    for method,color in colors.items():
        points=sorted([(r['bits'],r['group_ops']) for r in vals if r['method']==method])
        if points:
            parts.append(f'<polyline points="{" ".join(f"{xp(b):.1f},{yp(o):.1f}" for b,o in points)}" fill="none" stroke="{color}" stroke-width="2.5"/>')
            for b,o in points:parts.append(f'<circle cx="{xp(b):.1f}" cy="{yp(o):.1f}" r="4" fill="{color}"><title>{method}: {b} bit, {o} operasjoner</title></circle>')
    for i,(method,color) in enumerate(colors.items()):
        parts.append(f'<circle cx="{padl+i*224}" cy="354" r="5" fill="{color}"/><text x="{padl+11+i*224}" y="358" fill="#d5e6f3" font-size="12">{method}</text>')
    parts.append('</svg>')
    return ''.join(parts)
def theoretical_svg(curves,rows):
    W,H=830,330;X=lambda b:62+(b-16)*22
    # Normalize theory to first available observed value per method.
    series=[('Exhaustive ~ n','exhaustive',1.0,'#f9c56b'),
      ('BSGS ~ √n','BSGS',.5,'#82d7bb'),('Pollard rho ~ √n','Pollard rho',.5,'#82a9fa')]
    out=[f'<svg viewBox="0 0 {W} {H}" width="100%" role="img" aria-label="Theoretical growth curves for linear versus square root complexity">',
      '<rect width="830" height="330" rx="14" fill="#0d1827"/>']
    maxlog=47;Y=lambda log:25+245*(1-log/maxlog)
    for bits in range(16,49,4):
        out.append(f'<text x="{X(bits)}" y="293" fill="#a7bed0" text-anchor="middle" font-size="11">{bits}</text>')
    for m in (0,8,16,24,32,40):
        out.append(f'<line x1="62" y1="{Y(m):.1f}" x2="790" y2="{Y(m):.1f}" stroke="#25384a"/><text x="54" y="{Y(m)+4:.1f}" fill="#a7bed0" text-anchor="end" font-size="11">2^{m}</text>')
    for i,(label,method,k,color) in enumerate(series):
        observed=sorted([r for r in rows if r['method']==method and r['status']=='found'],key=lambda x:x['bits'])
        if not observed:continue
        anchor=observed[0];offset=math.log2(anchor['group_ops'])-k*anchor['bits']
        pts=' '.join(f'{X(b):.1f},{Y(offset+k*b):.1f}' for b,_,_,_,_,_ in curves)
        out.append(f'<polyline points="{pts}" fill="none" stroke="{color}" stroke-width="2" stroke-dasharray="7 5"/>')
        out.append(f'<text x="{62+i*245}" y="315" fill="{color}" font-size="12">{html.escape(label)} (modell)</text>')
    out.append('</svg>');return ''.join(out)
def run(seed,extended):
    rng=random.Random(seed);curves=[];rows=[];ml=[]
    for bits,p,a,n,gx,gy in CURVES:
        G=(gx,gy);curves.append(verify_curve(bits,p,a,n,G))
        mlgroup=Group(p,0,n,G)
        t=time.perf_counter();m=key_ml(mlgroup,rng)
        ml.append(dict(bits=bits,n=n,elapsed_seconds=time.perf_counter()-t,**m))
        # Conservative default: limit CPU and memory on a 1 GiB VPS.
        configs=[('exhaustive',2 if bits==16 else 0,120000 if not extended else 600000),
                 ('BSGS',2 if bits<=24 else 1 if bits<=32 else 0,160000 if not extended else 600000),
                 ('Pollard rho',2 if bits<=24 else 1 if bits<=32 else 0,150000 if not extended else 600000)]
        for method,trials,cap in configs:
            if trials==0:
                rows.append(dict(bits=bits,n=n,method=method,trial=None,status='skipped_budget',
                    group_ops=None,elapsed_seconds=None,correct=None,reason='VPS resource cap / no extrapolated measurements'))
                continue
            for trial in range(trials):
                k=rng.randrange(1,n);offline=Group(p,0,n,G);Q=offline.mul(k)
                C=Group(p,0,n,G);t=time.perf_counter()
                if method=='exhaustive':result,status=brute(C,Q,cap)
                elif method=='BSGS':result,status=bsgs(C,Q,cap)
                else:result,status=pollard(C,Q,cap,rng)
                secs=time.perf_counter()-t;correct=result==k if result is not None else None
                if result is not None and not correct:raise AssertionError((method,bits,k,result))
                rows.append(dict(bits=bits,n=n,method=method,trial=trial+1,status=status,
                    group_ops=C.ops,elapsed_seconds=round(secs,6),correct=correct,reason='' if status=='found' else 'Operation cap'))
    mov=mov_positive_control(seed)
    return curves,rows,ml,mov
def build(out,seed,curves,rows,ml,mov,started):
    out.mkdir(parents=True,exist_ok=True)
    fits=[q for m in ('exhaustive','BSGS','Pollard rho') if (q:=fit(rows,m))]
    metadata={'created_utc':started,'seed':seed,'target_sizes':list(range(16,49,4)),
      'environment':'Python stdlib; ordinary curves with full prime group order (cofactor 1), Hasse certified',
      'curve_parameters':curves,'measurements':rows,'ml':ml,'positive_controls':[mov],
      'not_run':['Smart anomalous-curve attack (requires p-adic toolchain)'],
      'fits':fits,'limitations':[
        'Measured op counts are group additions/doublings, not equivalent CPU instructions.',
        'Memory/operation caps cause SKIPPED or CAPPED, not failures of attacks.',
        'ML is kNN scalar regression on (x/p,y/p), disjoint training and test keys.',
        'ML accuracy 1/n is a theoretical uniform-guess baseline; 60 trials per curve cannot resolve such tiny probabilities.',
        'Positive MOV test is on a weak supersingular curve; it does not imply the ML model learned the attack.',
        'Theoretical projections are not observed timings.']}
    (out/'results.json').write_text(json.dumps(metadata,indent=2,ensure_ascii=False))
    with (out/'measurements.csv').open('w',newline='') as f:
        fields=['bits','n','method','trial','status','group_ops','elapsed_seconds','correct','reason']
        w=csv.DictWriter(f,fieldnames=fields);w.writeheader();w.writerows(rows)
    with (out/'ml.csv').open('w',newline='') as f:
        fields=['bits','n','train','test','hits','random_hits','expected_random_hits','exact_accuracy','guess_accuracy','bit_accuracy','inference_seconds','group_ops_for_dataset','model','training_keys_disjoint','elapsed_seconds']
        w=csv.DictWriter(f,fieldnames=fields);w.writeheader();w.writerows(ml)
    measured=''.join(f'<tr><td>{r["bits"]}</td><td>{html.escape(r["method"])}</td><td>{r["trial"] or "—"}</td><td>{html.escape(r["status"])}</td><td>{format(r["group_ops"],",") if r["group_ops"] is not None else "—"}</td><td>{format(r["elapsed_seconds"],".4f") if r["elapsed_seconds"] is not None else "—"}</td></tr>' for r in rows)
    machine=''.join(f'<tr><td>{m["bits"]}</td><td>{m["train"]} / {m["test"]}</td><td>{m["hits"]}</td><td>{m["random_hits"]}</td><td>{m["expected_random_hits"]:.7f}</td><td>{m["bit_accuracy"]:.1%}</td></tr>' for m in ml)
    slopes=''.join(f'<li>{x["method"]}: estimert stigning {x["slope_log2_ops_vs_bits"]:.2f} (n={x["samples"]} målte kjøringer)</li>' for x in fits)
    page='''<!doctype html><html lang="nb"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>ECDLP – forsøk | SETAEI</title><style>
    :root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#0b131e;color:#e7f0f8;font:15px system-ui,Arial;line-height:1.6}main{width:min(1080px,calc(100% - 32px));margin:45px auto 100px}a{color:#c5f479}header{display:flex;justify-content:space-between;align-items:center;gap:10px}header strong{letter-spacing:2px}h1{font-size:clamp(30px,5vw,52px);line-height:1.1;margin:30px 0 15px}h1 span{color:#c5f479}h2{font-size:23px;margin:0 0 14px}.lead{font-size:16px;color:#acbed0;max-width:770px}.panel{background:linear-gradient(140deg,#172635,#111e2c);padding:24px;border:1px solid #32495d;border-radius:18px;margin:22px 0}.metric{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.metric div{border:1px solid #3a5864;border-radius:12px;padding:20px;background:#132637}.metric small{display:block;color:#a1b6c7}.metric strong{color:#c5f479;font-size:25px}table{width:100%;border-collapse:collapse;min-width:600px}td,th{padding:10px;border-bottom:1px solid #2f4758;text-align:left}th{color:#b4c9d9}td{font:12px ui-monospace,monospace}.scroll{overflow:auto;max-height:450px}p,li{color:#bfccda}ul{padding-left:20px}.button{display:inline-block;padding:10px 14px;border:1px solid #547c66;background:#1a362d;text-decoration:none;border-radius:8px;margin:4px 6px 4px 0}caption{color:#9bb1c3;font-size:12px}footer{color:#8aa0b3;font-size:12px;margin-top:35px}@media(max-width:650px){.metric{grid-template-columns:1fr}.panel{padding:15px}} </style></head><body><main>
    <header><strong>SETAEI / RESEARCH LAB</strong><a href="/key/">← Tilbake til nøkkelverktøyet</a></header>
    <h1>Kan vi regne <span>baklengs?</span></h1><p class="lead">Målbart og reproduserbart ECDLP-forsøk. Ni elliptiske kurver med verifisert primtallsorden fra 16 til 48 bit, fire tilnærminger, og en faktisk gjennomført MOV-positivkontroll.</p>
    <p>Generert: __DATE__ UTC · Fast tilfeldig seed: __SEED__. Ingen virkelige wallet-nøkler brukes.</p>
    <div class="metric"><div><small>Kurvestørrelser</small><strong>9 × 16–48 bit</strong></div><div><small>MOV-positivkontroll</small><strong>PASS</strong></div><div><small>Trenings- og testnøkler</small><strong>Helt adskilt</strong></div></div>
    <section class="panel"><h2>Faktisk målte gruppeoperasjoner</h2><p>Vertikal akse er log₂ antall gruppeoperasjoner. Bare fullførte, verifiserte tester plottes. Manglende datapunkter er <strong>ikke</strong> målt.</p>__SVG__</section>
    <section class="panel"><h2>Forventet vekst – ikke målte tall</h2><p>Stiplet modellskisse, forankret i første målte resultat per metode: uttømmende søk O(n), BSGS og Pollard rho O(√n). Dette er en prognose, ikke en påstand om faktisk tid på 48 bit.</p>__THEORY__</section>
    <section class="panel"><h2>Forsøksresultater</h2><div class="scroll"><table><thead><tr><th>Bit</th><th>Metode</th><th>Forsøk</th><th>Status</th><th>Gruppeoperasjoner</th><th>Sekunder</th></tr></thead><tbody>__ROWS__</tbody></table></div></section>
    <section class="panel"><h2>ML-baseline: 5 nærmeste naboer</h2><p>ML får offentlige punktkoordinater (X,Y) og lærer en regresjon til nøkkeltallet k. Ingen testnøkler finnes i treningsdata. «Forventet flakstreff» = antall tester /(n−1), altså ren tilfeldig nøkkelgjetning. Treff=0 på 60 tester gir ingen statistisk kraft til å skille mellom ekstremt små sannsynligheter.</p>
    <div class="scroll"><table><thead><tr><th>Bit</th><th>Trening / test</th><th>ML-treff</th><th>Tilfeldige treff</th><th>Forventede tilfeldige treff</th><th>Bitlikhet</th></tr></thead><tbody>__ML__</tbody></table></div></section>
    <section class="panel"><h2>Positiv kontroll: kjent svak supersingulær kurve</h2><p><strong>Bestått:</strong> Testen bruker den faktiske MOV-reduksjonen med en redusert Tate-paring til Fp², ikke bare et teoretisk flagg.</p>
    <p>p=__MOVP__, undergruppe n=__MOVN__ (16 bit), embedding degree 2. En skjult nøkkel __MOVK__ ble gjenfunnet som __MOVR__ gjennom reduksjon til en endelig-felt-diskret logaritme. Verifisert med kG=Q. Tid: __MOVT__ sekunder.</p>
    <p>Smart-angrepet på anomale kurver er <strong>ikke implementert</strong>; det er oppført som ikke kjørt, ikke som feilslått kontroll. En ren ML-regressor får ikke automatisk tilgang til paringsstrukturen; MOV-resultatet viser at den matematiske positivkontrollen fungerer, ikke at ML har lært MOV.</p></section>
    <section class="panel"><h2>Vekstregresjon fra målinger</h2><ul>__FITS__</ul><p>Forventet log₂-stigning: omtrent 1 for lineært søk og 0,5 for kvadratrotsmetoder. Få observasjoner og tilfeldig variasjon gjør estimatene usikre.</p></section>
    <section class="panel"><h2>Data og reproduserbarhet</h2><a class="button" href="./benchmark.py">Python-kilde</a><a class="button" href="./results.json">Alle resultater (JSON)</a><a class="button" href="./measurements.csv">Søkeresultater (CSV)</a><a class="button" href="./ml.csv">ML-test (CSV)</a><p>Kan kjøres lokalt med <code>python3 benchmark.py --seed __SEED__</code>. Ingen Python-tillegg nødvendig. Kjøring med større budsjett: <code>python3 benchmark.py --extended</code>. Status «skipped_budget» og «capped» er ressursgrenser, ikke nederlag for metoden.</p></section>
    <footer>SETAEI · Kryptografisk forskning for undervisning. Ikke et verktøy for å gjenopprette andres lommebøker.</footer></main></body></html>'''
    for src,dst in {'__DATE__':started,'__SEED__':str(seed),'__SVG__':svg(rows),'__THEORY__':theoretical_svg(CURVES,rows),'__ROWS__':measured,'__ML__':machine,'__FITS__':slopes,
      '__MOVP__':str(mov['field_prime']),'__MOVN__':str(mov['subgroup_prime']),'__MOVK__':str(mov['hidden_k']),
      '__MOVR__':str(mov['recovered_k']),'__MOVT__':f"{mov['elapsed_seconds']:.4f}"}.items():page=page.replace(src,dst)
    (out/'index.html').write_text(page)
    return fits
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--seed',type=int,default=20261022)
    ap.add_argument('--extended',action='store_true')
    ap.add_argument('--out',default=str(Path(__file__).resolve().parent))
    a=ap.parse_args();started=datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
    t=time.perf_counter()
    curves,rows,ml,mov=run(a.seed,a.extended)
    fits=build(Path(a.out),a.seed,curves,rows,ml,mov,started)
    print(json.dumps({'status':'PASS','curve_sizes':[c['bits'] for c in curves],
      'complete':sum(r['status']=='found' for r in rows),'skipped':sum(r['status']=='skipped_budget' for r in rows),
      'capped':sum(r['status']=='capped' for r in rows),
      'mov':mov['status'],'fits':fits,'wall_seconds':round(time.perf_counter()-t,2)},indent=2))
if __name__=='__main__':main()

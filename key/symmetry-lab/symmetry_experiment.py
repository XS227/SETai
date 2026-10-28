#!/usr/bin/env python3
"""SETAEI small-curve symmetry audit (education only, not an ECDLP solver).
Verify the 6-element automorphism orbit on ordinary j=0 prime-order curves,
then model *independent birthday sampling* in the full group vs its quotient.
Reproduce: python3 symmetry_experiment.py --seed 20261022 --repeats 300
"""
import argparse,html,json,math,random,statistics,sys,time
from pathlib import Path
from datetime import datetime,timezone
sys.path.insert(0,str(Path(__file__).resolve().parent.parent/'research-v2'))
import benchmark_reference as ref

def nontrivial_cuberoot(prime):
    assert prime%3==1
    for base in range(2,100):
        x=pow(base,(prime-1)//3,prime)
        if x!=1 and pow(x,3,prime)==1:return x
    raise ArithmeticError('No cubic root of unity')

def equiv_scalars(k,n,lam):
    l2=lam*lam%n
    return {k%n,(-k)%n,lam*k%n,(-lam*k)%n,l2*k%n,(-l2*k)%n}
def equiv_points(P,p,beta):
    if P is None:return {None}
    x,y=P; b2=beta*beta%p
    return {(x,y),(x,(-y)%p),(x*beta%p,y),
      (x*beta%p,(-y)%p),(x*b2%p,y),(x*b2%p,(-y)%p)}
def representative(k,n,lam):
    k1=k%n; k2=lam*k1%n;k3=lam*k2%n
    return min(k1,n-k1,k2,n-k2,k3,n-k3)
def sample_until_collision(rng,n,lam=None):
    seen=set();t=0
    while True:
        k=rng.randrange(1,n)
        key=k if lam is None else representative(k,n,lam)
        t+=1
        if key in seen:return t
        seen.add(key)
def calc(seed,repeats):
    rng=random.Random(seed)
    curves=[]
    group_params={}
    for bits,p,coef,n,gx,gy in ref.CURVES:
        G=(gx,gy)
        ref.verify_curve(bits,p,coef,n,G)
        curve=ref.Group(p,0,n,G)
        beta=nontrivial_cuberoot(p)
        lam0=nontrivial_cuberoot(n)
        phi=lambda P:(beta*P[0]%p,P[1]) if P else None
        phi_G=phi(G)
        lam=lam0 if curve.mul(lam0)==phi_G else (lam0*lam0)%n
        assert curve.mul(lam)==phi_G
        assert (lam*lam+lam+1)%n==0
        b2=beta*beta%p
        assert b2*beta%p==1 and beta!=1
        assert len(equiv_scalars(1,n,lam))==6
        for _ in range(14):
            k=rng.randrange(1,n)
            P=curve.mul(k)
            assert phi(P)==curve.mul(lam*k%n)
            assert phi(phi(phi(P)))==P
            assert len(equiv_points(P,p,beta))==6
            a=rng.randrange(1,n);b=rng.randrange(1,n)
            assert phi(curve.add(curve.mul(a),curve.mul(b)))==curve.add(phi(curve.mul(a)),phi(curve.mul(b)))
        curves.append({'bits':bits,'field_p':p,'order_n':n,'beta':beta,'lambda':lam,
          'orbit_size_for_nonzero_points':6,'predicted_distinct_orbits':(n-1)//6+1,
          'invariant_tests':14,'passed':True})
        group_params[bits]=(n,lam)
        print('VERIFIED',bits,'bit, order',n,'lambda',lam,flush=True)
    # Independent exact census at 16bit: one pass over all points.
    bits,p,coef,n,gx,gy=ref.CURVES[0]
    P=None;G=(gx,gy);C=ref.Group(p,0,n,G)
    seen=set()
    for _ in range(n):
        if P is None:key=('zero',)
        else:
            orbit=equiv_points(P,p,curves[0]['beta'])
            key=min(orbit)
        seen.add(key)
        P=C.add(P,G)
    assert P is None
    expected=(n-1)//6+1
    assert len(seen)==expected
    census={'bits':bits,'tested_points':n,'distinct_orbits':len(seen),
        'theoretical_orbits':expected,'exact_enumeration':True,
        'group_additions':C.ops}
    trials=[]
    for bits in (16,20,24):
        n,lam=group_params[bits]
        expected_all=math.sqrt(math.pi*(n-1)/2)
        expected_quotient=math.sqrt(math.pi*(n-1)/12)
        for rep in range(1,repeats+1):
            full=sample_until_collision(rng,n)
            quotient=sample_until_collision(rng,n,lam)
            trials.append({'bits':bits,'replicate':rep,'full_group_samples':full,
                'symmetry_quotient_samples':quotient,
                'model':'independent_uniform_birthday_sampling_NOT_real_Pollard_rho'})
        print('SIMULATED',bits,'bit',repeats,'pairs',flush=True)
    summaries=[]
    for bits in (16,20,24):
        items=[r for r in trials if r['bits']==bits]
        f=[r['full_group_samples'] for r in items]
        q=[r['symmetry_quotient_samples'] for r in items]
        med=lambda x:round(statistics.median(x),2)
        summaries.append({'bits':bits,'samples':len(items),
            'mean_full_samples':round(statistics.mean(f),2),
            'mean_quotient_samples':round(statistics.mean(q),2),
            'ratio_means':round(statistics.mean(f)/statistics.mean(q),4),
            'median_full':med(f),'median_quotient':med(q),
            'predicted_asymptotic_speedup':round(math.sqrt(6),4)})
    return {'timestamp_utc':datetime.now(timezone.utc).isoformat(),
       'seed':seed,'repeats':repeats,'curves':curves,'census':census,
       'collision_simulation_summary':summaries,
       'collision_simulation_raw':trials,
       'status':'PASS','limitations':[
         'Automorphism identity and orbit sizes are mathematically known, NOT newly discovered.',
         'Collision sampling is independent random drawing from a mathematical quotient, NOT a functioning Pollard rho ECDLP search.',
         'Sample-count gain ignores canonicalization costs, fruitless cycles, validation and search setup.',
         'Actual speedup of a real walk may be smaller or absent; no attack on Ethereum keys or addresses was performed.',
         'Small research curves share j=0 symmetry but do not reproduce the 256-bit security setting.',
         'No ML model or novel learning shortcut was tested in this study.']}
def chart(summaries):
    width,height=860,360
    vals=[v for row in summaries for v in (row['mean_full_samples'],row['mean_quotient_samples'])]
    maxi=max(vals)*1.15
    Y=lambda v:height-65-v/maxi*275
    out=[f'<svg viewBox="0 0 {width} {height}" width="100%" role="img" aria-label="Observed average independent samples to first birthday collision: full group versus sixfold symmetry quotient">',
       f'<rect width="{width}" height="{height}" rx="14" fill="#091a29"/>']
    for i,row in enumerate(summaries):
        xc=165+i*260
        for j,(key,color) in enumerate((('mean_full_samples','#90b9ff'),('mean_quotient_samples','#c5f479'))):
            x=xc+j*70
            v=row[key];y=Y(v)
            out.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="55" height="{height-65-y:.1f}" rx="5" fill="{color}"/>')
            out.append(f'<text x="{x+27:.1f}" y="{y-8:.1f}" font-size="12" text-anchor="middle" fill="#e6f1fa">{v:,.0f}</text>')
        out.append(f'<text x="{xc+60}" y="{height-29}" font-size="14" text-anchor="middle" fill="#cfdfeb">{row["bits"]} bit</text>')
    out.append('<circle cx="205" cy="18" r="6" fill="#90b9ff"/><text x="217" y="22" fill="#c6d9ed" font-size="12">Uten symmetri</text>')
    out.append('<circle cx="402" cy="18" r="6" fill="#c5f479"/><text x="414" y="22" fill="#c6d9ed" font-size="12">6-punkts ekvivalens</text></svg>')
    return ''.join(out)
def generate(results,path):
    path.mkdir(parents=True,exist_ok=True)
    (path/'results.json').write_text(json.dumps(results,indent=2,ensure_ascii=False))
    summary=results['collision_simulation_summary']
    rows=''.join('<tr>'+''.join(f'<td>{html.escape(str(r[k]))}</td>' for k in
        ('bits','samples','mean_full_samples','mean_quotient_samples','ratio_means','predicted_asymptotic_speedup'))+'</tr>' for r in summary)
    curve_rows=''.join(f'<tr><td>{c["bits"]}</td><td>{c["order_n"]:,}</td><td>{c["predicted_distinct_orbits"]:,}</td><td>PASS</td></tr>' for c in results['curves'])
    page='''<!doctype html><html lang="nb"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Symmetry audit — SETAEI</title><style>
:root{color-scheme:dark}*{box-sizing:border-box}body{background:#0c1621;color:#e8f1f9;font:15px/1.7 system-ui,Arial;margin:0}
main{max-width:1100px;margin:38px auto 90px;padding:0 22px}a{color:#c5f479}
h1{font-size:clamp(32px,6vw,60px);line-height:1.09;margin:25px 0}h1 span{color:#c5f479}h2{font-size:23px}
p,li{color:#b7cbd8}.intro{font-size:17px;max-width:810px}.box{border:1px solid #365268;background:linear-gradient(140deg,#15293b,#101e2a);padding:22px;border-radius:16px;margin:20px 0}
.stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.stats div{background:#132839;border:1px solid #365464;border-radius:11px;padding:18px}
.stats small{display:block;color:#9db5c6}.stats strong{display:block;color:#c5f479;font-size:25px}
table{width:100%;border-collapse:collapse;min-width:560px}th,td{text-align:left;padding:11px;border-bottom:1px solid #355064}th{color:#b4c9d9}td{font:12px ui-monospace,monospace}.scroll{overflow:auto}
.tag{font-size:12px;display:inline-block;padding:7px 13px;border:1px solid #667b58;border-radius:30px;color:#d1e8be}
.download{display:inline-block;margin:5px 9px 5px 0;padding:12px 15px;border:1px solid #658f76;border-radius:9px;background:#1a3b2c;text-decoration:none}
@media(max-width:670px){.stats{grid-template-columns:1fr}.box{padding:14px}}
</style></head><body><main><a href="/key/research-v2/">← Forsøksrapport v2</a><h1>Symmetri i <span>elliptiske kurver</span></h1><p class="tag">Kontrollert matematisk studie · kjent teori, ingen ny kryptografisk snarvei</p>
<p class="intro">Vi undersøker om seks relaterte kurvepunkter kan behandles som ett matematisk objekt. Testen verifiserer symmetrier på ni forskningskurver og måler idealisert kollisjonssannsynlighet. Den finner ikke private nøkler til virkelige adresser.</p>
<div class="stats"><div><small>Kurver verifisert</small><strong>9 av 9</strong></div><div><small>Teoretisk reduksjon i klasser</small><strong>6 : 1</strong></div><div><small>Mulig idealisert kollisjonsgevinst</small><strong>√6 ≈ 2,45×</strong></div></div>
<section class="box"><h2>Hva ble faktisk bevist?</h2><p>På kurver av formen y²=x³+b med en primtallsorden n, gir multiplikasjon av X med en kubisk enhetsrot og fortegnsskifte av Y en gruppe på seks relaterte punkter. Vi verifiserte at disse avbildningene bevarer kurven og samsvarer med skalaroperasjoner på alle ni syntetiske grupper. En <b>eksakt opptelling</b> over hele 16-biterskurven bekreftet at antallet ekvivalensklasser er (n−1)/6+1.</p>
<p><b>Viktig:</b> Dette er etablert gruppeteori og ikke en ny oppdagelse. Ekvivalensklasser reduserer ikke automatisk kjøretiden til Pollard rho: kostnaden for normalisering og risikoen for korte, ubrukelige sykluser må håndteres.</p></section>
<section class="box"><h2>Simulert idealisert kollisjonseksperiment</h2><p>Vi trekker tilfeldige, uavhengige gruppeelementer frem til første gjentakelse. I den grønne serien teller vi to elementer som like når de tilhører samme seks-punktsklasse. Dette er <b>IKKE</b> en virkelig Pollard rho-vandring eller et søk etter skjult nøkkel.</p>__CHART__</section>
<section class="box"><h2>Måledata fra simuleringen</h2><div class="scroll"><table><thead><tr><th>Bit</th><th>Repetisjoner</th><th>Snitt uten</th><th>Snitt seksfold</th><th>Målt forhold</th><th>Teori</th></tr></thead><tbody>__ROWS__</tbody></table></div><p>Forventningen for idealisert prøveantall er omtrent √(πn/2) uten symmetri og √(πn/12) med seksfold symmetri. Antall grupper og punktoperasjoner i en reell ECDLP-løser kan være annerledes.</p></section>
<section class="box"><h2>Kurveverifikasjon</h2><p>Alle ni testkurver har verifisert primtallsorden, og de seks symmetriene er verifisert på tilfeldig valgte punkter. Fullstendig orbit-opptelling er utført for 16 bit; resten er basert på algebraisk gruppestruktur samt stikkprøvetester.</p><div class="scroll"><table><thead><tr><th>Bit</th><th>Gruppeorden</th><th>Forventede klasser</th><th>Test</th></tr></thead><tbody>__CURVES__</tbody></table></div></section>
<section class="box"><h2>Forskningsmessig konklusjon</h2><p>Dette demonstrerer <b>ingen ny løsning</b> på elliptisk kurve-diskret logaritme. En reell algoritme må måles på blinde testnøkler, vise verdi utover eksisterende automorfimetoder og inkludere hele tids- og minnekostnaden. Selv en konstantfaktorforbedring på omtrent 2,45× ville ikke gjøre 256-biters Ethereum-nøkler praktisk mulig å finne.</p><p>Det er dokumentert i kryptografilitteraturen at naiv symmetri-normalisering kan skape fruktløse sykluser. Denne demoen er bevisst begrenset til korrekt algebra og idealiserte kollisjoner.</p></section>
<section class="box"><h2>Reproduser resultater</h2><a class="download" href="./symmetry_experiment.py">Python-kilde</a><a class="download" href="./results.json">Resultater (JSON)</a><p>Standardbiblioteket i Python. Fra denne katalogen: <code>python3 symmetry_experiment.py --seed __SEED__ --repeats __REPEATS__</code>. Krever referansefilen i ../research-v2/benchmark_reference.py.</p></section></main></body></html>'''
    for src,dst in {'__CHART__':chart(summary),'__ROWS__':rows,'__CURVES__':curve_rows,'__SEED__':str(results['seed']),'__REPEATS__':str(results['repeats'])}.items():page=page.replace(src,dst)
    (path/'index.html').write_text(page)
if __name__=='__main__':
    ap=argparse.ArgumentParser()
    ap.add_argument('--seed',type=int,default=20261022)
    ap.add_argument('--repeats',type=int,default=300)
    a=ap.parse_args();t=time.monotonic()
    result=calc(a.seed,a.repeats)
    generate(result,Path(__file__).resolve().parent)
    print(json.dumps({'status':result['status'],'curves_verified':len(result['curves']),
        'census':result['census'],'simulation':result['collision_simulation_summary'],
        'seconds':round(time.monotonic()-t,3)},ensure_ascii=False,indent=2))

#!/usr/bin/env python3
"""SETAEI research v3: overlap-versus-independence statistical probe.
No elliptic-curve operations, no cryptographic key reconstruction.
A toy surrogate for dependence assumptions in combinatorial success models.
"""
import itertools,json,math,random,time
from pathlib import Path

CONFIGS=[
    {'prime':1009,'n':14,'subset':3},
    {'prime':4093,'n':20,'subset':3},
    {'prime':4093,'n':18,'subset':4},
    {'prime':20011,'n':22,'subset':4},
]
TRIALS=1000
SEED=20261022

def confidence(k,total):
    z=1.96;p=k/total;d=1+z*z/total
    center=(p+z*z/(2*total))/d
    spread=z*math.sqrt(p*(1-p)/total+z*z/(4*total*total))/d
    return [max(0,center-spread),min(1,center+spread)]
def run_case(prime,n,r,mode,rng):
    combos=list(itertools.combinations(range(n),r))
    M=len(combos);found=0
    for trial in range(TRIALS):
        if mode=='uniform':
            residues=[rng.randrange(prime) for _ in range(n)]
        elif mode=='paired':
            source=[rng.randrange(prime) for _ in range((n+1)//2)]
            residues=[source[i//2] for i in range(n)]
        elif mode=='identical':
            v=rng.randrange(prime)
            residues=[v]*n
        else:raise ValueError(mode)
        target=rng.randrange(prime)
        for combo in combos:
            if sum(residues[i] for i in combo)%prime==target:
                found+=1;break
    observed=found/TRIALS
    independent=1-(1-1/prime)**M
    return {'prime':prime,'positions':n,'subset_size':r,'candidate_sets':M,
        'dependency_model':mode,'trials':TRIALS,'positive_cases':found,
        'observed_success_rate':observed,'wilson95':confidence(found,TRIALS),
        'independence_formula':independent,
        'difference_observed_minus_formula':observed-independent,
        'independence_inside_ci':confidence(found,TRIALS)[0]<=independent<=confidence(found,TRIALS)[1]}
def main():
    start=time.perf_counter();rng=random.Random(SEED);rows=[]
    for config in CONFIGS:
        for mode in ('uniform','paired','identical'):
            result=run_case(config['prime'],config['n'],config['subset'],mode,rng)
            rows.append(result)
            print(config['prime'],config['n'],config['subset'],mode,
                  'observed',f"{result['observed_success_rate']:.3f}",
                  'model',f"{result['independence_formula']:.3f}",flush=True)
    output={'title':'Overlapping subset probability: control experiment',
        'date_utc':'2026-10-22','seed':SEED,
        'scope':'Toy subset-sum surrogate; NOT a reproduction or assessment of an ECDLP method.',
        'hypothesis':'Independence formulas can fail when candidate events share latent variables.',
        'models':{
            'uniform':'n independently random residues; subset events overlap in coordinates.',
            'paired':'Each pair of positions shares one residue; stronger dependence.',
            'identical':'All positions share one residue; deliberately extreme dependence.'},
        'statistics':'Wilson 95% binomial interval across independent simulation trials',
        'limitation':'This is not the zero-minor signature-matrix distribution in Mahalanobis 2026.',
        'elapsed_seconds':round(time.perf_counter()-start,3),
        'results':rows}
    root=Path(__file__).resolve().parent
    (root/'overlap_results.json').write_text(json.dumps(output,ensure_ascii=False,indent=2))
    print('FINAL',len(rows),'comparisons',output['elapsed_seconds'],'seconds')
if __name__=='__main__':main()

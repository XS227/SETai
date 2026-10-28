import json, math, hashlib, collections, datetime, html
from pathlib import Path
from zoneinfo import ZoneInfo
import numpy as np
from scipy import stats
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

ROOT=Path(__file__).parent
D=json.loads((ROOT/'input.json').read_text())
OUT=ROOT/'output'; OUT.mkdir(exist_ok=True)
BASE='https://setai.no/key/research-v4/'
def mean_ci(values,reference=0):
    a=np.asarray(values,dtype=float); n=len(a); mean=float(a.mean()); sd=float(a.std(ddof=1)); se=sd/math.sqrt(n)
    q=float(stats.t.ppf(.975,n-1)); t=(mean-reference)/se if se else 0
    return dict(n=n,mean=mean,sd=sd,se=se,ci95=[mean-q*se,mean+q*se],reference=reference,p=float(2*stats.t.sf(abs(t),n-1)) if se else 1.)
def aggregate(values):
    return dict(count=len(values),sum=sum(values),sumSquare=sum(v*v for v in values))
def subset(cohort,phase): return [r for r in D['rows'] if r['cohort']==cohort and r['phase']==phase]
def holm(measures):
    ordered=sorted(enumerate(measures),key=lambda x:x[1]['p']); previous=0
    for rank,(i,m) in enumerate(ordered):
        previous=max(previous,min(1,(len(ordered)-rank)*m['p'])); measures[i]['pHolm']=previous
def date(v): return datetime.datetime.fromisoformat(v.replace('Z','+00:00'))
def local(v): return date(v).astimezone(ZoneInfo('Europe/Berlin')).strftime('%d.%m.%Y kl. %H:%M:%S')
def num(v,d=2): return f'{v:,.{d}f}'.replace(',',' ').replace('.',',')
def ci(m):return f"{num(m['mean'])} [{num(m['ci95'][0])}; {num(m['ci95'][1])}]"
def pval(p):return '<0,0001' if p<.0001 else num(p,4)

checks={}; cohorts={}
for cohort,targets in [('replay',D['protocol']['originalCohort']),('fresh',D['protocol']['freshCohort'])]:
    phases={p:subset(cohort,p) for p in targets}
    checks[cohort+'_counts']=all(len(phases[p])==n for p,n in targets.items())
    checks[cohort+'_unique_ids']=all(sorted(r['index'] for r in phases[p])==list(range(n)) for p,n in targets.items())
    model=mean_ci([r['difference'] for r in phases['model']])
    ranking=mean_ci([r['difference'] for r in phases['ranking']])
    avalanche=mean_ci([r['addressBitsChanged'] for r in phases['avalanche']],80)
    holm([model,ranking,avalanche])
    model.update(modelMeanBits=np.mean([r['modelBits'] for r in phases['model']]).item(),randomMeanBits=np.mean([r['randomBits'] for r in phases['model']]).item(),exactKeys=sum(r['modelExact'] for r in phases['model']))
    ranking.update(selectedMeanBits=np.mean([r['selectedKeyBits'] for r in phases['ranking']]).item(),baselineMeanBits=np.mean([r['baselineKeyBits'] for r in phases['ranking']]).item())
    checks[cohort+'_one_key_bit_changed']=all(r['keyBitsUnchanged']==255 for r in phases['avalanche'])
    cohorts[cohort]=dict(model=model,ranking=ranking,avalanche=avalanche)

mapping={'modelMatch':('model','modelBits'),'randomMatch':('model','randomBits'),'modelMinusRandom':('model','difference'),'selectionMinusRandom':('ranking','difference'),'selectedKeyMatch':('ranking','selectedKeyBits'),'selectedAddressMatch':('ranking','selectedAddressBits'),'randomKeyMatch':('ranking','baselineKeyBits'),'avalancheAddressMatch':('avalanche','addressBitsUnchanged'),'avalancheSecretMatch':('avalanche','keyBitsUnchanged')}
replay_checks={k:aggregate([r[field] for r in subset('replay',phase)])==D['original']['totals'][k] for k,(phase,field) in mapping.items()}
checks['all_nine_original_aggregate_statistics_reproduced']=all(replay_checks.values())
checks['protocol_precedes_every_logged_trial']=date(D['protocol']['lockedAtUtc'])<=min(date(r['timestampUtc']) for r in D['rows'])
checks['balanced_fresh_bit_positions']=set(collections.Counter(r['flippedBit'] for r in subset('fresh','avalanche')).values())=={2}
checks['no_missing_or_duplicate_rows']=len(D['rows'])==7168

O=D['observation']; S=O['stats']; hist=np.array(S['histogram'],dtype=np.int64); x=np.arange(161); n=int(hist.sum())
checks['histogram_count_matches']=n==S['samples']
checks['histogram_bit_sum_matches']=int((hist*x).sum())==S['totalMatchedBits']
checks['histogram_squared_sum_matches']=int((hist*x*x).sum())==S['sumSquares']
checks['inclusive_attempt_range_matches']=int(O['attempts'])-int(S['sinceAttempt'])+1==n
checks['recorded_maximum_matches_histogram']=int(x[hist>0].max())==S['bestMatchedBits']
checks['all_tail_counts_match']=all(int(hist[k:].sum())==S[name] for k,name in [(96,'ninetySixOrMore'),(104,'hundredFourOrMore'),(112,'hundredTwelveOrMore'),(160,'exactMatches')])
mean=S['totalMatchedBits']/n; variance=(S['sumSquares']-S['totalMatchedBits']**2/n)/(n-1); se=math.sqrt(variance/n)
expected=stats.binom.pmf(x,160,.5)*n
obs_groups=[]; exp_groups=[]; so=0; se_group=0.
for o,e in zip(hist,expected):
    so+=int(o); se_group+=float(e)
    if se_group>=5: obs_groups.append(so);exp_groups.append(se_group);so=0;se_group=0.
if se_group:
    obs_groups[-1]+=so;exp_groups[-1]+=se_group
chi=float(sum((o-e)**2/e for o,e in zip(obs_groups,exp_groups)))
max_tail=float(stats.binom.sf(S['bestMatchedBits']-1,160,.5)); max_probability=-math.expm1(n*math.log1p(-max_tail))
observation=dict(capturedUtc=O['capturedUtc'],checkpointUtc=O['checkpointUtc'],jobStartedUtc=O['jobStartedUtc'],attempts=O['attempts'],samples=n,sinceAttempt=S['sinceAttempt'],meanMatchedBits=mean,ci95IID=[mean-1.96*se,mean+1.96*se],sd=math.sqrt(variance),referenceMean=80,bestMatchedBits=S['bestMatchedBits'],exactAddressMatches=S['exactMatches'],probabilityAtLeastThisMaxIID=max_probability,chiSquare=chi,chiSquareDf=len(obs_groups)-1,chiSquareP=float(stats.chi2.sf(chi,len(obs_groups)-1)),histogram=hist.tolist(),expectedHistogramIID=expected.tolist(),tails=[dict(threshold=k,observed=int(hist[k:].sum()),expectedIID=float(stats.binom.sf(k-1,160,.5)*n)) for k in [96,104,112,116]],scope='Exploratory public-address statistics; iid/binomial reference is an explicit model assumption, not demonstrated cryptographic independence.')

H=D['historical']; v2=H['research-v2/results_v2.json']; v1=H['research/results.json']; sym=H['symmetry-lab/results.json']
completed=[r for r in v2['runs'] if r.get('event') is True]
historical={
 'v1':dict(measurementRows=len(v1['measurements']),mlRows=len(v1['ml']),fits=v1['fits'],limitations=v1['limitations']),
 'v2':dict(plannedRows=len(v2['runs']),statuses=dict(collections.Counter(r['status'] for r in v2['runs'])),timingModes=dict(collections.Counter(r['timing_mode'] for r in completed)),slopes=v2['slopes'],summary=v2['summary'],mlRows=len(v2['ml']),mlStatuses=dict(collections.Counter(r['status'] for r in v2['ml'])),positiveControls=dict(MOV=v2['MOV_positive_control']['status'],Smart=v2['Smart_positive_control']['status']),limitations=v2['limitations']),
 'symmetry':dict(curves=len(sym['curves']),invariantsPassed=all(c['passed'] for c in sym['curves']),census=sym['census'],simulationRows=len(sym['collision_simulation_raw']),summary=sym['collision_simulation_summary'],limitations=sym['limitations']),
 'addressOverlap':H['research-v3/address_overlap_study_20261023.json'],
 'expandedTraining':H['research-v3/expanded_training_20261023.json'],
 'knownPairValidation':H['research-v3/known_pair_validation_20261023.json'],
 'overlapSurrogate':dict(rows=len(H['research-v3/overlap_results.json']['results']),scope=H['research-v3/overlap_results.json']['scope'],elapsedSeconds=H['research-v3/overlap_results.json']['elapsed_seconds'])}
checks['all_small_curve_invariants_recorded_pass']=historical['symmetry']['invariantsPassed']
checks['original_cohort_completed']=D['original']['state']=='completed'
if not all(checks.values()): raise RuntimeError('Integrity checks failed: '+str({k:v for k,v in checks.items() if not v}))
fresh=cohorts['fresh']; original=cohorts['replay']
advantage=fresh['model']['ci95'][0]>0 and fresh['model']['pHolm']<.05
conclusion=('Den ferske kontrollrunden viser et positivt signal for den låste modellen. Dette må undersøkes videre uten å tolke bitgevinst som helnøkkelgjenfinning.' if advantage else 'Den ferske kontrollrunden dokumenterer ingen forbedring av nøkkelbitgjetting fra den låste modellen sammenlignet med tilfeldig gjetting.')
analysis=dict(schema='setai-experiment-audit-v1',studyId=D['run']['id'],protocolSha256=D['run']['protocolSha256'],trialLogSha256=D['run']['trialLogSha256'],protocol=D['protocol'],run=D['run'],originalStartedUtc=D['original']['started'],originalEndedUtc=D['original']['updated'],originalWallSeconds=(date(D['original']['updated'])-date(D['original']['started'])).total_seconds(),uniqueControlledTrials=7168,newIndependentTrials=4512,originalTrials=2656,replayTrials=2656,cohorts=cohorts,replayChecks=replay_checks,checks=checks,observation=observation,historical=historical,inventory=D['inventory'],conclusion=conclusion,advantageDetected=advantage,reportUrl=BASE)
(OUT/'analysis.json').write_text(json.dumps(analysis,ensure_ascii=False,indent=2))

plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'axes.spines.top':False,'axes.spines.right':False})
fig,ax=plt.subplots(figsize=(9,4.5),layout='constrained'); labels=[]
entries=[('AI: original',original['model'],'#477bb3'),('AI: ny kontroll',fresh['model'],'#148579'),('Rangering: original',original['ranking'],'#477bb3'),('Rangering: ny kontroll',fresh['ranking'],'#148579')]
for i,(label,m,color) in enumerate(entries):
    y=len(entries)-1-i;ax.errorbar(m['mean'],y,xerr=[[m['mean']-m['ci95'][0]],[m['ci95'][1]-m['mean']]],fmt='o',color=color,capsize=5,lw=2)
    labels.append(f"{label} (n={m['n']:,})")
ax.axvline(0,color='#a65740',ls='--',lw=1);ax.set_yticks(range(4),labels[::-1]);ax.set_xlabel('Forskjell i riktige nøkkelbiter mot tilfeldig kontroll (95 % KI)');ax.set_title('Låst modell og adresserangering',loc='left',fontweight='bold',pad=15);ax.grid(axis='x',alpha=.15)
fig.savefig(OUT/'effect_intervals.png',dpi=190);plt.close(fig)
fig,axes=plt.subplots(1,2,figsize=(10,4.3),layout='constrained')
axes[0].plot(x,expected/n,color='#4573a4',lw=2,label='Binomial(160, 0,5)');axes[0].scatter(x,hist/n,s=10,color='#138477',label='Lagret histogram');axes[0].set_xlim(45,116);axes[0].set_xlabel('Like adressebiter av 160');axes[0].set_ylabel('Andel');axes[0].legend(fontsize=8);axes[0].set_title('Hele fordelingen')
axes[1].plot(x,expected,color='#4573a4',lw=2);axes[1].scatter(x,hist,s=17,color='#138477');axes[1].set_yscale('log');axes[1].set_xlim(96,120);axes[1].set_ylim(.1,max(float(expected[96]),1)*2);axes[1].set_xlabel('Like adressebiter av 160');axes[1].set_ylabel('Antall forsøk (log-skala)');axes[1].set_title('De sjeldne, høye treffene')
fig.suptitle(f"{n:,} offentlige adresseobservasjoner – separat fra AI-testene",fontweight='bold');fig.savefig(OUT/'address_histogram.png',dpi=190);plt.close(fig)

table='\n'.join(f"| {label} | {m['n']:,} | {ci(m)} | {pval(m['pHolm'])} |" for label,m in [('AI minus tilfeldig',fresh['model']),('Gevinst fra adresserangering',fresh['ranking']),('Endrede adressebiter etter én nøkkelbit',fresh['avalanche'])])
oldtable='\n'.join(f"| {label} | {m['n']:,} | {ci(m)} |" for label,m in [('AI minus tilfeldig',original['model']),('Gevinst fra adresserangering',original['ranking']),('Endrede adressebiter etter én nøkkelbit',original['avalanche'])])
run=D['run']; cpu=(run['cpuMicros']['user']+run['cpuMicros']['system'])/1e6
timing='\n'.join(f"| {name} | {v['trials']:,} | {num(v['wallMs']/1000,3)} | {num((v['cpuMicros']['user']+v['cpuMicros']['system'])/1e6,3)} |" for name,v in run['phaseTimes'].items())
tailtable='\n'.join(f"| Minst {r['threshold']} | {r['observed']:,} | {num(r['expectedIID'],2)} |" for r in observation['tails'])
slopes='; '.join(f"{r['method']}: {r['slope_log2_median_ops_per_bit']}" for r in v2['slopes'])
report=f'''# SETAEI – eksperimentanalyse 24. oktober 2026

{conclusion}

Denne rapporten skiller mellom opprinnelige tester, en deterministisk reproduksjon, en ny uavhengig kontrollkohort og et fryst histogram fra det løpende offentlige adressesøket. En gjenkjøring av den gamle kohorten teller ikke som nye uavhengige data.

## Fersk kontrollrunde

Modellfiler, kryptografikode, testantall, metode og seed ble låst {local(D['protocol']['lockedAtUtc'])}. Det ble kjørt 2 000 AI-par, 2 000 rangeringspar og 512 bitendringstester. Modellen ble ikke trent eller endret. Hver test har indeks, UTC-tidspunkt og målt kjøringstid. Det er ingen wallet-saldooppslag eller brukerprivatnøkler i denne runden.

| Måling | Antall tester | Gjennomsnitt [95 % KI], bit | Holm-justert p |
|---|---:|---:|---:|
{table}

De to første radene har null som referanse. Den siste raden har 80 endrede av 160 adressebiter som referanse. Intervallene er ujusterte, tosidige Student-t-intervaller beregnet på hele testpar. P-verdiene er justert med Holm-metoden for de tre forhåndsdefinerte kontrastene. De 256 bitene i samme nøkkel behandles ikke som 256 uavhengige personer/tester.

Modellens gjennomsnitt er {num(fresh['model']['modelMeanBits'],4)} riktige nøkkelbiter av 256. Den tilfeldige kontrollen har {num(fresh['model']['randomMeanBits'],4)}. Eksakte modellnøkler: {fresh['model']['exactKeys']} av {fresh['model']['n']}. Nær 128 riktige enkeltbiter er omtrent 50 % bitlikhet, ikke 50 % sjanse til å ha funnet hele nøkkelen.

![Effektestimater og konfidensintervaller]({BASE}effect_intervals.png)

## Kontroll av de opprinnelige resultatene

Den opprinnelige kjøringen startet {local(D['original']['started'])} og var ferdig {local(D['original']['updated'])}. Registrert veggklokketid er {num(analysis['originalWallSeconds'],3)} sekunder, inkludert venting og CPU-begrensning. Den opprinnelige CPU-tiden og tidspunktene for hvert enkelt forsøk ble ikke lagret.

Den deterministiske gjenkjøringen reproduserte alle ni lagrede kombinasjoner av antall, sum og kvadratsum nøyaktig. Den opprinnelige fasiten og modellen kan dermed reprodusere sammendragene. Dette er etterkontroll, ikke en ny holdout og ikke et bevis på opprinnelig ekstern forhåndsregistrering.

| Måling | Opprinnelige tester | Reprodusert gjennomsnitt [95 % KI], bit |
|---|---:|---:|
{oldtable}

Den gamle gjenkjøringen gir {original['model']['exactKeys']} eksakte modellnøkler. Det opprinnelige sammendraget hadde ikke et eget felt for eksakte modellnøkler; denne tellingen er beregnet fra reproduksjonen. Totalt foreligger 2 656 opprinnelige tester og 4 512 ferske tester. De 2 656 gjenkjørte radene legges ikke til én gang til.

## Hva betyr de rundt 127 millioner forsøkene?

Dette er et separat, observasjonelt histogram. Det inneholder ikke AI-prediksjoner med kjent privat fasit og brukes derfor ikke til å øke antallet AI-tester.

Fryst kontrollpunkt: {local(O['checkpointUtc'])}. Totalt i jobbtelleren: {int(O['attempts']):,}. Histogrammet inneholder **{n:,}** observasjoner, fra og med forsøksnummer {S['sinceAttempt']}. Alle histogramtellinger, bit-summer, kvadratsummer og terskeltellinger er kontrollert mot hverandre.

- Gjennomsnittlig adresselikhet: {num(mean,6)} av 160 biter. Tilfeldig referanse: 80.
- Standardavvik: {num(math.sqrt(variance),6)}. Tilfeldig binomialreferanse: {num(math.sqrt(40),6)}.
- Beste observerte adresselikhet: {S['bestMatchedBits']} av 160. Eksakte adressetreff: {S['exactMatches']}.
- Under en uttrykkelig uavhengig, tilfeldig 160-biters modell er sjansen for minst ett resultat på minst {S['bestMatchedBits']} like adressebiter i {n:,} forsøk omtrent **{num(100*max_probability,2)} %**. Et høyt maksimum alene dokumenterer derfor ikke forbedret nøkkelgjetting.
- Eksplorativ kjikvadratsammenligning av grupper med minst fem forventede observasjoner: {num(chi,3)} med {len(obs_groups)-1} frihetsgrader, p = {pval(observation['chiSquareP'])}. Binomialreferansen er en modellantakelse; dette er ikke en full test av kryptografisk uavhengighet.

| Adresselikhet | Observert antall | Forventet under binomialreferansen |
|---|---:|---:|
{tailtable}

![Adressehistogram og tilfeldig referanse]({BASE}address_histogram.png)

Adressebiter og privatnøkkelbiter er forskjellige størrelser. Histogrammet kan ikke fortelle hvilke biter i en ukjent privatnøkkel som er riktige. Den løpende jobbens starttid er ikke en dokumentert starttid for histogrammet, fordi bitstatistikk ble slått på senere. Full historikk over alle adresser og tidsstempler er ikke lagret, og kan ikke rekonstrueres fra histogrammet.

## Tid og reproduserbarhet

Reproduksjon og fersk runde ble kjørt {local(run['startedUtc'])}–{local(run['endedUtc'])}. Samlet målt veggklokketid etter oppsett: {num(run['wallMs']/1000,3)} sekunder. Prosessens registrerte CPU-tid: {num(cpu,3)} sekunder. Skriptet ventet mellom korte arbeidsbolker for å begrense belastningen. Disse tidene er ikke en ytelsessammenligning mellom AI og tilfeldig gjetting.

| Fase | Loggede tester | Veggklokketid, sekunder | Prosess-CPU, sekunder |
|---|---:|---:|---:|
{timing}

## Oversikt over tidligere lagrede datasett

Alle identifiserte resultatfiler inngår i kildeoversikten med SHA-256. Ulike kohorter, leketøykurver, avhengige repetisjoner og delvis overlappende evalueringer blir ikke slått sammen til ett kunstig stort utvalg.

| Datasett | Registrert omfang | Vurdering |
|---|---|---|
| Første miniatyrkurve-benchmark | {len(v1['measurements'])} målerader og {len(v1['ml'])} ML-rader | Eksplorativt, få repetisjoner. |
| Miniatyrkurver v2 | {len(v2['runs'])} planlagte rader; statusfordeling {historical['v2']['statuses']} | Ikke-kjørte og høyresensurerte forsøk er ikke fullførte funn. Felles uttømmende vandringer gir korrelerte tidsmålinger. |
| ML-kontroller v2 | {len(v2['ml'])} rader; statusfordeling {historical['v2']['mlStatuses']} | Sammenlignes med majoritetsbaseline. Additiv gruppe er en enkel positiv kontroll. |
| MOV og Smart | MOV: {v2['MOV_positive_control']['status']}; Smart: {v2['Smart_positive_control']['status']} | Kjent svak-kurve-kontroll, ikke en generell svakhet i Ethereum. |
| Symmetri | {len(sym['curves'])} kurver; {len(sym['collision_simulation_raw'])} simuleringsrader | Kjente symmetrier og uniform bursdagssimulering. Dette er ikke en målt hastighetsgevinst i en implementert fullskala rho-algoritme. |
| Kjente nøkkelpar | 1 000 ferske par, {num(100*historical['knownPairValidation']['bit_accuracy'],4)} % bitnøyaktighet | Lagret som sammendrag. {historical['knownPairValidation']['exact_key_matches']} eksakte nøkler. |
| Adresse-/nøkkel-overlapp | 2 000 par og 500 bitendringstester | r = {num(historical['addressOverlap']['correlation_model_address_bits_vs_private_key_bits'],6)}. Ingen eksakte nøkler eller adresser i det lagrede sammendraget. |
| Utvidet trening | 4 096 treningseksempler, 2 048 holdout-par | Kandidat {num(100*historical['expandedTraining']['candidate_holdout_bit_accuracy'],4)} % mot eksisterende ridge {num(100*historical['expandedTraining']['existing_ridge_holdout_bit_accuracy'],4)} %. Ingen parvise variansdata for en ny gyldig sammenlignings-KI. Ingen dokumentert forbedring i det lagrede forsøket. |
| Avhengige delmengder | 12 konfigurasjoner | Kontrollsimulering av avhengighet. Ikke en vurdering av en full ECDLP-metode. |

Registrerte v2-helninger for log2(median gruppeoperasjoner) mot bitlengde: {slopes}. Dette er eksplorative anslag på små kurver med få størrelsespunkter, ikke bevis for asymptotisk kompleksitet på 256 bit. Ikke-kjørte celler og sensurerte celler må fortsatt vises.

## Hva som er bekreftet, og hva som fortsatt mangler

Bekreftet i denne revisjonen: filbaserte originalsummer, eksakt deterministisk reproduksjon av ni statistikker, en låst fersk kontrollkohort med 4 512 rader, tids- og CPU-målinger for revisjonen, og intern konsistens i det fryste adressehistogrammet.

Fortsatt begrenset: originalregistrering på forsøksnivå, original CPU-tid, en ekstern forhåndsregistrering, verifiserbar original treningsnøkkelliste og en uavhengig reproduksjon av andre forskere. Den ferske protokollen er internt tidsstemplet før testene; den omtales ikke som ekstern preregistrering. Manglende rådata fra tidligere datasett blir ikke fylt med konstruerte verdier.

Resultatene dokumenterer hva den testede modellen gjorde på de definerte kohortene. Et intervall som inkluderer null beviser ikke at alle tenkelige metoder er like gode. Ingen av disse testene beviser at det er mulig å rekonstruere en ukjent ekte wallet-nøkkel eller at fremtidige matematiske metoder er umulige.

## Etterprøving

- Studie-ID: `{run['id']}`.
- SHA-256 for låst protokoll: `{run['protocolSha256']}`.
- SHA-256 for opprinnelig revisjonslogg: `{run['trialLogSha256']}`.
- [Maskinlesbar analyse]({BASE}analysis.json), [protokoll]({BASE}protocol.json), [rå målelogg]({BASE}trials.jsonl.gz), [kilde- og filoversikt]({BASE}manifest.json).
- Gjennomsnittsintervaller: [NIST, Confidence Limits for the Mean](https://itl.nist.gov/div898/handbook/eda/section3/eda352.htm).
- Begrensninger ved statistisk tilfeldighetstesting: [NIST SP 800-22 Rev. 1a](https://csrc.nist.gov/pubs/sp/800/22/r1/upd1/final).
'''
(OUT/'SETAEI_Eksperimentanalyse_2026-10-24.md').write_text(report)
print(json.dumps(dict(checks=checks,cohorts=cohorts,observation={k:v for k,v in observation.items() if k not in ['histogram','expectedHistogramIID']},historicalStatuses=historical['v2']['statuses'],conclusion=conclusion),ensure_ascii=False,indent=2))

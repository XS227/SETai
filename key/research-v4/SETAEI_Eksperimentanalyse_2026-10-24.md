# SETAEI – eksperimentanalyse 24. oktober 2026

Den ferske kontrollrunden dokumenterer ingen forbedring av nøkkelbitgjetting fra den låste modellen sammenlignet med tilfeldig gjetting.

Denne rapporten skiller mellom opprinnelige tester, en deterministisk reproduksjon, en ny uavhengig kontrollkohort og et fryst histogram fra det løpende offentlige adressesøket. En gjenkjøring av den gamle kohorten teller ikke som nye uavhengige data.

## Fersk kontrollrunde

Modellfiler, kryptografikode, testantall, metode og seed ble låst 24.10.2026 kl. 16:24:56. Det ble kjørt 2 000 AI-par, 2 000 rangeringspar og 512 bitendringstester. Modellen ble ikke trent eller endret. Hver test har indeks, UTC-tidspunkt og målt kjøringstid. Det er ingen wallet-saldooppslag eller brukerprivatnøkler i denne runden.

| Måling | Antall tester | Gjennomsnitt [95 % KI], bit | Holm-justert p |
|---|---:|---:|---:|
| AI minus tilfeldig | 2,000 | 0,28 [-0,22; 0,77] | 0,5448 |
| Gevinst fra adresserangering | 2,000 | 0,08 [-0,26; 0,42] | 0,6315 |
| Endrede adressebiter etter én nøkkelbit | 512 | 79,56 [79,00; 80,12] | 0,3820 |

De to første radene har null som referanse. Den siste raden har 80 endrede av 160 adressebiter som referanse. Intervallene er ujusterte, tosidige Student-t-intervaller beregnet på hele testpar. P-verdiene er justert med Holm-metoden for de tre forhåndsdefinerte kontrastene. De 256 bitene i samme nøkkel behandles ikke som 256 uavhengige personer/tester.

Modellens gjennomsnitt er 128,2840 riktige nøkkelbiter av 256. Den tilfeldige kontrollen har 128,0080. Eksakte modellnøkler: 0 av 2000. Nær 128 riktige enkeltbiter er omtrent 50 % bitlikhet, ikke 50 % sjanse til å ha funnet hele nøkkelen.

![Effektestimater og konfidensintervaller](https://setai.no/key/research-v4/effect_intervals.png)

## Kontroll av de opprinnelige resultatene

Den opprinnelige kjøringen startet 23.10.2026 kl. 02:12:08 og var ferdig 23.10.2026 kl. 02:13:26. Registrert veggklokketid er 78,273 sekunder, inkludert venting og CPU-begrensning. Den opprinnelige CPU-tiden og tidspunktene for hvert enkelt forsøk ble ikke lagret.

Den deterministiske gjenkjøringen reproduserte alle ni lagrede kombinasjoner av antall, sum og kvadratsum nøyaktig. Den opprinnelige fasiten og modellen kan dermed reprodusere sammendragene. Dette er etterkontroll, ikke en ny holdout og ikke et bevis på opprinnelig ekstern forhåndsregistrering.

| Måling | Opprinnelige tester | Reprodusert gjennomsnitt [95 % KI], bit |
|---|---:|---:|
| AI minus tilfeldig | 1,200 | -0,26 [-0,89; 0,38] |
| Gevinst fra adresserangering | 1,200 | -0,07 [-0,51; 0,37] |
| Endrede adressebiter etter én nøkkelbit | 256 | 79,48 [78,75; 80,22] |

Den gamle gjenkjøringen gir 0 eksakte modellnøkler. Det opprinnelige sammendraget hadde ikke et eget felt for eksakte modellnøkler; denne tellingen er beregnet fra reproduksjonen. Totalt foreligger 2 656 opprinnelige tester og 4 512 ferske tester. De 2 656 gjenkjørte radene legges ikke til én gang til.

## Hva betyr de rundt 127 millioner forsøkene?

Dette er et separat, observasjonelt histogram. Det inneholder ikke AI-prediksjoner med kjent privat fasit og brukes derfor ikke til å øke antallet AI-tester.

Fryst kontrollpunkt: 24.10.2026 kl. 16:24:55. Totalt i jobbtelleren: 127,366,300. Histogrammet inneholder **126,577,582** observasjoner, fra og med forsøksnummer 788719. Alle histogramtellinger, bit-summer, kvadratsummer og terskeltellinger er kontrollert mot hverandre.

- Gjennomsnittlig adresselikhet: 79,999712 av 160 biter. Tilfeldig referanse: 80.
- Standardavvik: 6,324736. Tilfeldig binomialreferanse: 6,324555.
- Beste observerte adresselikhet: 116 av 160. Eksakte adressetreff: 0.
- Under en uttrykkelig uavhengig, tilfeldig 160-biters modell er sjansen for minst ett resultat på minst 116 like adressebiter i 126,577,582 forsøk omtrent **51,23 %**. Et høyt maksimum alene dokumenterer derfor ikke forbedret nøkkelgjetting.
- Eksplorativ kjikvadratsammenligning av grupper med minst fem forventede observasjoner: 46,456 med 66 frihetsgrader, p = 0,9676. Binomialreferansen er en modellantakelse; dette er ikke en full test av kryptografisk uavhengighet.

| Adresselikhet | Observert antall | Forventet under binomialreferansen |
|---|---:|---:|
| Minst 96 | 885,447 | 886 107,39 |
| Minst 104 | 11,559 | 11 587,96 |
| Minst 112 | 23 | 28,54 |
| Minst 116 | 1 | 0,72 |

![Adressehistogram og tilfeldig referanse](https://setai.no/key/research-v4/address_histogram.png)

Adressebiter og privatnøkkelbiter er forskjellige størrelser. Histogrammet kan ikke fortelle hvilke biter i en ukjent privatnøkkel som er riktige. Den løpende jobbens starttid er ikke en dokumentert starttid for histogrammet, fordi bitstatistikk ble slått på senere. Full historikk over alle adresser og tidsstempler er ikke lagret, og kan ikke rekonstrueres fra histogrammet.

## Tid og reproduserbarhet

Reproduksjon og fersk runde ble kjørt 24.10.2026 kl. 16:24:56–24.10.2026 kl. 16:26:30. Samlet målt veggklokketid etter oppsett: 94,123 sekunder. Prosessens registrerte CPU-tid: 7,687 sekunder. Skriptet ventet mellom korte arbeidsbolker for å begrense belastningen. Disse tidene er ikke en ytelsessammenligning mellom AI og tilfeldig gjetting.

| Fase | Loggede tester | Veggklokketid, sekunder | Prosess-CPU, sekunder |
|---|---:|---:|---:|
| replay_model | 1,200 | 14,418 | 1,071 |
| replay_ranking | 1,200 | 22,042 | 1,882 |
| replay_avalanche | 256 | 2,735 | 0,214 |
| fresh_model | 2,000 | 16,629 | 1,384 |
| fresh_ranking | 2,000 | 32,526 | 2,683 |
| fresh_avalanche | 512 | 5,666 | 0,450 |

## Oversikt over tidligere lagrede datasett

Alle identifiserte resultatfiler inngår i kildeoversikten med SHA-256. Ulike kohorter, leketøykurver, avhengige repetisjoner og delvis overlappende evalueringer blir ikke slått sammen til ett kunstig stort utvalg.

| Datasett | Registrert omfang | Vurdering |
|---|---|---|
| Første miniatyrkurve-benchmark | 34 målerader og 9 ML-rader | Eksplorativt, få repetisjoner. |
| Miniatyrkurver v2 | 1080 planlagte rader; statusfordeling {'found': 543, 'not_run': 480, 'capped': 57} | Ikke-kjørte og høyresensurerte forsøk er ikke fullførte funn. Felles uttømmende vandringer gir korrelerte tidsmålinger. |
| ML-kontroller v2 | 36 rader; statusfordeling {'complete': 32, 'not_applicable': 4} | Sammenlignes med majoritetsbaseline. Additiv gruppe er en enkel positiv kontroll. |
| MOV og Smart | MOV: pass; Smart: pass | Kjent svak-kurve-kontroll, ikke en generell svakhet i Ethereum. |
| Symmetri | 9 kurver; 900 simuleringsrader | Kjente symmetrier og uniform bursdagssimulering. Dette er ikke en målt hastighetsgevinst i en implementert fullskala rho-algoritme. |
| Kjente nøkkelpar | 1 000 ferske par, 50,1418 % bitnøyaktighet | Lagret som sammendrag. 0 eksakte nøkler. |
| Adresse-/nøkkel-overlapp | 2 000 par og 500 bitendringstester | r = 0,027609. Ingen eksakte nøkler eller adresser i det lagrede sammendraget. |
| Utvidet trening | 4 096 treningseksempler, 2 048 holdout-par | Kandidat 50,0826 % mot eksisterende ridge 50,0328 %. Ingen parvise variansdata for en ny gyldig sammenlignings-KI. Ingen dokumentert forbedring i det lagrede forsøket. |
| Avhengige delmengder | 12 konfigurasjoner | Kontrollsimulering av avhengighet. Ikke en vurdering av en full ECDLP-metode. |

Registrerte v2-helninger for log2(median gruppeoperasjoner) mot bitlengde: exhaustive: 1.04229; BSGS: 0.49084; rho3_Floyd: 0.49104; rho20_Brent: 0.38855. Dette er eksplorative anslag på små kurver med få størrelsespunkter, ikke bevis for asymptotisk kompleksitet på 256 bit. Ikke-kjørte celler og sensurerte celler må fortsatt vises.

## Hva som er bekreftet, og hva som fortsatt mangler

Bekreftet i denne revisjonen: filbaserte originalsummer, eksakt deterministisk reproduksjon av ni statistikker, en låst fersk kontrollkohort med 4 512 rader, tids- og CPU-målinger for revisjonen, og intern konsistens i det fryste adressehistogrammet.

Fortsatt begrenset: originalregistrering på forsøksnivå, original CPU-tid, en ekstern forhåndsregistrering, verifiserbar original treningsnøkkelliste og en uavhengig reproduksjon av andre forskere. Den ferske protokollen er internt tidsstemplet før testene; den omtales ikke som ekstern preregistrering. Manglende rådata fra tidligere datasett blir ikke fylt med konstruerte verdier.

Resultatene dokumenterer hva den testede modellen gjorde på de definerte kohortene. Et intervall som inkluderer null beviser ikke at alle tenkelige metoder er like gode. Ingen av disse testene beviser at det er mulig å rekonstruere en ukjent ekte wallet-nøkkel eller at fremtidige matematiske metoder er umulige.

## Etterprøving

- Studie-ID: `20261024T142456Z`.
- SHA-256 for låst protokoll: `d42cc321e47a700228c2257da19152dd7dd24c469283641ad5a6eceb160b4566`.
- SHA-256 for opprinnelig revisjonslogg: `96012422539c2d32bdbfc6e9cd99b26085636c465490532cc1057d1a6fb98bac`.
- [Maskinlesbar analyse](https://setai.no/key/research-v4/analysis.json), [protokoll](https://setai.no/key/research-v4/protocol.json), [rå målelogg](https://setai.no/key/research-v4/trials.jsonl.gz), [kilde- og filoversikt](https://setai.no/key/research-v4/manifest.json).
- Gjennomsnittsintervaller: [NIST, Confidence Limits for the Mean](https://itl.nist.gov/div898/handbook/eda/section3/eda352.htm).
- Begrensninger ved statistisk tilfeldighetstesting: [NIST SP 800-22 Rev. 1a](https://csrc.nist.gov/pubs/sp/800/22/r1/upd1/final).

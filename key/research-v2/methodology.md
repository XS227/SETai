# SETAEI ECDLP Research v2 — metode (22. oktober 2026)

**Status:** Eksplorativ måling på syntetiske miniatyrkurver, ikke et gjennombrudd mot virkelige Ethereum-nøkler.

## Datagrunnlag
- Ni kurver fra 16 til 48 bit; hele punktgruppen har primtallsorden. Primalitet, generatororden og Hasse-båndet verifiseres.
- 30 tilfeldig trukne, skjulte testnøkler for hver kjørbar metode-/størrelsescelle.
- Ressursbegrensede celler merkes «not_run» og telles ikke som 30 gjennomførte forsøk.

## Metoder og arbeidstelling
- Uttømmende søk på 16, 20, 24 bit: eksakt antall gruppeoperasjoner for 30 uavhengige mål. En felles sekvensiell punktvandring brukes, slik at tidsmålinger er korrelerte, ikke 30 uavhengige tider.
- BSGS 16–32 bit: 30 fullstendige, separat kjørte forsøk per størrelse.
- Pollard rho: opprinnelig 3-deling med Floyd og en 20-partisjoners r-adding walk med Brent. Gruppeoperasjoner inkluderer oppsett og validering. Den nye varianten rapporterer også vandresteg og oppsett.
- Pollard 36 bit: eksplisitt operasjonstak. Ikke funnet betyr høyresensurering, ikke at metoden har mislyktes matematisk.

## Statistikk
- Median og Q1/Q3 for funn, samt Kaplan–Meier-median der dette kan estimeres med sensurerte observasjoner.
- 95 % bootstrap-intervall for median i celler uten sensurering (1 200 resamplinger).
- Regresjon av log2(median gruppeoperasjoner) mot bitlengde kun for celler med alle forsøk fullført; resultatet er eksplorativt og har få størrelsespunkter.
- Ikke-kjørte data regnes ikke inn i risiko-sett eller median. Sensurerte treffgrensetall er ikke fullførte angrep.

## ML
- Fem nærmeste naboer i normalisert (X,Y)-rom; modellen tar separat flertallsavgjørelse for hver nøkkelbit.
- Treningsstørrelser: 256, 4 096 og 65 536 der lovlig, 1 024 unike testnøkler, to repetisjoner og disjunkte splitter.
- Eksakt samme klassifikator brukes på additiv gruppe Z_n med kjent generator g=1 og Q=k mod n. Denne positive kontrollen er bevisst enkel.
- Baselines: majoritetsklassifikator per bit og tilfeldig helnøkkelgjetting 1/(n−1).
- 65 536 treningseksempler på 16-bit-gruppen er matematisk umulig med 1 024 distinkte testnøkler; merket «not_applicable».
- MOV positivkontroll: ekte paringsbasert reduksjon på svak supersingulær kurve. Dette bekrefter matematisk kontroll, ikke ML-læring.
- Smart positivkontroll (`smart_attack.py`): anomale kurver y²=x³+b med #E(Fp)=p (4p=1+3v²) på 16, 32 og 48 bit. Punktene Hensel-løftes til y²=x³+p·A·x+b over Z/p² (ikke det kanoniske j=0-løftet, der angrepet feiler), ganges med p i Jacobi-koordinater, og k = ψ(pQ)/ψ(pP) mod p med ψ = −x/y. Svaret verifiseres med kG=Q.

## Operasjonstak
- Opptil 32 bit: 600 000 gruppeoperasjoner per forsøk. 36 bit: 160 000, under forventet ≈1,25·√n ≈ 290 000 for rho. Sensureringen på 36 bit er derfor bevisst.

## Reproduser
Kjør i samme mappe (Python 3.10+ uten tilleggspakker):

    python3 experiment_v2.py --seed 20261022 --trials 30

Kun kontrollene (MOV + Smart), gjenbruker lagrede målinger i results_v2.json – lett nok for VPS-en:

    python3 experiment_v2.py --controls-only

Metodefilene og resultatfilene er offentlige for etterprøving. V2-rapporten legger ikke til grunn bruk av private eller virkelige wallet-nøkler.

**Begrensning:** Ingen av målingene beviser at sterke 256-bit Ethereum-nøkler kan finnes fra offentlige adresser, eller at ingen fremtidig matematisk snarvei kan eksistere.

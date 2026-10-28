# SETAEI feillab — protokoll v1

Denne laben er separat fra det løpende adressesøket. Ingen modell, jobb eller ressursgrense i søkeagenten endres. Laben tar ikke imot wallet-adresser, privatnøkler eller saldoer.

## Hva lærer modellen av?

Hvert kunstige læreord er 16 biter, vist som fire heksadesimale tegn. Vi kjenner fasiten. En enkel batch-perceptron oppdaterer bare feilklassifiserte treningsbiter, med ordvekt `1 + feilandel`. Læringsraten er 0,25 og hver runde har 24 epoker. Modellvalget er den tidligste epoken med høyest bitnøyaktighet på valideringssettet, inkludert epoke 0. Den valgte modellen lagres før testen måles, og videreføres til neste runde.

Det er tre betingelser:

| Betingelse | Input | Formål |
|---|---|---|
| Lærbart mønster | Omstokking og fortegnssnuing av de 16 fasitbitene, pluss 64 støybiter | Positiv kontroll som modellen bør lære |
| Tilfeldig kontroll | 80 pseudotilfeldige biter uavhengig av fasit | Kontroll av forbedring på nye data uten et lærbart signal |
| Hash-kontroll | Første 80 biter av SHA-256 av et domenemerket læreord | Utforske generalisering i et lite kunstig hash-domene |

Hash-kontrollen har bare 65 536 mulige ord. Den er ikke en modell av hele Ethereum-nøkkelrommet og er ikke et bevis for kryptografisk sikkerhet. Gode resultater på den lærbare kontrollen dokumenterer bare at feilretting virker på denne enkle oppgaven.

## Faste datagrupper og stoppregel

En seedet stokking av alle 65 536 ord låses før første runde. Hver runde reserverer 3 072 unike ord: 512 trening, 512 validering og 2 048 test. Et ord gjenbrukes ikke på tvers av runder eller datagrupper. Betingelsene bruker samme ord, så 6 144 testloggrader per runde er 2 048 ord i tre betingelser, ikke 6 144 uavhengige ord.

Modelltrening og valg bruker bare trening og validering. Testen skåres etter valget. Testfeil oppdaterer ikke modellen. Ingen testbasert endring av læringsrate, epoketall, ordgrupper eller stoppregel er tillatt innen denne studien. Ny metode krever en ny versjon og nye data.

Det er 14 planlagte runder inkludert første kjøring. Deretter gjør kjøreprogrammet ingen flere tester. Ingen tidlig avslutning eller forlengelse basert på gunstige resultater. Et timeroppsett kl. 03.15 Europe/Berlin kjører på serveren, uavhengig av nettleseren. Hvis serveren var av, kan en forsinket kjøring tas igjen én gang; tapte netter fylles ikke med oppdiktede forsøk. Testresultater beskriver de faktisk kjørte rundene.

## Rapportering

Primært sammenlignes antall riktige biter fra valgt modell med en separat pseudotilfeldig gjetning for hvert testord. Vi viser paret gjennomsnittsforskjell og et 95 % normaltilnærmet intervall (`gjennomsnitt ± 1,96 × standardfeil`), med testord som enhet. Dette er ikke et intervall basert på at alle enkeltbiter er uavhengige. Samme modell sammenlignes også med modellen før rundens trening, på nøyaktig de samme testordene.

Daglige intervaller er utforskende og ikke justert for gjentatte titt på data eller alle sammenligninger. Det foretas ingen automatisk effektivitetsbeslutning. Sluttgjennomgangen må vise alle 14 planlagte runder, mangler og feil, forskjeller per betingelse og avhengigheten som følger av at modellen videreføres. Ikke slå sammen alle bitene som uavhengige observasjoner eller velg den beste natten som konklusjon.

UTC-tidspunkter, prosessens CPU-tid og faktisk veggklokketid registreres. CPU-kvoten kan gi lengre veggklokketid enn den ubegrensede utviklingstesten. Protokollen er internt tidsstemplet og kildekoden er låst med SHA-256; dette er ikke ekstern preregistrering.

## Lagring og avbrudd

Serveren lagrer protokoll, ordrekkefølge, rundestatus, startmodell, epokesjekkpunkter og valgt modell. En avbrutt runde bruker samme ord og opprinnelige startmodell ved nytt forsøk. Utførelsesforsøk registreres privat, og resultatet angir hvilket forsøk som fullførte. Bare et publisert, fullført resultat øker rundetelleren. En gjentatt utførelse er ikke et ekstra eksperiment. Systemd tillater bare én kjøring av tjenesten om gangen.

Koden nekter å fortsette dersom dens egen SHA-256 er endret fra den låste protokollen. Kvalitetskontroller vises også når de feiler; feil skjules ikke ved å filtrere bort en runde.

## Retrospektivt feilkart fra Ethereum-testen

`ethereum-diagnostic.json` beskriver de samme 2 000 syntetiske testparene i [eksperimentanalysen](/key/research-v4/), rekonstruert med den fryste modellen og den tidligere protokollen. Summen av riktige biter er kontrollert mot det publiserte resultatet: 256 568 av 512 000, eller 128,284 per nøkkel. Ingen hele nøkler var riktige. Dette er ikke nye testpar eller opprinnelige individuelle tidsmålinger. Kun aggregerte feiltall publiseres; nøkler og adresser skrives ikke ut.

Feilkartet er beskrivende. Det brukes ikke til trening eller valg av modell i denne laben. Tegnforskjeller i tidligere syntetiske data dokumenterer ikke nyttige tegnendringer for en ukjent privatnøkkel. De mange adressesøkene mot en ukjent fasit kan beskrive adressemønstre og hastighet, men gir ingen fasit for hvilke privatnøkkelbiter som var feil.

## Reproduserbarhet

- `protocol.json`: seed, plan og SHA-256 for låst kjøreprogram.
- `lab-runner.cjs`: komplett Node-program uten eksterne pakker eller nettverkstilgang.
- `runs/round-NN.json`: epoker, valgt modellhash, feilkart, tidspunkt, kvalitetskontroller og resultater.
- `runs/round-NN-test.jsonl`: én rad per testord og betingelse, med firetegns fasit, modellforslag og bitmål.
- `latest.json`: samlet oversikt og siste fullførte runde.
- `diagnostic.cjs`: rekonstruksjon av det separate, retrospektive feilkartet. Kildene ligger i den tidligere analysens `frozen-sources/`.

For å reprodusere leketøyforsøket isolert: opprett en tom datamappe, legg den publiserte `protocol.json` der og kjør den uendrede koden med `LAB_DATA_DIR` og `LAB_PUBLIC_DIR` satt til egne mapper. Hver kjøring fullfører én runde. Protokollens kodehash må stemme. Tidspunkter og kjøretid blir naturligvis nye; sammenlign prediksjoner og måltall. Ikke pek disse variablene mot den kjørende studiens mapper.

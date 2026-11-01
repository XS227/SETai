# KASHI / Leverandøranalyse v1 — 01.11.2026

**Publisert rute:** https://setai.no/kashi/partners/

## Innhold
Responsiv standalone-side (uten rammeverk/CDN) for KASHI Island med fem navngitte kandidater + en foreløpig Semnan-post: Setareh Meybod Tile, Tabriz Tile Group, Persepolis Tile, IR-Build/Khatam, LuxeCeram, Semnan (navn avventes). Leverandørtabell med søk/filter, mobilkortvisning, CSV-eksport, reviderbar produktstatus, shipping-sjekkliste, kildelenker og innkjøps- og provisjonssimulator (kun brukeroppgitte tall). Meta robots noindex, men URL er **ikke tilgangskontrollert**. Ingen sensitiv informasjon eller oppgitte partnerpriser publiseres.

## Datakvalitet
- **Tabriz:** 355 offentlige produktoppføringer per 01.11.2026 fra https://tabriztilegroup.com/products/
- **Persepolis:** 307 tidligere KASHI-kartlagte katalogoppføringer (oktober 2026); må ikke omtales som bekreftet aktivt antall.
- **Setareh:** Offisiell https://setarehtile.com/ lastet JS-app med CSS-feil ved inspeksjon. Offisiell katalog på https://t.me/SETAREH_TILE oppgir historiske kataloger 30×30, 30×60, 30×80, 30×90, 33×100, 40×100 og 60×60. Nyere innlegg viser 60×120. Se også https://manamaster.com/factory/setare-meybod-tile/ for design-eksempler. Ingen total SKU eller eksportpris bekreftet.
- **IR-Build:** Offisiell https://ir-build.com/ oppgir 7 flisstørrelser, direkte fabrikk og eksporterfaring. Antall modeller ikke dokumentert.
- **LuxeCeram:** https://luxeceram.com/ oppgir 11 størrelsesgrupper og mulighet til å koordinere FOB/CIF etter forespørsel, ikke avtale.
- **Semnan:** Kun ikke-navngitt prospekt; ingen fabrikkdata.

## Ikke verifisert
Fabrikkpris/m², MOQ, incoterms for valgt SKU, islandsk frakttilbud, lastetid, importdokumenter, brudd/retur, provisjonssats og bildegjenbruksrettigheter. Kalkulatoren fylles derfor **ikke** med generiske eller fiktive priser.

## Deploy
På SETAEI VPS som hoster `/var/www/setai/kashi/`:

```bash
curl -fsSL https://raw.githubusercontent.com/XS227/SETai/main/deploy/kashi-partners-v1/install.sh -o /tmp/kashi-partners-v1.sh
sudo bash /tmp/kashi-partners-v1.sh
```

Installeren sjekker eksisterende KASHI-rot, validerer HTML-kjennetegn, lager backup hvis målsiden eksisterer, skriver to sider under `/var/www/setai/kashi/partners/` og legger én navigasjonslenke i eksisterende `/kashi/seo/` og utfører HTTP-smoke-test. Den rører ikke KASHI forside/katalog eller øvrige prosjekter. Første publisering utført 01.11.2026 via autorisert VPS-tilgang.


## Oppdatering 01.11.2026: Island-import og persisk språk
To språkversjoner:
- https://setai.no/kashi/partners/ — norsk analyse med 2026 importavgifter, tre pris-/fraktscenarioer, CIF/mva og oppdatert kalkulator.
- https://setai.no/kashi/partners/fa/ — fullstendig persisk RTL-versjon, samme datagrunnlag og separat interaktiv kalkulator.
- https://setai.no/kashi/seo/ — eksisterende, separat islandsk markeds- og SEO-analyse. Installasjonen legger inn én lenke fra den eksisterende sidens footer, men endrer ikke analysens øvrige innhold.

### Bekreftet regelverk
- Offisiell islandsk tolltariff **gyldig fra 1. januar 2026**: HS 6907.2100, 6907.2200, 6907.2300, 6907.3000 og 6907.4000 har A-sats **0 %** (side 390):
  https://www.skatturinn.is/media/tollamal/Tollskra-2022-3.pdf#page=390
- Importmva normalt **24 %**, og CIF (varepris + internasjonal frakt + forsikring) er utgangspunktet for avgiftsberegningen:
  https://www.skatturinn.is/einstaklingar/tollamal/sendingar-og-pakkar-til-landsins/almennt-um-sendingar/verslad-a-netinu-1
  https://www.trade.gov/country-commercial-guides/iceland-import-tariffs
- For mva-registrerte virksomheter kan inngående mva være fradragsberettiget gitt gjeldende vilkår. Kontantutlegg og økonomisk kostnad er derfor ikke alltid det samme:
  https://www.skatturinn.is/english/companies/value-added-tax/
- Iran er oppført som høyrisikojurisdiksjon (oppdatert juni 2026), derfor juridisk sjekk av partene, betaling og transport før innkjøp:
  https://cb.is/financial-supervision/supervision-of-anti-money-laundering-and-combating-the-financing-of-terrorism/high-risk-jurisdictions/

### Bare illustrerende antakelser — ingen faktiske leverandørtilbud
Kalkyle i USD; 7 USD/m² er en eksempelpris, **ikke** bekreftet fabrikkspris.
| Scenario | m² | Varekostnad | Frakt | Forsikring | Lokal håndtering | CIF | VAT 24 % | Kontantutlegg | Ekskl. fradragsberettiget VAT / m² |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 pall | 50 | $350 | $1 650 | $40 | $300 | $2 040 | $489.60 | $2 829.60 | $46.80 |
| 250 m² | 250 | $1 750 | $2 900 | $65 | $500 | $4 715 | $1 131.60 | $6 346.60 | $20.86 |
| 20' FCL | 1200 | $8 400 | $4 835 | $150 | $1 000 | $13 385 | $3 212.40 | $17 597.40 | $11.99 |

En tredjeparts fraktmegler publiserer **«fra $4 835»** for Iran–Island 20-fotscontainer; dette er ikke et kontraktsfestet tilbud og omfatter ikke nødvendigvis alle avgifter eller ruter:
https://fwfreight.com/freight-shipping/from-iran-to-iceland/
Andre frakt-/forsikrings-/lokalbeløp er kun scenarioantakelser. Bruk KASHIs kalkulator med faktiske tilbud for endelig vurdering. Full container 1 200 m² er en mulighetsantakelse; eksakt kapasitet avhenger av produkttykkelse/vekt og tillatt nyttelast.

**NB:** noindex er ikke autentisering, så ikke legg sensitive priser eller kontrakter i offentlig tilgjengelig HTML.

## Neste iterasjon
Etter faktiske leverandørsvar: importér SKU/prisfiler til en serverstyrt katalog med datostempel/kilde per datapunkt, adgangskontroll på innkjøpspriser, revisjonsspor, valutakonvertering og fraktfordeling per kolli. Ikke legg inn priser i denne statiske offentlige nettsiden uten autentisering.

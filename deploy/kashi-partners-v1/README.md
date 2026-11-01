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

Installeren sjekker eksisterende KASHI-rot, validerer HTML-kjennetegn, lager backup hvis målsiden eksisterer, skriver **kun** `/var/www/setai/kashi/partners/index.html` og utfører HTTP-smoke-test. Den rører ikke KASHI forside/katalog eller øvrige prosjekter. Første publisering utført 01.11.2026 via autorisert VPS-tilgang.

## Neste iterasjon
Etter faktiske leverandørsvar: importér SKU/prisfiler til en serverstyrt katalog med datostempel/kilde per datapunkt, adgangskontroll på innkjøpspriser, revisjonsspor, valutakonvertering og fraktfordeling per kolli. Ikke legg inn priser i denne statiske offentlige nettsiden uten autentisering.

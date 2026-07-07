# SETAEI (setai.no) — Technical Indexing Audit

Utført 2026-07-07, basert på Search Console Page Indexing-rapporten (38 indexed / 46 not indexed: 16 duplicate uten valgt kanonisk, 10 not found/404, 5 redirect, 4 alternate m/ kanonisk, 2 blokkert av robots.txt, 1 noindex, 8 discovered/not indexed).

Internt dokument. Ikke publisert / ikke lenket fra nettstedet.

---

## 1. Rotårsak nr. 1: www og non-www ble servert som to identiske, ukanoniserte nettsteder

**Funn:** `/etc/nginx/sites-available/setai` hadde ett enkelt server-block med `server_name setai.no www.setai.no;` og ingen redirect mellom dem. Begge varianter ga `200 OK` med identisk innhold:

```
https://setai.no/       → 200
https://www.setai.no/   → 200   (ingen redirect)
```

I tillegg hadde `index.html` en kanonisk-tag som pekte til `https://www.setai.no/`, mens **absolutt alle** andre sider på nettstedet (alle `/services/*`, `/blog/*`, `sitemap.xml`, `robots.txt`) konsekvent brukte `https://setai.no/...` (uten www). Dette er den mest sannsynlige enkeltårsaken til mesteparten av de **16 duplikatene uten valgt kanonisk** — Google så to fullstendig identiske versjoner av hver eneste side, uten et konsekvent signal om hvilken som var «ekte».

**Fiks (deployert og verifisert):**
- Nginx: `www.setai.no` gir nå `301 → https://setai.no$request_uri` (nytt eget server-block, samme sertifikat, som dekker begge navn).
- `index.html`: kanonisk, `og:url`, og alle `url`/`image`/`logo`-felt i JSON-LD endret fra `www.setai.no` til `setai.no`, slik at hele siden nå konsekvent peker til én vert.
- Verifisert live: `www.setai.no` → `301` → `setai.no`; alle andre nettsteder på serveren (trustai.no, shahnameh.setaei.com) fortsatt `200` etter nginx-reload.

**Anbefalt oppfølging:** Be Google om en re-crawl av forsiden i Search Console («Be om indeksering») for å fremskynde at duplikat-signalet forsvinner.

---

## 2. Rotårsak nr. 2: Alle ugyldige URL-er ga `200 OK` (soft-404) i stedet for `404`

**Funn:** `location / { try_files $uri $uri/ /index.html; }` — dette er et SPA-fallback-mønster (server alt som appens hovedside og la klient-JS håndtere ruting). SETAEI er derimot en tradisjonell flersides statisk side der hver reelle side er en egen fil/mappe — SPA-fallbacken var altså feil mønster her, sannsynligvis en kopiert konfigurasjon fra en annen type prosjekt.

Konsekvens: **enhver** ugyldig/slettet URL (`/dolce.html`, `/ip-seller.html`, `/Mellat.html`, `/shaparak-pos-demo.html` osv. — alle bekreftet slettet via git-historikk, tidligere klientdemoer/betalingsdemoer) serverte hele forsiden med `200 OK` og forsidens kanoniske tag. Dette forklarer trolig:
- De **10 «Not found (404)»**-oppføringene (disse filene er faktisk slettet — git-historikken viser `Delete dolce.html`, `Delete ip-seller.html`, `Delete Mellat.html`, `Delete shaparak-*`, `Delete saderat-bank.html`, `Delete indexa.html`, `Delete LaShineBeauty/*` m.fl. — alle urelatert til dagens SETAEI-innhold, ingen relevant erstatning å redirecte til).
- En del av de **16 duplikatene** (mange forskjellige «døde» URL-er som alle i praksis viste identisk forsideinnhold og samme kanonisk-tag).

**Vurdering (i tråd med instruksen «ikke blindt redirect alt til forsiden»):** Disse filene tilhører avviklede, urelaterte klientprosjekter (betalings-demoer, en nedlagt skjønnhetssalong-kunde, en tidligere landingsside). Det finnes ingen naturlig, relevant erstatningsside på dagens SETAEI-nettsted å 301-redirecte til. Riktig løsning er derfor ekte `404`, ikke en redirect til forsiden (en redirect ville bare gjenskape samme duplikat-problem i en annen form).

**Fiks (deployert og verifisert):**
- `try_files $uri $uri/ /index.html;` → `try_files $uri $uri/ =404;`
- Ny `error_page 404 /404.html;` med en lettvekts, on-brand `/404.html` (samme `seo-expansion.css`, `noindex`-tag, lenker til forsiden/tjenester/blogg).
- Verifisert live: en tidligere ugyldig URL gir nå `404` med riktig innholdstittel «404 — siden finnes ikke», mens alle 25 sider i sitemap fortsatt gir `200`.

---

## 3. `/tilbud/*` manglet kanonisk-tag og robots-direktiv — nå satt til `noindex, follow`

**Funn:** De 5 sidene under `/tilbud/` (`index`, `bilvask`, `frisor`, `klinikk`, `restaurant`) er tydelig bygget som **betalt-trafikk/kampanje-landingssider** (egen `landing.css`/`landing.js`, ingen hovednavigasjon, konverteringsfokusert «klar på 5 dager, ingen binding»-språk) — ikke organiske SEO-sider. De hadde ingen kanonisk-tag i det hele tatt, og dekker samme bransjer (bilvask, frisør, restaurant, klinikk) som de organiske `/industries/*`-sidene, med overlappende innhold.

Uten et eksplisitt signal kan Google enten forsøke å indeksere dem (og konkurrere internt med `/industries/*` om de samme søkene) eller selv velge en tilfeldig kanonisk blant flere lignende sider — begge deler bidrar sannsynligvis til duplikat-tallet.

**Fiks (deployert og verifisert):** Lagt til `<meta name="robots" content="noindex, follow">` på alle 5 sidene. De forblir fullt fungerende for betalt trafikk/kampanjer, men konkurrerer ikke lenger med de organiske bransjesidene i Google. Verifisert live på `/tilbud/`.

*Merk: dette er en anbefalt SEO-korreksjon basert på tydelig sideformål, ikke en ren bug. Si fra hvis `/tilbud/*` faktisk var ment å rangere organisk — da bør de i stedet få egne kanonisk-tagger og skille seg tydeligere fra `/industries/*` i innhold.*

---

## 4. Robots.txt — «2 blokkert»-funnet er trolig utdatert GSC-cache, samt to nye, bevisste blokkeringer lagt til

**Funn:** Live `robots.txt` hadde `Allow: /` uten en eneste `Disallow`-regel — det finnes altså ingenting som aktivt blokkerer noe akkurat nå. De 2 rapporterte «Blocked by robots.txt»-URL-ene i Search Console er mest sannsynlig **historiske data** fra en tidligere versjon av `robots.txt`, som Google ikke har oppdatert ennå (GSC-status kan henge etter faktisk tilstand i flere uker).

**Ny, bevisst endring (ikke en feilretting, men god hygiene):** Fant `/demo/` (klient-demosider: bella-frisør, test-restaurant, testfirma), `/lead-agent/` (internt CRM/lead-verktøy med SQLite-database) og `/tools/` (intern demo-generator) — ingen av disse er lenket fra noe sted på det offentlige nettstedet, og ingen av dem hadde `robots`-styring. Lagt til:
```
Disallow: /demo/
Disallow: /lead-agent/
Disallow: /tools/
```
som en ekstra sikkerhetsmargin mot at disse noensinne blir indeksert eller crawlet, siden `lead-agent/` inneholder interne kundedata.

**Sikkerhetsmerknad (utenfor denne revisjonens omfang, men verdt å nevne):** `/lead-agent/` er kun beskyttet av at URL-en ikke er lenket noe sted — selve siden har ingen innlogging. `robots.txt` hindrer ikke direkte tilgang for noen som kjenner/gjetter URL-en. Anbefaler å vurdere passordbeskyttelse (HTTP basic auth via nginx, eller IP-begrensning) for dette verktøyet ved anledning.

---

## 5. Noindex — ingen aktiv `noindex` funnet før denne revisjonen

**Funn:** Ingen side i kodebasen hadde `noindex` (verken meta-tag eller `X-Robots-Tag`-header) før denne revisjonen. Den rapporterte **«1 Excluded by noindex»** i Search Console kan ikke kobles til noen side i dagens kodebase — trolig historisk data fra en side som enten er endret eller ikke lenger finnes i denne formen. Ingen handling mulig uten den eksakte URL-en fra GSC-eksporten.

*Etter denne revisjonen finnes det nå 5 bevisste `noindex`-sider (`/tilbud/*`, se punkt 3) — vent en økning i denne kategorien i Search Console over de neste ukene, det er forventet og korrekt.*

---

## 6. «8 Discovered – currently not indexed» — sannsynligvis normalt for et lite/nytt nettsted, ingen kodefeil funnet

Alle sider i `sitemap.xml` returnerer `200`, er internt lenket (nav + relaterte artikler/tjenester), og har unikt innhold — de tekniske forutsetningene for indeksering er til stede. Denne GSC-kategorien betyr at Google har *oppdaget* URL-en (via sitemap/lenker) men ennå ikke prioritert å crawle/indeksere den, som oftest skyldes begrenset «crawl budget» for mindre/nyere nettsteder, ikke en teknisk feil. Bør bedre seg naturlig etter hvert som:
- duplikat-signalene fra punkt 1–3 forsvinner (frigjør crawl-budsjett til reelt unike sider),
- nettstedet får flere interne lenker og eventuelt eksterne lenker/omtaler over tid.

Ingen fiks nødvendig utover det som allerede er gjort.

---

## 7. «5 Pages with redirect» og «4 Alternate pages with proper canonical tag» — forventet, friskt, ingen handling

Dette er normale, sunne GSC-kategorier: sider som korrekt redirecter videre (http→https, ev. `www`→non-www etter dagens fiks), og sider som er duplikater men *med* et korrekt kanonisk-signal på plass. Ingen handling nødvendig.

---

## 8. `seo.setai.no` — undersøkt grundig, INGEN endringer gjort (som avtalt)

Brukeren bekreftet uavhengig at `seo.setai.no` gir `ERR_CONNECTION_CLOSED` i nettleseren. Full teknisk undersøkelse, ingen destruktive eller konsoliderende endringer utført:

**Teknisk årsak (bekreftet):**
- DNS løser korrekt (`seo.setai.no` peker til serverens IPv6/IPv4-adresse).
- SSL-sertifikat **finnes og er gyldig** (`/etc/letsencrypt/live/seo.setai.no/`, utstedt 13. mai 2026, gyldig til 11. august 2026, med automatisk fornyelse konfigurert). Sertifikatet er altså ikke problemet.
- Vhost-filen `/etc/nginx/sites-available/seo.setai.no` finnes, men er **ikke aktivert** — ingen symlink i `/etc/nginx/sites-enabled/`.
- Den interne SNI-ruteren (`stream`-blokken i `nginx.conf`) forsøker å rute `seo.setai.no`-trafikk over HTTPS videre til `127.0.0.1:8446` — men **ingenting lytter på port 8446**. Dette gir `ERR_CONNECTION_CLOSED` for alle HTTPS-forespørsler.
- Over vanlig HTTP (port 80) fanges forespørselen opp av en generisk catch-all og gir `404`.
- **Konklusjon:** ikke et sertifikat- eller brannmurproblem — det siste steget i oppsettet (aktivere vhost + gi den en lytter på 8446) ble aldri fullført.

**Er filene intakte?** Ja. `/var/www/setai/seo/` inneholder en komplett, sammenhengende SEO-mikroside: forside + 5 underspider (`ai-seo-norway`, `saas-seo`, `seo-agency-norway`, `seo-byrå-oslo`, `shopify-seo-norway`), egen `sitemap.xml`, `robots.txt` (med `Allow: /`) og eget CSS. Alle filer ble opprettet i samme ca. 1-times vindu 13. mai 2026 (17:03–17:54), rett etter at sertifikatet ble utstedt (15:00) og vhost-filen opprettet (17:46) — dette ser ut som et bevisst, nesten fullført forsøk på å lansere en egen SEO-merkevare («SETAI», uten E), ikke en tilfeldig etterlevning.

**Er noe indeksert av Google?** Nei, ingen tegn til det. Et `site:seo.setai.no`-søk gir ingen treff fra subdomenet i det hele tatt (kun hoveddomenet setai.no og urelaterte tredjepartssider dukker opp). Dette stemmer med den tekniske årsaken: Googlebot kan aldri ha fått en vellykket tilkobling til subdomenet over HTTPS, og har dermed aldri kunnet crawle eller indeksere innholdet. **`seo.setai.no` bidrar ikke til noen av tallene i den nåværende Search Console-rapporten for setai.no.**

**Anbefaling (kun anbefaling, ingen handling utført):**

Å fullføre lanseringen av `seo.setai.no` som en helt separat, konkurrerende SEO-merkevare frarådes. Det ville bety å bygge domeneautoritet fra null på et nytt subdomene, for i praksis å konkurrere mot ditt eget `setai.no/services/seo-oslo/` om nesten identiske søkeord («SEO Oslo», «SEO byrå Oslo») — dette splitter lenkeverdi og kan i verste fall gjøre det vanskeligere for **begge** sider å rangere godt, i stedet for å styrke én sterk enhet.

**Bedre SEO-utfall: konsolider innholdet inn i setai.no**, som allerede har mer historikk og all annen SEO-innsats samlet ett sted. Konkret forslag:
- `seo/shopify-seo-norway/` dekker en vinkel (Shopify/nettbutikk-SEO) som **ikke** finnes noe sted på setai.no i dag — dette er et reelt innholdshull, ikke en duplisering. Kan bli en ny artikkel i bloggens SEO-klynge («SEO for nettbutikk», allerede listet i `CONTENT_PLAN.md`) eller kobles til `/services/ecommerce/`.
- `seo/ai-seo-norway/` (synlighet i AI-søk som ChatGPT/Perplexity) er også en vinkel som ikke er dekket ennå — matcher et P2-emne som allerede er notert i `CONTENT_PLAN.md`.
- `seo/seo-agency-norway/` og `seo/seo-byrå-oslo/` overlapper derimot for tett med `/services/seo-oslo/` til at de bør gjenbrukes uten vesentlig omskriving — disse bør trolig forkastes eller skrives fullstendig om med en klart annerledes vinkel.

Denne konsolideringen er **ikke utført** i denne runden — den krever en bevisst beslutning fra deg, og er en egen, avgrenset oppgave neste gang du vil ta den.

---

## 9. Sitemap — regenerert og validert

`sitemap.xml` inneholder nå 25 URL-er (opp fra 12 ved revisjonens start — de 5 nye tjenestesidene og 5 nye/eksisterende bloggartikler fra forrige runde var allerede lagt til). Samtlige 25 URL-er er nå verifisert med `curl` til å returnere `200 OK`:

```
25/25 URL-er → 200 OK
```

`/tilbud/*` (nå `noindex`) og `/404.html` er bevisst **ikke** inkludert i sitemap — korrekt praksis for hhv. ikke-indekserbare og feilsider.

`robots.txt` blokkerer ingen av sidene i sitemap (`Allow: /` gjelder for alt unntatt de 3 nye interne verktøy-mappene).

---

## 10. Oppsummering av alle endringer denne runden

| Endring | Fil(er) | Verifisert live |
|---|---|---|
| www → non-www 301-redirect | `/etc/nginx/sites-available/setai` | ✅ |
| Ekte 404 i stedet for soft-404 | `/etc/nginx/sites-available/setai`, ny `404.html` | ✅ |
| Kanonisk/OG/JSON-LD rettet til non-www | `index.html` | ✅ |
| `noindex, follow` på kampanjesider | `tilbud/{index,bilvask,frisor,klinikk,restaurant}/index.html` | ✅ |
| `Disallow` for interne verktøy | `robots.txt` | ✅ |
| Sitemap oppdatert | `sitemap.xml` | ✅ (25/25 URL-er 200) |
| `seo.setai.no` | Ingen endring — kun undersøkt og dokumentert | N/A |

Nginx-konfigurasjonen ble sikkerhetskopiert til `/root/setai-vhost-backup-20260707140645.conf` før endring, og testet (`nginx -t`) før reload. Andre nettsteder på serveren (trustai.no, shahnameh.setaei.com) verifisert upåvirket etter reload.

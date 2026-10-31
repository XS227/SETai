# Fliskonkurrenten · Fire produkter i ett samlet designforslag (v2)

## Funksjonell feilretting
Tidligere `ar ar-modes="webxr scene-viewer quick-look"` åpnet Androids kamera uten at brukeren nødvendigvis fikk plassert produktet. V2 fjerner den udokumentert fungerende AR-kameraknappen på **alle fire produktene**, også i eksisterende JS/HTML på VPS.

Erstatningen er en fungerende **digital romvisualisering direkte på nettsiden**: åpne produktet i et stort, interaktivt model-viewer-lerret med digitalt rom, dagslys, varm eller mørk romfarge, og fri rotasjon og zoom. Den ber ikke om kameratilgang og hevder ikke å være ekte forankret AR. Ekte AR kan eventuelt gjeninnføres etter testing av WebXR hit-testing og Android/iOS-enheter. 3D-konseptmodellene beholdes.

## Felles Fliskonkurrenten-identitet
`shared.js` og `shared.css` gir **samme Fliskonkurrenten-logo, responsiv burger-meny, header og footer** på:
- forslagets forside `/ksh/fliskonkurrenten/`
- produktgalleriet `/ksh/fliskonkurrenten/produkter/` (ny side; tidligere 404)
- fire cinematic produktlandinger
- eksisterende sider, kun hvis de finnes: `om-oss/`, `kontakt/`, `leverandorer/`, `inspirasjon/`, `outlet/`, `fliser/`, `baderom/`, `naturstein/`

Innholdet på «Om oss» og andre originalsider beholdes. Header/footer erstattes med felles skreddersydd struktur; ingen forskjellige eller påfunne betalingslogoer. Sosiale lenker for Fliskonkurrenten. Siden er fortsatt noindex designforslag.

## Produktutvalg
| Produkt | Kategori | Pris i Fliskonkurrenten-forslaget |
|---|---|---|
| Sanipro Sense 170 × 80 cm | Badekar – hvit | 24 750 kr |
| Vedum Flow, høyrestilt Zone-vask | Baderomsinnredning – tåkegrønn | 41 925 kr |
| Z-UP Eik Sort | Spileplater – mørk eik | 1 999 kr/panel |
| Colorker Althea Sand Dekor | Fliser – sandbeige | 1 299 kr/m² |

Samtlige kort er direkte interne lenker til produktlandinger i det nye forslaget. 3D-modellene er illustrative designrekonstruksjoner og skal ikke brukes til tekniske innkjøps- eller installasjonstegninger. Eksisterende priser er demonstrasjonsdata hentet fra forhandlerens produktkort, ikke en live prisfeed.

## Publisering

```bash
curl -fsSL https://raw.githubusercontent.com/XS227/SETai/main/deploy/ksh-four-products-v2/install.sh -o /tmp/ksh-four-v2-install.sh && sudo bash /tmp/ksh-four-v2-install.sh
```

Skriptet krever de **fire tidligere publiserte produktlandingssidene med gyldige lokale GLB-filer**. Stopper uten endring hvis en mangler. Det laster ned ekte kundelogo og lokale, delte CSS/JS-filer, validerer modellene og tar backup av alle eksisterende sider/filer før det endrer dem. Andre KSH-prosjekter berøres ikke. Gjentatt installasjon setter ikke inn duplikate CSS/JS-tags.

### Akseptansetest etter serverinstallasjon
1. Besøk `/ksh/fliskonkurrenten/`; se fire fremhevede kort. Test alle lenkene.
2. Besøk `/ksh/fliskonkurrenten/produkter/`; se alle fire og korrekt pris-enhet.
3. Besøk hvert produkt. Samme header/footer; meny/burger navigerer, særlig fra mobil.
4. 3D-knappen «Visualiser i et digitalt rom» åpner **dialog på siden**, ikke kamera. Roter/zoom, bytt dagslys/varmt/mørkt; lukk med X/Escape.
5. Vanlig 360° 3D-visning og cinematic scrolling fungerer fortsatt; pris, produkttekst og lokale bilder er intakte.
6. Ingen direkte kjøpslenke til Oslo VVS; ingen modell omtales som offisiell CAD.
7. Kontroller de oppdaterte «Om oss» og kontakt-sidene; eksisterende body-innhold er uendret.
8. Ved feil: bruk backup-banen som installasjonskommandoen skriver ut.

**Merk:** Github-merge er ikke VPS-deployment. Produksjon må kontrolleres etter kjøring.

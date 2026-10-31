# Fliskonkurrenten — tre nye cinematic produktlandinger (v1)

**Status:** Klar for avgrenset VPS-publisering. Kilden er i `XS227/SETai`. Ikke merk som publisert før nettlesertesten er kjørt.

## Produkter og pris (Fliskonkurrentens produktkort)

| Side | Produkt | Pris | Konsept-GLB |
|---|---|---|---|
| `vedum-flow-takegronn` | Vedum Flow, 2 skuffer, høyrestilt rund Zone-vask, tåkegrønn / Turbine Grey | **41 925 kr** | 9 geometriobjekter |
| `zup-spilepanel-eik-sort` | Z-UP Spilepanel Eik Sort 2798 × 600 × 20 mm, 1,67 m² | **1 999 kr/panel** | 29 geometriobjekter |
| `colorker-althea-sand-dekor` | Colorker Althea Sand Dekor 59,5 × 119,2 cm | **1 299 kr/m²** | 50 geometriobjekter |

Originalkilder:
- https://fliskonkurrenten.no/produkt/vedum-flow-servantskap-med-2-skuffer-og-hoyrestilt-zone-vask/
- https://fliskonkurrenten.no/produkt/z-up-spilepanel-eik-sort-2798x600x20mm-167m2/
- https://fliskonkurrenten.no/produkt/colorker-althea-sand-dekor-595x1192/

Det finnes også en retting i `deploy/ksh-sense-cinematic-v1/index.html`:
**Sanipro Sense er oppgitt til 24 750 kr hos Fliskonkurrenten**, ikke 21 400 kr hos Oslo VVS. All ekstern Oslo VVS-lenking er fjernet fra Sense-demoen.

## Hva er bygget?

Hver side har sin egen firekapitlers pinned cinematic scroll, responsiv layout, egne produktbilder fra Fliskonkurrenten, material- og målseksjon, reell interaktiv GLB i Google model-viewer med dra/zoom/AR på støttede enheter, tydelig konseptmodell-merking og interne forespørselsknapper. Althea har også veiledende arealkalkulator med 5 % svinn. Vedum-utførelsen og Spilepanel-utførelsen har **ikke** oppdiktede fargevarianter eller prisalternativer.

Kjøps-CTA navigerer til egen kontaktdel. Skjemaet åpner brukerens e-postprogram med produkt, navn og melding ferdig utfylt til `post@fliskonkurrenten.no`; siden hevder ikke å ta betaling, opprette ordre eller sende meldingen direkte.

Den samme foten/merkevarestrukturen brukes på de tre sidene. `noindex,nofollow` gjelder prototypevisningen.

GLB-ene bygges reproducerbart på VPS med **Python 3 standardbibliotek** i `build_glb.py`; ingen Blender- eller pip-avhengighet på VPS. 3D er **illustrative produktkonsepter, ikke CAD eller produktscanninger**. Spilepanel har separerte spiler. Althea har reliefgeometri i flisens front. Vedum har to skuffefronter, toppflate og hul servant. Detaljer ut over oppgitte mål og farger må kontrolleres mot leverandør før kommersiell eksponering som eksakt produktmodell.

## Publisering

Fra en autorisert VPS med `/var/www/setai/ksh/fliskonkurrenten/index.html`:

```bash
curl -fsSL https://raw.githubusercontent.com/XS227/SETai/main/deploy/ksh-cinematic-trio-v1/install.sh -o /tmp/ksh-cinematic-trio-install.sh && sudo bash /tmp/ksh-cinematic-trio-install.sh
```

Skriptet henter seks originalbilder fra Fliskonkurrenten, genererer de tre GLB-filene, og kontrollerer at originalbildene er ekte WEBP, GLB-filene følger GLB v2.0, prisene finnes, alle produktlenker er interne og Oslo VVS er fjernet fra Sense. **Først etter at alt er validert**, tas backup av eksisterende produktsider til `/var/backups/setaei/ksh-trio-...`; kun fire konkrete URL-er kan endres (de tre nye + Sense-pris/CTA).

Etter installasjon:
- `https://setai.no/ksh/fliskonkurrenten/produkt/vedum-flow-takegronn/`
- `https://setai.no/ksh/fliskonkurrenten/produkt/zup-spilepanel-eik-sort/`
- `https://setai.no/ksh/fliskonkurrenten/produkt/colorker-althea-sand-dekor/`
- `https://setai.no/ksh/fliskonkurrenten/produkt/sanipro-sense/` (kun pris og interne CTA-er)

## Post-deploy QA

1. Åpne hver produktside på mobil og desktop, kontroller hero fra riktig produkt.
2. Scroll 4 kapitler, sjekk at tekst/zoom oppdateres uten jitter.
3. Sjekk at alle tre GLB vises, er roterbare og at skalaen er rimelig; test WebGL-fallback.
4. Sjekk at «Spør om produktet» blir på siden og e-postforespørselen er riktig adressert.
5. Althea: 5 m² skal gi omtrent **6 820 kr** inkludert 5 % svinn, uten frakt; virkelig pakkeantall må bekreftes.
6. Sense: 24 750 kr, ingen Oslo VVS.
7. Verifiser at søskensider, header, footer og øvrig KSH-design ikke påvirkes.

**Merk:** Originale produktbilder kan ikke trekkes inn i Blender som eksakt mesh via denne pakken; det er fotostøttet frontend med uavhengige konsept-GLB-er.

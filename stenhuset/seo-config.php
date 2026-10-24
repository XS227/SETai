<?php
/* SEO for the Stenhuset site: one entry per page (real URL), used by page.php to write <head> on the server, so
 * Google and link previews (Facebook, Messenger, LinkedIn) see the right title, description and picture per page.
 *
 * INDEXABLE stays false while the site is a concept on setai.no: the texts, products and photos are Stenhusets own,
 * and an indexed copy would compete with stenhuset.no in search. Set it to true (and CANONICAL_BASE to the final
 * domain) on launch; then also submit sitemap.xml in Search Console. */
const INDEXABLE=false;
const CANONICAL_BASE='https://setai.no/stenhuset/';
const BASE_PATH='/stenhuset/';
const DEFAULT_IMAGE='assets/og-stenhuset.jpg';

/* slug (URL folder) => route (view in the app), title, description, optional image and breadcrumb name */
const PAGES=[
  ''=>['route'=>'topp','title'=>'Stenhuset – natursten, marmor og kalksten i Oslo','name'=>'Forside',
    'desc'=>'Marmor, kalksten, terracotta og håndlagde fliser fra Stenhuset i Oslo. Se steinen i et 3D-showroom, prøv den i ditt eget rom og bestill benkeplater på mål fra egen produksjon.'],
  'nettbutikk'=>['route'=>'kolleksjon','title'=>'Nettbutikk – fliser, servanter og bord i natursten | Stenhuset','name'=>'Nettbutikk',
    'desc'=>'Hele utvalget: marmor- og kalkstensfliser, terracotta, zellige, stenvasker, marmorbord og pidestaller. Mange produkter kan ses i 3D.'],
  'stenvasker'=>['route'=>'shop-stenvasker','title'=>'Stenvasker og servanter i natursten, se dem i 3D | Stenhuset','name'=>'Stenvasker',
    'desc'=>'Servanter i marmor, travertin og kalksten. Se hver stenvask i 3D i ekte størrelse, last ned produktark og prøv den på badet i showroomet.','image'=>'assets/products/10827/01.jpg'],
  'showroom'=>['route'=>'studio','title'=>'Digitalt 3D-showroom – se steinen i bad, kjøkken og stue | Stenhuset','name'=>'3D-showroom',
    'desc'=>'Bygg badet, kjøkkenet eller stuen i 3D med Stenhusets natursten: gulv, vegger, servant, benkeplate, stuebord og peis. Se prisen mens du bygger, og del oppsettet.'],
  'kalkulator'=>['route'=>'kalkulator','title'=>'Priskalkulator for natursten | Stenhuset','name'=>'Priskalkulator',
    'desc'=>'Regn ut hvor mange kvadratmeter du trenger, med svinn og mengderabatt, og få en veiledende pris på fliser i natursten.'],
  'bestill-pa-mal'=>['route'=>'bestill-pa-mal','title'=>'Benkeplate i marmor og natursten på mål i Oslo | Stenhuset','name'=>'Bestill på mål',
    'desc'=>'Benkeplater, bakvegg, bordplater, peis og vinduskarmer i natursten, kappet på mål i egen produksjon i Oslo. Se platene på lager, design i 3D og få tilbud.',
    'image'=>'assets/projects/produksjon/01.jpg','faq'=>true],
  'prosjekter'=>['route'=>'prosjekter','title'=>'Prosjekter – bad, kjøkken og peis i natursten | Stenhuset','name'=>'Prosjekter',
    'desc'=>'Ferdige bad, kjøkken, peiser og uteplasser i natursten fra Stenhuset. Se steinen og produktene, og bygg noe lignende i 3D.','image'=>'assets/projects/bad-calacatta-ottagono/01.jpg'],
  'inspirasjon'=>['route'=>'inspirasjon','title'=>'Inspirasjon fra Instagram og Facebook | Stenhuset','name'=>'Inspirasjon',
    'desc'=>'Innlegg og reels fra Stenhuset med produktene du ser i dem: åpne i 3D, prøv i showroomet eller hent produktarket.'],
  'steinbibliotek'=>['route'=>'stein','title'=>'Steinbibliotek – marmor, kalksten, travertin og terracotta | Stenhuset','name'=>'Steinbibliotek',
    'desc'=>'Bli kjent med steinen: hva marmor, kalksten, travertin, terracotta, terrazzo og zellige er, hvordan de stelles, og alt Stenhuset har i hver stein.'],
  'interiorarkitekt'=>['route'=>'arkitekt','title'=>'For interiørarkitekter og prosjektkunder | Stenhuset','name'=>'For interiørarkitekter',
    'desc'=>'Natursten til prosjekter: spesialløsninger på mål og egen produksjon i Oslo. Stenhuset er samarbeidspartner for interiørarkitekter og prosjektkunder.'],
  'kontakt'=>['route'=>'kontakt','title'=>'Kontakt og showroom i Oslo | Stenhuset','name'=>'Kontakt',
    'desc'=>'Besøk Stenhusets showroom i Sørkedalsveien 238 i Oslo, eller ta kontakt for veiledning og tilbud.'],
  'om-oss'=>['route'=>'om-oss','title'=>'Om Stenhuset – familiebedrift med lidenskap for natursten','name'=>'Om oss',
    'desc'=>'Stenhuset er en familiebedrift i Oslo med showroom, egen stenproduksjon og et stort utvalg av marmor, kalksten og håndlagde fliser.'],
];

/* the business, for structured data (from stenhuset.no: showroom and contact pages) */
const BUSINESS=[
  '@type'=>'HomeAndConstructionBusiness','name'=>'Stenhuset','url'=>'https://stenhuset.no/','email'=>'info@stenhuset.no','telephone'=>'+47 907 21 927',
  'address'=>['@type'=>'PostalAddress','streetAddress'=>'Sørkedalsveien 238','postalCode'=>'0754','addressLocality'=>'Oslo','addressCountry'=>'NO'],
  'sameAs'=>['https://www.instagram.com/stenhuset_no/','https://www.facebook.com/stenhuset.no'],
];

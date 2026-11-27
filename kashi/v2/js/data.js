/* Sample catalogue. Names, prices and sellers are illustrative, not offers. */
window.KDATA = (() => {
const P = (id, name, type, style, color, w, h, price, vendor, finish, tone, rooms, box, added) =>
  ({id, name, type, style, color, w, h, size: w + ' × ' + h + ' cm', price, vendor, finish, tone, rooms, box, added});
const products = [
  P(1, 'Sand Travertine', 'Natural stone', 'travertine', '#cdbb9c', 60, 120, 16900, 'Studio Materials', 'Matt', 'Warm', ['bathroom', 'living'], 1.44, 6),
  P(2, 'Ivory Vein', 'Porcelain', 'marble', '#ebe7df', 60, 60, 8900, 'Nord Surface', 'Polished', 'Light', ['bathroom', 'kitchen'], 1.44, 11),
  P(3, 'Basalt Graphite', 'Porcelain', 'concrete', '#565d58', 60, 60, 10900, 'Nord Surface', 'Matt', 'Dark', ['living', 'outdoor'], 1.44, 8),
  P(4, 'Terracotta Brick', 'Ceramic', 'clay', '#b17b5d', 7.5, 30, 7600, 'Terra Supply', 'Matt', 'Warm', ['kitchen', 'living'], .99, 5),
  P(5, 'Limestone Cloud', 'Natural stone', 'stone', '#d3c9b6', 40, 60, 14900, 'Studio Materials', 'Honed', 'Light', ['bathroom', 'living'], .96, 4),
  P(6, 'Moss Glaze', 'Ceramic', 'plain', '#4f7563', 5, 20, 9900, 'Terra Supply', 'Glazed', 'Colour', ['bathroom', 'kitchen'], .5, 12),
  P(7, 'Nordic Sand', 'Porcelain', 'stone', '#c9b59b', 60, 60, 8400, 'Nord Surface', 'Matt', 'Warm', ['living', 'kitchen'], 1.44, 3),
  P(8, 'Arctic Grey', 'Porcelain', 'concrete', '#929a9a', 60, 60, 7900, 'Nord Surface', 'Matt', 'Grey', ['living', 'outdoor'], 1.44, 2),
  P(9, 'Pure White', 'Ceramic', 'plain', '#eeeae3', 30, 60, 6900, 'Studio Materials', 'Glazed', 'Light', ['bathroom', 'kitchen'], 1.08, 1),
  P(10, 'Warm Concrete', 'Porcelain', 'concrete', '#aaa69b', 80, 80, 9400, 'Studio Materials', 'Matt', 'Grey', ['living', 'kitchen'], 1.28, 9),
  P(11, 'Fjord Blue', 'Ceramic', 'plain', '#74959f', 30, 60, 8700, 'Terra Supply', 'Glazed', 'Colour', ['bathroom'], 1.08, 10),
  P(12, 'Silver Marble', 'Porcelain', 'marble', '#c6c8c4', 60, 120, 12900, 'Nord Surface', 'Polished', 'Grey', ['bathroom', 'living'], 1.44, 7)
];
const sellers = [
  {slug: 'nord-surface', name: 'Nord Surface', mono: 'N', city: 'Reykjavík', code: 'IS', lead: 5,
    about: 'Sample seller with a porcelain range in calm Nordic tones, from pale marble looks to dark basalt.'},
  {slug: 'studio-materials', name: 'Studio Materials', mono: 'S', city: 'Oslo', code: 'NO', lead: 12,
    about: 'Sample seller focused on stone surfaces and large formats for architects and interior studios.'},
  {slug: 'terra-supply', name: 'Terra Supply', mono: 'T', city: 'Izmir', code: 'TR', lead: 21,
    about: 'Sample seller of small-format ceramics: brick, glaze and colour for accent walls.'}
];
const prospects = [
  {name: 'Persepolis Tile', mono: 'P', state: 'Iran · prospect, not onboarded'},
  {name: 'Setareh Tile', mono: 'S', state: 'Iran · prospect, not onboarded'},
  {name: 'Semnan manufacturer', mono: 'S', state: 'Iran · contact in progress'}
];
/* Ready-made floor/wall combinations for the studio and inspiration pages. */
const looks = [
  {id: 'calm', name: 'Calm travertine bath', room: 'bathroom', floor: 5, wall: 1},
  {id: 'basalt', name: 'Basalt and white living', room: 'living', floor: 3, wall: 9},
  {id: 'terra', name: 'Terracotta kitchen', room: 'kitchen', floor: 7, wall: 4},
  {id: 'fjord', name: 'Fjord blue bathroom', room: 'bathroom', floor: 8, wall: 11},
  {id: 'moss', name: 'Moss glaze kitchen', room: 'kitchen', floor: 10, wall: 6},
  {id: 'marble', name: 'Silver marble lounge', room: 'living', floor: 12, wall: 2}
];
const articles = [
  {slug: 'porcelain-vs-ceramic', cat: 'Guide', img: 'living', min: 3, title: 'Porcelain vs ceramic: what is the difference?',
    lead: 'Two fired-clay surfaces that look alike on a shelf and behave differently on a floor.',
    body: [['Water absorption', 'Porcelain is defined by very low water absorption: 0.5 % or less in the EN 14411 group BIa. Many ceramic wall tiles absorb considerably more, which is why they are normally kept indoors and on walls.'],
      ['Where each one works', 'Porcelain is the usual choice for floors, entrances and wet rooms. Glazed ceramic is lighter, easier to cut and offers rich colour for walls and splashbacks.'],
      ['Ask for the test report', 'The name alone is not proof. Choose by the documented values for the exact product: water absorption, breaking strength, slip resistance and, outdoors, frost resistance.']]},
  {slug: 'how-many-square-metres', cat: 'Planning', img: 'dining', min: 2, title: 'How many square metres should you order?',
    lead: 'Measure the surface, add an allowance and round up to whole boxes.',
    body: [['Measure', 'Multiply length by width for every floor and wall area. Subtract large openings such as doors and big windows.'],
      ['Add an allowance', 'A common starting point is 10 % for a straight layout and around 15 % for diagonal or patterned layouts. Complex rooms can need more.'],
      ['Buy one batch', 'Shade and size can vary between production batches. Order everything at once and keep a few spare tiles for later repairs.']]},
  {slug: 'calm-nordic-surfaces', cat: 'Design', img: 'bedroom', min: 3, title: 'Four surfaces for calm Nordic interiors',
    lead: 'Warm limestone, cool concrete, pale porcelain and textured stone.',
    body: [['Start with the light', 'Northern daylight changes strongly through the year. Compare a surface in morning, midday and evening light before you decide; the 3D studio lets you move the sun.'],
      ['Limit the palette', 'One dominant floor surface and one quieter wall surface usually read calmer than three competing materials.'],
      ['Order a sample', 'A screen cannot show texture or true colour. Request physical samples before ordering a full project.']]},
  {slug: 'tiles-for-icelandic-conditions', cat: 'Technical', img: 'exterior', min: 4, title: 'Choosing tiles for Icelandic conditions',
    lead: 'Frost, grit, water and floor heating all matter. Appearance alone is not enough.',
    body: [['Frost', 'Outdoor tiles need documented frost resistance, a drained substrate and a suitable flexible adhesive. Freeze and thaw cycles punish weak details.'],
      ['Grip', 'Check the declared slip resistance for wet rooms, entrances and steps. Do not judge grip from a photograph.'],
      ['Floor heating', 'Stone and porcelain conduct heat well. Follow the adhesive and movement-joint instructions from the installer and manufacturer.']]}
];
const faq = [
  ['Is KASHI a live shop?', 'No. This is a review version. Products, prices and sellers are examples, and no order or payment is processed.'],
  ['What happens to the information I type in?', 'It is stored only in your own browser. Nothing is sent unless you choose to open an email and send it yourself.'],
  ['How is the quantity calculated?', 'Your area plus the waste allowance is rounded up to whole boxes. VAT at 24 % is added to the sample price.'],
  ['Can I get physical samples?', 'You can add up to five sample requests to see how the flow will work. No samples are shipped from this review version.'],
  ['How will sellers be approved?', 'The plan is to verify business identity, agree commission and fulfilment terms, and review the catalogue before anything is published.'],
  ['What does it cost to sell?', 'The standard annual seller fee is NOK 12,000. Sellers joining by 31 December 2026 pay NOK 6,000 for the introductory year. Commission and contract terms are not yet decided.'],
  ['What does it cost to buy?', 'Buyers use KASHI free of charge.'],
  ['Which countries are covered?', 'Norway and Iceland come first. Other markets require compliance, importer and payment-provider approval.']
];
const countries = 'AF AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BQ BA BW BV BR IO BN BG BF BI CV KH CM CA KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF TF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HM VA HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA GS SS ES LK SD SR SJ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB US UM UY UZ VU VE VN VG VI WF EH YE ZM ZW'.split(' ');
return {products, sellers, prospects, looks, articles, faq, countries};
})();

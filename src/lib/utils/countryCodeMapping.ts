/* Country code <-> name utilities */

export const ISO2_TO_NAME: Record<string, string> = {
  af: 'Afghanistan', al: 'Albania', dz: 'Algeria', ao: 'Angola', ar: 'Argentina',
  am: 'Armenia', au: 'Australia', at: 'Austria', az: 'Azerbaijan', bd: 'Bangladesh',
  by: 'Belarus', be: 'Belgium', bj: 'Benin', bo: 'Bolivia', ba: 'Bosnia and Herzegovina',
  br: 'Brazil', bg: 'Bulgaria', bf: 'Burkina Faso', kh: 'Cambodia', cm: 'Cameroon',
  ca: 'Canada', cf: 'Central African Republic', td: 'Chad', cl: 'Chile', cn: 'China',
  co: 'Colombia', cd: 'Congo, Dem. Rep.', cg: 'Congo, Rep.', cr: 'Costa Rica',
  ci: "Côte d'Ivoire", hr: 'Croatia', cu: 'Cuba', cz: 'Czech Republic', dk: 'Denmark',
  do: 'Dominican Republic', ec: 'Ecuador', eg: 'Egypt', sv: 'El Salvador', et: 'Ethiopia',
  fi: 'Finland', fr: 'France', ga: 'Gabon', ge: 'Georgia', de: 'Germany', gh: 'Ghana',
  gr: 'Greece', gt: 'Guatemala', gn: 'Guinea', ht: 'Haiti', hn: 'Honduras', hu: 'Hungary',
  in: 'India', id: 'Indonesia', ir: 'Iran', iq: 'Iraq', ie: 'Ireland', il: 'Israel',
  it: 'Italy', jm: 'Jamaica', jp: 'Japan', jo: 'Jordan', kz: 'Kazakhstan', ke: 'Kenya',
  kp: 'Korea, North', kr: 'Korea, South', kw: 'Kuwait', kg: 'Kyrgyzstan', la: 'Laos',
  lb: 'Lebanon', ly: 'Libya', lt: 'Lithuania', mg: 'Madagascar', mw: 'Malawi',
  my: 'Malaysia', ml: 'Mali', mr: 'Mauritania', mx: 'Mexico', md: 'Moldova',
  ma: 'Morocco', mz: 'Mozambique', mm: 'Myanmar', na: 'Namibia', np: 'Nepal',
  nl: 'Netherlands', nz: 'New Zealand', ni: 'Nicaragua', ne: 'Niger', ng: 'Nigeria',
  no: 'Norway', om: 'Oman', pk: 'Pakistan', pa: 'Panama', py: 'Paraguay', pe: 'Peru',
  ph: 'Philippines', pl: 'Poland', pt: 'Portugal', ro: 'Romania', ru: 'Russia',
  rw: 'Rwanda', sa: 'Saudi Arabia', sn: 'Senegal', rs: 'Serbia', sl: 'Sierra Leone',
  so: 'Somalia', za: 'South Africa', ss: 'South Sudan', es: 'Spain', lk: 'Sri Lanka',
  sd: 'Sudan', sz: 'Eswatini', se: 'Sweden', ch: 'Switzerland', sy: 'Syria',
  tw: 'Taiwan', tj: 'Tajikistan', tz: 'Tanzania', th: 'Thailand', tg: 'Togo',
  tn: 'Tunisia', tr: 'Turkey', tm: 'Turkmenistan', ug: 'Uganda', ua: 'Ukraine',
  ae: 'United Arab Emirates', gb: 'United Kingdom', us: 'United States', uy: 'Uruguay',
  uz: 'Uzbekistan', ve: 'Venezuela', vn: 'Vietnam', ye: 'Yemen', zm: 'Zambia',
  zw: 'Zimbabwe',
};

/** ISO alpha-2 (lowercase) → World Bank API country code (uppercase) */
export const ISO2_TO_WB: Record<string, string> = {
  af: 'AFG', al: 'ALB', dz: 'DZA', ao: 'AGO', ar: 'ARG', am: 'ARM', au: 'AUS',
  at: 'AUT', az: 'AZE', bd: 'BGD', by: 'BLR', be: 'BEL', bj: 'BEN', bo: 'BOL',
  ba: 'BIH', br: 'BRA', bg: 'BGR', bf: 'BFA', kh: 'KHM', cm: 'CMR', ca: 'CAN',
  cf: 'CAF', td: 'TCD', cl: 'CHL', cn: 'CHN', co: 'COL', cd: 'COD', cg: 'COG',
  cr: 'CRI', ci: 'CIV', hr: 'HRV', cu: 'CUB', cz: 'CZE', dk: 'DNK', do: 'DOM',
  ec: 'ECU', eg: 'EGY', sv: 'SLV', et: 'ETH', fi: 'FIN', fr: 'FRA', ga: 'GAB',
  ge: 'GEO', de: 'DEU', gh: 'GHA', gr: 'GRC', gt: 'GTM', gn: 'GIN', ht: 'HTI',
  hn: 'HND', hu: 'HUN', in: 'IND', id: 'IDN', ir: 'IRN', iq: 'IRQ', ie: 'IRL',
  il: 'ISR', it: 'ITA', jm: 'JAM', jp: 'JPN', jo: 'JOR', kz: 'KAZ', ke: 'KEN',
  kp: 'PRK', kr: 'KOR', kw: 'KWT', kg: 'KGZ', la: 'LAO', lb: 'LBN', ly: 'LBY',
  lt: 'LTU', mg: 'MDG', mw: 'MWI', my: 'MYS', ml: 'MLI', mr: 'MRT', mx: 'MEX',
  md: 'MDA', ma: 'MAR', mz: 'MOZ', mm: 'MMR', na: 'NAM', np: 'NPL', nl: 'NLD',
  nz: 'NZL', ni: 'NIC', ne: 'NER', ng: 'NGA', no: 'NOR', om: 'OMN', pk: 'PAK',
  pa: 'PAN', py: 'PRY', pe: 'PER', ph: 'PHL', pl: 'POL', pt: 'PRT', ro: 'ROU',
  ru: 'RUS', rw: 'RWA', sa: 'SAU', sn: 'SEN', rs: 'SRB', sl: 'SLE', so: 'SOM',
  za: 'ZAF', ss: 'SSD', es: 'ESP', lk: 'LKA', sd: 'SDN', sz: 'SWZ', se: 'SWE',
  ch: 'CHE', sy: 'SYR', tj: 'TJK', tz: 'TZA', th: 'THA', tg: 'TGO', tn: 'TUN',
  tr: 'TUR', tm: 'TKM', ug: 'UGA', ua: 'UKR', ae: 'ARE', gb: 'GBR', us: 'USA',
  uy: 'URY', uz: 'UZB', ve: 'VEN', vn: 'VNM', ye: 'YEM', zm: 'ZMB', zw: 'ZWE',
};

export function countryName(iso2: string): string {
  return ISO2_TO_NAME[iso2.toLowerCase()] ?? iso2.toUpperCase();
}

export function worldBankCode(iso2: string): string {
  return ISO2_TO_WB[iso2.toLowerCase()] ?? iso2.toUpperCase();
}

/** Country flag emoji from ISO alpha-2 code */
export function countryFlag(iso2: string): string {
  const code = iso2.toUpperCase();
  return [...code].map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('');
}

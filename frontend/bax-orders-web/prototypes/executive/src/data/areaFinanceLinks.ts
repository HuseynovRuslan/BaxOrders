/*
 * Which financial object («Obyekt» of the order workbook, its id in the figures) each map location's money belongs to —
 * written down by hand, one line per location, each with the evidence it stands on. The two workbooks are kept apart: the
 * location workbook has 48 records and no link to the figures (its `baxorders_area_id` is empty), the order workbook has
 * its own names («H.Ə.M», «F.M») for about 36 objects. Nothing here is matched by a similar name, by a manager or by
 * distance, and a location missing from this table shows no money at all: «Maliyyə məlumatları hələ uyğunlaşdırılmayıb».
 *
 * Evidence, strongest first:
 * - `business`: the owner's own answer in docs/business-decisions.md («CB-…»: the workbook's name is that place).
 * - `data`: a data-backed equivalence the register accepted for implementation («DB-04»), not said by the owner.
 * - `same-name`: the order workbook names the object exactly as the location record does (letter for letter, case
 *   aside); where the register also confirms the name as canonical (CB-38) or the product seeds it, `ref` says so.
 *
 * To link one more location: add a line with its evidence (or move it here from `FINANCE_LINK_CANDIDATES` once the owner
 * confirms it) and run the tests. Several locations may share one object (one bill for a whole area): the map then shows
 * that object's figures on each of them and says so, and every total counts the object once.
 */

export type LinkBasis = 'business' | 'data' | 'same-name'

export interface FinanceLink {
  /** The object's id in the figures: the slug of its «Obyekt» name, as scripts/import_workbook.py writes it. */
  siteId: string
  /** The object's name in the order workbook, for whoever checks the line. */
  sourceName: string
  basis: LinkBasis
  /** Where the evidence is written: «CB-08», «DB-04», «CB-38». */
  ref: string | null
}

export const FINANCE_LINKS: Readonly<Record<string, FinanceLink>> = {
  // Confirmed by the owner: the workbook's abbreviations and short names (docs/business-decisions.md, «Locations»).
  'LOC-0024': { siteId: 'h-e-m', sourceName: 'H.Ə.M', basis: 'business', ref: 'CB-08' },
  'LOC-0026': { siteId: 'b-k-m', sourceName: 'B.K.M', basis: 'business', ref: 'CB-07' },
  'LOC-0046': { siteId: 'f-m', sourceName: 'F.M', basis: 'business', ref: 'CB-06' },
  'LOC-0037': { siteId: 'puskin', sourceName: 'Puşkin', basis: 'business', ref: 'CB-01' },
  'LOC-0034': { siteId: 'parlament', sourceName: 'Parlament', basis: 'business', ref: 'CB-02' },
  // Accepted from the data (DB-04: the short and the long name are one object; still active after the corrected
  // workbook, result B), not said by the owner.
  'LOC-0035': { siteId: 'xetai', sourceName: 'Xətai', basis: 'data', ref: 'DB-04' },
  'LOC-0033': { siteId: 'zabitler', sourceName: 'Zabitlər', basis: 'data', ref: 'DB-04' },
  // The same name in both workbooks.
  'LOC-0049': { siteId: 'aeroport-yolu', sourceName: 'Aeroport yolu', basis: 'same-name', ref: null },
  'LOC-0040': { siteId: 'balaxani', sourceName: 'Balaxanı', basis: 'same-name', ref: null },
  'LOC-0021': { siteId: 'pirsagi', sourceName: 'Pirşağı', basis: 'same-name', ref: null },
  'LOC-0028': { siteId: 'ramana', sourceName: 'Ramana', basis: 'same-name', ref: 'məhsulda RAMANA' },
  'LOC-0023': { siteId: 'emircan', sourceName: 'Əmircan', basis: 'same-name', ref: 'məhsulda EMIRCAN' },
  'LOC-0029': { siteId: 'bayil-yolu', sourceName: 'Bayıl yolu', basis: 'same-name', ref: 'CB-38' },
  'LOC-0032': { siteId: 'novxani', sourceName: 'Novxanı', basis: 'same-name', ref: 'CB-38' },
  'LOC-0038': { siteId: 'muzey-merkezi', sourceName: 'Muzey Mərkəzi', basis: 'same-name', ref: 'CB-38' },
  'LOC-0047': { siteId: 'adnsu', sourceName: 'ADNSU', basis: 'same-name', ref: 'CB-38' },
  'LOC-0048': { siteId: 'idea', sourceName: 'İDEA', basis: 'same-name', ref: 'CB-38' },
}

/**
 * Pairs that look alike but are NOT confirmed — kept apart until the owner answers. They show no money; the panel names
 * the candidate so the owner can confirm or reject it. Several pins on one candidate (Bibiheybət) need saying which.
 */
export interface FinanceLinkCandidate {
  siteId: string
  sourceName: string
  /** Why it is not linked yet. */
  question: string
}

export const FINANCE_LINK_CANDIDATES: Readonly<Record<string, FinanceLinkCandidate>> = {
  'LOC-0039': { siteId: 'nerimanov-heykeli', sourceName: 'Nərimanov Heykəli', question: 'CB-03 adı «Nərimanov heykəli» təsdiqləyir; lokasiya «Nərimanov heykəli parkı» adlanır — eyni obyektdirmi?' },
  'LOC-0042': { siteId: 'milli-konservatoriya-qarsisi', sourceName: 'Milli Konservatoriya qarşısı', question: 'CB-04 adı «Milli Konservatoriya qarşısı» təsdiqləyir; lokasiya «Konservatoriya parkı» adlanır — eyni obyektdirmi?' },
  'LOC-0030': { siteId: 'qafur-memmedov', sourceName: 'Qafur Məmmədov', question: 'DB-04 ilk Excel-də «Qafur Məmmədov parkı»nı «Qafur Məmmədov» ilə bir obyekt saymışdı, amma düzəldilmiş Excel-də uzun ad yoxdur (nəticə C, yalnız tarixi) və CB-38 adı «Qafur Məmmədov» kimi saxlayır — lokasiya «Qafur Məmmədov parkı» eyni obyektdirmi?' },
  'LOC-0036': { siteId: 'axundov', sourceName: 'Axundov', question: 'Excel-də «Axundov» (CB-38), lokasiyada «Axundov bağı» — eyni obyektdirmi?' },
  'LOC-0041': { siteId: 'dede-qorqud', sourceName: 'Dədə Qorqud', question: 'Excel-də «Dədə Qorqud», lokasiyada «Dədə Qorqud parkı» — eyni obyektdirmi?' },
  'LOC-0043': { siteId: 'space-tv-qarsisi', sourceName: 'Space Tv qarşısı', question: 'Excel-də «Space Tv qarşısı» (CB-38), lokasiyada «Space park» — eyni obyektdirmi?' },
  'LOC-0018': { siteId: 'bibiheybet', sourceName: 'Bibiheybət', question: 'Excel-də bir «Bibiheybət» var, xəritədə iki nöqtə (məscid və qəsəbə) — hansına aiddir, yoxsa hər ikisinə?' },
  'LOC-0031': { siteId: 'bibiheybet', sourceName: 'Bibiheybət', question: 'Excel-də bir «Bibiheybət» var, xəritədə iki nöqtə (məscid və qəsəbə) — hansına aiddir, yoxsa hər ikisinə?' },
  'LOC-0022': { siteId: 'qala-baza', sourceName: 'Qala baza', question: 'Excel-də «Qala baza» (CB-39: həm obyekt, həm təchizatçı), lokasiyada «Qala anbarı» — eyni yerdirmi?' },
}

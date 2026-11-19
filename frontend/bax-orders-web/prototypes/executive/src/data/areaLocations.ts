/**
 * Where each operational area is: latitude and longitude by the area's id. EMPTY ON PURPOSE — the owner will provide
 * the real coordinates; until then every area still exists everywhere (the overview, the map's list, the details) and is
 * marked «Koordinat daxil edilməyib» on the map. Never fill this with guesses: a wrong pin is worse than none.
 *
 * The id is the object's id in the figures — the slug of the workbook's «Obyekt» name, as `scripts/import_workbook.py`
 * writes it (the full list: the map's «Koordinat gözləyənlər», or `sites` in data/real-data.json). For example:
 *
 *   'aeroport-yolu': { lat: 40.4, lng: 49.9 },   // ← real values only, WGS84 decimal degrees
 *
 * A pair outside Azerbaijan, or for an id the figures do not have, is not drawn: the map's list names it so it can be put
 * right. The same pair may later come from the workbook itself (an object's own coordinates take precedence then).
 */
export interface AreaLocation {
  lat: number
  lng: number
  /** Where the pair came from, for whoever checks it later: «Google Maps, 2026-11-12», a survey, … */
  note?: string
}

export const AREA_LOCATIONS: Readonly<Record<string, AreaLocation>> = {}

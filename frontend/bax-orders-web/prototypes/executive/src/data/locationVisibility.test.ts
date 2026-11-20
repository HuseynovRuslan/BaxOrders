import { describe, expect, it } from 'vitest'
import raw from './areaLocations.json'
import { AREA_LOCATIONS, type AreaLocation } from './areaLocations'
import { FINANCE_LINK_CANDIDATES, FINANCE_LINKS } from './areaFinanceLinks'
import {
  applyVisibility, HIDDEN_DUPLICATES, HIDDEN_LOCATIONS, hiddenBehind, shownIdOf, VISIBILITY_PROBLEMS, VISIBLE_LOCATIONS, type HiddenDuplicate,
} from './locationVisibility'

/*
 * «Vətəndaş Qəbulu Mərkəzi» is in the owner's export twice (DUP-01: LOC-0014, LOC-0020, ~72 m apart). The owner asked
 * for one point (2026-11-19): LOC-0020, the record of HIGH confidence, is drawn; LOC-0014 is kept off the map — and only
 * off the map: the record, its coordinates and its history stay.
 */

const NAME = 'Azərbaycan Respublikası Prezident Administrasiyasının Vətəndaş Qəbulu Mərkəzi'
const records = (raw as { locations: Record<string, unknown>[] }).locations

describe('the hidden duplicate', () => {
  it('draws 47 places from the 48 records, the name once, as LOC-0020', () => {
    expect(AREA_LOCATIONS).toHaveLength(48)
    expect(VISIBLE_LOCATIONS).toHaveLength(47)
    expect(VISIBILITY_PROBLEMS).toEqual([])
    const named = VISIBLE_LOCATIONS.filter((location) => location.name === NAME)
    expect(named.map((location) => location.id)).toEqual(['LOC-0020'])
    expect(named[0]).toMatchObject({ lat: 40.413206, lng: 49.8546377, confidence: 'HIGH', manager: 'Quliyev Rəhman' })
    expect(new Set(VISIBLE_LOCATIONS.map((location) => location.name)).size).toBe(47)
  })

  it('keeps LOC-0014 in the source and in the record list, unchanged, at its full-precision coordinates', () => {
    const kept = records.find((record) => record.record_id === 'LOC-0014')!
    expect(kept).toMatchObject({ latitude: 40.41383743286133, longitude: 49.85444259643555, extraction_status: 'POSSIBLE_DUPLICATE', duplicate_group: 'DUP-01' })
    expect(AREA_LOCATIONS.find((location) => location.id === 'LOC-0014')).toMatchObject({ lat: 40.41383743286133, lng: 49.85444259643555, status: 'POSSIBLE_DUPLICATE' })
    expect(HIDDEN_LOCATIONS.map((item) => [item.location.id, item.shownAs.id, item.entry.group])).toEqual([['LOC-0014', 'LOC-0020', 'DUP-01']])
    expect(HIDDEN_DUPLICATES[0].reason).toMatch(/HIGH/)
  })

  it('opens the shown record for either id', () => {
    expect(shownIdOf('LOC-0014')).toBe('LOC-0020')
    expect(shownIdOf('LOC-0020')).toBe('LOC-0020')
    expect(shownIdOf('LOC-0049')).toBe('LOC-0049')
    expect(hiddenBehind('LOC-0020').map((item) => item.location.id)).toEqual(['LOC-0014'])
    expect(hiddenBehind('LOC-0049')).toEqual([])
  })

  it('hides nothing else: the other possible duplicate, LOC-0049 and the gap at LOC-0025 are as the export has them', () => {
    expect(VISIBLE_LOCATIONS.filter((location) => location.status === 'POSSIBLE_DUPLICATE').map((location) => location.id)).toEqual(['LOC-0020', 'LOC-0026'])
    expect(VISIBLE_LOCATIONS.find((location) => location.id === 'LOC-0049')).toMatchObject({ name: 'Aeroport yolu', manager: 'Məmmədov Nizami' })
    expect(AREA_LOCATIONS.some((location) => location.id === 'LOC-0025')).toBe(false)
    expect(VISIBLE_LOCATIONS.map((location) => location.id)).toEqual(AREA_LOCATIONS.map((location) => location.id).filter((id) => id !== 'LOC-0014'))
  })

  it('takes no money off the map: the 17 links and the candidates name shown records only', () => {
    expect(Object.keys(FINANCE_LINKS)).toHaveLength(17)
    const shown = new Set(VISIBLE_LOCATIONS.map((location) => location.id))
    for (const id of [...Object.keys(FINANCE_LINKS), ...Object.keys(FINANCE_LINK_CANDIDATES)]) expect(shown.has(id)).toBe(true)
  })
})

describe('a registry line that no longer holds is not applied', () => {
  const place = (id: string, extra: Partial<AreaLocation> = {}): AreaLocation => ({
    id, name: 'Eyni ad', lat: 40.4, lng: 49.9, mapUrl: null, manager: null, managers: [], status: 'POSSIBLE_DUPLICATE', confidence: 'HIGH',
    duplicateGroup: 'DUP-09', reviewIssues: [], sourceAreaId: null, ...extra,
  })
  const line = (extra: Partial<HiddenDuplicate> = {}): HiddenDuplicate => ({ id: 'LOC-0901', shownAs: 'LOC-0902', group: 'DUP-09', decided: '2026-11-19', reason: 'sınaq', ...extra })
  const pair = [place('LOC-0901'), place('LOC-0902')]
  const none = new Set<string>()

  it('hides a confirmed twin', () => {
    const result = applyVisibility(pair, [line()], none)
    expect(result.visible.map((location) => location.id)).toEqual(['LOC-0902'])
    expect(result.problems).toEqual([])
  })

  it('keeps both, and says why, when the records are gone, differ, or the hidden one carries money', () => {
    const cases: [readonly AreaLocation[], HiddenDuplicate, ReadonlySet<string>, RegExp][] = [
      [[place('LOC-0902')], line(), none, /gizlədilən qeyd mənbədə yoxdur/],
      [[place('LOC-0901')], line(), none, /LOC-0902 mənbədə yoxdur/],
      [[place('LOC-0901'), place('LOC-0902', { name: 'Başqa ad' })], line(), none, /adları fərqlidir/],
      [[place('LOC-0901'), place('LOC-0902', { duplicateGroup: null })], line(), none, /DUP-09 dublikat qrupunda deyil/],
      [pair, line({ shownAs: 'LOC-0901' }), none, /özü gizlədilib/],
      [pair, line(), new Set(['LOC-0901']), /maliyyə sətri var/],
    ]
    for (const [locations, entry, finance, problem] of cases) {
      const result = applyVisibility(locations, [entry], finance)
      expect(result.visible).toEqual(locations)
      expect(result.problems).toHaveLength(1)
      expect(result.problems[0]).toMatch(problem)
      expect(result.problems[0]).toMatch(/hər iki qeyd göstərilir/)
    }
  })

  it('never hides the record shown for another', () => {
    const result = applyVisibility(pair, [line(), line({ id: 'LOC-0902', shownAs: 'LOC-0901' })], none)
    expect(result.visible).toHaveLength(2)
    expect(result.problems).toHaveLength(2)
  })
})

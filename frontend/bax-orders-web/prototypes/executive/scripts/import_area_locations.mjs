#!/usr/bin/env node
/**
 * Brings the owner's area locations into the prototype: `src/data/areaLocations.json`, read by `src/data/areaLocations.ts`.
 *
 *   node prototypes/executive/scripts/import_area_locations.mjs <export.json|export.txt> [--check]
 *
 * The input is the JSON export of the owner's location workbook (worksheet «Areas»; the first one, of 2026-11-19, came as
 * `docs/BaxOrders_Areas_48.txt`: JSON in a .txt file). The script
 *
 * - keeps only the fields the map may show (ALLOWED below): any other column — a supervisor, a warehouse keeper, a phone,
 *   a message — is dropped and named, so a fuller export can never leak private columns into the site;
 * - refuses the file when a record id repeats, a coordinate is not a number or lies outside Azerbaijan, or the record
 *   count differs from `record_count`;
 * - writes the records unchanged otherwise: the same ids, the same coordinates to the last digit, the same order.
 *
 * With --check it writes nothing and says whether the checked-in file already matches the input.
 * No record is ever added, merged or guessed here: LOC-0025 was deleted by the owner and stays deleted.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ALLOWED = [
  'record_id', 'area_name_normalized', 'latitude', 'longitude', 'map_url', 'area_manager',
  'extraction_status', 'confidence', 'duplicate_group', 'review_issue_ids', 'baxorders_area_id',
]
const META = ['dataset', 'source_workbook', 'source_worksheet', 'record_count', 'important_notes']
/** Azerbaijan's extent with a small margin — the same box the app checks (src/data/areaLocations.ts). */
const BOUNDS = { south: 38.3, north: 41.95, west: 44.7, east: 50.9 }
const STATUSES = new Set(['VERIFIED', 'NEEDS_REVIEW', 'POSSIBLE_DUPLICATE'])

const here = dirname(fileURLToPath(import.meta.url))
const target = resolve(here, '../src/data/areaLocations.json')

const [input, flag] = process.argv.slice(2)
if (!input) {
  console.error('İstifadə: node import_area_locations.mjs <ixrac.json|ixrac.txt> [--check]')
  process.exit(2)
}

const source = JSON.parse(readFileSync(input, 'utf8').replace(/^﻿/, ''))
const problems = []
const dropped = new Set()

if (!Array.isArray(source.locations)) problems.push('«locations» siyahısı yoxdur')
const seen = new Set()
const locations = (source.locations ?? []).map((record, index) => {
  for (const key of Object.keys(record)) if (!ALLOWED.includes(key)) dropped.add(key)
  const id = record.record_id
  if (typeof id !== 'string' || !/^LOC-\d{4}$/.test(id)) problems.push(`#${index + 1}: record_id «${id}» LOC-0000 şəklində deyil`)
  else if (seen.has(id)) problems.push(`${id}: təkrarlanır`)
  seen.add(id)
  const { latitude: lat, longitude: lng } = record
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) problems.push(`${id}: koordinat rəqəm deyil`)
  else if (lat < BOUNDS.south || lat > BOUNDS.north || lng < BOUNDS.west || lng > BOUNDS.east) problems.push(`${id}: koordinat Azərbaycandan kənardır (${lat}, ${lng})`)
  if (!STATUSES.has(record.extraction_status)) problems.push(`${id}: naməlum status «${record.extraction_status}»`)
  return Object.fromEntries(ALLOWED.map((key) => [key, record[key] ?? null]))
})
if (typeof source.record_count === 'number' && source.record_count !== locations.length) {
  problems.push(`record_count ${source.record_count}, amma ${locations.length} qeyd var`)
}

if (problems.length) {
  console.error(`Fayl qəbul edilmədi (${problems.length} problem):\n- ${problems.join('\n- ')}`)
  process.exit(1)
}

const output = `${JSON.stringify({ ...Object.fromEntries(META.map((key) => [key, source[key] ?? null])), locations }, null, 2)}\n`
if (dropped.size) console.warn(`Göstərilməyən sütunlar atıldı: ${[...dropped].join(', ')}`)

if (flag === '--check') {
  let current = ''
  try { current = readFileSync(target, 'utf8') } catch { /* none yet */ }
  if (current === output) {
    console.log(`Uyğundur: ${locations.length} qeyd, ${target}`)
  } else {
    console.error(`Fərqlidir: ${target} bu ixracla eyni deyil — yeniləmək üçün --check olmadan işlədin.`)
    process.exit(1)
  }
} else {
  writeFileSync(target, output, 'utf8')
  console.log(`Yazıldı: ${locations.length} qeyd → ${target}`)
}

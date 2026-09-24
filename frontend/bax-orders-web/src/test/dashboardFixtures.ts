import type { DashboardPartition, DashboardPartitionMember } from '../api/dashboard'

/**
 * Test-only builders for the portfolio partition.
 *
 * They are shared rather than copied into each test file because the partition has an invariant — the four
 * groups add up to the catalogue, and the backend throws when they do not — and a fixture that quietly broke
 * it would let a test pass against data the API can never return. Here the totals are derived from the groups,
 * so a fixture cannot disagree with itself unless a test says so on purpose.
 */

export function partitionMember(
  locationId: number,
  locationName: string,
  overrides: Partial<DashboardPartitionMember> = {},
): DashboardPartitionMember {
  return {
    locationId,
    locationCode: `OBJ-${String(locationId).padStart(3, '0')}`,
    locationName,
    currentKnownAmount: null,
    baselineKnownAmount: null,
    knownAmountDelta: null,
    lastOrderPeriod: null,
    lastOrderKnownAmount: null,
    ...overrides,
  }
}

type PartitionGroups = Partial<Pick<
  DashboardPartition,
  'compared' | 'noOrderThisMonth' | 'noBaseline' | 'noHistory'
>>

/** The counts are computed from the groups, exactly as the backend computes them. */
export function partition(
  groups: PartitionGroups = {},
  overrides: Partial<DashboardPartition> = {},
): DashboardPartition {
  const compared = groups.compared ?? []
  const noOrderThisMonth = groups.noOrderThisMonth ?? []
  const noBaseline = groups.noBaseline ?? []
  const noHistory = groups.noHistory ?? []

  return {
    locationCount: compared.length + noOrderThisMonth.length + noBaseline.length + noHistory.length,
    comparableLocationCount: compared.length + noOrderThisMonth.length + noBaseline.length,
    compared,
    noOrderThisMonth,
    noBaseline,
    noHistory,
    ...overrides,
  }
}

/** A partition of `count` objects that were all compared: the ordinary month, with nothing to explain. */
export function comparedOnly(count: number): DashboardPartition {
  return partition({
    compared: Array.from({ length: count }, (_, index) => partitionMember(index + 1, `Obyekt ${index + 1}`)),
  })
}

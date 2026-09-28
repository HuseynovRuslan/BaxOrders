/**
 * Test-only: one import under review, as the API returns it after Task 16a.
 *
 * The figures are 16a's worked example, so every screen's test and the sweep read the same batch:
 * 7 rows with «Qiymət yoxdur» = 5 unclassified + 2 said to be bought, and 2 said to be supplied free. In the
 * confirmation preview, group A (Heydər Əliyev Mərkəzi) holds 5 / 4 / 1 / 1 and group B (Fəvvarələr meydanı)
 * 2 / 1 / 1 / 1 — missing / unclassified / bought / free.
 */
import type {
  ConfirmationGroupPreview,
  ImportConfirmationPreview,
  ImportConfirmationResult,
  ImportGroupPreview,
  ImportPreview,
} from '../api/imports'
import type { ImportPricingReview, ImportPricingRow } from '../api/importPricing'
import type { ImportReadiness } from '../api/rows'

export function importReadiness(
  warnings: Partial<ImportReadiness['warnings']> = {},
  overrides: Partial<ImportReadiness> = {},
): ImportReadiness {
  return {
    importBatchId: 6,
    batchStatus: 'NeedsReview',
    totalRows: 40,
    includedRows: 38,
    excludedRows: 2,
    validRows: 30,
    warningRows: 8,
    invalidRows: 0,
    unresolvedReferences: {
      locations: 0,
      suppliers: 0,
      responsiblePeople: 0,
      orderUnits: 0,
      specificationUnits: 0,
      categoryPaths: 0,
    },
    products: { unresolvedProducts: 0, unresolvedVariants: 0, dependencyBlockedRows: 0 },
    rowIssues: {
      invalidQuantity: 0,
      invalidPeriod: 0,
      missingRequiredValue: 0,
      ambiguousMatch: 0,
      otherErrors: 0,
      missingSourceColumn: 0,
    },
    warnings: {
      missingPrice: 7,
      invalidPrice: 0,
      lineTotalMismatch: 0,
      cellsStoredAsDates: 0,
      priceNotRequired: 2,
      unclassifiedPrice: 5,
      priceRequired: 2,
      ...warnings,
    },
    possibleDuplicateRows: 0,
    existingRequestGroups: [],
    canImport: true,
    blockers: [],
    ...overrides,
  }
}

export function stagingGroup(overrides: Partial<ImportGroupPreview> = {}): ImportGroupPreview {
  return {
    locationId: 4,
    locationName: 'Heydər Əliyev Mərkəzi',
    period: '2026-03-01',
    rowCount: 10,
    pricedRows: 4,
    unpricedRows: 6,
    warningCount: 6,
    errorCount: 0,
    existingRequest: false,
    latestVersion: null,
    suggestedAction: 'CreateNewRequest',
    missingPriceRows: 5,
    internalSupplyRows: 1,
    ...overrides,
  }
}

export function importPreview(overrides: Partial<ImportPreview['batch']> = {}): ImportPreview {
  return {
    batch: {
      id: 6,
      fileName: 'sifarişlər-mart.xlsx',
      status: 'ReadyToImport',
      totalRows: 40,
      validRows: 30,
      warningRows: 8,
      invalidRows: 2,
      uploadedAtUtc: '2026-09-25T08:00:00Z',
      completedAtUtc: null,
      failureReason: null,
      ...overrides,
    },
    issueSummary: [{ issueType: 'MissingPrice', severity: 'Warning', count: 9 }],
    groups: [
      stagingGroup(),
      stagingGroup({
        locationId: 21,
        locationName: 'Fəvvarələr meydanı',
        rowCount: 5,
        pricedRows: 2,
        unpricedRows: 3,
        missingPriceRows: 2,
        internalSupplyRows: 1,
      }),
    ],
    ungroupedRows: 0,
  }
}

export function confirmationGroup(overrides: Partial<ConfirmationGroupPreview> = {}): ConfirmationGroupPreview {
  return {
    locationId: 4,
    locationCode: 'LOC-000004',
    locationName: 'Heydər Əliyev Mərkəzi',
    requestPeriod: '2026-03-01',
    sourceRowCount: 10,
    knownPriceItemCount: 4,
    missingPriceItemCount: 5,
    possibleDuplicateItemCount: 0,
    knownAmountTotal: 1250.5,
    existingRequest: false,
    existingVersions: 0,
    latestVersion: null,
    proposedVersion: 1,
    conflictState: 'New',
    requiredDecision: null,
    unclassifiedPriceItemCount: 4,
    priceRequiredItemCount: 1,
    internalSupplyItemCount: 1,
    monthlyItemCount: 9,
    outsideMonthlyItemCount: 1,
    unclassifiedLineTypeItemCount: 0,
    ...overrides,
  }
}

/** Group B already has an order, so the operator must decide on it — and may leave it out. */
export const groupB = confirmationGroup({
  locationId: 21,
  locationCode: 'LOC-000021',
  locationName: 'Fəvvarələr meydanı',
  sourceRowCount: 5,
  knownPriceItemCount: 2,
  missingPriceItemCount: 2,
  knownAmountTotal: 300,
  existingRequest: true,
  existingVersions: 1,
  latestVersion: 1,
  proposedVersion: null,
  conflictState: 'ExistingRequest',
  requiredDecision: 'CreateNewVersion',
  unclassifiedPriceItemCount: 1,
  priceRequiredItemCount: 1,
  internalSupplyItemCount: 1,
})

export function confirmationPreview(overrides: Partial<ImportConfirmationPreview> = {}): ImportConfirmationPreview {
  return {
    importBatchId: 6,
    batchStatus: 'ReadyToImport',
    canImport: true,
    sourceRows: 17,
    includedRows: 15,
    excludedRows: 2,
    groupCount: 2,
    rowsToImport: 15,
    knownPriceRows: 6,
    missingPriceRows: 7,
    possibleDuplicateRows: 0,
    resolvedSupplierRows: 15,
    missingSupplierRows: 0,
    unitlessVariantRows: 0,
    descriptorVariantRows: 0,
    existingRequestConflictGroups: 1,
    canConfirm: true,
    alreadyImported: false,
    groups: [confirmationGroup(), groupB],
    result: null,
    unclassifiedPriceRows: 5,
    priceRequiredRows: 2,
    internalSupplyRows: 2,
    // 15 rows to import: 12 planned, 2 on top of the plan, 1 the source says nothing readable about.
    monthlyRows: 12,
    outsideMonthlyRows: 2,
    unclassifiedLineTypeRows: 1,
    ...overrides,
  }
}

/** Criterion 5's result: group B was left out, so 5 / 4 / 1 / 1 were written. */
export function confirmationResult(overrides: Partial<ImportConfirmationResult> = {}): ImportConfirmationResult {
  return {
    importBatchId: 6,
    batchStatus: 'Imported',
    alreadyImported: false,
    confirmedAtUtc: '2026-09-25T09:00:00Z',
    createdRequests: 1,
    createdItems: 10,
    skippedGroups: 1,
    skippedRows: 5,
    missingPriceItems: 5,
    possibleDuplicateItems: 0,
    missingSupplierItems: 0,
    knownAmountTotal: 1250.5,
    durationMilliseconds: 420,
    unclassifiedPriceItems: 4,
    priceRequiredItems: 1,
    internalSupplyItems: 1,
    createdOrderRequestIds: [101],
    ...overrides,
  }
}

export function pricingRow(overrides: Partial<ImportPricingRow> = {}): ImportPricingRow {
  return {
    importRowId: 812,
    sheetName: 'Mart',
    rowNumber: 44,
    locationName: 'Heydər Əliyev Mərkəzi',
    requestPeriod: '2026-03-01',
    productName: 'Maye sabun',
    specificationValue: '5',
    orderUnit: 'ədəd',
    quantity: 12,
    supplierName: null,
    workbookSupplierName: 'Qala baza',
    classification: null,
    classifiedByDisplayName: null,
    classifiedAtUtc: null,
    ...overrides,
  }
}

export const pricingRows: ImportPricingRow[] = [
  pricingRow(),
  pricingRow({
    importRowId: 813,
    rowNumber: 45,
    productName: 'Zibil paketi',
    specificationValue: null,
    orderUnit: 'bağlama',
    quantity: 30,
    supplierName: 'Cleanfix MMC',
    workbookSupplierName: 'Cleanfix',
  }),
  pricingRow({
    importRowId: 814,
    rowNumber: 46,
    locationName: 'Fəvvarələr meydanı',
    productName: 'Əlcək',
    specificationValue: null,
    orderUnit: 'cüt',
    quantity: 8,
    workbookSupplierName: 'Azpetrol baza',
  }),
]

export function pricingReview(overrides: Partial<ImportPricingReview> = {}): ImportPricingReview {
  const rows = overrides.rows ?? pricingRows
  return {
    rows,
    totalCount: rows.length,
    unclassified: 5,
    priceRequired: 2,
    internalFreeSupply: 2,
    ...overrides,
  }
}

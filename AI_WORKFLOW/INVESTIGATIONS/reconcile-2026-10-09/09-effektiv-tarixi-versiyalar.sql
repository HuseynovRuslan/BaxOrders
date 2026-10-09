-- BaxOrders — the owner's final Excel becomes the effective approved history, 2026-10-09.
--
-- The workbook is the approved business document, not a request waiting for a manager. The application
-- already has a name for that: `ImportedAsApproved`, written beside all 167 historical orders by migration
-- 20260923122642 — actor «Sistem», no user id, and SubmittedAtUtc/ApprovedAtUtc left null, because nobody in
-- this system approved them and stamping a moment nobody can stand behind would be a lie. The same semantics
-- are used here, for the same reason.
--
-- Three corrected versions become effective:
--   Bibiheybət   v2 #168 — already built by import 50011; it only has to stop being a draft
--   Xətai parkı  v2      — built here: every v1 line copied, plus the one row the workbook adds
--   Zabitlər p.  v2      — built here: every v1 line copied, plus the three rows the workbook adds
--
-- Xətai and Zabitlər are built here rather than by the importer because the importer cannot keep their
-- Laqonda lines on the product the approved history already uses: one workbook name resolves to one product,
-- while v1 holds «…P40 göy» and «…P60 göy» as two. Copying v1's own ProductVariantId is the only way to add a
-- row without silently moving an existing line to another product. Nothing is renamed and no alias is written.
--
-- Idempotent: every statement is guarded, so a second run writes nothing.
\set ON_ERROR_STOP on
BEGIN;

-- ---- guards: refuse unless the database is in the state this was written against -------------------------
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM "OrderRequests"
   WHERE "Id" = 149 AND "Status" = 'Approved' AND "Version" = 1;
  IF n <> 1 THEN RAISE EXCEPTION 'Bibiheybət v1 (149) is not approved v1'; END IF;

  SELECT count(*) INTO n FROM "OrderRequests"
   WHERE "Id" = 165 AND "Status" = 'Approved' AND "Version" = 1;
  IF n <> 1 THEN RAISE EXCEPTION 'Xətai v1 (165) is not approved v1'; END IF;

  SELECT count(*) INTO n FROM "OrderRequests"
   WHERE "Id" = 166 AND "Status" = 'Approved' AND "Version" = 1;
  IF n <> 1 THEN RAISE EXCEPTION 'Zabitlər v1 (166) is not approved v1'; END IF;

  SELECT count(*) INTO n FROM "ImportBatches" WHERE "Id" = 50011 AND "Status" = 'Imported';
  IF n <> 1 THEN RAISE EXCEPTION 'batch 50011 is not Imported'; END IF;
END $$;

-- ---- 1. Bibiheybət v2 (#168): the draft becomes the effective approved version ---------------------------
INSERT INTO "OrderRequestWorkflowEvents"
  ("OrderRequestId","Action","FromStatus","ToStatus","ActorUserId","ActorDisplayName",
   "Comment","MissingPriceItemCount","MissingPricesAcknowledged","OccurredAtUtc")
SELECT r."Id", 'ImportedAsApproved', r."Status", 'Approved', NULL, 'Sistem',
       'Sahibin yekun Excel-i (Aylıq) tarixi sənəd kimi qəbul edilib; bu versiya onun qüvvədə olan halıdır.',
       (SELECT count(*) FROM "OrderRequestItems" i
         WHERE i."OrderRequestId" = r."Id" AND i."UnitPrice" IS NULL AND i."PricingMode" <> 'InternalFreeSupply'),
       FALSE, now() AT TIME ZONE 'UTC'
  FROM "OrderRequests" r
 WHERE r."Id" = 168 AND r."Status" = 'Draft'
   AND NOT EXISTS (SELECT 1 FROM "OrderRequestWorkflowEvents" e
                    WHERE e."OrderRequestId" = 168 AND e."Action" = 'ImportedAsApproved');

UPDATE "OrderRequests" SET "Status" = 'Approved', "UpdatedAtUtc" = now() AT TIME ZONE 'UTC'
 WHERE "Id" = 168 AND "Status" = 'Draft';

-- ---- 2 and 3. Xətai parkı and Zabitlər parkı: build the corrected version --------------------------------
-- The new order carries the same location, period, request date and responsible person as the version it
-- corrects, the next version number, and the batch its added rows come from.
INSERT INTO "OrderRequests"
  ("LocationId","RequestPeriod","RequestDate","Status","Version","ResponsiblePersonId","SourceImportBatchId",
   "ConcurrencyStamp","SubmittedByUserId","CreatedAtUtc","UpdatedAtUtc","SubmittedAtUtc","ApprovedAtUtc","ReturnedAtUtc")
SELECT r."LocationId", r."RequestPeriod", r."RequestDate", 'Approved', r."Version" + 1, r."ResponsiblePersonId", 50011,
       gen_random_uuid(), NULL, now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC', NULL, NULL, NULL
  FROM "OrderRequests" r
 WHERE r."Id" IN (165, 166)
   AND NOT EXISTS (SELECT 1 FROM "OrderRequests" x
                    WHERE x."LocationId" = r."LocationId" AND x."RequestPeriod" = r."RequestPeriod"
                      AND x."Version" = r."Version" + 1);

-- Every line of the approved version, copied as it stands. SourceOrderRequestItemId is the link back to the
-- line it reproduces, which is what makes this a correction of that order rather than a second order.
INSERT INTO "OrderRequestItems"
  ("OrderRequestId","ProductVariantId","SupplierId","Quantity","UnitPrice","OriginalProductName","Notes",
   "CreatedAtUtc","SourceOrderRequestItemId","PricingMode","OrderLineType","ResponsiblePersonId")
SELECT v2."Id", i."ProductVariantId", i."SupplierId", i."Quantity", i."UnitPrice", i."OriginalProductName", i."Notes",
       now() AT TIME ZONE 'UTC', i."Id", i."PricingMode", i."OrderLineType", i."ResponsiblePersonId"
  FROM "OrderRequestItems" i
  JOIN "OrderRequests" v1 ON v1."Id" = i."OrderRequestId"
  JOIN "OrderRequests" v2 ON v2."LocationId" = v1."LocationId" AND v2."RequestPeriod" = v1."RequestPeriod"
                         AND v2."Version" = v1."Version" + 1
 WHERE v1."Id" IN (165, 166)
   AND NOT EXISTS (SELECT 1 FROM "OrderRequestItems" c WHERE c."SourceOrderRequestItemId" = i."Id");

-- The rows the workbook adds, taken from the staged import exactly as it read them.
INSERT INTO "OrderRequestItems"
  ("OrderRequestId","ProductVariantId","SupplierId","Quantity","UnitPrice","OriginalProductName","Notes",
   "CreatedAtUtc","SourceOrderRequestItemId","PricingMode","OrderLineType","ResponsiblePersonId")
SELECT v2."Id", ir."MatchedProductVariantId", ir."MatchedSupplierId", ir."ParsedQuantity", ir."ParsedUnitPrice",
       ir."OriginalProductName", NULL, now() AT TIME ZONE 'UTC', NULL, 'PriceRequired',
       CASE ir."OriginalOrderLineType" WHEN 'Aylıq sifariş' THEN 'Monthly' ELSE 'OutsideMonthly' END,
       ir."MatchedResponsiblePersonId"
  FROM "ImportRows" ir
  JOIN "OrderRequests" v2 ON v2."LocationId" = ir."MatchedLocationId" AND v2."RequestPeriod" = ir."ParsedRequestPeriod"
                         AND v2."Version" = 2
 WHERE ir."Id" IN (70601, 70476, 70606, 70607)
   AND NOT EXISTS (SELECT 1 FROM "ImportRowMaterializations" m WHERE m."ImportRowId" = ir."Id");

-- The row each added line came from, so its provenance is the workbook row and not a story about it.
INSERT INTO "ImportRowMaterializations" ("ImportMaterializationId","ImportRowId","OrderRequestItemId","CreatedAtUtc")
SELECT 2, ir."Id", i."Id", now() AT TIME ZONE 'UTC'
  FROM "ImportRows" ir
  JOIN "OrderRequests" v2 ON v2."LocationId" = ir."MatchedLocationId" AND v2."RequestPeriod" = ir."ParsedRequestPeriod"
                         AND v2."Version" = 2
  JOIN "OrderRequestItems" i ON i."OrderRequestId" = v2."Id"
                           AND i."ProductVariantId" = ir."MatchedProductVariantId"
                           AND i."Quantity" = ir."ParsedQuantity"
                           AND i."SourceOrderRequestItemId" IS NULL
 WHERE ir."Id" IN (70601, 70476, 70606, 70607)
   AND NOT EXISTS (SELECT 1 FROM "ImportRowMaterializations" m WHERE m."ImportRowId" = ir."Id");

-- The same event the historical import writes: carried in as already approved, by nobody in this system.
INSERT INTO "OrderRequestWorkflowEvents"
  ("OrderRequestId","Action","FromStatus","ToStatus","ActorUserId","ActorDisplayName",
   "Comment","MissingPriceItemCount","MissingPricesAcknowledged","OccurredAtUtc")
SELECT v2."Id", 'ImportedAsApproved', 'Draft', 'Approved', NULL, 'Sistem',
       'Sahibin yekun Excel-i (Aylıq) tarixi sənəd kimi qəbul edilib; bu versiya onun qüvvədə olan halıdır.',
       (SELECT count(*) FROM "OrderRequestItems" i
         WHERE i."OrderRequestId" = v2."Id" AND i."UnitPrice" IS NULL AND i."PricingMode" <> 'InternalFreeSupply'),
       FALSE, now() AT TIME ZONE 'UTC'
  FROM "OrderRequests" v1
  JOIN "OrderRequests" v2 ON v2."LocationId" = v1."LocationId" AND v2."RequestPeriod" = v1."RequestPeriod"
                         AND v2."Version" = v1."Version" + 1
 WHERE v1."Id" IN (165, 166)
   AND NOT EXISTS (SELECT 1 FROM "OrderRequestWorkflowEvents" e
                    WHERE e."OrderRequestId" = v2."Id" AND e."Action" = 'ImportedAsApproved');

-- ---- verification: the corrected versions differ from the approved ones by the seven rows and nothing else
DO $$
DECLARE r record; expected record;
BEGIN
  FOR r IN
    SELECT l."Name" AS object, v1."Id" AS v1_id, v2."Id" AS v2_id,
           (SELECT count(*) FROM "OrderRequestItems" i WHERE i."OrderRequestId" = v1."Id") AS v1_lines,
           (SELECT count(*) FROM "OrderRequestItems" i WHERE i."OrderRequestId" = v2."Id") AS v2_lines,
           (SELECT round(sum(i."Quantity"*i."UnitPrice"),2) FROM "OrderRequestItems" i WHERE i."OrderRequestId" = v1."Id") AS v1_amount,
           (SELECT round(sum(i."Quantity"*i."UnitPrice"),2) FROM "OrderRequestItems" i WHERE i."OrderRequestId" = v2."Id") AS v2_amount
      FROM "OrderRequests" v1
      JOIN "Locations" l ON l."Id" = v1."LocationId"
      JOIN "OrderRequests" v2 ON v2."LocationId" = v1."LocationId" AND v2."RequestPeriod" = v1."RequestPeriod"
                             AND v2."Version" = 2
     WHERE v1."Id" IN (149, 165, 166)
  LOOP
    RAISE NOTICE '% : v1 #% % lines % AZN -> v2 #% % lines % AZN',
      r.object, r.v1_id, r.v1_lines, r.v1_amount, r.v2_id, r.v2_lines, r.v2_amount;
  END LOOP;

  -- every copied line must be identical to the one it copies
  PERFORM 1 FROM "OrderRequestItems" c JOIN "OrderRequestItems" s ON s."Id" = c."SourceOrderRequestItemId"
   WHERE c."ProductVariantId" <> s."ProductVariantId" OR c."Quantity" <> s."Quantity"
      OR c."UnitPrice" IS DISTINCT FROM s."UnitPrice" OR c."OrderLineType" <> s."OrderLineType"
      OR c."SupplierId" IS DISTINCT FROM s."SupplierId" OR c."ResponsiblePersonId" IS DISTINCT FROM s."ResponsiblePersonId";
  IF FOUND THEN RAISE EXCEPTION 'a copied line differs from the line it copies'; END IF;
END $$;

SELECT l."Name" AS object, r."Id", r."Version", r."Status", count(i."Id") AS lines,
       round(sum(i."Quantity" * i."UnitPrice"), 2) AS amount
  FROM "OrderRequests" r
  JOIN "Locations" l ON l."Id" = r."LocationId"
  LEFT JOIN "OrderRequestItems" i ON i."OrderRequestId" = r."Id"
 WHERE r."LocationId" IN (42, 34, 36) AND r."RequestPeriod" = DATE '2026-09-01'
 GROUP BY 1, 2, 3, 4 ORDER BY 1, 3;

COMMIT;

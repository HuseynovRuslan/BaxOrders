-- BaxOrders - the second pass of the owner's ruling that the Excel is the authority.
-- «Yersil (Plastik) - sən həmişə Excel-i əsas al», owner, 2026-10-09.
--
-- The first pass held fifteen rows back as judgement calls. The owner has now ruled in general terms, so
-- they are applied: the row the owner named, where the catalogue says «Clean strong» and the workbook
-- «Yersil (Plastik)» - a product the catalogue already has, so the line simply joins it; the five rows
-- whose names the workbook writes as «Laqonda nasadkası üçün şkurka», which reverses D-37; the two it
-- writes as «Laqonda nasadkası»; the two where it contradicts the catalogue on a model or a size; and the
-- three where its size cell is blank, so the size is cleared.
--
-- Twenty lines in all: thirteen move to the variant the workbook describes, ten of them onto a different
-- product; one variant's model code loses a double space; one new variant is created. No product is created
-- or renamed. Quantity, price, supplier, object, responsible person and period are untouched, so the line
-- count and the amount cannot move, and the closing guard refuses the transaction if they do.
--
-- What is still not applied, because the workbook does not in fact say one thing:
--   * Two «Yaramilla» rows whose Model/Kod cell holds «2021-11-11 00:00:00» - a model code the spreadsheet
--     formatted as a date. The catalogue's «11 11 21» is that same cell read as a code.
--   * The letter-case differences. Each one is the workbook's minority spelling: it writes «US-418» on six
--     rows and «us-418» on three, «Emaf A300» on forty-one and «EMAF A 300» on one. The variant is shared,
--     so following the minority would break the majority. The guard that found this is in the generator.
--   * Forty-five rows where the workbook names one article two or three ways and the other name is not a
--     product the catalogue has. Honouring those would mean a second catalogue product for the same
--     article - three for one Gardena shower head - which no report could then add up.
--
-- Emptied variants and products are deactivated, never removed. Re-running changes nothing.
\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE before_state ON COMMIT DROP AS
SELECT count(*) AS lines, sum("Quantity" * "UnitPrice") AS known_amount FROM "OrderRequestItems";

-- Every line this run moves, with the variant it is expected to sit on now. The guard below refuses to
-- go on if any line has moved since the plan was made.
CREATE TEMP TABLE want (line bigint, from_variant bigint, dest_product bigint, vkey text) ON COMMIT DROP;
INSERT INTO want VALUES
  (142, 20641, 20698, 'specification=115|specUnit=MM|model=|orderUnit=PCS'),
  (172, 20861, 20697, 'specification=|specUnit=|model=ct13499|orderUnit=PCS'),
  (425, 21699, 20313, 'specification=115|specUnit=MM|model=|orderUnit=PCS'),
  (1286, 20294, 20104, 'specification=55|specUnit=CM|model=|orderUnit=PCS'),
  (1464, 20394, 20313, 'specification=115|specUnit=MM|model=|orderUnit=PCS'),
  (1122, 20285, 20123, 'specification=|specUnit=|model=|orderUnit=PCS'),
  (1988, 21753, 20313, 'specification=115|specUnit=MM|model=|orderUnit=PCS'),
  (2509, 20860, 20097, 'specification=115|specUnit=MM|model=ao60tbf-41alevs|orderUnit=PCS'),
  (3042, 20394, 20313, 'specification=115|specUnit=MM|model=|orderUnit=PCS'),
  (2918, 20442, 20114, 'specification=|specUnit=|model=|orderUnit=PCS'),
  (3318, 20509, 20097, 'specification=230|specUnit=MM|model=ao60tbf-41skom|orderUnit=PCS'),
  (3266, 21699, 20313, 'specification=115|specUnit=MM|model=|orderUnit=PCS'),
  (3659, 20863, 20698, 'specification=115|specUnit=MM|model=|orderUnit=PCS');

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM want w
    JOIN "OrderRequestItems" i ON i."Id" = w.line
   WHERE i."ProductVariantId" <> w.from_variant
     AND NOT EXISTS (SELECT 1 FROM "ProductVariants" v
                      WHERE v."Id" = i."ProductVariantId"
                        AND v."ProductId" = w.dest_product AND v."NormalizedVariantKey" = w.vkey);
  IF n <> 0 THEN RAISE EXCEPTION '% line(s) are neither where the plan left them nor already corrected', n; END IF;
END $$;

-- Variant 21138: same article, same identity - the model code is only spelled differently.
UPDATE "ProductVariants" SET "ModelCode" = '18 V 6.0 Ah W-C', "UpdatedAtUtc" = now() AT TIME ZONE 'UTC'
 WHERE "Id" = 21138 AND "NormalizedVariantKey" = 'specification=|specUnit=|model=18v6.0ahw-c|orderUnit=PCS'
   AND "ModelCode" IS DISTINCT FROM '18 V 6.0 Ah W-C';

-- The variants the workbook's reading needs. Each carries the grade or brand in Model/Kod, which is
-- what keeps it distinct from its siblings on the same product.
INSERT INTO "ProductVariants" ("ProductId","SpecificationValue","SpecificationUnitId",
       "SpecificationDescriptor","ModelCode","OrderUnitId","NormalizedVariantKey","IsActive",
       "CreatedAtUtc","UpdatedAtUtc")
SELECT 20697, NULL, NULL, NULL, 'Ct13499', (SELECT "Id" FROM "UnitsOfMeasure" WHERE "Code" = 'PCS'), 'specification=|specUnit=|model=ct13499|orderUnit=PCS', true,
       now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC'
 WHERE NOT EXISTS (SELECT 1 FROM "ProductVariants"
                    WHERE "ProductId" = 20697 AND "NormalizedVariantKey" = 'specification=|specUnit=|model=ct13499|orderUnit=PCS');

-- What each line used to point at, recorded before it moves. A line that stays on its own product gets
-- the narrower action; the rest say which catalogue product took them over.
INSERT INTO "OrderRequestEditEvents"
  ("OrderRequestId","Action","OrderRequestItemId","ProductVariantId","Field","OldValue","NewValue",
   "ActorUserId","ActorDisplayName","OccurredAtUtc")
SELECT i."OrderRequestId",
       CASE WHEN ov."ProductId" = w.dest_product THEN 'ItemVariantAlignedWithWorkbook'
            ELSE 'ItemMergedIntoCatalogueProduct' END,
       i."Id", i."ProductVariantId", NULL,
       op."Name" || ' - ' || ov."NormalizedVariantKey",
       np."Name" || ' - ' || nv."NormalizedVariantKey",
       'fa7aeed2-288d-4b36-b2f7-d581e465e464', 'Administrator (sahib qərarı: Excel əsasdır, 2026-10-09)', now() AT TIME ZONE 'UTC'
  FROM want w
  JOIN "OrderRequestItems" i ON i."Id" = w.line AND i."ProductVariantId" = w.from_variant
  JOIN "ProductVariants" ov ON ov."Id" = w.from_variant
  JOIN "Products" op ON op."Id" = ov."ProductId"
  JOIN "ProductVariants" nv ON nv."ProductId" = w.dest_product AND nv."NormalizedVariantKey" = w.vkey
  JOIN "Products" np ON np."Id" = nv."ProductId"
 WHERE NOT EXISTS (SELECT 1 FROM "OrderRequestEditEvents" e
                    WHERE e."OrderRequestItemId" = i."Id"
                      AND e."Action" IN ('ItemVariantAlignedWithWorkbook','ItemMergedIntoCatalogueProduct')
                      AND e."NewValue" = np."Name" || ' - ' || nv."NormalizedVariantKey");

UPDATE "OrderRequestItems" i
   SET "ProductVariantId" = nv."Id"
  FROM want w
  JOIN "ProductVariants" nv ON nv."ProductId" = w.dest_product AND nv."NormalizedVariantKey" = w.vkey
 WHERE i."Id" = w.line AND i."ProductVariantId" = w.from_variant;

-- A variant nothing points at any more is retired, not removed; so is a product left with no active
-- variant. Superseded order versions count as lines, so a variant still used by history stays active.
UPDATE "ProductVariants" v SET "IsActive" = false, "UpdatedAtUtc" = now() AT TIME ZONE 'UTC'
 WHERE v."Id" IN (SELECT DISTINCT from_variant FROM want) AND v."IsActive"
   AND NOT EXISTS (SELECT 1 FROM "OrderRequestItems" i WHERE i."ProductVariantId" = v."Id");

UPDATE "Products" p SET "IsActive" = false, "UpdatedAtUtc" = now() AT TIME ZONE 'UTC'
 WHERE p."Id" IN (SELECT DISTINCT ov."ProductId"
                    FROM want w JOIN "ProductVariants" ov ON ov."Id" = w.from_variant)
   AND p."IsActive"
   AND NOT EXISTS (SELECT 1 FROM "ProductVariants" v WHERE v."ProductId" = p."Id" AND v."IsActive");

DO $$
DECLARE n int; was numeric; now_ numeric; was_lines bigint; now_lines bigint;
BEGIN
  SELECT count(*) INTO n FROM want w JOIN "OrderRequestItems" i ON i."Id" = w.line
    JOIN "ProductVariants" v ON v."Id" = i."ProductVariantId"
   WHERE v."ProductId" <> w.dest_product OR v."NormalizedVariantKey" <> w.vkey;
  IF n <> 0 THEN RAISE EXCEPTION '% line(s) did not end up where the workbook puts them', n; END IF;

  SELECT count(*) INTO n FROM "OrderRequestItems" i
    JOIN "ProductVariants" v ON v."Id" = i."ProductVariantId" WHERE NOT v."IsActive";
  IF n <> 0 THEN RAISE EXCEPTION '% line(s) point at a retired variant', n; END IF;

  SELECT lines, known_amount INTO was_lines, was FROM before_state;
  SELECT count(*), sum("Quantity" * "UnitPrice") INTO now_lines, now_ FROM "OrderRequestItems";
  IF was_lines <> now_lines THEN RAISE EXCEPTION 'line count moved: % -> %', was_lines, now_lines; END IF;
  IF was IS DISTINCT FROM now_ THEN RAISE EXCEPTION 'money moved: % -> %', was, now_; END IF;
  RAISE NOTICE 'lines % - money % - both unchanged, as a correction of names must leave them', now_lines, now_;
END $$;

COMMIT;

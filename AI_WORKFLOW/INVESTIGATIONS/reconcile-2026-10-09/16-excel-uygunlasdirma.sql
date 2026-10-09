-- BaxOrders - the catalogue is brought into line with the owner's Excel «Aylıq» sheet.
-- Owner's ruling, 2026-10-09: «Excel-də necədi elə olsun» - where the two disagree, the workbook wins.
--
-- What this does, and why it loses nothing. The workbook is organised better than the catalogue: it keeps
-- the grade or brand of an article («P100», «Staunch», «AO 60TBF-41 Skom») in its own Model/Kod column,
-- while the catalogue had baked it into the product name and left that column empty. Model/Kod is part of
-- the variant identity key, so moving it there keeps every distinction the long names carried - four kinds
-- of «Laqonda daşı almaz» stay four variants - and puts it where the next import will look for it.
--
-- Scope: 75 lines. 29 join a product that already exists in the catalogue under the workbook's name; 41
-- share one variant whose model code is merely spelled differently («EMAF A 300» against «Emaf A300»);
-- 3 belong to «Dırmıq», which the workbook spells «Dırmıq plastik Gardena» on three rows and «Dırmıq
-- Gardena plastik» on one - an earlier correction today took the single spelling, this takes the dominant.
--
-- Out of scope, reported to the owner instead of guessed at: 50 lines where the workbook writes one article
-- two or three ways inside the same sheet and the catalogue already matches the spelling most of its rows
-- use - honouring the minority spellings would put two products in the catalogue for one article; and 15
-- lines where the workbook contradicts itself (a date in a Model/Kod cell, a size blank where the catalogue
-- records a real one, «AO 46SBF-42» against «AO 60TBF-41») or contradicts the owner's own ruling D-37.
--
-- No product is created, none is deleted, and no quantity, price, supplier, object, responsible person or
-- period is touched. Emptied variants and products are deactivated, never removed, so every past screen and
-- every import row still resolves to something real. Re-running changes nothing.
\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE before_state ON COMMIT DROP AS
SELECT count(*) AS lines, sum("Quantity" * "UnitPrice") AS known_amount FROM "OrderRequestItems";

-- Every line this run moves, with the variant it is expected to sit on now. The guard below refuses to
-- go on if any line has moved since the plan was made.
CREATE TEMP TABLE want (line bigint, from_variant bigint, dest_product bigint, vkey text) ON COMMIT DROP;
INSERT INTO want VALUES
  (533, 20507, 20160, 'specification=115|specUnit=MM|model=no611320|orderUnit=PCS'),
  (393, 20922, 20328, 'specification=|specUnit=|model=|orderUnit=PCS'),
  (803, 21702, 20160, 'specification=115|specUnit=MM|model=no611320harden|orderUnit=PCS'),
  (1249, 21754, 20313, 'specification=100|specUnit=MM|model=p100|orderUnit=PCS'),
  (1256, 21750, 20160, 'specification=115|specUnit=MM|model=|orderUnit=PCS'),
  (1547, 20919, 20045, 'specification=50|specUnit=KG|model=|orderUnit=BAG'),
  (1557, 21052, 20313, 'specification=115|specUnit=MM|model=p80|orderUnit=PCS'),
  (1558, 21051, 20313, 'specification=115|specUnit=MM|model=p100|orderUnit=PCS'),
  (1463, 21748, 20160, 'specification=115|specUnit=MM|model=bosch|orderUnit=PCS'),
  (1465, 21050, 20313, 'specification=115|specUnit=MM|model=p220|orderUnit=PCS'),
  (1792, 21713, 20097, 'specification=115|specUnit=MM|model=ao60tbf-41alevs|orderUnit=PCS'),
  (1737, 21712, 20160, 'specification=115|specUnit=MM|model=no611340|orderUnit=PCS'),
  (2026, 20999, 20356, 'specification=1|specUnit=L|model=|orderUnit=PCS'),
  (1658, 21752, 20097, 'specification=230|specUnit=MM|model=|orderUnit=PCS'),
  (2345, 21749, 20097, 'specification=180|specUnit=MM|model=ao60tbf-41alevs|orderUnit=PCS'),
  (2346, 20508, 20160, 'specification=115|specUnit=MM|model=no611320|orderUnit=PCS'),
  (2407, 20867, 20313, 'specification=115|specUnit=MM|model=p80|orderUnit=PCS'),
  (2408, 20866, 20313, 'specification=115|specUnit=MM|model=p120|orderUnit=PCS'),
  (2833, 20040, 20031, 'specification=|specUnit=|model=dn20|orderUnit=PCS'),
  (2862, 20194, 20160, 'specification=115|specUnit=MM|model=staunch|orderUnit=PCS'),
  (2863, 20195, 20097, 'specification=115|specUnit=MM|model=ao60tbf-41skom|orderUnit=PCS'),
  (3317, 20195, 20097, 'specification=115|specUnit=MM|model=ao60tbf-41skom|orderUnit=PCS'),
  (3319, 20194, 20160, 'specification=115|specUnit=MM|model=staunch|orderUnit=PCS'),
  (3250, 20479, 20160, 'specification=115|specUnit=MM|model=staunch|orderUnit=PCS'),
  (3522, 20859, 20160, 'specification=230|specUnit=MM|model=mrtony|orderUnit=PCS'),
  (3523, 20510, 20097, 'specification=230|specUnit=MM|model=ao60tbf-41skom|orderUnit=PCS'),
  (3662, 20195, 20097, 'specification=115|specUnit=MM|model=ao60tbf-41skom|orderUnit=PCS'),
  (3712, 20864, 20313, 'specification=115|specUnit=MM|model=p40|orderUnit=PCS'),
  (3720, 20865, 20313, 'specification=115|specUnit=MM|model=p60|orderUnit=PCS'),
  (3477, 20195, 20097, 'specification=115|specUnit=MM|model=ao60tbf-41skom|orderUnit=PCS'),
  (3478, 20194, 20160, 'specification=115|specUnit=MM|model=staunch|orderUnit=PCS');

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

-- «Dırmıq Gardena plastik» -> «Dırmıq plastik Gardena»: the workbook's dominant spelling for this article.
UPDATE "Products" SET "Name" = 'Dırmıq plastik Gardena', "NormalizedName" = 'dirmiq plastik gardena',
       "UpdatedAtUtc" = now() AT TIME ZONE 'UTC'
 WHERE "Id" = 20003 AND "Name" <> 'Dırmıq plastik Gardena';

-- Variant 20019: same article, same identity - the model code is only spelled differently.
UPDATE "ProductVariants" SET "ModelCode" = 'Emaf A300', "UpdatedAtUtc" = now() AT TIME ZONE 'UTC'
 WHERE "Id" = 20019 AND "NormalizedVariantKey" = 'specification=32|specUnit=G|model=emafa300|orderUnit=PAIR'
   AND "ModelCode" IS DISTINCT FROM 'Emaf A300';

-- The variants the workbook's reading needs. Each carries the grade or brand in Model/Kod, which is
-- what keeps it distinct from its siblings on the same product.
INSERT INTO "ProductVariants" ("ProductId","SpecificationValue","SpecificationUnitId",
       "SpecificationDescriptor","ModelCode","OrderUnitId","NormalizedVariantKey","IsActive",
       "CreatedAtUtc","UpdatedAtUtc")
SELECT 20160, '115', (SELECT "Id" FROM "UnitsOfMeasure" WHERE "Code" = 'MM'), NULL, '№611320', (SELECT "Id" FROM "UnitsOfMeasure" WHERE "Code" = 'PCS'), 'specification=115|specUnit=MM|model=no611320|orderUnit=PCS', true,
       now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC'
 WHERE NOT EXISTS (SELECT 1 FROM "ProductVariants"
                    WHERE "ProductId" = 20160 AND "NormalizedVariantKey" = 'specification=115|specUnit=MM|model=no611320|orderUnit=PCS');
INSERT INTO "ProductVariants" ("ProductId","SpecificationValue","SpecificationUnitId",
       "SpecificationDescriptor","ModelCode","OrderUnitId","NormalizedVariantKey","IsActive",
       "CreatedAtUtc","UpdatedAtUtc")
SELECT 20313, '100', (SELECT "Id" FROM "UnitsOfMeasure" WHERE "Code" = 'MM'), NULL, 'P100', (SELECT "Id" FROM "UnitsOfMeasure" WHERE "Code" = 'PCS'), 'specification=100|specUnit=MM|model=p100|orderUnit=PCS', true,
       now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC'
 WHERE NOT EXISTS (SELECT 1 FROM "ProductVariants"
                    WHERE "ProductId" = 20313 AND "NormalizedVariantKey" = 'specification=100|specUnit=MM|model=p100|orderUnit=PCS');
INSERT INTO "ProductVariants" ("ProductId","SpecificationValue","SpecificationUnitId",
       "SpecificationDescriptor","ModelCode","OrderUnitId","NormalizedVariantKey","IsActive",
       "CreatedAtUtc","UpdatedAtUtc")
SELECT 20313, '115', (SELECT "Id" FROM "UnitsOfMeasure" WHERE "Code" = 'MM'), NULL, 'P80', (SELECT "Id" FROM "UnitsOfMeasure" WHERE "Code" = 'PCS'), 'specification=115|specUnit=MM|model=p80|orderUnit=PCS', true,
       now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC'
 WHERE NOT EXISTS (SELECT 1 FROM "ProductVariants"
                    WHERE "ProductId" = 20313 AND "NormalizedVariantKey" = 'specification=115|specUnit=MM|model=p80|orderUnit=PCS');
INSERT INTO "ProductVariants" ("ProductId","SpecificationValue","SpecificationUnitId",
       "SpecificationDescriptor","ModelCode","OrderUnitId","NormalizedVariantKey","IsActive",
       "CreatedAtUtc","UpdatedAtUtc")
SELECT 20313, '115', (SELECT "Id" FROM "UnitsOfMeasure" WHERE "Code" = 'MM'), NULL, 'P100', (SELECT "Id" FROM "UnitsOfMeasure" WHERE "Code" = 'PCS'), 'specification=115|specUnit=MM|model=p100|orderUnit=PCS', true,
       now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC'
 WHERE NOT EXISTS (SELECT 1 FROM "ProductVariants"
                    WHERE "ProductId" = 20313 AND "NormalizedVariantKey" = 'specification=115|specUnit=MM|model=p100|orderUnit=PCS');
INSERT INTO "ProductVariants" ("ProductId","SpecificationValue","SpecificationUnitId",
       "SpecificationDescriptor","ModelCode","OrderUnitId","NormalizedVariantKey","IsActive",
       "CreatedAtUtc","UpdatedAtUtc")
SELECT 20160, '115', (SELECT "Id" FROM "UnitsOfMeasure" WHERE "Code" = 'MM'), NULL, 'BOSCH', (SELECT "Id" FROM "UnitsOfMeasure" WHERE "Code" = 'PCS'), 'specification=115|specUnit=MM|model=bosch|orderUnit=PCS', true,
       now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC'
 WHERE NOT EXISTS (SELECT 1 FROM "ProductVariants"
                    WHERE "ProductId" = 20160 AND "NormalizedVariantKey" = 'specification=115|specUnit=MM|model=bosch|orderUnit=PCS');
INSERT INTO "ProductVariants" ("ProductId","SpecificationValue","SpecificationUnitId",
       "SpecificationDescriptor","ModelCode","OrderUnitId","NormalizedVariantKey","IsActive",
       "CreatedAtUtc","UpdatedAtUtc")
SELECT 20313, '115', (SELECT "Id" FROM "UnitsOfMeasure" WHERE "Code" = 'MM'), NULL, 'P220', (SELECT "Id" FROM "UnitsOfMeasure" WHERE "Code" = 'PCS'), 'specification=115|specUnit=MM|model=p220|orderUnit=PCS', true,
       now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC'
 WHERE NOT EXISTS (SELECT 1 FROM "ProductVariants"
                    WHERE "ProductId" = 20313 AND "NormalizedVariantKey" = 'specification=115|specUnit=MM|model=p220|orderUnit=PCS');
INSERT INTO "ProductVariants" ("ProductId","SpecificationValue","SpecificationUnitId",
       "SpecificationDescriptor","ModelCode","OrderUnitId","NormalizedVariantKey","IsActive",
       "CreatedAtUtc","UpdatedAtUtc")
SELECT 20097, '115', (SELECT "Id" FROM "UnitsOfMeasure" WHERE "Code" = 'MM'), NULL, 'AO 60TBF-41 Alevs', (SELECT "Id" FROM "UnitsOfMeasure" WHERE "Code" = 'PCS'), 'specification=115|specUnit=MM|model=ao60tbf-41alevs|orderUnit=PCS', true,
       now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC'
 WHERE NOT EXISTS (SELECT 1 FROM "ProductVariants"
                    WHERE "ProductId" = 20097 AND "NormalizedVariantKey" = 'specification=115|specUnit=MM|model=ao60tbf-41alevs|orderUnit=PCS');
INSERT INTO "ProductVariants" ("ProductId","SpecificationValue","SpecificationUnitId",
       "SpecificationDescriptor","ModelCode","OrderUnitId","NormalizedVariantKey","IsActive",
       "CreatedAtUtc","UpdatedAtUtc")
SELECT 20160, '115', (SELECT "Id" FROM "UnitsOfMeasure" WHERE "Code" = 'MM'), NULL, '№611340', (SELECT "Id" FROM "UnitsOfMeasure" WHERE "Code" = 'PCS'), 'specification=115|specUnit=MM|model=no611340|orderUnit=PCS', true,
       now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC'
 WHERE NOT EXISTS (SELECT 1 FROM "ProductVariants"
                    WHERE "ProductId" = 20160 AND "NormalizedVariantKey" = 'specification=115|specUnit=MM|model=no611340|orderUnit=PCS');
INSERT INTO "ProductVariants" ("ProductId","SpecificationValue","SpecificationUnitId",
       "SpecificationDescriptor","ModelCode","OrderUnitId","NormalizedVariantKey","IsActive",
       "CreatedAtUtc","UpdatedAtUtc")
SELECT 20097, '230', (SELECT "Id" FROM "UnitsOfMeasure" WHERE "Code" = 'MM'), NULL, NULL, (SELECT "Id" FROM "UnitsOfMeasure" WHERE "Code" = 'PCS'), 'specification=230|specUnit=MM|model=|orderUnit=PCS', true,
       now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC'
 WHERE NOT EXISTS (SELECT 1 FROM "ProductVariants"
                    WHERE "ProductId" = 20097 AND "NormalizedVariantKey" = 'specification=230|specUnit=MM|model=|orderUnit=PCS');
INSERT INTO "ProductVariants" ("ProductId","SpecificationValue","SpecificationUnitId",
       "SpecificationDescriptor","ModelCode","OrderUnitId","NormalizedVariantKey","IsActive",
       "CreatedAtUtc","UpdatedAtUtc")
SELECT 20097, '180', (SELECT "Id" FROM "UnitsOfMeasure" WHERE "Code" = 'MM'), NULL, 'AO 60TBF-41 Alevs', (SELECT "Id" FROM "UnitsOfMeasure" WHERE "Code" = 'PCS'), 'specification=180|specUnit=MM|model=ao60tbf-41alevs|orderUnit=PCS', true,
       now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC'
 WHERE NOT EXISTS (SELECT 1 FROM "ProductVariants"
                    WHERE "ProductId" = 20097 AND "NormalizedVariantKey" = 'specification=180|specUnit=MM|model=ao60tbf-41alevs|orderUnit=PCS');
INSERT INTO "ProductVariants" ("ProductId","SpecificationValue","SpecificationUnitId",
       "SpecificationDescriptor","ModelCode","OrderUnitId","NormalizedVariantKey","IsActive",
       "CreatedAtUtc","UpdatedAtUtc")
SELECT 20313, '115', (SELECT "Id" FROM "UnitsOfMeasure" WHERE "Code" = 'MM'), NULL, 'P120', (SELECT "Id" FROM "UnitsOfMeasure" WHERE "Code" = 'PCS'), 'specification=115|specUnit=MM|model=p120|orderUnit=PCS', true,
       now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC'
 WHERE NOT EXISTS (SELECT 1 FROM "ProductVariants"
                    WHERE "ProductId" = 20313 AND "NormalizedVariantKey" = 'specification=115|specUnit=MM|model=p120|orderUnit=PCS');
INSERT INTO "ProductVariants" ("ProductId","SpecificationValue","SpecificationUnitId",
       "SpecificationDescriptor","ModelCode","OrderUnitId","NormalizedVariantKey","IsActive",
       "CreatedAtUtc","UpdatedAtUtc")
SELECT 20031, NULL, NULL, NULL, 'dN20', (SELECT "Id" FROM "UnitsOfMeasure" WHERE "Code" = 'PCS'), 'specification=|specUnit=|model=dn20|orderUnit=PCS', true,
       now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC'
 WHERE NOT EXISTS (SELECT 1 FROM "ProductVariants"
                    WHERE "ProductId" = 20031 AND "NormalizedVariantKey" = 'specification=|specUnit=|model=dn20|orderUnit=PCS');
INSERT INTO "ProductVariants" ("ProductId","SpecificationValue","SpecificationUnitId",
       "SpecificationDescriptor","ModelCode","OrderUnitId","NormalizedVariantKey","IsActive",
       "CreatedAtUtc","UpdatedAtUtc")
SELECT 20160, '115', (SELECT "Id" FROM "UnitsOfMeasure" WHERE "Code" = 'MM'), NULL, 'Staunch', (SELECT "Id" FROM "UnitsOfMeasure" WHERE "Code" = 'PCS'), 'specification=115|specUnit=MM|model=staunch|orderUnit=PCS', true,
       now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC'
 WHERE NOT EXISTS (SELECT 1 FROM "ProductVariants"
                    WHERE "ProductId" = 20160 AND "NormalizedVariantKey" = 'specification=115|specUnit=MM|model=staunch|orderUnit=PCS');
INSERT INTO "ProductVariants" ("ProductId","SpecificationValue","SpecificationUnitId",
       "SpecificationDescriptor","ModelCode","OrderUnitId","NormalizedVariantKey","IsActive",
       "CreatedAtUtc","UpdatedAtUtc")
SELECT 20097, '115', (SELECT "Id" FROM "UnitsOfMeasure" WHERE "Code" = 'MM'), NULL, 'AO 60TBF-41 Skom', (SELECT "Id" FROM "UnitsOfMeasure" WHERE "Code" = 'PCS'), 'specification=115|specUnit=MM|model=ao60tbf-41skom|orderUnit=PCS', true,
       now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC'
 WHERE NOT EXISTS (SELECT 1 FROM "ProductVariants"
                    WHERE "ProductId" = 20097 AND "NormalizedVariantKey" = 'specification=115|specUnit=MM|model=ao60tbf-41skom|orderUnit=PCS');
INSERT INTO "ProductVariants" ("ProductId","SpecificationValue","SpecificationUnitId",
       "SpecificationDescriptor","ModelCode","OrderUnitId","NormalizedVariantKey","IsActive",
       "CreatedAtUtc","UpdatedAtUtc")
SELECT 20160, '230', (SELECT "Id" FROM "UnitsOfMeasure" WHERE "Code" = 'MM'), NULL, 'Mrtony', (SELECT "Id" FROM "UnitsOfMeasure" WHERE "Code" = 'PCS'), 'specification=230|specUnit=MM|model=mrtony|orderUnit=PCS', true,
       now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC'
 WHERE NOT EXISTS (SELECT 1 FROM "ProductVariants"
                    WHERE "ProductId" = 20160 AND "NormalizedVariantKey" = 'specification=230|specUnit=MM|model=mrtony|orderUnit=PCS');
INSERT INTO "ProductVariants" ("ProductId","SpecificationValue","SpecificationUnitId",
       "SpecificationDescriptor","ModelCode","OrderUnitId","NormalizedVariantKey","IsActive",
       "CreatedAtUtc","UpdatedAtUtc")
SELECT 20097, '230', (SELECT "Id" FROM "UnitsOfMeasure" WHERE "Code" = 'MM'), NULL, 'AO 60TBF-41 Skom', (SELECT "Id" FROM "UnitsOfMeasure" WHERE "Code" = 'PCS'), 'specification=230|specUnit=MM|model=ao60tbf-41skom|orderUnit=PCS', true,
       now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC'
 WHERE NOT EXISTS (SELECT 1 FROM "ProductVariants"
                    WHERE "ProductId" = 20097 AND "NormalizedVariantKey" = 'specification=230|specUnit=MM|model=ao60tbf-41skom|orderUnit=PCS');
INSERT INTO "ProductVariants" ("ProductId","SpecificationValue","SpecificationUnitId",
       "SpecificationDescriptor","ModelCode","OrderUnitId","NormalizedVariantKey","IsActive",
       "CreatedAtUtc","UpdatedAtUtc")
SELECT 20313, '115', (SELECT "Id" FROM "UnitsOfMeasure" WHERE "Code" = 'MM'), NULL, 'P40', (SELECT "Id" FROM "UnitsOfMeasure" WHERE "Code" = 'PCS'), 'specification=115|specUnit=MM|model=p40|orderUnit=PCS', true,
       now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC'
 WHERE NOT EXISTS (SELECT 1 FROM "ProductVariants"
                    WHERE "ProductId" = 20313 AND "NormalizedVariantKey" = 'specification=115|specUnit=MM|model=p40|orderUnit=PCS');
INSERT INTO "ProductVariants" ("ProductId","SpecificationValue","SpecificationUnitId",
       "SpecificationDescriptor","ModelCode","OrderUnitId","NormalizedVariantKey","IsActive",
       "CreatedAtUtc","UpdatedAtUtc")
SELECT 20313, '115', (SELECT "Id" FROM "UnitsOfMeasure" WHERE "Code" = 'MM'), NULL, 'P60', (SELECT "Id" FROM "UnitsOfMeasure" WHERE "Code" = 'PCS'), 'specification=115|specUnit=MM|model=p60|orderUnit=PCS', true,
       now() AT TIME ZONE 'UTC', now() AT TIME ZONE 'UTC'
 WHERE NOT EXISTS (SELECT 1 FROM "ProductVariants"
                    WHERE "ProductId" = 20313 AND "NormalizedVariantKey" = 'specification=115|specUnit=MM|model=p60|orderUnit=PCS');

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

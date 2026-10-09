-- BaxOrders — two products the catalogue holds twice are merged under the workbook's name. Owner, 2026-10-09.
--
--   «Cod şotka» (20011, 11 lines) → «Cod fırça» (20123, 6 lines)
--
-- The other pair the owner approved — «Şkurka üçün nasatka laqondaya» into «Laqonda nasadkası üçün şkurka» —
-- is NOT done here. The guard below found their variants are not the same after all (115 MM against a
-- «115 lik» descriptor), and reading the two names again they may not be the same article at all: one is the
-- pad that goes on the grinder, the other the sanding paper that goes on the pad. Merging those would lose a
-- real distinction, so it waits for the owner.
--
-- These are not renames: both target names already exist, with their own lines. The catalogue recorded one
-- product twice under two spellings, and the owner has ruled that the workbook's spelling is the real one.
--
-- A variant that already exists on the surviving product takes the lines of its duplicate; a variant with no
-- counterpart moves across whole, keeping its own identity (Cod şotka's «18 CM» has no twin on Cod fırça).
-- Nothing is deleted: the emptied variants and the superseded products are deactivated, so every past screen
-- and every import row still resolves to something real.
\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE before_state ON COMMIT DROP AS
SELECT count(*) AS lines, sum("Quantity" * "UnitPrice") AS known_amount FROM "OrderRequestItems";

-- The duplicate pairs, named once so the guards and the moves cannot drift apart.
CREATE TEMP TABLE pair (from_variant bigint, to_variant bigint) ON COMMIT DROP;
-- Only the Cod pair: the Şkurka pair is held back, see the note at the foot of this file.
INSERT INTO pair VALUES (20012, 20127);

DO $$
DECLARE n int;
BEGIN
  -- Each pair must really be the same thing: same product-level key, so the merge loses no distinction.
  SELECT count(*) INTO n
    FROM pair p
    JOIN "ProductVariants" a ON a."Id" = p.from_variant
    JOIN "ProductVariants" b ON b."Id" = p.to_variant
   WHERE a."NormalizedVariantKey" IS DISTINCT FROM b."NormalizedVariantKey";
  IF n <> 0 THEN RAISE EXCEPTION '% pair(s) are not the same variant after all', n; END IF;
END $$;

-- What each moved line used to point at, recorded before it moves.
INSERT INTO "OrderRequestEditEvents"
  ("OrderRequestId","Action","OrderRequestItemId","ProductVariantId","Field","OldValue","NewValue",
   "ActorUserId","ActorDisplayName","OccurredAtUtc")
SELECT i."OrderRequestId", 'ItemMergedIntoCatalogueProduct', i."Id", i."ProductVariantId", NULL,
       old_p."Name" || ' (variant ' || p.from_variant || ')',
       new_p."Name" || ' (variant ' || p.to_variant || ')',
       'fa7aeed2-288d-4b36-b2f7-d581e465e464', 'Administrator (sahib qərarı, 2026-10-09)', now() AT TIME ZONE 'UTC'
  FROM pair p
  JOIN "OrderRequestItems" i ON i."ProductVariantId" = p.from_variant
  JOIN "ProductVariants" ov ON ov."Id" = p.from_variant JOIN "Products" old_p ON old_p."Id" = ov."ProductId"
  JOIN "ProductVariants" nv ON nv."Id" = p.to_variant   JOIN "Products" new_p ON new_p."Id" = nv."ProductId"
 WHERE NOT EXISTS (SELECT 1 FROM "OrderRequestEditEvents" e
                    WHERE e."OrderRequestItemId" = i."Id" AND e."Action" = 'ItemMergedIntoCatalogueProduct');

UPDATE "OrderRequestItems" i
   SET "ProductVariantId" = p.to_variant
  FROM pair p WHERE i."ProductVariantId" = p.from_variant;

-- «Cod şotka · 18 CM» has no counterpart, so it keeps its identity and simply belongs to the surviving product.
UPDATE "ProductVariants" SET "ProductId" = 20123, "UpdatedAtUtc" = now() AT TIME ZONE 'UTC'
 WHERE "Id" = 20285 AND "ProductId" = 20011;

-- Emptied duplicates and superseded products are retired, never removed.
UPDATE "ProductVariants" SET "IsActive" = false, "UpdatedAtUtc" = now() AT TIME ZONE 'UTC'
 WHERE "Id" IN (SELECT from_variant FROM pair) AND "IsActive";

UPDATE "Products" SET "IsActive" = false, "UpdatedAtUtc" = now() AT TIME ZONE 'UTC'
 WHERE "Id" = 20011 AND "IsActive";

DO $$
DECLARE n int; was numeric; now_ numeric; was_lines bigint; now_lines bigint;
BEGIN
  SELECT count(*) INTO n FROM "OrderRequestItems" i JOIN pair p ON p.from_variant = i."ProductVariantId";
  IF n <> 0 THEN RAISE EXCEPTION '% lines still point at a retired variant', n; END IF;

  SELECT count(*) INTO n FROM "ProductVariants" WHERE "ProductId" = 20011 AND "IsActive";
  IF n <> 0 THEN RAISE EXCEPTION 'a retired product still has an active variant'; END IF;

  SELECT lines, known_amount INTO was_lines, was FROM before_state;
  SELECT count(*), sum("Quantity" * "UnitPrice") INTO now_lines, now_ FROM "OrderRequestItems";
  IF was_lines <> now_lines THEN RAISE EXCEPTION 'line count moved: % -> %', was_lines, now_lines; END IF;
  IF was IS DISTINCT FROM now_ THEN RAISE EXCEPTION 'money moved: % -> %', was, now_; END IF;
  RAISE NOTICE 'lines % · money % — both unchanged, as a rename of identity must leave them', now_lines, now_;
END $$;

SELECT p."Id", p."Name", p."IsActive",
       (SELECT count(*) FROM "ProductVariants" v WHERE v."ProductId" = p."Id" AND v."IsActive") AS active_variants,
       (SELECT count(*) FROM "OrderRequestItems" i JOIN "ProductVariants" v ON v."Id" = i."ProductVariantId"
         WHERE v."ProductId" = p."Id") AS lines
  FROM "Products" p WHERE p."Id" IN (20011, 20123) ORDER BY p."Id";

COMMIT;

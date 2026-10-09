-- BaxOrders — «Dırmıq plastik Gardena» → «Dırmıq Gardena plastik». Owner, 2026-10-09.
--
-- The owner ruled that where the workbook and the catalogue say the same thing in different words, the
-- workbook's wording wins. This one is only word order: the same three words, no brand, size or model lost,
-- and no other product in the catalogue carries the new name, so nothing is merged by doing it.
--
-- The product keeps its Id, its variants and every line that points at them. Only the name changes.
\set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM "Products" WHERE "Id" = 20003 AND "Name" = 'Dırmıq plastik Gardena';
  IF n <> 1 AND NOT EXISTS (SELECT 1 FROM "Products" WHERE "Id" = 20003 AND "Name" = 'Dırmıq Gardena plastik') THEN
    RAISE EXCEPTION 'product 20003 is not the one this was written for';
  END IF;
  -- Refuse if the new name would collide with another product.
  SELECT count(*) INTO n FROM "Products" WHERE "Name" = 'Dırmıq Gardena plastik' AND "Id" <> 20003;
  IF n <> 0 THEN RAISE EXCEPTION 'another product already carries the new name'; END IF;
END $$;

UPDATE "Products"
   SET "Name" = 'Dırmıq Gardena plastik',
       "NormalizedName" = 'dırmıq gardena plastik',
       "UpdatedAtUtc" = now() AT TIME ZONE 'UTC'
 WHERE "Id" = 20003 AND "Name" = 'Dırmıq plastik Gardena';

SELECT "Id", "Name", "NormalizedName",
       (SELECT count(*) FROM "ProductVariants" pv WHERE pv."ProductId" = 20003) AS variants,
       (SELECT count(*) FROM "OrderRequestItems" i JOIN "ProductVariants" pv ON pv."Id" = i."ProductVariantId"
         WHERE pv."ProductId" = 20003) AS lines
  FROM "Products" WHERE "Id" = 20003;

COMMIT;

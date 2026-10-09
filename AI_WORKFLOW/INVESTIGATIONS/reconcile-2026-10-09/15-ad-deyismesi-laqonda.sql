-- BaxOrders — «Laqonda daşı dəmir üçün» → «Laqonda daşı metal üçün». Owner, 2026-10-09.
--
-- This supersedes D-19 for this one product. D-19 ruled that the six historical Laqonda products stay
-- untouched; the owner has now named this one and said to change it. The four siblings that carry a model
-- code — «… Alevs», «… AO 46SBF-42 Alevs», «… AO 60TBF-41 Alevs», «… AO 60TBF-41 Skom» — were not named and
-- keep D-19's protection, so they are not touched here.
--
-- A rename, not a merge: no other product carries the new name, which the guard below insists on. The product
-- keeps its Id, both its variants and all seven lines.
\set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM "Products"
   WHERE "Id" = 20097 AND "Name" IN ('Laqonda daşı dəmir üçün', 'Laqonda daşı metal üçün');
  IF n <> 1 THEN RAISE EXCEPTION 'product 20097 is not the one this was written for'; END IF;

  SELECT count(*) INTO n FROM "Products" WHERE "Name" = 'Laqonda daşı metal üçün' AND "Id" <> 20097;
  IF n <> 0 THEN
    RAISE EXCEPTION 'another product already carries that name — this would be a merge, not a rename';
  END IF;
END $$;

UPDATE "Products"
   SET "Name" = 'Laqonda daşı metal üçün',
       "NormalizedName" = 'laqonda daşi metal üçün',
       "UpdatedAtUtc" = now() AT TIME ZONE 'UTC'
 WHERE "Id" = 20097 AND "Name" = 'Laqonda daşı dəmir üçün';

SELECT p."Id", p."Name", p."IsActive",
       (SELECT count(*) FROM "ProductVariants" v WHERE v."ProductId" = p."Id") AS variants,
       (SELECT count(*) FROM "OrderRequestItems" i JOIN "ProductVariants" v ON v."Id" = i."ProductVariantId"
         WHERE v."ProductId" = p."Id") AS lines
  FROM "Products" p
 WHERE p."Name" ILIKE 'Laqonda daşı %' ORDER BY p."Name";

COMMIT;

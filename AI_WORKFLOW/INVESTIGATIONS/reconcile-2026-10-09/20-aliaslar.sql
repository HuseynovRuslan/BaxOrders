-- BaxOrders - the aliases that keep today's catalogue decisions working for the next import.
--
-- Twenty-three products were retired today because the workbook names their articles differently and the
-- owner ruled, three times, that the workbook wins. Their names still stand in older workbooks and in
-- whatever the objects send next month, and the import no longer recognises any of them - the catalogue
-- loader reads only aliases whose product is active, so it would raise every one as an unknown product and
-- ask a question the owner has already answered. An alias is that answer, recorded where the import looks.
--
-- Only a retired product gets one. «Clean strong» still has 32 lines of its own, so no alias is written for
-- it although one of its lines moved: a future «Clean strong» row means «Clean strong». The same holds for
-- «Laqonda nasadkası üçün şkurka P40 göy» and the others still carrying lines of a superseded version.
--
-- One alias is repointed rather than added: «Şotka cod» was written on 2026-09-22 against «Cod şotka», which
-- today became «Cod fırça». It points at the surviving product now.
--
-- Nothing is deleted and no order line is touched. Re-running changes nothing.
\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE want (old_name text, normalized text, new_name text, new_id bigint) ON COMMIT DROP;
INSERT INTO want VALUES
  ('Balaca laqonda daşı şirfofka başlığı', 'balaca laqonda daşi şirfofka başliği', 'Laqonda nasadkası', 20698),
  ('Cod şotka', 'cod şotka', 'Cod fırça', 20123),
  ('Laqonda daşı almaz (daş üçün)BOSCH', 'laqonda daşi almaz(daş üçün)bosch', 'Laqonda daşı almaz', 20160),
  ('Laqonda daşı almaz Harden', 'laqonda daşi almaz harden', 'Laqonda daşı almaz', 20160),
  ('Laqonda daşı almaz Mrtony', 'laqonda daşi almaz mrtony', 'Laqonda daşı almaz', 20160),
  ('Laqonda daşı almaz Staunch', 'laqonda daşi almaz staunch', 'Laqonda daşı almaz', 20160),
  ('Laqonda daşı dəmir üçün AO 46SBF-42 Alevs', 'laqonda daşi dəmir üçün ao 46sbf-42 alevs', 'Laqonda daşı metal üçün', 20097),
  ('Laqonda daşı dəmir üçün AO 60TBF-41 Alevs', 'laqonda daşi dəmir üçün ao 60tbf-41 alevs', 'Laqonda daşı metal üçün', 20097),
  ('Laqonda daşı dəmir üçün Alevs', 'laqonda daşi dəmir üçün alevs', 'Laqonda daşı metal üçün', 20097),
  ('Laqonda daşı lik almaz', 'laqonda daşi lik almaz', 'Laqonda daşı almaz', 20160),
  ('Laqonda metal kəsmək üçün daş', 'laqonda metal kəsmək üçün daş', 'Laqonda daşı metal üçün', 20097),
  ('Laqonda nasadkası üçün şkurka P100', 'laqonda nasadkasi üçün şkurka p100', 'Laqonda nasadkası üçün şkurka', 20313),
  ('Laqonda nasadkası şkurka üçün', 'laqonda nasadkasi şkurka üçün', 'Laqonda nasadkası üçün şkurka', 20313),
  ('Laqonda üçün şkurka P120 50 ədədli göy taxta üçün', 'laqonda üçün şkurka p120 50 ədədli göy taxta üçün', 'Laqonda nasadkası üçün şkurka', 20313),
  ('Laqonda üçün şkurka P80 50 ədədli göy taxta üçün', 'laqonda üçün şkurka p80 50 ədədli göy taxta üçün', 'Laqonda nasadkası üçün şkurka', 20313),
  ('Nitroamafoska', 'nitroamafoska', 'Nitroamafoska 16+16+16', 20045),
  ('Oleander', 'oleander', 'Nerium oleander', 20328),
  ('Qumat', 'qumat', 'Qumat kaliya', 20356),
  ('Şkurka P 220 115 lik laqonda üçün qara (daş üçün)', 'şkurka p 220 115 lik laqonda üçün qara(daş üçün)', 'Laqonda nasadkası üçün şkurka', 20313),
  ('Şkurka taxta üçün laqonda P100', 'şkurka taxta üçün laqonda p100', 'Laqonda nasadkası üçün şkurka', 20313),
  ('Şkurka taxta üçün laqonda P80', 'şkurka taxta üçün laqonda p80', 'Laqonda nasadkası üçün şkurka', 20313),
  ('Şkurka üçün nasatka 115-lik laqondaya', 'şkurka üçün nasatka 115-lik laqondaya', 'Laqonda nasadkası üçün şkurka', 20313),
  ('Şkurka üçün nasatka laqondaya', 'şkurka üçün nasatka laqondaya', 'Laqonda nasadkası üçün şkurka', 20313);

DO $$
DECLARE n int;
BEGIN
  -- Each target must still be the active product the plan named.
  SELECT count(*) INTO n FROM want w
   WHERE NOT EXISTS (SELECT 1 FROM "Products" p
                      WHERE p."Id" = w.new_id AND p."Name" = w.new_name AND p."IsActive");
  IF n <> 0 THEN RAISE EXCEPTION '% target product(s) are not the active product named', n; END IF;

  -- An alias must never collide with a living product's own name, or the import would see two candidates.
  SELECT count(*) INTO n FROM want w
    JOIN "Products" p ON p."NormalizedName" = w.normalized AND p."IsActive";
  IF n <> 0 THEN RAISE EXCEPTION '% alias(es) would collide with an active product name', n; END IF;

  -- And it must not already point somewhere else.
  SELECT count(*) INTO n FROM want w
    JOIN "ProductAliases" a ON a."NormalizedAlias" = w.normalized AND a."ProductId" <> w.new_id;
  IF n <> 0 THEN RAISE EXCEPTION '% alias(es) already point at another product', n; END IF;
END $$;

-- «Şotka cod» was written against «Cod şotka», which is now «Cod fırça».
UPDATE "ProductAliases" a
   SET "ProductId" = (SELECT "Id" FROM "Products" WHERE "Name" = 'Cod fırça' AND "IsActive")
 WHERE a."NormalizedAlias" = 'şotka cod'
   AND EXISTS (SELECT 1 FROM "Products" p WHERE p."Id" = a."ProductId" AND NOT p."IsActive");

INSERT INTO "ProductAliases" ("ProductId","Alias","NormalizedAlias","CreatedAtUtc")
SELECT w.new_id, w.old_name, w.normalized, now() AT TIME ZONE 'UTC'
  FROM want w
 WHERE NOT EXISTS (SELECT 1 FROM "ProductAliases" a WHERE a."NormalizedAlias" = w.normalized);

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM want w
   WHERE NOT EXISTS (SELECT 1 FROM "ProductAliases" a
                      WHERE a."NormalizedAlias" = w.normalized AND a."ProductId" = w.new_id);
  IF n <> 0 THEN RAISE EXCEPTION '% alias(es) did not end up pointing where the plan says', n; END IF;

  SELECT count(*) INTO n FROM "ProductAliases" a
    JOIN "Products" p ON p."Id" = a."ProductId" WHERE NOT p."IsActive";
  IF n <> 0 THEN RAISE EXCEPTION '% alias(es) still point at a retired product', n; END IF;

  RAISE NOTICE 'aliases now: %', (SELECT count(*) FROM "ProductAliases");
END $$;

SELECT a."Alias" AS kohne_ad, p."Name" AS indi_hansi_mehsul
  FROM "ProductAliases" a JOIN "Products" p ON p."Id" = a."ProductId"
 ORDER BY p."Name", a."Alias";

COMMIT;

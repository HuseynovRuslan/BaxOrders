-- BaxOrders — the 27 «Qala Baza» lines are internal supply, not purchases. Owner, 2026-10-09.
--
-- The final workbook leaves the price cell empty on exactly these 27 rows and on no others, and every one of
-- them names «Qala Baza», the company's own store. The owner confirms what that means: the goods came out of
-- the warehouse, so there is no price to record.
--
-- «No price» and «internal supply» are different facts here, and only the second is true: PriceRequired with
-- an empty price would make the screens say a price is still owed on them. So the lines move to
-- InternalFreeSupply and their price is cleared, which is what the workbook says.
--
-- Only the effective version of each order is touched; superseded versions keep their record as reviewed.
-- Every statement asserts what it replaces, so a second run writes nothing.
\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE before_state ON COMMIT DROP AS
SELECT count(*) AS lines, sum("Quantity" * "UnitPrice") AS known_amount FROM "OrderRequestItems";

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM "OrderRequestItems" i
    JOIN "Suppliers" s ON s."Id" = i."SupplierId"
   WHERE i."Id" IN (30, 218, 1286, 1718, 1719, 1720, 1721, 1722, 1723, 1782, 1783, 1785, 1786, 1787, 1841, 1842, 1843, 1844, 1845, 1846, 1847, 1979, 1980, 2049, 2050, 2092, 2093) AND s."NormalizedName" = 'qala baza';
  IF n <> 27 THEN RAISE EXCEPTION 'expected 27 Qala baza lines, found %', n; END IF;
END $$;

INSERT INTO "OrderItemPricingDecisions"
  ("OrderRequestItemId","PreviousMode","NewMode","ActorUserId","ActorDisplayName","Reason","OccurredAtUtc")
SELECT i."Id", i."PricingMode", 'InternalFreeSupply',
       'fa7aeed2-288d-4b36-b2f7-d581e465e464', 'Administrator (sahib qərarı, 2026-10-09)',
       'Yekun Excel-də bu sətirlərin qiymət xanası boşdur və hamısı «Qala Baza»dır: daxili tədarükdür, alış deyil.',
       now() AT TIME ZONE 'UTC'
  FROM "OrderRequestItems" i
 WHERE i."Id" IN (30, 218, 1286, 1718, 1719, 1720, 1721, 1722, 1723, 1782, 1783, 1785, 1786, 1787, 1841, 1842, 1843, 1844, 1845, 1846, 1847, 1979, 1980, 2049, 2050, 2092, 2093) AND i."PricingMode" <> 'InternalFreeSupply'
   AND NOT EXISTS (SELECT 1 FROM "OrderItemPricingDecisions" d
                    WHERE d."OrderRequestItemId" = i."Id" AND d."NewMode" = 'InternalFreeSupply');

INSERT INTO "OrderRequestEditEvents"
  ("OrderRequestId","Action","OrderRequestItemId","ProductVariantId","Field","OldValue","NewValue",
   "ActorUserId","ActorDisplayName","OccurredAtUtc")
SELECT i."OrderRequestId", 'ItemPriceChanged', i."Id", i."ProductVariantId", 'UnitPrice',
       i."UnitPrice"::text, NULL, 'fa7aeed2-288d-4b36-b2f7-d581e465e464',
       'Administrator (sahib qərarı, 2026-10-09)', now() AT TIME ZONE 'UTC'
  FROM "OrderRequestItems" i
 WHERE i."Id" IN (30, 218, 1286, 1718, 1719, 1720, 1721, 1722, 1723, 1782, 1783, 1785, 1786, 1787, 1841, 1842, 1843, 1844, 1845, 1846, 1847, 1979, 1980, 2049, 2050, 2092, 2093) AND i."UnitPrice" IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM "OrderRequestEditEvents" e
                    WHERE e."OrderRequestItemId" = i."Id" AND e."Action" = 'ItemPriceChanged'
                      AND e."NewValue" IS NULL);

UPDATE "OrderRequestItems"
   SET "PricingMode" = 'InternalFreeSupply', "UnitPrice" = NULL
 WHERE "Id" IN (30, 218, 1286, 1718, 1719, 1720, 1721, 1722, 1723, 1782, 1783, 1785, 1786, 1787, 1841, 1842, 1843, 1844, 1845, 1846, 1847, 1979, 1980, 2049, 2050, 2092, 2093) AND ("PricingMode" <> 'InternalFreeSupply' OR "UnitPrice" IS NOT NULL);

DO $$
DECLARE n int; was numeric; now_ numeric;
BEGIN
  SELECT count(*) INTO n FROM "OrderRequestItems"
   WHERE "Id" IN (30, 218, 1286, 1718, 1719, 1720, 1721, 1722, 1723, 1782, 1783, 1785, 1786, 1787, 1841, 1842, 1843, 1844, 1845, 1846, 1847, 1979, 1980, 2049, 2050, 2092, 2093) AND ("PricingMode" <> 'InternalFreeSupply' OR "UnitPrice" IS NOT NULL);
  IF n <> 0 THEN RAISE EXCEPTION '% lines did not take the change', n; END IF;

  SELECT known_amount INTO was FROM before_state;
  SELECT sum("Quantity" * "UnitPrice") INTO now_ FROM "OrderRequestItems";
  RAISE NOTICE 'known amount: % -> %  (change %)', was, now_, now_ - was;

  SELECT count(*) INTO n FROM "OrderRequestItems";
  IF n <> (SELECT lines FROM before_state) THEN RAISE EXCEPTION 'line count moved'; END IF;
END $$;

COMMIT;

-- BaxOrders - May's twenty «Qala baza» lines are internal supply, not purchases. Owner, 2026-10-09.
--
-- Checking every month the way September was checked turned up a pattern the workbook keeps consistently:
-- the «Cəmi» cell is left empty on exactly 22 rows of the whole book, and the «Şirkət» column says
-- «Qala Baza» on all 22 - the company's own store. Two of them are September's and the owner has already
-- ruled on those (D-45). These are the other twenty, all in May, 404,33 in all.
--
-- So the person filling the sheet wrote no total where nothing was paid, and the owner confirms it: the
-- goods came out of the warehouse. As in D-35 and D-45 the lines move to InternalFreeSupply rather than
-- merely losing their price, because PriceRequired with an empty price would make the screens say a price is
-- still owed on them.
--
-- These differ from September's two: those were already classified InternalFreeSupply and only the price
-- lingered, while these stand as PriceRequired, so the pricing decision log records the change for each.
--
-- Not every «Qala baza» line is touched, and that is the point of the rule. Fifty-seven others carry a price
-- AND a total the workbook filled in; the book treats those as real purchases and they stay as they are. The
-- owner has previously moved a «Kürək düz» line the other way - out of free supply and into a 12 AZN
-- purchase - so «Qala baza» alone never decides this. The empty total does, and the owner's word.
--
-- The old prices stay in the pricing decision log and in the edit history. Every statement asserts what it
-- replaces, so a second run writes nothing.
\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE before_state ON COMMIT DROP AS
SELECT count(*) AS lines, sum("Quantity" * "UnitPrice") AS known_amount FROM "OrderRequestItems";

CREATE TEMP TABLE want (line bigint) ON COMMIT DROP;
INSERT INTO want VALUES
  (1136), (1137), (1166), (1167), (1168), (1200), (1201), (1202), (1287), (1288),
  (1289), (1377), (1378), (1379), (1380), (1381), (1406), (1407), (1408), (1445);

DO $$
DECLARE n int; amount numeric;
BEGIN
  -- Every line must still be a «Qala baza» line of May, or the plan is being applied to something else.
  SELECT count(*) INTO n
    FROM want w
    JOIN "OrderRequestItems" i ON i."Id" = w.line
    JOIN "Suppliers" s ON s."Id" = i."SupplierId"
    JOIN "OrderRequests" r ON r."Id" = i."OrderRequestId"
   WHERE s."NormalizedName" = 'qala baza'
     AND to_char(r."RequestPeriod", 'YYYY-MM') = '2026-05';
  IF n <> 20 THEN RAISE EXCEPTION 'expected the 20 Qala baza May lines, found %', n; END IF;

  -- And they must still come to what the workbook says they do, so a changed price cannot slip through.
  SELECT coalesce(sum(i."Quantity" * i."UnitPrice"), 0) INTO amount
    FROM want w JOIN "OrderRequestItems" i ON i."Id" = w.line;
  IF amount NOT IN (404.33, 0) THEN
    RAISE EXCEPTION 'these lines come to %, not the 404.33 the plan was made for', amount;
  END IF;
END $$;

INSERT INTO "OrderItemPricingDecisions"
  ("OrderRequestItemId","PreviousMode","NewMode","ActorUserId","ActorDisplayName","Reason","OccurredAtUtc")
SELECT i."Id", i."PricingMode", 'InternalFreeSupply',
       'fa7aeed2-288d-4b36-b2f7-d581e465e464', 'Administrator (sahib qərarı, 2026-10-09)',
       'Kitabda «Cəmi» xanası boşdur və təchizatçı «Qala baza»dır. Sahib təsdiq etdi: mal anbardan pulsuz verilib, alış deyil.',
       now() AT TIME ZONE 'UTC'
  FROM want w JOIN "OrderRequestItems" i ON i."Id" = w.line
 WHERE i."PricingMode" <> 'InternalFreeSupply'
   AND NOT EXISTS (SELECT 1 FROM "OrderItemPricingDecisions" d
                    WHERE d."OrderRequestItemId" = i."Id" AND d."NewMode" = 'InternalFreeSupply');

INSERT INTO "OrderRequestEditEvents"
  ("OrderRequestId","Action","OrderRequestItemId","ProductVariantId","Field","OldValue","NewValue",
   "ActorUserId","ActorDisplayName","OccurredAtUtc")
SELECT i."OrderRequestId", 'ItemPriceChanged', i."Id", i."ProductVariantId", 'UnitPrice',
       i."UnitPrice"::text, NULL, 'fa7aeed2-288d-4b36-b2f7-d581e465e464',
       'Administrator (sahib qərarı, 2026-10-09)', now() AT TIME ZONE 'UTC'
  FROM want w JOIN "OrderRequestItems" i ON i."Id" = w.line
 WHERE i."UnitPrice" IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM "OrderRequestEditEvents" e
                    WHERE e."OrderRequestItemId" = i."Id" AND e."Action" = 'ItemPriceChanged'
                      AND e."NewValue" IS NULL);

UPDATE "OrderRequestItems" i
   SET "PricingMode" = 'InternalFreeSupply', "UnitPrice" = NULL
  FROM want w
 WHERE i."Id" = w.line AND (i."PricingMode" <> 'InternalFreeSupply' OR i."UnitPrice" IS NOT NULL);

DO $$
DECLARE n int; was numeric; now_ numeric;
BEGIN
  SELECT count(*) INTO n FROM want w JOIN "OrderRequestItems" i ON i."Id" = w.line
   WHERE i."PricingMode" <> 'InternalFreeSupply' OR i."UnitPrice" IS NOT NULL;
  IF n <> 0 THEN RAISE EXCEPTION '% line(s) did not take the change', n; END IF;

  SELECT known_amount INTO was FROM before_state;
  SELECT sum("Quantity" * "UnitPrice") INTO now_ FROM "OrderRequestItems";
  RAISE NOTICE 'known amount: % -> %  (change %)', was, now_, now_ - was;

  SELECT count(*) INTO n FROM "OrderRequestItems";
  IF n <> (SELECT lines FROM before_state) THEN RAISE EXCEPTION 'line count moved'; END IF;
END $$;

COMMIT;

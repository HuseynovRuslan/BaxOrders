-- BaxOrders - two more «Qala baza» lines are internal supply, not purchases. Owner, 2026-10-09.
--
-- These two came to light from the other end. Totalling September in the workbook gave 71 900,39 against the
-- program's 71 980,39, and the 80 turned out to be two rows whose «Cəmi» cell was never filled in - №3146
-- «Süpürgə xəkandaz dəsti» (5 × 8) and №3147 «Kürək sapı» (10 × 4), both at the Heydər Əliyev Mərkəzi, both
-- supplied by «Qala baza», the company's own store.
--
-- They differ from the 27 lines of D-35 in one way: there the workbook left the PRICE cell empty, which is
-- what identified them. Here the price is filled and only the total is blank, so they fell outside that rule.
-- The owner has now confirmed what the blank total meant: the goods came out of the warehouse and nothing
-- was paid.
--
-- The catalogue had already half-recorded this. Both lines are classified InternalFreeSupply yet still carry
-- a price, which is a contradiction: the mode says nothing was paid and the amount says 80 was. They are the
-- only two lines in the whole effective history in that state, and the 80 is exactly the gap the owner found
-- between the workbook's September total and the program's. So this run finishes what the classification
-- started - the mode stays, the price goes.
--
-- The old prices stay in the pricing decision log and in the edit history, so nothing is lost. The pricing
-- decision insert writes nothing here, because the mode is already what it should be; that is intended, and
-- the edit history still records each cleared price. Every statement asserts what it replaces, so a second
-- run writes nothing.
\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE before_state ON COMMIT DROP AS
SELECT count(*) AS lines, sum("Quantity" * "UnitPrice") AS known_amount FROM "OrderRequestItems";

DO $$
DECLARE n int;
BEGIN
  -- The two lines must still be the «Qala baza» September lines this was written for.
  SELECT count(*) INTO n
    FROM "OrderRequestItems" i
    JOIN "Suppliers" s ON s."Id" = i."SupplierId"
    JOIN "OrderRequests" r ON r."Id" = i."OrderRequestId"
    JOIN "ProductVariants" v ON v."Id" = i."ProductVariantId"
    JOIN "Products" p ON p."Id" = v."ProductId"
   WHERE i."Id" IN (3359, 3360)
     AND s."NormalizedName" = 'qala baza'
     AND to_char(r."RequestPeriod", 'YYYY-MM') = '2026-09'
     AND p."Name" IN ('Süpürgə xəkandaz dəsti', 'Kürək sapı');
  IF n <> 2 THEN RAISE EXCEPTION 'expected the 2 Qala baza September lines, found %', n; END IF;
END $$;

INSERT INTO "OrderItemPricingDecisions"
  ("OrderRequestItemId","PreviousMode","NewMode","ActorUserId","ActorDisplayName","Reason","OccurredAtUtc")
SELECT i."Id", i."PricingMode", 'InternalFreeSupply',
       'fa7aeed2-288d-4b36-b2f7-d581e465e464', 'Administrator (sahib qərarı, 2026-10-09)',
       'Kitabda «Cəmi» xanası boşdur və təchizatçı «Qala baza»dır. Sahib təsdiq etdi: mal anbardan pulsuz verilib, alış deyil.',
       now() AT TIME ZONE 'UTC'
  FROM "OrderRequestItems" i
 WHERE i."Id" IN (3359, 3360) AND i."PricingMode" <> 'InternalFreeSupply'
   AND NOT EXISTS (SELECT 1 FROM "OrderItemPricingDecisions" d
                    WHERE d."OrderRequestItemId" = i."Id" AND d."NewMode" = 'InternalFreeSupply');

INSERT INTO "OrderRequestEditEvents"
  ("OrderRequestId","Action","OrderRequestItemId","ProductVariantId","Field","OldValue","NewValue",
   "ActorUserId","ActorDisplayName","OccurredAtUtc")
SELECT i."OrderRequestId", 'ItemPriceChanged', i."Id", i."ProductVariantId", 'UnitPrice',
       i."UnitPrice"::text, NULL, 'fa7aeed2-288d-4b36-b2f7-d581e465e464',
       'Administrator (sahib qərarı, 2026-10-09)', now() AT TIME ZONE 'UTC'
  FROM "OrderRequestItems" i
 WHERE i."Id" IN (3359, 3360) AND i."UnitPrice" IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM "OrderRequestEditEvents" e
                    WHERE e."OrderRequestItemId" = i."Id" AND e."Action" = 'ItemPriceChanged'
                      AND e."NewValue" IS NULL);

UPDATE "OrderRequestItems"
   SET "PricingMode" = 'InternalFreeSupply', "UnitPrice" = NULL
 WHERE "Id" IN (3359, 3360) AND ("PricingMode" <> 'InternalFreeSupply' OR "UnitPrice" IS NOT NULL);

DO $$
DECLARE n int; was numeric; now_ numeric;
BEGIN
  SELECT count(*) INTO n FROM "OrderRequestItems"
   WHERE "Id" IN (3359, 3360) AND ("PricingMode" <> 'InternalFreeSupply' OR "UnitPrice" IS NOT NULL);
  IF n <> 0 THEN RAISE EXCEPTION '% line(s) did not take the change', n; END IF;

  SELECT known_amount INTO was FROM before_state;
  SELECT sum("Quantity" * "UnitPrice") INTO now_ FROM "OrderRequestItems";
  RAISE NOTICE 'known amount: % -> %  (change %)', was, now_, now_ - was;

  SELECT count(*) INTO n FROM "OrderRequestItems";
  IF n <> (SELECT lines FROM before_state) THEN RAISE EXCEPTION 'line count moved'; END IF;
END $$;

COMMIT;

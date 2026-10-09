-- BaxOrders — D-24: the restored «Yay ayaqqabısı» line is «Aylıqdan kənar».
--
-- Owner decision of 2026-09-28, recorded in AI_WORKFLOW/DECISIONS.md (D-24) and applied to the workbook the
-- same day (`Aylıq` R3621). It was never applied to the historical line itself, because that line came from
-- the September import and the workbook has not been re-imported since.
--
-- One line, one column. The WHERE asserts the value being replaced, so a second run does nothing.
\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE before_state ON COMMIT DROP AS
SELECT count(*) AS lines, sum("Quantity" * "UnitPrice") AS known_amount,
       count(*) FILTER (WHERE "OrderLineType" = 'Monthly') AS monthly,
       count(*) FILTER (WHERE "OrderLineType" = 'OutsideMonthly') AS outside,
       count(*) FILTER (WHERE "OrderLineType" NOT IN ('Monthly', 'OutsideMonthly')) AS unclassified
  FROM "OrderRequestItems";

-- Guard: this must be the line the decision is about, and nothing else.
DO $$
DECLARE found int;
BEGIN
  SELECT count(*) INTO found FROM "OrderRequestItems" i
    JOIN "ProductVariants" pv ON pv."Id" = i."ProductVariantId"
    JOIN "Products" p ON p."Id" = pv."ProductId"
   WHERE i."Id" = 2988 AND p."Name" = 'Yay ayaqqabısı' AND pv."ModelCode" = 'M-101-S-2'
     AND i."Quantity" = 1 AND i."UnitPrice" = 28;
  IF found <> 1 THEN
    RAISE EXCEPTION 'line 2988 is not the line D-24 describes (matched % rows)', found;
  END IF;
END $$;

UPDATE "OrderRequestItems" SET "OrderLineType" = 'OutsideMonthly'
 WHERE "Id" = 2988 AND "OrderLineType" = 'Unclassified';

INSERT INTO "OrderRequestEditEvents"
  ("OrderRequestId","Action","OrderRequestItemId","ProductVariantId","Field","OldValue","NewValue",
   "ActorUserId","ActorDisplayName","OccurredAtUtc")
SELECT i."OrderRequestId", 'ItemOrderLineTypeChanged', i."Id", i."ProductVariantId", 'OrderLineType',
       'Unclassified', 'OutsideMonthly', 'fa7aeed2-288d-4b36-b2f7-d581e465e464',
       'Administrator (sahib qərarı D-24, 2026-09-28)', now()
  FROM "OrderRequestItems" i
 WHERE i."Id" = 2988 AND i."OrderLineType" = 'OutsideMonthly'
   AND NOT EXISTS (SELECT 1 FROM "OrderRequestEditEvents" e
                    WHERE e."OrderRequestItemId" = 2988 AND e."Action" = 'ItemOrderLineTypeChanged'
                      AND e."OldValue" = 'Unclassified' AND e."NewValue" = 'OutsideMonthly');

DO $$
DECLARE was bigint; now_ bigint; money_before numeric; money_after numeric; left_over bigint;
BEGIN
  SELECT lines, known_amount INTO was, money_before FROM before_state;
  SELECT count(*), sum("Quantity" * "UnitPrice") INTO now_, money_after FROM "OrderRequestItems";
  IF was <> now_ THEN RAISE EXCEPTION 'sətir sayı dəyişdi: % -> %', was, now_; END IF;
  IF money_before <> money_after THEN
    RAISE EXCEPTION 'məbləğ dəyişdi: % -> % (təsnifat məbləği dəyişdirməməlidir)', money_before, money_after;
  END IF;
  SELECT count(*) INTO left_over FROM "OrderRequestItems"
   WHERE "OrderLineType" NOT IN ('Monthly', 'OutsideMonthly');
  IF left_over <> 0 THEN RAISE EXCEPTION 'təsnifatsız sətir qaldı: %', left_over; END IF;
END $$;

SELECT 'before' AS state, lines, known_amount, monthly, outside, unclassified FROM before_state
UNION ALL
SELECT 'after', count(*), sum("Quantity" * "UnitPrice"),
       count(*) FILTER (WHERE "OrderLineType" = 'Monthly'),
       count(*) FILTER (WHERE "OrderLineType" = 'OutsideMonthly'),
       count(*) FILTER (WHERE "OrderLineType" NOT IN ('Monthly', 'OutsideMonthly'))
  FROM "OrderRequestItems";

COMMIT;

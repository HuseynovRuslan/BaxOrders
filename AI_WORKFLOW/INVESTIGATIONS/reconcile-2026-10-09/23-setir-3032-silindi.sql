-- BaxOrders - the one line the workbook's «Aylıq» sheet does not have is removed. Owner, 2026-10-09.
--
-- Item 2988, workbook № 3032: «Yay ayaqqabısı», Heydər Əliyev Mərkəzi, August 2026, 1 × 28 = 28,00.
--
-- It is the only line in the whole effective history that the «Aylıq» sheet lacks, and it is why August read
-- 44 340,78 against the sheet's 44 312,78. The row does stand in the workbook's «Əsas» sheet at row 3035,
-- which is why the owner restored it on 2026-09-27 (D-16) and classified it on 2026-09-28 (D-24). Told that
-- again today, the owner has ruled the other way: «Aylıq» is the authoritative sheet (D-25) and the workbook
-- decides every time (D-39, D-40, D-41), so a line «Aylıq» does not carry is not an order. This supersedes
-- D-16 and D-24.
--
-- This is a deletion, and the domain does not offer one for an approved order: OrderRequest.RemoveItem is
-- restricted to a draft, because an approved version is meant to be changed through an audited revision.
-- There is no soft delete to use instead, so the line is removed directly and the removal is written into
-- the edit history first - the history screen reads its events by order and resolves the product through
-- the variant, never through the line, so the record survives the line it describes.
--
-- The import row keeps its own record of having been read; only the link saying it produced this line goes,
-- because the line it produced no longer exists.
--
-- Nothing else is touched. The guards below refuse the transaction unless exactly this line, with exactly
-- this product, object, period and amount, is the one being removed.
\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE before_state ON COMMIT DROP AS
SELECT count(*) AS lines, sum("Quantity" * "UnitPrice") AS known_amount FROM "OrderRequestItems";

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n
    FROM "OrderRequestItems" i
    JOIN "OrderRequests" r ON r."Id" = i."OrderRequestId"
    JOIN "Locations" l ON l."Id" = r."LocationId"
    JOIN "ProductVariants" v ON v."Id" = i."ProductVariantId"
    JOIN "Products" p ON p."Id" = v."ProductId"
   WHERE i."Id" = 2988
     AND p."Name" = 'Yay ayaqqabısı'
     AND l."Name" = 'Heydər Əliyev Mərkəzi'
     AND to_char(r."RequestPeriod", 'YYYY-MM') = '2026-08'
     AND i."Quantity" = 1 AND i."UnitPrice" = 28;
  IF n <> 1 THEN
    -- Already removed by an earlier run: the history says so, and there is nothing left to do.
    IF n = 0 AND EXISTS (SELECT 1 FROM "OrderRequestEditEvents"
                          WHERE "OrderRequestItemId" = 2988
                            AND "Action" = 'ItemRemovedAsAbsentFromWorkbook') THEN
      RAISE NOTICE 'already removed - nothing to do';
      RETURN;
    END IF;
    RAISE EXCEPTION 'item 2988 is not the «Yay ayaqqabısı» line this was written for (found %)', n;
  END IF;

  -- Nothing may depend on it: no later version derives from it, no pricing decision explains it.
  SELECT count(*) INTO n FROM "OrderRequestItems" WHERE "SourceOrderRequestItemId" = 2988;
  IF n <> 0 THEN RAISE EXCEPTION '% line(s) derive from this one', n; END IF;
  SELECT count(*) INTO n FROM "OrderItemPricingDecisions" WHERE "OrderRequestItemId" = 2988;
  IF n <> 0 THEN RAISE EXCEPTION '% pricing decision(s) refer to this line', n; END IF;
END $$;

-- Written before the line goes, so the order's history still says what was removed and why.
INSERT INTO "OrderRequestEditEvents"
  ("OrderRequestId","Action","OrderRequestItemId","ProductVariantId","Field","OldValue","NewValue",
   "ActorUserId","ActorDisplayName","OccurredAtUtc")
SELECT i."OrderRequestId", 'ItemRemovedAsAbsentFromWorkbook', i."Id", i."ProductVariantId", NULL,
       p."Name" || ' · ' || i."Quantity"::text || ' × ' || i."UnitPrice"::text || ' = '
         || (i."Quantity" * i."UnitPrice")::text || ' (kitab № 3032)',
       NULL, 'fa7aeed2-288d-4b36-b2f7-d581e465e464', 'Administrator (sahib qərarı, 2026-10-09)',
       now() AT TIME ZONE 'UTC'
  FROM "OrderRequestItems" i
  JOIN "ProductVariants" v ON v."Id" = i."ProductVariantId"
  JOIN "Products" p ON p."Id" = v."ProductId"
 WHERE i."Id" = 2988
   AND NOT EXISTS (SELECT 1 FROM "OrderRequestEditEvents" e
                    WHERE e."OrderRequestItemId" = 2988
                      AND e."Action" = 'ItemRemovedAsAbsentFromWorkbook');

-- The import row stays and keeps its own provenance; only the link to a line that will not exist goes.
DELETE FROM "ImportRowMaterializations" WHERE "OrderRequestItemId" = 2988;

DELETE FROM "OrderRequestItems" WHERE "Id" = 2988;

DO $$
DECLARE n int; was numeric; now_ numeric; was_lines bigint; now_lines bigint;
BEGIN
  SELECT count(*) INTO n FROM "OrderRequestItems" WHERE "Id" = 2988;
  IF n <> 0 THEN RAISE EXCEPTION 'the line is still there'; END IF;

  SELECT count(*) INTO n FROM "OrderRequestEditEvents"
   WHERE "OrderRequestItemId" = 2988 AND "Action" = 'ItemRemovedAsAbsentFromWorkbook';
  IF n <> 1 THEN RAISE EXCEPTION 'the removal was not recorded in the history'; END IF;

  SELECT lines, known_amount INTO was_lines, was FROM before_state;
  SELECT count(*), sum("Quantity" * "UnitPrice") INTO now_lines, now_ FROM "OrderRequestItems";
  IF was_lines - now_lines NOT IN (0, 1) THEN
    RAISE EXCEPTION 'line count moved by %, expected 1', was_lines - now_lines;
  END IF;
  RAISE NOTICE 'lines % -> %   amount % -> %   (change %)', was_lines, now_lines, was, now_, now_ - was;
END $$;

COMMIT;

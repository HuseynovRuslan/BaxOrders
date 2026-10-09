-- BaxOrders - the empty «Parlament parkı · yanvar 2026» order is removed. Owner, 2026-10-09.
--
-- Order 7 holds no lines and never has. It is what is left of a mis-match the import made on 2026-09-22:
-- workbook row 1075 (№ 1072, «Torf (perilitli)», 5 × 74) names «H.Ə.M» as its object, but the import matched
-- it to Parlament parkı and opened a January order there. The line was corrected afterwards and now sits in
-- order 5, Heydər Əliyev Mərkəzi, January, exactly as the workbook says - and this shell stayed behind.
--
-- The workbook has no January row for Parlament parkı at all: that object appears there only from April to
-- September. So by the owner's rule - what «Aylıq» does not carry is not an order - the shell goes.
--
-- The import's own record is NOT deleted. Its group row is turned into a «Skipped» one, which is the schema's
-- way of saying this group produced no order: CK_ImportMaterializationGroups_SkipOrRequest requires exactly
-- that shape, and the 164 groups the owner skipped in October already read this way. The reason says what
-- happened, so the import batch still accounts for every row it read.
--
-- The order's one workflow event goes with it through the FK's own cascade. Nothing else references it: no
-- lines, no edit history, no revision. The guards below refuse the transaction unless all of that still holds.
\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE before_state ON COMMIT DROP AS
SELECT count(*) AS orders, (SELECT count(*) FROM "OrderRequestItems") AS lines,
       (SELECT sum("Quantity" * "UnitPrice") FROM "OrderRequestItems") AS known_amount
  FROM "OrderRequests";

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n
    FROM "OrderRequests" r
    JOIN "Locations" l ON l."Id" = r."LocationId"
   WHERE r."Id" = 7 AND l."Name" = 'Parlament parkı'
     AND to_char(r."RequestPeriod", 'YYYY-MM') = '2026-01' AND r."Version" = 1;
  IF n <> 1 THEN
    IF n = 0 AND NOT EXISTS (SELECT 1 FROM "OrderRequests" WHERE "Id" = 7) THEN
      RAISE NOTICE 'already removed - nothing to do';
      RETURN;
    END IF;
    RAISE EXCEPTION 'order 7 is not the empty Parlament parkı January order this was written for';
  END IF;

  -- It must still be empty, and nothing may depend on it.
  SELECT count(*) INTO n FROM "OrderRequestItems" WHERE "OrderRequestId" = 7;
  IF n <> 0 THEN RAISE EXCEPTION 'order 7 now holds % line(s) - it is no longer empty', n; END IF;
  SELECT count(*) INTO n FROM "OrderRequestEditEvents" WHERE "OrderRequestId" = 7;
  IF n <> 0 THEN RAISE EXCEPTION 'order 7 has % edit event(s)', n; END IF;
  SELECT count(*) INTO n FROM "OrderRequestRevisions"
   WHERE "SourceOrderRequestId" = 7 OR "RevisionOrderRequestId" = 7;
  IF n <> 0 THEN RAISE EXCEPTION 'order 7 takes part in % revision(s)', n; END IF;
END $$;

UPDATE "ImportMaterializationGroups"
   SET "Action" = 'Skipped', "OrderRequestId" = NULL, "Version" = NULL,
       "SkipReason" = '2026-10-09 sahib qərarı: bu qrup üçün yaradılan sifariş boş qaldı. Qrupun yeganə '
                      'sətri (kitab sətri 1075, № 1072 «Torf (perilitli)») səhvən Parlament parkına '
                      'uyğunlaşdırılmışdı; düzəldilib Heydər Əliyev Mərkəzinə keçdi, kitabın yazdığı kimi. '
                      'Boş sifariş silindi, bu qrup isə sifarişsiz qeyd kimi saxlanıldı.'
 WHERE "OrderRequestId" = 7 AND "Action" <> 'Skipped';

DELETE FROM "OrderRequests" WHERE "Id" = 7;

DO $$
DECLARE n int; was_orders bigint; now_orders bigint; was_lines bigint; now_lines bigint;
        was numeric; now_ numeric;
BEGIN
  SELECT count(*) INTO n FROM "OrderRequests" WHERE "Id" = 7;
  IF n <> 0 THEN RAISE EXCEPTION 'the order is still there'; END IF;

  SELECT count(*) INTO n FROM "ImportMaterializationGroups"
   WHERE "Action" = 'Skipped' AND "OrderRequestId" IS NULL AND "SkipReason" LIKE '%Torf (perilitli)%';
  IF n <> 1 THEN RAISE EXCEPTION 'the import group was not kept as a skipped record'; END IF;

  SELECT orders, lines, known_amount INTO was_orders, was_lines, was FROM before_state;
  SELECT count(*) INTO now_orders FROM "OrderRequests";
  SELECT count(*), sum("Quantity" * "UnitPrice") INTO now_lines, now_ FROM "OrderRequestItems";
  IF was_lines <> now_lines THEN RAISE EXCEPTION 'line count moved: % -> %', was_lines, now_lines; END IF;
  IF was IS DISTINCT FROM now_ THEN RAISE EXCEPTION 'money moved: % -> %', was, now_; END IF;
  RAISE NOTICE 'orders % -> %   lines % (unchanged)   amount % (unchanged)',
               was_orders, now_orders, now_lines, now_;
END $$;

COMMIT;

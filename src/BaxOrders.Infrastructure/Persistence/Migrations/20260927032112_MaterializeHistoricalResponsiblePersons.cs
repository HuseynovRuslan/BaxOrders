using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BaxOrders.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class MaterializeHistoricalResponsiblePersons : Migration
    {
        /// <summary>
        /// Which requests can be answered from what the source says.
        /// </summary>
        /// <remarks>
        /// One row per request whose every imported line names a person, and where every one of those names
        /// resolves — through the active canonical people and their active aliases, on the key the import
        /// itself normalized — to the same person. A request with a name nobody can resolve, or with two
        /// genuinely different people in it, produces no row here and is left for somebody to decide.
        /// <para>
        /// Deliberately derived rather than listed: the two owner decisions below are the only places a
        /// request is named by hand, and everything else follows the rule the importer already applies.
        /// </para>
        /// </remarks>
        internal const string ResolvedRequests = """
            SELECT i."OrderRequestId" AS order_id,
                   MIN(COALESCE(p."Id", pa."Id")) AS person_id
            FROM "OrderRequestItems" i
            JOIN "ImportRowMaterializations" m ON m."OrderRequestItemId" = i."Id"
            JOIN "ImportRows" r ON r."Id" = m."ImportRowId"
            LEFT JOIN "ResponsiblePeople" p
                   ON p."NormalizedName" = r."NormalizedResponsiblePersonName" AND p."IsActive"
            LEFT JOIN "ResponsiblePersonAliases" a
                   ON a."NormalizedAlias" = r."NormalizedResponsiblePersonName"
            LEFT JOIN "ResponsiblePeople" pa
                   ON pa."Id" = a."ResponsiblePersonId" AND pa."IsActive"
            GROUP BY i."OrderRequestId"
            HAVING COUNT(*) FILTER (WHERE r."NormalizedResponsiblePersonName" IS NULL) = 0
               AND COUNT(*) FILTER (WHERE COALESCE(p."Id", pa."Id") IS NULL) = 0
               AND COUNT(DISTINCT COALESCE(p."Id", pa."Id")) = 1
            """;

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ================================================================================================
            // The 167 historical requests carry a responsible person's name in their source, but none of them
            // has ever pointed at a canonical ResponsiblePerson. This gives the link where the source can
            // answer for itself, and leaves it null where it cannot.
            //
            // Nothing the source said is rewritten. OriginalResponsiblePersonName, the import rows, their
            // materializations, the row numbers and the Excel text all stay exactly as they were: the raw
            // text remains what the source wrote, and the request gains a pointer beside it.
            //
            // The census behind this, over all 167 requests:
            //
            //   31  every name resolves, and to one person          → materialized
            //    2  the business decided them itself (76 and 104)   → materialized
            //    3  sole name "Qədeş", who is created below         → materialized
            //  131  at least one name nobody can resolve            → left null, for review
            //    0  two genuinely different people in one request
            //    0  no name in the source at all
            //
            // The 131 are seven names with no canonical record: Elmir (75 requests), Sirus (31), Eldar (11),
            // Qulu (8), Elvin (5), Qədeş in a mixed request (1) and Məmməd (2). None of them is guessed at
            // here. Inventing a person for a name nobody has confirmed would put a stranger's name on years
            // of somebody else's orders.
            //
            // Nothing else moves: no status, no approval or revision history, no workflow event, no
            // SubmittedAtUtc or ApprovedAtUtc, no line, price, supplier or classification.
            // ================================================================================================

            // ---- 1. Qədeş -------------------------------------------------------------------------------
            //
            // The business confirmed him as a person of his own and explicitly not another name for Aydın, so
            // no alias is written between them. His source rows already say "Qədeş" in four requests; the
            // canonical record simply did not exist yet.
            //
            // The name is all we were given, and all that is recorded: no full name is inferred and no
            // contact detail is invented. The insert is guarded by the same normalized key the unique index
            // is on, so running this twice cannot make a second Qədeş — and by the history itself, so a
            // database that has never heard of him does not gain a person it has no use for.
            migrationBuilder.Sql("""
                INSERT INTO "ResponsiblePeople" ("Name", "NormalizedName", "IsActive", "CreatedAtUtc", "UpdatedAtUtc")
                SELECT 'Qədeş', 'qədeş', TRUE, NOW() AT TIME ZONE 'UTC', NOW() AT TIME ZONE 'UTC'
                WHERE NOT EXISTS (SELECT 1 FROM "ResponsiblePeople" WHERE "NormalizedName" = 'qədeş')
                  AND EXISTS (SELECT 1 FROM "ImportRows" WHERE "NormalizedResponsiblePersonName" = 'qədeş');
                """);

            // ---- 2. The requests the source answers by itself --------------------------------------------
            //
            // Runs after Qədeş exists, so the three EXPO Center requests whose only name is his resolve here
            // by the ordinary rule rather than by being named. The two the business decided are excluded and
            // handled below, because for those the source says something else and the decision overrides it.
            migrationBuilder.Sql($"""
                UPDATE "OrderRequests" AS o
                SET "ResponsiblePersonId" = t.person_id
                FROM ({ResolvedRequests}) AS t
                WHERE o."Id" = t.order_id
                  AND o."ResponsiblePersonId" IS NULL
                  AND o."Id" NOT IN (76, 104);
                """);

            // ---- 3. The two the business decided ---------------------------------------------------------
            //
            // Request 76, Bakı Konqres Mərkəzi, June: forty lines say Çingiz and one fuel line says Xəyal.
            // That is two different people in one request and the rule above refuses it; the business says
            // Çingiz.
            //
            // Request 104, EXPO Center, July: every line says Aydın, so the rule would have answered Aydın.
            // The business says the order was Qədeş's, and an explicit decision outranks the source.
            //
            // Both look the person up by canonical name, never by an id read out of an old report.
            migrationBuilder.Sql("""
                UPDATE "OrderRequests" AS o
                SET "ResponsiblePersonId" = p."Id"
                FROM "ResponsiblePeople" p
                WHERE o."Id" = 76 AND o."ResponsiblePersonId" IS NULL
                  AND p."NormalizedName" = 'çingiz' AND p."IsActive";
                """);

            migrationBuilder.Sql("""
                UPDATE "OrderRequests" AS o
                SET "ResponsiblePersonId" = p."Id"
                FROM "ResponsiblePeople" p
                WHERE o."Id" = 104 AND o."ResponsiblePersonId" IS NULL
                  AND p."NormalizedName" = 'qədeş' AND p."IsActive";
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Every link is cleared only where it still holds what this migration put there, so a correction
            // somebody has made since is left alone.
            migrationBuilder.Sql("""
                UPDATE "OrderRequests" AS o
                SET "ResponsiblePersonId" = NULL
                FROM "ResponsiblePeople" p
                WHERE o."Id" = 104 AND p."Id" = o."ResponsiblePersonId" AND p."NormalizedName" = 'qədeş';
                """);

            migrationBuilder.Sql("""
                UPDATE "OrderRequests" AS o
                SET "ResponsiblePersonId" = NULL
                FROM "ResponsiblePeople" p
                WHERE o."Id" = 76 AND p."Id" = o."ResponsiblePersonId" AND p."NormalizedName" = 'çingiz';
                """);

            migrationBuilder.Sql($"""
                UPDATE "OrderRequests" AS o
                SET "ResponsiblePersonId" = NULL
                FROM ({ResolvedRequests}) AS t
                WHERE o."Id" = t.order_id
                  AND o."ResponsiblePersonId" = t.person_id
                  AND o."Id" NOT IN (76, 104);
                """);

            // Qədeş goes only if nothing at all points at him any more — no request, no alias, no import
            // resolution and no staged row. A canonical person somebody has since used is not this
            // migration's to delete, so in that case the record stays and only the links above are undone.
            migrationBuilder.Sql("""
                DELETE FROM "ResponsiblePeople" p
                WHERE p."NormalizedName" = 'qədeş'
                  AND NOT EXISTS (SELECT 1 FROM "OrderRequests" o WHERE o."ResponsiblePersonId" = p."Id")
                  AND NOT EXISTS (SELECT 1 FROM "ResponsiblePersonAliases" a WHERE a."ResponsiblePersonId" = p."Id")
                  AND NOT EXISTS (SELECT 1 FROM "ImportResolutions" i WHERE i."ResponsiblePersonId" = p."Id")
                  AND NOT EXISTS (SELECT 1 FROM "ImportRows" r WHERE r."MatchedResponsiblePersonId" = p."Id");
                """);
        }
    }
}

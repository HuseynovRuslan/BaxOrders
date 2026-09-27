using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BaxOrders.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class MaterializeConfirmedResponsiblePersons : Migration
    {
        /// <summary>
        /// The six the business confirmed, with the key each is recognised by.
        /// </summary>
        /// <remarks>
        /// The normalized form is the one the import already stored for these names, so a person created here
        /// is found by exactly the text the source rows carry. Nothing else about them is recorded: no full
        /// name is inferred and no contact detail invented, because the label is all the business gave us.
        /// </remarks>
        internal const string ConfirmedPeople = """
            VALUES ('Elmir', 'elmir'), ('Sirus', 'sirus'), ('Eldar', 'eldar'),
                   ('Qulu', 'qulu'), ('Elvin', 'elvin'), ('Məmməd', 'məmməd')
            """;

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ================================================================================================
            // Six names appear all over the historical source and had no canonical record, so 131 requests
            // were left without a responsible person. The business has confirmed that all six are real people
            // and distinct from one another and from everybody already in the table. Creating them lets the
            // rule the previous migration established answer most of those requests by itself.
            //
            // No alias is written between any of them, or between any of them and an existing person: the
            // business said they are six different people, and an alias would say the opposite.
            //
            // Nothing the source said is rewritten. OriginalResponsiblePersonName, the normalized key beside
            // it, the import rows, their materializations and the row numbers all stay exactly as they were.
            // ================================================================================================

            // ---- 1. The six ------------------------------------------------------------------------------
            //
            // Created only where the name is missing from the table, so running this twice cannot make a
            // second Elmir — and only where the history actually names them, so a database that has never
            // seen these rows does not gain six people it has no use for.
            migrationBuilder.Sql($"""
                INSERT INTO "ResponsiblePeople" ("Name", "NormalizedName", "IsActive", "CreatedAtUtc", "UpdatedAtUtc")
                SELECT v.name, v.normalized, TRUE, NOW() AT TIME ZONE 'UTC', NOW() AT TIME ZONE 'UTC'
                FROM ({ConfirmedPeople}) AS v(name, normalized)
                WHERE NOT EXISTS (
                        SELECT 1 FROM "ResponsiblePeople" p WHERE p."NormalizedName" = v.normalized)
                  AND EXISTS (
                        SELECT 1 FROM "ImportRows" r WHERE r."NormalizedResponsiblePersonName" = v.normalized);
                """);

            // ---- 2. The requests the source can now answer -----------------------------------------------
            //
            // The same rule as before, deliberately the same constant rather than a copy of it: a request is
            // answered only when every one of its lines names somebody and every one of those names resolves
            // to the same canonical person. A request holding two of these six — Eldar on some lines and
            // Çingiz on others, say — still resolves to two different people and still gets nothing, because
            // picking the commoner one would put a name on an order nobody confirmed.
            //
            // A request that already carries a person is left alone, which covers the two the business
            // decided itself (76 and 104) and anything corrected by hand since.
            migrationBuilder.Sql($"""
                UPDATE "OrderRequests" AS o
                SET "ResponsiblePersonId" = t.person_id
                FROM ({MaterializeHistoricalResponsiblePersons.ResolvedRequests}) AS t
                WHERE o."Id" = t.order_id
                  AND o."ResponsiblePersonId" IS NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Links first: cleared only where a request still points at one of the six, so a person put there
            // by hand since, or by the earlier migration, is untouched.
            migrationBuilder.Sql($"""
                UPDATE "OrderRequests" AS o
                SET "ResponsiblePersonId" = NULL
                FROM "ResponsiblePeople" p, ({ConfirmedPeople}) AS v(name, normalized)
                WHERE p."Id" = o."ResponsiblePersonId"
                  AND p."NormalizedName" = v.normalized;
                """);

            // Then the people, and only those nothing points at any more — no request, no alias, no import
            // resolution, no staged row. One of these names that had somehow been in use before this ran is
            // kept, because a canonical person somebody else relies on is not this migration's to delete.
            migrationBuilder.Sql($"""
                DELETE FROM "ResponsiblePeople" p
                USING ({ConfirmedPeople}) AS v(name, normalized)
                WHERE p."NormalizedName" = v.normalized
                  AND NOT EXISTS (SELECT 1 FROM "OrderRequests" o WHERE o."ResponsiblePersonId" = p."Id")
                  AND NOT EXISTS (SELECT 1 FROM "ResponsiblePersonAliases" a WHERE a."ResponsiblePersonId" = p."Id")
                  AND NOT EXISTS (SELECT 1 FROM "ImportResolutions" i WHERE i."ResponsiblePersonId" = p."Id")
                  AND NOT EXISTS (SELECT 1 FROM "ImportRows" r WHERE r."MatchedResponsiblePersonId" = p."Id");
                """);
        }
    }
}

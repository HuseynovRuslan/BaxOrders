using BaxOrders.Application.Abstractions;

namespace BaxOrders.ApprovalSandbox;

/// <summary>
/// Everything the sandbox is seeded with, by name. Synthetic, and named so that nobody can take it for the
/// company's data: every object, product, person and account says "Sınaq".
/// </summary>
public static class SandboxScenario
{
    /// <summary>Rəhbər on screen: the one role that holds approval authority.</summary>
    public static readonly SandboxAccount Rehber = new("sinaq.rehber", "Sınaq Rəhbəri", BaxOrdersRoles.Manager);

    public static readonly SandboxAccount Coordinator = new("sinaq.koordinator", "Sınaq Koordinatoru", BaxOrdersRoles.Coordinator);

    /// <summary>There to show that an administrator cannot approve.</summary>
    public static readonly SandboxAccount Admin = new("sinaq.admin", "Sınaq Administratoru", BaxOrdersRoles.Admin);

    public static readonly IReadOnlyList<SandboxAccount> Accounts = [Rehber, Coordinator, Admin];

    /// <summary>Codes outside the real <c>LOC-…</c> sequence, so the two can never collide.</summary>
    public static readonly SandboxLocation Location1 = new("SINAQ-01", "Sınaq obyekti 1");

    public static readonly SandboxLocation Location2 = new("SINAQ-02", "Sınaq obyekti 2");

    public const string ResponsiblePersonName = "Sınaq məsul şəxsi";

    public const string SupplierName = "Sınaq təchizatçısı";

    /// <summary>The products, each with one variant ordered in the given unit (a code from the seeded units).</summary>
    public static readonly IReadOnlyList<SandboxProduct> Products =
    [
        new("Sınaq məhsulu — zibil paketi", "PACK"),
        new("Sınaq məhsulu — maye sabun", "L"),
        new("Sınaq məhsulu — iş əlcəyi", "PAIR"),
        new("Sınaq məhsulu — süpürgə", "PCS"),
        new("Sınaq məhsulu — kağız dəsmal", "PACK"),
    ];

    /// <summary>
    /// The test order: sent by the coordinator and waiting in "Təsdiq gözləyənlər" from the moment the sandbox
    /// exists. The last line has no price, so approving it asks for the acknowledgement.
    /// </summary>
    public static readonly SandboxOrder TestOrder = new(
        Location1,
        new DateOnly(2026, 9, 1),
        [
            new(0, 140m, 0.40m),
            new(1, 40m, 2.80m),
            new(2, 60m, 1.20m),
            new(3, 12m, 6.50m),
            new(4, 25m, null),
        ]);

    /// <summary>Not sent yet, so "sifariş göndərilir" can be done by hand.</summary>
    public static readonly SandboxOrder Draft = new(
        Location2,
        new DateOnly(2026, 9, 1),
        [
            new(0, 60m, 0.40m),
            new(1, 20m, 2.80m),
            new(2, 30m, 1.20m),
            new(3, 4m, 6.50m),
        ]);

    /// <summary>
    /// Carried in from Excel as already approved, the way the company's own history was — so the panel's
    /// "Excel importu ilə daxil edilib · Təsdiq məlumatı mövcud deyil." can be seen. The last one is "the"
    /// historical order; the earlier one gives the test order's month a basis to be compared against.
    /// </summary>
    public static readonly IReadOnlyList<SandboxOrder> HistoricalOrders =
    [
        new(
            Location1,
            new DateOnly(2026, 7, 1),
            [
                new(0, 100m, 0.35m),
                new(1, 30m, 2.60m),
                new(2, 50m, 1.10m),
                new(3, 8m, 6.00m),
                new(4, 20m, 1.80m),
            ]),
        new(
            Location1,
            new DateOnly(2026, 8, 1),
            [
                new(0, 110m, 0.35m),
                new(1, 35m, 2.70m),
                new(2, 55m, 1.20m),
                new(3, 10m, 6.00m),
                new(4, 22m, 1.80m),
            ]),
    ];

    /// <summary>What the real migration wrote beside every carried-in order, word for word.</summary>
    public const string HistoricalComment = "Tarixi sifariş sistemə artıq təsdiqlənmiş kimi köçürülüb.";
}

public sealed record SandboxAccount(string UserName, string DisplayName, string Role);

public sealed record SandboxLocation(string Code, string Name);

public sealed record SandboxProduct(string Name, string UnitCode);

/// <param name="Product">An index into <see cref="SandboxScenario.Products"/>.</param>
/// <param name="UnitPrice">Null for a line whose price nobody has given.</param>
public sealed record SandboxLine(int Product, decimal Quantity, decimal? UnitPrice);

public sealed record SandboxOrder(SandboxLocation Location, DateOnly Period, IReadOnlyList<SandboxLine> Lines);

/// <summary>What <c>--create</c> made, by id, so it can be reported and found again.</summary>
/// <param name="HistoricalOrderIds">Oldest first; the last is the historical order the panel sentence is read on.</param>
public sealed record SandboxContents(
    string DatabaseName,
    long TestOrderId,
    long DraftOrderId,
    IReadOnlyList<long> HistoricalOrderIds,
    IReadOnlyDictionary<string, Guid> AccountIds)
{
    public long HistoricalOrderId => HistoricalOrderIds[^1];
}

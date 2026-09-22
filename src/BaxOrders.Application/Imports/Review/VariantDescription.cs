namespace BaxOrders.Application.Imports.Review;

/// <summary>
/// How one product variant is written for a person: "50 sm · AB-12 · PCS".
/// </summary>
/// <remarks>
/// Used for both sides of a variant decision — the value as the sheet spells it and the canonical variants an
/// operator can choose — so the two are read the same way and cannot drift apart.
/// </remarks>
public static class VariantDescription
{
    public const string Separator = " · ";

    /// <summary>How a variant of a line that was explicitly reviewed as having no order unit is labelled.</summary>
    public const string Unitless = "vahidsiz";

    public static string Of(string? specificationValue, string? specificationUnit, string? modelCode, string? orderUnit)
    {
        var specification = Join(' ', specificationValue, specificationUnit);
        return Join(Separator, specification, modelCode, orderUnit);
    }

    private static string Join(char separator, params string?[] parts) => Join(separator.ToString(), parts);

    private static string Join(string separator, params string?[] parts) =>
        string.Join(separator, parts.Where(part => !string.IsNullOrWhiteSpace(part)).Select(part => part!.Trim()));
}

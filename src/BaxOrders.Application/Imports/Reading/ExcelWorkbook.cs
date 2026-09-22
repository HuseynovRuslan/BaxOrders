namespace BaxOrders.Application.Imports.Reading;

/// <summary>
/// Format-neutral workbook content produced by an <see cref="IExcelWorkbookReader"/>.
/// </summary>
/// <remarks>
/// Cell values are what the file stores: <see cref="string"/>, <see cref="double"/>, <see cref="bool"/>,
/// <see cref="DateTime"/> or null. Formulas are never evaluated; readers return the cached result saved in the file.
/// </remarks>
public sealed record ExcelWorkbook(IReadOnlyList<ExcelSheet> Sheets);

public sealed record ExcelSheet(string Name, IReadOnlyList<ExcelRow> Rows, bool IsHidden = false);

/// <param name="RowNumber">1-based worksheet row number, as shown in Excel.</param>
/// <param name="Cells">Cell values by 0-based column index.</param>
public sealed record ExcelRow(int RowNumber, IReadOnlyList<object?> Cells)
{
    public object? this[int column] => column >= 0 && column < Cells.Count ? Cells[column] : null;
}

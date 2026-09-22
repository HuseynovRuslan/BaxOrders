using System.Text;
using BaxOrders.Application.Imports.Reading;
using ExcelDataReader;

namespace BaxOrders.Infrastructure.Imports;

/// <summary>
/// Reads .xlsx and legacy .xls workbooks with ExcelDataReader (MIT licence, fully managed, no Excel installation).
/// ExcelDataReader only reads stored cell values: macros never run and formulas are not evaluated
/// (the cached result saved by Excel is returned).
/// </summary>
internal sealed class ExcelDataReaderWorkbookReader : IExcelWorkbookReader
{
    private const int CancellationCheckInterval = 500;

    static ExcelDataReaderWorkbookReader()
    {
        // Legacy .xls files store text in Windows code pages that .NET does not load by default.
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
    }

    public ExcelWorkbook Read(Stream content, ExcelFileFormat format, CancellationToken cancellationToken)
    {
        var configuration = new ExcelReaderConfiguration { LeaveOpen = true };

        try
        {
            using var reader = format switch
            {
                ExcelFileFormat.Xlsx => ExcelReaderFactory.CreateOpenXmlReader(content, configuration),
                ExcelFileFormat.Xls => ExcelReaderFactory.CreateBinaryReader(content, configuration),
                _ => throw new WorkbookReadException($"Unsupported workbook format {format}."),
            };

            var sheets = new List<ExcelSheet>();
            do
            {
                var rows = new List<ExcelRow>();
                var rowNumber = 0;

                while (reader.Read())
                {
                    rowNumber++;
                    if (rowNumber % CancellationCheckInterval == 0)
                    {
                        cancellationToken.ThrowIfCancellationRequested();
                    }

                    var cells = new object?[reader.FieldCount];
                    for (var column = 0; column < cells.Length; column++)
                    {
                        cells[column] = reader.GetValue(column);
                    }

                    rows.Add(new ExcelRow(rowNumber, cells));
                }

                var hidden = !string.Equals(reader.VisibleState, "visible", StringComparison.OrdinalIgnoreCase);
                sheets.Add(new ExcelSheet(reader.Name ?? $"Sheet{sheets.Count + 1}", rows, hidden));
            }
            while (reader.NextResult());

            return new ExcelWorkbook(sheets);
        }
        catch (Exception exception) when (exception is not (WorkbookReadException or OperationCanceledException))
        {
            throw new WorkbookReadException(
                $"The file could not be read as a .{format.ToString().ToLowerInvariant()} workbook. It may be damaged, encrypted or of another type.",
                exception);
        }
    }
}

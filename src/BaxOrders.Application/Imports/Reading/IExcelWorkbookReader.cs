namespace BaxOrders.Application.Imports.Reading;

/// <summary>
/// Reads a workbook into <see cref="ExcelWorkbook"/>. Implementations must not execute macros or evaluate formulas.
/// </summary>
public interface IExcelWorkbookReader
{
    /// <exception cref="WorkbookReadException">The content is not a readable workbook of the given format.</exception>
    ExcelWorkbook Read(Stream content, ExcelFileFormat format, CancellationToken cancellationToken);
}

/// <summary>
/// The file could not be read as a workbook. The message is safe to store and show; it contains no stack trace.
/// </summary>
public sealed class WorkbookReadException(string message, Exception? innerException = null)
    : Exception(message, innerException);

namespace BaxOrders.Application.Imports.Reading;

public enum ExcelFileFormat
{
    /// <summary>Office Open XML workbook (a ZIP package). The standard format.</summary>
    Xlsx = 1,

    /// <summary>Legacy Excel 97–2003 binary workbook (an OLE2 compound file).</summary>
    Xls = 2,
}

public static class ExcelFileFormats
{
    /// <summary>Number of leading bytes needed by <see cref="MatchesSignature"/>.</summary>
    public const int SignatureLength = 8;

    private static readonly byte[] ZipSignature = [0x50, 0x4B, 0x03, 0x04];
    private static readonly byte[] Ole2Signature = [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1];

    public static bool TryFromFileName(string? fileName, out ExcelFileFormat format)
    {
        var extension = Path.GetExtension(fileName ?? string.Empty);
        if (extension.Equals(".xlsx", StringComparison.OrdinalIgnoreCase))
        {
            format = ExcelFileFormat.Xlsx;
            return true;
        }

        if (extension.Equals(".xls", StringComparison.OrdinalIgnoreCase))
        {
            format = ExcelFileFormat.Xls;
            return true;
        }

        format = default;
        return false;
    }

    /// <summary>
    /// Checks the file's magic bytes, so a renamed file of another type is rejected before parsing.
    /// </summary>
    public static bool MatchesSignature(ReadOnlySpan<byte> header, ExcelFileFormat format) => format switch
    {
        ExcelFileFormat.Xlsx => header.StartsWith(ZipSignature),
        ExcelFileFormat.Xls => header.StartsWith(Ole2Signature),
        _ => false,
    };
}

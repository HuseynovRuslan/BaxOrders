using System.IO.Compression;
using System.Security;
using System.Text;
using BaxOrders.Application.Imports.Parsing;
using BaxOrders.Application.Imports.Reading;
using BaxOrders.Infrastructure.Imports;

namespace BaxOrders.UnitTests.Imports;

public sealed class ExcelDataReaderWorkbookReaderTests
{
    private readonly ExcelDataReaderWorkbookReader _reader = new();

    [Fact]
    public void Reads_a_generated_xlsx_like_the_real_workbook()
    {
        // Header on row 3, empty column A, text with spaces, a numeric cell and a date-formatted cell.
        using var file = MinimalXlsx("Əsas",
            (3, [("B", "Malın adı"), ("C", "Miqdarı"), ("D", "Ö/v"), ("E", "Obyekt"), ("F", "Tarix")]),
            (4, [("B", "Makaron mop"), ("C", 43d), ("D", "ədəd"), ("E", " H.Ə.M "), ("F", new DateTime(2026, 3, 18))]));

        var workbook = _reader.Read(file, ExcelFileFormat.Xlsx, CancellationToken.None);

        var sheet = Assert.Single(workbook.Sheets);
        Assert.Equal("Əsas", sheet.Name);
        Assert.False(sheet.IsHidden);

        var header = ImportHeaders.Detect(sheet, 30);
        Assert.Equal(3, header.Layout?.HeaderRowNumber);

        var data = sheet.Rows.Single(row => row.RowNumber == 4);
        Assert.Equal("Makaron mop", data[1]);
        Assert.Equal(43d, data[2]);
        Assert.Equal(" H.Ə.M ", data[4]);
        Assert.Equal(new DateTime(2026, 3, 18), data[5]);
    }

    [Theory]
    [InlineData(ExcelFileFormat.Xlsx)]
    [InlineData(ExcelFileFormat.Xls)]
    public void Unreadable_content_raises_a_clean_workbook_error(ExcelFileFormat format)
    {
        using var garbage = new MemoryStream(Encoding.ASCII.GetBytes("this is not a workbook at all"));

        var exception = Assert.Throws<WorkbookReadException>(() => _reader.Read(garbage, format, CancellationToken.None));
        Assert.DoesNotContain("   at ", exception.Message);
    }

    /// <summary>Builds the smallest valid .xlsx package: inline strings, numbers and one date style.</summary>
    private static MemoryStream MinimalXlsx(string sheetName, params (int Row, (string Column, object Value)[] Cells)[] rows)
    {
        const string main = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
        const string relationships = "http://schemas.openxmlformats.org/package/2006/relationships";
        const string documentRelationships = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

        var sheetData = new StringBuilder();
        foreach (var (rowNumber, cells) in rows)
        {
            sheetData.Append($"<row r=\"{rowNumber}\">");
            foreach (var (column, value) in cells)
            {
                var reference = $"{column}{rowNumber}";
                sheetData.Append(value switch
                {
                    string text => $"<c r=\"{reference}\" t=\"inlineStr\"><is><t xml:space=\"preserve\">{SecurityElement.Escape(text)}</t></is></c>",
                    DateTime date => $"<c r=\"{reference}\" s=\"1\"><v>{(date - new DateTime(1899, 12, 30)).TotalDays}</v></c>",
                    double number => $"<c r=\"{reference}\"><v>{number.ToString(System.Globalization.CultureInfo.InvariantCulture)}</v></c>",
                    _ => throw new ArgumentOutOfRangeException(nameof(rows)),
                });
            }

            sheetData.Append("</row>");
        }

        var parts = new Dictionary<string, string>
        {
            ["[Content_Types].xml"] =
                "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">" +
                "<Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>" +
                "<Default Extension=\"xml\" ContentType=\"application/xml\"/>" +
                "<Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/>" +
                "<Override PartName=\"/xl/worksheets/sheet1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/>" +
                "<Override PartName=\"/xl/styles.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml\"/>" +
                "</Types>",
            ["_rels/.rels"] =
                $"<Relationships xmlns=\"{relationships}\"><Relationship Id=\"rId1\" Type=\"{documentRelationships}/officeDocument\" Target=\"xl/workbook.xml\"/></Relationships>",
            ["xl/workbook.xml"] =
                $"<workbook xmlns=\"{main}\" xmlns:r=\"{documentRelationships}\"><sheets><sheet name=\"{SecurityElement.Escape(sheetName)}\" sheetId=\"1\" r:id=\"rId1\"/></sheets></workbook>",
            ["xl/_rels/workbook.xml.rels"] =
                $"<Relationships xmlns=\"{relationships}\">" +
                $"<Relationship Id=\"rId1\" Type=\"{documentRelationships}/worksheet\" Target=\"worksheets/sheet1.xml\"/>" +
                $"<Relationship Id=\"rId2\" Type=\"{documentRelationships}/styles\" Target=\"styles.xml\"/></Relationships>",
            ["xl/styles.xml"] =
                $"<styleSheet xmlns=\"{main}\"><fonts count=\"1\"><font/></fonts><fills count=\"1\"><fill/></fills>" +
                "<borders count=\"1\"><border/></borders><cellStyleXfs count=\"1\"><xf/></cellStyleXfs>" +
                "<cellXfs count=\"2\"><xf numFmtId=\"0\"/><xf numFmtId=\"14\" applyNumberFormat=\"1\"/></cellXfs></styleSheet>",
            ["xl/worksheets/sheet1.xml"] = $"<worksheet xmlns=\"{main}\"><sheetData>{sheetData}</sheetData></worksheet>",
        };

        var stream = new MemoryStream();
        using (var archive = new ZipArchive(stream, ZipArchiveMode.Create, leaveOpen: true))
        {
            foreach (var (name, xml) in parts)
            {
                using var writer = new StreamWriter(archive.CreateEntry(name).Open(), new UTF8Encoding(false));
                writer.Write("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>" + xml);
            }
        }

        stream.Position = 0;
        return stream;
    }
}

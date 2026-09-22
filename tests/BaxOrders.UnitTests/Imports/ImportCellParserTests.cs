using System.Globalization;
using BaxOrders.Application.Imports.Parsing;

namespace BaxOrders.UnitTests.Imports;

public sealed class ImportCellParserTests
{
    [Theory]
    [InlineData(43d, "43")]
    [InlineData(1.2d, "1.2")]
    [InlineData(0.30000000000000004d, "0.3")]
    public void Native_numeric_cells_are_read_without_binary_noise(double cell, string expected)
    {
        var result = ImportCellParser.ParseDecimal(cell, 18, 3);

        Assert.Equal(ParseOutcome.Parsed, result.Outcome);
        Assert.Equal(decimal.Parse(expected, CultureInfo.InvariantCulture), result.Value);
    }

    [Theory]
    [InlineData("4,5", "4.5")]
    [InlineData("4.5", "4.5")]
    [InlineData(" 12 ", "12")]
    [InlineData("0,500", "0.5")]
    [InlineData("1234,5", "1234.5")]
    public void Unambiguous_text_decimals_are_accepted(string cell, string expected)
    {
        var result = ImportCellParser.ParseDecimal(cell, 18, 3);

        Assert.Equal(ParseOutcome.Parsed, result.Outcome);
        Assert.Equal(decimal.Parse(expected, CultureInfo.InvariantCulture), result.Value);
    }

    [Theory]
    [InlineData("1,500")]
    [InlineData("1.500")]
    [InlineData("12.345")]
    public void Possible_thousands_separators_are_rejected_as_ambiguous(string cell)
    {
        var result = ImportCellParser.ParseDecimal(cell, 18, 3);

        Assert.Equal(ParseOutcome.Invalid, result.Outcome);
        Assert.Contains("ambiguous", result.Problem);
    }

    [Theory]
    [InlineData("abc")]
    [InlineData("1 000")]
    [InlineData("1.000,5")]
    [InlineData("4,5 kq")]
    public void Text_that_is_not_a_plain_number_is_rejected(string cell)
    {
        Assert.Equal(ParseOutcome.Invalid, ImportCellParser.ParseDecimal(cell, 18, 3).Outcome);
    }

    [Fact]
    public void Excessive_precision_is_rejected_instead_of_rounded()
    {
        var native = ImportCellParser.ParseDecimal(1.2345d, 18, 3);
        var text = ImportCellParser.ParseDecimal("1,2345", 18, 3);

        Assert.Equal(ParseOutcome.Invalid, native.Outcome);
        Assert.Contains("decimal places", native.Problem);
        Assert.Equal(ParseOutcome.Invalid, text.Outcome);
    }

    [Fact]
    public void Four_decimals_fit_a_price_column()
    {
        Assert.Equal(1.2345m, ImportCellParser.ParseDecimal(1.2345d, 18, 4).Value);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Empty_cells_are_blank(string? cell)
    {
        Assert.Equal(ParseOutcome.Blank, ImportCellParser.ParseDecimal(cell, 18, 3).Outcome);
        Assert.Equal(ParseOutcome.Blank, ImportCellParser.ParseDate(cell).Outcome);
    }

    [Fact]
    public void Date_cell_is_not_a_number()
    {
        Assert.Equal(ParseOutcome.Invalid, ImportCellParser.ParseDecimal(new DateTime(2026, 3, 18), 18, 3).Outcome);
    }

    [Fact]
    public void Native_date_cells_become_business_dates()
    {
        Assert.Equal(new DateOnly(2026, 3, 18), ImportCellParser.ParseDate(new DateTime(2026, 3, 18)).Value);
        Assert.Equal(new DateOnly(2026, 3, 18), ImportCellParser.ParseDate(new DateTime(2026, 3, 18, 14, 30, 0)).Value);
    }

    [Theory]
    [InlineData("18.03.2026")]
    [InlineData("18.3.2026")]
    [InlineData(" 18/03/2026 ")]
    [InlineData("2026-03-18")]
    public void Text_dates_are_accepted_in_day_first_or_iso_format(string cell)
    {
        var result = ImportCellParser.ParseDate(cell);

        Assert.Equal(ParseOutcome.Parsed, result.Outcome);
        Assert.Equal(new DateOnly(2026, 3, 18), result.Value);
    }

    [Theory]
    [InlineData("03/18/2026")]
    [InlineData("18.13.2026")]
    [InlineData("mart 2026")]
    [InlineData("18.03.1899")]
    public void Unreadable_or_implausible_text_dates_are_rejected(string cell)
    {
        Assert.Equal(ParseOutcome.Invalid, ImportCellParser.ParseDate(cell).Outcome);
    }

    [Fact]
    public void Plain_numbers_are_not_guessed_as_serial_dates()
    {
        Assert.Equal(ParseOutcome.Invalid, ImportCellParser.ParseDate(46099d).Outcome);
    }

    [Fact]
    public void Source_text_keeps_what_the_cell_stores()
    {
        Assert.Equal(" H.Ə.M ", ImportCellParser.ToSourceText(" H.Ə.M "));
        Assert.Equal("1.2", ImportCellParser.ToSourceText(1.2d));
        Assert.Equal("2026-01-01", ImportCellParser.ToSourceText(new DateTime(2026, 1, 1)));
        Assert.Null(ImportCellParser.ToSourceText(null));
    }
}

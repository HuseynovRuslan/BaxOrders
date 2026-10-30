using System.Reflection;
using BaxOrders.Domain.Imports;

namespace BaxOrders.UnitTests.Imports;

/// <summary>
/// Every kind of import issue the server can send has a name the screens can show.
/// </summary>
/// <remarks>
/// This is a cross-language contract TypeScript cannot check for itself. The browser's list of issue kinds is a
/// union of string literals and its labels are a <c>Record</c> over that union, so a kind missing from the union
/// is also missing from the labels — and every screen that shows an issue then renders the literal word
/// <c>undefined</c> beside its row count.
/// <para>
/// That is not hypothetical: <c>UnknownOrderLineType</c> was added to the server and not to the browser, and the
/// authoritative workbook raises it on 480 rows. The row list, the row dialog, the correction centre and the
/// readiness panel all showed <c>undefined</c> until this test was written.
/// </para>
/// </remarks>
public sealed class IssueVocabularyTests
{
    // Forward slashes: they separate paths on Windows and on Linux (the CI runner) alike; a backslash does not.
    private const string UnionFile = "frontend/bax-orders-web/src/api/imports.ts";
    private const string LabelFile = "frontend/bax-orders-web/src/components/imports/labels.ts";

    public static TheoryData<string> IssueTypes()
    {
        var data = new TheoryData<string>();
        foreach (var name in Enum.GetNames<ImportIssueType>())
        {
            data.Add(name);
        }

        return data;
    }

    [Theory]
    [MemberData(nameof(IssueTypes))]
    public void Every_issue_kind_is_in_the_browser_s_list_of_issue_kinds(string issueType)
    {
        var union = IssueTypeUnion();

        Assert.Contains($"'{issueType}'", union, StringComparison.Ordinal);
    }

    [Theory]
    [MemberData(nameof(IssueTypes))]
    public void Every_issue_kind_has_a_name_a_screen_can_show(string issueType)
    {
        var labels = Section(Read(LabelFile), "export const issueTypeLabels", "}");

        Assert.Contains($"{issueType}:", labels, StringComparison.Ordinal);
    }

    /// <summary>The browser knows no kind the server cannot send, so a stale label can never be the reason one is shown.</summary>
    [Fact]
    public void The_browser_knows_no_issue_kind_the_server_cannot_send()
    {
        var union = IssueTypeUnion();
        var known = Enum.GetNames<ImportIssueType>();

        // A member may carry a doc comment of its own; it is prose about the kind, not another kind.
        var members = System.Text.RegularExpressions.Regex.Replace(union, @"/\*.*?\*/", string.Empty,
            System.Text.RegularExpressions.RegexOptions.Singleline);

        var listed = members.Split('|', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(entry => entry.Trim().Trim('\'', '"'))
            .Where(entry => entry.Length > 0 && char.IsUpper(entry[0]))
            .ToList();

        Assert.NotEmpty(listed);
        Assert.Equal(known.Order(), listed.Order());
    }

    /// <summary>
    /// The union of issue kinds as the browser declares it.
    /// </summary>
    /// <remarks>
    /// The declaration carries no trailing semicolon, so the blank line after its last member is what bounds it.
    /// Read past that and the next declaration's members would look like issue kinds.
    /// </remarks>
    private static string IssueTypeUnion()
    {
        var blankLine = Environment.NewLine + Environment.NewLine;
        var file = Read(UnionFile).ReplaceLineEndings();

        return Section(file, "export type IssueType =", blankLine);
    }

    /// <summary>The text between a marker and the first terminator after it.</summary>
    private static string Section(string file, string from, string until)
    {
        var start = file.IndexOf(from, StringComparison.Ordinal);
        Assert.True(start >= 0, $"'{from}' was not found; the file has been reorganised and this test must follow it.");

        var end = file.IndexOf(until, start + from.Length, StringComparison.Ordinal);
        Assert.True(end > start, $"'{until}' was not found after '{from}'.");

        return file[start..end];
    }

    private static string Read(string relativePath) =>
        File.ReadAllText(Path.Combine(RepositoryRoot(), relativePath));

    /// <summary>The directory holding the solution file, found by walking up from the test assembly.</summary>
    private static string RepositoryRoot()
    {
        var directory = new DirectoryInfo(Path.GetDirectoryName(typeof(IssueVocabularyTests).Assembly.Location)!);
        while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "BaxOrders.slnx")))
        {
            directory = directory.Parent;
        }

        Assert.NotNull(directory);
        return directory.FullName;
    }
}

using BaxOrders.Application.Orders;

namespace BaxOrders.UnitTests.Orders;

/// <summary>
/// What a whole request says about who it is answerable to, when the fact itself lives on its lines.
/// </summary>
/// <remarks>
/// Four answers and no fifth. The one this exists to refuse is the fifth: the person with the most lines. A
/// request of forty cleaning lines and one fuel line is not the cleaner's order, and a heading that said so
/// would put a name on a decision nobody made. Where the lines disagree the request says they disagree, and
/// whose each line is stays beside the line.
/// </remarks>
public sealed class OrderResponsibilityTests
{
    [Fact]
    public void A_request_whose_lines_all_name_one_person_is_that_person_s()
    {
        var result = OrderResponsibility.Of(null, null, [(7, "Eldar"), (7, "Eldar"), (7, "Eldar")]);

        Assert.Equal(OrderResponsibilityKind.AgreedOnLines, result.Kind);
        Assert.Equal(7, result.PersonId);
        Assert.Equal("Eldar", result.PersonName);
        Assert.Equal(1, result.DistinctPersonCount);
        Assert.Equal(3, result.NamedLineCount);
    }

    /// <summary>
    /// Thirty-seven lines to one person and two to another is still two people. This is the shape of request 5
    /// of the history, and the answer it gets is "several", not "Eldar".
    /// </summary>
    [Fact]
    public void A_lopsided_split_is_still_several_people_and_never_the_commoner_one()
    {
        var lines = Enumerable.Repeat((7, "Eldar"), 37).Concat(Enumerable.Repeat((4, "Çingiz"), 2)).ToList();

        var result = OrderResponsibility.Of(null, null, lines);

        Assert.Equal(OrderResponsibilityKind.Several, result.Kind);
        Assert.Null(result.PersonId);
        Assert.Null(result.PersonName);
        Assert.Equal(2, result.DistinctPersonCount);
        Assert.Equal(39, result.NamedLineCount);
    }

    [Fact]
    public void Three_people_in_one_request_are_three_and_not_one_of_them()
    {
        var result = OrderResponsibility.Of(null, null, [(7, "Eldar"), (4, "Çingiz"), (12, "Elmir")]);

        Assert.Equal(OrderResponsibilityKind.Several, result.Kind);
        Assert.Equal(3, result.DistinctPersonCount);
    }

    [Fact]
    public void A_request_no_line_names_anybody_on_names_nobody()
    {
        var result = OrderResponsibility.Of(null, null, []);

        Assert.Equal(OrderResponsibilityKind.None, result.Kind);
        Assert.Null(result.PersonId);
        Assert.Equal(0, result.DistinctPersonCount);
        Assert.Equal(0, result.NamedLineCount);
    }

    // ---- an explicit assignment --------------------------------------------------------------------------

    /// <summary>
    /// Request 76 of the history: forty lines say Çingiz, one fuel line says Xəyal, and the business decided the
    /// order was Çingiz's. The decision is shown, and the fuel line still says what it says.
    /// </summary>
    [Fact]
    public void An_assignment_wins_over_what_the_lines_say()
    {
        var lines = Enumerable.Repeat((4, "Çingiz"), 40).Append((8, "Xəyal")).ToList();

        var result = OrderResponsibility.Of(4, "Çingiz", lines);

        Assert.Equal(OrderResponsibilityKind.Assigned, result.Kind);
        Assert.Equal(4, result.PersonId);
        Assert.Equal("Çingiz", result.PersonName);
        // The lines are still reported as they are; the assignment does not rewrite them.
        Assert.Equal(2, result.DistinctPersonCount);
    }

    /// <summary>
    /// Request 104: every line says Aydın and the business said the order was Qədeş's. An assignment that
    /// agreed with the lines would not need to exist, so this is the case that proves it is not derived.
    /// </summary>
    [Fact]
    public void An_assignment_naming_somebody_no_line_names_is_still_the_answer()
    {
        var result = OrderResponsibility.Of(9, "Qədeş", [(3, "Aydın"), (3, "Aydın"), (3, "Aydın")]);

        Assert.Equal(OrderResponsibilityKind.Assigned, result.Kind);
        Assert.Equal(9, result.PersonId);
        Assert.Equal("Qədeş", result.PersonName);
    }

    [Fact]
    public void An_assignment_on_a_request_whose_lines_name_nobody_is_still_the_answer()
    {
        var result = OrderResponsibility.Of(4, "Çingiz", []);

        Assert.Equal(OrderResponsibilityKind.Assigned, result.Kind);
        Assert.Equal("Çingiz", result.PersonName);
    }

    /// <summary>
    /// A caller that did not load the assigned person's name still gets a readable answer when the lines name
    /// the same person. The kind stays Assigned either way: how it is displayed is not how it was decided.
    /// </summary>
    [Fact]
    public void An_assignment_with_no_name_loaded_falls_back_to_the_name_its_lines_use()
    {
        var result = OrderResponsibility.Of(7, null, [(7, "Eldar"), (4, "Çingiz")]);

        Assert.Equal(OrderResponsibilityKind.Assigned, result.Kind);
        Assert.Equal("Eldar", result.PersonName);
    }

    [Fact]
    public void An_assignment_nobody_can_name_reports_the_id_without_inventing_a_name()
    {
        var result = OrderResponsibility.Of(99, null, [(7, "Eldar")]);

        Assert.Equal(OrderResponsibilityKind.Assigned, result.Kind);
        Assert.Equal(99, result.PersonId);
        Assert.Null(result.PersonName);
    }

    /// <summary>
    /// Lines with nobody on them are simply not passed in, so they cannot tip the answer. A request where one
    /// person's lines sit beside unnamed ones is that person's, not "several".
    /// </summary>
    [Fact]
    public void Lines_with_nobody_on_them_do_not_make_a_request_several()
    {
        var result = OrderResponsibility.Of(null, null, [(7, "Eldar"), (7, "Eldar")]);

        Assert.Equal(OrderResponsibilityKind.AgreedOnLines, result.Kind);
        Assert.Equal(2, result.NamedLineCount);
    }
}

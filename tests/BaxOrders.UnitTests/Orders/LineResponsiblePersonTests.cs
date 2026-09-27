using BaxOrders.Domain;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Orders;
using BaxOrders.Domain.ResponsiblePeople;
using BaxOrders.UnitTests.TestSupport;

namespace BaxOrders.UnitTests.Orders;

/// <summary>
/// Who asked for one line, on the line.
/// </summary>
/// <remarks>
/// The order workbook writes "Cavabdeh şəxs" beside every line, and one request routinely carries two or three
/// people's lines. So what the domain has to get right is that the fact belongs to the line and survives
/// everything done to the line: a correction copies it, a change to it is audited by name, and nobody is ever
/// invented for a line that names nobody.
/// </remarks>
public sealed class LineResponsiblePersonTests
{
    private static readonly DateTime Now = new(2026, 9, 27, 10, 0, 0, DateTimeKind.Utc);
    private static readonly DateOnly July = new(2026, 7, 1);
    private static readonly WorkflowActor Coordinator = WorkflowActor.User(Guid.NewGuid(), "Sınaq koordinatoru");
    private static readonly WorkflowActor Manager = WorkflowActor.User(Guid.NewGuid(), "Sınaq rəhbəri");

    // ---- what a line starts as ------------------------------------------------------------------------

    /// <summary>
    /// A line added by hand names nobody. Unlike the classification there is no ordinary case to offer: who
    /// asked for something is not a value with a sensible default, and filling in whoever is convenient would
    /// put a colleague's name on a line they never asked for.
    /// </summary>
    [Fact]
    public void A_line_added_by_hand_names_nobody()
    {
        var request = new OrderRequest(Location(), July);

        var item = request.AddItem(Variant(), 3m, 4m);

        Assert.Null(item.ResponsiblePersonId);
        Assert.Null(item.ResponsiblePerson);
    }

    [Fact]
    public void A_line_keeps_the_person_it_was_created_with()
    {
        var request = new OrderRequest(Location(), July);
        var eldar = Person("Eldar", 7);

        var item = request.AddItem(Variant(), 3m, 4m, responsiblePerson: eldar);

        Assert.Equal(7, item.ResponsiblePersonId);
        Assert.Same(eldar, item.ResponsiblePerson);
    }

    /// <summary>
    /// Two people in one request, which is the case this whole shape exists for. Neither line is changed to
    /// agree with the other, and nothing collapses them into one answer.
    /// </summary>
    [Fact]
    public void One_request_holds_the_lines_of_two_different_people()
    {
        var request = new OrderRequest(Location(), July);

        var cleaning = request.AddItem(Variant("Makaron mop"), 3m, 4m, responsiblePerson: Person("Eldar", 7));
        var fuel = request.AddItem(Variant("Benzin"), 20m, 1.25m, responsiblePerson: Person("Çingiz", 4));

        Assert.Equal(7, cleaning.ResponsiblePersonId);
        Assert.Equal(4, fuel.ResponsiblePersonId);
    }

    [Fact]
    public void An_inactive_person_cannot_be_put_on_a_new_line()
    {
        var request = new OrderRequest(Location(), July);
        var retired = Person("Aydın", 3);
        retired.Deactivate();

        var refusal = Assert.Throws<DomainException>(
            () => request.AddItem(Variant(), 3m, 4m, responsiblePerson: retired));

        Assert.Contains("Aydın", refusal.Message, StringComparison.Ordinal);
    }

    // ---- a correction ---------------------------------------------------------------------------------

    /// <summary>
    /// The reason it is copied at all: a corrected order that lost this would leave every line looking like
    /// nobody's, and would change what the order as a whole reads as.
    /// </summary>
    [Fact]
    public void A_correction_keeps_who_asked_for_each_line()
    {
        var source = Returned(request =>
        {
            request.AddItem(Variant("Makaron mop"), 3m, 4m, responsiblePerson: Person("Eldar", 7));
            request.AddItem(Variant("Benzin"), 20m, 1.25m, responsiblePerson: Person("Çingiz", 4));
            request.AddItem(Variant("Torf"), 1m, 18m);
        });

        var copies = source.CreateRevision(Coordinator, Now).Items.ToList();

        Assert.Equal([7, 4, null], copies.Select(item => item.ResponsiblePersonId));
        Assert.Equal("Eldar", copies[0].ResponsiblePerson!.Name);
    }

    // ---- changing it ----------------------------------------------------------------------------------

    [Fact]
    public void Moving_a_line_to_another_person_is_recorded_by_name()
    {
        var revision = RevisionOf(Person("Eldar", 7));
        var line = revision.Items.Single();

        var entry = revision.ChangeItemResponsiblePerson(line, Person("Çingiz", 4), Coordinator, Now);

        Assert.NotNull(entry);
        Assert.Equal(OrderEditAction.ItemResponsiblePersonChanged, entry.Action);
        Assert.Equal(OrderEditField.ResponsiblePerson, entry.Field);
        Assert.Contains("Eldar", entry.OldValue!, StringComparison.Ordinal);
        Assert.Contains("Çingiz", entry.NewValue!, StringComparison.Ordinal);
        Assert.Equal(4, line.ResponsiblePersonId);
    }

    [Fact]
    public void Naming_the_person_a_line_already_names_records_nothing()
    {
        var eldar = Person("Eldar", 7);
        var revision = RevisionOf(eldar);
        var line = revision.Items.Single();

        Assert.Null(revision.ChangeItemResponsiblePerson(line, eldar, Coordinator, Now));
        Assert.Null(revision.ChangeItemResponsiblePerson(line, Person("Eldar", 7), Coordinator, Now));
        Assert.Equal(7, line.ResponsiblePersonId);
    }

    /// <summary>
    /// Taking the person off a line is a real answer — the source may not have said — and is audited like any
    /// other change, with the person who was there named in the old value.
    /// </summary>
    [Fact]
    public void Taking_the_person_off_a_line_is_allowed_and_audited()
    {
        var revision = RevisionOf(Person("Eldar", 7));
        var line = revision.Items.Single();

        var entry = revision.ChangeItemResponsiblePerson(line, null, Coordinator, Now);

        Assert.NotNull(entry);
        Assert.Contains("Eldar", entry.OldValue!, StringComparison.Ordinal);
        Assert.Null(entry.NewValue);
        Assert.Null(line.ResponsiblePersonId);
        Assert.Null(line.ResponsiblePerson);
    }

    [Fact]
    public void Putting_a_person_on_a_line_that_had_none_is_audited_the_same_way()
    {
        var revision = RevisionOf(null);
        var line = revision.Items.Single();

        var entry = revision.ChangeItemResponsiblePerson(line, Person("Çingiz", 4), Coordinator, Now);

        Assert.NotNull(entry);
        Assert.Null(entry.OldValue);
        Assert.Contains("Çingiz", entry.NewValue!, StringComparison.Ordinal);
    }

    [Fact]
    public void An_inactive_person_cannot_be_put_on_an_existing_line()
    {
        var revision = RevisionOf(Person("Eldar", 7));
        var line = revision.Items.Single();
        var retired = Person("Aydın", 3);
        retired.Deactivate();

        Assert.Throws<DomainException>(() => revision.ChangeItemResponsiblePerson(line, retired, Coordinator, Now));
        Assert.Equal(7, line.ResponsiblePersonId);
    }

    /// <summary>
    /// The history names the person a line is moving away from, so the record has to be loaded to be named.
    /// Recording half of it — an id with no name — would leave the entry unreadable later.
    /// </summary>
    [Fact]
    public void A_person_that_is_not_loaded_refuses_the_change_rather_than_recording_half_of_it()
    {
        var revision = RevisionOf(Person("Eldar", 7));
        var line = revision.Items.Single();
        TestEntities.With<OrderRequestItem>(line, nameof(OrderRequestItem.ResponsiblePerson), null!);

        Assert.Throws<InvalidOperationException>(
            () => revision.ChangeItemResponsiblePerson(line, Person("Çingiz", 4), Coordinator, Now));
    }

    [Fact]
    public void A_line_of_another_request_is_refused()
    {
        var revision = RevisionOf(Person("Eldar", 7));
        var stranger = new OrderRequest(Location(), July).AddItem(Variant(), 1m, 1m);

        Assert.Throws<DomainException>(
            () => revision.ChangeItemResponsiblePerson(stranger, Person("Çingiz", 4), Coordinator, Now));
    }

    // ---- the world ------------------------------------------------------------------------------------

    private static Location Location() => new("HEM", "Heydər Əliyev Mərkəzi");

    private static ProductVariant Variant(string name = "Bel") =>
        new Product("PRD-000001", name).AddVariant(null, null, null, TestEntities.Pieces());

    private static ResponsiblePerson Person(string name, int id) =>
        TestEntities.WithId(new ResponsiblePerson(name), id);

    private static OrderRequest Returned(Action<OrderRequest> lines)
    {
        var request = new OrderRequest(Location(), July);
        lines(request);
        request.SubmitForApproval(Coordinator, null, Now.AddHours(-2));
        request.ReturnForCorrection(Manager, "Cavabdehlər yoxlanmalıdır", Now.AddHours(-1));
        return request;
    }

    /// <summary>An editable correction holding one line, with the person it should start with.</summary>
    private static OrderRequest RevisionOf(ResponsiblePerson? person)
    {
        var source = Returned(request => request.AddItem(Variant(), 3m, 4m, responsiblePerson: person));
        return source.CreateRevision(Coordinator, Now);
    }
}

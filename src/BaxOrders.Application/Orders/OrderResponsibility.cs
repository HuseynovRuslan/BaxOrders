namespace BaxOrders.Application.Orders;

/// <summary>How a request comes to have a responsible person, or to have none.</summary>
public enum OrderResponsibilityKind
{
    /// <summary>Nothing names anybody: no assignment, and no line carries a person.</summary>
    None = 0,

    /// <summary>Somebody assigned the whole request to one person, and that decision is what is shown.</summary>
    Assigned = 1,

    /// <summary>No assignment, and every line that names somebody names the same person.</summary>
    AgreedOnLines = 2,

    /// <summary>No assignment, and the lines name two or more different people.</summary>
    Several = 3,
}

/// <param name="PersonId">The person to show. Null for <see cref="OrderResponsibilityKind.Several"/> and <see cref="OrderResponsibilityKind.None"/>.</param>
/// <param name="DistinctPersonCount">How many different people the lines name. Context, never a ranking.</param>
/// <param name="NamedLineCount">How many lines name somebody at all.</param>
public sealed record OrderResponsibilityDto(
    OrderResponsibilityKind Kind,
    int? PersonId,
    string? PersonName,
    int DistinctPersonCount,
    int NamedLineCount);

/// <summary>
/// Who a whole request is answerable to, decided in one place.
/// </summary>
/// <remarks>
/// The responsible person is a fact about a line, because that is where the source states it. A request still
/// has to say something about itself, and this is the whole of that rule:
/// <list type="number">
/// <item>An explicit assignment on the request wins. It is a decision somebody made, not a summary of the
/// lines, so it stands even where the lines say otherwise — which is exactly the case it exists for.</item>
/// <item>Otherwise, if every line that names somebody names the same person, that is the person.</item>
/// <item>Otherwise, if the lines name several people, the answer is that there are several. Never the one with
/// the most lines: a request of forty cleaning lines and one fuel line is not "the cleaner's order", and
/// picking by count would put a name on an order nobody assigned.</item>
/// <item>Otherwise nobody is named, and the answer says so rather than inventing one.</item>
/// </list>
/// </remarks>
public static class OrderResponsibility
{
    /// <param name="assignedPersonId">The request's own explicit assignment, if it has one.</param>
    /// <param name="assignedPersonName">That person's name, needed only when there is an assignment.</param>
    /// <param name="linePeople">One entry per line that names somebody: the person's id and name. Duplicates expected.</param>
    public static OrderResponsibilityDto Of(
        int? assignedPersonId,
        string? assignedPersonName,
        IReadOnlyCollection<(int PersonId, string PersonName)> linePeople)
    {
        ArgumentNullException.ThrowIfNull(linePeople);

        var distinct = linePeople.DistinctBy(person => person.PersonId).ToList();

        if (assignedPersonId is { } assigned)
        {
            return new OrderResponsibilityDto(
                OrderResponsibilityKind.Assigned,
                assigned,
                // The assignment's own name, falling back to the lines only if the caller did not load it.
                assignedPersonName ?? distinct.FirstOrDefault(person => person.PersonId == assigned).PersonName,
                distinct.Count,
                linePeople.Count);
        }

        return distinct.Count switch
        {
            0 => new OrderResponsibilityDto(OrderResponsibilityKind.None, null, null, 0, 0),
            1 => new OrderResponsibilityDto(
                OrderResponsibilityKind.AgreedOnLines, distinct[0].PersonId, distinct[0].PersonName, 1, linePeople.Count),
            _ => new OrderResponsibilityDto(OrderResponsibilityKind.Several, null, null, distinct.Count, linePeople.Count),
        };
    }
}

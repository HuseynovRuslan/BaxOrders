using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;

namespace BaxOrders.DataTransfer;

/// <param name="Columns">Every mapped column, so a value is never dropped by being forgotten here.</param>
/// <param name="KeyColumns">The integer key columns whose sequences have to be moved past what was copied.</param>
public sealed record TablePlan(string Name, IReadOnlyList<string> Columns, IReadOnlyList<string> KeyColumns);

/// <summary>
/// The order the tables have to be written in, taken from the model rather than from a hand-written list.
/// </summary>
/// <remarks>
/// A table is written only after every table it points at, so no foreign key is ever unsatisfied mid-transfer
/// and nothing has to be disabled to make the copy work. Taking it from the model means a table added later
/// is ordered automatically instead of being left out of a list somebody forgot to update.
/// </remarks>
public static class TableOrder
{
    public static IReadOnlyList<TablePlan> Of(IModel model)
    {
        ArgumentNullException.ThrowIfNull(model);

        var byTable = new Dictionary<string, IEntityType>(StringComparer.Ordinal);
        foreach (var entity in model.GetEntityTypes())
        {
            if (entity.GetTableName() is { } name && !entity.IsOwned())
            {
                byTable.TryAdd(name, entity);
            }
        }

        var ordered = new List<TablePlan>();
        var state = new Dictionary<string, int>(StringComparer.Ordinal);

        foreach (var name in byTable.Keys.OrderBy(name => name, StringComparer.Ordinal))
        {
            Visit(name);
        }

        return ordered;

        void Visit(string name)
        {
            if (state.TryGetValue(name, out var mark))
            {
                // 1 means "being visited": a cycle. Self-references are legitimate here (a corrected line
                // points at the line it was copied from), and they resolve inside one table's own insert
                // order, so the table is simply placed where it already is.
                return;
            }

            state[name] = 1;
            var entity = byTable[name];

            foreach (var foreignKey in entity.GetForeignKeys())
            {
                var principal = foreignKey.PrincipalEntityType.GetTableName();
                if (principal is not null && principal != name && byTable.ContainsKey(principal))
                {
                    Visit(principal);
                }
            }

            state[name] = 2;
            ordered.Add(Plan(entity, name));
        }
    }

    private static TablePlan Plan(IEntityType entity, string name)
    {
        var columns = entity.GetProperties()
            .Select(property => property.GetColumnName())
            .Where(column => !string.IsNullOrEmpty(column))
            .Distinct(StringComparer.Ordinal)
            .ToList();

        // Only the keys a database generates need their sequence moved on afterwards.
        var keys = entity.FindPrimaryKey()?.Properties
            .Where(property => property.ValueGenerated.HasFlag(ValueGenerated.OnAdd))
            .Where(property => property.ClrType == typeof(int) || property.ClrType == typeof(long))
            .Select(property => property.GetColumnName())
            .Where(column => !string.IsNullOrEmpty(column))
            .ToList() ?? [];

        return new TablePlan(name, columns!, keys!);
    }
}

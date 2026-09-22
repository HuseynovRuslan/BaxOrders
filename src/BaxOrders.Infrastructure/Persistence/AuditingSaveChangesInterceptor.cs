using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.ResponsiblePeople;
using BaxOrders.Domain.Suppliers;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace BaxOrders.Infrastructure.Persistence;

/// <summary>
/// Stamps CreatedAtUtc / UpdatedAtUtc wherever an entity has them, and refuses hard deletes of
/// reference data that historical requests point to (those records must be deactivated instead).
/// </summary>
internal sealed class AuditingSaveChangesInterceptor(TimeProvider timeProvider) : SaveChangesInterceptor
{
    private const string CreatedAtUtc = "CreatedAtUtc";
    private const string UpdatedAtUtc = "UpdatedAtUtc";

    private static readonly HashSet<Type> DeactivateOnlyTypes =
    [
        typeof(Location),
        typeof(Category),
        typeof(UnitOfMeasure),
        typeof(Product),
        typeof(ProductVariant),
        typeof(Supplier),
        typeof(ResponsiblePerson),
    ];

    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        ApplyRules(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        ApplyRules(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private void ApplyRules(DbContext? context)
    {
        if (context is null)
        {
            return;
        }

        var utcNow = timeProvider.GetUtcNow().UtcDateTime;

        foreach (var entry in context.ChangeTracker.Entries())
        {
            switch (entry.State)
            {
                case EntityState.Deleted when DeactivateOnlyTypes.Contains(entry.Metadata.ClrType):
                    throw new InvalidOperationException(
                        $"{entry.Metadata.ClrType.Name} records must be deactivated, not deleted.");

                case EntityState.Added:
                    SetIfMapped(entry, CreatedAtUtc, utcNow);
                    SetIfMapped(entry, UpdatedAtUtc, utcNow);
                    break;

                case EntityState.Modified:
                    SetIfMapped(entry, UpdatedAtUtc, utcNow);
                    break;
            }
        }
    }

    private static void SetIfMapped(EntityEntry entry, string propertyName, DateTime value)
    {
        if (entry.Metadata.FindProperty(propertyName) is not null)
        {
            entry.Property(propertyName).CurrentValue = value;
        }
    }
}

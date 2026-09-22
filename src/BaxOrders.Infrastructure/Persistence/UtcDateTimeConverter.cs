using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace BaxOrders.Infrastructure.Persistence;

/// <summary>
/// Stores timestamps as UTC and marks values read from the database as <see cref="DateTimeKind.Utc"/>.
/// </summary>
public sealed class UtcDateTimeConverter() : ValueConverter<DateTime, DateTime>(
    value => value.Kind == DateTimeKind.Local ? value.ToUniversalTime() : value,
    value => DateTime.SpecifyKind(value, DateTimeKind.Utc));

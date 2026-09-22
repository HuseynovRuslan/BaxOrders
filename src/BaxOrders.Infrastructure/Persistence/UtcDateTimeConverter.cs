using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace BaxOrders.Infrastructure.Persistence;

/// <summary>
/// Stores timestamps as UTC and marks values read from the database as <see cref="DateTimeKind.Utc"/>.
/// </summary>
/// <remarks>
/// Every mapped timestamp in this model is a UTC instant — each is named for it — so a value that arrives
/// without a kind is one that lost its label somewhere, not a local time. It is marked rather than converted,
/// because converting it would move the instant by the machine's offset. A value that really is local is
/// converted properly.
/// <para>
/// PostgreSQL stores these as <c>timestamp with time zone</c>, and Npgsql refuses anything but a UTC kind for
/// that type, so being explicit here is what keeps a mislabelled value from becoming a runtime failure.
/// </para>
/// </remarks>
public sealed class UtcDateTimeConverter() : ValueConverter<DateTime, DateTime>(
    value => value.Kind == DateTimeKind.Utc
        ? value
        : value.Kind == DateTimeKind.Local
            ? value.ToUniversalTime()
            : DateTime.SpecifyKind(value, DateTimeKind.Utc),
    value => DateTime.SpecifyKind(value, DateTimeKind.Utc));

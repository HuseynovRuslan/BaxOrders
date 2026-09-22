using System.Text.Json;
using System.Text.Json.Serialization;
using BaxOrders.Domain.Orders;

namespace BaxOrders.Application.Orders.Revisions;

/// <summary>One end of a correction: the version on the other side, and who made the correction when.</summary>
public sealed record RevisionLinkDto(
    long OrderRequestId,
    int Version,
    OrderRequestStatus Status,
    Guid CreatedByUserId,
    string CreatedByDisplayName,
    DateTime CreatedAtUtc);

/// <summary>One entry of a correction's edit history.</summary>
/// <param name="OldValue">
/// Structured, not prose: a number for a quantity or a price, an object for a supplier or a whole line, or
/// null for "no value" — a price nobody knew, no supplier, the old side of an added line.
/// </param>
/// <param name="ProductCode">The product of the line, looked up from the variant, which is never deleted.</param>
public sealed record OrderEditEventDto(
    long Id,
    OrderEditAction Action,
    long? OrderRequestItemId,
    long? ProductVariantId,
    string? ProductCode,
    string? ProductName,
    OrderEditField? Field,
    JsonElement? OldValue,
    JsonElement? NewValue,
    Guid ActorUserId,
    string ActorDisplayName,
    DateTime OccurredAtUtc);

/// <summary>
/// Where one request stands as a correction: what it was made from, what was made from it, whether it may be
/// corrected or edited by this person now, and every change made to it.
/// </summary>
/// <param name="RevisedFrom">The returned version this one corrects. Null unless <paramref name="IsRevision"/>.</param>
/// <param name="RevisedInto">The correction made from this one, if it has been corrected.</param>
/// <param name="IsLatestVersion">
/// Whether this is the newest version of its location and month — the one analytics reads, whatever its status.
/// </param>
/// <param name="RowVersion">What an edit has to send back, so a change made meanwhile is refused rather than overwritten.</param>
public sealed record OrderRevisionDto(
    long OrderRequestId,
    int LocationId,
    string LocationName,
    DateOnly RequestPeriod,
    int Version,
    OrderRequestStatus Status,
    bool IsRevision,
    RevisionLinkDto? RevisedFrom,
    RevisionLinkDto? RevisedInto,
    bool IsLatestVersion,
    bool CanCreateRevision,
    bool CanEditRevision,
    string RowVersion,
    int ItemCount,
    int MissingPriceItemCount,
    decimal? KnownAmountTotal,
    bool AmountIsComplete,
    IReadOnlyList<OrderEditEventDto> EditHistory);

/// <param name="AlreadyExisted">
/// True when this returned version had already been corrected — a second click, or somebody else first. The
/// answer is then that correction, not a new one.
/// </param>
public sealed record CreateRevisionResultDto(
    long OrderRequestId,
    int Version,
    int ItemCount,
    long SourceOrderRequestId,
    int SourceVersion,
    bool AlreadyExisted);

/// <param name="OrderRequestItemId">The line that was changed, added or removed.</param>
public sealed record RevisionEditResultDto(long? OrderRequestItemId, OrderRevisionDto Revision);

/// <summary>
/// One field the caller wants changed, and what to.
/// </summary>
/// <remarks>
/// A property that is absent is left alone; <c>{"value": null}</c> sets it to nothing. A bare <c>null</c> is
/// refused, because it could mean either and a price wiped by accident is not a thing to guess about.
/// </remarks>
[JsonConverter(typeof(FieldChangeJsonConverterFactory))]
public sealed record FieldChange<T>(T Value);

/// <summary>
/// Changes to one line of a correction draft. Every field is optional; at least one must be present.
/// </summary>
/// <remarks>
/// There is no product variant here on purpose. A line for a different product is a different line: remove
/// this one and add the other. An unknown property — a variant id included — is refused rather than ignored.
/// </remarks>
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record EditOrderItemCommand(
    string? RowVersion,
    FieldChange<decimal>? Quantity = null,
    FieldChange<decimal?>? UnitPrice = null,
    FieldChange<int?>? SupplierId = null)
{
    [JsonIgnore]
    public bool ChangesAnything => Quantity is not null || UnitPrice is not null || SupplierId is not null;
}

/// <summary>A new line for a correction draft: a catalog variant and a quantity, with a price and a supplier if known.</summary>
/// <param name="UnitPrice">Null when the price is not known. A new line has no "unchanged", so null is not ambiguous here.</param>
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed record AddOrderItemCommand(
    string? RowVersion,
    long ProductVariantId,
    decimal Quantity,
    decimal? UnitPrice = null,
    int? SupplierId = null);

/// <summary>Reads <see cref="FieldChange{T}"/> strictly: <c>{"value": …}</c> and nothing else.</summary>
public sealed class FieldChangeJsonConverterFactory : JsonConverterFactory
{
    public override bool CanConvert(Type typeToConvert) =>
        typeToConvert.IsGenericType && typeToConvert.GetGenericTypeDefinition() == typeof(FieldChange<>);

    public override JsonConverter CreateConverter(Type typeToConvert, JsonSerializerOptions options) =>
        (JsonConverter)Activator.CreateInstance(
            typeof(FieldChangeJsonConverter<>).MakeGenericType(typeToConvert.GetGenericArguments()[0]))!;

    private sealed class FieldChangeJsonConverter<T> : JsonConverter<FieldChange<T>>
    {
        // Asked to read a bare null, so it can refuse it instead of quietly meaning "unchanged".
        public override bool HandleNull => true;

        public override FieldChange<T> Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            if (reader.TokenType == JsonTokenType.Null)
            {
                throw new JsonException(
                    "A bare null is ambiguous here. Leave the property out to keep the value, or send {\"value\": null} to clear it.");
            }

            if (reader.TokenType != JsonTokenType.StartObject)
            {
                throw new JsonException("A change is written as {\"value\": …}.");
            }

            var seen = false;
            T value = default!;

            while (reader.Read() && reader.TokenType != JsonTokenType.EndObject)
            {
                if (reader.TokenType != JsonTokenType.PropertyName
                    || !string.Equals(reader.GetString(), "value", StringComparison.OrdinalIgnoreCase))
                {
                    throw new JsonException("A change carries a single property, \"value\".");
                }

                reader.Read();
                value = JsonSerializer.Deserialize<T>(ref reader, options)!;
                seen = true;
            }

            return seen ? new FieldChange<T>(value) : throw new JsonException("A change needs its \"value\".");
        }

        public override void Write(Utf8JsonWriter writer, FieldChange<T> value, JsonSerializerOptions options)
        {
            writer.WriteStartObject();
            writer.WritePropertyName("value");
            JsonSerializer.Serialize(writer, value.Value, options);
            writer.WriteEndObject();
        }
    }
}

using System.Globalization;
using System.Reflection;
using System.Text.Json;
using BaxOrders.Application.Abstractions;
using BaxOrders.Application.Orders.Revisions;
using BaxOrders.Application.Orders.Workflow;
using BaxOrders.Domain;
using BaxOrders.Domain.Catalog;
using BaxOrders.Domain.Locations;
using BaxOrders.Domain.Orders;
using BaxOrders.Domain.ResponsiblePeople;
using BaxOrders.Domain.Suppliers;
using BaxOrders.UnitTests.TestSupport;

namespace BaxOrders.UnitTests.Orders;

/// <summary>
/// Correcting a returned order. The reviewed version is never touched: the correction is a new version with an
/// exact copy of its lines, and only that draft is edited — with every change on record.
/// </summary>
public sealed class OrderRevisionTests
{
    private static readonly DateTime Now = new(2026, 9, 22, 10, 0, 0, DateTimeKind.Utc);
    private static readonly DateOnly July = new(2026, 7, 1);
    private static readonly WorkflowActor Coordinator = WorkflowActor.User(Guid.NewGuid(), "Sınaq koordinatoru");
    private static readonly WorkflowActor Manager = WorkflowActor.User(Guid.NewGuid(), "Sınaq rəhbəri");
    private static readonly WorkflowActor Admin = WorkflowActor.User(Guid.NewGuid(), "Sınaq administratoru");

    // ---- making the correction -----------------------------------------------------------------------

    [Fact]
    public void A_returned_request_becomes_the_next_version_as_a_draft_of_the_same_month()
    {
        var source = Returned();

        var revision = source.CreateRevision(Coordinator, Now);

        Assert.Equal(OrderRequestStatus.Draft, revision.Status);
        Assert.Same(source.Location, revision.Location);
        Assert.Equal(source.RequestPeriod, revision.RequestPeriod);
        Assert.Equal(source.Version + 1, revision.Version);
        Assert.True(revision.IsRevision);
        Assert.False(source.IsRevision);
    }

    [Theory]
    [InlineData(OrderRequestStatus.Draft)]
    [InlineData(OrderRequestStatus.PendingApproval)]
    [InlineData(OrderRequestStatus.Approved)]
    public void Only_a_returned_request_can_be_corrected(OrderRequestStatus status)
    {
        var request = InStatus(status);

        var refused = Assert.Throws<DomainException>(() => request.CreateRevision(Coordinator, Now));
        Assert.Contains("ReturnedForCorrection", refused.Message);
    }

    [Fact]
    public void Every_line_is_copied_exactly()
    {
        var anbar = Supplier(7, "Anbar");
        var source = Returned(request =>
        {
            request.AddItem(Variant("Bel"), 10m, 7.25m, anbar, "Bel (böyük)", "Təcili");
            request.AddItem(Variant("Vedrə"), 3.5m, null);
        });

        var revision = source.CreateRevision(Coordinator, Now);

        Assert.Equal(
            source.Items.Select(Business).ToList(),
            revision.Items.Select(Business).ToList());
    }

    [Fact]
    public void A_copy_is_a_new_line_that_leads_back_to_the_line_it_was_copied_from()
    {
        var source = Returned();
        var original = TestEntities.WithId(source.Items.Single(), 41L);

        var copy = source.CreateRevision(Coordinator, Now).Items.Single();

        Assert.NotSame(original, copy);
        Assert.Equal(41L, copy.SourceOrderRequestItemId);
        Assert.Same(original, copy.SourceOrderRequestItem);
        Assert.Null(original.SourceOrderRequestItemId);
    }

    [Fact]
    public void The_returned_version_is_not_touched()
    {
        var source = Returned();
        var before = source.Items.Select(Business).ToList();
        var eventsBefore = source.WorkflowEvents.Count;

        source.CreateRevision(Coordinator, Now);

        Assert.Equal(OrderRequestStatus.ReturnedForCorrection, source.Status);
        Assert.Equal(before, source.Items.Select(Business).ToList());
        Assert.Equal(eventsBefore, source.WorkflowEvents.Count);
        Assert.Empty(source.EditEvents);
        Assert.Null(source.RevisedFrom);
    }

    [Fact]
    public void A_missing_request_date_stays_missing_and_a_stated_one_is_kept()
    {
        Assert.Null(Returned().CreateRevision(Coordinator, Now).RequestDate);

        var dated = Returned(requestDate: new DateOnly(2026, 6, 22));
        Assert.Equal(new DateOnly(2026, 6, 22), dated.CreateRevision(Coordinator, Now).RequestDate);
    }

    [Fact]
    public void The_responsible_person_is_kept()
    {
        var person = new ResponsiblePerson("Sınaq şəxsi");
        var source = Returned(responsiblePerson: person);

        Assert.Same(person, source.CreateRevision(Coordinator, Now).ResponsiblePerson);
    }

    [Fact]
    public void A_correction_inherits_no_workflow_state_and_claims_no_import()
    {
        var revision = Returned().CreateRevision(Coordinator, Now);

        Assert.Null(revision.SubmittedByUserId);
        Assert.Null(revision.SubmittedAtUtc);
        Assert.Null(revision.ApprovedAtUtc);
        Assert.Null(revision.ReturnedAtUtc);
        Assert.Empty(revision.WorkflowEvents);
        Assert.Null(revision.SourceImportBatchId);
        Assert.Null(revision.SourceImportBatch);
    }

    [Fact]
    public void Making_a_correction_is_recorded_with_who_made_it_and_from_what()
    {
        var source = TestEntities.WithId(Returned(), 105L);

        var revision = source.CreateRevision(Coordinator, Now);

        var link = revision.RevisedFrom!;
        Assert.Same(source, link.SourceOrderRequest);
        Assert.Same(revision, link.RevisionOrderRequest);
        Assert.Equal(Coordinator.UserId, link.CreatedByUserId);
        Assert.Equal("Sınaq koordinatoru", link.CreatedByDisplayName);

        var created = Assert.Single(revision.EditEvents);
        Assert.Equal(OrderEditAction.RevisionCreated, created.Action);
        Assert.Null(created.OrderRequestItemId);
        Assert.Null(created.Field);
        Assert.Null(created.OldValue);
        Assert.Equal("""{"sourceOrderRequestId":105,"sourceVersion":1,"itemCount":1}""", created.NewValue);
        Assert.Equal(Coordinator.UserId, created.ActorUserId);
        Assert.Equal(Now, created.OccurredAtUtc);
    }

    [Fact]
    public void Nobody_signed_in_cannot_make_a_correction()
    {
        Assert.Throws<DomainException>(() => Returned().CreateRevision(WorkflowActor.System(), Now));
    }

    [Fact]
    public void A_correction_of_a_correction_leads_back_one_version_at_a_time()
    {
        var first = Returned();
        var v1Line = TestEntities.WithId(first.Items.Single(), 1L);

        var second = first.CreateRevision(Coordinator, Now);
        var v2Line = TestEntities.WithId(second.Items.Single(), 2L);
        second.SubmitForApproval(Coordinator, null, Now.AddHours(1));
        second.ReturnForCorrection(Manager, "Yenə yoxlanmalıdır", Now.AddHours(2));

        var third = second.CreateRevision(Coordinator, Now.AddHours(3));

        Assert.Equal(3, third.Version);
        var v3Line = third.Items.Single();
        Assert.Equal(v2Line.Id, v3Line.SourceOrderRequestItemId);
        Assert.NotEqual(v1Line.Id, v3Line.SourceOrderRequestItemId);
        Assert.Same(v2Line, v3Line.SourceOrderRequestItem);
    }

    [Fact]
    public void A_line_whose_variant_or_supplier_was_deactivated_since_is_still_copied_as_it_was()
    {
        var variant = Variant("Köhnə mal");
        var supplier = Supplier(9, "Bağlanmış şirkət");
        var source = Returned(request => request.AddItem(variant, 2m, 1m, supplier));
        variant.Deactivate();
        supplier.Deactivate();

        var copy = source.CreateRevision(Coordinator, Now).Items.Single();

        Assert.Same(variant, copy.ProductVariant);
        Assert.Same(supplier, copy.Supplier);
    }

    // ---- editing the correction ----------------------------------------------------------------------

    [Fact]
    public void A_quantity_change_is_recorded_with_its_old_and_new_value()
    {
        var (revision, line) = Correction(quantity: 10m);

        var entry = revision.ChangeItemQuantity(line, 12.5m, Coordinator, Now)!;

        Assert.Equal(12.5m, line.Quantity);
        Assert.Equal(OrderEditAction.ItemQuantityChanged, entry.Action);
        Assert.Equal(OrderEditField.Quantity, entry.Field);
        Assert.Equal("10", entry.OldValue);
        Assert.Equal("12.5", entry.NewValue);
        Assert.Equal(line.ProductVariantId, entry.ProductVariantId);
        Assert.Equal(Coordinator.UserId, entry.ActorUserId);
        Assert.Equal("Sınaq koordinatoru", entry.ActorDisplayName);
    }

    [Fact]
    public void A_price_can_be_filled_in_changed_and_cleared_and_unknown_is_never_zero()
    {
        var (revision, line) = Correction(price: null);

        var filled = revision.ChangeItemUnitPrice(line, 3.2m, Coordinator, Now)!;
        Assert.Equal((null, "3.2"), (filled.OldValue, filled.NewValue));

        var changed = revision.ChangeItemUnitPrice(line, 4m, Coordinator, Now)!;
        Assert.Equal(("3.2", "4"), (changed.OldValue, changed.NewValue));

        var cleared = revision.ChangeItemUnitPrice(line, null, Coordinator, Now)!;
        Assert.Equal(("4", null), (cleared.OldValue, cleared.NewValue));
        Assert.Null(line.UnitPrice);
        Assert.Equal(1, revision.MissingPriceItemCount);
    }

    [Fact]
    public void A_supplier_can_be_set_changed_and_removed_and_is_recorded_by_name()
    {
        var (revision, line) = Correction();
        var anbar = Supplier(7, "Anbar");
        var qala = Supplier(8, "Qala baza");

        var set = revision.ChangeItemSupplier(line, anbar, Coordinator, Now)!;
        Assert.Equal((null, """{"id":7,"name":"Anbar"}"""), (set.OldValue, set.NewValue));

        var changed = revision.ChangeItemSupplier(line, qala, Coordinator, Now)!;
        Assert.Equal("""{"id":8,"name":"Qala baza"}""", changed.NewValue);

        var removed = revision.ChangeItemSupplier(line, null, Coordinator, Now)!;
        Assert.Equal(("""{"id":8,"name":"Qala baza"}""", null), (removed.OldValue, removed.NewValue));
        Assert.Null(line.Supplier);
        Assert.Null(line.SupplierId);
    }

    [Fact]
    public void An_inactive_supplier_is_refused()
    {
        var (revision, line) = Correction();
        var closed = Supplier(3, "Bağlı");
        closed.Deactivate();

        Assert.Throws<DomainException>(() => revision.ChangeItemSupplier(line, closed, Coordinator, Now));
    }

    [Fact]
    public void Asking_for_the_value_a_line_already_has_records_nothing()
    {
        var anbar = Supplier(7, "Anbar");
        var (revision, line) = Correction(quantity: 10m, price: 2m, supplier: anbar);
        var entries = revision.EditEvents.Count;

        Assert.Null(revision.ChangeItemQuantity(line, 10.000m, Coordinator, Now));
        Assert.Null(revision.ChangeItemUnitPrice(line, 2.00m, Coordinator, Now));
        Assert.Null(revision.ChangeItemSupplier(line, Supplier(7, "Anbar"), Coordinator, Now));
        Assert.Equal(entries, revision.EditEvents.Count);
    }

    [Theory]
    [InlineData("0")]
    [InlineData("-1")]
    [InlineData("1.2345")]
    public void A_quantity_must_be_positive_and_fit_the_stored_precision(string quantity)
    {
        var (revision, line) = Correction(quantity: 10m);

        Assert.Throws<DomainException>(() =>
            revision.ChangeItemQuantity(line, decimal.Parse(quantity, CultureInfo.InvariantCulture), Coordinator, Now));
        Assert.Equal(10m, line.Quantity);
    }

    [Fact]
    public void A_negative_price_is_refused_but_zero_is_a_price()
    {
        var (revision, line) = Correction(price: 5m);

        Assert.Throws<DomainException>(() => revision.ChangeItemUnitPrice(line, -1m, Coordinator, Now));
        Assert.Equal(5m, line.UnitPrice);

        revision.ChangeItemUnitPrice(line, 0m, Coordinator, Now);
        Assert.Equal(0m, line.UnitPrice);
    }

    [Fact]
    public void An_added_line_is_new_and_its_entry_names_it_once_it_has_an_id()
    {
        var (revision, _) = Correction();
        var anbar = Supplier(7, "Anbar");

        var added = revision.AddRevisionItem(Variant("Yeni mal"), 4m, 2.5m, anbar, Coordinator);

        Assert.Null(added.SourceOrderRequestItemId);
        Assert.Contains(added, revision.Items);

        // The entry names the line by its id, which the database hands out.
        Assert.Throws<InvalidOperationException>(() => revision.RecordItemAdded(added, Coordinator, Now));

        TestEntities.WithId(added, 77L);
        var entry = revision.RecordItemAdded(added, Coordinator, Now);

        Assert.Equal(OrderEditAction.ItemAdded, entry.Action);
        Assert.Equal(77L, entry.OrderRequestItemId);
        Assert.Null(entry.OldValue);
        using var line = JsonDocument.Parse(entry.NewValue!);
        Assert.Equal(4m, line.RootElement.GetProperty("quantity").GetDecimal());
        Assert.Equal(2.5m, line.RootElement.GetProperty("unitPrice").GetDecimal());
        Assert.Equal(7, line.RootElement.GetProperty("supplierId").GetInt32());
        Assert.Equal("Anbar", line.RootElement.GetProperty("supplierName").GetString());
    }

    [Fact]
    public void An_inactive_variant_cannot_be_added()
    {
        var (revision, _) = Correction();
        var retired = Variant("Köhnə");
        retired.Deactivate();

        Assert.Throws<DomainException>(() => revision.AddRevisionItem(retired, 1m, null, null, Coordinator));
    }

    [Fact]
    public void A_removed_line_leaves_the_draft_but_the_history_keeps_what_it_was()
    {
        var source = Returned(request => request.AddItem(Variant("Bel"), 6m, null));
        var original = source.Items.Single();
        var revision = source.CreateRevision(Coordinator, Now);
        var copy = TestEntities.WithId(revision.Items.Single(), 12L);

        var entry = revision.RemoveRevisionItem(copy, Coordinator, Now);

        Assert.Empty(revision.Items);
        Assert.Contains(original, source.Items);
        Assert.Equal(OrderEditAction.ItemRemoved, entry.Action);
        Assert.Equal(12L, entry.OrderRequestItemId);
        Assert.Null(entry.NewValue);
        using var line = JsonDocument.Parse(entry.OldValue!);
        Assert.Equal(6m, line.RootElement.GetProperty("quantity").GetDecimal());
        Assert.Equal(JsonValueKind.Null, line.RootElement.GetProperty("unitPrice").ValueKind);
    }

    [Fact]
    public void A_line_of_another_request_is_refused()
    {
        var (revision, _) = Correction();
        var (_, stranger) = Correction();

        Assert.Throws<DomainException>(() => revision.ChangeItemQuantity(stranger, 2m, Coordinator, Now));
        Assert.Throws<DomainException>(() => revision.RemoveRevisionItem(stranger, Coordinator, Now));
    }

    [Fact]
    public void An_imported_draft_is_not_edited()
    {
        var imported = new OrderRequest(Location(), July);
        var line = imported.AddItem(Variant(), 10m, 2m);

        var refused = Assert.Throws<DomainException>(() => imported.ChangeItemQuantity(line, 11m, Coordinator, Now));
        Assert.Contains("correction version", refused.Message);
        Assert.Throws<DomainException>(() => imported.AddRevisionItem(Variant(), 1m, null, null, Coordinator));
    }

    [Fact]
    public void The_returned_version_is_not_edited()
    {
        var source = Returned();

        Assert.Throws<DomainException>(() => source.ChangeItemQuantity(source.Items.Single(), 11m, Coordinator, Now));
    }

    [Fact]
    public void A_submitted_correction_is_locked_and_stays_locked_when_returned()
    {
        var (revision, line) = Correction();
        revision.SubmitForApproval(Coordinator, null, Now);

        AssertLocked(revision, line);

        revision.ReturnForCorrection(Manager, "Hələ də səhvdir", Now.AddHours(1));

        // Returned again: the way on is the next correction, not reopening this one.
        AssertLocked(revision, line);
    }

    [Fact]
    public void An_approved_correction_is_locked()
    {
        var (revision, line) = Correction();
        revision.SubmitForApproval(Coordinator, null, Now);
        revision.Approve(Manager, null, false, Now.AddHours(1));

        AssertLocked(revision, line);
    }

    [Fact]
    public void The_unaudited_ways_to_change_lines_are_closed_on_a_correction()
    {
        var (revision, line) = Correction();

        Assert.Throws<DomainException>(() => revision.AddItem(Variant(), 1m, 1m));
        Assert.Throws<DomainException>(() => revision.RemoveItem(line));
    }

    [Fact]
    public void An_edit_needs_somebody_signed_in()
    {
        var (revision, line) = Correction();

        Assert.Throws<DomainException>(() => revision.ChangeItemQuantity(line, 2m, WorkflowActor.System(), Now));
    }

    // ---- the correction in the existing workflow -----------------------------------------------------

    [Fact]
    public void A_correction_goes_through_the_same_workflow_and_keeps_its_version()
    {
        var (revision, _) = Correction();

        revision.SubmitForApproval(Coordinator, null, Now);
        revision.Approve(Manager, null, false, Now.AddHours(1));

        Assert.Equal(OrderRequestStatus.Approved, revision.Status);
        Assert.Equal(2, revision.Version);
    }

    [Fact]
    public void An_administrator_who_submits_a_correction_still_cannot_approve_it()
    {
        var (revision, _) = Correction(creator: Admin);
        revision.SubmitForApproval(Admin, null, Now);

        Assert.Throws<SelfApprovalNotAllowedException>(() => revision.Approve(Admin, null, false, Now.AddHours(1)));
        Assert.Throws<SelfApprovalNotAllowedException>(() => revision.ReturnForCorrection(Admin, "Özüm", Now.AddHours(1)));
    }

    [Fact]
    public void Whoever_edited_a_correction_cannot_decide_on_it()
    {
        var (revision, line) = Correction(creator: Coordinator);
        revision.ChangeItemQuantity(line, 12m, Manager, Now);
        revision.SubmitForApproval(Coordinator, null, Now.AddHours(1));

        // The manager only changed a quantity — and that is already the judgement an approval checks.
        Assert.Throws<OwnContributionNotApprovableException>(() => revision.Approve(Manager, null, false, Now.AddHours(2)));
        Assert.Throws<OwnContributionNotApprovableException>(() => revision.ReturnForCorrection(Manager, "Yenidən", Now.AddHours(2)));
    }

    [Fact]
    public void Creating_a_correction_counts_as_working_on_it()
    {
        var (revision, _) = Correction(creator: Admin);
        revision.SubmitForApproval(Coordinator, null, Now.AddHours(1));

        Assert.Throws<OwnContributionNotApprovableException>(() => revision.Approve(Admin, null, false, Now.AddHours(2)));
    }

    [Theory]
    [InlineData(OrderEditKind.Price)]
    [InlineData(OrderEditKind.Supplier)]
    [InlineData(OrderEditKind.Added)]
    [InlineData(OrderEditKind.Removed)]
    public void Any_kind_of_edit_blocks_its_author(OrderEditKind kind)
    {
        var (revision, line) = Correction(creator: Coordinator);
        var second = revision.AddRevisionItem(Variant("İkinci"), 1m, 1m, null, Coordinator);
        TestEntities.WithId(second, 900L);
        revision.RecordItemAdded(second, Coordinator, Now);

        switch (kind)
        {
            case OrderEditKind.Price:
                revision.ChangeItemUnitPrice(line, 9m, Manager, Now);
                break;
            case OrderEditKind.Supplier:
                revision.ChangeItemSupplier(line, Supplier(7, "Anbar"), Manager, Now);
                break;
            case OrderEditKind.Added:
                var added = revision.AddRevisionItem(Variant("Üçüncü"), 2m, null, null, Manager);
                TestEntities.WithId(added, 901L);
                revision.RecordItemAdded(added, Manager, Now);
                break;
            default:
                revision.RemoveRevisionItem(second, Manager, Now);
                break;
        }

        revision.SubmitForApproval(Coordinator, null, Now.AddHours(1));

        Assert.Throws<OwnContributionNotApprovableException>(() => revision.Approve(Manager, null, false, Now.AddHours(2)));
    }

    [Fact]
    public void Somebody_who_did_not_touch_the_correction_may_decide_on_it()
    {
        var (revision, line) = Correction(creator: Coordinator);
        revision.ChangeItemQuantity(line, 12m, Coordinator, Now);
        revision.SubmitForApproval(Coordinator, null, Now.AddHours(1));

        revision.Approve(Manager, null, false, Now.AddHours(2));

        Assert.Equal(OrderRequestStatus.Approved, revision.Status);
    }

    [Fact]
    public void An_ordinary_request_nobody_corrected_is_decided_on_the_submitter_rule_alone()
    {
        var request = InStatus(OrderRequestStatus.PendingApproval);

        request.Approve(Manager, null, false, Now.AddHours(2));

        Assert.Equal(OrderRequestStatus.Approved, request.Status);
    }

    [Fact]
    public void Deciding_on_a_correction_whose_history_was_not_loaded_fails_loudly()
    {
        // What an unloaded edit history looks like to the domain: a correction with no entries at all. Passing
        // silently would let its own author approve it.
        var (revision, _) = Correction(creator: Coordinator);
        revision.SubmitForApproval(Coordinator, null, Now.AddHours(1));
        Unload(revision);

        Assert.Throws<InvalidOperationException>(() => revision.Approve(Manager, null, false, Now.AddHours(2)));
    }

    [Fact]
    public void Unpriced_lines_of_a_correction_still_need_acknowledging()
    {
        var (revision, _) = Correction(price: null);
        revision.SubmitForApproval(Coordinator, null, Now);

        Assert.Throws<MissingPriceAcknowledgementRequiredException>(() => revision.Approve(Manager, null, false, Now));
    }

    [Fact]
    public void A_corrected_version_offers_no_workflow_action()
    {
        var allowed = AllowedWorkflowActionsDto.For(
            OrderRequestStatus.ReturnedForCorrection, null, new StubUser(BaxOrdersRoles.Coordinator), superseded: true);

        Assert.Equal(new AllowedWorkflowActionsDto(false, false, false), allowed);
    }

    [Fact]
    public void The_allowed_actions_say_which_of_the_two_reasons_is_stopping_a_decision()
    {
        var manager = new StubUser(BaxOrdersRoles.Manager);
        var admin = new StubUser(BaxOrdersRoles.Admin);

        var edited = AllowedWorkflowActionsDto.For(
            OrderRequestStatus.PendingApproval, null, manager, contributedEdits: true);
        Assert.Equal(new AllowedWorkflowActionsDto(false, false, false, false, true), edited);

        // Somebody who both submitted and edited reads the submitter reason: only one is shown, and that one
        // is the one that was true first.
        var both = AllowedWorkflowActionsDto.For(
            OrderRequestStatus.PendingApproval, admin.UserId, admin, contributedEdits: true);
        Assert.Equal(new AllowedWorkflowActionsDto(false, false, false, true, false), both);

        var free = AllowedWorkflowActionsDto.For(OrderRequestStatus.PendingApproval, null, manager);
        Assert.Equal(new AllowedWorkflowActionsDto(false, true, true), free);

        // A coordinator is not offered a decision, and is not told why: they never could.
        var coordinator = AllowedWorkflowActionsDto.For(
            OrderRequestStatus.PendingApproval, null, new StubUser(BaxOrdersRoles.Coordinator), contributedEdits: true);
        Assert.Equal(new AllowedWorkflowActionsDto(false, false, false), coordinator);
    }

    // ---- how values are written ----------------------------------------------------------------------

    [Fact]
    public void Numbers_are_written_invariantly_and_without_trailing_zeros()
    {
        var previous = CultureInfo.CurrentCulture;
        try
        {
            // Azerbaijani writes a decimal comma. The history must not.
            CultureInfo.CurrentCulture = new CultureInfo("az-Latn-AZ");

            Assert.Equal("12.5", EditAuditValue.Of(12.500m));
            Assert.Equal("10", EditAuditValue.Of(10.000m));
            Assert.Equal("0.001", EditAuditValue.Of(0.001m));
            Assert.Equal("1234567.8912", EditAuditValue.Of(1234567.8912m));
            Assert.Null(EditAuditValue.Of((decimal?)null));
        }
        finally
        {
            CultureInfo.CurrentCulture = previous;
        }
    }

    [Fact]
    public void A_supplier_is_written_readably_with_the_name_it_had()
    {
        Assert.Equal("""{"id":4,"name":"Əbülfəz Ağakərimov"}""", EditAuditValue.Of(Supplier(4, "Əbülfəz Ağakərimov")));
    }

    // ---- who may do it -------------------------------------------------------------------------------

    [Theory]
    [InlineData(BaxOrdersRoles.Coordinator, true)]
    [InlineData(BaxOrdersRoles.Admin, true)]
    [InlineData(BaxOrdersRoles.Manager, false)]
    public void Coordinators_and_administrators_correct_orders_and_managers_do_not(string role, bool allowed)
    {
        var user = new StubUser(role);

        Assert.Equal(allowed, RevisionPermissions.CanCreate(OrderRequestStatus.ReturnedForCorrection, false, true, user));
        Assert.Equal(allowed, RevisionPermissions.CanEdit(OrderRequestStatus.Draft, true, user));
    }

    [Fact]
    public void Nobody_signed_in_corrects_nothing()
    {
        var anonymous = new StubUser(null);

        Assert.False(RevisionPermissions.CanCreate(OrderRequestStatus.ReturnedForCorrection, false, true, anonymous));
        Assert.False(RevisionPermissions.CanEdit(OrderRequestStatus.Draft, true, anonymous));
    }

    [Theory]
    [InlineData(OrderRequestStatus.Draft, false, true)]
    [InlineData(OrderRequestStatus.PendingApproval, false, true)]
    [InlineData(OrderRequestStatus.Approved, false, true)]
    [InlineData(OrderRequestStatus.ReturnedForCorrection, true, true)]
    [InlineData(OrderRequestStatus.ReturnedForCorrection, false, false)]
    public void A_correction_is_offered_only_for_the_newest_returned_version_not_yet_corrected(
        OrderRequestStatus status, bool hasRevision, bool isLatest)
    {
        Assert.False(RevisionPermissions.CanCreate(status, hasRevision, isLatest, new StubUser(BaxOrdersRoles.Admin)));
    }

    [Theory]
    [InlineData(OrderRequestStatus.Draft, false)]
    [InlineData(OrderRequestStatus.PendingApproval, true)]
    [InlineData(OrderRequestStatus.Approved, true)]
    [InlineData(OrderRequestStatus.ReturnedForCorrection, true)]
    public void Only_a_correction_draft_is_offered_for_editing(OrderRequestStatus status, bool isRevision)
    {
        Assert.False(RevisionPermissions.CanEdit(status, isRevision, new StubUser(BaxOrdersRoles.Admin)));
    }

    // ---- the edit command as JSON --------------------------------------------------------------------

    private static readonly JsonSerializerOptions Web = new(JsonSerializerDefaults.Web);

    [Fact]
    public void A_field_left_out_is_unchanged_and_value_null_clears_it()
    {
        var command = JsonSerializer.Deserialize<EditOrderItemCommand>(
            """{"rowVersion":"00FF","unitPrice":{"value":null}}""", Web)!;

        Assert.NotNull(command.UnitPrice);
        Assert.Null(command.UnitPrice!.Value);
        Assert.Null(command.Quantity);
        Assert.Null(command.SupplierId);
        Assert.True(command.ChangesAnything);

        var untouched = JsonSerializer.Deserialize<EditOrderItemCommand>("""{"rowVersion":"00FF"}""", Web)!;
        Assert.False(untouched.ChangesAnything);
    }

    [Theory]
    [InlineData("""{"rowVersion":"00FF","unitPrice":null}""")]
    [InlineData("""{"rowVersion":"00FF","supplierId":null}""")]
    public void A_bare_null_is_refused_because_it_could_mean_either(string json)
    {
        Assert.Throws<JsonException>(() => JsonSerializer.Deserialize<EditOrderItemCommand>(json, Web));
    }

    [Theory]
    [InlineData("""{"rowVersion":"00FF","productVariantId":5}""")]
    [InlineData("""{"rowVersion":"00FF","quantity":{"value":null}}""")]
    [InlineData("""{"rowVersion":"00FF","quantity":{"amount":3}}""")]
    [InlineData("""{"rowVersion":"00FF","quantity":3}""")]
    public void A_variant_change_a_cleared_quantity_or_a_malformed_change_is_refused(string json)
    {
        Assert.Throws<JsonException>(() => JsonSerializer.Deserialize<EditOrderItemCommand>(json, Web));
    }

    // ---- fixture -------------------------------------------------------------------------------------

    public enum OrderEditKind
    {
        Price,
        Supplier,
        Added,
        Removed,
    }

    /// <summary>Empties the edit history, the way loading a request without including it would.</summary>
    private static void Unload(OrderRequest revision) =>
        ((List<OrderRequestEditEvent>)typeof(OrderRequest)
            .GetField("_editEvents", BindingFlags.Instance | BindingFlags.NonPublic)!
            .GetValue(revision)!).Clear();

    private static void AssertLocked(OrderRequest revision, OrderRequestItem line)
    {
        Assert.Throws<DomainException>(() => revision.ChangeItemQuantity(line, 99m, Coordinator, Now));
        Assert.Throws<DomainException>(() => revision.ChangeItemUnitPrice(line, 99m, Coordinator, Now));
        Assert.Throws<DomainException>(() => revision.ChangeItemSupplier(line, null, Coordinator, Now));
        Assert.Throws<DomainException>(() => revision.AddRevisionItem(Variant(), 1m, null, null, Coordinator));
        Assert.Throws<DomainException>(() => revision.RemoveRevisionItem(line, Coordinator, Now));
    }

    private static object Business(OrderRequestItem item) =>
        (item.ProductVariant, item.Quantity, item.UnitPrice, item.Supplier, item.OriginalProductName, item.Notes);

    private static Location Location() => new("MASTAGA", "Maştağa");

    private static ProductVariant Variant(string name = "Bel") =>
        new Product("PRD-000001", name).AddVariant(null, null, null, TestEntities.Pieces());

    private static Supplier Supplier(int id, string name) => TestEntities.WithId(new Supplier(name), id);

    private static OrderRequest InStatus(OrderRequestStatus status)
    {
        var request = new OrderRequest(Location(), July);
        request.AddItem(Variant(), 10m, 7m);

        if (status is OrderRequestStatus.Draft)
        {
            return request;
        }

        request.SubmitForApproval(Coordinator, null, Now);
        if (status is OrderRequestStatus.Approved)
        {
            request.Approve(Manager, null, false, Now.AddHours(1));
        }
        else if (status is OrderRequestStatus.ReturnedForCorrection)
        {
            request.ReturnForCorrection(Manager, "Miqdarlar yoxlanmalıdır", Now.AddHours(1));
        }

        return request;
    }

    /// <summary>Version 1 of a month, submitted and handed back.</summary>
    private static OrderRequest Returned(
        Action<OrderRequest>? lines = null, DateOnly? requestDate = null, ResponsiblePerson? responsiblePerson = null)
    {
        var request = new OrderRequest(Location(), July, requestDate, responsiblePerson);
        if (lines is null)
        {
            request.AddItem(Variant(), 10m, 7m);
        }
        else
        {
            lines(request);
        }

        request.SubmitForApproval(Coordinator, null, Now.AddHours(-2));
        request.ReturnForCorrection(Manager, "Miqdarlar yoxlanmalıdır", Now.AddHours(-1));
        return request;
    }

    /// <summary>A correction draft with one copied line.</summary>
    private static (OrderRequest Revision, OrderRequestItem Line) Correction(
        decimal quantity = 10m, decimal? price = 7m, Supplier? supplier = null, WorkflowActor? creator = null)
    {
        var source = Returned(request => request.AddItem(Variant(), quantity, price, supplier));
        var revision = source.CreateRevision(creator ?? Coordinator, Now);
        return (revision, revision.Items.Single());
    }

    private sealed class StubUser(string? role) : ICurrentUserContext
    {
        public bool IsAuthenticated => role is not null;

        public Guid? UserId { get; } = role is null ? null : Guid.NewGuid();

        public string? UserName => role;

        public string? DisplayName => role;

        public string? Role => role;
    }
}

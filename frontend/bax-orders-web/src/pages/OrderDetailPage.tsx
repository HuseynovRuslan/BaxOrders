import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import {
  fetchDecisionContext,
  type DecisionDecomposition,
  type DecisionDriver,
  type OrderDecisionContext,
} from '../api/decisions'
import {
  basisParams,
  basisRequest,
  locationLink,
  orderLink,
  pricingReviewLink,
  type BasisSelection,
} from '../analytics/basisParams'
import { parseCause, productParam, withCause, withProduct } from '../analytics/decisionParams'
import { useBasis } from '../analytics/useBasis'
import { fetchOrder, type OrderRequestDetail, type OrderRequestItem } from '../api/orders'
import { fetchRevision, type OrderRevision } from '../api/revisions'
import type { OrderWorkflow } from '../api/workflow'
import { PageHeader } from '../components/PageHeader'
import { SectionHeader } from '../components/SectionHeader'
import { InfoHint } from '../components/analytics/InfoHint'
import { describeSpecification, distinguishingDetails } from '../components/analytics/labels'
import {
  classifyLine,
  internalSupplierLabel,
  internalSupplyHint,
  internalSupplyLabel,
  isInternalSupply,
  lineToneClass,
  missingPriceCount,
  missingPriceLabel,
  missingPriceShortLabel,
  pricingReviewLinkLabel,
  unclassifiedHint,
} from '../pricing/labels'
import { TrendModal } from '../components/analytics/TrendModal'
import { CauseSummary } from '../components/decisions/CauseSummary'
import { comparablePriorMonths, type DriverFilter } from '../components/decisions/labels'
import { DecisionHeadline } from '../components/decisions/DecisionHeadline'
import { DriverList } from '../components/decisions/DriverList'
import { ItemSourceDrawer } from '../components/orders/ItemSourceDrawer'
import { AddLineDialog } from '../components/orders/revision/AddLineDialog'
import { EditLineDialog } from '../components/orders/revision/EditLineDialog'
import { HistoryTabs } from '../components/orders/revision/HistoryTabs'
import { RemoveLineDialog } from '../components/orders/revision/RemoveLineDialog'
import { RevisionPanel } from '../components/orders/revision/RevisionPanel'
import { addLineLabel, editLineLabel, removeLineLabel, staleDataMessage } from '../components/orders/revision/labels'
import { OrderStatusBadge } from '../components/workflow/OrderStatusBadge'
import { WorkflowPanel } from '../components/workflow/WorkflowPanel'
import { latestOrderLinkLabel } from '../terminology/terms'
import {
  formatAmount,
  formatNumber,
  formatOrderUnit,
  formatPeriod,
  formatQuantity,
  knownAmountLabel,
  unknownSupplierLabel,
} from '../components/imports/labels'

const pageSize = 50

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: OrderRequestDetail }

type Dialog =
  | { kind: 'edit'; item: OrderRequestItem }
  | { kind: 'remove'; item: OrderRequestItem }
  | { kind: 'add' }

/** One monthly request with its lines, in the order the sheet had them. */
export function OrderDetailPage() {
  const { orderRequestId } = useParams()
  const [params, setParams] = useSearchParams()

  // The comparison is the reader's, and it lives in the URL: arriving from a dashboard card keeps the basis
  // that card was showing, and Back, Forward and a reload all restore it. Absent means last month, which is
  // what a link from the monthly report — a month-to-month reading — should keep meaning.
  const selection = useBasis(params, setParams)
  const basisKey = `${selection.basis}|${selection.from ?? ''}|${selection.to ?? ''}`

  function selectBasis(next: BasisSelection) {
    const search = new URLSearchParams(params)
    for (const [name, value] of Object.entries(basisParams(next))) {
      if (value === undefined) {
        search.delete(name)
      } else {
        search.set(name, value)
      }
    }

    setParams(search)
  }

  // Which products "Əsas dəyişikliklər" shows lives in the URL too, beside the basis and never part of it: a reason
  // and a chip select the same thing, a reload or a shared link restores it, and Back — a push, never a replace — is
  // the reader's undo. Choosing it re-fetches nothing; it is a reading of figures already on the page.
  const cause = parseCause(params)
  const driversHeading = useRef<HTMLHeadingElement>(null)

  function selectCause(next: DriverFilter) {
    const search = withCause(params, next)
    if (search !== null) {
      setParams(search)
    }
  }

  /**
   * A reason pressed: its products, with the list brought into view. Only this moves the page — a link, a reload,
   * Back or a chip leave it where it is, and so does clearing the filter, which asked for no list.
   */
  function selectCauseFromReason(next: DriverFilter) {
    selectCause(next)
    if (next !== 'All') {
      // Asked, not assumed: a screen that cannot say whether motion is welcome gets none.
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? true
      driversHeading.current?.scrollIntoView?.({ block: 'start', behavior: reduce ? 'auto' : 'smooth' })
    }
  }

  // The product whose history is open lives in the URL as well (19.2): Back closes the history instead of leaving
  // the page, and a shared link opens the same history over the same comparison. Like the cause, it is a reading of
  // what is already on the page, so opening and closing re-fetch nothing — `product` is in none of the keys below.
  const location = useLocation()
  const navigate = useNavigate()
  const closedEntry = useRef<string | null>(null)
  // An entry reached again — Forward brings back the very entry that was closed — may be closed again.
  useEffect(() => {
    closedEntry.current = null
  }, [location.key])

  /** A push, marked as this page's own, so that closing can take exactly that entry away again. */
  function openProduct(driver: DecisionDriver) {
    const next = withProduct(params, driver.variant.productVariantId)
    if (next !== null) {
      setParams(next, { state: { productDrawer: true } })
    }
  }

  /**
   * `Escape`, «Bağla», the background and Back all end in the same place: the entry without the product.
   *
   * Opened here, closing is Back itself, so it leaves no entry behind and the next Back leaves the page. Opened from a
   * pasted link, there is no entry of ours to go back to, so the product is taken out of this one instead, and Back
   * still goes wherever it went before the link.
   */
  function closeProduct() {
    // Escape and a press on the background can both arrive before the browser's Back has landed, and a second Back
    // would leave the page. One close per entry.
    if (closedEntry.current === location.key) {
      return
    }

    closedEntry.current = location.key
    if (isProductDrawerEntry(location.state)) {
      navigate(-1)
      return
    }

    const next = withProduct(params, null)
    if (next !== null) {
      setParams(next, { replace: true })
    }
  }

  const id = Number(orderRequestId)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [hasPrice, setHasPrice] = useState<boolean | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [state, setState] = useState<State>({ status: 'loading' })
  const [revision, setRevision] = useState<OrderRevision | null>(null)
  const [source, setSource] = useState<{ id: number; name: string } | null>(null)
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [decision, setDecision] = useState<OrderDecisionContext | null>(null)
  const [decisionPending, setDecisionPending] = useState(true)

  // Bumped after every change, so the lines, the correction state and both histories are re-read together
  // rather than each drifting on its own copy.
  const [reloadToken, setReloadToken] = useState(0)
  const reload = useCallback(() => setReloadToken((token) => token + 1), [])

  // Whether the order was carried in as already approved is the workflow's fact, not the order's. The decision panel
  // reads the workflow anyway, so the header takes it from there rather than asking a second time — and only for the
  // order it was read for, so the previous order's answer is never shown on this one.
  const [historical, setHistorical] = useState<{ orderRequestId: number; isHistoricalImport: boolean } | null>(null)
  const workflowLoaded = useCallback((workflow: OrderWorkflow) => {
    setHistorical({
      orderRequestId: workflow.orderRequestId,
      isHistoricalImport: workflow.decisionFacts.isHistoricalImport,
    })
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setState({ status: 'loading' })
    fetchOrder(id, { search: search || undefined, hasPrice, page, pageSize }, controller.signal)
      .then((data) => setState({ status: 'success', data }))
      .catch((problem: unknown) => {
        if (!controller.signal.aborted) {
          setState({ status: 'error', message: problem instanceof Error ? problem.message : 'Naməlum xəta' })
        }
      })
    return () => controller.abort()
  }, [id, search, hasPrice, page, reloadToken])

  useEffect(() => {
    const controller = new AbortController()
    fetchRevision(id, controller.signal)
      .then(setRevision)
      .catch(() => undefined)
    return () => controller.abort()
  }, [id, reloadToken])

  // The comparison and its explanation. They qualify the amount rather than producing it, so a failure
  // here leaves the order perfectly readable — it just loses the part that says how it differs.
  useEffect(() => {
    const controller = new AbortController()
    setDecisionPending(true)
    fetchDecisionContext(id, basisRequest(selection), controller.signal)
      .then(setDecision)
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) {
          setDecisionPending(false)
        }
      })
    return () => controller.abort()
    // The basis is flattened into a key: a new object every render would re-fetch on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, reloadToken, basisKey])

  /** The months this object can be compared against, oldest first — the same list the object page offers. */
  const priorMonths = comparablePriorMonths(decision)

  /**
   * The product the address names, found among every product the comparison lists, whichever of them the list is
   * showing — a link to a product opens it under any chip. Unknown, or no comparison to look in, is no history.
   */
  const shownProductId = productParam(params)
  const product = shownProductId === null || !decision?.decomposition
    ? null
    : driverOf(decision.decomposition, shownProductId)

  /** What every dialog does when it succeeds, and what a 409 does: read everything again. */
  const afterChange = useCallback(
    (message: string | null) => {
      setDialog(null)
      setNotice(message)
      reload()
    },
    [reload],
  )

  if (state.status === 'error') {
    return (
      <>
        <PageHeader title="Sifariş" />
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{state.message}</p>
        <Link to="/locations" className="mt-3 inline-block text-sm text-slate-600 underline">
          Obyektlərə qayıt
        </Link>
      </>
    )
  }

  const data = state.status === 'success' ? state.data : null
  const totalPages = data ? Math.max(1, Math.ceil(data.items.totalCount / pageSize)) : 1
  const details = distinguishingDetails(data?.items.items ?? [])

  // Whether the lines may be changed is the server's answer and nothing else: not the status, not the role,
  // and never worked out here.
  const editable = revision?.canEditRevision === true

  const noLinesText = search || hasPrice !== undefined ? 'Axtarışa uyğun sətir tapılmadı.' : 'Bu sifarişdə sətir yoxdur.'

  return (
    <>
      <PageHeader
        title={data?.locationName ?? 'Sifariş'}
        description={data ? formatPeriod(data.requestPeriod) : undefined}
        actions={
          data && (
            <>
              {/* Until the workflow has been read, the plain badge — the same as for any order. */}
              <OrderStatusBadge
                status={data.status}
                isHistoricalImport={
                  historical?.orderRequestId === data.orderRequestId && historical.isHistoricalImport
                }
              />
              {/* The object page reads the same basis, so the reader comes back to the comparison they left. */}
              <Link
                to={locationLink(data.locationId, selection)}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                Obyektin sifarişləri
              </Link>
            </>
          )
        }
      />

      {notice && (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900" role="status">
          {notice}
        </p>
      )}

      {/*
        A. The decision itself. The first screenful answers, in this order: what does this cost, how does it
        compare with last month, why did it change, and may I decide it. Everything below the fold — the lines,
        the corrections, the histories — is the evidence behind those four answers, not a rival for attention.
      */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3 lg:items-start">
        <div className="order-1 lg:col-span-2 lg:col-start-1 lg:row-start-1">
          {decision ? (
            <DecisionHeadline
              context={decision}
              selection={selection}
              onSelect={selectBasis}
              priorMonths={priorMonths}
            />
          ) : (
            data && (
              <section className="rounded-lg border border-slate-200 bg-white p-4" aria-label="Sifariş xülasəsi">
                <h2 className="text-xs text-slate-500">
                  {data.missingPriceItemCount === 0 ? 'Məbləğ' : knownAmountLabel}
                </h2>
                <p className="mt-1 whitespace-nowrap text-3xl font-semibold text-slate-900">
                  {formatAmount(data.knownAmountTotal)}
                </p>
                {data.missingPriceItemCount > 0 && (
                  <p className="mt-0.5 text-xs text-slate-500">
                    <span className="text-amber-800">{missingPriceCount(data.missingPriceItemCount)}</span>
                    {' · '}
                    {/* The same way to the lines as the headline offers, with the same basis (14.1). */}
                    <Link
                      to={pricingReviewLink(data.orderRequestId, selection)}
                      className="underline hover:text-slate-900"
                    >
                      {pricingReviewLinkLabel}
                    </Link>
                  </p>
                )}
                {/* The comparison is still on its way, or did not come; the amount never waits for it. */}
                {decisionPending && <p className="mt-2 h-4 w-48 animate-pulse rounded bg-slate-100" aria-hidden="true" />}
              </section>
            )
          )}
        </div>

        {/*
          The decision travels with the reader on a wide screen. It is never taller than the screen, so a long
          correction panel below cannot push the buttons — the first thing in it — out of sight while the analysis
          is read. On a phone it comes after the analysis — what happened, why, then the decision — and its buttons
          are fixed to the bottom of the screen instead.
        */}
        <div className="order-3 space-y-3 lg:order-2 lg:col-start-3 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
          {data && (
            <WorkflowPanel
              key={reloadToken}
              orderRequestId={data.orderRequestId}
              onStatusChanged={reload}
              onLoaded={workflowLoaded}
              showHistory={false}
            />
          )}
          {revision && <RevisionPanel revision={revision} onChanged={reload} />}
          {decision && !decision.isLatestVersion && decision.latestOrderRequestId !== null && (
            <p className="rounded-md border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900" role="status">
              Bu ay üçün bu obyektin daha yeni sifarişi var. Rəqəmlər açdığınız sifarişə aiddir.{' '}
              {/* With the reader's basis, like every other link out of this page. */}
              <Link to={orderLink(decision.latestOrderRequestId, selection)} className="font-medium underline">
                {latestOrderLinkLabel}
              </Link>
            </p>
          )}
        </div>

        {decision?.decomposition && (
          <div className="order-2 space-y-4 lg:order-3 lg:col-span-2 lg:col-start-1 lg:row-start-2">
            <CauseSummary
              decomposition={decision.decomposition}
              basis={decision.primary.basis}
              windowPeriods={decision.primary.windowPeriods}
              selected={cause}
              onSelect={selectCauseFromReason}
            />
            {/* An order in which nothing moved still lists the products it was compared on. */}
            {decision.decomposition.drivers.length + decision.decomposition.steady.length > 0 && (
              <DriverList
                drivers={decision.decomposition.drivers}
                steady={decision.decomposition.steady}
                products={decision.decomposition.products}
                variantTransitions={decision.decomposition.variantTransitions}
                filter={cause}
                onFilter={selectCause}
                headingRef={driversHeading}
                onHistory={openProduct}
              />
            )}
          </div>
        )}
      </div>

      {/* C. Sətirlər */}
      <SectionHeader title="Sətirlər" />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            setSearch(searchInput.trim())
            setPage(1)
          }}
        >
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Məhsul adı…"
            className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-sm sm:w-72"
          />
        </form>

        <select
          value={hasPrice === undefined ? '' : String(hasPrice)}
          onChange={(event) => {
            setHasPrice(event.target.value === '' ? undefined : event.target.value === 'true')
            setPage(1)
          }}
          className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
        >
          <option value="">Bütün sətirlər</option>
          <option value="true">Qiyməti olan sətirlər</option>
          <option value="false">{missingPriceShortLabel}</option>
        </select>

        {/* Offered only where the server says this version may be edited; the endpoint checks again. */}
        {editable && (
          <button
            type="button"
            onClick={() => setDialog({ kind: 'add' })}
            className="ml-auto rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            {addLineLabel}
          </button>
        )}
      </div>

      {/* Ten columns from 1024 pixels; below that, where they would scroll sideways, the same lines as cards. */}
      <div className="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white lg:block">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
            <tr>
              <th className="px-3 py-3">#</th>
              <th className="px-3 py-3">Məhsul</th>
              <th className="px-3 py-3">Spesifikasiya</th>
              <th className="px-3 py-3 text-right">Miqdar</th>
              <th className="px-3 py-3">Vahid</th>
              <th className="px-3 py-3 text-right">Qiymət</th>
              <th className="px-3 py-3 text-right">Cəmi</th>
              <th className="px-3 py-3">Təchizatçı</th>
              <th className="px-3 py-3">Kateqoriya</th>
              <th className="px-3 py-3">Mənbə</th>
              {editable && (
                <th className="px-3 py-3">
                  <span className="sr-only">Əməliyyatlar</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {state.status === 'loading' && (
              <tr>
                <td colSpan={editable ? 11 : 10} className="px-4 py-6 text-center text-slate-500">
                  Yüklənir…
                </td>
              </tr>
            )}
            {data?.items.items.length === 0 && (
              <tr>
                <td colSpan={editable ? 11 : 10} className="px-4 py-6 text-center text-slate-500">
                  {noLinesText}
                </td>
              </tr>
            )}

            {data?.items.items.map((item, index) => (
              <tr key={item.orderRequestItemId} className="hover:bg-slate-50">
                <td className="px-3 py-2 text-xs text-slate-400">{(data.items.page - 1) * data.items.pageSize + index + 1}</td>
                <td className="px-3 py-2">
                  <p className="font-medium text-slate-900">{item.productName}</p>
                </td>
                <td className="px-3 py-2 text-slate-700">
                  <SpecificationCell item={item} detail={details[index]} />
                </td>
                <td className="px-3 py-2 text-right text-slate-900">{formatQuantity(item.quantity)}</td>
                <td className="px-3 py-2 text-slate-700">
                  <UnitCell item={item} />
                </td>
                <td className="px-3 py-2 text-right">
                  {/*
                    A blank price means three different things, and the line itself says which. Material the
                    company supplies itself was never going to have a purchase price, so it is described in
                    calm grey — calling it "Qiymət yoxdur" sent people looking for a number that does not
                    exist. The other two are amber, because in both cases a price is still owed; what the
                    unclassified one adds is that nobody has yet said whether it really is.
                  */}
                  <PriceCell item={item} />
                </td>
                <td className="px-3 py-2 text-right text-slate-900">
                  {/* Never a zero: no amount was recorded, for either reason. */}
                  {item.lineTotal === null ? <span className="text-slate-400">—</span> : formatAmount(item.lineTotal)}
                </td>
                <td className="px-3 py-2 text-slate-700">
                  <SupplierCell item={item} />
                </td>
                <td className="px-3 py-2 text-xs text-slate-600">
                  {item.categoryPath.length > 0 ? item.categoryPath.join(' › ') : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-3 py-2">
                  {/* Secondary next to Redaktə et / Sil: provenance is looked up, not acted on. */}
                  <button
                    type="button"
                    onClick={() => setSource({ id: item.orderRequestItemId, name: item.productName })}
                    className="text-xs text-slate-500 underline hover:text-slate-800"
                  >
                    Mənbəyə bax
                  </button>
                </td>
                {editable && (
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDialog({ kind: 'edit', item })}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        {editLineLabel}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDialog({ kind: 'remove', item })}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        {removeLineLabel}
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul aria-label="Sətirlər" className="space-y-2 lg:hidden">
        {state.status === 'loading' && (
          <li className="rounded-lg border border-slate-200 bg-white p-3 text-center text-sm text-slate-500">Yüklənir…</li>
        )}
        {data?.items.items.length === 0 && (
          <li className="rounded-lg border border-slate-200 bg-white p-3 text-center text-sm text-slate-500">
            {noLinesText}
          </li>
        )}

        {data?.items.items.map((item, index) => (
          <LineCard
            key={item.orderRequestItemId}
            item={item}
            number={(data.items.page - 1) * data.items.pageSize + index + 1}
            detail={details[index]}
            editable={editable}
            onSource={() => setSource({ id: item.orderRequestItemId, name: item.productName })}
            onEdit={() => setDialog({ kind: 'edit', item })}
            onRemove={() => setDialog({ kind: 'remove', item })}
          />
        ))}
      </ul>

      {data && data.items.totalCount > pageSize && (
        <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
          <span>
            Səhifə {data.items.page} / {totalPages} · {formatNumber(data.items.totalCount)} sətir
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40"
            >
              Əvvəlki
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded border border-slate-200 px-3 py-1 disabled:opacity-40"
            >
              Növbəti
            </button>
          </div>
        </div>
      )}

      {revision && <HistoryTabs orderRequestId={id} editHistory={revision.editHistory} reloadToken={reloadToken} />}

      {/* Room at the end on a phone, so the last line and the histories can be scrolled clear of the decision
          buttons fixed to the bottom of the screen. */}
      {data && <div aria-hidden="true" className="h-24 lg:hidden" />}

      {/* No other dialog opens inside the history: one would have to open on a later render than it (Task 17). */}
      {product && data && (
        <TrendModal
          locationId={data.locationId}
          variant={product.variant}
          isService={product.analyticsKind === 'AmountOrientedService'}
          from={monthKey(data.requestPeriod, -11)}
          to={monthKey(data.requestPeriod, 0)}
          driver={product}
          // The same basis the page compares against (Task 1), with the two quantities its row already shows.
          quantityRatio={decision
            ? {
              basis: decision.primary.basis,
              windowPeriods: decision.primary.windowPeriods,
              baseline: product.baselineQuantity,
              current: product.currentQuantity,
            }
            : null}
          onClose={closeProduct}
        />
      )}

      {source && (
        <ItemSourceDrawer
          orderRequestItemId={source.id}
          productName={source.name}
          onClose={() => setSource(null)}
        />
      )}

      {/* Every dialog sends the row version it was opened with, and answers a 409 by reloading. */}
      {dialog?.kind === 'edit' && revision && (
        <EditLineDialog
          orderRequestId={id}
          item={dialog.item}
          rowVersion={revision.rowVersion}
          onClose={() => setDialog(null)}
          onSaved={() => afterChange(null)}
          onStale={() => afterChange(staleDataMessage)}
        />
      )}

      {dialog?.kind === 'remove' && revision && (
        <RemoveLineDialog
          orderRequestId={id}
          item={dialog.item}
          rowVersion={revision.rowVersion}
          onClose={() => setDialog(null)}
          onSaved={() => afterChange(null)}
          onStale={() => afterChange(staleDataMessage)}
        />
      )}

      {dialog?.kind === 'add' && revision && (
        <AddLineDialog
          orderRequestId={id}
          rowVersion={revision.rowVersion}
          onClose={() => setDialog(null)}
          onSaved={() => afterChange(null)}
          onStale={() => afterChange(staleDataMessage)}
        />
      )}
    </>
  )
}

/**
 * What a line's price cell says.
 *
 * Three different situations look identical in the database — an empty cell — and only two of them are a
 * problem. Material the company issues from its own store was never going to carry a purchase price, so it
 * is described in calm grey; calling it "Qiymət yoxdur" sent people looking for a number that does not exist.
 * The other two are amber, because a price is still owed; what the unclassified one adds is that nobody has
 * yet said whether it really is.
 */
function PriceCell({ item }: { item: OrderRequestItem }) {
  if (item.unitPrice !== null) {
    return <span className="text-slate-900">{formatAmount(item.unitPrice)}</span>
  }

  const state = classifyLine(item.unitPrice, item.pricingMode)

  if (isInternalSupply(state)) {
    return (
      <span className={`inline-flex items-center gap-1 ${lineToneClass(state)}`}>
        {internalSupplyLabel}
        <InfoHint label="Daxili təminat nədir?">{internalSupplyHint}</InfoHint>
      </span>
    )
  }

  if (state === 'MissingUnclassified') {
    return (
      <span className={`inline-flex items-center gap-1 ${lineToneClass(state)}`}>
        {missingPriceLabel}
        <InfoHint label="Təsnif edilməyib nə deməkdir?">{unclassifiedHint}</InfoHint>
      </span>
    )
  }

  return <span className={lineToneClass(state)}>{missingPriceLabel}</span>
}

/**
 * The specification a manager can read — "5 litr", "28 diş" — or a dash.
 *
 * A bare number and a model code mean nothing to the person deciding, so they are not shown; the "Mənbəyə bax"
 * drawer still has every one of them. The single exception is a line that would otherwise read exactly like
 * another on the same page, which gets back the one detail that tells the two apart.
 */
function SpecificationCell({ item, detail }: { item: OrderRequestItem; detail: string | null }) {
  const specification = specificationText(item, detail)

  if (specification === null) {
    return <span className="text-slate-400">—</span>
  }

  return <>{specification}</>
}

function specificationText(item: OrderRequestItem, detail: string | null): string | null {
  const parts = [describeSpecification(item), detail].filter((part): part is string => part !== null)
  return parts.length === 0 ? null : parts.join(' · ')
}

/** The line's unit in words, or the word for a line that has none. */
function UnitCell({ item }: { item: OrderRequestItem }) {
  return item.orderUnitCode
    ? <>{formatOrderUnit(item.orderUnitCode, item.orderUnitName)}</>
    : <span className="text-slate-500">{formatOrderUnit(null)}</span>
}

/**
 * One line on a phone, where the table's ten columns would scroll sideways. Every fact of the table's row, by the
 * same cells, in reading order: the product and what it cost; how much of it, at what price; who supplied it and
 * where it sits in the catalogue; and what can be done with it. Nothing here is kept to one line except the
 * amounts, so a long name wraps instead of widening the page.
 */
function LineCard({ item, number, detail, editable, onSource, onEdit, onRemove }: {
  item: OrderRequestItem
  /** The line's place in the whole order, as the table's first column counts it. */
  number: number
  detail: string | null
  editable: boolean
  onSource: () => void
  onEdit: () => void
  onRemove: () => void
}) {
  return (
    <li className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words font-medium text-slate-900">
            <span className="mr-1.5 text-xs font-normal text-slate-400">{number}</span>
            {item.productName}
          </p>
          {/* The table's dash for no specification is not repeated here: an absent line says the same. */}
          {specificationText(item, detail) !== null && (
            <p className="mt-0.5 text-xs text-slate-500">
              <SpecificationCell item={item} detail={detail} />
            </p>
          )}
        </div>
        <p className="shrink-0 text-right">
          {/* Never a zero: no amount was recorded, for either reason. */}
          {item.lineTotal === null
            ? <span className="text-slate-400">—</span>
            : <span className="whitespace-nowrap font-medium text-slate-900">{formatAmount(item.lineTotal)}</span>}
        </p>
      </div>

      {/* "12 ədəd × 4,50 ₼", or, with no price, what the missing price means — the table's own words and colours. */}
      <p className="mt-1 text-sm text-slate-700">
        {formatQuantity(item.quantity)} <UnitCell item={item} />
        {item.unitPrice !== null ? ' × ' : ' · '}
        <PriceCell item={item} />
      </p>

      <p className="mt-1 text-xs text-slate-500">
        <SupplierCell item={item} />
        {item.categoryPath.length > 0 && ` · ${item.categoryPath.join(' › ')}`}
      </p>

      <div className="mt-2 flex items-center gap-1.5 border-t border-slate-100 pt-2">
        <button type="button" onClick={onSource} className="text-xs text-slate-500 underline hover:text-slate-800">
          Mənbəyə bax
        </button>
        {editable && (
          <div className="ml-auto flex gap-1.5">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              {editLineLabel}
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
            >
              {removeLineLabel}
            </button>
          </div>
        )}
      </div>
    </li>
  )
}

/**
 * Who supplied the line.
 *
 * An internally supplied line has no catalogue supplier at all, so this cell used to read "Məlum deyil" —
 * which says the record is incomplete. It is not: the material came out of one of our own stores, and the
 * workbook usually says which.
 */
function SupplierCell({ item }: { item: OrderRequestItem }) {
  if (isInternalSupply(classifyLine(item.unitPrice, item.pricingMode))) {
    return <span className="text-slate-600">{internalSupplierLabel(item.sourceSupplierName)}</span>
  }

  return item.supplierName === null
    ? <span className="text-slate-500">{unknownSupplierLabel}</span>
    : <>{item.supplierName}</>
}

/** Whether this history entry was pushed by opening a product on this page, rather than arrived at by a link. */
function isProductDrawerEntry(state: unknown): boolean {
  return typeof state === 'object' && state !== null && (state as { productDrawer?: unknown }).productDrawer === true
}

/** A product of the comparison by its variant: among the products that moved first, then the steady ones. */
function driverOf(decomposition: DecisionDecomposition, productVariantId: number): DecisionDriver | null {
  const byVariant = (driver: DecisionDriver) => driver.variant.productVariantId === productVariantId
  return decomposition.drivers.find(byVariant) ?? decomposition.steady.find(byVariant) ?? null
}

/**
 * A month offset from another, as the analytics API spells months. Computed on the parts rather than
 * through a Date, which would be read in the browser's own time zone and could land a month out.
 */
function monthKey(period: string, offset: number): string {
  const [year, month] = period.split('-').map(Number)
  const zeroBased = year * 12 + (month - 1) + offset
  return `${String(Math.floor(zeroBased / 12)).padStart(4, '0')}-${String((zeroBased % 12) + 1).padStart(2, '0')}`
}

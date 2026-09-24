import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { fetchDecisionContext, type DecisionDriver, type OrderDecisionContext } from '../api/decisions'
import { basisParams, basisRequest, type BasisSelection } from '../analytics/basisParams'
import { useBasis } from '../analytics/useBasis'
import { fetchOrder, type OrderRequestDetail, type OrderRequestItem } from '../api/orders'
import { fetchRevision, type OrderRevision } from '../api/revisions'
import { PageHeader } from '../components/PageHeader'
import { SectionHeader } from '../components/SectionHeader'
import { StatusBadge } from '../components/StatusBadge'
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
  unclassifiedHint,
} from '../pricing/labels'
import { TrendModal } from '../components/analytics/TrendModal'
import { CauseSummary } from '../components/decisions/CauseSummary'
import { DecisionHeadline } from '../components/decisions/DecisionHeadline'
import { DriverList } from '../components/decisions/DriverList'
import { ItemSourceDrawer } from '../components/orders/ItemSourceDrawer'
import { AddLineDialog } from '../components/orders/revision/AddLineDialog'
import { EditLineDialog } from '../components/orders/revision/EditLineDialog'
import { HistoryTabs } from '../components/orders/revision/HistoryTabs'
import { RemoveLineDialog } from '../components/orders/revision/RemoveLineDialog'
import { RevisionPanel } from '../components/orders/revision/RevisionPanel'
import { addLineLabel, editLineLabel, removeLineLabel, staleDataMessage } from '../components/orders/revision/labels'
import { WorkflowPanel } from '../components/workflow/WorkflowPanel'
import { workflowStatusClass, workflowStatusLabels, workflowStatusSign } from '../components/workflow/labels'
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
  const [history, setHistory] = useState<DecisionDriver | null>(null)

  // Bumped after every change, so the lines, the correction state and both histories are re-read together
  // rather than each drifting on its own copy.
  const [reloadToken, setReloadToken] = useState(0)
  const reload = useCallback(() => setReloadToken((token) => token + 1), [])

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

  /**
   * The months this object can be compared against, oldest first.
   *
   * They come from the "Bütün dövr" window, which is every month the company has ordered in before this one —
   * the same set the dashboard offers, so the two screens agree about what a hand-picked range may contain.
   */
  const priorMonths = (decision?.secondary.find((item) => item.basis === 'AllPriorMonths')?.windowPeriods
    ?? decision?.primary.windowPeriods
    ?? []).map((period) => period.slice(0, 7))

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

  return (
    <>
      <PageHeader
        title={data?.locationName ?? 'Sifariş'}
        description={data ? formatPeriod(data.requestPeriod) : undefined}
        actions={
          data && (
            <>
              <StatusBadge
                label={workflowStatusLabels[data.status] ?? data.status}
                sign={workflowStatusSign[data.status]}
                toneClass={workflowStatusClass[data.status]}
              />
              <Link
                to={`/locations/${data.locationId}`}
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
                  <p className="mt-0.5 text-xs text-amber-800">{missingPriceCount(data.missingPriceItemCount)}</p>
                )}
                {/* The comparison is still on its way, or did not come; the amount never waits for it. */}
                {decisionPending && <p className="mt-2 h-4 w-48 animate-pulse rounded bg-slate-100" aria-hidden="true" />}
              </section>
            )
          )}
        </div>

        {/*
          The decision travels with the reader on a wide screen, and simply follows the amount on a narrow one.
          It is never taller than the screen, so a long correction panel below cannot push the buttons — the
          first thing in it — out of sight while the analysis is read.
        */}
        <div className="order-2 space-y-3 lg:col-start-3 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
          {data && (
            <WorkflowPanel
              key={reloadToken}
              orderRequestId={data.orderRequestId}
              onStatusChanged={reload}
              showHistory={false}
            />
          )}
          {revision && <RevisionPanel revision={revision} onChanged={reload} />}
          {decision && !decision.isLatestVersion && decision.latestOrderRequestId !== null && (
            <p className="rounded-md border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900" role="status">
              Bu ay üçün bu obyektin daha yeni sifarişi var. Rəqəmlər açdığınız sifarişə aiddir.{' '}
              <Link to={`/orders/${decision.latestOrderRequestId}`} className="font-medium underline">
                {latestOrderLinkLabel}
              </Link>
            </p>
          )}
        </div>

        {decision?.decomposition && (
          <div className="order-3 space-y-4 lg:col-span-2 lg:col-start-1 lg:row-start-2">
            <CauseSummary
              decomposition={decision.decomposition}
              basis={decision.primary.basis}
              windowPeriods={decision.primary.windowPeriods}
            />
            {decision.decomposition.drivers.length > 0 && (
              <DriverList
                drivers={decision.decomposition.drivers}
                products={decision.decomposition.products}
                onHistory={setHistory}
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

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
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
                  {search || hasPrice !== undefined ? 'Axtarışa uyğun sətir tapılmadı.' : 'Bu sifarişdə sətir yoxdur.'}
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
                  {item.orderUnitCode ? (
                    formatOrderUnit(item.orderUnitCode, item.orderUnitName)
                  ) : (
                    <span className="text-slate-500">{formatOrderUnit(null)}</span>
                  )}
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

      {history && data && (
        <TrendModal
          locationId={data.locationId}
          variant={history.variant}
          isService={history.analyticsKind === 'AmountOrientedService'}
          from={monthKey(data.requestPeriod, -11)}
          to={monthKey(data.requestPeriod, 0)}
          driver={history}
          // The same basis the page compares against (Task 1), with the two quantities its row already shows.
          quantityRatio={decision
            ? {
              basis: decision.primary.basis,
              windowPeriods: decision.primary.windowPeriods,
              baseline: history.baselineQuantity,
              current: history.currentQuantity,
            }
            : null}
          onClose={() => setHistory(null)}
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
  const specification = describeSpecification(item)

  if (specification === null && detail === null) {
    return <span className="text-slate-400">—</span>
  }

  return <>{[specification, detail].filter((part): part is string => part !== null).join(' · ')}</>
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

/**
 * A month offset from another, as the analytics API spells months. Computed on the parts rather than
 * through a Date, which would be read in the browser's own time zone and could land a month out.
 */
function monthKey(period: string, offset: number): string {
  const [year, month] = period.split('-').map(Number)
  const zeroBased = year * 12 + (month - 1) + offset
  return `${String(Math.floor(zeroBased / 12)).padStart(4, '0')}-${String((zeroBased % 12) + 1).padStart(2, '0')}`
}

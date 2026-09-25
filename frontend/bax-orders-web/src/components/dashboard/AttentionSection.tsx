import { Link } from 'react-router'
import type {
  DashboardAttention,
  DashboardCauseProduct,
  LocationDashboardRow,
  ManagementDashboardSummary,
} from '../../api/dashboard'
import type { BasisSelection } from '../../analytics/basisParams'
import { costDirectionSentence, productShareLabel } from '../../terminology/terms'
import { DirectionWord } from '../analytics/DirectionWord'
import { InfoHint } from '../analytics/InfoHint'
import {
  costDirectionToneClass,
  describeBasisCaption,
  formatMoney,
  formatMoneyDelta,
  formatPercent,
} from '../analytics/format'
import { causeTieOrder } from '../decisions/labels'
import {
  interactiveSurfaceClass,
  interactiveTextClass,
  openSurfaceLink,
  surfaceLinkAttribute,
  surfaceLinkClass,
} from '../interaction'
import { DetailsCue, detailsName, detailsTarget } from './details'
import {
  alsoFirstLine,
  attentionReasonIsMissingPrice,
  attentionTitle,
  causeHeadline,
  noComparisonCause,
  strongPercentageHint,
  supplyChangedNote,
} from './labels'
import { MissingPriceMark } from './MissingPriceMark'

/** How many secondary causes a card shows before it stops being a summary. */
const secondaryCount = 2

interface AttentionSectionProps {
  attention: DashboardAttention[]
  summary: ManagementDashboardSummary
  /** What the cards are comparing against — shown on each card and carried into the order it opens. */
  selection: BasisSelection
}

/**
 * The objects worth reading first, and why each one is here.
 *
 * This is not a ranking of performance and not a score. Every card is on the screen because of a fact the data
 * states outright — it moved the most money, it moved by a large share of a real baseline, somebody owes a
 * price on it, or it has nothing behind it to compare against — and the card says which of those it is. An
 * object never disappears from the full table below for failing to appear here.
 */
export function AttentionSection({ attention, summary, selection }: AttentionSectionProps) {
  // Said on every card: a figure whose basis is not on screen is a figure a reader has to remember the
  // basis for, and they will remember the wrong one.
  const caption = describeBasisCaption(summary.basis, summary.baselinePeriods)

  if (attention.length === 0) {
    return null
  }

  return (
    <section className="mb-6" aria-label="Diqqət tələb edən obyektlər">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">Diqqət tələb edən obyektlər</h2>
        <p className="text-xs text-slate-500">
          Bütün obyektlər aşağıdakı cədvəldədir; bu bölmə yalnız oxuma sırasıdır.
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {attention.map((item) => (
          <li key={item.location.locationId}>
            <Card item={item} caption={caption} selection={selection} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function Card({
  item,
  caption,
  selection,
}: {
  item: DashboardAttention
  caption: string
  selection: BasisSelection
}) {
  const row = item.location

  // Amber means a price somebody owes is missing, and nothing else: the "Qiymət yoxdur" title and the ⚠ mark.
  const isMissingPrice = attentionReasonIsMissingPrice[item.reason]
  const alsoFirst = alsoFirstLine(item.alsoFirstIn)

  return (
    /*
      The id is where Back returns the reader to: the card they opened. The whole card opens the object (20.1): a
      click anywhere on it is handed to its one link, the object's name, so there is no second link inside it and
      the ⓘ beside the title keeps its own click.
    */
    <article
      id={`attention-${row.locationId}`}
      onClick={openSurfaceLink}
      className={`group flex h-full flex-col rounded-lg border border-slate-200 bg-white p-4 ${interactiveSurfaceClass}`}
    >
      <p className={`flex items-center gap-1 text-xs ${isMissingPrice ? 'font-medium text-amber-800' : 'text-slate-500'}`}>
        {attentionTitle(item.reason, item.rank)}
        {/* "The largest" is only checkable if the reader can see what it is the largest of. */}
        {item.reason === 'StrongPercentageChange' && (
          <InfoHint label="Faiz dəyişməsi necə seçilir?">{strongPercentageHint}</InfoHint>
        )}
      </p>
      <p className="mt-0.5 font-medium text-slate-900">
        <Link
          {...surfaceLinkAttribute}
          to={detailsTarget(row, selection)}
          aria-label={detailsName(row)}
          className={`${surfaceLinkClass} ${interactiveTextClass}`}
        >
          {row.locationName}
        </Link>
      </p>
      {alsoFirst && <p className="text-xs text-slate-500">{alsoFirst}</p>}

      {/* The amount itself is never coloured: it is a sum, not a direction. A missing price is marked beside it. */}
      <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
        <span className="whitespace-nowrap text-2xl font-semibold text-slate-900">{formatMoney(row.current.knownAmount)}</span>
        <MissingPriceMark count={row.current.missingPriceItemCount} explanationIsComplete={row.explanationIsComplete} />
      </p>

      {row.knownAmountDelta === null ? (
        <p className="mt-0.5 text-sm text-slate-600">{noComparisonCause}</p>
      ) : (
        <>
          {/* Red up, green down (9.1): the direction of the cost, never a verdict on it — said in the words below. */}
          <p className={`mt-0.5 flex flex-wrap items-baseline gap-x-2 text-sm font-medium ${costDirectionToneClass(row.knownAmountDelta)}`}>
            <span className="whitespace-nowrap">{formatMoneyDelta(row.knownAmountDelta)}</span>
            <span className="whitespace-nowrap">{formatPercent(row.knownAmountPercentChange)}</span>
          </p>
          <p className="text-xs text-slate-500">{costDirectionSentence(caption, row.knownAmountDelta)}</p>
        </>
      )}

      <Causes row={row} />

      <div className="mt-auto pt-3">
        <DetailsCue />
      </div>
    </article>
  )
}

/**
 * The reason the money moved, largest first, the product that did most of it, and the next two causes beneath.
 * The causes and the product come from the same decomposition the decision screen uses, so the card and the
 * page it opens never disagree.
 */
function Causes({ row }: { row: LocationDashboardRow }) {
  if (row.primaryCause === null || row.primaryCauseAmount === null) {
    return null
  }

  // Two causes of the same size fall in the order the order page uses, so the two screens agree on ties too.
  const secondary = row.causes
    .filter((cause) => cause.category !== row.primaryCause)
    .sort((left, right) => Math.abs(right.amount) - Math.abs(left.amount)
      || causeTieOrder.indexOf(left.category) - causeTieOrder.indexOf(right.category))
    .slice(0, secondaryCount)

  return (
    <div className="mt-3 border-t border-slate-100 pt-2">
      {/* The main cause stays the loudest thing here; the rest is supporting text in grey. */}
      <p className="text-xs text-slate-500">Əsas səbəb</p>
      <p className="text-sm text-slate-900">
        <span className="font-medium">{causeHeadline(row.primaryCause, row.primaryCauseAmount)}</span>{' '}
        <span className={`whitespace-nowrap font-medium ${costDirectionToneClass(row.primaryCauseAmount)}`}>
          {formatMoneyDelta(row.primaryCauseAmount)}
        </span>
      </p>

      {row.primaryCauseProduct !== null && <CauseProduct product={row.primaryCauseProduct} />}

      {secondary.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {secondary.map((cause) => (
            <li key={cause.category} className="text-xs text-slate-500">
              {causeHeadline(cause.category, cause.amount)}{' '}
              <span className={`whitespace-nowrap ${costDirectionToneClass(cause.amount)}`}>
                {formatMoneyDelta(cause.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Neutral: a product that moved from being bought to being supplied internally is a change in
          arrangement, not a gap in the records, so it is stated rather than warned about. */}
      {row.supplyChangedVariantCount > 0 && (
        <p className="mt-1 text-xs text-slate-500">{supplyChangedNote(row.supplyChangedVariantCount)}</p>
      )}
    </div>
  )
}

/**
 * The product that did most of the main cause, and its share of every movement that way (7.1, 7.1a). Quieter
 * than the cause above it and louder than the causes below. Text, not a link: the card itself already opens the
 * order, where this product is the first row of its cause in "Əsas dəyişikliklər".
 */
function CauseProduct({ product }: { product: DashboardCauseProduct }) {
  return (
    <p className="text-sm text-slate-700">
      {product.productName}
      {' — '}
      <span className={`whitespace-nowrap font-medium ${costDirectionToneClass(product.amount)}`}>
        {formatMoneyDelta(product.amount)}
        <DirectionWord value={product.amount} />
      </span>{' '}
      <span className="whitespace-nowrap">({productShareLabel(product.amount, product.sameDirectionAmount)})</span>
    </p>
  )
}

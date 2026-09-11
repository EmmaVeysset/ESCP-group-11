import channelEconomics from '../data/generated/channel-economics.json';
import costBreakdown from '../data/generated/cost-breakdown.json';
import priceSensitivityCurve from '../data/generated/price-sensitivity-curve.json';
import marketingFunnel from '../data/generated/marketing-funnel.json';
import seasonality from '../data/generated/seasonality.json';
import competitorPriceHistory from '../data/generated/competitor-price-history.json';
import customerSurvey from '../data/generated/customer-survey.safe.json';

export type SalesChannel = keyof typeof channelEconomics.channels;
export const SALES_CHANNELS = Object.keys(channelEconomics.channels) as SalesChannel[];

export type MarketingChannel = keyof typeof marketingFunnel.summaryByChannel;
export const MARKETING_CHANNELS = Object.keys(marketingFunnel.summaryByChannel) as MarketingChannel[];

export const COGS_PER_UNIT_EUR = costBreakdown.cogsPerUnitEur;
export const REFERENCE_RETAIL_PRICE_EUR = costBreakdown.referenceRetailPriceEur;

/** What LUMEN nets per unit after retailer/distributor/payment cuts — the retail-to-LUMEN bridge. */
export function netPriceToLumen(retailPriceEur: number, channel: SalesChannel): number {
  const rates = channelEconomics.channels[channel];
  const afterCuts = retailPriceEur * (1 - rates.retailerMarginPct - rates.distributorCutPct);
  const afterPayment = afterCuts * (1 - rates.paymentProcessingPct);
  return afterPayment - rates.fulfillmentCostEur;
}

export function unitContribution(retailPriceEur: number, channel: SalesChannel): number {
  return netPriceToLumen(retailPriceEur, channel) - COGS_PER_UNIT_EUR;
}

export function contributionMarginPct(retailPriceEur: number, channel: SalesChannel): number {
  const net = netPriceToLumen(retailPriceEur, channel);
  return net > 0 ? (unitContribution(retailPriceEur, channel) / net) * 100 : 0;
}

export type ChannelWeights = Record<SalesChannel, number>;

function normalize(weights: Record<string, number>): Record<string, number> {
  const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
  if (total <= 0) return Object.fromEntries(Object.keys(weights).map((k) => [k, 0]));
  return Object.fromEntries(Object.entries(weights).map(([k, w]) => [k, w / total]));
}

export function blendedUnitContribution(retailPriceEur: number, weights: ChannelWeights): number {
  const normalized = normalize(weights);
  return SALES_CHANNELS.reduce((sum, ch) => sum + (normalized[ch] ?? 0) * unitContribution(retailPriceEur, ch), 0);
}

export function blendedNetPrice(retailPriceEur: number, weights: ChannelWeights): number {
  const normalized = normalize(weights);
  return SALES_CHANNELS.reduce((sum, ch) => sum + (normalized[ch] ?? 0) * netPriceToLumen(retailPriceEur, ch), 0);
}

export function blendedContributionMarginPct(retailPriceEur: number, weights: ChannelWeights): number {
  const net = blendedNetPrice(retailPriceEur, weights);
  return net > 0 ? (blendedUnitContribution(retailPriceEur, weights) / net) * 100 : 0;
}

/** Linear interpolation over the price-sensitivity acceptance curve (Van Westendorp acceptable range). */
export function acceptancePctAt(retailPriceEur: number, segment?: string): number {
  const prices = priceSensitivityCurve.prices;
  const series = segment
    ? (priceSensitivityCurve.bySegmentAcceptancePct as Record<string, number[]>)[segment]
    : priceSensitivityCurve.overallAcceptancePct;
  if (!series) return 0;

  const clamped = Math.min(Math.max(retailPriceEur, prices[0]), prices[prices.length - 1]);
  let hi = prices.findIndex((p) => p >= clamped);
  if (hi <= 0) hi = 1;
  const lo = hi - 1;
  const span = prices[hi] - prices[lo];
  const t = span === 0 ? 0 : (clamped - prices[lo]) / span;
  return series[lo] + t * (series[hi] - series[lo]);
}

export const PRICE_SENSITIVITY_SEGMENTS = Object.keys(priceSensitivityCurve.bySegmentAcceptancePct);

/**
 * Contribution Index: expected contribution per 1,000 price-addressable people at a given price
 * and channel mix — acceptance% (fewer buyers as price rises) times unit contribution (more margin
 * as price rises). This isolates the volume/margin trade-off without needing an absolute Germany
 * unit-sales forecast, which the data room deliberately doesn't contain.
 */
export function contributionIndexPer1000(retailPriceEur: number, weights: ChannelWeights, segment?: string): number {
  const acceptanceShare = acceptancePctAt(retailPriceEur, segment) / 100;
  return acceptanceShare * 1000 * blendedUnitContribution(retailPriceEur, weights);
}

export function findOptimalPrice(weights: ChannelWeights, segment?: string): { priceEur: number; contributionIndex: number } {
  let best = { priceEur: priceSensitivityCurve.prices[0], contributionIndex: -Infinity };
  for (const price of priceSensitivityCurve.prices) {
    const index = contributionIndexPer1000(price, weights, segment);
    if (index > best.contributionIndex) best = { priceEur: price, contributionIndex: index };
  }
  return best;
}

function singleChannelWeights(channel: SalesChannel): ChannelWeights {
  return Object.fromEntries(SALES_CHANNELS.map((ch) => [ch, ch === channel ? 1 : 0])) as ChannelWeights;
}

/** Best single launch channel: whichever channel's own optimal price yields the highest contribution index. */
export function bestSingleChannel(): { channel: SalesChannel; priceEur: number; contributionIndex: number } {
  const candidates = SALES_CHANNELS.map((channel) => ({ channel, ...findOptimalPrice(singleChannelWeights(channel)) }));
  return candidates.reduce((best, c) => (c.contributionIndex > best.contributionIndex ? c : best));
}

// --- Marketing ROI: CAC / LTV rescaled from home-market observations to the chosen price/channel ---

const HOME_MARKET_UNIT_CONTRIBUTION_AT_REFERENCE: ChannelWeights = SALES_CHANNELS.reduce(
  (acc, ch) => ({ ...acc, [ch]: unitContribution(REFERENCE_RETAIL_PRICE_EUR, ch) }),
  {} as ChannelWeights,
);

export function ltvRescaleFactor(retailPriceEur: number, weights: ChannelWeights): number {
  const normalized = normalize(weights);
  const homeBlended = SALES_CHANNELS.reduce(
    (sum, ch) => sum + (normalized[ch] ?? 0) * HOME_MARKET_UNIT_CONTRIBUTION_AT_REFERENCE[ch],
    0,
  );
  if (homeBlended <= 0) return 1;
  return blendedUnitContribution(retailPriceEur, weights) / homeBlended;
}

export type MarketingWeights = Record<MarketingChannel, number>;

export function cacFor(channel: MarketingChannel): number {
  return marketingFunnel.summaryByChannel[channel].avgCacEur;
}

const ACCEPTANCE_AT_REFERENCE_PRICE = acceptancePctAt(REFERENCE_RETAIL_PRICE_EUR);
const CAC_MULTIPLIER_BOUNDS: [number, number] = [0.5, 5];

/**
 * Historical CAC was observed at the home-market reference price (~EUR1.35), not at Germany's
 * candidate prices. A price fewer people find acceptable should be harder — not just less
 * profitable per sale — to convert, so CAC is rescaled by relative acceptance vs the reference
 * price. This is a modelling assumption (bounded 0.5x-5x), not an empirical figure.
 */
export function effectiveCac(channel: MarketingChannel, retailPriceEur: number): number {
  const base = cacFor(channel);
  const acceptanceNow = acceptancePctAt(retailPriceEur);
  if (acceptanceNow <= 0) return base * CAC_MULTIPLIER_BOUNDS[1];
  const multiplier = ACCEPTANCE_AT_REFERENCE_PRICE / acceptanceNow;
  return base * Math.min(Math.max(multiplier, CAC_MULTIPLIER_BOUNDS[0]), CAC_MULTIPLIER_BOUNDS[1]);
}

export function ltvAt(retailPriceEur: number, salesWeights: ChannelWeights, marketingChannel: MarketingChannel): number {
  const baseline = marketingFunnel.summaryByChannel[marketingChannel].avgLtvEstimateEur;
  return baseline * ltvRescaleFactor(retailPriceEur, salesWeights);
}

export function ltvToCac(retailPriceEur: number, salesWeights: ChannelWeights, marketingChannel: MarketingChannel): number {
  const cac = effectiveCac(marketingChannel, retailPriceEur);
  return cac > 0 ? ltvAt(retailPriceEur, salesWeights, marketingChannel) / cac : 0;
}

/** Average monthly purchase frequency for adopters, blended across the German survey respondents. */
export const BLENDED_PURCHASE_FREQUENCY_PER_MONTH =
  customerSurvey.rows.reduce((sum, r) => sum + Number.parseFloat(r.purchase_frequency_per_month), 0) / customerSurvey.rows.length;

export function paybackMonths(retailPriceEur: number, salesWeights: ChannelWeights, marketingChannel: MarketingChannel): number {
  const monthlyContribution = BLENDED_PURCHASE_FREQUENCY_PER_MONTH * blendedUnitContribution(retailPriceEur, salesWeights);
  if (monthlyContribution <= 0) return Infinity;
  return effectiveCac(marketingChannel, retailPriceEur) / monthlyContribution;
}

/**
 * Given a monthly marketing budget split across acquisition channels, project acquired customers,
 * monthly unit volume (via blended purchase frequency), and monthly contribution at the chosen
 * price/channel mix. Entirely driven by observed CAC and purchase-frequency data.
 */
export function projectMonthlyVolume(budgetEur: number, marketingWeights: MarketingWeights, retailPriceEur: number, salesWeights: ChannelWeights) {
  const normalized = normalize(marketingWeights) as MarketingWeights;
  const acquiredCustomers = MARKETING_CHANNELS.reduce((sum, ch) => {
    const spend = budgetEur * (normalized[ch] ?? 0);
    const cac = effectiveCac(ch, retailPriceEur);
    return sum + (cac > 0 ? spend / cac : 0);
  }, 0);

  const unitsPerMonth = acquiredCustomers * BLENDED_PURCHASE_FREQUENCY_PER_MONTH;
  const contributionPerUnit = blendedUnitContribution(retailPriceEur, salesWeights);
  const netPricePerUnit = blendedNetPrice(retailPriceEur, salesWeights);

  return {
    acquiredCustomers,
    unitsPerMonth,
    revenuePerMonthEur: unitsPerMonth * netPricePerUnit,
    contributionPerMonthEur: unitsPerMonth * contributionPerUnit,
  };
}

// --- Launch timing: seasonality index + competitor promo intensity, by calendar month ---

export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function seasonalityFor(monthOfYear: number) {
  return seasonality.rows.find((r) => r.month === monthOfYear)!;
}

export function promoIntensityFor(monthOfYear: number) {
  return competitorPriceHistory.promoIntensityByMonth.find((r) => r.monthOfYear === monthOfYear)!;
}

/**
 * A simple, explainable timing score: reward months where demand is rising toward the seasonal
 * peak (so distribution/awareness are in place before peak demand hits) and penalise months where
 * competitors have historically run heavy promotions (noisy, harder to gain a foothold in).
 */
export function timingScore(monthOfYear: number): number {
  const rows = seasonality.rows;
  const idx = rows.findIndex((r) => r.month === monthOfYear);
  const next = rows[(idx + 1) % rows.length];
  const current = rows[idx];
  const momentum = next.seasonalityIndex - current.seasonalityIndex;
  const promo = promoIntensityFor(monthOfYear);
  const promoPenalty = (promo.competitorsOnPromo / Math.max(promo.competitorsObserved, 1)) * promo.avgDiscountPctWhenActive;
  return momentum - promoPenalty;
}

export function bestLaunchMonths(topN = 3): number[] {
  return Array.from({ length: 12 }, (_, i) => i + 1)
    .sort((a, b) => timingScore(b) - timingScore(a))
    .slice(0, topN);
}

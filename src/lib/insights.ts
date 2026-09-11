import {
  SALES_CHANNELS,
  acceptancePctAt,
  bestLaunchMonths,
  blendedContributionMarginPct,
  contributionMarginPct,
  unitContribution,
  MONTH_NAMES,
  type ChannelWeights,
} from './model';
import { pct, eur } from './format';

const LOW_PRICE = 1.79;
const HIGH_PRICE = 2.59;

export function tradeoffNarrative(price: number, salesWeights: ChannelWeights, month: number) {
  const acceptanceNow = acceptancePctAt(price);
  const acceptanceLow = acceptancePctAt(LOW_PRICE);
  const acceptanceHigh = acceptancePctAt(HIGH_PRICE);
  const marginNow = blendedContributionMarginPct(price, salesWeights);
  const marginLow = blendedContributionMarginPct(LOW_PRICE, salesWeights);
  const marginHigh = blendedContributionMarginPct(HIGH_PRICE, salesWeights);

  const bullets: string[] = [];

  const reachGivenUp = acceptanceLow - acceptanceNow;
  if (reachGivenUp > 1) {
    bullets.push(
      `Market reach: at ${eur(LOW_PRICE)} (the most-accepted candidate price), ${pct(acceptanceLow, 0)} of surveyed Germans find the price acceptable, vs ${pct(acceptanceNow, 0)} at ${eur(price)} — you are deliberately giving up ${pct(reachGivenUp, 0)} of price-qualified reach, concentrated in the Students & Budget-Conscious segment, to protect margin.`,
    );
  }

  const marginGivenUp = marginHigh - marginNow;
  if (marginGivenUp > 1) {
    bullets.push(
      `Per-unit margin: ${eur(HIGH_PRICE)} converts to a ${pct(marginHigh, 0)} blended contribution margin vs ${pct(marginNow, 0)} at ${eur(price)} — ${pct(marginGivenUp, 0)} of achievable margin is deliberately left on the table in exchange for the extra reach above.`,
    );
  }

  const sorted = [...SALES_CHANNELS].sort((a, b) => unitContribution(price, b) - unitContribution(price, a));
  const best = sorted[0];
  const normalizedWeight = (salesWeights[best] ?? 0) / (Object.values(salesWeights).reduce((s, w) => s + w, 0) || 1);
  if (normalizedWeight < 0.4) {
    bullets.push(
      `Channel economics: ${best} nets the strongest per-unit contribution at ${eur(price)} (${eur(unitContribution(price, best))}/unit, ${pct(contributionMarginPct(price, best), 0)} margin) but carries only ${pct(normalizedWeight * 100, 0)} of your chosen mix — you're trading its economics for the distribution reach of the other channels.`,
    );
  }

  const recommended = bestLaunchMonths(3);
  if (!recommended.includes(month)) {
    bullets.push(
      `Timing: ${MONTH_NAMES[month - 1]} isn't one of the model's top launch-window months (${recommended.map((m) => MONTH_NAMES[m - 1]).join(', ')}, chosen for rising seasonal demand and historically low competitor promo activity) — launching here trades a slower initial ramp and/or more promotional noise for whatever operational reason is driving the date.`,
    );
  }

  return {
    acceptanceNow,
    marginNow,
    bullets,
  };
}

import { useMemo, useState } from 'react';
import { Card, StatTile } from './components/Card';
import { Slider } from './components/Slider';
import { PriceCurveChart } from './components/PriceCurveChart';
import { ChannelEconomicsChart } from './components/ChannelEconomicsChart';
import { CHANNEL_COLOR } from './lib/colors';
import { TimingChart } from './components/TimingChart';
import { RoiTable } from './components/RoiTable';
import {
  SALES_CHANNELS,
  MARKETING_CHANNELS,
  MONTH_NAMES,
  type SalesChannel,
  type MarketingChannel,
  type ChannelWeights,
  type MarketingWeights,
  acceptancePctAt,
  blendedContributionMarginPct,
  blendedUnitContribution,
  contributionIndexPer1000,
  findOptimalPrice,
  bestSingleChannel,
  bestLaunchMonths,
  projectMonthlyVolume,
  seasonalityFor,
  promoIntensityFor,
} from './lib/model';
import { tradeoffNarrative } from './lib/insights';
import { eur, eur0, pct, num0 } from './lib/format';

const HOME_MARKET_SALES_MIX: ChannelWeights = { 'DTC Online': 32, 'Retail/Grocery': 50, 'Gym & Office': 18 };
const HOME_MARKET_MARKETING_MIX: MarketingWeights = { 'Paid Social': 4, 'Influencer / Content': 7, 'Retail Sampling': 62, 'Referral / Subscription': 27 };

const FAST_PAYBACK_SALES_MIX: ChannelWeights = { 'DTC Online': 10, 'Retail/Grocery': 70, 'Gym & Office': 20 };
const FAST_PAYBACK_MARKETING_MIX: MarketingWeights = { 'Paid Social': 10, 'Influencer / Content': 5, 'Retail Sampling': 55, 'Referral / Subscription': 30 };

const PREMIUM_BUILD_SALES_MIX: ChannelWeights = { 'DTC Online': 35, 'Retail/Grocery': 15, 'Gym & Office': 50 };
const PREMIUM_BUILD_MARKETING_MIX: MarketingWeights = { 'Paid Social': 15, 'Influencer / Content': 55, 'Retail Sampling': 10, 'Referral / Subscription': 20 };

type Preset = { price: number; sales: ChannelWeights; marketing: MarketingWeights; month: number };

const PRESETS: Record<string, Preset> = {
  balanced: { price: 2.19, sales: HOME_MARKET_SALES_MIX, marketing: HOME_MARKET_MARKETING_MIX, month: 4 },
  fastPayback: { price: 1.79, sales: FAST_PAYBACK_SALES_MIX, marketing: FAST_PAYBACK_MARKETING_MIX, month: 3 },
  premiumBuild: { price: 2.59, sales: PREMIUM_BUILD_SALES_MIX, marketing: PREMIUM_BUILD_MARKETING_MIX, month: 5 },
};

function normalizePct(weights: Record<string, number>, key: string): number {
  const total = Object.values(weights).reduce((s, w) => s + w, 0);
  return total > 0 ? ((weights[key] ?? 0) / total) * 100 : 0;
}

export function App() {
  const [price, setPrice] = useState(PRESETS.balanced.price);
  const [salesWeights, setSalesWeights] = useState<ChannelWeights>(PRESETS.balanced.sales);
  const [marketingWeights, setMarketingWeights] = useState<MarketingWeights>(PRESETS.balanced.marketing);
  const [budget, setBudget] = useState(20000);
  const [month, setMonth] = useState(PRESETS.balanced.month);
  const [activePreset, setActivePreset] = useState<'balanced' | 'fastPayback' | 'premiumBuild' | 'custom'>('balanced');

  const applyPreset = (key: 'balanced' | 'fastPayback' | 'premiumBuild') => {
    const preset = PRESETS[key];
    setPrice(preset.price);
    setSalesWeights(preset.sales);
    setMarketingWeights(preset.marketing);
    setMonth(preset.month);
    setActivePreset(key);
  };

  const optimal = useMemo(() => findOptimalPrice(salesWeights), [salesWeights]);
  const bestChannel = useMemo(() => bestSingleChannel(), []);
  const recommendedMonths = useMemo(() => bestLaunchMonths(3), []);

  const acceptanceNow = acceptancePctAt(price);
  const marginNow = blendedContributionMarginPct(price, salesWeights);
  const contributionNow = blendedUnitContribution(price, salesWeights);
  const contributionIndexNow = contributionIndexPer1000(price, salesWeights);
  const projection = projectMonthlyVolume(budget, marketingWeights, price, salesWeights);
  const season = seasonalityFor(month);
  const promo = promoIntensityFor(month);
  const narrative = tradeoffNarrative(price, salesWeights, month);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <p className="eyebrow">LUMEN · Germany market entry</p>
      <h1 className="mt-1 text-4xl font-bold leading-tight text-[#1c2b2d] sm:text-5xl">Decision Cockpit</h1>
      <p className="mt-2 max-w-2xl text-[#3c4a47]">
        At what price, through which channel(s), and roughly when should LUMEN launch in Germany — and what are we
        deliberately choosing not to optimise for by picking it? Move the controls; every number recalculates from the
        data room live.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {(
          [
            ['balanced', "Balanced — data's home-market mix"],
            ['fastPayback', "Fast payback — Elena's brief"],
            ['premiumBuild', "Premium build — Jonas's brief"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => applyPreset(key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              activePreset === key ? 'bg-[#1c2b2d] text-white' : 'bg-white text-[#3c4a47] ring-1 ring-[#d7dad2] hover:ring-[#2f6f5e]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <div className="flex flex-col gap-5">
          <Card title="Retail price">
            <Slider
              label="Price per 330ml can"
              value={price}
              onChange={(v) => {
                setPrice(v);
                setActivePreset('custom');
              }}
              min={0.99}
              max={3.49}
              step={0.01}
              valueLabel={eur(price)}
              accent="#2f6f5e"
            />
            <div className="mt-3 flex justify-between text-[11px] leading-tight text-[#61706d]">
              <span>PulsUp
                <br />€1.0–1.3</span>
              <span>Mate Libre
                <br />€1.4–1.8</span>
              <span>VoltFit
                <br />€2.1–2.7</span>
              <span>Root & Rise
                <br />€2.5–3.1</span>
            </div>
          </Card>

          <Card title="Sales channel mix" subtitle="Relative weight — normalized to 100%">
            <div className="flex flex-col gap-3">
              {SALES_CHANNELS.map((channel) => (
                <Slider
                  key={channel}
                  label={channel}
                  value={salesWeights[channel]}
                  onChange={(v) => {
                    setSalesWeights({ ...salesWeights, [channel]: v });
                    setActivePreset('custom');
                  }}
                  min={0}
                  max={100}
                  step={1}
                  valueLabel={pct(normalizePct(salesWeights, channel), 0)}
                  accent={CHANNEL_COLOR[channel as SalesChannel]}
                />
              ))}
            </div>
          </Card>

          <Card title="Marketing budget & mix" subtitle="Monthly spend, split across acquisition channels">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-[#3c4a47]">Monthly budget</span>
              <input
                type="number"
                min={0}
                step={1000}
                value={budget}
                onChange={(e) => setBudget(Number.parseFloat(e.target.value) || 0)}
                className="rounded-lg border border-[#d7dad2] bg-white px-3 py-1.5 text-sm tabular-nums"
              />
            </label>
            <div className="mt-3 flex flex-col gap-3">
              {MARKETING_CHANNELS.map((channel) => (
                <Slider
                  key={channel}
                  label={channel}
                  value={marketingWeights[channel]}
                  onChange={(v) => {
                    setMarketingWeights({ ...marketingWeights, [channel]: v });
                    setActivePreset('custom');
                  }}
                  min={0}
                  max={100}
                  step={1}
                  valueLabel={pct(normalizePct(marketingWeights, channel), 0)}
                />
              ))}
            </div>
          </Card>

          <Card title="Launch month">
            <div className="grid grid-cols-4 gap-1.5">
              {MONTH_NAMES.map((label, i) => {
                const m = i + 1;
                const recommended = recommendedMonths.includes(m);
                return (
                  <button
                    key={m}
                    onClick={() => setMonth(m)}
                    className={`rounded-lg py-1.5 text-xs font-medium transition ${
                      m === month
                        ? 'bg-[#1c2b2d] text-white'
                        : recommended
                          ? 'bg-[#e4efe9] text-[#2f6f5e] hover:bg-[#d3e6dc]'
                          : 'bg-[#f1f3ee] text-[#61706d] hover:bg-[#e2e5df]'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-[#61706d]">Highlighted months: rising seasonal demand, low historical competitor promo activity.</p>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatTile label="Price acceptance" value={pct(acceptanceNow, 0)} hint="of surveyed Germans" />
              <StatTile label="Blended margin" value={pct(marginNow, 0)} hint="contribution / net price" />
              <StatTile label="Contribution / unit" value={eur(contributionNow)} />
              <StatTile
                label="Model's optimal price"
                value={eur(optimal.priceEur)}
                hint={optimal.priceEur === price ? 'you are here' : `you're at ${eur(price)}`}
                tone={Math.abs(optimal.priceEur - price) < 0.05 ? 'good' : 'default'}
              />
              <StatTile label="Est. acquired customers / mo" value={num0(projection.acquiredCustomers)} hint={`at ${eur0(budget)}/mo budget`} />
              <StatTile label="Est. contribution / mo" value={eur0(projection.contributionPerMonthEur)} hint={`${num0(projection.unitsPerMonth)} units/mo`} />
            </div>
          </Card>

          <Card
            title="Price → acceptance & contribution trade-off"
            subtitle="Acceptance (grey, left axis) falls as price rises; contribution index — acceptance × unit margin per 1,000 addressable people — (green, right axis) peaks where the trade-off is best."
          >
            <PriceCurveChart weights={salesWeights} currentPrice={price} optimalPrice={optimal.priceEur} />
            <p className="mt-1 text-xs text-[#61706d]">
              Dashed line: your price. Dot: the price that maximizes contribution index for your current channel mix ({eur(optimal.priceEur)}, index {num0(optimal.contributionIndex)}).
            </p>
          </Card>

          <Card title="Channel economics at this price" subtitle={`Retail price ${eur(price)} split into COGS (grey) and LUMEN's contribution (colour) per channel`}>
            <ChannelEconomicsChart price={price} activeChannels={new Set(SALES_CHANNELS.filter((ch) => salesWeights[ch] > 0))} />
            <p className="mt-1 text-xs text-[#61706d]">
              Best single channel at its own optimal price: <strong>{bestChannel.channel}</strong> at {eur(bestChannel.priceEur)} (contribution index {num0(bestChannel.contributionIndex)}).
            </p>
          </Card>

          <Card title="Launch timing" subtitle="Seasonal demand index (bars) vs. competitor promo pressure (red line)">
            <TimingChart selectedMonth={month} recommendedMonths={recommendedMonths} />
            <p className="mt-1 text-xs text-[#61706d]">
              {MONTH_NAMES[month - 1]}: demand index {season.seasonalityIndex} (avg. temp {season.avgTempCelsius}°C), {promo.competitorsOnPromo}/{promo.competitorsObserved} competitors historically on promo.
            </p>
          </Card>

          <Card title="Marketing ROI by acquisition channel" subtitle={`At ${eur(price)} with your current sales-channel mix — CAC is rescaled for how hard this price is to convert`}>
            <RoiTable price={price} salesWeights={salesWeights} />
          </Card>

          <Card title="What we're deliberately not optimizing for" className="border-[#d9c9a8] bg-[#fbf6ec]">
            <p className="text-sm text-[#3c4a47]">
              At {eur(price)} with this channel mix: {pct(acceptanceNow, 0)} acceptance, {pct(marginNow, 0)} blended margin, contribution index {num0(contributionIndexNow)} per 1,000 addressable people.
            </p>
            {narrative.bullets.length > 0 ? (
              <ul className="mt-3 flex flex-col gap-2 text-sm text-[#3c4a47]">
                {narrative.bullets.map((b, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#b7833f]" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-[#3c4a47]">This selection is close to every optimum the model can see — Jonas and Elena's asks are, for once, not in tension here.</p>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}

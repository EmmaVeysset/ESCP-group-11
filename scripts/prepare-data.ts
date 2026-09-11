import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceDirectory = resolve(repositoryRoot, 'data');
const generatedDirectory = resolve(repositoryRoot, 'src', 'data', 'generated');

// Explicit allowlists are deliberate privacy boundaries. New fields stay excluded by default.
const CUSTOMER_SURVEY_COLUMNS = [
  'segment',
  'age',
  'city',
  'purchase_frequency_per_month',
  'monthly_beverage_spend_eur',
  'price_sensitivity_1_10',
  'preferred_channel',
  'aware_pulsup',
  'aware_matelibre',
  'aware_voltfit',
  'aware_rootandrise',
  'lumen_purchase_intent_1_10',
] as const;

type CsvRow = string[];
type SalesRow = Record<string, string | boolean> & { is_anomalous_week: boolean };

function parseCsvLine(line: string): CsvRow {
  const fields: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      fields.push(field);
      field = '';
    } else {
      field += character;
    }
  }

  fields.push(field);
  return fields;
}

async function readCsvRows(filename: string): Promise<{ headers: string[]; rows: CsvRow[] }> {
  const contents = await readFile(resolve(sourceDirectory, filename), 'utf8');
  const lines = contents.trim().split(/\r?\n/);
  return { headers: parseCsvLine(lines[0]), rows: lines.slice(1).map(parseCsvLine) };
}

function selectAllowedColumns(headers: string[], rows: CsvRow[], allowlist: readonly string[]) {
  const indexes = allowlist.map((column) => {
    const index = headers.indexOf(column);
    if (index === -1) throw new Error(`Required allowed column is missing: ${column}`);
    return index;
  });

  return rows.map((row) => Object.fromEntries(allowlist.map((column, index) => [column, row[indexes[index]]])));
}

async function prepareCustomerSurvey() {
  const { headers, rows } = await readCsvRows('customer_survey.csv');
  const safeRows = selectAllowedColumns(headers, rows, CUSTOMER_SURVEY_COLUMNS);

  return {
    source: 'customer_survey.csv',
    allowedColumns: CUSTOMER_SURVEY_COLUMNS,
    rowCount: safeRows.length,
    rows: safeRows,
  };
}

function toRecords(headers: string[], rows: CsvRow[]): Record<string, string>[] {
  return rows.map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index]])));
}

function num(value: string): number {
  return Number.parseFloat(value);
}

async function prepareChannelEconomics() {
  const { headers, rows } = await readCsvRows('channel_economics.csv');
  const records = toRecords(headers, rows);

  // Retailer/distributor/payment rates and fulfillment cost are structural per channel,
  // not price-dependent — collapse the two illustrative-price rows per channel into one rate card.
  const rates: Record<string, { retailerMarginPct: number; distributorCutPct: number; paymentProcessingPct: number; fulfillmentCostEur: number }> = {};
  for (const record of records) {
    if (rates[record.channel]) continue;
    rates[record.channel] = {
      retailerMarginPct: num(record.retailer_margin_pct),
      distributorCutPct: num(record.distributor_cut_pct),
      paymentProcessingPct: num(record.payment_processing_pct),
      fulfillmentCostEur: num(record.fulfillment_cost_eur),
    };
  }

  return { source: 'channel_economics.csv', channels: rates };
}

async function prepareCostBreakdown() {
  const { headers, rows } = await readCsvRows('cost_breakdown.csv');
  const records = toRecords(headers, rows);

  const components = records.filter(
    (r) => !r.cost_component.startsWith('TOTAL') && !r.cost_component.startsWith('[KPI'),
  );
  const totalRow = records.find((r) => r.cost_component.startsWith('TOTAL'));
  const kpiRow = records.find((r) => r.cost_component.startsWith('[KPI'));

  if (!totalRow || !kpiRow) throw new Error('cost_breakdown.csv is missing its TOTAL or KPI row');

  return {
    source: 'cost_breakdown.csv',
    components: components.map((c) => ({ component: c.cost_component, costPerUnitEur: num(c.cost_per_unit_eur), pctOfTotal: num(c.pct_of_total) })),
    cogsPerUnitEur: num(totalRow.cost_per_unit_eur),
    blendedGrossMarginPctHomeMarkets: num(kpiRow.cost_per_unit_eur),
    referenceRetailPriceEur: 1.35,
  };
}

async function preparePriceTestResults() {
  const { headers, rows } = await readCsvRows('price_test_results.csv');
  const records = toRecords(headers, rows);
  return {
    source: 'price_test_results.csv',
    rows: records.map((r) => ({
      priceEur: num(r.price_eur),
      channel: r.channel,
      estimatedAcceptancePctOfSurvey: num(r.estimated_acceptance_pct_of_survey),
      netPriceToLumenEur: num(r.net_price_to_lumen_eur),
      unitContributionEur: num(r.unit_contribution_eur),
      contributionMarginPct: num(r.contribution_margin_pct),
    })),
  };
}

async function prepareMarketingFunnel() {
  const { headers, rows } = await readCsvRows('marketing_funnel_monthly.csv');
  const records = toRecords(headers, rows);
  const parsed = records.map((r) => ({
    month: r.month,
    channel: r.channel,
    reach: num(r.reach),
    engagements: num(r.engagements),
    conversions: num(r.conversions_customers_acquired),
    spendEur: num(r.spend_eur),
    cacEur: num(r.cac_eur),
    ltvEstimateEur: num(r.ltv_estimate_eur),
  }));

  const channels = [...new Set(parsed.map((r) => r.channel))];
  const summary = Object.fromEntries(
    channels.map((channel) => {
      const rowsForChannel = parsed.filter((r) => r.channel === channel);
      const avg = (key: 'cacEur' | 'ltvEstimateEur') => rowsForChannel.reduce((sum, r) => sum + r[key], 0) / rowsForChannel.length;
      return [channel, { avgCacEur: avg('cacEur'), avgLtvEstimateEur: avg('ltvEstimateEur'), monthsObserved: rowsForChannel.length }];
    }),
  );

  return { source: 'marketing_funnel_monthly.csv', rows: parsed, summaryByChannel: summary };
}

async function prepareSeasonality() {
  const { headers, rows } = await readCsvRows('seasonality_and_weather.csv');
  const records = toRecords(headers, rows);
  return {
    source: 'seasonality_and_weather.csv',
    rows: records.map((r) => ({
      month: Number.parseInt(r.month, 10),
      seasonalityIndex: num(r.seasonality_index_100_avg),
      avgTempCelsius: num(r.avg_temp_germany_celsius),
    })),
  };
}

async function prepareCompetitorPriceHistory() {
  const { headers, rows } = await readCsvRows('competitor_price_history.csv');
  const records = toRecords(headers, rows);
  const parsed = records.map((r) => ({
    competitor: r.competitor,
    month: r.month,
    monthOfYear: Number.parseInt(r.month.slice(5, 7), 10),
    listPriceEur: num(r.list_price_eur),
    promoActive: r.promo_active === 'True',
    promoDiscountPct: num(r.promo_discount_pct),
    shelfPriceEur: num(r.shelf_price_eur),
  }));

  // Promo intensity by calendar month, pooled across the one year of history observed —
  // used as a launch-timing risk signal (heavy competitor discounting near launch is a headwind).
  const byMonthOfYear = Array.from({ length: 12 }, (_, i) => i + 1).map((monthOfYear) => {
    const rowsForMonth = parsed.filter((r) => r.monthOfYear === monthOfYear);
    const activePromos = rowsForMonth.filter((r) => r.promoActive);
    const avgDiscountPctWhenActive = activePromos.length
      ? activePromos.reduce((sum, r) => sum + r.promoDiscountPct, 0) / activePromos.length
      : 0;
    return {
      monthOfYear,
      competitorsObserved: rowsForMonth.length,
      competitorsOnPromo: activePromos.length,
      avgDiscountPctWhenActive,
    };
  });

  return { source: 'competitor_price_history.csv', rows: parsed, promoIntensityByMonth: byMonthOfYear };
}

async function prepareCompetitorPricesByChannel() {
  const { headers, rows } = await readCsvRows('competitor_prices_by_channel.csv');
  const records = toRecords(headers, rows);
  return {
    source: 'competitor_prices_by_channel.csv',
    rows: records.map((r) => ({
      competitor: r.competitor,
      positioning: r.positioning,
      channel: r.channel,
      format: r.format,
      priceEur: num(r.price_eur),
      marketingSpendIndex: num(r.marketing_spend_index_0_100),
    })),
  };
}

async function prepareMarketContext() {
  const { headers, rows } = await readCsvRows('market_context.csv');
  const records = toRecords(headers, rows);
  return {
    source: 'market_context.csv',
    rows: records.map((r) => ({
      dimensionType: r.dimension_type,
      name: r.name,
      metric: r.metric,
      value: num(r.value),
      unit: r.unit,
      year: Number.parseInt(r.year, 10),
      notes: r.notes,
    })),
  };
}

// --- Eurostat validation: independent sanity-check of our functional-beverage market sizing
// against Eurostat's official household consumption statistics. Aggregate public statistics,
// no PII — but writeJson below still follows the same explicit-shape discipline as every other
// prepared file, and network failure never fails the build (see the try/catch in
// fetchEurostatValidation).

const EUROSTAT_API_BASE = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data';
const EUROSTAT_DATASET = 'nama_10_co3_p3'; // Household final consumption expenditure by purpose (COICOP)
const EUROSTAT_COICOP = 'CP012'; // Non-alcoholic beverages
const EUROSTAT_GEO = 'DE';
const EUROSTAT_TIMEOUT_MS = 8000;

type JsonStatResponse = {
  id: string[];
  size: number[];
  value: Record<string, number>;
  dimension: Record<string, { category: { index: Record<string, number> } }>;
};

function computeStrides(sizes: number[]): number[] {
  const strides = new Array(sizes.length).fill(1);
  for (let i = sizes.length - 2; i >= 0; i -= 1) strides[i] = strides[i + 1] * sizes[i + 1];
  return strides;
}

/**
 * Decodes a JSON-stat 2.0 response into a year->value series. `fixedCategories` pins every
 * dimension except `time` to one category code; works regardless of the dataset's dimension
 * order, since it reads that order from the response itself rather than assuming a layout.
 */
function decodeJsonStatByYear(response: JsonStatResponse, fixedCategories: Record<string, string>): Map<number, number> {
  const strides = computeStrides(response.size);
  const dimPosition = Object.fromEntries(response.id.map((name, index) => [name, index]));

  let baseIndex = 0;
  for (const dimName of response.id) {
    if (dimName === 'time') continue;
    const categoryCode = fixedCategories[dimName];
    const categoryIndex = response.dimension[dimName]?.category.index[categoryCode];
    if (categoryIndex === undefined) throw new Error(`Eurostat response missing expected category "${categoryCode}" for dimension "${dimName}"`);
    baseIndex += categoryIndex * strides[dimPosition[dimName]];
  }

  const timeStride = strides[dimPosition.time];
  const series = new Map<number, number>();
  for (const [yearLabel, timeIndex] of Object.entries(response.dimension.time.category.index)) {
    const value = response.value[baseIndex + timeIndex * timeStride];
    if (value !== undefined) series.set(Number.parseInt(yearLabel, 10), value);
  }
  return series;
}

async function fetchEurostatSeries(unitCode: string, signal: AbortSignal): Promise<Map<number, number>> {
  const url = `${EUROSTAT_API_BASE}/${EUROSTAT_DATASET}?format=JSON&geo=${EUROSTAT_GEO}&coicop=${EUROSTAT_COICOP}&unit=${unitCode}&lang=EN`;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Eurostat API returned HTTP ${response.status}`);
  const body = (await response.json()) as JsonStatResponse;
  return decodeJsonStatByYear(body, { freq: 'A', unit: unitCode, coicop: EUROSTAT_COICOP, geo: EUROSTAT_GEO });
}

type EurostatValidation = {
  source: 'Eurostat';
  dataset: string;
  coicop: string;
  geo: string;
  year: number | null;
  eurostatValueEur: number | null;
  ourValueEur: number | null;
  deltaEur: number | null;
  deltaPct: number | null;
  categoryShare: number | null;
  ourTotalEur: number | null;
  eurostatTotalEur: number | null;
  eurostatImpliedPopulation: number | null;
  fetchedAt: string;
  status: 'ok' | 'unreachable' | 'error';
  note: string;
};

const EUROSTAT_SCOPE_NOTE =
  'Category-share cross-check, not a precise validation: Eurostat covers ALL non-alcoholic ' +
  'beverages (water, soda, juice, coffee, tea, energy drinks combined), while our figure is ' +
  "LUMEN's functional-beverage-only market total. categoryShare (ourValueEur / eurostatValueEur) " +
  'is the plausible fraction of that broader category functional beverages represent — a niche ' +
  'occupying roughly a quarter of an established mass-market category is a sane order of ' +
  'magnitude, not evidence of a data error in either source.';

async function fetchEurostatValidation(marketContextRows: { metric: string; value: number; year: number }[]): Promise<EurostatValidation> {
  const base = {
    source: 'Eurostat' as const,
    dataset: EUROSTAT_DATASET,
    coicop: EUROSTAT_COICOP,
    geo: EUROSTAT_GEO,
    fetchedAt: new Date().toISOString(),
  };
  const empty = {
    year: null, eurostatValueEur: null, ourValueEur: null, deltaEur: null, deltaPct: null,
    categoryShare: null, ourTotalEur: null, eurostatTotalEur: null, eurostatImpliedPopulation: null,
  };

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), EUROSTAT_TIMEOUT_MS);

  try {
    const [perCapitaSeries, totalMillionEurSeries] = await Promise.all([
      fetchEurostatSeries('CP_EUR_HAB', controller.signal),
      fetchEurostatSeries('CP_MEUR', controller.signal),
    ]);

    const latestYear = Math.max(...perCapitaSeries.keys());
    const eurostatValueEur = perCapitaSeries.get(latestYear);
    const totalMillionEurValue = totalMillionEurSeries.get(latestYear);

    if (eurostatValueEur === undefined || totalMillionEurValue === undefined) {
      console.warn(`Eurostat validation: no usable data point for ${latestYear}; skipping validation.`);
      return { ...base, ...empty, year: latestYear, status: 'error', note: `Eurostat had no usable ${latestYear} data point.` };
    }

    const eurostatImpliedPopulation = (totalMillionEurValue * 1_000_000) / eurostatValueEur;
    const ourTotalEur = marketContextRows
      .filter((row) => row.metric === 'market_size_eur' && row.year === latestYear)
      .reduce((sum, row) => sum + row.value, 0);

    if (ourTotalEur <= 0) {
      console.warn(`Eurostat validation: market_context.csv has no market_size_eur rows for ${latestYear}; skipping validation.`);
      return { ...base, ...empty, year: latestYear, eurostatValueEur, status: 'error', note: `market_context.csv has no figures for ${latestYear}.` };
    }

    const ourValueEur = ourTotalEur / eurostatImpliedPopulation;
    const deltaEur = ourValueEur - eurostatValueEur;
    const deltaPct = (deltaEur / eurostatValueEur) * 100;
    const categoryShare = ourValueEur / eurostatValueEur;
    const eurostatTotalEur = totalMillionEurValue * 1_000_000;

    return {
      ...base, year: latestYear, eurostatValueEur, ourValueEur, deltaEur, deltaPct, categoryShare,
      ourTotalEur, eurostatTotalEur, eurostatImpliedPopulation, status: 'ok', note: EUROSTAT_SCOPE_NOTE,
    };
  } catch (error) {
    // TypeError is what undici/fetch throws for DNS/connection-level failures; AbortError is our
    // own timeout. Both mean "couldn't reach Eurostat" as opposed to a reachable-but-bad response.
    const isNetworkFailure = error instanceof Error && (error.name === 'AbortError' || error instanceof TypeError);
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Eurostat validation skipped (${isNetworkFailure ? 'unreachable' : 'error'}): ${message}`);
    return { ...base, ...empty, status: isNetworkFailure ? 'unreachable' : 'error', note: `Skipped: ${message}` };
  } finally {
    clearTimeout(timeoutHandle);
  }
}

async function preparePriceSensitivityCurve() {
  const { headers, rows } = await readCsvRows('price_sensitivity_survey.csv');
  const records = toRecords(headers, rows).map((r) => ({
    segment: r.segment,
    tooCheap: num(r.too_cheap_eur),
    cheap: num(r.cheap_eur),
    expensive: num(r.expensive_eur),
    tooExpensive: num(r.too_expensive_eur),
  }));

  // Van Westendorp "acceptable range" band: a price is acceptable to a respondent when it falls
  // between what they call cheap and what they call expensive. This is the exact definition that
  // reproduces price_test_results.csv's published acceptance figures (validated below).
  const acceptancePctAt = (price: number, pool: typeof records) =>
    (pool.filter((r) => price >= r.cheap && price <= r.expensive).length / pool.length) * 100;

  const prices: number[] = [];
  for (let p = 0.99; p <= 3.49 + 1e-9; p += 0.02) prices.push(Math.round(p * 100) / 100);

  const segments = [...new Set(records.map((r) => r.segment))];
  const bySegment = Object.fromEntries(
    segments.map((segment) => [segment, prices.map((p) => acceptancePctAt(p, records.filter((r) => r.segment === segment)))]),
  );

  const overall = prices.map((p) => acceptancePctAt(p, records));

  const checkpoints = [
    { priceEur: 1.79, expectedPct: 61.7 },
    { priceEur: 2.19, expectedPct: 51.7 },
    { priceEur: 2.59, expectedPct: 26.7 },
  ];
  const validation = checkpoints.map((c) => ({ ...c, computedPct: Math.round(acceptancePctAt(c.priceEur, records) * 10) / 10 }));
  for (const v of validation) {
    if (Math.abs(v.computedPct - v.expectedPct) > 0.5) {
      throw new Error(
        `price_sensitivity_survey.csv acceptance model diverges from price_test_results.csv at EUR${v.priceEur}: computed ${v.computedPct}%, expected ${v.expectedPct}%`,
      );
    }
  }

  return { source: 'price_sensitivity_survey.csv', respondentCount: records.length, prices, overallAcceptancePct: overall, bySegmentAcceptancePct: bySegment, validation };
}

async function prepareSales() {
  const { headers, rows } = await readCsvRows('historical_sales_weekly.csv');
  const keyColumns = ['week_start_date', 'country', 'channel'];
  const keyIndexes = keyColumns.map((column) => headers.indexOf(column));
  const uniqueRows = new Map<string, Record<string, string>>();
  let duplicateRowsRemoved = 0;

  for (const values of rows) {
    const key = keyIndexes.map((index) => values[index]).join('|');
    if (uniqueRows.has(key)) {
      duplicateRowsRemoved += 1;
      continue;
    }
    uniqueRows.set(key, Object.fromEntries(headers.map((header, index) => [header, values[index]])));
  }

  const cleanedRows: SalesRow[] = [...uniqueRows.values()].map((row) => ({
    ...row,
    is_anomalous_week: row.week_start_date === '2025-07-28',
  }));

  return {
    source: 'historical_sales_weekly.csv',
    primaryKey: keyColumns,
    duplicateRowsRemoved,
    anomalousWeek: '2025-07-28',
    rows: cleanedRows,
  };
}

async function writeJson(filename: string, data: unknown) {
  await writeFile(resolve(generatedDirectory, filename), `${JSON.stringify(data, null, 2)}\n`);
}

async function main() {
  await mkdir(generatedDirectory, { recursive: true });
  const [
    customerSurvey,
    historicalSales,
    channelEconomics,
    costBreakdown,
    priceTestResults,
    marketingFunnel,
    seasonality,
    competitorPriceHistory,
    competitorPricesByChannel,
    marketContext,
    priceSensitivityCurve,
  ] = await Promise.all([
    prepareCustomerSurvey(),
    prepareSales(),
    prepareChannelEconomics(),
    prepareCostBreakdown(),
    preparePriceTestResults(),
    prepareMarketingFunnel(),
    prepareSeasonality(),
    prepareCompetitorPriceHistory(),
    prepareCompetitorPricesByChannel(),
    prepareMarketContext(),
    preparePriceSensitivityCurve(),
  ]);

  const eurostatValidation = await fetchEurostatValidation(marketContext.rows);

  await Promise.all([
    writeJson('customer-survey.safe.json', customerSurvey),
    writeJson('historical-sales.cleaned.json', historicalSales),
    writeJson('channel-economics.json', channelEconomics),
    writeJson('cost-breakdown.json', costBreakdown),
    writeJson('price-test-results.json', priceTestResults),
    writeJson('marketing-funnel.json', marketingFunnel),
    writeJson('seasonality.json', seasonality),
    writeJson('competitor-price-history.json', competitorPriceHistory),
    writeJson('competitor-prices-by-channel.json', competitorPricesByChannel),
    writeJson('market-context.json', marketContext),
    writeJson('price-sensitivity-curve.json', priceSensitivityCurve),
    writeJson('eurostat-validation.json', eurostatValidation),
  ]);

  console.log(
    `Prepared ${customerSurvey.rowCount} PII-safe survey rows, ${historicalSales.rows.length} deduplicated sales rows, ` +
      `a ${priceSensitivityCurve.prices.length}-point acceptance curve validated against price_test_results.csv, ` +
      `and an Eurostat validation check (status: ${eurostatValidation.status}).`,
  );
}

await main();

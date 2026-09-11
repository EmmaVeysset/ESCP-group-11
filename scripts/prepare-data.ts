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
  ]);

  console.log(
    `Prepared ${customerSurvey.rowCount} PII-safe survey rows, ${historicalSales.rows.length} deduplicated sales rows, ` +
      `and a ${priceSensitivityCurve.prices.length}-point acceptance curve validated against price_test_results.csv.`,
  );
}

await main();

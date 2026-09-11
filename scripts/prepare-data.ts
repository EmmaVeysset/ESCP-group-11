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
  const [customerSurvey, historicalSales] = await Promise.all([prepareCustomerSurvey(), prepareSales()]);
  await Promise.all([
    writeJson('customer-survey.safe.json', customerSurvey),
    writeJson('historical-sales.cleaned.json', historicalSales),
  ]);
  console.log(`Prepared ${customerSurvey.rowCount} PII-safe survey rows and ${historicalSales.rows.length} deduplicated sales rows.`);
}

await main();

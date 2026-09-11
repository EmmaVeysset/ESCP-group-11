# Data cleaning notes

These notes document transformations applied by `scripts/prepare-data.ts`. Source CSVs are never overwritten.

## Customer survey privacy

`customer_survey.csv` contains `first_name`, `last_name`, and `email`. The preparation script uses an explicit allowlist of analytical columns. It does not create row objects containing those fields, and generated browser data never contains them. Any new source column is excluded unless it is deliberately added to the allowlist and reviewed.

## Primary keys and duplicates

| Dataset | Primary key | Current finding | Default treatment |
| --- | --- | --- | --- |
| `customer_survey.csv` | `respondent_id` | No duplicate keys detected | Retain one row per key if duplicates appear. |
| `historical_sales_weekly.csv` | `week_start_date`, `country`, `channel` | Four duplicate keys, each an exact duplicate row | Retain the first row for each key; do not sum duplicates. |

The duplicated sales keys currently detected are 2025-07-14 / Netherlands / DTC Online; 2025-09-22 / Denmark / DTC Online; 2025-12-22 / Denmark / Retail/Grocery; and 2026-04-27 / Netherlands / DTC Online.

## Anomalous sales week

`2025-07-28` is marked as anomalous for trend calculations. Aggregate units rose 24.7% from the prior week (19,652 to 24,508) and then fell 26.2% the following week (to 18,094), with no across-the-board promotion signal explaining the movement. It remains in the cleaned output with an `is_anomalous_week` flag so later UI controls can include it, but trend calculations should exclude it by default.

## Limits

The rule above is an analytical treatment, not a claim that the source observation is erroneous. Any new data-quality rule must be added here and to `docs/DECISIONS.md` when it changes a decision-facing result.

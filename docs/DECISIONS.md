# Decision log

Append new decisions; do not revise prior entries.

## Decision 001 — 2026-09-10 — Germany launch cockpit framing

1. The cockpit makes and defends an editorial **accessible premium** recommendation; scenario controls are exploratory rather than neutral defaults.
2. The launch is staged: Berlin pilot in March 2026, Munich and Hamburg at month 6 only when all four stated gates pass, then national expansion in year 2. The case reference date is September 2025 and the operational lead time is eight weeks.
3. Forecasts cover 24 months. Payback is the first month cumulative contribution meets cumulative marketing spend; target payback is no more than 12 months and target LTV:CAC is 3:1.
4. Measured launch prices are €1.79, €2.19, and €2.59 for a 250ml can. Any interpolated price is explicitly labelled unmeasured.
5. Channel mapping is DTC Online → D2C, Gym & Office → specialty retail, and Retail/Grocery → modern trade. Phase 1 defaults to 70% D2C and 30% specialty retail; modern trade is deferred to Phase 3.
6. Home-market figures are normalized only for channel mix and price point. Every KPI using NL/DK/SE evidence carries a per-KPI proxy label.
7. Name and email fields from `customer_survey.csv` are excluded by an explicit allowlist at ingestion and are never emitted to generated browser data.
8. Source data is deduplicated on documented primary keys. The 2025-07-28 sales spike is excluded from trend calculations by default, with a later UI toggle and explanation.

### Default recommendation and modeling rules

- Default recommendation: €2.19, Berlin first, D2C-led with specialty retail second, and modern trade deferred to year 2.
- Phase 1 budget is €250,000 over six months, initially allocated 70% to D2C acquisition and 30% to specialty retail activation; both values are editable.
- The funnel is budget → reach → engagement → trial → repeat buyer → monthly units and revenue. Every rate must name its source or be marked as a placeholder.
- Phase 2 requires all gates: trailing three-month blended contribution margin ≥35%, blended CAC ≤€50, LTV:CAC ≥2.5:1, and D2C repeat-purchase rate ≥25%.
- The competitor map distinguishes sourced price markers from muted editorial positioning labels from the case brief.

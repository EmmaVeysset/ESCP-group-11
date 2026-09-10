# LUMEN Germany launch — six-person delivery plan

## Shared outcome

Deliver a working, browser-based decision cockpit that recommends a German launch **price, positioning, first channels and timing**, makes the trade-offs explorable, protects respondent privacy, and explains the business decision in plain language.

Each person works on a small branch and opens a pull request into `main`. Pull `main` before starting and again immediately before opening the PR. Do not edit another person's in-progress files without agreeing first.

| Owner | Task | Deliverable | Definition of done |
|---|---|---|---|
| 1 — Decision lead | Frame the executive recommendation | `README.md` recommendation paragraph and a one-page decision narrative | Names the €2.19 default, accessible-premium positioning, DTC + gym/office pilot, June–August window, and the deliberate trade-offs. |
| 2 — Pricing analyst | Validate the price case | `analysis/pricing.md` with price-test calculations and competitor context | Explains why €1.79, €2.19 and €2.59 differ in acceptance, contribution and positioning; cites the data files used. |
| 3 — Channel & growth analyst | Recommend channel sequencing | `analysis/channel-plan.md` | Compares channel economics and marketing CAC/LTV; defines an expansion gate of at least 3:1 LTV:CAC plus repeat evidence before broad grocery rollout. |
| 4 — Market & timing analyst | Decide where and when to pilot | `analysis/timing-and-market.md` | Uses market context, seasonality and qualitative signals to justify the summer pilot and named priority cities/regions. Clearly labels assumptions. |
| 5 — Product builder | Own the interactive cockpit | `index.html`, `app.js`, `styles.css` | All three price choices and all channel-mix controls recalculate correctly. No API key or personal survey data is exposed. Test it locally in a browser. |
| 6 — QA, ethics & integration owner | Make the submission coherent and safe | `analysis/qa-and-ethics.md`, final README pass | Checks calculations, empty/invalid mix behaviour, mobile layout, source labels, privacy decision, prompt logs and the final pull-request checklist. |

## Suggested sequence

1. **Day 1, 30 minutes:** the six people agree on the decision question and file ownership above. Person 5 creates the visual shell; no one changes the same file simultaneously.
2. **Day 1:** people 2–4 analyse their data independently and make small PRs. Person 1 writes the decision narrative after reading those PRs.
3. **Day 2:** person 5 wires approved figures into the cockpit. Person 6 tests the complete experience and records issues.
4. **Final 60 minutes:** merge all small PRs, make one integration PR if needed, test the result from a fresh browser session, and ensure the active session's prompt log is included.

## Non-negotiable checks before submission

- The tool answers price, positioning, channel and timeline—not only one of them.
- Every displayed figure has a source or is visibly labelled as a calculation/assumption.
- The raw customer survey is never loaded into the browser and names/emails are never displayed.
- No external API keys are needed or committed.
- Every contributor's prompt log is committed with their work.
- A reviewer can reproduce the recommendation by opening `index.html` and changing the controls.

## Merge order

Merge analysis PRs (2, 3, 4) first, then the decision narrative (1), then the cockpit (5), then QA/integration (6). This keeps the product aligned with evidence rather than having the analysis retrofit the interface.

---

## Exact checklist for each person

### Person 1 — Decision lead

**Goal:** turn the evidence into one unambiguous management recommendation.

1. Read `LUMEN_Case_Brief.md` and the three analysis files from people 2–4.
2. Write a maximum 250-word decision memo in `analysis/final-recommendation.md` answering exactly: price, positioning, first channels, launch timing, and what LUMEN is deliberately not optimising for.
3. State the default recommendation as **€2.19**, **accessible premium / clean performance**, **DTC plus gym & office**, and a **June–August pilot**—unless the team’s documented analysis gives a defensible reason to change it.
4. Add two decision gates: the evidence required to expand into grocery, and the condition that would cause the team to pause or revise the plan.
5. Update the business-language paragraph in `README.md` after the team agrees on the final recommendation.

**Do not:** invent a German sales forecast or turn the memo into a technical description of the website.

### Person 2 — Pricing analyst

**Goal:** prove the price recommendation and make its trade-off easy to understand.

1. Analyse `data/price_test_results.csv`, `data/price_sensitivity_survey.csv`, `data/competitor_prices_by_channel.csv`, and `data/competitor_price_history.csv`.
2. Create `analysis/pricing.md` with one compact table comparing €1.79, €2.19 and €2.59: acceptance, contribution per unit by channel, and the main business implication.
3. Calculate and explain why €2.19 is the middle path: it gives up some trial compared with €1.79 but avoids the sharp acceptance drop at €2.59.
4. Add two competitor observations: the relevant premium range and any promotional behaviour that makes the launch price risky.
5. Give Person 5 a simple JSON/Markdown-ready table of the verified price values for the cockpit.

**Done when:** every number is traceable to a source file and there is no claim that survey acceptance equals actual sales.

### Person 3 — Channel & growth analyst

**Goal:** choose the launch mix and define when grocery expansion becomes sensible.

1. Analyse `data/channel_economics.csv`, `data/marketing_funnel_monthly.csv`, and `data/customer_survey.csv` using only aggregate fields—never names or email addresses.
2. Create `analysis/channel-plan.md` with a comparison of DTC, gym & office, and retail/grocery: contribution per unit, customer-learning value, scale potential, and main risk.
3. Calculate average CAC, average LTV and LTV:CAC for each marketing channel. Explicitly flag that historical ratios are below the 3:1 target.
4. Recommend a starting volume mix for the cockpit (default: 40% DTC, 35% gym & office, 25% retail) and justify it.
5. Write the expansion gate in one sentence: broad grocery only after repeat purchase is validated and blended LTV:CAC reaches at least 3:1.

**Done when:** the recommendation explains why broad retail is deferred even though retail is the largest preferred channel in the survey.

### Person 4 — Market & timing analyst

**Goal:** determine when and where to run the pilot.

1. Analyse `data/market_context.csv`, `data/seasonality_and_weather.csv`, `data/customer_quotes.csv`, and aggregate results from `data/customer_survey.csv`.
2. Create `analysis/timing-and-market.md` with: three priority launch cities or regions, their rationale, the pilot calendar, and the key audience to target in each.
3. Use seasonality to show why demand is strongest in June–August. Specify April–May for launch preparation and summer for the live pilot.
4. Include one quantitative signal and one customer quote for each priority audience. Label quotes as directional qualitative evidence, not proof.
5. Flag at least one contradiction between qualitative comments and survey signals, plus how the pilot will test it.

**Done when:** the proposal gives a concrete first location and date range rather than “launch in Germany in summer.”

### Person 5 — Product builder

**Goal:** make the recommendation explorable in a browser.

1. Own `index.html`, `app.js`, and `styles.css`; avoid changing the analysis documents except to correct a source link.
2. Keep the three price options, three channel sliders, contribution calculation, acceptance figure, margin, and CAC-payback calculation working.
3. Add any agreed summary figures supplied by people 2–4; use only aggregated values embedded in `app.js` or static files.
4. Add clear labels that distinguish survey signals, historical marketing data, and calculated outputs.
5. Test on a desktop and a narrow mobile browser. Test price changes, a valid 100% mix, and an invalid mix that does not total 100%.

**Do not:** load `customer_survey.csv` in the browser, expose its name/email columns, use an API key, or claim the simulator is a German revenue forecast.

### Person 6 — QA, ethics & integration owner

**Goal:** make the final submission credible, safe and ready to grade.

1. Review every displayed number against the source CSV or analysis file; list corrections in `analysis/qa-and-ethics.md`.
2. Open `index.html` in a fresh browser and complete this test script: all three prices, several 100% channel mixes, a non-100% mix, and a mobile-width view.
3. Confirm that no page, JavaScript file, or derived file includes respondent names, emails, or raw survey rows.
4. Confirm that the README explains the privacy choice, no API keys are committed, and the tool answers all four decision components.
5. Check `git status` before the final PR: every contributor’s session log must be staged with their contribution. Review the PR diff for missing files and merge conflicts.
6. Produce a short final go/no-go note with the remaining risks and exact changes required before merge.

**Done when:** the team can demonstrate the tool in under three minutes and every claim can be explained to a non-technical reviewer.

PRD: UK Income Tax Reform Simulation Notebook

1. Objective

Build a Jupyter Notebook (.ipynb) simulation model to assess the fiscal and distributional effects of a reform to the UK personal income tax system in which:
	•	the current tax-free personal allowance is removed;
	•	all deductions, allowances, and reliefs are ignored for the purposes of the simulation;
	•	the current progressive structure is replaced by either:
	•	a two-tier flat tax system, or
	•	a three-tier flat tax system.

The model must estimate:
	•	total tax take before and after reform;
	•	behavioural response impact on tax take;
	•	distributional impact by cohort, especially income deciles;
	•	changes in:
	•	average tax rate,
	•	marginal tax rate,
	•	post-tax income,
	•	tax burden by cohort.

The notebook should be suitable for scenario testing, policy comparison, and sensitivity analysis.

⸻

2. Key Questions the Model Must Answer
	1.	What is the baseline simulated income tax take under the current system?
	2.	What is the simulated tax take under each reform scenario?
	3.	What is the gross change in tax revenue before behavioural adjustments?
	4.	What is the net change in tax revenue after behavioural adjustments?
	5.	Which deciles gain or lose, and by how much?
	6.	How does the reform affect:
	•	low-income households,
	•	middle-income households,
	•	high-income households?
	7.	How sensitive are results to behavioural assumptions?
	8.	How do outcomes differ between the two-tier and three-tier designs?

⸻

3. Scope

In scope
	•	UK individual income tax simulation at the taxpayer level or synthetic microdata level.
	•	Static and behaviour-adjusted scoring.
	•	Two reform designs:
	•	two-band flat tax;
	•	three-band flat tax.
	•	Distributional analysis by:
	•	income decile;
	•	optionally percentile, ventile, or custom cohorts.
	•	Summary tables and charts.
	•	Clear parameterisation so users can test alternative tax bands and rates.

Out of scope
	•	Full welfare system modelling.
	•	National Insurance contributions unless explicitly added as an extension.
	•	Capital gains tax, corporation tax, VAT, council tax, inheritance tax.
	•	Household-level equivalisation unless explicitly added later.
	•	Regional modelling unless explicitly added later.
	•	Full macroeconomic general equilibrium effects.

⸻

4. Users

Primary users:
	•	policy analysts;
	•	strategy teams;
	•	public finance researchers;
	•	consultants testing reform options.

Secondary users:
	•	non-technical stakeholders reviewing outputs in charts/tables.

The notebook should be readable, well-commented, and suitable for handover.

⸻

5. Core Design Principles
	•	Transparent: every assumption visible and editable.
	•	Modular: separate data prep, baseline tax logic, reform logic, behavioural response logic, and outputs.
	•	Reproducible: same inputs produce same outputs.
	•	Parameter-driven: rates, thresholds, and elasticities should be easy to change.
	•	Comparable: baseline and reform outputs must be directly comparable.
	•	Audit-friendly: intermediate outputs should be inspectable.

⸻

6. Input Requirements

The notebook should accept either:

Option A: Microdata input

A taxpayer-level dataset with at minimum:
	•	taxpayer_id
	•	gross_income_annual
	•	optional employment_income
	•	optional self_employment_income
	•	optional pension_income
	•	optional investment_income
	•	optional age
	•	optional region
	•	optional weight

Option B: Synthetic distribution input

If no taxpayer-level microdata is available, allow simulation using:
	•	income bins or percentiles;
	•	counts per bin;
	•	average income per bin;
	•	optional weights.

Mandatory assumptions

The notebook must allow user-defined assumptions for:
	•	current tax system baseline parameters;
	•	reform band thresholds;
	•	reform band rates;
	•	behavioural elasticity parameters;
	•	participation response assumptions if used;
	•	income growth/uplift factors if needed.

⸻

7. Baseline Tax System

The baseline should represent a simplified UK income tax regime, with parameters configurable rather than hard-coded.

At minimum include:
	•	personal allowance;
	•	basic rate band;
	•	higher rate band;
	•	additional rate band if used;
	•	tax calculation on taxable earned income.

The baseline model should be simplified but internally consistent.

Baseline simplifications

Unless otherwise specified:
	•	ignore deductions and reliefs beyond the basic baseline structure;
	•	ignore complex taper interactions unless explicitly included;
	•	assume taxable income equals gross income minus personal allowance in the baseline only;
	•	treat all modelled income as income-taxable.

⸻

8. Reform Scenarios

Scenario Family 1: Two-tier flat tax

User specifies:
	•	threshold between lower and upper band;
	•	lower flat rate;
	•	upper flat rate.

Example structure:
	•	0 to threshold: taxed at rate A, with no tax-free allowance;
	•	threshold+: taxed at rate B.

Scenario Family 2: Three-tier flat tax

User specifies:
	•	first threshold;
	•	second threshold;
	•	lower, middle, and upper flat rates.

Example structure:
	•	0 to threshold 1: rate A;
	•	threshold 1 to threshold 2: rate B;
	•	threshold 2+: rate C;
	•	no tax-free allowance.

Reform rules
	•	no personal allowance;
	•	no deductions;
	•	no reliefs;
	•	no tax-free band;
	•	all gross income is taxed from the first pound;
	•	tax is computed purely from band thresholds and flat rates.

⸻

9. Behavioural Response Module

The notebook must include an optional behavioural adjustment layer.

Behavioural channels

At minimum include:
	1.	Taxable income response
	•	taxpayers change reported/pre-tax income in response to changes in net-of-tax rate.
	2.	Optional participation effect
	•	lower earners may increase or reduce participation depending on effective tax burden.
	3.	Optional top-end avoidance/compliance response
	•	high earners may reduce taxable income more strongly under higher effective rates.

Minimum implementation

Use an elasticity-based taxable income response model, such as:
	•	elasticity of taxable income (ETI) applied to change in net-of-tax rate.

Illustrative logic:
	•	new_taxable_income = baseline_income * behavioural_adjustment_factor
	•	behavioural adjustment factor linked to:
	•	old marginal net-of-tax rate,
	•	new marginal net-of-tax rate,
	•	elasticity parameter.

Requirements
	•	user can switch behavioural effects on/off;
	•	user can set one universal elasticity or decile-specific elasticities;
	•	user can run sensitivity cases:
	•	low response,
	•	central response,
	•	high response.

Output requirements

Show:
	•	static revenue estimate;
	•	behaviour-adjusted revenue estimate;
	•	revenue difference attributable to behavioural response.

⸻

10. Cohort / Distributional Analysis

The notebook must analyse impacts by cohort, with income deciles as mandatory.

Required cohorts
	•	deciles of baseline gross income;
	•	total population;
	•	optionally:
	•	bottom 50%,
	•	top 10%,
	•	top 1%,
	•	pension-age vs working-age,
	•	custom cohort definitions.

Metrics by decile

For each decile, calculate:
	•	number of taxpayers / weighted taxpayers;
	•	average gross income;
	•	baseline tax paid;
	•	reform tax paid;
	•	change in tax paid;
	•	percentage change in tax paid;
	•	baseline post-tax income;
	•	reform post-tax income;
	•	change in post-tax income;
	•	average tax rate before/after;
	•	marginal tax rate before/after;
	•	share of total tax take before/after.

Distributional framing

Clearly show:
	•	who pays more;
	•	who pays less;
	•	whether reform is progressive, proportional, or regressive relative to baseline.

⸻

11. Outputs

Summary outputs

The notebook must produce a headline summary table with:
	•	baseline revenue;
	•	reform revenue (static);
	•	reform revenue (behaviour-adjusted);
	•	gross revenue uplift / reduction;
	•	behavioural revenue offset;
	•	net revenue uplift / reduction.

Distributional outputs

Required tables/charts:
	1.	tax paid by decile, before vs after;
	2.	average post-tax income by decile, before vs after;
	3.	change in tax burden by decile;
	4.	effective tax rate by decile;
	5.	cumulative share of gains/losses by income group.

Visualisations

At minimum include:
	•	bar chart: tax change by decile;
	•	line or bar chart: average tax rate before/after by decile;
	•	bar chart: revenue under baseline vs reform scenarios;
	•	tornado or sensitivity chart for behavioural assumptions;
	•	optional Lorenz-style or concentration chart.

Scenario comparison

Include a comparison section allowing multiple reform scenarios side by side:
	•	baseline;
	•	two-tier scenario A;
	•	two-tier scenario B;
	•	three-tier scenario A;
	•	three-tier scenario B.

⸻

12. Functional Requirements

The notebook must:
	1.	Load and validate input data.
	2.	Compute baseline tax liabilities.
	3.	Assign taxpayers to income deciles.
	4.	Compute reform tax liabilities for configurable two-tier and three-tier systems.
	5.	Estimate static tax take changes.
	6.	Apply behavioural adjustments.
	7.	Recompute tax take after behavioural changes.
	8.	Generate decile and aggregate distributional analysis.
	9.	Produce charts and clean summary tables.
	10.	Allow rapid parameter changes without rewriting core logic.

⸻

13. Non-Functional Requirements
	•	Python notebook format (.ipynb).
	•	Clear sectioning with markdown explanations.
	•	Functions should be modular and reusable.
	•	Use common Python libraries only, ideally:
	•	pandas
	•	numpy
	•	matplotlib
	•	plotly optional
	•	Notebook should run end-to-end without manual intervention once inputs are set.
	•	Errors should be readable and validation checks explicit.
	•	Results should be exportable to CSV.

⸻

14. Suggested Notebook Structure

Section 1: Introduction
	•	purpose of notebook;
	•	reform definition;
	•	modelling caveats.

Section 2: Parameters
	•	baseline tax parameters;
	•	reform scenario parameters;
	•	behavioural parameters;
	•	cohort settings.

Section 3: Data Input and Validation
	•	load data;
	•	inspect columns;
	•	validate missing values and weights.

Section 4: Baseline Tax Engine
	•	baseline liability function;
	•	baseline summary outputs.

Section 5: Reform Tax Engine
	•	two-tier function;
	•	three-tier function;
	•	scenario runner.

Section 6: Behavioural Response Engine
	•	ETI logic;
	•	optional cohort-specific elasticities;
	•	scenario toggles.

Section 7: Distributional Analysis
	•	decile assignment;
	•	cohort summaries;
	•	gains/losses analysis.

Section 8: Visualisation
	•	charts and formatted tables.

Section 9: Sensitivity Analysis
	•	vary thresholds;
	•	vary rates;
	•	vary elasticity.

Section 10: Conclusions / Interpretation
	•	summary of winners/losers;
	•	fiscal trade-offs;
	•	sensitivity commentary.

⸻

15. Assumptions and Caveats

The notebook should explicitly state that results are indicative and depend on simplifying assumptions, including:
	•	no deductions or reliefs in reform case;
	•	simplified treatment of the baseline system;
	•	no interaction with NICs or benefits unless added;
	•	behavioural response is stylised rather than fully causal;
	•	data quality and representativeness matter materially;
	•	fiscal estimates are not equivalent to official scoring.

⸻

16. Success Criteria

The simulation is successful if it can:
	•	run baseline and reform scenarios without errors;
	•	show total tax take before and after reform;
	•	quantify behavioural effects separately from static effects;
	•	show impacts by decile clearly;
	•	support both two-tier and three-tier policy designs;
	•	allow a user to change rates, thresholds, and elasticities quickly;
	•	produce outputs suitable for policy discussion.

⸻

17. Example Parameter Set

Baseline
	•	personal allowance: configurable
	•	basic/higher/additional bands: configurable

Reform example A: Two-tier
	•	band 1: 0 to GBP 50,000 at 20%
	•	band 2: GBP 50,000+ at 35%

Reform example B: Three-tier
	•	band 1: 0 to GBP 20,000 at 15%
	•	band 2: GBP 20,000 to GBP 80,000 at 25%
	•	band 3: GBP 80,000+ at 35%

Behavioural assumptions
	•	ETI central: 0.2
	•	low: 0.1
	•	high: 0.4
	•	optional higher elasticity for top decile.

⸻

18. Stretch Features

Optional extensions:
	•	include National Insurance;
	•	household-level analysis;
	•	regional cuts;
	•	age-based cohort analysis;
	•	dynamic multi-year simulation;
	•	labour supply participation model;
	•	uncertainty intervals / Monte Carlo analysis;
	•	exportable policy briefing tables.

⸻

19. One-Paragraph Build Prompt

Create a Python Jupyter Notebook that simulates UK income tax reform by removing the personal allowance and replacing the current system with configurable two-tier and three-tier flat tax band structures with no deductions or reliefs. The notebook should calculate baseline and reform tax liabilities, total tax take, static and behaviour-adjusted revenue impacts, and distributional effects by income decile. It should include modular functions for baseline tax calculation, reform scenario calculation, behavioural response modelling using taxable income elasticity assumptions, cohort analysis, sensitivity analysis, and clear charts/tables comparing baseline and reform outcomes.

⸻

20. Cleaner Version for an AI Code Generator

Build a .ipynb notebook in Python for a UK income tax simulation. Use configurable input parameters and either microdata or synthetic income distribution data. Model the current baseline tax system in simplified form, then simulate reforms that remove the tax-free personal allowance and replace the system with either a two-band or three-band flat tax schedule starting from the first pound of income, with no deductions or reliefs. Output total baseline tax revenue, reform revenue, static revenue change, behaviour-adjusted revenue change using ETI-based behavioural assumptions, and distributional impacts by income decile. Include modular code, markdown explanations, validation checks, scenario comparison tables, sensitivity analysis, and visualisations of revenue and decile impacts.

If useful, I can also turn this into a tighter “builder prompt” optimised specifically for Claude, GPT, or Cursor.
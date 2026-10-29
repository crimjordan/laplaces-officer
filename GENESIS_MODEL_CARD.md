# LAPLACE // GENESIS — Model card and research methodology

**Version:** GENESIS v1 · **Status:** educational, synthetic, uncalibrated agent-based model.

## What this is

GENESIS is a fictional 12 × 12–district city populated by 1,152 generated residents. It supports 240 monthly steps (20 years), two matched policy worlds, individual life histories, WebGL 3D exploration with fallback, paired multi-seed experiments, and standalone print/PDF research reports.

**GENESIS is not a predictive crime model validated against real-world events or persons.** All individual names, household membership, personal exposures, school/clinic quality, business development, geographical arrangements, baseline event probabilities, financial values and transition equations are synthetic. Policy decisions here never create legal grounds for a stop.

## What is grounded in research

| Source | Study design | Measured outcome | Numeric model adaptation |
| --- | --- | --- | --- |
| Heller (2014), Science; Chicago One Summer Plus | Randomized trial, 1,634 selected youth | Violent-crime **arrests** over 16 months after job offer | Multiply an eligible synthetic youth's **violent-arrest intensity** by 0.57 for 16 months after program offer; no direct change to underlying violent crime or long-run employment |
| Larochelle et al. (2018), Annals of Internal Medicine / NIH | Observational cohort of 17,568 Massachusetts nonfatal-overdose survivors | Subsequent opioid-overdose **mortality** during medication treatment | Multiply an invented monthly **mortality hazard among survivors** by 0.41 while treated; never multiply overdose-incidence risk by 0.41 |
| RAND / U.S. DOJ (2013) correctional education meta-analysis | Meta-analysis of programs | **Odds** of recidivism | Convert odds ratio 0.57 into a hypothetical 36-month treated recidivism risk; not a 43-percentage-point risk reduction |
| Braga et al. (2019), hot-spots policing meta-analysis | Systematic review | Crime in small treated places | Directional justification for geographical policy comparisons **without importing a universal effect size** |
| Ensign et al. (2018), runaway feedback loops | Algorithmic/methodological analysis | Model feedback from police-recorded activity | Separate underlying events from recorded events and feed recorded events into a moving-average score; **coefficients are invented** |
| Perry Preschool / long-term follow-up | Small randomized early education study | Long-run education and select criminal-justice outcomes | Motivation for examining education pathways only. **No Perry effect-size coefficient** is imported |
| Davis & Heller (2020), youth jobs follow-up | Two randomized field experiments | Youth violent-crime arrests; employment; schooling; other crime | The model **does not assume** that youth-job programs improve employment, schooling, or every crime outcome |

The clickable in-app evidence ledger contains the full source links and model interpretation boundaries.

## Synthetic mechanism specification

- **Population:** a closed cohort of 1,152 agents grouped into synthetic households, with fixed schematic social links.
- **Geography:** 144 fictional districts. District opportunity, development and support indices are invented functions of map position and deterministic random variation.
- **Offenses / outcomes:** theft, burglary, vehicle theft, robbery, aggravated assault, gun violence, homicide, sexual assault, fraud, drug-market offenses, disorder complaints, and a **separate noncriminal overdose emergency outcome**.
- **Event generation:** each active resident and category has an invented monthly probability that varies with synthetic personal exposure, district opportunity, specified shocks, housing/school inputs, and patrol deterrence. The baseline rates and all these coefficients are **hypothetical**, not fitted to data.
- **Observation / recording:** police-recorded counts are a probabilistic subset of underlying events. Observation is separately affected by reporting, hypothetical trust response, surveillance availability and patrol presence. The drug-market category has a deliberately enforcement-sensitive discovery mechanism.
- **Predictive allocation:** patrol can be based on a smoothed score of previously recorded events (0.70 prior score + 0.30 new observation), or equal, random, needs-based, problem-oriented, or intentionally non-realistic oracle allocation. This is an illustrative feedback system, **not a fitted predictive algorithm**.
- **Summer jobs:** program offers at synthetic summer times for individuals aged 14–21, with the study's narrow 16-month violent-arrest-intensity contrast. Program offers do not automatically change their underlying crime exposure or long-term employment.
- **Medication treatment:** an invented pathway into treatment for residents surviving nonfatal overdose, with a distinct monthly mortality hazard. An invented untreated baseline hazard (0.0018 / month) is multiplied by 0.41 during a modeled treatment episode. The study did **not** establish that a treatment program would produce this effect in the invented population.
- **Correctional education:** hypothetical untreated three-year recidivism probability is 0.40; with an illustrative odds ratio of 0.57, the treated probability is computed as `0.57 × 0.40 / (1 − 0.40 + 0.57 × 0.40)`, then a constant monthly hazard is derived as `1 − (1 − p)^(1 / 36)`. The baseline probability is **not taken from RAND**.
- **Built environment:** school quality, clinic access, and building-development indexes evolve according to invented incremental rules. The evolving 3D skyline is an illustration, not a prediction of the physical built environment.
- **Interactions / network:** simple synthetic household and peer links influence a limited number of opportunity states. They do not identify real associations or people.

## Reading reports responsibly

GENESIS exports monthly paired-world counts, synthetic life-course CSV data, replication CSV data, machine-readable scenario JSON, and standalone HTML research reports that can be printed to PDF.

Reports identify which policies were actually active in each simulated month and cite the studies associated with the modeled pathways. They do **not** supply confidence intervals for real-world treatment effects, real-world costs, actual crime denominators, official rates, or externally valid projections.

### Paired experiments

Each pair begins with the same initial synthetic people and seed, then receives different policy settings. This is a model-internal counterfactual experiment; it is **not causal identification of any empirical policy effect**. The repeated-run experiment uses a smaller 384-person closed cohort for responsiveness. Its 5th–95th percentile displays summarize variation **among synthetic seeds**, not statistical confidence for effects on real jurisdictions.

### Reproducibility and testing

Run from a local copy of the repository (requires a current Node.js version):

```bash
node scripts/test-genesis.cjs
```

The GitHub Pages workflow runs this check before deploying. It verifies script syntax, referenced page assets and DOM controls, deterministic identical-world comparisons, offense-count consistency, historical branching and report generation.

## References

- Heller, S. B. (2014). Summer jobs reduce violence among disadvantaged youth. *Science, 346*(6214), 1219–1223. https://doi.org/10.1126/science.1257809
- Davis, J. M. V., & Heller, S. B. (2020). Rethinking the benefits of youth employment programs: The heterogeneous effects of summer jobs. *The Review of Economics and Statistics, 102*(4), 664–677. https://doi.org/10.1162/rest_a_00850
- Larochelle, M. R., et al. (2018). Medication for opioid use disorder after nonfatal opioid overdose and association with mortality: A cohort study. *Annals of Internal Medicine, 169*(3), 137–145. https://doi.org/10.7326/M17-3107
- RAND Corporation. (2013). *Evaluating the effectiveness of correctional education: A meta-analysis of programs that provide education to incarcerated adults*. https://www.rand.org/pubs/research_reports/RR266.html
- Braga, A. A., Turchan, B., Papachristos, A. V., & Hureau, D. M. (2019). Hot spots policing and crime reduction: An update of an ongoing systematic review and meta-analysis. *Journal of Experimental Criminology, 15*, 289–311. https://doi.org/10.1007/s11292-019-09372-3
- Ensign, D., Friedler, S. A., Neville, S., Scheidegger, C., & Venkatasubramanian, S. (2018). Runaway feedback loops in predictive policing. *Proceedings of Machine Learning Research, 81*, 160–171. https://proceedings.mlr.press/v81/ensign18a.html

# EpiModelConcepts

Interactive epidemic modeling concepts for teaching and research. Runs entirely in the browser — no R, no server, no installation.

**Live site:** https://rajsubediresearch.github.io/epimodelconcepts

---

## Modules

| Page | What it covers |
|---|---|
| `concepts.html` | Differential equations primer, R₀/Rₜ calculator, serial interval, generation time, doubling time, herd immunity threshold, model taxonomy, glossary, interactive SIR explorer |
| `phenomenological.html` | Interactive simulator for growth curve models — Exponential, GGM, Logistic, Richards, Gompertz, GRM. Parameter sliders, example presets, live incidence/cumulative curves, key quantities (peak time, final size, doubling time), auto-generated plain-language interpretation, model nesting hierarchy |
| `statistical.html` | Interactive simulator for statistical epidemic count models — Poisson GLM, Negative Binomial GLM, Log-linear OLS, ARIMA, GAM. Seeded random simulation with observed counts and true mean, key properties (dispersion, autocorrelation), auto-interpretation, model specification reference |
| `sir_explorer.html` | Interactive compartmental model simulator — SI, SIR, SEIR, SEIR with vital dynamics, SEIR with waning immunity. RK4 solver. Parameter presets. Key quantities (R₀, peak, final size, endemic equilibrium). Auto-generated plain-language interpretation |

---

## Design principles

- **Simulation-first** — adjust parameters, run, and see what happens immediately; no data required
- **Auto-interpretation** — every simulation produces plain-language explanation of what the parameter values mean and when each model is appropriate
- **Model hierarchy** — explicit nesting relationships shown (GRM nests Richards nests Logistic; GGM nests Exponential)
- **Example presets** — disease-specific scenarios (Ebola-like, measles, influenza) as starting points
- **No backend** — pure HTML + CSS + JS; all computation in browser
- **Teaching + reference combined** — suitable for MPH homework, graduate seminars, and practitioner reference

---

## Technical stack

- `css/style.css` — shared theme, dark mode included
- Plotly.js (CDN) — all interactive charts

---

## Deploy to GitHub Pages

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/rajsubediresearch/epimodelconcepts.git
git push -u origin main
```

Settings → Pages → Source: `main` / `root` → Save.

---

## Related tools

- [EpiTables](https://rajsubediresearch.github.io/epitables/) — 2×2 table analysis, diagnostic accuracy, McNemar's test, single proportion CI
- [Age Standardization Dashboard](https://rajsubediresearch.github.io/age-standardization-dashboard/) — direct and indirect standardization, SMR
- [DAG Builder](https://rajsubediresearch.github.io/dag-builder/) — causal diagram editor, dagitty R code export

---

## Citation

Subedi, R. (2026). EpiModelConcepts: Interactive epidemic modeling concepts for teaching and research. Zenodo. https://doi.org/10.5281/zenodo.20138554

[![DOI](https://img.shields.io/badge/DOI-10.5281%2Fzenodo.20138554-blue)](https://doi.org/10.5281/zenodo.20138554)

---

## License

MIT

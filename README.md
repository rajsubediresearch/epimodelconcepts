# EpiModelConcepts

Interactive epidemic modeling concepts for teaching and research. Runs entirely in the browser — no R, no server, no installation.

**Live site:** https://rajsubediresearch.github.io/epimodelconcepts

---

## Modules

| Page | What it covers |
|---|---|
| `concepts.html` | Differential equations primer, R₀/Rₜ calculator, serial interval, generation time, doubling time, herd immunity threshold, model taxonomy, glossary, interactive SIR explorer |
| `phenomenological.html` | Exponential, logistic, Richards, Gompertz, generalized logistic models. Fit to real or user data. Train/test split with forecast evaluation. Bootstrap CIs and parameter histograms. Full error metrics (RMSE, MAE, MAPE, R², AIC, BIC, WIS) with three-layer interpretations |
| `statistical.html` | Log-linear OLS, Poisson GLM, Negative Binomial GLM, ARIMA (auto-select or manual order), GAM. Dispersion check (VMR). Growth rate, doubling time, rate ratio. Train/test split with forecast evaluation. Residual bootstrap CIs. Model comparison |
| `sir_explorer.html` | Interactive compartmental model simulator — SI, SIR, SEIR, SEIR with vital dynamics, SEIR with waning immunity. RK4 solver. Parameter presets. Key quantities (R₀, peak, final size, endemic equilibrium). Auto-generated plain-language interpretation |

---

## Design principles

- **Three-layer outputs** — every metric shows: (1) definition, (2) your result in plain language with your variable names, (3) "so what" guidance
- **Real outbreak data** — Ebola 2014, Measles DRC 2019, COVID-19 US 2020, H1N1 2009 as defaults; users can paste their own
- **Train/test split** — fit on a training window, forecast ahead, evaluate out-of-sample performance automatically
- **Bootstrap uncertainty** — parametric/residual bootstrap (configurable iterations) with parameter histograms
- **No backend** — pure HTML + CSS + JS; all statistics and ODE solving in browser
- **Teaching + lab combined** — suitable for MPH homework, graduate seminars, and practitioner reference

---

## Technical stack

- `js/core.js` — error metrics (MAE, RMSE, MAPE, R², AIC, BIC, WIS), dispersion (VMR), formatting utilities
- `js/optimizer.js` — Nelder-Mead minimizer, curve fitting, parametric bootstrap, residual bootstrap
- `js/models.js` — phenomenological model equations, GLM loss functions, default datasets
- `css/style.css` — shared theme matching EpiTables, dark mode included
- Plotly.js (CDN) — all interactive charts

---

## Modules table (README)

| Page | What it does |
|---|---|
| `concepts.html` | Differential equations primer, R₀/Rₜ, serial interval, generation time, doubling time, model taxonomy, glossary. Interactive SIR explorer. |
| `phenomenological.html` | Exponential, logistic, Richards, Gompertz, generalized logistic. Fit to real or user data. Compare all models. Full error metrics. Bootstrap CIs. Train/test forecast evaluation. |
| `statistical.html` | Log-linear, Poisson, Negative Binomial, ARIMA, GAM. Dispersion check (VMR). Bootstrap CIs. Train/test forecast evaluation. Model comparison. |
| `sir_explorer.html` | SI, SIR, SEIR, SEIR+vital, SEIR+waning. RK4 solver. Parameter presets. R₀, endemic equilibrium, recurrent wave detection. Auto-interpretation. |

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

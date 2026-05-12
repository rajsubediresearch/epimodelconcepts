# EpiModelConcepts

Interactive epidemic modeling concepts for teaching and research. Runs entirely in the browser — no R, no server, no installation.

**Live site:** https://rajsubediresearch.github.io/epimodelconcepts

---

## Modules

| Page | What it covers |
|---|---|
| `concepts.html` | Differential equations primer, R₀/Rₜ, serial interval, generation time, doubling time, model taxonomy, glossary. Interactive SIR explorer. |
| `phenomenological.html` | Exponential, logistic, Richards, Gompertz, sub-epidemic wave models. Fit to real or user data. Compare all models. Full error metrics with three-layer interpretations. |
| `statistical.html` | Log-linear, Poisson, Negative Binomial regression. Dispersion check (VMR). Growth rate and doubling time. Residual diagnostics. Model comparison. |

---

## Design principles

- **Three-layer outputs** — every metric shows: (1) definition, (2) your result interpreted in plain language with your variable names, (3) "so what" guidance
- **Real outbreak data** — Ebola 2014, Measles DRC 2019, COVID-19 US 2020, H1N1 2009 as defaults; users can paste their own data
- **User-configurable** — disease name, place, time unit (daily/weekly/monthly/yearly) all editable; interpretations update accordingly
- **No backend** — pure HTML + CSS + JS; all statistics computed in browser via self-contained libraries
- **Teaching + lab combined** — suitable for MPH homework, graduate seminars, and practitioner reference

---

## Technical stack

- `js/core.js` — error metrics (MAE, RMSE, MAPE, R², AIC, BIC, WIS), dispersion analysis (VMR), formatting
- `js/optimizer.js` — Nelder-Mead minimizer, curve fitting, bootstrap CI
- `js/models.js` — all model equations and metadata
- `css/style.css` — shared theme matching EpiTables
- Plotly.js (CDN) — interactive charts

---

## Roadmap

- [ ] Serfling seasonal baseline model (training/test period, epidemic threshold)
- [ ] Structural identifiability concepts
- [ ] Sub-epidemic wave tool (dedicated, full multi-wave decomposition)
- [ ] SEIR/SEIRD compartmental model explorer
- [ ] WIS calculator with interval input

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

## Citation

Subedi, R. (2026). EpiModelConcepts: Interactive epidemic modeling concepts for teaching and research. Zenodo. https://doi.org/10.5281/zenodo.20138554

---

## Related tools

- [EpiTables](https://rajsubediresearch.github.io/epitables/) — 2×2 table analysis
- [Age Standardization Dashboard](https://rajsubediresearch.github.io/age-standardization-dashboard/)
- [DAG Builder](https://rajsubediresearch.github.io/dag-builder/)

---

## License

MIT

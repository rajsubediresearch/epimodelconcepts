/* EpiModelConcepts — core.js: shared utilities, error metrics, dispersion */

const Core = (() => {

  /* ── Formatting ── */
  function fmt(x, dec=3) {
    if (x === null || x === undefined || isNaN(x) || !isFinite(x)) return '—';
    return x.toFixed(dec);
  }
  function fmt2(x) { return fmt(x, 2); }
  function fmt4(x) { return fmt(x, 4); }
  function fmtInt(x) { return Math.round(x).toLocaleString(); }
  function fmtP(p) {
    if (p === null || isNaN(p)) return '—';
    if (p < 0.001) return '<0.001';
    return p.toFixed(3);
  }

  /* ── Basic stats ── */
  function mean(arr) { return arr.reduce((a,b)=>a+b,0)/arr.length; }
  function variance(arr) {
    const m = mean(arr);
    return arr.reduce((s,x)=>s+(x-m)**2,0)/(arr.length-1);
  }
  function sum(arr) { return arr.reduce((a,b)=>a+b,0); }

  /* ── Error metrics ── */
  function mae(obs, pred) {
    const n = obs.length;
    return obs.reduce((s,o,i)=>s+Math.abs(o-pred[i]),0)/n;
  }

  function rmse(obs, pred) {
    const n = obs.length;
    return Math.sqrt(obs.reduce((s,o,i)=>s+(o-pred[i])**2,0)/n);
  }

  function mape(obs, pred) {
    const valid = obs.map((o,i)=>({o,p:pred[i]})).filter(d=>d.o!==0);
    if (valid.length===0) return null;
    return valid.reduce((s,d)=>s+Math.abs((d.o-d.p)/d.o),0)/valid.length*100;
  }

  function rSquared(obs, pred) {
    const m = mean(obs);
    const ssTot = obs.reduce((s,o)=>s+(o-m)**2,0);
    const ssRes = obs.reduce((s,o,i)=>s+(o-pred[i])**2,0);
    return 1 - ssRes/ssTot;
  }

  function aic(obs, pred, k) {
    const n = obs.length;
    const ssr = obs.reduce((s,o,i)=>s+(o-pred[i])**2,0);
    const logLik = -n/2*(Math.log(2*Math.PI)+Math.log(ssr/n)+1);
    return 2*k - 2*logLik;
  }

  function bic(obs, pred, k) {
    const n = obs.length;
    const ssr = obs.reduce((s,o,i)=>s+(o-pred[i])**2,0);
    const logLik = -n/2*(Math.log(2*Math.PI)+Math.log(ssr/n)+1);
    return k*Math.log(n) - 2*logLik;
  }

  /* ── Dispersion ── */
  function vmr(arr) {
    const m = mean(arr);
    if (m === 0) return null;
    return variance(arr) / m;
  }

  function dispersionLabel(v) {
    if (v === null) return { label: '—', interpretation: 'Cannot compute.', model: 'Unknown', cls: '' };
    if (v < 0.8)  return { label: 'Underdispersed', interpretation: `VMR = ${fmt2(v)} — variance is less than the mean. Rare in outbreak data; may indicate data aggregation effects.`, model: 'Consider Conway-Maxwell-Poisson', cls: 'warn' };
    if (v <= 1.2) return { label: 'Equidispersed', interpretation: `VMR = ${fmt2(v)} — variance ≈ mean. Poisson assumption holds well.`, model: 'Poisson model appropriate', cls: 'success' };
    if (v <= 3.0) return { label: 'Overdispersed', interpretation: `VMR = ${fmt2(v)} — variance exceeds the mean. Moderate overdispersion; Poisson will underestimate uncertainty.`, model: 'Negative Binomial recommended', cls: 'warn' };
    return { label: 'Strongly overdispersed', interpretation: `VMR = ${fmt2(v)} — variance greatly exceeds the mean (VMR = ${fmt2(v)}). Common in outbreak data due to clustering and superspreading.`, model: 'Negative Binomial strongly recommended', cls: 'warn' };
  }

  /* ── WIS (Weighted Interval Score) ── */
  function wis(obs, median, intervals) {
    // intervals: array of {alpha, lower, upper}
    // Returns per-observation WIS and mean WIS
    const scores = obs.map((o, i) => {
      let score = 0;
      intervals.forEach(({alpha, lower, upper}) => {
        const l = lower[i], u = upper[i];
        const width = u - l;
        const underpred = o < l ? 2/alpha*(l-o) : 0;
        const overpred  = o > u ? 2/alpha*(o-u) : 0;
        score += width + underpred + overpred;
      });
      // Absolute error on median
      score += Math.abs(o - median[i]);
      return score / (intervals.length + 0.5);
    });
    return { perPoint: scores, mean: mean(scores) };
  }

  /* ── Normal distribution ── */
  function normalCDF(x) {
    const t = 1/(1+0.2316419*Math.abs(x));
    const d = 0.3989423*Math.exp(-x*x/2);
    const p = d*t*(0.3193815+t*(-0.3565638+t*(1.7814779+t*(-1.8212560+t*1.3302744))));
    return x > 0 ? 1-p : p;
  }

  /* ── Parse user data input ── */
  function parseData(str) {
    // Accepts comma, space, newline, or tab separated numbers
    const nums = str.trim().split(/[\s,\t\n]+/).map(Number).filter(n=>!isNaN(n)&&n>=0);
    return nums;
  }

  /* ── Generate time axis labels ── */
  function timeLabels(n, unit, start=1) {
    return Array.from({length:n}, (_,i)=>{
      const t = start+i;
      if (unit==='weekly') return `W${t}`;
      if (unit==='monthly') return `M${t}`;
      if (unit==='yearly') return `Y${t}`;
      return `D${t}`;
    });
  }

  /* ── Concept box HTML builder ── */
  function conceptBox(definition, interpretation, sowhat) {
    return `<div class="concept-box">
      <div class="cb-definition"><strong>Definition</strong>${definition}</div>
      <div class="cb-interpretation"><strong>Interpretation</strong>${interpretation}</div>
      <div class="cb-sowhat">${sowhat}</div>
    </div>`;
  }

  /* ── Metric card HTML builder ── */
  function metricCard(label, value, ci, interp) {
    return `<div class="metric-card">
      <div class="m-label">${label}</div>
      <div class="m-value">${value}</div>
      ${ci ? `<div class="m-ci">${ci}</div>` : ''}
      ${interp ? `<div class="m-interp">${interp}</div>` : ''}
    </div>`;
  }

  /* ── Three-layer output for each metric ── */
  const metricDefs = {
    rmse: {
      definition: 'Root Mean Squared Error (RMSE) measures average prediction error in the same units as the outcome. Larger errors are penalized more than smaller ones due to squaring.',
      sowhat: 'Compare RMSE across models — lower is better. Use alongside MAE; if RMSE >> MAE, your model has large errors at specific time points (often the peak).'
    },
    mae: {
      definition: 'Mean Absolute Error (MAE) is the average absolute difference between observed and predicted values. Less sensitive to outliers than RMSE.',
      sowhat: 'MAE is easier to interpret in outbreak units (e.g. cases/week). If MAE ≈ RMSE, errors are evenly distributed across time points.'
    },
    mape: {
      definition: 'Mean Absolute Percentage Error (MAPE) expresses prediction error as a percentage of observed values. Scale-independent — useful for comparing across outbreaks.',
      sowhat: 'MAPE > 20% suggests poor fit. Undefined when observed values include zeros — check for zero counts in your data.'
    },
    r2: {
      definition: 'R² (coefficient of determination) measures the proportion of variance in observed data explained by the model. Ranges from −∞ to 1; values near 1 indicate good fit.',
      sowhat: 'R² > 0.95 is typical for well-fitting epidemic curves. Negative R² means the model fits worse than a horizontal line through the mean — something is wrong.'
    },
    aic: {
      definition: 'Akaike Information Criterion (AIC) balances model fit against complexity. Penalizes models with more parameters to discourage overfitting. Lower AIC = better trade-off.',
      sowhat: 'ΔAIC > 10 is strong evidence favoring the lower-AIC model. Use AIC to compare models on the same dataset — not across different datasets.'
    },
    bic: {
      definition: 'Bayesian Information Criterion (BIC) is similar to AIC but applies a stronger penalty for model complexity, especially for larger datasets.',
      sowhat: 'BIC tends to favor simpler models than AIC. When AIC and BIC disagree, consider whether parsimony or fit matters more for your application.'
    },
    vmr: {
      definition: 'Variance-to-Mean Ratio (VMR), also called the index of dispersion, compares the variance of count data to its mean. VMR = 1 indicates equidispersion (Poisson); VMR > 1 indicates overdispersion.',
      sowhat: 'Always check VMR before choosing a count regression model. Overdispersion is the rule, not the exception, in real outbreak data due to clustering and heterogeneity.'
    },
    wis: {
      definition: 'Weighted Interval Score (WIS) is a proper scoring rule for probabilistic forecasts. It rewards both accuracy (calibration) and confidence (sharpness). Lower WIS = better probabilistic forecast.',
      sowhat: 'WIS decomposes into dispersion, underprediction, and overprediction penalties. High underprediction penalty at epidemic peaks is common — consider widening intervals or using ensemble forecasts.'
    }
  };

  function fullMetricCard(key, value, interpText) {
    const def = metricDefs[key];
    if (!def) return metricCard(key, value, '', interpText);
    return `<div class="concept-box" style="margin-bottom:0.75rem">
      <div class="cb-definition"><strong>Definition</strong>${def.definition}</div>
      <div class="cb-interpretation"><strong>Your result</strong>${interpText}</div>
      <div class="cb-sowhat">${def.sowhat}</div>
    </div>`;
  }

  return {
    fmt, fmt2, fmt4, fmtInt, fmtP,
    mean, variance, sum,
    mae, rmse, mape, rSquared, aic, bic,
    vmr, dispersionLabel,
    wis, normalCDF,
    parseData, timeLabels,
    conceptBox, metricCard, fullMetricCard,
    metricDefs
  };
})();

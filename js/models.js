/* EpiModelConcepts — models.js: phenomenological model definitions (no sub-epidemic) */

const Models = (() => {

  const phenomenological = [

    {
      id: 'exponential',
      name: 'Exponential Growth',
      equationDisplay: 'I(t) = I₀ · e^(rt)',
      deDisplay: 'dI/dt = r · I',
      params: ['I0','r'],
      paramNames: ['I₀ (initial cases)', 'r (growth rate)'],
      paramDescriptions: [
        'Number of cases at time t=0',
        'Intrinsic growth rate (per time unit). Doubling time = ln(2)/r'
      ],
      init: (obs) => [Math.max(obs[0],1), 0.15],
      fn: (t, [I0, r]) => Math.max(0, I0 * Math.exp(r * t)),
      isCumulative: false,
      definition: 'The simplest epidemic growth model. Cases multiply by a constant factor each time period. Valid only in the early, unconstrained phase of an outbreak before depletion of susceptibles or interventions.',
      assumptions: ['Unlimited susceptible population','Constant transmission rate','No recovery/removal','Homogeneous mixing'],
      strengths: ['Simple — only 2 parameters','Good fit for early outbreak phase','Doubling time directly interpretable'],
      limitations: ['Predicts infinite cases long-term','Ignores population size','Cannot capture peak or decline'],
      doublingTime: ([I0, r]) => r > 0 ? Math.log(2)/r : null
    },

    {
      id: 'logistic',
      name: 'Logistic Growth',
      equationDisplay: 'C(t) = K / (1 + ((K−I₀)/I₀) · e^(−rt))',
      deDisplay: 'dC/dt = r · C · (1 − C/K)',
      params: ['K','r','I0'],
      paramNames: ['K (final size)', 'r (growth rate)', 'I₀ (initial cases)'],
      paramDescriptions: [
        'Final cumulative epidemic size',
        'Intrinsic growth rate',
        'Initial case count at t=0'
      ],
      init: (obs) => {
        const maxObs = Math.max(...obs);
        const K = maxObs * 1.3; // for cumulative, last value ≈ K; for incidence, sum*1.3
        return [Math.max(K, 10), 0.3, Math.max(obs[0], 1)];
      },
      fn: (t, [K, r, I0]) => {
        const A = (K - I0) / Math.max(I0, 0.001);
        return Math.max(0, K / (1 + A * Math.exp(-r * t)));
      },
      isCumulative: true,
      definition: 'Extends exponential growth by adding carrying capacity K. Growth slows as cases approach K, producing a symmetric S-shaped cumulative curve. The incidence (new cases) follows a bell-shaped curve peaking at K/2.',
      assumptions: ['Fixed carrying capacity K','Symmetric growth and decline','Single epidemic wave','Homogeneous population'],
      strengths: ['Captures full epidemic arc','Interpretable parameters','Good for single-wave outbreaks'],
      limitations: ['Symmetric curve — real outbreaks often asymmetric','Cannot capture multiple waves','K sensitive to early data'],
    },

    {
      id: 'richards',
      name: 'Richards Model',
      equationDisplay: 'C(t) = K / (1 + exp(−r(t−t_m)))^(1/a)',
      deDisplay: 'dC/dt = r · C · [1 − (C/K)^a]',
      params: ['K','r','tm','a'],
      paramNames: ['K (final size)', 'r (growth rate)', 't_m (inflection)', 'a (asymmetry)'],
      paramDescriptions: [
        'Final cumulative epidemic size',
        'Growth rate at inflection point',
        'Time of maximum incidence',
        'Asymmetry: a=1 → logistic; a<1 → faster rise; a>1 → slower rise'
      ],
      init: (obs) => {
        const K = Math.max(Math.max(...obs) * 1.3, 10);
        return [K, 0.3, obs.length/2, 1.0];
      },
      fn: (t, [K, r, tm, a]) => {
        const inner = 1 + Math.exp(-r*(t-tm));
        return Math.max(0, K / Math.pow(Math.max(inner,1e-10), 1/Math.max(a,0.01)));
      },
      isCumulative: true,
      definition: 'A generalization of the logistic model with asymmetry parameter a. When a=1 it reduces to logistic. Real outbreaks are almost never symmetric — the decline is typically slower than the rise — making Richards the standard choice for epidemic forecasting.',
      assumptions: ['Unimodal epidemic','Parametric growth form','Closed population during observation'],
      strengths: ['Flexible asymmetry','Standard in WHO/CDC forecasting','Captures fast-rise/slow-decline'],
      limitations: ['4 parameters — needs sufficient data','Identifiability issues with sparse data','Single wave only'],
    },

    {
      id: 'gompertz',
      name: 'Gompertz Model',
      equationDisplay: 'C(t) = K · exp(−exp(−r(t−t_m)))',
      deDisplay: 'dC/dt = r · C · ln(K/C)',
      params: ['K','r','tm'],
      paramNames: ['K (final size)', 'r (growth rate)', 't_m (inflection)'],
      paramDescriptions: [
        'Final cumulative epidemic size',
        'Growth rate parameter',
        'Time of inflection point (always at C = K/e ≈ 0.368K)'
      ],
      init: (obs) => {
        const K = Math.max(Math.max(...obs) * 1.3, 10);
        return [K, 0.3, obs.length/2];
      },
      fn: (t, [K, r, tm]) => Math.max(0, K * Math.exp(-Math.exp(-r*(t-tm)))),
      isCumulative: true,
      definition: 'An asymmetric S-shaped model where the inflection always occurs at C = K/e ≈ 0.368K — earlier than the logistic (0.5K). Produces a naturally faster initial rise and longer tail. Widely used in cancer growth, technology adoption, and epidemic modeling.',
      assumptions: ['Single wave','Inflection fixed at K/e — less flexible than Richards'],
      strengths: ['Natural asymmetry without extra parameter','Good for rapid-onset outbreaks','Simpler than Richards (3 vs 4 params)'],
      limitations: ['Inflection fixed at K/e','Less flexible than Richards for symmetric curves'],
    },

    {
      id: 'generalized_logistic',
      name: 'Generalized Logistic',
      equationDisplay: 'I(t) = K·r·s·(1−s^a)/a  where s=1/(1+e^(−r(t−t_m)))',
      deDisplay: 'Same DE as Richards — dC/dt = r·C·[1−(C/K)^a]',
      params: ['K','r','tm','a'],
      paramNames: ['K (final size)', 'r (growth rate)', 't_m (inflection)', 'a (shape)'],
      paramDescriptions: [
        'Total epidemic size',
        'Peak growth rate',
        'Time of inflection',
        'Shape/asymmetry parameter'
      ],
      init: (obs) => {
        const K = Math.max(obs.reduce((a,b)=>a+b,0) * 1.3, 10);
        return [K, 0.3, obs.length/2, 0.8];
      },
      fn: (t, [K, r, tm, a]) => {
        const s = 1/(1+Math.exp(-r*(t-tm)));
        return Math.max(0, K * r * s * (1 - Math.pow(Math.max(s,1e-10), Math.max(a,0.01))) / Math.max(a,0.01));
      },
      isCumulative: false,
      definition: 'The incidence form of the Richards model — directly models new cases per period rather than cumulative totals. Useful when you observe incidence data (new cases per week). Same flexibility as Richards with the asymmetry parameter a.',
      assumptions: ['Single epidemic wave','Parametric incidence form'],
      strengths: ['Directly fits incidence data','Flexible asymmetry','Widely used in short-term forecasting'],
      limitations: ['Sensitive to noisy data','Cannot capture multiple waves'],
    }
  ];

  /* ── GLM log-likelihood functions ── */
  function logLikPoisson(obs, pred) {
    let ll = 0;
    for (let i = 0; i < obs.length; i++) {
      const mu = Math.max(pred[i], 1e-10);
      ll += obs[i] * Math.log(mu) - mu;
      // subtract log(obs[i]!) — constant, omit for optimization
    }
    return ll;
  }

  function logLikNB(obs, pred, theta) {
    let ll = 0;
    function logGammaApprox(x) {
      if (x <= 0) return 0;
      if (x < 1) return logGammaApprox(x+1) - Math.log(x);
      let s = 0; let xi = x;
      while (xi < 10) { s -= Math.log(xi); xi++; }
      return s + (xi-0.5)*Math.log(xi) - xi + 0.5*Math.log(2*Math.PI)
        + 1/(12*xi) - 1/(360*xi*xi*xi);
    }
    for (let i = 0; i < obs.length; i++) {
      const mu = Math.max(pred[i], 1e-10);
      const o = obs[i];
      ll += logGammaApprox(o+theta) - logGammaApprox(theta) - logGammaApprox(o+1)
          + theta*Math.log(theta/(theta+mu)) + o*Math.log(mu/(theta+mu));
    }
    return ll;
  }

  /* ── Default datasets ── */
  const defaultDatasets = {
    ebola2014: {
      name: 'Ebola — West Africa 2014',
      place: 'Guinea, Sierra Leone, Liberia',
      unit: 'weekly',
      disease: 'Ebola',
      type: 'cumulative',
      data: [1,3,4,6,8,12,18,27,42,63,90,128,176,238,317,420,550,710,900,1120,1380,1650,1920,2180,2430,2660,2860,3020,3140,3210,3250,3270,3280,3285]
    },
    measles2019: {
      name: 'Measles — DRC 2019',
      place: 'Democratic Republic of Congo',
      unit: 'weekly',
      disease: 'Measles',
      type: 'cumulative',
      data: [120,145,168,192,230,285,340,410,495,580,670,750,820,875,910,935,948,955,959,961,963,964,965,965]
    },
    covid2020: {
      name: 'COVID-19 — United States 2020',
      place: 'United States',
      unit: 'weekly',
      disease: 'COVID-19',
      type: 'incidence',
      data: [1,3,8,22,68,200,560,1400,3200,6800,12000,19000,28000,38000,48000,55000,58000,54000,47000,40000,34000,30000,28000,27000,28000,32000,38000,46000,55000,64000,72000,78000,80000,76000,68000,58000,48000,40000,35000,32000]
    },
    influenza2009: {
      name: 'Influenza A H1N1 — USA 2009',
      place: 'United States',
      unit: 'weekly',
      disease: 'Influenza A (H1N1)',
      type: 'incidence',
      data: [12,28,62,138,290,520,820,1100,1350,1480,1520,1480,1380,1220,1040,860,700,560,440,340,260,200,155,120,95,75]
    }
  };

  /* ── Loss function wrappers (called from phenomenological.html) ── */
  function sseLoss(modelFn, t, obs) {
    return params => {
      try {
        const pred = t.map(ti => modelFn(ti, params));
        if (pred.some(v => !isFinite(v) || v < 0)) return 1e15;
        return obs.reduce((s,o,i) => s+(o-pred[i])**2, 0);
      } catch(e) { return 1e15; }
    };
  }

  function poissonLoss(modelFn, t, obs) {
    return params => {
      try {
        const pred = t.map(ti => modelFn(ti, params));
        if (pred.some(v => !isFinite(v) || v <= 0)) return 1e15;
        return -logLikPoisson(obs, pred);
      } catch(e) { return 1e15; }
    };
  }

  function nbLoss(modelFn, t, obs, theta=2) {
    return params => {
      try {
        const pred = t.map(ti => modelFn(ti, params));
        if (pred.some(v => !isFinite(v) || v <= 0)) return 1e15;
        return -logLikNB(obs, pred, theta);
      } catch(e) { return 1e15; }
    };
  }

  return { phenomenological, logLikPoisson, logLikNB, sseLoss, poissonLoss, nbLoss, defaultDatasets };
})();

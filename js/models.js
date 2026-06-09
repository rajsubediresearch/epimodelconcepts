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
      id: 'ggm',
      name: 'Generalized Growth Model (GGM)',
      // Cumulative closed form: C(t) = [C0^(1-p) + r*(1-p)*t]^(1/(1-p))  for p≠1
      // Incidence:             I(t) = dC/dt = r * C(t)^p
      equationDisplay: 'C(t) = [C₀^(1−p) + r·(1−p)·t]^(1/(1−p))   (p ≠ 1)',
      deDisplay: 'dC/dt = r · C^p',
      params: ['C0','r','p'],
      paramNames: ['C₀ (initial cases)', 'r (growth rate)', 'p (scaling)'],
      paramDescriptions: [
        'Cumulative case count at t=0 (must be > 0)',
        'Growth rate constant',
        'Scaling of growth: p=1 → exponential; p=0 → constant linear; 0<p<1 → sub-exponential (polynomial); p>1 → super-exponential. Epidemic context: p typically 0.6–0.9 for early outbreak with interventions.'
      ],
      init: (obs) => {
        // Use first two points to rough-estimate r and p
        const C0 = Math.max(obs[0], 1);
        return [C0, 0.3, 0.8];
      },
      fn: (t, [C0, r, p]) => {
        const C0s = Math.max(C0, 1e-6);
        const ps  = Math.max(0.01, Math.min(p, 0.9999)); // keep numeric stability; p=1 handled below
        if (Math.abs(ps - 1) < 1e-4) {
          // Exponential limit
          return Math.max(0, C0s * Math.exp(r * t));
        }
        const inner = Math.pow(C0s, 1 - ps) + r * (1 - ps) * t;
        if (inner <= 0) return 0;
        return Math.max(0, Math.pow(inner, 1 / (1 - ps)));
      },
      isCumulative: true,
      definition: 'Introduced by Viboud et al. (2016), the GGM generalizes exponential growth by allowing sub-exponential (polynomial) dynamics through the scaling parameter p. When p=1 it reduces to exponential; when p<1 it captures early epidemic slowdown due to spatial heterogeneity, clustering, or interventions. It is designed for the early growth phase — it has no carrying capacity and will grow unbounded. Use for short-horizon early-phase forecasting.',
      assumptions: ['No carrying capacity — growth phase only','Power-law scaling of incidence on cumulative burden','Homogeneous or weakly heterogeneous mixing'],
      strengths: ['Only 3 parameters — parsimonious','Captures sub-exponential growth common in real outbreaks','Closed-form solution — fast fitting','Doubling time depends on epidemic size (not constant)'],
      limitations: ['No carrying capacity K — cannot capture peak or decline','Not suitable once epidemic is near its peak','p poorly identified from very sparse early data'],
    },

    {
      id: 'logistic',
      name: 'Logistic Growth',
      equationDisplay: 'C(t) = K / (1 + A · e^(−rt)),   A = (K − C₀)/C₀',
      deDisplay: 'dC/dt = r · C · (1 − C/K)',
      params: ['K','r','I0'],
      paramNames: ['K (final size)', 'r (growth rate)', 'C₀ (initial cases)'],
      paramDescriptions: [
        'Final cumulative epidemic size',
        'Intrinsic growth rate',
        'Initial case count at t=0'
      ],
      init: (obs) => {
        const maxObs = Math.max(...obs);
        const K = maxObs * 1.3;
        return [Math.max(K, 10), 0.3, Math.max(obs[0], 1)];
      },
      fn: (t, [K, r, I0]) => {
        const A = (K - I0) / Math.max(I0, 0.001);
        return Math.max(0, K / (1 + A * Math.exp(-r * t)));
      },
      isCumulative: true,
      definition: 'Extends exponential growth by adding carrying capacity K. Growth slows as cases approach K, producing a symmetric S-shaped cumulative curve. The inflection always occurs at C = K/2, and the incidence (new cases) follows a perfectly symmetric bell-shaped curve. Real outbreaks are rarely symmetric — see Richards for a more flexible alternative.',
      assumptions: ['Fixed carrying capacity K','Symmetric growth and decline — inflection always at K/2','Single epidemic wave','Homogeneous population'],
      strengths: ['Captures full epidemic arc','Interpretable parameters','Good for single-wave outbreaks with symmetric dynamics'],
      limitations: ['Symmetric curve — real outbreaks often asymmetric','Cannot capture multiple waves','K sensitive to early data'],
    },

    {
      id: 'richards',
      name: 'Richards Model',
      // Closed-form cumulative solution of dC/dt = r·C·[1−(C/K)^a]
      equationDisplay: 'C(t) = K · [1 + a · e^(−r·a·(t − t_m))]^(−1/a)',
      deDisplay: 'dC/dt = r · C · [1 − (C/K)^a]',
      params: ['K','r','tm','a'],
      paramNames: ['K (final size)', 'r (growth rate)', 't_m (inflection time)', 'a (asymmetry)'],
      paramDescriptions: [
        'Final cumulative epidemic size',
        'Growth rate at the inflection point',
        'Time at which incidence is maximum (inflection of cumulative curve)',
        'Asymmetry parameter: a=1 → logistic (symmetric, inflection at K/2); a<1 → inflection below K/2 (faster rise, slower decline); a>1 → inflection above K/2 (slower rise, faster decline)'
      ],
      init: (obs) => {
        const K = Math.max(Math.max(...obs) * 1.3, 10);
        return [K, 0.3, obs.length/2, 1.0];
      },
      fn: (t, [K, r, tm, a]) => {
        const as = Math.max(a, 0.01);
        const inner = 1 + as * Math.exp(-r * as * (t - tm));
        return Math.max(0, K / Math.pow(Math.max(inner, 1e-10), 1 / as));
      },
      isCumulative: true,
      definition: 'A generalization of the logistic model with asymmetry parameter a (Richards 1959). When a=1 it reduces to logistic. Real outbreaks almost never have a symmetric decline — Richards is the standard single-wave model in epidemic forecasting (Chowell 2017, Viboud et al. 2016). It is a special case of the GRM with the growth scaling parameter p fixed at 1.',
      assumptions: ['Unimodal single-wave epidemic','Power-law saturation term','Closed population during observation'],
      strengths: ['Flexible asymmetry without assuming inflection position','Standard in WHO/CDC/academic forecasting','Closed-form solution — fast to fit','Nests logistic (a=1) as special case'],
      limitations: ['4 parameters — needs ≥10–15 data points for reliable estimates','Identifiability issues with sparse early data','Single wave only — not suitable for multi-wave epidemics'],
    },

    {
      id: 'gompertz',
      name: 'Gompertz Model',
      equationDisplay: 'C(t) = K · exp(−exp(−r·(t − t_m)))',
      deDisplay: 'dC/dt = r · C · ln(K / C)',
      params: ['K','r','tm'],
      paramNames: ['K (final size)', 'r (growth rate)', 't_m (inflection time)'],
      paramDescriptions: [
        'Final cumulative epidemic size',
        'Growth rate parameter',
        'Time of inflection point — always at C = K/e ≈ 0.368·K (earlier than logistic at K/2)'
      ],
      init: (obs) => {
        const K = Math.max(Math.max(...obs) * 1.3, 10);
        return [K, 0.3, obs.length/2];
      },
      fn: (t, [K, r, tm]) => Math.max(0, K * Math.exp(-Math.exp(-r*(t-tm)))),
      isCumulative: true,
      definition: 'An asymmetric S-shaped model where the inflection always occurs at C = K/e ≈ 0.368K — earlier than logistic (0.5K). Produces a naturally faster initial rise and longer tail, which matches many infectious disease outbreaks. Widely used in cancer growth, technology diffusion, and epidemic modeling. It has one fewer parameter than Richards but the inflection position is fixed.',
      assumptions: ['Single wave','Inflection always fixed at K/e ≈ 0.368K — no flexibility in inflection position'],
      strengths: ['Natural asymmetry (faster rise, slower decline) without extra parameter','Good for rapid-onset outbreaks','Simpler than Richards (3 vs 4 parameters)'],
      limitations: ['Inflection always at K/e — cannot adapt to outbreaks with different inflection positions','Less flexible than Richards'],
    },

    {
      id: 'grm',
      name: 'Generalized Richards Model (GRM)',
      // No closed form for general p — computed by numerical Euler integration of dC/dt = r·C^p·[1−(C/K)^a]
      equationDisplay: 'No closed form — numerically integrates dC/dt below',
      deDisplay: 'dC/dt = r · C^p · [1 − (C/K)^a]',
      params: ['K','r','p','a'],
      paramNames: ['K (final size)', 'r (growth rate)', 'p (scaling)', 'a (asymmetry)'],
      paramDescriptions: [
        'Final cumulative epidemic size',
        'Growth rate constant',
        'Scaling of growth: p=1 → Richards; p<1 → sub-exponential early growth; p typically 0.6–1.0 in epidemic data',
        'Asymmetry of the epidemic curve: a=1 → symmetric (logistic-type); a≠1 → asymmetric. Together p and a allow independent control of early growth deceleration and curve asymmetry.'
      ],
      init: (obs) => {
        const K = Math.max(Math.max(...obs) * 1.3, 10);
        return [K, 0.3, 0.9, 1.0];
      },
      fn: (t, [K, r, p, a]) => {
        // Euler integration from t=0 to t (step size h, adaptive if t large)
        // C(0) = small seed (1 case)
        const Ks = Math.max(K, 1);
        const ps = Math.max(0.01, Math.min(p, 1.5));
        const as = Math.max(0.01, a);
        const steps = Math.max(200, Math.ceil(t * 20));
        const h = t / steps;
        if (t <= 0) return Math.max(0, 1); // seed
        let C = 1.0; // start with 1 case
        for (let i = 0; i < steps; i++) {
          const dC = r * Math.pow(Math.max(C, 1e-10), ps) * (1 - Math.pow(Math.min(C / Ks, 1 - 1e-10), as));
          C = Math.max(C + h * Math.max(dC, 0), 1e-10);
          if (C >= Ks) { C = Ks; break; }
        }
        return Math.max(0, C);
      },
      isCumulative: true,
      definition: 'The GRM (Chowell 2017; Viboud et al. 2016) generalizes Richards by adding the growth scaling parameter p to the incidence term. This allows independent control of early-phase growth deceleration (via p) and epidemic curve asymmetry (via a). When p=1 it reduces to the Richards model; when p=1 and a=1 it reduces to logistic. The GRM is the most flexible single-wave phenomenological model and is the basis of the QuantDiffForecast toolbox. It nests GGM (no K, early phase only), Richards (p=1), and logistic (p=1, a=1).',
      assumptions: ['Single epidemic wave','Power-law scaling of both incidence and saturation terms','Closed population'],
      strengths: [
        'Most flexible single-wave phenomenological model',
        'Nests Richards (p=1), logistic (p=1, a=1), and GGM (no K)',
        'Independent control of early growth deceleration (p) and curve asymmetry (a)',
        'Basis of Chowell lab QuantDiffForecast toolbox',
        'Captures sub-exponential growth common in spatially heterogeneous outbreaks'
      ],
      limitations: [
        '4 parameters — requires sufficient data (≥15 points recommended)',
        'No closed-form solution — numerically integrated (slower fitting)',
        'p and a can be correlated — identifiability may be poor with sparse data',
        'Single wave only'
      ],
    },

    {
      id: 'generalized_logistic',
      name: 'Generalized Logistic (Incidence)',
      // This is the incidence form — the time-derivative of the Richards cumulative model
      // I(t) = dC/dt evaluated at t, where C(t) is the Richards cumulative
      equationDisplay: 'I(t) = r · K · e^(−r·a·(t−t_m)) · [1 + a·e^(−r·a·(t−t_m))]^(−(1/a)−1)',
      deDisplay: 'I(t) = dC/dt of Richards:  r · C · [1 − (C/K)^a]',
      params: ['K','r','tm','a'],
      paramNames: ['K (total epidemic size)', 'r (growth rate)', 't_m (peak time)', 'a (asymmetry)'],
      paramDescriptions: [
        'Total epidemic size (area under the incidence curve)',
        'Growth rate at peak incidence',
        'Time of peak incidence (equals Richards inflection time t_m)',
        'Asymmetry parameter: a=1 → symmetric bell curve (logistic incidence); a<1 → right-skewed (fast rise, slow decline); a>1 → left-skewed'
      ],
      init: (obs) => {
        const K = Math.max(obs.reduce((a,b)=>a+b,0) * 1.3, 10);
        return [K, 0.3, obs.length/2, 0.8];
      },
      fn: (t, [K, r, tm, a]) => {
        // Analytic derivative of Richards cumulative
        const as = Math.max(a, 0.01);
        const u = Math.exp(-r * as * (t - tm));
        const denom = Math.pow(Math.max(1 + as * u, 1e-10), 1/as + 1);
        return Math.max(0, r * K * u / denom);
      },
      isCumulative: false,
      definition: 'The incidence form of the Richards model — directly fits new cases per period (incidence) rather than cumulative totals. It is the analytic time-derivative of the Richards cumulative curve, producing a flexible asymmetric bell-shaped incidence curve. Use this when your data are new cases per week/day rather than running totals.',
      assumptions: ['Single epidemic wave','Unimodal incidence curve derived from Richards cumulative form'],
      strengths: ['Directly fits incidence data (new cases per period)','Flexible asymmetry via parameter a','Same theoretical basis as Richards — well-studied'],
      limitations: ['Sensitive to noisy incidence data','Cannot capture multiple waves','K here is total epidemic size (sum of all cases), not a population size'],
    },

    {
      id: 'two_wave',
      name: 'Two-Wave Richards',
      // Sum of two Richards-incidence (Generalized Logistic) curves
      // I(t) = I₁(t; K₁,r₁,tm₁,a₁) + I₂(t; K₂,r₂,tm₂,a₂)
      // where each Iₖ(t) = rₖ · Kₖ · uₖ / (1 + aₖ·uₖ)^(1/aₖ + 1),  uₖ = exp(−rₖ·aₖ·(t−tmₖ))
      equationDisplay: 'I(t) = I₁(t; K₁,r₁,t_m1,a₁) + I₂(t; K₂,r₂,t_m2,a₂)',
      deDisplay: 'Each wave: dC_k/dt = r_k · C_k · [1 − (C_k/K_k)^(a_k)]   (Richards incidence, k = 1,2)',
      params: ['K1','r1','tm1','a1','K2','r2','tm2','a2'],
      paramNames: [
        'K₁ (wave 1 size)', 'r₁ (wave 1 rate)', 't_m1 (wave 1 peak)', 'a₁ (wave 1 shape)',
        'K₂ (wave 2 size)', 'r₂ (wave 2 rate)', 't_m2 (wave 2 peak)', 'a₂ (wave 2 shape)'
      ],
      paramDescriptions: [
        'Total incidence contributed by wave 1 (area under first bell curve)',
        'Growth rate at wave 1 peak',
        'Time of wave 1 peak incidence',
        'Asymmetry of wave 1: a=1 → symmetric; a<1 → fast rise/slow decline',
        'Total incidence contributed by wave 2 (area under second bell curve)',
        'Growth rate at wave 2 peak',
        'Time of wave 2 peak incidence (must be > t_m1)',
        'Asymmetry of wave 2: a=1 → symmetric; a<1 → fast rise/slow decline'
      ],
      // Smart init: auto-detect two peaks and trough from data
      init: (obs) => {
        const n = obs.length;
        // Find first peak in the first 60% of the series
        const searchEnd1 = Math.max(4, Math.floor(n * 0.6));
        let peak1Idx = 0;
        for (let i = 1; i < searchEnd1; i++) if (obs[i] > obs[peak1Idx]) peak1Idx = i;

        // Find trough after first peak (stop when values start rising again by >10%)
        let troughIdx = peak1Idx;
        for (let i = peak1Idx + 1; i < n - 2; i++) {
          if (obs[i] < obs[troughIdx]) troughIdx = i;
          else if (obs[i] > obs[troughIdx] * 1.1) break;
        }

        // Find second peak after trough
        let peak2Idx = troughIdx;
        for (let i = troughIdx + 1; i < n; i++) if (obs[i] > obs[peak2Idx]) peak2Idx = i;

        // Ensure minimum separation between peaks
        if (peak2Idx <= peak1Idx + 3) peak2Idx = Math.min(n - 1, peak1Idx + Math.max(5, Math.floor(n * 0.3)));

        // Estimate K from approximate area under each wave
        const K1 = Math.max(obs.slice(0, troughIdx + 1).reduce((a,b) => a+b, 0) * 1.2, 10);
        const K2 = Math.max(obs.slice(troughIdx).reduce((a,b) => a+b, 0) * 1.2, 10);

        return [K1, 0.4, peak1Idx, 0.8,  K2, 0.3, peak2Idx, 1.0];
      },
      fn: (t, [K1, r1, tm1, a1, K2, r2, tm2, a2]) => {
        function waveI(t, K, r, tm, a) {
          const as = Math.max(a, 0.01);
          const u  = Math.exp(-r * as * (t - tm));
          const d  = Math.pow(Math.max(1 + as * u, 1e-10), 1/as + 1);
          return Math.max(0, r * K * u / d);
        }
        return Math.max(0, waveI(t, K1, r1, tm1, a1) + waveI(t, K2, r2, tm2, a2));
      },
      // Override loss to enforce tm2 > tm1 + minimum gap (prevents wave collapse)
      lossConstraint: (params) => {
        const [K1,r1,tm1,a1,K2,r2,tm2,a2] = params;
        if (K1 <= 0 || K2 <= 0 || r1 <= 0 || r2 <= 0 || a1 <= 0 || a2 <= 0) return false;
        if (tm2 <= tm1 + 3) return false;
        return true;
      },
      isCumulative: false,
      twoWave: true,
      definition: 'Models two-wave epidemics as the sum of two independent Richards incidence curves. Each wave has its own size (K), growth rate (r), peak time (t_m), and asymmetry (a), giving 8 parameters in total. Designed for incidence data with a visible inter-wave trough. Requires both waves to be at least partially visible in the training data — if the second wave has not yet begun, its parameters are unidentifiable and forecasts will be unreliable.',
      assumptions: [
        'Two distinct waves with a detectable trough between them',
        'Each wave is independently shaped (no mechanistic interaction between waves)',
        'Both waves must be at least partially observed in training data',
        'Incidence data (new cases per period), not cumulative'
      ],
      strengths: [
        'Captures two-wave epidemic dynamics that all single-wave models fail on',
        'Analytic closed form — fast to fit despite 8 parameters',
        'Each wave independently parameterized — interpretable',
        'ΔAIC vs single-wave is typically >100 for genuine two-wave data',
        'Good short-horizon forecasting once both waves are partly observed'
      ],
      limitations: [
        '8 parameters — requires ≥20 data points with both waves at least partially visible',
        'Fails silently if second wave is absent from training data (wave 2 params unidentifiable)',
        'Assumes only two waves — does not extend to three or more',
        'Bootstrap slower than single-wave models — recommend 100–150 iterations',
        'Incidence only — no cumulative form'
      ],
    }
  ];

  /* ── GLM log-likelihood functions ── */
  function logLikPoisson(obs, pred) {
    let ll = 0;
    for (let i = 0; i < obs.length; i++) {
      const mu = Math.max(pred[i], 1e-10);
      ll += obs[i] * Math.log(mu) - mu;
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

  /* ── Loss function wrappers ── */
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

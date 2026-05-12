/* EpiModelConcepts — models.js: all phenomenological and statistical model definitions */

const Models = (() => {

  /* ────────────────────────────────────────────
     PHENOMENOLOGICAL MODELS
     Each entry: { id, name, equation, params, paramNames, paramDescriptions,
                   init, bounds, fn, cumFn, definition, assumptions, strengths, limitations }
  ──────────────────────────────────────────── */

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
      init: (obs) => [obs[0]||1, 0.15],
      fn: (t, [I0, r]) => I0 * Math.exp(r * t),
      cumFn: (t, [I0, r]) => r > 0 ? I0/r*(Math.exp(r*t)-1) : I0*t,
      definition: 'The simplest epidemic growth model. Cases multiply by a constant factor each time period. Valid only in the early, unconstrained phase of an outbreak before depletion of susceptibles or interventions.',
      assumptions: ['Unlimited susceptible population', 'Constant transmission rate', 'No recovery/removal from infectious class', 'Homogeneous mixing'],
      strengths: ['Simple — only 2 parameters', 'Good fit for early outbreak phase', 'Doubling time directly interpretable'],
      limitations: ['Unrealistic long-term — predicts infinite cases', 'Ignores population size and susceptible depletion', 'Cannot capture epidemic peak or decline'],
      doublingTime: ([I0, r]) => r > 0 ? Math.log(2)/r : null
    },

    {
      id: 'logistic',
      name: 'Logistic Growth (Verhulst)',
      equationDisplay: 'I(t) = K / (1 + ((K−I₀)/I₀) · e^(−rt))',
      deDisplay: 'dI/dt = r · I · (1 − I/K)',
      params: ['K','r','I0'],
      paramNames: ['K (carrying capacity)', 'r (growth rate)', 'I₀ (initial cases)'],
      paramDescriptions: [
        'Final epidemic size — total cases at saturation',
        'Intrinsic growth rate at low incidence',
        'Initial case count at t=0'
      ],
      init: (obs) => [obs.reduce((a,b)=>a+b,0)*1.2, 0.2, obs[0]||1],
      fn: (t, [K, r, I0]) => {
        const A = (K - I0) / I0;
        return K / (1 + A * Math.exp(-r * t));
      },
      cumFn: null,
      definition: 'Extends exponential growth by adding a carrying capacity K — the maximum cumulative case count the population can sustain. Growth slows as cases approach K. Produces a symmetric S-shaped (sigmoidal) curve.',
      assumptions: ['Fixed carrying capacity K', 'Symmetric growth and decline around inflection point', 'Single epidemic wave', 'Homogeneous population'],
      strengths: ['Captures full epidemic arc (rise, peak, decline)', 'Interpretable parameters', 'Good for single-wave outbreaks'],
      limitations: ['Assumes symmetric curve — real outbreaks often have asymmetric tails', 'Cannot capture multiple waves', 'K must be estimated — sensitive to early data'],
    },

    {
      id: 'richards',
      name: 'Richards Model',
      equationDisplay: 'C(t) = K / (1 + exp(−r(t−t_m)))^(1/a)',
      deDisplay: 'dC/dt = r·C·[1−(C/K)^a]',
      params: ['K','r','tm','a'],
      paramNames: ['K (final size)', 'r (growth rate)', 't_m (inflection point)', 'a (asymmetry)'],
      paramDescriptions: [
        'Final cumulative epidemic size',
        'Growth rate at inflection point',
        'Time of maximum incidence (inflection of cumulative curve)',
        'Asymmetry parameter. a=1 → logistic (symmetric); a<1 → faster rise; a>1 → slower rise'
      ],
      init: (obs) => {
        const K = obs.reduce((a,b)=>a+b,0)*1.3;
        const n = obs.length;
        return [K, 0.3, n/2, 1.0];
      },
      fn: (t, [K, r, tm, a]) => {
        // Cumulative curve
        const inner = 1 + Math.exp(-r*(t-tm));
        return K / Math.pow(inner, 1/a);
      },
      isCumulative: true,
      cumFn: (t, p) => Models.phenomenological.find(m=>m.id==='richards').fn(t, p),
      definition: 'A generalization of the logistic model that adds an asymmetry parameter a. When a=1, it reduces exactly to the logistic. The Richards model is widely used in epidemic forecasting because real outbreaks are almost never symmetric — the decline phase is typically slower than the rise.',
      assumptions: ['Unimodal epidemic curve', 'Parametric growth form', 'Population closed during observation period'],
      strengths: ['Flexible shape via asymmetry parameter', 'Captures both fast-rise/slow-decline and slow-rise/fast-decline', 'Standard in WHO and CDC forecasting'],
      limitations: ['4 parameters — requires sufficient data for reliable estimation', 'Identifiability issues when data is sparse', 'Still assumes single wave'],
    },

    {
      id: 'generalized_logistic',
      name: 'Generalized Logistic (GLM)',
      equationDisplay: 'I(t) = K·r / (1+exp(−r(t−t_m)))·[1−(1/(1+exp(−r(t−t_m))))^a]',
      deDisplay: 'dC/dt = r·C·[1−(C/K)^a] (same as Richards)',
      params: ['K','r','tm','a'],
      paramNames: ['K (final size)', 'r (growth rate)', 't_m (inflection)', 'a (shape)'],
      paramDescriptions: [
        'Total epidemic size',
        'Peak growth rate',
        'Time of inflection point',
        'Shape/asymmetry parameter'
      ],
      init: (obs) => {
        const K = obs.reduce((a,b)=>a+b,0)*1.3;
        return [K, 0.3, obs.length/2, 0.8];
      },
      fn: (t, [K, r, tm, a]) => {
        const s = 1/(1+Math.exp(-r*(t-tm)));
        return K * r * s * (1 - Math.pow(s, a)) / a;
      },
      isCumulative: false,
      definition: 'The incidence form of the Richards model. Directly models new cases per time period rather than cumulative cases. Useful when you observe incidence data (new cases per week) rather than cumulative totals.',
      assumptions: ['Single epidemic wave', 'Parametric growth'],
      strengths: ['Directly fits incidence (not cumulative)', 'Flexible asymmetry', 'Widely used in short-term forecasting'],
      limitations: ['Sensitive to noisy data', 'Cannot capture multiple waves'],
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
        'Time of inflection point'
      ],
      init: (obs) => {
        const K = obs.reduce((a,b)=>a+b,0)*1.3;
        return [K, 0.3, obs.length/2];
      },
      fn: (t, [K, r, tm]) => K * Math.exp(-Math.exp(-r*(t-tm))),
      isCumulative: true,
      definition: 'An asymmetric S-shaped growth model where the inflection point always occurs at C = K/e ≈ 0.368K (earlier than the logistic\'s 0.5K). Commonly used in cancer growth, technology adoption, and epidemic modeling. The Gompertz naturally produces a faster initial rise and slower saturation than the logistic.',
      assumptions: ['Single wave', 'Asymmetric growth with fixed inflection at K/e'],
      strengths: ['Naturally asymmetric without extra parameter', 'Good for outbreaks with rapid initial growth', 'Simpler than Richards (3 vs 4 params)'],
      limitations: ['Inflection fixed at K/e — less flexible than Richards', 'Cannot capture symmetric curves well'],
    },

    {
      id: 'subepidemic',
      name: 'Sub-epidemic Wave Model',
      equationDisplay: 'I(t) = Σᵢ fᵢ(t) where each fᵢ follows logistic growth',
      deDisplay: 'dCᵢ/dt = rᵢ·Cᵢ·(1−Cᵢ/Kᵢ), I(t) = Σ dCᵢ/dt',
      params: ['K1','r1','t1','K2','r2','t2'],
      paramNames: ['K₁','r₁','t_m1','K₂','r₂','t_m2'],
      paramDescriptions: [
        'Final size of sub-epidemic 1',
        'Growth rate of sub-epidemic 1',
        'Inflection time of sub-epidemic 1',
        'Final size of sub-epidemic 2',
        'Growth rate of sub-epidemic 2',
        'Inflection time of sub-epidemic 2'
      ],
      init: (obs) => {
        const n = obs.length;
        const K = obs.reduce((a,b)=>a+b,0);
        return [K*0.6, 0.3, n*0.3, K*0.4, 0.2, n*0.7];
      },
      fn: (t, [K1,r1,t1,K2,r2,t2]) => {
        const wave1 = (t2=>(K1*r1/(1+Math.exp(-r1*(t-t1)))*( 1-1/(1+Math.exp(-r1*(t-t1))))))(t);
        const wave2 = (K2*r2/(1+Math.exp(-r2*(t-t2)))*( 1-1/(1+Math.exp(-r2*(t-t2)))));
        return Math.max(0, wave1 + wave2);
      },
      isCumulative: false,
      definition: 'Models a multi-wave epidemic as a sum of overlapping logistic sub-epidemics. Each sub-epidemic represents a distinct transmission wave — driven by a new variant, spatial spread, or behavioral change. Developed by Chowell and colleagues and applied extensively to COVID-19, influenza, and measles multi-wave dynamics.',
      assumptions: ['Epidemic composed of identifiable sub-waves', 'Each sub-wave follows logistic growth', 'Sub-waves may overlap in time'],
      strengths: ['Handles multi-wave dynamics naturally', 'Interpretable — each wave has its own size and timing', 'Outperforms single-wave models on complex outbreaks'],
      limitations: ['Many parameters — identifiability challenges', 'Number of sub-waves must be specified', 'A dedicated tool (SubEpiWave) provides full analysis'],
    }

  ];

  /* ────────────────────────────────────────────
     STATISTICAL MODELS
  ──────────────────────────────────────────── */

  const statistical = [

    {
      id: 'linear_log',
      name: 'Log-linear Regression',
      equationDisplay: 'log(Iₜ) = β₀ + β₁·t + εₜ',
      params: ['beta0','beta1'],
      paramNames: ['β₀ (intercept)', 'β₁ (slope)'],
      paramDescriptions: [
        'Log-scale intercept. exp(β₀) = estimated cases at t=0',
        'Log-scale growth rate. exp(β₁) = multiplicative factor per time unit'
      ],
      definition: 'Fits a straight line to log-transformed case counts. Equivalent to assuming exponential growth on the original scale. Simple, interpretable, and valid for the early epidemic phase. Does not require distributional assumptions beyond normality of log-transformed residuals.',
      assumptions: ['Log-normal errors', 'Exponential growth (linear on log scale)', 'Independence of observations'],
      strengths: ['Extremely simple', 'Growth rate and doubling time directly estimated', 'Good teaching baseline model'],
      limitations: ['Only valid for growth phase', 'Cannot handle zeros (log(0) undefined)', 'Ignores count nature of data'],
    },

    {
      id: 'poisson',
      name: 'Poisson Regression',
      equationDisplay: 'log(E[Iₜ]) = β₀ + β₁·t',
      params: ['beta0','beta1'],
      paramNames: ['β₀ (intercept)', 'β₁ (slope)'],
      paramDescriptions: [
        'Log-scale intercept',
        'Log-scale rate ratio per time unit. exp(β₁) = multiplicative change per period'
      ],
      definition: 'A generalized linear model (GLM) for count data that assumes the outcome follows a Poisson distribution — mean equals variance. Uses a log link function so the linear predictor maps to a positive count. Standard for epidemiological count data when overdispersion is absent.',
      assumptions: ['Count outcome ≥ 0', 'Mean = Variance (equidispersion)', 'Independence of observations', 'Log-linear relationship between predictors and mean'],
      strengths: ['Appropriate for count data', 'Handles zeros naturally', 'Directly estimates rate ratios'],
      limitations: ['Variance = mean assumption often violated in outbreak data', 'Overdispersion leads to underestimated standard errors', 'Inflated Type I error if overdispersion ignored'],
    },

    {
      id: 'negbinom',
      name: 'Negative Binomial Regression',
      equationDisplay: 'log(E[Iₜ]) = β₀ + β₁·t, Var(Iₜ) = μ + μ²/θ',
      params: ['beta0','beta1','theta'],
      paramNames: ['β₀ (intercept)', 'β₁ (slope)', 'θ (dispersion)'],
      paramDescriptions: [
        'Log-scale intercept',
        'Log-scale slope',
        'Dispersion parameter. θ→∞ → Poisson; small θ → high overdispersion'
      ],
      definition: 'Extends Poisson regression by adding a dispersion parameter θ that allows variance to exceed the mean. The variance is μ + μ²/θ. As θ→∞, the model approaches Poisson. Negative binomial is the standard choice for overdispersed count data, which is the norm in real outbreak settings due to clustering, superspreading, and reporting heterogeneity.',
      assumptions: ['Count outcome ≥ 0', 'Overdispersion allowed (Var > Mean)', 'Log-linear mean structure', 'Independence of observations'],
      strengths: ['Robust to overdispersion', 'Wider prediction intervals (more honest uncertainty)', 'Standard in epidemiological surveillance modeling'],
      limitations: ['More complex than Poisson', 'Requires estimation of extra parameter θ', 'Can be harder to converge with sparse data'],
    }

  ];

  /* ── Default datasets ── */
  const defaultDatasets = {
    ebola2014: {
      name: 'Ebola — West Africa 2014',
      place: 'Guinea, Sierra Leone, Liberia',
      unit: 'weekly',
      disease: 'Ebola',
      data: [1,3,4,6,8,12,18,27,42,63,90,128,176,238,317,420,550,710,900,1120,1380,1650,1920,2180,2430,2660,2860,3020,3140,3210,3250,3270,3280,3285]
    },
    measles2019: {
      name: 'Measles — DRC 2019',
      place: 'Democratic Republic of Congo',
      unit: 'weekly',
      disease: 'Measles',
      data: [120,145,168,192,230,285,340,410,495,580,670,750,820,875,910,935,948,955,959,961,963,964,965,965]
    },
    covid2020: {
      name: 'COVID-19 — United States 2020',
      place: 'United States',
      unit: 'weekly',
      disease: 'COVID-19',
      data: [1,3,8,22,68,200,560,1400,3200,6800,12000,19000,28000,38000,48000,55000,58000,54000,47000,40000,34000,30000,28000,27000,28000,32000,38000,46000,55000,64000,72000,78000,80000,76000,68000,58000,48000,40000,35000,32000]
    },
    influenza2009: {
      name: 'Influenza A H1N1 — USA 2009',
      place: 'United States',
      unit: 'weekly',
      disease: 'Influenza A (H1N1)',
      data: [12,28,62,138,290,520,820,1100,1350,1480,1520,1480,1380,1220,1040,860,700,560,440,340,260,200,155,120,95,75]
    }
  };

  return { phenomenological, statistical, defaultDatasets };
})();

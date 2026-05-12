/* EpiModelConcepts — optimizer.js: Nelder-Mead + curve fitting */

const Optimizer = (() => {

  /* ── Nelder-Mead minimizer ── */
  function nelderMead(fn, x0, opts={}) {
    const {
      maxIter = 5000,
      tol = 1e-10,
      alpha = 1.0,
      gamma = 2.0,
      rho = 0.5,
      sigma = 0.5
    } = opts;

    const n = x0.length;
    // Build initial simplex
    let simplex = [x0.slice()];
    for (let i = 0; i < n; i++) {
      const pt = x0.slice();
      pt[i] = pt[i] !== 0 ? pt[i] * 1.05 : 0.00025;
      simplex.push(pt);
    }

    let fvals = simplex.map(fn);
    let iter = 0;

    while (iter < maxIter) {
      // Sort
      const idx = fvals.map((_,i)=>i).sort((a,b)=>fvals[a]-fvals[b]);
      simplex = idx.map(i=>simplex[i]);
      fvals = idx.map(i=>fvals[i]);

      // Convergence check
      if (fvals[fvals.length-1] - fvals[0] < tol) break;

      // Centroid (exclude worst)
      const centroid = Array(n).fill(0);
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++)
          centroid[j] += simplex[i][j]/n;

      // Reflection
      const xr = centroid.map((c,j) => c + alpha*(c - simplex[n][j]));
      const fr = fn(xr);

      if (fr < fvals[0]) {
        // Expansion
        const xe = centroid.map((c,j) => c + gamma*(xr[j]-c));
        const fe = fn(xe);
        if (fe < fr) { simplex[n]=xe; fvals[n]=fe; }
        else          { simplex[n]=xr; fvals[n]=fr; }
      } else if (fr < fvals[n-1]) {
        simplex[n]=xr; fvals[n]=fr;
      } else {
        // Contraction
        const xc = centroid.map((c,j) => c + rho*(simplex[n][j]-c));
        const fc = fn(xc);
        if (fc < fvals[n]) { simplex[n]=xc; fvals[n]=fc; }
        else {
          // Shrink
          for (let i = 1; i <= n; i++) {
            simplex[i] = simplex[0].map((x,j) => x + sigma*(simplex[i][j]-x));
            fvals[i] = fn(simplex[i]);
          }
        }
      }
      iter++;
    }

    return { params: simplex[0], value: fvals[0], iterations: iter };
  }

  /* ── Sum of squared errors objective ── */
  function sseLoss(modelFn, t, obs) {
    return params => {
      try {
        const pred = t.map(ti => modelFn(ti, params));
        if (pred.some(v => !isFinite(v) || v < 0)) return 1e15;
        return obs.reduce((s,o,i) => s+(o-pred[i])**2, 0);
      } catch(e) { return 1e15; }
    };
  }

  /* ── Fit a model to data ── */
  function fitModel(modelFn, t, obs, init, opts={}) {
    const loss = sseLoss(modelFn, t, obs);
    const result = nelderMead(loss, init, opts);
    const pred = t.map(ti => modelFn(ti, result.params));
    return { params: result.params, predicted: pred, sse: result.value, iterations: result.iterations };
  }

  /* ── Bootstrap confidence intervals on parameters ── */
  function bootstrapCI(modelFn, t, obs, init, nBoot=200, alpha=0.95) {
    const bootParams = [];
    const n = obs.length;
    const loss = sseLoss(modelFn, t, obs);
    const base = nelderMead(loss, init);

    for (let b = 0; b < nBoot; b++) {
      // Resample residuals
      const basePred = t.map(ti => modelFn(ti, base.params));
      const residuals = obs.map((o,i) => o - basePred[i]);
      const bootObs = basePred.map((p,i) => {
        const r = residuals[Math.floor(Math.random()*n)];
        return Math.max(0, p + r);
      });
      const bootLoss = sseLoss(modelFn, t, bootObs);
      const res = nelderMead(bootLoss, base.params.slice(), {maxIter:1000});
      bootParams.push(res.params);
    }

    const lo = (1-alpha)/2, hi = 1-lo;
    const ci = base.params.map((_, j) => {
      const vals = bootParams.map(p=>p[j]).sort((a,b)=>a-b);
      return [vals[Math.floor(lo*nBoot)], vals[Math.floor(hi*nBoot)]];
    });

    // Prediction intervals from bootstrap
    const predIntervals = t.map((ti, i) => {
      const preds = bootParams.map(p => modelFn(ti, p)).sort((a,b)=>a-b);
      return {
        lower: Math.max(0, preds[Math.floor(lo*nBoot)]),
        upper: preds[Math.floor(hi*nBoot)]
      };
    });

    return { paramCI: ci, predIntervals };
  }

  return { nelderMead, fitModel, bootstrapCI, sseLoss };
})();

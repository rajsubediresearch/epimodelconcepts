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

  /* ── Fit a model: accepts either a pre-built loss fn or modelFn+t+obs ── */
  function fitModel(lossFnOrModelFn, initOrT, optsOrObs, initMaybe, optsMaybe) {
    let lossFn, init, opts;
    if (typeof initOrT[0] === 'number' && !Array.isArray(initOrT[0])) {
      lossFn = lossFnOrModelFn;
      init = initOrT;
      opts = optsOrObs || {};
    } else {
      lossFn = sseLoss(lossFnOrModelFn, initOrT, optsOrObs);
      init = initMaybe;
      opts = optsMaybe || {};
    }

    // Multi-start: run Nelder-Mead from the supplied init plus N randomly
    // perturbed starts. Take the best result — approximates MATLAB MultiStart.
    const nRestarts = opts.nRestarts != null ? opts.nRestarts : 8;
    const nmOpts = { maxIter: opts.maxIter || 5000, tol: opts.tol || 1e-10 };

    function runOnce(startPt) {
      try { return nelderMead(lossFn, startPt, nmOpts); }
      catch(e) { return { params: startPt, value: 1e15, iterations: 0 }; }
    }

    let best = runOnce(init.slice());

    for (let k = 0; k < nRestarts; k++) {
      // Perturb each parameter by ±50% randomly around the best so far
      const perturbed = best.params.map(v => {
        const scale = 0.5 + Math.random(); // uniform in [0.5, 1.5]
        return v * scale;
      });
      const res = runOnce(perturbed);
      if (res.value < best.value) best = res;
    }

    return { params: best.params, predicted: null, sse: best.value, iterations: best.iterations };
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
    const isCumulative = obs.every((v,i) => i===0 || v >= obs[i-1] * 0.98);
    let runningLo = 0;
    const predIntervals = t.map((ti, i) => {
      const preds = bootParams.map(p => modelFn(ti, p)).sort((a,b)=>a-b);
      let lower = Math.max(0, preds[Math.floor(lo*nBoot)]);
      let upper = Math.max(lower, preds[Math.floor(hi*nBoot)]);
      if (isCumulative) {
        lower = Math.max(lower, runningLo);
        upper = Math.max(upper, lower);
        runningLo = lower;
      }
      return { lower, upper };
    });

    return { paramCI: ci, predIntervals };
  }

  /* ── Bootstrap (called from phenomenological.html) ── */
  // Returns a Promise — resolves with bootResult or null.
  // Processes iterations in chunks of CHUNK_SIZE, yielding to the browser
  // between chunks so the UI stays responsive and "page not responding" never fires.
  function bootstrap(modelFn, lossFnBuilder, t, obs, baseParams, nBoot=300, lossType='sse', theta=2, progressCb=null, constraint=null, isCumulative=false) {
    const CHUNK_SIZE = 10; // iterations per chunk — small enough to stay <100ms per chunk
    return new Promise((resolve) => {
      try {
        const basePred  = t.map(ti => modelFn(ti, baseParams));
        const residuals = obs.map((o,i) => o - basePred[i]);
        const lastObs   = obs[obs.length-1];
        const bootParamSets = [];
        let b = 0;

        function runChunk() {
          const end = Math.min(b + CHUNK_SIZE, nBoot);
          while (b < end) {
            let bootObs = basePred.map(p => {
              const r = residuals[Math.floor(Math.random()*obs.length)];
              return Math.max(0, p + r);
            });
            if (isCumulative) {
              for (let i = 1; i < bootObs.length; i++) {
                if (bootObs[i] < bootObs[i-1]) bootObs[i] = bootObs[i-1];
              }
            }
            const lf = constraint
              ? (params => constraint(params) ? lossFnBuilder(modelFn, t, bootObs, theta)(params) : 1e15)
              : lossFnBuilder(modelFn, t, bootObs, theta);
            try {
              const res = nelderMead(lf, baseParams.slice(), {maxIter:2000, tol:1e-8});
              bootParamSets.push(res.params);
            } catch(e) {}
            b++;
          }
          if (progressCb) progressCb(b / nBoot);

          if (b < nBoot) {
            // Yield to browser, then continue
            setTimeout(runChunk, 0);
          } else {
            // All done — compute CIs and resolve
            if (bootParamSets.length < 10) { resolve(null); return; }

            const paramCI = baseParams.map((_, j) => {
              const vals = bootParamSets.map(p=>p[j]).filter(isFinite).sort((a,b)=>a-b);
              return {
                lo: vals[Math.floor(0.025*vals.length)]||0,
                hi: vals[Math.floor(0.975*vals.length)]||0,
                samples: vals
              };
            });

            let runningLo = 0;
            const predCI = t.map((ti) => {
              const vals = bootParamSets.map(bp=>modelFn(ti,bp)).filter(isFinite).sort((a,b)=>a-b);
              let lo = Math.max(0, vals[Math.floor(0.025*vals.length)]||0);
              let hi = Math.max(lo, vals[Math.floor(0.975*vals.length)]||0);
              if (isCumulative) {
                lo = Math.max(lo, runningLo);
                hi = Math.max(hi, lo);
                runningLo = lo;
              }
              return { lo, hi };
            });

            resolve({ paramCI, predCI, nBoot: bootParamSets.length, bootParams: bootParamSets, isCumulative, lastObs });
          }
        }

        setTimeout(runChunk, 0);
      } catch(e) { resolve(null); }
    });
  }
  function forecast(modelFn, params, t, horizon, bootResult=null) {
    const lastT = t[t.length-1];
    const foreT = Array.from({length:horizon}, (_,i) => lastT+1+i);
    const pred = foreT.map(ti => Math.max(0, modelFn(ti, params)));
    let lo=null, hi=null;
    if (bootResult && bootResult.bootParams) {
      // For cumulative models use lastObs as floor (passed through from bootstrap)
      const cumulFloor = (bootResult.isCumulative && bootResult.lastObs)
        ? bootResult.lastObs : 0;
      lo = foreT.map(ti => {
        const vals = bootResult.bootParams.map(bp=>modelFn(ti,bp)).filter(isFinite).sort((a,b)=>a-b);
        return Math.max(cumulFloor, vals[Math.floor(0.025*vals.length)]||0);
      });
      hi = foreT.map((ti,i) => {
        const vals = bootResult.bootParams.map(bp=>modelFn(ti,bp)).filter(isFinite).sort((a,b)=>a-b);
        return Math.max(lo[i], vals[Math.floor(0.975*vals.length)]||0);
      });
    }
    return { pred, lo, hi };
  }

  return { nelderMead, fitModel, bootstrapCI, sseLoss, bootstrap, forecast };
})();

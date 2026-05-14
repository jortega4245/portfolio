/* ─────────────────────────────────────────────────────────────
   Joseph Ortega · Statistical Atlas
   Live math visualizations + scroll affordances
   ───────────────────────────────────────────────────────────── */

(() => {
  // ── progress bar ──
  const progress = document.querySelector(".progress");
  const onScroll = () => {
    if (!progress) return;
    const top = window.scrollY || document.documentElement.scrollTop;
    const h = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    progress.style.width = `${h > 0 ? (top / h) * 100 : 0}%`;
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ── year ──
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  // ── reveal on scroll ──
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.08, rootMargin: "0px 0px -8% 0px" });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  // ── canvas helper ──
  function attach(canvas, draw, opts = {}) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let dpr = window.devicePixelRatio || 1;
    let raf, w, h, state = opts.state || {};

    function resize() {
      const r = canvas.getBoundingClientRect();
      dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(r.width * dpr));
      canvas.height = Math.max(1, Math.floor(r.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      w = r.width; h = r.height;
    }
    function loop(t) {
      draw(ctx, w, h, t, state);
      raf = requestAnimationFrame(loop);
    }
    resize();
    raf = requestAnimationFrame(loop);
    window.addEventListener("resize", resize);
    return () => cancelAnimationFrame(raf);
  }

  // ── shared: grid background ──
  function bg(ctx, w, h, opts = {}) {
    const gridColor = opts.gridColor || "rgba(243, 236, 217, 0.04)";
    const step = opts.step || 24;
    ctx.fillStyle = opts.fill || "rgba(8, 11, 15, 0.0)";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= w; x += step) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); }
    for (let y = 0; y <= h; y += step) { ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); }
    ctx.stroke();
  }

  function label(ctx, text, x, y, opts = {}) {
    ctx.font = `${opts.weight || 500} ${opts.size || 11}px JetBrains Mono, IBM Plex Mono, monospace`;
    ctx.fillStyle = opts.color || "rgba(232, 227, 211, 0.7)";
    ctx.textBaseline = opts.baseline || "alphabetic";
    ctx.textAlign = opts.align || "left";
    ctx.fillText(text, x, y);
  }

  // ───────────────────────────────────────────────
  // 1. HERO · gradient descent on a loss surface
  // ───────────────────────────────────────────────
  function drawGradientDescent(ctx, w, h, t, s) {
    ctx.clearRect(0, 0, w, h);
    bg(ctx, w, h, { step: 28 });

    const cx = w * 0.62, cy = h * 0.52;
    const a = w * 0.36, b = h * 0.36;
    const rot = -0.42;

    // contour ellipses
    for (let i = 1; i <= 9; i++) {
      const k = i / 9;
      ctx.beginPath();
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.scale(1, 0.62);
      ctx.arc(0, 0, a * k * 1.05, 0, Math.PI * 2);
      ctx.restore();
      ctx.strokeStyle = `rgba(244, 185, 66, ${0.06 + (1 - k) * 0.18})`;
      ctx.lineWidth = 1.1;
      ctx.stroke();
    }

    // descent path
    if (!s.path) s.path = [];
    if (s.path.length === 0) {
      let px = w * 0.12, py = h * 0.16;
      for (let i = 0; i < 28; i++) {
        s.path.push([px, py]);
        const dx = (cx - px) * 0.16 + Math.sin(i * 0.7) * 5;
        const dy = (cy - py) * 0.13 + Math.cos(i * 0.9) * 3;
        px += dx; py += dy;
      }
      s.path.push([cx, cy]);
    }

    const tick = Math.floor((t / 80) % (s.path.length + 24));
    const visible = Math.min(s.path.length, tick);

    // line
    ctx.beginPath();
    for (let i = 0; i <= visible; i++) {
      const p = s.path[i] || s.path[s.path.length - 1];
      if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
    }
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#5eead4");
    g.addColorStop(1, "#f4b942");
    ctx.strokeStyle = g;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // points
    for (let i = 0; i <= visible; i++) {
      const p = s.path[i];
      if (!p) continue;
      const isLast = i === visible && i < s.path.length - 1;
      const isFinal = i === s.path.length - 1;
      ctx.beginPath();
      ctx.arc(p[0], p[1], isFinal ? 6 : isLast ? 4.5 : 2.5, 0, Math.PI * 2);
      ctx.fillStyle = isFinal ? "#f4b942" : isLast ? "#5eead4" : "rgba(232, 227, 211, 0.7)";
      ctx.fill();
      if (isFinal) {
        ctx.beginPath();
        ctx.arc(p[0], p[1], 12, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(244, 185, 66, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // labels
    label(ctx, "θ ← θ − η∇L(θ)", 16, 22, { color: "rgba(244, 185, 66, 0.85)", size: 12 });
    label(ctx, "loss surface · gradient descent", 16, 40, { color: "rgba(200, 192, 170, 0.6)", size: 10 });
    label(ctx, `iter ${visible.toString().padStart(2, "0")} / ${s.path.length - 1}`, w - 16, 22,
      { color: "rgba(94, 234, 212, 0.85)", size: 11, align: "right" });
  }

  // ───────────────────────────────────────────────
  // 2. DFT / Periodogram
  // ───────────────────────────────────────────────
  function drawDFT(ctx, w, h, t, s) {
    ctx.clearRect(0, 0, w, h);
    bg(ctx, w, h, { step: 22 });

    const padX = 24, padY = 18;
    const topH = h * 0.46 - padY;
    const botY = h * 0.54;
    const botH = h - botY - padY;

    // top: time-domain signal (sum of sines, breathing phase)
    const phase = t * 0.0015;
    const N = 220;
    const signal = [];
    for (let i = 0; i < N; i++) {
      const x = i / N * Math.PI * 8;
      const v =
        0.6 * Math.sin(x * 1.0 + phase * 1.3) +
        0.4 * Math.sin(x * 2.3 + phase * 0.8) +
        0.25 * Math.sin(x * 4.7 + phase * 2.1);
      signal.push(v);
    }

    // baseline
    ctx.strokeStyle = "rgba(243, 236, 217, 0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padX, padY + topH / 2);
    ctx.lineTo(w - padX, padY + topH / 2);
    ctx.stroke();

    // signal curve
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const px = padX + (i / (N - 1)) * (w - padX * 2);
      const py = padY + topH / 2 - signal[i] * topH * 0.36;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = "#5eead4";
    ctx.lineWidth = 2;
    ctx.stroke();

    // bottom: spectrum bars (toy DFT magnitude)
    const bars = 32;
    const bw = (w - padX * 2) / bars * 0.7;
    const bgap = (w - padX * 2) / bars * 0.3;
    for (let k = 0; k < bars; k++) {
      // toy spectrum: three peaks
      const mag =
        Math.exp(-Math.pow((k - 4) / 1.3, 2)) * 0.85 +
        Math.exp(-Math.pow((k - 9) / 1.6, 2)) * 0.6 +
        Math.exp(-Math.pow((k - 18) / 2.2, 2)) * 0.45 +
        0.08 + 0.06 * Math.abs(Math.sin(k * 1.3 + t * 0.002));
      const bh = mag * botH;
      const x = padX + k * (bw + bgap);
      const y = botY + botH - bh;
      const g = ctx.createLinearGradient(0, y, 0, botY + botH);
      g.addColorStop(0, "#f4b942");
      g.addColorStop(1, "rgba(244, 185, 66, 0.15)");
      ctx.fillStyle = g;
      ctx.fillRect(x, y, bw, bh);
    }
    // axis
    ctx.strokeStyle = "rgba(243, 236, 217, 0.2)";
    ctx.beginPath(); ctx.moveTo(padX, botY + botH); ctx.lineTo(w - padX, botY + botH); ctx.stroke();

    // labels
    label(ctx, "x(t) · time domain", padX, padY + 12, { color: "rgba(94, 234, 212, 0.85)", size: 10 });
    label(ctx, "|X(ω)|² · periodogram", padX, botY + 12, { color: "rgba(244, 185, 66, 0.85)", size: 10 });
  }

  // ───────────────────────────────────────────────
  // 3. Ornstein-Uhlenbeck · mean-reverting process
  // ───────────────────────────────────────────────
  function drawOU(ctx, w, h, t, s) {
    ctx.clearRect(0, 0, w, h);
    bg(ctx, w, h, { step: 22 });

    const padX = 22, padY = 18;
    const mid = h / 2;
    const N = 280;
    const theta = 0.04, mu = 0, sigma = 0.18;

    if (!s.path) {
      s.path = new Array(N).fill(0);
      s.next = 0;
      s.last = 0;
    }
    if (t - (s.lastT || 0) > 35) {
      const x = s.path[(s.next - 1 + N) % N] || 0;
      const dx = theta * (mu - x) + sigma * (Math.random() * 2 - 1);
      s.path[s.next] = x + dx;
      s.next = (s.next + 1) % N;
      s.lastT = t;
    }

    // mean line
    ctx.strokeStyle = "rgba(244, 185, 66, 0.5)";
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padX, mid); ctx.lineTo(w - padX, mid); ctx.stroke();
    ctx.setLineDash([]);

    // upper / lower bands
    const band = h * 0.18;
    ctx.fillStyle = "rgba(94, 234, 212, 0.04)";
    ctx.fillRect(padX, mid - band, w - padX * 2, band * 2);
    ctx.strokeStyle = "rgba(94, 234, 212, 0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padX, mid - band); ctx.lineTo(w - padX, mid - band);
    ctx.moveTo(padX, mid + band); ctx.lineTo(w - padX, mid + band);
    ctx.stroke();

    // path
    ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const idx = (s.next + i) % N;
      const v = s.path[idx];
      const px = padX + (i / (N - 1)) * (w - padX * 2);
      const py = mid - v * (h * 0.32);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = "#5eead4";
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // recent dot
    const lastIdx = (s.next - 1 + N) % N;
    const lastV = s.path[lastIdx];
    const lpx = padX + ((N - 1) / (N - 1)) * (w - padX * 2);
    const lpy = mid - lastV * (h * 0.32);
    ctx.beginPath();
    ctx.arc(lpx, lpy, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = "#f4b942";
    ctx.fill();

    label(ctx, "dXₜ = θ(μ − Xₜ)dt + σ dWₜ", padX, padY + 8, { color: "rgba(244, 185, 66, 0.85)", size: 11 });
    label(ctx, "mean reversion · spread", padX, padY + 24, { color: "rgba(200, 192, 170, 0.55)", size: 10 });
    label(ctx, `μ`, w - padX - 8, mid - 4, { color: "rgba(244, 185, 66, 0.7)", size: 10, align: "right" });
  }

  // ───────────────────────────────────────────────
  // 4. Convolution · kernel sliding over a grid (CNN)
  // ───────────────────────────────────────────────
  function drawConv(ctx, w, h, t, s) {
    ctx.clearRect(0, 0, w, h);
    bg(ctx, w, h, { step: 22 });

    const cols = 12, rows = 7;
    const padX = 24, padY = 28;
    const cellW = (w - padX * 2) / cols;
    const cellH = (h - padY * 2) / rows;
    const cell = Math.min(cellW, cellH);
    const gridW = cell * cols;
    const gridH = cell * rows;
    const ox = (w - gridW) / 2;
    const oy = (h - gridH) / 2 + 6;

    // image values (smooth function)
    function val(i, j) {
      return 0.5 + 0.5 * Math.sin(i * 0.6 + j * 0.45 + Math.sin(t * 0.001) * 1.4);
    }

    // draw image
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const v = val(i, j);
        ctx.fillStyle = `rgba(94, 234, 212, ${0.08 + v * 0.45})`;
        ctx.fillRect(ox + i * cell, oy + j * cell, cell - 2, cell - 2);
      }
    }
    ctx.strokeStyle = "rgba(243, 236, 217, 0.07)";
    ctx.strokeRect(ox - 0.5, oy - 0.5, gridW + 1, gridH + 1);

    // kernel position (animated)
    const cycle = (t * 0.0006) % 1;
    const totalCells = (cols - 2) * (rows - 2);
    const k = Math.floor(cycle * totalCells);
    const ki = k % (cols - 2);
    const kj = Math.floor(k / (cols - 2));

    // kernel highlight (3x3)
    ctx.strokeStyle = "#f4b942";
    ctx.lineWidth = 2;
    ctx.strokeRect(ox + ki * cell - 1, oy + kj * cell - 1, cell * 3 + 2, cell * 3 + 2);
    ctx.fillStyle = "rgba(244, 185, 66, 0.10)";
    ctx.fillRect(ox + ki * cell, oy + kj * cell, cell * 3, cell * 3);

    // output map (toy: just smaller squares)
    const outX = ox + gridW + 14;
    const outAvail = w - outX - 12;
    if (outAvail > 36) {
      const outCell = Math.min(outAvail / (cols - 2), (gridH - 6) / (rows - 2));
      for (let j = 0; j < rows - 2; j++) {
        for (let i = 0; i < cols - 2; i++) {
          const isActive = i === ki && j === kj;
          ctx.fillStyle = isActive
            ? "#f4b942"
            : `rgba(244, 185, 66, ${0.06 + 0.18 * Math.abs(Math.sin(i + j + t * 0.001))})`;
          ctx.fillRect(outX + i * outCell, oy + j * outCell, outCell - 1, outCell - 1);
        }
      }
    }

    label(ctx, "(f ∗ g)[i,j] = ΣΣ f[m,n] g[i−m, j−n]", padX, 18,
      { color: "rgba(244, 185, 66, 0.85)", size: 11 });
    label(ctx, "convolution · 3×3 kernel", padX, h - 8,
      { color: "rgba(200, 192, 170, 0.55)", size: 10 });
  }

  // ───────────────────────────────────────────────
  // 5. MLE · log-likelihood with iterative ascent
  // ───────────────────────────────────────────────
  function drawMLE(ctx, w, h, t, s) {
    ctx.clearRect(0, 0, w, h);
    bg(ctx, w, h, { step: 22 });

    const padX = 24, padY = 20;
    const plotW = w - padX * 2;
    const plotH = h - padY * 2 - 10;
    const oy = padY + plotH;

    // log-likelihood curve (a unimodal bump)
    function L(x) {
      // Gaussian-ish times slight noise
      return Math.exp(-Math.pow((x - 0.58) * 3.6, 2)) * 0.9 + Math.exp(-Math.pow((x - 0.2) * 5, 2)) * 0.2;
    }

    // curve
    ctx.beginPath();
    const N = 200;
    for (let i = 0; i <= N; i++) {
      const x = i / N;
      const y = L(x);
      const px = padX + x * plotW;
      const py = oy - y * plotH;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.lineTo(padX + plotW, oy);
    ctx.lineTo(padX, oy);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, padY, 0, oy);
    grad.addColorStop(0, "rgba(244, 185, 66, 0.32)");
    grad.addColorStop(1, "rgba(244, 185, 66, 0.02)");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "#f4b942";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const x = i / N;
      const y = L(x);
      const px = padX + x * plotW;
      const py = oy - y * plotH;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // baseline
    ctx.strokeStyle = "rgba(243, 236, 217, 0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padX, oy); ctx.lineTo(padX + plotW, oy); ctx.stroke();

    // iterative ascent (Newton-Raphson-ish on θ)
    if (s.iter === undefined) { s.iter = 0; s.theta = 0.05; s.lastT = 0; }
    if (t - s.lastT > 320) {
      const eps = 0.005;
      const dL = (L(s.theta + eps) - L(s.theta - eps)) / (2 * eps);
      s.theta = Math.min(0.98, Math.max(0.02, s.theta + 0.18 * dL));
      s.iter++;
      if (s.iter > 26) { s.iter = 0; s.theta = 0.05; }
      s.lastT = t;
    }

    const px = padX + s.theta * plotW;
    const py = oy - L(s.theta) * plotH;
    ctx.strokeStyle = "rgba(94, 234, 212, 0.55)";
    ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(px, oy); ctx.lineTo(px, py); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#5eead4";
    ctx.fill();

    // MLE marker (true max)
    const mlePx = padX + 0.58 * plotW;
    ctx.strokeStyle = "rgba(244, 185, 66, 0.5)";
    ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(mlePx, oy); ctx.lineTo(mlePx, oy - L(0.58) * plotH); ctx.stroke();
    ctx.setLineDash([]);

    label(ctx, "θ̂ = argmax ℓ(θ; x)", padX, 16, { color: "rgba(244, 185, 66, 0.85)", size: 11 });
    label(ctx, `iter ${String(s.iter).padStart(2, "0")} · θ ≈ ${s.theta.toFixed(2)}`,
      w - padX, 16, { color: "rgba(94, 234, 212, 0.8)", size: 10, align: "right" });
  }

  // ───────────────────────────────────────────────
  // 6. Bootstrap · resampling distribution
  // ───────────────────────────────────────────────
  function drawBootstrap(ctx, w, h, t, s) {
    ctx.clearRect(0, 0, w, h);
    bg(ctx, w, h, { step: 22 });

    const padX = 24, padY = 20;
    const plotW = w - padX * 2;
    const plotH = h - padY * 2 - 6;
    const oy = padY + plotH;

    // build a growing histogram of bootstrap means
    if (!s.hist) { s.hist = new Array(28).fill(0); s.count = 0; s.lastT = 0; }
    if (t - s.lastT > 28 && s.count < 240) {
      // draw a "sample mean" from N(0.5, 0.09)
      let acc = 0;
      for (let i = 0; i < 8; i++) {
        // crude normal via CLT
        let z = 0; for (let k = 0; k < 6; k++) z += Math.random();
        z = (z - 3) / Math.sqrt(0.5);
        acc += 0.5 + 0.1 * z;
      }
      const m = acc / 8;
      const bin = Math.min(s.hist.length - 1, Math.max(0, Math.floor((m - 0.1) / 0.8 * s.hist.length)));
      s.hist[bin]++;
      s.count++;
      s.lastT = t;
    }
    if (s.count >= 240 && t - s.lastT > 1400) {
      s.hist = new Array(28).fill(0); s.count = 0;
    }

    const maxH = Math.max(1, ...s.hist);
    const bw = plotW / s.hist.length;
    for (let i = 0; i < s.hist.length; i++) {
      const v = s.hist[i] / maxH;
      const bh = v * plotH * 0.85;
      const x = padX + i * bw;
      const y = oy - bh;
      ctx.fillStyle = `rgba(94, 234, 212, ${0.18 + v * 0.45})`;
      ctx.fillRect(x + 1, y, bw - 2, bh);
    }

    // overlay normal density
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const x = i / 120;
      const z = (x - 0.5) / 0.08;
      const d = Math.exp(-0.5 * z * z);
      const px = padX + x * plotW;
      const py = oy - d * plotH * 0.78;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = "#f4b942";
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // axis
    ctx.strokeStyle = "rgba(243, 236, 217, 0.2)";
    ctx.beginPath(); ctx.moveTo(padX, oy); ctx.lineTo(padX + plotW, oy); ctx.stroke();

    label(ctx, "T*ᵦ = T(X*ᵦ) · resample b = 1..B", padX, 16,
      { color: "rgba(94, 234, 212, 0.85)", size: 11 });
    label(ctx, `B = ${String(s.count).padStart(3, "0")} / 240`, w - padX, 16,
      { color: "rgba(244, 185, 66, 0.85)", size: 10, align: "right" });
  }

  // ───────────────────────────────────────────────
  // 7. Project-page: distribution (used by pairs / migration)
  // ───────────────────────────────────────────────
  function drawDistribution(ctx, w, h, t) {
    ctx.clearRect(0, 0, w, h);
    bg(ctx, w, h, { step: 24 });
    const padX = 28, padY = 20;
    const baseY = h - padY - 20;
    const plotW = w - padX * 2;
    const plotH = h - padY * 2 - 24;
    const means = [-0.95, 1.05];
    const sigmas = [0.78, 0.62];
    const colors = ["#5eead4", "#f4b942"];

    function n(x, mu, sig) {
      return Math.exp(-0.5 * Math.pow((x - mu) / sig, 2)) / (sig * Math.sqrt(2 * Math.PI));
    }
    for (let k = 0; k < 2; k++) {
      ctx.beginPath();
      for (let i = 0; i <= 240; i++) {
        const x = -3.2 + i * 6.4 / 240;
        const y = n(x, means[k] + Math.sin(t * 0.001 + k) * 0.06, sigmas[k]);
        const px = padX + ((x + 3.2) / 6.4) * plotW;
        const py = baseY - y * plotH * 1.6;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.lineTo(padX + plotW, baseY);
      ctx.lineTo(padX, baseY);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, padY, 0, baseY);
      g.addColorStop(0, colors[k] + "55");
      g.addColorStop(1, "rgba(8,11,15,0)");
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = colors[k];
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 240; i++) {
        const x = -3.2 + i * 6.4 / 240;
        const y = n(x, means[k] + Math.sin(t * 0.001 + k) * 0.06, sigmas[k]);
        const px = padX + ((x + 3.2) / 6.4) * plotW;
        const py = baseY - y * plotH * 1.6;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(243, 236, 217, 0.2)";
    ctx.beginPath(); ctx.moveTo(padX, baseY); ctx.lineTo(padX + plotW, baseY); ctx.stroke();
    label(ctx, "f₀(x) · null", padX, padY + 8, { color: "rgba(94, 234, 212, 0.85)" });
    label(ctx, "f₁(x) · alternative", w - padX, padY + 8, { color: "rgba(244, 185, 66, 0.85)", align: "right" });
  }

  // ───────────────────────────────────────────────
  // 8. Project-page: periodogram
  // ───────────────────────────────────────────────
  function drawPeriodogram(ctx, w, h, t) {
    drawDFT(ctx, w, h, t, {});
  }

  // ───────────────────────────────────────────────
  // 9. Project-page: experimental design grid
  // ───────────────────────────────────────────────
  function drawExperiment(ctx, w, h, t) {
    ctx.clearRect(0, 0, w, h);
    bg(ctx, w, h, { step: 24 });
    const rows = 6, cols = 9;
    const padX = 28, padY = 60;
    const gap = 6;
    const cell = Math.min((w - padX * 2 - gap * (cols - 1)) / cols, (h - padY - 40 - gap * (rows - 1)) / rows);
    const gridW = cols * cell + (cols - 1) * gap;
    const ox = (w - gridW) / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const assigned = ((r * 7 + c * 3) + Math.floor(t / 1200)) % 5 < 2;
        const block = r % 2 === 0;
        ctx.fillStyle = block
          ? (assigned ? "rgba(244, 185, 66, 0.55)" : "rgba(244, 185, 66, 0.14)")
          : (assigned ? "rgba(94, 234, 212, 0.52)" : "rgba(94, 234, 212, 0.12)");
        ctx.strokeStyle = "rgba(243, 236, 217, 0.10)";
        ctx.lineWidth = 1;
        const x = ox + c * (cell + gap);
        const y = padY + r * (cell + gap);
        ctx.fillRect(x, y, cell, cell);
        ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1);

        if (assigned) {
          ctx.fillStyle = "rgba(10, 13, 18, 0.55)";
          ctx.font = "600 10px JetBrains Mono, monospace";
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText("T", x + cell / 2, y + cell / 2);
        }
      }
    }
    label(ctx, "blocked randomization · Yᵢ(1) − Yᵢ(0)", padX, 26,
      { color: "rgba(244, 185, 66, 0.85)", size: 11 });
    label(ctx, "treatment = T", padX, 44, { color: "rgba(200, 192, 170, 0.55)", size: 10 });
  }

  // ───────────────────────────────────────────────
  // 10. HERO · OLS geometry in 3D (rotatable)
  // Y = Xβ̂ + e, with e perpendicular to col(X)
  // ───────────────────────────────────────────────
  function drawOLS3D(ctx, w, h, t, s) {
    if (s.yaw === undefined) {
      s.yaw = -0.55;
      s.pitch = 0.62;
      s.autorotate = true;
    }
    ctx.clearRect(0, 0, w, h);
    bg(ctx, w, h, { step: 28, gridColor: "rgba(243, 236, 217, 0.035)" });

    if (s.autorotate && !s.dragging) s.yaw += 0.0028;

    const cx = w / 2;
    const cy = h * 0.58;
    const scale = Math.min(w, h) * 0.22;

    function P(p) {
      const x = p[0], y = p[1], z = p[2];
      const cy_ = Math.cos(s.yaw), sy_ = Math.sin(s.yaw);
      const cp = Math.cos(s.pitch), sp = Math.sin(s.pitch);
      const x2 = x * cy_ - y * sy_;
      const y2 = x * sy_ + y * cy_;
      const y3 = y2 * cp - z * sp;
      const z3 = y2 * sp + z * cp;
      return [cx + x2 * scale, cy - z3 * scale, y3];
    }

    // plane (col(X)) corners
    const corners = [[-1.3, -1.3, 0], [1.5, -1.3, 0], [1.5, 1.5, 0], [-1.3, 1.5, 0]];
    const cP = corners.map(P);

    ctx.beginPath();
    ctx.moveTo(cP[0][0], cP[0][1]);
    for (let i = 1; i < 4; i++) ctx.lineTo(cP[i][0], cP[i][1]);
    ctx.closePath();
    ctx.fillStyle = "rgba(244, 185, 66, 0.055)";
    ctx.fill();
    ctx.strokeStyle = "rgba(244, 185, 66, 0.30)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // grid on plane
    ctx.strokeStyle = "rgba(244, 185, 66, 0.13)";
    ctx.lineWidth = 0.8;
    for (let u = -1; u <= 1.5; u += 0.5) {
      const a = P([u, -1.3, 0]), b = P([u, 1.5, 0]);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      const c = P([-1.3, u, 0]), d = P([1.5, u, 0]);
      ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.stroke();
    }

    const O = [0, 0, 0];
    const x1 = [1.35, 0, 0];
    const x2 = [0, 1.35, 0];
    const Y = [0.78, 0.55, 1.05];
    const Yhat = [Y[0], Y[1], 0];

    function arrow(from, to, color, lbl, opts = {}) {
      const A = P(from), B = P(to);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = opts.width || 2.2;
      ctx.beginPath();
      ctx.moveTo(A[0], A[1]);
      ctx.lineTo(B[0], B[1]);
      ctx.stroke();
      const dx = B[0] - A[0], dy = B[1] - A[1];
      const ang = Math.atan2(dy, dx);
      const sz = opts.head || 8;
      ctx.beginPath();
      ctx.moveTo(B[0], B[1]);
      ctx.lineTo(B[0] - sz * Math.cos(ang - 0.42), B[1] - sz * Math.sin(ang - 0.42));
      ctx.lineTo(B[0] - sz * Math.cos(ang + 0.42), B[1] - sz * Math.sin(ang + 0.42));
      ctx.closePath();
      ctx.fill();
      if (lbl) {
        ctx.font = `600 ${opts.size || 12}px JetBrains Mono, monospace`;
        ctx.fillStyle = color;
        ctx.textBaseline = "middle";
        ctx.textAlign = opts.align || "left";
        ctx.fillText(lbl, B[0] + (opts.lx ?? 8), B[1] + (opts.ly ?? -4));
      }
    }

    // dashed coordinates of β̂ inside the plane
    const beta1End = P([Yhat[0], 0, 0]);
    const yhatP = P(Yhat);
    const OP = P(O);
    ctx.strokeStyle = "rgba(94, 234, 212, 0.32)";
    ctx.setLineDash([3, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(OP[0], OP[1]);
    ctx.lineTo(beta1End[0], beta1End[1]);
    ctx.lineTo(yhatP[0], yhatP[1]);
    ctx.stroke();
    ctx.setLineDash([]);

    // basis columns
    arrow(O, x1, "rgba(244, 185, 66, 0.85)", "x\u2081", { width: 1.6, size: 11, ly: 12 });
    arrow(O, x2, "rgba(244, 185, 66, 0.85)", "x\u2082", { width: 1.6, size: 11, ly: 14, align: "right", lx: -6 });

    // Y_hat in the plane
    arrow(O, Yhat, "#5eead4", "X\u03b2\u0302", { width: 2.4, size: 12, ly: 14, lx: -4, align: "right" });

    // residual e perpendicular to plane
    arrow(Yhat, Y, "#ed6a5a", "e = Y \u2212 X\u03b2\u0302", { width: 2.4, size: 12, lx: 8, ly: 14 });

    // Y vector
    arrow(O, Y, "rgba(243, 236, 217, 0.95)", "Y", { width: 2.4, size: 13, lx: 10, ly: -8 });

    // right-angle marker
    const ra1 = P([Yhat[0] - 0.13, Yhat[1], 0]);
    const ra2 = P([Yhat[0] - 0.13, Yhat[1], 0.13]);
    const ra3 = P([Yhat[0], Yhat[1], 0.13]);
    ctx.strokeStyle = "rgba(243, 236, 217, 0.55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ra1[0], ra1[1]);
    ctx.lineTo(ra2[0], ra2[1]);
    ctx.lineTo(ra3[0], ra3[1]);
    ctx.stroke();

    // plane label
    const planeLbl = P([1.5, 1.5, 0]);
    ctx.font = "500 11px JetBrains Mono, monospace";
    ctx.fillStyle = "rgba(244, 185, 66, 0.85)";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("col(X)", planeLbl[0] + 6, planeLbl[1] + 4);

    // header label
    label(ctx, "OLS geometry  \u00b7  projection onto col(X)", 16, 22,
      { color: "rgba(244, 185, 66, 0.88)", size: 11 });
    label(ctx, "min \u2016Y \u2212 X\u03b2\u20162   \u27f9   e \u22a5 col(X)", 16, 38,
      { color: "rgba(200, 192, 170, 0.55)", size: 10.5 });

    ctx.font = "500 9.5px JetBrains Mono, monospace";
    ctx.fillStyle = "rgba(154, 147, 127, 0.5)";
    ctx.textAlign = "right";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("drag to rotate", w - 16, h - 14);
  }

  // ───────────────────────────────────────────────
  // 11. Central Limit Theorem
  // ───────────────────────────────────────────────
  function drawCLT(ctx, w, h, t, s) {
    ctx.clearRect(0, 0, w, h);
    bg(ctx, w, h, { step: 20, gridColor: "rgba(243, 236, 217, 0.035)" });

    if (!s.means) {
      s.means = [];
      s.lastAdd = 0;
      s.n = 8;
      s.lam = 2.0;
    }
    if (t - s.lastAdd > 40 && s.means.length < 400) {
      let sum = 0;
      for (let i = 0; i < s.n; i++) {
        sum += -Math.log(Math.max(1e-6, Math.random())) / s.lam;
      }
      s.means.push(sum / s.n);
      s.lastAdd = t;
    }
    if (s.means.length >= 400 && t - s.lastAdd > 2200) {
      s.means = [];
      s.lastAdd = t;
    }

    const padX = 24, padY = 18;
    const topH = h * 0.36;
    const divY = padY + topH + 10;
    const histStart = divY + 16;
    const histH = h - histStart - 14;

    // top: skewed source distribution
    ctx.beginPath();
    const lam = s.lam;
    for (let i = 0; i <= 120; i++) {
      const x = (i / 120) * 3;
      const px = padX + (i / 120) * (w - padX * 2);
      const pdf = lam * Math.exp(-lam * x);
      const py = padY + topH - pdf * topH * 0.42;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.lineTo(w - padX, padY + topH);
    ctx.lineTo(padX, padY + topH);
    ctx.closePath();
    ctx.fillStyle = "rgba(244, 185, 66, 0.12)";
    ctx.fill();
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const x = (i / 120) * 3;
      const px = padX + (i / 120) * (w - padX * 2);
      const pdf = lam * Math.exp(-lam * x);
      const py = padY + topH - pdf * topH * 0.42;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = "rgba(244, 185, 66, 0.7)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // divider
    ctx.strokeStyle = "rgba(243, 236, 217, 0.10)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padX, divY);
    ctx.lineTo(w - padX, divY);
    ctx.stroke();

    // bottom: sample-mean histogram
    const bins = 26;
    const xMin = 0.15, xMax = 0.85;
    const counts = new Array(bins).fill(0);
    for (const m of s.means) {
      const idx = Math.floor((m - xMin) / (xMax - xMin) * bins);
      if (idx >= 0 && idx < bins) counts[idx]++;
    }
    const maxC = Math.max(1, ...counts);
    const binW = (w - padX * 2) / bins;
    for (let i = 0; i < bins; i++) {
      const bh = counts[i] / maxC * histH * 0.85;
      const bx = padX + i * binW;
      ctx.fillStyle = "rgba(94, 234, 212, 0.55)";
      ctx.fillRect(bx + 1, histStart + histH - bh, binW - 2, bh);
    }

    // normal overlay
    const trueMean = 1 / lam;
    const trueSd = Math.sqrt(1 / (lam * lam) / s.n);
    if (s.means.length > 5) {
      ctx.strokeStyle = "rgba(243, 236, 217, 0.78)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      const total = s.means.length;
      const binStep = (xMax - xMin) / bins;
      for (let i = 0; i <= 160; i++) {
        const x = xMin + (xMax - xMin) * i / 160;
        const z = (x - trueMean) / trueSd;
        const pdf = Math.exp(-0.5 * z * z) / (trueSd * Math.sqrt(2 * Math.PI));
        const expected = pdf * binStep * total;
        const py = histStart + histH - (expected / maxC) * histH * 0.85;
        const px = padX + (i / 160) * (w - padX * 2);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    label(ctx, "population  ~  Exp(\u03bb)", padX, padY + 14,
      { color: "rgba(244, 185, 66, 0.85)", size: 11 });
    label(ctx, `sample means \u00b7 n=${s.n} \u00b7 draws=${s.means.length}`, padX, histStart + 14,
      { color: "rgba(94, 234, 212, 0.85)", size: 11 });
    label(ctx, "X\u0304\u2099 \u2192 N(\u03bc, \u03c3\u00b2/n)", w - padX, histStart + 14,
      { color: "rgba(243, 236, 217, 0.65)", size: 10.5, align: "right" });
  }

  // ───────────────────────────────────────────────
  // 12. Law of Large Numbers
  // ───────────────────────────────────────────────
  function drawLLN(ctx, w, h, t, s) {
    ctx.clearRect(0, 0, w, h);
    bg(ctx, w, h, { step: 20, gridColor: "rgba(243, 236, 217, 0.035)" });

    const NMAX = 500;
    if (!s.means) {
      s.means = [];
      s.running = 0;
      s.mu = 2.0;
      s.sd = 1.4;
      s.lastAdd = 0;
    }
    if (s.means.length >= NMAX && t - s.lastAdd > 1800) {
      s.means = [];
      s.running = 0;
    }
    if (s.means.length < NMAX && t - s.lastAdd > 12) {
      const u1 = Math.max(1e-6, Math.random());
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const xi = s.mu + z * s.sd;
      const n = s.means.length + 1;
      s.running = ((n - 1) * s.running + xi) / n;
      s.means.push(s.running);
      s.lastAdd = t;
    }

    const padX = 34, padY = 24;
    const plotW = w - padX * 2;
    const plotH = h - padY * 2;
    const yMin = s.mu - 2.4;
    const yMax = s.mu + 2.4;
    const yPix = (v) => padY + plotH * (yMax - v) / (yMax - yMin);
    const xPix = (i) => padX + (i / NMAX) * plotW;

    const N = s.means.length;
    if (N > 1) {
      ctx.fillStyle = "rgba(244, 185, 66, 0.08)";
      ctx.beginPath();
      for (let i = 1; i <= N; i++) {
        const half = 2 * s.sd / Math.sqrt(i);
        if (i === 1) ctx.moveTo(xPix(i), yPix(s.mu + half));
        else ctx.lineTo(xPix(i), yPix(s.mu + half));
      }
      for (let i = N; i >= 1; i--) {
        const half = 2 * s.sd / Math.sqrt(i);
        ctx.lineTo(xPix(i), yPix(s.mu - half));
      }
      ctx.closePath();
      ctx.fill();
    }

    // true mean line
    ctx.strokeStyle = "rgba(244, 185, 66, 0.72)";
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 1.2;
    const muY = yPix(s.mu);
    ctx.beginPath();
    ctx.moveTo(padX, muY);
    ctx.lineTo(padX + plotW, muY);
    ctx.stroke();
    ctx.setLineDash([]);

    // running mean
    ctx.strokeStyle = "rgba(94, 234, 212, 0.92)";
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    for (let i = 0; i < s.means.length; i++) {
      const x = xPix(i + 1);
      const y = yPix(s.means[i]);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    if (s.means.length) {
      const i = s.means.length - 1;
      ctx.fillStyle = "#5eead4";
      ctx.beginPath();
      ctx.arc(xPix(i + 1), yPix(s.means[i]), 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    label(ctx, "running mean  X\u0304\u2099 \u2192 \u03bc", padX, padY + 14,
      { color: "rgba(94, 234, 212, 0.88)", size: 11 });
    label(ctx, `\u03bc = ${s.mu.toFixed(2)}   n = ${N}   X\u0304\u2099 = ${s.running.toFixed(3)}`, padX, padY + 30,
      { color: "rgba(200, 192, 170, 0.6)", size: 10.5 });
    label(ctx, "true \u03bc", padX + plotW - 4, muY - 6,
      { color: "rgba(244, 185, 66, 0.85)", align: "right", size: 10 });
  }

  // ── dispatcher ──
  const drawers = {
    gradient: drawGradientDescent,
    dft: drawDFT,
    ou: drawOU,
    conv: drawConv,
    mle: drawMLE,
    bootstrap: drawBootstrap,
    distribution: drawDistribution,
    periodogram: drawPeriodogram,
    experiment: drawExperiment,
    ols3d: drawOLS3D,
    clt: drawCLT,
    lln: drawLLN,
  };

  document.querySelectorAll("canvas[data-viz]").forEach((c) => {
    const fn = drawers[c.dataset.viz] || drawGradientDescent;
    const state = {};
    attach(c, fn, { state });

    // pointer rotation for the OLS 3D viz
    if (c.dataset.viz === "ols3d") {
      let dragging = false, lastX = 0, lastY = 0;
      c.style.cursor = "grab";
      c.style.touchAction = "none";
      c.addEventListener("pointerdown", (e) => {
        dragging = true; state.dragging = true; state.autorotate = false;
        lastX = e.clientX; lastY = e.clientY;
        c.style.cursor = "grabbing";
        try { c.setPointerCapture(e.pointerId); } catch (_) {}
      });
      c.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        state.yaw = (state.yaw || 0) + dx * 0.01;
        state.pitch = Math.max(0.08, Math.min(1.45, (state.pitch || 0) + dy * 0.008));
        lastX = e.clientX; lastY = e.clientY;
      });
      const endDrag = () => {
        dragging = false; state.dragging = false;
        c.style.cursor = "grab";
      };
      c.addEventListener("pointerup", endDrag);
      c.addEventListener("pointercancel", endDrag);
      c.addEventListener("pointerleave", endDrag);
    }
  });
})();

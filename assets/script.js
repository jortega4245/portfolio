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
  // 1. HERO — gradient descent on a loss surface
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
    label(ctx, "x(t) — time domain", padX, padY + 12, { color: "rgba(94, 234, 212, 0.85)", size: 10 });
    label(ctx, "|X(ω)|² — periodogram", padX, botY + 12, { color: "rgba(244, 185, 66, 0.85)", size: 10 });
  }

  // ───────────────────────────────────────────────
  // 3. Ornstein-Uhlenbeck — mean-reverting process
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
  // 4. Convolution — kernel sliding over a grid (CNN)
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
  // 5. MLE — log-likelihood with iterative ascent
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
  // 6. Bootstrap — resampling distribution
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
  };

  document.querySelectorAll("canvas[data-viz]").forEach((c) => {
    const fn = drawers[c.dataset.viz] || drawGradientDescent;
    attach(c, fn, { state: {} });
  });
})();

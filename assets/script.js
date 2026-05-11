const progress = document.querySelector(".progress");
const year = document.getElementById("year");
if (year) year.textContent = new Date().getFullYear();

function updateProgress() {
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  if (progress) progress.style.width = `${height > 0 ? (scrollTop / height) * 100 : 0}%`;
}
window.addEventListener("scroll", updateProgress, { passive: true });
updateProgress();

const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  }
}, { threshold: 0.12 });

document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

function setupCanvas(canvas, type = "gradient") {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawGrid(w, h) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(5, 10, 13, 0.12)";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(163, 230, 232, 0.08)";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 32) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 32) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
  }

  function drawGradient(t, w, h) {
    drawGrid(w, h);

    const cx = w * .52, cy = h * .48;
    for (let r = 42; r < Math.max(w, h); r += 42) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 1.13, r * .68, -0.32, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(114, 242, 235, ${Math.max(.02, .18 - r / 900)})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    const pts = [];
    let x = w * .16, y = h * .18;
    for (let i = 0; i < 20; i++) {
      const dx = (cx - x) * .18 + Math.sin(i * 1.7 + t * .002) * 10;
      const dy = (cy - y) * .18 + Math.cos(i * 1.4 + t * .002) * 7;
      x += dx; y += dy;
      pts.push([x, y]);
    }

    ctx.beginPath();
    pts.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py));
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#72f2eb");
    grad.addColorStop(.55, "#b18cff");
    grad.addColorStop(1, "#ff7aa8");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 3;
    ctx.stroke();

    pts.forEach(([px, py], i) => {
      ctx.beginPath();
      ctx.arc(px, py, i === pts.length - 1 ? 5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = i === pts.length - 1 ? "#ffd166" : "rgba(237,247,247,.72)";
      ctx.fill();
    });

    ctx.font = "12px IBM Plex Mono, monospace";
    ctx.fillStyle = "rgba(198,223,224,.82)";
    ctx.fillText("gradient descent path", 18, 28);
    ctx.fillStyle = "rgba(114,242,235,.82)";
    ctx.fillText("minimize L(θ)", 18, 48);
  }

  function drawPeriodogram(t, w, h) {
    drawGrid(w, h);
    const bars = 42;
    const pad = 28;
    const plotW = w - pad * 2;
    const plotH = h - pad * 2;
    for (let i = 0; i < bars; i++) {
      const freq = i / bars;
      const pulse = Math.exp(-Math.pow((i - 9) / 3.2, 2)) * .8
        + Math.exp(-Math.pow((i - 25) / 4.4, 2)) * .55
        + .16 * Math.abs(Math.sin(i * .9 + t * .002));
      const barH = pulse * plotH;
      const x = pad + i * (plotW / bars);
      const bw = plotW / bars * .68;
      const g = ctx.createLinearGradient(0, h - pad - barH, 0, h - pad);
      g.addColorStop(0, "#72f2eb");
      g.addColorStop(1, "rgba(177,140,255,.35)");
      ctx.fillStyle = g;
      ctx.fillRect(x, h - pad - barH, bw, barH);
    }
    ctx.strokeStyle = "rgba(237,247,247,.5)";
    ctx.beginPath(); ctx.moveTo(pad, h - pad); ctx.lineTo(w - pad, h - pad); ctx.stroke();
    ctx.font = "12px IBM Plex Mono, monospace";
    ctx.fillStyle = "rgba(198,223,224,.82)";
    ctx.fillText("periodogram: frequency power", 18, 28);
  }

  function drawDistribution(t, w, h) {
    drawGrid(w, h);
    const pad = 32;
    const baseY = h * .74;
    const scale = w * .13;
    const means = [-1.05, .92];
    const sigmas = [.75, .58];
    const colors = ["#72f2eb", "#ff7aa8"];

    function normal(x, mu, sigma) {
      return Math.exp(-.5 * Math.pow((x - mu) / sigma, 2)) / (sigma * Math.sqrt(2 * Math.PI));
    }

    for (let k = 0; k < 2; k++) {
      ctx.beginPath();
      for (let i = 0; i <= 240; i++) {
        const x = -3 + i * 6 / 240;
        const y = normal(x, means[k] + Math.sin(t * .001 + k) * .08, sigmas[k]);
        const px = pad + ((x + 3) / 6) * (w - pad * 2);
        const py = baseY - y * scale * 2.2;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.lineTo(w - pad, baseY);
      ctx.lineTo(pad, baseY);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, h * .25, 0, baseY);
      g.addColorStop(0, colors[k] + "aa");
      g.addColorStop(1, "rgba(5,10,13,0)");
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = colors[k];
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(237,247,247,.5)";
    ctx.beginPath(); ctx.moveTo(pad, baseY); ctx.lineTo(w - pad, baseY); ctx.stroke();
    ctx.font = "12px IBM Plex Mono, monospace";
    ctx.fillStyle = "rgba(198,223,224,.82)";
    ctx.fillText("sampling distributions / uncertainty", 18, 28);
  }

  function drawExperiment(t, w, h) {
    drawGrid(w, h);
    const rows = 7, cols = 8;
    const gap = 8;
    const cell = Math.min((w - 70) / cols, (h - 86) / rows);
    const startX = (w - (cols * cell + (cols - 1) * gap)) / 2;
    const startY = 70;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const assigned = (r * 7 + c * 3) % 5 < 2;
        const block = r % 2 === 0;
        ctx.fillStyle = assigned ? "rgba(114,242,235,.45)" : "rgba(177,140,255,.28)";
        if (block) ctx.fillStyle = assigned ? "rgba(184,255,114,.38)" : "rgba(255,122,168,.24)";
        ctx.strokeStyle = "rgba(237,247,247,.18)";
        ctx.lineWidth = 1;
        const x = startX + c * (cell + gap);
        const y = startY + r * (cell + gap);
        ctx.beginPath();
        ctx.roundRect(x, y, cell, cell, 8);
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.font = "12px IBM Plex Mono, monospace";
    ctx.fillStyle = "rgba(198,223,224,.82)";
    ctx.fillText("blocked randomization / potential outcomes", 18, 28);
    ctx.fillStyle = "#72f2eb";
    ctx.fillText("Yᵢ(1) − Yᵢ(0)", 18, 48);
  }

  const drawers = { gradient: drawGradient, periodogram: drawPeriodogram, distribution: drawDistribution, experiment: drawExperiment };
  let raf;
  function animate(t) {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    (drawers[type] || drawGradient)(t, w, h);
    raf = requestAnimationFrame(animate);
  }

  resize();
  animate(0);
  window.addEventListener("resize", resize);
  return () => cancelAnimationFrame(raf);
}

document.querySelectorAll("canvas[data-viz]").forEach((canvas) => setupCanvas(canvas, canvas.dataset.viz));

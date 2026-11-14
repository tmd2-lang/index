/* =========================================================
   LIGHT TUNNEL — our warm version of Bevel's rainbow ribbon

   What Bevel's video actually shows (filmed frame by frame):
   1. A horizontal RIBBON of light across the whole hero,
      pinched thin in the middle (behind the phone) and flaring
      out top and bottom toward both edges, like a bow tie.
   2. The ribbon is made of soft colour BANDS stacked on top of
      each other. The bands slowly roll through one another
      (one full loop about every 6 seconds), like a twisting tube.
   3. Thin white SPEED LINES race outward from the middle along
      the ribbon's curve.

   We draw it on two canvases:
   - .hero__tunnel  → the colour bands (CSS blurs this one a lot)
   - .hero__streaks → the speed lines (kept nearly sharp)
   ========================================================= */

(function () {
  const bandCanvas = document.querySelector('.hero__tunnel');
  const lineCanvas = document.querySelector('.hero__streaks');
  if (!bandCanvas || !lineCanvas) return;

  const bands = bandCanvas.getContext('2d');
  const lines = lineCanvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;


  // ---------- the look (tweak these) ----------

  // Warm pastel bands, in order across the ribbon. Bevel's are
  // mint, cream, pink, sky blue; ours are Ligo's sunset.
  const PALETTE = [
    [255, 212, 138],   // butter gold
    [255, 206, 172],   // soft peach (Bevel's pale band; pure cream vanished into our sky)
    [255, 176, 156],   // coral pink
    [255, 158, 92],    // Ligo orange (softened)
    [250, 186, 206],   // rose
    [255, 196, 128],   // apricot
  ];

  const CENTER_Y = 0.53;      // ribbon's middle, as a share of the canvas height
  const WAIST = 0.058;        // half-thickness at the pinch, as a share of the height
  const FLARE = 0.28;         // extra half-thickness at the far edges
  const LANES = 48;           // thin strips the ribbon is drawn from
  const BAND_CYCLE = 6000;    // ms for the colours to roll one full loop
  const SPEED_LINES = 90;


  // ---------- sizes ----------

  let width = 0;
  let height = 0;
  let speedLines = [];
  let running = false;
  let startTime = performance.now();

  function sizeCanvas(canvas, ctx) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const box = canvas.getBoundingClientRect();
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return box;
  }

  function resize() {
    const box = sizeCanvas(bandCanvas, bands);
    sizeCanvas(lineCanvas, lines);
    width = box.width;
    height = box.height;
  }


  // ---------- the ribbon's shape ----------

  // How far from the middle line the ribbon reaches at a given x.
  // Thin at the centre, curving out (a parabola) toward the edges.
  function halfThickness(x) {
    const fromCentre = Math.abs(x - width / 2) / (width / 2);   // 0 at centre, 1 at edges
    return height * (WAIST + FLARE * fromCentre * fromCentre);
  }

  // The y position of a point on the ribbon.
  // lane: -1 = top edge, 0 = middle, 1 = bottom edge
  function ribbonY(x, lane) {
    return height * CENTER_Y + lane * halfThickness(x);
  }

  // Fade the ribbon out softly toward the left and right edges
  function edgeFade(x) {
    const fromCentre = Math.abs(x - width / 2) / (width / 2);
    return 1 - Math.max(0, fromCentre - 0.7) / 0.3;
  }


  // ---------- colour bands ----------

  // Blend smoothly between palette colours. t runs 0..1 around the loop.
  function colourAt(t) {
    const pos = ((t % 1) + 1) % 1 * PALETTE.length;
    const i = Math.floor(pos);
    const mix = pos - i;
    const a = PALETTE[i];
    const b = PALETTE[(i + 1) % PALETTE.length];
    return [
      Math.round(a[0] + (b[0] - a[0]) * mix),
      Math.round(a[1] + (b[1] - a[1]) * mix),
      Math.round(a[2] + (b[2] - a[2]) * mix),
    ];
  }

  function drawBands(time) {
    const roll = time / BAND_CYCLE;          // moves the colours through the ribbon
    const step = Math.max(8, width / 160);   // horizontal detail of each strip

    bands.clearRect(0, 0, width, height);

    for (let i = 0; i < LANES; i++) {
      const top = -1 + (2 * i) / LANES;
      const bottom = -1 + (2 * (i + 1)) / LANES;
      const middle = (top + bottom) / 2;

      // Like a tube seen edge-on, the colour is strongest near the
      // ribbon's top and bottom edges and paler in the middle, then
      // drops off quickly right at the edge (a soft but defined rim).
      const out = Math.abs(middle);
      const rim = out > 0.92 ? (1 - out) / 0.08 : 1;
      const edgeSoftness = (0.8 + 0.2 * out * out) * rim;
      const [r, g, b] = colourAt(middle * 0.6 + roll);

      // One filled strip: along the top edge left→right,
      // then back along the bottom edge right→left.
      const gradient = bands.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',0)');
      gradient.addColorStop(0.12, 'rgba(' + r + ',' + g + ',' + b + ',' + (0.75 * edgeSoftness) + ')');
      gradient.addColorStop(0.5, 'rgba(' + r + ',' + g + ',' + b + ',' + (0.95 * edgeSoftness) + ')');
      gradient.addColorStop(0.88, 'rgba(' + r + ',' + g + ',' + b + ',' + (0.75 * edgeSoftness) + ')');
      gradient.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
      bands.fillStyle = gradient;

      bands.beginPath();
      for (let x = 0; x <= width + step; x += step) {
        bands.lineTo(x, ribbonY(x, top));
      }
      for (let x = width + step; x >= -step; x -= step) {
        bands.lineTo(x, ribbonY(x, bottom) + 0.5);
      }
      bands.closePath();
      bands.fill();
    }

    // A thin bright core along the middle, like Bevel's white line
    const core = bands.createLinearGradient(0, 0, width, 0);
    core.addColorStop(0, 'rgba(255,250,242,0)');
    core.addColorStop(0.5, 'rgba(255,250,242,0.9)');
    core.addColorStop(1, 'rgba(255,250,242,0)');
    bands.fillStyle = core;
    bands.beginPath();
    for (let x = 0; x <= width + step; x += step) {
      bands.lineTo(x, ribbonY(x, -0.06));
    }
    for (let x = width + step; x >= -step; x -= step) {
      bands.lineTo(x, ribbonY(x, 0.06));
    }
    bands.closePath();
    bands.fill();
  }


  // ---------- speed lines ----------

  // Each line rides one "lane" of the ribbon and races outward
  // from the middle to one side, speeding up as it goes.
  function makeSpeedLine(anywhere) {
    return {
      lane: (Math.random() * 2 - 1) * 0.9,
      side: Math.random() < 0.5 ? -1 : 1,
      progress: anywhere ? Math.random() : 0,      // 0 = centre, 1 = edge
      speed: 0.0025 + Math.random() * 0.004,
      length: 0.06 + Math.random() * 0.14,          // share of half the width
      alpha: 0.35 + Math.random() * 0.5,
      thickness: 0.6 + Math.random() * 1.1,
    };
  }

  function seedSpeedLines() {
    speedLines = [];
    for (let i = 0; i < SPEED_LINES; i++) {
      speedLines.push(makeSpeedLine(true));
    }
  }

  function drawSpeedLines() {
    lines.clearRect(0, 0, width, height);
    lines.lineCap = 'round';

    const half = width / 2;

    for (const s of speedLines) {
      // Ease the position so lines start slow in the middle and rush at the edges
      const head = Math.pow(s.progress, 1.6);
      const tail = Math.max(0, head - s.length * (0.3 + head));

      const xHead = half + s.side * head * half;
      const xTail = half + s.side * tail * half;

      // Fade in leaving the middle, fade out near the edges
      const fade = Math.min(1, s.progress * 5) * edgeFade(xHead);
      if (fade <= 0) continue;

      const gradient = lines.createLinearGradient(xTail, 0, xHead, 0);
      gradient.addColorStop(0, 'rgba(255,255,255,0)');
      gradient.addColorStop(1, 'rgba(255,255,255,' + s.alpha * fade + ')');
      lines.strokeStyle = gradient;
      lines.lineWidth = s.thickness;

      // Follow the ribbon's curve, not a straight line
      lines.beginPath();
      const steps = 10;
      for (let k = 0; k <= steps; k++) {
        const x = xTail + (xHead - xTail) * (k / steps);
        lines.lineTo(x, ribbonY(x, s.lane));
      }
      lines.stroke();
    }
  }

  function moveSpeedLines() {
    for (let i = 0; i < speedLines.length; i++) {
      const s = speedLines[i];
      s.progress += s.speed;
      if (s.progress > 1.05) {
        speedLines[i] = makeSpeedLine(false);
      }
    }
  }


  // ---------- loop ----------

  function frame(now) {
    if (!running) return;
    drawBands(now - startTime);
    moveSpeedLines();
    drawSpeedLines();
    requestAnimationFrame(frame);
  }

  function start() {
    if (running || reduceMotion) return;
    running = true;
    requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
  }

  resize();
  seedSpeedLines();
  drawBands(0);
  drawSpeedLines();

  // Only animate while the hero is on screen
  new IntersectionObserver(function (entries) {
    entries[0].isIntersecting ? start() : stop();
  }).observe(bandCanvas);

  window.addEventListener('resize', function () {
    resize();
    drawBands(performance.now() - startTime);
    drawSpeedLines();
  });
})();

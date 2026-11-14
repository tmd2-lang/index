/* =========================================================
   ORBIT — the rings of org logos behind the "one feed" phone
   (Bevel's "Connect your health records" card, measured):
   - two rings centred behind the phone, 952px and 1378px across
   - 20 tiles on each ring, evenly spaced (every 18°)
   - the inner ring turns +3° a second, the outer one -3°,
     so they drift past each other in opposite directions
   ========================================================= */

(function () {
  const rings = document.querySelectorAll('.orbit__ring');
  if (!rings.length) return;

  // Real orgs that post on Ligo (logos cut from the app's own screens).
  // They all live in ONE image, assets/wide/logos.jpg: a 6 × 3 grid of
  // 128px squares, in this order. One file instead of 18 loads faster
  // and can't half-fail.
  const LOGO_COUNT = 18;
  const SHEET_COLUMNS = 6;
  const SHEET_ROWS = 3;

  const TILES_PER_RING = 20;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- build the tiles ----------

  rings.forEach(function (ring, ringIndex) {
    for (let i = 0; i < TILES_PER_RING; i++) {
      // Each tile sits on a "spoke": turn to its angle, then push
      // out to the ring's edge. The tile turns with the ring, like Bevel's.
      const spoke = document.createElement('div');
      spoke.className = 'orbit__spoke';
      spoke.style.setProperty('--angle', (i * 360 / TILES_PER_RING) + 'deg');

      const tile = document.createElement('span');
      tile.className = 'orbit__tile';

      // Pick a logo (offset the outer ring so neighbours differ),
      // then slide the sheet so only that square shows.
      const logo = document.createElement('span');
      logo.className = 'orbit__logo';
      const n = (i + ringIndex * 7) % LOGO_COUNT;
      const col = n % SHEET_COLUMNS;
      const row = Math.floor(n / SHEET_COLUMNS);
      logo.style.backgroundPosition =
        (col / (SHEET_COLUMNS - 1)) * 100 + '% ' + (row / (SHEET_ROWS - 1)) * 100 + '%';

      tile.appendChild(logo);
      spoke.appendChild(tile);
      ring.appendChild(spoke);
    }
  });

  if (reduceMotion) return;

  // ---------- spin (only while the card is on screen) ----------

  let running = false;
  let last = 0;
  let turned = 0;   // seconds of spin so far

  function frame(now) {
    if (!running) return;
    const dt = last ? (now - last) / 1000 : 0;
    last = now;
    turned += dt;
    rings.forEach(function (ring) {
      const speed = Number(ring.dataset.speed);   // degrees per second
      ring.style.transform = 'translate(-50%, -50%) rotate(' + (turned * speed) + 'deg)';
    });
    requestAnimationFrame(frame);
  }

  new IntersectionObserver(function (entries) {
    if (entries[0].isIntersecting && !running) {
      running = true;
      last = 0;
      requestAnimationFrame(frame);
    } else if (!entries[0].isIntersecting) {
      running = false;
    }
  }).observe(document.querySelector('.orbit'));
})();

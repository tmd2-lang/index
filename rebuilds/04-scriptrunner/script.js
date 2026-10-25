const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- 1. Smooth scrolling (Lenis, like the original) ---------- */
if (!reduceMotion && window.Lenis) {
  const lenis = new Lenis();
  const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
}

/* ---------- 2. Nav: hide on scroll down, show on scroll up ---------- */
const nav = document.getElementById("nav");
let lastY = scrollY;
addEventListener("scroll", () => {
  const y = scrollY;
  if (Math.abs(y - lastY) < 4) return;            // ignore tiny jitters
  nav.classList.toggle("is-hidden", y > lastY && y > 80);
  lastY = y;
}, { passive: true });

/* ---------- 3. Tablet tilt-in ----------
   Measured on the original: the tablet stays leaned back while it rises into view, then flattens over a short
   stretch, while its top moves from ~20.5% to ~14% of the screen height. --tilt maps that window to 1 → 0, and
   the CSS transition (.7s) smooths the jumps into one settle. Scrolling back up tilts it again. */
const stage = document.getElementById("tabletStage");
const tablet = document.getElementById("tablet");
if (!reduceMotion) {
  let queued = false;
  const updateTilt = () => {
    queued = false;
    const top = stage.getBoundingClientRect().top / innerHeight;   // stage top as a fraction of the screen
    const tilt = Math.min(1, Math.max(0, (top - 0.1425) / 0.0625));
    tablet.style.setProperty("--tilt", tilt.toFixed(3));
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(updateTilt); } };
  addEventListener("scroll", queue, { passive: true });
  addEventListener("resize", queue);
  updateTilt();
} else {
  tablet.style.setProperty("--tilt", "0");   // reduced motion: just show it flat
}

/* ---------- 4. Benefit cards: shrink each card the moment it parks (desktop only) ----------
   The sticking itself is pure CSS. JS only decides "has this card reached its sticky spot?". The card is scaled
   around its centre, so its un-scaled top = visual top − (layout height − visual height) / 2. */
const bcards = [...document.querySelectorAll(".bcard")];
const desktop = matchMedia("(min-width: 1024px)");
let dockQueued = false;
const updateDock = () => {
  dockQueued = false;
  bcards.forEach((card, i) => {
    const last = i === bcards.length - 1;
    const r = card.getBoundingClientRect();
    const layoutTop = r.top - (card.offsetHeight - r.height) / 2;
    const parked = layoutTop <= parseFloat(getComputedStyle(card).top) + 10;   // original starts ~8px early
    card.classList.toggle("is-docked", desktop.matches && !last && parked);
  });
};
const queueDock = () => { if (!dockQueued) { dockQueued = true; requestAnimationFrame(updateDock); } };
addEventListener("scroll", queueDock, { passive: true });
addEventListener("resize", queueDock);
updateDock();

/* ---------- 5. Offerings: slide the row sideways while the stage is pinned ----------
   Progress p = how far you've scrolled through the tall wrapper (0 when the stage pins, 1 when it lets go).
   Linear, like the original. The distance is measured live every frame (track width − screen width), so a
   resized window never leaves a stale number behind. (The original hard-codes −66%, which leaves an empty strip.) */
const offerWrap = document.getElementById("offerTrackWrap");
const offerTrack = document.getElementById("offerTrack");
if (reduceMotion) {
  document.documentElement.classList.add("reduce");   // CSS turns the row into a plain swipeable strip
} else {
  let offerQueued = false;
  const updateOffer = () => {
    offerQueued = false;
    const range = offerWrap.offsetHeight - innerHeight;
    const p = Math.min(1, Math.max(0, -offerWrap.getBoundingClientRect().top / range));
    const distance = Math.max(0, offerTrack.scrollWidth - document.documentElement.clientWidth);
    offerTrack.style.transform = `translate3d(${(-p * distance).toFixed(1)}px, 0, 0)`;
  };
  const queueOffer = () => { if (!offerQueued) { offerQueued = true; requestAnimationFrame(updateOffer); } };
  addEventListener("scroll", queueOffer, { passive: true });
  addEventListener("resize", queueOffer);
  updateOffer();
}

/* ---------- 6. Stats: capsules on a pinned stage (desktop with motion only) ----------
   t = px scrolled since the section's top reached the top of the screen (the section is a fixed 2880px, so these
   are fixed numbers, measured on the original at 1440×900). Two kinds of motion:
   - SCRUBBED: each capsule's centre x (% of stage width), bottom (% of stage height) and rotation follow keyframe
     tables, blended in a straight line between keyframes, every frame.
   - TRIGGERED: data-step on the section (heading out, white background + line 1, line 2, line 3); CSS transitions
     play them on a timer and play them backwards when the step goes down again. */
const stats = document.getElementById("stats");
const caps = [...stats.querySelectorAll(".cap")];
const CAP_KEYS = [
  { x: [[0, 15], [330, 15], [660, 50], [960, 50], [1320, 15]],
    b: [[0, 20], [330, 60], [660, 60], [1000, 80.8], [1300, 103.5], [1700, 120]],
    r: [[0, -24], [700, 0], [960, 0], [1700, -24]] },
  { x: [[0, 90], [330, 80], [660, 50], [960, 50], [1330, 90]],
    b: [[0, 5], [330, 45], [660, 45], [1000, 65.8], [1300, 88.5], [1700, 105]],
    r: [[0, 25], [500, 0], [960, 0], [1460, 25]] },
  { x: [[0, 50]],
    b: [[0, -10], [330, 30], [660, 30], [1000, 50.8], [1400, 78.6], [1700, 93], [2000, 110]],
    r: [[0, 15], [430, 0], [960, 0], [1490, 10]] },
];
const STEPS = [325, 985, 1310, 1645];   // t where data-step becomes 1, 2, 3, 4
// value of a keyframe table at t: find the two keyframes around t and blend between them
const atT = (keys, t) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i];
    if (t <= t1) { const [t0, v0] = keys[i - 1]; return v0 + ((t - t0) / (t1 - t0)) * (v1 - v0); }
  }
  return keys[keys.length - 1][1];
};
const statsScene = matchMedia("(min-width: 1024px) and (prefers-reduced-motion: no-preference)");
let statsQueued = false;
const updateStats = () => {
  statsQueued = false;
  if (!statsScene.matches) {                    // phones / reduced motion: static layout, clear what we wrote
    caps.forEach((c) => c.removeAttribute("style"));
    stats.dataset.step = "0";
    return;
  }
  const t = -stats.getBoundingClientRect().top;
  caps.forEach((cap, i) => {
    const k = CAP_KEYS[i];
    cap.style.left = `${atT(k.x, t).toFixed(2)}%`;
    cap.style.bottom = `${atT(k.b, t).toFixed(2)}%`;
    cap.style.rotate = `${atT(k.r, t).toFixed(2)}deg`;
  });
  stats.dataset.step = String(STEPS.filter((s) => t >= s).length);
};
const queueStats = () => { if (!statsQueued) { statsQueued = true; requestAnimationFrame(updateStats); } };
addEventListener("scroll", queueStats, { passive: true });
addEventListener("resize", queueStats);
updateStats();

/* ---------- 7. Footer reveal ----------
   The sheet (.page) has a gap below it, and the footer is fixed underneath. The moment the sheet's bottom edge rises
   above the bottom of the screen, flag the body: the footer fades in and the sheet's shadow softens (both in CSS). */
const pageSheet = document.querySelector(".page");
let footQueued = false;
const updateFoot = () => {
  footQueued = false;
  const lifting = pageSheet.getBoundingClientRect().bottom < innerHeight + 1;
  document.body.dataset.squeezed = String(lifting);
};
const queueFoot = () => { if (!footQueued) { footQueued = true; requestAnimationFrame(updateFoot); } };
addEventListener("scroll", queueFoot, { passive: true });
addEventListener("resize", queueFoot);
updateFoot();

/* ---------- 8. Videos: no autoplaying motion for people who asked for less ---------- */
if (reduceMotion) {
  document.querySelectorAll("video[autoplay]").forEach((video) => { video.removeAttribute("autoplay"); video.pause(); });
}

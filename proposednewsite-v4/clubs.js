/* =========================================================
   "A word to the club leaders" motion, measured on Pocketchange.
   1. The panel widens: side cut-in 32.5px -> 0 in a straight line,
      from when the section's top enters the screen until it's 28% down.
   2. The video drifts at 0.545x the scroll speed (parallax).
   3. Two copies of the video crossfade at the loop point.
   ========================================================= */
// wrapped in a function so the early "return" below is allowed
(() => {
  const section = document.querySelector(".clubs");
  const panel = section.querySelector(".clubs__panel");
  const drift = section.querySelector(".clubs__drift");
  const videos = [...section.querySelectorAll(".clubs__video")];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const clamp = (v) => Math.max(0, Math.min(1, v));
  let queued = 0;

  /* ---------- 1 + 2. Scroll ---------- */
  const draw = () => {
    queued = 0;
    const top = section.getBoundingClientRect().top;
    const screen = innerHeight;

    // measured: 32.5px at top = screen bottom, 0 at top = 28% of the screen
    const widen = clamp((top - 0.278 * screen) / (0.722 * screen));
    panel.style.setProperty("--inset", `${(32.5 * widen).toFixed(2)}px`);

    // measured: the video layer sits ~11px above the panel when the
    // section's top is at the screen's top, and moves 0.545px per px
    if (!reduceMotion) {
      drift.style.setProperty("--drift", `${(-0.545 * top - 10.9).toFixed(1)}px`);
    }
  };

  const queue = () => {
    if (!queued) {
      queued = requestAnimationFrame(draw);
    }
  };

  addEventListener("scroll", queue, { passive: true });
  addEventListener("resize", queue);
  draw();

  /* ---------- 3. Crossfade loop ----------
     Instead of jumping from the last frame to the first, the next copy
     starts from the beginning 1s before the end and fades in on top
     (CSS: opacity transition, 1s), so the loop has no visible cut. */
  if (reduceMotion) {
    return;
  }

  let current = 0;
  const FADE = 1;

  const watch = () => {
    const playing = videos[current];
    if (playing.duration && playing.currentTime > playing.duration - FADE) {
      const next = videos[1 - current];
      next.currentTime = 0;
      next.play();
      next.classList.add("is-showing");
      playing.classList.remove("is-showing");
      current = 1 - current;
    }
  };

  // only play (and download) while the section is near the screen
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      videos[current].play().catch(() => {});
    } else {
      videos.forEach((v) => v.pause());
    }
  }, { rootMargin: "200px 0px" }).observe(section);

  videos.forEach((v) => v.addEventListener("timeupdate", watch));
})();

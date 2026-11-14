/* =========================================================
   "For local businesses and brands" motion, measured on Pocketchange.
   1. The video drifts at 0.545x the scroll speed (like the clubs panel).
   2. Once the section is 290px past the top of the screen, the panel
      pulls in from every side, 0.05px per px scrolled (corners match).
   3. Two copies of the video crossfade at the loop point.
   ========================================================= */
// wrapped in a function so the early "return" below is allowed
(() => {
  const section = document.querySelector(".partners");
  const panel = section.querySelector(".partners__panel");
  const drift = section.querySelector(".partners__drift");
  const videos = [...section.querySelectorAll(".partners__video")];
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let queued = 0;

  /* ---------- 1 + 2. Scroll ---------- */
  const draw = () => {
    queued = 0;
    const top = section.getBoundingClientRect().top;

    const pull = Math.max(0, 0.05 * (-top - 290));
    panel.style.setProperty("--inset", `${pull.toFixed(2)}px`);

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

  /* ---------- 3. Crossfade loop (same as the clubs panel) ---------- */
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

  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      videos[current].play().catch(() => {});
    } else {
      videos.forEach((v) => v.pause());
    }
  }, { rootMargin: "200px 0px" }).observe(section);

  videos.forEach((v) => v.addEventListener("timeupdate", watch));
})();

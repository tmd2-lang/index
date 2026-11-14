/* =========================================================
   "This is where campus comes to life." motion.
   Every number below was measured on Pocketchange by scrolling its
   scene in steps and reading each element's transform, opacity and
   background color (1440x900 and 375x812). "s" is how far the top of
   the section has scrolled past the top of the screen, in px.
   ========================================================= */
{
  const section = document.querySelector(".connection");
  const stage = section.querySelector(".connection__stage");
  const upper = section.querySelector(".connection__hand--upper");
  const lower = section.querySelector(".connection__hand--lower");
  const title = section.querySelector(".connection__title");

  const desktop = matchMedia("(min-width: 761px) and (prefers-reduced-motion: no-preference)");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

  const clamp = (value) => Math.max(0, Math.min(1, value));

  // "power2.out": fast at first, then gently settling. Measured: halfway
  // through the scroll, the hands have done exactly 75% of their drift.
  const easeOut = (t) => 1 - (1 - t) * (1 - t);

  // the page's cream and Pocketchange's black, mixed by the scene
  const CREAM = [251, 246, 239];

  let queued = 0;

  /* ---------- Desktop ---------- */
  const drawDesktop = () => {
    const screen = stage.offsetHeight;
    const s = -section.getBoundingClientRect().top;

    // 1. Background: cream to black, in a straight line, over the first
    //    0.49 screens after the section reaches the top (440px at 900).
    const dark = clamp(s / (0.489 * screen));
    const rgb = CREAM.map((c) => Math.round(c * (1 - dark)));
    section.style.setProperty("--scene-bg", `rgb(${rgb.join(", ")})`);

    // 2. Hands drift toward each other for the WHOLE time the section is
    //    on screen (from the moment it enters until it leaves), easing out.
    //    Upper hand: x -25% -> -15%, y 0 -> +18%. Lower hand: the mirror.
    const drift = easeOut(clamp((s + screen) / (section.offsetHeight + screen)));
    upper.style.setProperty("--hand-x", `${-25 + 10 * drift}%`);
    upper.style.setProperty("--hand-y", `${18 * drift}%`);
    lower.style.setProperty("--hand-x", `${25 - 10 * drift}%`);
    lower.style.setProperty("--hand-y", `${-18 * drift}%`);

    // 3. The headline slides at a constant speed (no easing), from just
    //    past the right edge until its last letter leaves on the left,
    //    over the first 4.0 screens (3605px at 900).
    const cross = clamp(s / (4.006 * screen));
    const x = stage.clientWidth - cross * (stage.clientWidth + title.offsetWidth);
    title.style.setProperty("--title-x", `${x}px`);

    // 4. Once the text is gone, the hands fade out over one screen,
    //    fast at first (measured: 79% -> 30% -> 4% in equal steps).
    const fade = easeOut(clamp((s - 4.0 * screen) / screen));
    section.style.setProperty("--hands-opacity", 1 - fade);
  };

  /* ---------- Phone ----------
     No pinning. Both hands slide in from the sides, from 45% off-screen
     to 20%, easing out, over 1.72 screens of scroll that start when the
     upper hand's top reaches the bottom of the screen. */
  const drawPhone = () => {
    const screen = innerHeight;
    const enter = clamp((screen - upper.getBoundingClientRect().top) / (1.72 * screen));
    const slide = easeOut(enter);

    upper.style.setProperty("--hand-x", `${-45 + 25 * slide}%`);
    lower.style.setProperty("--hand-x", `${45 - 25 * slide}%`);
  };

  const draw = () => {
    queued = 0;

    if (desktop.matches) {
      drawDesktop();
    } else if (!reduceMotion.matches) {
      drawPhone();
    }
  };

  const queue = () => {
    if (!queued) {
      queued = requestAnimationFrame(draw);
    }
  };

  const setLayout = () => {
    section.classList.toggle("is-animated", desktop.matches);

    // switching sizes: clear whatever the other layout set
    for (const el of [section, upper, lower, title]) {
      el.removeAttribute("style");
    }

    // reduced motion on phones: hands rest where the slide would end
    if (!desktop.matches && reduceMotion.matches) {
      upper.style.setProperty("--hand-x", "-20%");
      lower.style.setProperty("--hand-x", "20%");
    }

    queue();
  };

  addEventListener("scroll", queue, { passive: true });
  addEventListener("resize", queue);
  desktop.addEventListener("change", setLayout);
  document.fonts.ready.then(queue);
  setLayout();
}

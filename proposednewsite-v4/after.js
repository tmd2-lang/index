/* =========================================================
   "What happens after I download?" behavior.
   1. Letter pop-in on the title (once, when the card comes into view).
   2. Question list: one answer open at a time.
   3. The hand-and-phone picture shrinks into place on scroll.
   ========================================================= */
{
  const section = document.querySelector(".after");
  const card = section.querySelector(".after__card");
  const title = section.querySelector(".after__title");
  const visual = section.querySelector(".after__visual");
  const items = [...section.querySelectorAll(".after__item")];

  /* ---------- 1. Letters ----------
     Wrap every letter in its own span (words stay together so they never
     break mid-word), numbered so CSS can stagger them. */
  let index = 0;
  const lines = title.innerHTML.split(/<br\s*\/?>/i);

  title.innerHTML = lines
    .map((line) =>
      line
        .trim()
        .split(" ")
        .map((word) => {
          const letters = [...word]
            .map((letter) => `<span class="char" style="--i:${index++}">${letter}</span>`)
            .join("");
          return `<span class="word">${letters}</span>`;
        })
        .join(" ")
    )
    .join("<br>");

  // measured: the letters start when the card's top is ~85% down the screen
  new IntersectionObserver(
    ([entry], observer) => {
      if (entry.isIntersecting) {
        section.classList.add("is-in");
        observer.disconnect();
      }
    },
    { rootMargin: "0px 0px -15% 0px" }
  ).observe(card);

  /* ---------- 2. One answer open at a time ---------- */
  for (const item of items) {
    item.querySelector(".after__q").addEventListener("click", () => {
      const opening = !item.classList.contains("is-open");

      for (const other of items) {
        other.classList.remove("is-open");
        other.querySelector(".after__q").setAttribute("aria-expanded", "false");
      }

      if (opening) {
        item.classList.add("is-open");
        item.querySelector(".after__q").setAttribute("aria-expanded", "true");
      }
    });
  }

  /* ---------- 3. Picture shrinks into place ----------
     Measured: 1.22x when the card's top is at the bottom of the screen,
     1x when it reaches the top, slightly slowing toward the end. */
  const desktop = matchMedia("(min-width: 761px) and (prefers-reduced-motion: no-preference)");
  let queued = 0;

  const draw = () => {
    queued = 0;
    if (!desktop.matches) {
      visual.style.removeProperty("--grow");
      return;
    }
    const top = card.getBoundingClientRect().top;
    const t = Math.max(0, Math.min(1, (innerHeight - top) / innerHeight));
    visual.style.setProperty("--grow", 1 + 0.22 * Math.pow(1 - t, 1.15));
  };

  const queue = () => {
    if (!queued) {
      queued = requestAnimationFrame(draw);
    }
  };

  addEventListener("scroll", queue, { passive: true });
  addEventListener("resize", queue);
  draw();
}

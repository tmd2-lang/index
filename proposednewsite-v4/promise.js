{
  const heading = document.querySelector(".promise__heading");
  const motion = matchMedia("(prefers-reduced-motion: no-preference)");
  const words = heading.textContent.trim().split(/\s+/).map((word) => {
    const span = document.createElement("span");
    span.className = "promise__word";
    span.textContent = word;
    return span;
  });

  heading.replaceChildren(...words.flatMap((word, index) => index ? [" ", word] : [word]));

  let frame = 0;
  function drawPromise() {
    frame = 0;
    const { top } = heading.getBoundingClientRect();
    const distance = innerHeight * 0.84 - top;
    const readingDistance = innerHeight * 0.50;
    const position = (distance / readingDistance) * (words.length + 1);

    words.forEach((word, index) => {
      const strength = Math.min(1, Math.max(0, (position - index) / 2));
      word.style.setProperty("--word-opacity", motion.matches ? 0.23 + strength * 0.77 : 1);
    });
  }

  function queuePromise() {
    if (!frame) {
      frame = requestAnimationFrame(drawPromise);
    }
  }

  addEventListener("scroll", queuePromise, { passive: true });
  addEventListener("resize", queuePromise);
  motion.addEventListener("change", queuePromise);
  drawPromise();
}

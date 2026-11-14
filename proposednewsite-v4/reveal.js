/* Keep the text and paper circle tied to the same scroll position. */
{
  const bridge = document.querySelector(".reveal-bridge");
  const stage = bridge.querySelector(".reveal-bridge__stage");
  const motion = matchMedia("(prefers-reduced-motion: no-preference)");
  const clamp = (value) => Math.max(0, Math.min(1, value));
  let frame = 0;

  function drawReveal() {
    frame = 0;
    bridge.classList.toggle("is-animated", motion.matches);
    if (!motion.matches) {
      bridge.removeAttribute("style");
      return;
    }

    const bounds = bridge.getBoundingClientRect();
    const { offsetHeight: height, offsetWidth: width } = stage;
    const progress = clamp(-bounds.top / (bounds.height - height));
    const spread = clamp((progress - 0.61) / 0.34);
    const radius = Math.hypot(width / 2, height) + 2;

    bridge.style.setProperty("--bridge-wipe", `${clamp((progress + Math.min(0.2, -bounds.top / height)) / 0.42) * 120}%`);
    bridge.style.setProperty("--bridge-copy", 1 - clamp((progress - 0.55) / 0.21));
    bridge.style.setProperty("--bridge-radius", `${radius * spread ** 1.35}px`);
  }

  function scheduleReveal() {
    if (!frame) {
      frame = requestAnimationFrame(drawReveal);
    }
  }

  addEventListener("scroll", scheduleReveal, { passive: true });
  addEventListener("resize", scheduleReveal);
  motion.addEventListener("change", scheduleReveal);
  drawReveal();
}

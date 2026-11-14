{
  const lawn = document.querySelector(".lawn");
  const motion = matchMedia("(prefers-reduced-motion: no-preference)");
  const phoneWidth = matchMedia("(max-width: 760px)");
  const platform = /Android/i.test(navigator.userAgent) ? "android"
    : /iPhone|iPod/i.test(navigator.userAgent) ? "ios" : "";
  let frame = 0;

  function drawPhoto() {
    frame = 0;
    if (!motion.matches) {
      lawn.style.removeProperty("--lawn-drift");
      return;
    }

    const { top, height } = lawn.getBoundingClientRect();
    const distance = (innerHeight - height) / 2 - top;
    // Follow the reference's 20% offset, bounded by the extra image height.
    const limit = height * 0.2;
    const drift = Math.min(limit, Math.max(-limit, distance * 0.2));
    lawn.style.setProperty("--lawn-drift", `${drift}px`);
  }

  function queuePhoto() {
    if (!frame) {
      frame = requestAnimationFrame(drawPhoto);
    }
  }

  function setStoreLayout() {
    if (phoneWidth.matches && platform) {
      lawn.dataset.platform = platform;
    } else {
      delete lawn.dataset.platform;
    }
  }

  addEventListener("scroll", queuePhoto, { passive: true });
  addEventListener("resize", queuePhoto);
  motion.addEventListener("change", queuePhoto);
  phoneWidth.addEventListener("change", setStoreLayout);
  setStoreLayout();
  drawPhoto();
}

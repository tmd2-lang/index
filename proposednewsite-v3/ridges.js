/* =========================================================
   RIDGES — the sculpted ribs behind the closing orange tile.
   Bevel uses a photo of a ribbed ceiling; we draw our own in
   SVG so it stays orange and sharp at any size.

   Each rib is one curve from the bottom edge up and over to
   the right. It's drawn three times:
     1. a wide, blurred dark stroke, nudged right  → its shadow
     2. a softer light stroke on top                → its rounded face
     3. a thin bright line                          → the lit edge
   Stacking these 26 times reads as a carved, ribbed surface.
   ========================================================= */

(function () {
  const holder = document.querySelector(".about-cta__ridges");
  if (!holder) return;

  // Drawing space. "slice" below crops it to fill any tile shape.
  const W = 1360;
  const H = 528;
  const RIBS = 20;

  let shadows = "";
  let faces = "";
  let edges = "";

  for (let i = 0; i < RIBS; i++) {
    const t = i / (RIBS - 1);              // 0 = far left rib, 1 = far right

    // Depth: "t ** 0.75" spaces the left ribs wider apart than the right
    // ones, so the left reads as closer to us, like Bevel's photo
    const spread = t ** 0.75;

    // Where the rib leaves the bottom edge, and where it exits the top.
    // Right-hand ribs lean further over, so the set fans out like a vault.
    const xBottom = -260 + spread * 1560;
    const xTop = -40 + spread * 1100 + spread * spread * 900;

    // The bend: the rib rises almost straight up, then sweeps right
    const cx = xBottom + (xTop - xBottom) * 0.12;
    const cy = H * 0.3;

    const d = `M ${xBottom.toFixed(1)} ${H + 40} Q ${cx.toFixed(1)} ${cy} ${xTop.toFixed(1)} -60`;

    // Closer ribs (left) are fatter: shadow 52px → 22px, face 20px → 8px
    const shadowWidth = 52 - t * 30;
    const faceWidth = 20 - t * 12;

    shadows += `<path d="${d}" stroke-width="${shadowWidth}" transform="translate(${shadowWidth * 0.45} 0)" />`;
    faces += `<path d="${d}" stroke-width="${faceWidth}" />`;
    edges += `<path d="${d}" transform="translate(${-faceWidth * 0.5} 0)" />`;
  }

  holder.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <filter id="ridge-shadow" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <filter id="ridge-face" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>

      <g fill="none" stroke="rgb(140 45 0 / 26%)" filter="url(#ridge-shadow)">
        ${shadows}
      </g>
      <g fill="none" stroke="rgb(255 225 195 / 28%)" filter="url(#ridge-face)">
        ${faces}
      </g>
      <g fill="none" stroke="rgb(255 240 225 / 22%)" stroke-width="1.2">
        ${edges}
      </g>
    </svg>`;
})();

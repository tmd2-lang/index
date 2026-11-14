/* =========================================================
   Ligo v4 hero: five small jobs (the phones live in phones.js).
   0. Smooth scrolling (Lenis).
   1. The inline script in index.html handles the intro.
   2. Split link text into letters for the hover roll.
   3. Draw the liquid orange background (WebGL), lit by the cursor.
   4. Slide the hero away as you scroll (like Pocketchange).
   ========================================================= */

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;


/* ---------- 0. Smooth scrolling ----------
   A mouse wheel scrolls in steps of ~100px. Everything tied to scroll (the
   phones splitting, the copy sliding) then jumps in steps too: that's the
   choppiness. Lenis catches the wheel and glides the page to its target
   over a few frames instead, so every frame gets a small, even step.
   Pocketchange uses the same library. */
function startSmoothScroll() {
  const lenis = new Lenis();

  const glide = (time) => {
    lenis.raf(time);
    requestAnimationFrame(glide);
  };
  requestAnimationFrame(glide);
}


if (!reduceMotion) {
  if (window.Lenis) {
    startSmoothScroll();
  } else {
    document.querySelector("#lenis-script").addEventListener("load", startSmoothScroll, { once: true });
  }
}

/* ---------- 2. Letter roll ----------
   "Scroll" becomes <span class="char"><span>S</span><span>S</span></span>...
   CSS slides both copies up on hover, each letter a little later (--i). */
document.querySelectorAll(".roll").forEach((el) => {
  const text = el.textContent;
  el.textContent = "";
  el.setAttribute("aria-label", text);

  [...text].forEach((letter, i) => {
    const char = document.createElement("span");
    char.className = "char";
    char.style.setProperty("--i", i);
    char.setAttribute("aria-hidden", "true");
    char.innerHTML = `<span>${letter}</span><span>${letter}</span>`;
    el.appendChild(char);
  });
});


/* ---------- 3. Liquid background ----------
   One full-screen shader. "Domain warping": we bend the coordinates with
   noise, then sample noise again at the bent coordinates. That second
   pass is what turns plain blobs into folds, like silk.
   Drawn at 75% resolution (Pocketchange does the same): it's soft anyway,
   and it saves almost half the GPU work. */
const canvas = document.querySelector(".backdrop__canvas");
const gl = canvas.getContext("webgl");

if (gl) {
  const vertexSource = `
    attribute vec2 p;
    void main() {
      gl_Position = vec4(p, 0.0, 1.0);
    }
  `;

  const fragmentSource = `
    precision highp float;
    uniform vec2 res;
    uniform float t;

    // cursor (in canvas pixels), how strong its glow is right now (0-1),
    // and the last click/tap: where it was and how many seconds ago
    uniform vec2 mouse;
    uniform float glow;
    uniform vec2 tap;
    uniform float tapAge;

    // smooth random value noise
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
        u.y
      );
    }

    // layered noise: big shapes + smaller detail
    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 4; i++) {
        v += a * noise(p);
        p *= 2.02;
        a *= 0.5;
      }
      return v;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / res;
      vec2 p = uv * vec2(res.x / res.y, 1.0) * 1.3;

      // distances to the cursor and to the last tap, measured in screen
      // heights so the shapes stay round on any screen size
      vec2 toMouse = (gl_FragCoord.xy - mouse) / res.y;
      vec2 toTap = (gl_FragCoord.xy - tap) / res.y;
      float mouseFalloff = exp(-dot(toMouse, toMouse) / 0.045);

      // pin-drop ripple: a thin ring that grows out from the tap and fades
      float ringRadius = tapAge * 0.55;
      float ringFade = clamp(1.0 - tapAge / 1.4, 0.0, 1.0);
      float ring = exp(-pow((length(toTap) - ringRadius) / 0.045, 2.0)) * ringFade;

      // both gently push the liquid outward, so the folds bend around them
      p -= toMouse * mouseFalloff * glow * 0.35;
      p -= normalize(toTap + 0.0001) * ring * 0.06;

      // first pass: two noise fields that drift slowly
      vec2 q = vec2(
        fbm(p + vec2(0.0, t * 0.035)),
        fbm(p + vec2(5.2, 1.3) - t * 0.03)
      );

      // second pass: sample again, pushed around by the first
      float f = fbm(p + 2.2 * q + vec2(t * 0.02, 0.0));

      // brand colors
      vec3 red    = vec3(0.86, 0.17, 0.04);
      vec3 orange = vec3(0.976, 0.451, 0.086);
      vec3 amber  = vec3(0.99, 0.70, 0.29);

      // the base runs like the CSS fallback: red top-left, amber bottom-right
      float diag = clamp(uv.x * 0.45 + (1.0 - uv.y) * 0.45, 0.0, 1.0);

      vec3 col = mix(red, orange, smoothstep(0.25, 0.75, f + diag * 0.35));
      col = mix(col, amber, smoothstep(0.62, 1.0, f * 0.7 + diag * 0.55) * 0.75);

      // folds: a soft dark crease and a soft sheen where the warp bends most
      col *= 0.9 + 0.2 * smoothstep(0.3, 0.7, q.x);
      col += vec3(0.06, 0.03, 0.0) * smoothstep(0.55, 0.8, q.y);

      // warm spotlight under the cursor, and a soft light along the ripple
      vec3 warmLight = vec3(1.0, 0.78, 0.45);
      col = mix(col, warmLight, mouseFalloff * glow * 0.5);
      col = mix(col, warmLight, ring * 0.5);

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  // compile both shaders and link them into one program
  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
  };

  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);
  gl.useProgram(program);

  // two triangles that cover the screen
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "p");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const resUniform = gl.getUniformLocation(program, "res");
  const timeUniform = gl.getUniformLocation(program, "t");
  const mouseUniform = gl.getUniformLocation(program, "mouse");
  const glowUniform = gl.getUniformLocation(program, "glow");
  const tapUniform = gl.getUniformLocation(program, "tap");
  const tapAgeUniform = gl.getUniformLocation(program, "tapAge");

  const RESOLUTION = 0.75;

  /* Pointer state. The glow trails the real cursor (it eases 8% of the
     way there each frame), so it feels like light moving through liquid
     instead of a sticker glued to the pointer. It brightens while you
     move and fades out after about a second of stillness. */
  const pointer = {
    targetX: innerWidth / 2,
    targetY: innerHeight / 2,
    x: innerWidth / 2,
    y: innerHeight / 2,
    glow: 0,
    lastMove: -Infinity,
    tapX: -9999,
    tapY: -9999,
    tapTime: -Infinity,
  };

  addEventListener("pointermove", (event) => {
    pointer.targetX = event.clientX;
    pointer.targetY = event.clientY;
    pointer.lastMove = performance.now();
  });

  addEventListener("pointerdown", (event) => {
    pointer.tapX = event.clientX;
    pointer.tapY = event.clientY;
    pointer.tapTime = performance.now();
  });

  // page coordinates → canvas pixels (the canvas is 75% size and its y runs upward)
  const toCanvas = (x, y) => [x * RESOLUTION, (innerHeight - y) * RESOLUTION];

  const resize = () => {
    canvas.width = Math.round(innerWidth * RESOLUTION);
    canvas.height = Math.round(innerHeight * RESOLUTION);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(resUniform, canvas.width, canvas.height);
  };

  resize();
  addEventListener("resize", resize);

  const start = performance.now();

  const draw = (now) => {
    // ease the glow toward the cursor, and its strength toward on/off
    pointer.x += (pointer.targetX - pointer.x) * 0.08;
    pointer.y += (pointer.targetY - pointer.y) * 0.08;
    const moving = now - pointer.lastMove < 900;
    pointer.glow += ((moving ? 1 : 0) - pointer.glow) * (moving ? 0.06 : 0.025);

    gl.uniform1f(timeUniform, (now - start) / 1000);
    gl.uniform2f(mouseUniform, ...toCanvas(pointer.x, pointer.y));
    gl.uniform1f(glowUniform, pointer.glow);
    gl.uniform2f(tapUniform, ...toCanvas(pointer.tapX, pointer.tapY));
    gl.uniform1f(tapAgeUniform, Math.min((now - pointer.tapTime) / 1000, 10));
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  draw(start);
  canvas.classList.add("is-ready");

  if (!reduceMotion) {
    const loop = (now) => {
      draw(now);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}


/* ---------- 4. Hero exit on scroll ----------
   Pocketchange's copy is almost off the left edge by 150px of scroll.
   Drive the horizontal exit faster than the downward drift so the copy
   clears early while still tracking diagonally. */
const copy = document.querySelector(".hero__copy");
const desktop = window.matchMedia("(min-width: 761px)");

const onScroll = () => {
  if (!desktop.matches) {
    copy.style.transform = "";
    return;
  }

  const distance = Math.max(0, scrollY);
  const exit = 1 - (1 - Math.min(distance / 330, 1)) ** 2;
  const drift = 1 - (1 - Math.min(distance / 700, 1)) ** 2;
  copy.style.transform = `translate(${-124 * exit}%, ${47.5 * drift}%)`;
};

if (!reduceMotion) {
  addEventListener("scroll", onScroll, { passive: true });
  desktop.addEventListener("change", onScroll);
  onScroll();
}

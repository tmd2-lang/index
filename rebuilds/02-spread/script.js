/* Flipside — rebuild of joinspread.app.
   Same stack as Spread: GSAP + ScrollTrigger (scroll-linked motion) and Lenis (smooth scrolling). */

const root = document.documentElement;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
if (reduceMotion) root.classList.add("reduce");
gsap.registerPlugin(ScrollTrigger);

/* ---------- 1. Hero headline: wrap each word in a mask ---------- */
// <span class="w"><span style="--i:3">word</span></span>   (the outer span clips, the inner one moves)
function splitWords(el) {
  let i = 0;
  [...el.childNodes].forEach((node) => {
    if (node.nodeType !== Node.TEXT_NODE) return; // keep <br>
    const frag = document.createDocumentFragment();
    node.textContent.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) return frag.append(" ");
      const mask = document.createElement("span");
      const word = document.createElement("span");
      mask.className = "w";
      word.textContent = part;
      word.style.setProperty("--i", i++);   // CSS turns --i into the stagger delay
      mask.append(word);
      frag.append(mask);
    });
    node.replaceWith(frag);
  });
}
document.querySelectorAll("[data-split]").forEach(splitWords);

// Start the entrance once the fonts are in, so words don't slide up and THEN reflow into a new font.
// Two frames later = the hidden start state has been painted, so the transition actually runs.
const start = () => requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("ready")));
Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]).then(start);

/* ---------- 2. Smooth scrolling (Lenis), with Spread's settings ---------- */
if (!reduceMotion) {
  const lenis = new Lenis({ duration: 1.2, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), touchMultiplier: 1.5 });
  lenis.on("scroll", ScrollTrigger.update);           // keep ScrollTrigger in sync with the smoothed position
  gsap.ticker.add((time) => lenis.raf(time * 1000));  // one clock for both libraries
  gsap.ticker.lagSmoothing(0);
}

/* ---------- 3. Hero scroll scene ---------- */
const nav = document.getElementById("nav");
const heroMain = document.getElementById("heroMain");
// Positions are "<trigger edge> <screen edge>": "30% top" = when 30% of the hero has passed the top of the screen.
const heroScrub = (start, end) => ({ trigger: "#hero", start, end, scrub: true });

if (reduceMotion) {
  ScrollTrigger.create({ trigger: "#hero", start: "15% top", toggleClass: { targets: nav, className: "scrolled" } });
} else {
  // Main layer shrinks 1 → 0.25 over the first 30%. We drive it from the trigger's progress ourselves because
  // two things depend on the current scale:
  //  - the corner: a radius is scaled along with the element, so for a visual 16px we set 16 / scale;
  //  - the nav: it switches the moment the card's top edge ((1 - scale) / 2 of the screen) passes the nav.
  //    Spread switches at a fixed 15%, which leaves white nav text on the cream page for a while.
  ScrollTrigger.create({
    ...heroScrub("top top", "30% top"),
    onUpdate: ({ progress: k }) => {
      const scale = 1 - 0.75 * k;
      gsap.set(heroMain, { scale, borderRadius: (16 * k) / scale });
      const cardTop = ((1 - scale) / 2) * innerHeight;
      nav.classList.toggle("scrolled", cardTop > nav.offsetTop);
    },
  });
  // Belt and braces: whatever the card does, the nav is collapsed past 15%.
  ScrollTrigger.create({ trigger: "#hero", start: "15% top", onEnter: () => nav.classList.add("scrolled") });

  // Text fades and lifts away (autoAlpha = opacity + visibility: hidden at 0, so invisible links can't be clicked).
  gsap.to("#heroContent", { autoAlpha: 0, y: -60, ease: "none", scrollTrigger: heroScrub("3% top", "14% top") });
  gsap.to("#spinner", { "--fade": 0, ease: "none", scrollTrigger: heroScrub("3% top", "10% top") });
  ScrollTrigger.create({ trigger: "#hero", start: "10% top", toggleClass: { targets: "#spinner", className: "gone" } });

  // Gallery tiles: fade in early, and rise over the WHOLE hero at different speeds (parallax = depth).
  const tileEnd = [-280, -400, -220, -360, -300, -250, -420, -240];
  gsap.utils.toArray(".tile").forEach((el, i) => {
    gsap.to(el, { opacity: 1, ease: "none", scrollTrigger: heroScrub("8% top", "18% top") });
    gsap.fromTo(el, { y: 400 + i * 30 }, { y: tileEnd[i], ease: "none", scrollTrigger: heroScrub("top top", "bottom top") });
  });
}

/* ---------- 4. Section entrances + photo swap ---------- */
// Each .reveal fades up 28px when its top reaches 90% down the screen. Plays once.
if (!reduceMotion) {
  gsap.utils.toArray(".reveal").forEach((el) => {
    gsap.from(el, { y: 28, opacity: 0, duration: 0.7, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 90%" } });
  });
  gsap.utils.toArray(".feature-media").forEach((el) => {
    gsap.from(el, { y: 40, opacity: 0, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%" } });
  });
}
// The crossfade runs even with reduced motion: it's a content change (a second photo), and the CSS fade is gentle.
// It fires when 40% of the card has passed the middle of the screen, and reverses if you scroll back up.
document.querySelectorAll("[data-swap]").forEach((wrap) => {
  const [a, b] = wrap.querySelectorAll("img");
  const show = (second) => { a.classList.toggle("is-hidden", second); b.classList.toggle("is-hidden", !second); };
  ScrollTrigger.create({ trigger: wrap, start: "40% center", onEnter: () => show(true), onLeaveBack: () => show(false) });
});

// Chat card: when its top reaches 78% down the screen, each message appears at its own data-at time (ms).
// Plays once. With reduced motion the CSS shows every message straight away.
const chat = document.getElementById("chat");
if (chat && !reduceMotion) {
  ScrollTrigger.create({
    trigger: chat, start: "top 78%", once: true,
    onEnter: () => chat.querySelectorAll(".msg").forEach((m) => setTimeout(() => m.classList.add("is-in"), +m.dataset.at || 0)),
  });
}

/* ---------- Photo break ---------- */
// Frame: full-bleed → card (16px in from each side, 24px corners) while its top travels from 80% to 20% of the screen.
// Photo: drifts down and zooms out across the whole time the section is on screen (parallax).
if (!reduceMotion) {
  // One set of triggers PER photo break: a selector like ".photo-break" as the trigger would only ever
  // watch the first one on the page.
  gsap.utils.toArray(".photo-break").forEach((el) => {
    gsap.to(el, {
      "--inset": "16px", ease: "none",
      scrollTrigger: { trigger: el, start: "top 80%", end: "top 20%", scrub: true },
    });
    gsap.fromTo(el.querySelector(".photo-break-img"), { scale: 1.25, yPercent: -12 }, {
      scale: 1.02, yPercent: 4, ease: "none",
      scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
    });
  });
  // Stats count up from 0 once, when the row's top reaches 82% down the screen.
  // The HTML holds the final values, so without JS (or with reduced motion) the right numbers still show.
  const nums = gsap.utils.toArray(".stat-num");
  const label = (el, v) => (el.textContent = Math.round(v) + (el.dataset.suffix || ""));
  nums.forEach((el) => label(el, 0));
  ScrollTrigger.create({
    trigger: "#stats", start: "top 82%", once: true,
    onEnter: () => nums.forEach((el) => {
      const n = { v: 0 };
      gsap.to(n, { v: +el.dataset.count, duration: 1.4, ease: "power2.out", onUpdate: () => label(el, n.v) });
    }),
  });
}

/* ---------- Live opportunities: deal card stack ---------- */
// Example data. Profit = resale − offer − fees, so the numbers on each card add up.
const DEALS = [
  { id: "1,208", type: "Dresser", name: "Mid-century teak dresser", buy: "Classifieds · Portland", sell: "Local resale · Portland", listed: 180, offer: 150, fee: 25, resale: 480, score: 94 },
  { id: "1,209", type: "Espresso machine", name: "Dual-boiler espresso machine", buy: "Marketplace app · Nashville", sell: "Online resale · National", listed: 650, offer: 520, fee: 60, resale: 980, score: 91 },
  { id: "1,210", type: "Film camera", name: "35mm rangefinder camera", buy: "Estate sale · Denver", sell: "Camera forum · National", listed: 140, offer: 110, fee: 22, resale: 320, score: 88 },
  { id: "1,211", type: "Turntable", name: "Direct-drive turntable", buy: "Classifieds · Austin", sell: "Music gear site · National", listed: 300, offer: 240, fee: 35, resale: 520, score: 90 },
  { id: "1,212", type: "Office chair", name: "Ergonomic mesh office chair", buy: "Office clear-out · Atlanta", sell: "Local resale · Atlanta", listed: 220, offer: 160, fee: 40, resale: 560, score: 93 },
];
const money = (n) => "$" + n.toLocaleString("en-US");

function dealCard(d) {
  const el = document.createElement("article");
  el.className = "deal-card";
  el.innerHTML = `
    <div class="dc-bar"><span>Deal #${d.id} — <strong>${d.type}</strong></span><span class="dc-score">Score ${d.score}</span></div>
    <div class="dc-body">
      <div class="dc-side"><p class="dc-lbl">Listed at</p><p class="dc-name">${d.name}</p><p class="dc-where">${d.buy}</p><p class="dc-price">${money(d.listed)}</p></div>
      <div class="dc-arrow" aria-hidden="true">→</div>
      <div class="dc-side"><p class="dc-lbl">Resells for</p><p class="dc-name">${d.name}</p><p class="dc-where">${d.sell}</p><p class="dc-price dc-price--sell">${money(d.resale)}</p></div>
    </div>
    <div class="dc-foot">
      <div class="dc-costs">
        <div><p class="dc-small-lbl">Offer</p><p class="dc-small-val">${money(d.offer)}</p></div>
        <div><p class="dc-small-lbl">Fees</p><p class="dc-small-val">−${money(d.fee)}</p></div>
      </div>
      <div class="dc-profit"><p class="dc-small-lbl">You keep</p><p class="dc-profit-val">+${money(d.resale - d.offer - d.fee)}</p></div>
    </div>`;
  return el;
}

const stack = document.getElementById("dealStack");
if (stack) {
  // Three visible places in line: front, middle, back. Each step back is smaller and higher, so it peeks out above.
  // Spread uses y 12 / -14 / -40, which puts the profit (the punchline) inside the bottom fade; we sit 48px higher,
  // so the profit only touches the very top of the fade (checks.js measures this).
  const SLOTS = [{ scale: 1, y: -36 }, { scale: 0.96, y: -62 }, { scale: 0.92, y: -88 }];
  let cards = [], next = 0, busy = false, timer = null;

  const add = (slot, from) => {
    const c = dealCard(DEALS[next++ % DEALS.length]);
    c.setAttribute("aria-hidden", slot === 0 ? "false" : "true");   // only the front card is read out
    stack.append(c);
    gsap.set(c, { ...(from || SLOTS[slot]), zIndex: 3 - slot });
    return c;
  };
  for (let i = 0; i < 3; i++) cards.push(add(i));

  const cycle = () => {
    if (busy) return;   // ignore clicks while a swap is still running
    busy = true;
    const T = { duration: reduceMotion ? 0 : 0.7, ease: "power2.inOut" };
    const [front, mid, back] = cards;
    gsap.to(front, { y: 380, scale: 1, ...T, onComplete: () => front.remove() });   // drops down behind the fade
    gsap.to(mid, { ...SLOTS[0], zIndex: 3, ...T });
    gsap.to(back, { ...SLOTS[1], zIndex: 2, ...T });
    const fresh = add(2, { scale: 0.88, y: -108, opacity: 0 });   // new card fades in at the very back
    gsap.to(fresh, { ...SLOTS[2], opacity: 1, ...T });
    mid.setAttribute("aria-hidden", "false");
    cards = [mid, back, fresh];
    gsap.delayedCall(T.duration + 0.05, () => (busy = false));
  };

  // Auto-advance every 4s, but only while the stack is on screen (no point animating what nobody sees).
  const start = () => { if (!reduceMotion && !timer) timer = setInterval(cycle, 4000); };
  const stop = () => { clearInterval(timer); timer = null; };
  ScrollTrigger.create({ trigger: stack, start: "top bottom", end: "bottom top", onToggle: (st) => (st.isActive ? start() : stop()) });
  const manual = () => { cycle(); stop(); start(); };   // a click restarts the 4s count
  stack.addEventListener("click", manual);
  stack.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); manual(); } });
}

/* ---------- Stories: quote rotator ---------- */
// One index drives three lists (quote, label, pill). Auto-advances every 5s while on screen;
// clicking a pill jumps there and restarts the 5s count.
const pills = [...document.querySelectorAll(".pill-av")];
if (pills.length) {
  const groups = [pills, [...document.querySelectorAll("#storyQuote p")], [...document.querySelectorAll("#storyRole p")]];
  let at = 0, timer = null;
  const show = (i) => {
    at = i;
    groups.forEach((list) => list.forEach((el, j) => {
      el.classList.toggle("is-on", j === i);
      if (el.tagName === "BUTTON") el.setAttribute("aria-pressed", j === i);
      else el.setAttribute("aria-hidden", j !== i);
    }));
  };
  const start = () => { if (!reduceMotion && !timer) timer = setInterval(() => show((at + 1) % pills.length), 5000); };
  const stop = () => { clearInterval(timer); timer = null; };
  pills.forEach((p, i) => p.addEventListener("click", () => { show(i); stop(); start(); }));
  ScrollTrigger.create({ trigger: "#stories", start: "top bottom", end: "bottom top", onToggle: (st) => (st.isActive ? start() : stop()) });
}

/* ---------- Statement lines ---------- */
// Each line rises 40%, fades in and un-blurs (8px → 0) when it reaches 82% down the screen; line 2 waits 0.25s.
if (!reduceMotion) {
  gsap.utils.toArray(".statement-line > span").forEach((el, i) => {
    gsap.to(el, {
      y: 0, opacity: 1, filter: "blur(0px)", duration: 1.2, ease: "power3.out", delay: i * 0.25,
      scrollTrigger: { trigger: el.parentElement, start: "top 82%" },
    });
  });
}

/* ---------- Control: slide-over + mode switcher ---------- */
// The dark card rises an extra 120px while its top travels from the bottom of the screen to 60% up,
// on top of the -100px overlap from CSS, so it really feels like it's sliding over the statement.
if (!reduceMotion) {
  gsap.from(".control", { y: 120, ease: "none", scrollTrigger: { trigger: ".control", start: "top bottom", end: "top 60%", scrub: true } });
}
const modes = [...document.querySelectorAll(".mode")];
const modeText = [...document.querySelectorAll(".modes-desc p")];
modes.forEach((btn, i) => btn.addEventListener("click", () => {
  modes.forEach((b, j) => { b.classList.toggle("is-on", j === i); b.setAttribute("aria-pressed", j === i); });
  modeText.forEach((p, j) => p.classList.toggle("is-on", j === i));
}));

/* ---------- Niches: pill stagger + search ---------- */
const nicheList = document.getElementById("nicheList");
const nicheSearch = document.getElementById("nicheSearch");
if (nicheList && nicheSearch) {
  const pillsN = [...nicheList.querySelectorAll(".niche")];
  // Pills pop in one after another, 50ms apart, when the list reaches 85% down the screen.
  if (!reduceMotion) {
    ScrollTrigger.create({
      trigger: nicheList, start: "top 85%", once: true,
      onEnter: () => pillsN.forEach((el, i) => setTimeout(() => el.classList.add("is-in"), i * 50)),
    });
  }

  const IDEAS = ["Vintage watches", "Vinyl records", "Film cameras", "Bike parts", "Sneakers", "Mechanical keyboards",
    "Vintage guitars", "Mid-century furniture", "Rare books", "Lego sets", "Vintage clothing", "Golf clubs",
    "Fishing gear", "Board games", "Art prints", "Espresso machines", "Vintage rugs", "Surfboards", "Drones"];
  const input = document.getElementById("nicheInput");
  const suggest = document.getElementById("nicheSuggest");
  const step = (name) => nicheSearch.querySelectorAll(".ns-step").forEach((el) => el.classList.toggle("is-on", el.dataset.step === name));

  // Everything the visitor typed goes in with textContent, never innerHTML, so it can't inject code into the page.
  const choose = (raw) => {
    const name = raw.trim();
    if (name.length < 2) return;
    nicheSearch.querySelector(".ns-busy-title").textContent = `Setting up “${name}”…`;
    nicheSearch.querySelector(".ns-done-title").textContent = `${name} is on your list`;
    step("busy");
    // Loading bar: snap to 0% with no animation, make the browser draw that (reading offsetWidth forces it),
    // then turn the transition back on and set 100% on the next frame, so it fills left to right every time.
    const fill = nicheSearch.querySelector(".ns-fill");
    fill.style.transition = "none";
    fill.style.width = "0%";
    void fill.offsetWidth;
    fill.style.transition = "";
    requestAnimationFrame(() => (fill.style.width = "100%"));
    setTimeout(() => step("done"), reduceMotion ? 300 : 2800);   // 2.5s fill + a short beat at 100%
  };

  const chip = (label, value) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "ns-sug";
    b.textContent = label;
    b.addEventListener("click", () => { input.value = value; choose(value); });
    return b;
  };
  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    suggest.replaceChildren();
    if (q.length < 2) return;
    const hits = IDEAS.filter((n) => n.toLowerCase().includes(q)).slice(0, 4);
    if (hits.length) hits.forEach((n) => suggest.append(chip(n, n)));
    else suggest.append(chip(`Add “${input.value.trim()}”`, input.value));
  });
  document.getElementById("nicheForm").addEventListener("submit", (e) => { e.preventDefault(); choose(input.value); });
  // A pill is a shortcut: it fills the box and runs the same flow (and brings the result into view).
  pillsN.forEach((p) => p.addEventListener("click", () => {
    const name = p.firstChild.textContent.trim();
    input.value = name;
    choose(name);
    nicheSearch.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
  }));
  nicheSearch.querySelector(".ns-again").addEventListener("click", () => {
    input.value = "";
    suggest.replaceChildren();
    step("search");
    input.focus();
  });
}

/* ---------- Pricing: cards rise in 100ms apart ---------- */
if (!reduceMotion && document.getElementById("plans")) {
  ScrollTrigger.create({
    trigger: "#plans", start: "top 85%", once: true,
    onEnter: () => document.querySelectorAll(".plan").forEach((el, i) => setTimeout(() => el.classList.add("is-in"), i * 100)),
  });
}

/* ---------- Photo strip: endless slide ---------- */
// Move the row left by exactly half its width (= one full set) over 40s, forever. The modifier wraps x back into
// 0…-half, so after one set it snaps to 0, invisible because the second set looks exactly like the first.
const strip = document.getElementById("stripTrack");
if (strip && !reduceMotion) {
  let loop;
  const build = () => {
    if (loop) loop.kill();
    gsap.set(strip, { x: 0 });
    const half = strip.scrollWidth / 2;   // re-measured on resize: the photos change size at the breakpoints
    loop = gsap.to(strip, {
      x: -half, duration: 40, ease: "none", repeat: -1,
      modifiers: { x: gsap.utils.unitize((x) => parseFloat(x) % half) },
    });
  };
  build();
  let t;
  addEventListener("resize", () => { clearTimeout(t); t = setTimeout(build, 200); });
  // Only run while it's on screen.
  ScrollTrigger.create({ trigger: "#strip", start: "top bottom", end: "bottom top", onToggle: (st) => loop && (st.isActive ? loop.play() : loop.pause()) });
}

/* ---------- 5. Magnetic buttons (Spread's feel) ---------- */
// Follow the cursor at 20% / 25% with a short ease-out; snap back with an elastic wobble on leave.
// Each move starts a fresh 0.4s tween toward the new target; overwrite: "auto" kills the older one's x/y,
// so tweens never pile up or fight. (GSAP handles the "moving target" problem that CSS transitions can't.)
if (!reduceMotion && matchMedia("(hover: hover) and (pointer: fine)").matches) {
  document.querySelectorAll(".btn").forEach((btn) => {
    btn.addEventListener("pointermove", (e) => {
      const r = btn.getBoundingClientRect();
      const x = gsap.getProperty(btn, "x"), y = gsap.getProperty(btn, "y");   // undo our own offset
      gsap.to(btn, {
        x: (e.clientX - (r.left - x) - r.width / 2) * 0.2,
        y: (e.clientY - (r.top - y) - r.height / 2) * 0.25,
        duration: 0.4, ease: "power2.out", overwrite: "auto",
      });
    });
    btn.addEventListener("pointerleave", () => {
      gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.4)", overwrite: "auto" });
    });
  });
}

// Tally hero — all effects in plain JavaScript (no libraries).

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const smallQuery = matchMedia("(max-width: 860px)");
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- 1. Nav turns to glass once you scroll ---------- */
const nav = document.getElementById("nav");
const updateNav = () => nav.classList.toggle("scrolled", window.scrollY > 10);
updateNav();

/* ---------- 2. Split text into word <span>s so each word can animate on its own ---------- */
// Used twice: the hero headline (blur-in) and the statement (lights up on scroll).
function splitWords(el, cls) {
  const words = [];
  [...el.childNodes].forEach((node) => {
    if (node.nodeType !== Node.TEXT_NODE) return; // keep elements like <br>
    const frag = document.createDocumentFragment();
    node.textContent.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) return frag.append(part);
      const span = document.createElement("span");
      span.className = cls;
      span.textContent = part;
      frag.append(span);
      words.push(span);
    });
    node.replaceWith(frag);
  });
  return words;
}

const heroWords = splitWords(document.querySelector(".hero h1"), "w");
heroWords.forEach((w, i) => w.style.setProperty("--i", i)); // CSS uses --i for the stagger delay

// When the words are done, the paragraph and window follow.
const after = 0.1 + heroWords.length * 0.09 + 0.25;
document.documentElement.style.setProperty("--after", `${after}s`);
if (!reduceMotion) document.documentElement.classList.add("intro");

/* ---------- 3. Scroll effects: window tilt + background parallax ---------- */
const tilt = document.querySelector(".hero-tilt");
const heroWin = document.querySelector(".hero-window");
const hero = document.querySelector(".hero");
const heroBg = document.querySelector(".hero-bg");

// Statement: every word starts dim. Scrolling through the paragraph lights them up in order.
const statement = document.querySelector(".statement");
const statementWords = splitWords(statement, "sw");

function paintStatement() {
  const vh = window.innerHeight;
  const r = statement.getBoundingClientRect();
  // p = 0 when the paragraph's top reaches 85% down the screen,
  // p = 1 when its bottom reaches 45% down the screen.
  const start = vh * 0.85;
  const range = start - (vh * 0.45 - r.height);
  const p = clamp((start - r.top) / range, 0, 1);
  const n = statementWords.length;
  statementWords.forEach((w, i) => {
    // Word i gets its own slice of the progress. "+ 4" means the last word is fully lit before p hits 1.
    const lit = clamp(p * (n + 4) - i, 0, 1);
    w.style.opacity = (0.18 + 0.82 * lit).toFixed(3);   // never below 18%, so it's always readable
  });
}

function onScroll() {
  updateNav();
  if (reduceMotion) return;

  paintStatement();

  // Tilt: fully leaned back at the top of the page (p = 0), flat once the
  // window's center reaches the middle of the screen (p = 1).
  // offsetTop ignores transforms, so the intro animation can't throw the math off.
  const vh = window.innerHeight;
  const winCenter = hero.offsetTop + heroWin.offsetTop + tilt.offsetHeight / 2;
  const distance = winCenter - vh / 2;            // how far we must scroll to center it
  const p = distance > 0 ? clamp(window.scrollY / distance, 0, 1) : 1;
  const t = 1 - p;
  const maxAngle = smallQuery.matches ? 14 : 20;  // a bit gentler on narrow screens
  tilt.style.transform = `rotateX(${(t * maxAngle).toFixed(2)}deg) scale(${(1 - t * 0.06).toFixed(3)})`;

  if (smallQuery.matches) return; // skip parallax on small screens
  // Parallax: background moves slower than the page and fades as the hero scrolls away.
  const q = clamp(window.scrollY / hero.offsetHeight, 0, 1);
  heroBg.style.transform = `translateY(${(q * 30).toFixed(2)}%) scale(1.08)`;
  heroBg.style.opacity = (1 - q * 0.75).toFixed(3);
}

// requestAnimationFrame = do the work at most once per screen refresh (smooth + cheap).
let ticking = false;
window.addEventListener("scroll", () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => { onScroll(); ticking = false; });
}, { passive: true });
window.addEventListener("resize", onScroll);
onScroll();

/* ---------- 4. Typewriter: any window, any lines ---------- */
// Lines are plain text now. tokenize() decides the colors, like a tiny syntax highlighter.
const KEYWORDS = new Set(["prev", "sum", "in", "of", "solve", "sqrt", "mean", "isprime", "c"]);

function tokenize(text, names) {
  if (text.startsWith("# ")) return [["t-head", text]];   // "# " = heading ("#FF8800" is not)
  const tokens = [];
  let rest = text, m;
  if ((m = rest.match(/^([A-Za-z_]\w*) = /))) {         // "rate = $85" → rate becomes a name
    names.add(m[1]);
    tokens.push(["t-kw", m[1]], ["t-op", " = "]);
    rest = rest.slice(m[0].length);
  } else if ((m = rest.match(/^[^:]+:(?= )/))) {        // "Rent:" → a label
    tokens.push(["t-label", m[0]]);
    rest = rest.slice(m[0].length);
  }
  // Split the rest into numbers, words, spaces and single symbols
  // (hex like 0xFF or #FF8800 comes first, so it isn't split into "0" + "xFF")
  for (const part of rest.match(/0x[0-9A-Fa-f]+|#[0-9A-Fa-f]{3,8}\b|\d+(?:,\d{3})*(?:\.\d+)?|[A-Za-z_]\w*|\s+|./g) || []) {
    let cls = "";
    if (/^(\d|#[0-9A-Fa-f])/.test(part)) cls = "t-num";
    else if (/^L\d+$/.test(part) || KEYWORDS.has(part) || names.has(part)) cls = "t-kw";
    else if (/^[A-Za-z_]/.test(part) || /^[$€£¥°%#]$/.test(part)) cls = "t-unit";
    else if (/^[×÷+\-\/^=()*]$/.test(part)) cls = "t-op";
    tokens.push([cls, part]);
  }
  return tokens;
}

function makeRow(body) {
  const row = document.createElement("div");
  row.className = "row";
  const src = document.createElement("span");
  src.className = "src";
  const res = document.createElement("span");
  res.className = "res";
  row.append(src, res);
  body.append(row);
  return { src, res };
}

// Types `lines` ([text, result] pairs) into `body`. Returns a promise that resolves when done.
// `run` is an optional { cancelled } flag: set it to true and the typing stops at its next pause.
async function typeSheet(body, lines, { charDelay = 28, jitter = 40, keepCaret = true, run } = {}) {
  const caret = document.createElement("span");
  caret.className = "caret";
  const names = new Set();
  // Wait, then report whether we've been cancelled in the meantime
  const pause = async (ms) => { if (!reduceMotion) await wait(ms); return run?.cancelled; };
  for (const [text, result] of lines) {
    if (run?.cancelled) return;
    const { src, res } = makeRow(body);
    src.append(caret);                       // the caret hops into each new row
    for (const [cls, piece] of tokenize(text, names)) {
      const span = document.createElement("span");
      if (cls) span.className = cls;
      src.insertBefore(span, caret);
      for (const ch of piece) {
        span.textContent += ch;
        if (await pause(charDelay + Math.random() * jitter)) return; // uneven = human
      }
    }
    if (result) {
      if (await pause(220)) return;
      res.textContent = result;
      res.classList.add("show");
    }
    if (await pause(380)) return;
  }
  if (!keepCaret) caret.remove();
}

// Start (or restart) a named sheet in a window body, cancelling whatever was typing there before.
function playSheet(body, name, opts = {}) {
  if (body._run) body._run.cancelled = true;
  const run = { cancelled: false };
  body._run = run;
  body.textContent = "";
  return typeSheet(body, SHEETS[name], { ...opts, run });
}

/* ---------- 5. The sheets ---------- */
const SHEETS = {
  trip: [
    ["# Tokyo in spring", ""],
    ["Flights: 2 × $940", "$1,880"],
    ["Hotel: 6 nights × ¥18,000", "¥108,000"],
    ["Hotel in dollars: prev in USD", "$720"],
    ["Rail pass: $230", "$230"],
    ["Total: L2 + L4 + L5", "$2,830"],
    ["Each of us: prev / 2", "$1,415"],
  ],
  dev: [
    ["# Dev scratchpad", ""],
    ["0xFF in decimal", "255"],
    ["255 in binary", "0b11111111"],
    ["#FF8800 in rgb", "rgb(255, 136, 0)"],
    ["1.5 GiB in MiB", "1,536 MiB"],
    ["99.9% uptime per month", "43 min 50 s down"],
    ["1700000000 as date", "Nov 14, 2023 22:13 UTC"],
  ],
  hero: [
    ["# Weekend in Lisbon", ""],
    ["Flights: $189 × 2", "$378"],
    ["Hotel: 3 nights × $120", "$360"],
    ["Food: $45 × 3 days", "$135"],
    ["Total: sum", "$873"],
    ["In euros: prev in EUR", "€804.20"],
    ["Each of us: L5 / 2", "$436.50"],
  ],
  money: [
    ["# Monthly budget", ""],
    ["Salary: $5,800", "$5,800"],
    ["Rent: 1,300 EUR in USD", "$1,411.15"],
    ["Subscriptions: $12 + $9.99 + $15", "$36.99"],
    ["Savings: 20% of L2", "$1,160"],
    ["Left: L2 - L3 - L4 - L5", "$3,191.86"],
    ["In euros: prev in EUR", "€2,940.45"],
  ],
  smart: [
    ["# Freelance quote", ""],
    ["rate = $85", "$85"],
    ["hours = 32", "32"],
    ["subtotal = rate × hours", "$2,720"],
    ["total = subtotal - 10%", "$2,448"],
    ["Per week: total / 4", "$612"],
    ["In euros: prev in EUR", "€563.80"],
  ],
  units: [
    ["# Road trip", ""],
    ["Drive: 420 km in miles", "260.98 mi"],
    ["Fuel: L2 / 32 mpg", "8.16 gal"],
    ["Weather: 72 °F in °C", "22.22 °C"],
    ["Flight: 11 h 40 min in min", "700 min"],
    ["Call home: noon UTC in Tokyo", "9:00 pm"],
  ],
  work: [
    ["# Invoice", ""],
    ["Design: 24 h × $90", "$2,160"],
    ["Hosting: $40 × 12", "$480"],
    ["Subtotal: sum", "$2,640"],
    ["Tax: 8% of prev", "$211.20"],
    ["Total: L4 + L5", "$2,851.20"],
    ["Monthly: prev / 12", "$237.60"],
  ],
  study: [
    ["# Physics homework", ""],
    ["solve x^2 - 5x + 6 = 0", "x = 2 or x = 3"],
    ["sqrt(8)", "2√2"],
    ["Speed: 120 km / 1.5 h", "80 km/h"],
    ["mean(4, 8, 15, 16, 23, 42)", "18"],
    ["isprime(97)", "true"],
    ["Light: c × 1 s in km", "299,792.458 km"],
  ],
};

// Hero: start typing after the window has risen into place.
setTimeout(() => typeSheet(document.getElementById("sheet"), SHEETS.hero),
  reduceMotion ? 0 : (after + 1.0) * 1000);

/* ---------- 6. Scroll triggers (IntersectionObserver) ---------- */
// The browser tells us when an element enters the screen. Much cheaper than checking on every scroll.
// (The "js" class is added in <head>, before first paint. See index.html.)

const revealer = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    e.target.classList.add("in");
    revealer.unobserve(e.target);          // animate once, then stop watching
  }
}, { threshold: 0.15 });                   // 15% visible = go
document.querySelectorAll(".reveal").forEach((el) => revealer.observe(el));

// Stagger groups use the same observer: when the group appears it gets .in,
// and each child's --i (its position) sets how long it waits before rising.
document.querySelectorAll(".stagger").forEach((group) => {
  [...group.children].forEach((child, i) => child.style.setProperty("--i", i));
  revealer.observe(group);
});

const typer = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    typer.unobserve(e.target);
    // small delay so the card's fade-in starts first
    setTimeout(() => playSheet(e.target, e.target.dataset.sheet,
      { charDelay: 18, jitter: 30, keepCaret: false }), reduceMotion ? 0 : 350);
  }
}, { threshold: 0.4 });
document.querySelectorAll("[data-sheet]").forEach((el) => typer.observe(el));

/* ---------- 7. Demo tabs: click a tab, the window swaps with a fade + spring ---------- */
const TITLES = { trip: "Tokyo in spring", money: "Monthly budget", work: "Invoice", dev: "Dev scratchpad", study: "Physics homework" };
const tabs = [...document.querySelectorAll(".tab")];
const stageWin = document.querySelector(".stage .win");
const stageBody = stageWin.querySelector(".win-body");
const stageTitle = stageWin.querySelector(".win-title");

const HIDDEN = { opacity: 0, transform: "translateY(10px) scale(0.98)", filter: "blur(4px)" };
const SHOWN  = { opacity: 1, transform: "none", filter: "blur(0px)" };

function mount(name) {
  stageBody.dataset.sheet = name;
  stageTitle.textContent = TITLES[name];
  playSheet(stageBody, name, { charDelay: 16, jitter: 26 });
}

// element.animate() = the browser's built-in animation engine (Web Animations API). No library needed.
async function swapTo(name) {
  stageWin._next = name;               // always remember the LATEST tab clicked
  if (stageWin._swapping) return;      // already mid-swap: it will pick up _next when it gets there
  stageWin._swapping = true;
  if (!reduceMotion) {
    await stageWin.animate([SHOWN, HIDDEN], { duration: 180, easing: "ease-in", fill: "forwards" }).finished;
  }
  mount(stageWin._next);
  if (!reduceMotion) {
    stageWin.animate([HIDDEN, SHOWN], { duration: 650, easing: "cubic-bezier(0.34, 1.35, 0.64, 1)", fill: "forwards" });
  }
  stageWin._swapping = false;
}

tabs.forEach((tab) => tab.addEventListener("click", () => {
  if (tab.classList.contains("active")) return;
  tabs.forEach((t) => {
    const on = t === tab;
    t.classList.toggle("active", on);
    t.setAttribute("aria-selected", on);   // screen readers announce which tab is chosen
  });
  typer.unobserve(stageBody);            // user took over: don't let the scroll trigger restart it
  swapTo(tab.dataset.tab);
}));

/* ---------- 8. AI window: glow "thinks", then answer lines appear one by one ---------- */
const aiBody = document.getElementById("ai-sheet");
const aiWin = aiBody.closest(".ai-win");
const aiLines = [
  ["# split a $90 pizza night with a 15% tip between 3", ""],
  ["bill = $90", "$90"],
  ["amount = bill + 15%", "$103.50"],
  ["amount / 3", "$34.50"],
];

// Build the rows instantly (no typing: the AI "wrote" these), reusing tokenize() for colors.
const aiNames = new Set();
const aiRows = aiLines.map(([text, result], i) => {
  const { src, res } = makeRow(aiBody);
  for (const [cls, piece] of tokenize(text, aiNames)) {
    const span = document.createElement("span");
    if (cls) span.className = cls;
    span.textContent = piece;
    src.append(span);
  }
  res.textContent = result;
  res.classList.add("show");
  const row = src.parentElement;
  if (i > 0) row.classList.add("ai-line");   // the question stays; the answers animate in
  return row;
});

// The follow-up question + "Ask AI" pill
const { src: askSrc, res: askSlot } = makeRow(aiBody);
askSrc.className = "src t-label";
askSrc.textContent = "what is that in euros?";
askSlot.outerHTML = '<span class="ai-ask"><svg viewBox="0 0 24 24"><path d="M12 3c.6 4.2 2.8 6.4 7 7-4.2.6-6.4 2.8-7 7-.6-4.2-2.8-6.4-7-7 4.2-.6 6.4-2.8 7-7z"/></svg>Ask AI</span>';
const askRow = askSrc.parentElement;
askRow.classList.add("ai-line");
const askPill = askRow.querySelector(".ai-ask");

const aiWatcher = new IntersectionObserver(([e]) => {
  if (!e.isIntersecting) return;
  aiWatcher.disconnect();
  if (reduceMotion) return;

  // 1. Glow pulses: on, dim, on, off. Five keyframes = a "breathing" rhythm over 2.6s.
  aiWin.querySelector(".ai-glow").animate(
    [{ opacity: 0 }, { opacity: 1 }, { opacity: 0.35 }, { opacity: 1 }, { opacity: 0 }],
    { duration: 2600, easing: "ease-in-out" });

  // 2. Answer lines rise in one by one as the glow finishes. fill "both" = hold the
  //    hidden start state during the delay and the visible end state afterwards.
  [...aiRows.slice(1), askRow].forEach((row, i) => row.animate(
    [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }],
    { duration: 500, delay: 2200 + i * 160, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "both" }));

  // 3. "Ask AI" pulses forever: a 1.4s pulse then ~3s of rest. The API has no "pause between
  //    loops" option, so the rest is built INTO the keyframes (offsets = fraction of 4.4s).
  askPill.animate(
    [{ transform: "scale(1)", offset: 0 },
     { transform: "scale(1.07)", offset: 0.16 },
     { transform: "scale(1)", offset: 0.32 },
     { transform: "scale(1)", offset: 1 }],
    { duration: 4400, delay: 3400, iterations: Infinity, easing: "ease-in-out" });
}, { threshold: 0.5 });
aiWatcher.observe(aiWin);

/* ---------- 9. Pricing: count-up prices + mouse-follow glow ---------- */
// Prices: the HTML holds the real price (so it's right without JS). We reset to $0.00,
// then count up once the card is on screen.
const priceEls = [...document.querySelectorAll(".price-num")];
const easeOut = (t) => 1 - Math.pow(1 - t, 3);   // fast start, gentle stop

function countUp(el) {
  const target = parseFloat(el.dataset.value);
  const start = performance.now();
  const step = (now) => {
    const t = Math.min((now - start) / 1300, 1);      // 0 → 1 over 1.3s
    el.textContent = `$${(target * easeOut(t)).toFixed(2)}`;
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

if (!reduceMotion) {
  priceEls.forEach((el) => { el.textContent = "$0.00"; });
  const priceWatcher = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      priceWatcher.unobserve(e.target);
      countUp(e.target);
    }
  }, { threshold: 0.6 });
  priceEls.forEach((el) => priceWatcher.observe(el));
}

// Glow: only for real mice/trackpads (a finger has no "hover").
if (matchMedia("(hover: hover) and (pointer: fine)").matches) {
  document.querySelectorAll(".plan.glow").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      // mouse position RELATIVE to the card, handed to CSS as two variables
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });
}

/* ---------- 10. Magnetic buttons: lean toward a nearby cursor ---------- */
// One pointermove listener stores the cursor. A per-frame loop then:
//  1. works out each button's TARGET offset, measured from where the button sits WITHOUT
//     its lean (measuring the leaned position caused a feedback loop: lean → closer → smaller lean → ...)
//  2. moves the button toward that target with a tiny spring simulation (speed + friction).
//     A spring keeps its momentum when the target changes; a CSS transition restarts every
//     time, which made the buttons stutter while the mouse moved.
if (!reduceMotion && matchMedia("(hover: hover) and (pointer: fine)").matches) {
  const magnets = [...document.querySelectorAll(".pill.magnet")].map((el) => ({ el, x: 0, y: 0, vx: 0, vy: 0 }));
  const STIFFNESS = 0.12;   // how hard the spring pulls toward the target
  const FRICTION = 0.72;    // how much speed survives each frame (lower = less bounce)
  let mx = -9999, my = -9999, running = false;

  const tick = () => {
    let moving = false;
    for (const m of magnets) {
      const r = m.el.getBoundingClientRect();
      // the button's resting center = where it is now, minus the lean we applied
      const cx = r.left + r.width / 2 - m.x;
      const cy = r.top + r.height / 2 - m.y;
      const dx = mx - cx, dy = my - cy;
      const reach = Math.max(r.width, r.height) / 2 + 60;
      const near = Math.hypot(dx, dy) < reach;
      const tx = near ? dx * 0.28 : 0;
      const ty = near ? dy * 0.38 : 0;

      // spring step: accelerate toward the target, lose some speed to friction, move
      m.vx = (m.vx + (tx - m.x) * STIFFNESS) * FRICTION;
      m.vy = (m.vy + (ty - m.y) * STIFFNESS) * FRICTION;
      m.x += m.vx;
      m.y += m.vy;
      m.el.style.setProperty("--tx", `${m.x.toFixed(2)}px`);
      m.el.style.setProperty("--ty", `${m.y.toFixed(2)}px`);

      if (Math.abs(tx - m.x) > 0.05 || Math.abs(ty - m.y) > 0.05 || Math.abs(m.vx) > 0.05 || Math.abs(m.vy) > 0.05) moving = true;
    }
    // keep looping only while something is still moving: no wasted frames once settled
    running = moving;
    if (moving) requestAnimationFrame(tick);
  };

  const wake = () => { if (!running) { running = true; requestAnimationFrame(tick); } };
  addEventListener("pointermove", (e) => { mx = e.clientX; my = e.clientY; wake(); }, { passive: true });
  addEventListener("scroll", wake, { passive: true });   // buttons move under a still cursor when you scroll
}

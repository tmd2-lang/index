/* Fictional production activity: a camera visits nearby cards, without dragging. */
(() => {
  const section = document.querySelector('.production-section');
  const viewport = section.querySelector('.activity-viewport');
  const world = section.querySelector('.activity-world');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const clock = new ServiceTimeline();
  const annualClock = new ServiceTimeline();
  let sectionVisible = false;
  const families = ['orders', 'contacts', 'products', 'tasks', 'invoices', 'events', 'shipments', 'files', 'customers', 'records', 'payments', 'comments', 'items', 'catalogs', 'addresses'];
  const symbols = [
    '<path d="M5 7h14v12H5zM8 7V4h8v3M9 12h6"/>',
    '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
    '<path d="m12 3 9 5-9 5-9-5zM3 8v9l9 5 9-5V8M12 13v9"/>',
    '<path d="m5 12 4 4L20 5M5 21h14"/>',
    '<path d="M6 3h12v19l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"/>',
    '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l4 2"/>'
  ];
  const colors = ['#65bed3', '#ed9b70', '#89a3ee', '#91bc8c', '#ae94d0', '#4eafbe'];
  const cards = [];
  let active = 44;
  let recent = [active];
  let started = false;
  let visible = false;
  let apiCalls = 1864502318;

  /* Reels retain a readable full number while decorative digits roll. */
  function setNumber(element, value, animate = true) {
    const formatted = Number(value).toLocaleString('en-US');
    element.setAttribute('aria-label', formatted);
    if (element.classList.contains('annual-api-counter')) {
      element.closest('a').setAttribute('aria-label', `${formatted} API calls — breakdown`);
    }
    const previous = element.dataset.value;
    if (previous === formatted) return;
    element.dataset.value = formatted;
    if (!previous || previous.length !== formatted.length) {
      element.innerHTML = '';
      for (const character of formatted) {
        if (character === ',') {
          const comma = document.createElement('span');
          comma.textContent = ',';
          comma.setAttribute('aria-hidden', 'true');
          element.append(comma);
          continue;
        }
        const digit = document.createElement('span');
        digit.className = 'reel-digit';
        digit.setAttribute('aria-hidden', 'true');
        const strip = document.createElement('span');
        strip.className = 'reel-strip';
        for (let index = 0; index < 30; index++) {
          const row = document.createElement('span');
          row.textContent = String(index % 10);
          strip.append(row);
        }
        strip.style.transform = `translateY(-${Number(character)}em)`;
        digit.append(strip);
        element.append(digit);
      }
      return;
    }
    [...element.children].forEach((digit, index) => {
      if (!digit.classList.contains('reel-digit')) return;
      const strip = digit.firstElementChild;
      const oldValue = Number(previous[index]);
      const newValue = Number(formatted[index]);
      if (oldValue === newValue) return;
      strip.style.transition = 'none';
      strip.style.transform = `translateY(-${oldValue}em)`;
      strip.getBoundingClientRect();
      strip.style.transition = animate && !motion.matches ? '' : 'none';
      strip.style.transform = `translateY(-${10 + newValue}em)`;
    });
  }

  /* Different card widths follow their actual label and timestamp lengths. */
  const measure = document.createElement('canvas').getContext('2d');
  measure.font = '14px -apple-system, BlinkMacSystemFont, Arial, sans-serif';
  for (let row = 0; row < 10; row++) {
    let left = 220 + (row % 2 ? 165 : 0);
    for (let column = 0; column < 10; column++) {
      const index = row * 10 + column;
      const count = 14 + (index * 19) % 91;
      const label = `${families[index % families.length]} ${index % 3 ? 'updated' : 'created'}`;
      const time = ['2m ago', '14m ago', '38m ago', '1h ago', '3h ago'][index % 5];
      const width = Math.ceil(144 + measure.measureText(`${count} ${label}`).width);
      const frame = document.createElement('div');
      frame.className = 'activity-frame';
      frame.style.cssText = `left:${left}px;top:${92 + row * 84}px;width:${width}px;--symbol-color:${colors[index % colors.length]}`;
      frame.innerHTML = `<div class="activity-card"><span class="activity-badge"><svg viewBox="0 0 24 24">${symbols[index % symbols.length]}</svg></span><div class="activity-content"><p class="activity-label"><span class="number-reel activity-count"></span> ${label}</p><span class="activity-time">${time}</span></div></div>`;
      world.append(frame);
      const counter = frame.querySelector('.activity-count');
      setNumber(counter, count, false);
      cards.push({ frame, counter, count, x: left, y: 92 + row * 84, width, row, column, firedAt: null });
      left += width + 16;
    }
  }

  function positionCamera(animate = true) {
    const card = cards[active];
    const x = Math.min(0, Math.max(viewport.clientWidth - 4200, viewport.clientWidth / 2 - card.x - card.width / 2));
    const y = Math.min(0, Math.max(viewport.clientHeight - 1008, viewport.clientHeight / 2 - card.y - 34));
    world.style.transition = animate && !motion.matches ? '' : 'none';
    world.style.transform = `translate(${x}px, ${y}px)`;
  }

  function selectCard(index, animate = true) {
    cards[active].frame.classList.remove('is-active');
    active = index;
    cards[active].frame.classList.add('is-active');
    positionCamera(animate);
  }

  async function visitCards() {
    if (!await clock.wait(400)) return;
    while (await clock.wait(3000)) {
      const current = cards[active];
      let candidates = cards.map((card, index) => ({ card, index })).filter(({ card, index }) =>
        index !== active && Math.abs(card.row - current.row) === 2 && Math.abs(card.column - current.column) <= 1 && !recent.includes(index)
      );
      if (!candidates.length) candidates = cards.map((card, index) => ({ card, index })).filter(({ index }) => index !== active);
      const next = candidates[Math.floor(Math.random() * candidates.length)].index;
      recent = [...recent, next].slice(-5);
      selectCard(next);
    }
  }

  async function updateActivity() {
    while (await clock.wait(500 + Math.random() * 1000)) {
      const candidates = cards.filter(card => Math.abs(card.row - cards[active].row) <= 2 && Math.abs(card.column - cards[active].column) <= 1);
      const card = candidates[Math.floor(Math.random() * candidates.length)];
      card.count += 1 + Math.floor(Math.random() * 4);
      card.firedAt = Date.now();
      card.frame.querySelector('.activity-time').textContent = '1s ago';
      setNumber(card.counter, card.count);
    }
  }

  async function updateAnnualCounter() {
    const api = section.querySelector('.annual-api-counter');
    while (await annualClock.wait(1000)) {
      apiCalls += 537;
      setNumber(api, apiCalls);
      for (const card of cards) {
        if (!card.firedAt) continue;
        const seconds = Math.max(1, Math.floor((Date.now() - card.firedAt) / 1000));
        card.frame.querySelector('.activity-time').textContent = seconds < 60 ? `${seconds}s ago` : `${Math.floor(seconds / 60)}m ago`;
      }
    }
  }

  function syncPause() {
    const paused = !visible || document.hidden || !planningBackdrop.hidden || motion.matches;
    clock.setPaused(paused);
    annualClock.setPaused(!sectionVisible || document.hidden || !planningBackdrop.hidden || motion.matches);
    section.classList.toggle('is-paused', paused);
  }

  /* Resize preserves the selected card; motion runs only while the field is visible. */
  selectCard(active, false);
  setNumber(section.querySelector('.annual-api-counter'), apiCalls, false);
  new ResizeObserver(() => positionCamera(false)).observe(viewport);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting && entry.intersectionRatio >= .35;
    syncPause();
    if (!visible || started) return;
    started = true;
    visitCards();
    updateActivity();
  }, { threshold: [0, .35] }).observe(viewport);
  let annualStarted = false;
  new IntersectionObserver(([entry]) => {
    sectionVisible = entry.isIntersecting;
    syncPause();
    if (!sectionVisible || annualStarted) return;
    annualStarted = true;
    updateAnnualCounter();
  }).observe(section);
  document.addEventListener('visibilitychange', syncPause);
  motion.addEventListener('change', syncPause);
  new MutationObserver(syncPause).observe(planningBackdrop, { attributes: true, attributeFilter: ['hidden'] });
  syncPause();

  // Only automated comparison previews need space beyond the unfinished page.
  if (new URLSearchParams(location.search).get('capture') === '1') {
    const spacer = document.createElement('div');
    spacer.setAttribute('aria-hidden', 'true');
    spacer.style.height = '100vh';
    section.closest('main').after(spacer);
  }
})();

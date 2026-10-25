// Shared navigation content.
const products = [
  ['Full-Service Integrations', 'Custom integrations, built and managed for you', 'layers'],
  ['Loom Integration Builder', 'Build and automate integrations visually', 'flow'],
  ['Weave', 'Automate work with AI', 'weave'],
  ['Universal API', 'Connect to 400+ apps through one API', 'api']
];

const menus = {
  products,
  resources: [
    ['Blog', "Threadline’s low-code workflow platform", 'blog'],
    ['Changelog', 'Stay up to date with everything', 'changelog']
  ],
  docsProducts: [
    ['Weave Documentation', 'Give yourself superpowers', 'weave'],
    ['Loom Documentation', "Threadline’s low-code workflow platform", 'flow'],
    ['Embedded Documentation', 'White-labeled integrations directly in your product', 'layers']
  ],
  docsApi: [
    ['Universal API', 'Connect to 400+ apps', 'api'],
    ['Threadline API', 'Manage platform resources', 'flow']
  ],
  mobileProducts: products
};

// Decorative dropdown icons.
const drawings = {
  layers: '<path d="m6 12 14-8 14 8-14 8Zm0 8 14 8 14-8M6 28l14 8 14-8"/>',
  flow: '<rect x="4" y="6" width="24" height="9" rx="3"/><rect x="12" y="25" width="24" height="9" rx="3"/><path d="M28 10h4c7 0 7 11 0 11H8c-7 0-7 9 1 9" stroke-dasharray="2 2" fill="none"/>',
  weave: '<path d="M8 28V12a4 4 0 0 1 8 0v16a4 4 0 0 0 8 0V12a4 4 0 0 1 8 0v16" fill="none"/>',
  api: '<path d="M17 5h6v9l8-5 3 5-8 5 8 5-3 5-8-5v11h-6V24l-8 5-3-5 8-5-8-5 3-5 8 5Z"/>',
  blog: '<rect x="7" y="5" width="26" height="30" rx="3"/><path d="M12 12h16M12 18h16M12 24h11"/>',
  changelog: '<path d="M11 6h21v28H11M8 12H4m4 8H4m4 8H4m12-15h11m-11 7h11m-11 7h7" fill="none"/>'
};

// Build desktop dropdowns and the mobile product list from the same content.
for (const el of document.querySelectorAll('[data-menu]')) {
  const mobile = el.dataset.menu === 'mobileProducts';
  const rows = menus[el.dataset.menu]
    .map(([title, description, icon]) => `<a href="#" class="${mobile ? 'mobile-product' : 'menu-row'}">${mobile ? '' : `<span class="menu-icon" aria-hidden="true"><svg viewBox="0 0 40 40">${drawings[icon]}</svg></span>`}<span class="menu-text"><span class="menu-title">${title}</span><span class="menu-description">${description}</span></span></a>`)
    .join('');

  el.innerHTML = el.classList.contains('menu-panel')
    ? `<div class="menu-inner">${rows}</div>`
    : rows;
}

// Unbuilt destinations remain inert while retaining the approved href="#".
document.addEventListener('click', event => {
  if (event.target.closest('a[href="#"]')) event.preventDefault();
});

// Mobile navigation overlay and product accordion.
const header = document.querySelector('.site-header');
const menuToggle = document.querySelector('.menu-toggle');
const mobileMenu = document.querySelector('.mobile-menu');

function setMenu(open) {
  header.classList.toggle('menu-open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
  mobileMenu.inert = !open;
  document.body.style.overflow = open ? 'hidden' : '';

  if (open) document.querySelector('.menu-close').focus();
  else menuToggle.focus();
}

menuToggle.addEventListener('click', () => {
  setMenu(!header.classList.contains('menu-open'));
});

document.querySelector('.menu-close').addEventListener('click', () => {
  setMenu(false);
});

const mobileProducts = document.querySelector('.mobile-products-toggle');

mobileProducts.addEventListener('click', () => {
  const open = mobileProducts.getAttribute('aria-expanded') !== 'true';
  mobileProducts.setAttribute('aria-expanded', String(open));

  const panel = document.querySelector('.mobile-products-wrap');
  panel.classList.toggle('open', open);
  panel.inert = !open;
});

// Desktop dropdown hover and keyboard state.
for (const shell of document.querySelectorAll('.menu-shell')) {
  const button = shell.querySelector('button');
  const setExpanded = value => button?.setAttribute('aria-expanded', String(value));

  shell.addEventListener('mouseenter', () => setExpanded(true));
  shell.addEventListener('mouseleave', () => setExpanded(false));
  shell.addEventListener('focusin', () => setExpanded(true));
  shell.addEventListener('focusout', event => {
    if (!shell.contains(event.relatedTarget)) setExpanded(false);
  });
  button?.addEventListener('click', () => setExpanded(true));
}

// Escape dismissal and keyboard focus inside the mobile overlay.
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    if (header.classList.contains('menu-open')) setMenu(false);
    else document.activeElement.blur();
  }

  if (event.key === 'Tab' && header.classList.contains('menu-open')) {
    const items = [...mobileMenu.querySelectorAll('button,a')]
      .filter(el => !el.closest('[inert]'));

    if (event.shiftKey && document.activeElement === items[0]) {
      event.preventDefault();
      items.at(-1).focus();
    } else if (!event.shiftKey && document.activeElement === items.at(-1)) {
      event.preventDefault();
      items[0].focus();
    }
  }
});

// Header surface changes and returning from mobile to desktop.
function updateHeader() {
  header.classList.toggle('scrolled', scrollY > 8);
  header.classList.toggle('on-light', scrollY > 640);
}

addEventListener('scroll', updateHeader, { passive: true });
updateHeader();

addEventListener('resize', () => {
  if (innerWidth > 768 && header.classList.contains('menu-open')) setMenu(false);
});

// Measure the input without a height transition, then animate its surrounding box.
const input = document.querySelector('.prompt-input');
const form = document.querySelector('.prompt-form');

function resizeInput() {
  input.style.transition = 'none';
  input.style.height = '24.6154px';

  const lines = Math.min(3, Math.max(1, Math.round(input.scrollHeight / 24.6154)));
  input.style.height = `${lines * 24.6154}px`;
  input.style.marginBottom = `${-lines * 4.61538}px`;
  input.style.overflowY = input.scrollHeight > 75 ? 'auto' : 'hidden';
  input.getBoundingClientRect();
  input.style.transition = '';
  form.style.height = `${76 + (lines - 1) * 20}px`;
}

input.addEventListener('input', resizeInput);
addEventListener('resize', resizeInput);

// The hero opens the planning dialog; its draft becomes the user's first message.
form.addEventListener('submit', event => {
  event.preventDefault();
  const draft = input.value.trim();
  openPlanning();
  if (draft) {
    appendUserMessage(planningMessages, draft);
    input.value = '';
    resizeInput();
  }
});

input.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});


// Planning dialog: local conversation and an empty plan, with no generated replies.
const planningBackdrop = document.querySelector('.planning-backdrop');
const planningDialog = document.querySelector('.planning-dialog');
const planningMessages = document.querySelector('.planning-messages');
const planningForm = document.querySelector('.planning-composer');
const planningInput = document.querySelector('#planning-message');
const planToggle = document.querySelector('.mobile-plan-toggle');
const planContent = document.querySelector('.plan-content');
let planningReturnFocus = null;

function appendUserMessage(container, text) {
  const message = document.createElement('p');
  message.className = 'user-message';
  message.textContent = text;
  container.append(message);
  container.scrollTop = container.scrollHeight;
}

function setPlanExpanded(expanded) {
  planToggle.setAttribute('aria-expanded', String(expanded));
  planningDialog.classList.toggle('plan-expanded', expanded);
  syncPlanAccess();
}

function syncPlanAccess() {
  planContent.inert = innerWidth <= 821 && planToggle.getAttribute('aria-expanded') !== 'true';
}

function openPlanning() {
  planningReturnFocus = document.activeElement;
  planningBackdrop.hidden = false;
  document.body.style.overflow = 'hidden';
  syncPlanAccess();
  planningInput.focus({ preventScroll: true });
}

function closePlanning() {
  planningBackdrop.hidden = true;
  document.body.style.overflow = header.classList.contains('menu-open') ? 'hidden' : '';
  planningReturnFocus?.focus({ preventScroll: true });
}

function updateComposer(textarea, button) {
  textarea.style.height = 'auto';
  textarea.style.height = `${Math.min(textarea.scrollHeight, 100)}px`;
  button.disabled = !textarea.value.trim();
}

planningInput.addEventListener('input', () => {
  updateComposer(planningInput, planningForm.querySelector('button'));
});

planningForm.addEventListener('submit', event => {
  event.preventDefault();
  const message = planningInput.value.trim();
  if (!message) return;
  appendUserMessage(planningMessages, message);
  planningInput.value = '';
  updateComposer(planningInput, planningForm.querySelector('button'));
  planningInput.focus();
});

planningInput.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    planningForm.requestSubmit();
  }
});

planToggle.addEventListener('click', () => {
  setPlanExpanded(planToggle.getAttribute('aria-expanded') !== 'true');
});

document.querySelector('.planning-close').addEventListener('click', closePlanning);
planningBackdrop.addEventListener('click', event => {
  if (event.target === planningBackdrop) closePlanning();
});

document.querySelector('.planning-reset').addEventListener('click', () => {
  planningMessages.querySelectorAll('.user-message').forEach(message => message.remove());
  planningInput.value = '';
  updateComposer(planningInput, planningForm.querySelector('button'));
  document.querySelectorAll('.plan-choices button').forEach((button, index) => {
    button.setAttribute('aria-pressed', String(index === 0));
  });
  setPlanExpanded(false);
  planningInput.focus();
});

for (const button of document.querySelectorAll('.plan-choices button')) {
  button.addEventListener('click', () => {
    document.querySelectorAll('.plan-choices button').forEach(choice => {
      choice.setAttribute('aria-pressed', String(choice === button));
    });
  });
}

addEventListener('resize', syncPlanAccess);

// Support chat stays local and displays only the visitor's own submitted content.
const supportLauncher = document.querySelector('.support-launcher');
const supportChat = document.querySelector('.support-chat');
const supportForm = document.querySelector('.support-composer');
const supportInput = document.querySelector('#support-message');
const supportMessages = document.querySelector('.support-messages');
const supportFile = document.querySelector('#support-file');
const attachmentLabel = document.querySelector('.support-attachment');
const supportSend = document.querySelector('.support-send');

function setSupport(open) {
  supportChat.hidden = !open;
  supportLauncher.setAttribute('aria-expanded', String(open));
  supportLauncher.setAttribute('aria-label', open ? 'Close support chat' : 'Open support chat');
  if (open) supportInput.focus({ preventScroll: true });
  else supportLauncher.focus({ preventScroll: true });
}

function updateSupportComposer() {
  updateComposer(supportInput, supportSend);
  supportSend.disabled = !supportInput.value.trim() && !supportFile.files.length;
}

supportLauncher.addEventListener('click', () => setSupport(supportChat.hidden));
document.querySelector('.support-close').addEventListener('click', () => setSupport(false));
document.querySelector('.support-expand').addEventListener('click', event => {
  const expanded = !supportChat.classList.contains('expanded');
  supportChat.classList.toggle('expanded', expanded);
  event.currentTarget.setAttribute('aria-pressed', String(expanded));
  event.currentTarget.setAttribute('aria-label', expanded ? 'Restore support chat' : 'Expand support chat');
});

supportInput.addEventListener('input', updateSupportComposer);
supportFile.addEventListener('change', () => {
  attachmentLabel.textContent = supportFile.files[0]?.name || '';
  attachmentLabel.hidden = !supportFile.files.length;
  updateSupportComposer();
});

supportForm.addEventListener('submit', event => {
  event.preventDefault();
  const text = supportInput.value.trim();
  const fileName = supportFile.files[0]?.name;
  if (!text && !fileName) return;
  appendUserMessage(supportMessages, [text, fileName].filter(Boolean).join('\n'));
  supportInput.value = '';
  supportFile.value = '';
  attachmentLabel.hidden = true;
  attachmentLabel.textContent = '';
  updateSupportComposer();
  supportInput.focus();
});

supportInput.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    supportForm.requestSubmit();
  }
});

// Keep keyboard focus inside the active conversation and restore it on close.
document.addEventListener('keydown', event => {
  const activeDialog = !supportChat.hidden ? supportChat : !planningBackdrop.hidden ? planningDialog : null;
  if (!activeDialog) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    if (!supportChat.hidden) setSupport(false);
    else closePlanning();
  }
  if (event.key === 'Tab') {
    const controls = [...activeDialog.querySelectorAll('button,textarea,input')]
      .filter(control => !control.disabled && !control.closest('[inert]') && control.getClientRects().length);
    if (event.shiftKey && document.activeElement === controls[0]) {
      event.preventDefault();
      controls.at(-1).focus();
    } else if (!event.shiftKey && document.activeElement === controls.at(-1)) {
      event.preventDefault();
      controls[0].focus();
    }
  }
});

// Direct local preview states let capture.mjs inspect overlays without automation clicks.
const previewView = new URLSearchParams(location.search).get('view');
if (previewView === 'planning' || previewView === 'planning-expanded') {
  openPlanning();
  if (previewView === 'planning-expanded') setPlanExpanded(true);
} else if (previewView === 'support') {
  setSupport(true);
}

// Fictional proof marks preserve the reference's varied widths and proportions.
const customerMarks = [
  { name: 'Valehaven', width: 126, height: 22, style: 'bold' },
  { name: 'Briarmere', width: 111, height: 16, style: 'plain' },
  { name: 'Northora', width: 105, height: 24, style: 'caps' },
  { name: 'Willowden', width: 88, height: 27, style: 'serif-label' },
  { name: 'marden.', width: 84, height: 15, style: 'bold' },
  { name: 'Mera', width: 53, height: 28, style: 'rounded' },
  { name: 'oakmere', width: 72, height: 22, style: 'bold' },
  { name: 'ellin', width: 86, height: 17, style: 'dots' },
  { name: 'Cedarway', width: 92, height: 22, style: 'plain' },
  { name: 'Fieldmere', width: 102, height: 17, style: 'bold' },
  { name: 'Wyndale', width: 60, height: 23, style: 'caps' },
  { name: 'Ternvale', width: 96, height: 19, style: 'wide' },
  { name: 'Alderden', width: 90, height: 15, style: 'bold' },
  { name: 'Ashmere', width: 96, height: 12, style: 'bold' },
  { name: 'Mossvale', width: 86, height: 16, style: 'bold' },
  { name: 'VYRN', width: 52, height: 20, style: 'boxed' }
];

function customerMarkSvg(mark) {
  const serif = mark.style === 'serif-label';
  const boxed = mark.style === 'boxed';
  const dots = mark.style === 'dots';
  const inset = dots ? 20 : boxed ? 4 : 0;
  const y = serif ? mark.height * .6 : mark.height * .82;
  const size = serif ? 16 : mark.height * .95;
  const label = mark.style === 'caps' || serif ? mark.name.toUpperCase() : mark.name;
  const decoration = dots
    ? '<circle cx="5" cy="5" r="3" fill="currentColor"/><circle cx="5" cy="13" r="3" fill="currentColor"/><circle cx="13" cy="9" r="3" fill="currentColor"/>'
    : boxed ? `<rect x="1" y="1" width="${mark.width - 2}" height="${mark.height - 2}" fill="none" stroke="currentColor" stroke-width="1.5"/>` : '';
  const subtitle = serif
    ? `<rect y="${mark.height - 9}" width="${mark.width}" height="9" fill="currentColor"/><text x="3" y="${mark.height - 2}" fill="#f7f8f7" font-size="6" font-family="Georgia,serif" textLength="${mark.width - 6}" lengthAdjust="spacingAndGlyphs">Industrial supplies</text>`
    : '';
  const weight = ['bold', 'caps', 'boxed'].includes(mark.style) ? '700' : '400';
  const family = serif ? 'Georgia,serif' : 'Roobert,Arial,sans-serif';
  return `<svg class="customer-mark" style="--logo-width:${mark.width}px" viewBox="0 0 ${mark.width} ${mark.height}" role="img" aria-label="${mark.name}" focusable="false">${decoration}<text x="${inset}" y="${y}" fill="currentColor" font-family="${family}" font-size="${size}" font-weight="${weight}" textLength="${mark.width - inset - (boxed ? 4 : 0)}" lengthAdjust="spacingAndGlyphs">${label}</text>${subtitle}</svg>`;
}

const customerStrip = document.querySelector('.customer-strip');
const desktopCustomerList = document.querySelector('.customer-desktop-list');
const mobileCustomerTrack = document.querySelector('.customer-mobile-track');
const customerSlots = customerMarks.map(mark => {
  const item = document.createElement('li');
  item.className = 'customer-logo-slot';
  item.style.setProperty('--logo-width', `${mark.width}px`);
  item.innerHTML = customerMarkSvg(mark);
  desktopCustomerList.append(item);
  return item;
});

for (let repeat = 0; repeat < 2; repeat++) {
  const list = document.createElement('ul');
  list.className = 'customer-mobile-list';
  if (repeat) list.setAttribute('aria-hidden', 'true');
  else list.setAttribute('aria-label', 'Customer companies');
  for (const mark of customerMarks) {
    const item = document.createElement('li');
    item.innerHTML = customerMarkSvg(mark);
    list.append(item);
  }
  mobileCustomerTrack.append(list);
}

// Advance five desktop slots; keep a hidden buffer ready for each incoming mark.
let customerStep = 0;
let customerTimer;
let customersInView = true;
const customerMotion = matchMedia('(prefers-reduced-motion: reduce)');
const customerDesktop = matchMedia('(min-width: 769px)');

function layoutCustomerMarks() {
  const count = customerMarks.length;
  const scale = Number.parseFloat(getComputedStyle(customerStrip).getPropertyValue('--logo-scale'));
  const visible = Array.from({ length: 5 }, (_, offset) => (customerStep + offset) % count);
  const widths = visible.map(index => customerMarks[index].width * scale);
  const gap = Math.max(24, (desktopCustomerList.clientWidth - widths.reduce((sum, width) => sum + width, 0)) / 4);
  const positions = [];
  widths.forEach((width, index) => {
    positions.push(index ? positions[index - 1] + widths[index - 1] + gap : 0);
  });
  const previous = (customerStep - 1 + count) % count;
  const buffer = (customerStep + 5) % count;
  customerSlots.forEach((slot, index) => {
    const position = visible.indexOf(index);
    const active = position >= 0;
    slot.hidden = !active && index !== previous && index !== buffer;
    slot.setAttribute('aria-hidden', String(!active));
    slot.classList.toggle('is-exiting', index === previous);
    slot.classList.toggle('is-buffer', index === buffer);
    slot.classList.toggle('is-entering', position === 4);
    const x = index === previous
      ? -(customerMarks[index].width * scale + gap)
      : index === buffer ? positions[4] + widths[4] + gap : positions[position] || 0;
    slot.style.setProperty('--logo-x', `${x}px`);
  });
}

function queueCustomerStep(delay = 3120) {
  clearTimeout(customerTimer);
  const paused = document.hidden || !customersInView || !planningBackdrop.hidden;
  customerStrip.classList.toggle('is-paused', paused);
  if (paused || customerMotion.matches || !customerDesktop.matches) return;
  customerTimer = setTimeout(() => {
    customerStep = (customerStep + 1) % customerMarks.length;
    layoutCustomerMarks();
    queueCustomerStep();
  }, delay);
}

new ResizeObserver(() => {
  layoutCustomerMarks();
  queueCustomerStep(650);
}).observe(desktopCustomerList);

new IntersectionObserver(([entry]) => {
  customersInView = entry.isIntersecting;
  queueCustomerStep(650);
}, { threshold: .12 }).observe(customerStrip);

new MutationObserver(() => queueCustomerStep(650))
  .observe(planningBackdrop, { attributes: true, attributeFilter: ['hidden'] });

document.addEventListener('visibilitychange', () => queueCustomerStep(650));
customerMotion.addEventListener('change', () => queueCustomerStep(650));
customerDesktop.addEventListener('change', () => {
  layoutCustomerMarks();
  queueCustomerStep(650);
});
layoutCustomerMarks();
queueCustomerStep(900);

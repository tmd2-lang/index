// Process copy and fictional team identities share the same tab order.
const serviceStages = {
  requirements: {
    person: 'Alex Rowan',
    initials: 'AR',
    role: 'Chief Revenue Officer',
    lead: 'Integration work usually begins with a business process, rather than a finished spec.',
    body: 'Our solutions engineers clarify the details, ask the questions that matter, and turn your context into a practical build plan.'
  },
  build: {
    person: 'Dana Mercer',
    initials: 'DM',
    role: 'Integration Engineer',
    lead: 'With the plan agreed, our integration engineers build your workflow on Threadline’s enterprise platform.',
    body: 'Each step is checked against real business rules, so the result behaves the way your team needs.'
  },
  launch: {
    person: 'Jules Reed',
    initials: 'JR',
    role: 'Operations Engineer',
    lead: 'We launch alongside your team, with a clear plan.',
    body: 'Together we test, go live carefully, and hand monitoring, support, and long-term reliability to our operations team, so you always have someone to call as your workflows grow.'
  }
};

// These are prewritten product-demo turns, separate from the user-only live-style chats.
const serviceConversation = [
  ['engineer', 'Which workflow would you like to connect?'],
  ['customer', 'We need our NetSuite customers, products, and wholesale pricing in Shopify.'],
  ['engineer', 'Understood. NetSuite holds the data, and Shopify needs it for your B2B shop.'],
  ['engineer', 'Is this one-way from NetSuite, or should changes in Shopify come back too?'],
  ['customer', 'One-way to start. We can handle orders in a separate workflow later.'],
  ['engineer', 'I’ll scope customers, catalog items, and pricing. Order sync will stay separate.'],
  ['status', 'NetSuite'],
  ['engineer', 'Your NetSuite sample has around 3,800 customer records.'],
  ['engineer', 'One buyer is Jamie Ellis at Fieldmere Supply, jamie.ellis@example.com.'],
  ['engineer', 'Are these wholesale buyers needing company accounts, or retail customers?'],
  ['customer', 'Wholesale buyers. We’re creating a Shopify B2B shop for existing customers.'],
  ['engineer', 'We’ll create the Shopify customer profiles and connect each buyer to their company location.'],
  ['engineer', 'How soon should updated customers and prices appear in Shopify?'],
  ['customer', 'Within ten minutes. Buyers need current pricing when they place orders.'],
  ['engineer', 'Let’s plan a five-minute cycle, then check it against your volume and Shopify API limits.'],
  ['engineer', 'Should we load your existing customers and catalog before the ongoing sync starts?'],
  ['customer', 'Yes. Move customers, products, and wholesale prices first, then keep them in sync.'],
  ['engineer', 'We’ll plan a weekend migration followed by updates to new and changed records.'],
  ['engineer', 'Can we use Jamie’s email for the first match? Does every buyer have a unique email?'],
  ['customer', 'Yes, every buyer has a separate email address.'],
  ['engineer', 'I’ll look for an existing Shopify customer first. Multiple matches will go to review.'],
  ['engineer', 'If a customer disappears from NetSuite, should their Shopify account be deleted?'],
  ['customer', 'No. Leave Shopify accounts in place and stop updating inactive records.'],
  ['engineer', 'We’ll preserve the account and skip inactive records on future runs.'],
  ['engineer', 'Should NetSuite replace every mapped field, including the catalog prices?'],
  ['customer', 'Keep Shopify’s email and phone. NetSuite should own product details and wholesale prices.'],
  ['engineer', 'Email and phone only fill empty fields. Product details and pricing follow NetSuite; consent stays untouched.'],
  ['engineer', 'What should happen when Shopify rejects a customer or price update?'],
  ['customer', 'Skip invalid records and notify Slack. Retry temporary errors up to three times.'],
  ['engineer', 'Temporary failures will retry. Invalid records go to review with their IDs and error details.'],
  ['engineer', 'Are there records that should never enter the sync?'],
  ['customer', 'Exclude test addresses ending in @test.example.com and inactive customers or products.'],
  ['engineer', 'Those records won’t create new writes. Existing Shopify records remain as they are.'],
  ['engineer', 'What should happen if someone changes their email in NetSuite?'],
  ['engineer', 'We can save the NetSuite record ID in a Shopify customer field and retain the Shopify ID mapping.'],
  ['customer', 'That works. Our administrator can prepare the field.'],
  ['engineer', 'Once matched, saved IDs keep an email change from creating a duplicate customer.'],
  ['engineer', 'To recap: customers, products, and wholesale prices move to Shopify with protected contact fields, ID matching, filters, and alerts.'],
  ['engineer', 'Next we’ll check product SKUs, catalog assignments, currencies, and the customer ID field.'],
  ['customer', 'Products match by SKU. Wholesale prices belong in the B2B catalog for each company location.'],
  ['engineer', 'Fieldmere Supply’s location mapping is set. We’ll also check that the Shopify plan supports its catalog.'],
  ['customer', 'Great. Could you show us how one synced record would look?']
];

const serviceSection = document.querySelector('.service-section');
const serviceDemo = document.querySelector('.service-demo');
const serviceScene = document.querySelector('.service-scene');
const serviceTabList = document.querySelector('.service-tab-list');
const serviceTabs = [...document.querySelectorAll('.service-tab')];
const serviceIndicator = document.querySelector('.service-tab-indicator');
const serviceMotionPreference = matchMedia('(prefers-reduced-motion: reduce)');
let serviceStage = 'requirements';
let serviceStarted = false;
let serviceRun = null;

// Every scene owns its pending waits, so switching tabs cancels the complete old timeline.
class ServiceTimeline {
  constructor() {
    this.jobs = new Set();
    this.cancelled = false;
    this.paused = false;
  }

  wait(duration) {
    if (this.cancelled) return Promise.resolve(false);
    return new Promise(resolve => {
      const job = { remaining: duration, resolve, timer: null, started: 0 };
      this.jobs.add(job);
      if (!this.paused) this.arm(job);
    });
  }

  arm(job) {
    job.started = performance.now();
    job.timer = setTimeout(() => {
      this.jobs.delete(job);
      job.resolve(!this.cancelled);
    }, job.remaining);
  }

  setPaused(paused) {
    if (paused === this.paused || this.cancelled) return;
    this.paused = paused;
    for (const job of this.jobs) {
      if (paused) {
        clearTimeout(job.timer);
        job.remaining = Math.max(0, job.remaining - (performance.now() - job.started));
      } else {
        this.arm(job);
      }
    }
  }

  cancel() {
    this.cancelled = true;
    for (const job of this.jobs) {
      clearTimeout(job.timer);
      job.resolve(false);
    }
    this.jobs.clear();
  }
}

function positionServiceIndicator() {
  const selected = serviceTabs.find(tab => tab.dataset.stage === serviceStage);
  const row = serviceTabList.getBoundingClientRect();
  const box = selected.getBoundingClientRect();
  serviceIndicator.style.width = `${box.width}px`;
  serviceIndicator.style.transform = `translateX(${box.left - row.left}px)`;
  serviceSection.style.setProperty('--pattern-start', `${row.bottom - serviceSection.getBoundingClientRect().top}px`);
}

function appendServiceTurn(messages, role, text) {
  const row = document.createElement('div');
  row.className = `service-chat-row${role === 'customer' ? ' from-customer' : ''}`;
  const bubble = document.createElement('div');
  bubble.className = 'service-chat-bubble';
  bubble.textContent = text;
  row.append(bubble);
  messages.append(row);
  while (messages.children.length > 18) messages.firstElementChild.remove();
  messages.scrollTo({ top: messages.scrollHeight, behavior: serviceMotionPreference.matches ? 'instant' : 'smooth' });
  messages.closest('.service-chat').classList.toggle('has-scrolled', messages.scrollHeight > messages.clientHeight);
}

function serviceChatMarkup() {
  return `<div class="service-chat"><div class="service-chat-messages"></div><div class="service-chat-composer-shell"><div class="service-chat-composer"><span class="service-chat-placeholder">Start typing...</span><span class="service-chat-draft"></span><span class="service-chat-arrow"><svg viewBox="0 0 24 24"><path d="M12 19V5m-7 7 7-7 7 7"/></svg></span></div></div></div>`;
}

async function playServiceConversation(clock) {
  const messages = serviceScene.querySelector('.service-chat-messages');
  const draft = serviceScene.querySelector('.service-chat-draft');
  const placeholder = serviceScene.querySelector('.service-chat-placeholder');
  const arrow = serviceScene.querySelector('.service-chat-arrow');
  if (serviceMotionPreference.matches) {
    serviceConversation.slice(0, 4).forEach(([role, text]) => appendServiceTurn(messages, role, text));
    return;
  }
  while (!clock.cancelled) {
    messages.replaceChildren();
    messages.closest('.service-chat').classList.remove('has-scrolled');
    if (!await clock.wait(760)) return;
    for (const [role, text] of serviceConversation) {
      if (role === 'customer') {
        placeholder.hidden = true;
        const chunk = text.length > 110 ? 4 : text.length > 68 ? 3 : 2;
        for (let offset = chunk; offset < text.length + chunk; offset += chunk) {
          draft.textContent = text.slice(0, offset);
          const character = draft.textContent.at(-1);
          const delay = '.?!'.includes(character) ? 180 : ',;:'.includes(character) ? 90 : 18;
          if (!await clock.wait(delay + Math.random() * 18)) return;
        }
        if (!await clock.wait(40)) return;
        arrow.classList.add('is-pressed');
        if (!await clock.wait(150)) return;
        arrow.classList.remove('is-pressed');
        draft.textContent = '';
        placeholder.hidden = false;
        appendServiceTurn(messages, role, text);
      } else {
        if (!await clock.wait(620 + Math.random() * 140)) return;
        if (role === 'status') {
          const row = document.createElement('div');
          row.className = 'service-chat-row';
          row.innerHTML = '<span class="service-chat-status"><span class="service-status-dot"></span><span class="service-status-copy"></span></span>';
          row.querySelector('.service-status-copy').textContent = `Connecting to ${text}…`;
          messages.append(row);
          messages.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' });
          if (!await clock.wait(1250)) return;
          row.querySelector('.service-chat-status').classList.add('is-connected');
          row.querySelector('.service-status-copy').textContent = `Connected to ${text}`;
        } else {
          appendServiceTurn(messages, role, text);
        }
      }
      if (!await clock.wait(980 + Math.random() * 220)) return;
    }
    if (!await clock.wait(1600)) return;
  }
}

// The branch diagram is native text, SVG rails, and timed node states.
function serviceBuildMarkup() {
  const steps = ['Every 5 minutes', 'Prepare NetSuite data', 'Locate Shopify customer', 'If a customer exists', 'Update their record', 'Create a customer', 'Record completion'];
  const delays = [.5, 1.47, 2.23, 2.98, 3.75, 4.51, 5.25];
  const rows = steps.map((label, index) => {
    const child = index === 4 || index === 5;
    const branch = child ? '<svg class="service-build-branch" viewBox="0 0 38 42"><path d="M1 1V26Q1 42 17 42H23"/><path class="branch-lit" d="M1 1V26Q1 42 17 42H23"/></svg>' : '';
    const lightning = index === 0 ? '<svg viewBox="0 0 16 16"><path d="M9 1 3 9h4l-1 6 7-9H9Z"/></svg>' : '';
    return `<div class="service-build-step${child ? ' is-child' : ''}${index === 0 ? ' is-trigger' : ''}" style="--step-delay:${delays[index]}s">${branch}<span class="service-build-node">${lightning}</span><span>${label}</span></div>`;
  }).join('');
  return `<div class="service-build"><div class="service-build-status"><span class="service-status-dot"></span><span class="service-build-status-copy">Generating workflow...</span></div><div class="service-build-tree"><span class="service-build-rail"></span><span class="service-build-rail-fill"></span>${rows}</div></div>`;
}

async function playServiceBuild(clock) {
  if (!serviceMotionPreference.matches && !await clock.wait(6000)) return;
  const status = serviceScene.querySelector('.service-build-status');
  status.classList.add('is-ready');
  status.querySelector('.service-status-dot').textContent = '✓';
  status.querySelector('.service-build-status-copy').textContent = 'Workflow ready';
}

// Fictional dashboard data keeps the reference's bar composition and KPI formatting.
const serviceBarHeights = [50, 60, 61, 25, 43, 30, 52, 64, 17, 67, 32, 41, 16, 45, 13, 19, 48, 38, 30, 64, 35, 61, 12, 15, 64, 26, 40];

function serviceMonitorMarkup() {
  const rows = ['Move NetSuite customers to Shopify', 'Refresh Shopify products and pricing', 'Match buyers with company locations'];
  return `<div class="service-monitor"><div class="service-monitor-eyebrow">Workflow monitoring</div><div class="service-monitor-stats">${['Failures', 'Interrupts', 'Cancellations'].map(label => `<div class="service-monitor-stat"><span class="service-monitor-stat-label">${label}</span><span class="service-monitor-value">0.0%</span></div>`).join('')}</div><div class="service-monitor-chart"><div class="service-monitor-chart-title">Workflow runs</div><div class="service-monitor-plot"><div class="service-monitor-axis"><span>140</span><span>0</span></div><div class="service-monitor-bars">${serviceBarHeights.map(height => `<span class="service-monitor-bar" style="--bar-height:${height}px"></span>`).join('')}</div></div></div><div class="service-monitor-workflows">${rows.map((text, index) => `<div class="service-monitor-workflow"><span class="service-monitor-rank">${index + 1}</span><span>${text}</span></div>`).join('')}</div></div>`;
}

function highlightServiceBar(index, pulse) {
  serviceScene.querySelectorAll('.service-monitor-bar').forEach((bar, position) => {
    bar.classList.toggle('is-highlighted', position === index);
  });
  const proportion = serviceBarHeights[index] / 67;
  const values = [(.3 + 1.4 * proportion).toFixed(1), (.1 + .6 * proportion).toFixed(1), '0.0'];
  serviceScene.querySelectorAll('.service-monitor-value').forEach((element, position) => {
    element.textContent = `${values[position]}%`;
    element.classList.remove('is-pulsing');
    if (pulse) {
      element.getBoundingClientRect();
      element.classList.add('is-pulsing');
    }
  });
}

async function playServiceMonitor(clock) {
  highlightServiceBar(9, false);
  if (serviceMotionPreference.matches) return;
  let previous = 9;
  for (let turn = 0; turn < 5; turn++) {
    if (!await clock.wait(turn === 0 ? 600 : 2580)) return;
    serviceScene.querySelector('.is-highlighted')?.classList.remove('is-highlighted');
    if (!await clock.wait(220)) return;
    const options = serviceBarHeights.map((_, index) => index).filter(index => Math.abs(index - previous) >= 6);
    const next = turn === 4 ? 9 : options[Math.floor(Math.random() * options.length)];
    highlightServiceBar(next, true);
    previous = next;
  }
}

function mountServiceScene(stage) {
  const data = serviceStages[stage];
  serviceDemo.querySelector('.service-avatar').textContent = data.initials;
  serviceDemo.querySelector('.service-person').textContent = data.person;
  serviceDemo.querySelector('.service-role').textContent = data.role;
  serviceScene.innerHTML = stage === 'build' ? serviceBuildMarkup() : stage === 'launch' ? serviceMonitorMarkup() : serviceChatMarkup();
}

function syncServicePause() {
  const paused = document.hidden || !planningBackdrop.hidden;
  serviceSection.classList.toggle('is-paused', paused);
  serviceRun?.setPaused(paused);
}

async function selectServiceStage(stage, transition = true) {
  serviceStage = stage;
  serviceRun?.cancel();
  const clock = new ServiceTimeline();
  serviceRun = clock;
  syncServicePause();
  serviceTabs.forEach(tab => tab.setAttribute('aria-selected', String(tab.dataset.stage === stage)));
  const data = serviceStages[stage];
  document.querySelector('.service-tab-lead').textContent = data.lead;
  document.querySelector('.service-tab-body').textContent = data.body;
  document.querySelector('.service-tab-description').setAttribute('aria-labelledby', `service-tab-${stage}`);
  positionServiceIndicator();
  if (transition && !serviceMotionPreference.matches) {
    serviceDemo.classList.add('is-exiting');
    if (!await clock.wait(180)) return;
  }
  serviceDemo.classList.remove('is-exiting');
  serviceDemo.classList.add('is-entering');
  mountServiceScene(stage);
  if (serviceStarted) {
    if (stage === 'requirements') playServiceConversation(clock);
    else if (stage === 'build') playServiceBuild(clock);
    else playServiceMonitor(clock);
  }
  if (!await clock.wait(serviceMotionPreference.matches ? 0 : 260)) return;
  serviceDemo.classList.remove('is-entering');
}

serviceTabs.forEach(tab => tab.addEventListener('click', () => {
  if (serviceStarted && serviceStage === tab.dataset.stage) return;
  serviceStarted = true;
  selectServiceStage(tab.dataset.stage);
}));

new ResizeObserver(positionServiceIndicator).observe(serviceTabList);
new ResizeObserver(positionServiceIndicator).observe(serviceSection);
addEventListener('resize', positionServiceIndicator);
document.fonts.ready.then(positionServiceIndicator);
document.addEventListener('visibilitychange', syncServicePause);
new MutationObserver(syncServicePause).observe(planningBackdrop, { attributes: true, attributeFilter: ['hidden'] });
serviceMotionPreference.addEventListener('change', () => selectServiceStage(serviceStage, false));

mountServiceScene(serviceStage);
positionServiceIndicator();
const serviceObserver = new IntersectionObserver(([entry]) => {
  if (!entry.isIntersecting || serviceStarted) return;
  serviceStarted = true;
  serviceSection.classList.add('is-visible');
  selectServiceStage(serviceStage, false);
  serviceObserver.disconnect();
}, { threshold: .3 });
serviceObserver.observe(serviceSection);

// Capture previews open a specific tab locally; they never interact with a live service.
const servicePreview = new URLSearchParams(location.search).get('service');
if (serviceStages[servicePreview]) {
  serviceStarted = true;
  serviceSection.classList.add('is-visible');
  selectServiceStage(servicePreview, false);
}

// Each entry points to an existing rebuild; the library never changes those pages.
const sites = [
  {
    id: 'ratio',
    name: 'Ratio',
    brand: 'Tally',
    path: '../01-ratio/',
    reference: 'https://useratio.app/',
    category: 'saas',
    label: 'SaaS',
    description: 'A calm, dark canvas for everyday math.',
    tags: ['Dark', 'Product demo', 'Minimal'],
    image: 'shots/ratio/ref/y00000.jpg',
    date: '2026-10-21',
    summary: 'A note-style calculator, rebuilt as Tally. Quiet typography, a landscape that fades into the page, and a product window that does the explaining.',
    lessons: ['Show the product working before asking someone to understand it.', 'Use a small color palette and generous space to make a dark page feel calm.', 'Let each section answer the visitor’s next question.']
  },
  {
    id: 'spread',
    name: 'Spread',
    brand: 'Flipside',
    path: '../02-spread/',
    reference: 'https://joinspread.app/',
    category: 'lifestyle',
    label: 'Lifestyle',
    description: 'An editorial take on finding the next opportunity.',
    tags: ['Photography', 'Scroll motion', 'Editorial'],
    image: 'shots/spread/ref/y00000.jpg',
    date: '2026-10-21',
    summary: 'A marketplace discovery tool, rebuilt as Flipside. Warm photography and moving compositions give a practical money tool the feeling of a lifestyle brand.',
    lessons: ['Photography can carry the atmosphere of an entire page.', 'Short, parallel headlines make a long story easy to follow.', 'Test resizing after the page loads: motion has to adapt with the layout.']
  },
  {
    id: 'scriptrunner',
    name: 'Script Runner',
    brand: 'Dosedrop',
    path: '../04-scriptrunner/',
    reference: 'https://scriptrunner.ai/',
    category: 'healthcare',
    label: 'Healthcare',
    description: 'Clinical clarity with an unexpected orange streak.',
    tags: ['Light', '3D details', 'Scroll motion'],
    image: 'shots/scriptrunner/ref/y00000.jpg',
    date: '2026-10-22',
    summary: 'A pharmacy delivery platform, rebuilt as Dosedrop. A soft video opening leads into stacked cards, playful pill-shaped figures, and a bright orange finale.',
    lessons: ['Save a strong accent color for the moments you want people to remember.', 'Connect visual ideas to the product: pharmacy figures become capsules.', 'A footer reveal can make the end of the page feel like a deliberate moment.']
  },
  {
    id: 'mindcloud',
    name: 'Mindcloud',
    brand: 'Threadline',
    path: '../05-mindcloud/',
    reference: 'https://mindcloud.co/',
    category: 'saas',
    label: 'SaaS',
    description: 'Complex workflows, made clear and approachable.',
    tags: ['Product demo', 'Interactive', 'Light & dark'],
    image: 'shots/mindcloud/ref/y00000.jpg',
    date: '2026-10-24',
    summary: 'A managed automation service, rebuilt as Threadline. Live interface scenes, alternating light and dark sections, and a shared visual rhythm make a complex service easier to grasp.',
    lessons: ['Let the section order explain the service one question at a time.', 'Stop old animations when someone switches tabs so interactions stay clear.', 'Shared type, spacing, and a consistent logo tie varied sections together.']
  }
];

// Saving is deliberately local: no account or server is needed.
const storageKey = 'index-saved-sites-v1';
let saved = new Set();
try {
  const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
  if (Array.isArray(stored)) {
    saved = new Set(stored.filter(id => sites.some(site => site.id === id)));
  }
} catch {
  // Browsing still works when storage is unavailable or contains invalid data.
}
let category = 'all';
let view = 'all';
const grid = document.querySelector('#siteGrid');
const search = document.querySelector('#search');
const sort = document.querySelector('#sort');
const detail = document.querySelector('#detail');
const bookmark = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4.5h12v16l-6-4-6 4z"/></svg>';

function saveButton(site) {
  const active = saved.has(site.id);
  return `<button class="save" data-save="${site.id}" aria-pressed="${active}" aria-label="${active ? 'Unsave' : 'Save'} ${site.name}">${bookmark}</button>`;
}

function card(site) {
  return `<article class="site-card" data-site="${site.id}">
    <div class="preview-wrap">
      <button class="preview-open" data-open="${site.id}" aria-label="Explore ${site.name}">
        <img src="${site.image}" alt="The ${site.brand} homepage, our rebuild of ${site.name}" width="1440" height="1000">
        <span class="preview-label">Take a closer look ↗</span>
      </button>
      ${saveButton(site)}
    </div>
    <div class="card-heading"><button class="card-name" data-open="${site.id}">${site.name}<span>${site.brand}</span></button><a class="visit" href="${site.path}" target="_blank" rel="noopener" aria-label="Open the ${site.name} rebuild in a new tab">↗</a></div>
    <p class="card-description">${site.description}</p>
    <div class="tags"><span class="tag">${site.label}</span>${site.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>
  </article>`;
}

// Search, categories, saved view, and sorting compose into one collection.
function render() {
  const query = search.value.toLowerCase().trim();
  const matching = sites.filter(site => {
    const words = [site.name, site.brand, site.description, site.label, ...site.tags].join(' ').toLowerCase();
    return (category === 'all' || site.category === category)
      && (view === 'all' || saved.has(site.id))
      && words.includes(query);
  });
  if (sort.value === 'newest') {
    matching.sort((a, b) => b.date.localeCompare(a.date));
  } else if (sort.value === 'az') {
    matching.sort((a, b) => a.name.localeCompare(b.name));
  }
  grid.innerHTML = matching.map(card).join('');
  document.querySelector('#savedCount').textContent = saved.size;
  document.querySelector('#resultCount').textContent = matching.length === sites.length && view === 'all'
    ? 'Showing all 4 sites'
    : `${matching.length} ${view === 'saved' ? 'saved ' : ''}${matching.length === 1 ? 'site' : 'sites'}`;
  document.querySelector('#empty').hidden = matching.length !== 0;
  const noSaves = view === 'saved' && saved.size === 0;
  document.querySelector('#emptyTitle').textContent = noSaves ? 'Keep the ones that catch your eye.' : 'No sites found.';
  document.querySelector('#emptyMessage').textContent = noSaves
    ? 'Tap the bookmark on any site to keep it here. Saved on this browser.'
    : 'Try another search or a different category.';
  document.querySelectorAll('[data-category]').forEach(button => {
    const active = button.dataset.category === category;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active);
  });
  document.querySelectorAll('[data-view]').forEach(button => {
    const active = button.dataset.view === view;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active);
  });
}

// Details give the preview context without loading four live pages at once.
function openDetail(id) {
  const site = sites.find(item => item.id === id);
  if (!site) return;
  document.querySelector('#detailContent').innerHTML = `
    <img class="detail-image" src="${site.image}" alt="${site.brand} homepage preview" width="1440" height="1000">
    <div class="detail-body">
      <div><h2 id="detailTitle">${site.name}</h2><div class="tags"><span class="tag">Rebuilt as ${site.brand}</span>${site.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div><p>${site.summary}</p><div class="detail-actions"><a class="button" href="${site.path}" target="_blank" rel="noopener">Explore rebuild <span aria-hidden="true">↗</span></a><a class="reference-link" href="${site.reference}" target="_blank" rel="noopener">Original inspiration ↗</a></div></div>
      <div><h3>WHAT THIS SITE TAUGHT US</h3><ul>${site.lessons.map(lesson => `<li>${lesson}</li>`).join('')}</ul></div>
    </div>`;
  detail.showModal();
}

// Delegated actions remain stable when filters replace the cards.
document.addEventListener('click', event => {
  const save = event.target.closest('[data-save]');
  if (save) {
    const id = save.dataset.save;
    if (saved.has(id)) saved.delete(id);
    else saved.add(id);
    try {
      localStorage.setItem(storageKey, JSON.stringify([...saved]));
    } catch {
      // Keep the current session’s selection even if browser storage is blocked.
    }
    render();
    const replacement = grid.querySelector(`[data-save="${id}"]`);
    if (replacement) replacement.focus({ preventScroll: true });
    else document.querySelector('[data-view="saved"]').focus({ preventScroll: true });
    return;
  }
  const open = event.target.closest('[data-open]');
  if (open) openDetail(open.dataset.open);
  const filter = event.target.closest('[data-category]');
  if (filter) {
    category = filter.dataset.category;
    render();
  }
  const navigation = event.target.closest('[data-view]');
  if (navigation) {
    view = navigation.dataset.view;
    category = 'all';
    search.value = '';
    render();
  }
});
search.addEventListener('input', render);
sort.addEventListener('change', render);
document.querySelector('#reset').addEventListener('click', () => {
  category = 'all';
  view = 'all';
  search.value = '';
  render();
});
document.querySelector('#closeDetail').addEventListener('click', () => detail.close());
detail.addEventListener('click', event => {
  if (event.target !== detail) return;
  const bounds = detail.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) detail.close();
});
document.addEventListener('keydown', event => {
  const editing = event.target.closest('input, textarea, select, [contenteditable="true"]');
  if (event.key === '/' && !editing && !detail.open && !event.metaKey && !event.ctrlKey && !event.altKey) {
    event.preventDefault();
    search.focus();
  }
});
render();

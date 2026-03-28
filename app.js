// === CSV Parser ===
function parseCSV(text) {
  const rows = [];
  let i = 0;
  while (i < text.length) {
    const row = [];
    while (i < text.length) {
      if (text[i] === '"') {
        i++; // skip opening quote
        let field = '';
        while (i < text.length) {
          if (text[i] === '"') {
            if (text[i + 1] === '"') {
              field += '"';
              i += 2;
            } else {
              i++; // skip closing quote
              break;
            }
          } else {
            field += text[i++];
          }
        }
        row.push(field);
        if (i < text.length && text[i] === ',') i++;
        else if (i < text.length && (text[i] === '\n' || text[i] === '\r')) {
          if (text[i] === '\r' && text[i + 1] === '\n') i += 2; else i++;
          break;
        }
      } else {
        let field = '';
        while (i < text.length && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') {
          field += text[i++];
        }
        row.push(field);
        if (i < text.length && text[i] === ',') i++;
        else {
          if (i < text.length && text[i] === '\r' && text[i + 1] === '\n') i += 2;
          else if (i < text.length) i++;
          break;
        }
      }
    }
    if (row.length > 1 || (row.length === 1 && row[0] !== '')) rows.push(row);
  }
  return rows;
}

function csvToObjects(text) {
  const rows = parseCSV(text);
  const headers = rows[0];
  const keyMap = {
    'name': 'name', 'sourcer': 'sourcer', 'brand': 'sourcer', 'type': 'type', 'origin': 'origin',
    'theme': 'theme', 'daytime': 'daytime', 'temp': 'temp', 'brew': 'brew',
    'quantity': 'quantity', 'repurchase?': 'repurchase', 'collection': 'collection',
    'since': 'since', 'description': 'description', 'additives': 'additives',
    'aroma notes': 'aromaNotes'
  };
  return rows.slice(1).map((row, idx) => {
    const obj = { id: idx };
    headers.forEach((h, i) => {
      obj[keyMap[h.trim().toLowerCase()] || h.trim()] = (row[i] || '').trim();
    });
    // Normalize categorical fields to title-case
    for (const f of ['quantity', 'daytime', 'collection']) {
      if (obj[f]) obj[f] = obj[f].charAt(0).toUpperCase() + obj[f].slice(1).toLowerCase();
    }
    obj.slug = slugify(obj.name);
    return obj;
  });
}

function slugify(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// === Data ===
const resp = await fetch('teas.csv');
const teas = csvToObjects(await resp.text());

function findBySlug(slug) {
  return teas.find(t => t.slug === slug);
}

// === Helpers ===
const isChristmas = t => (t.theme || '').toLowerCase().includes('christmas');
const isSpecials = t => (t.theme || '').toLowerCase().startsWith('specials');
const isInStock = t => t.quantity !== 'Empty';

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 11) return 'Morning';
  if (h < 17) return 'Day';
  return 'Evening';
}

function badgeColor(type) {
  const t = type.toLowerCase();
  if (t.includes('matcha')) return 'var(--badge-matcha)';
  if (t.includes('black') || t.includes('red')) return 'var(--badge-black)';
  if (t.includes('green')) return 'var(--badge-green)';
  if (t.includes('oolong') || t.includes('blue')) return 'var(--badge-oolong)';
  if (t.includes('white')) return 'var(--badge-white)';
  if (t.includes('infusion')) return 'var(--badge-infusion)';
  if (t.includes('yellow')) return 'var(--badge-yellow)';
  return 'var(--accent)';
}

function quantityDots(q) {
  const counts = { 'Full': 4, 'Half': 2, 'Quarter': 1, 'Empty': 0 };
  const filled = counts[q] ?? 0;
  return Array.from({ length: 4 }, (_, i) =>
    `<span class="quantity-dot${i >= filled ? ' empty' : ''}"></span>`
  ).join('');
}

function validOrigin(t) {
  const o = t.origin;
  return o && o !== '/' && o !== 'n.a.' ? o : '';
}

function teaDetailsHTML(t, { showBrand = true } = {}) {
  return `<dl class="tea-details">
    ${t.temp ? `<div><dt>Temperature</dt><dd>${t.temp}</dd></div>` : ''}
    ${t.brew ? `<div><dt>Brew time</dt><dd>${t.brew}</dd></div>` : ''}
    ${t.quantity ? `<div><dt>Stock</dt><dd><span class="quantity-dots">${quantityDots(t.quantity)}</span></dd></div>` : ''}
    ${t.aromaNotes ? `<div><dt>Aroma notes</dt><dd>${t.aromaNotes}</dd></div>` : ''}
    ${showBrand && t.sourcer ? `<div><dt>Brand</dt><dd>${t.sourcer}</dd></div>` : ''}
    ${t.theme ? `<div><dt>Theme</dt><dd>${t.theme}</dd></div>` : ''}
  </dl>`;
}

function teaWeight(t) {
  let w = 1;
  const c = (t.collection || '').toLowerCase();
  if (c.includes('testing')) w += 3;
  else if (c.includes('range')) w += 2;
  else if (c.includes('core')) w += 1;
  if (t.quantity === 'Full') w += 1;
  return w;
}

function weightedRandom(arr) {
  const total = arr.reduce((s, t) => s + teaWeight(t), 0);
  let r = Math.random() * total;
  for (const t of arr) {
    r -= teaWeight(t);
    if (r <= 0) return t;
  }
  return arr[arr.length - 1];
}

// === Recommend View ===
const shownSet = new Set();
let currentFeatured = null;
let currentView = 'recommend';

function getEligible() {
  const tod = getTimeOfDay();
  const showXmas = document.getElementById('toggle-christmas').checked;
  const showSpec = document.getElementById('toggle-specials').checked;
  return teas.filter(t => {
    if (!isInStock(t)) return false;
    if (t.daytime && t.daytime !== 'Day' && t.daytime !== tod) return false;
    if (isChristmas(t) && !showXmas) return false;
    if (isSpecials(t) && !showSpec) return false;
    return true;
  });
}

function renderFeaturedCard(tea) {
  if (!tea) {
    document.getElementById('featured-card').innerHTML = '<p class="empty-msg">No teas available for this time of day.</p>';
    return;
  }
  const origin = validOrigin(tea);
  document.getElementById('featured-card').innerHTML = `
    <h2 class="tea-name">${tea.name}</h2>
    <div class="tea-meta">
      <span class="badge" style="background:${badgeColor(tea.type)}">${tea.type}</span>
      ${origin ? `<span class="tea-origin">${origin}</span>` : ''}
      ${tea.sourcer ? `<span class="tea-sourcer">· ${tea.sourcer}</span>` : ''}
    </div>
    <p class="tea-description">${tea.description}</p>
    ${teaDetailsHTML(tea, { showBrand: false })}
  `;
}

function renderAlternatives(eligible, featured) {
  const heading = document.getElementById('alternatives-heading');
  const grid = document.getElementById('alternatives');
  if (eligible.length === 0) {
    heading.hidden = true;
    grid.innerHTML = '';
    return;
  }
  heading.hidden = false;
  grid.innerHTML = eligible.map(t => `
    <div class="alt-card${t.id === featured?.id ? ' alt-selected' : ''}" data-id="${t.id}">
      <span class="badge" style="background:${badgeColor(t.type)}">${t.type.split(' ')[0]}</span>
      <div class="alt-info">
        <div class="alt-name">${t.name}</div>
        <div class="alt-sub">${t.aromaNotes || t.origin || ''}</div>
      </div>
    </div>
  `).join('');
}

function promoteToFeatured(tea) {
  currentFeatured = tea;
  shownSet.add(tea.id);
  renderFeaturedCard(tea);
  const grid = document.getElementById('alternatives');
  grid.querySelector('.alt-selected')?.classList.remove('alt-selected');
  grid.querySelector(`[data-id="${tea.id}"]`)?.classList.add('alt-selected');
  setHash({ view: 'recommend', tea: tea.slug }, true);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function clearRecommend() {
  renderFeaturedCard(null);
  document.getElementById('alternatives-heading').hidden = true;
  document.getElementById('alternatives').innerHTML = '';
}

function suggestAnother() {
  const eligible = getEligible();
  const unseen = eligible.filter(t => !shownSet.has(t.id));
  if (unseen.length === 0) shownSet.clear();
  const pool = unseen.length > 0 ? unseen : eligible;
  if (pool.length === 0) {
    clearRecommend();
    return;
  }
  const pick = weightedRandom(pool);
  promoteToFeatured(pick);
}

function initRecommend(tea) {
  // Auto-enable Christmas in December
  if (new Date().getMonth() === 11) {
    document.getElementById('toggle-christmas').checked = true;
  }
  shownSet.clear();
  if (tea) {
    currentFeatured = tea;
    shownSet.add(tea.id);
    renderFeaturedCard(tea);
    renderAlternatives(getEligible(), tea);
    setHash({ view: 'recommend', tea: tea.slug });
  } else {
    const eligible = getEligible();
    if (eligible.length === 0) {
      clearRecommend();
    } else {
      const pick = weightedRandom(eligible);
      currentFeatured = pick;
      shownSet.add(pick.id);
      renderFeaturedCard(pick);
      renderAlternatives(eligible, pick);
      setHash({ view: 'recommend', tea: pick.slug });
    }
  }
}

document.getElementById('suggest-btn').addEventListener('click', suggestAnother);
function onToggleChange() {
  shownSet.clear();
  renderAlternatives(getEligible(), currentFeatured);
}
document.getElementById('toggle-christmas').addEventListener('change', onToggleChange);
document.getElementById('toggle-specials').addEventListener('change', onToggleChange);

document.getElementById('alternatives').addEventListener('click', e => {
  const card = e.target.closest('.alt-card');
  if (!card) return;
  const tea = teas.find(t => t.id === Number(card.dataset.id));
  if (tea) promoteToFeatured(tea);
});

document.getElementById('browse-grid').addEventListener('click', e => {
  const card = e.target.closest('.browse-card');
  if (!card) return;
  card.classList.toggle('expanded');
});

// === Browse View ===
const filterEls = {
  daytime: document.getElementById('filter-daytime'),
  type: document.getElementById('filter-type'),
  origin: document.getElementById('filter-origin'),
  christmas: document.getElementById('browse-christmas'),
  specials: document.getElementById('browse-specials'),
};

const types = [...new Set(teas.map(t => t.type))].sort();
const typeSelect = filterEls.type;
types.forEach(t => {
  const o = document.createElement('option');
  o.value = t; o.textContent = t;
  typeSelect.appendChild(o);
});

const origins = [...new Set(teas.map(t => validOrigin(t)).filter(Boolean))].sort();
const originSelect = filterEls.origin;
origins.forEach(o => {
  const opt = document.createElement('option');
  opt.value = o; opt.textContent = o;
  originSelect.appendChild(opt);
});

function parseHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  return {
    view: p.get('view') === 'browse' ? 'browse' : 'recommend',
    tea: p.get('tea') || null,
    daytime: p.get('daytime') || 'All',
    type: p.get('type') || 'All',
    origin: p.get('origin') || 'All',
    christmas: p.get('christmas') === '1',
    specials: p.get('specials') === '1',
  };
}

function setHash(r, push = false) {
  const p = new URLSearchParams();
  if (r.view === 'browse') {
    p.set('view', 'browse');
    if (r.daytime !== 'All') p.set('daytime', r.daytime);
    if (r.type !== 'All') p.set('type', r.type);
    if (r.origin !== 'All') p.set('origin', r.origin);
    if (r.christmas) p.set('christmas', '1');
    if (r.specials) p.set('specials', '1');
  } else if (r.tea) {
    p.set('tea', r.tea);
  }
  const hash = '#' + p.toString();
  if (push) history.pushState(null, '', hash);
  else history.replaceState(null, '', hash);
}

function applyFiltersToUI(f) {
  filterEls.daytime.value = f.daytime;
  filterEls.type.value = f.type;
  filterEls.origin.value = f.origin;
  filterEls.christmas.checked = f.christmas;
  filterEls.specials.checked = f.specials;
}

function readFiltersFromUI() {
  return {
    daytime: filterEls.daytime.value,
    type: filterEls.type.value,
    origin: filterEls.origin.value,
    christmas: filterEls.christmas.checked,
    specials: filterEls.specials.checked,
  };
}

function getFilteredTeas(f, exclude) {
  return teas.filter(t => {
    if (exclude !== 'daytime' && f.daytime !== 'All' && t.daytime && t.daytime !== 'Day' && t.daytime !== f.daytime) return false;
    if (exclude !== 'type' && f.type !== 'All' && t.type !== f.type) return false;
    if (exclude !== 'origin' && f.origin !== 'All' && t.origin !== f.origin) return false;
    if (isChristmas(t) && !f.christmas) return false;
    if (isSpecials(t) && !f.specials) return false;
    if (!isInStock(t)) return false;
    return true;
  });
}

function updateSelectOptions(select, available) {
  let needsReset = false;
  for (const opt of select.options) {
    if (opt.value === 'All') continue;
    const hidden = !available.has(opt.value);
    opt.hidden = hidden;
    opt.disabled = hidden;
    if (hidden && opt.selected) needsReset = true;
  }
  if (needsReset) select.value = 'All';
}

function renderBrowse() {
  const f = readFiltersFromUI();

  // Update available options for each filter based on the other filters
  const daytimeAvailable = new Set(getFilteredTeas(f, 'daytime').map(t => t.daytime).filter(Boolean));
  const typeAvailable = new Set(getFilteredTeas(f, 'type').map(t => t.type));
  const originAvailable = new Set(getFilteredTeas(f, 'origin').map(t => validOrigin(t)).filter(Boolean));

  updateSelectOptions(filterEls.daytime, daytimeAvailable);
  updateSelectOptions(filterEls.type, typeAvailable);
  updateSelectOptions(filterEls.origin, originAvailable);

  // Re-read filters in case any were reset
  const updatedF = readFiltersFromUI();
  setHash({ view: 'browse', ...updatedF });

  const filtered = getFilteredTeas(updatedF);

  const grid = document.getElementById('browse-grid');
  const emptyMsg = document.getElementById('browse-empty');

  if (filtered.length === 0) {
    grid.innerHTML = '';
    emptyMsg.hidden = false;
    return;
  }
  emptyMsg.hidden = true;

  grid.innerHTML = filtered.map(t => {
    const origin = validOrigin(t);
    const oos = !isInStock(t) ? ' out-of-stock' : '';
    return `
    <div class="browse-card${oos}" data-id="${t.id}">
      <div class="browse-card-header">
        <span class="badge" style="background:${badgeColor(t.type)}">${t.type.split(' ')[0]}</span>
        <span class="bc-name">${t.name}</span>
        ${origin ? `<span class="bc-origin">${origin}</span>` : ''}
      </div>
      <div class="browse-card-detail">
        <p class="tea-description">${t.description}</p>
        ${teaDetailsHTML(t)}
      </div>
    </div>`;
  }).join('');
}

document.querySelectorAll('#browse .filters select, #browse .filters input').forEach(el => {
  el.addEventListener('change', renderBrowse);
});

// === Navigation ===
function navigate(route) {
  currentView = route.view;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.nav-btn[data-view="${route.view}"]`).classList.add('active');
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(route.view).classList.add('active');

  if (route.view === 'browse') {
    applyFiltersToUI(route);
    renderBrowse();
  } else {
    const tea = route.tea && findBySlug(route.tea);
    if (tea || !currentFeatured) initRecommend(tea || undefined);
  }
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const route = { view: btn.dataset.view };
    if (route.view === 'browse') Object.assign(route, readFiltersFromUI());
    setHash(route, true);
    navigate(route);
  });
});

window.addEventListener('popstate', () => navigate(parseHash()));

// === Init ===
navigate(parseHash());

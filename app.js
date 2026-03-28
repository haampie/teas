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
    'Name': 'name', 'Sourcer': 'sourcer', 'Type': 'type', 'Origin': 'origin',
    'Theme': 'theme', 'Daytime': 'daytime', 'Temp': 'temp', 'Brew': 'brew',
    'Quantity': 'quantity', 'Repurchase?': 'repurchase', 'Collection': 'collection',
    'Since': 'since', 'Description': 'description', 'Additives': 'additives',
    'Aroma Notes': 'aromaNotes'
  };
  return rows.slice(1).map((row, idx) => {
    const obj = { id: idx };
    headers.forEach((h, i) => {
      obj[keyMap[h.trim()] || h.trim()] = (row[i] || '').trim();
    });
    // Normalize categorical fields to title-case
    for (const f of ['quantity', 'repurchase', 'daytime', 'collection']) {
      if (obj[f]) obj[f] = obj[f].charAt(0).toUpperCase() + obj[f].slice(1).toLowerCase();
    }
    return obj;
  });
}

// === Data ===
const resp = await fetch('teas.csv');
const teas = csvToObjects(await resp.text());

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

function getGreeting() {
  const h = new Date().getHours();
  if (h < 11) return 'Good morning. How about…';
  if (h < 17) return 'Good afternoon. How about…';
  return 'Good evening. How about…';
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

function teaWeight(t) {
  let w = 1;
  if ((t.collection || '').includes('Core')) w += 2;
  if (t.quantity === 'Full') w += 1;
  if (t.repurchase === 'Yes') w += 1;
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

function getEligible() {
  const tod = getTimeOfDay();
  const showXmas = document.getElementById('toggle-christmas').checked;
  const showSpec = document.getElementById('toggle-specials').checked;
  return teas.filter(t => {
    if (!isInStock(t)) return false;
    if (t.daytime && t.daytime !== tod) return false;
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
  const origin = tea.origin && tea.origin !== '/' && tea.origin !== 'n.a.' ? tea.origin : '';
  document.getElementById('featured-card').innerHTML = `
    <h2 class="tea-name">${tea.name}</h2>
    <div class="tea-meta">
      <span class="badge" style="background:${badgeColor(tea.type)}">${tea.type}</span>
      ${origin ? `<span class="tea-origin">${origin}</span>` : ''}
      ${tea.sourcer ? `<span class="tea-sourcer">· ${tea.sourcer}</span>` : ''}
    </div>
    <p class="tea-description">${tea.description}</p>
    <dl class="tea-details">
      ${tea.temp ? `<div><dt>Temperature</dt><dd>${tea.temp}</dd></div>` : ''}
      ${tea.brew ? `<div><dt>Brew time</dt><dd>${tea.brew}</dd></div>` : ''}
      ${tea.quantity ? `<div><dt>In stock</dt><dd><span class="quantity-dots">${quantityDots(tea.quantity)}</span></dd></div>` : ''}
      ${tea.theme ? `<div><dt>Theme</dt><dd>${tea.theme}</dd></div>` : ''}
      ${tea.aromaNotes ? `<div><dt>Aroma notes</dt><dd>${tea.aromaNotes}</dd></div>` : ''}
    </dl>
  `;
}

function renderAlternatives(eligible, featured) {
  const alts = eligible.filter(t => t.id !== featured?.id);
  const heading = document.getElementById('alternatives-heading');
  const grid = document.getElementById('alternatives');
  if (alts.length === 0) {
    heading.hidden = true;
    grid.innerHTML = '';
    return;
  }
  heading.hidden = false;
  grid.innerHTML = alts.map(t => `
    <div class="alt-card" data-id="${t.id}">
      <span class="badge" style="background:${badgeColor(t.type)}">${t.type.split(' ')[0]}</span>
      <div class="alt-info">
        <div class="alt-name">${t.name}</div>
        <div class="alt-sub">${t.aromaNotes || t.origin || ''}</div>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.alt-card').forEach(card => {
    card.addEventListener('click', () => {
      const tea = teas.find(t => t.id === Number(card.dataset.id));
      if (tea) promoteToFeatured(tea);
    });
  });
}

function promoteToFeatured(tea) {
  const fc = document.getElementById('featured-card');
  fc.classList.add('fade-out');
  setTimeout(() => {
    currentFeatured = tea;
    shownSet.add(tea.id);
    renderFeaturedCard(tea);
    renderAlternatives(getEligible(), tea);
    fc.classList.remove('fade-out');
  }, 300);
}

function suggestAnother() {
  const eligible = getEligible();
  const unseen = eligible.filter(t => !shownSet.has(t.id));
  if (unseen.length === 0) shownSet.clear();
  const pool = unseen.length > 0 ? unseen : eligible;
  if (pool.length === 0) {
    renderFeaturedCard(null);
    document.getElementById('alternatives-heading').hidden = true;
    document.getElementById('alternatives').innerHTML = '';
    return;
  }
  const pick = weightedRandom(pool);
  promoteToFeatured(pick);
}

function initRecommend() {
  document.getElementById('greeting').textContent = getGreeting();
  // Auto-enable Christmas in December
  if (new Date().getMonth() === 11) {
    document.getElementById('toggle-christmas').checked = true;
  }
  shownSet.clear();
  suggestAnother();
}

document.getElementById('suggest-btn').addEventListener('click', suggestAnother);
document.getElementById('toggle-christmas').addEventListener('change', () => { shownSet.clear(); suggestAnother(); });
document.getElementById('toggle-specials').addEventListener('change', () => { shownSet.clear(); suggestAnother(); });

// === Browse View ===
const types = [...new Set(teas.map(t => t.type))].sort();
const typeSelect = document.getElementById('filter-type');
types.forEach(t => {
  const o = document.createElement('option');
  o.value = t; o.textContent = t;
  typeSelect.appendChild(o);
});

const origins = [...new Set(teas.map(t => t.origin).filter(o => o && o !== '/' && o !== 'n.a.'))].sort();
const originSelect = document.getElementById('filter-origin');
origins.forEach(o => {
  const opt = document.createElement('option');
  opt.value = o; opt.textContent = o;
  originSelect.appendChild(opt);
});

function getHashFilters() {
  const p = new URLSearchParams(location.hash.slice(1));
  return {
    daytime: p.get('daytime') || 'All',
    type: p.get('type') || 'All',
    origin: p.get('origin') || 'All',
    christmas: p.get('christmas') === '1',
    specials: p.get('specials') === '1',
  };
}

function setHashFilters(f) {
  const p = new URLSearchParams();
  if (f.daytime !== 'All') p.set('daytime', f.daytime);
  if (f.type !== 'All') p.set('type', f.type);
  if (f.origin !== 'All') p.set('origin', f.origin);
  if (f.christmas) p.set('christmas', '1');
  if (f.specials) p.set('specials', '1');
  history.replaceState(null, '', '#' + p.toString());
}

function applyFiltersToUI(f) {
  document.getElementById('filter-daytime').value = f.daytime;
  document.getElementById('filter-type').value = f.type;
  document.getElementById('filter-origin').value = f.origin;
  document.getElementById('browse-christmas').checked = f.christmas;
  document.getElementById('browse-specials').checked = f.specials;
}

function readFiltersFromUI() {
  return {
    daytime: document.getElementById('filter-daytime').value,
    type: document.getElementById('filter-type').value,
    origin: document.getElementById('filter-origin').value,
    christmas: document.getElementById('browse-christmas').checked,
    specials: document.getElementById('browse-specials').checked,
  };
}

function renderBrowse() {
  const f = readFiltersFromUI();
  setHashFilters(f);
  const filtered = teas.filter(t => {
    if (f.daytime !== 'All' && t.daytime && t.daytime !== f.daytime) return false;
    if (f.type !== 'All' && t.type !== f.type) return false;
    if (f.origin !== 'All' && t.origin !== f.origin) return false;
    if (isChristmas(t) && !f.christmas) return false;
    if (isSpecials(t) && !f.specials) return false;
    if (!isInStock(t)) return false;
    return true;
  });

  const grid = document.getElementById('browse-grid');
  const emptyMsg = document.getElementById('browse-empty');

  if (filtered.length === 0) {
    grid.innerHTML = '';
    emptyMsg.hidden = false;
    return;
  }
  emptyMsg.hidden = true;

  grid.innerHTML = filtered.map(t => {
    const origin = t.origin && t.origin !== '/' && t.origin !== 'n.a.' ? t.origin : '';
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
        <dl class="tea-details">
          ${t.theme ? `<div><dt>Theme</dt><dd>${t.theme}</dd></div>` : ''}
          ${t.temp ? `<div><dt>Temperature</dt><dd>${t.temp}</dd></div>` : ''}
          ${t.brew ? `<div><dt>Brew time</dt><dd>${t.brew}</dd></div>` : ''}
          ${t.quantity ? `<div><dt>In stock</dt><dd><span class="quantity-dots">${quantityDots(t.quantity)}</span></dd></div>` : ''}
          ${t.aromaNotes ? `<div><dt>Aroma notes</dt><dd>${t.aromaNotes}</dd></div>` : ''}
          ${t.sourcer ? `<div><dt>Brand</dt><dd>${t.sourcer}</dd></div>` : ''}
        </dl>
      </div>
    </div>`;
  }).join('');

  grid.querySelectorAll('.browse-card').forEach(card => {
    card.addEventListener('click', () => {
      card.classList.toggle('expanded');
    });
  });
}

document.querySelectorAll('#browse .filters select, #browse .filters input').forEach(el => {
  el.addEventListener('change', renderBrowse);
});

// === Navigation ===
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(btn.dataset.view).classList.add('active');
    if (btn.dataset.view === 'browse') renderBrowse();
  });
});

// === Init ===
// Restore browse filters from hash
applyFiltersToUI(getHashFilters());
initRecommend();

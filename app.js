function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1800);
}

function copyOutput(id) {
  const el = document.getElementById(id);
  navigator.clipboard.writeText(el.textContent).then(() => toast('Copied!'));
}

function copyText(id) {
  const el = document.getElementById(id);
  const text = el.value !== undefined ? el.value : el.textContent;
  navigator.clipboard.writeText(text).then(() => toast('Copied!'));
}

const CATS = ['All', 'Text', 'Developer', 'Convert', 'Generate', 'Calculate', 'Image'];
const DEFAULT_TITLE = 'ToolNest — Free Online Tools for Everyone';
const DEFAULT_DESC = 'Free online tools: word counter, password generator, JSON formatter, Base64 encoder, case converter, URL encoder, and more. No signup required.';

let activeCat = 'All';
let query = '';

function $(id) {
  return document.getElementById(id);
}

function toolById(id) {
  return TOOLS.find(t => t.id === id);
}

function matches(t) {
  if (activeCat !== 'All' && t.category !== activeCat) return false;
  if (!query) return true;
  const q = query.toLowerCase();
  const hay = [t.name, t.description, t.category, ...(t.keywords || [])].join(' ').toLowerCase();
  return hay.includes(q);
}

function renderChips() {
  const wrap = $('cat-chips');
  wrap.innerHTML = CATS.map(c =>
    `<button type="button" class="chip${c === activeCat ? ' active' : ''}" data-cat="${c}">${c}</button>`
  ).join('');
  wrap.querySelectorAll('.chip').forEach(btn => {
    btn.addEventListener('click', () => {
      activeCat = btn.dataset.cat;
      renderChips();
      renderCatalog();
    });
  });
}

function renderCatalog() {
  const el = $('catalog');
  const list = TOOLS.filter(matches);
  if (!list.length) {
    el.innerHTML = '<p class="catalog-empty">No tools match that search.</p>';
    return;
  }
  el.innerHTML = list.map(t => `
    <a class="catalog-card" href="#${t.id}">
      <span class="cat-badge">${t.category}</span>
      <h3>${t.name}</h3>
      <p>${t.description}</p>
    </a>
  `).join('');
}

function setMeta(title, desc) {
  document.title = title;
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute('content', desc);
}

function showHome() {
  $('view-home').classList.remove('hidden');
  $('view-tool').classList.add('hidden');
  setMeta(DEFAULT_TITLE, DEFAULT_DESC);
  renderChips();
  renderCatalog();
}

function showTool(id) {
  const t = toolById(id);
  if (!t) {
    history.replaceState(null, '', location.pathname + location.search);
    showHome();
    return;
  }
  $('view-home').classList.add('hidden');
  $('view-tool').classList.remove('hidden');
  $('tool-root').innerHTML = t.render();
  const tips = $('tool-tips');
  tips.innerHTML = (t.tips || []).map(tip => `<p class="tip">${tip}</p>`).join('') ||
    `<p class="tip">${t.description}</p>`;
  setMeta(`${t.name} — ToolNest`, t.description);
  if (typeof t.init === 'function') t.init();
}

function route() {
  const id = decodeURIComponent((location.hash || '').replace(/^#/, ''));
  if (!id) showHome();
  else showTool(id);
}

function fillKeywords() {
  const meta = document.querySelector('meta[name="keywords"]');
  if (!meta) return;
  const names = TOOLS.map(t => t.name.toLowerCase());
  meta.setAttribute('content', ['free online tools', ...names].join(', '));
}

document.addEventListener('DOMContentLoaded', () => {
  fillKeywords();
  renderChips();
  $('tool-search').addEventListener('input', e => {
    query = e.target.value.trim();
    renderCatalog();
  });
  $('logo-home').addEventListener('click', e => {
    e.preventDefault();
    location.hash = '';
    showHome();
  });
  $('back-home').addEventListener('click', e => {
    e.preventDefault();
    location.hash = '';
    showHome();
  });
  window.addEventListener('hashchange', route);
  route();
});

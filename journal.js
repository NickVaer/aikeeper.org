(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const menu = $('.menu-toggle');
  const nav = $('#navigation');
  const closeMenu = () => { nav?.classList.remove('open'); menu?.setAttribute('aria-expanded', 'false'); };
  menu?.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open)); nav.classList.toggle('open', open);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  document.addEventListener('click', e => { if (nav?.classList.contains('open') && !e.target.closest('.header')) closeMenu(); });
  matchMedia('(min-width:801px)').addEventListener('change', closeMenu);

  const search = $('#article-search');
  let activeTopic = 'all';
  const filterStories = () => {
    const query = (search?.value || '').trim().toLowerCase();
    let count = 0;
    $$('[data-story]').forEach(card => {
      const match = (activeTopic === 'all' || card.dataset.topic === activeTopic) && query.split(/\s+/).filter(Boolean).every(term => card.dataset.title.toLowerCase().includes(term));
      card.hidden = !match; if (match) count++;
    });
    if ($('#results-count')) $('#results-count').textContent = `${count} ${count === 1 ? 'material' : 'materials'}`;
    if ($('#no-results')) $('#no-results').hidden = count !== 0;
  };
  search?.addEventListener('input', filterStories);
  $$('[data-filter]').forEach(button => button.addEventListener('click', () => {
    activeTopic = button.dataset.filter;
    $$('[data-filter]').forEach(b => { const active = b === button; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
    filterStories();
  }));
  $('#clear-search')?.addEventListener('click', () => { search.value = ''; $('[data-filter="all"]').click(); search.focus(); });
  if (search) {
    const topic = new URLSearchParams(location.search).get('topic');
    const selected = $$('[data-filter]').find(b => b.dataset.filter === topic);
    selected?.click();
  }
  $('#glossary-search')?.addEventListener('input', e => {
    const query = e.target.value.trim().toLowerCase(); let count = 0;
    $$('[data-term]').forEach(term => { term.hidden = !term.dataset.search.toLowerCase().includes(query); if (!term.hidden) count++; });
    $('#term-count').textContent = `${count} ${count === 1 ? 'term' : 'terms'}`;
    $('#no-terms').hidden = count !== 0;
  });

  const copy = $('[data-copy-link]');
  copy?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(location.href); copy.textContent = 'Link copied ✓'; }
    catch { copy.textContent = 'Copy the address from your browser'; }
  });
  const progress = $('.reading-progress span');
  if (progress) {
    let queued = false;
    const update = () => {
      const article = $('.article-body'); const start = article.getBoundingClientRect().top + scrollY;
      const range = Math.max(1, article.offsetHeight - innerHeight);
      progress.style.width = `${Math.min(100, Math.max(0, (scrollY - start) / range * 100))}%`; queued = false;
    };
    addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('resize', update); update();
  }

  function downloadCSV(name, rows) {
    const text = rows.map(row => row.map(v => '"' + String(v).replaceAll('"', '""') + '"').join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + text], { type: 'text/csv;charset=utf-8' });
    const href = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = href; a.download = name;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(href), 1000);
  }
  const form = $('#energy-form');
  const numbers = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const scenario = letter => {
    const get = key => Number(form.elements.namedItem(`${letter}-${key}`).value);
    const capacity = get('capacity'), load = get('load'), pue = get('pue'), rate = get('rate');
    const energy = capacity * (load / 100) * 8760 * pue;
    return { capacity, load, pue, rate, energy, cost: energy * rate };
  };
  const updateCalculator = () => {
    const valid = form.checkValidity(); $('#calculator-error').hidden = valid;
    $('#download-scenarios').disabled = !valid;
    if (!valid) {
      ['A','B'].forEach(l => { $(`#${l}-energy`).textContent = '—'; $(`#${l}-cost`).textContent = '—'; });
      $('#cost-difference').textContent = '—'; $('#difference-note').textContent = 'Enter valid values to compare the scenarios.'; return;
    }
    const a = scenario('A'), b = scenario('B');
    [['A', a], ['B', b]].forEach(([l, s]) => { $(`#${l}-energy`).textContent = numbers.format(s.energy) + ' kWh'; $(`#${l}-cost`).textContent = money.format(s.cost); });
    const delta = b.cost - a.cost;
    $('#cost-difference').textContent = money.format(Math.abs(delta));
    $('#difference-note').textContent = Math.abs(delta) < 0.005 ? 'The scenarios have the same calculated energy charge. Results exclude all other project costs.' : `Scenario ${delta > 0 ? 'B' : 'A'} has a higher calculated annual energy charge by this amount. Energy only; this is not a profitability comparison.`;
  };
  if (form) {
    form.addEventListener('submit', e => e.preventDefault());
    form.addEventListener('input', updateCalculator);
    form.addEventListener('reset', () => setTimeout(updateCalculator, 0));
    $('#download-scenarios').addEventListener('click', () => {
      if (!form.reportValidity()) return;
      const a = scenario('A'), b = scenario('B');
      const rows = [['AI Keeper — illustrative energy-only scenarios', 'Scenario A', 'Scenario B'], ['IT capacity (kW)', a.capacity, b.capacity], ['Average electrical load (%)', a.load, b.load], ['Annual PUE', a.pue, b.pue], ['Assumed energy rate (USD/kWh)', a.rate, b.rate], ['Hours in assumed non-leap year', 8760, 8760], ['Annual facility energy (kWh)', a.energy, b.energy], ['Annual energy charge (USD)', a.cost, b.cost], ['Exclusions: capital financing demand/fixed charges taxes backup fuel maintenance connectivity and revenue', '', '']];
      downloadCSV('AI_Keeper_Energy_Scenarios.csv', rows);
    });
    updateCalculator();
  }

  // Preview hosts never load production analytics. Consent is explicit and browser-local.
  const production = ['aikeeper.org', 'www.aikeeper.org'].includes(location.hostname);
  const storageKey = 'aikeeper-analytics-consent-v1';
  let choice = null;
  try { choice = localStorage.getItem(storageKey); } catch { /* privacy mode: keep the choice in memory */ }
  let analyticsLoaded = false;
  function startAnalytics() {
    if (!production || analyticsLoaded) return;
    analyticsLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date()); window.gtag('config', 'G-VQT6BQJ7EG');
    const script = document.createElement('script'); script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=G-VQT6BQJ7EG'; document.head.append(script);
  }
  if (choice === 'accepted') startAnalytics();
  if (production && !choice && $('#consent')) $('#consent').hidden = false;
  $$('[data-cookie-settings]').forEach(button => button.addEventListener('click', () => { $('#consent').hidden = false; $('[data-consent="accepted"]').focus(); }));
  $$('[data-consent]').forEach(button => button.addEventListener('click', () => {
    choice = button.dataset.consent;
    try { localStorage.setItem(storageKey, choice); } catch { /* choice applies to current page */ }
    $('#consent').hidden = true;
    if (choice === 'accepted') startAnalytics();
    else if (analyticsLoaded) { window['ga-disable-G-VQT6BQJ7EG'] = true; location.reload(); }
  }));
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[data-x-follow]');
    if (link && production && choice === 'accepted' && analyticsLoaded && typeof window.gtag === 'function') {
      window.gtag('event', 'x_profile_click', { placement: link.dataset.xFollow, transport_type: 'beacon' });
    }
  });
})();

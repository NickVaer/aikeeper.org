(() => {
  'use strict';
  const input = document.getElementById('article-search');
  const cards = [...document.querySelectorAll('#article-grid .article-card')];
  const buttons = [...document.querySelectorAll('.search-chips [data-topic]')];
  let topic = 'all';
  const normalize = value => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  function update(scroll = false) {
    const query = input.value.trim();
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    let count = 0;
    for (const card of cards) {
      const text = normalize(card.dataset.search);
      const matches = (topic === 'all' || card.dataset.topic === topic) && terms.every(term => text.includes(term));
      card.hidden = !matches;
      if (matches) count++;
    }
    document.getElementById('filter-summary').hidden = topic === 'all' && !query;
    document.getElementById('active-search').textContent = [topic === 'all' ? 'All topics' : topic.charAt(0).toUpperCase() + topic.slice(1), query ? '“' + query + '”' : ''].filter(Boolean).join(' · ');
    document.getElementById('empty-state').hidden = count !== 0;
    document.getElementById('results-status').textContent = topic !== 'all' || query ? `${count} ${count === 1 ? 'article' : 'articles'} found.` : `${cards.length} explainers, field guides and practical frameworks.`;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.topic === topic)));
    if (scroll) document.getElementById('ideas').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  }
  buttons.forEach(button => button.addEventListener('click', () => { topic = button.dataset.topic; update(true); }));
  document.getElementById('search-form').addEventListener('submit', event => { event.preventDefault(); update(true); });
  input.addEventListener('input', () => update());
  function reset() { topic = 'all'; input.value = ''; update(); }
  document.getElementById('reset-search').addEventListener('click', reset);
  document.getElementById('empty-reset').addEventListener('click', reset);
  update();
})();

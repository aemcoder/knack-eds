import { createOptimizedPicture, readBlockConfig } from '../../scripts/aem.js';

const PAGE_SIZE = 500;

/**
 * Fetches all records from a query index, following pagination.
 * @param {string} source The query index URL
 * @returns {Promise<object[]>} All index records (empty on failure)
 */
async function fetchIndex(source) {
  const items = [];
  let offset = 0;
  let total = Infinity;
  while (offset < total) {
    const url = `${source}${source.includes('?') ? '&' : '?'}offset=${offset}&limit=${PAGE_SIZE}`;
    // eslint-disable-next-line no-await-in-loop
    const resp = await fetch(url);
    if (!resp.ok) break;
    // eslint-disable-next-line no-await-in-loop
    const json = await resp.json();
    const data = json.data || [];
    items.push(...data);
    total = typeof json.total === 'number' ? json.total : items.length;
    if (data.length === 0) break;
    offset += data.length;
  }
  return items;
}

/**
 * Splits a multi-valued, comma-separated index cell into trimmed values.
 * @param {string} value The raw cell value
 * @returns {string[]} The individual values
 */
function splitValues(value) {
  return (value || '')
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v);
}

/**
 * Derives a human-readable facet group label from an index column name,
 * e.g. "industries" → "Filter by Industry", "use-cases" → "Filter by Use Case".
 * @param {string} column The index column name
 * @returns {string} The facet group label
 */
function facetLabel(column) {
  let singular = column;
  if (singular.endsWith('ies')) singular = `${singular.slice(0, -3)}y`;
  else if (singular.endsWith('s') && !singular.endsWith('ss')) singular = singular.slice(0, -1);
  const words = singular
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return `Filter by ${words}`;
}

/**
 * Derives the item noun from the index path, e.g. /templates/query-index.json → "templates".
 * @param {string} source The query index URL
 * @returns {string} The plural item noun
 */
function itemNoun(source) {
  const match = source.match(/\/([^/]+)\/query-index/);
  return match ? match[1].replace(/-/g, ' ') : 'items';
}

/** Reads filter state (search query + one value per facet) from the URL. */
function readState(facets) {
  const params = new URLSearchParams(window.location.search);
  const state = { q: params.get('q') || '' };
  facets.forEach((facet) => {
    state[facet] = params.get(facet) || '';
  });
  return state;
}

/** Writes filter state to the URL without adding history entries. */
function writeState(state, facets) {
  const params = new URLSearchParams(window.location.search);
  ['q', ...facets].forEach((key) => {
    if (state[key]) params.set(key, state[key]);
    else params.delete(key);
  });
  const query = params.toString();
  const url = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
  window.history.replaceState(null, '', url);
}

/** Checks whether an item matches the current search query and facet selections. */
function matchesState(item, state, facets) {
  if (state.q) {
    const haystack = `${item.title || ''} ${item.description || ''}`.toLowerCase();
    if (!haystack.includes(state.q.toLowerCase())) return false;
  }
  return facets.every((facet) => {
    if (!state[facet]) return true;
    const values = splitValues(item[facet]).map((v) => v.toLowerCase());
    return values.includes(state[facet].toLowerCase());
  });
}

/** Builds one result card linking to the item's page. */
function createCard(item) {
  const li = document.createElement('li');
  const card = document.createElement('a');
  card.className = 'filtered-grid-card';
  card.href = item.path;

  const media = document.createElement('div');
  media.className = 'filtered-grid-card-media';
  if (item.image) {
    media.append(createOptimizedPicture(item.image, item.title || '', false, [{ width: '750' }]));
  }
  card.append(media);

  const body = document.createElement('div');
  body.className = 'filtered-grid-card-body';
  const title = document.createElement('p');
  title.className = 'filtered-grid-card-title';
  title.textContent = item.title || item.path;
  body.append(title);
  if (item.description) {
    const description = document.createElement('p');
    description.className = 'filtered-grid-card-description';
    description.textContent = item.description;
    body.append(description);
  }
  card.append(body);

  li.append(card);
  return li;
}

/** Builds the facet sidebar from the distinct values of the facet columns. */
function createFacetSidebar(items, facets) {
  const aside = document.createElement('aside');
  aside.className = 'filtered-grid-facets';
  aside.setAttribute('aria-label', 'Filters');

  const showAll = document.createElement('a');
  showAll.className = 'filtered-grid-show-all';
  showAll.href = window.location.pathname;
  showAll.dataset.showAll = 'true';
  showAll.textContent = 'Show All';
  aside.append(showAll);

  facets.forEach((facet) => {
    const values = [...new Set(items.flatMap((item) => splitValues(item[facet])))]
      .sort((a, b) => a.localeCompare(b));
    if (values.length === 0) return;

    const group = document.createElement('div');
    group.className = 'filtered-grid-facet-group';
    const heading = document.createElement('h3');
    heading.textContent = facetLabel(facet);
    group.append(heading);

    const list = document.createElement('ul');
    values.forEach((value) => {
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = `${window.location.pathname}?${new URLSearchParams({ [facet]: value })}`;
      link.dataset.facet = facet;
      link.dataset.value = value;
      link.textContent = value;
      li.append(link);
      list.append(li);
    });
    group.append(list);
    aside.append(group);
  });

  return aside;
}

/** Re-renders the result list, count, facet selection, and empty state. */
function update(block, items, state, facets, noun) {
  const results = items.filter((item) => matchesState(item, state, facets));

  const list = block.querySelector('.filtered-grid-list');
  list.replaceChildren(...results.map(createCard));

  const count = block.querySelector('.filtered-grid-count');
  count.textContent = `Showing ${results.length} ${results.length === 1 ? noun.replace(/s$/, '') : noun}`;

  const hasFilters = Boolean(state.q || facets.some((facet) => state[facet]));
  block.querySelector('.filtered-grid-clear').hidden = !hasFilters;

  const empty = block.querySelector('.filtered-grid-empty');
  empty.hidden = results.length > 0;

  block.querySelectorAll('.filtered-grid-facets a[data-facet]').forEach((link) => {
    const current = (state[link.dataset.facet] || '').toLowerCase();
    const selected = current === link.dataset.value.toLowerCase();
    if (selected) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  });
}

/**
 * Decorates the filtered-grid block: fetches the configured query index and
 * renders a searchable, facet-filterable card grid with deep-linkable state.
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const config = readBlockConfig(block);
  const source = config.source ? new URL(config.source, window.location.href).pathname : '';
  const facets = splitValues(config.facets);
  block.textContent = '';

  if (!source) return;
  let items = await fetchIndex(source);
  // optional pre-filter, e.g. `filter: template=download` — narrows a shared index
  if (config.filter && config.filter.includes('=')) {
    const [col, value] = config.filter.split('=').map((s) => s.trim());
    items = items.filter((item) => (item[col] || '') === value);
  }
  const noun = itemNoun(source);
  const state = readState(facets);

  const search = document.createElement('div');
  search.className = 'filtered-grid-search';
  const input = document.createElement('input');
  input.type = 'search';
  input.placeholder = `Search all ${noun}`;
  input.setAttribute('aria-label', `Search all ${noun}`);
  input.value = state.q;
  search.append(input);

  const status = document.createElement('div');
  status.className = 'filtered-grid-status';
  const count = document.createElement('span');
  count.className = 'filtered-grid-count';
  const clear = document.createElement('button');
  clear.type = 'button';
  clear.className = 'filtered-grid-clear';
  clear.textContent = 'Clear filters';
  status.append(count, clear);

  const layout = document.createElement('div');
  layout.className = 'filtered-grid-layout';
  const aside = createFacetSidebar(items, facets);
  const resultsPane = document.createElement('div');
  resultsPane.className = 'filtered-grid-results';
  const list = document.createElement('ul');
  list.className = 'filtered-grid-list';
  const empty = document.createElement('p');
  empty.className = 'filtered-grid-empty';
  empty.hidden = true;
  empty.textContent = items.length === 0
    ? `No ${noun} available yet. Please check back soon.`
    : `No ${noun} found. Try a different search or clear the filters.`;
  resultsPane.append(list, empty);
  layout.append(aside, resultsPane);

  block.append(search, status, layout);

  const apply = () => {
    writeState(state, facets);
    update(block, items, state, facets, noun);
  };

  let debounce;
  input.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      state.q = input.value.trim();
      apply();
    }, 200);
  });

  clear.addEventListener('click', () => {
    state.q = '';
    input.value = '';
    facets.forEach((facet) => {
      state[facet] = '';
    });
    apply();
  });

  aside.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;
    e.preventDefault();
    if (link.dataset.showAll) {
      state.q = '';
      input.value = '';
      facets.forEach((facet) => {
        state[facet] = '';
      });
    } else {
      const { facet, value } = link.dataset;
      const selected = (state[facet] || '').toLowerCase() === value.toLowerCase();
      state[facet] = selected ? '' : value;
    }
    apply();
  });

  update(block, items, state, facets, noun);
}

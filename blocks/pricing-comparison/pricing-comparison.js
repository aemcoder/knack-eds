/*
 * Pricing Comparison Block
 * Plan-comparison matrix authored as one table: a plan-names row, single-cell
 * bold rows as accordion group headers, and 5-cell feature rows whose literal
 * yes/no values decorate to check/cross icons. Renders accordion groups with
 * per-group tables (first group expanded) and a sticky plan-name header.
 */

let blockCounter = 0;

const ICONS = {
  yes: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m4 13 5 5 11-12"/></svg>',
  no: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M5 5l14 14M19 5L5 19"/></svg>',
};

/**
 * Renders a feature value: literal yes/no becomes an icon, all else as text.
 * @param {HTMLTableCellElement} td The table cell to fill
 * @param {Element} cell The authored value cell
 */
function renderValue(td, cell) {
  const text = cell.textContent.trim();
  const key = text.toLowerCase();
  if (key === 'yes' || key === 'no') {
    const icon = document.createElement('span');
    icon.className = `pricing-comparison-${key}`;
    icon.innerHTML = ICONS[key];
    const label = document.createElement('span');
    label.className = 'pricing-comparison-sr-only';
    label.textContent = key === 'yes' ? 'Included' : 'Not included';
    td.append(icon, label);
  } else {
    td.append(...cell.childNodes);
  }
}

/**
 * Builds the table for one accordion group.
 * @param {string[]} plans Plan names
 * @param {Element[][]} featureRows Authored feature rows (arrays of cells)
 * @returns {HTMLTableElement} The group table
 */
function buildGroupTable(plans, featureRows) {
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  const featureTh = document.createElement('th');
  featureTh.scope = 'col';
  const featureLabel = document.createElement('span');
  featureLabel.className = 'pricing-comparison-sr-only';
  featureLabel.textContent = 'Feature';
  featureTh.append(featureLabel);
  headRow.append(featureTh);
  plans.forEach((plan) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = plan;
    headRow.append(th);
  });
  thead.append(headRow);

  const tbody = document.createElement('tbody');
  featureRows.forEach((cells) => {
    const tr = document.createElement('tr');
    const [labelCell, ...valueCells] = cells;
    const th = document.createElement('th');
    th.scope = 'row';
    th.append(...labelCell.childNodes);
    tr.append(th);
    valueCells.forEach((cell) => {
      const td = document.createElement('td');
      renderValue(td, cell);
      tr.append(td);
    });
    tbody.append(tr);
  });

  table.append(thead, tbody);
  return table;
}

/**
 * Builds one accordion group (toggle button + collapsible table).
 * @param {object} group Group with title and rows
 * @param {string[]} plans Plan names
 * @param {boolean} expanded Whether the group starts expanded
 * @param {string} id Unique id for the group body
 * @returns {HTMLElement} The group element
 */
function buildGroup(group, plans, expanded, id) {
  const section = document.createElement('div');
  section.className = 'pricing-comparison-group';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'pricing-comparison-group-toggle';
  button.setAttribute('aria-expanded', String(expanded));
  button.setAttribute('aria-controls', id);
  const title = document.createElement('span');
  title.className = 'pricing-comparison-group-title';
  title.textContent = group.title;
  const icon = document.createElement('span');
  icon.className = 'pricing-comparison-group-icon';
  button.append(title, icon);

  const body = document.createElement('div');
  body.className = 'pricing-comparison-group-body';
  body.id = id;
  if (!expanded) body.hidden = true;
  const scroller = document.createElement('div');
  scroller.className = 'pricing-comparison-scroller';
  scroller.append(buildGroupTable(plans, group.rows));
  body.append(scroller);

  button.addEventListener('click', () => {
    const isExpanded = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!isExpanded));
    body.hidden = isExpanded;
  });

  section.append(button, body);
  return section;
}

/**
 * Builds the sticky presentational plan-names header.
 * @param {string[]} plans Plan names
 * @returns {HTMLDivElement} The header bar
 */
function buildPlansHeader(plans) {
  const bar = document.createElement('div');
  bar.className = 'pricing-comparison-plans';
  bar.setAttribute('aria-hidden', 'true');
  const spacer = document.createElement('div');
  spacer.className = 'pricing-comparison-plans-spacer';
  bar.append(spacer);
  plans.forEach((plan) => {
    const cell = document.createElement('div');
    cell.className = 'pricing-comparison-plans-name';
    cell.textContent = plan;
    bar.append(cell);
  });
  return bar;
}

/**
 * Loads and decorates the pricing-comparison block.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  blockCounter += 1;
  const idPrefix = `pricing-comparison-${blockCounter}`;

  let plans = [];
  const groups = [];
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (!plans.length && cells.length > 1) {
      plans = cells.slice(1).map((cell) => cell.textContent.trim());
    } else if (cells.length === 1) {
      groups.push({ title: cells[0].textContent.trim(), rows: [] });
    } else if (cells.length > 1 && groups.length) {
      groups.at(-1).rows.push(cells);
    }
  });

  block.textContent = '';
  block.append(buildPlansHeader(plans));
  groups.forEach((group, i) => {
    block.append(buildGroup(group, plans, i === 0, `${idPrefix}-group-${i + 1}`));
  });
}

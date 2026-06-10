/*
 * Pricing Cards Block
 * Collection of pricing tiers (row = tier, 3 cells: identity | prices | details)
 * with an optional single-cell first row holding the annual-savings badge text.
 * A Monthly/Yearly toggle is rendered automatically when any tier has a second
 * price paragraph.
 */

const BILLING = { MONTHLY: 'monthly', ANNUAL: 'annual' };

/**
 * Wraps a trailing asterisk of a price in a <sup> for superscript styling.
 * @param {Element} priceEl The current-price element
 */
function superscriptAsterisk(priceEl) {
  const last = priceEl.lastChild;
  if (last?.nodeType === Node.TEXT_NODE && last.textContent.endsWith('*')) {
    last.textContent = last.textContent.slice(0, -1);
    const sup = document.createElement('sup');
    sup.textContent = '*';
    priceEl.append(sup);
  }
}

/**
 * Restructures one authored price paragraph into price / old price / caption.
 * @param {HTMLParagraphElement} p The authored paragraph
 * @param {string} period Billing period this paragraph represents
 * @returns {HTMLParagraphElement} The decorated paragraph
 */
function decoratePrice(p, period) {
  const current = p.querySelector('strong');
  const old = p.querySelector('del, s');
  const caption = document.createElement('span');
  caption.className = 'pricing-card-price-caption';
  [...p.childNodes].forEach((node) => {
    if (node === current || node === old) return;
    caption.append(node);
  });
  caption.normalize();
  p.textContent = '';
  p.className = `pricing-card-price pricing-card-price-${period}`;
  if (current) {
    current.className = 'pricing-card-price-value';
    superscriptAsterisk(current);
    p.append(current);
  }
  if (old) {
    old.className = 'pricing-card-price-old';
    p.append(old);
  }
  if (caption.textContent.trim()) p.append(caption);
  return p;
}

/**
 * Builds the prices container for a tier from its authored price cell.
 * @param {Element} cell The authored prices cell
 * @returns {{ prices: Element, hasAnnual: boolean }} Container and annual flag
 */
function buildPrices(cell) {
  const paragraphs = [...cell.querySelectorAll('p')];
  const prices = document.createElement('div');
  prices.className = 'pricing-card-prices';
  if (paragraphs.length >= 2) {
    prices.append(
      decoratePrice(paragraphs[0], BILLING.MONTHLY),
      decoratePrice(paragraphs[1], BILLING.ANNUAL),
    );
  } else if (paragraphs.length === 1) {
    const single = decoratePrice(paragraphs[0], 'any');
    prices.append(single);
  }
  return { prices, hasAnnual: paragraphs.length >= 2 };
}

/**
 * Classifies the authored details cell (CTA, lead-in, features, footnote).
 * @param {Element} cell The authored details cell
 * @returns {Element} The decorated details container
 */
function buildDetails(cell) {
  cell.className = 'pricing-card-details';
  [...cell.querySelectorAll(':scope > p')].forEach((p) => {
    if (p.classList.contains('button-wrapper') || p.querySelector('a')) {
      p.classList.add('pricing-card-cta');
    } else if (p.querySelector('em')) {
      p.className = 'pricing-card-footnote';
    } else if (p.querySelector('strong')) {
      p.className = 'pricing-card-lead-in';
    } else {
      p.className = 'pricing-card-feature';
    }
  });
  return cell;
}

/**
 * Builds one pricing card from an authored tier row.
 * @param {Element} row The authored row (3 cells)
 * @returns {{ card: HTMLLIElement, hasAnnual: boolean }} Card and annual flag
 */
function buildCard(row) {
  const [identity, priceCell, detailCell] = row.children;
  const card = document.createElement('li');
  card.className = 'pricing-card';

  const ribbon = identity?.querySelector('p em')?.closest('p');
  if (ribbon) {
    ribbon.className = 'pricing-card-ribbon';
    card.classList.add('promo');
    card.append(ribbon);
  }

  if (identity) {
    identity.className = 'pricing-card-identity';
    const icon = identity.querySelector('picture');
    const heading = identity.querySelector('h1, h2, h3, h4, h5, h6');
    if (icon && heading) {
      const head = document.createElement('div');
      head.className = 'pricing-card-head';
      icon.closest('p')?.remove();
      head.append(icon, heading);
      identity.prepend(head);
    }
    card.append(identity);
  }

  let hasAnnual = false;
  if (priceCell) {
    const built = buildPrices(priceCell);
    hasAnnual = built.hasAnnual;
    built.prices.setAttribute('aria-live', 'polite');
    card.append(built.prices);
  }
  if (detailCell) card.append(buildDetails(detailCell));

  return { card, hasAnnual };
}

/**
 * Applies the active billing period to the block and its price paragraphs.
 * @param {Element} block The block element
 * @param {string} billing Active billing period
 */
function applyBilling(block, billing) {
  block.dataset.billing = billing;
  block.querySelectorAll('.pricing-card-price-monthly').forEach((p) => {
    p.toggleAttribute('hidden', billing !== BILLING.MONTHLY);
  });
  block.querySelectorAll('.pricing-card-price-annual').forEach((p) => {
    p.toggleAttribute('hidden', billing !== BILLING.ANNUAL);
  });
}

/**
 * Builds the Monthly/Yearly billing toggle.
 * @param {Element} block The block element
 * @param {string} badgeText Savings badge text, e.g. "Save 17%"
 * @returns {HTMLDivElement} The toggle bar
 */
function buildToggle(block, badgeText) {
  const bar = document.createElement('div');
  bar.className = 'pricing-cards-toggle';

  const monthlyLabel = document.createElement('span');
  monthlyLabel.className = 'pricing-cards-toggle-label';
  monthlyLabel.textContent = 'Monthly';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'pricing-cards-toggle-switch';
  button.setAttribute('aria-pressed', 'false');
  button.setAttribute('aria-label', 'Yearly billing');
  const knob = document.createElement('span');
  knob.className = 'pricing-cards-toggle-knob';
  button.append(knob);

  const yearlyLabel = document.createElement('span');
  yearlyLabel.className = 'pricing-cards-toggle-label';
  yearlyLabel.textContent = 'Yearly';

  bar.append(monthlyLabel, button, yearlyLabel);
  if (badgeText) {
    const badge = document.createElement('span');
    badge.className = 'pricing-cards-toggle-badge';
    badge.textContent = badgeText;
    bar.append(badge);
  }

  const setBilling = (billing) => {
    button.setAttribute('aria-pressed', String(billing === BILLING.ANNUAL));
    applyBilling(block, billing);
  };
  button.addEventListener('click', () => {
    const annual = button.getAttribute('aria-pressed') !== 'true';
    setBilling(annual ? BILLING.ANNUAL : BILLING.MONTHLY);
  });
  monthlyLabel.addEventListener('click', () => setBilling(BILLING.MONTHLY));
  yearlyLabel.addEventListener('click', () => setBilling(BILLING.ANNUAL));

  return bar;
}

/**
 * Loads and decorates the pricing-cards block.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  let badgeText = '';
  if (rows[0]?.children.length === 1) {
    badgeText = rows[0].textContent.trim();
    rows.shift();
    block.firstElementChild.remove();
  }

  const list = document.createElement('ul');
  list.className = 'pricing-cards-list';
  let anyAnnual = false;
  rows.forEach((row) => {
    const { card, hasAnnual } = buildCard(row);
    anyAnnual = anyAnnual || hasAnnual;
    list.append(card);
    row.remove();
  });

  if (anyAnnual) block.append(buildToggle(block, badgeText));
  block.append(list);
  applyBilling(block, BILLING.MONTHLY);
}

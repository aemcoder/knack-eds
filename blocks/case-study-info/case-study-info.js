/**
 * Decorates the case-study-info block: a sidebar card of label/value groups
 * (e.g. Organization, Builder, App, Highlights). Rows are optional and
 * order-free; whatever rows exist are rendered, extra cells are tolerated.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  [...block.children].forEach((row) => {
    const [labelCell, valueCell] = [...row.children];
    row.classList.add('case-study-info-row');

    if (!labelCell || !valueCell) {
      if (labelCell) labelCell.className = 'case-study-info-value';
      return;
    }

    valueCell.className = 'case-study-info-value';
    const label = labelCell.textContent.trim();
    if (label) {
      const heading = document.createElement('h3');
      heading.className = 'case-study-info-label';
      heading.textContent = label;
      labelCell.replaceWith(heading);
    } else {
      labelCell.remove();
    }
  });
}

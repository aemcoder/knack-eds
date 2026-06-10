/**
 * Decorates the template-sidebar block: label/value rows where the "Install"
 * row becomes a CTA button and other rows become mini-headed link/text lists.
 * Rows are optional and order-free; decoration keys off the row label.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  [...block.children].forEach((row) => {
    const [labelCell, valueCell] = [...row.children];
    row.classList.add('template-sidebar-row');

    if (!labelCell || !valueCell) {
      if (labelCell) labelCell.className = 'template-sidebar-value';
      return;
    }

    const label = labelCell.textContent.trim();
    const link = valueCell.querySelector('a');
    const isInstall = label.toLowerCase() === 'install' && link;

    if (isInstall) {
      row.classList.add('template-sidebar-install');
      link.className = 'button';
      valueCell.className = 'template-sidebar-value';
      labelCell.remove();
      return;
    }

    valueCell.className = 'template-sidebar-value';
    if (label) {
      const heading = document.createElement('h3');
      heading.className = 'template-sidebar-label';
      heading.textContent = label;
      labelCell.replaceWith(heading);
    } else {
      labelCell.remove();
    }
  });
}

import { createOptimizedPicture } from '../../scripts/aem.js';
import { createModal } from '../modal/modal.js';

const VISIBLE_COUNT = 3;

/**
 * Resolves the real image URL for a screenshot. Some imported rows carry a
 * mangled relative src with an absolute URL embedded (e.g. "../../.https://…"),
 * so any embedded http(s) URL wins over relative resolution.
 * @param {HTMLImageElement} img The thumbnail image
 * @returns {URL} The resolved image URL
 */
function resolveImageUrl(img) {
  const raw = img.getAttribute('src') || '';
  const embedded = raw.match(/https?:\/\/.*$/);
  return new URL(embedded ? embedded[0] : raw, window.location.href);
}

/**
 * Builds the full-size image shown in the modal: optimized rendition for
 * same-origin media, plain image for external sources.
 * @param {HTMLImageElement} img The thumbnail image
 * @returns {Element} The full-size picture or image element
 */
function createFullImage(img) {
  const url = resolveImageUrl(img);
  if (url.origin === window.location.origin) {
    return createOptimizedPicture(url.pathname, img.alt, true, [{ width: '2000' }]);
  }
  const full = document.createElement('img');
  full.src = url.href;
  full.alt = img.alt;
  full.loading = 'eager';
  return full;
}

/**
 * Decorates the screenshots block: one picture per row, rendered as a
 * thumbnail grid showing the first three with a "View More Screenshots"
 * toggle; clicking a thumbnail opens the full-size image in a modal.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const list = document.createElement('ul');
  list.className = 'screenshots-list';

  [...block.children].forEach((row) => {
    const img = row.querySelector('img');
    if (!img) return;
    const visual = img.closest('picture') || img;
    if (!img.closest('picture')) {
      img.src = resolveImageUrl(img).href;
    }

    const li = document.createElement('li');
    const index = list.children.length;
    if (index >= VISIBLE_COUNT) {
      li.classList.add('screenshots-extra');
      li.hidden = true;
    }

    const thumb = document.createElement('button');
    thumb.type = 'button';
    thumb.className = 'screenshots-thumb';
    thumb.setAttribute('aria-label', `Enlarge screenshot: ${img.alt || `screenshot ${index + 1}`}`);
    thumb.append(visual);
    thumb.addEventListener('click', async () => {
      const { showModal } = await createModal([createFullImage(img)]);
      showModal();
    });

    li.append(thumb);
    list.append(li);
  });

  block.replaceChildren(list);

  const extras = [...list.querySelectorAll('.screenshots-extra')];
  if (extras.length === 0) return;

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'screenshots-toggle';
  toggle.textContent = 'View More Screenshots';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    extras.forEach((li) => {
      li.hidden = expanded;
    });
    toggle.setAttribute('aria-expanded', String(!expanded));
    toggle.textContent = expanded ? 'View More Screenshots' : 'View Fewer Screenshots';
  });

  const toggleRow = document.createElement('p');
  toggleRow.className = 'screenshots-toggle-row';
  toggleRow.append(toggle);
  block.append(toggleRow);
}

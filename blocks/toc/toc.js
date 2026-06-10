/*
 * TOC Block (autoblocked on blog/video templates, never authored)
 * Builds a table of contents from the article body h2s. Heading ids are
 * assigned in scripts.js with Yoast-compatible anchors.
 */

export default function decorate(block) {
  const main = block.closest('main') || document;
  const headings = [...main.querySelectorAll('h2[id]')]
    .filter((heading) => !heading.closest('.block, header, footer'));

  if (headings.length === 0) {
    const wrapper = block.closest('.toc-wrapper');
    (wrapper || block).remove();
    return;
  }

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Table of contents');

  const title = document.createElement('p');
  title.className = 'toc-title';
  title.textContent = 'Table of Contents';

  const list = document.createElement('ul');
  headings.forEach((heading) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `#${heading.id}`;
    a.textContent = heading.textContent.replace(/\u00a0/g, ' ').trim();
    li.append(a);
    list.append(li);
  });

  nav.append(title, list);
  block.replaceChildren(nav);
}

import { buildBlock, decorateBlock, loadBlock } from '../../scripts/aem.js';

const VIDEO_LINK = /youtube\.com|youtu\.be|wistia|vimeo\.com/;

/**
 * Converts lone video links inside columns cells into video blocks
 * (nested blocks are not decorated by the section pipeline).
 * @param {Element} block The columns block element
 */
async function embedVideoLinks(block) {
  const links = [...block.querySelectorAll('p > a[href]')].filter((a) => {
    const p = a.parentElement;
    const text = a.textContent.trim();
    return VIDEO_LINK.test(a.href) && p.children.length === 1
      && text !== '' && p.textContent.trim() === text;
  });
  await Promise.all(links.map(async (a) => {
    const p = a.parentElement;
    const video = buildBlock('video', { elems: [a] });
    p.replaceWith(video);
    decorateBlock(video);
    await loadBlock(video);
  }));
}

export default async function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-${cols.length}-cols`);

  // setup image columns
  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      const pic = col.querySelector('picture, img');
      if (pic) {
        const picWrapper = pic.closest('div');
        if (picWrapper && picWrapper.children.length === 1) {
          // picture is only content in column
          picWrapper.classList.add('columns-img-col');
        }
      }
    });
  });

  await embedVideoLinks(block);
}

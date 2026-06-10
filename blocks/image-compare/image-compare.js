/*
 * Image Compare Block
 * Two images per row (before | after) revealed by a draggable divider.
 * A full-size transparent range input drives the divider, giving pointer
 * dragging and keyboard support (ArrowLeft/ArrowRight) natively.
 * Reference: Block Party "Image-Compare" (dave-fink/franklin-demo).
 */

function buildComparison(beforeMedia, afterMedia) {
  const frame = document.createElement('div');
  frame.className = 'image-compare-frame';
  frame.style.setProperty('--position', '50%');

  const after = document.createElement('div');
  after.className = 'image-compare-after';
  after.append(afterMedia);

  const before = document.createElement('div');
  before.className = 'image-compare-before';
  before.append(beforeMedia);

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '100';
  slider.value = '50';
  slider.className = 'image-compare-slider';
  const beforeAlt = beforeMedia.querySelector('img')?.alt || beforeMedia.alt;
  slider.setAttribute('aria-label', beforeAlt
    ? `Percentage of "${beforeAlt}" shown`
    : 'Percentage of before image shown');
  slider.addEventListener('input', () => {
    frame.style.setProperty('--position', `${slider.value}%`);
  });

  const line = document.createElement('div');
  line.className = 'image-compare-line';
  line.setAttribute('aria-hidden', 'true');

  const handle = document.createElement('div');
  handle.className = 'image-compare-handle';
  handle.setAttribute('aria-hidden', 'true');

  frame.append(after, before, slider, line, handle);
  return frame;
}

export default function decorate(block) {
  [...block.children].forEach((row) => {
    const media = [...row.querySelectorAll('picture, img')]
      .filter((el) => el.tagName === 'PICTURE' || !el.closest('picture'));
    if (media.length < 2) {
      row.remove();
      return;
    }
    row.replaceWith(buildComparison(media[0], media[1]));
  });
}

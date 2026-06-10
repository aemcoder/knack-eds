/*
 * CTA Block
 * Standalone 1x1 block: heading (h2/h3) + paragraph + button, rendered as the
 * purple-to-pink gradient rounded card (visually consistent with the
 * `cta-banner` section style used on the homepage).
 */

export default function decorate(block) {
  const content = block.querySelector(':scope > div > div');
  if (content) content.classList.add('cta-content');
}

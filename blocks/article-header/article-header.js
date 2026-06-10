/*
 * Article Header Block (autoblocked on blog/video templates, never authored)
 * Renders the h1, a byline from `author` + `publication-date` metadata,
 * and the hero image.
 */
import { getMetadata } from '../../scripts/aem.js';

function formatDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function buildByline() {
  const author = getMetadata('author');
  const date = getMetadata('publication-date');
  if (!author && !date) return null;

  const byline = document.createElement('p');
  byline.className = 'article-header-byline';

  if (author) {
    const avatar = document.createElement('span');
    avatar.className = 'article-header-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = author
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
    const name = document.createElement('span');
    name.className = 'article-header-author';
    name.textContent = author;
    byline.append(avatar, name);
  }

  if (date) {
    const time = document.createElement('time');
    time.className = 'article-header-date';
    time.setAttribute('datetime', date);
    time.textContent = formatDate(date);
    byline.append(time);
  }

  return byline;
}

export default function decorate(block) {
  const [titleRow, imageRow] = [...block.children];

  if (titleRow) {
    titleRow.className = 'article-header-title';
    const byline = buildByline();
    if (byline) titleRow.firstElementChild.append(byline);
  }

  if (imageRow) {
    imageRow.className = 'article-header-image';
    const img = imageRow.querySelector('img');
    if (img) img.setAttribute('loading', 'eager');
  }
}

const DEFAULT_LIMIT = 4;

/**
 * Picks the default query index for the current page path.
 * @param {string} path The current page path
 * @returns {string} The query index URL
 */
function defaultSource(path) {
  if (path.startsWith('/case-study/')) return '/case-study/query-index.json';
  return '/blog/query-index.json';
}

/**
 * Fetches the most recent posts from a query index, newest first,
 * excluding the given page. Returns [] when the index is unavailable.
 * @param {string} source The query index URL
 * @param {object} [options] Options
 * @param {string} [options.excludePath] Page path to exclude (e.g. the current page)
 * @param {number} [options.limit] Maximum number of posts
 * @returns {Promise<object[]>} The recent index records
 */
export async function fetchRecentPosts(source, { excludePath = '', limit = DEFAULT_LIMIT } = {}) {
  try {
    const resp = await fetch(`${source}?limit=500`);
    if (!resp.ok) return [];
    const { data = [] } = await resp.json();
    const timestamp = (item) => {
      const published = Date.parse(item['publication-date'] || item['published-date'] || '');
      if (!Number.isNaN(published)) return published;
      return (item.lastModified || 0) * 1000;
    };
    return data
      .filter((item) => item.path && item.path !== excludePath)
      .sort((a, b) => timestamp(b) - timestamp(a))
      .slice(0, limit);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`recent-posts: failed to load index ${source}`, e);
    return [];
  }
}

/**
 * Decorates the recent-posts block: an optional title cell plus optional
 * `source` / `limit` config rows; renders up to 4 linked titles from the
 * relevant query index (blog by default, case-study on /case-study/* pages).
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  block.classList.add('recent-posts');

  let title = '';
  let source = '';
  let limit = DEFAULT_LIMIT;
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    const key = cells.length > 1 ? cells[0].textContent.trim().toLowerCase() : '';
    if (key === 'source') {
      const link = cells[1].querySelector('a');
      const value = link ? link.href : cells[1].textContent.trim();
      source = new URL(value, window.location.href).pathname;
    } else if (key === 'limit') {
      limit = parseInt(cells[1].textContent, 10) || DEFAULT_LIMIT;
    } else {
      const text = cells.map((cell) => cell.textContent.trim()).find((t) => t);
      if (text && !title) title = text;
    }
  });

  source = source || defaultSource(window.location.pathname);
  const posts = await fetchRecentPosts(source, {
    excludePath: window.location.pathname,
    limit,
  });

  block.textContent = '';
  if (posts.length === 0) {
    const wrapper = block.parentElement;
    if (wrapper && wrapper.children.length === 1) wrapper.remove();
    else block.remove();
    return;
  }

  if (title) {
    const heading = document.createElement('h3');
    heading.className = 'recent-posts-title';
    heading.textContent = title;
    block.append(heading);
  }

  const list = document.createElement('ul');
  list.className = 'recent-posts-list';
  posts.forEach((post) => {
    const li = document.createElement('li');
    const link = document.createElement('a');
    link.href = post.path;
    link.textContent = post.title || post.path;
    li.append(link);
    list.append(li);
  });
  block.append(list);
}

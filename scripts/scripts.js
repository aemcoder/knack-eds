import {
  buildBlock,
  getMetadata,
  loadHeader,
  loadFooter,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
} from './aem.js';

/**
 * Builds hero block and prepends to main in a new section.
 * @param {Element} main The container element
 */
function buildHeroBlock(main) {
  const h1 = main.querySelector('h1');
  const picture = main.querySelector('picture');
  // eslint-disable-next-line no-bitwise
  if (h1 && picture && (h1.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_PRECEDING)) {
    // Check if h1 or picture is already inside a hero block
    if (h1.closest('.hero') || picture.closest('.hero')) {
      return; // Don't create a duplicate hero block
    }
    const section = document.createElement('div');
    section.append(buildBlock('hero', { elems: [picture, h1] }));
    main.prepend(section);
  }
}

/**
 * Builds the slug Yoast SEO generates for heading anchors on the source site
 * (`h-` prefix, lowercase, punctuation stripped, `&nbsp;` kept as a word) so
 * inbound deep links to imported articles keep working.
 * @param {string} text The heading text
 * @returns {string} The Yoast-compatible heading id
 */
function toYoastAnchor(text) {
  const slug = text
    .toLowerCase()
    .replace(/\u00a0/g, ' nbsp ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  return `h-${slug}`;
}

/**
 * Builds the article header (h1 + byline + hero image) for blog/video pages.
 * @param {Element} main The container element
 */
function buildArticleHeader(main) {
  if (main.querySelector('.article-header')) return;
  const h1 = main.querySelector('h1');
  if (!h1 || h1.closest('div[class]')) return;

  let media = main.querySelector('picture, img');
  // eslint-disable-next-line no-bitwise
  if (media && !(h1.compareDocumentPosition(media) & Node.DOCUMENT_POSITION_FOLLOWING)) {
    media = null;
  }
  if (media && (media.closest('div[class]') || media.closest('main > div') !== h1.closest('main > div'))) {
    media = null;
  }
  if (!media) {
    const ogImage = getMetadata('og:image');
    if (ogImage) {
      media = document.createElement('img');
      media.src = ogImage;
      media.alt = '';
    }
  }
  if (media) {
    const wrapper = media.closest('p') || media;
    const elems = wrapper === media ? [media] : [wrapper];
    const section = document.createElement('div');
    section.append(buildBlock('article-header', [[{ elems: [h1] }], [{ elems }]]));
    main.prepend(section);
  } else {
    const section = document.createElement('div');
    section.append(buildBlock('article-header', [[{ elems: [h1] }]]));
    main.prepend(section);
  }
}

/**
 * Assigns Yoast-compatible anchors to article headings and builds a table of
 * contents block from the body h2s, rendered in a sidebar on large screens.
 * @param {Element} main The container element
 */
function buildToc(main) {
  main.querySelectorAll('h2, h3, h4').forEach((heading) => {
    if (!heading.closest('div[class]')) heading.id = toYoastAnchor(heading.textContent);
  });
  if (main.querySelector('.toc')) return;
  const firstH2 = [...main.querySelectorAll('h2')].find((h2) => !h2.closest('div[class]'));
  if (!firstH2) return;
  const section = firstH2.closest('main > div');
  if (!section) return;
  section.prepend(buildBlock('toc', ''));
}

/**
 * Converts lone video link paragraphs in default content into click-to-load
 * video blocks (links inside blocks are handled by the blocks themselves).
 * @param {Element} main The container element
 */
function buildEmbedBlocks(main) {
  const videoLink = /youtube\.com|youtu\.be|wistia/;
  main.querySelectorAll('p > a[href]').forEach((a) => {
    const p = a.parentElement;
    if (p.closest('div[class]') || p.children.length !== 1) return;
    if (!videoLink.test(a.href)) return;
    const text = a.textContent.trim();
    if (!text || p.textContent.trim() !== text) return;
    p.replaceWith(buildBlock('video', { elems: [a] }));
  });
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    // auto load `*/fragments/*` references
    const fragments = [...main.querySelectorAll('a[href*="/fragments/"]')].filter((f) => !f.closest('.fragment'));
    if (fragments.length > 0) {
      // eslint-disable-next-line import/no-cycle
      import('../blocks/fragment/fragment.js').then(({ loadFragment }) => {
        fragments.forEach(async (fragment) => {
          try {
            const { pathname } = new URL(fragment.href);
            const frag = await loadFragment(pathname);
            fragment.parentElement.replaceWith(...frag.children);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Fragment loading failed', error);
          }
        });
      });
    }

    const template = (getMetadata('template') || '').toLowerCase();
    const isArticle = (template === 'blog' || template === 'video') && main.closest('body');
    if (isArticle) {
      buildArticleHeader(main);
      buildToc(main);
    } else {
      buildHeroBlock(main);
    }
    buildEmbedBlocks(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates formatted links to style them as buttons.
 * @param {HTMLElement} main The main container element
 */
function decorateButtons(main) {
  main.querySelectorAll('p a[href]').forEach((a) => {
    a.title = a.title || a.textContent;
    const p = a.closest('p');
    const text = a.textContent.trim();

    // quick structural checks
    if (a.querySelector('img') || p.textContent.trim() !== text) return;

    // skip URL display links
    try {
      if (new URL(a.href).href === new URL(text, window.location).href) return;
    } catch { /* continue */ }

    // require authored formatting for buttonization
    const strong = a.closest('strong');
    const em = a.closest('em');
    if (!strong && !em) return;

    p.className = 'button-wrapper';
    a.className = 'button';
    if (strong && em) { // high-impact call-to-action
      a.classList.add('accent');
      const outer = strong.contains(em) ? strong : em;
      outer.replaceWith(a);
    } else if (strong) {
      a.classList.add('primary');
      strong.replaceWith(a);
    } else {
      a.classList.add('secondary');
      em.replaceWith(a);
    }
  });
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
  decorateButtons(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Opens links to /modals/ paths in a modal dialog.
 * @param {Element} doc The container element
 */
function autolinkModals(doc) {
  doc.addEventListener('click', async (e) => {
    const origin = e.target.closest('a');
    if (origin && origin.href && origin.href.includes('/modals/')) {
      e.preventDefault();
      const { openModal } = await import('../blocks/modal/modal.js');
      openModal(origin.href);
    }
  });
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  autolinkModals(doc);
  loadHeader(doc.querySelector('header'));

  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();

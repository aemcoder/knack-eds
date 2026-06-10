import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(min-width: 900px)');

function closeOnEscape(e) {
  if (e.code === 'Escape') {
    const nav = document.getElementById('nav');
    const navSections = nav.querySelector('.nav-sections');
    if (!navSections) return;
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections);
      navSectionExpanded.focus();
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections);
      nav.querySelector('button').focus();
    }
  }
}

function closeOnFocusLost(e) {
  const nav = e.currentTarget;
  if (e.relatedTarget && !nav.contains(e.relatedTarget)) {
    const navSections = nav.querySelector('.nav-sections');
    if (!navSections) return;
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections, false);
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections, false);
    }
  }
}

function openOnKeydown(e) {
  const focused = document.activeElement;
  if (!focused.classList.contains('nav-drop')) return;
  if (e.code === 'Enter' || e.code === 'Space' || e.code === 'ArrowDown') {
    e.preventDefault();
    const expanded = focused.getAttribute('aria-expanded') === 'true';
    // eslint-disable-next-line no-use-before-define
    toggleAllNavSections(focused.closest('.nav-sections'));
    focused.setAttribute('aria-expanded', expanded && e.code !== 'ArrowDown' ? 'false' : 'true');
    if (e.code === 'ArrowDown') {
      const firstLink = focused.querySelector('ul a');
      if (firstLink) firstLink.focus();
    }
  }
  if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
    e.preventDefault();
    const items = [...focused.closest('ul').children].filter((li) => li.matches('li'));
    const index = items.indexOf(focused);
    const next = items[e.code === 'ArrowRight' ? index + 1 : index - 1];
    if (next) (next.classList.contains('nav-drop') ? next : next.querySelector('a'))?.focus();
  }
}

function focusNavSection() {
  document.activeElement.addEventListener('keydown', openOnKeydown);
}

/**
 * Toggles all nav sections
 * @param {Element} sections The container element
 * @param {Boolean} expanded Whether the element should be expanded or collapsed
 */
function toggleAllNavSections(sections, expanded = false) {
  if (!sections) return;
  sections.querySelectorAll('.nav-sections .default-content-wrapper > ul > li').forEach((section) => {
    section.setAttribute('aria-expanded', expanded);
  });
}

/**
 * Toggles the entire nav
 * @param {Element} nav The container element
 * @param {Element} navSections The nav sections within the container element
 * @param {*} forceExpanded Optional param to force nav expand behavior when not null
 */
function toggleMenu(nav, navSections, forceExpanded = null) {
  const expanded = forceExpanded !== null ? !forceExpanded : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  document.body.style.overflowY = (expanded || isDesktop.matches) ? '' : 'hidden';
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  toggleAllNavSections(navSections, false);
  button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
  // enable nav dropdown keyboard accessibility
  if (navSections) {
    const navDrops = navSections.querySelectorAll('.nav-drop');
    if (isDesktop.matches) {
      navDrops.forEach((drop) => {
        if (!drop.hasAttribute('tabindex')) {
          drop.setAttribute('tabindex', 0);
          drop.addEventListener('focus', focusNavSection);
        }
      });
    } else {
      navDrops.forEach((drop) => {
        drop.removeAttribute('tabindex');
        drop.removeEventListener('focus', focusNavSection);
      });
    }
  }

  // enable menu collapse on escape keypress
  if (!expanded || isDesktop.matches) {
    // collapse menu on escape press
    window.addEventListener('keydown', closeOnEscape);
    // collapse menu on focus lost
    nav.addEventListener('focusout', closeOnFocusLost);
  } else {
    window.removeEventListener('keydown', closeOnEscape);
    nav.removeEventListener('focusout', closeOnFocusLost);
  }
}

/**
 * Marks the label of a list item: either a direct paragraph without a link
 * (as normalized by DA) or stray text nodes, which get wrapped in a span.
 * @param {Element} el The list item whose label gets marked
 * @param {string} className Class for the label element
 */
function markLabel(el, className) {
  el.querySelectorAll(':scope > p:not(:has(a))').forEach((p) => p.classList.add(className));
  [...el.childNodes]
    .filter((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim())
    .forEach((n) => {
      const span = document.createElement('span');
      span.className = className;
      span.textContent = n.textContent.trim();
      n.replaceWith(span);
    });
}

/**
 * Decorates a top-level dropdown item into a mega-menu panel:
 * groups (items with a nested list) become labeled columns, plain links
 * become the panel footer row, and trailing text becomes link descriptions.
 * @param {Element} navSection The top-level li element
 */
function buildMegaPanel(navSection) {
  markLabel(navSection, 'nav-drop-label');
  const panel = navSection.querySelector(':scope > ul');
  if (!panel) return;
  panel.className = 'nav-panel';
  const footerLinks = [];
  [...panel.children].forEach((item) => {
    const sublist = item.querySelector(':scope > ul');
    if (sublist) {
      item.className = 'nav-group';
      markLabel(item, 'nav-group-label');
      sublist.querySelectorAll(':scope > li').forEach((link) => {
        markLabel(link, 'nav-link-desc');
      });
    } else {
      footerLinks.push(item);
    }
  });
  if (footerLinks.length) {
    const footer = document.createElement('li');
    footer.className = 'nav-panel-footer';
    const list = document.createElement('ul');
    list.append(...footerLinks);
    footer.append(list);
    panel.append(footer);
  }
  if (panel.querySelectorAll(':scope > .nav-group').length === 1) {
    panel.classList.add('nav-panel-single');
  }
}

/**
 * Enables hover open/close for desktop mega menus.
 * @param {Element} navSection The top-level li element
 * @param {Element} navSections The nav sections container
 */
function enableHover(navSection, navSections) {
  navSection.addEventListener('mouseenter', () => {
    if (!isDesktop.matches) return;
    toggleAllNavSections(navSections);
    navSection.setAttribute('aria-expanded', 'true');
  });
  navSection.addEventListener('mouseleave', () => {
    if (!isDesktop.matches) return;
    navSection.setAttribute('aria-expanded', 'false');
  });
}

/**
 * Replaces the search link in the tools section with an expanding search form.
 * @param {Element} navTools The nav tools section
 */
function buildSearch(navTools) {
  const searchIcon = navTools.querySelector('.icon-search');
  const searchLi = searchIcon && searchIcon.closest('li');
  if (!searchLi) return;
  searchLi.className = 'nav-search';
  const link = searchLi.querySelector('a');
  searchLi.innerHTML = `
    <button type="button" class="nav-search-toggle" aria-expanded="false" aria-label="Open search"></button>
    <form action="${link ? new URL(link.href).pathname : '/'}" method="get" role="search" class="nav-search-form" hidden>
      <input type="search" name="s" placeholder="Search" aria-label="Search">
      <button type="button" class="nav-search-close" aria-label="Close search"></button>
    </form>`;
  searchLi.querySelector('.nav-search-toggle').append(searchIcon);
  const toggle = searchLi.querySelector('.nav-search-toggle');
  const form = searchLi.querySelector('.nav-search-form');
  const close = () => {
    form.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  };
  toggle.addEventListener('click', () => {
    form.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    form.querySelector('input').focus();
  });
  searchLi.querySelector('.nav-search-close').addEventListener('click', close);
  form.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      close();
      toggle.focus();
    }
  });
}

/**
 * Tags tools list items so CTAs can be styled (strong = primary, em = secondary).
 * @param {Element} navTools The nav tools section
 */
function decorateTools(navTools) {
  navTools.querySelectorAll(':scope li').forEach((li) => {
    if (li.querySelector('strong')) li.className = 'nav-cta-primary';
    else if (li.querySelector('em')) li.className = 'nav-cta-secondary';
  });
  buildSearch(navTools);
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // load nav as fragment
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);

  // decorate nav DOM
  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-label', 'Main');
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  const classes = ['brand', 'sections', 'tools'];
  classes.forEach((c, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  const navBrand = nav.querySelector('.nav-brand');
  const brandLink = navBrand.querySelector('a');
  if (brandLink) brandLink.setAttribute('aria-label', 'Knack home');

  const navSections = nav.querySelector('.nav-sections');
  if (navSections) {
    navSections.querySelectorAll(':scope .default-content-wrapper > ul > li').forEach((navSection) => {
      if (navSection.querySelector('ul')) {
        navSection.classList.add('nav-drop');
        navSection.setAttribute('aria-haspopup', 'true');
        buildMegaPanel(navSection);
        enableHover(navSection, navSections);
      }
      navSection.addEventListener('click', (e) => {
        if (e.target.closest('a')) return;
        const expanded = navSection.getAttribute('aria-expanded') === 'true';
        toggleAllNavSections(navSections);
        navSection.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      });
    });
  }

  const navTools = nav.querySelector('.nav-tools');
  if (navTools) decorateTools(navTools);

  // hamburger for mobile
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => toggleMenu(nav, navSections));
  nav.prepend(hamburger);
  nav.setAttribute('aria-expanded', 'false');
  // prevent mobile nav behavior on window resize
  toggleMenu(nav, navSections, isDesktop.matches);
  isDesktop.addEventListener('change', () => toggleMenu(nav, navSections, isDesktop.matches));

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}

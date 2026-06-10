import { loadCSS } from './aem.js';

/*
 * Consent-aware martech loader.
 *
 * Consent state machine (persisted in localStorage under CONSENT_KEY):
 *   'undecided' (no stored value) -> show the consent banner, load no martech
 *   'accepted'                    -> load GTM, HubSpot tracking, ClickCease
 *   'declined'                    -> load nothing
 *
 * The consent-banner block persists the choice and dispatches a
 * `consent-changed` CustomEvent (detail: { state }) on document, which this
 * module listens to so martech can be (un)loaded without a page reload.
 */

const CONSENT_KEY = 'knack-cookie-consent';
const GTM_ID = 'GTM-KMHV9QD';
const HUBSPOT_PORTAL_ID = '23287346';

/**
 * Reads the persisted consent state.
 * @returns {string} 'accepted', 'declined', or 'undecided'
 */
function getConsentState() {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    if (value === 'accepted' || value === 'declined') return value;
  } catch (e) {
    // localStorage unavailable: treat as undecided
  }
  return 'undecided';
}

/**
 * Injects a script tag marked as martech so it can be removed on revocation.
 * @param {string} src The script URL
 * @param {Object} attributes Additional attributes to set on the script tag
 */
function injectMartechScript(src, attributes = {}) {
  if (document.querySelector(`script[src="${src}"]`)) return;
  const script = document.createElement('script');
  script.src = src;
  script.async = true;
  script.dataset.martech = 'true';
  Object.entries(attributes).forEach(([name, value]) => {
    script.setAttribute(name, value);
  });
  document.head.append(script);
}

function loadGTM() {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
  injectMartechScript(`https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`);
}

function loadHubSpotTracking() {
  injectMartechScript(`https://js.hs-scripts.com/${HUBSPOT_PORTAL_ID}.js`, {
    id: 'hs-script-loader',
    defer: '',
  });
}

function loadClickCease() {
  injectMartechScript('https://www.clickcease.com/monitor/stat.js');
}

let martechLoaded = false;

function loadMartech() {
  if (martechLoaded) return;
  martechLoaded = true;
  [loadGTM, loadHubSpotTracking, loadClickCease].forEach((load) => {
    try {
      load();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('martech loader failed', e);
    }
  });
}

/**
 * Best-effort removal of injected martech on consent revocation. Scripts that
 * already executed keep their in-memory state until the next page load, but no
 * further martech is fetched.
 */
function unloadMartech() {
  document.querySelectorAll('script[data-martech]').forEach((script) => script.remove());
  martechLoaded = false;
}

async function showConsentBanner() {
  if (document.querySelector('.consent-banner')) return;
  try {
    const block = document.createElement('div');
    block.className = 'consent-banner block';
    block.dataset.blockName = 'consent-banner';
    await loadCSS(`${window.hlx.codeBasePath}/blocks/consent-banner/consent-banner.css`);
    const module = await import('../blocks/consent-banner/consent-banner.js');
    document.body.append(block);
    await module.default(block);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('consent banner failed to load', e);
  }
}

function initConsent() {
  document.addEventListener('consent-changed', (e) => {
    const state = (e.detail && e.detail.state) || getConsentState();
    if (state === 'accepted') loadMartech();
    else unloadMartech();
  });

  const state = getConsentState();
  if (state === 'accepted') loadMartech();
  else if (state === 'undecided') showConsentBanner();
}

try {
  initConsent();
} catch (e) {
  // eslint-disable-next-line no-console
  console.warn('consent init failed', e);
}

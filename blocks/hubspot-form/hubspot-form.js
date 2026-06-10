/*
 * HubSpot Form Block
 * Embeds a HubSpot form via the v2 forms script.
 *
 * Authored config rows:
 *   portal-id (optional, defaults to the Knack portal)
 *   form-id   (required)
 *   region    (optional, defaults to na1)
 *
 * Forms are a functional necessity: the forms script loads on demand (when the
 * block scrolls into view) even before a consent decision, but no tracking
 * script is ever loaded here. If the visitor declined consent or the script
 * fails to load, a fallback message with a contact link is shown instead.
 */

import { readBlockConfig } from '../../scripts/aem.js';

const CONSENT_KEY = 'knack-cookie-consent';
const DEFAULT_PORTAL_ID = '23287346';
const DEFAULT_REGION = 'na1';
const FORMS_SCRIPT_SRC = 'https://js.hsforms.net/forms/embed/v2.js';

let formsScriptPromise = null;
let formCounter = 0;

function consentDeclined() {
  try {
    return localStorage.getItem(CONSENT_KEY) === 'declined';
  } catch (e) {
    return false;
  }
}

/**
 * Loads the HubSpot forms embed script once, shared across all block instances.
 * @returns {Promise<void>} resolves when window.hbspt.forms is available
 */
function loadFormsScript() {
  if (!formsScriptPromise) {
    formsScriptPromise = new Promise((resolve, reject) => {
      if (window.hbspt && window.hbspt.forms) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = FORMS_SCRIPT_SRC;
      script.async = true;
      script.addEventListener('load', () => {
        if (window.hbspt && window.hbspt.forms) resolve();
        else reject(new Error('HubSpot forms API unavailable after script load'));
      });
      script.addEventListener('error', () => {
        reject(new Error(`Failed to load ${FORMS_SCRIPT_SRC}`));
      });
      document.head.append(script);
    });
  }
  return formsScriptPromise;
}

/**
 * Replaces the block content with a fallback message and contact link.
 * @param {Element} block The block element
 * @param {string} message The message to show
 */
function showFallback(block, message) {
  block.textContent = '';
  const fallback = document.createElement('p');
  fallback.className = 'hubspot-form-fallback';
  fallback.append(`${message} `);
  const contactLink = document.createElement('a');
  contactLink.href = '/contact-sales/';
  contactLink.textContent = 'Contact us';
  fallback.append(contactLink, ' and we’ll get right back to you.');
  block.append(fallback);
}

async function embedForm(block, target, config) {
  if (consentDeclined()) {
    showFallback(block, 'This form is unavailable because cookies were declined.');
    return;
  }
  try {
    await loadFormsScript();
    window.hbspt.forms.create({
      region: config.region,
      portalId: config.portalId,
      formId: config.formId,
      target: `#${target.id}`,
    });
    block.classList.add('embed-loaded');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('hubspot form embed failed', e);
    showFallback(block, 'The form could not be loaded.');
  }
}

/**
 * Decorates the hubspot-form block.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const blockConfig = readBlockConfig(block);
  const config = {
    portalId: blockConfig['portal-id'] || DEFAULT_PORTAL_ID,
    formId: blockConfig['form-id'],
    region: blockConfig.region || DEFAULT_REGION,
  };
  block.textContent = '';

  if (!config.formId) {
    showFallback(block, 'This form is missing its form id.');
    return;
  }

  formCounter += 1;
  const target = document.createElement('div');
  target.id = `hubspot-form-${formCounter}`;
  target.className = 'hubspot-form-embed';
  block.append(target);

  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      observer.disconnect();
      embedForm(block, target, config);
    }
  }, { rootMargin: '200px' });
  observer.observe(block);

  document.addEventListener('consent-changed', (e) => {
    const accepted = e.detail && e.detail.state === 'accepted';
    if (accepted && !block.classList.contains('embed-loaded') && block.isConnected) {
      block.textContent = '';
      block.append(target);
      embedForm(block, target, config);
    }
  });
}

/*
 * Consent Banner Block
 * Replicates the source site's custom cookie popup (Accept / Decline) as an
 * autoloaded block. It is injected by scripts/delayed.js when no consent
 * decision is stored; it is never authored into content.
 *
 * The chosen state ('accepted' or 'declined') is persisted in localStorage and
 * announced via a `consent-changed` CustomEvent on document.
 */

const CONSENT_KEY = 'knack-cookie-consent';

const BANNER_TEXT = 'This site uses third-party website tracking technologies to provide '
  + 'and continually improve our services, and to display advertisements according to '
  + 'users’ interests. I agree and may revoke or change my consent at any time with '
  + 'effect for the future.';

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
 * Persists the consent decision and notifies listeners.
 * @param {string} state 'accepted' or 'declined'
 */
function setConsentState(state) {
  try {
    localStorage.setItem(CONSENT_KEY, state);
  } catch (e) {
    // localStorage unavailable: decision applies to this page view only
  }
  document.dispatchEvent(new CustomEvent('consent-changed', { detail: { state } }));
}

/**
 * Decorates the consent banner block.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  if (getConsentState() !== 'undecided') {
    block.remove();
    return;
  }

  const card = document.createElement('div');
  card.className = 'consent-banner-card';
  card.setAttribute('role', 'region');
  card.setAttribute('aria-label', 'Cookie consent');

  const text = document.createElement('p');
  text.className = 'consent-banner-text';
  text.append(`${BANNER_TEXT} `);
  const privacyLink = document.createElement('a');
  privacyLink.href = '/privacy/';
  privacyLink.textContent = 'Privacy Policy';
  text.append(privacyLink);

  const actions = document.createElement('div');
  actions.className = 'consent-banner-actions';

  const acceptButton = document.createElement('button');
  acceptButton.type = 'button';
  acceptButton.className = 'consent-banner-accept';
  acceptButton.textContent = 'Accept';

  const declineButton = document.createElement('button');
  declineButton.type = 'button';
  declineButton.className = 'consent-banner-decline';
  declineButton.textContent = 'Decline';

  actions.append(acceptButton, declineButton);
  card.append(text, actions);
  block.append(card);

  const dismiss = (state) => {
    setConsentState(state);
    block.remove();
  };

  acceptButton.addEventListener('click', () => dismiss('accepted'));
  declineButton.addEventListener('click', () => dismiss('declined'));

  const onKeydown = (e) => {
    if (e.key === 'Escape' && block.isConnected) {
      dismiss('declined');
    }
    if (!block.isConnected) document.removeEventListener('keydown', onKeydown);
  };
  document.addEventListener('keydown', onKeydown);
}

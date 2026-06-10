import { readBlockConfig } from '../../scripts/aem.js';

/**
 * Embeds a live Knack application via the official loader script.
 * Config rows: app-id (required), distribution-key (default dist_1).
 * The loader renders the app into a div with id `knack-<distribution-key>`.
 * Loaded lazily on intersection to keep the app script off the critical path.
 */
export default function decorate(block) {
  const { 'app-id': appId, 'distribution-key': distKey = 'dist_1' } = readBlockConfig(block);
  block.textContent = '';

  if (!appId || !/^[a-f0-9]{24}$/.test(appId) || !/^dist_\d+$/.test(distKey)) {
    const fallback = document.createElement('p');
    fallback.className = 'knack-app-unconfigured';
    fallback.textContent = 'This embedded app is not configured.';
    block.append(fallback);
    return;
  }

  const container = document.createElement('div');
  container.id = `knack-${distKey}`;
  block.append(container);

  const load = () => {
    if (block.dataset.appLoaded) return;
    block.dataset.appLoaded = 'true';
    const script = document.createElement('script');
    script.src = `https://loader.knack.com/${appId}/${distKey}/knack.js`;
    script.onerror = () => {
      container.innerHTML = '';
      const fallback = document.createElement('p');
      fallback.textContent = 'The embedded app could not be loaded.';
      container.append(fallback);
    };
    document.head.append(script);
  };

  const observer = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      observer.disconnect();
      load();
    }
  }, { rootMargin: '300px' });
  observer.observe(block);
}

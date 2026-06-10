/*
 * Video Block
 * Show a video referenced by a link
 * https://www.hlx.live/developer/block-collection/video
 */

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/**
 * Determines the video source type from a link
 * @param {string} link - The video link URL
 * @returns {string} - 'youtube', 'vimeo', or 'video'
 */
function getVideoSource(link) {
  if (link.includes('youtube') || link.includes('youtu.be')) return 'youtube';
  if (link.includes('vimeo')) return 'vimeo';
  if (link.includes('wistia')) return 'wistia';
  return 'video';
}

/**
 * Extracts the YouTube video id from a watch/short/embed URL
 * @param {URL} url - The video URL
 * @returns {string} - The video id or an empty string
 */
function getYoutubeId(url) {
  const usp = new URLSearchParams(url.search);
  if (usp.get('v')) return usp.get('v');
  const match = url.pathname.match(/([\w-]{11})\/?$/);
  return match ? match[1] : '';
}

/**
 * Extracts the Wistia media id from a medias/embed/share URL
 * @param {URL} url - The video URL
 * @returns {string} - The media id or an empty string
 */
function getWistiaId(url) {
  const usp = new URLSearchParams(url.search);
  if (usp.get('wvideo')) return usp.get('wvideo');
  const match = url.pathname.match(/\/(?:medias|iframe)\/([a-z0-9]+)/);
  return match ? match[1] : '';
}

/**
 * Gets a human-readable video type label
 * @param {string} source - The video source type ('youtube', 'vimeo', or 'video')
 * @returns {string} - Human-readable label
 */
function getVideoTypeLabel(source) {
  const labels = {
    youtube: 'YouTube video',
    vimeo: 'Vimeo video',
    wistia: 'Wistia video',
    video: 'MP4 video',
  };
  return labels[source] || 'video';
}

function embedYoutube(url, autoplay, background) {
  const usp = new URLSearchParams(url.search);
  let suffix = '';
  if (background || autoplay) {
    const suffixParams = {
      autoplay: autoplay ? '1' : '0',
      mute: background ? '1' : '0',
      controls: background ? '0' : '1',
      disablekb: background ? '1' : '0',
      loop: background ? '1' : '0',
      playsinline: background ? '1' : '0',
    };
    suffix = `&${Object.entries(suffixParams).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`;
  }
  let vid = usp.get('v') ? encodeURIComponent(usp.get('v')) : '';
  const embed = url.pathname;
  if (url.origin.includes('youtu.be')) {
    [, vid] = url.pathname.split('/');
  }

  const temp = document.createElement('div');
  temp.innerHTML = `<div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;">
      <iframe src="https://www.youtube.com${vid ? `/embed/${vid}?rel=0&v=${vid}${suffix}` : embed}" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute;" 
      allow="autoplay; fullscreen; picture-in-picture; encrypted-media; accelerometer; gyroscope; picture-in-picture" allowfullscreen="" scrolling="no" title="Content from Youtube" loading="lazy"></iframe>
    </div>`;
  return temp.children.item(0);
}

function embedVimeo(url, autoplay, background) {
  const [, video] = url.pathname.split('/');
  let suffix = '';
  if (background || autoplay) {
    const suffixParams = {
      autoplay: autoplay ? '1' : '0',
      background: background ? '1' : '0',
    };
    suffix = `?${Object.entries(suffixParams).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`;
  }
  const temp = document.createElement('div');
  temp.innerHTML = `<div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;">
      <iframe src="https://player.vimeo.com/video/${video}${suffix}" 
      style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute;" 
      frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen  
      title="Content from Vimeo" loading="lazy"></iframe>
    </div>`;
  return temp.children.item(0);
}

function embedWistia(url, autoplay) {
  const id = getWistiaId(url);
  const suffix = autoplay ? '?autoPlay=true' : '';
  const temp = document.createElement('div');
  temp.innerHTML = `<div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.25%;">
      <iframe src="https://fast.wistia.net/embed/iframe/${id}${suffix}"
      style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute;"
      allow="autoplay; fullscreen; picture-in-picture" allowfullscreen
      title="Content from Wistia" loading="lazy"></iframe>
    </div>`;
  return temp.children.item(0);
}

function getVideoElement(source, autoplay, background) {
  const video = document.createElement('video');
  video.setAttribute('controls', '');
  if (autoplay) video.setAttribute('autoplay', '');
  if (background) {
    video.setAttribute('loop', '');
    video.setAttribute('playsinline', '');
    video.removeAttribute('controls');
    video.addEventListener('canplay', () => {
      video.muted = true;
      if (autoplay) video.play();
    });
  }

  const sourceEl = document.createElement('source');
  sourceEl.setAttribute('src', source);
  sourceEl.setAttribute('type', `video/${source.split('.').pop()}`);
  video.append(sourceEl);

  return video;
}

function loadVideoEmbed(block, link, autoplay, background) {
  if (block.dataset.embedLoaded === 'true') return;

  const url = new URL(link);
  const source = getVideoSource(link);

  if (source === 'youtube') {
    const embedWrapper = embedYoutube(url, autoplay, background);
    block.append(embedWrapper);
    embedWrapper.querySelector('iframe').addEventListener('load', () => {
      block.dataset.embedLoaded = true;
    });
  } else if (source === 'vimeo') {
    const embedWrapper = embedVimeo(url, autoplay, background);
    block.append(embedWrapper);
    embedWrapper.querySelector('iframe').addEventListener('load', () => {
      block.dataset.embedLoaded = true;
    });
  } else if (source === 'wistia') {
    const embedWrapper = embedWistia(url, autoplay);
    block.append(embedWrapper);
    embedWrapper.querySelector('iframe').addEventListener('load', () => {
      block.dataset.embedLoaded = true;
    });
  } else {
    const videoEl = getVideoElement(link, autoplay, background);
    block.append(videoEl);
    videoEl.addEventListener('canplay', () => {
      block.dataset.embedLoaded = true;
    });
  }
}

/**
 * Builds a facade placeholder (thumbnail derived from the provider) so no
 * third-party iframe is loaded before the user clicks play.
 * @param {string} link - The video link URL
 * @param {string} source - The video source type
 * @returns {Element|null} - A picture element or null if no thumbnail is derivable
 */
function buildFacadePoster(link, source) {
  if (source !== 'youtube') return null;
  const id = getYoutubeId(new URL(link));
  if (!id) return null;
  const picture = document.createElement('picture');
  const img = document.createElement('img');
  img.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  img.alt = '';
  img.loading = 'lazy';
  picture.append(img);
  return picture;
}

export default async function decorate(block) {
  let placeholder = block.querySelector('picture');
  const anchor = block.querySelector('a');
  if (!anchor) return;
  const link = anchor.href;
  block.textContent = '';
  block.dataset.embedLoaded = false;

  const autoplay = block.classList.contains('autoplay');
  const source = getVideoSource(link);
  if (!placeholder && !autoplay) placeholder = buildFacadePoster(link, source);
  const facade = !autoplay && (placeholder || source === 'youtube' || source === 'wistia');

  if (facade) {
    block.classList.add('placeholder');
    const wrapper = document.createElement('div');
    wrapper.className = 'video-placeholder';
    if (placeholder) wrapper.append(placeholder);
    else wrapper.classList.add('video-placeholder-empty');

    const videoType = getVideoTypeLabel(source);
    const ariaLabel = `Play ${videoType}`;
    wrapper.insertAdjacentHTML(
      'beforeend',
      `<div class="video-placeholder-play"><button type="button" title="${ariaLabel}" aria-label="${ariaLabel}"></button></div>`,
    );
    wrapper.addEventListener('click', () => {
      wrapper.remove();
      loadVideoEmbed(block, link, true, false);
    });
    block.append(wrapper);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      observer.disconnect();
      const playOnLoad = autoplay && !prefersReducedMotion.matches;
      loadVideoEmbed(block, link, playOnLoad, autoplay);
    }
  });
  observer.observe(block);
}

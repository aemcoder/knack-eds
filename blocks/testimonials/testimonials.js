/*
 * Testimonials Block (custom)
 * Collection model: each row = [stat h3 + em label | quote | photo + name + role + story link].
 * Renders the gradient customer-story section as a scroll-snap slider with
 * prev/next + dot navigation. Reads `?testimonial=<slug>` (person name,
 * kebab-cased) to preselect a slide, replicating the source site deep links.
 */

function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function personSlug(nameCell) {
  const fullName = nameCell?.querySelector('strong')?.textContent || '';
  const [person] = fullName.split(',');
  return toSlug(person.trim());
}

function buildSlide(row, index) {
  const [statCell, quoteCell, authorCell] = row.children;
  const slide = document.createElement('li');
  slide.className = 'testimonials-card';
  slide.dataset.slideIndex = index;
  slide.dataset.slug = personSlug(authorCell);

  const top = document.createElement('div');
  top.className = 'testimonials-card-top';

  const stat = statCell?.querySelector('h3, h2, h4') || statCell?.firstElementChild;
  if (stat) {
    stat.classList.add('testimonials-stat');
    top.append(stat);
  }

  if (quoteCell) {
    const quote = document.createElement('blockquote');
    quote.className = 'testimonials-quote';
    quote.append(...quoteCell.childNodes);
    top.append(quote);
  }

  const bottom = document.createElement('div');
  bottom.className = 'testimonials-card-bottom';

  if (authorCell) {
    const author = document.createElement('div');
    author.className = 'testimonials-author';
    const picture = authorCell.querySelector('picture, img');
    if (picture) {
      const thumb = document.createElement('div');
      thumb.className = 'testimonials-author-photo';
      thumb.append(picture);
      author.append(thumb);
    }
    const name = [...authorCell.querySelectorAll('p')].find((p) => p.querySelector('strong'));
    if (name) {
      name.className = 'testimonials-author-name';
      author.append(name);
    }
    bottom.append(author);

    const storyLink = authorCell.querySelector('a');
    if (storyLink) {
      storyLink.className = 'testimonials-story';
      bottom.append(storyLink);
    } else {
      const storyText = [...authorCell.querySelectorAll('p')]
        .find((p) => !p.querySelector('strong, picture, img') && p.textContent.trim());
      if (storyText) {
        storyText.className = 'testimonials-story';
        bottom.append(storyText);
      }
    }
  }

  slide.append(top, bottom);
  return slide;
}

function buildControls(block, slideCount) {
  const controls = document.createElement('div');
  controls.className = 'testimonials-controls';

  const prev = document.createElement('button');
  prev.type = 'button';
  prev.className = 'testimonials-prev';
  prev.setAttribute('aria-label', 'Previous testimonial');

  const dots = document.createElement('ol');
  dots.className = 'testimonials-dots';
  for (let i = 0; i < slideCount; i += 1) {
    const li = document.createElement('li');
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.dataset.targetSlide = i;
    dot.setAttribute('aria-label', `Show testimonial ${i + 1} of ${slideCount}`);
    li.append(dot);
    dots.append(li);
  }

  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'testimonials-next';
  next.setAttribute('aria-label', 'Next testimonial');

  controls.append(prev, dots, next);
  block.append(controls);
  return controls;
}

function updateActiveSlide(block, index) {
  block.dataset.activeSlide = index;
  const slides = block.querySelectorAll('.testimonials-card');
  slides.forEach((slide, i) => {
    slide.classList.toggle('active', i === index);
  });
  block.querySelectorAll('.testimonials-dots button').forEach((dot, i) => {
    if (i === index) dot.setAttribute('aria-current', 'true');
    else dot.removeAttribute('aria-current');
  });
  const status = block.querySelector('.testimonials-status');
  const active = slides[index];
  if (status && active) {
    const name = active.querySelector('.testimonials-author-name strong')?.textContent || '';
    status.textContent = `Testimonial ${index + 1} of ${slides.length}${name ? `: ${name}` : ''}`;
  }
}

function showSlide(block, index, behavior = 'smooth') {
  const slides = block.querySelectorAll('.testimonials-card');
  const target = ((index % slides.length) + slides.length) % slides.length;
  const track = block.querySelector('.testimonials-track');
  const offset = slides[target].offsetLeft - slides[0].offsetLeft;
  track.scrollTo({ top: 0, left: offset, behavior });
  updateActiveSlide(block, target);
}

function observeSlides(block) {
  const track = block.querySelector('.testimonials-track');
  const observer = new IntersectionObserver((entries) => {
    if (track.scrollWidth <= track.clientWidth) return;
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        updateActiveSlide(block, parseInt(entry.target.dataset.slideIndex, 10));
      }
    });
  }, { root: track, threshold: 0.6 });
  track.querySelectorAll('.testimonials-card').forEach((slide) => observer.observe(slide));
}

export default function decorate(block) {
  const rows = [...block.children];
  const track = document.createElement('ul');
  track.className = 'testimonials-track';

  rows.forEach((row, i) => {
    track.append(buildSlide(row, i));
    row.remove();
  });
  block.append(track);

  const status = document.createElement('p');
  status.className = 'testimonials-status';
  status.setAttribute('aria-live', 'polite');
  block.append(status);

  if (track.children.length > 1) {
    const controls = buildControls(block, track.children.length);
    controls.querySelector('.testimonials-prev').addEventListener('click', () => {
      showSlide(block, parseInt(block.dataset.activeSlide || 0, 10) - 1);
    });
    controls.querySelector('.testimonials-next').addEventListener('click', () => {
      showSlide(block, parseInt(block.dataset.activeSlide || 0, 10) + 1);
    });
    controls.querySelectorAll('.testimonials-dots button').forEach((dot) => {
      dot.addEventListener('click', () => {
        showSlide(block, parseInt(dot.dataset.targetSlide, 10));
      });
    });
    observeSlides(block);
  }

  const requested = new URLSearchParams(window.location.search).get('testimonial');
  const preselected = requested
    ? [...track.children].findIndex((slide) => slide.dataset.slug === toSlug(requested))
    : -1;
  if (preselected >= 0) {
    block.querySelector(`[data-slide-index="${preselected}"]`).classList.add('preselected');
    requestAnimationFrame(() => showSlide(block, preselected, 'instant'));
  } else {
    updateActiveSlide(block, 0);
  }
}

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const initAnimations = () => {
  document.documentElement.classList.add('js-enabled');

  if (prefersReducedMotion) {
    document.querySelectorAll('#stats [data-stat-target]').forEach((el) => {
      el.textContent = el.getAttribute('data-stat-target');
    });

    initHumanSimpleScalable({ forceFinal: true });
    initFaqChat();
    return;
  }

  revealSections();
  initStatCounters();
  initHumanSimpleScalable();
  initFaqChat();
};

const revealSections = () => {
  const observer = new IntersectionObserver(onIntersect, {
    threshold: 0.2,
    rootMargin: '0px 0px -10% 0px'
  });

  document.querySelectorAll('[data-reveal="section"]').forEach((section) => {
    observer.observe(section);
  });
};

const onIntersect = (entries, observer) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;

    const section = entry.target;
    section.classList.add('reveal-active');

    const BASE_DELAY = 60;
    section.style.setProperty('--section-glow-delay', `${BASE_DELAY}ms`);

    const revealItems = section.querySelectorAll('[data-reveal-item]');
    revealItems.forEach((item, index) => {
      const delay = (index * 90) + BASE_DELAY;
      item.style.setProperty('--reveal-delay', `${delay}ms`);
      item.classList.add('reveal-active');
      if (item.classList.contains('wipe-text')) {
        item.classList.add('wipe-active');
      }
    });

    observer.unobserve(section);
  });
};

const initStatCounters = () => {
  const statsSection = document.getElementById('stats');
  if (!statsSection) return;
  const stats = Array.from(statsSection.querySelectorAll('[data-stat-target]'));
  if (!stats.length) return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      stats.forEach((el, index) => {
        window.setTimeout(() => {
          animateCalibration(el, el.getAttribute('data-stat-target') || '');
        }, index * 90);
      });
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.35, rootMargin: '0px 0px -12% 0px' });

  observer.observe(statsSection);
};

const animateCalibration = (element, targetRaw) => {
  const target = String(targetRaw).trim();
  if (!target) return;
  if (element.dataset.statCalibrated === 'true') return;
  element.dataset.statCalibrated = 'true';

  const duration = 920;
  const start = performance.now();
  const len = target.length;
  const digits = '0123456789';
  const rand = (min, max) => Math.random() * (max - min) + min;

  element.classList.add('is-calibrating');

  const synth = (lockedCount) => {
    let out = '';
    for (let i = 0; i < len; i += 1) {
      const ch = target[i];
      if (i < lockedCount) {
        out += ch;
        continue;
      }
      if (ch === '.') {
        out += Math.random() > 0.7 ? '.' : digits[Math.floor(Math.random() * digits.length)];
        continue;
      }
      if (ch === '%') {
        out += '%';
        continue;
      }
      out += digits[Math.floor(Math.random() * digits.length)];
    }
    return out;
  };

  const step = (now) => {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    const lock = Math.max(0, Math.min(len, Math.floor(ease * (len + 2))));

    element.textContent = synth(lock);

    const jitter = (1 - ease);
    const tx = Math.round(rand(-2.2, 2.2) * jitter);
    const ty = Math.round(rand(-1.1, 1.1) * jitter);
    element.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
    element.style.opacity = String(0.86 + rand(-0.12, 0.08) * jitter);

    if (t < 1) {
      requestAnimationFrame(step);
      return;
    }

    element.textContent = target;
    element.style.transform = '';
    element.style.opacity = '';
    element.classList.remove('is-calibrating');
  };

  requestAnimationFrame(step);
};

const initHumanSimpleScalable = (options = {}) => {
  const section = document.querySelector('[data-hss-section]');
  if (!section) return;

  if (section.dataset.hssInit === 'true') return;
  section.dataset.hssInit = 'true';

  // Initial load state: ONLY the brand visible.
  section.classList.remove('is-brand-hidden');
  section.classList.remove('is-sequenced');

  const brand = section.querySelector('[data-hss-brand]');
  const words = section.querySelectorAll('[data-hss-word]');
  if (!brand || !words.length) return;

  if (options.forceFinal) {
    section.classList.add('is-brand-hidden');
    section.classList.add('is-sequenced');
    return;
  }

  // Respect the floating nav by measuring its actual height and using a CSS variable.
  const floatingNav = document.querySelector('.site-header__floating-nav');
  const measureHeaderOffset = () => {
    const h = floatingNav ? Math.max(0, Math.round(floatingNav.getBoundingClientRect().height)) : 0;
    section.style.setProperty('--hss-header-offset', `${h}px`);
  };

  let resizeTimer = 0;
  const onResize = () => {
    if (resizeTimer) window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      resizeTimer = 0;
      measureHeaderOffset();
    }, 120);
  };

  measureHeaderOffset();
  window.addEventListener('resize', onResize);

  // Trigger: FIRST downward scroll input only.
  let hasTriggered = false;
  let touchY = 0;
  let sequenceTimer = 0;
  let isListening = false;

  const isSectionInView = () => {
    const rect = section.getBoundingClientRect();
    const vh = window.innerHeight || 0;
    return rect.top < vh && rect.bottom > 0;
  };

  const triggerSequence = () => {
    if (hasTriggered) return;
    if (!isSectionInView()) return;
    hasTriggered = true;

    // Brand fades out, then sequence begins.
    section.classList.add('is-brand-hidden');
    if (sequenceTimer) window.clearTimeout(sequenceTimer);
    sequenceTimer = window.setTimeout(() => {
      section.classList.add('is-sequenced');
      sequenceTimer = 0;
    }, 200);

    // Remove listeners after first trigger (no replay loops).
    detach();
  };

  const maybeReset = () => {
    if (!hasTriggered) return;
    if (!isSectionInView()) return;
    if ((window.scrollY || 0) > 2) return;

    hasTriggered = false;
    touchY = 0;
    if (sequenceTimer) window.clearTimeout(sequenceTimer);
    sequenceTimer = 0;

    section.classList.remove('is-brand-hidden');
    section.classList.remove('is-sequenced');

    attach();
  };

  const onWheel = (e) => {
    if (hasTriggered) return;
    if (!e) return;
    if (typeof e.deltaY !== 'number') return;
    if (e.deltaY <= 0) return;
    triggerSequence();
  };

  const onKeyDown = (e) => {
    if (hasTriggered) return;
    const key = e && e.key;
    const triggers = key === 'ArrowDown' || key === 'PageDown' || key === ' ' || key === 'Spacebar';
    if (!triggers) return;
    triggerSequence();
  };

  const onTouchStart = (e) => {
    if (!e || !e.touches || !e.touches.length) return;
    touchY = e.touches[0].clientY;
  };

  const onTouchMove = (e) => {
    if (hasTriggered) return;
    if (!e || !e.touches || !e.touches.length) return;
    const nextY = e.touches[0].clientY;
    const delta = touchY - nextY;
    touchY = nextY;
    if (delta <= 0) return;
    triggerSequence();
  };

  const attach = () => {
    if (isListening) return;
    isListening = true;
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
  };

  const detach = () => {
    if (!isListening) return;
    isListening = false;
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('touchstart', onTouchStart);
    window.removeEventListener('touchmove', onTouchMove);
  };

  attach();
  window.addEventListener('scroll', maybeReset, { passive: true });
};

const initFaqChat = () => {
  const chat = document.querySelector('[data-faq-chat]');
  if (!chat) return;
  const thread = chat.querySelector('[data-faq-thread]');
  const chips = Array.from(chat.querySelectorAll('[data-faq-key]'));
  if (!thread || !chips.length) return;

  const faq = {
    what: {
      q: 'What does Farview Global do?',
      a: 'We design and build software that helps teams operate with less friction—custom products, data and AI, cloud delivery, and dependable engineering support.'
    },
    different: {
      q: 'What makes you different?',
      a: 'We optimize for clarity. Simple interfaces, reliable systems, and calm delivery—so the work stays understandable as it scales.'
    },
    who: {
      q: 'Who do you work with?',
      a: 'Leaders building customer-facing products and internal platforms—often in healthcare, finance, and retail—who want quality, speed, and accountability without complexity.'
    },
    approach: {
      q: 'How do you approach projects?',
      a: 'We start with outcomes and constraints, simplify the path, and ship in steady increments. Security and reliability are defaults—not add-ons.'
    }
  };

  const MAX_MESSAGES = 8;

  const appendMessage = (side, label, text) => {
    const wrap = document.createElement('div');
    wrap.className = `faq-chat__message faq-chat__message--${side} faq-chat__message--enter`;
    const bubble = document.createElement('div');
    bubble.className = 'faq-chat__bubble';
    const meta = document.createElement('span');
    meta.className = 'faq-chat__meta';
    meta.textContent = label;
    const p = document.createElement('p');
    p.className = 'faq-chat__text';
    p.textContent = text;
    bubble.appendChild(meta);
    bubble.appendChild(p);
    wrap.appendChild(bubble);
    thread.appendChild(wrap);

    while (thread.children.length > MAX_MESSAGES) {
      thread.removeChild(thread.firstElementChild);
    }
  };

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const key = chip.getAttribute('data-faq-key');
      const entry = key ? faq[key] : null;
      if (!entry) return;

      appendMessage('visitor', 'You', entry.q);
      window.setTimeout(() => {
        appendMessage('farview', 'Farview Global', entry.a);
      }, 120);
    });
  });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAnimations);
} else {
  initAnimations();
}

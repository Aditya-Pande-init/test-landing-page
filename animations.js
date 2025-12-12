const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const initAnimations = () => {
  document.documentElement.classList.add('js-enabled');

  if (prefersReducedMotion) {
    document.querySelectorAll('[data-stat-target]').forEach((el) => {
      el.textContent = el.getAttribute('data-stat-target');
    });
    return;
  }

  revealSections();
  initStatCounters();
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
  const stats = document.querySelectorAll('[data-stat-target]');
  if (!stats.length) return;

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      animateCountUp(el, parseFloat(el.getAttribute('data-stat-target')));
      obs.unobserve(el);
    });
  }, { threshold: 0.4 });

  stats.forEach((stat) => observer.observe(stat));
};

const animateCountUp = (element, targetValue) => {
  const duration = 1200;
  const start = performance.now();
  const startValue = 0;
  const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

  const step = (currentTime) => {
    const elapsed = Math.min((currentTime - start) / duration, 1);
    const eased = easeOutExpo(elapsed);
    const value = startValue + (targetValue - startValue) * eased;
    element.textContent = formatValue(value, targetValue);

    if (elapsed < 1) {
      requestAnimationFrame(step);
    }
  };

  requestAnimationFrame(step);
};

const formatValue = (value, target) => {
  if (Number.isInteger(target)) {
    return Math.round(value).toString();
  }
  return value.toFixed(getDecimalPlaces(target));
};

const getDecimalPlaces = (value) => {
  const str = value.toString();
  if (!str.includes('.')) return 0;
  return str.split('.')[1].length;
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAnimations);
} else {
  initAnimations();
}

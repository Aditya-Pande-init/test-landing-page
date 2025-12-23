const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const initAnimations = () => {
  document.documentElement.classList.add('js-enabled');

  if (prefersReducedMotion) {
    document.querySelectorAll('#stats [data-stat-target]').forEach((el) => {
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAnimations);
} else {
  initAnimations();
}

/* =============================================================================
   FarviewGlobal Interactive Script
   Production-ready JavaScript with performance optimization
   
   README:
   -------
   Build: No build step required - vanilla ES6+
   Performance knobs:
   - PARTICLE_COUNT: Adjust global ambient particle density (line 25)
   - LUMEN_COUNT: Number of traveling lights on veins (line 25)
   - MOBILE_THRESHOLD: Breakpoint for reduced effects (line 26)
   - VEIN_RES_SCALE: Internal resolution multiplier for line canvas (line 31)
   - ENABLE_VEINS: Master switch for vein background (line 27)
   - WEBGL_PIXEL_RATIO_MAX: Clamp for high-DPI displays (line 33)
  
   Disable heavy effects: Set CONFIG.ENABLE_VEINS = false for low-end devices
   ============================================================================= */

'use strict';

// =============================================================================
// CONFIGURATION & PERFORMANCE SETTINGS
// =============================================================================

const CONFIG = {
  PARTICLE_COUNT: 0,
  MOBILE_THRESHOLD: 768,
  ENABLE_VEINS: true
};

const PREFERS_REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const IS_MOBILE = window.innerWidth <= CONFIG.MOBILE_THRESHOLD;

const utils = {
  random: (min, max) => Math.random() * (max - min) + min,

  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },
  
  throttle: (func, limit) => {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
};
// =============================================================================

function waitForVideoMetadata(video) {
  if (!video) return Promise.reject(new Error('Video element missing'));
  if (video.readyState >= 1) return Promise.resolve(video);
  return new Promise((resolve) => {
    const onLoaded = () => {
      video.removeEventListener('loadedmetadata', onLoaded);
      resolve(video);
    };
    video.addEventListener('loadedmetadata', onLoaded, { once: true });
  });
}
// =============================================================================

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
// =============================================================================

function initLoader() {
  const loader = document.getElementById('fv-loader');
  if (!loader) return Promise.resolve();

  // Loader should run only on page load/refresh; internal navigation in this site does not reload the page.
  // Do not session-skip here, because it can remove the loader immediately and cause a blank flash.

  const boot = loader.querySelector('[data-loader-boot]');
  const title = loader.querySelector('[data-loader-title]');
  const subtitle = loader.querySelector('[data-loader-subtitle]');
  const dot = loader.querySelector('.loader__dot');
  const scan = loader.querySelector('.loader__scan');
  const pulse = loader.querySelector('.loader__pulse');
  const stage = loader.querySelector('.loader__stage');
  const brand = loader.querySelector('.loader__brand');

  if (document?.body) {
    document.body.style.overflow = 'hidden';
  }

  if (boot) {
    const raw = boot.textContent || '';
    boot.textContent = '';
    boot.setAttribute('aria-label', raw);
    Array.from(raw).forEach((ch) => {
      const span = document.createElement('span');
      span.className = 'loader__boot-char';
      span.textContent = ch;
      span.setAttribute('aria-hidden', 'true');
      boot.appendChild(span);
    });
  }

  if (title) {
    const raw = title.textContent || '';
    title.textContent = '';
    title.setAttribute('aria-label', raw);

    Array.from(raw).forEach((ch) => {
      if (ch === ' ') {
        const spacer = document.createElement('span');
        spacer.className = 'loader__space';
        spacer.setAttribute('aria-hidden', 'true');
        title.appendChild(spacer);
        return;
      }

      const span = document.createElement('span');
      span.className = 'loader__char';
      span.textContent = ch;
      span.setAttribute('aria-hidden', 'true');
      title.appendChild(span);
    });
  }

  const cleanup = () => {
    if (document?.body) {
      document.body.style.overflow = '';
    }
    loader.remove();
  };

  const bootChars = loader.querySelectorAll('.loader__boot-char');
  const titleChars = loader.querySelectorAll('.loader__char');

  const hasGSAP = typeof window.gsap === 'object' && typeof window.gsap.timeline === 'function';
  if (!hasGSAP) {
    const sleep = (ms) => new Promise((r) => window.setTimeout(r, ms));
    const animate = (el, keyframes, options) => {
      try {
        return el?.animate ? el.animate(keyframes, options) : null;
      } catch (error) {
        return null;
      }
    };

    return new Promise((resolve) => {
      const run = async () => {
        if (!loader.isConnected) {
          resolve();
          return;
        }

        loader.style.opacity = '1';

        // Stage 1 - Dark Boot Fade-In (0.4s)
        await sleep(400);

        // Stage 2 - type boot line (0.6s total)
        if (boot) {
          boot.style.opacity = '1';
        }
        const bootLen = bootChars.length || 1;
        const typeWindowMs = 450;
        const perChar = Math.max(6, Math.floor(typeWindowMs / bootLen));
        bootChars.forEach((ch, idx) => {
          window.setTimeout(() => {
            ch.style.opacity = '1';
          }, idx * perChar);
        });
        await sleep(450);
        if (boot) {
          boot.style.transition = 'opacity 150ms ease';
          boot.style.opacity = '0';
        }
        await sleep(150);

        // Stage 3 - title reveal with pulse + scanline (1.0s)
        if (brand) {
          brand.style.opacity = '1';
        }
        if (pulse) {
          animate(pulse, [
            { opacity: 0, transform: 'scale(0.92)' },
            { opacity: 1, transform: 'scale(1)' },
            { opacity: 0.35, transform: 'scale(1.04)' }
          ], { duration: 700, easing: 'ease-in-out', fill: 'forwards' });
        }
        titleChars.forEach((el, i) => {
          animate(el, [
            { opacity: 0, transform: 'translateY(16px)', filter: 'blur(10px)' },
            { opacity: 1, transform: 'translateY(0px)', filter: 'blur(0px)' }
          ], { duration: 550, delay: 50 + (i * 20), easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'forwards' });
        });
        if (scan) {
          scan.style.opacity = '1';
          animate(scan, [
            { transform: 'translateX(-120%)', opacity: 0 },
            { transform: 'translateX(-120%)', opacity: 1, offset: 0.1 },
            { transform: 'translateX(240%)', opacity: 1, offset: 0.9 },
            { transform: 'translateX(240%)', opacity: 0 }
          ], { duration: 500, delay: 350, easing: 'ease-in-out', fill: 'forwards' });
        }
        await sleep(1000);

        // Stage 4 - micro glitch (0.3s)
        if (title) {
          const steps = [2, -2, 1.5, 0];
          steps.forEach((x, idx) => {
            window.setTimeout(() => {
              title.style.transform = `translateX(${x}px)`;
            }, idx * 60);
          });
          const flickers = [0.88, 1, 0.92, 1];
          flickers.forEach((a, idx) => {
            window.setTimeout(() => {
              title.style.opacity = String(a);
            }, idx * 75);
          });
        }
        await sleep(300);

        // Stage 5 - subtitle + dot blink twice (0.5s)
        if (subtitle) {
          animate(subtitle, [
            { opacity: 0, transform: 'translateY(8px)' },
            { opacity: 1, transform: 'translateY(0px)' }
          ], { duration: 200, easing: 'ease-out', fill: 'forwards' });
        }
        if (dot) {
          const blink = [1, 0.25, 1, 0.25, 1];
          blink.forEach((v, idx) => {
            window.setTimeout(() => {
              dot.style.opacity = String(v);
            }, idx * 100);
          });
        }
        await sleep(500);

        // Stage 6 - exit (0.8s): compress then dissolve
        if (stage) {
          animate(stage, [
            { transform: 'scaleY(1)', filter: 'blur(0px)', opacity: 1 },
            { transform: 'scaleY(0.94)', filter: 'blur(0px)', opacity: 1 }
          ], { duration: 250, easing: 'ease-in-out', fill: 'forwards' });
          await sleep(250);
          animate(stage, [
            { transform: 'scaleY(0.94)', filter: 'blur(0px)', opacity: 1 },
            { transform: 'scaleY(0.94)', filter: 'blur(10px)', opacity: 0 }
          ], { duration: 550, easing: 'ease-in-out', fill: 'forwards' });
        }
        animate(loader, [
          { opacity: 1 },
          { opacity: 0 }
        ], { duration: 550, delay: 250, easing: 'ease-in-out', fill: 'forwards' });
        await sleep(800);

        cleanup();
        resolve();
      };

      run().catch(() => {
        cleanup();
        resolve();
      });
    });
  }

  return new Promise((resolve) => {
    const tl = gsap.timeline({
      defaults: { ease: 'power3.out' },
      onComplete: () => {
        cleanup();
        resolve();
      }
    });

    // Stage 1 visual fade-in is handled by CSS on first paint.
    if (stage) gsap.set(stage, { scaleY: 1, filter: 'blur(0px)' });
    if (boot) gsap.set(boot, { autoAlpha: 0 });
    if (bootChars.length) gsap.set(bootChars, { autoAlpha: 0 });
    if (brand) gsap.set(brand, { autoAlpha: 0 });
    if (titleChars.length) gsap.set(titleChars, { autoAlpha: 0, y: 16, filter: 'blur(10px)' });
    if (scan) gsap.set(scan, { autoAlpha: 0, xPercent: -120 });
    if (pulse) gsap.set(pulse, { autoAlpha: 0, scale: 0.92 });
    if (subtitle) gsap.set(subtitle, { autoAlpha: 0, y: 8 });
    if (dot) gsap.set(dot, { autoAlpha: 0.2 });

    // Stage 1 - Dark Boot Fade-In (0.4s)
    tl.to({}, { duration: 0.4 });

    // Stage 2 - System Initialization Line (0.6s)
    tl.to(boot, { autoAlpha: 1, duration: 0.01 }, '+=0');
    if (bootChars.length) {
      tl.to(bootChars, {
        autoAlpha: 1,
        duration: 0.01,
        stagger: 0.012
      }, '<');
    }
    tl.to(boot, { autoAlpha: 0, duration: 0.15 }, '+=0.08');

    // Stage 3 - Logo Reveal with Scanline (1.0s)
    {
      const stage3 = gsap.timeline();
      stage3.to(brand, { autoAlpha: 1, duration: 0.01 }, 0);
      if (pulse) {
        stage3.to(pulse, { autoAlpha: 1, scale: 1, duration: 0.35, ease: 'power2.out' }, 0)
          .to(pulse, { autoAlpha: 0.35, scale: 1.04, duration: 0.35, ease: 'power2.inOut' }, 0.3);
      }
      if (titleChars.length) {
        stage3.to(titleChars, {
          autoAlpha: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 0.55,
          stagger: 0.02
        }, 0.05);
      }
      if (scan) {
        stage3.to(scan, { autoAlpha: 1, duration: 0.05 }, 0.35)
          .to(scan, { xPercent: 240, duration: 0.5, ease: 'power2.inOut' }, 0.35)
          .to(scan, { autoAlpha: 0, duration: 0.1 }, 0.85);
      }
      stage3.to({}, { duration: 0.0 }, 1);
      tl.add(stage3, '+=0');
    }

    // Stage 4 - Micro Glitch + Resolve (0.3s)
    if (title) {
      tl.addLabel('loaderGlitch');
      tl.to(title, { x: 2, duration: 0.06, ease: 'none' }, 'loaderGlitch')
        .to(title, { x: -2, duration: 0.06, ease: 'none' })
        .to(title, { x: 1.5, duration: 0.06, ease: 'none' })
        .to(title, { x: 0, duration: 0.06, ease: 'none' });
      tl.to(title, { autoAlpha: 0.88, duration: 0.04, ease: 'none' }, 'loaderGlitch')
        .to(title, { autoAlpha: 1, duration: 0.04, ease: 'none' })
        .to(title, { autoAlpha: 0.92, duration: 0.04, ease: 'none' })
        .to(title, { autoAlpha: 1, duration: 0.04, ease: 'none' });
      tl.to({}, { duration: 0.06 });
    }

    // Stage 5 - Systems Online Confirmation (0.5s)
    if (subtitle) {
      tl.to(subtitle, { autoAlpha: 1, y: 0, duration: 0.2 }, '+=0');
    }
    if (dot) {
      tl.to(dot, { autoAlpha: 1, duration: 0.1, ease: 'none' }, '<')
        .to(dot, { autoAlpha: 0.25, duration: 0.1, ease: 'none' })
        .to(dot, { autoAlpha: 1, duration: 0.1, ease: 'none' })
        .to(dot, { autoAlpha: 0.25, duration: 0.1, ease: 'none' })
        .to(dot, { autoAlpha: 1, duration: 0.1, ease: 'none' });
    }

    // Stage 6 - Exit Transition (0.8s)
    if (stage) {
      tl.to(stage, { scaleY: 0.94, duration: 0.25, ease: 'power2.inOut' }, '+=0');
      tl.to(stage, { filter: 'blur(10px)', autoAlpha: 0, duration: 0.55, ease: 'power2.inOut' }, '>');
    }
    tl.to(loader, { autoAlpha: 0, duration: 0.55, ease: 'power2.inOut' }, '<');
  });
}


function initPreloader() {
  const tl = gsap.timeline();
  
  // Animate grid lines
  tl.to('.grid-line.horizontal', {
    width: '100%',
    duration: 0.8,
    stagger: 0.1,
    ease: 'power4.out'
  })
  .to('.grid-line.vertical', {
    height: '100%',
    duration: 0.8,
    stagger: 0.1,
    ease: 'power4.out'
  }, '-=0.6')
  .to('.boot-text', {
    opacity: 1,
    duration: 0.3,
    stagger: 0.1
  }, '-=0.4')
  .to('.boot-text', {
    opacity: 0,
    duration: 0.2,
    stagger: 0.05
  }, '+=0.5')
  .to('.split-top', {
    y: '-100%',
    duration: 1.2,
    ease: 'power4.inOut'
  })
  .to('.split-bottom', {
    y: '100%',
    duration: 1.2,
    ease: 'power4.inOut'
  }, '-=1.2')
  .to('#preloader', {
    display: 'none',
    duration: 0
  });
  
  return tl;
}

// =============================================================================
// HERO ANIMATION WITH PARALLAX DEPTH
// =============================================================================

function initHeroAnimation(preloaderTimeline) {
  const tl = preloaderTimeline;
  
  // Brand fade in
  tl.to('.hero-brand', {
    opacity: 1,
    duration: 0.6,
    ease: 'power2.out'
  }, '-=0.8');
  
  // Per-letter hero title reveal with depth
  tl.to('.hero-title span', {
    y: 0,
    duration: 1.2,
    stagger: {
      each: 0.03,
      from: 'start'
    },
    ease: 'power4.out'
  }, '-=0.6')
  .to('.hero-subtitle', {
    opacity: 1,
    y: 0,
    duration: 0.8,
    ease: 'power4.out'
  }, '-=0.4')
  .to('.hero-cta', {
    opacity: 1,
    y: 0,
    duration: 0.8,
    ease: 'power4.out'
  }, '-=0.4');
}

// =============================================================================
// CANVAS VEIN NETWORK WITH TRAVELING LUMENS
// =============================================================================

function initVeinNetwork() {
  if (!CONFIG.ENABLE_VEINS) return;
  const canvas = document.getElementById('veinCanvas');
  if (!canvas || !window.FarviewVeins) return;

  if (PREFERS_REDUCED_MOTION) {
    window.FarviewVeins.init(canvas, { prefersReducedMotion: true });
    return;
  }

  window.FarviewVeins.init(canvas, {
    isMobile: IS_MOBILE,
    maxPixelRatio: 1.4
  });
}

// =============================================================================
// FLOATING NODES WITH TRAILS (FALLBACK FOR HERO)
// =============================================================================

function createFloatingNode() {
  if (PREFERS_REDUCED_MOTION) return;
  
  const hero = document.getElementById('hero');
  if (!hero) return;
  
  const node = document.createElement('div');
  node.className = 'floating-node';
  
  const startX = utils.random(0, window.innerWidth);
  const startY = utils.random(0, window.innerHeight);
  const endX = utils.random(0, window.innerWidth);
  const endY = utils.random(0, window.innerHeight);
  
  node.style.left = startX + 'px';
  node.style.top = startY + 'px';
  
  hero.appendChild(node);
  
  // Create trail
  const trail = document.createElement('div');
  trail.className = 'node-trail';
  trail.style.left = startX + 'px';
  trail.style.top = startY + 'px';
  trail.style.width = '0px';
  hero.appendChild(trail);
  
  const angle = Math.atan2(endY - startY, endX - startX);
  const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
  
  trail.style.transform = `rotate(${angle}rad)`;
  trail.style.transformOrigin = 'left center';
  
  // Animate trail
  gsap.to(trail, {
    width: distance,
    duration: 3,
    ease: 'power2.inOut'
  });
  
  // Animate node
  gsap.to(node, {
    left: endX,
    top: endY,
    duration: 3,
    ease: 'power2.inOut',
    onComplete: () => {
      node.remove();
      gsap.to(trail, {
        opacity: 0,
        duration: 0.5,
        onComplete: () => trail.remove()
      });
    }
  });
}

function initFloatingNodes() {
  // Brutalist spec: floating nodes disabled
}

// =============================================================================
// GLOBAL BACKGROUND ANIMATIONS
// =============================================================================

function initGlobalAnimations() {
  // Brutalist spec: animations suppressed to maintain static grid discipline
}

// =============================================================================
// CIRCUIT LINES & PARTICLES
// =============================================================================

function createCircuitLines() {
  // Brutalist spec: disable random circuit lines
}

function createGlobalParticles() {
  // Brutalist spec: disable floating particles
}

function createDataParticles() {
  // Brutalist spec: disable decorative data particles
}

// =============================================================================
// HERO PARALLAX + DEPTH MOTION
// =============================================================================

function initHeroParallax() {
  const hero = document.getElementById('hero');
  if (!hero) return;

  const layers = Array.from(hero.querySelectorAll('.parallax-layer[data-speed]')).filter(
    (layer) => !layer.closest('.hero__content')
  );
  if (!layers.length) return;

  const state = {
    current: 0,
    rafId: null
  };

  const DAMPING = 0.12;
  let heroHeight = hero.offsetHeight || hero.getBoundingClientRect().height;

  const measureTarget = () => {
    const rect = hero.getBoundingClientRect();
    const offset = Math.max(0, Math.min(heroHeight, -rect.top));
    return offset;
  };

  const applyTransforms = (value) => {
    layers.forEach((layer) => {
      const speed = parseFloat(layer.dataset.speed || '1');
      layer.style.transform = `translateY(${value * speed}px)`;
    });
  };

  const updateLayers = () => {
    const target = measureTarget();
    state.current += (target - state.current) * DAMPING;
    applyTransforms(state.current);

    if (Math.abs(target - state.current) > 0.2) {
      state.rafId = requestAnimationFrame(updateLayers);
    } else {
      state.current = target;
      state.rafId = null;
    }
  };

  const onScroll = () => {
    if (state.rafId == null) {
      state.rafId = requestAnimationFrame(updateLayers);
    }
  };

  const onResize = utils.debounce(() => {
    heroHeight = hero.offsetHeight || hero.getBoundingClientRect().height;
    const target = measureTarget();
    state.current = target;
    applyTransforms(target);
  }, 120);

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);

  applyTransforms(measureTarget());
}

// =============================================================================
// SCROLL-LINKED TEXT HIGHLIGHTS
// =============================================================================

function initScrollHighlights({ useScrollTrigger = false } = {}) {
  const targets = document.querySelectorAll('.scroll-highlight');
  if (!targets.length) return;

  targets.forEach((node) => node.classList.remove('active'));
}

// =============================================================================
// STORY BLOCK CINEMATIC REVEALS
// =============================================================================

function initStoryBlocks({ useScrollTrigger = false } = {}) {
  const blocks = document.querySelectorAll('.story-block');
  if (!blocks.length) return;

  if (useScrollTrigger && window.gsap && typeof ScrollTrigger === 'function') {
    blocks.forEach((block) => block.classList.add('visible'));
    return;
  }

  if (PREFERS_REDUCED_MOTION) {
    blocks.forEach((block) => block.classList.add('visible'));
    return;
  }

  const maybeReveal = (block) => {
    if (block.classList.contains('visible')) return true;
    const rect = block.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const inView = rect.top < viewportHeight * 0.85 && rect.bottom > viewportHeight * 0.15;
    if (inView) {
      block.classList.add('visible');
      return true;
    }
    return false;
  };

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.25,
    rootMargin: '0px 0px -10% 0px'
  });

  blocks.forEach((block) => {
    if (!maybeReveal(block)) {
      observer.observe(block);
    }
  });

  requestAnimationFrame(() => {
    blocks.forEach(maybeReveal);
  });
}

// =============================================================================
// SCROLL-LINKED SECTION REVEALS (FALLBACK)
// =============================================================================

function initScrollReveal({ useScrollTrigger = false } = {}) {
  if (useScrollTrigger) return;

  const sections = document.querySelectorAll('.reveal-section');
  if (!sections.length) return;

  const activate = (section) => {
    section.classList.add('is-active');
    const elements = section.querySelectorAll('.reveal-text, .reveal-button, .reveal-tile');
    elements.forEach((el) => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
  };

  if (PREFERS_REDUCED_MOTION || !('IntersectionObserver' in window)) {
    sections.forEach(activate);
    return;
  }

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        activate(entry.target);
        obs.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.25,
    rootMargin: '0px 0px -20% 0px'
  });

  sections.forEach((section) => observer.observe(section));
}

function initPositioningReveal() {
  const section = document.getElementById('positioning');
  if (!section) return;
  if (!section.classList.contains('section--positioning')) return;

  if (section.classList.contains('reveal-active')) return;

  const activate = () => {
    section.classList.add('reveal-active');
  };

  if (PREFERS_REDUCED_MOTION || !('IntersectionObserver' in window)) {
    activate();
    return;
  }

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        activate();
        obs.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.25,
    rootMargin: '0px 0px -20% 0px'
  });

  observer.observe(section);
}

function initFarViewSequence() {
  const root = document.querySelector('[data-farview-sequence]');
  if (!root) return;

  const stage = root.querySelector('[data-farview-stage]');
  const canvas = root.querySelector('[data-farview-canvas]');
  const lineEl = root.querySelector('[data-farview-line]');
  const kickerEl = root.querySelector('[data-farview-kicker]');
  const finalEl = root.querySelector('[data-farview-final]');

  if (!stage || !canvas || !lineEl || !kickerEl || !finalEl) return;

  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
  if (!ctx) return;

  const MAX_DPR = 1.6;

  const smoothstep = (t) => t * t * (3 - 2 * t);
  const norm = (p, a, b) => {
    if (a === b) return 0;
    return clamp((p - a) / (b - a), 0, 1);
  };
  const lerp = (a, b, t) => a + (b - a) * t;

  const statements = [
    { start: 0.03, end: 0.13, text: 'Technology should make life better, not more complicated.' },
    { start: 0.13, end: 0.23, text: 'Work should feel lighter, not louder.' },
    { start: 0.23, end: 0.33, text: 'Systems should support people, not demand attention.' },
    { start: 0.38, end: 0.45, text: 'But most software does the opposite.' },
    { start: 0.45, end: 0.515, text: 'It fragments attention.' },
    { start: 0.515, end: 0.58, text: 'It adds noise.' },
    { start: 0.62, end: 0.76, text: 'We make software that gets software out of the way.' },
  ];

  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    rafId: null,
    progress: 0,
    targetProgress: 0,
    lastLineText: null,
    planes: [],
    field: [],
    resolve: {
      sources: [],
      targets: [],
      particles: [],
      offscreen: null,
      offctx: null,
    },
  };

  const seed = (i) => {
    const x = Math.sin(i * 999.123) * 10000;
    return x - Math.floor(x);
  };

  const buildField = () => {
    const count = Math.max(140, Math.min(260, Math.floor((state.width * state.height) / 9000)));
    state.field = Array.from({ length: count }, (_, i) => {
      const z = 0.12 + seed(i + 1) * 0.88;
      return {
        x: seed(i + 20) * state.width,
        y: seed(i + 70) * state.height,
        z,
        r: 0.6 + seed(i + 130) * 1.8,
        phase: seed(i + 210) * Math.PI * 2,
      };
    });
  };

  const buildPlanes = () => {
    state.planes = [
      { x: 0.18, y: 0.22, w: 0.58, h: 0.28, z: 0.18, rot: -0.06 },
      { x: 0.62, y: 0.58, w: 0.54, h: 0.24, z: 0.34, rot: 0.04 },
      { x: 0.28, y: 0.68, w: 0.48, h: 0.22, z: 0.52, rot: -0.03 },
      { x: 0.72, y: 0.28, w: 0.46, h: 0.20, z: 0.64, rot: 0.02 },
      { x: 0.48, y: 0.42, w: 0.66, h: 0.32, z: 0.26, rot: 0.01 },
    ].map((p) => ({
      ...p,
      px: p.x * state.width,
      py: p.y * state.height,
      pw: p.w * state.width,
      ph: p.h * state.height,
    }));
  };

  const buildResolveTargets = () => {
    const offscreen = state.resolve.offscreen || document.createElement('canvas');
    const offctx = state.resolve.offctx || offscreen.getContext('2d');
    if (!offctx) return;

    state.resolve.offscreen = offscreen;
    state.resolve.offctx = offctx;

    const w = Math.max(1, Math.floor(state.width * 0.9));
    const h = Math.max(1, Math.floor(state.height * 0.52));

    offscreen.width = w;
    offscreen.height = h;

    offctx.clearRect(0, 0, w, h);
    offctx.fillStyle = '#ffffff';

    const fontSize = Math.max(40, Math.min(140, Math.floor(state.width * 0.11)));
    offctx.font = `600 ${fontSize}px Space Grotesk, Arial, sans-serif`;
    offctx.textAlign = 'center';
    offctx.textBaseline = 'middle';
    offctx.fillText('THE FAR VIEW', w / 2, h / 2);

    const image = offctx.getImageData(0, 0, w, h);
    const data = image.data;

    const step = state.width < 700 ? 10 : 8;
    const targets = [];
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const idx = (y * w + x) * 4 + 3;
        const a = data[idx];
        if (a > 50) {
          targets.push({
            x: (state.width - w) * 0.5 + x,
            y: state.height * 0.55 - h * 0.5 + y,
          });
        }
      }
    }

    const cap = state.width < 700 ? 520 : 760;
    const trimmed = targets.length > cap ? targets.filter((_, i) => i % Math.ceil(targets.length / cap) === 0) : targets;

    state.resolve.targets = trimmed;
    state.resolve.particles = trimmed.map((t, i) => {
      const angle = seed(i + 410) * Math.PI * 2;
      const radius = lerp(Math.min(state.width, state.height) * 0.42, Math.min(state.width, state.height) * 0.9, seed(i + 510));
      return {
        x0: state.width / 2 + Math.cos(angle) * radius,
        y0: state.height / 2 + Math.sin(angle) * radius,
        x1: t.x,
        y1: t.y,
        z: 0.45 + seed(i + 610) * 0.55,
      };
    });
  };

  const resize = () => {
    const rect = stage.getBoundingClientRect();
    state.width = Math.max(1, Math.floor(rect.width));
    state.height = Math.max(1, Math.floor(rect.height));
    state.dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    canvas.width = Math.max(1, Math.floor(state.width * state.dpr));
    canvas.height = Math.max(1, Math.floor(state.height * state.dpr));
    canvas.style.width = `${state.width}px`;
    canvas.style.height = `${state.height}px`;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    buildPlanes();
    buildField();
    buildResolveTargets();
  };

  const getScrollProgress = () => {
    const rect = root.getBoundingClientRect();
    const total = Math.max(1, root.offsetHeight - (window.innerHeight || state.height || 1));
    const raw = (-rect.top) / total;
    return clamp(raw, 0, 1);
  };

  const setOverlay = (p) => {
    let active = null;
    const fade = 0.028;
    for (let i = 0; i < statements.length; i += 1) {
      const s = statements[i];
      if (p < s.start || p > s.end) continue;
      const ain = smoothstep(norm(p, s.start, s.start + fade));
      const aout = 1 - smoothstep(norm(p, s.end - fade, s.end));
      active = { text: s.text, alpha: clamp(ain * aout, 0, 1) };
      break;
    }

    const lineAlpha = active ? active.alpha : 0;

    const nextText = active ? active.text : '';
    if (state.lastLineText !== nextText) {
      lineEl.textContent = nextText;
      state.lastLineText = nextText;
    }

    lineEl.style.opacity = String(lineAlpha);
    const lift = (1 - lineAlpha) * 10;
    lineEl.style.transform = `translate(-50%, calc(-50% + ${lift.toFixed(2)}px))`;

    const kickerAlpha = smoothstep(norm(p, 0.76, 0.82)) * (1 - smoothstep(norm(p, 0.992, 1.0)));
    kickerEl.style.opacity = String(clamp(kickerAlpha, 0, 1));

    const finalIn = smoothstep(norm(p, 0.84, 0.88));
    const finalReveal = smoothstep(norm(p, 0.84, 1.0));
    finalEl.style.opacity = String(clamp(finalIn, 0, 1));
    finalEl.style.setProperty('--farview-reveal', String(clamp(finalReveal, 0, 1)));
  };

  const draw = (p) => {
    ctx.clearRect(0, 0, state.width, state.height);
    ctx.fillStyle = '#0a0f1a';
    ctx.fillRect(0, 0, state.width, state.height);

    const act1 = norm(p, 0.0, 0.36);
    const act2 = norm(p, 0.36, 0.58);
    const act3 = norm(p, 0.58, 0.76);
    const act4 = norm(p, 0.76, 1.0);

    const densityBoost = smoothstep(act2);
    const simplify = smoothstep(act3);

    const keepField = 1 - smoothstep(norm(p, 0.62, 0.82));
    const tensionField = smoothstep(act2) * (1 - smoothstep(norm(p, 0.58, 0.62)));
    const fieldAlpha = clamp(0.22 * act1 + 0.26 * tensionField + 0.14 * keepField, 0, 0.34);

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.globalAlpha = fieldAlpha;

    const wobbleBase = lerp(2.6, 7.2, densityBoost);
    const collapseX = lerp(0, state.width * 0.5, simplify);
    const collapseY = lerp(0, state.height * 0.5, simplify);

    for (let i = 0; i < state.field.length; i += 1) {
      const dot = state.field[i];
      const depth = dot.z;
      const par = (1 - depth);
      const wobble = Math.sin(p * Math.PI * wobbleBase + dot.phase) * lerp(2.0, 6.2, densityBoost);
      const drift = act1 * 28 + densityBoost * 42;
      const xBase = dot.x + par * (wobble + drift * (p - 0.12));
      const yBase = dot.y + par * (wobble * 0.45 - drift * (p - 0.12) * 0.22);
      const x = lerp(xBase, collapseX, simplify * par);
      const y = lerp(yBase, collapseY, simplify * par);
      const r = dot.r * lerp(1.25, 0.6, simplify) * lerp(1.0, 1.25, densityBoost) * (0.55 + depth * 0.85);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    const chaosRamp = smoothstep(norm(p, 0.38, 0.58));
    const chaosBoost1 = smoothstep(norm(p, 0.45, 0.515));
    const chaosBoost2 = smoothstep(norm(p, 0.515, 0.58));
    const chaosCollapse = 1 - smoothstep(norm(p, 0.58, 0.62));
    const chaos = clamp(chaosRamp * (0.65 + 0.18 * chaosBoost1 + 0.32 * chaosBoost2) * chaosCollapse, 0, 1);

    const planeHold = 1 - smoothstep(norm(p, 0.62, 0.82));
    const planeAlpha = clamp(0.55 * act1 + 0.62 * densityBoost + 0.18 * planeHold + chaos * 0.22, 0, 0.82) * (1 - smoothstep(norm(p, 0.70, 0.84)));

    ctx.save();
    ctx.globalAlpha = planeAlpha;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < state.planes.length; i += 1) {
      const pl = state.planes[i];
      const depth = pl.z;
      const par = 1 - depth;
      const motion = act1 * 38 + densityBoost * 64 + chaos * (96 + 84 * (1 - depth));
      const t = p * Math.PI * (2.2 + depth * 2.1);
      const dx = Math.sin(t) * motion * 0.12 * par;
      const dy = Math.cos(t * 0.9) * motion * 0.08 * par;
      const toCenter = simplify * par;
      const cx = lerp(pl.px + dx, state.width * 0.5, toCenter);
      const cy = lerp(pl.py + dy, state.height * 0.5, toCenter);
      const scale = lerp(1, 0.32 + depth * 0.42, simplify);
      const rot = pl.rot + Math.sin(t * 0.5) * 0.012 * lerp(1, 1.8, densityBoost + chaos * 0.65) * (1 - simplify);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.scale(scale, scale);

      const w = pl.pw;
      const h = pl.ph;
      const fragMix = chaos * (1 - simplify);
      const splitsBase = 1 + Math.floor(fragMix * 4);
      const splitsExtra = seed(i + 910) > 0.56 ? Math.floor(fragMix * 2) : Math.floor(fragMix);
      const splits = clamp(splitsBase + splitsExtra, 1, 6);

      const baseLw1 = lerp(1.25, 0.9, depth);
      const baseLw2 = lerp(1.8, 1.2, depth);
      const jitterAmp = fragMix * (10 + 8 * (1 - depth));
      const rotAmp = fragMix * 0.018;

      for (let gy = 0; gy < splits; gy += 1) {
        for (let gx = 0; gx < splits; gx += 1) {
          const cell = (i + 1) * 1000 + gx * 31 + gy * 97;
          const rx = seed(cell + 11) * 2 - 1;
          const ry = seed(cell + 29) * 2 - 1;
          const rr = seed(cell + 53) * 2 - 1;

          const jx = rx * jitterAmp;
          const jy = ry * jitterAmp;
          const rj = rr * rotAmp;

          const cw = w / splits;
          const ch = h / splits;
          const x0 = -w / 2 + gx * cw + jx;
          const y0 = -h / 2 + gy * ch + jy;

          const inset = Math.min(6, Math.max(2, Math.min(cw, ch) * 0.08));

          ctx.save();
          ctx.translate(x0 + cw / 2, y0 + ch / 2);
          ctx.rotate(rj);
          ctx.translate(-(x0 + cw / 2), -(y0 + ch / 2));

          ctx.lineWidth = baseLw1;
          const whiteBase = 0.14 + 0.08 * (1 - depth);
          const whiteBoost = 0.04 + 0.06 * (1 - depth);
          const whiteAlpha = clamp(whiteBase + whiteBoost * fragMix, 0, 0.42);
          ctx.strokeStyle = `rgba(255, 255, 255, ${whiteAlpha})`;
          ctx.strokeRect(x0, y0, cw, ch);

          if (cw > inset * 2.6 && ch > inset * 2.6) {
            ctx.lineWidth = baseLw2;
            const goldBase = 0.12 + 0.14 * (1 - depth);
            const goldBoost = 0.06 + 0.10 * (1 - depth);
            const goldAlpha = clamp(goldBase + goldBoost * fragMix, 0, 0.55);
            ctx.strokeStyle = `rgba(201, 168, 107, ${goldAlpha})`;
            ctx.strokeRect(x0 + inset, y0 + inset, cw - inset * 2, ch - inset * 2);
          }

          ctx.restore();
        }
      }

      ctx.restore();
    }
    ctx.restore();

    const clearToEmpty = smoothstep(norm(p, 0.76, 0.90));
    if (clearToEmpty > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(10, 15, 26, ${0.82 * clearToEmpty})`;
      ctx.fillRect(0, 0, state.width, state.height);
      ctx.restore();
    }

    const resolveT = smoothstep(norm(p, 0.84, 1.0));
    if (resolveT > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const goldBase = 0.12 + resolveT * 0.55;
      const alpha = clamp(resolveT, 0, 1) * 0.82;
      ctx.globalAlpha = alpha;
      for (let i = 0; i < state.resolve.particles.length; i += 1) {
        const pt = state.resolve.particles[i];
        const depth = pt.z;
        const ease = smoothstep(resolveT);
        const x = lerp(pt.x0, pt.x1, ease);
        const y = lerp(pt.y0, pt.y1, ease);
        const r = lerp(2.2, 1.15, depth) * lerp(1.0, 0.9, ease);
        ctx.fillStyle = `rgba(201, 168, 107, ${goldBase * (0.65 + (1 - depth) * 0.35)})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  };

  const render = () => {
    state.rafId = null;

    const MAX_STEP = 0.006;
    const EASE = 0.22;
    const EPS = 0.00035;

    const delta = state.targetProgress - state.progress;
    if (Math.abs(delta) <= EPS) {
      state.progress = state.targetProgress;
    } else {
      const eased = delta * EASE;
      const step = clamp(eased, -MAX_STEP, MAX_STEP);
      state.progress = clamp(state.progress + step, 0, 1);
    }

    const p = state.progress;
    setOverlay(p);
    draw(p);

    if (Math.abs(state.targetProgress - state.progress) > EPS) {
      requestRender();
    }
  };

  const requestRender = () => {
    if (state.rafId != null) return;
    state.rafId = requestAnimationFrame(render);
  };

  const onScroll = () => {
    const raw = getScrollProgress();
    const next = raw;
    if (Math.abs(next - state.targetProgress) < 0.0005) return;
    state.targetProgress = next;
    requestRender();
  };

  const onResize = utils.debounce(() => {
    resize();
    requestRender();
  }, 120);

  resize();

  if (PREFERS_REDUCED_MOTION) {
    state.progress = 1;
    state.targetProgress = 1;
    state.lastLineText = '';
    kickerEl.style.opacity = '1';
    finalEl.style.opacity = '1';
    finalEl.style.setProperty('--farview-reveal', '1');
    lineEl.textContent = '';
    lineEl.style.opacity = '0';
    draw(1);
    return;
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  onScroll();
}

function initServicesRail() {
  const section = document.querySelector('[data-services-rail]');
  if (!section) return;

  const triggers = Array.from(section.querySelectorAll('[data-services-trigger]'));
  const panels = Array.from(section.querySelectorAll('[data-services-panel]'));
  if (!triggers.length || !panels.length) return;

  const panelMap = new Map();
  panels.forEach((panel) => {
    const key = panel.getAttribute('data-services-panel');
    if (!key) return;
    panelMap.set(key, panel);
  });

  const stack = section.querySelector('[data-services-stack]');
  if (stack) {
    const measurer = document.createElement('div');
    measurer.style.position = 'absolute';
    measurer.style.left = '0';
    measurer.style.top = '0';
    measurer.style.width = '100%';
    measurer.style.visibility = 'hidden';
    measurer.style.pointerEvents = 'none';
    measurer.style.opacity = '0';
    stack.appendChild(measurer);

    let maxHeight = 0;
    panels.forEach((panel) => {
      const clone = panel.cloneNode(true);
      clone.classList.add('is-active');
      clone.style.position = 'static';
      clone.style.inset = 'auto';
      clone.style.transform = 'none';
      clone.style.visibility = 'visible';
      clone.style.opacity = '1';
      clone.style.pointerEvents = 'none';
      clone.style.transition = 'none';
      measurer.appendChild(clone);
      maxHeight = Math.max(maxHeight, clone.offsetHeight);
      measurer.removeChild(clone);
    });

    stack.removeChild(measurer);
    if (Number.isFinite(maxHeight) && maxHeight > 0) {
      stack.style.minHeight = `${maxHeight}px`;
    }
  }

  triggers.forEach((trigger, index) => {
    trigger.setAttribute('tabindex', trigger.classList.contains('is-active') ? '0' : '-1');
    trigger.setAttribute('data-services-index', String(index));
  });

  let activeKey = null;
  const activeTrigger = triggers.find((t) => t.classList.contains('is-active')) || triggers[0];
  if (activeTrigger) {
    activeKey = activeTrigger.getAttribute('data-services-trigger');
  }

  const setActive = (key, { focusTrigger = false } = {}) => {
    if (!key || key === activeKey) return;
    const nextPanel = panelMap.get(key);
    const nextTrigger = triggers.find((t) => t.getAttribute('data-services-trigger') === key);
    if (!nextPanel || !nextTrigger) return;

    const currentPanel = activeKey ? panelMap.get(activeKey) : null;
    const currentTrigger = activeKey ? triggers.find((t) => t.getAttribute('data-services-trigger') === activeKey) : null;

    if (currentTrigger) {
      currentTrigger.classList.remove('is-active');
      currentTrigger.setAttribute('aria-expanded', 'false');
      currentTrigger.setAttribute('tabindex', '-1');
    }
    if (currentPanel) {
      currentPanel.classList.remove('is-active');
      currentPanel.setAttribute('aria-hidden', 'true');
    }

    nextTrigger.classList.add('is-active');
    nextTrigger.setAttribute('aria-expanded', 'true');
    nextTrigger.setAttribute('tabindex', '0');

    nextPanel.classList.add('is-active');
    nextPanel.setAttribute('aria-hidden', 'false');

    activeKey = key;

    if (focusTrigger) {
      nextTrigger.focus({ preventScroll: true });
    }
  };

  const ensureInitialState = () => {
    const initialKey = activeKey || triggers[0]?.getAttribute('data-services-trigger');
    triggers.forEach((trigger) => {
      const key = trigger.getAttribute('data-services-trigger');
      const isActive = key === initialKey;
      trigger.classList.toggle('is-active', isActive);
      trigger.setAttribute('aria-expanded', isActive ? 'true' : 'false');
      trigger.setAttribute('tabindex', isActive ? '0' : '-1');
    });
    panels.forEach((panel) => {
      const key = panel.getAttribute('data-services-panel');
      const isActive = key === initialKey;
      panel.classList.toggle('is-active', isActive);
      panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    });
    activeKey = initialKey || null;
  };

  ensureInitialState();

  triggers.forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      const key = trigger.getAttribute('data-services-trigger');
      setActive(key, { focusTrigger: false });
    });

    trigger.addEventListener('keydown', (event) => {
      const currentIndex = Number(trigger.getAttribute('data-services-index'));
      if (!Number.isFinite(currentIndex)) return;

      const moveFocus = (nextIndex) => {
        const next = triggers[nextIndex];
        if (!next) return;
        next.focus({ preventScroll: true });
      };

      switch (event.key) {
        case 'ArrowDown':
        case 'Down': {
          event.preventDefault();
          moveFocus((currentIndex + 1) % triggers.length);
          break;
        }
        case 'ArrowUp':
        case 'Up': {
          event.preventDefault();
          moveFocus((currentIndex - 1 + triggers.length) % triggers.length);
          break;
        }
        case 'Home': {
          event.preventDefault();
          moveFocus(0);
          break;
        }
        case 'End': {
          event.preventDefault();
          moveFocus(triggers.length - 1);
          break;
        }
        case 'Enter':
        case ' ': {
          event.preventDefault();
          const key = trigger.getAttribute('data-services-trigger');
          setActive(key, { focusTrigger: false });
          break;
        }
        default:
          break;
      }
    });

    trigger.addEventListener('focus', () => {
      const key = trigger.getAttribute('data-services-trigger');
      triggers.forEach((t) => t.setAttribute('tabindex', t === trigger ? '0' : '-1'));
      if (!key) return;
    });
  });
}

function initSignalScan() {
  const section = document.querySelector('[data-signal-scan]');
  if (!section) return;

  const stories = Array.from(section.querySelectorAll('[data-signal-story]'));
  const prevButton = section.querySelector('[data-signal-prev]');
  const nextButton = section.querySelector('[data-signal-next]');
  const stage = section.querySelector('[data-signal-stage]');
  const perspective = section.querySelector('[data-signal-perspective]');
  const avatar = section.querySelector('[data-signal-avatar]');
  const nameEl = section.querySelector('[data-signal-client-name]');
  const roleEl = section.querySelector('[data-signal-client-role]');
  const quoteEl = section.querySelector('[data-signal-client-quote]');

  if (!stage || stories.length === 0 || !perspective || !nameEl || !roleEl || !quoteEl) return;

  const templateMap = new Map();
  section.querySelectorAll('template[data-signal-client-template]').forEach((tpl) => {
    const key = tpl.getAttribute('data-signal-client-template');
    if (!key) return;
    templateMap.set(key, tpl);
  });

  const avatarSrcMap = {
    '0': '1.jpg',
    '1': '2.jpg',
    '2': '3.jpg',
  };

  const getClientData = (key) => {
    const tpl = templateMap.get(String(key));
    if (!tpl) return null;
    const root = tpl.content;
    const name = root.querySelector('[data-signal-name]')?.textContent?.trim() || '';
    const role = root.querySelector('[data-signal-role]')?.textContent?.trim() || '';
    const quote = root.querySelector('[data-signal-quote]')?.textContent?.trim() || '';
    return { name, role, quote };
  };

  let activeIndex = 0;
  let isSwitching = false;
  let switchingTimer = 0;

  const clearTimers = () => {
    if (switchingTimer) window.clearTimeout(switchingTimer);
    switchingTimer = 0;
  };

  const updatePerspective = (index) => {
    const story = stories[index];
    if (!story) return;
    const clientKey = story.getAttribute('data-client');
    const data = getClientData(clientKey);
    if (!data) return;

    perspective.classList.add('is-updating');
    nameEl.textContent = data.name;
    roleEl.textContent = data.role;
    quoteEl.textContent = data.quote;

    if (avatar && avatar.getAttribute('data-signal-avatar') != null) {
      const src = avatarSrcMap[String(clientKey)];
      if (src) avatar.src = src;
      avatar.alt = data.name || '';
    }

    window.requestAnimationFrame(() => {
      perspective.classList.remove('is-updating');
    });
  };

  const setActive = (index) => {
    if (!stories[index]) return;
    activeIndex = index;
    stories.forEach((story, i) => {
      const isActive = i === index;
      story.classList.toggle('is-active', isActive);
      story.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    });
    updatePerspective(index);
  };

  const stabilizeStageHeight = () => {
    if (!stage) return;
    const measurer = document.createElement('div');
    measurer.style.position = 'absolute';
    measurer.style.left = '0';
    measurer.style.top = '0';
    measurer.style.width = '100%';
    measurer.style.visibility = 'hidden';
    measurer.style.pointerEvents = 'none';
    measurer.style.opacity = '0';
    stage.appendChild(measurer);

    let maxHeight = 0;
    stories.forEach((story) => {
      const clone = story.cloneNode(true);
      clone.classList.add('is-active');
      clone.style.position = 'static';
      clone.style.inset = 'auto';
      clone.style.transform = 'none';
      clone.style.visibility = 'visible';
      clone.style.opacity = '1';
      clone.style.pointerEvents = 'none';
      clone.style.transition = 'none';
      measurer.appendChild(clone);
      maxHeight = Math.max(maxHeight, clone.offsetHeight);
      measurer.removeChild(clone);
    });

    stage.removeChild(measurer);
    if (Number.isFinite(maxHeight) && maxHeight > 0) {
      stage.style.minHeight = `${maxHeight}px`;
    }
  };

  const startSwitch = (nextIndex) => {
    if (!stories[nextIndex]) return;
    if (nextIndex === activeIndex) return;

    if (PREFERS_REDUCED_MOTION) {
      setActive(nextIndex);
      return;
    }

    if (isSwitching) return;
    isSwitching = true;
    stage.classList.add('is-switching');

    clearTimers();
    switchingTimer = window.setTimeout(() => {
      setActive(nextIndex);
      stage.classList.remove('is-switching');
      isSwitching = false;
    }, 180);
  };

  const goPrev = () => {
    const next = (activeIndex - 1 + stories.length) % stories.length;
    startSwitch(next);
  };

  const goNext = () => {
    const next = (activeIndex + 1) % stories.length;
    startSwitch(next);
  };

  if (prevButton) prevButton.addEventListener('click', goPrev);
  if (nextButton) nextButton.addEventListener('click', goNext);

  stage.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goPrev();
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goNext();
    }
  });

  window.addEventListener('beforeunload', clearTimers);
  stabilizeStageHeight();
  window.addEventListener('resize', utils.debounce(stabilizeStageHeight, 140), { passive: true });

  setActive(0);
}

function initInteractiveTilesMotion() {
  const tiles = Array.from(document.querySelectorAll('.interactive-tile, .feature-section, .cinematic-video-block'));
  if (!tiles.length) return;

  tiles.forEach((tile) => {
    if (!tile.classList.contains('interactive-tile')) tile.classList.add('interactive-tile');
  });

  const pointerFine = typeof window.matchMedia === 'function' ? window.matchMedia('(pointer: fine)').matches : true;

  const resetEdges = (tile) => {
    tile.style.setProperty('--tile-edge-top', '0');
    tile.style.setProperty('--tile-edge-right', '0');
    tile.style.setProperty('--tile-edge-bottom', '0');
    tile.style.setProperty('--tile-edge-left', '0');
  };

  const setEntryEdge = (tile, event) => {
    if (typeof event.clientX !== 'number') return;

    const rect = tile.getBoundingClientRect();
    const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);

    const distances = {
      top: y,
      right: 1 - x,
      bottom: 1 - y,
      left: x
    };

    let side = 'top';
    let best = distances.top;
    (['right', 'bottom', 'left']).forEach((key) => {
      if (distances[key] < best) {
        best = distances[key];
        side = key;
      }
    });

    resetEdges(tile);
    tile.style.setProperty(`--tile-edge-${side}`, '1');
  };

  const initTileDepthTargets = (tile) => {
    const targets = Array.from(tile.querySelectorAll('.reveal-text'));
    targets.forEach((node) => {
      const custom = node.getAttribute('data-tile-depth');
      if (custom != null && custom !== '') {
        node.style.setProperty('--tile-parallax-scale', String(custom));
        return;
      }

      let scale = 0.3;
      if (node.matches('h1, h2, h3, h4')) scale = 0.7;
      if (node.classList.contains('text-body-large')) scale = 0.45;
      if (node.classList.contains('text-muted')) scale = 0.22;

      node.style.setProperty('--tile-parallax-scale', String(scale));
    });
  };

  tiles.forEach((tile) => {
    initTileDepthTargets(tile);

    const updateTile = (event) => {
      if (typeof event.clientX !== 'number') return;

      const rect = tile.getBoundingClientRect();
      const relativeX = event.clientX - rect.left;
      const relativeY = event.clientY - rect.top;
      const offsetX = Math.min(Math.max(relativeX / rect.width, 0), 1);
      const offsetY = Math.min(Math.max(relativeY / rect.height, 0), 1);

      const tiltX = (0.5 - offsetY) * 10;
      const tiltY = (offsetX - 0.5) * 10;

      const parallaxX = (offsetX - 0.5) * 10;
      const parallaxY = (offsetY - 0.5) * 10;

      tile.style.setProperty('--tile-glow-x', `${(offsetX * 100).toFixed(2)}%`);
      tile.style.setProperty('--tile-glow-y', `${(offsetY * 100).toFixed(2)}%`);

      if (!PREFERS_REDUCED_MOTION && pointerFine) {
        tile.style.setProperty('--tile-tilt-x', `${tiltX.toFixed(2)}deg`);
        tile.style.setProperty('--tile-tilt-y', `${tiltY.toFixed(2)}deg`);
        tile.style.setProperty('--tile-lift', '-14px');

        tile.style.setProperty('--tile-parallax-x', `${parallaxX.toFixed(2)}px`);
        tile.style.setProperty('--tile-parallax-y', `${parallaxY.toFixed(2)}px`);
      } else {
        tile.style.setProperty('--tile-parallax-x', '0px');
        tile.style.setProperty('--tile-parallax-y', '0px');
      }
    };

    const resetTile = () => {
      tile.style.setProperty('--tile-glow-x', '50%');
      tile.style.setProperty('--tile-glow-y', '50%');
      tile.style.removeProperty('--tile-tilt-x');
      tile.style.removeProperty('--tile-tilt-y');
      tile.style.removeProperty('--tile-lift');
      tile.style.setProperty('--tile-parallax-x', '0px');
      tile.style.setProperty('--tile-parallax-y', '0px');
      resetEdges(tile);
    };

    tile.addEventListener('pointerenter', (event) => {
      setEntryEdge(tile, event);
      updateTile(event);
    });
    tile.addEventListener('pointermove', updateTile);
    tile.addEventListener('pointerleave', resetTile);
    tile.addEventListener('pointercancel', resetTile);
    tile.addEventListener('focusin', () => {
      tile.style.setProperty('--tile-lift', '-12px');
      tile.style.setProperty('--tile-glow-x', '50%');
      tile.style.setProperty('--tile-glow-y', '50%');
      resetEdges(tile);
      tile.style.setProperty('--tile-edge-top', '1');
    });
    tile.addEventListener('focusout', resetTile);

    resetTile();
  });
}

function initMagneticCta() {
  const buttons = document.querySelectorAll('.hero__cta--primary');
  if (!buttons.length) return;

  const pointerFine = typeof window.matchMedia === 'function' ? window.matchMedia('(pointer: fine)').matches : true;
  if (!pointerFine || PREFERS_REDUCED_MOTION) return;

  const nodes = Array.from(buttons).map((button) => ({
    node: button,
    targetX: 0,
    targetY: 0,
    currentX: 0,
    currentY: 0,
    active: false
  }));

  const lerp = (start, end, amount) => start + (end - start) * amount;
  const easing = 0.18;

  const animate = () => {
    nodes.forEach((item) => {
      item.currentX = lerp(item.currentX, item.targetX, easing);
      item.currentY = lerp(item.currentY, item.targetY, easing);

      item.node.style.setProperty('--cta-magnet-x', `${item.currentX.toFixed(2)}px`);
      item.node.style.setProperty('--cta-magnet-y', `${item.currentY.toFixed(2)}px`);

      if (!item.active && Math.abs(item.currentX) < 0.1 && Math.abs(item.currentY) < 0.1) {
        item.node.style.removeProperty('--cta-magnet-x');
        item.node.style.removeProperty('--cta-magnet-y');
      }
    });

    requestAnimationFrame(animate);
  };

  requestAnimationFrame(animate);

  const resetItem = (item) => {
    item.targetX = 0;
    item.targetY = 0;
    if (item.active) {
      item.node.classList.remove('is-magnet-active');
      item.active = false;
    }
  };

  const resetAll = () => {
    nodes.forEach(resetItem);
  };

  const handlePointerMove = (event) => {
    nodes.forEach((item) => {
      const rect = item.node.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const deltaX = event.clientX - centerX;
      const deltaY = event.clientY - centerY;
      const distance = Math.hypot(deltaX, deltaY);
      const influenceRadius = Math.max(rect.width, rect.height) * 1.9;

      if (distance < influenceRadius) {
        const strength = 1 - distance / influenceRadius;
        item.targetX = deltaX * strength * 0.24;
        item.targetY = deltaY * strength * 0.24;
        item.node.classList.add('is-magnet-active');
        item.active = true;
      } else {
        resetItem(item);
      }
    });
  };

  window.addEventListener('pointermove', handlePointerMove);
  window.addEventListener('pointerleave', resetAll);
  window.addEventListener('scroll', resetAll, { passive: true });
}

function initCursorAura() {
  if (PREFERS_REDUCED_MOTION) return;
  const pointerFine = typeof window.matchMedia === 'function' ? window.matchMedia('(pointer: fine)').matches : true;
  if (!pointerFine) return;

  let aura = document.querySelector('.cursor-aura');
  if (!aura) {
    aura = document.createElement('div');
    aura.className = 'cursor-aura';
    document.body.appendChild(aura);
  }

  if (aura.dataset.initialized === 'true') return;
  aura.dataset.initialized = 'true';

  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 2;
  let currentX = targetX;
  let currentY = targetY;
  let isVisible = false;

  const showAura = () => {
    if (!isVisible) {
      aura.style.opacity = '1';
      isVisible = true;
    }
  };

  const hideAura = () => {
    if (isVisible) {
      aura.style.opacity = '0';
      isVisible = false;
    }
  };

  const updateCoordinates = (event) => {
    targetX = event.clientX;
    targetY = event.clientY;
    showAura();
  };

  const render = () => {
    currentX += (targetX - currentX) * 0.2;
    currentY += (targetY - currentY) * 0.2;
    aura.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
    requestAnimationFrame(render);
  };
  requestAnimationFrame(render);

  window.addEventListener('pointermove', updateCoordinates);
  window.addEventListener('pointerdown', updateCoordinates);
  window.addEventListener('pointerleave', hideAura);
  window.addEventListener('blur', hideAura);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      hideAura();
    }
  });
}

function initSectionCinematicVideo() {
  const video = document.getElementById('timelineCinematicVideo');
  const section = document.getElementById('chronicle');
  if (!video || !section || PREFERS_REDUCED_MOTION) return;

  let playing = false;

  const playVideo = () => {
    if (!playing) {
      const playPromise = video.play();
      if (playPromise?.catch) {
        playPromise.catch(() => {});
      }
      playing = true;
    }
  };

  const pauseVideo = () => {
    if (playing) {
      video.pause();
      playing = false;
    }
  };

  waitForVideoMetadata(video).then(() => {
    video.loop = true;
    pauseVideo();

    const pointerFine = typeof window.matchMedia === 'function' ? window.matchMedia('(pointer: fine)').matches : true;
    if (pointerFine && !PREFERS_REDUCED_MOTION) {
      section.addEventListener('pointerenter', playVideo);
      section.addEventListener('pointerleave', pauseVideo);
    }

    section.addEventListener('focusin', playVideo);
    section.addEventListener('focusout', pauseVideo);

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) pauseVideo();
        });
      }, { threshold: 0.25 });

      observer.observe(section);
    }
  }).catch(() => {});
}

function initMicroInteractionVideo() {
  const container = document.querySelector('[data-micro-video]');
  const video = document.getElementById('microDetailVideo');
  if (!container || !video) return;

  let playing = false;

  const playVideo = () => {
    if (!playing) {
      const playPromise = video.play();
      if (playPromise?.catch) {
        playPromise.catch(() => {});
      }
      playing = true;
    }
  };

  const pauseVideo = () => {
    if (playing) {
      video.pause();
      playing = false;
    }
  };

  waitForVideoMetadata(video).then(() => {
    pauseVideo();

    const pointerFine = typeof window.matchMedia === 'function' ? window.matchMedia('(pointer: fine)').matches : true;
    if (pointerFine && !PREFERS_REDUCED_MOTION) {
      container.addEventListener('pointerenter', playVideo);
      container.addEventListener('pointerleave', pauseVideo);
    }

    container.addEventListener('focusin', playVideo);
    container.addEventListener('focusout', pauseVideo);

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) pauseVideo();
        });
      }, { threshold: 0.35 });

      observer.observe(container);
    }
  }).catch(() => {});
}

function initFarviewTerminal() {
  const terminal = document.querySelector('[data-fv-terminal]');
  if (!terminal) return;

  const output = terminal.querySelector('[data-fv-terminal-output]');
  const suggest = terminal.querySelector('[data-fv-terminal-suggest]');
  const typed = terminal.querySelector('[data-fv-terminal-typed]');
  const ghost = terminal.querySelector('[data-fv-terminal-ghost]');
  const input = terminal.querySelector('[data-fv-terminal-input]');
  if (!output || !suggest || !typed || !ghost || !input) return;

  const PROMPT = 'farview@core:~$';

  const commands = {
    help: {
      summary: 'List available commands',
      run: () => [
        'Available commands:',
        '  status          System readiness with a human-centered focus',
        '  mission         What we optimize for',
        '  vision          Where we are taking the work',
        '  reach           A snapshot of global delivery',
        '  protocol_init   Bring core systems online',
        '  principles      How we build: simple, reliable, scalable',
        '  clear           Clear the terminal'
      ]
    },
    status: {
      summary: 'System status',
      run: () => [
        'STATUS: OPERATIONAL',
        'UPTIME TARGET: 99.99%',
        'MODE: Human-first delivery',
        'NOTES: Quiet systems. Clear interfaces. Measurable outcomes.'
      ]
    },
    mission: {
      summary: 'Company mission',
      run: () => [
        'Mission:',
        'Build technology that reduces frictionâ€”so people can focus on the work that matters.',
        'We ship dependable systems that simplify life and scale with real demand.'
      ]
    },
    vision: {
      summary: 'Company vision',
      run: () => [
        'Vision:',
        'A world where software is calm, trustworthy, and invisible when it should beâ€”',
        'supporting humans with clarity, not noise.'
      ]
    },
    reach: {
      summary: 'Global reach',
      run: () => [
        'Reach:',
        'Multi-region delivery. Time zones covered. Teams aligned to outcome.',
        'Built to serve globallyâ€”operated with local precision.'
      ]
    },
    protocol_init: {
      summary: 'Initialize core protocol',
      run: () => [
        'Initializing Farview protocolâ€¦',
        '[OK] Requirements mapped',
        '[OK] Interfaces simplified',
        '[OK] Reliability gates armed',
        '[OK] Delivery pipeline ready',
        'Protocol online. Enter "status" to verify.'
      ]
    },
    principles: {
      summary: 'Build principles',
      run: () => [
        'Principles:',
        '1) Clarity over complexity',
        '2) Reliability is a feature',
        '3) Security and performance are defaults',
        '4) Design for change without drama',
        '5) Build for humansâ€”operators, users, and teams'
      ]
    },
    clear: {
      summary: 'Clear output',
      run: () => []
    }
  };

  const commandKeys = Object.keys(commands);
  const history = [];
  let historyIndex = -1;
  let rafPending = false;

  const escapeHtml = (value) => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const appendLine = (text, className = '') => {
    const line = document.createElement('div');
    line.className = className ? `fv-terminal__line ${className}` : 'fv-terminal__line';
    line.innerHTML = escapeHtml(text);
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
  };

  const appendCommandEcho = (cmd) => {
    const line = document.createElement('div');
    line.className = 'fv-terminal__line fv-terminal__line--cmd';
    line.innerHTML = `<span class="fv-terminal__prompt">${escapeHtml(PROMPT)}</span> ${escapeHtml(cmd)}`;
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
  };

  const bestMatch = (value) => {
    const v = value.trim().toLowerCase();
    if (!v) return null;
    const matches = commandKeys.filter((k) => k.startsWith(v));
    if (!matches.length) return null;
    if (matches.includes(v)) return v;
    matches.sort((a, b) => a.length - b.length);
    return matches[0];
  };

  const renderHint = () => {
    const value = input.value;
    typed.textContent = value;

    const m = bestMatch(value);
    if (m && value.trim()) {
      const v = value.trim();
      ghost.textContent = m.slice(v.length);
      suggest.textContent = m === v ? commands[m].summary : `Tab to complete: ${m}`;
    } else {
      ghost.textContent = '';
      suggest.textContent = value.trim() ? 'No match. Type "help".' : 'Type "help" for commands.';
    }
  };

  const scheduleRender = () => {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      renderHint();
    });
  };

  const setInputValue = (value) => {
    input.value = value;
    scheduleRender();
  };

  const runCommand = (raw) => {
    const cmd = raw.trim();
    if (!cmd) return;

    history.unshift(cmd);
    historyIndex = -1;

    appendCommandEcho(cmd);

    const key = cmd.split(/\s+/)[0].toLowerCase();
    const entry = commands[key];
    if (!entry) {
      appendLine(`Command not found: ${key}. Type "help".`, 'fv-terminal__line--muted');
      return;
    }

    if (key === 'clear') {
      output.innerHTML = '';
      return;
    }

    const lines = entry.run(cmd);
    lines.forEach((line) => appendLine(line));
  };

  terminal.addEventListener('pointerdown', () => {
    input.focus({ preventScroll: true });
  });

  input.addEventListener('input', () => {
    scheduleRender();
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') {
      const m = bestMatch(input.value);
      if (m) {
        event.preventDefault();
        setInputValue(m + ' ');
      }
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const value = input.value;
      setInputValue('');
      ghost.textContent = '';
      suggest.textContent = '';
      runCommand(value);
      return;
    }

    if (event.key === 'ArrowUp') {
      if (!history.length) return;
      event.preventDefault();
      const nextIndex = Math.min(historyIndex + 1, history.length - 1);
      historyIndex = nextIndex;
      setInputValue(history[historyIndex]);
      return;
    }

    if (event.key === 'ArrowDown') {
      if (!history.length) return;
      event.preventDefault();
      const nextIndex = historyIndex - 1;
      historyIndex = nextIndex;
      if (historyIndex < 0) {
        setInputValue('');
      } else {
        setInputValue(history[historyIndex]);
      }
    }
  });

  output.innerHTML = '';
  appendLine('FarviewGlobal Terminal', 'fv-terminal__line--title');
  appendLine('Type "help" to explore conceptual commands.', 'fv-terminal__line--muted');
  appendLine('This terminal is a narrative interfaceâ€”not a shell.', 'fv-terminal__line--muted');
  appendLine('');
  scheduleRender();
}

// =============================================================================
// GSAP POWERED SECTION REVEALS
// =============================================================================

function initGsapRevealAnimations() {
  if (!window.gsap || typeof ScrollTrigger !== 'function') return;

  const sections = gsap.utils.toArray('.animate-section');
  const revealItemsSelector = '.animate-text, .animate-button';
  if (!sections.length) return;

  const heroSection = document.getElementById('hero');
  const heroItems = heroSection ? heroSection.querySelectorAll(revealItemsSelector) : [];

  if (heroSection) {
    gsap.set(heroSection, { autoAlpha: 1, y: 0 });
    if (heroItems.length) {
      gsap.set(heroItems, { autoAlpha: 1, y: 0, boxShadow: 'none' });
    }
  }

  const revealSections = sections.filter((section) => section !== heroSection);
  if (!revealSections.length) return;

  gsap.set(revealSections, { autoAlpha: 0, y: 12 });

  revealSections.forEach((section) => {
    const revealItems = section.querySelectorAll(revealItemsSelector);
    if (revealItems.length) {
      gsap.set(revealItems, { autoAlpha: 0, y: 10, boxShadow: 'none' });
    }

    ScrollTrigger.create({
      trigger: section,
      start: 'top 88%',
      toggleActions: 'play none none none',
      once: true,
      onEnter: ({ direction }) => {
        if (direction <= 0) return;

        const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
        tl.to(section, {
          autoAlpha: 1,
          y: 0,
          duration: 0.4
        });

        if (revealItems.length) {
          tl.to(revealItems, {
            autoAlpha: 1,
            y: 0,
            duration: 0.4,
            stagger: 0.06
          }, '-=0.2');
        }
      }
    });
  });
}

// =============================================================================
// SCROLL-TRIGGERED ANIMATIONS
// =============================================================================

function initScrollAnimations() {
  // Terminal lines animation
  gsap.to('.terminal-line', {
    opacity: 1,
    duration: 0.1,
    stagger: 0.3,
    ease: 'none',
    scrollTrigger: {
      trigger: '.terminal-section',
      start: 'top 60%'
    }
  });
  
  // Stats counter animation
  gsap.utils.toArray('.stat-number').forEach((stat) => {
    const target = parseFloat(stat.getAttribute('data-target'));
    
    ScrollTrigger.create({
      trigger: stat,
      start: 'top 80%',
      onEnter: () => {
        gsap.to(stat, {
          textContent: target,
          duration: 2,
          ease: 'power2.out',
          snap: { textContent: target >= 100 ? 1 : 0.1 },
          onUpdate: function() {
            const val = parseFloat(this.targets()[0].textContent);
            this.targets()[0].textContent = val >= 100 ? Math.round(val) : val.toFixed(1);
          }
        });
      },
      once: true
    });
  });
  
  // Grid lines animation
  gsap.utils.toArray('.grid-line').forEach((line) => {
    gsap.from(line, {
      scaleX: 0,
      duration: 1.5,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: line,
        start: 'top 90%',
        toggleActions: 'play none none reverse'
      }
    });
  });
  
  // Data blocks parallax
  gsap.utils.toArray('.data-block').forEach((block) => {
    gsap.to(block, {
      y: -50,
      ease: 'none',
      scrollTrigger: {
        trigger: block,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 2
      }
    });
  });
  
  // Offering cards stagger
  gsap.from('.offering-card', {
    y: 80,
    opacity: 0,
    duration: 0.8,
    stagger: 0.15,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.offerings-section',
      start: 'top 70%'
    }
  });
  
  // Case studies animation
  gsap.from('.case-study', {
    y: 60,
    opacity: 0,
    duration: 0.8,
    stagger: 0.2,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.case-studies-grid',
      start: 'top 70%'
    }
  });
  
  // Footer animation
  gsap.from('footer', {
    opacity: 0,
    y: 50,
    duration: 1,
    ease: 'power4.out',
    scrollTrigger: {
      trigger: 'footer',
      start: 'top 90%'
    }
  });
}


function initWhyChooseUs() {
  const section = document.querySelector('[data-wcu-section]');
  if (!section) return;
  if (section.dataset.wcuInit === 'true') return;
  section.dataset.wcuInit = 'true';

  const phaseEl = section.querySelector('[data-wcu-phase]');
  const progressFill = section.querySelector('[data-wcu-progress]');
  const copies = Array.from(section.querySelectorAll('[data-wcu-copy]'));
  const visuals = Array.from(section.querySelectorAll('[data-wcu-visual]'));
  const visualAlign = section.querySelector('[data-wcu-visual-align]');

  const floatingNav = document.querySelector('.site-header__floating-nav');

  const measureHeaderOffset = () => {
    const h = floatingNav ? Math.max(0, Math.round(floatingNav.getBoundingClientRect().height)) : 0;
    section.style.setProperty('--wcu-header-offset', `${h}px`);
  };

  const setActiveIndex = (index) => {
    copies.forEach((el) => el.classList.toggle('is-active', el.getAttribute('data-wcu-copy') === String(index)));
    visuals.forEach((el) => {
      const isActive = el.getAttribute('data-wcu-visual') === String(index);
      if (isActive) {
        el.hidden = false;
        el.classList.add('is-active');
      } else {
        el.classList.remove('is-active');
        el.hidden = true;
      }
    });

    if (phaseEl) {
      const n = String(index + 1).padStart(2, '0');
      phaseEl.textContent = `${n} / 04`;
    }
  };

  let raf = 0;
  let lastPhaseIndex = -1;
  let needsAlign = true;

  const update = () => {
    raf = 0;

    const rect = section.getBoundingClientRect();
    const vh = window.innerHeight || 0;

    const start = window.scrollY + rect.top;
    const range = Math.max(1, rect.height - vh);
    const t = clamp((window.scrollY - start) / range, 0, 1);

    const phaseFloat = t * 4;
    const phaseIndex = Math.min(3, Math.floor(Math.max(0, phaseFloat - 1e-6)));
    const local = clamp(phaseFloat - phaseIndex, 0, 1);

    section.style.setProperty('--wcu-progress', String(t));
    section.style.setProperty('--wcu-phase-progress', String(local));

    const setVar = (key, value) => section.style.setProperty(key, String(value));

    setVar('--wcu-p1-sweep', 0);
    setVar('--wcu-p1-rect', 0);
    setVar('--wcu-p1-gold', 0);
    setVar('--wcu-p2-center', 0);
    setVar('--wcu-p2-grid', 0);
    setVar('--wcu-p2-links', 0);
    setVar('--wcu-p3-ring', 0);
    setVar('--wcu-p3-links', 0);
    setVar('--wcu-p3-core', 0);
    setVar('--wcu-p4-clean', 0);
    setVar('--wcu-p4-line', 0);

    if (phaseIndex === 0) {
      setVar('--wcu-p1-sweep', clamp(local / 0.35, 0, 1));
      setVar('--wcu-p1-rect', clamp((local - 0.25) / 0.55, 0, 1));
      setVar('--wcu-p1-gold', clamp((local - 0.82) / 0.18, 0, 1));
    } else if (phaseIndex === 1) {
      setVar('--wcu-p2-center', clamp(local / 0.18, 0, 1));
      setVar('--wcu-p2-grid', clamp((local - 0.08) / 0.62, 0, 1));
      setVar('--wcu-p2-links', clamp((local - 0.28) / 0.62, 0, 1));
    } else if (phaseIndex === 2) {
      setVar('--wcu-p3-ring', clamp(local / 0.55, 0, 1));
      setVar('--wcu-p3-links', clamp((local - 0.18) / 0.62, 0, 1));
      setVar('--wcu-p3-core', clamp((local - 0.62) / 0.38, 0, 1));
    } else if (phaseIndex === 3) {
      setVar('--wcu-p4-clean', clamp(local / 0.72, 0, 1));
      setVar('--wcu-p4-line', clamp((local - 0.35) / 0.65, 0, 1));
    }

    if (progressFill) {
      progressFill.style.transform = `scaleX(${t})`;
    }

    setActiveIndex(phaseIndex);

    if (visualAlign && (needsAlign || phaseIndex !== lastPhaseIndex)) {
      const copyEl = section.querySelector(`[data-wcu-copy="${phaseIndex}"]`);
      const titleEl = copyEl ? copyEl.querySelector('h3') : null;
      const visualStage = section.querySelector('.wcu__visual-stage');

      if (titleEl && visualStage) {
        const titleRect = titleEl.getBoundingClientRect();
        const stageRect = visualStage.getBoundingClientRect();
        const targetY = titleRect.top + titleRect.height * 0.5;
        const stageCenterY = stageRect.top + stageRect.height * 0.5;
        const dy = clamp(targetY - stageCenterY, -90, 90);
        section.style.setProperty('--wcu-visual-shift', `${dy}px`);
      }

      lastPhaseIndex = phaseIndex;
      needsAlign = false;
    }
  };

  const schedule = () => {
    if (raf) return;
    raf = requestAnimationFrame(update);
  };

  measureHeaderOffset();
  update();

  window.addEventListener('resize', () => {
    measureHeaderOffset();
    needsAlign = true;
    schedule();
  }, { passive: true });

  window.addEventListener('scroll', schedule, { passive: true });
}
// =============================================================================
// INITIALIZATION
// =============================================================================

function init() {
  if (!document.querySelector) {
    console.warn('DOM APIs unavailable; FarviewGlobal aborted.');
    return;
  }

  const hasGSAP = typeof window.gsap === 'object' && typeof window.gsap.to === 'function';
  const hasScrollTrigger = typeof window.ScrollTrigger === 'function';

  if (hasGSAP && hasScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);

    const preloaderTl = initPreloader();
    initHeroAnimation(preloaderTl);
    initScrollAnimations();
    initGsapRevealAnimations();
    initScrollHighlights({ useScrollTrigger: true });
  } else {
    console.warn('GSAP animations skipped: GSAP/ScrollTrigger not detected.');
    initScrollHighlights();
  }

  initWhyChooseUs();

  initVeinNetwork();
  initFarViewSequence();
  initFloatingNodes();
  initGlobalAnimations();
  createCircuitLines();
  createGlobalParticles();
  createDataParticles();
  initHeroParallax();
  initStoryBlocks({ useScrollTrigger: hasGSAP && hasScrollTrigger });
  initScrollReveal({ useScrollTrigger: hasGSAP && hasScrollTrigger });
  initPositioningReveal();
  initServicesRail();
  initSignalScan();
  initInteractiveTilesMotion();
  initMagneticCta();
  initCursorAura();
  initSectionCinematicVideo();
  initMicroInteractionVideo();
  initFarviewTerminal();

  if (document?.body) {
    document.body.classList.add('story-ready');
  }

  console.log('FarviewGlobal initialized successfully');
}

function boot() {
  const start = () => init();
  try {
    const maybePromise = initLoader();
    if (maybePromise && typeof maybePromise.then === 'function') {
      maybePromise.then(start).catch(start);
      return;
    }
  } catch (error) {
    start();
    return;
  }
  start();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}



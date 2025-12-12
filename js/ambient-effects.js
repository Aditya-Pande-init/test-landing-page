'use strict';

(function () {
  const PREFERS_REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initAmbientLayer() {
    if (PREFERS_REDUCED_MOTION) return;
    if (document.querySelector('[data-ambient-layer]')) return;

    const root = document.documentElement;

    const layer = document.createElement('div');
    layer.className = 'ambient-layer';
    layer.setAttribute('data-ambient-layer', '');
    layer.setAttribute('aria-hidden', 'true');

    const make = (className, style) => {
      const el = document.createElement('span');
      el.className = `ambient-layer__item ${className}`;
      Object.keys(style).forEach((key) => {
        el.style.setProperty(key, style[key]);
      });
      return el;
    };

    layer.appendChild(make('ambient-layer__line', {
      top: '18%',
      left: '9%',
      transform: 'rotate(-8deg)',
    }));

    layer.appendChild(make('ambient-layer__line', {
      top: '62%',
      left: '64%',
      transform: 'rotate(10deg)',
      opacity: '0.45',
    }));

    layer.appendChild(make('ambient-layer__dot', {
      top: '34%',
      left: '78%',
    }));

    layer.appendChild(make('ambient-layer__dot', {
      top: '74%',
      left: '22%',
      opacity: '0.35',
    }));

    document.body.appendChild(layer);

    const state = {
      lastY: window.scrollY,
      velocity: 0,
      target: 0,
      current: 0,
      rafId: null,
      lastTs: performance.now(),
    };

    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - state.lastY;
      state.lastY = y;
      state.target = clamp(delta, -22, 22);
      ensureTick();
    };

    const tick = (ts) => {
      const dt = Math.max(0.001, (ts - state.lastTs) / 1000);
      state.lastTs = ts;

      state.velocity += (state.target - state.velocity) * Math.min(1, dt * 10);
      state.current += (state.velocity - state.current) * Math.min(1, dt * 6);

      const px = state.current * 0.55;
      const py = state.current * 0.35;

      layer.style.setProperty('--ax', `${px.toFixed(2)}px`);
      layer.style.setProperty('--ay', `${py.toFixed(2)}px`);

      const bgx = state.current * 0.12;
      const bgy = state.current * 0.18;
      const midx = state.current * 0.22;
      const midy = state.current * 0.32;
      const fgx = state.current * 0.08;
      const fgy = state.current * 0.12;

      root.style.setProperty('--mh-bg-x', `${bgx.toFixed(2)}px`);
      root.style.setProperty('--mh-bg-y', `${bgy.toFixed(2)}px`);
      root.style.setProperty('--mh-mid-x', `${midx.toFixed(2)}px`);
      root.style.setProperty('--mh-mid-y', `${midy.toFixed(2)}px`);
      root.style.setProperty('--mh-fg-x', `${fgx.toFixed(2)}px`);
      root.style.setProperty('--mh-fg-y', `${fgy.toFixed(2)}px`);

      state.target *= 0.88;

      if (Math.abs(state.current) > 0.02 || Math.abs(state.target) > 0.02) {
        state.rafId = requestAnimationFrame(tick);
      } else {
        state.rafId = null;
      }
    };

    const ensureTick = () => {
      if (state.rafId != null) return;
      state.lastTs = performance.now();
      state.rafId = requestAnimationFrame(tick);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAmbientLayer);
  } else {
    initAmbientLayer();
  }
})();

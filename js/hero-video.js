'use strict';

(function () {
  const PREFERS_REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function waitForVideoMetadata(video) {
    if (!video) return Promise.reject(new Error('Missing video element'));
    if (video.readyState >= 1) return Promise.resolve(video);
    return new Promise((resolve) => {
      const handler = () => {
        video.removeEventListener('loadedmetadata', handler);
        resolve(video);
      };
      video.addEventListener('loadedmetadata', handler, { once: true });
    });
  }

  function initHeroScrollVideo() {
    const video = document.getElementById('heroBackgroundVideo');
    const header = document.querySelector('.site-header');
    if (!video || !header || PREFERS_REDUCED_MOTION) return;

    if (header.dataset.heroScrollVideoInit === 'true') return;
    header.dataset.heroScrollVideoInit = 'true';

    const sourceNode = video.querySelector('source');
    const forwardSrc = (sourceNode && sourceNode.getAttribute('src')) || video.currentSrc || '';
    const reverseSrc = video.getAttribute('data-reverse-src') || 'scroll-reverse.mp4';

    const reverseVideo = document.getElementById('heroBackgroundVideoReverse') || document.createElement('video');
    reverseVideo.className = video.className;
    reverseVideo.id = 'heroBackgroundVideoReverse';
    reverseVideo.muted = true;
    reverseVideo.playsInline = true;
    reverseVideo.preload = 'metadata';
    reverseVideo.controls = false;
    reverseVideo.setAttribute('aria-hidden', 'true');
    reverseVideo.setAttribute('tabindex', '-1');
    if (video.getAttribute('poster')) {
      reverseVideo.setAttribute('poster', video.getAttribute('poster'));
    }
    if ('disablePictureInPicture' in reverseVideo) {
      reverseVideo.disablePictureInPicture = true;
    }
    reverseVideo.style.opacity = '0';
    reverseVideo.style.visibility = 'hidden';

    if (!reverseVideo.querySelector('source')) {
      const reverseSource = document.createElement('source');
      reverseSource.setAttribute('src', reverseSrc);
      reverseSource.setAttribute('type', 'video/mp4');
      reverseVideo.appendChild(reverseSource);
    } else {
      const reverseSource = reverseVideo.querySelector('source');
      reverseSource.setAttribute('src', reverseSrc);
    }

    if (!reverseVideo.parentNode) {
      header.insertBefore(reverseVideo, video.nextSibling);
    }

    const state = {
      appliedDirection: 'paused',
      desiredDirection: 'paused',
      lastScrollY: window.scrollY,
      lastInputTime: performance.now(),
      inView: true,
      rafId: null,
      active: 'forward',
      reverseReady: false,
    };

    const IDLE_DELAY = 140;
    const DELTA_THRESHOLD = 2;

    const safePlay = (target) => {
      const playPromise = target.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {});
      }
    };

    const setVisible = (target, visible) => {
      if (visible) {
        target.style.visibility = 'visible';
        target.style.opacity = '0.48';
      } else {
        target.style.opacity = '0';
        target.style.visibility = 'hidden';
      }
    };

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    const mapForwardToReverseTime = () => {
      const fDur = Number.isFinite(video.duration) ? video.duration : 0;
      const rDur = Number.isFinite(reverseVideo.duration) ? reverseVideo.duration : 0;
      const dur = Math.max(0, Math.min(fDur || 0, rDur || 0));
      if (!dur) return 0;
      return clamp(dur - video.currentTime, 0, dur);
    };

    const mapReverseToForwardTime = () => {
      const fDur = Number.isFinite(video.duration) ? video.duration : 0;
      const rDur = Number.isFinite(reverseVideo.duration) ? reverseVideo.duration : 0;
      const dur = Math.max(0, Math.min(fDur || 0, rDur || 0));
      if (!dur) return 0;
      return clamp(dur - reverseVideo.currentTime, 0, dur);
    };

    const switchTo = (next) => {
      if (state.active === next) return;

      if (next === 'reverse') {
        if (!state.reverseReady) return;
        try {
          reverseVideo.currentTime = mapForwardToReverseTime();
        } catch (error) {
        }
        video.pause();
        setVisible(video, false);
        setVisible(reverseVideo, true);
        state.active = 'reverse';
        return;
      }

      try {
        video.currentTime = mapReverseToForwardTime();
      } catch (error) {
      }
      reverseVideo.pause();
      setVisible(reverseVideo, false);
      setVisible(video, true);
      state.active = 'forward';
    };

    const applyDirection = (direction) => {
      if (!state.inView && direction !== 'paused') {
        direction = 'paused';
      }

      if (state.appliedDirection === direction) {
        if (direction === 'forward' && state.active !== 'forward') {
          switchTo('forward');
        }
        if (direction === 'reverse' && state.active !== 'reverse') {
          switchTo('reverse');
        }
        return;
      }

      state.appliedDirection = direction;

      if (direction === 'paused') {
        video.pause();
        reverseVideo.pause();
        return;
      }

      if (direction === 'forward') {
        switchTo('forward');
        reverseVideo.pause();
        safePlay(video);
        return;
      }

      if (!state.reverseReady) {
        video.pause();
        reverseVideo.pause();
        return;
      }

      switchTo('reverse');
      video.pause();
      safePlay(reverseVideo);
    };

    const onScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - state.lastScrollY;
      state.lastScrollY = currentY;
      state.lastInputTime = performance.now();

      if (Math.abs(delta) < DELTA_THRESHOLD) {
        ensureTicking();
        return;
      }

      state.desiredDirection = delta > 0 ? 'forward' : 'reverse';
      ensureTicking();
    };

    const tick = () => {
      state.rafId = null;

      if (!state.inView) {
        applyDirection('paused');
        return;
      }

      const now = performance.now();
      const idle = now - state.lastInputTime > IDLE_DELAY;
      const targetDirection = idle ? 'paused' : state.desiredDirection;
      applyDirection(targetDirection);

      if (!idle || targetDirection !== 'paused') {
        state.rafId = requestAnimationFrame(tick);
      }
    };

    const ensureTicking = () => {
      if (state.rafId != null) return;
      state.rafId = requestAnimationFrame(tick);
    };

    const handleVisibilityChange = (entries) => {
      entries.forEach((entry) => {
        state.inView = entry.isIntersecting;
        if (!state.inView) {
          applyDirection('paused');
        } else {
          state.lastInputTime = performance.now();
          ensureTicking();
        }
      });
    };

    const forwardReady = waitForVideoMetadata(video);
    const reverseReady = waitForVideoMetadata(reverseVideo).then(() => true).catch(() => false);

    Promise.all([forwardReady, reverseReady]).then((results) => {
      state.reverseReady = results[1] === true;

      video.pause();
      try {
        video.currentTime = 0;
      } catch (error) {
      }

      reverseVideo.pause();
      if (state.reverseReady) {
        try {
          reverseVideo.currentTime = 0;
        } catch (error) {
        }
      }
      if ('disablePictureInPicture' in video) {
        video.disablePictureInPicture = true;
      }
      setVisible(video, true);
      setVisible(reverseVideo, false);

      window.addEventListener('scroll', onScroll, { passive: true });

      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(handleVisibilityChange, {
          threshold: 0.1,
        });
        observer.observe(header);
      }
    }).catch(() => {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeroScrollVideo);
  } else {
    initHeroScrollVideo();
  }
})();

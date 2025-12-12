'use strict';

(function () {
  const STROKE_COLOR = 'rgba(255, 255, 255, 0.12)';
  const LUMEN_CORE = 'rgba(201, 168, 107, 0.8)';
  const LUMEN_EDGE = 'rgba(201, 168, 107, 0)';
  const MAX_PIXEL_RATIO = 1.5;
  const MOBILE_BREAKPOINT = 768;
  const EPSILON = 1e-6;

  const ROUTES = [
    {
      radius: 0.055,
      points: [
        [-0.08, 0.22],
        [0.18, 0.22],
        [0.18, 0.36],
        [0.64, 0.36],
        [0.82, 0.22],
        [1.06, 0.22]
      ]
    },
    {
      radius: 0.05,
      points: [
        [-0.06, 0.45],
        [0.24, 0.45],
        [0.24, 0.58],
        [0.58, 0.58],
        [0.58, 0.78],
        [0.94, 0.78]
      ]
    },
    {
      radius: 0.045,
      points: [
        [0.08, -0.04],
        [0.08, 0.18],
        [0.34, 0.18],
        [0.34, 0.48],
        [0.54, 0.48],
        [0.54, 0.66]
      ]
    },
    {
      radius: 0.045,
      points: [
        [0.16, 0.78],
        [0.16, 0.9],
        [0.46, 0.9],
        [0.68, 0.72],
        [0.68, 0.56]
      ]
    }
  ];

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function normalize(vec) {
    const length = Math.hypot(vec.x, vec.y);
    if (length < EPSILON) return { x: 0, y: 0 };
    return { x: vec.x / length, y: vec.y / length };
  }

  function distance(a, b) {
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function lerpPoint(a, b, t) {
    return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
  }

  function quadraticPoint(p0, p1, p2, t) {
    const mt = 1 - t;
    return {
      x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
      y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y
    };
  }

  function quadraticDerivative(p0, p1, p2, t) {
    return {
      x: 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x),
      y: 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y)
    };
  }

  function buildQuadraticLookup(p0, p1, p2, steps = 24) {
    const table = [{ t: 0, length: 0 }];
    let total = 0;
    let prev = p0;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const point = quadraticPoint(p0, p1, p2, t);
      total += distance(prev, point);
      table.push({ t, length: total });
      prev = point;
    }
    return { table, totalLength: total };
  }

  class TerminalVeinField {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
      this.width = 0;
      this.height = 0;
      this.scaleBase = 0;
      this.paths = [];
      this.lumens = [];
      this.lastTime = 0;
      this.isRunning = false;
      this.isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
      this.lineWidth = 1.8;

      this.handleResize = this.handleResize.bind(this);
      this.renderLoop = this.renderLoop.bind(this);
    }

    init() {
      if (!this.ctx) return;
      this.updateCanvasMetrics();
      this.buildPaths();
      this.seedLumens();
      window.addEventListener('resize', this.handleResize, { passive: true });
      this.isRunning = true;
      this.lastTime = performance.now();
      requestAnimationFrame(this.renderLoop);
      console.log('Veins Canvas Fallback Active');
    }

    updateCanvasMetrics() {
      const hero = document.getElementById('hero');
      const heroHeight = hero ? hero.offsetHeight : window.innerHeight;
      this.width = window.innerWidth;
      this.height = heroHeight;
      this.scaleBase = Math.max(1, Math.min(this.width, this.height));
      this.pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
      this.canvas.width = Math.max(1, Math.floor(this.width * this.pixelRatio));
      this.canvas.height = Math.max(1, Math.floor(this.height * this.pixelRatio));
      this.canvas.style.width = this.width + 'px';
      this.canvas.style.height = this.height + 'px';
      this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
      this.lineWidth = this.isMobile ? 1.6 : 2.4;
    }

    buildPaths() {
      this.paths = ROUTES.map((route) => this.createStructuredPath(route));
    }

    seedLumens() {
      const allocationsDesktop = [2, 1, 1, 1];
      const allocationsMobile = [1, 1, 0, 1];
      const allocations = this.isMobile ? allocationsMobile : allocationsDesktop;

      this.lumens = [];

      this.paths.forEach((path, index) => {
        if (!path || path.totalLength <= EPSILON) return;
        const count = allocations[index] ?? 0;
        for (let i = 0; i < count; i++) {
          this.lumens.push({
            pathIndex: index,
            progress: Math.random(),
            speed: this.isMobile ? 0.011 + Math.random() * 0.004 : 0.016 + Math.random() * 0.005,
            length: this.lineWidth * (this.isMobile ? 5.4 : 6.8),
            thickness: this.lineWidth * 0.6,
            phase: Math.random() * Math.PI * 2
          });
        }
      });

      if (!this.lumens.length && this.paths.length) {
        this.lumens.push({
          pathIndex: 0,
          progress: Math.random(),
          speed: 0.013,
          length: this.lineWidth * 6,
          thickness: this.lineWidth * 0.6,
          phase: Math.random() * Math.PI * 2
        });
      }
    }

    renderLoop(timestamp) {
      if (!this.isRunning) return;
      const delta = Math.min((timestamp - this.lastTime) / 1000, 0.05);
      this.lastTime = timestamp;
      this.drawFrame(delta);
      requestAnimationFrame(this.renderLoop);
    }

    drawFrame(delta) {
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.drawPaths();
      this.updateLumens(delta);
      this.drawLumens();
    }

    drawPaths() {
      const ctx = this.ctx;
      ctx.save();
      ctx.lineWidth = this.lineWidth;
      ctx.strokeStyle = STROKE_COLOR;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      this.paths.forEach((path) => {
        if (path?.path2D) ctx.stroke(path.path2D);
      });
      ctx.restore();
    }

    updateLumens(delta) {
      this.lumens.forEach((lumen) => {
        lumen.progress += lumen.speed * delta;
        if (lumen.progress > 1) {
          lumen.progress -= 1;
        }
        lumen.phase += delta * 0.32;
        lumen.intensity = 0.72 + Math.sin(lumen.phase) * 0.12;
      });
    }

    drawLumens() {
      const ctx = this.ctx;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      this.lumens.forEach((lumen) => {
        const path = this.paths[lumen.pathIndex];
        if (!path) return;

        const sample = this.samplePath(path, lumen.progress);
        if (!sample) return;

        const gradient = ctx.createLinearGradient(-lumen.length, 0, lumen.length, 0);
        gradient.addColorStop(0, LUMEN_EDGE);
        gradient.addColorStop(0.4, `rgba(201, 168, 107, ${0.38 * lumen.intensity})`);
        gradient.addColorStop(0.5, `rgba(201, 168, 107, ${0.9 * lumen.intensity})`);
        gradient.addColorStop(0.6, `rgba(201, 168, 107, ${0.38 * lumen.intensity})`);
        gradient.addColorStop(1, LUMEN_EDGE);

        ctx.save();
        ctx.translate(sample.point.x, sample.point.y);
        ctx.rotate(sample.angle);
        ctx.fillStyle = gradient;
        ctx.shadowColor = `rgba(201, 168, 107, ${0.5 * lumen.intensity})`;
        ctx.shadowBlur = lumen.length * 1.1;
        ctx.beginPath();
        ctx.ellipse(0, 0, lumen.length, lumen.thickness * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      ctx.restore();
    }

    handleResize() {
      this.isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
      this.updateCanvasMetrics();
      this.buildPaths();
      this.seedLumens();
    }

    createStructuredPath(route) {
      const radiusMax = route.radius * this.scaleBase;
      const points = route.points.map(([x, y]) => this.scalePoint({ x, y }));
      if (!points.length) return null;

      const path2D = new Path2D();
      const segments = [];

      let cursor = points[0];
      path2D.moveTo(cursor.x, cursor.y);

      for (let i = 1; i < points.length; i++) {
        const current = points[i];
        const hasNext = i < points.length - 1;
        const previous = points[i - 1];

        if (!hasNext) {
          if (distance(cursor, current) > EPSILON) {
            path2D.lineTo(current.x, current.y);
            segments.push({
              type: 'line',
              start: { ...cursor },
              end: { ...current },
              length: distance(cursor, current),
              direction: normalize({ x: current.x - cursor.x, y: current.y - cursor.y })
            });
            cursor = current;
          }
          continue;
        }

        const next = points[i + 1];
        const dirInRaw = { x: current.x - previous.x, y: current.y - previous.y };
        const dirOutRaw = { x: next.x - current.x, y: next.y - current.y };
        const dirIn = normalize(dirInRaw);
        const dirOut = normalize(dirOutRaw);

        let radius = radiusMax;
        radius = Math.min(radius, distance(previous, current) / 2, distance(current, next) / 2);

        const entry = {
          x: current.x - dirIn.x * radius,
          y: current.y - dirIn.y * radius
        };
        const exit = {
          x: current.x + dirOut.x * radius,
          y: current.y + dirOut.y * radius
        };

        if (distance(cursor, entry) > EPSILON) {
          path2D.lineTo(entry.x, entry.y);
          segments.push({
            type: 'line',
            start: { ...cursor },
            end: { ...entry },
            length: distance(cursor, entry),
            direction: normalize({ x: entry.x - cursor.x, y: entry.y - cursor.y })
          });
        }

        path2D.quadraticCurveTo(current.x, current.y, exit.x, exit.y);
        const lookup = buildQuadraticLookup(entry, current, exit);
        segments.push({
          type: 'quad',
          start: { ...entry },
          control: { x: current.x, y: current.y },
          end: { ...exit },
          length: lookup.totalLength,
          lookup
        });

        cursor = exit;
      }

      const totalLength = segments.reduce((sum, segment) => sum + segment.length, 0);
      return { path2D, segments, totalLength };
    }

    scalePoint(point) {
      return {
        x: point.x * this.width,
        y: point.y * this.height
      };
    }

    samplePath(path, progress) {
      if (!path || path.totalLength <= EPSILON) return null;
      const target = progress * path.totalLength;
      let accumulated = 0;

      for (let i = 0; i < path.segments.length; i++) {
        const segment = path.segments[i];
        const nextAccum = accumulated + segment.length;
        if (target <= nextAccum || i === path.segments.length - 1) {
          const local = clamp((target - accumulated) / segment.length, 0, 1);
          if (segment.type === 'line') {
            const point = lerpPoint(segment.start, segment.end, local);
            const direction = segment.direction;
            return {
              point,
              angle: Math.atan2(direction.y, direction.x)
            };
          }

          if (segment.type === 'quad') {
            const lookup = segment.lookup;
            const targetLength = local * segment.length;
            let lower = lookup.table[0];
            let upper = lookup.table[lookup.table.length - 1];

            for (let j = 1; j < lookup.table.length; j++) {
              const entry = lookup.table[j];
              if (entry.length >= targetLength) {
                lower = lookup.table[j - 1];
                upper = entry;
                break;
              }
            }

            const span = upper.length - lower.length || 1;
            const t = lerp(lower.t, upper.t, clamp((targetLength - lower.length) / span, 0, 1));
            const point = quadraticPoint(segment.start, segment.control, segment.end, t);
            const derivative = quadraticDerivative(segment.start, segment.control, segment.end, t);
            const dir = normalize(derivative);
            return {
              point,
              angle: Math.atan2(dir.y, dir.x)
            };
          }
        }
        accumulated = nextAccum;
      }

      const lastSegment = path.segments[path.segments.length - 1];
      if (!lastSegment) return null;
      return {
        point: { ...lastSegment.end },
        angle: Math.atan2(lastSegment.end.y - lastSegment.start.y, lastSegment.end.x - lastSegment.start.x)
      };
    }
  }

  function initVeinCanvas() {
    const canvas = document.getElementById('veinCanvas');
    if (!canvas) return;

    const field = new TerminalVeinField(canvas);
    field.init();
    return field;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVeinCanvas);
  } else {
    initVeinCanvas();
  }
})();

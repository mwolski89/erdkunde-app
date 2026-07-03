// Interaktive Europakarte als SVG.
// Rendert die vorberechneten Länderpfade, meldet angetippte Länder und
// unterstützt Zoomen (Pinch, Mausrad, Buttons) und Verschieben per Finger.

const SVG_NS = 'http://www.w3.org/2000/svg';
const MAX_ZOOM = 8;
const TAP_TOLERANCE_PX = 10; // mehr Bewegung = Verschieben statt Antippen

export class EuropeMap {
  constructor(container, mapData) {
    this.container = container;
    this.onTap = null; // Callback: (iso2) => void
    this.enabled = true;
    this.paths = new Map();
    this.home = { x: 0, y: 0, w: mapData.width, h: mapData.height };
    this.vb = { ...this.home };
    this.#render(mapData);
    this.#initPointerHandling();
  }

  #render({ width, height, countries }) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.classList.add('europe-map');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    for (const c of countries) {
      const p = document.createElementNS(SVG_NS, 'path');
      p.setAttribute('d', c.d);
      p.classList.add('country');
      p.dataset.iso2 = c.iso2;
      svg.appendChild(p);
      this.paths.set(c.iso2, p);
    }
    this.svg = svg;
    this.container.appendChild(svg);

    const controls = document.createElement('div');
    controls.className = 'map-controls';
    for (const [label, action] of [['➕', () => this.#zoomCenter(1.5)], ['➖', () => this.#zoomCenter(1 / 1.5)], ['🏠', () => this.resetView()]]) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'map-btn';
      btn.textContent = label;
      btn.addEventListener('click', action);
      controls.appendChild(btn);
    }
    this.container.appendChild(controls);
  }

  // ---- Markierungen für richtig/falsch/aufdecken ----

  mark(iso2, cls) {
    const p = this.paths.get(iso2);
    if (p) {
      p.classList.add(cls);
      p.parentNode.appendChild(p); // nach oben, damit die Umrandung sichtbar bleibt
    }
  }

  clearMarks() {
    for (const p of this.paths.values()) p.classList.remove('correct', 'wrong', 'reveal');
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    this.svg.classList.toggle('map-disabled', !enabled);
  }

  // ---- Zoom & Pan über die viewBox ----

  #applyViewBox() {
    const { x, y, w, h } = this.vb;
    this.svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
  }

  #clamp() {
    const minW = this.home.w / MAX_ZOOM;
    this.vb.w = Math.min(this.home.w, Math.max(minW, this.vb.w));
    this.vb.h = this.vb.w * (this.home.h / this.home.w);
    this.vb.x = Math.min(this.home.w - this.vb.w, Math.max(0, this.vb.x));
    this.vb.y = Math.min(this.home.h - this.vb.h, Math.max(0, this.vb.y));
  }

  #toSvgPoint(clientX, clientY) {
    const m = this.svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    return new DOMPoint(clientX, clientY).matrixTransform(m.inverse());
  }

  #zoomAt(clientX, clientY, factor) {
    const f = this.#toSvgPoint(clientX, clientY);
    this.vb.x = f.x - (f.x - this.vb.x) / factor;
    this.vb.y = f.y - (f.y - this.vb.y) / factor;
    this.vb.w /= factor;
    this.vb.h /= factor;
    this.#clamp();
    this.#applyViewBox();
  }

  #zoomCenter(factor) {
    const r = this.svg.getBoundingClientRect();
    this.#zoomAt(r.left + r.width / 2, r.top + r.height / 2, factor);
  }

  resetView() {
    this.vb = { ...this.home };
    this.#applyViewBox();
  }

  zoomToCountry(iso2, padding = 3) {
    const p = this.paths.get(iso2);
    if (!p) return;
    const b = p.getBBox();
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    this.vb.w = Math.max(b.width + padding * 2, this.home.w / MAX_ZOOM);
    this.vb.h = this.vb.w * (this.home.h / this.home.w);
    this.vb.x = cx - this.vb.w / 2;
    this.vb.y = cy - this.vb.h / 2;
    this.#clamp();
    this.#applyViewBox();
  }

  // ---- Eingaben: Tippen, Ziehen, Pinch, Mausrad ----

  #initPointerHandling() {
    const active = new Map(); // pointerId -> letzte Position
    let downPos = null;
    let moved = false;
    let pinchDist = 0;

    this.svg.style.touchAction = 'none';

    this.svg.addEventListener('pointerdown', (e) => {
      this.svg.setPointerCapture(e.pointerId);
      active.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (active.size === 1) {
        downPos = { x: e.clientX, y: e.clientY, target: e.target };
        moved = false;
      } else if (active.size === 2) {
        const [a, b] = [...active.values()];
        pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      }
    });

    this.svg.addEventListener('pointermove', (e) => {
      if (!active.has(e.pointerId)) return;
      const prev = active.get(e.pointerId);
      active.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (active.size === 1 && downPos) {
        if (Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > TAP_TOLERANCE_PX) moved = true;
        if (moved) {
          const scale = this.vb.w / this.svg.getBoundingClientRect().width;
          this.vb.x -= (e.clientX - prev.x) * scale;
          this.vb.y -= (e.clientY - prev.y) * scale;
          this.#clamp();
          this.#applyViewBox();
        }
      } else if (active.size === 2) {
        moved = true;
        const [a, b] = [...active.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDist > 0 && dist > 0) {
          this.#zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, dist / pinchDist);
        }
        pinchDist = dist;
      }
    });

    const end = (e) => {
      if (active.size === 1 && !moved && downPos && this.enabled) {
        const iso2 = downPos.target?.dataset?.iso2;
        if (iso2 && this.onTap) this.onTap(iso2);
      }
      active.delete(e.pointerId);
      pinchDist = 0;
      if (active.size === 0) downPos = null;
    };
    this.svg.addEventListener('pointerup', end);
    this.svg.addEventListener('pointercancel', end);

    this.svg.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.#zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.2 : 1 / 1.2);
    }, { passive: false });
  }
}

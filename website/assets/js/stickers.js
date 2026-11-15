/* ==========================================================================
   Cut-paper sticker library
   Each sticker = art + a hand-scissored white border. The border is an
   irregular, straight-faceted polygon built around the art's outline, and
   there are three slightly different cuts that swap frame-by-frame (the
   stop-motion "boil").
   Usage in HTML:  <div class="sticker-wrap" data-sticker="burst"></div>
   ========================================================================== */
(function () {
  const C = { ink: "#121114", maroon: "#800000", maroonLt: "#a3302f", gold: "#ccb179", goldDk: "#a88d55", cream: "#fbf6ea", paper: "#eef1f6" };

  // ---------- tiny geometry kit ----------
  function rng(seed) { // mulberry32
    let a = seed >>> 0;
    return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const hash = (s) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);
  const circlePts = (cx, cy, rx, ry = rx, n = 28) => Array.from({ length: n }, (_, i) => [cx + rx * Math.cos((i / n) * 2 * Math.PI), cy + ry * Math.sin((i / n) * 2 * Math.PI)]);
  const rotPts = (pts, deg, cx, cy) => { const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r); return pts.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]); };
  const poly = (pts) => pts.map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" ");

  function hull(pts) {
    const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (const q of p.reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    return lo.slice(0, -1).concat(up.slice(0, -1)); // counter-clockwise (y-down: clockwise on screen)
  }

  // irregular scissor cut around a point cloud
  function jaggedCut(pts, seed, { border = 14, jit = 10, seg = 46 } = {}) {
    const R = rng(seed);
    const h = hull(pts), n = h.length;
    const norm = (x, y) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };
    const out = (a, b) => { const [tx, ty] = norm(b[0] - a[0], b[1] - a[1]); return [ty, -tx]; }; // outward for this winding
    // offset hull outward
    const off = h.map((p, i) => {
      const a = out(h[(i - 1 + n) % n], p), b = out(p, h[(i + 1) % n]);
      const [nx, ny] = norm(a[0] + b[0], a[1] + b[1]);
      return [p[0] + nx * border, p[1] + ny * border];
    });
    // subdivide long edges at uneven spots
    const verts = [];
    off.forEach((a, i) => {
      const b = off[(i + 1) % off.length]; verts.push(a);
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const k = Math.floor(L / seg);
      const ts = Array.from({ length: k }, () => 0.08 + R() * 0.84).sort();
      ts.forEach((t) => verts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]));
    });
    // shove every vertex outward by a random amount (never inward)
    const m = verts.length;
    const res = verts.map((p, i) => {
      const prev = verts[(i - 1 + m) % m], next = verts[(i + 1) % m];
      const [tx, ty] = norm(next[0] - prev[0], next[1] - prev[1]);
      const d = R() * jit, s = (R() - 0.5) * jit * 0.7;
      return [p[0] + ty * d + tx * s, p[1] - tx * d + ty * s];
    });
    return "M" + res.map((p) => p.map((v) => v.toFixed(1)).join(" ")).join("L") + "Z";
  }

  // ---------- sticker art ----------
  const HT = 'fill="url(#pg-ht)"', HTW = 'fill="url(#pg-htw)"';

  function burstPts(cx, cy, spikes, rOut, rIn, seed) {
    const R = rng(seed), pts = [];
    for (let i = 0; i < spikes * 2; i++) {
      const a = (i / (spikes * 2)) * Math.PI * 2 + (R() - 0.5) * 0.12;
      const r = i % 2 ? rIn * (0.9 + R() * 0.2) : rOut * (0.82 + R() * 0.22);
      pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    return pts;
  }

  const LIB = {
    burst(o = {}) {
      const pts = burstPts(100, 100, 15, 96, 58, 4);
      const inner = burstPts(100, 100, 15, 70, 50, 9);
      const label = o.text ? `<text x="100" y="${o.textY || 122}" text-anchor="middle" font-family="Inter, sans-serif" font-weight="800" font-size="${o.size || 64}" fill="${C.ink}" letter-spacing="-2">${o.text}</text>` : "";
      return { pts, art: `<polygon points="${poly(pts)}" fill="${C.gold}"/><polygon points="${poly(pts)}" ${HT}/><polygon points="${poly(inner)}" fill="none" stroke="${C.goldDk}" stroke-width="2" stroke-dasharray="3 5" opacity=".8"/>${label}` };
    },
    eyes() {
      const eye = (cx, cy, rx, ry, rot, seed) => {
        const R = rng(seed);
        const p = rotPts(circlePts(cx, cy, rx, ry, 10).map(([x, y]) => [x + (R() - 0.5) * 9, y + (R() - 0.5) * 9]), rot, cx, cy);
        return p;
      };
      const L = eye(66, 104, 50, 62, -14, 3), Rr = eye(146, 96, 46, 58, 12, 8);
      const pupil = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${C.ink}"/><circle cx="${x - r * 0.35}" cy="${y - r * 0.4}" r="${r * 0.3}" fill="#fff"/>`;
      return {
        pts: L.concat(Rr),
        art: `<polygon points="${poly(L)}" fill="#e6cd85" stroke="${C.ink}" stroke-width="4" stroke-linejoin="round"/><polygon points="${poly(L)}" ${HT}/>
              <polygon points="${poly(Rr)}" fill="#e6cd85" stroke="${C.ink}" stroke-width="4" stroke-linejoin="round"/><polygon points="${poly(Rr)}" ${HT}/>
              ${pupil(80, 112, 22)}${pupil(158, 104, 20)}`,
      };
    },
    aplus() {
      const pts = circlePts(100, 100, 78);
      return { pts, art: `<circle cx="100" cy="100" r="78" fill="${C.maroon}"/><circle cx="100" cy="100" r="78" ${HTW}/><circle cx="100" cy="100" r="64" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2" stroke-dasharray="2 6"/><text x="98" y="128" text-anchor="middle" font-family="Caveat, cursive" font-weight="700" font-size="96" fill="#fff">A+</text>` };
    },
    pencil() {
      const body = [[22, 82], [152, 82], [152, 118], [22, 118]];
      const raw = [[-14, 100], ...body, [192, 82], [192, 118]];
      const pts = rotPts(raw, -32, 100, 100);
      return {
        pts,
        art: `<g transform="rotate(-32 100 100)">
          <polygon points="22,82 -14,100 22,118" fill="#efd6a2"/><polygon points="-2,94 -14,100 -2,106" fill="${C.ink}"/>
          <rect x="22" y="82" width="130" height="36" fill="${C.gold}"/><rect x="22" y="82" width="130" height="36" ${HT}/>
          <rect x="22" y="93" width="130" height="2.5" fill="${C.goldDk}"/><rect x="22" y="105" width="130" height="2.5" fill="${C.goldDk}"/>
          <rect x="152" y="80" width="20" height="40" fill="#c9c7cf"/><rect x="157" y="80" width="2" height="40" fill="#8e8b95"/><rect x="164" y="80" width="2" height="40" fill="#8e8b95"/>
          <rect x="172" y="81" width="22" height="38" rx="6" fill="${C.maroonLt}"/><rect x="172" y="81" width="22" height="38" rx="6" ${HT}/>
          <polygon points="22,82 -14,100 22,118 152,118 152,82" fill="none" stroke="${C.ink}" stroke-width="2.5" stroke-linejoin="round"/></g>`,
      };
    },
    cursor() {
      const p = [[60, 22], [60, 168], [94, 136], [118, 186], [142, 175], [118, 126], [166, 126]];
      return { pts: p, art: `<polygon points="${poly(p)}" fill="${C.ink}" stroke="${C.ink}" stroke-width="8" stroke-linejoin="round"/><polygon points="${poly(p)}" fill="${C.gold}" transform="translate(9 14) scale(.86)" /><polygon points="${poly(p)}" ${HT} transform="translate(9 14) scale(.86)"/>` };
    },
    star() {
      const pts = [];
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const r = i % 2 ? 40 : 90; pts.push([100 + r * Math.cos(a), 104 + r * Math.sin(a)]); }
      return { pts, art: `<polygon points="${poly(pts)}" fill="${C.maroon}" stroke="${C.maroon}" stroke-width="10" stroke-linejoin="round"/><polygon points="${poly(pts)}" ${HTW}/><path d="M78 74 l8 -10" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".8"/>` };
    },
    heart() {
      const d = "M100 172 C 40 132, 18 100, 22 70 C 26 38, 70 28, 100 62 C 130 28, 174 38, 178 70 C 182 100, 160 132, 100 172 Z";
      const pts = [[100, 176], [44, 134], [18, 96], [20, 60], [44, 32], [80, 34], [100, 56], [120, 34], [156, 32], [180, 60], [182, 96], [156, 134]];
      return { pts, art: `<path d="${d}" fill="${C.maroon}"/><path d="${d}" ${HTW}/><path d="M52 66 q6 -16 24 -16" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" opacity=".85"/><text x="100" y="120" text-anchor="middle" font-family="Caveat, cursive" font-weight="700" font-size="52" fill="#fff">+1</text>` };
    },
    code() {
      const pts = [[18, 40], [182, 40], [182, 164], [18, 164]];
      return {
        pts: rotPts(pts, -6, 100, 100),
        art: `<g transform="rotate(-6 100 100)"><rect x="18" y="40" width="164" height="124" rx="16" fill="${C.ink}"/><rect x="18" y="40" width="164" height="124" rx="16" ${HTW} opacity=".35"/>
          <circle cx="38" cy="58" r="5.5" fill="${C.maroonLt}"/><circle cx="56" cy="58" r="5.5" fill="${C.gold}"/><circle cx="74" cy="58" r="5.5" fill="#6b6872"/>
          <text x="100" y="132" text-anchor="middle" font-family="JetBrains Mono, monospace" font-weight="700" font-size="50" fill="${C.gold}">&lt;/&gt;</text>
          <rect x="146" y="112" width="14" height="22" fill="${C.gold}"><animate attributeName="opacity" values="1;0;1" dur="1s" calcMode="discrete" repeatCount="indefinite"/></rect></g>`,
      };
    },
    ticket() {
      const raw = [[12, 58], [188, 58], [188, 142], [12, 142]];
      const d = "M12 58 H188 V86 a14 14 0 0 0 0 28 V142 H12 V114 a14 14 0 0 0 0 -28 Z";
      return {
        pts: rotPts(raw, -10, 100, 100),
        art: `<g transform="rotate(-10 100 100)"><path d="${d}" fill="${C.gold}"/><path d="${d}" ${HT}/><line x1="140" y1="64" x2="140" y2="136" stroke="${C.ink}" stroke-width="2.5" stroke-dasharray="5 5"/>
          <text x="76" y="96" text-anchor="middle" font-family="JetBrains Mono, monospace" font-weight="700" font-size="15" fill="${C.ink}" letter-spacing="2">ADMIT</text>
          <text x="76" y="126" text-anchor="middle" font-family="Inter, sans-serif" font-weight="800" font-size="30" fill="${C.ink}" letter-spacing="-1">ONE</text>
          <text x="164" y="104" text-anchor="middle" font-family="JetBrains Mono, monospace" font-weight="700" font-size="13" fill="${C.ink}" transform="rotate(-90 164 100)">No.027</text></g>`,
      };
    },
    bubble() {
      const pts = circlePts(100, 92, 84, 64).concat([[54, 182]]);
      return {
        pts,
        art: `<path d="M60 146 L50 180 L92 152 Z" fill="${C.cream}" stroke="${C.ink}" stroke-width="5" stroke-linejoin="round"/><ellipse cx="100" cy="92" rx="84" ry="64" fill="${C.cream}" stroke="${C.ink}" stroke-width="5"/><path d="M62 146 L56 168 L86 150" fill="${C.cream}"/>
          <text x="100" y="114" text-anchor="middle" font-family="Caveat, cursive" font-weight="700" font-size="70" fill="${C.maroon}">hi!</text>`,
      };
    },
    badge() {
      const n = 22, pts = [];
      let d = "";
      for (let i = 0; i < n; i++) {
        const a1 = (i / n) * Math.PI * 2, a2 = ((i + 0.5) / n) * Math.PI * 2, a3 = ((i + 1) / n) * Math.PI * 2;
        const P = (a, r) => [100 + r * Math.cos(a), 100 + r * Math.sin(a)];
        const [x1, y1] = P(a1, 82), [cx, cy] = P(a2, 96), [x3, y3] = P(a3, 82);
        d += (i ? "" : `M${x1.toFixed(1)} ${y1.toFixed(1)}`) + `Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x3.toFixed(1)} ${y3.toFixed(1)}`;
        pts.push(P(a2, 90));
      }
      return {
        pts,
        art: `<path d="${d}Z" fill="${C.ink}"/><circle cx="100" cy="100" r="68" fill="${C.cream}"/><circle cx="100" cy="100" r="68" ${HT} opacity=".5"/><circle cx="100" cy="100" r="60" fill="none" stroke="${C.maroon}" stroke-width="2" stroke-dasharray="1 5" stroke-linecap="round"/>
          <text x="100" y="94" text-anchor="middle" font-family="JetBrains Mono, monospace" font-weight="700" font-size="13" fill="${C.maroon}" letter-spacing="3">GOAL</text>
          <text x="100" y="128" text-anchor="middle" font-family="Inter, sans-serif" font-weight="800" font-size="42" fill="${C.ink}" letter-spacing="-2.5">$100K</text>`,
      };
    },
    plane() {
      const p = [[14, 92], [190, 30], [96, 172], [78, 124]];
      return {
        pts: p,
        art: `<polygon points="14,92 190,30 78,124" fill="${C.paper}" stroke="${C.ink}" stroke-width="4" stroke-linejoin="round"/><polygon points="78,124 190,30 96,172" fill="#cfd6e2" stroke="${C.ink}" stroke-width="4" stroke-linejoin="round"/><polygon points="78,124 190,30 96,172" ${HT}/><polyline points="78,124 84,150 96,172" fill="none" stroke="${C.ink}" stroke-width="3"/>`,
      };
    },
  };

  // PNG stickers made by the asset script (art + 3 matching cut frames)
  const PNG = {
    mascot: { base: "mascot-art", alt: "Project Graduation mascot" },
    cap: { base: "mark-art", alt: "" },
  };

  function assetsPath() {
    const s = document.querySelector('script[src*="stickers.js"]');
    return s ? s.getAttribute("src").replace(/js\/stickers\.js.*$/, "") : "assets/";
  }

  function render(name, opts = {}) {
    if (PNG[name]) {
      const base = assetsPath() + PNG[name].base;
      return `<img class="cv cv1" src="${base}-cut1.png" alt="" aria-hidden="true"><img class="cv cv2" src="${base}-cut2.png" alt="" aria-hidden="true"><img class="cv cv3" src="${base}-cut3.png" alt="" aria-hidden="true"><img class="art" src="${base}.png" alt="${PNG[name].alt}" draggable="false">`;
    }
    const def = LIB[name]; if (!def) return "";
    const { pts, art } = def(opts);
    const seed = hash(name + (opts.text || ""));
    const cutOpts = { border: opts.border || 14, jit: opts.jit || 11, seg: opts.seg || 44 };
    const cuts = [1, 2, 3].map((v) => `<path class="cv cv${v}" d="${jaggedCut(pts, seed + v * 101, cutOpts)}" fill="#fff"/>`).join("");
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const pad = cutOpts.border + cutOpts.jit + 6;
    const x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - pad, w = Math.max(...xs) - Math.min(...xs) + pad * 2, h = Math.max(...ys) - Math.min(...ys) + pad * 2;
    return `<svg viewBox="${x0.toFixed(0)} ${y0.toFixed(0)} ${w.toFixed(0)} ${h.toFixed(0)}" aria-hidden="true">${cuts}${art}</svg>`;
  }

  function defs() {
    if (document.getElementById("pg-defs")) return;
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.id = "pg-defs"; s.setAttribute("width", "0"); s.setAttribute("height", "0"); s.style.position = "absolute";
    s.innerHTML = `<defs>
      <pattern id="pg-ht" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(28)"><circle cx="3.5" cy="3.5" r="1.7" fill="#000" fill-opacity=".2"/></pattern>
      <pattern id="pg-htw" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(28)"><circle cx="3.5" cy="3.5" r="1.5" fill="#fff" fill-opacity=".22"/></pattern>
      <pattern id="pg-htg" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.55" fill="#ccb179"/></pattern></defs>`;
    document.body.prepend(s);
  }

  // fill every [data-sticker] element
  function mount(root = document) {
    defs();
    root.querySelectorAll("[data-sticker]").forEach((el) => {
      if (el.dataset.mounted) return;
      const opts = {};
      if (el.dataset.text) opts.text = el.dataset.text;
      if (el.dataset.size) opts.size = +el.dataset.size;
      const still = el.hasAttribute("data-still");
      el.innerHTML = `<span class="sticker${still ? " still" : ""}">${render(el.dataset.sticker, opts)}</span>`;
      el.dataset.mounted = "1";
    });
  }

  window.PGStickers = { render, mount };
})();

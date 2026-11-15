/* ==========================================================================
   Site header, rocket logo, paper dropdowns, footer.
   Placeholders:  <div data-site-header data-current="events"></div>
                  <span data-brand></span>          (rocket logo + name only)
                  <div data-site-footer></div>
   ========================================================================== */
(function () {
  const CFG = (window.PG_SEED && window.PG_SEED.config) || {};
  const year = CFG.classYear || 2027;
  const contact = CFG.contactEmail || "hello@hhsprojectgrad.org";
  const sticker = (name, cls = "") => `<span class="mini-stk ${cls}" data-sticker="${name}" data-still></span>`;

  const ROCKET = `<span class="logo-pad" aria-hidden="true">
      <span class="smoke"><i></i><i></i><i></i><i></i></span>
      <span class="rocket">
        <span class="flame"><svg viewBox="0 0 60 80"><path class="f1" d="M30 2C46 2 58 14 58 30c0 12-6 20-12 26 2-6 1-10-2-12 0 10-6 18-10 34-4-8-12-16-14-22-2 4-4 6-8 6 2-4 2-8-2-12C4 44 2 38 2 30 2 14 14 2 30 2z"/><path class="f2" d="M30 10c12 0 20 10 19 21-1 9-7 15-13 21 1-6 0-9-3-11 0 7-3 13-5 21-3-7-6-12-8-17-7-5-9-11-9-16 0-11 8-19 19-19z"/><path class="f3" d="M30 16c8 0 13 7 12 14-1 6-6 10-10 14 0-5-1-7-3-9-3 3-6 2-9-2-3-5-2-11 2-14 2-2 5-3 8-3z"/><circle class="f4" cx="30" cy="22" r="5"/></svg></span>
        <span class="ship"><img src="assets/mark-white.png" alt=""></span>
      </span>
    </span>`;
  const BRAND = (home = "index.html") => `<a class="brand" href="${home}" aria-label="Project Graduation home">${ROCKET}<span class="brand-name">Project <b>Graduation</b></span></a>`;

  const INVOLVED = [
    { href: "volunteer.html", s: "heart", t: "Volunteer sign-up", d: "Register once, pick shifts later" },
    { href: "portal.html", s: "cursor", t: "Volunteer portal", d: "Log in to book shifts & see hours" },
    { href: "pitch.html", s: "plane", t: "Pitch an event", d: "Got a fundraiser idea? Tell us" },
    { href: "sponsor.html", s: "badge", t: "Become a sponsor", d: `Back the Class of ${year}` },
  ];

  // irregular torn bottom edge for paper panels
  function tornClip(seed) {
    let a = seed; const R = () => ((a = (a * 9301 + 49297) % 233280) / 233280);
    const pts = ["0 0", "100% 0", `100% calc(100% - ${4 + R() * 6}px)`];
    for (let x = 100; x > 0;) { x = Math.max(0, x - (3 + R() * 6)); pts.push(`${x.toFixed(1)}% calc(100% - ${(R() * 9).toFixed(1)}px)`); }
    return `polygon(${pts.join(",")})`;
  }

  function header(current) {
    const link = (href, label, key) => `<li><a href="${href}" ${current === key ? 'aria-current="page"' : ""}>${label}</a></li>`;
    const drop = INVOLVED.map((x, n) => `<li style="--n:${n}"><a href="${x.href}">${sticker(x.s)}<span><b>${x.t}</b><small>${x.d}</small></span></a></li>`).join("");
    return `<nav class="nav" aria-label="Main"><span class="nav-progress" aria-hidden="true"></span><div class="nav-inner">
      ${BRAND()}
      <ul class="nav-links">
        ${link("events.html", "Events", "events")}
        <li class="has-drop">
          <a href="get-involved.html" ${current === "involved" ? 'aria-current="page"' : ""}>Get involved</a>
          <button class="drop-btn" aria-expanded="false" aria-controls="drop-involved" aria-label="Show Get involved menu"><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4.5 6 7.5 9 4.5"/></svg></button>
          <div class="drop" id="drop-involved">
            <span class="tape" aria-hidden="true"></span>
            <div class="sheet" style="clip-path:${tornClip(7)}">
              <p class="sheet-label hand">ways to help ↓</p>
              <ul>${drop}</ul>
              <a class="sheet-more hand" href="get-involved.html">see everything →</a>
            </div>
          </div>
        </li>
        ${link("index.html#about", "About", "about")}
        ${link("index.html#faq", "FAQ", "faq")}
      </ul>
      <a class="nav-donate" href="index.html#donate"><span>Donate</span></a>
      <button class="nav-toggle" aria-expanded="false" aria-controls="nav-mobile" aria-label="Menu"><span></span><span></span><span></span></button>
    </div>
    <div class="mobile-menu" id="nav-mobile">
      <span class="tape" aria-hidden="true"></span>
      <div class="sheet" style="clip-path:${tornClip(13)}">
        ${sticker("pencil", "mm-pencil")}${sticker("star", "mm-star")}
        <ul class="mm-main">
          <li style="--n:0"><a href="events.html">Events</a></li>
          <li style="--n:1"><a href="get-involved.html">Get involved</a>
            <ul class="mm-sub">${INVOLVED.map((x) => `<li><a href="${x.href}">${sticker(x.s)}${x.t}</a></li>`).join("")}</ul></li>
          <li style="--n:2"><a href="index.html#about">About</a></li>
          <li style="--n:3"><a href="index.html#faq">FAQ</a></li>
        </ul>
        <a class="btn btn-gold mm-donate" href="index.html#donate">Donate to grad night <span class="arrow">→</span></a>
        <p class="mm-foot hand">Hillsborough High · Class of ${year}</p>
      </div>
    </div></nav>`;
  }

  const footer = () => `<footer class="footer">
    <div class="wrap">
      <div class="footer-grid">
        <div>
          <img class="wm" src="assets/wordmark-hhs-dark.png" alt="Project Graduation Hillsborough">
          <p style="max-width:34ch;margin:0">One safe, all-night celebration for Hillsborough High's graduating class, made possible by families, staff, and neighbors.</p>
        </div>
        <div><h4>Explore</h4><ul><li><a href="events.html">Events</a></li><li><a href="index.html#about">About</a></li><li><a href="index.html#faq">FAQ</a></li></ul></div>
        <div><h4>Get involved</h4><ul><li><a href="volunteer.html">Volunteer</a></li><li><a href="portal.html">Volunteer portal</a></li><li><a href="pitch.html">Pitch an event</a></li><li><a href="sponsor.html">Sponsor</a></li><li><a href="index.html#donate">Donate</a></li></ul></div>
        <div><h4>Contact</h4><ul><li><a href="mailto:${contact}">${contact}</a></li><li><a href="${CFG.instagram || "https://instagram.com/"}" rel="noopener">Instagram</a></li></ul></div>
      </div>
      <div class="fine"><span>© ${year} Project Graduation · Hillsborough High School</span><span class="mono">made with ♥ by the class of '${String(year).slice(2)} community</span></div>
    </div>
  </footer>`;

  // ---------- render
  document.querySelectorAll("[data-site-header]").forEach((el) => { el.outerHTML = header(el.dataset.current); });
  document.querySelectorAll("[data-brand]").forEach((el) => { el.outerHTML = BRAND(el.dataset.home || "index.html"); });
  document.querySelectorAll("[data-site-footer]").forEach((el) => { el.outerHTML = footer(); });
  window.PGStickers && PGStickers.mount();

  // ---------- rocket launch (runs the whole sequence once per hover)
  document.querySelectorAll(".brand").forEach((b) => {
    const go = () => { if (!b.classList.contains("launch") && !matchMedia("(prefers-reduced-motion: reduce)").matches) b.classList.add("launch"); };
    b.addEventListener("mouseenter", go);
    b.addEventListener("focus", go);
    b.querySelector(".rocket")?.addEventListener("animationend", (e) => { if (e.animationName === "rocket-fly") b.classList.remove("launch"); });
  });

  // ---------- dropdown + mobile menu
  const nav = document.querySelector(".nav");
  if (!nav) return;
  const dropLi = nav.querySelector(".has-drop"), dropBtn = nav.querySelector(".drop-btn");
  const toggle = nav.querySelector(".nav-toggle"), menu = nav.querySelector(".mobile-menu");
  const setDrop = (open) => { dropLi.classList.toggle("open", open); dropBtn.setAttribute("aria-expanded", open); };
  const setMenu = (open) => { nav.classList.toggle("menu-open", open); toggle.setAttribute("aria-expanded", open); toggle.setAttribute("aria-label", open ? "Close menu" : "Menu"); };
  dropBtn.addEventListener("click", (e) => { e.stopPropagation(); setDrop(!dropLi.classList.contains("open")); });
  // hover intent: open right away, close only after the pointer has been gone a moment
  let closeT;
  if (matchMedia("(hover: hover)").matches) {
    dropLi.addEventListener("mouseenter", () => { clearTimeout(closeT); setDrop(true); });
    dropLi.addEventListener("mouseleave", () => { closeT = setTimeout(() => setDrop(false), 220); });
  }
  dropLi.addEventListener("focusin", () => { clearTimeout(closeT); setDrop(true); });
  dropLi.addEventListener("focusout", (e) => { if (!dropLi.contains(e.relatedTarget)) setDrop(false); });
  toggle.addEventListener("click", (e) => { e.stopPropagation(); setMenu(!nav.classList.contains("menu-open")); });
  document.addEventListener("click", (e) => { if (!dropLi.contains(e.target)) setDrop(false); if (!nav.contains(e.target)) setMenu(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { setDrop(false); setMenu(false); } });
  menu.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  const bar = nav.querySelector(".nav-progress");
  const onScroll = () => {
    nav.classList.toggle("scrolled", scrollY > 30);
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
  };
  addEventListener("scroll", onScroll, { passive: true }); onScroll();
})();

/* Project Graduation — site behavior */
(async function () {
  window.PGStickers && PGStickers.mount(); // draw stickers right away, before data loads

  // Live data from server.py if it's running; otherwise the seed in data.js (static hosting / demo mode)
  let API = false, SITE = null;
  try {
    const r = await fetch("/api/site", { cache: "no-store" });
    if (r.ok) { SITE = await r.json(); API = true; }
  } catch {}
  if (!SITE) { const seed = window.PG_SEED || {}; SITE = { config: seed.config || {}, events: seed.events || [], sponsors: [] }; }
  const CFG = SITE.config;
  const EVENTS = SITE.events.slice().sort((a, b) => new Date(a.start) - new Date(b.start));
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const money = (n) => "$" + Math.round(n).toLocaleString("en-US");
  const CAT = {
    hackathon: { label: "Hackathon", sticker: "code" },
    volunteer: { label: "Volunteer", sticker: "heart" },
    fundraiser: { label: "Fundraiser", sticker: "ticket" },
    community: { label: "Community", sticker: "bubble" },
  };

  // demo mode only: registrations made in this browser bump the counts
  const store = {
    get() { try { return JSON.parse(localStorage.getItem("pg-regs") || "[]"); } catch { return []; } },
    add(r) { try { const a = store.get(); a.push(r); localStorage.setItem("pg-regs", JSON.stringify(a)); } catch {} },
  };
  const taken = (ev) => ev.registered + (API ? 0 : store.get().filter((r) => r.eventId === ev.id).length);

  const fmt = {
    day: (d) => new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
    time: (d) => new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    range: (ev) => `${fmt.time(ev.start)} – ${fmt.time(ev.end)}`,
  };

  /* ---------- nav ---------- */
  const toggle = $(".nav-toggle"), links = $(".nav-links");
  toggle && toggle.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open);
  });

  /* ---------- highlighters + reveal on scroll ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("on"); io.unobserve(e.target); } });
  }, { threshold: 0.6, rootMargin: "0px 0px -8% 0px" });
  const observeAll = (root = document) => $$(".hl, .reveal", root).forEach((el) => io.observe(el));
  observeAll();

  /* ---------- countdown ---------- */
  const cd = $("[data-countdown]");
  if (cd && CFG.gradNight) {
    const target = new Date(CFG.gradNight).getTime();
    const parts = { d: $("[data-d]", cd), h: $("[data-h]", cd), m: $("[data-m]", cd), s: $("[data-s]", cd) };
    const tick = () => {
      let t = Math.max(0, target - Date.now()) / 1000;
      const d = Math.floor(t / 86400); t -= d * 86400;
      const h = Math.floor(t / 3600); t -= h * 3600;
      const m = Math.floor(t / 60); const s = Math.floor(t - m * 60);
      parts.d.textContent = d; parts.h.textContent = String(h).padStart(2, "0");
      parts.m.textContent = String(m).padStart(2, "0"); parts.s.textContent = String(s).padStart(2, "0");
    };
    tick(); setInterval(tick, 1000);
  }

  /* ---------- draggable stickers ---------- */
  $$(".sticker-wrap").forEach((w, i) => {
    w.style.setProperty("--boil-delay", `${(i * -0.37).toFixed(2)}s`);
    let sx, sy, ox = 0, oy = 0, moved = false;
    w.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      w.setPointerCapture(e.pointerId); w.classList.add("dragging");
      sx = e.clientX - ox; sy = e.clientY - oy; moved = false;
    });
    w.addEventListener("pointermove", (e) => {
      if (!w.classList.contains("dragging")) return;
      ox = e.clientX - sx; oy = e.clientY - sy; moved = true;
      w.style.translate = `${ox}px ${oy}px`;
    });
    const up = () => { w.classList.remove("dragging"); if (moved) $(".hero-note")?.remove(); };
    w.addEventListener("pointerup", up); w.addEventListener("pointercancel", up);
  });

  /* ---------- goal ruler ---------- */
  const ruler = $("[data-ruler]");
  if (ruler) {
    const pct = Math.min(100, (CFG.raised / CFG.goal) * 100);
    $$("[data-raised]").forEach((el) => (el.textContent = money(CFG.raised)));
    $$("[data-goal]").forEach((el) => (el.textContent = money(CFG.goal)));
    $$("[data-togo]").forEach((el) => (el.textContent = money(Math.max(0, CFG.goal - CFG.raised))));
    const ro = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      $(".ruler-fill", ruler).style.width = pct + "%";
      const pin = $(".ruler-pin", ruler); pin.style.left = Math.max(12, Math.min(88, pct)) + "%";
      ro.disconnect();
    }, { threshold: 0.5 });
    ro.observe(ruler);
  }
  $$("[data-event-count]").forEach((el) => (el.textContent = EVENTS.length));

  /* ---------- sponsors grid (confirmed sponsors the admin chose to show) ---------- */
  const grid = $("[data-sponsor-grid]");
  if (grid) {
    const sp = SITE.sponsors || [];
    const open = Math.max(sp.length < 6 ? 6 - sp.length : 0, 1);
    grid.innerHTML = sp.map((x) => {
      const inner = `<b>${esc(x.name)}</b>${x.tier ? `<span>${esc(x.tier.split(" ")[0])}</span>` : ""}`;
      const safe = /^https?:\/\//i.test(x.website || "");
      return safe ? `<a class="sponsor-tile" href="${esc(x.website)}" target="_blank" rel="noopener">${inner}</a>` : `<div class="sponsor-tile">${inner}</div>`;
    }).join("") + Array.from({ length: open }, () => `<a class="sponsor-slot" href="sponsor.html">your logo<br>here</a>`).join("");
  }

  /* ---------- home: event carousel ---------- */
  const track = $("[data-event-track]");
  if (track) {
    const upcoming = EVENTS.filter((e) => new Date(e.end) > new Date()).slice(0, 6);
    track.innerHTML = upcoming.map((ev) => {
      const left = ev.capacity - taken(ev);
      const capSrc = ev.theme === "dark" || ev.theme === "maroon" ? "assets/mark-white.png" : "assets/mark-maroon.png";
      return `<article class="ecard theme-${ev.theme} hover-boil">
        <img class="cap" src="${capSrc}" alt="">
        <div class="tag">${esc(ev.tag)} · ${CAT[ev.category].label}</div>
        <h3>${esc(ev.title)}</h3>
        <p>${esc(ev.blurb)}</p>
        <div class="meta"><span>${fmt.day(ev.start)} · ${fmt.time(ev.start)}</span><span>${esc(ev.location)}</span></div>
        <div class="art"><div data-sticker="${CAT[ev.category].sticker}" data-still></div></div>
        <div class="foot">
          <span class="spots">${left > 0 ? `${left} spots left · ${esc(ev.price)}` : "Waitlist only"}</span>
          <button class="btn btn-sm ${ev.theme === "dark" || ev.theme === "maroon" ? "btn-white" : ""}" data-register="${ev.id}">Register <span class="arrow">→</span></button>
        </div>
      </article>`;
    }).join("") + `<article class="ecard theme-light" style="justify-content:center;align-items:flex-start">
        <div class="tag">// ${EVENTS.length} on the calendar</div>
        <h3>See every event.</h3>
        <p class="muted">Hackathons, volunteer shifts, fundraisers, and info nights, all in one place.</p>
        <div class="art"><div data-sticker="plane" data-still class="hover-boil"></div></div>
        <a class="btn btn-maroon" href="events.html">Browse all events <span class="arrow">→</span></a>
      </article>`;
    PGStickers.mount(track);

    const prev = $("[data-prev]"), next = $("[data-next]");
    const step = () => (track.querySelector(".ecard")?.offsetWidth || 360) + 20;
    prev.addEventListener("click", () => track.scrollBy({ left: -step(), behavior: "smooth" }));
    next.addEventListener("click", () => track.scrollBy({ left: step(), behavior: "smooth" }));
    const sync = () => {
      prev.disabled = track.scrollLeft < 8;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;
    };
    track.addEventListener("scroll", sync, { passive: true }); sync();
  }

  /* ---------- events page: list + filters ---------- */
  const list = $("[data-event-list]");
  if (list) {
    let cat = new URLSearchParams(location.search).get("type") || "all", q = "";
    const chips = $$("[data-filter]");
    const draw = () => {
      chips.forEach((c) => c.setAttribute("aria-pressed", c.dataset.filter === cat));
      const items = EVENTS.filter((e) => (cat === "all" || e.category === cat) &&
        (!q || (e.title + e.blurb + e.location).toLowerCase().includes(q)));
      if (!items.length) {
        list.innerHTML = `<div class="empty"><span class="hand">nothing here… yet!</span>Try another filter, or check back soon.</div>`;
        return;
      }
      list.innerHTML = items.map((ev) => {
        const d = new Date(ev.start), t = taken(ev), left = ev.capacity - t, pct = Math.min(100, (t / ev.capacity) * 100);
        const past = new Date(ev.end) < new Date();
        return `<article class="erow reveal hover-boil" id="${ev.id}">
          <div class="cal" aria-hidden="true"><div class="m">${d.toLocaleDateString("en-US", { month: "short" })}</div><div class="d">${d.getDate()}</div><div class="w">${d.toLocaleDateString("en-US", { weekday: "short" })}</div></div>
          <div class="info">
            <span class="badge ${ev.category}">${CAT[ev.category].label}</span>
            <h3>${esc(ev.title)}</h3>
            <p>${esc(ev.blurb)}</p>
            <div class="facts">
              <span><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="8" cy="8" r="6.2"/><path d="M8 4.5V8l2.5 1.5"/></svg>${fmt.day(ev.start)} · ${fmt.range(ev)}</span>
              <span><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M8 14s4.8-4.3 4.8-7.6A4.8 4.8 0 0 0 3.2 6.4C3.2 9.7 8 14 8 14z"/><circle cx="8" cy="6.4" r="1.7"/></svg>${esc(ev.location)}</span>
              <span><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2.5 6.5V3.5h3l7.5 7.5-3 3z"/><circle cx="5.2" cy="6.2" r=".9" fill="currentColor"/></svg>${esc(ev.price)}</span>
            </div>
          </div>
          <div class="side">
            <div class="cap-meter"><div class="bar"><i class="${pct > 80 ? "hot" : ""}" style="width:${pct}%"></i></div><small>${left > 0 ? `${left} of ${ev.capacity} spots left` : "Full · join the waitlist"}</small></div>
            <button class="btn" data-register="${ev.id}" ${past ? "disabled" : ""}>${past ? "Event ended" : left > 0 ? (ev.category === "volunteer" ? "Sign up" : "Register") : "Join waitlist"} <span class="arrow">→</span></button>
          </div>
        </article>`;
      }).join("");
      observeAll(list);
    };
    chips.forEach((c) => c.addEventListener("click", () => {
      cat = c.dataset.filter; draw();
      history.replaceState(null, "", cat === "all" ? location.pathname : `?type=${cat}`);
    }));
    const search = $("[data-search]");
    search && search.addEventListener("input", () => { q = search.value.trim().toLowerCase(); draw(); });
    draw();
    if (location.hash) setTimeout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: "center" }), 200);
  }

  /* ---------- registration dialog ---------- */
  const dlg = $("dialog.reg");
  const FIELDS = {
    team: `<div class="field"><label for="f-team">Team name <span class="muted">(optional)</span></label><input id="f-team" name="team" placeholder="The Semicolons"></div>`,
    experience: `<fieldset class="field"><legend>Experience level</legend><div class="pills">${["First timer", "Some", "Seasoned"].map((x, i) => `<label><input type="radio" name="experience" value="${x}" ${i ? "" : "checked"}><span>${x}</span></label>`).join("")}</div></fieldset>`,
    shirt: `<fieldset class="field"><legend>T-shirt size</legend><div class="pills">${["XS", "S", "M", "L", "XL", "XXL"].map((x) => `<label><input type="radio" name="shirt" value="${x}" ${x === "M" ? "checked" : ""}><span>${x}</span></label>`).join("")}</div></fieldset>`,
    guests: `<div class="field"><label for="f-guests">How many people (including you)?</label><select id="f-guests" name="guests">${[1, 2, 3, 4, 5, 6].map((n) => `<option>${n}</option>`).join("")}</select></div>`,
    shift: (ev) => `<fieldset class="field"><legend>Pick your shift</legend><div class="pills">${ev.shifts.map((x, i) => `<label><input type="radio" name="shift" value="${x}" ${i ? "" : "checked"}><span>${x}</span></label>`).join("")}</div></fieldset>`,
  };

  function openReg(id) {
    const ev = EVENTS.find((e) => e.id === id); if (!ev || !dlg) return;
    const extra = ev.extra.map((k) => (typeof FIELDS[k] === "function" ? FIELDS[k](ev) : FIELDS[k] || "")).join("");
    $(".reg-inner", dlg).innerHTML = `
      <div class="reg-head">
        <div data-sticker="${CAT[ev.category].sticker}" data-still></div>
        <div class="eyebrow">${CAT[ev.category].label} · ${esc(ev.price)}</div>
        <h2 id="reg-title">${esc(ev.title)}</h2>
        <div class="facts">${fmt.day(ev.start)} · ${fmt.range(ev)}<br>${esc(ev.location)}</div>
      </div>
      <form novalidate>
        <div class="row2">
          <div class="field"><label for="f-first">First name</label><input id="f-first" name="first" required autocomplete="given-name"></div>
          <div class="field"><label for="f-last">Last name</label><input id="f-last" name="last" required autocomplete="family-name"></div>
        </div>
        <div class="field"><label for="f-email">Email</label><input id="f-email" name="email" type="email" required autocomplete="email" placeholder="you@example.com"></div>
        <div class="row2">
          <div class="field"><label for="f-role">I'm a…</label><select id="f-role" name="role">
            <option>HHS student</option><option>Parent / guardian</option><option>Teacher / staff</option><option>Alum</option><option>Community member</option></select></div>
          <div class="field" data-grade><label for="f-grade">Grade</label><select id="f-grade" name="grade"><option>12 (Senior)</option><option>11</option><option>10</option><option>9</option></select></div>
        </div>
        ${extra}
        <label class="check"><input type="checkbox" name="updates" checked> Send me updates about Project Graduation events.</label>
        <button class="btn btn-maroon" type="submit" style="justify-content:center">Save my spot <span class="arrow">→</span></button>
        <p class="form-note">${API ? "we only use your email for this event" : "demo mode · saved in this browser only"}</p>
      </form>`;
    PGStickers.mount(dlg);
    const role = $("#f-role", dlg), grade = $("[data-grade]", dlg);
    role.addEventListener("change", () => (grade.style.visibility = role.value === "HHS student" ? "visible" : "hidden"));
    $("form", dlg).addEventListener("submit", (e) => submit(e, ev));
    dlg.showModal();
    setTimeout(() => $("#f-first", dlg).focus(), 50);
  }

  async function submit(e, ev) {
    e.preventDefault();
    const form = e.target;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const data = Object.fromEntries(new FormData(form));
    if (data.role !== "HHS student") delete data.grade;
    let code = "PG-" + Math.random().toString(36).slice(2, 6).toUpperCase(), waitlist = taken(ev) >= ev.capacity;
    const btn = form.querySelector("[type=submit]"); btn.disabled = true; btn.textContent = "Saving…";
    try {
      if (API) {
        const r = await fetch("/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, updates: !!data.updates, eventId: ev.id }) });
        const out = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(out.error || "Couldn't save that. Try again.");
        code = out.code; waitlist = out.waitlist;
        ev.registered += 1;
      } else {
        store.add({ ...data, eventId: ev.id, event: ev.title, code, at: new Date().toISOString() });
      }
    } catch (err) {
      btn.disabled = false; btn.innerHTML = 'Try again <span class="arrow">→</span>';
      toast(err.message && !/fetch/i.test(err.message) ? err.message : "Couldn't save that. Check your connection and try again.");
      return;
    }
    $(".reg-inner", dlg).innerHTML = `
      <div class="ticket-wrap">
        <div data-sticker="burst" data-text="YES!" data-size="44"></div>
        <h2>You're <span class="hl">${waitlist ? "on the waitlist" : "on the list"}</span>, ${esc(data.first)}.</h2>
        <p class="muted">${waitlist ? "We'll email you if a spot opens up." : "Screenshot this ticket, then you're all set."}</p>
        <div class="ticket">
          <div><div class="t-title">${esc(ev.title)}</div><div class="t-meta">${fmt.day(ev.start)} · ${fmt.time(ev.start)}<br>${esc(ev.location)}</div></div>
          <div class="code"><span>Ticket</span><b>${code}</b></div>
        </div>
        <button class="btn" data-close>Done</button>
      </div>`;
    PGStickers.mount(dlg);
    observeAll(dlg);
    setTimeout(() => $(".hl", dlg)?.classList.add("on"), 300);
  }

  if (dlg) {
    document.addEventListener("click", (e) => {
      const b = e.target.closest("[data-register]"); if (b) openReg(b.dataset.register);
      if (e.target.closest("[data-close]")) dlg.close();
    });
    dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
    // redraw the list so spot counts include the new sign-up
    dlg.addEventListener("close", () => { if (list) $$("[data-filter]").find((c) => c.getAttribute("aria-pressed") === "true")?.click(); });
  }

  /* ---------- donate tiers ---------- */
  $$(".tier").forEach((t) => t.addEventListener("click", () => {
    $$(".tier").forEach((x) => x.setAttribute("aria-pressed", x === t));
    const a = $("[data-donate]"); if (a) a.innerHTML = `Give ${t.dataset.amount === "custom" ? "any amount" : "$" + t.dataset.amount} <span class="arrow">→</span>`;
  }));
  $$("[data-donate]").forEach((a) => a.setAttribute("href", CFG.donateUrl || "#"));

  /* ---------- toast ---------- */
  function toast(msg) {
    let t = $(".toast"); if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.append(t); }
    t.textContent = msg; t.classList.add("show"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 3200);
  }

  $$("[data-year]").forEach((el) => (el.textContent = CFG.classYear));
})();

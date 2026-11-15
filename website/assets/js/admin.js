/* Project Graduation: admin console */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const money = (n) => "$" + Math.round(+n || 0).toLocaleString("en-US");
  const day = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const dayTime = (d) => new Date(d).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const ago = (d) => {
    const m = Math.round((Date.now() - new Date(d)) / 60000);
    return m < 1 ? "just now" : m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
  };
  const CATS = { hackathon: "Hackathon", volunteer: "Volunteer", fundraiser: "Fundraiser", community: "Community" };
  const STATUS = { new: "New", contacted: "Contacted", confirmed: "Confirmed", declined: "Declined" };
  const VSTATUS = { pending: "Pending", approved: "Approved", inactive: "Inactive" };
  const ISTATUS = { new: "New", reviewing: "Reviewing", approved: "Approved", passed: "Passed" };
  const EXTRAS = { team: "Team name", experience: "Experience level", shirt: "T-shirt size", shift: "Shift picker", guests: "Group size" };

  let TOKEN = null;
  try { TOKEN = sessionStorage.getItem("pg-admin"); } catch {}
  let DB = null;
  const ui = { sponsorFilter: "all", regEvent: "all", regQuery: "", volFilter: "all", ideaFilter: "all", attEvent: "", composeAud: [] };

  /* ---------------- api ---------------- */
  async function api(method, path, body) {
    const r = await fetch(path, {
      method, headers: { "Content-Type": "application/json", ...(TOKEN ? { Authorization: "Bearer " + TOKEN } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const out = await r.json().catch(() => ({}));
    if (r.status === 401 && path !== "/api/admin/login") { signOut(true); throw new Error("Your session expired. Sign in again."); }
    // static hosting (e.g. GitHub Pages) has no API: say so plainly
    if (!r.ok && !out.error && [404, 405, 501].includes(r.status)) throw new Error("NO_SERVER");
    if (!r.ok) throw new Error(out.error || `Request failed (${r.status})`);
    return out;
  }
  const refresh = async () => { DB = await api("GET", "/api/admin/data"); };

  /* ---------------- auth ---------------- */
  function showLogin(msg) {
    $("[data-console]").hidden = true; $("[data-login]").hidden = false;
    $("[data-login-error]").textContent = msg || "";
    window.PGStickers && PGStickers.mount($("[data-login]"));
    setTimeout(() => $("[data-login-form] input").focus(), 50);
  }
  function signOut(expired) {
    if (TOKEN && !expired) api("POST", "/api/admin/logout").catch(() => {});
    TOKEN = null; try { sessionStorage.removeItem("pg-admin"); } catch {}
    showLogin(expired ? "Your session expired. Sign in again." : "");
  }
  $("[data-login-form]").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button"), err = $("[data-login-error]");
    btn.disabled = true; err.textContent = "";
    try {
      const { token } = await api("POST", "/api/admin/login", { password: e.target.password.value });
      TOKEN = token; try { sessionStorage.setItem("pg-admin", token); } catch {}
      e.target.reset(); await start();
    } catch (x) {
      err.textContent = /fetch|NetworkError|NO_SERVER/i.test(x.message)
        ? "The admin console isn't available on this copy of the site. It needs server.py running (see README)."
        : x.message;
    } finally { btn.disabled = false; }
  });
  $("[data-logout]").addEventListener("click", () => signOut());

  async function start() {
    try { await refresh(); } catch (e) { return showLogin(TOKEN ? e.message : ""); }
    $("[data-login]").hidden = true; $("[data-console]").hidden = false;
    route();
  }

  /* ---------------- routing ---------------- */
  const VIEWS = { overview, fundraising, events, registrations, sponsors, volunteers, ideas, attendance, messages };
  function route() {
    const tab = (location.hash.slice(1).split("?")[0]) || "overview";
    const view = VIEWS[tab] || overview;
    $$("[data-tab]").forEach((a) => a.setAttribute("aria-current", a.dataset.tab === tab ? "page" : "false"));
    const setPill = (sel, n) => { const p = $(sel); if (p) { p.hidden = !n; p.textContent = n; } };
    setPill("[data-new-count]", DB.sponsors.filter((s) => s.status === "new").length);
    setPill("[data-vol-count]", DB.volunteers.filter((v) => v.status === "pending").length);
    setPill("[data-idea-count]", DB.ideas.filter((x) => x.status === "new").length);
    // fresh pane element each render so per-view listeners never stack up
    const old = $("[data-pane]"), pane = old.cloneNode(false);
    pane.innerHTML = view();
    old.replaceWith(pane);
    window.PGStickers && PGStickers.mount(pane);
    bind[tab]?.();
  }
  // re-fetch on every tab switch so new sign-ups and sponsor applications show up
  window.addEventListener("hashchange", async () => {
    if (!DB) return;
    try { await refresh(); } catch (e) { return; }
    route();
  });

  const head = (eyebrow, title, actions = "") => `<header class="pane-head"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1></div><div class="pane-actions">${actions}</div></header>`;
  const regCount = (id) => DB.registrations.filter((r) => r.eventId === id).length + DB.signups.filter((x) => x.eventId === id).length;
  const taken = (e) => (e.registered || 0) + regCount(e.id);

  /* ---------------- overview ---------------- */
  function overview() {
    const c = DB.config, pct = Math.min(100, (c.raised / c.goal) * 100);
    const upcoming = DB.events.filter((e) => new Date(e.end) > new Date()).sort((a, b) => new Date(a.start) - new Date(b.start));
    const newS = DB.sponsors.filter((s) => s.status === "new");
    const pendV = DB.volunteers.filter((v) => v.status === "pending"), newI = DB.ideas.filter((x) => x.status === "new");
    const vname = (id) => { const v = DB.volunteers.find((x) => x.id === id); return v ? `${esc(v.first)} ${esc(v.last)}` : "A volunteer"; };
    const activity = [
      ...DB.volunteers.map((v) => ({ at: v.at, html: `<b>${esc(v.first)} ${esc(v.last)}</b> registered to volunteer` })),
      ...DB.signups.map((x) => ({ at: x.at, html: `<b>${vname(x.volunteerId)}</b> took a shift: ${esc(DB.events.find((e) => e.id === x.eventId)?.title || "")} (${esc(x.shift)})` })),
      ...DB.ideas.map((x) => ({ at: x.at, html: `<b>${esc(x.first)} ${esc(x.last)}</b> pitched “${esc(x.eventName || "an event")}”` })),
      ...DB.registrations.map((r) => ({ at: r.at, html: `<b>${esc(r.first)} ${esc(r.last)}</b> registered for ${esc(DB.events.find((e) => e.id === r.eventId)?.title || "an event")}${r.waitlist ? " (waitlist)" : ""}` })),
      ...DB.sponsors.map((s) => ({ at: s.at, html: `<b>${esc(s.org || s.first)}</b> applied to sponsor${s.tier ? ` · ${esc(s.tier)}` : ""}` })),
    ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 8);
    return head("overview", `Hey there. <span class="hl on">Here's the scoop.</span>`) + `
      <div class="kpis">
        <a class="kpi" href="#fundraising"><span>Raised</span><b>${money(c.raised)}</b><small>${pct.toFixed(0)}% of ${money(c.goal)}</small><div class="mini-bar"><i style="width:${pct}%"></i></div></a>
        <a class="kpi" href="#events"><span>Upcoming events</span><b>${upcoming.length}</b><small>next: ${upcoming[0] ? esc(upcoming[0].title) : "none scheduled"}</small></a>
        <a class="kpi" href="#registrations"><span>Online sign-ups</span><b>${DB.registrations.length}</b><small>across ${DB.events.length} events</small></a>
        <a class="kpi ${newS.length ? "hot" : ""}" href="#sponsors"><span>New sponsor apps</span><b>${newS.length}</b><small>${DB.sponsors.length} total · ${DB.sponsors.filter((s) => s.status === "confirmed").length} confirmed</small></a>
        <a class="kpi ${pendV.length ? "hot" : ""}" href="#volunteers"><span>Volunteers to approve</span><b>${pendV.length}</b><small>${DB.volunteers.filter((v) => v.status === "approved").length} approved · ${DB.signups.length} shifts booked</small></a>
        <a class="kpi ${newI.length ? "hot" : ""}" href="#ideas"><span>New event ideas</span><b>${newI.length}</b><small>${DB.ideas.length} pitched in total</small></a>
      </div>
      <div class="two-col">
        <section class="card"><h2>Recent activity</h2>
          ${activity.length ? `<ul class="activity">${activity.map((a) => `<li><span>${a.html}</span><time>${ago(a.at)}</time></li>`).join("")}</ul>` : `<p class="empty-note">Nothing yet. Sign-ups, volunteers, sponsors, and pitches show up here.</p>`}
        </section>
        <section class="card"><h2>Coming up</h2>
          ${upcoming.slice(0, 5).map((e) => `<div class="up-row"><div class="mini-cal"><b>${new Date(e.start).getDate()}</b><span>${new Date(e.start).toLocaleDateString("en-US", { month: "short" })}</span></div><div><b>${esc(e.title)}</b><small>${taken(e)} / ${e.capacity} signed up</small></div></div>`).join("") || `<p class="empty-note">No upcoming events.</p>`}
          <a class="link-arrow" href="#events">Manage events →</a>
        </section>
      </div>`;
  }

  /* ---------------- fundraising ---------------- */
  function fundraising() {
    const c = DB.config, pct = Math.min(100, (c.raised / c.goal) * 100);
    return head("fundraising", "Fundraising goal") + `
      <section class="card goal-card">
        <div class="goal-top"><div><span class="eyebrow">raised so far</span><b class="goal-big" data-live-raised>${money(c.raised)}</b><small class="muted">of <span data-live-goal>${money(c.goal)}</span> · <span data-live-pct>${pct.toFixed(1)}</span>%</small></div>
          <form class="quick-add" data-quick><label class="sr-only" for="qa">Add a donation</label><span>$</span><input id="qa" name="amt" type="number" min="1" step="1" placeholder="Log a donation" required><button class="btn btn-sm btn-gold" type="submit">+ Add</button></form></div>
        <div class="ruler admin-ruler"><div class="ruler-fill" data-live-fill style="width:${pct}%"></div></div>
        <div class="ruler-labels"><span>$0</span><span>25%</span><span>50%</span><span>75%</span><span data-live-goal>${money(c.goal)}</span></div>
      </section>
      <form class="card form-grid" data-config>
        <h2 class="span2">Site settings</h2>
        <label class="field"><span>Total raised ($)</span><input name="raised" type="number" min="0" step="1" value="${c.raised}" required></label>
        <label class="field"><span>Goal ($)</span><input name="goal" type="number" min="1" step="1" value="${c.goal}" required></label>
        <label class="field"><span>Grad night starts</span><input name="gradNight" type="datetime-local" value="${esc(c.gradNight).slice(0, 16)}" required></label>
        <label class="field"><span>Class year</span><input name="classYear" type="number" min="2000" max="2100" value="${c.classYear}" required></label>
        <label class="field"><span>Donate link</span><input name="donateUrl" value="${esc(c.donateUrl)}" placeholder="https://givebutter.com/…"></label>
        <label class="field"><span>Contact email</span><input name="contactEmail" type="email" value="${esc(c.contactEmail)}"></label>
        <label class="field span2"><span>Instagram</span><input name="instagram" value="${esc(c.instagram)}"></label>
        <div class="span2 form-actions"><button class="btn btn-maroon" type="submit">Save changes</button><span class="muted small">Changes go live on the site immediately.</span></div>
      </form>`;
  }
  function liveGoal(raised, goal) {
    const pct = Math.min(100, (raised / goal) * 100) || 0;
    $("[data-live-raised]").textContent = money(raised);
    $$("[data-live-goal]").forEach((el) => (el.textContent = money(goal)));
    $("[data-live-pct]").textContent = pct.toFixed(1);
    $("[data-live-fill]").style.width = pct + "%";
  }

  /* ---------------- events ---------------- */
  function events() {
    const list = DB.events.slice().sort((a, b) => new Date(a.start) - new Date(b.start));
    return head("events", "Events", `<button class="btn btn-maroon" data-new-event>+ New event</button>`) + `
      <section class="card flush">
        <table class="table">
          <thead><tr><th>Date</th><th>Event</th><th>Type</th><th>Signed up</th><th></th></tr></thead>
          <tbody>${list.map((e) => {
            const t = taken(e), pct = Math.min(100, (t / e.capacity) * 100), past = new Date(e.end) < new Date();
            return `<tr class="${past ? "past" : ""}">
              <td class="mono nowrap">${day(e.start)}</td>
              <td><b>${esc(e.title)}</b><small>${esc(e.location)} · ${esc(e.price)}</small></td>
              <td><span class="badge ${e.category}">${CATS[e.category]}</span>${past ? ' <span class="badge">Ended</span>' : ""}</td>
              <td class="nowrap"><div class="cap-mini"><i style="width:${pct}%"></i></div><small>${t} / ${e.capacity}${regCount(e.id) ? ` · <a href="#registrations" data-see-regs="${e.id}">${regCount(e.id)} online</a>` : ""}</small></td>
              <td class="row-actions"><button class="btn btn-sm" data-edit="${e.id}">Edit</button><button class="icon-btn" data-del-event="${e.id}" aria-label="Delete ${esc(e.title)}" title="Delete"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.7 8.5h5.6l.7-8.5"/></svg></button></td>
            </tr>`;
          }).join("") || `<tr><td colspan="5" class="empty-note">No events yet. Add your first one.</td></tr>`}</tbody>
        </table>
      </section>`;
  }

  function eventForm(e, prefill) {
    const isNew = !e;
    e = e || { title: "", category: "fundraiser", theme: "light", tag: "New", start: "", end: "", location: "", price: "Free", capacity: 50, registered: 0, blurb: "", extra: [], shifts: [], ...(prefill || {}) };
    const d = $("[data-drawer]");
    d.innerHTML = `<form class="drawer-body" data-event-form>
      <header><p class="eyebrow">${isNew ? "new event" : "edit event"}</p><h2 id="drawer-title">${isNew ? "Add an event" : esc(e.title)}</h2>
        <button type="button" class="icon-btn" data-close-drawer aria-label="Close"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 3l10 10M13 3 3 13"/></svg></button></header>
      <label class="field"><span>Title</span><input name="title" required maxlength="120" value="${esc(e.title)}"></label>
      <div class="row2">
        <label class="field"><span>Type</span><select name="category">${Object.entries(CATS).map(([k, v]) => `<option value="${k}" ${e.category === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        <label class="field"><span>Card color (home page)</span><select name="theme">${["light", "dark", "gold", "maroon"].map((t) => `<option ${e.theme === t ? "selected" : ""}>${t}</option>`).join("")}</select></label>
      </div>
      <div class="row2">
        <label class="field"><span>Starts</span><input name="start" type="datetime-local" required value="${esc(e.start).slice(0, 16)}"></label>
        <label class="field"><span>Ends</span><input name="end" type="datetime-local" required value="${esc(e.end).slice(0, 16)}"></label>
      </div>
      <label class="field"><span>Location</span><input name="location" maxlength="120" value="${esc(e.location)}"></label>
      <div class="row3">
        <label class="field"><span>Price</span><input name="price" maxlength="40" value="${esc(e.price)}"></label>
        <label class="field"><span>Capacity</span><input name="capacity" type="number" min="1" required value="${e.capacity}"></label>
        <label class="field"><span>Signed up offline</span><input name="registered" type="number" min="0" value="${e.registered || 0}" title="People who registered outside the website (paper, Venmo, etc.)"></label>
      </div>
      <label class="field"><span>Payment link <em class="muted">(optional: Zeffy, Givebutter, Stripe…)</em></span><input name="payUrl" type="url" value="${esc(e.payUrl || "")}" placeholder="https://"></label>
      <label class="field"><span>Tag on card</span><input name="tag" maxlength="24" value="${esc(e.tag)}" placeholder="New, Featured, Big night…"></label>
      <label class="field"><span>Description</span><textarea name="blurb" rows="3" maxlength="400">${esc(e.blurb)}</textarea></label>
      <fieldset class="field"><legend>Extra sign-up questions</legend><div class="pills">${Object.entries(EXTRAS).map(([k, v]) => `<label><input type="checkbox" name="extra" value="${k}" ${e.extra.includes(k) ? "checked" : ""}><span>${v}</span></label>`).join("")}</div></fieldset>
      <label class="field" data-shifts ${e.extra.includes("shift") || e.category === "volunteer" ? "" : "hidden"}><span>Shifts (one per line)</span><textarea name="shifts" rows="3" placeholder="10:00 – 12:00">${esc(e.shifts.join("\n"))}</textarea></label>
      <p class="login-error" role="alert" data-form-error></p>
      <footer><button class="btn btn-maroon" type="submit">${isNew ? "Create event" : "Save changes"}</button><button type="button" class="btn btn-ghost" data-close-drawer>Cancel</button></footer>
    </form>`;
    d.showModal();
    const f = $("[data-event-form]", d);
    const syncShifts = () => { $("[data-shifts]", d).hidden = !(f.category.value === "volunteer" || f.querySelector('[value="shift"]').checked); };
    f.addEventListener("change", syncShifts);
    f.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const fd = new FormData(f);
      const body = Object.fromEntries(fd);
      body.extra = fd.getAll("extra");
      body.shifts = String(body.shifts || "").split("\n").map((x) => x.trim()).filter(Boolean);
      body.start += ":00"; body.end += ":00";
      try {
        await api(isNew ? "POST" : "PUT", isNew ? "/api/admin/events" : `/api/admin/events/${e.id}`, body);
        await refresh(); d.close(); route(); toast(isNew ? "Event created" : "Event saved");
      } catch (x) { $("[data-form-error]", d).textContent = x.message; }
    });
  }

  /* ---------------- registrations ---------------- */
  function registrations() {
    const q = ui.regQuery.toLowerCase();
    const rows = DB.registrations.filter((r) => (ui.regEvent === "all" || r.eventId === ui.regEvent) &&
      (!q || `${r.first} ${r.last} ${r.email}`.toLowerCase().includes(q))).sort((a, b) => new Date(b.at) - new Date(a.at));
    const ev = (id) => DB.events.find((e) => e.id === id);
    return head("registrations", "Registrations", `<button class="btn btn-ghost" data-export-regs ${rows.length ? "" : "disabled"}>Export CSV</button>`) + `
      <div class="toolbar">
        <select class="select" data-reg-event aria-label="Filter by event"><option value="all">All events (${DB.registrations.length})</option>${DB.events.map((e) => `<option value="${e.id}" ${ui.regEvent === e.id ? "selected" : ""}>${esc(e.title)} (${regCount(e.id)})</option>`).join("")}</select>
        <label class="search"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="7" cy="7" r="5"/><path d="m11 11 3.5 3.5"/></svg><span class="sr-only">Search</span><input type="search" placeholder="Search name or email" value="${esc(ui.regQuery)}" data-reg-search></label>
      </div>
      <section class="card flush">
        <table class="table">
          <thead><tr><th>Ticket</th><th>Name</th><th>Event</th><th>Details</th><th>When</th><th></th></tr></thead>
          <tbody>${rows.map((r) => `<tr>
            <td class="mono nowrap">${esc(r.code)}${r.waitlist ? '<small class="warn">waitlist</small>' : ""}</td>
            <td><b>${esc(r.first)} ${esc(r.last)}</b><small><a href="mailto:${esc(r.email)}">${esc(r.email)}</a></small></td>
            <td>${esc(ev(r.eventId)?.title || "—")}</td>
            <td><small>${[r.role, r.grade && "Grade " + r.grade, r.team && "Team: " + r.team, r.shift && "Shift: " + r.shift, r.shirt && "Shirt " + r.shirt, r.guests > 1 && r.guests + " people"].filter(Boolean).map(esc).join(" · ")}</small></td>
            <td class="nowrap"><small>${dayTime(r.at)}</small></td>
            <td class="row-actions"><button class="icon-btn" data-del-reg="${esc(r.code)}" aria-label="Remove registration" title="Remove"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.7 8.5h5.6l.7-8.5"/></svg></button></td>
          </tr>`).join("") || `<tr><td colspan="6" class="empty-note">No registrations ${ui.regEvent !== "all" || q ? "match" : "yet"}.</td></tr>`}</tbody>
        </table>
      </section>`;
  }

  /* ---------------- sponsors ---------------- */
  function sponsors() {
    const all = DB.sponsors.slice().sort((a, b) => new Date(b.at) - new Date(a.at));
    const rows = all.filter((s) => ui.sponsorFilter === "all" || s.status === ui.sponsorFilter);
    const count = (st) => all.filter((s) => s.status === st).length;
    return head("sponsors", "Sponsors", `<a class="btn btn-ghost" href="sponsor.html" target="_blank" rel="noopener">Open sign-up form ↗</a><button class="btn btn-ghost" data-export-sp ${all.length ? "" : "disabled"}>Export CSV</button>`) + `
      <div class="toolbar"><div class="filters" role="group" aria-label="Filter by status">
        <button class="chip" data-sf="all" aria-pressed="${ui.sponsorFilter === "all"}">All · ${all.length}</button>
        ${Object.entries(STATUS).map(([k, v]) => `<button class="chip" data-sf="${k}" aria-pressed="${ui.sponsorFilter === k}"><span class="dot st-${k}"></span>${v} · ${count(k)}</button>`).join("")}
      </div></div>
      <div class="sp-list">${rows.map((s) => `
        <article class="card sp-card" data-sp="${s.id}">
          <div class="sp-main">
            <div><h3>${esc(s.org || "—")}</h3><p class="muted">${esc(s.first)} ${esc(s.last)} · <a href="mailto:${esc(s.email)}">${esc(s.email)}</a>${s.phone ? ` · ${esc(s.phone)}` : ""}</p></div>
            <div class="sp-tier"><b>${esc(s.tier || "—")}</b><small>${ago(s.at)}</small></div>
          </div>
          <dl class="sp-facts">
            <div><dt>Contribution</dt><dd>${esc((s.contribute || []).join(", ") || "—")}</dd></div>
            ${s.inkind ? `<div><dt>Donating</dt><dd>${esc(s.inkind)}</dd></div>` : ""}
            <div><dt>List as</dt><dd>${esc(s.displayName || s.org || "—")}${s.website ? ` · <a href="${/^https?:\/\//i.test(s.website) ? esc(s.website) : "#"}" target="_blank" rel="noopener nofollow">${esc(s.website)}</a>` : ""}</dd></div>
            ${s.heard ? `<div><dt>Heard via</dt><dd>${esc(s.heard)}</dd></div>` : ""}
            ${s.message ? `<div><dt>Message</dt><dd>${esc(s.message)}</dd></div>` : ""}
          </dl>
          <div class="sp-controls">
            <label class="field inline"><span>Status</span><select data-sp-status>${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${s.status === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
            <label class="switch ${s.status === "confirmed" ? "" : "off"}" title="${s.status === "confirmed" ? "" : "Confirm the sponsor first"}"><input type="checkbox" data-sp-show ${s.showOnSite ? "checked" : ""} ${s.status === "confirmed" ? "" : "disabled"}><i></i>Show on website</label>
            <label class="field grow"><span>Notes</span><input data-sp-notes value="${esc(s.notes)}" placeholder="Called 11/14, sending invoice…"></label>
            <button class="icon-btn" data-sp-del aria-label="Delete application" title="Delete"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.7 8.5h5.6l.7-8.5"/></svg></button>
          </div>
        </article>`).join("") || `<section class="card empty-card"><div data-sticker="badge" data-still></div><p>${all.length ? "No sponsors with this status." : "No sponsor applications yet. Share the sign-up form to get the first one."}</p></section>`}</div>`;
  }


  /* ---------------- volunteers ---------------- */
  function volunteers() {
    const all = DB.volunteers.slice().sort((a, b) => (a.status === "pending" ? -1 : 0) - (b.status === "pending" ? -1 : 0) || new Date(b.at) - new Date(a.at));
    const rows = all.filter((v) => ui.volFilter === "all" || v.status === ui.volFilter);
    const count = (st) => all.filter((v) => v.status === st).length;
    const shiftsOf = (vid) => DB.signups.filter((x) => x.volunteerId === vid).map((x) => ({ ...x, ev: DB.events.find((e) => e.id === x.eventId) })).filter((x) => x.ev).sort((a, b) => new Date(a.ev.start) - new Date(b.ev.start));
    return head("volunteers", "Volunteers", `<a class="btn btn-ghost" href="volunteer.html" target="_blank" rel="noopener">Open sign-up form ↗</a><button class="btn btn-ghost" data-export-vol ${all.length ? "" : "disabled"}>Export CSV</button>`) + `
      <div class="toolbar"><div class="filters" role="group" aria-label="Filter by status">
        <button class="chip" data-vf="all" aria-pressed="${ui.volFilter === "all"}">All · ${all.length}</button>
        ${Object.entries(VSTATUS).map(([k, v]) => `<button class="chip" data-vf="${k}" aria-pressed="${ui.volFilter === k}"><span class="dot vst-${k}"></span>${v} · ${count(k)}</button>`).join("")}
      </div></div>
      <div class="sp-list">${rows.map((v) => {
        const sh = shiftsOf(v.id);
        return `<article class="card sp-card" data-vol="${v.id}">
          <div class="sp-main">
            <div><h3>${esc(v.first)} ${esc(v.last)} ${v.status === "pending" ? '<span class="badge fundraiser">needs approval</span>' : ""}</h3>
              <p class="muted"><a href="mailto:${esc(v.email)}">${esc(v.email)}</a>${v.phone ? ` · ${esc(v.phone)}` : ""} · ${esc(v.role || "—")}${v.grade ? `, grade ${esc(v.grade)}` : ""}</p></div>
            <div class="sp-tier"><b>${v.totalHours ?? v.hours ?? 0} hrs</b><small>joined ${ago(v.at)}</small></div>
          </div>
          <dl class="sp-facts">
            <div><dt>Likes</dt><dd>${esc((v.interests || []).join(", ") || "—")}</dd></div>
            <div><dt>Free</dt><dd>${esc((v.availability || []).join(", ") || "—")}</dd></div>
            ${v.guardianEmail ? `<div><dt>Guardian</dt><dd><a href="mailto:${esc(v.guardianEmail)}">${esc(v.guardianEmail)}</a></dd></div>` : ""}
            <div><dt>Emergency contact</dt><dd>${esc([v.emergencyName, v.emergencyPhone].filter(Boolean).join(" · ") || "—")}</dd></div>
            <div><dt>Shirt · hours form</dt><dd>${esc(v.shirt || "—")} · ${esc(v.serviceHours || "—")}</dd></div>
            ${v.message ? `<div><dt>Notes from them</dt><dd>${esc(v.message)}</dd></div>` : ""}
            <div><dt>Shifts</dt><dd>${sh.length ? sh.map((x) => `<span class="shift-tag ${x.status || "booked"}">${x.status === "attended" ? "✓ " : x.status === "no-show" ? "✗ " : ""}${esc(x.ev.title)} · ${esc(x.shift)} <button class="x" data-del-signup="${x.id}" aria-label="Remove from shift" title="Remove">×</button></span>`).join("") : "none yet"}</dd></div>
          </dl>
          <div class="sp-controls">
            <label class="field inline"><span>Status</span><select data-vol-status>${Object.entries(VSTATUS).map(([k, l]) => `<option value="${k}" ${v.status === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>
            <label class="field inline hours" title="Hours from attended shifts are added automatically. Use this for anything extra."><span>Extra hours</span><input data-vol-hours type="number" min="0" step="0.25" value="${v.hours || 0}"></label>
            <label class="field grow"><span>Notes</span><input data-vol-notes value="${esc(v.notes)}" placeholder="Great with check-in…"></label>
            <button class="btn btn-sm btn-ghost" data-vol-reset title="Give them a temporary password">Reset password</button>
            <button class="icon-btn" data-vol-del aria-label="Delete volunteer" title="Delete"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.7 8.5h5.6l.7-8.5"/></svg></button>
          </div>
        </article>`;
      }).join("") || `<section class="card empty-card"><div data-sticker="heart" data-still></div><p>${all.length ? "No volunteers with this status." : "No volunteers yet. Share the sign-up form to get the first one."}</p></section>`}</div>`;
  }

  /* ---------------- ideas ---------------- */
  function ideas() {
    const all = DB.ideas.slice().sort((a, b) => new Date(b.at) - new Date(a.at));
    const rows = all.filter((x) => ui.ideaFilter === "all" || x.status === ui.ideaFilter);
    const count = (st) => all.filter((x) => x.status === st).length;
    return head("event ideas", "Event ideas", `<a class="btn btn-ghost" href="pitch.html" target="_blank" rel="noopener">Open pitch form ↗</a><button class="btn btn-ghost" data-export-ideas ${all.length ? "" : "disabled"}>Export CSV</button>`) + `
      <div class="toolbar"><div class="filters" role="group" aria-label="Filter by status">
        <button class="chip" data-if="all" aria-pressed="${ui.ideaFilter === "all"}">All · ${all.length}</button>
        ${Object.entries(ISTATUS).map(([k, v]) => `<button class="chip" data-if="${k}" aria-pressed="${ui.ideaFilter === k}"><span class="dot ist-${k}"></span>${v} · ${count(k)}</button>`).join("")}
      </div></div>
      <div class="sp-list">${rows.map((x) => `
        <article class="card sp-card" data-idea="${x.id}">
          <div class="sp-main">
            <div><h3>${esc(x.eventName || "Untitled idea")}</h3><p class="muted">${esc(x.first)} ${esc(x.last)} · <a href="mailto:${esc(x.email)}">${esc(x.email)}</a> · ${esc(x.who || "—")}${x.club ? ` (${esc(x.club)})` : ""}</p></div>
            <div class="sp-tier"><b>${esc(x.raise || "—")}</b><small>${ago(x.at)}</small></div>
          </div>
          <blockquote class="pitch-quote">${esc(x.pitch)}</blockquote>
          <dl class="sp-facts">
            <div><dt>Type</dt><dd>${esc(x.kind || "—")}</dd></div>
            <div><dt>When</dt><dd>${esc(x.when || "—")}</dd></div>
            <div><dt>Crowd</dt><dd>${esc(x.size || "—")}</dd></div>
            <div><dt>Needs</dt><dd>${esc((x.needs || []).join(", ") || "—")}</dd></div>
            ${x.message ? `<div><dt>Also</dt><dd>${esc(x.message)}</dd></div>` : ""}
          </dl>
          <div class="sp-controls">
            <label class="field inline"><span>Status</span><select data-idea-status>${Object.entries(ISTATUS).map(([k, l]) => `<option value="${k}" ${x.status === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>
            <label class="field grow"><span>Notes</span><input data-idea-notes value="${esc(x.notes)}" placeholder="Talk to the activities office about the gym…"></label>
            <button class="btn btn-sm btn-ghost" data-idea-make title="Start an event from this idea">Turn into event</button>
            <button class="icon-btn" data-idea-del aria-label="Delete idea" title="Delete"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.7 8.5h5.6l.7-8.5"/></svg></button>
          </div>
        </article>`).join("") || `<section class="card empty-card"><div data-sticker="plane" data-still></div><p>${all.length ? "No ideas with this status." : "No pitches yet. The pitch form lives on the Events and Get involved pages."}</p></section>`}</div>`;
  }


  /* ---------------- attendance ---------------- */
  const shiftsOfEvent = (e) => (e.shifts && e.shifts.length ? e.shifts : ["Whole event"]);
  function attendance() {
    const volEvents = DB.events.filter((e) => e.category === "volunteer").sort((a, b) => new Date(a.start) - new Date(b.start));
    if (!volEvents.length) return head("attendance", "Attendance") + `<section class="card empty-card"><div data-sticker="heart" data-still></div><p>No volunteer events yet. Add one in Events with the type “Volunteer”.</p></section>`;
    if (!volEvents.some((e) => e.id === ui.attEvent)) ui.attEvent = (volEvents.find((e) => new Date(e.end) > new Date()) || volEvents[volEvents.length - 1]).id;
    const ev = volEvents.find((e) => e.id === ui.attEvent);
    const vols = Object.fromEntries(DB.volunteers.map((v) => [v.id, v]));
    const ups = DB.signups.filter((x) => x.eventId === ev.id);
    const n = (st) => ups.filter((x) => (x.status || "booked") === st).length;
    const hrs = ups.filter((x) => x.status === "attended").reduce((t, x) => t + (+x.hours || 0), 0);
    return head("attendance", "Attendance", `<button class="btn btn-ghost" data-att-msg ${ups.length ? "" : "disabled"}>Message these volunteers</button><button class="btn btn-ghost" data-att-csv ${ups.length ? "" : "disabled"}>Export CSV</button>`) + `
      <div class="toolbar">
        <select class="select" data-att-event aria-label="Volunteer event">${volEvents.map((e) => `<option value="${e.id}" ${e.id === ev.id ? "selected" : ""}>${esc(e.title)} · ${day(e.start)}</option>`).join("")}</select>
        <div class="att-sum"><span><b>${ups.length}</b> booked</span><span><b>${n("attended")}</b> attended</span><span><b>${n("no-show")}</b> no-show</span><span><b>${hrs}</b> hours logged</span></div>
      </div>
      ${shiftsOfEvent(ev).map((sh) => {
        const rows = ups.filter((x) => x.shift === sh);
        return `<section class="card flush att-shift"><header class="att-head"><h2>${esc(sh)}</h2><span class="muted small">${rows.length} volunteer${rows.length === 1 ? "" : "s"}</span>${rows.length ? `<button class="btn btn-sm btn-ghost" data-att-all="${esc(sh)}">Mark all attended</button>` : ""}</header>
          ${rows.length ? `<table class="table"><thead><tr><th>Volunteer</th><th>Contact</th><th>Attendance</th><th>Hours</th></tr></thead><tbody>${rows.map((x) => {
            const v = vols[x.volunteerId] || {}; const st = x.status || "booked";
            return `<tr data-signup="${x.id}"><td><b>${esc(v.first)} ${esc(v.last)}</b><small>${esc(v.role || "")}${v.grade ? `, grade ${esc(v.grade)}` : ""}</small></td>
              <td><small>${esc(v.phone || "")}<br>Emergency: ${esc([v.emergencyName, v.emergencyPhone].filter(Boolean).join(" · ") || "—")}</small></td>
              <td><div class="seg" role="group" aria-label="Attendance">${[["booked", "Booked"], ["attended", "Attended"], ["no-show", "No-show"]].map(([k, l]) => `<button class="seg-btn ${k}" data-att="${k}" aria-pressed="${st === k}">${l}</button>`).join("")}</div></td>
              <td><input class="hrs" data-att-hours type="number" min="0" max="24" step="0.25" value="${x.hours ?? ""}" ${st === "attended" ? "" : "disabled"} aria-label="Hours"></td></tr>`;
          }).join("")}</tbody></table>` : `<p class="empty-note" style="padding:0 20px 16px">Nobody booked yet.</p>`}</section>`;
      }).join("")}`;
  }

  /* ---------------- messages (meeting notices & announcements) ---------------- */
  function audiences() {
    const list = [
      ["volunteers:approved", "Approved volunteers", DB.volunteers.filter((v) => v.status === "approved").length],
      ["volunteers:pending", "Volunteers waiting for approval", DB.volunteers.filter((v) => v.status === "pending").length],
      ["sponsors:confirmed", "Confirmed sponsors", DB.sponsors.filter((x) => x.status === "confirmed").length],
    ];
    DB.events.slice().sort((a, b) => new Date(a.start) - new Date(b.start)).forEach((e) => {
      if (e.category === "volunteer") list.push([`volunteers:event:${e.id}`, `Volunteers on ${e.title}`, new Set(DB.signups.filter((x) => x.eventId === e.id).map((x) => x.volunteerId)).size]);
      else list.push([`registrants:event:${e.id}`, `People registered for ${e.title}`, DB.registrations.filter((r) => r.eventId === e.id).length]);
    });
    return list;
  }
  function messages() {
    const auds = audiences(), label = Object.fromEntries(auds.map(([k, l]) => [k, l]));
    const mail = DB.mail || {};
    const hist = DB.announcements.slice().sort((a, b) => new Date(b.at) - new Date(a.at));
    const status = (a) => a.email?.skipped ? `<span class="badge">${a.email.skipped === "email turned off" ? "portal only" : "email not sent: " + esc(a.email.skipped)}</span>` : a.email?.failed ? `<span class="badge community">${a.email.sent} sent · ${a.email.failed} failed</span>` : `<span class="badge volunteer">${a.email?.sent ?? 0} emailed</span>`;
    return head("messages", "Messages") + `
      <section class="note-card ${mail.configured ? "approved" : "pending"}"><div data-sticker="${mail.configured ? "plane" : "eyes"}" data-still></div><div>
        <h2>${mail.configured ? "Email is connected" : "Email isn't connected yet"}</h2>
        <p>${mail.configured ? `Messages go out from <b>${esc(mail.from)}</b>. Volunteers also see them in their portal.` : "Messages still show up in the volunteer portal right away. To email them too, connect a free SMTP account (Gmail or Brevo). Steps are in the README under “Email”."}</p></div></section>
      <form class="card form-grid" data-compose>
        <h2 class="span2">New message</h2>
        <fieldset class="field span2"><legend>Type</legend><div class="pills">
          <label><input type="radio" name="kind" value="meeting" checked><span>📅 Meeting notice</span></label>
          <label><input type="radio" name="kind" value="announcement"><span>📣 Announcement</span></label></div></fieldset>
        <label class="field span2"><span>Title</span><input name="title" required maxlength="140" placeholder="Grad night planning meeting"></label>
        <label class="field" data-meeting><span>Starts</span><input name="when" type="datetime-local"></label>
        <label class="field" data-meeting><span>Ends <em class="muted">(optional)</em></span><input name="end" type="datetime-local"></label>
        <label class="field span2"><span>Where <em class="muted">(room, address, or video link)</em></span><input name="where" maxlength="200" placeholder="HHS Library, Room 112 · or https://meet.google.com/…"></label>
        <label class="field span2"><span>Message</span><textarea name="body" rows="5" maxlength="4000" placeholder="Agenda, what to bring, who to ask…"></textarea></label>
        <fieldset class="field span2"><legend>Send to</legend><div class="pills aud-pills">${auds.map(([k, l, n]) => `<label><input type="checkbox" name="aud" value="${k}" ${ui.composeAud.includes(k) ? "checked" : ""} ${n ? "" : "disabled"}><span>${esc(l)} <em>${n}</em></span></label>`).join("")}</div></fieldset>
        <label class="check span2"><input type="checkbox" name="sendEmail" checked> Email it too${mail.configured ? "" : " (will be skipped until email is connected)"}. Meetings include a calendar invite.</label>
        <p class="login-error span2" data-compose-error role="alert"></p>
        <div class="span2 form-actions"><button class="btn btn-maroon" type="submit">Send message <span class="arrow">→</span></button><span class="muted small">Each person gets their own email, so addresses stay private.</span></div>
      </form>
      <section class="card"><h2>Sent</h2>
        ${hist.length ? hist.map((a) => `<div class="msg-row" data-ann="${a.id}">
          <div class="msg-kind">${a.kind === "meeting" ? "📅" : "📣"}</div>
          <div class="grow"><b>${esc(a.title)}</b><small>${a.when ? esc(dayTime(a.when)) + (a.where ? " · " + esc(a.where) : "") + " · " : ""}to ${a.audiences.map((k) => esc(label[k] || k)).join(", ")} · ${a.recipients} people · ${ago(a.at)}</small></div>
          ${status(a)}<button class="icon-btn" data-del-ann aria-label="Delete message" title="Delete from history and portal"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.7 8.5h5.6l.7-8.5"/></svg></button></div>`).join("") : `<p class="empty-note">Nothing sent yet.</p>`}
      </section>
      <details class="card outbox"><summary><h2>Email log</h2><span class="muted small">every automatic and manual email, newest first</span></summary>
        ${(DB.outbox || []).slice().reverse().slice(0, 60).map((o) => `<div class="log-row"><span class="mono small">${dayTime(o.at)}</span><span class="grow">${esc(o.subject)}</span><span class="small muted">${o.to} recipient${o.to === 1 ? "" : "s"}</span><span class="badge ${/^sent/.test(o.status) ? "volunteer" : /fail/.test(o.status) ? "community" : ""}">${esc(o.status)}</span></div>`).join("") || `<p class="empty-note">No emails yet.</p>`}
      </details>`;
  }

  /* ---------------- bindings per view ---------------- */
  const bind = {
    attendance() {
      const pane = $("[data-pane]");
      const sel = $("[data-att-event]", pane); if (!sel) return;
      sel.addEventListener("change", () => { ui.attEvent = sel.value; route(); });
      const patchSignup = async (id, body) => {
        const x = await api("PATCH", `/api/admin/signups/${id}`, body);
        Object.assign(DB.signups.find((y) => y.id === id), x); return x;
      };
      pane.addEventListener("click", async (e) => {
        const b = e.target.closest("[data-att]");
        if (b) {
          try { await patchSignup(b.closest("[data-signup]").dataset.signup, { status: b.dataset.att }); route(); toast(b.dataset.att === "attended" ? "Marked attended, hours added" : "Saved"); } catch (x) { toast(x.message, true); }
        }
        const all = e.target.closest("[data-att-all]");
        if (all) {
          const ids = DB.signups.filter((x) => x.eventId === ui.attEvent && x.shift === all.dataset.attAll && x.status !== "attended").map((x) => x.id);
          try { for (const id of ids) await patchSignup(id, { status: "attended" }); route(); toast(`Marked ${ids.length} attended`); } catch (x) { toast(x.message, true); }
        }
        if (e.target.closest("[data-att-msg]")) { ui.composeAud = [`volunteers:event:${ui.attEvent}`]; location.hash = "#messages"; }
        if (e.target.closest("[data-att-csv]")) {
          const ev = DB.events.find((x) => x.id === ui.attEvent), vols = Object.fromEntries(DB.volunteers.map((v) => [v.id, v]));
          csv(`attendance-${ev.id}.csv`, ["Event", "Shift", "First", "Last", "Email", "Phone", "Emergency contact", "Attendance", "Hours"],
            DB.signups.filter((x) => x.eventId === ev.id).map((x) => { const v = vols[x.volunteerId] || {}; return [ev.title, x.shift, v.first, v.last, v.email, v.phone, [v.emergencyName, v.emergencyPhone].filter(Boolean).join(" "), x.status || "booked", x.hours ?? ""]; }));
        }
      });
      pane.addEventListener("change", async (e) => {
        if (!e.target.matches("[data-att-hours]")) return;
        try { await patchSignup(e.target.closest("[data-signup]").dataset.signup, { hours: e.target.value }); toast("Hours saved"); } catch (x) { toast(x.message, true); }
      });
    },
    messages() {
      const pane = $("[data-pane]"), f = $("[data-compose]", pane);
      const sync = () => $$("[data-meeting]", f).forEach((el) => (el.hidden = f.kind.value !== "meeting"));
      f.addEventListener("change", sync); sync();
      f.addEventListener("submit", async (e) => {
        e.preventDefault();
        const fd = new FormData(f), err = $("[data-compose-error]", pane); err.textContent = "";
        const body = { kind: fd.get("kind"), title: fd.get("title"), when: fd.get("when") ? fd.get("when") + ":00" : "", end: fd.get("end") ? fd.get("end") + ":00" : "",
          where: fd.get("where"), body: fd.get("body"), audiences: fd.getAll("aud"), sendEmail: !!fd.get("sendEmail") };
        const btn = f.querySelector("[type=submit]"); btn.disabled = true;
        try { const a = await api("POST", "/api/admin/announcements", body); ui.composeAud = []; await refresh(); route(); toast(`Sent to ${a.recipients} people`); }
        catch (x) { err.textContent = x.message; btn.disabled = false; }
      });
      pane.addEventListener("click", async (e) => {
        const d = e.target.closest("[data-del-ann]"); if (!d) return;
        if (!confirm("Delete this message from the history and from volunteers' portals? Emails already sent can't be unsent.")) return;
        try { await api("DELETE", `/api/admin/announcements/${d.closest("[data-ann]").dataset.ann}`); await refresh(); route(); toast("Deleted"); } catch (x) { toast(x.message, true); }
      });
    },
    volunteers() {
      const pane = $("[data-pane]");
      const vidOf = (el) => el.closest("[data-vol]").dataset.vol;
      const patch = async (el, body, msg) => {
        try { const v = await api("PATCH", `/api/admin/volunteers/${vidOf(el)}`, body); Object.assign(DB.volunteers.find((x) => x.id === v.id), v); toast(msg); }
        catch (x) { toast(x.message, true); }
      };
      pane.addEventListener("click", async (e) => {
        const f = e.target.closest("[data-vf]"); if (f) { ui.volFilter = f.dataset.vf; route(); return; }
        if (e.target.closest("[data-export-vol]")) {
          return csv("volunteers.csv", ["First", "Last", "Email", "Phone", "Role", "Grade", "Guardian email", "Interests", "Availability", "Shirt", "Service hours form", "Status", "Hours", "Shifts", "Notes", "Joined"],
            DB.volunteers.map((v) => [v.first, v.last, v.email, v.phone, v.role, v.grade, v.guardianEmail, (v.interests || []).join("; "), (v.availability || []).join("; "), v.shirt, v.serviceHours, v.status, v.hours,
              DB.signups.filter((x) => x.volunteerId === v.id).map((x) => `${DB.events.find((ev) => ev.id === x.eventId)?.title || ""} (${x.shift})`).join("; "), v.notes, v.at]));
        }
        const ds = e.target.closest("[data-del-signup]");
        if (ds) {
          if (!confirm("Remove this volunteer from the shift?")) return;
          try { await api("DELETE", `/api/admin/signups/${ds.dataset.delSignup}`); await refresh(); route(); toast("Removed from shift"); } catch (x) { toast(x.message, true); }
        }
        const rs = e.target.closest("[data-vol-reset]");
        if (rs) {
          const v = DB.volunteers.find((x) => x.id === vidOf(rs));
          if (!confirm(`Give ${v.first} a new temporary password? Their old one will stop working.`)) return;
          try { const { temporaryPassword } = await api("POST", `/api/admin/volunteers/${v.id}/reset-password`); prompt(`Temporary password for ${v.first} ${v.last}. Send it to them privately; they can change it under My profile.`, temporaryPassword); }
          catch (x) { toast(x.message, true); }
        }
        const del = e.target.closest("[data-vol-del]");
        if (del) {
          const v = DB.volunteers.find((x) => x.id === vidOf(del));
          if (!confirm(`Delete ${v.first} ${v.last}'s volunteer account and their shift sign-ups? This can't be undone.`)) return;
          try { await api("DELETE", `/api/admin/volunteers/${v.id}`); await refresh(); route(); toast("Volunteer deleted"); } catch (x) { toast(x.message, true); }
        }
      });
      pane.addEventListener("change", async (e) => {
        if (e.target.matches("[data-vol-status]")) { await patch(e.target, { status: e.target.value }, e.target.value === "approved" ? "Approved. They can book shifts now." : `Marked ${VSTATUS[e.target.value].toLowerCase()}`); route(); }
        if (e.target.matches("[data-vol-hours]")) await patch(e.target, { hours: e.target.value }, "Hours saved");
        if (e.target.matches("[data-vol-notes]")) await patch(e.target, { notes: e.target.value }, "Notes saved");
      });
    },
    ideas() {
      const pane = $("[data-pane]");
      const iidOf = (el) => el.closest("[data-idea]").dataset.idea;
      const patch = async (el, body, msg) => {
        try { const it = await api("PATCH", `/api/admin/ideas/${iidOf(el)}`, body); Object.assign(DB.ideas.find((x) => x.id === it.id), it); toast(msg); }
        catch (x) { toast(x.message, true); }
      };
      pane.addEventListener("click", async (e) => {
        const f = e.target.closest("[data-if]"); if (f) { ui.ideaFilter = f.dataset.if; route(); return; }
        if (e.target.closest("[data-export-ideas]")) {
          return csv("event-ideas.csv", ["Event", "First", "Last", "Email", "Who", "Club", "Type", "Pitch", "When", "Crowd", "Could raise", "Needs", "Message", "Status", "Notes", "Pitched at"],
            DB.ideas.map((x) => [x.eventName, x.first, x.last, x.email, x.who, x.club, x.kind, x.pitch, x.when, x.size, x.raise, (x.needs || []).join("; "), x.message, x.status, x.notes, x.at]));
        }
        const mk = e.target.closest("[data-idea-make]");
        if (mk) {
          const x = DB.ideas.find((i) => i.id === iidOf(mk));
          const cat = /hackathon/i.test(x.kind) ? "hackathon" : "fundraiser";
          eventForm(null, { title: x.eventName || "", category: cat, blurb: (x.pitch || "").slice(0, 400) });
        }
        const del = e.target.closest("[data-idea-del]");
        if (del) {
          const x = DB.ideas.find((i) => i.id === iidOf(del));
          if (!confirm(`Delete the pitch “${x.eventName || "Untitled"}”? This can't be undone.`)) return;
          try { await api("DELETE", `/api/admin/ideas/${x.id}`); await refresh(); route(); toast("Idea deleted"); } catch (x2) { toast(x2.message, true); }
        }
      });
      pane.addEventListener("change", async (e) => {
        if (e.target.matches("[data-idea-status]")) { await patch(e.target, { status: e.target.value }, `Marked ${ISTATUS[e.target.value].toLowerCase()}`); route(); }
        if (e.target.matches("[data-idea-notes]")) await patch(e.target, { notes: e.target.value }, "Notes saved");
      });
    },
    fundraising() {
      const cfg = $("[data-config]");
      cfg.addEventListener("input", () => liveGoal(+cfg.raised.value, +cfg.goal.value || 1));
      cfg.addEventListener("submit", async (e) => {
        e.preventDefault();
        const body = Object.fromEntries(new FormData(cfg));
        body.gradNight += body.gradNight.length === 16 ? ":00" : "";
        try { DB.config = await api("PUT", "/api/admin/config", body); toast("Saved. The site is updated."); }
        catch (x) { toast(x.message, true); }
      });
      $("[data-quick]").addEventListener("submit", async (e) => {
        e.preventDefault();
        const amt = Math.round(+e.target.amt.value); if (!(amt > 0)) return;
        try {
          DB.config = await api("PUT", "/api/admin/config", { raised: DB.config.raised + amt });
          cfg.raised.value = DB.config.raised; liveGoal(DB.config.raised, DB.config.goal);
          e.target.reset(); toast(`Logged ${money(amt)}. New total ${money(DB.config.raised)}.`);
        } catch (x) { toast(x.message, true); }
      });
    },
    events() {
      $("[data-new-event]").addEventListener("click", () => eventForm());
      $("[data-pane]").addEventListener("click", async (e) => {
        const ed = e.target.closest("[data-edit]"); if (ed) eventForm(DB.events.find((x) => x.id === ed.dataset.edit));
        const sr = e.target.closest("[data-see-regs]"); if (sr) ui.regEvent = sr.dataset.seeRegs;
        const del = e.target.closest("[data-del-event]");
        if (del) {
          const ev = DB.events.find((x) => x.id === del.dataset.delEvent), n = regCount(ev.id);
          if (!confirm(`Delete "${ev.title}"?${n ? ` Its ${n} online registration${n > 1 ? "s" : ""} will be deleted too.` : ""} This can't be undone.`)) return;
          try { await api("DELETE", `/api/admin/events/${ev.id}`); await refresh(); route(); toast("Event deleted"); } catch (x) { toast(x.message, true); }
        }
      });
    },
    registrations() {
      $("[data-reg-event]").addEventListener("change", (e) => { ui.regEvent = e.target.value; route(); });
      const s = $("[data-reg-search]");
      s.addEventListener("input", () => { ui.regQuery = s.value; const pos = s.selectionStart; route(); const n = $("[data-reg-search]"); n.focus(); n.setSelectionRange(pos, pos); });
      $("[data-export-regs]").addEventListener("click", () => {
        const ev = (id) => DB.events.find((e) => e.id === id)?.title || "";
        const rows = DB.registrations.filter((r) => ui.regEvent === "all" || r.eventId === ui.regEvent);
        csv(`registrations-${ui.regEvent}.csv`, ["Ticket", "Event", "First", "Last", "Email", "Role", "Grade", "Team", "Experience", "Shirt", "Shift", "Group size", "Waitlist", "Wants updates", "Registered at"],
          rows.map((r) => [r.code, ev(r.eventId), r.first, r.last, r.email, r.role, r.grade, r.team, r.experience, r.shirt, r.shift, r.guests, r.waitlist ? "yes" : "", r.updates ? "yes" : "", r.at]));
      });
      $("[data-pane]").addEventListener("click", async (e) => {
        const b = e.target.closest("[data-del-reg]"); if (!b) return;
        if (!confirm(`Remove registration ${b.dataset.delReg}? This can't be undone.`)) return;
        try { await api("DELETE", `/api/admin/registrations/${b.dataset.delReg}`); await refresh(); route(); toast("Registration removed"); } catch (x) { toast(x.message, true); }
      });
    },
    sponsors() {
      const pane = $("[data-pane]");
      pane.addEventListener("click", async (e) => {
        const f = e.target.closest("[data-sf]"); if (f) { ui.sponsorFilter = f.dataset.sf; route(); return; }
        if (e.target.closest("[data-export-sp]")) {
          return csv("sponsors.csv", ["Organization", "First", "Last", "Email", "Phone", "Level", "Contribution", "Donating", "Display name", "Website", "Heard via", "Message", "Status", "On site", "Notes", "Applied at"],
            DB.sponsors.map((s) => [s.org, s.first, s.last, s.email, s.phone, s.tier, (s.contribute || []).join("; "), s.inkind, s.displayName, s.website, s.heard, s.message, s.status, s.showOnSite ? "yes" : "", s.notes, s.at]));
        }
        const del = e.target.closest("[data-sp-del]");
        if (del) {
          const id = del.closest("[data-sp]").dataset.sp, s = DB.sponsors.find((x) => x.id === id);
          if (!confirm(`Delete the application from ${s.org || s.first}? This can't be undone.`)) return;
          try { await api("DELETE", `/api/admin/sponsors/${id}`); await refresh(); route(); toast("Application deleted"); } catch (x) { toast(x.message, true); }
        }
      });
      const patch = async (el, body, msg) => {
        const id = el.closest("[data-sp]").dataset.sp;
        try { const sp = await api("PATCH", `/api/admin/sponsors/${id}`, body); Object.assign(DB.sponsors.find((x) => x.id === id), sp); toast(msg); return sp; }
        catch (x) { toast(x.message, true); }
      };
      pane.addEventListener("change", async (e) => {
        if (e.target.matches("[data-sp-status]")) {
          const body = { status: e.target.value }; if (e.target.value !== "confirmed") body.showOnSite = false;
          await patch(e.target, body, `Marked ${STATUS[e.target.value].toLowerCase()}`); route();
        }
        if (e.target.matches("[data-sp-show]")) await patch(e.target, { showOnSite: e.target.checked }, e.target.checked ? "Now showing on the home page" : "Hidden from the home page");
        if (e.target.matches("[data-sp-notes]")) await patch(e.target, { notes: e.target.value }, "Notes saved");
      });
    },
  };

  /* ---------------- drawer, csv, toast ---------------- */
  const drawer = $("[data-drawer]");
  drawer.addEventListener("click", (e) => { if (e.target === drawer || e.target.closest("[data-close-drawer]")) drawer.close(); });

  function csv(name, header, rows) {
    const cell = (v) => {
      let s = String(v ?? "");
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // stop spreadsheet formula injection
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const text = [header, ...rows].map((r) => r.map(cell).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" })); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function toast(msg, bad) {
    let t = $(".toast"); if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.append(t); }
    t.textContent = msg; t.classList.toggle("bad", !!bad); t.classList.add("show");
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 2800);
  }

  TOKEN ? start() : showLogin();
})();

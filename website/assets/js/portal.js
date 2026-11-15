/* Project Graduation: volunteer portal */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const dayLong = (d) => new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const time = (d) => new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const INTERESTS = ["Setup & teardown", "Running a booth", "Food & concessions", "Tech & AV", "Decorating", "Check-in & greeting", "Photos & video", "Anything!"];
  const AVAIL = ["Weekday evenings", "Saturdays", "Sundays", "School breaks", "Grad night (parents & alumni only)"];

  let TOKEN = null;
  try { TOKEN = sessionStorage.getItem("pg-vol"); } catch {}
  let D = null; // { me, opportunities, signups }

  async function api(method, path, body) {
    const r = await fetch(path, { method, headers: { "Content-Type": "application/json", ...(TOKEN ? { Authorization: "Bearer " + TOKEN } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const out = await r.json().catch(() => ({}));
    if (r.status === 401 && path !== "/api/volunteer/login") { logout(true); throw new Error("Please log in again."); }
    if (!r.ok && !out.error && [404, 405, 501].includes(r.status)) throw new Error("NO_SERVER");
    if (!r.ok) throw new Error(out.error || `Request failed (${r.status})`);
    return out;
  }
  const refresh = async () => { D = await api("GET", "/api/volunteer/me"); };

  function showLogin(msg) {
    $("[data-console]").hidden = true; $("[data-login]").hidden = false;
    $("[data-login-error]").textContent = msg || "";
    window.PGStickers && PGStickers.mount($("[data-login]"));
  }
  function logout(expired) {
    if (TOKEN && !expired) api("POST", "/api/volunteer/logout").catch(() => {});
    TOKEN = null; try { sessionStorage.removeItem("pg-vol"); } catch {}
    showLogin(expired ? "Your session ended. Log in again." : "");
  }
  $("[data-login-form]").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target, btn = f.querySelector("button"), err = $("[data-login-error]");
    btn.disabled = true; err.textContent = "";
    try {
      const { token } = await api("POST", "/api/volunteer/login", { email: f.email.value, password: f.password.value });
      TOKEN = token; try { sessionStorage.setItem("pg-vol", token); } catch {}
      f.password.value = ""; await start();
    } catch (x) {
      err.textContent = /NO_SERVER|fetch|NetworkError/i.test(x.message) ? "The portal isn't available on this copy of the site (it needs server.py)." : x.message;
    } finally { btn.disabled = false; }
  });
  $("[data-logout]").addEventListener("click", () => logout());

  async function start() {
    try { await refresh(); } catch (e) { return showLogin(TOKEN ? e.message : ""); }
    $("[data-login]").hidden = true; $("[data-console]").hidden = false;
    route();
  }

  /* ---------- views ---------- */
  const head = (eyebrow, title, actions = "") => `<header class="pane-head"><div><p class="eyebrow">// ${eyebrow}</p><h1>${title}</h1></div><div class="pane-actions">${actions}</div></header>`;
  const upcoming = () => D.signups.filter((s) => new Date(s.end) > new Date()).sort((a, b) => new Date(a.start) - new Date(b.start));
  const past = () => D.signups.filter((s) => new Date(s.end) <= new Date());

  function statusBanner() {
    const st = D.me.status;
    if (st === "approved") return "";
    return `<section class="note-card ${st}"><div data-sticker="${st === "pending" ? "eyes" : "bubble"}" data-still></div>
      <div><h2>${st === "pending" ? "Your account is waiting for approval" : "Your account is paused"}</h2>
      <p>${st === "pending" ? "An organizer reviews new volunteers, usually within a couple of days. You can look around and see upcoming shifts now; you'll be able to book them once you're approved." : "Reach out to an organizer if you'd like to start volunteering again."}</p></div></section>`;
  }

  function home() {
    const up = upcoming();
    return head("volunteer portal", `Hi, ${esc(D.me.first)}! <span class="hl on">Thanks for helping.</span>`) + statusBanner() + `
      <div class="kpis three">
        <div class="kpi"><span>Service hours</span><b>${D.me.hours || 0}</b><small>logged by organizers</small></div>
        <div class="kpi"><span>Upcoming shifts</span><b>${up.length}</b><small>${up[0] ? "next: " + esc(up[0].title) : "none booked yet"}</small></div>
        <a class="kpi" href="#shifts"><span>Open opportunities</span><b>${D.opportunities.length}</b><small>browse and book →</small></a>
      </div>
      <section class="card"><h2>Your upcoming shifts</h2>
        ${up.length ? up.map((s) => `<div class="shift-row"><div class="mini-cal"><b>${new Date(s.start).getDate()}</b><span>${new Date(s.start).toLocaleDateString("en-US", { month: "short" })}</span></div>
          <div class="grow"><b>${esc(s.title)}</b><small>${dayLong(s.start)} · ${esc(s.shift)} · ${esc(s.location)}</small></div>
          <button class="btn btn-sm btn-ghost" data-cancel="${s.id}">Cancel</button></div>`).join("")
        : `<p class="empty-note">No shifts yet. ${D.me.status === "approved" ? '<a class="link-arrow" href="#shifts">Find one →</a>' : "Once you're approved, you can book shifts here."}</p>`}
      </section>
      ${past().length ? `<section class="card"><h2>Past shifts</h2>${past().map((s) => `<div class="shift-row past"><div class="grow"><b>${esc(s.title)}</b><small>${dayLong(s.start)} · ${esc(s.shift)}</small></div></div>`).join("")}</section>` : ""}`;
  }

  function shifts() {
    const approved = D.me.status === "approved";
    const mine = (eid, sh) => D.signups.find((s) => s.eventId === eid && s.shift === sh);
    return head("find shifts", "Volunteer opportunities") + (approved ? "" : statusBanner()) + `
      <div class="opp-list">${D.opportunities.map((o) => `
        <article class="card opp">
          <div class="opp-top">
            <div class="mini-cal big"><b>${new Date(o.start).getDate()}</b><span>${new Date(o.start).toLocaleDateString("en-US", { month: "short" })}</span></div>
            <div class="grow"><h3>${esc(o.title)}</h3><p class="muted">${dayLong(o.start)} · ${time(o.start)}–${time(o.end)} · ${esc(o.location)}</p></div>
            <span class="spots ${o.left < 5 ? "low" : ""}">${o.left} spot${o.left === 1 ? "" : "s"} left</span>
          </div>
          ${o.blurb ? `<p class="opp-blurb">${esc(o.blurb)}</p>` : ""}
          <div class="shift-pills">${o.shifts.map((sh) => {
            const m = mine(o.id, sh);
            return m ? `<button class="shift-pill on" data-cancel="${m.id}" title="Click to cancel">✓ ${esc(sh)}<em>you're in · cancel</em></button>`
              : `<button class="shift-pill" data-book="${o.id}" data-shift="${esc(sh)}" ${approved && o.left > 0 ? "" : "disabled"}>${esc(sh)}<em>${o.left > 0 ? "sign up" : "full"}</em></button>`;
          }).join("")}</div>
        </article>`).join("") || `<section class="card empty-card"><div data-sticker="bubble" data-still></div><p>No open volunteer opportunities right now. Check back soon!</p></section>`}</div>`;
  }

  function profile() {
    const m = D.me;
    const pills = (name, opts, sel) => `<div class="pills">${opts.map((o) => `<label><input type="checkbox" name="${name}" value="${esc(o)}" ${(sel || []).includes(o) ? "checked" : ""}><span>${esc(o)}</span></label>`).join("")}</div>`;
    return head("my profile", "My profile") + `
      <form class="card form-grid" data-profile>
        <h2 class="span2">About you</h2>
        <div class="field"><span>Name</span><p class="static">${esc(m.first)} ${esc(m.last)}</p></div>
        <div class="field"><span>Email</span><p class="static">${esc(m.email)}</p></div>
        <div class="field"><span>Role</span><p class="static">${esc(m.role || "—")}${m.grade ? ` · grade ${esc(m.grade)}` : ""}</p></div>
        <label class="field"><span>Phone</span><input name="phone" type="tel" value="${esc(m.phone)}"></label>
        <label class="field"><span>T-shirt size</span><select name="shirt">${["", "XS", "S", "M", "L", "XL", "XXL"].map((x) => `<option ${m.shirt === x ? "selected" : ""}>${x}</option>`).join("")}</select></label>
        <fieldset class="field span2"><legend>What you like doing</legend>${pills("interests", INTERESTS, m.interests)}</fieldset>
        <fieldset class="field span2"><legend>When you're usually free</legend>${pills("availability", AVAIL, m.availability)}</fieldset>
        <div class="span2 form-actions"><button class="btn btn-maroon" type="submit">Save profile</button></div>
      </form>
      <form class="card form-grid" data-password>
        <h2 class="span2">Change password</h2>
        <label class="field"><span>Current password</span><input name="current" type="password" autocomplete="current-password" required></label>
        <label class="field"><span>New password</span><input name="new" type="password" autocomplete="new-password" minlength="8" required></label>
        <p class="login-error span2" data-pw-error role="alert"></p>
        <div class="span2 form-actions"><button class="btn" type="submit">Update password</button></div>
      </form>`;
  }

  const VIEWS = { home, shifts, profile };
  function route() {
    const tab = location.hash.slice(1) || "home";
    const view = VIEWS[tab] || home;
    $$("[data-tab]").forEach((a) => a.setAttribute("aria-current", a.dataset.tab === tab ? "page" : "false"));
    const old = $("[data-pane]"), pane = old.cloneNode(false);
    pane.innerHTML = view(); old.replaceWith(pane);
    window.PGStickers && PGStickers.mount(pane);
    bind(pane);
  }
  addEventListener("hashchange", async () => { if (!D) return; try { await refresh(); } catch { return; } route(); });

  function bind(pane) {
    pane.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-book]");
      if (b) {
        b.disabled = true;
        try { await api("POST", "/api/volunteer/signups", { eventId: b.dataset.book, shift: b.dataset.shift }); await refresh(); route(); toast("You're signed up! See it on your Home tab."); }
        catch (x) { b.disabled = false; toast(x.message, true); }
      }
      const c = e.target.closest("[data-cancel]");
      if (c) {
        if (!confirm("Cancel this shift? Someone else will be able to take it.")) return;
        try { await api("DELETE", `/api/volunteer/signups/${c.dataset.cancel}`); await refresh(); route(); toast("Shift cancelled"); }
        catch (x) { toast(x.message, true); }
      }
    });
    const pf = $("[data-profile]", pane);
    pf && pf.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(pf);
      try { D.me = await api("PATCH", "/api/volunteer/me", { phone: fd.get("phone"), shirt: fd.get("shirt"), interests: fd.getAll("interests"), availability: fd.getAll("availability") }); toast("Profile saved"); }
      catch (x) { toast(x.message, true); }
    });
    const pw = $("[data-password]", pane);
    pw && pw.addEventListener("submit", async (e) => {
      e.preventDefault();
      const err = $("[data-pw-error]", pane); err.textContent = "";
      try { await api("POST", "/api/volunteer/password", { current: pw.current.value, new: pw.new.value }); pw.reset(); toast("Password updated"); }
      catch (x) { err.textContent = x.message; }
    });
  }

  function toast(msg, bad) {
    let t = $(".toast"); if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.append(t); }
    t.textContent = msg; t.classList.toggle("bad", !!bad); t.classList.add("show");
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 2800);
  }

  TOKEN ? start() : showLogin();
})();

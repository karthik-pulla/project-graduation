/* ==========================================================================
   One-question-at-a-time form engine.
   Pages set <body data-flow="sponsor|pitch|volunteer">; questions live in
   assets/js/forms.js. Question types:
     fields   one or more inputs side by side  {fields:[{key,label,type,placeholder,required}]}
     textarea long answer                       {key}
     single   pick one (auto-advances)          {key, options}
     multi    pick any                          {key, options}
     cards    pick one big card                 {key, options:[{value,title,big,perks}]}
   Any question can have when:(answers)=>bool, required, help, label (for review).
   ========================================================================== */
(function () {
  const FORM = (window.PG_FORMS || {})[document.body.dataset.flow];
  if (!FORM) return;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const CFG = (window.PG_SEED && window.PG_SEED.config) || {};
  const ctx = { year: CFG.classYear || 2027, contact: CFG.contactEmail || "hello@hhsprojectgrad.org", esc };

  const Q = [{ id: "intro", type: "intro" }, ...FORM.questions, { id: "review", type: "review" }, { id: "done", type: "done" }];
  const DRAFT = "pg-flow-" + document.body.dataset.flow;
  const secretKeys = new Set(FORM.questions.flatMap((q) => (q.fields || []).filter((f) => f.type === "password").map((f) => f.key)));

  let A = {};
  try { A = JSON.parse(localStorage.getItem(DRAFT) || "{}"); } catch {}
  const save = () => { // passwords never touch browser storage
    try { const copy = { ...A }; secretKeys.forEach((k) => delete copy[k]); delete copy._fromReview; localStorage.setItem(DRAFT, JSON.stringify(copy)); } catch {}
  };

  const stage = $("[data-stage]");
  let i = 0, busy = false;
  const visible = () => Q.filter((q) => !q.when || q.when(A));
  const asks = () => visible().filter((q) => !["intro", "review", "done"].includes(q.type));
  const cur = () => visible()[i];
  const letter = (n) => String.fromCharCode(65 + n);
  const val = (v) => (typeof v === "function" ? v(A, ctx) : v);
  const optVal = (o) => (typeof o === "string" ? o : o.value);

  function field(q) {
    if (q.type === "fields") {
      const solo = q.fields.length === 1;
      return `<div class="${solo ? "" : "flow-row"}">${q.fields.map((f) => {
        const v = A[f.key] ?? (f.prefill ? f.prefill(A) : "");
        return `<label class="flow-input"><span class="${solo && !f.showLabel ? "sr-only" : ""}">${esc(f.label)}${f.required === false && !solo ? " <em>(optional)</em>" : ""}</span>
          <input name="${f.key}" type="${f.type || "text"}" ${f.required ? "required" : ""} autocomplete="${f.autocomplete || "off"}" value="${f.type === "password" ? "" : esc(v)}" placeholder="${esc(f.placeholder || "")}" ${f.type === "password" ? 'minlength="8"' : ""}></label>`;
      }).join("")}</div>${q.after ? `<p class="flow-help">${q.after}</p>` : ""}`;
    }
    if (q.type === "textarea")
      return `<label class="flow-input"><span class="sr-only">${esc(q.label || q.key)}</span><textarea name="${q.key}" rows="3" placeholder="${esc(q.placeholder || "")}">${esc(A[q.key])}</textarea></label>`;
    if (q.type === "single" || q.type === "multi")
      return `<div class="choices ${q.options.length > 6 ? "two-col-choices" : ""}" role="${q.type === "multi" ? "group" : "radiogroup"}">${q.options.map((o, n) => {
        const on = q.type === "multi" ? (A[q.key] || []).includes(o) : A[q.key] === o;
        return `<button type="button" class="choice" data-val="${esc(o)}" aria-pressed="${on}"><kbd>${letter(n)}</kbd>${esc(o)}${q.type === "multi" ? '<i class="tick">✓</i>' : ""}</button>`;
      }).join("")}</div>`;
    if (q.type === "cards")
      return `<div class="tiers-grid ${q.compact ? "compact" : ""}">${q.options.map((o, n) => `<button type="button" class="tier-card" data-val="${esc(o.value)}" aria-pressed="${A[q.key] === o.value}">
          <kbd>${letter(n)}</kbd><b>${esc(o.title)}</b>${o.big ? `<strong>${esc(o.big)}</strong>` : ""}${o.perks ? `<ul>${o.perks.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}</button>`).join("")}</div>`;
    return "";
  }

  function reviewValue(q) {
    if (q.review) return q.review(A);
    if (q.type === "fields") return q.fields.filter((f) => f.type !== "password" && f.review !== false).map((f) => A[f.key]).filter(Boolean).join(" ");
    const v = A[q.key];
    return Array.isArray(v) ? v.join(", ") : v;
  }

  function render(dir = 1) {
    const q = cur(), list = asks(), n = list.indexOf(q);
    $("[data-progress]").style.width = (q.type === "intro" ? 0 : q.type === "review" || q.type === "done" ? 100 : (n / list.length) * 100) + "%";
    $("[data-count]").textContent = n >= 0 ? `${String(n + 1).padStart(2, "0")} / ${String(list.length).padStart(2, "0")}` : "";
    document.body.dataset.step = q.type;
    let html = "";
    if (q.type === "intro") {
      const it = FORM.intro;
      html = `<p class="eyebrow">// ${val(it.eyebrow)}</p><h1 class="flow-title">${val(it.title)}</h1><p class="flow-lede">${val(it.lede)}</p>
        <div class="flow-actions"><button class="btn btn-maroon" type="submit">${it.cta || "Let's go"} <span class="arrow">→</span></button><span class="flow-hint">press <kbd>Enter ↵</kbd></span></div>
        ${it.footnote ? `<p class="flow-foot">${val(it.footnote)}</p>` : ""}`;
    } else if (q.type === "review") {
      const rows = asks().filter((x) => x.review !== false).map((x) => [x.label || x.id, reviewValue(x), x.id]);
      html = `<p class="eyebrow">// last step</p><h2 class="flow-q">Look good${A.first ? ", " + esc(A.first) : ""}? <span class="hl">Review and send.</span></h2>
        <dl class="review">${rows.map(([k, v, id]) => `<div><dt>${esc(k)}</dt><dd>${v ? esc(v) : '<span class="muted">—</span>'}</dd><button type="button" class="link-arrow" data-jump="${id}">Edit</button></div>`).join("")}</dl>
        <p class="flow-error" role="alert"></p>
        <div class="flow-actions"><button class="btn btn-maroon" type="submit">${FORM.submitLabel || "Send"} <span class="arrow">→</span></button></div>`;
    } else if (q.type === "done") {
      const d = FORM.done(A, ctx);
      html = `<div class="flow-done"><div data-sticker="${d.sticker || "burst"}" ${d.stickerText ? `data-text="${d.stickerText}" data-size="40"` : ""}></div>
        <h2 class="flow-title">${d.title}</h2><p class="flow-lede">${d.lede}</p><div class="flow-actions">${d.actions}</div></div>`;
    } else {
      html = `<p class="flow-num mono">${String(n + 1).padStart(2, "0")} →</p>
        <h2 class="flow-q">${val(q.q)}</h2>
        ${q.help ? `<p class="flow-help">${val(q.help)}</p>` : ""}
        ${field(q)}
        <p class="flow-error" role="alert"></p>
        <div class="flow-actions"><button class="btn" type="submit">${q.required || (q.fields || []).some((f) => f.required) ? "OK" : "Next"} ✓</button><span class="flow-hint">${q.type === "textarea" ? "<kbd>Shift</kbd> + <kbd>Enter ↵</kbd> for a new line" : q.type === "multi" ? "pick any, then <kbd>Enter ↵</kbd>" : "press <kbd>Enter ↵</kbd>"}</span></div>`;
    }
    stage.innerHTML = `<div class="flow-slide ${dir > 0 ? "in-up" : "in-down"}">${html}</div>`;
    window.PGStickers && PGStickers.mount(stage);
    setTimeout(() => stage.querySelectorAll(".hl").forEach((h) => h.classList.add("on")), 140);
    const first = stage.querySelector("input, textarea");
    if (first && !matchMedia("(hover: none)").matches) first.focus({ preventScroll: true });
    else stage.querySelector(".choice, .tier-card, [type=submit]")?.focus({ preventScroll: true });
    $("[data-back]").disabled = i === 0 || q.type === "done";
    $("[data-fwd]").disabled = q.type === "review" || q.type === "done";
  }

  function collect(q) {
    const get = (k) => stage.querySelector(`[name="${k}"]`);
    if (q.type === "fields") q.fields.forEach((f) => { const el = get(f.key); if (el) A[f.key] = f.type === "password" ? el.value : el.value.trim(); });
    else if (q.type === "textarea") A[q.key] = get(q.key).value.trim();
    save();
  }

  function validate(q) {
    if (q.type === "fields") {
      for (const f of q.fields) {
        const v = A[f.key] || "";
        if (f.required && !v) return f.requiredMsg || `${f.label} is required.`;
        if (v && f.type === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return "That email doesn't look quite right.";
        if (v && f.type === "url" && !/^https?:\/\/\S+\.\S+/.test(v)) return "Websites should start with https://";
        if (f.type === "password" && v && v.length < 8) return "Passwords need at least 8 characters.";
        if (f.match && v !== A[f.match]) return "Those passwords don't match.";
      }
    }
    if (q.required && q.type === "textarea" && !A[q.key]) return "Tell us a little here.";
    if (q.required && (q.type === "single" || q.type === "cards") && !A[q.key]) return "Pick one to keep going.";
    if (q.required && q.type === "multi" && !(A[q.key] || []).length) return "Pick at least one.";
    return q.validate ? q.validate(A) || "" : "";
  }

  function showError(msg) {
    const e = stage.querySelector(".flow-error"); if (!e) return;
    e.innerHTML = msg; e.classList.remove("shake"); void e.offsetWidth; e.classList.add("shake");
  }

  function go(d) {
    if (busy) return;
    const q = cur();
    const asking = !["intro", "review", "done"].includes(q.type);
    if (asking) collect(q);
    if (d > 0 && asking) { const err = validate(q); if (err) return showError(err); }
    if (d > 0 && A._fromReview && asking) { // edited from review: jump straight back
      delete A._fromReview; i = visible().findIndex((x) => x.type === "review"); return render(1);
    }
    i = Math.max(0, Math.min(visible().length - 1, i + d));
    // if a password got lost (page refresh), send them back to it before review
    if (cur().type === "review") {
      const missing = asks().findIndex((x) => x.fields && x.fields.some((f) => f.type === "password" && !A[f.key]));
      if (missing >= 0) { i = visible().indexOf(asks()[missing]); render(-1); return showError("Please re-enter your password."); }
    }
    render(d);
  }

  async function send() {
    const btn = stage.querySelector("[type=submit]"); busy = true; btn.disabled = true; btn.textContent = "Sending…";
    const shown = new Set(asks().map((q) => q.id));
    const payload = {};
    FORM.questions.forEach((q) => {
      const keys = q.fields ? q.fields.filter((f) => !f.match).map((f) => f.key) : [q.key];
      keys.forEach((k) => (payload[k] = shown.has(q.id) ? A[k] ?? "" : Array.isArray(A[k]) ? [] : ""));
    });
    try {
      const r = await fetch(FORM.endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const out = await r.json().catch(() => ({}));
      if (!r.ok) throw Object.assign(new Error(out.error || "offline"), { offline: !out.error });
      try { localStorage.removeItem(DRAFT); } catch {}
      busy = false; i = visible().length - 1; render(1);
    } catch (e) {
      busy = false; btn.disabled = false; btn.innerHTML = `${FORM.submitLabel || "Send"} <span class="arrow">→</span>`;
      if (e.offline || e.name === "TypeError") {
        if (FORM.offline === "mail") {
          const body = Object.entries(payload).filter(([k]) => !secretKeys.has(k)).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v || ""}`).join("\n");
          showError(`We couldn't reach our server. <a href="mailto:${ctx.contact}?subject=${encodeURIComponent(FORM.mailSubject || "Website form")}&body=${encodeURIComponent(body)}">Email your answers to us instead</a>.`);
        } else showError(`We couldn't reach our server, so this form can't be sent right now. Please try again later or email <a href="mailto:${ctx.contact}">${ctx.contact}</a>.`);
      } else showError(esc(e.message));
    }
  }

  // ---- events
  stage.addEventListener("submit", (e) => { e.preventDefault(); cur().type === "review" ? send() : go(1); });
  stage.addEventListener("click", (e) => {
    const c = e.target.closest(".choice, .tier-card");
    if (c) {
      const q = cur();
      if (q.type === "multi") {
        const set = new Set(A[q.key] || []); set.has(c.dataset.val) ? set.delete(c.dataset.val) : set.add(c.dataset.val);
        A[q.key] = q.options.map(optVal).filter((o) => set.has(o)); c.setAttribute("aria-pressed", set.has(c.dataset.val)); save();
      } else {
        A[q.key] = c.dataset.val; save();
        stage.querySelectorAll("[aria-pressed]").forEach((b) => b.setAttribute("aria-pressed", b === c));
        setTimeout(() => go(1), 260);
      }
    }
    const j = e.target.closest("[data-jump]");
    if (j) { i = visible().findIndex((q) => q.id === j.dataset.jump); A._fromReview = true; render(-1); }
  });
  document.addEventListener("keydown", (e) => {
    const q = cur(); if (!q) return;
    const el = document.activeElement, inText = /INPUT|TEXTAREA/.test(el?.tagName || "");
    if (e.key === "Enter" && el?.tagName === "TEXTAREA" && !e.shiftKey) { e.preventDefault(); go(1); return; }
    if (e.key === "Enter" && !inText && (el?.closest(".choice, .tier-card") || !el?.closest("button, a"))) { e.preventDefault(); stage.requestSubmit(); return; }
    if (!inText && !e.metaKey && !e.ctrlKey && !e.altKey && /^[a-z]$/i.test(e.key)) {
      const opts = stage.querySelectorAll(".choice, .tier-card"), k = e.key.toUpperCase().charCodeAt(0) - 65;
      if (opts[k]) { opts[k].click(); opts[k].focus(); }
    }
  });
  $("[data-back]").addEventListener("click", () => go(-1));
  $("[data-fwd]").addEventListener("click", () => go(1));

  delete A._fromReview;
  render(1);
})();

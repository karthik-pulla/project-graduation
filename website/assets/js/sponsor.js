/* Sponsor sign-up: one question at a time */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const CFG = (window.PG_SEED && window.PG_SEED.config) || {};
  const year = CFG.classYear || 2027;
  const contact = CFG.contactEmail || "hello@hhsprojectgrad.org";

  // Sponsor levels. Edit names, prices, and perks here.
  const TIERS = [
    { name: "Freshman", price: "$250", perks: ["Name on our website", "Social media thank-you"] },
    { name: "Sophomore", price: "$500", perks: ["Everything in Freshman", "Name on the grad night banner"] },
    { name: "Junior", price: "$1,000", perks: ["Everything in Sophomore", "Logo on event T-shirts"] },
    { name: "Senior", price: "$2,500", perks: ["Everything in Junior", "Logo on banner and table signs"] },
    { name: "Valedictorian", price: "$5,000+", perks: ["Everything in Senior", "Presenting sponsor of grad night"] },
    { name: "Not sure yet", price: "Let's talk", perks: ["We'll help you find the right fit"] },
  ];
  const INKIND = ["In-kind goods or services", "Raffle or door prizes", "Food or catering"];

  const Q = [
    { id: "intro", type: "intro" },
    { id: "name", type: "name", q: "First things first. <span class='hl'>What's your name?</span>" },
    { id: "org", type: "text", key: "org", required: true, autocomplete: "organization",
      q: (a) => `Nice to meet you, ${esc(a.first)}! Which <span class='hl'>business or organization</span> are you with?`,
      help: "Sponsoring as a family or individual? Just type your family name.", placeholder: "Hillsborough Hardware Co." },
    { id: "email", type: "email", key: "email", required: true, autocomplete: "email",
      q: "What's the best <span class='hl'>email</span> to reach you?", placeholder: "you@business.com" },
    { id: "phone", type: "tel", key: "phone", autocomplete: "tel",
      q: "And a <span class='hl'>phone number</span>?", help: "Optional. We'd only call to coordinate a delivery or your logo.", placeholder: "(555) 555-0123" },
    { id: "tier", type: "tiers", key: "tier", required: true,
      q: "Which <span class='hl'>sponsorship level</span> fits?", help: "Every level makes grad night free for a senior." },
    { id: "contribute", type: "multi", key: "contribute", required: true,
      q: "How would you like to <span class='hl'>contribute</span>?", help: "Pick as many as you like.",
      options: ["Cash or check donation", ...INKIND, "Volunteers from our team"] },
    { id: "inkind", type: "textarea", key: "inkind", when: (a) => (a.contribute || []).some((c) => INKIND.includes(c)),
      q: "Tell us about what you'd like to <span class='hl'>donate</span>.", help: "Rough is fine. We'll sort out details later.", placeholder: "e.g. two $50 gift cards and pizza for 40 volunteers" },
    { id: "display", type: "display",
      q: "How should we <span class='hl'>list you</span> on the website and grad night signs?" },
    { id: "heard", type: "single", key: "heard",
      q: "How did you <span class='hl'>hear about us</span>?", options: ["A student or parent", "Social media", "Another sponsor", "HHS newsletter", "Other"] },
    { id: "message", type: "textarea", key: "message",
      q: "Anything else we should know?", help: "Optional. Questions, ideas, timing, anything.", placeholder: "Type here…" },
    { id: "review", type: "review" },
    { id: "done", type: "done" },
  ];

  // answers persist in this browser so a refresh doesn't lose progress
  let A = {};
  try { A = JSON.parse(localStorage.getItem("pg-sponsor-draft") || "{}"); } catch {}
  const save = () => { try { localStorage.setItem("pg-sponsor-draft", JSON.stringify(A)); } catch {} };

  const stage = $("[data-stage]");
  let i = 0, busy = false;
  const visible = () => Q.filter((q) => !q.when || q.when(A));
  const asks = () => visible().filter((q) => !["intro", "review", "done"].includes(q.type));
  const cur = () => visible()[i];
  const letter = (n) => String.fromCharCode(65 + n);
  const text = (v) => (typeof v === "function" ? v(A) : v);

  function field(q) {
    switch (q.type) {
      case "name":
        return `<div class="flow-row">
          <label class="flow-input"><span>First name</span><input name="first" required autocomplete="given-name" value="${esc(A.first)}" placeholder="Jordan"></label>
          <label class="flow-input"><span>Last name</span><input name="last" autocomplete="family-name" value="${esc(A.last)}" placeholder="Rivera"></label></div>`;
      case "text": case "email": case "tel":
        return `<label class="flow-input"><span class="sr-only">${q.key}</span><input name="${q.key}" type="${q.type}" ${q.required ? "required" : ""} autocomplete="${q.autocomplete || "off"}" value="${esc(A[q.key])}" placeholder="${esc(q.placeholder || "")}"></label>`;
      case "textarea":
        return `<label class="flow-input"><span class="sr-only">${q.key}</span><textarea name="${q.key}" rows="3" placeholder="${esc(q.placeholder || "")}">${esc(A[q.key])}</textarea></label>`;
      case "display":
        return `<div class="flow-row">
          <label class="flow-input"><span>Display name</span><input name="displayName" value="${esc(A.displayName ?? A.org)}" placeholder="Hillsborough Hardware"></label>
          <label class="flow-input"><span>Website <em>(optional)</em></span><input name="website" type="url" value="${esc(A.website)}" placeholder="https://"></label></div>
          <p class="flow-help">Got a logo? We'll ask for it by email once you're confirmed.</p>`;
      case "single": case "multi":
        return `<div class="choices" role="${q.type === "multi" ? "group" : "radiogroup"}">${q.options.map((o, n) => {
          const on = q.type === "multi" ? (A[q.key] || []).includes(o) : A[q.key] === o;
          return `<button type="button" class="choice" data-val="${esc(o)}" aria-pressed="${on}"><kbd>${letter(n)}</kbd>${esc(o)}${q.type === "multi" ? '<i class="tick">✓</i>' : ""}</button>`;
        }).join("")}</div>`;
      case "tiers":
        return `<div class="tiers-grid">${TIERS.map((t, n) => {
          const val = `${t.name} (${t.price})`;
          return `<button type="button" class="tier-card" data-val="${esc(val)}" aria-pressed="${A.tier === val}">
            <kbd>${letter(n)}</kbd><b>${t.name}</b><strong>${t.price}</strong><ul>${t.perks.map((p) => `<li>${p}</li>`).join("")}</ul></button>`;
        }).join("")}</div>`;
    }
    return "";
  }

  function render(dir = 1) {
    const q = cur(), list = asks(), n = list.indexOf(q);
    $("[data-progress]").style.width = (q.type === "intro" ? 0 : q.type === "review" || q.type === "done" ? 100 : (n / list.length) * 100) + "%";
    $("[data-count]").textContent = n >= 0 ? `${String(n + 1).padStart(2, "0")} / ${String(list.length).padStart(2, "0")}` : "";
    document.body.dataset.step = q.type;
    let html = "";

    if (q.type === "intro") {
      html = `<p class="eyebrow">// sponsor the class of ${year}</p>
        <h1 class="flow-title">Back the <span class="hl">Class of ${year}</span>.</h1>
        <p class="flow-lede">Local sponsors make grad night free for every Hillsborough High senior. A few quick questions, about two minutes, and we'll take it from there.</p>
        <div class="flow-actions"><button class="btn btn-maroon" type="submit">Let's go <span class="arrow">→</span></button><span class="flow-hint">press <kbd>Enter ↵</kbd></span></div>`;
    } else if (q.type === "review") {
      const rows = [
        ["Name", [A.first, A.last].filter(Boolean).join(" "), "name"], ["Organization", A.org, "org"], ["Email", A.email, "email"],
        ["Phone", A.phone, "phone"], ["Level", A.tier, "tier"], ["Contribution", (A.contribute || []).join(", "), "contribute"],
        ...(visible().some((x) => x.id === "inkind") ? [["Donating", A.inkind, "inkind"]] : []),
        ["Listed as", [A.displayName, A.website].filter(Boolean).join(" · "), "display"], ["Heard via", A.heard, "heard"], ["Notes", A.message, "message"],
      ];
      html = `<p class="eyebrow">// last step</p><h2 class="flow-q">Look good, ${esc(A.first)}? <span class="hl">Review and send.</span></h2>
        <dl class="review">${rows.map(([k, v, id]) => `<div><dt>${k}</dt><dd>${v ? esc(v) : '<span class="muted">—</span>'}</dd><button type="button" class="link-arrow" data-jump="${id}">Edit</button></div>`).join("")}</dl>
        <div class="flow-actions"><button class="btn btn-maroon" type="submit">Send my sponsorship <span class="arrow">→</span></button></div>`;
    } else if (q.type === "done") {
      html = `<div class="flow-done"><div data-sticker="burst" data-text="THX!" data-size="40"></div>
        <h2 class="flow-title">You're <span class="hl">awesome</span>, ${esc(A.first)}.</h2>
        <p class="flow-lede">Thanks for backing the Class of ${year}. Someone from our sponsor team will email <b>${esc(A.email)}</b> within a week with next steps.</p>
        <div class="flow-actions"><a class="btn" href="index.html">Back to home</a><a class="btn btn-ghost" href="events.html">See events</a></div></div>`;
    } else {
      html = `<p class="flow-num mono">${String(n + 1).padStart(2, "0")} →</p>
        <h2 class="flow-q" id="q-title">${text(q.q)}</h2>
        ${q.help ? `<p class="flow-help">${q.help}</p>` : ""}
        ${field(q)}
        <p class="flow-error" role="alert"></p>
        <div class="flow-actions"><button class="btn" type="submit">${q.required ? "OK" : "Next"} ✓</button><span class="flow-hint">${q.type === "textarea" ? "<kbd>Shift</kbd> + <kbd>Enter ↵</kbd> for a new line" : "press <kbd>Enter ↵</kbd>"}</span></div>`;
    }
    stage.innerHTML = `<div class="flow-slide ${dir > 0 ? "in-up" : "in-down"}">${html}</div>`;
    window.PGStickers && PGStickers.mount(stage);
    requestAnimationFrame(() => setTimeout(() => stage.querySelectorAll(".hl").forEach((h) => h.classList.add("on")), 120));
    const first = stage.querySelector("input, textarea");
    if (first && !matchMedia("(hover: none)").matches) first.focus({ preventScroll: true });
    else stage.querySelector(".choice, .tier-card, [type=submit]")?.focus({ preventScroll: true });
    $("[data-back]").disabled = i === 0 || q.type === "done";
    $("[data-fwd]").disabled = q.type === "review" || q.type === "done";
  }

  function collect(q) {
    const f = (n) => stage.querySelector(`[name="${n}"]`);
    if (q.type === "name") { A.first = f("first").value.trim(); A.last = f("last").value.trim(); }
    else if (q.type === "display") { A.displayName = f("displayName").value.trim(); A.website = f("website").value.trim(); }
    else if (["text", "email", "tel", "textarea"].includes(q.type)) A[q.key] = f(q.key).value.trim();
    save();
  }

  function validate(q) {
    if (q.type === "name" && !A.first) return "Please tell us your first name.";
    if (q.required && ["text", "email", "tel"].includes(q.type) && !A[q.key]) return "This one's required.";
    if (q.type === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(A.email || "")) return "That email doesn't look quite right.";
    if (q.type === "tiers" && !A.tier) return "Pick a level (or “Not sure yet”).";
    if (q.type === "multi" && q.required && !(A[q.key] || []).length) return "Pick at least one.";
    if (q.type === "display" && A.website && !/^https?:\/\/\S+\.\S+/.test(A.website)) return "Websites should start with https://";
    return "";
  }

  function go(d) {
    if (busy) return;
    const q = cur();
    if (d > 0) {
      collect(q);
      const err = validate(q);
      if (err) { const e = stage.querySelector(".flow-error"); if (e) { e.textContent = err; e.classList.remove("shake"); void e.offsetWidth; e.classList.add("shake"); } return; }
    } else if (q.type !== "intro" && q.type !== "review" && q.type !== "done") collect(q);
    const len = visible().length;
    i = Math.max(0, Math.min(len - 1, i + d));
    render(d);
  }

  async function send() {
    const btn = stage.querySelector("[type=submit]"); busy = true; btn.disabled = true; btn.textContent = "Sending…";
    const payload = { first: A.first, last: A.last, org: A.org, email: A.email, phone: A.phone, tier: A.tier, contribute: A.contribute || [],
      inkind: visible().some((x) => x.id === "inkind") ? A.inkind : "", displayName: A.displayName, website: A.website, heard: A.heard, message: A.message };
    try {
      const r = await fetch("/api/sponsors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const out = await r.json().catch(() => ({}));
      if (!r.ok) throw Object.assign(new Error(out.error || "offline"), { offline: r.status === 404 || r.status === 405 || r.status === 501 });
      try { localStorage.removeItem("pg-sponsor-draft"); } catch {}
      busy = false; i = visible().length - 1; render(1);
    } catch (e) {
      busy = false; btn.disabled = false; btn.innerHTML = 'Send my sponsorship <span class="arrow">→</span>';
      const body = Object.entries(payload).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v || ""}`).join("\n");
      const mail = `mailto:${contact}?subject=${encodeURIComponent("Sponsorship: " + (A.org || A.first))}&body=${encodeURIComponent(body)}`;
      let box = stage.querySelector(".flow-error"); if (!box) { box = document.createElement("p"); box.className = "flow-error"; stage.querySelector(".flow-actions").before(box); }
      box.innerHTML = e.offline || e.message === "offline" || e.name === "TypeError"
        ? `We couldn't reach our server. <a href="${mail}">Email your answers to us instead</a>.`
        : esc(e.message);
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
        A[q.key] = q.options.filter((o) => set.has(o)); c.setAttribute("aria-pressed", set.has(c.dataset.val)); save();
      } else {
        A[q.key] = c.dataset.val; save();
        stage.querySelectorAll("[aria-pressed]").forEach((b) => b.setAttribute("aria-pressed", b === c));
        setTimeout(() => go(1), 260); // single choice auto-advances
      }
    }
    const j = e.target.closest("[data-jump]");
    if (j) { i = visible().findIndex((q) => q.id === j.dataset.jump); A._fromReview = true; render(-1); }
  });
  document.addEventListener("keydown", (e) => {
    const q = cur(); if (!q) return;
    const inText = /INPUT|TEXTAREA/.test(document.activeElement?.tagName || "");
    if (e.key === "Enter" && document.activeElement?.tagName === "TEXTAREA" && !e.shiftKey) { e.preventDefault(); go(1); return; }
    // Enter always means "continue" (space still toggles a focused choice)
    if (e.key === "Enter" && !inText && (document.activeElement?.closest(".choice, .tier-card") || !document.activeElement?.closest("button, a"))) { e.preventDefault(); stage.requestSubmit(); return; }
    if (!inText && !e.metaKey && !e.ctrlKey && /^[a-z]$/i.test(e.key)) {
      const opts = stage.querySelectorAll(".choice, .tier-card"); const k = e.key.toUpperCase().charCodeAt(0) - 65;
      if (opts[k]) { opts[k].click(); opts[k].focus(); }
    }
  });
  $("[data-back]").addEventListener("click", () => go(-1));
  $("[data-fwd]").addEventListener("click", () => go(1));

  // after editing from the review screen, jump straight back to review
  const _go = go;
  go = function (d) {
    if (d > 0 && A._fromReview && !["review", "done", "intro"].includes(cur().type)) {
      collect(cur()); const err = validate(cur());
      if (err) return _go(d);
      delete A._fromReview; i = visible().findIndex((q) => q.type === "review"); return render(1);
    }
    return _go(d);
  };

  delete A._fromReview;
  render(1);
})();

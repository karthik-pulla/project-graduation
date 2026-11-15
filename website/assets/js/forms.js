/* ==========================================================================
   Questions for the one-at-a-time forms (engine: flow.js).
   Edit wording, options, and sponsor levels here.
   ========================================================================== */
(function () {
  const hl = (t) => `<span class='hl'>${t}</span>`;
  const NAME = { id: "name", type: "fields", label: "Name", q: `First things first. ${hl("What's your name?")}`,
    fields: [
      { key: "first", label: "First name", required: true, autocomplete: "given-name", placeholder: "Jordan" },
      { key: "last", label: "Last name", required: true, autocomplete: "family-name", placeholder: "Rivera" },
    ] };
  const EMAIL = (q) => ({ id: "email", type: "fields", label: "Email", q, fields: [{ key: "email", label: "Email", type: "email", required: true, autocomplete: "email", placeholder: "you@example.com" }] });
  const ANYTHING = { id: "message", type: "textarea", key: "message", label: "Notes", q: "Anything else we should know?", help: "Optional. Questions, ideas, timing, anything.", placeholder: "Type here…" };

  /* ---------------- sponsors ---------------- */
  const TIERS = [
    { title: "Freshman", big: "$250", perks: ["Name on our website", "Social media thank-you"] },
    { title: "Sophomore", big: "$500", perks: ["Everything in Freshman", "Name on the grad night banner"] },
    { title: "Junior", big: "$1,000", perks: ["Everything in Sophomore", "Logo on event T-shirts"] },
    { title: "Senior", big: "$2,500", perks: ["Everything in Junior", "Logo on banner and table signs"] },
    { title: "Valedictorian", big: "$5,000+", perks: ["Everything in Senior", "Presenting sponsor of grad night"] },
    { title: "Not sure yet", big: "Let's talk", perks: ["We'll help you find the right fit"] },
  ].map((t) => ({ ...t, value: `${t.title} (${t.big})` }));
  const INKIND = ["In-kind goods or services", "Raffle or door prizes", "Food or catering"];

  const sponsor = {
    endpoint: "/api/sponsors", offline: "mail", mailSubject: "Sponsorship", submitLabel: "Send my sponsorship",
    intro: { eyebrow: (A, c) => `sponsor the class of ${c.year}`, title: (A, c) => `Back the ${hl("Class of " + c.year)}.`,
      lede: "Local sponsors make grad night free for every Hillsborough High senior. A few quick questions, about two minutes, and we'll take it from there." },
    questions: [
      NAME,
      { id: "org", type: "fields", label: "Organization", q: (A, c) => `Nice to meet you, ${c.esc(A.first)}! Which ${hl("business or organization")} are you with?`,
        help: "Sponsoring as a family or individual? Just type your family name.",
        fields: [{ key: "org", label: "Organization", required: true, autocomplete: "organization", placeholder: "Hillsborough Hardware Co." }] },
      EMAIL(`What's the best ${hl("email")} to reach you?`),
      { id: "phone", type: "fields", label: "Phone", q: `And a ${hl("phone number")}?`, help: "Optional. We'd only call to coordinate a delivery or your logo.",
        fields: [{ key: "phone", label: "Phone", type: "tel", autocomplete: "tel", placeholder: "(555) 555-0123" }] },
      { id: "tier", type: "cards", key: "tier", label: "Level", required: true, q: `Which ${hl("sponsorship level")} fits?`, help: "Every level makes grad night free for a senior.", options: TIERS },
      { id: "contribute", type: "multi", key: "contribute", label: "Contribution", required: true, q: `How would you like to ${hl("contribute")}?`, help: "Pick as many as you like.",
        options: ["Cash or check donation", ...INKIND, "Volunteers from our team"] },
      { id: "inkind", type: "textarea", key: "inkind", label: "Donating", when: (A) => (A.contribute || []).some((c) => INKIND.includes(c)),
        q: `Tell us about what you'd like to ${hl("donate")}.`, help: "Rough is fine. We'll sort out details later.", placeholder: "e.g. two $50 gift cards and pizza for 40 volunteers" },
      { id: "display", type: "fields", label: "Listed as", q: `How should we ${hl("list you")} on the website and grad night signs?`, after: "Got a logo? We'll ask for it by email once you're confirmed.",
        fields: [
          { key: "displayName", label: "Display name", placeholder: "Hillsborough Hardware", prefill: (A) => A.org || "" },
          { key: "website", label: "Website", type: "url", required: false, placeholder: "https://" },
        ] },
      { id: "heard", type: "single", key: "heard", label: "Heard via", q: `How did you ${hl("hear about us")}?`, options: ["A student or parent", "Social media", "Another sponsor", "HHS newsletter", "Other"] },
      ANYTHING,
    ],
    done: (A, c) => ({ stickerText: "THX!", title: `You're ${hl("awesome")}, ${c.esc(A.first)}.`,
      lede: `Thanks for backing the Class of ${c.year}. Someone from our sponsor team will email <b>${c.esc(A.email)}</b> within a week with next steps.`,
      actions: `<a class="btn" href="index.html">Back to home</a><a class="btn btn-ghost" href="events.html">See events</a>` }),
  };

  /* ---------------- event pitches ---------------- */
  const pitch = {
    endpoint: "/api/ideas", offline: "mail", mailSubject: "Event idea", submitLabel: "Send my pitch",
    intro: { eyebrow: "pitch an event", title: `Got an idea that could ${hl("raise money")}?`,
      lede: "Clubs, teams, and families run some of our best fundraisers. Pitch yours in about three minutes. If it's a go, we'll help with planning, promo, and sign-ups." },
    questions: [
      NAME,
      EMAIL(`Where can we ${hl("email")} you about it?`),
      { id: "who", type: "single", key: "who", label: "Who's pitching", required: true, q: (A, c) => `Thanks, ${c.esc(A.first)}. ${hl("Who's behind")} this idea?`,
        options: ["HHS student", "A club or team", "Parent / family", "Teacher / staff", "Community member"] },
      { id: "club", type: "fields", label: "Club or team", when: (A) => A.who === "A club or team", q: `Which ${hl("club or team")}?`,
        fields: [{ key: "club", label: "Club or team", required: true, placeholder: "Robotics Club" }] },
      { id: "eventName", type: "fields", label: "Event name", q: `Give it a ${hl("working title")}.`, help: "Doesn't have to be final. Puns encouraged.",
        fields: [{ key: "eventName", label: "Event name", required: true, placeholder: "Dodgeball for Dollars" }] },
      { id: "kind", type: "single", key: "kind", label: "Type", required: true, q: `What ${hl("kind of event")} is it?`,
        options: ["Fundraiser night", "Hackathon or competition", "Sports or fitness", "Food sale", "Show or performance", "Something else"] },
      { id: "pitch", type: "textarea", key: "pitch", label: "The pitch", required: true, q: `Pitch it in ${hl("a few sentences")}.`, help: "What happens, who comes, and how it raises money.",
        placeholder: "Teams of 6 pay $30 to enter a dodgeball tournament. Teachers vs. seniors final…" },
      { id: "when", type: "single", key: "when", label: "Timing", q: `When could it ${hl("happen")}?`, options: ["This fall", "Winter break", "Spring semester", "Right before grad night", "Flexible"] },
      { id: "size", type: "single", key: "size", label: "Crowd", q: `About how many ${hl("people")} would come?`, options: ["Under 25", "25 – 100", "100 – 300", "300+", "No idea yet"] },
      { id: "raise", type: "single", key: "raise", label: "Could raise", q: `What could it ${hl("raise")}?`, help: "A guess is fine.", options: ["Under $500", "$500 – $2,000", "$2,000 – $5,000", "$5,000+", "Not sure"] },
      { id: "needs", type: "multi", key: "needs", label: "Needs", q: `What would you ${hl("need from us")}?`, help: "Pick any.",
        options: ["Booking a venue", "Promotion", "Volunteers", "Startup money", "A sign-up page on this site", "Just a green light"] },
      ANYTHING,
    ],
    done: (A, c) => ({ sticker: "plane", title: `Pitch ${hl("received")}!`,
      lede: `Thanks, ${c.esc(A.first)}. Our planning team reviews new ideas every couple of weeks. We'll email <b>${c.esc(A.email)}</b> either way.`,
      actions: `<a class="btn" href="get-involved.html">Back to Get involved</a><a class="btn btn-ghost" href="events.html">See events</a>` }),
  };

  /* ---------------- volunteer registration ---------------- */
  const student = (A) => (A.role || "").startsWith("HHS student");
  const volunteer = {
    endpoint: "/api/volunteers", offline: "none", submitLabel: "Create my volunteer account",
    intro: { eyebrow: "volunteer sign-up", title: `Join the ${hl("crew")}.`,
      lede: "Volunteers build grad night. Register once, get approved by an organizer, then pick shifts in the volunteer portal and track your service hours.",
      footnote: `Already registered? <a href="portal.html">Log in to the volunteer portal →</a>` },
    questions: [
      NAME,
      EMAIL(`What ${hl("email")} should we use?`),
      { id: "phone", type: "fields", label: "Phone", q: `Best ${hl("phone number")}?`, help: "For day-of updates only. We never share it.",
        fields: [{ key: "phone", label: "Phone", type: "tel", required: true, autocomplete: "tel", placeholder: "(555) 555-0123" }] },
      { id: "role", type: "single", key: "role", label: "I'm a", required: true, q: (A, c) => `Nice, ${c.esc(A.first)}! ${hl("Who are you")} to HHS?`,
        options: ["HHS student", "HHS parent / guardian", "Teacher / staff", "Alum", "Community member"] },
      { id: "grade", type: "single", key: "grade", label: "Grade", required: true, when: student, q: `What ${hl("grade")} are you in?`, options: ["9", "10", "11", "12"] },
      { id: "guardian", type: "fields", label: "Guardian email", when: student, q: `A ${hl("parent or guardian's email")}?`, help: "We'll let them know you signed up. Required for students.",
        fields: [{ key: "guardianEmail", label: "Parent or guardian email", type: "email", required: true, placeholder: "parent@example.com" }] },
      { id: "interests", type: "multi", key: "interests", label: "Interests", required: true, q: `What do you ${hl("like doing")}?`, help: "Pick as many as you like.",
        options: ["Setup & teardown", "Running a booth", "Food & concessions", "Tech & AV", "Decorating", "Check-in & greeting", "Photos & video", "Anything!"] },
      { id: "availability", type: "multi", key: "availability", label: "Availability", required: true, q: `When are you usually ${hl("free")}?`,
        options: ["Weekday evenings", "Saturdays", "Sundays", "School breaks", "Grad night (parents & alumni only)"] },
      { id: "shirt", type: "cards", key: "shirt", label: "T-shirt", compact: true, q: `${hl("Volunteer T-shirt")} size?`,
        options: ["XS", "S", "M", "L", "XL", "XXL"].map((x) => ({ value: x, title: x })) },
      { id: "serviceHours", type: "single", key: "serviceHours", label: "Service hours", q: `Need ${hl("service hours")} signed off?`, options: ["Yes, for school", "Yes, for another program", "No thanks"] },
      { id: "password", type: "fields", label: "Password", review: false, q: `Last bit: create a ${hl("portal password")}.`,
        help: "You'll log in to the volunteer portal with your email and this password. At least 8 characters.",
        fields: [
          { key: "password", label: "Password", type: "password", required: true, autocomplete: "new-password", placeholder: "••••••••" },
          { key: "confirm", label: "Type it again", type: "password", required: true, autocomplete: "new-password", placeholder: "••••••••", match: "password" },
        ] },
      { ...ANYTHING, q: "Anything we should know?", help: "Optional. Allergies, accessibility needs, questions…" },
    ],
    done: (A, c) => ({ sticker: "heart", title: `Welcome to the ${hl("crew")}, ${c.esc(A.first)}!`,
      lede: "Your account is waiting for an organizer's OK, usually within a couple of days. You can log in to the portal now to check your status; once you're approved, you can pick shifts there.",
      actions: `<a class="btn btn-maroon" href="portal.html">Go to the volunteer portal <span class="arrow">→</span></a><a class="btn btn-ghost" href="get-involved.html">Back to Get involved</a>` }),
  };

  window.PG_FORMS = { sponsor, pitch, volunteer };
})();

"""Generate the legal pages (privacy, terms, cookies, accessibility)."""
import re
import os
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..") + "/"
F = lambda t: f'<mark class="fill">{t}</mark>'   # placeholder to fill in
ORG = F("[Organization legal name]")
EMAIL = '<a href="mailto:hello@hhsprojectgrad.org">hello@hhsprojectgrad.org</a>'
EFFECTIVE = F("[Month Day, Year]")

PAGES = {
"privacy": ("Privacy Policy", "privacy", "What we collect, why, and how to get it deleted.", f"""
<p class="lead">Project Graduation is run by {ORG}, a {F("[nonprofit / parent-teacher organization]")} that supports Hillsborough High School's graduating class. We collect as little as we can, use it only to run our events, and never sell it.</p>

<h2 id="collect">What we collect</h2>
<ul>
<li><b>Event registrations:</b> name, email, your role (student, parent, and so on), grade if you're a student, and anything the event asks for, such as a team name, T-shirt size, or group size.</li>
<li><b>Volunteer accounts:</b> name, email, phone, role, grade, a parent or guardian's email for students, an emergency contact, your interests and availability, T-shirt size, the shifts you book, attendance, and service hours. Your password is stored only as a secure one-way hash; nobody, including organizers, can see it.</li>
<li><b>Sponsor applications and event pitches:</b> the contact details and answers you give us.</li>
<li><b>Donations and payments:</b> handled by our payment provider ({F("[Zeffy / Givebutter / Stripe]")}). We see your name, email, and the amount, but never your card or bank details.</li>
<li><b>Emails we send:</b> a log of what was sent, when, and to how many people.</li>
</ul>
<p>We don't use advertising, tracking pixels, or analytics that follow you around the web. See our <a href="cookies.html">cookie policy</a>.</p>

<h2 id="use">How we use it</h2>
<ul>
<li>To confirm registrations, run events, and manage waitlists.</li>
<li>To coordinate volunteers: approving accounts, scheduling shifts, taking attendance, and recording service hours.</li>
<li>To send meeting notices, reminders, and updates about events you signed up for.</li>
<li>To thank and follow up with sponsors and people who pitch events.</li>
<li>To keep the site secure and prevent abuse.</li>
</ul>

<h2 id="students">Students and minors</h2>
<p>This site is for the Hillsborough High School community. Students under 18 who register to volunteer must give a parent or guardian's email, and we let that parent or guardian know about the sign-up. We do not knowingly collect personal information from children under 13; if you're under 13, please don't use our forms. Parents and guardians can ask to see, correct, or delete their child's information at any time by emailing {EMAIL}.</p>

<h2 id="share">Who we share it with</h2>
<ul>
<li><b>Organizers</b> who need it to run an event or manage volunteers.</li>
<li><b>Service providers</b> that help us run the site: website hosting ({F("[host]")}), email delivery ({F("[email provider]")}), and payments ({F("[payment provider]")}). They may only use your information to provide their service to us.</li>
<li><b>Hillsborough High School staff</b>, if you ask us to verify service hours.</li>
<li><b>Authorities</b>, only if the law requires it or someone's safety is at risk.</li>
</ul>
<p>We never sell or rent your information.</p>

<h2 id="security">Security and retention</h2>
<p>The site uses HTTPS, the admin console and volunteer portal require passwords, and only organizers can see submissions. We keep registration and volunteer records until {F("[12 months]")} after grad night, then delete them, except for records we must keep for donations, taxes, or service-hour verification.</p>

<h2 id="choices">Your choices</h2>
<ul>
<li><b>See, fix, or delete your information:</b> email {EMAIL} and we'll respond within {F("[30 days]")}.</li>
<li><b>Volunteers</b> can update their phone, T-shirt size, interests, and availability in the volunteer portal.</li>
<li><b>Emails:</b> messages about events you signed up for are part of running them. If you'd rather not get them, tell us and we'll remove you.</li>
<li><b>Californians and others with state privacy rights</b> can exercise those rights the same way, by emailing us.</li>
</ul>

<h2 id="changes">Changes and contact</h2>
<p>If we change this policy, we'll update the date at the top and, for big changes, let registered users know. Questions? Email {EMAIL} or write to {ORG}, {F("[mailing address]")}.</p>
"""),

"terms": ("Terms of Use", "terms", "The ground rules for using this site and joining our events.", f"""
<p class="lead">By using this website or signing up for a Project Graduation event, you agree to these terms. They're written to be readable; if anything is unclear, email {EMAIL}.</p>

<h2 id="who">Who runs this</h2>
<p>This site is operated by {ORG} ("Project Graduation", "we"). We're an independent, volunteer-run {F("[nonprofit / parent organization]")} that raises money for Hillsborough High School's senior grad night. {F("[We are / are not]")} an official part of Hillsborough High School or the {F("[school district]")}.</p>

<h2 id="accounts">Registrations and accounts</h2>
<ul>
<li>Give accurate information, and register only yourself or people you're allowed to sign up.</li>
<li>Keep your volunteer portal password private. Tell us right away if you think someone else has it.</li>
<li>Spots are first come, first served. Waitlisted people are contacted if a spot opens.</li>
<li>We may cancel a registration or volunteer account that breaks these terms or our code of conduct.</li>
</ul>

<h2 id="volunteers">Volunteering</h2>
<ul>
<li>Volunteer accounts must be approved by an organizer before you can book shifts.</li>
<li>Students under 18 need a parent or guardian's permission and must follow school rules at every event.</li>
<li>Please cancel shifts at least two days ahead when you can.</li>
<li>Service hours are recorded by organizers based on attendance; we can't guarantee another program will accept them.</li>
<li>Grad night setup is limited to parents, guardians, staff, and alumni.</li>
</ul>

<h2 id="conduct">Code of conduct</h2>
<p>Be kind and respectful. No harassment, discrimination, drugs, alcohol, or weapons at any event. Organizers may remove anyone who puts others at risk. Grad night is a supervised, substance-free event.</p>

<h2 id="payments">Tickets, donations, and refunds</h2>
<ul>
<li>Payments are processed by {F("[payment provider]")} under their terms.</li>
<li>Donations are generally non-refundable. If you made a mistake, contact us within {F("[14 days]")}.</li>
<li>Event tickets are refundable if we cancel the event. Otherwise, refunds are {F("[at the organizers' discretion / available until X days before]")}.</li>
<li>Whether a donation is tax-deductible depends on our tax status: {F("[501(c)(3) EIN or 'not tax-deductible']")}.</li>
</ul>

<h2 id="media">Photos</h2>
<p>We may take photos or video at events and share them on this site or our social media. If you'd rather not appear, tell an organizer at the event or email us and we'll remove a photo of you.</p>

<h2 id="content">Things you send us</h2>
<p>When you pitch an event or send us ideas, you let us use them to plan fundraisers. Please don't send anything confidential.</p>

<h2 id="liability">Disclaimers</h2>
<p>We do our best to keep the site accurate and available, but it's provided "as is". To the extent the law allows, Project Graduation and its volunteers aren't liable for indirect losses from using the site. Participation in events is voluntary, and some activities may require a separate waiver.</p>

<h2 id="changes">Changes</h2>
<p>We may update these terms and will change the date at the top when we do. These terms are governed by the laws of {F("[State]")}.</p>
"""),

"cookies": ("Cookie Policy", "cookies", "Short version: no tracking, no ads, nothing to accept.", f"""
<p class="lead">We don't use advertising cookies, tracking pixels, or third-party analytics. That's why there's no cookie banner: everything below is strictly necessary for the site to work.</p>

<h2 id="what">What the site stores in your browser</h2>
<table class="legal-table">
<thead><tr><th>Name</th><th>Type</th><th>Why</th><th>How long</th></tr></thead>
<tbody>
<tr><td><code>pg-admin</code></td><td>Session storage</td><td>Keeps organizers signed in to the admin console</td><td>Until the tab closes or 12 hours</td></tr>
<tr><td><code>pg-vol</code></td><td>Session storage</td><td>Keeps volunteers logged in to the volunteer portal</td><td>Until the tab closes or 12 hours</td></tr>
<tr><td><code>pg-flow-…</code></td><td>Local storage</td><td>Saves your answers on a form so a refresh doesn't erase them (never your password)</td><td>Until you send the form</td></tr>
<tr><td><code>pg-regs</code></td><td>Local storage</td><td>Only on demo copies of the site without a server: remembers sign-ups in your browser</td><td>Until you clear your browser</td></tr>
</tbody></table>
<p>These are first-party and strictly necessary, so privacy laws don't require consent for them. You can clear them any time in your browser settings.</p>

<h2 id="third">Other services</h2>
<ul>
<li><b>Google Fonts:</b> our fonts load from Google's servers, which see your IP address. {F("[Optional: self-host the fonts to avoid this.]")}</li>
<li><b>Payment pages:</b> when you donate or buy tickets, you're taken to {F("[payment provider]")}, which uses its own cookies under its own policy.</li>
</ul>

<h2 id="changes">If this changes</h2>
<p>If we ever add analytics or anything that isn't strictly necessary, we'll update this page and ask for your consent first.</p>
"""),

"accessibility": ("Accessibility", "accessibility", "Everyone should be able to use this site and come to our events.", f"""
<p class="lead">We want this site to work for everyone, including people who use screen readers, keyboards, magnification, or reduced motion.</p>

<h2 id="goal">Our goal</h2>
<p>We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.1 at level AA. Here's what we've done so far:</p>
<ul>
<li>Everything works with a keyboard, with visible focus outlines.</li>
<li>If your device asks for reduced motion, the stickers, highlights, and the rocket logo stop animating.</li>
<li>Text and buttons are built for strong color contrast, and pages work when zoomed to 200%.</li>
<li>Forms have labels, clear error messages, and don't time out.</li>
<li>Decorative stickers are hidden from screen readers.</li>
</ul>

<h2 id="known">Known limitations</h2>
<ul>
<li>Dragging stickers needs a mouse or touch, but it's purely decorative.</li>
<li>Some partner sites we link to (like payment pages) are run by others and may not meet the same standard.</li>
</ul>

<h2 id="help">Need help or an accommodation?</h2>
<p>If something on the site doesn't work for you, or you need an accommodation at an event (seating, interpretation, dietary needs, and so on), email {EMAIL}. We'll reply within {F("[3 school days]")}.</p>
"""),
}

TEMPLATE = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title} · Project Graduation</title>
  <meta name="description" content="{desc}">
  <meta name="theme-color" content="#121114">
  <link rel="icon" href="assets/mark-maroon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/css/styles.css">
</head>
<body>
  <!-- TEMPLATE: replace every yellow-highlighted [bracket] and have someone qualified review before launch. -->
  <div data-site-header data-current="{key}"></div>

  <header class="hero compact on-dark legal-hero">
    <div class="wrap">
      <p class="eyebrow">the fine print</p>
      <h1>{title}</h1>
      <p class="lede">{desc}</p>
    </div>
    <svg class="tear" viewBox="0 0 1440 130" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <polygon fill="url(#pg-htg)" points="0,50 160,34 300,60 420,36 560,58 700,30 820,56 960,40 1100,66 1240,38 1440,52 1440,74 1240,60 1100,88 960,62 820,78 700,52 560,80 420,58 300,82 160,56 0,72"/>
      <polyline fill="none" stroke="#ccb179" stroke-width="3" stroke-linejoin="round" points="0,50 160,34 300,60 420,36 560,58 700,30 820,56 960,40 1100,66 1240,38 1440,52"/>
      <polygon style="fill:var(--paper)" points="0,72 160,56 300,82 420,58 560,80 700,52 820,78 960,62 1100,88 1240,60 1440,74 1440,130 0,130"/>
    </svg>
  </header>

  <main class="section-tight">
    <div class="wrap legal-wrap">
      <nav class="legal-toc" aria-label="On this page">
        <p class="eyebrow">on this page</p>
        <ul>{toc}</ul>
        <p class="eyebrow" style="margin-top:22px">more fine print</p>
        <ul>{others}</ul>
      </nav>
      <article class="legal">
        <p class="legal-date">Effective {effective}</p>
        {body}
      </article>
    </div>
  </main>

  <div data-site-footer></div>
  <script src="assets/js/data.js"></script>
  <script src="assets/js/stickers.js"></script>
  <script src="assets/js/nav.js"></script>
  <script src="assets/js/main.js"></script>
</body>
</html>
"""

for key, (title, k, desc, body) in PAGES.items():
    toc = "".join(f'<li><a href="#{i}">{re.sub("<[^>]+>", "", t)}</a></li>' for i, t in re.findall(r'<h2 id="([^"]+)">(.*?)</h2>', body))
    others = "".join(f'<li><a href="{o}.html">{PAGES[o][0]}</a></li>' for o in PAGES if o != key)
    open(OUT + f"{key}.html", "w").write(TEMPLATE.format(title=title, key=k, desc=desc, toc=toc, others=others, effective=EFFECTIVE, body=body.strip()))
print("written:", ", ".join(f"{k}.html" for k in PAGES))

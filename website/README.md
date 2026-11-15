# Project Graduation website

Plain HTML, CSS, and JS, plus a small Python server (standard library only, nothing to install) that stores events, sign-ups, volunteers, sponsors, event pitches, and the fundraising total.

## Run it

```bash
cd website && python3 server.py
```

- Site: http://localhost:8642
- Admin console: http://localhost:8642/admin.html
- Volunteer portal: http://localhost:8642/portal.html

On first start the server creates `.data/db.json` from `assets/js/data.js`. It also generates an admin password, saves it in `.data/admin_password.txt`, and prints it in the terminal. To choose your own password, start it with `ADMIN_PASSWORD=yourpassword python3 server.py`. The `.data/` folder is never served to visitors. Back it up, because it holds every registration, volunteer account, sponsor application, and pitch.

## Pages

| Page | What it does |
|---|---|
| `index.html` | Home: hero, category strip, event carousel, $100K ruler, about, ways to help, donate band, sponsors, FAQ |
| `events.html` | Events people attend, with filters, search, and the registration form. Volunteer shifts are not listed here. |
| `get-involved.html` | Hub for helping: volunteer sign-up, the volunteer portal, upcoming shifts, how volunteering works, and links to pitch, sponsor, and donate |
| `volunteer.html` | Volunteer registration, one question at a time. Ends with creating a portal password. |
| `portal.html` | Volunteer portal (email + password). Approved volunteers book and cancel shifts, see service hours, and edit their profile. |
| `pitch.html` | Pitch-an-event form, one question at a time |
| `sponsor.html` | Sponsor sign-up, one question at a time |
| `admin.html` | Password-protected console (details below) |

The one-question-at-a-time forms share one engine (`assets/js/flow.js`). Their questions, options, and sponsor levels live in `assets/js/forms.js`. They're keyboard friendly: <kbd>Enter</kbd> continues and letter keys pick options. Answers (never passwords) are saved in the browser until the form is sent.

The navbar, phone menu, and footer are shared across pages by `assets/js/nav.js`. Hovering the cap logo launches it like a rocket.

## Admin console

- **Overview:** money raised, upcoming events, sign-ups, volunteers waiting for approval, new sponsor applications and pitches, recent activity
- **Fundraising:** log a donation with one click, or edit the total, goal, grad night date, class year, donate link, and contact email. Changes go live right away.
- **Events:** add, edit, or delete events. You set capacity, price, and which extra questions the sign-up form asks (team, T-shirt, group size). Events with the **Volunteer** type don't appear on the Events page; they show up as shifts in the volunteer portal (list the shifts one per line). "Signed up offline" counts people who registered on paper or by Venmo, so the spots-left number stays accurate.
- **Registrations:** every sign-up, filterable by event and searchable, with CSV export
- **Volunteers:** everyone who registered. Approve them (they can't book shifts until you do), log service hours, see and remove their shifts, keep notes, and **Reset password** to give someone a temporary password. CSV export.
- **Event ideas:** every pitch from `pitch.html`. Set a status (New, Reviewing, Approved, Passed), keep notes, and use **Turn into event** to start an event pre-filled from the pitch. CSV export.
- **Sponsors:** every application from `sponsor.html`. Set a status (New, Contacted, Confirmed, Declined), keep notes, and flip **Show on website** to put a confirmed sponsor's name in the home page sponsor grid. CSV export.

Sponsor levels (Freshman $250 through Valedictorian $5,000+) are placeholders. Edit `TIERS` in `assets/js/forms.js`.

Volunteer passwords are stored as salted PBKDF2 hashes and never sent to the admin console.

## Hosting

The site needs `server.py` running for registrations, the forms, the volunteer portal, and the admin console. It runs on any host that runs Python 3.9 or newer (Render, Railway, Fly.io, a school server, and so on):

```bash
PUBLIC=1 PORT=8080 ADMIN_PASSWORD='something-long' python3 server.py
```

`PUBLIC=1` makes the server listen beyond localhost. Put it behind HTTPS (most hosts do this for you) so the admin password isn't sent in plain text. Make sure the host keeps `.data/` on a persistent disk.

On static-only hosting (GitHub Pages, Netlify), the public pages still load from `assets/js/data.js`. Event sign-ups then save only in each visitor's browser, the sponsor and pitch forms offer to email their answers instead, and volunteer registration, the volunteer portal, and the admin console won't work.

## Stickers

`assets/js/stickers.js` draws the cut-paper stickers. Each one gets a white border made of 8–10 long, uneven straight cuts with generous white space, like a sticker cut by hand with scissors. Three slightly nudged versions of the cut swap frame by frame for the stop-motion wobble.

```html
<div class="sticker-wrap" data-sticker="burst" style="left:10%; top:40px; width:100px; --r:-8deg"></div>
```

Available stickers: `burst`, `eyes`, `aplus`, `pencil`, `cursor`, `star`, `heart`, `code`, `ticket`, `bubble`, `badge`, `plane`, `mascot`, `cap`. Add `data-still` to make one wobble only on hover. The mascot and cap PNGs are made from the original logos by `tools/1_prepare_logos.py` and then `tools/2_cut_stickers.py` (both need Pillow and NumPy).

## Brand usage

- Maroon `#800000` and gold `#ccb179` are accents only. Most of the site is ink `#121114` and paper `#f6f5f1`.
- Highlighter: `<span class="hl">words</span>` is a solid gold marker block that wipes in on scroll. `hl-box` is the same block without the animation. `scribble` draws a hand-drawn underline and `circled` a hand-drawn circle.
- Type: Inter for headings and body, JetBrains Mono for labels, Caveat for handwritten notes.

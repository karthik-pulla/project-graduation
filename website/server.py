#!/usr/bin/env python3
"""
Project Graduation: site server + data API. Python 3.8+ standard library only.

    python3 server.py                     # http://localhost:8642
    ADMIN_PASSWORD=... python3 server.py  # choose the admin password
    PORT=8080 python3 server.py

Data lives in .data/db.json, which is created from assets/js/data.js on first
start and never served to the public. If ADMIN_PASSWORD isn't set, a random
password is generated, saved in .data/admin_password.txt, and printed at startup.
"""
import hmac, json, os, re, secrets, threading, time, uuid, mimetypes
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, unquote

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(ROOT, ".data")
DB_PATH = os.path.join(DATA_DIR, "db.json")
PW_PATH = os.path.join(DATA_DIR, "admin_password.txt")
SEED_PATH = os.path.join(ROOT, "assets", "js", "data.js")
PORT = int(os.environ.get("PORT", "8642"))
MAX_BODY = 64 * 1024
TOKEN_TTL = 12 * 3600

CATEGORIES = {"hackathon", "volunteer", "fundraiser", "community"}
THEMES = {"dark", "light", "gold", "maroon"}
EXTRAS = {"team", "experience", "shirt", "shift", "guests"}
SPONSOR_STATUS = {"new", "contacted", "confirmed", "declined"}

lock = threading.Lock()
sessions = {}            # token -> expiry
failed = {}              # ip -> (count, first_ts)


# ---------------------------------------------------------------- storage
def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")

def load_seed():
    with open(SEED_PATH, encoding="utf-8") as f:
        src = f.read()
    start = src.index("{", src.index("PG_SEED"))
    end = src.rindex("}") + 1
    seed = json.loads(src[start:end])
    seed.setdefault("sponsors", [])
    seed["registrations"] = []
    return seed

def read_db():
    with open(DB_PATH, encoding="utf-8") as f:
        return json.load(f)

def write_db(db):
    tmp = DB_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(db, f, indent=2)
    os.replace(tmp, DB_PATH)

def init_storage():
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(DB_PATH):
        write_db(load_seed())
        print("  created .data/db.json from assets/js/data.js")
    pw = os.environ.get("ADMIN_PASSWORD")
    if not pw:
        if os.path.exists(PW_PATH):
            pw = open(PW_PATH, encoding="utf-8").read().strip()
        else:
            pw = secrets.token_urlsafe(12)
            with open(PW_PATH, "w", encoding="utf-8") as f:
                f.write(pw + "\n")
            os.chmod(PW_PATH, 0o600)
        print(f"  admin password: {pw}   (saved in .data/admin_password.txt; set ADMIN_PASSWORD to change)")
    return pw


# ---------------------------------------------------------------- helpers
def s(v, n=200):
    return str(v if v is not None else "").strip()[:n]

def num(v, lo=0, hi=10**9):
    try:
        return max(lo, min(hi, int(float(v))))
    except (TypeError, ValueError):
        raise ValueError("expected a number")

def valid_email(v):
    return bool(re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", v))

def valid_dt(v):
    try:
        datetime.fromisoformat(v)
        return True
    except (TypeError, ValueError):
        return False

def slug(title, taken):
    base = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:40] or "event"
    out, i = base, 2
    while out in taken:
        out, i = f"{base}-{i}", i + 1
    return out

def count_regs(db, event_id):
    return sum(1 for r in db["registrations"] if r["eventId"] == event_id)

def public_view(db):
    events = []
    for e in db["events"]:
        pe = dict(e)
        pe["registered"] = e.get("registered", 0) + count_regs(db, e["id"])
        events.append(pe)
    sponsors = [{"name": sp["displayName"] or sp["org"], "website": sp.get("website", ""), "tier": sp.get("tier", "")}
                for sp in db["sponsors"] if sp.get("status") == "confirmed" and sp.get("showOnSite")]
    return {"config": db["config"], "events": events, "sponsors": sponsors}

def clean_event(d, existing=None):
    e = dict(existing or {})
    title = s(d.get("title", e.get("title")), 120)
    if not title:
        raise ValueError("Title is required")
    e["title"] = title
    cat = s(d.get("category", e.get("category", "fundraiser")))
    if cat not in CATEGORIES:
        raise ValueError("Unknown category")
    e["category"] = cat
    theme = s(d.get("theme", e.get("theme", "light")))
    e["theme"] = theme if theme in THEMES else "light"
    for k in ("start", "end"):
        v = s(d.get(k, e.get(k)), 25)
        if not valid_dt(v):
            raise ValueError(f"{k.title()} date/time is invalid")
        e[k] = v
    if e["end"] < e["start"]:
        raise ValueError("End must be after start")
    e["tag"] = s(d.get("tag", e.get("tag", "")), 24)
    e["location"] = s(d.get("location", e.get("location", "")), 120)
    e["price"] = s(d.get("price", e.get("price", "Free")), 40) or "Free"
    e["capacity"] = num(d.get("capacity", e.get("capacity", 50)), 1, 100000)
    e["registered"] = num(d.get("registered", e.get("registered", 0)), 0, 100000)
    e["blurb"] = s(d.get("blurb", e.get("blurb", "")), 400)
    extra = d.get("extra", e.get("extra", []))
    e["extra"] = [x for x in extra if x in EXTRAS] if isinstance(extra, list) else []
    shifts = d.get("shifts", e.get("shifts", []))
    e["shifts"] = [s(x, 40) for x in shifts if s(x, 40)][:12] if isinstance(shifts, list) else []
    if "shift" in e["extra"] and not e["shifts"]:
        e["extra"].remove("shift")
    return e


# ---------------------------------------------------------------- handler
class Handler(BaseHTTPRequestHandler):
    server_version = "ProjectGrad/1.0"

    def log_message(self, fmt, *args):
        print(f"  {self.command} {self.path} -> {args[1] if len(args) > 1 else ''}")

    # --- plumbing
    def send_json(self, obj, status=200):
        body = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def error(self, msg, status=400):
        self.send_json({"error": msg}, status)

    def body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n > MAX_BODY:
            raise ValueError("Request too large")
        raw = self.rfile.read(n) if n else b"{}"
        data = json.loads(raw or b"{}")
        if not isinstance(data, dict):
            raise ValueError("Expected a JSON object")
        return data

    def authed(self):
        h = self.headers.get("Authorization", "")
        tok = h[7:] if h.startswith("Bearer ") else ""
        exp = sessions.get(tok)
        if exp and exp > time.time():
            return True
        sessions.pop(tok, None)
        return False

    # --- static files (allowlist: root .html pages and /assets/)
    def serve_static(self, path):
        if path == "/":
            path = "/index.html"
        rel = unquote(path).lstrip("/")
        ok = (re.fullmatch(r"[a-z0-9_-]+\.html", rel) or rel.startswith("assets/")) and ".." not in rel
        full = os.path.join(ROOT, rel)
        if not ok or not os.path.isfile(full):
            return self.send_error(HTTPStatus.NOT_FOUND)
        ctype = mimetypes.guess_type(full)[0] or "application/octet-stream"
        with open(full, "rb") as f:
            data = f.read()
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(data)

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/site":
            with lock:
                return self.send_json(public_view(read_db()))
        if path == "/api/admin/data":
            if not self.authed():
                return self.error("Not signed in", 401)
            with lock:
                return self.send_json(read_db())
        if path.startswith("/api/"):
            return self.error("Not found", 404)
        self.serve_static(path)

    def do_POST(self):
        self.route("POST")

    def do_PUT(self):
        self.route("PUT")

    def do_PATCH(self):
        self.route("PATCH")

    def do_DELETE(self):
        self.route("DELETE")

    def route(self, method):
        path = urlparse(self.path).path
        try:
            data = self.body() if method in ("POST", "PUT", "PATCH") else {}
        except (ValueError, json.JSONDecodeError) as e:
            return self.error(str(e) or "Bad JSON")
        try:
            # ---------- public
            if method == "POST" and path == "/api/register":
                return self.register(data)
            if method == "POST" and path == "/api/sponsors":
                return self.sponsor_apply(data)
            if method == "POST" and path == "/api/admin/login":
                return self.login(data)

            # ---------- admin
            if not path.startswith("/api/admin/"):
                return self.error("Not found", 404)
            if not self.authed():
                return self.error("Not signed in", 401)
            if method == "POST" and path == "/api/admin/logout":
                sessions.pop(self.headers.get("Authorization", "")[7:], None)
                return self.send_json({"ok": True})
            if method == "PUT" and path == "/api/admin/config":
                return self.update_config(data)
            m = re.fullmatch(r"/api/admin/events(?:/([\w-]+))?", path)
            if m:
                return self.events(method, m.group(1), data)
            m = re.fullmatch(r"/api/admin/sponsors/([\w-]+)", path)
            if m:
                return self.sponsor_admin(method, m.group(1), data)
            m = re.fullmatch(r"/api/admin/registrations/([\w-]+)", path)
            if m and method == "DELETE":
                with lock:
                    db = read_db()
                    db["registrations"] = [r for r in db["registrations"] if r["code"] != m.group(1)]
                    write_db(db)
                return self.send_json({"ok": True})
            return self.error("Not found", 404)
        except ValueError as e:
            return self.error(str(e))

    # --- public actions
    def register(self, d):
        first, last, email = s(d.get("first"), 60), s(d.get("last"), 60), s(d.get("email"), 120)
        if not first or not last:
            raise ValueError("Name is required")
        if not valid_email(email):
            raise ValueError("Please enter a valid email")
        with lock:
            db = read_db()
            ev = next((e for e in db["events"] if e["id"] == d.get("eventId")), None)
            if not ev:
                raise ValueError("That event no longer exists")
            if ev["end"] < datetime.now().isoformat():
                raise ValueError("Registration for this event has closed")
            taken = ev.get("registered", 0) + count_regs(db, ev["id"])
            if any(r["eventId"] == ev["id"] and r["email"].lower() == email.lower() for r in db["registrations"]):
                raise ValueError("That email is already registered for this event")
            code = "PG-" + secrets.token_hex(2).upper()
            rec = {
                "code": code, "eventId": ev["id"], "at": now_iso(),
                "first": first, "last": last, "email": email,
                "role": s(d.get("role"), 40), "grade": s(d.get("grade"), 20),
                "team": s(d.get("team"), 60), "experience": s(d.get("experience"), 20),
                "shirt": s(d.get("shirt"), 5), "shift": s(d.get("shift"), 40),
                "guests": num(d.get("guests") or 1, 1, 20), "updates": bool(d.get("updates")),
                "waitlist": taken >= ev["capacity"],
            }
            db["registrations"].append(rec)
            write_db(db)
        self.send_json({"ok": True, "code": code, "waitlist": rec["waitlist"]}, 201)

    def sponsor_apply(self, d):
        first, email, org = s(d.get("first"), 60), s(d.get("email"), 120), s(d.get("org"), 120)
        if not first:
            raise ValueError("Name is required")
        if not valid_email(email):
            raise ValueError("Please enter a valid email")
        contrib = d.get("contribute") if isinstance(d.get("contribute"), list) else []
        rec = {
            "id": uuid.uuid4().hex[:10], "at": now_iso(), "status": "new", "showOnSite": False, "notes": "",
            "first": first, "last": s(d.get("last"), 60), "org": org, "email": email,
            "phone": s(d.get("phone"), 30), "tier": s(d.get("tier"), 40),
            "contribute": [s(x, 40) for x in contrib][:8], "inkind": s(d.get("inkind"), 600),
            "displayName": s(d.get("displayName"), 120), "website": s(d.get("website"), 200),
            "heard": s(d.get("heard"), 60), "message": s(d.get("message"), 1200),
        }
        with lock:
            db = read_db()
            db["sponsors"].append(rec)
            write_db(db)
        self.send_json({"ok": True, "id": rec["id"]}, 201)

    def login(self, d):
        ip = self.client_address[0]
        cnt, first = failed.get(ip, (0, time.time()))
        if time.time() - first > 900:
            cnt, first = 0, time.time()
        if cnt >= 8:
            return self.error("Too many attempts. Try again in 15 minutes.", 429)
        if hmac.compare_digest(s(d.get("password"), 200).encode(), ADMIN_PW.encode()):
            failed.pop(ip, None)
            tok = secrets.token_urlsafe(32)
            sessions[tok] = time.time() + TOKEN_TTL
            return self.send_json({"token": tok})
        failed[ip] = (cnt + 1, first)
        time.sleep(0.6)
        return self.error("Wrong password", 401)

    # --- admin actions
    def update_config(self, d):
        with lock:
            db = read_db()
            c = db["config"]
            if "goal" in d: c["goal"] = num(d["goal"], 1)
            if "raised" in d: c["raised"] = num(d["raised"], 0)
            if "classYear" in d: c["classYear"] = num(d["classYear"], 2000, 2100)
            if "gradNight" in d:
                if not valid_dt(s(d["gradNight"], 25)):
                    raise ValueError("Grad night date is invalid")
                c["gradNight"] = s(d["gradNight"], 25)
            for k in ("donateUrl", "contactEmail", "instagram"):
                if k in d: c[k] = s(d[k], 300)
            write_db(db)
            self.send_json(db["config"])

    def events(self, method, eid, d):
        with lock:
            db = read_db()
            if method == "POST" and not eid:
                ev = clean_event(d)
                ev["id"] = slug(ev["title"], {e["id"] for e in db["events"]})
                db["events"].append(ev)
                write_db(db)
                return self.send_json(ev, 201)
            idx = next((i for i, e in enumerate(db["events"]) if e["id"] == eid), None)
            if idx is None:
                return self.error("Event not found", 404)
            if method == "PUT":
                db["events"][idx] = clean_event(d, db["events"][idx])
                write_db(db)
                return self.send_json(db["events"][idx])
            if method == "DELETE":
                db["events"].pop(idx)
                db["registrations"] = [r for r in db["registrations"] if r["eventId"] != eid]
                write_db(db)
                return self.send_json({"ok": True})
        return self.error("Not found", 404)

    def sponsor_admin(self, method, sid, d):
        with lock:
            db = read_db()
            sp = next((x for x in db["sponsors"] if x["id"] == sid), None)
            if not sp:
                return self.error("Sponsor not found", 404)
            if method == "PATCH":
                if "status" in d:
                    if d["status"] not in SPONSOR_STATUS:
                        raise ValueError("Unknown status")
                    sp["status"] = d["status"]
                if "showOnSite" in d: sp["showOnSite"] = bool(d["showOnSite"])
                if "notes" in d: sp["notes"] = s(d["notes"], 2000)
                if "displayName" in d: sp["displayName"] = s(d["displayName"], 120)
                write_db(db)
                return self.send_json(sp)
            if method == "DELETE":
                db["sponsors"].remove(sp)
                write_db(db)
                return self.send_json({"ok": True})
        return self.error("Not found", 404)


if __name__ == "__main__":
    print("Project Graduation server")
    ADMIN_PW = init_storage()
    httpd = ThreadingHTTPServer(("0.0.0.0" if os.environ.get("PUBLIC") else "127.0.0.1", PORT), Handler)
    print(f"  site:  http://localhost:{PORT}\n  admin: http://localhost:{PORT}/admin.html")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass

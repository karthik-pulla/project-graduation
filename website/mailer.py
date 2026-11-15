"""
Email for Project Graduation. Standard library only (smtplib).

Works with any SMTP account. Set these environment variables before starting
server.py (nothing is sent until SMTP_HOST is set):

    SMTP_HOST      e.g. smtp-relay.brevo.com, smtp.gmail.com
    SMTP_PORT      587 (STARTTLS, default) or 465 (SSL)
    SMTP_USER      SMTP username / login
    SMTP_PASS      SMTP password or app password
    MAIL_FROM      "Project Graduation <hello@yourdomain.org>"
    ADMIN_EMAIL    optional: where new-application alerts go
    SITE_URL       optional: e.g. https://hhsprojectgrad.org (used for links)
    SMTP_TLS       set to 0 only for a local test mail server
"""
import html, os, smtplib, ssl, threading
from datetime import datetime, timedelta
from email.message import EmailMessage
from email.utils import make_msgid, formatdate

HOST = os.environ.get("SMTP_HOST", "")
PORT = int(os.environ.get("SMTP_PORT", "587"))
USER = os.environ.get("SMTP_USER", "")
PASS = os.environ.get("SMTP_PASS", "")
FROM = os.environ.get("MAIL_FROM", USER or "Project Graduation <no-reply@localhost>")
ADMIN = os.environ.get("ADMIN_EMAIL", "")
SITE = os.environ.get("SITE_URL", "http://localhost:8642").rstrip("/")
TLS = os.environ.get("SMTP_TLS", "1") != "0"   # only turn off for a local test mail server


def configured():
    return bool(HOST)


def page(title, body_html, cta=None):
    """Simple branded HTML email (inline styles for email clients)."""
    button = (f'<p style="margin:26px 0 8px"><a href="{html.escape(cta[1])}" style="background:#800000;color:#fff;'
              f'text-decoration:none;padding:12px 20px;border-radius:999px;font-weight:700;display:inline-block">{html.escape(cta[0])}</a></p>') if cta else ""
    return f"""<!doctype html><html><body style="margin:0;background:#f6f5f1;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#121114">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 14px">
<table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:18px;overflow:hidden">
<tr><td style="background:#121114;padding:20px 26px;color:#fff;font-weight:700;font-size:17px">Project <span style="color:#ccb179">Graduation</span>
<div style="font-weight:400;color:#9a97a0;font-size:12px;margin-top:2px">Hillsborough High School</div></td></tr>
<tr><td style="padding:26px 26px 30px;font-size:15px;line-height:1.55">
<h1 style="font-size:22px;letter-spacing:-.02em;margin:0 0 14px">{html.escape(title)}</h1>{body_html}{button}</td></tr>
<tr><td style="padding:16px 26px 22px;color:#6b6872;font-size:12px;border-top:1px solid #eee">
You're getting this because you signed up on the Project Graduation website.
<a href="{SITE}/privacy.html" style="color:#6b6872">Privacy policy</a></td></tr>
</table></td></tr></table></body></html>"""


def ics(uid, title, start, end=None, where="", details=""):
    """Calendar invite. start/end are local 'YYYY-MM-DDTHH:MM[:SS]' strings (floating time)."""
    fmt = lambda d: d.strftime("%Y%m%dT%H%M%S")
    s = datetime.fromisoformat(start)
    e = datetime.fromisoformat(end) if end else s + timedelta(hours=1)
    esc = lambda t: (t or "").replace("\\", "\\\\").replace(";", r"\;").replace(",", r"\,").replace("\n", r"\n")
    return "\r\n".join([
        "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Project Graduation//EN", "METHOD:PUBLISH", "BEGIN:VEVENT",
        f"UID:{uid}@projectgrad", f"DTSTAMP:{datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')}",
        f"DTSTART:{fmt(s)}", f"DTEND:{fmt(e)}", f"SUMMARY:{esc(title)}", f"LOCATION:{esc(where)}",
        f"DESCRIPTION:{esc(details)}", "END:VEVENT", "END:VCALENDAR", ""])


def _send_one(smtp, to, subject, text, html_body, invite):
    msg = EmailMessage()
    msg["From"], msg["To"], msg["Subject"] = FROM, to, subject
    msg["Date"], msg["Message-ID"] = formatdate(localtime=True), make_msgid()
    msg.set_content(text)
    if html_body:
        msg.add_alternative(html_body, subtype="html")
    if invite:
        msg.add_attachment(invite.encode(), maintype="text", subtype="calendar", filename="invite.ics")
    smtp.send_message(msg)


def send(recipients, subject, text, html_body=None, invite=None, on_done=None):
    """Send one message per recipient in a background thread (addresses are never shared).
    on_done(result) gets {"sent": n, "failed": [emails], "skipped": reason or None}."""
    recipients = sorted({r.strip() for r in recipients if r and "@" in r})

    def work():
        result = {"sent": 0, "failed": [], "skipped": None}
        if not recipients:
            result["skipped"] = "no recipients"
        elif not configured():
            result["skipped"] = "email not set up"
            print(f"  [mail] not sent (email not set up): {subject!r} to {len(recipients)} recipient(s)")
        else:
            try:
                if PORT == 465:
                    smtp = smtplib.SMTP_SSL(HOST, PORT, context=ssl.create_default_context(), timeout=20)
                else:
                    smtp = smtplib.SMTP(HOST, PORT, timeout=20)
                    if TLS:
                        smtp.starttls(context=ssl.create_default_context())
                with smtp:
                    if USER:
                        smtp.login(USER, PASS)
                    for to in recipients:
                        try:
                            _send_one(smtp, to, subject, text, html_body, invite)
                            result["sent"] += 1
                        except Exception as e:  # keep going for the rest
                            print(f"  [mail] failed to {to}: {e}")
                            result["failed"].append(to)
            except Exception as e:
                print(f"  [mail] SMTP error: {e}")
                result["failed"] = recipients
        if on_done:
            on_done(result)

    threading.Thread(target=work, daemon=True).start()

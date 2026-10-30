"""Private SETAEI unified Control Room, mounted on the existing authenticated GBP bridge.

All Google numbers are loaded by the browser from the already-authenticated,
read-only GBP dashboard API. Public SEO marketing pages remain unchanged.
"""
from pathlib import Path

from flask import Blueprint, abort, make_response, send_file, session, request

BASE = Path(__file__).resolve().parent
BP = Blueprint("setaei_unified_control_room", __name__)

def require_admin():
    if session.get("admin") is not True:
        abort(403)

@BP.get("/seo/google/control-room")
@BP.get("/seo/google/control-room/")
def control_room():
    require_admin()
    return send_file(BASE / "setai_control_room.html", mimetype="text/html")

@BP.get("/seo/google/control-room.css")
def control_room_css():
    require_admin()
    return send_file(BASE / "setai_control_room.css", mimetype="text/css")

@BP.get("/seo/google/control-room.js")
def control_room_js():
    require_admin()
    return send_file(BASE / "setai_control_room.js", mimetype="application/javascript")

def register_control_room(app):
    app.register_blueprint(BP)
    # The original OAuth app applies a restrictive CSP globally; the dashboard
    # needs local JS/CSS, same-origin XHR, and an embedded same-origin SEO archive.
    # Insert first: Flask invokes after_request hooks in reverse registration order.
    def set_control_room_headers(response):
        path = request.path
        if path in ("/seo/google/control-room", "/seo/google/control-room/"):
            response.headers["Content-Security-Policy"] = (
                "default-src 'none'; script-src 'self'; style-src 'self'; "
                "connect-src 'self'; frame-src 'self'; img-src 'self' data:; "
                "font-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'")
            response.headers["X-Robots-Tag"] = "noindex, nofollow, noarchive"
            response.headers["Cache-Control"] = "private, no-store"
        elif path in ("/seo/google/control-room.js", "/seo/google/control-room.css"):
            response.headers["Content-Security-Policy"] = "default-src 'none'; base-uri 'none'"
            response.headers["Cache-Control"] = "private, no-store"
        return response
    app.after_request_funcs.setdefault(None, []).insert(0, set_control_room_headers)

"""SETAEI Google Business Profile OAuth bridge.

Standalone Flask application served *only* behind an HTTPS Nginx proxy.
No OAuth client secrets are kept in this source file or the application ZIP.
"""
import hashlib
import hmac
import json
import os
import secrets
import tempfile
import time
from pathlib import Path
from urllib.parse import urlencode

import requests
from cryptography.fernet import Fernet, InvalidToken
from flask import Flask, redirect, render_template_string, request, session, url_for

BASE = '/seo/google'
CALLBACK = 'https://setai.no/seo/google/callback'
SCOPE = 'https://www.googleapis.com/auth/business.manage'
ACCOUNT_API = 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts'
LOCATION_API = 'https://mybusinessbusinessinformation.googleapis.com/v1/accounts/-/locations'
CREDS_PATH = Path(os.environ.get('SETAEI_GBP_CLIENT_JSON', '/etc/setai-gbp/credentials.json'))
TOKEN_PATH = Path(os.environ.get('SETAEI_GBP_TOKEN_FILE', '/var/lib/setai-gbp/oauth-token.enc'))

app = Flask(__name__)
app.config.update(
    SECRET_KEY=os.environ.get('SETAEI_GBP_SESSION_SECRET') or secrets.token_hex(32),
    SESSION_COOKIE_NAME='setai_gbp_auth',
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    SESSION_COOKIE_PATH=BASE,
    PERMANENT_SESSION_LIFETIME=3600,
    MAX_CONTENT_LENGTH=32768,
)

PAGE = '''<!doctype html><html lang="no"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SETAEI · Google Business Profile</title><style>
:root{color-scheme:light}body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;
background:#f3f5f9;color:#162237;margin:0}main{max-width:750px;margin:8vh auto;
background:white;padding:clamp(20px,5vw,44px);border:1px solid #e2e7ed;border-radius:22px;
box-shadow:0 20px 65px #17233c11}h1{font-size:1.7rem;margin-top:0}
p{line-height:1.55}.sub{color:#64748b}.good{color:#137e4a}.warn{color:#994e00}
button,.btn{background:#13233b;color:white;padding:12px 19px;border:0;border-radius:11px;
cursor:pointer;font-weight:650;display:inline-block;text-decoration:none;font-size:1rem;margin:8px 6px 0 0}
input{padding:12px;border:1px solid #c9d3dd;border-radius:8px;width:95%;max-width:410px}
form{margin:10px 0}ul{padding-left:22px}li{padding:8px 0;border-bottom:1px solid #e9edf2}
small{color:#64748b}code{overflow-wrap:anywhere}</style></head><body><main>
<p class="sub">SETAEI / SEO CONTROL ROOM</p><h1>{{ title }}</h1>
{% if message %}<p class="{{ 'good' if ok else 'warn' }}">{{ message }}</p>{% endif %}
{{ content|safe }}<p><small>Google Business Profile API · sikker serverbasert OAuth</small></p>
</main></body></html>'''


def page(title, content, message='', ok=False, **values):
    from flask import render_template_string as render
    # All untrusted Google values are rendered by Jinja escaping, not concatenated into HTML.
    body = render(content, **values)
    result = render_template_string(PAGE, title=title, content=body, message=message, ok=ok)
    return result


@app.after_request
def security_headers(response):
    response.headers['Cache-Control'] = 'no-store, private'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Referrer-Policy'] = 'no-referrer'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Content-Security-Policy'] = "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"
    return response


def is_admin():
    return bool(session.get('admin') is True)


def csrf():
    if 'csrf' not in session:
        session['csrf'] = secrets.token_urlsafe(32)
    return session['csrf']


def valid_csrf():
    return hmac.compare_digest(str(session.get('csrf') or ''), str(request.form.get('csrf') or ''))


def require_admin():
    if not is_admin():
        return redirect(BASE + '/')
    return None


def client_config():
    data = json.loads(CREDS_PATH.read_text(encoding='utf-8'))['web']
    if CALLBACK not in data['redirect_uris']:
        raise ValueError('Callback does not match Google Cloud OAuth client')
    return data


def fernet():
    return Fernet(os.environ['SETAEI_GBP_FERNET_KEY'].encode('ascii'))


def token_available():
    return TOKEN_PATH.is_file()


def read_token():
    try:
        return json.loads(fernet().decrypt(TOKEN_PATH.read_bytes()).decode('utf-8'))
    except (FileNotFoundError, InvalidToken, ValueError) as exc:
        raise RuntimeError('Ingen gyldig lagret Google-tilkobling. Koble til på nytt.') from exc


def save_token(data):
    TOKEN_PATH.parent.mkdir(parents=True, exist_ok=True)
    encrypted = fernet().encrypt(json.dumps(data, ensure_ascii=False).encode('utf-8'))
    fd, temporary = tempfile.mkstemp(prefix='.gbp-', dir=str(TOKEN_PATH.parent))
    try:
        os.fchmod(fd, 0o600)
        with os.fdopen(fd, 'wb') as dest:
            dest.write(encrypted)
            dest.flush()
            os.fsync(dest.fileno())
        os.replace(temporary, TOKEN_PATH)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def google_access_token():
    current = read_token()
    cfg = client_config()
    r = requests.post(cfg['token_uri'], data={
        'client_id': cfg['client_id'], 'client_secret': cfg['client_secret'],
        'refresh_token': current['refresh_token'], 'grant_type': 'refresh_token',
    }, timeout=20)
    if not r.ok:
        raise RuntimeError('Google kunne ikke fornye tilgang (HTTP %d). Koble til på nytt hvis nødvendig.' % r.status_code)
    return r.json()['access_token']


def google_get(url, params=None):
    response = requests.get(url, params=params, headers={
        'Authorization': 'Bearer ' + google_access_token(),
        'X-GOOG-API-FORMAT-VERSION': '2',
    }, timeout=20)
    if not response.ok:
        raise RuntimeError('Google API svarte HTTP %d. Kontroller API-aktivering, kvote og profiltilgang.' % response.status_code)
    return response.json()


@app.get(BASE + '/health')
def health():
    return {'service': 'setaei-google-business-profile-oauth', 'status': 'up'}


@app.route(BASE + '/', methods=['GET'])
def home():
    if not is_admin():
        return page('Administratortilgang', '''<p>Logg inn for å koble SETAEI til Google Business Profile.</p>
        <form method="post" action="{{ base }}/login"><label for="pwd">Administratorkode</label><br>
        <input id="pwd" name="password" type="password" required autocomplete="current-password"><br>
        <button>Logg inn</button></form>''', base=BASE)
    current = token_available()
    return page('Google Business Profile', '''
        <p class="{{ 'good' if connected else 'warn' }}">{{ 'Google OAuth-token er lagret kryptert.' if connected else 'Ikke koblet til Google ennå.' }}</p>
        <form method="post" action="{{ base }}/connect"><input type="hidden" name="csrf" value="{{ csrf }}">
          <button>{{ 'Koble til Google på nytt' if connected else 'Koble til Google' }}</button></form>
        {% if connected %}<p><a class="btn" href="{{ base }}/test">Test API-tilgang</a>
        <a class="btn" href="{{ base }}/locations">Vis tilgjengelige bedrifter</a></p>{% endif %}
        <form method="post" action="{{ base }}/logout"><input type="hidden" name="csrf" value="{{ csrf }}">
          <button>Logg ut</button></form>
        <p><small>Du kobler kun til Google-kontoer og profiler du har lovlig tilgang til. Denne modulen leser data; den gjør ingen endringer i Google.</small></p>
    ''', connected=current, base=BASE, csrf=csrf())


@app.post(BASE + '/login')
def login():
    pwd = request.form.get('password') or ''
    salt = bytes.fromhex(os.environ.get('SETAEI_GBP_ADMIN_SALT', ''))
    expected = bytes.fromhex(os.environ.get('SETAEI_GBP_ADMIN_HASH', ''))
    if len(pwd) > 1024 or not salt or not expected:
        return page('Innlogging mislyktes', '<p>Kontakt systemadministrator.</p>'), 403
    candidate = hashlib.pbkdf2_hmac('sha256', pwd.encode('utf-8'), salt, 220000)
    if not hmac.compare_digest(candidate, expected):
        # Constant-time hash comparison; random, installer-generated admin password.
        return page('Innlogging mislyktes', '<p>Feil administratorkode. <a href="/seo/google/">Prøv igjen</a>.</p>'), 403
    session.clear()
    session.permanent = True
    session['admin'] = True
    return redirect(BASE + '/')


@app.post(BASE + '/logout')
def logout():
    if not valid_csrf():
        return 'Ugyldig sikkerhetskode', 403
    session.clear()
    return redirect(BASE + '/')


@app.post(BASE + '/connect')
def connect():
    not_allowed = require_admin()
    if not_allowed:
        return not_allowed
    if not valid_csrf():
        return 'Ugyldig sikkerhetskode', 403
    cfg = client_config()
    state = secrets.token_urlsafe(32)
    session['oauth_state'] = state
    session['oauth_started'] = int(time.time())
    query = urlencode({
        'client_id': cfg['client_id'], 'response_type': 'code', 'redirect_uri': CALLBACK,
        'scope': SCOPE, 'access_type': 'offline', 'prompt': 'consent',
        'state': state, 'include_granted_scopes': 'true',
    })
    return redirect('https://accounts.google.com/o/oauth2/v2/auth?' + query, code=303)


@app.get(BASE + '/callback')
def callback():
    not_allowed = require_admin()
    if not_allowed:
        return not_allowed
    expected = session.pop('oauth_state', '')
    started = session.pop('oauth_started', 0)
    actual = request.args.get('state', '')
    if not expected or not hmac.compare_digest(expected, actual) or time.time() - started > 600:
        return page('Ugyldig OAuth-retur', '<p>OAuth-sikkerhetskontroll mislyktes. Start tilkoblingen på nytt.</p>'), 403
    if 'error' in request.args:
        return page('Google-tilgang ikke gitt', '<p>Google avbrøt godkjenningen. Start tilkoblingen på nytt.</p>'), 400
    code = request.args.get('code', '')
    if not code or len(code) > 8192:
        return 'Mangler gyldig godkjenningskode', 400
    cfg = client_config()
    try:
        result = requests.post(cfg['token_uri'], data={
            'code': code, 'client_id': cfg['client_id'],
            'client_secret': cfg['client_secret'], 'redirect_uri': CALLBACK,
            'grant_type': 'authorization_code',
        }, timeout=20)
        if not result.ok:
            raise RuntimeError('Tokenveksling feilet (HTTP %d). Se om OAuth-samtykke og testbruker er riktig satt opp.' % result.status_code)
        data = result.json()
        if SCOPE not in str(data.get('scope', '')).split():
            raise RuntimeError('Google ga ikke business.manage-tilgangen.')
        refresh = data.get('refresh_token')
        if not refresh:
            raise RuntimeError('Google sendte ikke refresh token. Fjern tidligere tilgang og godkjenn på nytt.')
        save_token({'refresh_token': refresh, 'scope': SCOPE, 'saved_at': int(time.time())})
    except (requests.RequestException, ValueError, KeyError, RuntimeError) as exc:
        # Exception text is controlled here; never include authorization code or token response.
        msg = str(exc) if isinstance(exc, RuntimeError) else 'Nettverks-/formatfeil mot Google.'
        return page('Tilkobling mislyktes', '<p>{{ error }}</p><p><a href="/seo/google/">Tilbake</a></p>', error=msg), 502
    return redirect(BASE + '/test', code=303)


@app.get(BASE + '/test')
def test_api():
    not_allowed = require_admin()
    if not_allowed:
        return not_allowed
    try:
        data = google_get(ACCOUNT_API, {'pageSize': 20})
        accounts = [{'name': a.get('name', ''), 'title': a.get('accountName', 'Uten navn')}
                    for a in data.get('accounts', [])]
        return page('Google API-test', '''<p class="good">Google API svarer. Kontoer du kan administrere:</p>
        {% if accounts %}<ul>{% for a in accounts %}<li><b>{{ a.title }}</b><br><small>{{ a.name }}</small></li>{% endfor %}</ul>
        {% else %}<p>Ingen kontoer returnert. Kontroller at den valgte Google-kontoen har profiltilgang.</p>{% endif %}
        <p><a class="btn" href="{{ base }}/locations">Vis bedrifter</a><a href="{{ base }}/">Tilbake</a></p>''',
                    accounts=accounts, base=BASE)
    except (RuntimeError, requests.RequestException, ValueError, KeyError) as exc:
        msg = str(exc) if isinstance(exc, RuntimeError) else 'Google-forespørselen feilet.'
        return page('API-test mislyktes', '<p>{{ error }}</p><p><a href="/seo/google/">Tilbake</a></p>', error=msg), 502


@app.get(BASE + '/locations')
def locations():
    not_allowed = require_admin()
    if not_allowed:
        return not_allowed
    try:
        results = []
        page_token = None
        for _ in range(10):  # Cap to 1,000 locations per test to avoid excessive API calls.
            params = {'readMask': 'name,title,storeCode,websiteUri,phoneNumbers', 'pageSize': 100}
            if page_token:
                params['pageToken'] = page_token
            data = google_get(LOCATION_API, params)
            for entry in data.get('locations', []):
                results.append({'name': entry.get('name', ''), 'title': entry.get('title', 'Uten navn'),
                                'website': entry.get('websiteUri', '')})
            page_token = data.get('nextPageToken')
            if not page_token:
                break
        return page('Google-bedriftsprofiler', '''<p>{{ count }} tilgjengelige oppføringer (maks 1000 vist).</p>
            {% if locations %}<ul>{% for l in locations %}<li><b>{{ l.title }}</b>
            <br><small>{{ l.name }} {{ l.website }}</small></li>{% endfor %}</ul>
            {% else %}<p>Ingen bedriftsprofiler returnert for denne Google-kontoen.</p>{% endif %}
            <p><a href="{{ base }}/">Tilbake</a></p>''', locations=results, count=len(results), base=BASE)
    except (RuntimeError, requests.RequestException, ValueError, KeyError) as exc:
        msg = str(exc) if isinstance(exc, RuntimeError) else 'Google-forespørselen feilet.'
        return page('Kunne ikke hente bedriftsprofiler', '<p>{{ error }}</p><p><a href="/seo/google/">Tilbake</a></p>', error=msg), 502
#!/usr/bin/env bash
# SETAEI GBP OAuth: rotate exposed admin password and diagnose local 8767 binding.
set -Eeuo pipefail
if [ "$(id -u)" -ne 0 ]; then echo "Run with sudo"; exit 1; fi
umask 077
python3 - <<'PY'
import hashlib, os, pathlib, re, secrets, tempfile, time
env = pathlib.Path('/etc/setai-gbp/service.env')
if not env.is_file():
    raise SystemExit('STOP: /etc/setai-gbp/service.env not found')
old = env.read_text()
for key in ('SETAEI_GBP_ADMIN_HASH','SETAEI_GBP_ADMIN_SALT'):
    if len(re.findall(r'(?m)^'+key+r'=',old)) != 1:
        raise SystemExit('STOP: invalid admin environment variable: '+key)
password=secrets.token_urlsafe(30)
salt=secrets.token_bytes(20)
digest=hashlib.pbkdf2_hmac('sha256',password.encode('utf-8'),salt,220000)
new=re.sub(r'(?m)^SETAEI_GBP_ADMIN_SALT=.*$', 'SETAEI_GBP_ADMIN_SALT='+salt.hex(),old)
new=re.sub(r'(?m)^SETAEI_GBP_ADMIN_HASH=.*$', 'SETAEI_GBP_ADMIN_HASH='+digest.hex(),new)
st=env.stat()
with tempfile.NamedTemporaryFile('w',dir=str(env.parent),prefix='.service.env.',delete=False) as f:
    temp=pathlib.Path(f.name)
    f.write(new)
    f.flush()
    os.fsync(f.fileno())
os.chown(temp,st.st_uid,st.st_gid)
os.chmod(temp,st.st_mode & 0o777)
os.replace(temp,env)
safe=pathlib.Path('/root')/('setai-gbp-new-admin-'+time.strftime('%Y%m%dT%H%M%SZ',time.gmtime())+'.txt')
fd=os.open(str(safe), os.O_WRONLY|os.O_CREAT|os.O_EXCL, 0o600)
with os.fdopen(fd,'w') as f:
    f.write(password+'\n')
print('Admin password rotated. New password saved privately in: '+str(safe))
print('Do not paste that file or its contents into chat.')
PY
systemctl reset-failed setai-gbp-oauth.service || true
systemctl restart setai-gbp-oauth.service || true
sleep 2
echo '=== SYSTEMD STATUS ==='
systemctl show setai-gbp-oauth.service -p ActiveState -p SubState -p MainPID --no-pager
echo '=== TCP PORT 8767 LISTENER ==='
ss -ltnp '( sport = :8767 )' || true
echo '=== EXPECTED HEALTH RESULT ==='
python3 - <<'PY'
import urllib.request, urllib.error
url='http://127.0.0.1:8767/seo/google/health'
try:
    with urllib.request.urlopen(url,timeout=6) as response:
        body=response.read(500).decode('utf-8','replace')
        print('HTTP',response.status,'Content-Type',response.headers.get('Content-Type'))
        print('Body preview:',body[:240].replace('\n',' '))
        if '"service":"setaei-google-business-profile-oauth"' in body and '"status":"up"' in body:
            print('EXPECTED_OAUTH_APP=YES')
        else:
            print('EXPECTED_OAUTH_APP=NO')
except Exception as exc:
    print('HEALTH_ERROR:',str(exc)[:250])
PY
echo '=== LAST 12 SERVICE LOG LINES ==='
journalctl -u setai-gbp-oauth.service -n 12 --no-pager --output=short || true
echo '=== END DIAGNOSTICS ==='

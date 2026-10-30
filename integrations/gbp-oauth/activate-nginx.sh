#!/usr/bin/env bash
# SETAEI GBP OAuth: safely add HTTPS reverse-proxy include and rotate exposed admin password.
set -Eeuo pipefail
if [ "$(id -u)" -ne 0 ]; then echo "Run as root with sudo."; exit 1; fi
python3 - <<'PY'
from pathlib import Path
import datetime, hashlib, os, re, secrets, shutil, subprocess, sys

config_link = Path('/etc/nginx/sites-enabled/setai.no.conf')
snippet = Path('/etc/nginx/snippets/setai-gbp-oauth.conf')
envfile = Path('/etc/setai-gbp/service.env')
if not config_link.exists() or not snippet.is_file() or not envfile.is_file():
    sys.exit('STOP: Nginx config, GBP snippet, or service.env missing; nothing changed.')
if 'location ^~ /seo/google/' not in snippet.read_text():
    sys.exit('STOP: Unexpected Nginx snippet; nothing changed.')
if subprocess.run(['systemctl','is-active','--quiet','setai-gbp-oauth.service']).returncode:
    sys.exit('STOP: OAuth service is not active; nothing changed.')
if subprocess.run(['curl','-fsS','--max-time','6','http://127.0.0.1:8767/seo/google/health'],
                  stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode:
    sys.exit('STOP: OAuth service local health check failed; nothing changed.')

config = config_link.resolve(strict=True)
original = config.read_text()
def block_end(text, start):
    depth=0; quote=None; escaped=False; comment=False
    for i in range(start,len(text)):
        c=text[i]
        if comment:
            if c=='\n': comment=False
            continue
        if escaped:
            escaped=False
            continue
        if c=='\\':
            escaped=True
            continue
        if quote:
            if c==quote: quote=None
            continue
        if c=='#': comment=True
        elif c in ("'",'"'): quote=c
        elif c=='{': depth+=1
        elif c=='}':
            depth-=1
            if depth==0: return i+1
    raise RuntimeError('Unbalanced server block; refusing to edit Nginx.')

candidates=[]
for m in re.finditer(r'(?m)^[ \t]*server[ \t]*\{', original):
    end=block_end(original,m.end()-1)
    block=original[m.start():end]
    names=re.findall(r'(?m)^[ \t]*server_name[ \t]+([^;\n]+);',block)
    if not any('setai.no' in namestr.split() for namestr in names): continue
    listens=re.findall(r'(?m)^[ \t]*listen[ \t]+([^;\n]+);',block)
    ssl=any(re.search(r'(^|\s)ssl($|\s)',x) for x in listens)
    ssl=ssl or (bool(re.search(r'(?m)^[ \t]*ssl_certificate\s+',block)) and
                any(re.search(r'(?<!\d)443(?:0)?(?!\d)',x) for x in listens))
    if ssl: candidates.append((m.start(),end,block))

if len(candidates)!=1:
    sys.exit(f'STOP: Expected exactly 1 SSL server block for setai.no; found {len(candidates)}. No changes.')
start,end,block=candidates[0]
if 'include /etc/nginx/snippets/setai-gbp-oauth.conf;' in block:
    print('Nginx OAuth include already present in setai.no HTTPS block.')
    nginx_changed=False
    backup=None
else:
    match=re.search(r'(?m)^[ \t]*server_name[ \t]+[^;\n]*\bsetai\.no\b[^;\n]*;[^\n]*\n',block)
    if not match: sys.exit('STOP: Could not locate single-line server_name; no changes.')
    modified=block[:match.end()]+'    include /etc/nginx/snippets/setai-gbp-oauth.conf;\n'+block[match.end():]
    new_config=original[:start]+modified+original[end:]
    stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    backup=Path('/root')/f'setai-no-nginx-before-gbp-{stamp}.conf'
    shutil.copy2(config,backup)
    config.write_text(new_config)
    nginx_changed=True
    test=subprocess.run(['nginx','-t'],capture_output=True,text=True)
    if test.returncode:
        shutil.copy2(backup,config)
        sys.exit('STOP: nginx -t failed; original config restored.\n'+test.stderr[-1800:])
    print('Nginx syntax checked; backup:',backup)

env_text=envfile.read_text()
if len(re.findall(r'(?m)^SETAEI_GBP_ADMIN_SALT=',env_text))!=1 or len(re.findall(r'(?m)^SETAEI_GBP_ADMIN_HASH=',env_text))!=1:
    if nginx_changed: shutil.copy2(backup,config)
    sys.exit('STOP: Unexpected admin secret format; Nginx config restored.')
stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
env_backup=Path('/root')/f'setai-gbp-env-before-admin-rotate-{stamp}.bak'
shutil.copy2(envfile,env_backup)
os.chmod(env_backup,0o600)
password=secrets.token_urlsafe(28)
salt=secrets.token_bytes(20)
digest=hashlib.pbkdf2_hmac('sha256',password.encode('utf-8'),salt,220000)
env_text=re.sub(r'(?m)^SETAEI_GBP_ADMIN_SALT=.*$', 'SETAEI_GBP_ADMIN_SALT='+salt.hex(),env_text)
env_text=re.sub(r'(?m)^SETAEI_GBP_ADMIN_HASH=.*$', 'SETAEI_GBP_ADMIN_HASH='+digest.hex(),env_text)
envfile.write_text(env_text)

restart=subprocess.run(['systemctl','restart','setai-gbp-oauth.service'])
if restart.returncode:
    shutil.copy2(env_backup,envfile)
    subprocess.run(['systemctl','restart','setai-gbp-oauth.service'])
    if nginx_changed: shutil.copy2(backup,config)
    sys.exit('STOP: OAuth service failed to restart; original credentials and Nginx config restored.')
if subprocess.run(['curl','-fsS','--max-time','6','http://127.0.0.1:8767/seo/google/health'],
                  stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode:
    shutil.copy2(env_backup,envfile)
    subprocess.run(['systemctl','restart','setai-gbp-oauth.service'])
    if nginx_changed: shutil.copy2(backup,config)
    sys.exit('STOP: OAuth service health failed after rotation; restored originals.')

print('\nNEW SETAEI GBP OAUTH ADMIN PASSWORD (save privately; do not send screenshots):')
print(password)
print('Previous admin password is no longer valid.\n')
nginx_test=subprocess.run(['nginx','-t'])
if nginx_test.returncode:
    if nginx_changed: shutil.copy2(backup,config)
    sys.exit('STOP: nginx validation failed; Nginx config restored.')
reload=subprocess.run(['systemctl','reload','nginx'])
if reload.returncode:
    if nginx_changed:
        shutil.copy2(backup,config)
        subprocess.run(['nginx','-t'])
        subprocess.run(['systemctl','reload','nginx'])
    sys.exit('STOP: Nginx reload failed; attempted to restore previous Nginx config. New admin password remains valid.')
print('SUCCESS: Nginx OAuth route activated. Open https://setai.no/seo/google/')
print('Next: Sign in with new admin password, connect Google and approve access.')
PY
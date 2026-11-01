#!/usr/bin/env python3
"""KSH product pages: prevent the header shop link forcing horizontal scrolling at 884px."""
from pathlib import Path
from datetime import datetime,timezone
import shutil
root=Path('/var/www/setai/ksh/fliskonkurrenten')
path=root/'assets/ksh-consistency-v15.css'
s=path.read_text()
if 'KSH_FOLD_NAV_V151' not in s:
 s+='''
/* KSH_FOLD_NAV_V151: preserve full-width responsive UI on dual/tri-fold devices */
@media(max-width:1250px){
 body[data-ksh-brand="fliskonkurrenten"] .ksh2-head .ksh2-nav,
 body[data-ksh-brand="fliskonkurrenten"] .ksh2-head .ksh2-shop {
   display:none!important;
 }
 body[data-ksh-brand="fliskonkurrenten"] .ksh2-head .ksh2-toggle{
   display:flex!important;
   align-items:center;
   justify-content:center;
   margin-left:auto;
   flex:none;
   min-width:44px;
   min-height:44px;
 }
 body[data-ksh-brand="fliskonkurrenten"] .ksh2-head[data-open="true"] .ksh2-nav{
   display:flex!important;
   position:absolute;
   left:0;right:0;top:100%;
   box-sizing:border-box;
   width:100%;
   max-height:min(74svh,650px);
   overflow-y:auto;
   flex-direction:column;
   align-items:stretch;
   background:#f6f5f0;
   padding:14px 22px 22px;
   box-shadow:0 20px 45px #0002;
   z-index:50;
 }
 body[data-ksh-brand="fliskonkurrenten"] .ksh2-head[data-open="true"] .ksh2-nav a{
   color:#1c2923;display:block;min-height:44px;padding:12px 10px;
   border-bottom:1px solid #d1d5cd;box-sizing:border-box;
 }
}
@media(max-width:1250px) and (min-width:700px){
 body[data-ksh-brand="fliskonkurrenten"] .ksh2-head{
  min-width:0;
  max-width:100%;
 }
}
'''
 path.write_text(s);path.chmod(0o644);print('CSS FIXED')
count=0
for p in root.rglob('index.html'):
 try:s=p.read_text()
 except Exception:continue
 if 'ksh-consistency-v15.css?v=15' not in s:continue
 s2=s.replace('ksh-consistency-v15.css?v=15','ksh-consistency-v15.css?v=15.1')
 if s2!=s:
  p.write_text(s2);p.chmod(0o644);count+=1
print('CACHE BUST',count)

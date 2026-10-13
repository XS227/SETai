"""Add the browser preview gate to static pages and generated HTML."""
import re,sys
from pathlib import Path
SNIPPET='<style id="preview-access-critical">html[data-preview-locked] body>*{display:none!important}html[data-preview-locked] body>#preview-gate{display:grid!important}html[data-preview-locked]{overflow:hidden}</style><script src="preview-access.js?v=1"></script>'
def preview_gate(text):
 if 'id="preview-access-critical"' not in text:
  assert text.count('</head>')==1;text=text.replace('</head>',SNIPPET+'</head>')
 if 'data-preview-locked' not in re.search(r'<html\b[^>]*>',text).group():
  text=re.sub(r'<html\b', '<html data-preview-locked',text,count=1)
 return text
if __name__=='__main__':
 root=Path(sys.argv[1]);pages=list(root.glob('*.html'));assert pages
 for p in pages:
  p.write_text(preview_gate(p.read_text()))
 print('Preview gate added to',len(pages),'HTML pages.')

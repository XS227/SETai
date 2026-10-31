#!/usr/bin/env python3
"""Prepare all page edits before writing, preserve originals, and roll back on failure."""
from pathlib import Path
from html.parser import HTMLParser
import colorsys, hashlib, html, json, re, shutil, sys

PREFIX='/ksh/assets/ksh-v6/'
BRANDS={'heimslig','heimdal-naturstein','fliskonkurrenten','flyt-gulv'}
class Spans(HTMLParser):
    def __init__(self,source,tag,predicate):
        super().__init__(convert_charrefs=False);self.source=source;self.tag=tag;self.predicate=predicate;self.depth=0;self.start=None;self.spans=[]
        self.lines=[0]
        for m in re.finditer('\n',source):self.lines.append(m.end())
        self.feed(source)
    def pos(self):
        row,col=self.getpos();return self.lines[row-1]+col
    def handle_starttag(self,tag,attrs):
        if tag!=self.tag:return
        if self.depth:self.depth+=1
        elif self.predicate(dict(attrs)):self.start=self.pos();self.depth=1
    def handle_endtag(self,tag):
        if tag==self.tag and self.depth:
            self.depth-=1
            if self.depth==0:self.spans.append((self.start,self.source.index('>',self.pos())+1))
def replace_elements(source,tag,predicate,replacement):
    for start,end in reversed(Spans(source,tag,predicate).spans):source=source[:start]+replacement+source[end:]
    return source
def recolor(css,brand):
    """Warm existing green UI colors while preserving luminance, alpha and image URLs."""
    hue={'heimslig':31,'heimdal-naturstein':38,'fliskonkurrenten':22,'flyt-gulv':28}[brand]/360
    def change(rgb):
        h,l,s=colorsys.rgb_to_hls(*(x/255 for x in rgb))
        if not 65/360<h<200/360 or s<.04:return rgb
        saturation=min(s*.4,.16 if brand=='flyt-gulv' else .25)
        return tuple(round(x*255) for x in colorsys.hls_to_rgb(hue,l,saturation))
    def token(m):
        v=m.group()
        if v.lower().startswith('url'):return v
        if v.startswith('#'):
            code=v[1:];rgb=tuple(int(code[i:i+2],16) for i in (0,2,4));out=change(rgb)
            return '#'+''.join(f'{x:02x}' for x in out)+code[6:]
        nums=re.findall(r'[\d.]+',v);rgb=tuple(int(float(n)) for n in nums[:3]);out=change(rgb)
        if out==rgb:return v
        return ('rgba' if len(nums)>3 else 'rgb')+'('+','.join(map(str,out))+(','+nums[3] if len(nums)>3 else '')+')'
    return re.sub(r'url\([^)]*\)|#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?\b|rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*[\d.]+)?\s*\)',token,css,flags=re.I)
def apply(root,stage,backup):
    root,stage,backup=map(lambda p:Path(p).resolve(),(root,stage,backup))
    if not (root/'heimslig/3d-studio/index.html').is_file():raise RuntimeError('Eksisterende Heimslig-studio mangler. Ingen endringer utført.')
    footer=(stage/'footer.html').read_text();plans={};counts={'pages':0,'studios':0,'social':0};skins={}
    for p in sorted(root.rglob('*.html')):
        rel=p.relative_to(root)
        if p.is_symlink() or any(x.startswith('.') or x in ('assets','backups','backup','node_modules','vendor') for x in rel.parts):continue
        text=p.read_text(encoding='utf-8')
        if not re.search('</head>',text,re.I) or not re.search('</body>',text,re.I):continue
        brand=rel.parts[0] if rel.parts[0] in BRANDS else 'ksh'
        text=re.sub(r'\sdata-ksh-brand="[^"]*"','',text)
        text=re.sub(r'<body\b',f'<body data-ksh-brand="{brand}"',text,count=1,flags=re.I)
        text=re.sub(r'\n?<!-- KSH_V6_START -->.*?<!-- KSH_V6_END -->','',text,flags=re.S)
        text=re.sub(r'<link\b[^>]*href=["\']/ksh/assets/ksh-v6/(?:brand|room-studio)\.css[^"\']*["\'][^>]*>','',text,flags=re.I)
        # Brand variants copy CSS to a dedicated folder; original CSS remains untouched.
        if brand in BRANDS:
            def skin(m):
                url=html.unescape(m.group(2));clean=url.split('?')[0]
                if not clean.startswith('/ksh/') or clean.startswith(PREFIX) or not clean.endswith('.css'):return m.group()
                source=(root/clean[len('/ksh/'):]).resolve()
                if not source.is_relative_to(root) or not source.is_file():return m.group()
                filename=brand+'-'+hashlib.sha256(clean.encode()).hexdigest()[:12]+'.css'
                dest=root/'assets/ksh-v6/skins'/filename
                css=source.read_text()
                # Resolve relative URLs because the copied stylesheet has a new directory.
                from urllib.parse import urljoin
                css=re.sub(r'url\(["\']?([^\)"\']+)["\']?\)',lambda u:'url("'+(u.group(1) if u.group(1).startswith(('data:','http:','https:','/','#')) else urljoin(clean,u.group(1)))+'")',css)
                skins[dest]=recolor(css,brand).encode()
                return m.group(1)+PREFIX+'skins/'+filename+'?v=6.1'+m.group(3)
            text=re.sub(r'(<link\b[^>]*href=["\'])([^"\']+)(["\'][^>]*>)',skin,text,flags=re.I)
            text=re.sub(r'(<style\b[^>]*>)(.*?)(</style>)',lambda m:m.group(1)+recolor(m.group(2),brand)+m.group(3),text,flags=re.S|re.I)
        # Same server-rendered footer everywhere, including pages with no JavaScript.
        if re.search(r'<footer\b',text,re.I):
            spans=Spans(text,'footer',lambda _:True).spans
            if len(spans)!=1:raise RuntimeError(f'Forventet én footer: {rel}')
            text=replace_elements(text,'footer',lambda _:True,footer)
        else:text=re.sub('</body>',footer+'\n</body>',text,count=1,flags=re.I)
        tags=['<script defer src="'+PREFIX+'site.js?v=6.1"></script>','<script defer src="'+PREFIX+'social.js?v=6.1"></script>']
        head=['<link rel="stylesheet" href="'+PREFIX+'brand.css?v=6.1">']
        if brand=='heimslig':
            text=re.sub(r'\n?<!-- HEIMSLIG_V5_START -->.*?<!-- HEIMSLIG_V5_END -->','',text,flags=re.S)
            text=re.sub(r'<script\b[^>]*src=["\']/ksh/heimslig/assets/v[45]/[^"\']+\.js[^"\']*["\'][^>]*>\s*</script>','',text,flags=re.I)
            # Remove v5 CSS even when previously copied to a skin by this installation.
            text=re.sub(r'<link\b[^>]*href=["\']/ksh/heimslig/assets/v5/room-studio\.css[^"\']*["\'][^>]*>','',text,flags=re.I)
        is_studio=bool(re.search(r'id=["\']heimsligViewer["\']',text))
        if is_studio:
            counts['studios']+=1
            text=re.sub(r'<script\b[^>]*src=["\']/ksh/assets/showroom\.js[^"\']*["\'][^>]*>\s*</script>','',text,flags=re.I)
            head+=['<link rel="stylesheet" href="'+PREFIX+'room-studio.css?v=6.1">','<script type="importmap">{"imports":{"three":"'+PREFIX+'vendor/build/three.module.js"}}</script>']
            # Remove import map from previous installation before adding the one above.
            text=re.sub(r'<script type="importmap">\{"imports":\{"three":"/ksh/assets/ksh-v6/[^<]+</script>','',text)
            tags+=['<script src="'+PREFIX+'room-data.js?v=6.1"></script>','<script type="module" src="'+PREFIX+'room-studio.js?v=6.1"></script>']
            text=text.replace('Dette studioet kan kobles til faktiske produkter og materialprøver etter selskapets godkjenning.','Velg dokumenterte fliser fra Fliskonkurrenten. Be om materialprøver og bekreft dagens pris før bestilling.')
        social_page=brand in BRANDS and (len(rel.parts)==2 or any(part in ('social','inspirasjon','sosiale-medier') for part in rel.parts))
        if social_page:
            group={'fliskonkurrenten':'flis','heimdal-naturstein':'heimdal'}.get(brand,'group')
            section=f'<section id="sosialt" data-ksh-social="{group}"></section>'
            matched=Spans(text,'section',lambda a:a.get('id') in ('sosialt','instagram') or 'data-ksh-social' in a).spans
            if matched:
                text=replace_elements(text,'section',lambda a:a.get('id') in ('sosialt','instagram') or 'data-ksh-social' in a,section)
            else:text=text.replace('<footer class="k6-footer"',section+'\n<footer class="k6-footer"',1)
            text=re.sub(r"fetch\('./posts\.json'.*?\.catch\(function\(\)\{\}\);",'',text,flags=re.S)
            counts['social']+=1
        text=re.sub('</head>','\n'+'\n'.join(head)+'\n</head>',text,count=1,flags=re.I)
        text=re.sub('</body>','\n<!-- KSH_V6_START -->\n'+'\n'.join(tags)+'\n<!-- KSH_V6_END -->\n</body>',text,count=1,flags=re.I)
        if text.count('class="k6-footer"')!=1:raise RuntimeError(f'Footer-kontroll feilet: {rel}')
        plans[p]=text.encode();counts['pages']+=1
    if counts['studios']!=1:raise RuntimeError('Forventet ett Heimslig-studio. Ingen endringer utført.')
    identity=(stage/'identity.html').read_text().replace('</body>',footer+'</body>')
    plans[root/'identitet/index.html']=identity.encode()
    for name in ('brand.css','room-data.js','room-renderer.js','room-studio.js','room-studio.css','social.js','site.js','SOURCES.md'):
        plans[root/'assets/ksh-v6'/name]=(stage/name).read_bytes()
    for folder in ('assets','vendor'):
        for p in (stage/folder).rglob('*'):
            if p.is_file():plans[root/'assets/ksh-v6'/p.relative_to(stage)]=p.read_bytes()
    plans.update(skins)
    shared=root/'fliskonkurrenten/assets/ksh-four-products-v2.js'
    if shared.is_file():
        js=shared.read_text().replace("if(!document.getElementById('ksh2-site-foot')){","if(!document.querySelector('.k6-footer')&&!document.getElementById('ksh2-site-foot')){")
        plans[shared]=js.encode()

    backup.mkdir(parents=True,exist_ok=False);new=[]
    for p in plans:
        rel=p.relative_to(root)
        if p.exists():
            dest=backup/rel;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dest)
        else:new.append(str(rel))
    (backup/'new-files.json').write_text(json.dumps(new))
    written=[]
    try:
        # Assets before pages; every individual replacement is atomic.
        for p,data in sorted(plans.items(),key=lambda pair:pair[0].suffix=='.html'):
            p.parent.mkdir(parents=True,exist_ok=True);temp=p.with_name(p.name+'.ksh-v6.tmp');temp.write_bytes(data);temp.chmod(p.stat().st_mode&0o777 if p.exists() else 0o644);temp.replace(p);written.append(p)
    except BaseException:
        for p in reversed(written):
            original=backup/p.relative_to(root)
            if original.exists():shutil.copy2(original,p)
            elif str(p.relative_to(root)) in new:p.unlink(missing_ok=True)
        raise
    print(json.dumps(counts,ensure_ascii=False));print('Sikkerhetskopi:',backup);print('Tilbakestill: sudo cp -a '+str(backup)+'/. '+str(root)+'/')
if __name__=='__main__':apply(*sys.argv[1:4])

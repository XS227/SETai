from pathlib import Path
import tempfile,shutil,re,importlib.util,hashlib
spec=importlib.util.spec_from_file_location('installer',Path(__file__).with_name('apply_site.py'));mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
source=Path(__file__).resolve().parent

def fixture(root):
    for sourcefile,target in [('heimslig-studio.html','heimslig/3d-studio/index.html'),('live-heimdal-about.html','heimdal-naturstein/om-oss/index.html'),('live-fk.html','fliskonkurrenten/index.html'),('live-flyt.html','flyt-gulv/index.html')]:
        p=root/target;p.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source/'research'/sourcefile,p)
    shutil.copytree(source/'research/snapshot',root,dirs_exist_ok=True)

with tempfile.TemporaryDirectory() as tmp:
    root=Path(tmp)/'site';root.mkdir();fixture(root)
    about=root/'heimdal-naturstein/om-oss/index.html'
    before=re.search(r'<main\b.*?</main>',about.read_text(),re.S).group()
    mod.apply(root,source,Path(tmp)/'backup1')
    assert re.search(r'<main\b.*?</main>',about.read_text(),re.S).group()==before,'Personal about body changed'
    footers=[]
    for p in root.rglob('*.html'):
        text=p.read_text();assert text.count('class="k6-footer"')==1,p
        footers.append(re.search(r'<footer\b.*?</footer>',text,re.S).group())
    assert len(set(footers))==1,'Footers differ'
    mod.apply(root,source,Path(tmp)/'backup2')
    for p in root.rglob('*.html'):
        text=p.read_text();assert text.count('class="k6-footer"')==1,p
        assert text.count('data-ksh-social=')<=1,p
        assert text.count('type="importmap"')<=1,p
        assert len(re.findall(r'<script[^>]+src="/ksh/assets/ksh-v6/room-studio.js',text))<=1,p
    studio=(root/'heimslig/3d-studio/index.html').read_text();assert '/v5/room-studio.js' not in studio;assert 'ksh-v6/room-studio.js' in studio
    css=root/'assets/style.css';assert css.read_bytes()==(source/'research/snapshot/assets/style.css').read_bytes(),'Original stylesheet changed'
    assert (Path(tmp)/'backup1/heimslig/3d-studio/index.html').exists()
    print('PASS: shared footer, rerun safety, preserved about body, preserved original CSS, backups.')

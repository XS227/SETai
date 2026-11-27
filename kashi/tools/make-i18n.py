# Build v2/js/i18n.js from keys.json, translations.txt (index|IS|FA) and translations-no.txt (index|NO).
import json,os,re
os.chdir(os.path.dirname(os.path.abspath(__file__)))
keys=json.load(open('keys.json'))
ph=lambda s:sorted(re.findall(r'\{\w+\}',s))
out={'NO':{},'IS':{},'FA':{}}
for name,langs in (('translations.txt',['IS','FA']),('translations-no.txt',['NO'])):
    for line in open(name,encoding='utf-8').read().splitlines():
        if not line: continue
        i,*vals=line.split('|'); i=int(i); assert len(vals)==len(langs),(name,i)
        for lang,v in zip(langs,vals):
            assert ph(v)==ph(keys[i]),(name,i,keys[i]); out[lang][keys[i]]=v
for lang,d in out.items(): assert len(d)==len(keys),(lang,len(d),len(keys),[k for k in keys if k not in d][:5])
open('../v2/js/i18n.js','w',encoding='utf-8').write('/* Norwegian, Icelandic and Persian strings, keyed by the English text. Native-language review pending. */\nwindow.KI18N = '+json.dumps(out,ensure_ascii=False,indent=1)+';\n')
print(len(keys),'strings x',len(out),'languages')

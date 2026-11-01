/* SETAEI KSH / FLISKONKURRENTEN – Tile material studio v15.
   All product photos are retailer-origin references; previews are approximations. */
const root='/ksh/fliskonkurrenten/';
const tiles=()=>Array.isArray(window.KSHTiles?.tiles)?window.KSHTiles.tiles:[];
export const getTile=id=>tiles().find(x=>x.id===id)||null;
const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const specs={
  earth:{title:'Varm jordtone',wall:'warm',floor:'oak',kelvin:2850,secondary:['vedum','zup'],
    variants:['Varme naturmaterialer','Kontrast med mørke detaljer','Rolig skandinavisk']},
  warm:{title:'Lune naturtoner',wall:'warm',floor:'oak',kelvin:2950,secondary:['vedum','sense'],
    variants:['Varm og harmonisk','Naturstein og kontrast','Lyst og klassisk']},
  neutral:{title:'Lys og tidløs',wall:'chalk',floor:'windsor',kelvin:3100,secondary:['sense','vedum'],
    variants:['Lyst og luftig','Varme aksenter','Moderne kontrast']},
  cool:{title:'Elegant kontrast',wall:'chalk',floor:'cemento',kelvin:3200,secondary:['sense','vedum'],
    variants:['Stein og lys','Varm balanse','Mørke detaljer']},
  dark:{title:'Mørk og eksklusiv',wall:'warm',floor:'oak',kelvin:2750,secondary:['sense','zup'],
    variants:['Lunt og eksklusivt','Lys kontrast','Urban monokrom']},
  sage:{title:'Dempet natur',wall:'warm',floor:'oak',kelvin:2950,secondary:['vedum','sense'],
    variants:['Grønt og varmt','Lys trestil','Naturstein og ro']}
};
export function palette(tile,variant=0){
 const base=specs[tile?.tone]||specs.neutral;
 const options=[{wall:base.wall,floor:base.floor,kelvin:base.kelvin,name:base.variants[0]},
 {wall:tile?.tone==='dark'?'chalk':'clay',floor:'cemento',kelvin:2950,name:base.variants[1]},
 {wall:'chalk',floor:'windsor',kelvin:3450,name:base.variants[2]}];
 return {...base,...options[variant]||options[0]};
}
export function styleRoom(s,tile,index=0){
 const m=palette(tile,index);
 s.tileId=tile.id;
 s.tileSurface=s.tileSurface==='floor'?'floor':'wall';
 s.tileStyle=index;
 s.wall=m.wall;
 s.wallCustomized=true;
 s.daylight='evening';
 s.lightBrightness=index===1?76:80;
 s.lightTemperature=m.kelvin;
 s.lightCustomized=true;
 if(s.tileSurface==='wall')s.floor=m.floor;
 return m;
}
export function applyTileTexture(T,renderer,s){
 const tile=getTile(s.tileId);if(!tile||!renderer?.room)return;
 const tex=new T.TextureLoader().load(tile.texture,()=>renderer.draw(),undefined,()=>renderer.status?.('Kunne ikke laste flisfoto. Materialet kan fortsatt velges.'));
 tex.colorSpace=T.SRGBColorSpace;
 tex.wrapS=tex.wrapT=T.RepeatWrapping;
 tex.anisotropy=Math.min(4,renderer.renderer?.capabilities?.getMaxAnisotropy?.()||4);
 const width=s.width,length=s.length,height=s.height;
 const tw=Math.max(.08,Math.min(2.4,tile.tileWidth||.60)),th=Math.max(.08,Math.min(2.6,tile.tileHeight||.60));
 const isFloor=s.tileSurface==='floor';
 tex.repeat.set((isFloor?width:width)/tw,(isFloor?length:height)/th);
 const mat=new T.MeshStandardMaterial({map:tex,roughness:isFloor?.78:.84,metalness:0,side:T.DoubleSide});
 const g=new T.PlaneGeometry(width,isFloor?length:height);
 const panel=new T.Mesh(g,mat);
 panel.name='KSH_Tile_'+(isFloor?'Floor':'BackWall');
 if(isFloor){panel.rotation.x=-Math.PI/2;panel.position.set(0,.009,0);panel.receiveShadow=true;}
 else{panel.position.set(0,height/2,-length/2+.012);panel.receiveShadow=true;}
 renderer.room.add(panel);
}
export function renderTilePicker({options,state,update,renderer,close,enabled,focus,render}){
 const chosen=getTile(state.tileId),lib=tiles();
 const tone=chosen?palette(chosen,state.tileStyle||0):null;
 const groups=[['alle','Alle fliser'],['fliser-bad','Bad'],['fliser-kjokken','Kjøkken'],['fliser-gang','Gang'],['fliser-marmorlook','Marmorlook'],['fliser-mosaikk','Mosaikk'],['fliser-terrazzo','Terrazzo'],['fliser-utendors','Ute']];
 let heading='<p>Velg flisen først. Vi legger produktbildets mønster på valgt flate og foreslår materialer som passer sammen. Du bestemmer hvilke produkter som legges i rommet.</p>';
 let selected=chosen?'<div class="sr15-active"><img src="'+e(chosen.photo)+'" alt=""><div><small>VALGT FLIS</small><strong>'+e(chosen.name)+'</strong><span>'+e(palette(chosen).title)+'</span></div><button type="button" id="sr15-remove" aria-label="Fjern valgt flis">Fjern</button></div>':'';
 const stage='<div class="sr15-surface" role="group" aria-label="Hvor skal flisen vises"><span>Plassering i rommet</span><button type="button" data-surface="wall" aria-pressed="'+(state.tileSurface!=='floor')+'">På vegg</button><button type="button" data-surface="floor" aria-pressed="'+(state.tileSurface==='floor')+'">På gulv</button></div>';
 const moods=chosen?'<section class="sr15-match"><div class="sr15-match-head"><span>PASSER SAMMEN MED</span><strong>Tre gjennomtenkte uttrykk</strong><small>Forslag – ikke automatisk kjøp eller produktpris</small></div><div class="sr15-match-choices">'+[0,1,2].map(i=>{
 const m=palette(chosen,i);const selected=(state.tileStyle||0)===i;
 return '<button type="button" data-style="'+i+'" aria-pressed="'+selected+'"><span class="sr15-dots"><i style="background:'+e(window.KSHRoom?.walls?.[m.wall]?.color||'#d7c7ac')+'"></i><i style="background:'+(m.floor==='oak'?'#8d775e':m.floor==='cemento'?'#a7a4a0':'#dad4c9')+'"></i></span><span>'+e(m.name)+'</span><small>'+e(m.kelvin)+' K</small></button>';
 }).join('')+'</div><p class="sr15-tip">Vi tilpasser veggfarge, gulv og kveldsbelysning. Den valgte flisen blir værende.</p>'+
 '<div class="sr15-addons"><strong>Kan passe til flisen</strong>'+
 tone.secondary.map(key=>{const names={sense:'Sanipro Sense badekar',vedum:'Vedum Flow baderomsmøbel',zup:'Z-UP spilepanel eik sort'};
 return '<button type="button" data-addon="'+key+'" aria-pressed="'+!!enabled[key]+'"><span>'+e(names[key])+'</span><small>'+(enabled[key]?'✓ I rommet – trykk for å fjerne':'＋ Legg til i rommet')+'</small></button>';
 }).join('')+'</div></section>':'';
 const overview='<div class="sr15-library-top"><label for="sr15-search">Finn flis</label><input id="sr15-search" type="search" placeholder="Søk etter merke, farge eller flis …" autocomplete="off"><div class="sr15-filter" role="group" aria-label="Filtrer fliser">'+groups.map(([key,label])=>'<button type="button" data-category="'+key+'" aria-pressed="'+(key==='alle')+'">'+e(label)+'</button>').join('')+'</div></div>';
 const list='<div class="sr15-library-count" id="sr15-count">'+lib.length+' fliser med produktbilder</div><div class="sr15-tiles">'+lib.map(t=>'<button class="sr15-tile" type="button" data-tile="'+e(t.id)+'" data-category="'+e(t.categorySlug)+'" aria-pressed="'+(state.tileId===t.id)+'"><img src="'+e(t.photo)+'" loading="lazy" alt=""><span>'+e(t.name)+'</span><small>'+e(t.category)+'</small></button>').join('')+'</div>'+
 '<p class="sr15-disclaimer">Visuell overflateprøve laget av utsnitt fra produktfoto, ikke en målt 3D-skanning eller garantert fargegjengivelse. Kontroller alltid ekte flisprøve, format og produktinformasjon før kjøp.</p>';
 options.innerHTML=heading+selected+stage+moods+overview+list;
 let category='alle',search='';
 const controls=[...options.querySelectorAll('[data-category]')],cards=[...options.querySelectorAll('[data-tile]')];
 const filter=()=>{let n=0;cards.forEach(c=>{const t=getTile(c.dataset.tile);const ok=(category==='alle'||t?.categorySlug===category)&&t?.name.toLocaleLowerCase('nb').includes(search);c.hidden=!ok;if(ok)n++;});options.querySelector('#sr15-count').textContent=n+' fliser med produktbilder';};
 controls.forEach(b=>b.addEventListener('click',()=>{category=b.dataset.category;controls.forEach(x=>x.setAttribute('aria-pressed',String(x===b)));filter()}));
 options.querySelector('#sr15-search').addEventListener('input',e=>{search=e.target.value.trim().toLocaleLowerCase('nb');filter()});
 options.querySelectorAll('[data-surface]').forEach(b=>b.addEventListener('click',()=>{
 state.tileSurface=b.dataset.surface;
 if(getTile(state.tileId))styleRoom(state,getTile(state.tileId),state.tileStyle||0);
 update();
 if(renderer.is3D)renderer.setView(state.tileSurface==='floor'?'top':'front');
 render('tiles');
 }));
 cards.forEach(b=>b.addEventListener('click',()=>{
 const tile=getTile(b.dataset.tile);if(!tile)return;
 styleRoom(state,tile,0);
 update();
 if(renderer.is3D)renderer.setView(state.tileSurface==='floor'?'top':'front');
 render('tiles');
 options.querySelector('.sr15-match')?.scrollIntoView({block:'nearest',behavior:'smooth'});
 }));
 options.querySelectorAll('[data-style]').forEach(b=>b.addEventListener('click',()=>{
 const tile=getTile(state.tileId);if(!tile)return;styleRoom(state,tile,+b.dataset.style);update();render('tiles');
 }));
 options.querySelectorAll('[data-addon]').forEach(b=>b.addEventListener('click',()=>{
 const key=b.dataset.addon;enabled[key]=!enabled[key];update();render('tiles');
 if(enabled[key]&&renderer.is3D){close();focus(key);}
 }));
 options.querySelector('#sr15-remove')?.addEventListener('click',()=>{state.tileId=null;update();render('tiles');});
}

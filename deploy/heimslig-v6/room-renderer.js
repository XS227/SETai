(function(){
'use strict';
function createMesh(vertices,normals){return {vertices:new Float32Array(vertices),normals:new Float32Array(normals)}}
function box(x,y,z,w,h,d){let ps=[],ns=[];const a=-w/2,b=w/2,c=-h/2,e=h/2,f=-d/2,g=d/2;const corners=[[[a,c,g],[b,c,g],[b,e,g],[a,e,g],[0,0,1]],[[b,c,f],[a,c,f],[a,e,f],[b,e,f],[0,0,-1]],[[b,c,g],[b,c,f],[b,e,f],[b,e,g],[1,0,0]],[[a,c,f],[a,c,g],[a,e,g],[a,e,f],[-1,0,0]],[[a,e,g],[b,e,g],[b,e,f],[a,e,f],[0,1,0]],[[a,c,f],[b,c,f],[b,c,g],[a,c,g],[0,-1,0]]];for(const [p,q,r,s,n] of corners)for(const i of [p,q,r,p,r,s]){ps.push(i[0]+x,i[1]+y,i[2]+z);ns.push(...n);}return createMesh(ps,ns);}
function sphere(x,y,z,sx,sy,sz,rings=10,segments=16){const ps=[],ns=[];for(let i=0;i<rings;i++){let v0=i/rings*Math.PI,v1=(i+1)/rings*Math.PI;for(let j=0;j<segments;j++){let u0=j/segments*Math.PI*2,u1=(j+1)/segments*Math.PI*2;function vertex(v,u){const xx=Math.sin(v)*Math.cos(u),yy=Math.cos(v),zz=Math.sin(v)*Math.sin(u);ps.push(x+xx*sx,y+yy*sy,z+zz*sz);ns.push(xx,yy,zz);}for(const [v,u] of [[v0,u0],[v1,u0],[v1,u1],[v0,u0],[v1,u1],[v0,u1]])vertex(v,u);}}return createMesh(ps,ns);}
function cylinder(x,y,z,rx,h,rz,segments=24){const ps=[],ns=[];function tri(a,b,c,na,nb,nc){ps.push(...a,...b,...c);ns.push(...na,...nb,...nc);}for(let i=0;i<segments;i++){const a=i/segments*2*Math.PI,b=(i+1)/segments*2*Math.PI;let x1=Math.cos(a)*rx,z1=Math.sin(a)*rz,x2=Math.cos(b)*rx,z2=Math.sin(b)*rz;const n1=[Math.cos(a),0,Math.sin(a)],n2=[Math.cos(b),0,Math.sin(b)];const p1=[x+x1,y-h/2,z+z1],p2=[x+x2,y-h/2,z+z2],p3=[x+x2,y+h/2,z+z2],p4=[x+x1,y+h/2,z+z1];tri(p1,p2,p3,n1,n2,n2);tri(p1,p3,p4,n1,n2,n1);tri([x,y+h/2,z],p4,p3,[0,1,0],[0,1,0],[0,1,0]);tri([x,y-h/2,z],p2,p1,[0,-1,0],[0,-1,0],[0,-1,0]);}return createMesh(ps,ns);}
function lookAt(eye,center,up){let zx=eye[0]-center[0],zy=eye[1]-center[1],zz=eye[2]-center[2];let inv=1/Math.hypot(zx,zy,zz);zx*=inv;zy*=inv;zz*=inv;let xx=up[1]*zz-up[2]*zy,xy=up[2]*zx-up[0]*zz,xz=up[0]*zy-up[1]*zx;inv=1/Math.hypot(xx,xy,xz);xx*=inv;xy*=inv;xz*=inv;let yx=zy*xz-zz*xy,yy=zz*xx-zx*xz,yz=zx*xy-zy*xx;return [xx,yx,zx,0,xy,yy,zy,0,xz,yz,zz,0,-(xx*eye[0]+xy*eye[1]+xz*eye[2]),-(yx*eye[0]+yy*eye[1]+yz*eye[2]),-(zx*eye[0]+zy*eye[1]+zz*eye[2]),1];}
function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),nf=1/(near-far);return [f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0];}
function multiply(a,b){let o=new Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
const rgb=s=>[1,3,5].map(n=>parseInt(s.slice(n,n+2),16)/255);
window.HeimsligRenderer=function(host,onSelect){
 const canvas=document.createElement('canvas');canvas.setAttribute('aria-label','3D-rom. Dra for å rotere, bruk zoomknappene for å komme nærmere.');host.append(canvas);
 let gl=null;try{gl=canvas.getContext('webgl',{antialias:true,alpha:false});}catch{}
 const fallback=document.createElement('div');fallback.className='h5-plan';host.append(fallback);
 let state,meshes=[],yaw=.55,pitch=.65,zoom=1,view='perspective',dirty=true,program,locations;
 const vs='attribute vec3 a_position;attribute vec3 a_normal;uniform mat4 vp;varying vec3 n;varying vec3 p;void main(){n=a_normal;p=a_position;gl_Position=vp*vec4(a_position,1.);}';
 const fs=`precision mediump float;
varying vec3 n;varying vec3 p;
uniform vec3 color; uniform vec3 cameraEye;
uniform float light,kind,format,offset,photo,textureScale;
uniform sampler2D texColor,texNormal,texRough;
void main(){
 vec3 gn=normalize(n);vec3 an=abs(gn);
 vec2 uv=(an.y>=an.x&&an.y>=an.z)?p.xz:(an.x>an.z?p.zy:p.xy);
 uv*=textureScale;
 vec3 c=color;float rough=.84;vec3 surfaceN=gn;
 if(photo>.5){
  vec3 scan=texture2D(texColor,uv).rgb;
  vec3 detail=texture2D(texNormal,uv).rgb*2.-1.;
  if(an.y>=an.x&&an.y>=an.z) surfaceN=normalize(gn+vec3(detail.x,0.,detail.y)*.20);
  else if(an.x>an.z) surfaceN=normalize(gn+vec3(0.,detail.y,detail.x)*.20);
  else surfaceN=normalize(gn+vec3(detail.x,detail.y,0.)*.20);
  rough=clamp(texture2D(texRough,uv).r,.16,.98);
  if(kind==1.){float l=dot(scan,vec3(.2126,.7152,.0722));c=color*(.52+l*.88);}
  else if(kind==0.){float l=dot(scan,vec3(.2126,.7152,.0722));c=color*(.58+l*.77);}
  else if(kind==2.){c=mix(scan,scan*color*1.34,.22);}
  else {c=mix(scan,scan*color*1.30,.27);}
 }else{
  if(kind==1.){float weave=sin(p.x*240.)*sin(p.y*240.)*.018;c+=weave;}
  if(kind==2.){c*=.92+.08*sin(p.x*43.+sin(p.z*7.)*2.);}
  if(kind==3.){float vein=abs(sin(p.x*7.+p.z*4.+sin(p.x*2.+p.z*3.)*2.));c*=.87+.13*vein;}
  if(kind==4.){float row=floor(p.z/format);vec2 g=fract(vec2(p.x/format+mod(row,2.)*offset*.5,p.z/format));float joint=step(.012,g.x)*step(.012,g.y);c=mix(c*.72,c,joint);}
 }
 vec3 sunDir=normalize(vec3(-.6,1.,.7));
 float diffuse=max(dot(surfaceN,sunDir),0.);
 vec3 halfVector=normalize(sunDir+normalize(cameraEye-p));
 float highlight=pow(max(dot(surfaceN,halfVector),0.),mix(88.,9.,rough))*mix(.19,.018,rough);
 float shade=.53+.42*diffuse;
 gl_FragColor=vec4(clamp(c*shade*light+vec3(highlight)*light,0.,1.),1.);
}`;
 function compile(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error('Shader');return s;}
 if(gl)try{program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vs));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Program');gl.useProgram(program);locations={};for(const n of ['vp','color','light','kind','format','offset','photo','textureScale','cameraEye','texColor','texNormal','texRough'])locations[n]=gl.getUniformLocation(program,n);for(const n of ['a_position','a_normal'])locations[n]=gl.getAttribLocation(program,n);gl.enable(gl.DEPTH_TEST);}catch{gl=null;}
 canvas.hidden=!gl;fallback.hidden=!!gl;
 const colors={sand:'#c5b49e',sage:'#87917a',charcoal:'#4d4b48',ivory:'#e5ddce'};
 const wallColors={warm:'#e7dfd2',chalk:'#f1efe6',sage:'#acb5a1',clay:'#c79e86',charcoal:'#62645e'};
 const floorColors={oak:'#b3966d',concrete:'#bab7af',slate:'#687174',limestone:'#d4c4a7'};
 // CC0 surface scans from Poly Haven, cached locally by the v6 installer.
 // Illustrative reference textures: NEVER described as Heimslig's own products.
 const matFiles={
  oak:'oak_veneer_03',concrete:'concrete_floor',wall:'plastered_wall_05',
  limestone:'stone_tiles',slate:'rock_wall_02',fabric:'wool_boucle'
 };
 const matScale={oak:1.15,concrete:.72,wall:1.3,limestone:1,slate:.9,fabric:3.2};
 const textures={};
 let materialReady=0;
 let neutral=null;
 if(gl){
  neutral=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,neutral);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([190,190,190,255]));
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  for(const [material,id] of Object.entries(matFiles)){
   textures[material]={};
   for(const [channel,suffix] of [['diff','diff'],['normal','nor_gl'],['rough','rough']]){
    const img=new Image();img.decoding='async';
    img.onload=()=>{
     if(!gl)return;
     const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);
     gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
     gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
     gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);
     gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
     gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
     gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
     gl.generateMipmap(gl.TEXTURE_2D);
     textures[material][channel]=tex;
     if(['diff','normal','rough'].every(k=>textures[material][k]))materialReady++;
     if(state){dirty=true;draw();}
     const status=document.getElementById('h5-render-mode');
     if(status&&materialReady>=6)status.textContent='LIVE 3D · PBR MATERIALER · DRA FOR Å ROTERE';
    };
    img.onerror=()=>{ /* Keep procedural fallback when a scanned material is unavailable. */ };
    img.src='/ksh/heimslig/assets/v6/textures/'+id+'_'+suffix+'_1k.jpg';
   }
  }
 }

 function add(shape,color,kind=0,item,material){if(item){const a=item.rotation*Math.PI/180,c=Math.cos(a),s=Math.sin(a),v=shape.vertices,n=shape.normals;
 for(let j=0;j<v.length;j+=3){const x=v[j],z=v[j+2];v[j]=x*c+z*s+item.x;v[j+2]=-x*s+z*c+item.z;const nx=n[j],nz=n[j+2];n[j]=nx*c+nz*s;n[j+2]=-nx*s+nz*c;}}
 if(!gl)return;const m={count:shape.vertices.length/3,color:rgb(color),kind,material:material||(kind===1?'fabric':kind===2?'oak':null)};for(const [key,data] of [['position',shape.vertices],['normal',shape.normals]]){m[key]=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,m[key]);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);}meshes.push(m);}
 function furniture(i){const [w,h,d]=i.size,c=colors[i.finish],wood=i.finish==='charcoal'?'#4b443b':'#97714d';
 const b=(x,y,z,bw,bh,bd,col=c,k=1)=>add(box(x,y,z,bw,bh,bd),col,k,i);
 const leg=(x,z,height)=>add(cylinder(x,height/2,z,.035,height,.035,12),wood,2,i);
 if(i.type==='sofa'||i.type==='chair'){
 b(0,h*.4,0,w,h*.23,d);b(0,h*.74,-d*.41,w*.94,h*.52,d*.18);b(-w*.45,h*.56,0,w*.1,h*.48,d);b(w*.45,h*.56,0,w*.1,h*.48,d);
 const count=i.type==='sofa'?3:1;for(let a=0;a<count;a++){const sw=w*.78/count;b((a-(count-1)/2)*sw,h*.56,d*.04,sw*.96,h*.12,d*.76);}
 for(const x of [-w*.38,w*.38])for(const z of [-d*.32,d*.32])leg(x,z,h*.28);
 }else if(i.type==='bed'){b(0,h*.28,0,w,h*.32,d,wood,2);b(0,h*.53,0,w*.98,h*.18,d*.97,'#e5ded1');b(0,h*.68,-d*.46,w,h*.64,d*.08,c);for(const x of [-w*.24,w*.24])b(x,h*.68,-d*.27,w*.43,h*.11,d*.22,'#f0ece1');b(0,h*.65,d*.17,w*.99,h*.04,d*.5,c);
 }else if(i.type==='storage'){b(0,h*.55,0,w,h*.9,d,wood,2);for(const x of [-w/3,0,w/3]){b(x,h*.56,d*.51,w*.32,h*.8,.02,wood,2);b(x+w*.1,h*.58,d*.54,.025,.025,.025,'#605d50',0);}for(const x of [-w*.4,w*.4])for(const z of [-d*.3,d*.3])leg(x,z,h*.12);
 }else{b(0,h-.035,0,w,.07,d,wood,2);for(const x of [-w*.4,w*.4])for(const z of [-d*.36,d*.36])leg(x,z,h-.07);}
 if(i.id===state.selected){const ac='#9d774d';b(0,.012,-d/2-.04,w+.08,.015,.02,ac,0);b(0,.012,d/2+.04,w+.08,.015,.02,ac,0);b(-w/2-.04,.012,0,.02,.015,d+.08,ac,0);b(w/2+.04,.012,0,.02,.015,d+.08,ac,0);}
 }
 function plan(){const w=state.width,l=state.length,scale=65,ox=35,oy=35;const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 fallback.innerHTML=`<svg viewBox="0 0 ${w*scale+70} ${l*scale+70}" role="img" aria-label="Målfast 2D-plan av rommet"><rect x="35" y="35" width="${w*scale}" height="${l*scale}" fill="${floorColors[state.floor]}" stroke="${wallColors[state.wall]}" stroke-width="8"/><text x="35" y="19">${w.toFixed(1)} × ${l.toFixed(1)} m</text>${state.items.map(i=>{const x=ox+(w/2+i.x)*scale,y=oy+(l/2+i.z)*scale;return `<g transform="translate(${x} ${y}) rotate(${-i.rotation})"><rect x="${-i.size[0]*scale/2}" y="${-i.size[2]*scale/2}" width="${i.size[0]*scale}" height="${i.size[2]*scale}" rx="5" fill="${colors[i.finish]}" stroke="${i.id===state.selected?'#344c3c':'#645d50'}" stroke-width="${i.id===state.selected?4:1}"/><text text-anchor="middle" font-size="10">${escape(window.HeimsligRoom.catalog[i.type].name.split(' · ')[1])}</text></g>`;}).join('')}</svg><p>2D-plan vises fordi nettleseren ikke støtter WebGL. Alle valg og beregninger fungerer fortsatt.</p>`;
 }
 function update(s){state=s;if(!gl){plan();return;}for(const m of meshes){gl.deleteBuffer(m.position);gl.deleteBuffer(m.normal);}meshes=[];
 const w=s.width,l=s.length,h=s.height;
 add(box(0,-.06,0,w,.12,l),floorColors[s.floor],s.floor==='oak'?2:s.floor==='concrete'?0:4,null,s.floor);
 add(box(0,h/2,-l/2-.05,w+.1,h,.1),wallColors[s.wall],0,null,'wall');add(box(-w/2-.05,h/2,0,.1,h,l),wallColors[s.wall],0,null,'wall');
 add(box(0,.06,-l/2+.01,w,.12,.025),'#e6e0d4');add(box(-w/2+.01,.06,0,.025,.12,l),'#e6e0d4');
 // Window within the wall dimensions, with frame and daylight panel.
 add(box(-w*.22,h*.64,-l/2+.015,w*.26,h*.43,.025),s.daylight==='day'?'#d8e6dc':'#777f91');
 add(box(-w*.22,h*.64,-l/2+.04,.035,h*.44,.025),'#eee8de');add(box(-w*.22,h*.64,-l/2+.04,w*.27,.035,.025),'#eee8de');
 for(const i of s.items)furniture(i);dirty=true;draw();}
 function draw(){if(!gl||!state||!dirty)return;dirty=false;const r=host.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.max(2,r.width*dpr);canvas.height=Math.max(2,r.height*dpr);gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(.94,.93,.89,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
 const radius=Math.max(state.width,state.length)*1.35/zoom,center=[0,state.height*.3,0],aspect=canvas.width/canvas.height;
 let eye=[Math.sin(yaw)*radius*Math.cos(pitch),radius*Math.sin(pitch)+center[1],Math.cos(yaw)*radius*Math.cos(pitch)];
 if(view==='top')eye=[0,radius*1.3,.001];if(view==='front')eye=[0,state.height*.6,radius];if(view==='side')eye=[radius,state.height*.6,.01];
 const vp=multiply(perspective(.75,aspect,.05,100),lookAt(eye,center,[0,1,0]));gl.uniformMatrix4fv(locations.vp,false,new Float32Array(vp));gl.uniform1f(locations.light,state.daylight==='evening'?.72:1);gl.uniform1f(locations.format,state.format);gl.uniform1f(locations.offset,state.pattern==='offset'?1:0);gl.uniform3fv(locations.cameraEye,new Float32Array(eye));gl.uniform1i(locations.texColor,0);gl.uniform1i(locations.texNormal,1);gl.uniform1i(locations.texRough,2);
 for(const m of meshes){const maps=textures[m.material]||{};const ready=!!(maps.diff&&maps.normal&&maps.rough);gl.uniform1f(locations.photo,ready?1:0);gl.uniform1f(locations.textureScale,matScale[m.material]||1);for(const [index,tex] of [maps.diff,maps.normal,maps.rough].entries()){gl.activeTexture(gl.TEXTURE0+index);gl.bindTexture(gl.TEXTURE_2D,tex||neutral);}gl.uniform3fv(locations.color,m.color);gl.uniform1f(locations.kind,m.kind);for(const key of ['position','normal']){gl.bindBuffer(gl.ARRAY_BUFFER,m[key]);const a=locations['a_'+key];gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,3,gl.FLOAT,false,0,0);}gl.drawArrays(gl.TRIANGLES,0,m.count);}}
 let drag=null;canvas.style.touchAction='none';canvas.addEventListener('pointerdown',e=>{drag=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);});canvas.addEventListener('pointermove',e=>{if(!drag)return;view='perspective';yaw+=(e.clientX-drag[0])*.008;pitch=Math.max(.15,Math.min(1.5,pitch+(e.clientY-drag[1])*.008));drag=[e.clientX,e.clientY];dirty=true;draw();});for(const event of ['pointerup','pointercancel'])canvas.addEventListener(event,()=>drag=null);
 const observer=new ResizeObserver(()=>{dirty=true;draw();});observer.observe(host);
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();gl=null;canvas.hidden=true;fallback.hidden=false;plan();});
 return {update,is3D:!!gl,camera(v){view=v;dirty=true;draw();},zoom(delta){zoom=Math.max(.5,Math.min(2,zoom+delta));dirty=true;draw();},reset(){yaw=.55;pitch=.65;zoom=1;view='perspective';dirty=true;draw();}};
};
})();

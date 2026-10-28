// Black & White Universe 11.3 — Bell.
// Memory image: one source emits paired particles to distant analyzers; outcomes are random locally, correlations violate a Bell bound.
window.BWU_SCENES = [
'vec3 bgB(vec2 p,float t){return vec3(.008)+vec3(.03)*fbm(p*2.1+vec2(t*.012,-t*.01))*(1.-smoothstep(.15,.8,length(p)))+vec3(stars(p*60.,.026))*.3;}',
'vec3 W=vec3(1.,.63,.35);',
'vec3 sPair(vec2 p,float t,float m){vec3 c=bgB(p,t)*.62;vec2 O=vec2(0.);float pulse=.5+.5*sin(t*1.4);c+=W*(pt(p,O,.00005)+exp(-length(p)*20.)*.18*pulse);',
' float u=fract(t*.22);vec2 L=mix(O,vec2(-.4,.0),u),R=mix(O,vec2(.4,.0),u);c+=vec3(1.)*(pt(p,L,.000026)+pt(p,R,.000026));',
' c+=vec3(.3)*(glowLine(sdSeg(p,O,vec2(-.4,0.)),1.*PX)+glowLine(sdSeg(p,O,vec2(.4,0.)),1.*PX))*(1.-u)*.8;',
' for(int s=-1;s<=1;s+=2){vec2 q=p-vec2(float(s)*.42,0.);float ring=glowLine(length(q)-.052,1.2*PX);float axis=glowLine(abs(q.x*cos(.7*float(s))-q.y*sin(.7*float(s))),1.*PX)*step(length(q),.06);c+=vec3(.65)*(ring+axis);}return c;}',
'vec3 sAngles(vec2 p,float t,float m){vec3 c=bgB(p,t)*.58;float ang=.25+1.1*m;for(int s=-1;s<=1;s+=2){vec2 o=vec2(float(s)*.28,0.);vec2 q=p-o;float a=ang*float(s);float ax=abs(q.x*sin(a)-q.y*cos(a));c+=vec3(.65)*glowLine(length(q)-.1,1.2*PX)+vec3(.75)*glowLine(ax,1.2*PX)*step(length(q),.1);float signv=sin(t*1.7+float(s)*1.8)>0.?1.:-1.;c+=mix(vec3(1.),W,.2)*pt(p,o+vec2(cos(a),sin(a))*.065*signv,.00002);}',
' float corr=.5+.5*cos(2.*ang);for(int k=0;k<7;k++){float y=-.24+float(k)*.075;float on=step(.28,h21(vec2(float(k),floor(t*.65))));c+=vec3(.55)*pt(p,vec2(-.04+(.08*on),y),.00001)*(.35+.65*corr);}return c;}',
'vec3 sBound(vec2 p,float t,float m){vec3 c=bgB(p,t)*.55;float x=clamp((p.x+.38)/.76,0.,1.);float classical=.11;float quantum=.11+.10*smoothstep(.05,.9,m);c+=vec3(.45)*glowLine(p.y+classical,1.2*PX)*step(abs(p.x),.38);float curve=-.18+quantum*(.5+.5*sin(x*PI));c+=mix(vec3(1.),W,.25)*glowLine(p.y-curve,1.5*PX)*step(abs(p.x),.38);',
' c+=W*pt(p,vec2(.0,curve),.00003);for(int k=0;k<6;k++){float xx=-.32+float(k)*.13;float yy=-.18+quantum*(.5+.5*sin(((xx+.38)/.76)*PI));c+=vec3(.9)*pt(p,vec2(xx,yy),.000012);}return c;}',
'vec3 scene(float id,vec2 p,float t,float m){if(id<.5)return sPair(p,t,m);if(id<1.5)return sAngles(p,t,m);return sBound(p,t,m);}'
].join('\n');

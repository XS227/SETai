// Black & White Universe 11.4 — Quantum tunneling.
// Memory image: a wave meets a barrier; most reflects, a fading tail enters it, and a smaller wave appears beyond.
window.BWU_SCENES = [
'vec3 bgT(vec2 p,float t){return vec3(.008)+vec3(.03)*fbm(p*2.4+vec2(t*.015,0.))*(1.-smoothstep(.1,.85,length(p)))+vec3(stars(p*58.,.022))*.25;}',
'vec3 W=vec3(1.,.63,.35);',
'float barrier(vec2 p){return step(abs(p.x),.055)*step(abs(p.y),.34);}',
'vec3 sApproach(vec2 p,float t,float m){vec3 c=bgT(p,t)*.6;float B=barrier(p);c+=vec3(.18)*B+vec3(.65)*glowLine(abs(p.x)-.055,1.2*PX)*step(abs(p.y),.34);',
' float xc=-.34+.24*smoothstep(0.,.48,m);float packet=exp(-sq((p.x-xc)/.07))*exp(-p.y*p.y*40.)*(.45+.55*sq(cos((p.x-xc)*70.-t*4.)));c+=mix(vec3(1.),W,.16)*packet;',
' float enter=smoothstep(.38,.72,m);float tail=exp(-(p.x+.055)*22.)*step(-.055,p.x)*step(p.x,.055)*exp(-p.y*p.y*40.);c+=W*tail*.55*enter;',
' float refl=exp(-sq((p.x+.16)/.09))*exp(-p.y*p.y*42.)*sq(cos((p.x+.16)*58.+t*3.));c+=vec3(.7)*refl*smoothstep(.55,1.,m)*.5;return c;}',
'vec3 sThrough(vec2 p,float t,float m){vec3 c=bgT(p,t)*.58;float B=barrier(p);c+=vec3(.17)*B+vec3(.6)*glowLine(abs(p.x)-.055,1.1*PX)*step(abs(p.y),.34);float pass=smoothstep(.18,.72,m);',
' float left=exp(-sq((p.x+.18)/.11))*exp(-p.y*p.y*36.)*.55;float inside=exp(-(p.x+.055)*24.)*step(-.055,p.x)*step(p.x,.055)*exp(-p.y*p.y*36.);float right=exp(-sq((p.x-.2)/.12))*exp(-p.y*p.y*36.)*.34*pass;',
' c+=vec3(.8)*left+W*inside*.5*pass+mix(vec3(1.),W,.2)*right*(.6+.4*sq(cos((p.x-.2)*55.-t*3.)));c+=W*pt(p,vec2(.23,0.),.000022)*pass;return c;}',
'vec3 sRemember(vec2 p,float t,float m){vec3 c=bgT(p,t)*.52;c+=vec3(.2)*barrier(p)+vec3(.65)*glowLine(abs(p.x)-.055,1.3*PX)*step(abs(p.y),.34);',
' float L=exp(-sq((p.x+.22)/.08))*exp(-p.y*p.y*44.);float I=exp(-(p.x+.055)*23.)*step(-.055,p.x)*step(p.x,.055)*exp(-p.y*p.y*44.);float R=exp(-sq((p.x-.23)/.09))*exp(-p.y*p.y*44.)*.38;',
' c+=vec3(.9)*L+W*I*.5+mix(vec3(1.),W,.25)*R;float u=fract(t*.32);c+=W*pt(p,vec2(mix(-.26,.27,u),0.),.000018)*(1.-smoothstep(.43,.57,u));return c;}',
'vec3 scene(float id,vec2 p,float t,float m){if(id<.5)return sApproach(p,t,m);if(id<1.5)return sThrough(p,t,m);return sRemember(p,t,m);}'
].join('\n');

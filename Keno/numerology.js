/* SETAEI Keno numerology engine (setaei-keno-numerology-v1).
 * Deterministic: same draw date (+ optional birth date) always gives the same row.
 * Reduction follows the Numerologist/Åse convention: digit sums, master numbers 11/22/33 kept.
 * Every number carries the factors that produced it, so a row can be explained and backtested. */
(function(root){
 'use strict';
 var METHOD='setaei-keno-numerology-v1', MAX=70, MASTERS=[11,22,33];
 function digitSum(n){return String(Math.abs(n)).split('').reduce(function(s,d){return s+Number(d)},0)}
 function reduce(n,keepMasters){
  n=Math.abs(Number(n));
  while(n>9&&!(keepMasters&&MASTERS.indexOf(n)>=0))n=digitSum(n);
  return n;
 }
 function parse(iso){
  if(typeof iso!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(iso))throw Error('Ugyldig dato: '+iso);
  var d=new Date(iso+'T12:00:00Z');
  if(!isFinite(+d)||d.toISOString().slice(0,10)!==iso)throw Error('Datoen finnes ikke: '+iso);
  return {y:Number(iso.slice(0,4)),m:Number(iso.slice(5,7)),d:Number(iso.slice(8,10))};
 }
 // Draw-date factors (universal numbers) and optional personal factors.
 function factors(drawISO,birthISO){
  var t=parse(drawISO),raw=digitSum(t.d)+digitSum(t.m)+digitSum(t.y);
  var uy=reduce(digitSum(t.y),true),um=reduce(uy+t.m,true),ud=reduce(raw,true);
  var mirror=Number(String(t.d).padStart(2,'0').split('').reverse().join(''));
  var out={date:drawISO,universalDay:ud,universalMonth:um,universalYear:uy,dateSum:raw,day:t.d,month:t.m,mirror:mirror,yearTail:t.y%100,personal:null};
  if(birthISO){
   var b=parse(birthISO);
   if(birthISO>drawISO)throw Error('Fødselsdato må være før trekningsdatoen.');
   var life=reduce(reduce(b.d,true)+reduce(b.m,true)+reduce(digitSum(b.y),true),true);
   var py=reduce(reduce(b.d)+reduce(b.m)+reduce(digitSum(t.y))),pm=reduce(py+t.m),pd=reduce(pm+t.d);
   out.personal={life:life,birthday:b.d,birthMonth:b.m,personalYear:py,personalMonth:pm,personalDay:pd};
  }
  return out;
 }
 function row(drawISO,k,birthISO){
  k=Number(k);if(!(k>=1&&k<=MAX))throw Error('Ugyldig nivå');
  var f=factors(drawISO,birthISO),picked=new Map();
  function add(value,label){
   if(!(value>0))return;
   var n=((value-1)%MAX)+1;
   if(!picked.has(n)){if(picked.size>=k)return;picked.set(n,{number:n,sources:[]})}
   var text=label+(n!==value?' ('+value+' → '+n+')':'');
   if(picked.get(n).sources.indexOf(text)<0)picked.get(n).sources.push(text);
  }
  var p=f.personal,anchor=f.universalDay;
  if(p){
   add(p.personalDay,'Personlig dag');add(p.life,'Livstall');add(p.birthday,'Fødselsdag');
   add(p.personalYear,'Personlig år');add(p.personalMonth,'Personlig måned');
   add(p.life+f.universalDay,'Livstall + dagens tall');add(p.birthMonth,'Fødselsmåned');
   anchor=p.personalDay;
  }
  add(f.universalDay,'Universelt dagtall');add(f.day,'Dagen i måneden');
  if(f.dateSum!==f.universalDay)add(f.dateSum,'Datosum før reduksjon');
  add(f.universalMonth,'Universell måned');add(f.universalYear,'Universelt år');
  add(f.day+f.month,'Dag + måned');add(f.mirror,'Dagen speilet');add(f.month,'Måned');add(f.yearTail,'Årstallets to siste sifre');
  // Fill with numbers that share the anchor's root vibration (r, r+9, r+18 …), then the month's, then the year's.
  [anchor,f.universalMonth,f.universalYear].forEach(function(src,i){
   var r=reduce(src);
   for(var n=r;n<=MAX&&picked.size<k;n+=9)add(n,'Samme rotvibrasjon som '+['dagen','måneden','året'][i]+' ('+r+')');
  });
  for(var n=1;picked.size<k;n++)add(n,'Fyll (stigende)');
  var reasons=Array.from(picked.values()).sort(function(a,b){return a.number-b.number});
  return {date:drawISO,numbers:reasons.map(function(x){return x.number}),reasons:reasons,factors:f,method:METHOD};
 }
 var api={METHOD:METHOD,reduce:reduce,digitSum:digitSum,factors:factors,row:row};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.KENO_NUMEROLOGY=api;
})(typeof window!=='undefined'?window:globalThis);

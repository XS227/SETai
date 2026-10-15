(function(root){
 'use strict';
 const METHOD='numerologist-personal-v1';
 const values={A:1,J:1,S:1,Ø:1,B:2,K:2,T:2,Å:2,C:3,L:3,U:3,D:4,M:4,V:4,E:5,N:5,W:5,F:6,O:6,X:6,G:7,P:7,Y:7,H:8,Q:8,Z:8,I:9,R:9,Æ:9};
 const vowels=new Set('AEIOUÆØÅ');
 function reduce(value,masters=false){
  let n=Math.abs(Number(value));
  if(!Number.isSafeInteger(n))throw Error('Invalid number.');
  while(n>9&&!(masters&&[11,22,33].includes(n)))n=String(n).split('').reduce((s,d)=>s+Number(d),0);
  return n;
 }
 function parseDate(iso){
  if(typeof iso!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(iso))throw Error('Choose a valid date of birth.');
  const d=new Date(iso+'T12:00:00Z');
  if(Number(iso.slice(0,4))<1||!Number.isFinite(+d)||d.toISOString().slice(0,10)!==iso)throw Error('The date does not exist in the calendar.');
  return {year:Number(iso.slice(0,4)),month:Number(iso.slice(5,7)),day:Number(iso.slice(8,10))};
 }
 function isVowel(word,i){
  const c=word[i];if(vowels.has(c))return true;if(c!=='Y')return false;
  return !((i===0&&vowels.has(word[i+1]))||vowels.has(word[i-1])||vowels.has(word[i+1]));
 }
 function nameNumber(name,mode='all'){
  let total=0;
  for(const raw of name.trim().split(/\s+/)){
   const word=Array.from(raw.toUpperCase()).filter(c=>Object.hasOwn(values,c)).join('');
   let sum=0;
   for(let i=0;i<word.length;i++)if(mode==='all'||(mode==='vowels'?isVowel(word,i):!isVowel(word,i)))sum+=values[word[i]];
   if(sum)total+=reduce(sum,true);
  }
  return reduce(total,true);
 }
 function profile(birthDate,drawDate,name=''){
  const b=parseDate(birthDate),d=parseDate(drawDate);
  if(birthDate>drawDate)throw Error('The birthday must be before the draw date.');
  if(typeof name!=='string'||name.length>200)throw Error('The name can contain at most 200 characters.');
  const life=reduce(reduce(b.day,true)+reduce(b.month,true)+reduce(b.year,true),true);
  const year=reduce(reduce(b.day)+reduce(b.month)+reduce(d.year));
  const month=reduce(year+reduce(d.month)),day=reduce(month+d.day);
  const expression=nameNumber(name),soul=nameNumber(name,'vowels'),personality=nameNumber(name,'consonants');
  return {birthDate,drawDate,life,year,month,day,birthday:b.day,birthMonth:b.month,birthYear:reduce(b.year,true),
   expression,soul,personality,maturity:expression?reduce(life+expression,true):0,method:METHOD};
 }
 function row(birthDate,drawDate,name=''){
  const p=profile(birthDate,drawDate,name),selected=new Map(),stars=new Map();
  const core=[{value:p.year,label:'Personal year'},{value:p.month,label:'Personal month'},{value:p.day,label:'Personal day'},{value:p.life,label:'Life path / destiny number'},{value:p.birthday,label:'Birthday'}];
  const extras=[{value:p.expression,label:'Name / expression number'},{value:p.soul,label:'Soul number'},{value:p.personality,label:'Personality number'},{value:p.birthMonth,label:'Birth month'},{value:p.birthYear,label:'Birth-year number'},{value:p.maturity,label:'Maturity number'}].filter(x=>x.value>0);
  function add(map,candidate,limit,size){
   const number=((candidate.value-1)%limit)+1;
   if(!map.has(number)&&map.size>=size)return;
   if(!map.has(number))map.set(number,{number,sources:[]});
   const label=candidate.label+(candidate.value!==number?` (${candidate.value} → ${number}, mapped to 1–${limit})`:'');
   if(!map.get(number).sources.includes(label))map.get(number).sources.push(label);
  }
  for(const x of [...core,...extras])add(selected,x,50,5);
  // Colliding core numbers share a ball. Fill with documented sums of the same personal factors.
  const basis=[...core,...extras];
  for(let i=0;i<basis.length;i++)for(let j=i+1;j<basis.length;j++){
   if(selected.size<5)add(selected,{value:basis[i].value+basis[j].value,label:basis[i].label+' + '+basis[j].label},50,5);
  }
  // Guaranteed deterministic completion even when every personal factor is identical.
  for(let i=1;selected.size<5;i++)add(selected,{value:p.life+p.year+p.month+p.day+i,label:'Life path + year + month + day + '+i},50,5);
  const starBasis=[{value:p.day,label:'Personal day'},{value:reduce(p.life,true),label:'Life-path number'},{value:p.month,label:'Personal month'},{value:p.year,label:'Personal year'}];
  for(const x of starBasis){const n=x.value>12?reduce(x.value):x.value;add(stars,{value:n,label:x.label+(n!==x.value?` (${x.value} → ${n}, digit reduction)`:'')},12,2);}
  for(let i=1;stars.size<2;i++)add(stars,{value:p.day+p.year+i,label:'Personal day + personal year + '+i},12,2);
  const reasons=Array.from(selected.values()).sort((a,b)=>a.number-b.number),starReasons=Array.from(stars.values()).sort((a,b)=>a.number-b.number);
  return {date:drawDate,main:reasons.map(x=>x.number),stars:starReasons.map(x=>x.number),reasons,starReasons,profile:p,mode:'numerology',method:METHOD};
 }
 const api={METHOD,reduce,parseDate,nameNumber,profile,row};
 if(typeof module!=='undefined')module.exports=api;else root.EJ_NUMEROLOGY=api;
})(typeof window!=='undefined'?window:globalThis);

'use strict';
const assert=require('node:assert/strict');
const C=require('./room-core.js');
const test=(name,fn)=>{fn();process.stdout.write('PASS '+name+'\n');};
test('Sirkel product picks its own white circular model, not default sofa',()=>{
 const s=C.defaults();const r=C.selectProduct(s,'sirkel-bord');
 assert.equal(r.status,'added');assert.equal(s.items.length,1);
 assert.equal(s.items[0].type,'sirkel');assert.equal(s.items[0].finish,'ivory');
 assert.equal(C.itemName(s.items[0]),'Sirkel · sofabord');
});
test('Product survives persistence and repeated visits do not duplicate it',()=>{
 const s=C.defaults();C.selectProduct(s,'sirkel-bord');
 const restored=C.normalize(JSON.parse(JSON.stringify(s)));
 assert.equal(restored.items[0].productSlug,'sirkel-bord');
 assert.equal(C.selectProduct(restored,'sirkel-bord').status,'selected');
 assert.equal(restored.items.length,1);
});
test('New furniture cannot overlap an existing sofa',()=>{
 const s=C.defaults();const fresh=C.item('table','t');
 const pos=C.findPlacement(s,fresh);assert.ok(pos);
 Object.assign(fresh,pos);s.items.push(fresh);
 assert.equal(C.collisions(s).length,0);
});
test('Several new pieces remain collision free',()=>{
 const s=C.defaults();
 for(let i=0;i<6;i++){
  const next=C.item('chair','c'+i),pos=C.findPlacement(s,next);
  assert.ok(pos,'expected room for chair '+i);
  Object.assign(next,pos);s.items.push(next);
 }
 assert.equal(C.collisions(s).length,0);
});
test('Old overlapping furniture can be spread without losing items',()=>{
 const s=C.defaults();
 const n=C.item('chair','old');s.items.push(n);
 assert.ok(C.collisions(s).length);
 assert.equal(C.reflow(s),true);
 assert.equal(s.items.length,2);assert.equal(C.collisions(s).length,0);
});
test('Full room rejects additions rather than overlapping',()=>{
 const s=C.defaults();s.width=2.5;s.length=2.5;
 assert.equal(C.findPlacement(s,C.item('bed','b')),null);
});
test('Other storefront product links select the appropriate named concept',()=>{
 const s=C.defaults();C.selectProduct(s,'samlingsbord');
 assert.equal(s.items[0].type,'dining');
 assert.equal(C.itemName(s.items[0]),'Samling · spisebord');
});
test('Unknown product codes cannot silently select an unrelated demo',()=>{
 assert.equal(C.selectProduct(C.defaults(),'does-not-exist').status,'unknown');
});

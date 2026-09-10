const assert=require('node:assert/strict');
const {QubeModel}=require('../assets/qube-model.js');
const solved=new QubeModel().serialise();
for(const face of ['R','L','U','D','F','B']){
 const cube=new QubeModel();for(let i=0;i<4;i++)cube.turn(face,1);assert.equal(cube.serialise(),solved,face+' four turns');
 cube.turn(face,1);cube.turn(face,-1);assert.equal(cube.serialise(),solved,face+' inverse');
}
const cube=new QubeModel(),sequence=[['R',1],['U',-1],['F',1],['L',-1],['B',1],['D',1],['R',-1]];
for(const [face,direction]of sequence)cube.turn(face,direction);
assert.notEqual(cube.serialise(),solved);assert.equal(new Set(cube.cells.map(c=>c.position.join(','))).size,26);
for(const c of cube.cells)for(const face of c.stickers){const n=cube.normal(c,face);assert.equal(n.reduce((sum,v,i)=>sum+v*c.position[i],0),1,'Every sticker stays on the exterior');}
for(const [face,direction]of sequence.reverse())cube.turn(face,-direction);assert.equal(cube.serialise(),solved);
console.log('Qube model: six faces, quarter-turn closure, inverse moves, scramble reversal, 26 unique positions and exterior stickers passed.');

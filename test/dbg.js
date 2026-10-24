const RR=require('../logic.js');const L=require('../levels.js');
const lv=+process.argv[2]-1;const rx=+process.argv[3];
const src=require('fs').readFileSync(__dirname+'/sim.js','utf8');
eval(src.split('const reactions')[0]);
const res={};
for(let s=1;s<=40;s++){const g=RR.createGame(L[lv],s*7919+lv);const dt=1/30;let next=rx;while(g.state==='play'&&g.t<600){RR.update(g,dt);g.events.length=0;if(g.t>=next){botStep(g);next=g.t+rx*(0.7+0.6*((g.t*9301)%1));}}
 const k=g.state+(g.t>=600?'-timeout':'');res[k]=(res[k]||0)+1;
 if(g.t>=600&&!res.shown){res.shown=1;console.log(JSON.stringify({crates:g.crates,orders:g.orders,fruits:g.fruits,cool:g.cool}));}}
console.log(res);

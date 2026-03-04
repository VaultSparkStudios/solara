import { useState, useEffect, useRef, useCallback } from "react";

const TILE=32,MW=100,MH=100,VTX=17,VTY=14,CW=VTX*TILE,CH=VTY*TILE;
const T={G:0,D:1,W:2,S:3,SA:4,WF:5,WA:6,BR:7,PA:8,DG:9,LAVA:10,DESERT:11};
const TC={
  [T.G]:["#3a7d2a","#358525","#3d8230","#39792c"],[T.D]:["#8a7a5a","#7e7050","#887858"],
  [T.W]:["#2855a0","#2a5aaa","#2650a5"],[T.S]:["#6a6a6a","#626262","#707070"],
  [T.SA]:["#c8b878","#c4b470","#ccbc80"],[T.WF]:["#6a5030","#654a2c"],
  [T.WA]:["#4a4a4a","#454545"],[T.BR]:["#5a4020","#553a1c"],
  [T.PA]:["#9a8a60","#948458","#a09068"],[T.DG]:["#2a5a20","#256a1c","#1e5018"],
  [T.LAVA]:["#c03010","#b02808","#d04020"],[T.DESERT]:["#d4b870","#ccb068","#dcc078"],
};

const SKILLS=["Attack","Strength","Defence","Hitpoints","Ranged","Prayer","Magic","Cooking","Woodcutting","Fishing","Mining","Smithing","Crafting","Firemaking","Agility","Thieving"];
const SKILL_COLORS={Attack:"#c03030",Strength:"#00a000",Defence:"#4466cc",Hitpoints:"#cc3030",Ranged:"#408030",Prayer:"#6080b0",Magic:"#3040c0",Cooking:"#8a4a10",Woodcutting:"#2a6a10",Fishing:"#2a5aaa",Mining:"#6a6050",Smithing:"#6a6a6a",Crafting:"#8a6a30",Firemaking:"#d06010",Agility:"#305080",Thieving:"#5a2080"};
function xpLvl(l){let t=0;for(let i=1;i<l;i++)t+=Math.floor(i+300*Math.pow(2,i/7))/4;return Math.floor(t)}
function lvl(xp){for(let l=1;l<99;l++)if(xp<xpLvl(l+1))return l;return 99}

const ITEMS={
  logs:{n:"Logs",i:"🪵",s:false},oak_logs:{n:"Oak logs",i:"🪵",s:false},willow_logs:{n:"Willow logs",i:"🪵",s:false},yew_logs:{n:"Yew logs",i:"🪵",s:false},
  raw_shrimp:{n:"Raw shrimps",i:"🦐",s:false},shrimp:{n:"Shrimps",i:"🍤",s:false,heal:3},burnt:{n:"Burnt fish",i:"💀",s:false},
  raw_trout:{n:"Raw trout",i:"🐟",s:false},trout:{n:"Trout",i:"🐟",s:false,heal:7},
  raw_salmon:{n:"Raw salmon",i:"🐟",s:false},salmon:{n:"Salmon",i:"🐟",s:false,heal:9},
  raw_lobster:{n:"Raw lobster",i:"🦞",s:false},lobster:{n:"Lobster",i:"🦞",s:false,heal:12},
  raw_swordfish:{n:"Raw swordfish",i:"🐟",s:false},swordfish:{n:"Swordfish",i:"🐟",s:false,heal:14},
  copper:{n:"Copper ore",i:"🪨",s:false},tin:{n:"Tin ore",i:"🪨",s:false},iron:{n:"Iron ore",i:"🪨",s:false},
  coal:{n:"Coal",i:"⚫",s:false},gold_ore:{n:"Gold ore",i:"🟡",s:false},mithril:{n:"Mithril ore",i:"🔵",s:false},
  bronze_bar:{n:"Bronze bar",i:"🟫",s:false},iron_bar:{n:"Iron bar",i:"⬜",s:false},steel_bar:{n:"Steel bar",i:"⬜",s:false},
  bones:{n:"Bones",i:"🦴",s:false},big_bones:{n:"Big bones",i:"🦴",s:false},dragon_bones:{n:"Dragon bones",i:"🦴",s:false},
  coins:{n:"Coins",i:"🪙",s:true},feather:{n:"Feather",i:"🪶",s:true},
  bread:{n:"Bread",i:"🍞",s:false,heal:5},cake:{n:"Cake",i:"🎂",s:false,heal:12},beer:{n:"Beer",i:"🍺",s:false,heal:1},
  tinderbox:{n:"Tinderbox",i:"🔥",s:false},
  bronze_sword:{n:"Bronze sword",i:"⚔️",s:false,slot:"weapon",atk:4,str:3},
  iron_sword:{n:"Iron sword",i:"⚔️",s:false,slot:"weapon",atk:10,str:7},
  steel_sword:{n:"Steel sword",i:"⚔️",s:false,slot:"weapon",atk:16,str:12},
  mithril_sword:{n:"Mithril sword",i:"⚔️",s:false,slot:"weapon",atk:22,str:16},
  bronze_axe:{n:"Bronze axe",i:"🪓",s:false,slot:"weapon",atk:2,str:2,wc:true},
  iron_axe:{n:"Iron axe",i:"🪓",s:false,slot:"weapon",atk:5,str:4,wc:true},
  steel_axe:{n:"Steel axe",i:"🪓",s:false,slot:"weapon",atk:9,str:6,wc:true},
  bronze_pick:{n:"Bronze pickaxe",i:"⛏️",s:false,slot:"weapon",atk:2,str:1,mine:true},
  iron_pick:{n:"Iron pickaxe",i:"⛏️",s:false,slot:"weapon",atk:5,str:3,mine:true},
  steel_pick:{n:"Steel pickaxe",i:"⛏️",s:false,slot:"weapon",atk:9,str:5,mine:true},
  wooden_shield:{n:"Wooden shield",i:"🛡️",s:false,slot:"shield",def:3},
  bronze_shield:{n:"Bronze sq shield",i:"🛡️",s:false,slot:"shield",def:5},
  iron_shield:{n:"Iron sq shield",i:"🛡️",s:false,slot:"shield",def:10},
  steel_shield:{n:"Steel sq shield",i:"🛡️",s:false,slot:"shield",def:16},
  leather_body:{n:"Leather body",i:"🦺",s:false,slot:"body",def:6},
  iron_plate:{n:"Iron platebody",i:"🦺",s:false,slot:"body",def:14},
  steel_plate:{n:"Steel platebody",i:"🦺",s:false,slot:"body",def:22},
  bronze_helm:{n:"Bronze med helm",i:"⛑️",s:false,slot:"head",def:3},
  iron_helm:{n:"Iron full helm",i:"⛑️",s:false,slot:"head",def:7},
  steel_helm:{n:"Steel full helm",i:"⛑️",s:false,slot:"head",def:12},
  bronze_legs:{n:"Bronze platelegs",i:"👖",s:false,slot:"legs",def:4},
  iron_legs:{n:"Iron platelegs",i:"👖",s:false,slot:"legs",def:10},
  steel_legs:{n:"Steel platelegs",i:"👖",s:false,slot:"legs",def:16},
  air_rune:{n:"Air rune",i:"💨",s:true},water_rune:{n:"Water rune",i:"💧",s:true},fire_rune:{n:"Fire rune",i:"🔥",s:true},
  nature_rune:{n:"Nature rune",i:"🌿",s:true},death_rune:{n:"Death rune",i:"☠️",s:true},
  ring_wealth:{n:"Ring of wealth",i:"💍",s:false,slot:"ring"},amulet_str:{n:"Amulet of strength",i:"📿",s:false,slot:"ring",str:6},
  pot:{n:"Pot",i:"🏺",s:false},bucket:{n:"Bucket",i:"🪣",s:false},
  egg:{n:"Egg",i:"🥚",s:false},milk:{n:"Bucket of milk",i:"🥛",s:false},flour:{n:"Pot of flour",i:"🏺",s:false},
  herb:{n:"Grimy herb",i:"🌿",s:false},vial:{n:"Vial of water",i:"🧪",s:false},
  leather:{n:"Leather",i:"🟫",s:false},cowhide:{n:"Cowhide",i:"🟫",s:false},
};

function genMap(){
  const m=Array.from({length:MH},()=>Array(MW).fill(T.G));
  // River
  for(let y=0;y<MH;y++){const rx=50+Math.floor(Math.sin(y*0.1)*5+Math.cos(y*0.05)*3);for(let d=-2;d<=2;d++)if(rx+d>=0&&rx+d<MW)m[y][rx+d]=T.W;}
  // Bridges
  [[25,0],[50,0],[70,0]].forEach(([y])=>{const rx=50+Math.floor(Math.sin(y*0.1)*5+Math.cos(y*0.05)*3);for(let d=-2;d<=2;d++){m[y][rx+d]=T.BR;if(m[y+1])m[y+1][rx+d]=T.BR;}});
  // Lumbridge
  for(let y=22;y<38;y++)for(let x=12;x<32;x++)m[y][x]=T.D;
  // Paths network
  const drawPath=(x1,y1,x2,y2)=>{for(let x=Math.min(x1,x2);x<=Math.max(x1,x2);x++){m[y1][x]=T.PA;if(y1+1<MH)m[y1+1][x]=T.PA;}for(let y=Math.min(y1,y2);y<=Math.max(y1,y2);y++){m[y][x2]=T.PA;if(x2+1<MW)m[y][x2+1]=T.PA;}};
  drawPath(10,27,60,27);drawPath(20,10,20,80);drawPath(10,27,10,60);drawPath(20,15,40,15);drawPath(35,27,35,50);
  // Varrock
  for(let y=7;y<20;y++)for(let x=12;x<35;x++)m[y][x]=T.D;
  for(let y=8;y<19;y++)for(let x=14;x<33;x++)m[y][x]=T.S;
  // Bld helper
  const bld=(x,y,w,h)=>{for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++){if(dy===0||dy===h-1||dx===0||dx===w-1)m[y+dy][x+dx]=T.WA;else m[y+dy][x+dx]=T.WF;}m[y+h-1][x+Math.floor(w/2)]=T.WF;};
  // Lumbridge buildings
  bld(13,23,6,5);bld(23,23,6,5);bld(13,30,5,4);bld(23,30,5,4);bld(18,23,4,4);
  // Varrock buildings
  bld(15,9,5,4);bld(22,9,6,4);bld(15,14,5,4);bld(22,14,6,4);bld(28,9,4,4);
  // Barbarian Village
  for(let y=22;y<30;y++)for(let x=36;x<46;x++)m[y][x]=T.D;
  bld(37,23,4,4);bld(42,23,3,4);
  // Mine
  for(let y=55;y<68;y++)for(let x=8;x<24;x++)m[y][x]=T.S;
  // Fishing coast
  for(let y=18;y<35;y++)for(let x=55;x<68;x++)m[y][x]=T.SA;
  for(let y=18;y<35;y++)for(let x=66;x<75;x++)m[y][x]=T.W;
  // Al Kharid (desert)
  for(let y=35;y<55;y++)for(let x=55;x<80;x++)m[y][x]=T.DESERT;
  bld(60,38,5,4);bld(68,38,5,4);bld(60,44,5,4);
  // Dark forest
  for(let y=45;y<65;y++)for(let x=2;x<14;x++)m[y][x]=T.DG;
  // Wilderness
  for(let y=0;y<7;y++)for(let x=0;x<MW;x++)m[y][x]=T.D;
  for(let y=0;y<3;y++)for(let x=40;x<60;x++)m[y][x]=T.LAVA;
  // Agility course area
  for(let y=70;y<80;y++)for(let x=30;x<45;x++)m[y][x]=T.D;
  return m;
}

function genObjs(map){
  const o=[];let id=1;const nid=()=>id++;
  // Trees
  [[6,22],[8,24],[5,27],[7,30],[3,26],[32,24],[34,22],[36,26],[30,30],[33,28],[35,32],[31,20],[9,20],[4,34],[7,36]].forEach(([x,y])=>o.push({t:"tree",x,y,res:"logs",sk:"Woodcutting",xp:25,tm:1400,hp:1,mhp:1,rsp:8000,id:nid(),sub:"normal",lvl:1}));
  [[4,32],[6,34],[8,36],[38,20],[40,18],[39,22]].forEach(([x,y])=>o.push({t:"tree",x,y,res:"oak_logs",sk:"Woodcutting",xp:37,tm:1800,hp:1,mhp:1,rsp:10000,id:nid(),sub:"oak",lvl:15}));
  [[53,22],[54,28],[52,25]].forEach(([x,y])=>o.push({t:"tree",x,y,res:"willow_logs",sk:"Woodcutting",xp:67,tm:2200,hp:1,mhp:1,rsp:12000,id:nid(),sub:"willow",lvl:30}));
  [[25,42],[27,44]].forEach(([x,y])=>o.push({t:"tree",x,y,res:"yew_logs",sk:"Woodcutting",xp:175,tm:3500,hp:1,mhp:1,rsp:20000,id:nid(),sub:"yew",lvl:60}));
  // Mining rocks
  [[10,57],[12,59],[14,57],[11,61],[13,63],[16,59],[9,60],[15,62]].forEach(([x,y],i)=>o.push({t:"rock",x,y,res:i<3?"copper":i<5?"tin":"iron",sk:"Mining",xp:i>4?35:17,tm:i>4?2000:1500,hp:1,mhp:1,rsp:6000,id:nid(),lvl:i>4?15:1}));
  [[17,61],[18,59],[20,63]].forEach(([x,y])=>o.push({t:"rock",x,y,res:"coal",sk:"Mining",xp:50,tm:2600,hp:1,mhp:1,rsp:12000,id:nid(),lvl:30}));
  o.push({t:"rock",x:19,y:62,res:"gold_ore",sk:"Mining",xp:65,tm:3200,hp:1,mhp:1,rsp:15000,id:nid(),lvl:40});
  o.push({t:"rock",x:21,y:60,res:"mithril",sk:"Mining",xp:80,tm:4000,hp:1,mhp:1,rsp:20000,id:nid(),lvl:55});
  // Fishing spots
  [[58,22],[60,24],[59,28],[61,30]].forEach(([x,y],i)=>o.push({t:"fish",x,y,res:i<2?"raw_shrimp":i<3?"raw_trout":"raw_salmon",sk:"Fishing",xp:i<2?10:i<3?50:70,tm:i<2?1600:2200,hp:1,mhp:1,rsp:2000,id:nid(),lvl:i<2?1:i<3?20:30}));
  [[63,26]].forEach(([x,y])=>o.push({t:"fish",x,y,res:"raw_lobster",sk:"Fishing",xp:90,tm:2800,hp:1,mhp:1,rsp:3000,id:nid(),lvl:40}));
  // Cooking ranges
  [[15,25],[24,25]].forEach(([x,y])=>o.push({t:"range",x,y,id:nid(),hp:1,mhp:1}));
  o.push({t:"range",x:62,y:40,id:nid(),hp:1,mhp:1});
  // Furnace, anvil
  o.push({t:"furnace",x:24,y:31,id:nid(),hp:1,mhp:1});
  o.push({t:"anvil",x:15,y:31,id:nid(),hp:1,mhp:1});
  // Altar
  o.push({t:"altar",x:19,y:25,id:nid(),hp:1,mhp:1});
  // Banks
  [[17,10],[18,10],[19,10]].forEach(([x,y])=>o.push({t:"bank",x,y,id:nid(),hp:1,mhp:1}));
  [[62,46]].forEach(([x,y])=>o.push({t:"bank",x,y,id:nid(),hp:1,mhp:1}));
  // Shops
  o.push({t:"shop",x:24,y:10,id:nid(),hp:1,mhp:1});
  // Stalls (thieving)
  [[29,10],[30,10]].forEach(([x,y])=>o.push({t:"stall",x,y,id:nid(),hp:1,mhp:1,sub:"cake",lvl:5,xp:16}));
  [[63,40],[64,40]].forEach(([x,y])=>o.push({t:"stall",x,y,id:nid(),hp:1,mhp:1,sub:"silk",lvl:20,xp:36}));
  // Quest item spawns
  o.push({t:"spawn",x:26,y:29,id:nid(),hp:1,mhp:1,item:"egg",rsp:30000});
  o.push({t:"spawn",x:28,y:35,id:nid(),hp:1,mhp:1,item:"flour",rsp:30000});
  // Special: cow field for milk
  o.push({t:"spawn",x:38,y:32,id:nid(),hp:1,mhp:1,item:"milk",rsp:30000});
  // Agility obstacles
  [[32,72],[35,72],[38,72],[41,72]].forEach(([x,y],i)=>o.push({t:"agility",x,y,id:nid(),hp:1,mhp:1,sub:["log","rocks","net","ledge"][i],xp:15+i*10,lvl:1+i*5}));
  return o;
}

function genNPCs(){
  return [
    {t:"npc",x:20,y:28,nm:"Hans",c:"#cc3",dlg:["Welcome to Lumbridge!","Click trees, rocks, fish spots to gather.","Fight monsters for combat XP!","Head north to Varrock for shops & bank."],id:1},
    {t:"npc",x:24,y:28,nm:"Cook",c:"#da4",dlg:["I need help making a cake!","Bring me an egg, bucket of milk, and flour.","The egg is in a building to the east,","flour in a building to the south."],id:2,quest:"cook"},
    {t:"npc",x:10,y:59,nm:"Doric",c:"#57a",dlg:["Welcome to the mine, adventurer!","Mine copper and tin to smelt bronze.","The furnace is in Lumbridge."],id:3},
    {t:"npc",x:58,y:21,nm:"Fishing Tutor",c:"#4a8",dlg:["Click on fishing spots to fish!","Different spots give different fish."],id:4},
    {t:"npc",x:18,y:11,nm:"Banker",c:"#888",dlg:["Welcome to the Bank of Varrock.","Click a bank booth to open your bank."],id:5,bank:true},
    {t:"npc",x:24,y:11,nm:"Shopkeeper",c:"#a84",dlg:["Welcome to my shop!"],id:6,shop:true},
    {t:"npc",x:40,y:25,nm:"Barbarian",c:"#a64",dlg:["We are the Barbarians!","Strong warriors live here.","Prove yourself in combat!"],id:7},
    {t:"npc",x:62,y:42,nm:"Ali",c:"#da8",dlg:["Welcome to Al Kharid!","The desert is dangerous...","But rich with treasure!"],id:8},
    {t:"npc",x:34,y:74,nm:"Agility Trainer",c:"#58a",dlg:["Welcome to the Agility course!","Click obstacles to train Agility.","Higher levels = faster movement!"],id:9},
    {t:"npc",x:17,y:15,nm:"Guard",c:"#666",dlg:["Move along."],id:10,guard:true},
  ];
}

function genMons(){
  return [
    ...[[30,16],[32,18],[28,18],[31,14]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Chicken",c:"#ddb",hp:3,mhp:3,atk:1,def:1,str:1,xp:3,drops:[{i:"bones",c:1},{i:"feather",c:1,a:[1,5]},{i:"raw_shrimp",c:0.2}],rsp:6000,id:Math.random(),at:0,dead:false,agro:false,lvl:1})),
    ...[[38,32],[40,34],[42,30],[39,36],[41,38],[43,33]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Cow",c:"#8a6a40",hp:8,mhp:8,atk:1,def:1,str:1,xp:8,drops:[{i:"bones",c:1},{i:"cowhide",c:1},{i:"coins",c:0.3,a:[1,5]}],rsp:10000,id:Math.random(),at:0,dead:false,agro:false,lvl:2})),
    ...[[43,26],[45,28],[47,24],[44,30]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Goblin",c:"#5a8a30",hp:5,mhp:5,atk:2,def:2,str:2,xp:5,drops:[{i:"bones",c:1},{i:"coins",c:0.8,a:[3,25]},{i:"bronze_helm",c:0.04},{i:"beer",c:0.1}],rsp:8000,id:Math.random(),at:0,dead:false,agro:false,lvl:2})),
    ...[[5,48],[7,51],[4,54],[8,56],[6,59]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Giant Spider",c:"#444",hp:16,mhp:16,atk:5,def:3,str:4,xp:16,drops:[{i:"bones",c:1},{i:"coins",c:0.6,a:[5,40]},{i:"iron_sword",c:0.03},{i:"nature_rune",c:0.1,a:[1,3]}],rsp:12000,id:Math.random(),at:0,dead:false,agro:true,lvl:4})),
    ...[[3,50],[9,53],[6,61]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Hill Giant",c:"#7a5a3a",hp:35,mhp:35,atk:8,def:6,str:7,xp:35,drops:[{i:"big_bones",c:1},{i:"coins",c:0.9,a:[10,80]},{i:"iron_shield",c:0.04},{i:"iron_plate",c:0.02},{i:"death_rune",c:0.05,a:[1,2]}],rsp:18000,id:Math.random(),at:0,dead:false,agro:true,lvl:7})),
    ...[[65,42],[67,44],[70,40],[72,43]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Scorpion",c:"#8a4020",hp:12,mhp:12,atk:4,def:3,str:3,xp:12,drops:[{i:"coins",c:0.5,a:[1,20]}],rsp:10000,id:Math.random(),at:0,dead:false,agro:true,lvl:3})),
    ...[[68,48],[70,50],[72,46]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Desert Wolf",c:"#b09050",hp:20,mhp:20,atk:6,def:4,str:5,xp:22,drops:[{i:"bones",c:1},{i:"coins",c:0.7,a:[8,50]},{i:"herb",c:0.08}],rsp:14000,id:Math.random(),at:0,dead:false,agro:true,lvl:5})),
    ...[[20,3],[25,2],[30,4]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Skeleton",c:"#c8c0b0",hp:25,mhp:25,atk:7,def:5,str:6,xp:28,drops:[{i:"bones",c:1},{i:"coins",c:0.8,a:[10,60]},{i:"iron_helm",c:0.05},{i:"fire_rune",c:0.2,a:[2,8]}],rsp:15000,id:Math.random(),at:0,dead:false,agro:true,lvl:6})),
    ...[[35,2],[38,3]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Dark Wizard",c:"#3030a0",hp:18,mhp:18,atk:9,def:3,str:8,xp:25,drops:[{i:"coins",c:0.7,a:[15,70]},{i:"nature_rune",c:0.15,a:[2,5]},{i:"air_rune",c:0.4,a:[5,15]},{i:"death_rune",c:0.08,a:[1,3]}],rsp:16000,id:Math.random(),at:0,dead:false,agro:true,lvl:7})),
  ];
}

const SHOP_ITEMS=[
  {i:"bronze_sword",cost:20},{i:"iron_sword",cost:120},{i:"steel_sword",cost:500},
  {i:"bronze_axe",cost:16},{i:"iron_axe",cost:90},{i:"steel_axe",cost:400},
  {i:"bronze_pick",cost:16},{i:"iron_pick",cost:90},{i:"steel_pick",cost:400},
  {i:"wooden_shield",cost:10},{i:"bronze_shield",cost:30},{i:"iron_shield",cost:150},
  {i:"leather_body",cost:25},{i:"bronze_helm",cost:15},{i:"bronze_legs",cost:20},
  {i:"bread",cost:12},{i:"cake",cost:50},{i:"tinderbox",cost:1},{i:"bucket",cost:2},
];

const COOK_RECIPES={raw_shrimp:{out:"shrimp",burnt:"burnt",xp:30,lvl:1},raw_trout:{out:"trout",burnt:"burnt",xp:70,lvl:15},raw_salmon:{out:"salmon",burnt:"burnt",xp:90,lvl:25},raw_lobster:{out:"lobster",burnt:"burnt",xp:120,lvl:40}};

export default function RS(){
  const cvR=useRef(null),gR=useRef(null),fR=useRef(null);
  const [tab,setTab]=useState("inv");
  const [chat,setChat]=useState(["Welcome to RuneScape!","Left-click to interact. Right-click for options.","Try chopping trees or fighting monsters!"]);
  const [,fr]=useState(0);
  const [ctx_menu,setCtx]=useState(null);
  const [bankOpen,setBankOpen]=useState(false);
  const [shopOpen,setShopOpen]=useState(false);
  const chatR=useRef([]);chatR.current=chat;

  const addC=useCallback(m=>{const c=[...chatR.current.slice(-100),m];setChat(c);},[]);

  useEffect(()=>{
    const map=genMap(),objects=genObjs(map),npcs=genNPCs(),mons=genMons();
    const g={map,objects,npcs,mons,
      p:{x:20,y:28,path:[],mt:0,ms:200,
        sk:Object.fromEntries(SKILLS.map(s=>[s,s==="Hitpoints"?1154:0])),
        hp:10,mhp:10,prayer:1,maxPrayer:1,
        inv:[{i:"bronze_sword",c:1},{i:"wooden_shield",c:1},{i:"bronze_axe",c:1},{i:"tinderbox",c:1},{i:"bread",c:5},{i:"coins",c:50}],
        eq:{weapon:null,shield:null,head:null,body:null,legs:null,ring:null},
        bank:[{i:"coins",c:200}],
        act:null,actTm:0,actTgt:null,cmb:null,at:0,as:2400,face:"s",run:false,runE:100,
        style:0,quests:{cook:0},totalXp:0,
      },
      cam:{x:0,y:0},tk:0,lt:Date.now(),dlg:null,dlgL:0,rspQ:[],
      fx:[],  // visual effects: xp drops, hit splats, level ups
      groundItems:[], // items on ground
      fires:[], // active fires from firemaking
    };
    g.p.hp=lvl(g.p.sk.Hitpoints);g.p.mhp=g.p.hp;
    g.p.prayer=lvl(g.p.sk.Prayer);g.p.maxPrayer=g.p.prayer;
    gR.current=g;

    const cv=cvR.current,c=cv.getContext("2d");

    // === HELPERS ===
    function addI(id,cnt){const p=g.p,d=ITEMS[id];if(!d)return false;if(d.s){const e=p.inv.find(x=>x.i===id);if(e){e.c+=(cnt||1);return true;}}if(p.inv.length>=28){addC("Your inventory is full.");return false;}p.inv.push({i:id,c:cnt||1});return true;}
    function hasI(id){return g.p.inv.some(x=>x.i===id);}
    function remI(id,cnt){const p=g.p,idx=p.inv.findIndex(x=>x.i===id);if(idx===-1)return false;const s=p.inv[idx];if(ITEMS[id].s&&s.c>(cnt||1)){s.c-=(cnt||1);return true;}p.inv.splice(idx,1);return true;}
    function coinCount(){const c=g.p.inv.find(x=>x.i==="coins");return c?c.c:0;}

    // XP drop effect
    function addXpDrop(sk,amt){
      g.fx.push({type:"xp",x:g.p.x,y:g.p.y,text:"+"+amt+" "+sk,color:SKILL_COLORS[sk]||"#fff",life:1500,age:0});
    }
    // Hit splat effect
    function addHitSplat(x,y,dmg,isPlayer){
      g.fx.push({type:"hit",x,y,text:dmg===0?"0":String(dmg),color:dmg===0?"#44f":"#e22",bg:dmg===0?"#226":"#800",life:800,age:0,isPlayer});
    }
    // Level up effect
    function addLevelUp(sk,newLvl){
      for(let i=0;i<12;i++){
        g.fx.push({type:"lvlup",x:g.p.x,y:g.p.y,vx:(Math.random()-0.5)*3,vy:-Math.random()*2-1,color:SKILL_COLORS[sk]||"#ff0",life:1200,age:0});
      }
      g.fx.push({type:"xp",x:g.p.x,y:g.p.y-1,text:sk+" Level "+newLvl+"!",color:"#ff0",life:2500,age:0,big:true});
    }
    // Ground item drop
    function dropToGround(id,cnt,x,y){
      g.groundItems.push({i:id,c:cnt||1,x,y,time:Date.now()+60000});
    }

    function giveXp(sk,amt){
      const p=g.p,ol=lvl(p.sk[sk]);p.sk[sk]+=amt;p.totalXp+=amt;
      const nl=lvl(p.sk[sk]);
      addXpDrop(sk,amt);
      if(nl>ol){
        addC("🎉 "+sk+" level "+nl+"!");
        addLevelUp(sk,nl);
        if(sk==="Hitpoints"){p.mhp=nl;p.hp=Math.min(p.hp+1,p.mhp);}
        if(sk==="Prayer"){p.maxPrayer=nl;p.prayer=Math.min(p.prayer+1,p.maxPrayer);}
      }
    }

    function walkable(x,y){if(x<0||x>=MW||y<0||y>=MH)return false;const t=map[y][x];return t!==T.W&&t!==T.WA&&t!==T.LAVA;}
    function findPath(sx,sy,tx,ty){
      if(!walkable(tx,ty)){for(const[dx,dy]of[[0,-1],[0,1],[-1,0],[1,0],[1,1],[-1,-1],[1,-1],[-1,1]])if(walkable(tx+dx,ty+dy)){tx+=dx;ty+=dy;break;}if(!walkable(tx,ty))return[];}
      const vis=new Set(),q=[[sx,sy,[]]];vis.add(sx+","+sy);
      while(q.length>0&&vis.size<4000){const[cx,cy,path]=q.shift();if(cx===tx&&cy===ty)return path;
        for(const[dx,dy]of[[0,-1],[0,1],[-1,0],[1,0]]){const nx=cx+dx,ny=cy+dy,k=nx+","+ny;
          if(!vis.has(k)&&walkable(nx,ny)){vis.add(k);q.push([nx,ny,[...path,{x:nx,y:ny}]]);}}}return[];
    }
    function dist(a,b){return Math.abs(a.x-b.x)+Math.abs(a.y-b.y);}
    function adjacent(a,b){return Math.abs(a.x-b.x)<=1&&Math.abs(a.y-b.y)<=1;}
    function pathToAdjacent(tx,ty){const p=g.p;if(adjacent(p,{x:tx,y:ty}))return[];const dirs=[[0,-1],[0,1],[-1,0],[1,0],[1,-1],[-1,-1],[1,1],[-1,1]];let best=null,bl=99999;for(const[dx,dy]of dirs){const ax=tx+dx,ay=ty+dy;if(!walkable(ax,ay))continue;if(p.x===ax&&p.y===ay)return[];const pa=findPath(p.x,p.y,ax,ay);if(pa.length>0&&pa.length<bl){best=pa;bl=pa.length;}}return best||findPath(p.x,p.y,tx,ty);}
    function faceTarget(tx,ty){const p=g.p;if(tx>p.x)p.face="e";else if(tx<p.x)p.face="w";else if(ty>p.y)p.face="s";else if(ty<p.y)p.face="n";}

    // === ACTIONS ===
    function doAction(type,target){
      const p=g.p;p.act=null;p.actTgt=null;p.cmb=null;p.actTm=0;
      if(type==="walk"){p.path=findPath(p.x,p.y,target.x,target.y);return;}
      if(type==="chop"||type==="mine"||type==="fish"){p.path=pathToAdjacent(target.x,target.y);p.actTgt={type:"gather",obj:target,gatherType:type};return;}
      if(type==="cook"){const raw=p.inv.find(x=>COOK_RECIPES[x.i]);if(!raw){addC("You have nothing to cook.");return;}p.path=pathToAdjacent(target.x,target.y);p.actTgt={type:"cook",obj:target,raw:raw.i};return;}
      if(type==="smelt"){if(!hasI("copper")&&!hasI("iron")){addC("You need ores to smelt.");return;}p.path=pathToAdjacent(target.x,target.y);p.actTgt={type:"smelt",obj:target};return;}
      if(type==="smith"){if(!hasI("bronze_bar")){addC("You need a bronze bar.");return;}p.path=pathToAdjacent(target.x,target.y);p.actTgt={type:"smith",obj:target};return;}
      if(type==="pray"){p.path=pathToAdjacent(target.x,target.y);p.actTgt={type:"pray",obj:target};return;}
      if(type==="talk"){p.path=pathToAdjacent(target.x,target.y);p.actTgt={type:"talk",npc:target};return;}
      if(type==="attack"){p.path=pathToAdjacent(target.x,target.y);p.actTgt={type:"attack",mon:target};return;}
      if(type==="bank"){p.path=pathToAdjacent(target.x,target.y);p.actTgt={type:"bank",obj:target};return;}
      if(type==="shop"){p.path=pathToAdjacent(target.x,target.y);p.actTgt={type:"shop",npc:target};return;}
      if(type==="steal"){p.path=pathToAdjacent(target.x,target.y);p.actTgt={type:"steal",obj:target};return;}
      if(type==="pickup"){p.path=findPath(p.x,p.y,target.x,target.y);p.actTgt={type:"pickup",gi:target};return;}
      if(type==="agility"){p.path=pathToAdjacent(target.x,target.y);p.actTgt={type:"agility",obj:target};return;}
      if(type==="spawn_pickup"){p.path=pathToAdjacent(target.x,target.y);p.actTgt={type:"spawn_pickup",obj:target};return;}
    }

    function handleClick(e){
      if(e.button===2)return;setCtx(null);
      const rect=cv.getBoundingClientRect(),sx=cv.width/rect.width,sy=cv.height/rect.height;
      const mx=(e.clientX-rect.left)*sx,my=(e.clientY-rect.top)*sy;
      const tx=Math.floor(mx/TILE)+Math.floor(g.cam.x),ty=Math.floor(my/TILE)+Math.floor(g.cam.y);
      if(g.dlg){g.dlgL++;if(g.dlgL>=g.dlg.dlg.length){g.dlg=null;g.dlgL=0;}return;}
      for(const n of g.npcs)if(n.x===tx&&n.y===ty){doAction("talk",n);return;}
      for(const m of g.mons)if(!m.dead&&m.x===tx&&m.y===ty){doAction("attack",m);return;}
      // Ground items
      for(const gi of g.groundItems)if(gi.x===tx&&gi.y===ty){doAction("pickup",gi);return;}
      for(const o of g.objects)if(o.x===tx&&o.y===ty&&o.hp>0){
        if(o.t==="tree")doAction("chop",o);else if(o.t==="rock")doAction("mine",o);else if(o.t==="fish")doAction("fish",o);
        else if(o.t==="range")doAction("cook",o);else if(o.t==="furnace")doAction("smelt",o);else if(o.t==="anvil")doAction("smith",o);
        else if(o.t==="altar")doAction("pray",o);else if(o.t==="bank")doAction("bank",o);else if(o.t==="shop")doAction("shop",o);
        else if(o.t==="stall")doAction("steal",o);else if(o.t==="agility")doAction("agility",o);
        else if(o.t==="spawn")doAction("spawn_pickup",o);return;
      }
      doAction("walk",{x:tx,y:ty});
    }

    function handleRClick(e){
      e.preventDefault();
      const rect=cv.getBoundingClientRect(),sx=cv.width/rect.width,sy=cv.height/rect.height;
      const mx=(e.clientX-rect.left)*sx,my=(e.clientY-rect.top)*sy;
      const tx=Math.floor(mx/TILE)+Math.floor(g.cam.x),ty=Math.floor(my/TILE)+Math.floor(g.cam.y);
      const opts=[];
      for(const n of g.npcs)if(n.x===tx&&n.y===ty){
        opts.push({label:"Talk-to "+n.nm,color:"#ff0",action:()=>doAction("talk",n)});
        if(n.bank)opts.push({label:"Bank",color:"#0ff",action:()=>{setBankOpen(true);}});
        if(n.shop)opts.push({label:"Trade "+n.nm,color:"#0ff",action:()=>{setShopOpen(true);}});
        if(n.guard)opts.push({label:"Pickpocket "+n.nm,color:"#a4f",action:()=>{
          const tl=lvl(g.p.sk.Thieving);if(tl<10){addC("You need Thieving level 10.");return;}
          if(Math.random()<0.4+tl*0.015){addI("coins",Math.floor(Math.random()*20)+5);addC("You pickpocket the guard!");giveXp("Thieving",46);}
          else{const hit=Math.floor(Math.random()*3)+1;g.p.hp-=hit;addC("The guard catches you! (-"+hit+" HP)");addHitSplat(g.p.x,g.p.y,hit,true);}
        }});
      }
      for(const m of g.mons)if(!m.dead&&m.x===tx&&m.y===ty){opts.push({label:"Attack "+m.nm+" (Lvl "+m.lvl+")",color:"#f00",action:()=>doAction("attack",m)});}
      for(const gi of g.groundItems)if(gi.x===tx&&gi.y===ty){opts.push({label:"Take "+ITEMS[gi.i].n,color:"#fa0",action:()=>doAction("pickup",gi)});}
      for(const o of g.objects)if(o.x===tx&&o.y===ty&&o.hp>0){
        if(o.t==="tree")opts.push({label:"Chop "+(o.sub==="normal"?"Tree":o.sub.charAt(0).toUpperCase()+o.sub.slice(1)),color:"#0f0",action:()=>doAction("chop",o)});
        if(o.t==="rock")opts.push({label:"Mine Rock ("+ITEMS[o.res].n+")",color:"#aaa",action:()=>doAction("mine",o)});
        if(o.t==="fish")opts.push({label:"Fish",color:"#0af",action:()=>doAction("fish",o)});
        if(o.t==="range")opts.push({label:"Cook",color:"#f80",action:()=>doAction("cook",o)});
        if(o.t==="furnace")opts.push({label:"Smelt",color:"#fa0",action:()=>doAction("smelt",o)});
        if(o.t==="anvil")opts.push({label:"Smith",color:"#aaa",action:()=>doAction("smith",o)});
        if(o.t==="altar")opts.push({label:"Pray",color:"#ccf",action:()=>doAction("pray",o)});
        if(o.t==="bank")opts.push({label:"Bank",color:"#da0",action:()=>doAction("bank",o)});
        if(o.t==="stall")opts.push({label:"Steal from stall",color:"#a4f",action:()=>doAction("steal",o)});
        if(o.t==="agility")opts.push({label:"Cross "+o.sub,color:"#4af",action:()=>doAction("agility",o)});
        if(o.t==="spawn")opts.push({label:"Take "+ITEMS[o.item].n,color:"#fa0",action:()=>doAction("spawn_pickup",o)});
      }
      opts.push({label:"Walk here",color:"#ff0",action:()=>doAction("walk",{x:tx,y:ty})});
      opts.push({label:"Cancel",color:"#888",action:()=>setCtx(null)});
      setCtx({x:e.clientX-rect.left,y:e.clientY-rect.top,opts});
    }

    // === UPDATE ===
    function update(dt){
      const p=g.p;g.tk+=dt;
      // Run energy
      if(p.run&&p.path.length>0){p.runE=Math.max(0,p.runE-dt*0.008);if(p.runE<=0){p.run=false;addC("You're out of run energy.");}}
      else if(p.runE<100){const agiBonus=lvl(p.sk.Agility)*0.001;p.runE=Math.min(100,p.runE+dt*(0.004+agiBonus));}
      // Movement
      const agiSpd=Math.min(40,lvl(p.sk.Agility)*2);
      const spd=p.run?Math.max(80,130-agiSpd):200;
      if(p.path.length>0){
        p.mt+=dt;if(p.mt>=spd){p.mt=0;const nx=p.path.shift();
          const dx=nx.x-p.x,dy=nx.y-p.y;
          if(dx>0)p.face="e";else if(dx<0)p.face="w";else if(dy>0)p.face="s";else p.face="n";
          p.x=nx.x;p.y=nx.y;
          if(p.path.length===0&&p.actTgt)triggerAction();
        }
      }
      if(p.path.length===0&&p.actTgt&&!p.act)triggerAction();

      function triggerAction(){
            const at=p.actTgt;
            if(at.type==="talk"){g.dlg=at.npc;g.dlgL=0;p.actTgt=null;
              if(at.npc.quest==="cook"){
                if(p.quests.cook===0){p.quests.cook=1;addC("📜 Quest started: Cook's Assistant!");}
                else if(p.quests.cook===1&&hasI("egg")&&hasI("milk")&&hasI("flour")){
                  remI("egg");remI("milk");remI("flour");p.quests.cook=2;giveXp("Cooking",300);addI("coins",500);
                  addC("✅ Quest complete: Cook's Assistant!");addC("Reward: 300 Cooking XP, 500 coins.");
                }
              }
            }
            else if(at.type==="gather"){
              const obj=at.obj;faceTarget(obj.x,obj.y);
              if(obj.hp<=0){p.actTgt=null;return;}
              const gt=at.gatherType;
              if(gt==="chop")addC("You swing your axe at the tree...");
              else if(gt==="mine")addC("You swing your pickaxe at the rock...");
              else if(gt==="fish")addC("You cast your net into the water...");
              p.act="gathering";p.actTm=0;
            }
            else if(at.type==="attack"){p.cmb=at.mon;p.at=0;p.act="combat";faceTarget(at.mon.x,at.mon.y);addC("You attack the "+at.mon.nm+".");}
            else if(at.type==="cook"){faceTarget(at.obj.x,at.obj.y);p.act="cooking";p.actTm=0;}
            else if(at.type==="smelt"){faceTarget(at.obj.x,at.obj.y);p.act="smelting";p.actTm=0;}
            else if(at.type==="smith"){faceTarget(at.obj.x,at.obj.y);p.act="smithing";p.actTm=0;}
            else if(at.type==="pray"){p.prayer=p.maxPrayer;addC("You recharge your Prayer.");p.actTgt=null;}
            else if(at.type==="bank"){setBankOpen(true);p.actTgt=null;}
            else if(at.type==="shop"){setShopOpen(true);p.actTgt=null;}
            else if(at.type==="steal"){
              const o=at.obj;const tl=lvl(p.sk.Thieving);
              if(tl<(o.lvl||1)){addC("You need Thieving level "+(o.lvl||1)+".");p.actTgt=null;return;}
              if(Math.random()<0.5+tl*0.015){
                if(o.sub==="cake"){addI("cake",1);addC("You steal a cake!");}
                else{addI("coins",Math.floor(Math.random()*30)+10);addC("You steal some coins!");}
                giveXp("Thieving",o.xp||16);
              }else{const hit=Math.floor(Math.random()*2)+1;p.hp-=hit;addC("You fail to steal. (-"+hit+" HP)");addHitSplat(p.x,p.y,hit,true);}
              p.actTgt=null;
            }
            else if(at.type==="pickup"){
              const gi=at.gi;const idx=g.groundItems.indexOf(gi);
              if(idx>=0){if(addI(gi.i,gi.c)){addC("You pick up: "+ITEMS[gi.i].n);g.groundItems.splice(idx,1);}};p.actTgt=null;
            }
            else if(at.type==="spawn_pickup"){
              const o=at.obj;if(o.hp>0){addI(o.item,1);addC("You take the "+ITEMS[o.item].n+".");o.hp=0;g.rspQ.push({obj:o,time:Date.now()+o.rsp});}p.actTgt=null;
            }
            else if(at.type==="agility"){
              const o=at.obj;const al=lvl(p.sk.Agility);
              if(al<(o.lvl||1)){addC("You need Agility level "+(o.lvl||1)+".");p.actTgt=null;return;}
              if(Math.random()<0.7+al*0.01){giveXp("Agility",o.xp||15);addC("You cross the "+o.sub+"!");}
              else{const hit=Math.floor(Math.random()*2)+1;p.hp-=hit;addC("You slip! (-"+hit+" HP)");addHitSplat(p.x,p.y,hit,true);}
              p.actTgt=null;
            }
      }
      // Gathering
      if(p.act==="gathering"&&p.actTgt){
        const obj=p.actTgt.obj;if(obj.hp<=0){const next=g.objects.find(o=>o.t===obj.t&&o.hp>0&&adjacent(p,o));if(next){p.actTgt={type:"gather",obj:next,gatherType:p.actTgt.gatherType};p.actTm=0;faceTarget(next.x,next.y);}else{p.act=null;p.actTgt=null;}return;}
        faceTarget(obj.x,obj.y);const rl=obj.lvl||1,sl=lvl(p.sk[obj.sk]);
        if(sl<rl){addC("You need "+obj.sk+" level "+rl+".");p.act=null;p.actTgt=null;return;}
        p.actTm+=dt;
        if(Math.floor(p.actTm/500)!==Math.floor((p.actTm-dt)/500)){const gt=p.actTgt.gatherType;const pc=gt==="chop"?"#6a4020":gt==="mine"?"#8a8a8a":"#80c8ff";for(let i=0;i<3;i++)g.fx.push({type:"particle",x:obj.x,y:obj.y,vx:(Math.random()-0.5)*2,vy:-Math.random()*1.5-0.5,color:pc,life:600,age:0});}
        const speedBonus=Math.min(0.5,sl*0.008);const effectiveTime=obj.tm*(1-speedBonus);
        if(p.actTm>=effectiveTime){p.actTm=0;
          if(Math.random()<0.65+sl*0.01){
            if(addI(obj.res,1)){addC("You get: "+ITEMS[obj.res].n);giveXp(obj.sk,obj.xp);obj.hp=0;g.rspQ.push({obj,time:Date.now()+obj.rsp});for(let i=0;i<6;i++)g.fx.push({type:"particle",x:obj.x,y:obj.y,vx:(Math.random()-0.5)*3,vy:-Math.random()*2.5,color:"#4a8a20",life:800,age:0});}
          }else addC("You swing but miss.");
        }
      }
      // Cooking
      if(p.act==="cooking"&&p.actTgt){
        p.actTm+=dt;if(p.actTm>=1500){p.actTm=0;
          const raw=p.actTgt.raw;if(!hasI(raw)){p.act=null;p.actTgt=null;return;}
          const rec=COOK_RECIPES[raw];if(!rec){p.act=null;return;}
          const cl=lvl(p.sk.Cooking);if(cl<rec.lvl){addC("Need Cooking level "+rec.lvl+".");p.act=null;p.actTgt=null;return;}
          remI(raw);
          if(Math.random()<0.4+cl*0.025){addI(rec.out,1);addC("You cook the "+ITEMS[raw].n+".");giveXp("Cooking",rec.xp);}
          else{addI(rec.burnt,1);addC("You burn the "+ITEMS[raw].n+".");}
          if(!hasI(raw)){p.act=null;p.actTgt=null;}
        }
      }
      // Smelting
      if(p.act==="smelting"){p.actTm+=dt;if(p.actTm>=2200){p.actTm=0;
        if(hasI("copper")&&hasI("tin")){remI("copper");remI("tin");addI("bronze_bar",1);addC("You smelt a bronze bar.");giveXp("Smithing",6);}
        else if(hasI("iron")){remI("iron");if(Math.random()<0.5){addI("iron_bar",1);addC("You smelt an iron bar.");giveXp("Smithing",12);}else addC("The iron ore is impure...");}
        else{p.act=null;p.actTgt=null;addC("No ores to smelt.");}
      }}
      // Smithing
      if(p.act==="smithing"){p.actTm+=dt;if(p.actTm>=1800){p.actTm=0;
        if(hasI("bronze_bar")){remI("bronze_bar");const items=["bronze_sword","bronze_shield","bronze_helm","bronze_legs"];const made=items[Math.floor(Math.random()*items.length)];addI(made,1);addC("You smith: "+ITEMS[made].n);giveXp("Smithing",12);}
        else{p.act=null;p.actTgt=null;}
      }}
      // Combat
      if(p.act==="combat"&&p.cmb){
        const mon=p.cmb;if(mon.dead){p.act=null;p.cmb=null;p.actTgt=null;return;}
        if(mon.x>p.x)p.face="e";else if(mon.x<p.x)p.face="w";else if(mon.y>p.y)p.face="s";else p.face="n";
        p.at+=dt;
        if(p.at>=p.as){p.at=0;
          const al=lvl(p.sk.Attack),sl=lvl(p.sk.Strength);
          const wb=(()=>{const w=p.eq.weapon;return w?{a:ITEMS[w].atk||0,s:ITEMS[w].str||0}:{a:0,s:0};})();
          const rb=(()=>{if(p.eq.ring&&ITEMS[p.eq.ring].str)return ITEMS[p.eq.ring].str;return 0;})();
          const hit_c=0.35+al*0.018+wb.a*0.013;
          if(Math.random()<hit_c){
            const maxH=Math.max(1,Math.floor((sl*0.22+wb.s*0.35+rb*0.3))+1);const hit=Math.floor(Math.random()*maxH)+1;
            mon.hp-=hit;addHitSplat(mon.x,mon.y,hit,false);
            if(mon.hp<=0){mon.dead=true;addC("You killed the "+mon.nm+"!");
              const styles=[["Attack",mon.xp*4],["Strength",mon.xp*4],["Defence",mon.xp*4]];
              const[sk2,xp2]=styles[p.style]||styles[0];giveXp(sk2,xp2);giveXp("Hitpoints",Math.ceil(mon.xp*1.33));
              mon.drops.forEach(d=>{if(Math.random()<d.c){const a=d.a?d.a[0]+Math.floor(Math.random()*(d.a[1]-d.a[0])):1;dropToGround(d.i,a,mon.x,mon.y);addC("Drop: "+ITEMS[d.i].n+(a>1?" x"+a:""));}});
              g.rspQ.push({mon,time:Date.now()+mon.rsp});p.act=null;p.cmb=null;p.actTgt=null;
            }
          }else{addHitSplat(mon.x,mon.y,0,false);}
        }
        if(!mon.dead){mon.at+=dt;if(mon.at>=2400){mon.at=0;
          const dl=lvl(p.sk.Defence);const db=(()=>{let d=0;["shield","head","body","legs"].forEach(s=>{if(p.eq[s])d+=(ITEMS[p.eq[s]].def||0);});return d;})();
          const block=0.15+dl*0.018+db*0.01;
          if(Math.random()>block){const hit=Math.floor(Math.random()*mon.str)+1;p.hp-=hit;addHitSplat(p.x,p.y,hit,true);
            if(p.hp<=0){addC("☠️ Oh dear, you are dead!");p.hp=p.mhp;p.x=20;p.y=28;p.path=[];p.act=null;p.cmb=null;p.actTgt=null;
              g.fx.push({type:"death",x:p.x,y:p.y,life:1500,age:0});
            }
          }else{addHitSplat(p.x,p.y,0,true);}
        }}
      }
      // HP regen
      if(Math.floor(g.tk/6000)!==Math.floor((g.tk-dt)/6000)&&p.hp<p.mhp)p.hp=Math.min(p.mhp,p.hp+1);
      // Monster roaming & aggro
      if(Math.floor(g.tk/2500)!==Math.floor((g.tk-dt)/2500)){
        g.mons.forEach(m=>{if(m.dead||p.cmb===m)return;
          if(m.agro&&dist(m,p)<5&&!p.cmb){p.cmb=m;p.act="combat";p.at=0;p.path=[];p.actTgt=null;addC("⚠️ The "+m.nm+" attacks you!");return;}
          if(Math.random()<0.35){const dx=Math.floor(Math.random()*3)-1,dy=Math.floor(Math.random()*3)-1;
            const nx=m.x+dx,ny=m.y+dy;if(walkable(nx,ny)&&Math.abs(nx-m.ox)<6&&Math.abs(ny-m.oy)<6){m.x=nx;m.y=ny;}}
        });
      }
      // Respawns
      const now=Date.now();g.rspQ=g.rspQ.filter(r=>{if(now>=r.time){if(r.obj)r.obj.hp=r.obj.mhp;if(r.mon){r.mon.dead=false;r.mon.hp=r.mon.mhp;r.mon.at=0;}return false;}return true;});
      // Clean ground items
      g.groundItems=g.groundItems.filter(gi=>gi.time>now);
      // Clean fires
      g.fires=g.fires.filter(f=>f.time>now);
      // Update FX
      g.fx=g.fx.filter(f=>{f.age+=dt;return f.age<f.life;});
      // Camera
      g.cam.x=p.x-Math.floor(VTX/2);g.cam.y=p.y-Math.floor(VTY/2);
    }

    // === DRAW ===
    function draw(){
      const p=g.p,cx=Math.floor(g.cam.x),cy=Math.floor(g.cam.y);
      c.clearRect(0,0,CW,CH);
      // Terrain
      for(let ty=0;ty<VTY+1;ty++)for(let tx=0;tx<VTX+1;tx++){
        const mx=cx+tx,my=cy+ty;
        if(mx<0||mx>=MW||my<0||my>=MH){c.fillStyle="#111";c.fillRect(tx*TILE,ty*TILE,TILE,TILE);continue;}
        const t=map[my][mx],cols=TC[t]||["#333"];c.fillStyle=cols[(mx*7+my*13)%cols.length];c.fillRect(tx*TILE,ty*TILE,TILE,TILE);
        // Grass details
        if(t===T.G&&((mx*11+my*7)%17===0)){c.fillStyle="rgba(60,130,40,0.4)";c.fillRect(tx*TILE+8,ty*TILE+12,3,8);c.fillRect(tx*TILE+14,ty*TILE+10,3,10);c.fillRect(tx*TILE+22,ty*TILE+14,3,6);}
        if(t===T.G&&((mx*13+my*11)%23===0)){c.fillStyle="#d44";c.beginPath();c.arc(tx*TILE+20,ty*TILE+20,2,0,6.28);c.fill();c.fillStyle="#44d";c.beginPath();c.arc(tx*TILE+10,ty*TILE+8,2,0,6.28);c.fill();}
        // Desert details
        if(t===T.DESERT&&((mx*3+my*5)%11===0)){c.fillStyle="rgba(180,150,80,0.3)";c.fillRect(tx*TILE+5,ty*TILE+20,22,3);}
        // Water animation
        if(t===T.W){const wv=Math.sin(g.tk*0.002+mx*0.5+my*0.3)*8;c.fillStyle="rgba(80,150,220,0.15)";c.fillRect(tx*TILE,ty*TILE+12+wv,TILE,4);}
      }
      // Fires
      for(const f of g.fires){const sx=(f.x-cx)*TILE,sy=(f.y-cy)*TILE;if(sx<-TILE||sx>CW+TILE||sy<-TILE||sy>CH+TILE)continue;
        const flicker=Math.sin(g.tk*0.01+f.x)*3;
        c.fillStyle="#f80";c.beginPath();c.arc(sx+16,sy+16+flicker,8,0,6.28);c.fill();
        c.fillStyle="#ff0";c.beginPath();c.arc(sx+16,sy+14+flicker,5,0,6.28);c.fill();
        c.fillStyle="rgba(255,100,0,0.15)";c.beginPath();c.arc(sx+16,sy+16,18,0,6.28);c.fill();
      }
      // Ground items
      for(const gi of g.groundItems){const sx=(gi.x-cx)*TILE,sy=(gi.y-cy)*TILE;if(sx<-TILE||sx>CW+TILE||sy<-TILE||sy>CH+TILE)continue;
        c.fillStyle="rgba(255,50,50,0.25)";c.fillRect(sx+8,sy+20,16,10);
        c.font="14px sans-serif";c.textAlign="center";c.fillText(ITEMS[gi.i].i,sx+16,sy+28);
      }
      // Objects
      for(const o of g.objects){
        const sx=(o.x-cx)*TILE,sy=(o.y-cy)*TILE;if(sx<-TILE||sx>CW+TILE||sy<-TILE||sy>CH+TILE)continue;
        if(o.hp<=0){
          if(o.t==="tree"){c.fillStyle="#5a3a18";c.fillRect(sx+12,sy+16,8,14);}
          if(o.t==="rock"){c.fillStyle="#555";c.beginPath();c.arc(sx+16,sy+22,5,0,6.28);c.fill();}
          continue;
        }
        if(o.t==="tree"){
          const shake=g.p.act==="gathering"&&g.p.actTgt?.obj===o?Math.sin(g.tk*0.02)*2:0;
          c.fillStyle="#4a2a10";c.fillRect(sx+12+shake,sy+16,8,14);
          c.fillStyle=o.sub==="oak"?"#2a6a18":o.sub==="willow"?"#3a7a30":o.sub==="yew"?"#1a5a20":"#2a8a18";
          c.beginPath();c.arc(sx+16+shake,sy+10,o.sub==="yew"?16:14,0,6.28);c.fill();
          c.fillStyle=o.sub==="oak"?"#358a22":o.sub==="willow"?"#4a9a40":o.sub==="yew"?"#2a7a2a":"#38a828";
          c.beginPath();c.arc(sx+12+shake,sy+8,o.sub==="yew"?10:8,0,6.28);c.fill();
        }
        if(o.t==="rock"){
          const rc=o.res==="copper"?"#a06028":o.res==="tin"?"#aaa":o.res==="iron"?"#8a5a3a":o.res==="coal"?"#3a3a3a":o.res==="gold_ore"?"#d4a030":"#4466aa";
          const shake=g.p.act==="gathering"&&g.p.actTgt?.obj===o?Math.sin(g.tk*0.03)*1.5:0;
          c.fillStyle="#666";c.beginPath();c.arc(sx+16+shake,sy+18,12,0,6.28);c.fill();
          c.fillStyle=rc;c.beginPath();c.arc(sx+13+shake,sy+15,6,0,6.28);c.fill();c.beginPath();c.arc(sx+21+shake,sy+19,5,0,6.28);c.fill();
        }
        if(o.t==="fish"){
          c.fillStyle="rgba(100,200,255,0.5)";const bob=Math.sin(g.tk*0.003+o.x)*3;
          c.beginPath();c.arc(sx+16,sy+16+bob,8,0,6.28);c.fill();
          c.fillStyle="rgba(255,255,255,0.5)";c.beginPath();c.arc(sx+14,sy+13+bob,3,0,6.28);c.fill();
          c.fillStyle="rgba(80,180,240,0.3)";c.beginPath();c.arc(sx+20,sy+18+bob,4,0,6.28);c.fill();
        }
        if(o.t==="range"){c.fillStyle="#444";c.fillRect(sx+4,sy+4,24,24);c.fillStyle="#c44";c.fillRect(sx+8,sy+10,16,10);const fl=Math.sin(g.tk*0.008)*2;c.fillStyle="#f80";c.fillRect(sx+11,sy+12+fl,4,6);c.fillRect(sx+17,sy+12-fl,4,6);}
        if(o.t==="furnace"){c.fillStyle="#555";c.fillRect(sx+4,sy+2,24,28);c.fillStyle="#a33";c.fillRect(sx+8,sy+12,16,12);const gl=Math.sin(g.tk*0.006)*0.15+0.85;c.fillStyle=`rgba(255,100,0,${gl})`;c.fillRect(sx+10,sy+14,12,8);}
        if(o.t==="anvil"){c.fillStyle="#666";c.fillRect(sx+6,sy+10,20,14);c.fillStyle="#888";c.fillRect(sx+4,sy+8,24,6);}
        if(o.t==="altar"){c.fillStyle="#ddd";c.fillRect(sx+4,sy+8,24,18);c.fillStyle="#fff";c.fillRect(sx+10,sy+4,12,8);const gl=Math.sin(g.tk*0.004)*0.2+0.3;c.fillStyle=`rgba(200,200,255,${gl})`;c.beginPath();c.arc(sx+16,sy+12,12,0,6.28);c.fill();}
        if(o.t==="bank"){c.fillStyle="#c8a84e";c.fillRect(sx+2,sy+4,28,24);c.strokeStyle="#8a6020";c.lineWidth=1;c.strokeRect(sx+2,sy+4,28,24);c.fillStyle="#fff";c.font="bold 8px sans-serif";c.textAlign="center";c.fillText("BANK",sx+16,sy+19);}
        if(o.t==="shop"){c.fillStyle="#8a5a30";c.fillRect(sx+2,sy+4,28,24);c.fillStyle="#fff";c.font="bold 7px sans-serif";c.textAlign="center";c.fillText("SHOP",sx+16,sy+19);}
        if(o.t==="stall"){c.fillStyle="#8a4a20";c.fillRect(sx+2,sy+6,28,20);c.fillStyle="#c06030";c.fillRect(sx+0,sy+2,32,8);c.fillStyle="#fff";c.font="bold 7px sans-serif";c.textAlign="center";c.fillText(o.sub==="silk"?"SILK":"CAKE",sx+16,sy+20);}
        if(o.t==="spawn"){c.fillStyle="rgba(255,200,50,0.3)";c.beginPath();c.arc(sx+16,sy+16,6,0,6.28);c.fill();c.font="14px sans-serif";c.textAlign="center";c.fillText(ITEMS[o.item].i,sx+16,sy+22);}
        if(o.t==="agility"){c.fillStyle="#5a4a30";if(o.sub==="log"){c.fillRect(sx+2,sy+14,28,6);}else if(o.sub==="rocks"){c.beginPath();c.arc(sx+10,sy+18,6,0,6.28);c.fill();c.beginPath();c.arc(sx+22,sy+16,5,0,6.28);c.fill();}
          else if(o.sub==="net"){c.strokeStyle="#8a7a5a";c.lineWidth=1;for(let i=0;i<5;i++){c.beginPath();c.moveTo(sx+4+i*6,sy+4);c.lineTo(sx+4+i*6,sy+28);c.stroke();c.beginPath();c.moveTo(sx+4,sy+4+i*6);c.lineTo(sx+28,sy+4+i*6);c.stroke();}}
          else{c.fillRect(sx+4,sy+8,24,4);c.fillRect(sx+4,sy+20,24,4);}
          c.fillStyle="#4af";c.font="bold 7px sans-serif";c.textAlign="center";c.fillText(o.sub,sx+16,sy+32);
        }
      }
      // Monsters
      for(const m of g.mons){if(m.dead)continue;const sx=(m.x-cx)*TILE,sy=(m.y-cy)*TILE;if(sx<-TILE||sx>CW+TILE||sy<-TILE||sy>CH+TILE)continue;
        c.fillStyle="rgba(0,0,0,0.1)";c.beginPath();c.ellipse(sx+16,sy+28,10,4,0,0,6.28);c.fill();
        c.fillStyle=m.c;c.beginPath();c.arc(sx+16,sy+16,10,0,6.28);c.fill();
        c.fillStyle="rgba(0,0,0,0.12)";c.beginPath();c.arc(sx+16,sy+16,10,0,3.14);c.fill();
        c.fillStyle="#fff";c.beginPath();c.arc(sx+12,sy+14,3,0,6.28);c.fill();c.beginPath();c.arc(sx+20,sy+14,3,0,6.28);c.fill();
        c.fillStyle="#111";c.beginPath();c.arc(sx+13,sy+14,1.5,0,6.28);c.fill();c.beginPath();c.arc(sx+21,sy+14,1.5,0,6.28);c.fill();
        // HP bar
        if(m.hp<m.mhp){c.fillStyle="#300";c.fillRect(sx+4,sy-4,24,4);c.fillStyle="#0c0";c.fillRect(sx+4,sy-4,24*m.hp/m.mhp,4);}
        c.fillStyle=m.agro?"#f44":"#ff0";c.font="bold 9px sans-serif";c.textAlign="center";c.fillText(m.nm+" ("+m.lvl+")",sx+16,sy-7);
      }
      // NPCs
      for(const n of g.npcs){const sx=(n.x-cx)*TILE,sy=(n.y-cy)*TILE;if(sx<-TILE||sx>CW+TILE||sy<-TILE||sy>CH+TILE)continue;
        c.fillStyle="rgba(0,0,0,0.1)";c.beginPath();c.ellipse(sx+16,sy+28,8,3,0,0,6.28);c.fill();
        c.fillStyle=n.c;c.beginPath();c.arc(sx+16,sy+20,8,0,6.28);c.fill();
        c.fillStyle="#f0d8a0";c.beginPath();c.arc(sx+16,sy+10,7,0,6.28);c.fill();
        c.fillStyle="#333";c.beginPath();c.arc(sx+14,sy+9,1.5,0,6.28);c.fill();c.beginPath();c.arc(sx+18,sy+9,1.5,0,6.28);c.fill();
        c.fillStyle="#0ff";c.font="bold 9px sans-serif";c.textAlign="center";c.fillText(n.nm,sx+16,sy-2);
      }
      // Player
      const px=(p.x-cx)*TILE,py=(p.y-cy)*TILE;
      c.fillStyle="rgba(0,0,0,0.12)";c.beginPath();c.ellipse(px+16,py+28,8,3,0,0,6.28);c.fill();
      const legC=p.eq.legs?"#6a5830":"#2a4a8a";c.fillStyle=legC;
      const walkAnim=p.path.length>0?Math.sin(g.tk*0.012)*3:0;
      c.fillRect(px+10,py+22-walkAnim,5,8);c.fillRect(px+17,py+22+walkAnim,5,8);
      const bodyC=p.eq.body?"#6a5a40":"#2266cc";c.fillStyle=bodyC;c.beginPath();c.arc(px+16,py+18,9,0,6.28);c.fill();
      // Arms swing in combat
      const swing=p.act==="combat"?Math.sin(g.tk*0.01)*6:0;
      c.fillStyle=bodyC;c.fillRect(px+2,py+14+swing,5,10);c.fillRect(px+25,py+14-swing,5,10);
      c.fillStyle=p.eq.head?"#6a6a6a":"#f0d8a0";c.beginPath();c.arc(px+16,py+8,7,0,6.28);c.fill();
      if(!p.eq.head){const ed={n:[0,-1],s:[0,1],e:[1,0],w:[-1,0]}[p.face];
        c.fillStyle="#333";c.beginPath();c.arc(px+14+ed[0],py+7+ed[1]*0.5,1.5,0,6.28);c.fill();
        c.beginPath();c.arc(px+18+ed[0],py+7+ed[1]*0.5,1.5,0,6.28);c.fill();}
      else{c.fillStyle="#555";c.beginPath();c.arc(px+16,py+8,7.5,3.4,6.0);c.fill();}
      if(p.eq.weapon){const ed={n:[0,-1],s:[0,1],e:[1,0],w:[-1,0]}[p.face];
        c.strokeStyle="#b07030";c.lineWidth=2.5;c.beginPath();c.moveTo(px+26+ed[0]*3,py+12+swing);c.lineTo(px+26+ed[0]*10,py+4+swing);c.stroke();}
      if(p.eq.shield){c.fillStyle="#7a5a20";c.beginPath();c.arc(px+4,py+18-swing,5,0,6.28);c.fill();c.fillStyle="#9a7a30";c.beginPath();c.arc(px+4,py+18-swing,3,0,6.28);c.fill();}
      c.fillStyle="#0f0";c.font="bold 9px sans-serif";c.textAlign="center";c.fillText("You",px+16,py-12);
      c.fillStyle="#300";c.fillRect(px+4,py-9,24,5);c.fillStyle="#0c0";c.fillRect(px+4,py-9,24*p.hp/p.mhp,5);
      if(p.prayer>0){c.fillStyle="#114";c.fillRect(px+4,py-4,24,2);c.fillStyle="#48c";c.fillRect(px+4,py-4,24*p.prayer/p.maxPrayer,2);}
      // Action bar
      if(p.act==="gathering"||p.act==="cooking"||p.act==="smelting"||p.act==="smithing"){
        const total=p.actTgt?.obj?.tm||(p.act==="cooking"?1500:p.act==="smelting"?2200:1800);
        c.fillStyle="rgba(0,0,0,0.6)";c.fillRect(px-2,py+32,36,5);c.fillStyle="#ff0";c.fillRect(px-2,py+32,36*Math.min(1,p.actTm/total),5);
      }
      // Visual effects
      for(const f of g.fx){
        const fsx=(f.x-cx)*TILE+16,fsy=(f.y-cy)*TILE;const alpha=1-f.age/f.life;
        if(f.type==="xp"){
          c.globalAlpha=alpha;c.font=f.big?"bold 12px sans-serif":"bold 10px sans-serif";c.textAlign="center";
          c.fillStyle="#000";c.fillText(f.text,fsx+1,fsy-15-f.age*0.03+1);
          c.fillStyle=f.color;c.fillText(f.text,fsx,fsy-15-f.age*0.03);c.globalAlpha=1;
        }
        if(f.type==="hit"){
          c.globalAlpha=Math.min(1,alpha*2);const hy=fsy+8-f.age*0.02;
          c.fillStyle=f.bg;c.beginPath();c.arc(fsx,hy,9,0,6.28);c.fill();
          c.fillStyle="#fff";c.font="bold 10px sans-serif";c.textAlign="center";c.fillText(f.text,fsx,hy+4);c.globalAlpha=1;
        }
        if(f.type==="lvlup"){
          c.globalAlpha=alpha;c.fillStyle=f.color;
          const fx=fsx+(f.vx||0)*f.age*0.05,fy=fsy+(f.vy||0)*f.age*0.05;
          c.beginPath();c.arc(fx,fy,3,0,6.28);c.fill();c.globalAlpha=1;
        }
        if(f.type==="death"){
          c.globalAlpha=alpha*0.5;c.fillStyle="#f00";c.font="bold 20px sans-serif";c.textAlign="center";
          c.fillText("☠️",fsx,fsy+16);c.globalAlpha=1;
        }
        if(f.type==="particle"){
          c.globalAlpha=alpha;c.fillStyle=f.color;
          c.beginPath();c.arc(fsx+(f.vx||0)*f.age*0.06,fsy+16+(f.vy||0)*f.age*0.06,2.5*alpha+0.5,0,6.28);c.fill();c.globalAlpha=1;
        }
      }
      // Dialogue
      if(g.dlg){const n=g.dlg;
        c.fillStyle="rgba(8,8,6,0.93)";c.fillRect(16,CH-110,CW-32,94);
        c.strokeStyle="#c8a84e";c.lineWidth=2;c.strokeRect(16,CH-110,CW-32,94);
        c.fillStyle="#ff0";c.font="bold 13px sans-serif";c.textAlign="left";c.fillText(n.nm+":",30,CH-90);
        c.fillStyle="#ddd";c.font="12px sans-serif";c.fillText(n.dlg[Math.min(g.dlgL,n.dlg.length-1)],30,CH-68);
        c.fillStyle="#888";c.font="10px sans-serif";c.fillText("Click to continue...",30,CH-38);
      }
      // Location
      let loc="Wilderness";
      if(p.y>=22&&p.y<38&&p.x>=12&&p.x<32)loc="Lumbridge";
      else if(p.y>=7&&p.y<20&&p.x>=12&&p.x<35)loc="Varrock";
      else if(p.y>=55&&p.x>=8&&p.x<24)loc="Lumbridge Mine";
      else if(p.y>=18&&p.y<35&&p.x>=55)loc="Fishing Coast";
      else if(p.y>=45&&p.y<65&&p.x<14)loc="Dark Forest";
      else if(p.y>=35&&p.y<55&&p.x>=55)loc="Al Kharid";
      else if(p.y>=22&&p.y<30&&p.x>=36&&p.x<46)loc="Barbarian Village";
      else if(p.y>=70&&p.x>=30&&p.x<45)loc="Agility Course";
      else if(p.y>=35&&p.y<50&&p.x>=35&&p.x<50)loc="Fields";
      else if(p.y<7)loc="⚠️ Wilderness";
      c.fillStyle="rgba(0,0,0,0.6)";c.fillRect(2,2,100,18);
      c.fillStyle=loc.includes("Wilderness")?"#f44":"#ff0";c.font="bold 10px sans-serif";c.textAlign="left";c.fillText(loc,6,14);
      // Minimap
      const ms=88,mmx=CW-ms-4,mmy=4;
      c.fillStyle="rgba(0,0,0,0.8)";c.fillRect(mmx-2,mmy-2,ms+4,ms+4);c.strokeStyle="#5a4a30";c.lineWidth=1;c.strokeRect(mmx-2,mmy-2,ms+4,ms+4);
      const sc=ms/MW;
      for(let my=0;my<MH;my+=2)for(let mx=0;mx<MW;mx+=2){
        const t=map[my][mx];c.fillStyle=t===T.W?"#2855a0":t===T.WA?"#555":t===T.S?"#6a6a6a":t===T.SA?"#c8b878":t===T.PA||t===T.D?"#8a7a5a":t===T.DG?"#1a4a12":t===T.DESERT?"#d4b870":t===T.LAVA?"#a02010":"#3a7a2a";
        c.fillRect(mmx+mx*sc,mmy+my*sc,Math.ceil(sc*2),Math.ceil(sc*2));
      }
      c.fillStyle="#fff";c.fillRect(mmx+p.x*sc-1,mmy+p.y*sc-1,3,3);
      g.mons.forEach(m=>{if(!m.dead){c.fillStyle="#f00";c.fillRect(mmx+m.x*sc,mmy+m.y*sc,2,2);}});
      g.npcs.forEach(n=>{c.fillStyle="#0ff";c.fillRect(mmx+n.x*sc,mmy+n.y*sc,2,2);});
      c.fillStyle="#c8a84e";c.font="bold 10px sans-serif";c.textAlign="center";c.fillText("N",mmx+ms/2,mmy-4);
    }

    function loop(){const now=Date.now(),dt=Math.min(now-g.lt,200);g.lt=now;update(dt);draw();fr(n=>n+1);fR.current=requestAnimationFrame(loop);}
    cv.addEventListener("click",handleClick);cv.addEventListener("contextmenu",handleRClick);
    fR.current=requestAnimationFrame(loop);
    return()=>{cancelAnimationFrame(fR.current);cv.removeEventListener("click",handleClick);cv.removeEventListener("contextmenu",handleRClick);};
  },[addC]);

  const g=gR.current,p=g?.player||g?.p;
  const cLvl=p?Math.floor((lvl(p.sk.Attack)+lvl(p.sk.Strength)+lvl(p.sk.Defence)+lvl(p.sk.Hitpoints))/4):1;
  const totalLvl=p?SKILLS.reduce((a,s)=>a+lvl(p.sk[s]),0):16;

  function eat(idx){if(!p)return;const s=p.inv[idx];if(!s)return;const d=ITEMS[s.i];if(d.heal){if(p.hp>=p.mhp)return;p.hp=Math.min(p.mhp,p.hp+d.heal);addC("You eat "+d.n+". +"+d.heal+" HP");if(d.s&&s.c>1)s.c--;else p.inv.splice(idx,1);}}
  function drop(idx){if(!p||!g)return;const s=p.inv[idx];if(!s)return;g.groundItems.push({i:s.i,c:s.c,x:p.x,y:p.y,time:Date.now()+60000});addC("You drop: "+ITEMS[s.i].n);p.inv.splice(idx,1);}
  function equip(idx){if(!p)return;const s=p.inv[idx];if(!s)return;const d=ITEMS[s.i];if(!d.slot)return;const old=p.eq[d.slot];p.eq[d.slot]=s.i;p.inv.splice(idx,1);if(old)p.inv.push({i:old,c:1});addC("Equipped: "+d.n);}
  function unequip(slot){if(!p||!p.eq[slot])return;if(p.inv.length>=28){addC("Inventory full.");return;}const it=p.eq[slot];p.eq[slot]=null;p.inv.push({i:it,c:1});}
  function bury(idx){if(!p||!g)return;const s=p.inv[idx];if(!s||(s.i!=="bones"&&s.i!=="big_bones"&&s.i!=="dragon_bones"))return;
    const xpAmt=s.i==="dragon_bones"?72:s.i==="big_bones"?15:4;p.inv.splice(idx,1);addC("You bury the bones.");
    const ol=lvl(p.sk.Prayer);p.sk.Prayer+=xpAmt;p.totalXp+=xpAmt;
    if(g)g.fx.push({type:"xp",x:p.x,y:p.y,text:"+"+xpAmt+" Prayer",color:SKILL_COLORS.Prayer,life:1500,age:0});
    const nl=lvl(p.sk.Prayer);if(nl>ol){addC("🎉 Prayer level "+nl+"!");p.maxPrayer=nl;p.prayer=Math.min(p.prayer+1,p.maxPrayer);}}
  function firemaking(idx){if(!p||!g)return;const s=p.inv[idx];if(!s)return;
    const logTypes={logs:{xp:40,lvl:1},oak_logs:{xp:60,lvl:15},willow_logs:{xp:90,lvl:30},yew_logs:{xp:202,lvl:60}};
    const lt=logTypes[s.i];if(!lt)return;if(!p.inv.some(x=>x.i==="tinderbox")){addC("You need a tinderbox.");return;}
    const fl=lvl(p.sk.Firemaking);if(fl<lt.lvl){addC("Need Firemaking level "+lt.lvl+".");return;}
    p.inv.splice(idx,1);g.fires.push({x:p.x,y:p.y,time:Date.now()+45000});addC("You light a fire.");
    const ol=lvl(p.sk.Firemaking);p.sk.Firemaking+=lt.xp;p.totalXp+=lt.xp;
    g.fx.push({type:"xp",x:p.x,y:p.y,text:"+"+lt.xp+" Firemaking",color:SKILL_COLORS.Firemaking,life:1500,age:0});
    const nl=lvl(p.sk.Firemaking);if(nl>ol){addC("🎉 Firemaking level "+nl+"!");}}
  function bankDeposit(idx){if(!p)return;const s=p.inv[idx];if(!s)return;const be=p.bank.find(b=>b.i===s.i);if(be)be.c+=s.c;else p.bank.push({i:s.i,c:s.c});p.inv.splice(idx,1);fr(n=>n+1);}
  function bankDepositAll(){if(!p)return;while(p.inv.length>0){const s=p.inv[0];const be=p.bank.find(b=>b.i===s.i);if(be)be.c+=s.c;else p.bank.push({i:s.i,c:s.c});p.inv.splice(0,1);}addC("All items deposited.");fr(n=>n+1);}
  function bankWithdraw(idx){if(!p)return;const s=p.bank[idx];if(!s)return;if(p.inv.length>=28&&!(ITEMS[s.i].s&&p.inv.find(x=>x.i===s.i))){addC("Inventory full.");return;}
    const d=ITEMS[s.i];if(d.s){const e=p.inv.find(x=>x.i===s.i);if(e)e.c+=s.c;else p.inv.push({i:s.i,c:s.c});p.bank.splice(idx,1);}else{p.inv.push({i:s.i,c:1});s.c--;if(s.c<=0)p.bank.splice(idx,1);}fr(n=>n+1);}
  function buyItem(si){if(!p)return;const coins=p.inv.find(x=>x.i==="coins");const have=coins?coins.c:0;if(have<si.cost){addC("Need "+si.cost+" coins.");return;}
    if(coins.c>si.cost)coins.c-=si.cost;else p.inv.splice(p.inv.indexOf(coins),1);
    if(ITEMS[si.i].s){const e=p.inv.find(x=>x.i===si.i);if(e){e.c++;return;}};if(p.inv.length>=28){addC("Inventory full.");return;}p.inv.push({i:si.i,c:1});addC("Bought: "+ITEMS[si.i].n);}

  const invSlots=[];
  if(p)for(let i=0;i<28;i++){const s=p.inv[i];const d=s?ITEMS[s.i]:null;const isLog=s&&["logs","oak_logs","willow_logs","yew_logs"].includes(s.i);
    invSlots.push(<div key={i} style={{width:38,height:38,background:s?"rgba(80,70,50,0.55)":"rgba(30,25,18,0.35)",border:"1px solid rgba(200,168,78,0.12)",display:"flex",alignItems:"center",justifyContent:"center",cursor:s?"pointer":"default",borderRadius:3,position:"relative",fontSize:17}}
      onClick={()=>{if(!s)return;if(bankOpen){bankDeposit(i);return;}if(d.heal)eat(i);else if(d.slot)equip(i);else if(s.i==="bones"||s.i==="big_bones"||s.i==="dragon_bones")bury(i);else if(isLog)firemaking(i);}}
      onContextMenu={e=>{e.preventDefault();if(!s)return;if(bankOpen){bankDeposit(i);return;}drop(i);}}
    >{s&&<span>{d.i}</span>}{s&&d.s&&s.c>1&&<span style={{position:"absolute",top:0,left:2,fontSize:8,color:"#ff0",fontWeight:700}}>{s.c>99999?"99k+":s.c}</span>}
      {s&&<span style={{position:"absolute",bottom:0,right:1,fontSize:6,color:"#aa9",maxWidth:34,overflow:"hidden",whiteSpace:"nowrap"}}>{d.n}</span>}
    </div>);}

  return (
    <div style={{width:"100vw",height:"100vh",background:"#1a1510",display:"flex",flexDirection:"column",overflow:"hidden",fontFamily:"'Segoe UI',sans-serif",userSelect:"none"}}>
      {/* HUD */}
      <div style={{height:36,background:"linear-gradient(180deg,#3a3020,#2a2518)",borderBottom:"2px solid #5a4a30",display:"flex",alignItems:"center",padding:"0 10px",gap:10,flexShrink:0,overflow:"hidden"}}>
        <span style={{color:"#c8a84e",fontWeight:800,fontSize:14,letterSpacing:1}}>RuneScape</span>
        {p&&<>
          <span style={{color:"#0c0",fontSize:11}}>❤️{p.hp}/{p.mhp}</span>
          <span style={{color:"#4af",fontSize:11}}>🙏{p.prayer}/{p.maxPrayer}</span>
          <span style={{color:p.run?"#0f0":"#888",fontSize:11,cursor:"pointer"}} onClick={()=>{if(p)p.run=!p.run;fr(n=>n+1);}}>{p.run?"🏃":"🚶"}{Math.floor(p.runE)}%</span>
          <span style={{color:"#da4",fontSize:11}}>⚔️{cLvl}</span>
          <span style={{color:"#888",fontSize:10}}>Total:{totalLvl}</span>
          <div style={{marginLeft:"auto",display:"flex",gap:6}}>
            {["Accurate","Aggressive","Defensive"].map((s,i)=><button key={i} onClick={()=>{if(p)p.style=i;fr(n=>n+1);}}
              style={{background:p.style===i?"#5a4a30":"transparent",border:"1px solid #4a3a20",color:p.style===i?"#ff0":"#666",fontSize:8,padding:"2px 6px",cursor:"pointer",borderRadius:3,fontWeight:600}}>{s}</button>)}
          </div>
        </>}
      </div>
      {/* Main */}
      <div style={{flex:1,display:"flex",overflow:"hidden",minHeight:0}}>
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",background:"#0a0a0a",position:"relative",minWidth:0}}>
          <canvas ref={cvR} width={CW} height={CH} style={{imageRendering:"pixelated",cursor:"crosshair",maxWidth:"100%",maxHeight:"100%",border:"2px solid #3a3020"}} />
          {ctx_menu&&<div style={{position:"absolute",left:ctx_menu.x,top:ctx_menu.y,background:"rgba(10,8,4,0.96)",border:"1px solid #5a4a30",borderRadius:4,minWidth:150,zIndex:50,boxShadow:"0 4px 24px rgba(0,0,0,0.8)"}}>
            <div style={{background:"#3a3020",padding:"3px 8px",fontSize:8,color:"#888",letterSpacing:1}}>Choose Option</div>
            {ctx_menu.opts.map((o,i)=><div key={i} onClick={()=>{o.action();setCtx(null);}} style={{padding:"4px 10px",fontSize:11,color:o.color||"#ddd",cursor:"pointer",borderBottom:"1px solid rgba(90,74,48,0.2)"}}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(200,168,78,0.12)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>{o.label}</div>)}
          </div>}
        </div>
        {/* Side panel */}
        <div style={{width:195,background:"linear-gradient(180deg,#2a2218,#1e1a12)",borderLeft:"2px solid #4a3a20",display:"flex",flexDirection:"column",flexShrink:0}}>
          <div style={{display:"flex",borderBottom:"1px solid #4a3a20"}}>
            {[["inv","🎒"],["skills","⚔️"],["equip","🛡️"],["quest","📜"],["pray","🙏"]].map(([t,ic])=>
              <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:"4px 0",background:tab===t?"#3a3020":"transparent",border:"none",color:tab===t?"#c8a84e":"#5a4a30",cursor:"pointer",fontSize:13,borderBottom:tab===t?"2px solid #c8a84e":"2px solid transparent"}}>{ic}</button>)}
          </div>
          <div style={{flex:1,overflow:"auto",padding:5}}>
            {tab==="inv"&&<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:2}}>{invSlots}</div>}
            {tab==="skills"&&p&&<div style={{display:"flex",flexDirection:"column",gap:2}}>
              {SKILLS.map(s=>{const l=lvl(p.sk[s]),cur=p.sk[s],nxt=xpLvl(l+1),prv=xpLvl(l),pct=l>=99?1:(cur-prv)/(nxt-prv);
                return <div key={s} style={{background:"rgba(60,50,30,0.45)",padding:"3px 5px",borderRadius:3,border:"1px solid rgba(200,168,78,0.08)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:SKILL_COLORS[s]||"#c8a84e",fontWeight:600}}><span>{s}</span><span>{l}/99</span></div>
                  <div style={{height:3,background:"#1a1510",borderRadius:2,marginTop:1}}><div style={{height:"100%",background:l>=99?"#da0":SKILL_COLORS[s]||"#4a8a2a",borderRadius:2,width:(pct*100)+"%",transition:"width 0.3s",opacity:0.8}}/></div>
                  <div style={{fontSize:7,color:"#554",marginTop:1}}>{cur.toLocaleString()} / {l>=99?"--":nxt.toLocaleString()}</div>
                </div>;})}
              <div style={{textAlign:"center",fontSize:9,color:"#888",marginTop:4}}>Total XP: {(p.totalXp||0).toLocaleString()}</div>
            </div>}
            {tab==="equip"&&p&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,paddingTop:8}}>
              <div style={{color:"#c8a84e",fontSize:10,fontWeight:700,letterSpacing:1}}>EQUIPMENT</div>
              {["head","body","legs"].map(s=><div key={s} onClick={()=>unequip(s)} style={{width:42,height:42,background:p.eq[s]?"rgba(80,70,50,0.55)":"rgba(40,35,25,0.25)",border:"1px solid rgba(200,168,78,0.12)",borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:p.eq[s]?16:8,color:p.eq[s]?"#fff":"#444",cursor:p.eq[s]?"pointer":"default"}}>{p.eq[s]?ITEMS[p.eq[s]].i:s}</div>)}
              <div style={{display:"flex",gap:6}}>
                {["weapon","shield"].map(s=><div key={s} onClick={()=>unequip(s)} style={{width:42,height:42,background:p.eq[s]?"rgba(80,70,50,0.55)":"rgba(40,35,25,0.25)",border:"1px solid rgba(200,168,78,0.12)",borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:p.eq[s]?16:8,color:p.eq[s]?"#fff":"#444",cursor:p.eq[s]?"pointer":"default"}}>{p.eq[s]?ITEMS[p.eq[s]].i:s}</div>)}
              </div>
              <div onClick={()=>unequip("ring")} style={{width:42,height:42,background:p.eq.ring?"rgba(80,70,50,0.55)":"rgba(40,35,25,0.25)",border:"1px solid rgba(200,168,78,0.12)",borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:p.eq.ring?16:8,color:p.eq.ring?"#fff":"#444",cursor:p.eq.ring?"pointer":"default"}}>{p.eq.ring?ITEMS[p.eq.ring].i:"ring"}</div>
              <div style={{fontSize:9,color:"#8a7a5a",textAlign:"center",lineHeight:1.5,marginTop:4}}>
                Atk:+{p.eq.weapon?ITEMS[p.eq.weapon].atk||0:0} Str:+{(p.eq.weapon?ITEMS[p.eq.weapon].str||0:0)+(p.eq.ring&&ITEMS[p.eq.ring].str?ITEMS[p.eq.ring].str:0)}<br/>
                Def:+{["shield","head","body","legs"].reduce((a,s)=>a+(p.eq[s]?ITEMS[p.eq[s]].def||0:0),0)}
              </div>
            </div>}
            {tab==="quest"&&p&&<div style={{padding:4}}>
              <div style={{color:"#c8a84e",fontSize:10,fontWeight:700,letterSpacing:1,marginBottom:6}}>QUESTS</div>
              <div style={{background:"rgba(60,50,30,0.45)",padding:8,borderRadius:4,border:"1px solid rgba(200,168,78,0.08)"}}>
                <div style={{fontSize:11,color:p.quests.cook===2?"#0c0":p.quests.cook===1?"#ff0":"#c44",fontWeight:600}}>{p.quests.cook===2?"✅":"📜"} Cook's Assistant</div>
                <div style={{fontSize:9,color:"#888",marginTop:3}}>{p.quests.cook===0?"Talk to the Cook in Lumbridge.":p.quests.cook===1?"Find: egg, milk, flour.":"Complete!"}</div>
                {p.quests.cook===1&&<div style={{fontSize:8,color:"#665",marginTop:3}}>
                  {p.inv.some(x=>x.i==="egg")?"✅":"❌"} Egg {p.inv.some(x=>x.i==="milk")?"✅":"❌"} Milk {p.inv.some(x=>x.i==="flour")?"✅":"❌"} Flour
                </div>}
              </div>
              <div style={{background:"rgba(60,50,30,0.25)",padding:6,borderRadius:4,marginTop:4,fontSize:10,color:"#555"}}>🔒 More quests soon...</div>
            </div>}
            {tab==="pray"&&p&&<div style={{padding:4}}>
              <div style={{color:"#c8a84e",fontSize:10,fontWeight:700,letterSpacing:1,marginBottom:6}}>PRAYER {p.prayer}/{p.maxPrayer}</div>
              <div style={{height:6,background:"#1a1510",borderRadius:3,marginBottom:8}}><div style={{height:"100%",background:"#4488cc",borderRadius:3,width:(p.prayer/p.maxPrayer*100)+"%"}}/></div>
              <div style={{fontSize:9,color:"#888",lineHeight:1.6}}>Bury bones for Prayer XP:<br/>Bones: +4 XP<br/>Big bones: +15 XP<br/>Dragon bones: +72 XP<br/><br/>Recharge at an altar.</div>
            </div>}
          </div>
        </div>
      </div>
      {/* Bank */}
      {bankOpen&&p&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setBankOpen(false)}>
        <div style={{background:"linear-gradient(180deg,#2a2218,#1e1a12)",border:"2px solid #5a4a30",borderRadius:8,padding:14,minWidth:320,maxWidth:520}} onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
            <span style={{color:"#c8a84e",fontWeight:700,fontSize:14}}>🏦 Bank</span>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>{bankDepositAll();}} style={{background:"#3a5a2a",border:"1px solid #5a8a3a",color:"#af0",padding:"3px 10px",cursor:"pointer",borderRadius:4,fontSize:10,fontWeight:600}}>Deposit All</button>
              <button onClick={()=>setBankOpen(false)} style={{background:"#4a3020",border:"none",color:"#c8a84e",padding:"3px 10px",cursor:"pointer",borderRadius:4}}>✕</button>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(8,1fr)",gap:2,marginBottom:10}}>
            {p.bank.map((s,i)=><div key={i} onClick={()=>{bankWithdraw(i);}} title={ITEMS[s.i].n+" x"+s.c} style={{width:36,height:36,background:"rgba(80,70,50,0.45)",border:"1px solid rgba(200,168,78,0.1)",borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,cursor:"pointer",position:"relative"}}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(200,168,78,0.15)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(80,70,50,0.45)"}>
              {ITEMS[s.i].i}{s.c>1&&<span style={{position:"absolute",top:0,left:2,fontSize:7,color:"#ff0",fontWeight:700}}>{s.c>9999?"9k+":s.c}</span>}
              <span style={{position:"absolute",bottom:0,right:1,fontSize:5,color:"#aa9",maxWidth:32,overflow:"hidden",whiteSpace:"nowrap"}}>{ITEMS[s.i].n}</span>
            </div>)}
          </div>
          <div style={{color:"#777",fontSize:9}}>Click bank items to withdraw. Click inventory to deposit. {p.bank.length} items stored.</div>
        </div>
      </div>}
      {/* Shop */}
      {shopOpen&&p&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShopOpen(false)}>
        <div style={{background:"linear-gradient(180deg,#2a2218,#1e1a12)",border:"2px solid #5a4a30",borderRadius:8,padding:14,minWidth:340,maxWidth:540}} onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
            <span style={{color:"#c8a84e",fontWeight:700,fontSize:14}}>🏪 General Store</span>
            <button onClick={()=>setShopOpen(false)} style={{background:"#4a3020",border:"none",color:"#c8a84e",padding:"3px 10px",cursor:"pointer",borderRadius:4}}>✕</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:3}}>
            {SHOP_ITEMS.map((si,i)=><div key={i} onClick={()=>{buyItem(si);fr(n=>n+1);}} style={{background:"rgba(80,70,50,0.35)",border:"1px solid rgba(200,168,78,0.1)",borderRadius:4,padding:5,textAlign:"center",cursor:"pointer"}}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(200,168,78,0.12)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(80,70,50,0.35)"}>
              <div style={{fontSize:16}}>{ITEMS[si.i].i}</div>
              <div style={{fontSize:7,color:"#c8a84e",fontWeight:600}}>{ITEMS[si.i].n}</div>
              <div style={{fontSize:8,color:"#da0"}}>{si.cost}gp</div>
            </div>)}
          </div>
          <div style={{color:"#888",fontSize:9,marginTop:6}}>Coins: {p.inv.find(x=>x.i==="coins")?.c||0}gp</div>
        </div>
      </div>}
      {/* Chat */}
      <div style={{height:88,background:"linear-gradient(180deg,#1e1a12,#161210)",borderTop:"2px solid #4a3a20",padding:"2px 8px",overflow:"auto",flexShrink:0}}>
        {chat.slice(-16).map((m,i)=><div key={i} style={{fontSize:11,color:i===chat.slice(-16).length-1?"#ddd":i>chat.slice(-16).length-4?"#999":"#666",lineHeight:1.35}}>{m}</div>)}
      </div>
    </div>
  );
}

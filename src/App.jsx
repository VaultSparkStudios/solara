import { useState, useEffect, useRef, useCallback } from "react";

const TILE=32,MW=100,MH=100,VTX=17,VTY=14,CW=VTX*TILE,CH=VTY*TILE;
const T={G:0,D:1,W:2,S:3,SA:4,WF:5,WA:6,BR:7,PA:8,DG:9,LAVA:10,DESERT:11};
const TC={
  [T.G]:["#9a2808","#8a2005","#a83010","#922510"],   // Red rocky ground (main terrain)
  [T.D]:["#7a3818","#6a2e10","#84401e"],              // Reddish-brown dirt (towns)
  [T.W]:["#1a2848","#182240","#1c2e50"],              // Dark deep water
  [T.S]:["#4a3828","#3e3020","#543e2e"],              // Dark reddish stone
  [T.SA]:["#c8a840","#c0a030","#d4b450"],             // Warm sand
  [T.WF]:["#6a3818","#5a3010"],                       // Reddish adobe floor
  [T.WA]:["#2a1408","#241005"],                       // Dark red stone walls
  [T.BR]:["#9a7840","#8a6c38"],                       // Sandy stone bridge
  [T.PA]:["#b89040","#ae8838","#c29848"],             // Sandy packed path
  [T.DG]:["#4a1005","#3e0c03","#541408"],             // Dark rocky region (shadow)
  [T.LAVA]:["#c03010","#b02808","#d04020"],           // Lava
  [T.DESERT]:["#d4b870","#ccb068","#dcc078"],         // Sandy desert
};

const SKILLS=["Attack","Strength","Defence","Hitpoints","Ranged","Prayer","Magic","Cooking","Woodcutting","Fishing","Mining","Smithing","Crafting","Firemaking","Agility","Thieving","Herblore","Slayer","Fletching"];
const SKILL_COLORS={Attack:"#c03030",Strength:"#00a000",Defence:"#4466cc",Hitpoints:"#cc3030",Ranged:"#408030",Prayer:"#6080b0",Magic:"#3040c0",Cooking:"#8a4a10",Woodcutting:"#2a6a10",Fishing:"#2a5aaa",Mining:"#6a6050",Smithing:"#6a6a6a",Crafting:"#8a6a30",Firemaking:"#d06010",Agility:"#305080",Thieving:"#5a2080",Herblore:"#2a8a50",Slayer:"#8a2020",Fletching:"#a08020"};
const SAVE_VERSION=3;
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
  shortbow:{n:"Shortbow",i:"🏹",s:false,slot:"weapon",rng:7},
  longbow:{n:"Longbow",i:"🏹",s:false,slot:"weapon",rng:9},
  bronze_arrow:{n:"Bronze arrow",i:"🏹",s:true},iron_arrow:{n:"Iron arrow",i:"🏹",s:true},
  steel_arrow:{n:"Steel arrow",i:"🏹",s:true},rune_arrow:{n:"Rune arrow",i:"🏹",s:true},
  air_staff:{n:"Air staff",i:"🪄",s:false,slot:"weapon",mgc:true,mmax:4},
  fire_staff:{n:"Fire staff",i:"🪄",s:false,slot:"weapon",mgc:true,mmax:8},
  leather_chaps:{n:"Leather chaps",i:"👖",s:false,slot:"legs",def:5},
  studded_body:{n:"Studded body",i:"🦺",s:false,slot:"body",def:15},
  mithril_bar:{n:"Mithril bar",i:"⬜",s:false},
  raw_tuna:{n:"Raw tuna",i:"🐟",s:false},tuna:{n:"Tuna",i:"🐟",s:false,heal:10},
  banana:{n:"Banana",i:"🍌",s:false,heal:4},
  jogre_bone:{n:"Jogre bone",i:"🦴",s:false},
  silk:{n:"Silk",i:"🧵",s:false},
  gold_bar:{n:"Gold bar",i:"🟡",s:false},
  chisel:{n:"Chisel",i:"🔨",s:false},needle:{n:"Needle",i:"🧵",s:false},
  hardleather_body:{n:"Hard leather body",i:"🦺",s:false,slot:"body",def:10},
  sapphire:{n:"Sapphire",i:"💙",s:false},emerald:{n:"Emerald",i:"💚",s:false},ruby:{n:"Ruby",i:"❤️",s:false},
  sapphire_ring:{n:"Sapphire ring",i:"💍",s:false,slot:"ring"},
  emerald_ring:{n:"Emerald ring",i:"💍",s:false,slot:"ring",def:2},
  ruby_ring:{n:"Ruby ring",i:"💍",s:false,slot:"ring",str:3},
  clean_herb:{n:"Clean herb",i:"🌿",s:false},
  attack_potion:{n:"Attack potion",i:"🧪",s:false,heal:0,buff:{skill:"Attack",amt:3,dur:240000}},
  strength_potion:{n:"Strength potion",i:"🧪",s:false,heal:0,buff:{skill:"Strength",amt:3,dur:240000}},
  prayer_potion:{n:"Prayer potion",i:"🧪",s:false,heal:0,buff:{skill:"Prayer",restore:true}},
  knife:{n:"Knife",i:"🔪",s:false},
  arrow_shaft:{n:"Arrow shaft",i:"🪵",s:true},
  mithril_helm:{n:"Mithril full helm",i:"⛑️",s:false,slot:"head",def:20},
  mithril_plate:{n:"Mithril platebody",i:"🦺",s:false,slot:"body",def:35},
  mithril_legs:{n:"Mithril platelegs",i:"👖",s:false,slot:"legs",def:25},
  mithril_shield:{n:"Mithril sq shield",i:"🛡️",s:false,slot:"shield",def:22},
  adamant_ore:{n:"Adamantite ore",i:"🪨",s:false},
  adamant_bar:{n:"Adamant bar",i:"⬜",s:false},
  adamant_sword:{n:"Adamant sword",i:"⚔️",s:false,slot:"weapon",atk:30,str:22},
  adamant_helm:{n:"Adamant full helm",i:"⛑️",s:false,slot:"head",def:28},
  adamant_plate:{n:"Adamant platebody",i:"🦺",s:false,slot:"body",def:45},
  adamant_legs:{n:"Adamant platelegs",i:"👖",s:false,slot:"legs",def:33},
  adamant_shield:{n:"Adamant sq shield",i:"🛡️",s:false,slot:"shield",def:30},
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
  // Draynor Village (south of Lumbridge)
  for(let y=55;y<65;y++)for(let x=26;x<40;x++)m[y][x]=T.D;
  bld(28,56,5,4);bld(34,56,5,4);bld(28,61,5,4);bld(34,62,5,4);
  [[37,57],[38,57]].forEach(([x,y])=>{m[y][x]=T.WF;});
  // Draynor bank counter
  for(let y=38;y<55;y++){m[y][27]=T.PA;if(28<MW)m[y][28]=T.PA;}
  // Falador (SW of Barbarian Village)
  for(let y=35;y<50;y++)for(let x=22;x<38;x++)m[y][x]=T.S;
  for(let y=36;y<49;y++)for(let x=23;x<37;x++)m[y][x]=T.D;
  bld(24,37,5,4);bld(30,37,5,4);bld(24,43,5,4);bld(30,43,5,4);
  // Falador-Barbarian path
  for(let y=30;y<36;y++){m[y][32]=T.PA;if(33<MW)m[y][33]=T.PA;}
  // Falador-Draynor path
  for(let y=50;y<56;y++){m[y][30]=T.PA;if(31<MW)m[y][31]=T.PA;}
  // Mining Guild (south Falador)
  for(let y=47;y<55;y++)for(let x=23;x<32;x++)m[y][x]=T.S;
  // Karamja Island (far south)
  for(let y=80;y<96;y++)for(let x=44;x<72;x++)m[y][x]=T.DESERT;
  for(let y=83;y<96;y++)for(let x=48;x<68;x++)m[y][x]=T.DG;
  for(let y=80;y<83;y++)for(let x=44;x<50;x++)m[y][x]=T.W;
  for(let y=80;y<83;y++)for(let x=65;x<72;x++)m[y][x]=T.W;
  bld(50,84,5,4);bld(57,84,5,4);
  // Path from Al Kharid south to Karamja dock
  for(let y=65;y<80;y++){m[y][57]=T.PA;if(58<MW)m[y][58]=T.PA;}
  for(let y=55;y<65;y++){m[y][57]=T.PA;if(58<MW)m[y][58]=T.PA;}
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
  // Cacti (decorative — desert & sandy areas)
  [[70,37],[75,40],[78,44],[72,48],[76,52],[57,50],[60,53],[65,52],[73,51],[77,38]].forEach(([x,y])=>o.push({t:"cactus",x,y,hp:1,mhp:1,id:nid()}));
  [[56,20],[65,19],[67,25],[66,30],[64,33]].forEach(([x,y])=>o.push({t:"cactus",x,y,hp:1,mhp:1,id:nid()}));
  // Draynor willows
  [[25,56],[25,58],[24,60],[25,62],[24,64],[41,57],[41,60],[42,63]].forEach(([x,y])=>o.push({t:"tree",x,y,res:"willow_logs",sk:"Woodcutting",xp:67,tm:2200,hp:1,mhp:1,rsp:12000,id:nid(),sub:"willow",lvl:30}));
  // Draynor bank
  [[37,57],[38,57]].forEach(([x,y])=>o.push({t:"bank",x,y,id:nid(),hp:1,mhp:1}));
  // Draynor shop
  o.push({t:"shop",x:35,y:62,id:nid(),hp:1,mhp:1});
  // Falador furnace + anvil
  o.push({t:"furnace",x:25,y:44,id:nid(),hp:1,mhp:1});
  o.push({t:"anvil",x:31,y:44,id:nid(),hp:1,mhp:1});
  // Falador bank
  [[28,38],[29,38]].forEach(([x,y])=>o.push({t:"bank",x,y,id:nid(),hp:1,mhp:1}));
  // Mining Guild rocks (mithril + coal heavy)
  [[24,49],[26,51],[28,49],[30,51],[24,53],[26,53]].forEach(([x,y])=>o.push({t:"rock",x,y,res:"coal",sk:"Mining",xp:50,tm:2600,hp:1,mhp:1,rsp:12000,id:nid(),lvl:30}));
  [[28,53],[30,53]].forEach(([x,y])=>o.push({t:"rock",x,y,res:"mithril",sk:"Mining",xp:80,tm:4000,hp:1,mhp:1,rsp:20000,id:nid(),lvl:55}));
  // Karamja fishing spots (lobster + swordfish)
  [[52,81],[54,81],[56,81]].forEach(([x,y])=>o.push({t:"fish",x,y,res:"raw_lobster",sk:"Fishing",xp:90,tm:2800,hp:1,mhp:1,rsp:3000,id:nid(),lvl:40}));
  [[59,81],[61,81]].forEach(([x,y])=>o.push({t:"fish",x,y,res:"raw_swordfish",sk:"Fishing",xp:100,tm:3200,hp:1,mhp:1,rsp:4000,id:nid(),lvl:50}));
  // Adamantite rocks (deep Wilderness)
  [[22,2],[24,3],[26,2],[28,3]].forEach(([x,y])=>o.push({t:"rock",x,y,res:"adamant_ore",sk:"Mining",xp:95,tm:5000,hp:1,mhp:1,rsp:25000,id:nid(),lvl:70}));
  // Karamja banana trees (spawn)
  [[51,85],[53,87],[55,88],[57,86]].forEach(([x,y])=>o.push({t:"spawn",x,y,id:nid(),hp:1,mhp:1,item:"banana",rsp:15000}));
  // Karamja bank + range
  o.push({t:"bank",x:51,y:85,id:nid(),hp:1,mhp:1});
  o.push({t:"range",x:58,y:85,id:nid(),hp:1,mhp:1});
  // Crafting table (Lumbridge)
  o.push({t:"crafting_table",x:22,y:26,id:nid(),hp:1,mhp:1});
  return o;
}

function genNPCs(){
  return [
    {t:"npc",x:20,y:28,nm:"Hans",c:"#cc3",dlg:["Welcome to Lumbridge!","Click trees, rocks, fish spots to gather.","Fight monsters for combat XP!","Head north to Varrock for shops & bank."],id:1,ambient:["Welcome, traveller!","Need directions?","Lumbridge is safe!"]},
    {t:"npc",x:24,y:28,nm:"Cook",c:"#da4",dlg:["I need help making a cake!","Bring me an egg, bucket of milk, and flour.","The egg is in a building to the east,","flour in a building to the south."],id:2,quest:"cook",ambient:["Need ingredients!","Almost out of cake!","Who took my eggs?"]},
    {t:"npc",x:10,y:59,nm:"Doric",c:"#57a",dlg:["Welcome to the mine, adventurer!","Mine copper and tin to smelt bronze.","The furnace is in Lumbridge.","I could use some mithril ore..."],id:3,quest:"miner"},
    {t:"npc",x:58,y:21,nm:"Fishing Tutor",c:"#4a8",dlg:["Click on fishing spots to fish!","Different spots give different fish."],id:4},
    {t:"npc",x:18,y:11,nm:"Banker",c:"#888",dlg:["Welcome to the Bank of Varrock.","Click a bank booth to open your bank."],id:5,bank:true,ambient:["Safe storage here.","Invest wisely!","Coins earn no interest."]},
    {t:"npc",x:24,y:11,nm:"Shopkeeper",c:"#a84",dlg:["Welcome to my shop!"],id:6,shop:true,ambient:["Fine wares here!","Best prices in Varrock.","Come browse!"]},
    {t:"npc",x:40,y:25,nm:"Barbarian",c:"#a64",dlg:["We are the Barbarians!","Strong warriors live here.","Prove yourself in combat!"],id:7,ambient:["VICTORY!","Prove your strength!","Honor in battle!"]},
    {t:"npc",x:62,y:42,nm:"Ali",c:"#da8",dlg:["Welcome to Al Kharid!","The desert is dangerous...","Prove yourself: slay 3 Scorpions.","Return to me when done."],id:8,quest:"desert",ambient:["Hot today...","Scorpions are fierce.","The desert has secrets."]},
    {t:"npc",x:34,y:74,nm:"Agility Trainer",c:"#58a",dlg:["Welcome to the Agility course!","Click obstacles to train Agility.","Higher levels = faster movement!"],id:9},
    {t:"npc",x:17,y:15,nm:"Guard",c:"#666",dlg:["Move along."],id:10,guard:true},
    {t:"npc",x:40,y:26,nm:"Barbarian Chief",c:"#c64",dlg:["Prove your might, warrior!","Kill 5 goblins and I shall reward you.","They infest the village to the east."],id:11,quest:"goblin",ambient:["VICTORY!","Prove your strength!","Honor in battle!"]},
    {t:"npc",x:20,y:14,nm:"Sedridor",c:"#3050c0",dlg:["I study the mysteries of the runes.","Bring me 10 air runes for my research.","You can find them on Dark Wizards."],id:12,quest:"rune",ambient:["Fascinating runes...","Magic is everywhere.","The arcane calls."]},
    {t:"npc",x:36,y:59,nm:"Morgan",c:"#c8a",dlg:["Welcome to Draynor Village!","There are willow trees nearby for Woodcutting.","The bank is just to the north."],id:13},
    {t:"npc",x:36,y:60,nm:"Draynor Banker",c:"#888",dlg:["Welcome to Draynor Bank."],id:14,bank:true},
    {t:"npc",x:29,y:39,nm:"Sir Amik",c:"#ddd",dlg:["Welcome to Falador!","The Mining Guild to the south has rich ores.","The bank is nearby for your convenience.","Lesser Demons threaten our lands..."],id:15,quest:"knight"},
    {t:"npc",x:54,y:83,nm:"Luthas",c:"#5a8",dlg:["Welcome to Karamja!","Pick bananas from the trees and sell them.","The fishing docks have great lobsters!","The Jogres in the south are causing trouble..."],id:16,quest:"karamja"},
    {t:"npc",x:56,y:83,nm:"Karamja Banker",c:"#888",dlg:["Welcome to the Karamja Bank."],id:17,bank:true},
    {t:"npc",x:4,y:48,nm:"Old Hermit",c:"#8a7a5a",dlg:["The forest is haunted...","Necromancers lurk among the dark trees.","Please, drive them away!"],id:18,quest:"haunted",ambient:["The forest weeps...","Darkness grows...","Beware the shadows."]},
    {t:"npc",x:22,y:12,nm:"Archaeologist",c:"#a89060",dlg:["I've been searching for a lost relic.","It was broken into 3 parts, scattered across the land.","Check stalls and chests — they may be hidden there."],id:19,quest:"relic",ambient:["Fascinating history here.","Ancient secrets abound.","The past speaks to me."]},
    {t:"npc",x:17,y:14,nm:"Seer",c:"#9060c0",dlg:["I have foreseen a great darkness...","Only one who has faced TzTok-Jad three times can stop it.","Are you that warrior?"],id:20,quest:"awakening",ambient:["The future is unclear...","I see great power in you.","Destiny calls..."]},
    {t:"npc",x:21,y:11,nm:"Mazchna",c:"#8a2020",dlg:["I am the Slayer Master.","I assign tasks to prove your worth.","Right-click me for a slayer assignment!"],id:21,slayer:true,ambient:["Slay with purpose.","The hunt never ends.","Prove your worth!"]},
    {t:"npc",x:35,y:60,nm:"Dock Master",c:"#5a8a60",dlg:["The supply ship is overdue!","Bring me 10 lobsters and 5 swordfish","and I'll reward you handsomely."],id:22,quest:"shipment",ambient:["The sea looks rough...","Any fresh catches today?","Supplies are running low."]},
    {t:"npc",x:31,y:38,nm:"Forgemaster",c:"#a86040",dlg:["The Falador garrison needs new armour.","Craft me a mithril platebody","and I'll reward you well."],id:23,quest:"forge",ambient:["Hear that ring of steel?","Mithril is hard to work...","Finest smiths work here."]},
    {t:"npc",x:25,y:3,nm:"Wilderness Scout",c:"#c04030",dlg:["The Wilderness is full of riches...","And dangers. Prove your courage:","slay 5 Ice Warriors and return."],id:24,quest:"wildernessHunt",ambient:["Don't stray too far north...","Ice Warriors patrol this area.","Stay vigilant out there."]},
  ];
}

function genMons(){
  return [
    ...[[30,16],[32,18],[28,18],[31,14]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Chicken",c:"#ddb",hp:8,mhp:8,atk:1,def:1,str:1,xp:3,drops:[{i:"bones",c:1},{i:"feather",c:1,a:[1,5]},{i:"raw_shrimp",c:0.2}],rsp:6000,id:Math.random(),at:0,dead:false,agro:false,lvl:1})),
    ...[[38,32],[40,34],[42,30],[39,36],[41,38],[43,33]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Cow",c:"#8a6a40",hp:20,mhp:20,atk:1,def:1,str:1,xp:8,drops:[{i:"bones",c:1},{i:"cowhide",c:1},{i:"coins",c:0.3,a:[1,5]}],rsp:10000,id:Math.random(),at:0,dead:false,agro:false,lvl:2})),
    ...[[43,26],[45,28],[47,24],[44,30]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Goblin",c:"#5a8a30",hp:13,mhp:13,atk:2,def:2,str:2,xp:5,drops:[{i:"bones",c:1},{i:"coins",c:0.8,a:[3,25]},{i:"bronze_helm",c:0.04},{i:"beer",c:0.1}],rsp:8000,id:Math.random(),at:0,dead:false,agro:false,lvl:2})),
    ...[[5,48],[7,51],[4,54],[8,56],[6,59]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Giant Spider",c:"#444",hp:40,mhp:40,atk:5,def:3,str:4,xp:16,drops:[{i:"bones",c:1},{i:"coins",c:0.6,a:[5,40]},{i:"iron_sword",c:0.03},{i:"nature_rune",c:0.1,a:[1,3]},{i:"sapphire",c:0.05}],rsp:12000,id:Math.random(),at:0,dead:false,agro:true,lvl:4})),
    ...[[3,50],[9,53],[6,61]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Hill Giant",c:"#7a5a3a",hp:88,mhp:88,atk:8,def:6,str:7,xp:35,drops:[{i:"big_bones",c:1},{i:"coins",c:0.9,a:[10,80]},{i:"iron_shield",c:0.04},{i:"iron_plate",c:0.02},{i:"death_rune",c:0.05,a:[1,2]},{i:"emerald",c:0.03}],rsp:18000,id:Math.random(),at:0,dead:false,agro:true,lvl:7})),
    ...[[65,42],[67,44],[70,40],[72,43]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Scorpion",c:"#8a4020",hp:30,mhp:30,atk:4,def:3,str:3,xp:12,drops:[{i:"coins",c:0.5,a:[1,20]}],rsp:10000,id:Math.random(),at:0,dead:false,agro:true,lvl:3})),
    ...[[68,48],[70,50],[72,46]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Desert Wolf",c:"#b09050",hp:50,mhp:50,atk:6,def:4,str:5,xp:22,drops:[{i:"bones",c:1},{i:"coins",c:0.7,a:[8,50]},{i:"herb",c:0.08}],rsp:14000,id:Math.random(),at:0,dead:false,agro:true,lvl:5})),
    ...[[20,3],[25,2],[30,4]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Skeleton",c:"#c8c0b0",hp:63,mhp:63,atk:7,def:5,str:6,xp:28,drops:[{i:"bones",c:1},{i:"coins",c:0.8,a:[10,60]},{i:"iron_helm",c:0.05},{i:"fire_rune",c:0.2,a:[2,8]}],rsp:15000,id:Math.random(),at:0,dead:false,agro:true,lvl:6})),
    ...[[35,2],[38,3]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Dark Wizard",c:"#3030a0",hp:45,mhp:45,atk:9,def:3,str:8,xp:25,drops:[{i:"coins",c:0.7,a:[15,70]},{i:"nature_rune",c:0.15,a:[2,5]},{i:"air_rune",c:0.4,a:[5,15]},{i:"death_rune",c:0.08,a:[1,3]}],rsp:16000,id:Math.random(),at:0,dead:false,agro:true,lvl:7,atkType:"magic"})),
    ...[[27,57],[29,60],[31,57],[33,62]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Zombie",c:"#607850",hp:55,mhp:55,atk:6,def:4,str:5,xp:22,drops:[{i:"bones",c:1},{i:"coins",c:0.6,a:[5,30]},{i:"iron_sword",c:0.05},{i:"nature_rune",c:0.1,a:[1,3]}],rsp:12000,id:Math.random(),at:0,dead:false,agro:true,lvl:5})),
    ...[[25,40],[27,42],[30,44],[33,40],[35,45]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"White Knight",c:"#d8d8d0",hp:100,mhp:100,atk:10,def:8,str:9,xp:40,drops:[{i:"bones",c:1},{i:"coins",c:0.9,a:[20,100]},{i:"iron_sword",c:0.08},{i:"steel_shield",c:0.02},{i:"bronze_arrow",c:0.3,a:[5,20]}],rsp:18000,id:Math.random(),at:0,dead:false,agro:false,lvl:9})),
    ...[[53,86],[56,88],[59,86],[62,88],[60,84]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Jogre",c:"#5a7a3a",hp:138,mhp:138,atk:12,def:7,str:11,xp:58,drops:[{i:"jogre_bone",c:1},{i:"coins",c:0.8,a:[10,60]},{i:"herb",c:0.15},{i:"steel_arrow",c:0.25,a:[5,15]}],rsp:20000,id:Math.random(),at:0,dead:false,agro:true,lvl:11})),
    ...[[64,90],[67,87],[65,93]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"TzTok-Jad",c:"#c04010",hp:300,mhp:300,atk:20,def:15,str:18,xp:150,drops:[{i:"coins",c:1,a:[100,300]},{i:"rune_arrow",c:0.5,a:[10,30]},{i:"fire_staff",c:0.02},{i:"ruby",c:0.15}],rsp:60000,id:Math.random(),at:0,dead:false,agro:true,lvl:20,atkType:"magic"})),
    ...[[40,32],[42,34],[44,32],[46,34]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Hobgoblin",c:"#6a4a20",hp:75,mhp:75,atk:8,def:5,str:7,xp:28,drops:[{i:"bones",c:1},{i:"coins",c:0.8,a:[8,40]},{i:"iron_helm",c:0.04},{i:"bronze_arrow",c:0.3,a:[5,15]}],rsp:10000,id:Math.random(),at:0,dead:false,agro:true,lvl:10})),
    ...[[4,46],[8,48],[5,52],[10,50]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Flesh Crawler",c:"#8a6040",hp:70,mhp:70,atk:9,def:4,str:8,xp:25,drops:[{i:"coins",c:0.6,a:[5,25]},{i:"herb",c:0.12},{i:"nature_rune",c:0.08,a:[1,3]}],rsp:10000,id:Math.random(),at:0,dead:false,agro:true,lvl:10})),
    ...[[62,32],[64,28],[63,34]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Rock Crab",c:"#9a8060",hp:138,mhp:138,atk:7,def:12,str:6,xp:32,drops:[{i:"coins",c:0.5,a:[3,18]}],rsp:12000,id:Math.random(),at:0,dead:false,agro:false,lvl:13})),
    ...[[58,38],[60,40],[63,38]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Bandit",c:"#5a4030",hp:105,mhp:105,atk:10,def:6,str:9,xp:30,drops:[{i:"coins",c:0.9,a:[15,55]},{i:"iron_sword",c:0.06},{i:"bread",c:0.2}],rsp:11000,id:Math.random(),at:0,dead:false,agro:false,lvl:12})),
    ...[[26,52],[29,54],[32,52]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Moss Giant",c:"#4a7a2a",hp:250,mhp:250,atk:13,def:9,str:12,xp:55,drops:[{i:"big_bones",c:1},{i:"coins",c:0.85,a:[20,100]},{i:"nature_rune",c:0.15,a:[2,6]},{i:"steel_shield",c:0.03}],rsp:20000,id:Math.random(),at:0,dead:false,agro:true,lvl:16})),
    ...[[38,64],[41,66],[44,64]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Lesser Demon",c:"#c03a1a",hp:213,mhp:213,atk:14,def:8,str:13,xp:65,drops:[{i:"coins",c:0.8,a:[20,120]},{i:"fire_rune",c:0.3,a:[5,20]},{i:"nature_rune",c:0.1,a:[2,5]},{i:"iron_plate",c:0.04}],rsp:22000,id:Math.random(),at:0,dead:false,agro:true,lvl:15})),
    ...[[15,3],[25,4],[18,2]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Ice Warrior",c:"#80c0e0",hp:288,mhp:288,atk:16,def:14,str:14,xp:80,drops:[{i:"bones",c:1},{i:"coins",c:0.8,a:[25,120]},{i:"steel_helm",c:0.04},{i:"water_rune",c:0.4,a:[5,20]}],rsp:22000,id:Math.random(),at:0,dead:false,agro:true,lvl:18})),
    ...[[3,55],[11,57],[7,63]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Necromancer",c:"#6030a0",hp:150,mhp:150,atk:15,def:5,str:12,xp:60,drops:[{i:"death_rune",c:0.4,a:[3,10]},{i:"nature_rune",c:0.2,a:[2,6]},{i:"coins",c:0.7,a:[15,70]},{i:"air_rune",c:0.5,a:[5,15]}],rsp:18000,id:Math.random(),at:0,dead:false,agro:true,lvl:14,atkType:"magic"})),
  ];
}

const SHOP_ITEMS=[
  {i:"bronze_sword",cost:20},{i:"iron_sword",cost:120},{i:"steel_sword",cost:500},
  {i:"bronze_axe",cost:16},{i:"iron_axe",cost:90},{i:"steel_axe",cost:400},
  {i:"bronze_pick",cost:16},{i:"iron_pick",cost:90},{i:"steel_pick",cost:400},
  {i:"wooden_shield",cost:10},{i:"bronze_shield",cost:30},{i:"iron_shield",cost:150},
  {i:"leather_body",cost:25},{i:"bronze_helm",cost:15},{i:"bronze_legs",cost:20},
  {i:"bread",cost:12},{i:"cake",cost:50},{i:"tinderbox",cost:1},{i:"bucket",cost:2},
  {i:"shortbow",cost:80},{i:"longbow",cost:200},{i:"bronze_arrow",cost:1},{i:"iron_arrow",cost:3},{i:"steel_arrow",cost:8},
  {i:"air_staff",cost:300},{i:"leather_chaps",cost:18},{i:"studded_body",cost:65},
  {i:"knife",cost:15},{i:"vial",cost:5},
];

const COOK_RECIPES={raw_shrimp:{out:"shrimp",burnt:"burnt",xp:30,lvl:1},raw_trout:{out:"trout",burnt:"burnt",xp:70,lvl:15},raw_salmon:{out:"salmon",burnt:"burnt",xp:90,lvl:25},raw_lobster:{out:"lobster",burnt:"burnt",xp:120,lvl:40},raw_tuna:{out:"tuna",burnt:"burnt",xp:100,lvl:30},raw_swordfish:{out:"swordfish",burnt:"burnt",xp:140,lvl:45}};

const SMITH_RECIPES={
  bronze_bar:[{out:"bronze_sword",xp:12},{out:"bronze_shield",xp:12},{out:"bronze_helm",xp:12},{out:"bronze_legs",xp:12},{out:"bronze_axe",xp:12},{out:"bronze_pick",xp:12}],
  iron_bar:[{out:"iron_sword",xp:25},{out:"iron_shield",xp:25},{out:"iron_helm",xp:25},{out:"iron_legs",xp:25},{out:"iron_axe",xp:25},{out:"iron_pick",xp:25}],
  steel_bar:[{out:"steel_sword",xp:37},{out:"steel_shield",xp:37},{out:"steel_helm",xp:37},{out:"steel_legs",xp:37},{out:"steel_axe",xp:37},{out:"steel_pick",xp:37}],
  mithril_bar:[{out:"mithril_sword",xp:55},{out:"mithril_helm",xp:55},{out:"mithril_plate",xp:55},{out:"mithril_legs",xp:55},{out:"mithril_shield",xp:55}],
  adamant_bar:[{out:"adamant_sword",xp:78},{out:"adamant_helm",xp:78},{out:"adamant_plate",xp:78},{out:"adamant_legs",xp:78},{out:"adamant_shield",xp:78}],
};
const SELL_PRICES=Object.fromEntries(SHOP_ITEMS.map(si=>[si.i,Math.max(5,Math.floor(si.cost*0.4))]));
const CRAFT_RECIPES=[
  {needs:{leather:1},out:"leather_body",xp:25,lvl:14,tool:"needle"},
  {needs:{leather:1},out:"leather_chaps",xp:18,lvl:9,tool:"needle"},
  {needs:{cowhide:1},out:"hardleather_body",xp:35,lvl:28,tool:"needle"},
  {needs:{sapphire:1,gold_bar:1},out:"sapphire_ring",xp:40,lvl:20,tool:"chisel"},
  {needs:{emerald:1,gold_bar:1},out:"emerald_ring",xp:55,lvl:27,tool:"chisel"},
  {needs:{ruby:1,gold_bar:1},out:"ruby_ring",xp:70,lvl:34,tool:"chisel"},
];
const HERB_RECIPES=[
  {needs:{clean_herb:1,vial:1},out:"attack_potion",xp:25,lvl:3},
  {needs:{clean_herb:1,vial:1},out:"strength_potion",xp:40,lvl:12},
  {needs:{clean_herb:2,vial:1},out:"prayer_potion",xp:38,lvl:38},
];
const FLETCH_RECIPES=[
  {needs:{logs:1,feather:15},out:"bronze_arrow",outCount:15,xp:18,lvl:1,tool:"knife"},
  {needs:{oak_logs:1,feather:15},out:"iron_arrow",outCount:15,xp:38,lvl:15,tool:"knife"},
  {needs:{willow_logs:1,feather:15},out:"steel_arrow",outCount:15,xp:75,lvl:30,tool:"knife"},
  {needs:{yew_logs:1,feather:15},out:"rune_arrow",outCount:15,xp:120,lvl:60,tool:"knife"},
  {needs:{oak_logs:1},out:"shortbow",outCount:1,xp:33,lvl:5,tool:"knife"},
  {needs:{willow_logs:1},out:"longbow",outCount:1,xp:58,lvl:40,tool:"knife"},
];
const PRAYERS=[
  {id:"thick_skin",name:"Thick Skin",icon:"🪨",lvl:1,drain:1,defBonus:0.05,desc:"Defence +5%"},
  {id:"burst_str",name:"Burst of Strength",icon:"💪",lvl:4,drain:1,strBonus:0.05,desc:"Strength +5%"},
  {id:"clarity",name:"Clarity of Thought",icon:"🎯",lvl:7,drain:1,atkBonus:0.05,desc:"Attack +5%"},
  {id:"rock_skin",name:"Rock Skin",icon:"🛡️",lvl:10,drain:3,defBonus:0.1,desc:"Defence +10%"},
  {id:"superhuman",name:"Superhuman Strength",icon:"⚡",lvl:13,drain:3,strBonus:0.1,desc:"Strength +10%"},
  {id:"improved_ref",name:"Improved Reflexes",icon:"🎯",lvl:16,drain:3,atkBonus:0.1,desc:"Attack +10%"},
  {id:"eagle_eye",name:"Eagle Eye",icon:"👁️",lvl:26,drain:6,rngBonus:0.15,desc:"Ranged +15%"},
  {id:"steel_skin",name:"Steel Skin",icon:"⚔️",lvl:28,drain:6,defBonus:0.15,desc:"Defence +15%"},
  {id:"ult_str",name:"Ultimate Strength",icon:"💥",lvl:31,drain:6,strBonus:0.15,desc:"Strength +15%"},
  {id:"incred_ref",name:"Incredible Reflexes",icon:"🏹",lvl:34,drain:6,atkBonus:0.15,desc:"Attack +15%"},
  {id:"mystic_might",name:"Mystic Might",icon:"🔮",lvl:45,drain:6,mgcBonus:0.15,desc:"Magic +15%"},
  {id:"prot_magic",name:"Protect from Magic",icon:"🔵",lvl:37,drain:12,protect:"magic",desc:"Block 50% Magic"},
  {id:"prot_missiles",name:"Protect from Missiles",icon:"🟢",lvl:40,drain:12,protect:"ranged",desc:"Block 50% Ranged"},
  {id:"prot_melee",name:"Protect from Melee",icon:"🔴",lvl:43,drain:12,protect:"melee",desc:"Block 50% Melee"},
];
const SLAYER_TASKS=[
  {monster:"Goblin",count:15,xp:150},{monster:"Chicken",count:20,xp:80},
  {monster:"Cow",count:10,xp:120},{monster:"Scorpion",count:10,xp:200},
  {monster:"Zombie",count:12,xp:280},{monster:"Hobgoblin",count:10,xp:350},
  {monster:"Bandit",count:8,xp:400},{monster:"White Knight",count:8,xp:480},
  {monster:"Moss Giant",count:5,xp:600},{monster:"Flesh Crawler",count:12,xp:320},
  {monster:"Lesser Demon",count:5,xp:750},{monster:"Jogre",count:6,xp:700},
  {monster:"TzTok-Jad",count:2,xp:2000},
];
const ACHIEVEMENTS=[
  {id:"first_blood",name:"First Blood",desc:"Kill your first monster",icon:"⚔️"},
  {id:"level_10",name:"Seasoned",desc:"Reach level 10 in any skill",icon:"📈"},
  {id:"level_50",name:"Veteran",desc:"Reach level 50 in any skill",icon:"🏆"},
  {id:"level_99",name:"Master",desc:"Reach level 99 in any skill",icon:"💎"},
  {id:"rich",name:"Rich Adventurer",desc:"Accumulate 10,000 coins",icon:"💰"},
  {id:"first_quest",name:"Quest Beginner",desc:"Complete your first quest",icon:"📜"},
  {id:"all_quests",name:"Completionist",desc:"Complete all quests",icon:"🌟"},
  {id:"first_fish",name:"Fisher",desc:"Catch your first fish",icon:"🎣"},
  {id:"max_fisher",name:"Master Fisher",desc:"Reach level 99 Fishing",icon:"🐟"},
  {id:"first_log",name:"Lumberjack",desc:"Chop your first log",icon:"🪵"},
  {id:"first_ore",name:"Miner",desc:"Mine your first ore",icon:"⛏️"},
  {id:"fire_starter",name:"Fire Starter",desc:"Light your first fire",icon:"🔥"},
  {id:"deep_cook",name:"Chef",desc:"Cook 50 items",icon:"🍳"},
  {id:"explorer",name:"Explorer",desc:"Visit all 12 regions",icon:"🗺️"},
  {id:"survivor",name:"Survivor",desc:"Survive with 1 HP",icon:"❤️"},
  {id:"dragon_bone",name:"Dragon Slayer",desc:"Obtain dragon bones",icon:"🐉"},
  {id:"jad_killer",name:"TzTok Slayer",desc:"Kill TzTok-Jad",icon:"🌋"},
  {id:"crafter",name:"Artisan",desc:"Craft your first item",icon:"🔨"},
  {id:"slayer_first",name:"Slayer",desc:"Complete your first slayer task",icon:"🗡️"},
  {id:"night_owl",name:"Night Owl",desc:"Kill a monster at night",icon:"🌙"},
];
const OFFLINE_TASKS=[
  {label:"Chop logs",skill:"Woodcutting",resource:"logs",xpPer:25,interval:1400,maxItems:200},
  {label:"Chop oak logs",skill:"Woodcutting",resource:"oak_logs",xpPer:37,interval:1800,maxItems:150},
  {label:"Mine copper",skill:"Mining",resource:"copper",xpPer:17,interval:1500,maxItems:200},
  {label:"Mine coal",skill:"Mining",resource:"coal",xpPer:50,interval:2600,maxItems:100},
  {label:"Fish shrimps",skill:"Fishing",resource:"raw_shrimp",xpPer:10,interval:1600,maxItems:200},
  {label:"Fish lobsters",skill:"Fishing",resource:"raw_lobster",xpPer:90,interval:2800,maxItems:80},
];

const MAP_LOCS=[["Lumbridge",20,28],["Varrock",22,12],["Al Kharid",65,43],["Barbarian V.",41,25],["Mine",14,60],["Fishing",60,25],["Draynor",32,59],["Falador",29,42],["Mining Guild",26,51],["Karamja",57,87],["Agility",37,74],["Dark Forest",7,54]];

function WorldMapCanvas({gR,mapCvR}){
  const size=Math.min(500,Math.floor(Math.min(window.innerWidth,window.innerHeight)*0.7));
  useEffect(()=>{
    const cv=mapCvR.current,g2=gR.current;if(!cv||!g2)return;
    const c=cv.getContext("2d"),sc=cv.width/MW;
    c.fillStyle="#0d0403";c.fillRect(0,0,cv.width,cv.height);
    for(let my=0;my<MH;my++)for(let mx=0;mx<MW;mx++){
      const t=g2.map[my][mx];
      c.fillStyle=t===T.W?"#1a2848":t===T.WA?"#2a1408":t===T.S?"#4a3828":t===T.SA?"#c8a840":t===T.PA||t===T.D?"#7a3818":t===T.DG?"#3a0c03":t===T.DESERT?"#d4b870":t===T.LAVA?"#c03010":"#8a2005";
      c.fillRect(mx*sc,my*sc,Math.ceil(sc)+0.5,Math.ceil(sc)+0.5);
    }
    const p=g2.p;
    // Death tile
    if(g2.deathTile&&Date.now()<g2.deathTile.time){c.fillStyle="rgba(255,0,0,0.5)";c.fillRect(g2.deathTile.x*sc-2,g2.deathTile.y*sc-2,6,6);}
    // Monsters
    g2.mons.forEach(m=>{if(!m.dead){c.fillStyle="#f44";c.fillRect(m.x*sc,m.y*sc,Math.max(1.5,sc),Math.max(1.5,sc));}});
    // NPCs
    g2.npcs.forEach(n=>{c.fillStyle="#0ff";c.fillRect(n.x*sc,n.y*sc,Math.max(1.5,sc),Math.max(1.5,sc));});
    // Location labels
    c.font="bold 7px sans-serif";c.textAlign="center";
    MAP_LOCS.forEach(([name,x,y])=>{c.fillStyle="rgba(0,0,0,0.6)";c.fillText(name,(x+1)*sc,(y+1)*sc);c.fillStyle="#da0";c.fillText(name,x*sc,y*sc);});
    // Player (last, on top)
    c.fillStyle="#fff";c.fillRect(p.x*sc-2,p.y*sc-2,5,5);
    c.strokeStyle="#0f0";c.lineWidth=1;c.strokeRect(p.x*sc-2,p.y*sc-2,5,5);
  });
  return <canvas ref={mapCvR} width={size} height={size} style={{display:"block",imageRendering:"pixelated"}}/>;
}

export default function DS(){
  const cvR=useRef(null),gR=useRef(null),fR=useRef(null),smithQueueR=useRef(null);
  const mapCvR=useRef(null),walkR=useRef(null),xpTrackR=useRef({});
  const dirtyR=useRef(false);
  const audioR=useRef(null),audioOnR=useRef(false);
  const craftQueueR=useRef(null);
  const [tab,setTab]=useState("inv");
  const [mapOpen,setMapOpen]=useState(false);
  const [chat,setChat]=useState(["Welcome to Dunescape!","Left-click to interact. Right-click for options.","Try chopping trees or fighting monsters!"]);
  const [,fr]=useState(0);
  const [ctx_menu,setCtx]=useState(null);
  const [bankOpen,setBankOpen]=useState(false);
  const [shopOpen,setShopOpen]=useState(false);
  const [sellOpen,setSellOpen]=useState(false);
  const [smithOpen,setSmithOpen]=useState(false);
  const [craftOpen,setCraftOpen]=useState(false);
  const [herbOpen,setHerbOpen]=useState(false);
  const herbIdxR=useRef(null);
  const [fletchOpen,setFletchOpen]=useState(false);
  const [uiScale,setUiScale]=useState(1);
  const [offlineTaskSel,setOfflineTaskSel]=useState(0);
  const chatR=useRef([]);chatR.current=chat;

  const addC=useCallback(m=>{const c=[...chatR.current.slice(-100),m];setChat(c);},[]);

  // Keyboard shortcuts: M=map, ESC=close, R=run
  useEffect(()=>{
    const onKey=e=>{
      if(e.key==="m"||e.key==="M"){setMapOpen(v=>!v);return;}
      if(e.key==="Escape"){setMapOpen(false);setBankOpen(false);setShopOpen(false);setSmithOpen(false);setCraftOpen(false);setSellOpen(false);setHerbOpen(false);setFletchOpen(false);}
      if(e.key==="r"||e.key==="R"){const g2=gR.current;if(g2){g2.p.run=!g2.p.run;fr(n=>n+1);}}
    };
    window.addEventListener("keydown",onKey);
    return()=>window.removeEventListener("keydown",onKey);
  },[]);

  useEffect(()=>{
    const map=genMap(),objects=genObjs(map),npcs=genNPCs(),mons=genMons();
    const g={map,objects,npcs,mons,
      p:{x:20,y:28,path:[],mt:0,ms:200,
        sk:Object.fromEntries(SKILLS.map(s=>[s,s==="Hitpoints"?1154:0])),
        hp:10,mhp:10,prayer:1,maxPrayer:1,
        inv:[{i:"bronze_sword",c:1},{i:"wooden_shield",c:1},{i:"bronze_axe",c:1},{i:"tinderbox",c:1},{i:"bread",c:5},{i:"coins",c:50}],
        eq:{weapon:null,shield:null,head:null,body:null,legs:null,ring:null,cape:null},
        bank:[{i:"coins",c:200}],
        act:null,actTm:0,actTgt:null,cmb:null,at:0,as:2400,face:"s",run:false,runE:100,
        style:0,quests:{cook:0,desert:0,goblin:0,rune:0,miner:0,haunted:0,karamja:0,knight:0,relic:0,awakening:0,shipment:0,forge:0,wildernessHunt:0},
        desertKills:0,goblinKills:0,totalXp:0,
        autoRetaliate:true,specialCd:0,specialNext:false,eagleEye:0,manaBurst:false,
        achievements:[],cookCount:0,visitedRegions:new Set(),
        haunted:0,jogreKills:0,demonKills:0,jadKills:0,relicParts:0,
        slayerTask:null,slayerKills:0,
        shipmentFish:0,iceWarriorKills:0,
        activePrayers:[],
        buffs:{},ironman:false,
      },
      cam:{x:0,y:0},tk:0,lt:Date.now(),dlg:null,dlgL:0,rspQ:[],
      fx:[],groundItems:[],fires:[],deathTile:null,
      npcChatter:[],nextChatterTime:Date.now()+15000,
      worldEvent:null,nextEventTime:Date.now()+600000,
      dayTime:0,isNight:false,sandstorm:false,tempMerchant:null,
    };
    g.p.hp=lvl(g.p.sk.Hitpoints);g.p.mhp=g.p.hp;
    g.p.prayer=lvl(g.p.sk.Prayer);g.p.maxPrayer=g.p.prayer;
    gR.current=g;

    // Load saved state
    try{const sv=localStorage.getItem("dunescape_save");if(sv){const sp=JSON.parse(sv);const p2=g.p;Object.assign(p2,sp);p2.hp=Math.min(p2.hp,p2.mhp);p2.prayer=Math.min(p2.prayer,p2.maxPrayer);p2.path=[];p2.act=null;p2.actTgt=null;p2.cmb=null;if(!p2.quests)p2.quests={};['desert','cook','goblin','rune','miner','haunted','karamja','knight','relic','awakening'].forEach(q=>{if(p2.quests[q]==null)p2.quests[q]=0;});if(!p2.desertKills)p2.desertKills=0;if(!p2.goblinKills)p2.goblinKills=0;if(!p2.achievements)p2.achievements=[];if(!p2.buffs)p2.buffs={};if(p2.autoRetaliate==null)p2.autoRetaliate=true;if(!p2.slayerTask)p2.slayerTask=null;if(!p2.sk.Herblore)p2.sk.Herblore=0;if(!p2.sk.Slayer)p2.sk.Slayer=0;if(!p2.sk.Fletching)p2.sk.Fletching=0;if(!p2.eq.cape)p2.eq.cape=null;if(!p2.activePrayers)p2.activePrayers=[];['shipment','forge','wildernessHunt'].forEach(q=>{if(p2.quests[q]==null)p2.quests[q]=0;});if(!p2.shipmentFish)p2.shipmentFish=0;if(!p2.iceWarriorKills)p2.iceWarriorKills=0;p2.visitedRegions=new Set(sp.visitedRegions||[]);p2.haunted=p2.haunted||0;p2.jogreKills=p2.jogreKills||0;p2.demonKills=p2.demonKills||0;p2.jadKills=p2.jadKills||0;p2.relicParts=p2.relicParts||0;p2.cookCount=p2.cookCount||0;addC("Save loaded. Welcome back!");}
    // Offline progression
    const savedOffline=localStorage.getItem("dunescape_offline");
    if(savedOffline){try{const {task,leftAt}=JSON.parse(savedOffline);const elapsed=Math.min(Date.now()-leftAt,8*3600*1000);if(elapsed>30000&&task){const ticks=Math.floor(elapsed/task.interval);const gained=Math.min(ticks,task.maxItems);for(let i=0;i<gained;i++)addI(task.resource,1);const xpGained=gained*task.xpPer;g.p.sk[task.skill]=(g.p.sk[task.skill]||0)+xpGained;g.p.totalXp+=xpGained;addC("⏰ Offline: "+gained+" "+task.resource+" collected ("+Math.floor(elapsed/60000)+"min offline)");}}catch(e2){}localStorage.removeItem("dunescape_offline");}
    }catch(e){}

    const cv=cvR.current,c=cv.getContext("2d");

    // === HELPERS ===
    function addI(id,cnt){const p=g.p,d=ITEMS[id];if(!d)return false;if(d.s){const e=p.inv.find(x=>x.i===id);if(e){e.c+=(cnt||1);dirtyR.current=true;return true;}}if(p.inv.length>=28){addC("Your inventory is full.");return false;}p.inv.push({i:id,c:cnt||1});dirtyR.current=true;return true;}
    function hasI(id){return g.p.inv.some(x=>x.i===id);}
    function remI(id,cnt){const p=g.p,idx=p.inv.findIndex(x=>x.i===id);if(idx===-1)return false;const s=p.inv[idx];if(ITEMS[id]?.s&&s.c>(cnt||1)){s.c-=(cnt||1);dirtyR.current=true;return true;}p.inv.splice(idx,1);dirtyR.current=true;return true;}
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

    function checkAchievement(id){
      const p=g.p;if(p.achievements.includes(id))return;
      const ach=ACHIEVEMENTS.find(a=>a.id===id);if(!ach)return;
      p.achievements.push(id);
      addC(ach.icon+" Achievement unlocked: "+ach.name+" - "+ach.desc);
      g.fx.push({type:"xp",x:p.x,y:p.y-1,text:ach.icon+" "+ach.name,color:"#ff0",life:3000,age:0,big:true});
      dirtyR.current=true;
    }
    g.checkAch=checkAchievement;
    function playSound(type){
      if(!audioOnR.current||!audioR.current?.ctx)return;
      const ctx=audioR.current.ctx;
      const o=ctx.createOscillator(),g2=ctx.createGain();
      const configs={hit:{freq:220,dur:0.1,type:"square",vol:0.15},levelup:{freq:880,dur:0.4,type:"sine",vol:0.2},xp:{freq:660,dur:0.08,type:"sine",vol:0.08},death:{freq:110,dur:0.5,type:"sawtooth",vol:0.2},cook:{freq:440,dur:0.12,type:"sine",vol:0.1}};
      const cfg=configs[type]||configs.hit;
      o.type=cfg.type;o.frequency.value=cfg.freq;g2.gain.value=cfg.vol;
      g2.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+cfg.dur);
      o.connect(g2);g2.connect(ctx.destination);o.start();o.stop(ctx.currentTime+cfg.dur);
    }
    function giveXp(sk,amt){
      const p=g.p,ol=lvl(p.sk[sk]||0);
      if(p.sk[sk]==null)p.sk[sk]=0;
      p.sk[sk]+=amt;p.totalXp+=amt;
      const nl=lvl(p.sk[sk]);
      addXpDrop(sk,amt);
      playSound("xp");
      dirtyR.current=true;
      // XP/hr tracking
      const now2=Date.now();
      if(!xpTrackR.current[sk])xpTrackR.current[sk]=[];
      xpTrackR.current[sk].push({t:now2,xp:amt});
      xpTrackR.current[sk]=xpTrackR.current[sk].filter(e=>now2-e.t<300000);
      if(nl>ol){
        addC("🎉 "+sk+" level "+nl+"!");
        addLevelUp(sk,nl);
        playSound("levelup");
        if(sk==="Hitpoints"){p.mhp=nl;p.hp=Math.min(p.hp+1,p.mhp);}
        if(sk==="Prayer"){p.maxPrayer=nl;p.prayer=Math.min(p.prayer+1,p.maxPrayer);}
        if(nl>=10)checkAchievement("level_10");
        if(nl>=50)checkAchievement("level_50");
        if(nl>=99){checkAchievement("level_99");
          const capeId=sk.toLowerCase().replace(/ /g,"_")+"_cape";
          if(!ITEMS[capeId])ITEMS[capeId]={n:sk+" cape",i:"🎗️",s:false,slot:"cape"};
          addI(capeId,1);
          addC("🎗️ You achieved level 99 "+sk+"! A skill cape is in your inventory.");
        }
      }
    }

    function walkable(x,y){if(x<0||x>=MW||y<0||y>=MH)return false;const t=map[y][x];return t!==T.W&&t!==T.WA&&t!==T.LAVA;}
    walkR.current=walkable;
    // WASD/arrow movement
    const onKeyMove=e=>{
      const dirs={w:[0,-1],a:[-1,0],s:[0,1],d:[1,0],ArrowUp:[0,-1],ArrowLeft:[-1,0],ArrowDown:[0,1],ArrowRight:[1,0]};
      const dv=dirs[e.key];if(!dv)return;
      const p2=g.p,nx=p2.x+dv[0],ny=p2.y+dv[1];
      if(walkable(nx,ny)){p2.path=[{x:nx,y:ny}];}
    };
    window.addEventListener("keydown",onKeyMove);
    function findPath(sx,sy,tx,ty){
      if(!walkable(tx,ty)){for(const[dx,dy]of[[0,-1],[0,1],[-1,0],[1,0],[1,1],[-1,-1],[1,-1],[-1,1]])if(walkable(tx+dx,ty+dy)){tx+=dx;ty+=dy;break;}if(!walkable(tx,ty))return[];}
      const h=(x,y)=>Math.abs(x-tx)+Math.abs(y-ty);
      const open=[[h(sx,sy),0,sx,sy,[]]];
      const vis=new Map();vis.set(sx+','+sy,0);
      while(open.length){
        open.sort((a,b)=>a[0]-b[0]);
        const[,g2,cx,cy,path]=open.shift();
        if(cx===tx&&cy===ty)return path;
        for(const[dx,dy]of[[0,-1],[0,1],[-1,0],[1,0]]){
          const nx=cx+dx,ny=cy+dy,k=nx+','+ny,ng=g2+1;
          if(walkable(nx,ny)&&(!vis.has(k)||vis.get(k)>ng)){
            vis.set(k,ng);open.push([ng+h(nx,ny),ng,nx,ny,[...path,{x:nx,y:ny}]]);
            if(vis.size>6000)return path;
          }
        }
      }
      return[];
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
      if(type==="cook_fire"){const raw=p.inv.find(x=>COOK_RECIPES[x.i]);if(!raw){addC("You have nothing to cook.");return;}p.actTgt={type:"cook",obj:target,raw:raw.i};return;}
      if(type==="smelt"){if(!hasI("copper")&&!hasI("iron")){addC("You need ores to smelt.");return;}p.path=pathToAdjacent(target.x,target.y);p.actTgt={type:"smelt",obj:target};return;}
      if(type==="smith"){p.path=pathToAdjacent(target.x,target.y);p.actTgt={type:"smith",obj:target};return;}
      if(type==="craft"){p.path=pathToAdjacent(target.x,target.y);p.actTgt={type:"craft",obj:target};return;}
      if(type==="pray"){p.path=pathToAdjacent(target.x,target.y);p.actTgt={type:"pray",obj:target};return;}
      if(type==="talk"){p.path=pathToAdjacent(target.x,target.y);p.actTgt={type:"talk",npc:target};return;}
      if(type==="attack"){
        const cw2=p.eq.weapon?ITEMS[p.eq.weapon]:null;
        const rng2=cw2?.rng||(cw2?.mgc?9:0);
        if(rng2>0&&dist(p,target)<=rng2){p.cmb=target;p.at=0;p.act="combat";faceTarget(target.x,target.y);addC("You attack the "+target.nm+".");return;}
        p.path=pathToAdjacent(target.x,target.y);p.actTgt={type:"attack",mon:target};return;
      }
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
        if(o.t==="cactus")continue;
        if(o.t==="tree")doAction("chop",o);else if(o.t==="rock")doAction("mine",o);else if(o.t==="fish")doAction("fish",o);
        else if(o.t==="range")doAction("cook",o);else if(o.t==="furnace")doAction("smelt",o);else if(o.t==="anvil")doAction("smith",o);
        else if(o.t==="altar")doAction("pray",o);else if(o.t==="bank")doAction("bank",o);else if(o.t==="shop")doAction("shop",o);
        else if(o.t==="stall")doAction("steal",o);else if(o.t==="agility")doAction("agility",o);
        else if(o.t==="spawn")doAction("spawn_pickup",o);else if(o.t==="crafting_table")doAction("craft",o);return;
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
        if(n.slayer)opts.push({label:"Get Slayer task",color:"#af0",action:()=>{
          const p2=g.p;const available=SLAYER_TASKS.filter(t=>!p2.slayerTask||t.monster!==p2.slayerTask.monster);
          const task=available[Math.floor(Math.random()*available.length)];
          p2.slayerTask={...task,remaining:task.count};
          addC("📋 Slayer task: Kill "+task.count+" "+task.monster+"s.");dirtyR.current=true;
        }});
        if(n.guard)opts.push({label:"Pickpocket "+n.nm,color:"#a4f",action:()=>{
          const tl=lvl(g.p.sk.Thieving);if(tl<10){addC("You need Thieving level 10.");return;}
          if(Math.random()<0.4+tl*0.015){addI("coins",Math.floor(Math.random()*20)+5);addC("You pickpocket the guard!");giveXp("Thieving",46);}
          else{const hit=Math.floor(Math.random()*3)+1;g.p.hp-=hit;addC("The guard catches you! (-"+hit+" HP)");addHitSplat(g.p.x,g.p.y,hit,true);}
        }});
      }
      for(const m of g.mons)if(!m.dead&&m.x===tx&&m.y===ty){opts.push({label:"Attack "+m.nm+" (Lvl "+m.lvl+")",color:"#f00",action:()=>doAction("attack",m)});}
      for(const gi of g.groundItems)if(gi.x===tx&&gi.y===ty){opts.push({label:"Take "+ITEMS[gi.i].n,color:"#fa0",action:()=>doAction("pickup",gi)});}
      for(const f of g.fires)if(f.x===tx&&f.y===ty){opts.push({label:"Cook on fire",color:"#f80",action:()=>doAction("cook_fire",{x:f.x,y:f.y,t:"fire"})});}
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
        if(o.t==="crafting_table")opts.push({label:"Craft",color:"#8af",action:()=>doAction("craft",o)});
      }
      opts.push({label:"Walk here",color:"#ff0",action:()=>doAction("walk",{x:tx,y:ty})});
      opts.push({label:"Cancel",color:"#888",action:()=>setCtx(null)});
      setCtx({x:e.clientX-rect.left,y:e.clientY-rect.top,opts});
    }

    // === UPDATE ===
    function update(dt){
      const p=g.p;g.tk+=dt;
      // Day/night cycle (10 min)
      g.dayTime=(g.tk%600000)/600000;
      g.isNight=g.dayTime>0.7||g.dayTime<0.1;
      // Special cooldown
      if(p.specialCd>0)p.specialCd=Math.max(0,p.specialCd-dt);
      // Clear expired buffs
      if(p.buffs){Object.keys(p.buffs).forEach(k=>{if(Date.now()>=p.buffs[k].ends)delete p.buffs[k];});}
      // Prayer drain
      if(p.activePrayers&&p.activePrayers.length>0){
        const totalDrain=p.activePrayers.reduce((a,id)=>{const pr=PRAYERS.find(x=>x.id===id);return a+(pr?pr.drain:0);},0);
        if(Math.floor(g.tk/1000)!==Math.floor((g.tk-dt)/1000)){p.prayer=Math.max(0,p.prayer-totalDrain/30);}
        if(p.prayer<=0){p.activePrayers=[];addC("You have run out of Prayer points.");dirtyR.current=true;}
      }
      // World events
      if(Date.now()>=g.nextEventTime&&!g.worldEvent){
        const events=[
          {type:"goblin_raid",msg:"⚠️ A goblin raid is attacking Barbarian Village!",duration:120000,action:()=>{for(let i=0;i<5;i++){g.mons.push({x:40+Math.floor(Math.random()*6),y:24+Math.floor(Math.random()*6),ox:40,oy:26,t:"mon",nm:"Goblin",c:"#5a8a30",hp:13,mhp:13,atk:2,def:2,str:2,xp:5,drops:[{i:"bones",c:1},{i:"coins",c:0.8,a:[3,25]}],rsp:8000,id:Math.random(),at:0,dead:false,agro:true,lvl:2,temp:true});}}},
          {type:"merchant",msg:"⚠️ A Desert Merchant has appeared near Al Kharid for 2 minutes!",duration:120000,action:()=>{g.tempMerchant={x:68,y:43,items:[{i:"rune_arrow",cost:15},{i:"emerald",cost:300},{i:"steel_sword",cost:200}]};}},
          {type:"sandstorm",msg:"⚠️ A sandstorm sweeps through the desert!",duration:90000,action:()=>{g.sandstorm=true;}},
        ];
        const ev=events[Math.floor(Math.random()*events.length)];ev.action();addC(ev.msg);
        g.worldEvent={type:ev.type,endTime:Date.now()+ev.duration};
        g.nextEventTime=Date.now()+ev.duration+(480000+Math.random()*240000);dirtyR.current=true;
      }
      if(g.worldEvent&&Date.now()>=g.worldEvent.endTime){
        g.mons=g.mons.filter(m=>!m.temp);g.tempMerchant=null;g.sandstorm=false;g.worldEvent=null;
      }
      // NPC chatter
      if(Date.now()>=g.nextChatterTime){
        const chatNpcs=g.npcs.filter(n=>n.ambient&&n.ambient.length);
        if(chatNpcs.length){const n=chatNpcs[Math.floor(Math.random()*chatNpcs.length)];const txt=n.ambient[Math.floor(Math.random()*n.ambient.length)];g.npcChatter=g.npcChatter.filter(c=>Date.now()<c.time);g.npcChatter.push({npcId:n.id,text:txt,time:Date.now()+3000});}
        g.nextChatterTime=Date.now()+15000;
      }
      g.npcChatter=g.npcChatter.filter(c=>Date.now()<c.time);
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
            if(at.npc.quest==="desert"){
              if(p.quests.desert===0){p.quests.desert=1;p.desertKills=0;addC("📜 Quest started: Desert Vow! Slay 3 Scorpions.");}
              else if(p.quests.desert===1&&p.desertKills>=3){p.quests.desert=2;giveXp("Mining",200);addI("coins",300);addC("✅ Quest complete: Desert Vow!");addC("Reward: 200 Mining XP, 300 coins.");}
              else if(p.quests.desert===1){addC("Keep going! Scorpions slain: "+p.desertKills+"/3.");}
            }
            if(at.npc.quest==="goblin"){
              if(p.quests.goblin===0){p.quests.goblin=1;p.goblinKills=0;addC("📜 Quest started: Goblin Trouble! Kill 5 Goblins.");}
              else if(p.quests.goblin===1&&p.goblinKills>=5){p.quests.goblin=2;giveXp("Strength",500);addI("coins",400);addI("steel_sword",1);addC("✅ Quest complete: Goblin Trouble!");addC("Reward: 500 Strength XP, 400 coins, steel sword.");}
              else if(p.quests.goblin===1){addC("Keep slaying! Goblins killed: "+p.goblinKills+"/5.");}
            }
            if(at.npc.quest==="rune"){
              const runeCount=p.inv.reduce((a,x)=>x.i==="air_rune"?a+x.c:a,0)+(p.bank||[]).reduce((a,x)=>x.i==="air_rune"?a+x.c:a,0);
              if(p.quests.rune===0){p.quests.rune=1;addC("📜 Quest started: The Rune Mystery! Collect 10 air runes.");}
              else if(p.quests.rune===1&&runeCount>=10){remI("air_rune",10);p.quests.rune=2;giveXp("Magic",1000);addI("air_staff",1);addC("✅ Quest complete: The Rune Mystery!");addC("Reward: 1000 Magic XP, air staff.");checkAchievement("first_quest");const qd=Object.values(p.quests);if(qd.every(v=>v===2))checkAchievement("all_quests");}
              else if(p.quests.rune===1){const have=p.inv.reduce((a,x)=>x.i==="air_rune"?a+x.c:a,0);addC("Air runes in inventory: "+have+"/10. Find more on Dark Wizards.");}
            }
            if(at.npc.quest==="miner"){
              if(!p.quests.miner){p.quests.miner=1;addC("📜 Quest: Troubled Miner! Mine 5 mithril ore for Doric.");}
              else if(p.quests.miner===1){const have=p.inv.reduce((a,x)=>x.i==="mithril"?a+x.c:a,0)+p.bank.reduce((a,x)=>x.i==="mithril"?a+x.c:a,0);if(have>=5){remI("mithril",5);p.quests.miner=2;giveXp("Mining",1500);addI("steel_pick",1);addI("coins",600);addC("✅ Troubled Miner complete! +1500 Mining XP, steel pickaxe, 600gp.");checkAchievement("first_quest");const qd=Object.values(p.quests);if(qd.every(v=>v===2))checkAchievement("all_quests");}else addC("Mine more mithril: "+have+"/5.");}
            }
            if(at.npc.quest==="haunted"){
              if(!p.quests.haunted){p.quests.haunted=1;addC("📜 Quest: Haunted Forest! Kill 5 Necromancers for the Old Hermit.");}
              else if(p.quests.haunted===1){const kc=p.haunted||0;if(kc>=5){p.quests.haunted=2;giveXp("Prayer",800);addI("death_rune",20);addC("✅ Haunted Forest complete! +800 Prayer XP, 20 death runes.");checkAchievement("first_quest");const qd=Object.values(p.quests);if(qd.every(v=>v===2))checkAchievement("all_quests");}else addC("Necromancers slain: "+kc+"/5.");}
            }
            if(at.npc.quest==="karamja"){
              if(!p.quests.karamja){p.quests.karamja=1;addC("📜 Quest: Karamja Expedition! Kill 3 Jogres and return.");}
              else if(p.quests.karamja===1){const kc=p.jogreKills||0;if(kc>=3){p.quests.karamja=2;giveXp("Fishing",1200);addI("lobster",10);addI("coins",500);addC("✅ Karamja Expedition complete! +1200 Fishing XP, 10 lobsters.");checkAchievement("first_quest");const qd=Object.values(p.quests);if(qd.every(v=>v===2))checkAchievement("all_quests");}else addC("Jogres slain: "+kc+"/3.");}
            }
            if(at.npc.quest==="knight"){
              if(!p.quests.knight){p.quests.knight=1;addC("📜 Quest: Knight's Honor! Defeat 3 Lesser Demons for Sir Amik.");}
              else if(p.quests.knight===1){const kc=p.demonKills||0;if(kc>=3){p.quests.knight=2;giveXp("Defence",2000);addI("steel_plate",1);addC("✅ Knight's Honor complete! +2000 Defence XP, steel platebody.");checkAchievement("first_quest");const qd=Object.values(p.quests);if(qd.every(v=>v===2))checkAchievement("all_quests");}else addC("Lesser Demons slain: "+kc+"/3.");}
            }
            if(at.npc.quest==="relic"){
              if(!p.quests.relic){p.quests.relic=1;p.relicParts=0;addC("📜 Quest: Lost Relic! Find 3 relic parts scattered across the world.");}
              else if(p.quests.relic===1&&p.relicParts>=3){p.quests.relic=2;giveXp("Thieving",1500);giveXp("Agility",1500);addI("ring_wealth",1);addC("✅ Lost Relic complete! Ring of wealth, +1500 Thieving & Agility XP.");checkAchievement("first_quest");const qd=Object.values(p.quests);if(qd.every(v=>v===2))checkAchievement("all_quests");}
              else if(p.quests.relic===1){addC("Relic parts found: "+p.relicParts+"/3. Search chests and stalls.");}
            }
            if(at.npc.quest==="awakening"){
              if(!p.quests.awakening){p.quests.awakening=1;addC("📜 Quest: The Final Awakening! Defeat TzTok-Jad 3 times.");}
              else if(p.quests.awakening===1){const kc=p.jadKills||0;if(kc>=3){p.quests.awakening=2;giveXp("Attack",5000);giveXp("Strength",5000);giveXp("Defence",5000);addI("dragon_bones",10);addI("coins",2000);addC("✅ The Final Awakening complete! +5000 Combat XP, dragon bones, 2000gp.");checkAchievement("first_quest");const qd=Object.values(p.quests);if(qd.every(v=>v===2))checkAchievement("all_quests");}else addC("TzTok-Jad defeated: "+kc+"/3.");}
            }
            if(at.npc.quest==="cook"&&p.quests.cook===2){checkAchievement("first_quest");}
            if(at.npc.quest==="desert"&&p.quests.desert===2){checkAchievement("first_quest");}
            if(at.npc.quest==="goblin"&&p.quests.goblin===2){checkAchievement("first_quest");}
            if(at.npc.quest==="shipment"){
              if(!p.quests.shipment){p.quests.shipment=1;p.shipmentFish=0;addC("📜 Quest: The Lost Shipment! Bring 10 lobsters and 5 swordfish to the Dock Master.");}
              else if(p.quests.shipment===1){
                const lob=p.inv.reduce((a,x)=>x.i==="lobster"?a+x.c:a,0)+p.bank.reduce((a,x)=>x.i==="lobster"?a+x.c:a,0);
                const sword=p.inv.reduce((a,x)=>x.i==="swordfish"?a+x.c:a,0)+p.bank.reduce((a,x)=>x.i==="swordfish"?a+x.c:a,0);
                if(lob>=10&&sword>=5){remI("lobster",Math.min(10,p.inv.reduce((a,x)=>x.i==="lobster"?a+x.c:a,0)));remI("swordfish",Math.min(5,p.inv.reduce((a,x)=>x.i==="swordfish"?a+x.c:a,0)));p.quests.shipment=2;giveXp("Fishing",2000);giveXp("Cooking",1000);addI("coins",800);addC("✅ The Lost Shipment complete! +2000 Fishing XP, +1000 Cooking XP, 800gp.");checkAchievement("first_quest");const qd=Object.values(p.quests);if(qd.every(v=>v===2))checkAchievement("all_quests");}
                else addC("Still need: "+(Math.max(0,10-lob))+" lobster, "+(Math.max(0,5-sword))+" swordfish.");
              }
            }
            if(at.npc.quest==="forge"){
              if(!p.quests.forge){p.quests.forge=1;addC("📜 Quest: Falador's Forge! Smith a mithril platebody for the Forgemaster.");}
              else if(p.quests.forge===1){const have=p.inv.some(x=>x.i==="mithril_plate")||p.bank.some(x=>x.i==="mithril_plate");if(have){remI("mithril_plate");p.quests.forge=2;giveXp("Smithing",3000);addI("adamant_bar",3);addC("✅ Falador's Forge complete! +3000 Smithing XP, 3 adamant bars.");checkAchievement("first_quest");const qd=Object.values(p.quests);if(qd.every(v=>v===2))checkAchievement("all_quests");}else addC("Bring me a mithril platebody. Smelt mithril bars at the furnace, then smith it at the anvil.");}
            }
            if(at.npc.quest==="wildernessHunt"){
              if(!p.quests.wildernessHunt){p.quests.wildernessHunt=1;p.iceWarriorKills=0;addC("📜 Quest: Wilderness Hunter! Kill 5 Ice Warriors in the Wilderness.");}
              else if(p.quests.wildernessHunt===1){const kc=p.iceWarriorKills||0;if(kc>=5){p.quests.wildernessHunt=2;giveXp("Attack",2500);giveXp("Strength",2500);addI("adamant_sword",1);addI("coins",1000);addC("✅ Wilderness Hunter complete! +2500 Atk/Str XP, adamant sword, 1000gp.");checkAchievement("first_quest");const qd=Object.values(p.quests);if(qd.every(v=>v===2))checkAchievement("all_quests");}else addC("Ice Warriors slain: "+kc+"/5. Head deep into the Wilderness (north).");}
            }
            }
            else if(at.type==="gather"){
              const obj=at.obj;faceTarget(obj.x,obj.y);
              if(obj.hp<=0){p.actTgt=null;return;}
              const gt=at.gatherType;
              if(gt==="chop"){const hasAxe=p.inv.some(x=>ITEMS[x.i]?.wc)||(p.eq.weapon&&ITEMS[p.eq.weapon]?.wc);if(!hasAxe){addC("You need an axe to chop trees.");p.act=null;p.actTgt=null;return;}addC("You swing your axe at the tree...");}
              else if(gt==="mine"){const hasPick=p.inv.some(x=>ITEMS[x.i]?.mine)||(p.eq.weapon&&ITEMS[p.eq.weapon]?.mine);if(!hasPick){addC("You need a pickaxe to mine rocks.");p.act=null;p.actTgt=null;return;}addC("You swing your pickaxe at the rock...");}
              else if(gt==="fish")addC("You cast your net into the water...");
              p.act="gathering";p.actTm=0;
            }
            else if(at.type==="attack"){p.cmb=at.mon;p.at=0;p.act="combat";faceTarget(at.mon.x,at.mon.y);addC("You attack the "+at.mon.nm+".");}
            else if(at.type==="cook"){faceTarget(at.obj.x,at.obj.y);p.act="cooking";p.actTm=0;}
            else if(at.type==="smelt"){faceTarget(at.obj.x,at.obj.y);p.act="smelting";p.actTm=0;}
            else if(at.type==="smith"){faceTarget(at.obj.x,at.obj.y);setSmithOpen(true);p.actTgt=null;}
            else if(at.type==="craft"){faceTarget(at.obj.x,at.obj.y);setCraftOpen(true);p.actTgt=null;}
            else if(at.type==="pray"){p.prayer=p.maxPrayer;addC("You recharge your Prayer.");p.actTgt=null;}
            else if(at.type==="bank"){setBankOpen(true);p.actTgt=null;}
            else if(at.type==="shop"){setShopOpen(true);p.actTgt=null;}
            else if(at.type==="steal"){
              const o=at.obj;const tl=lvl(p.sk.Thieving);
              if(tl<(o.lvl||1)){addC("You need Thieving level "+(o.lvl||1)+".");p.actTgt=null;return;}
              if(Math.random()<0.5+tl*0.015){
                if(o.sub==="cake"){addI("cake",1);addC("You steal a cake!");}
                else if(o.sub==="silk"){addI("silk",1);addC("You steal some silk!");}
                else{addI("coins",Math.floor(Math.random()*30)+10);addC("You steal some coins!");}
                giveXp("Thieving",o.xp||16);
                if(p.quests.relic===1&&(p.relicParts||0)<3&&Math.random()<0.2){p.relicParts=(p.relicParts||0)+1;addC("📦 You find a relic part! "+p.relicParts+"/3");}
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
            if(addI(obj.res,1)){addC("You get: "+ITEMS[obj.res].n);giveXp(obj.sk,obj.xp);obj.hp=0;g.rspQ.push({obj,time:Date.now()+obj.rsp});for(let i=0;i<6;i++)g.fx.push({type:"particle",x:obj.x,y:obj.y,vx:(Math.random()-0.5)*3,vy:-Math.random()*2.5,color:"#4a8a20",life:800,age:0});
            if(obj.sk==="Woodcutting")checkAchievement("first_log");
            if(obj.sk==="Mining")checkAchievement("first_ore");
            if(obj.sk==="Fishing")checkAchievement("first_fish");}
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
          if(Math.random()<0.4+cl*0.025){addI(rec.out,1);addC("You cook the "+ITEMS[raw].n+".");giveXp("Cooking",rec.xp);playSound("cook");p.cookCount=(p.cookCount||0)+1;if(p.cookCount>=50)checkAchievement("deep_cook");}
          else{addI(rec.burnt,1);addC("You burn the "+ITEMS[raw].n+".");}
          if(!hasI(raw)){p.act=null;p.actTgt=null;}
        }
      }
      // Smelting
      if(p.act==="smelting"){p.actTm+=dt;if(p.actTm>=2200){p.actTm=0;
        if(hasI("copper")&&hasI("tin")){remI("copper");remI("tin");addI("bronze_bar",1);addC("You smelt a bronze bar.");giveXp("Smithing",6);}
        else if(hasI("iron")&&hasI("coal")){remI("iron");remI("coal");addI("steel_bar",1);addC("You smelt a steel bar.");giveXp("Smithing",17);}
        else if(hasI("gold_ore")){remI("gold_ore");addI("gold_bar",1);addC("You smelt a gold bar.");giveXp("Smithing",22);}
        else if(hasI("adamant_ore")&&p.inv.reduce((a,x)=>x.i==="coal"?a+x.c:a,0)>=2){remI("adamant_ore");remI("coal");remI("coal");addI("adamant_bar",1);addC("You smelt an adamant bar.");giveXp("Smithing",37);}
        else if(hasI("iron")){remI("iron");if(Math.random()<0.5){addI("iron_bar",1);addC("You smelt an iron bar.");giveXp("Smithing",12);}else addC("The iron ore is impure...");}
        else{p.act=null;p.actTgt=null;addC("No ores to smelt.");}
      }}
      // Smithing (queue from modal)
      if(smithQueueR.current){const {bar,rec}=smithQueueR.current;smithQueueR.current=null;
        if(hasI(bar)){remI(bar);if(addI(rec.out,1)){addC("You smith: "+ITEMS[rec.out].n);giveXp("Smithing",rec.xp);}}
        else addC("You no longer have the required bar.");
      }
      // Crafting (queue from modal)
      if(craftQueueR.current){const rec=craftQueueR.current;craftQueueR.current=null;
        const cl=lvl(p.sk.Crafting);
        if(cl<rec.lvl){addC("Need Crafting level "+rec.lvl+".");}
        else{const hasTool=hasI(rec.tool);if(!hasTool){addC("You need a "+ITEMS[rec.tool].n+" to craft this.");}
        else{let ok=true;Object.entries(rec.needs).forEach(([id,cnt])=>{if(!p.inv.find(x=>x.i===id&&x.c>=(cnt||1)))ok=false;});
          if(!ok){addC("You don't have the required materials.");}
          else{Object.entries(rec.needs).forEach(([id,cnt])=>remI(id,cnt));if(addI(rec.out,1)){addC("You craft: "+ITEMS[rec.out].n);giveXp("Crafting",rec.xp);checkAchievement("crafter");}}}}
      }
      // Combat
      if(p.act==="combat"&&p.cmb){
        const mon=p.cmb;if(mon.dead){p.act=null;p.cmb=null;p.actTgt=null;return;}
        if(mon.x>p.x)p.face="e";else if(mon.x<p.x)p.face="w";else if(mon.y>p.y)p.face="s";else p.face="n";
        const cw=p.eq.weapon?ITEMS[p.eq.weapon]:null;
        const attackRange=cw?.rng||(cw?.mgc?9:1);
        // Move closer if out of range
        if(dist(p,mon)>attackRange){if(p.path.length===0)p.path=pathToAdjacent(mon.x,mon.y);}
        p.at+=dt;
        if(p.at>=p.as&&dist(p,mon)<=attackRange){p.at=0;
          const doKill=(tgtMon)=>{
            const km=tgtMon||mon;
            km.dead=true;addC("You killed the "+km.nm+"!");
            if(p.quests.desert===1&&km.nm==="Scorpion"){p.desertKills++;addC("Scorpions slain: "+p.desertKills+"/3.");}
            if(p.quests.goblin===1&&km.nm==="Goblin"){p.goblinKills++;addC("Goblins slain: "+p.goblinKills+"/5.");}
            if(km.nm==="Necromancer"&&p.quests.haunted===1){p.haunted=(p.haunted||0)+1;}
            if(km.nm==="Jogre"&&p.quests.karamja===1){p.jogreKills=(p.jogreKills||0)+1;}
            if(km.nm==="Lesser Demon"&&p.quests.knight===1){p.demonKills=(p.demonKills||0)+1;}
            if(km.nm==="TzTok-Jad"){p.jadKills=(p.jadKills||0)+1;if(p.quests.awakening===1)addC("TzTok-Jad defeated: "+p.jadKills+"/3.");checkAchievement("jad_killer");}
            if(km.nm==="Ice Warrior"&&p.quests.wildernessHunt===1){p.iceWarriorKills=(p.iceWarriorKills||0)+1;addC("Ice Warriors: "+p.iceWarriorKills+"/5.");}
            // Slayer task tracking
            if(p.slayerTask&&km.nm===p.slayerTask.monster){
              p.slayerTask.remaining=Math.max(0,p.slayerTask.remaining-1);
              if(p.slayerTask.remaining===0){giveXp("Slayer",p.slayerTask.xp);addC("✅ Slayer task complete! +"+p.slayerTask.xp+" Slayer XP.");checkAchievement("slayer_first");p.slayerTask=null;}
            }
            checkAchievement("first_blood");
            if(g.isNight)checkAchievement("night_owl");
            const cwk=p.eq.weapon?ITEMS[p.eq.weapon]:null;
            let sk2,xp2;
            if(cwk?.mgc){sk2="Magic";xp2=km.xp*4;}
            else if(cwk?.rng){sk2="Ranged";xp2=km.xp*4;}
            else{const styles=[["Attack",km.xp*4],["Strength",km.xp*4],["Defence",km.xp*4]];[sk2,xp2]=styles[p.style]||styles[0];}
            giveXp(sk2,xp2);giveXp("Hitpoints",Math.ceil(km.xp*1.33));
            km.drops.forEach(d=>{if(Math.random()<d.c){const a=d.a?d.a[0]+Math.floor(Math.random()*(d.a[1]-d.a[0])):1;dropToGround(d.i,a,km.x,km.y);addC("Drop: "+ITEMS[d.i].n+(a>1?" x"+a:""));if(d.i==="dragon_bones")checkAchievement("dragon_bone");}});
            if(!tgtMon){g.rspQ.push({mon:km,time:Date.now()+km.rsp});p.act=null;p.cmb=null;p.actTgt=null;}
            else g.rspQ.push({mon:km,time:Date.now()+km.rsp});
            dirtyR.current=true;
          }
          if(cw?.rng){
            // Ranged combat
            const arrowPrio=["rune_arrow","steel_arrow","iron_arrow","bronze_arrow"];
            const arrow=arrowPrio.find(a=>hasI(a));
            if(!arrow){addC("You have no arrows! Equip some to use a bow.");p.act=null;p.cmb=null;return;}
            remI(arrow,1);
            const rl=lvl(p.sk.Ranged);
            const prayRng=(p.activePrayers||[]).reduce((a,id)=>{const pr=PRAYERS.find(x=>x.id===id);return a+(pr?.rngBonus||0);},0);
            const hitC=p.eagleEye>0?1:(0.32+rl*0.016)*(1+prayRng);
            if(p.eagleEye>0)p.eagleEye--;
            g.fx.push({type:"arrow",sx:p.x,sy:p.y,tx:mon.x,ty:mon.y,color:"#c8a860",life:400,age:0});
            if(Math.random()<hitC){
              const maxH=Math.max(1,Math.floor(rl*(0.55+prayRng*0.5)))+1;const hit=Math.floor(Math.random()*maxH)+1;
              mon.hp-=hit;addHitSplat(mon.x,mon.y,hit,false);playSound("hit");
              if(mon.hp<=0)doKill();
            }else addHitSplat(mon.x,mon.y,0,false);
          }else if(cw?.mgc){
            // Magic combat
            const isFireStaff=p.eq.weapon==="fire_staff";
            const hasRunes=isFireStaff?(hasI("fire_rune")&&hasI("air_rune")):hasI("air_rune");
            if(!hasRunes){addC("You have no runes for this spell!");p.act=null;p.cmb=null;return;}
            if(isFireStaff){remI("fire_rune",3);remI("air_rune",1);}else remI("air_rune",1);
            const ml=lvl(p.sk.Magic);const spMax=isFireStaff?20:10;
            const hitC=0.38+ml*0.013;
            g.fx.push({type:"magic",sx:p.x,sy:p.y,tx:mon.x,ty:mon.y,color:isFireStaff?"#f86020":"#80a0ff",life:500,age:0});
            if(Math.random()<hitC){
              if(p.manaBurst){
                p.manaBurst=false;
                g.mons.filter(m=>!m.dead&&Math.abs(m.x-mon.x)<=3&&Math.abs(m.y-mon.y)<=3).forEach(m2=>{const h2=Math.max(1,Math.floor(Math.random()*spMax/2)+1);m2.hp-=h2;addHitSplat(m2.x,m2.y,h2,false);playSound("hit");if(m2.hp<=0)doKill(m2);});
              }else{
                const hit=Math.floor(Math.random()*spMax)+1;
                mon.hp-=hit;addHitSplat(mon.x,mon.y,hit,false);playSound("hit");
                if(mon.hp<=0)doKill();
              }
            }else addHitSplat(mon.x,mon.y,0,false);
          }else{
            // Melee combat
            const prayAtk=(p.activePrayers||[]).reduce((a,id)=>{const pr=PRAYERS.find(x=>x.id===id);return a+(pr?.atkBonus||0);},0);
            const prayStr=(p.activePrayers||[]).reduce((a,id)=>{const pr=PRAYERS.find(x=>x.id===id);return a+(pr?.strBonus||0);},0);
            const buffAmt=p.buffs?.Attack&&Date.now()<p.buffs.Attack.ends?p.buffs.Attack.amt:0;
            const strBuff=p.buffs?.Strength&&Date.now()<p.buffs.Strength.ends?p.buffs.Strength.amt:0;
            const al=Math.floor(lvl(p.sk.Attack)*(1+prayAtk))+buffAmt,sl=Math.floor(lvl(p.sk.Strength)*(1+prayStr))+strBuff;
            const wb=cw?{a:cw.atk||0,s:cw.str||0}:{a:0,s:0};
            const rb=p.eq.ring&&ITEMS[p.eq.ring]?.str?ITEMS[p.eq.ring].str:0;
            const hitC=0.35+al*0.018+wb.a*0.013;
            if(Math.random()<hitC){
              const maxH=Math.max(1,Math.floor(sl*0.55+wb.s*0.88+rb*0.75))+1;let hit=Math.floor(Math.random()*maxH)+1;
              if(p.specialNext){hit*=2;p.specialNext=false;addC("⚡ Power Strike! "+hit+" damage!");}
              mon.hp-=hit;addHitSplat(mon.x,mon.y,hit,false);playSound("hit");
              if(mon.hp<=0)doKill();
            }else addHitSplat(mon.x,mon.y,0,false);
          }
        }
        if(!mon.dead){mon.at+=dt;if(mon.at>=2400){mon.at=0;
          const dl=lvl(p.sk.Defence);const db=(()=>{let d=0;["shield","head","body","legs"].forEach(s=>{if(p.eq[s])d+=(ITEMS[p.eq[s]].def||0);});return d;})();
          const prayDef=(p.activePrayers||[]).reduce((a,id)=>{const pr=PRAYERS.find(x=>x.id===id);return a+(pr?.defBonus||0);},0);
          const block=0.15+dl*(0.018+prayDef*0.002)+db*0.01+prayDef*0.12;
          // Protect prayers (50% damage reduction on matching attack type)
          const monAtkType=mon.atkType||"melee";
          const protApplies=(monAtkType==="melee"&&(p.activePrayers||[]).some(id=>id==="prot_melee"))||(monAtkType==="ranged"&&(p.activePrayers||[]).some(id=>id==="prot_missiles"))||(monAtkType==="magic"&&(p.activePrayers||[]).some(id=>id==="prot_magic"));
          if(Math.random()>block){let hit=Math.floor(Math.random()*mon.str)+1;if(protApplies)hit=Math.floor(hit*0.5);p.hp-=hit;addHitSplat(p.x,p.y,hit,true);dirtyR.current=true;
            if(p.hp===1)checkAchievement("survivor");
            if(p.hp<=0){
              const deathX=p.x,deathY=p.y;
              addC("☠️ Oh dear, you are dead! Some items dropped.");playSound("death");
              // Keep 3 most valuable items; drop rest
              const itemVal=i=>{const d=ITEMS[i];if(!d)return 0;if(d.slot)return 300;if(i==="coins")return 0;return 50;};
              const sorted=[...p.inv].sort((a,b)=>itemVal(b.i)-itemVal(a.i));
              const keep=sorted.slice(0,3);
              sorted.slice(3).forEach(({i,c})=>g.groundItems.push({i,c,x:deathX,y:deathY,time:Date.now()+180000}));
              p.inv=keep;
              g.deathTile={x:deathX,y:deathY,time:Date.now()+180000};
              p.hp=p.mhp;p.x=20;p.y=28;p.path=[];p.act=null;p.cmb=null;p.actTgt=null;
              g.fx.push({type:"death",x:deathX,y:deathY,life:1500,age:0});
            }
          }else{addHitSplat(p.x,p.y,0,true);}
          // Auto-retaliate
          if(p.hp>0&&p.autoRetaliate&&!p.cmb&&!p.act){p.cmb=mon;p.at=0;p.act="combat";addC("⚔️ Auto-retaliating against "+mon.nm+"!");}
        }}
      }
      // HP regen
      if(Math.floor(g.tk/6000)!==Math.floor((g.tk-dt)/6000)&&p.hp<p.mhp)p.hp=Math.min(p.mhp,p.hp+1);
      // Monster roaming & aggro
      if(Math.floor(g.tk/2500)!==Math.floor((g.tk-dt)/2500)){
        g.mons.forEach(m=>{if(m.dead||p.cmb===m)return;
          const aggroRange=m.agro?5+(g.isNight?2:0):0;
          if(aggroRange>0&&dist(m,p)<aggroRange&&!p.cmb){p.cmb=m;p.act="combat";p.at=0;p.path=[];p.actTgt=null;addC("⚠️ The "+m.nm+" attacks you!");return;}
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
      // HP regen triggers dirty
      if(Math.floor(g.tk/6000)!==Math.floor((g.tk-dt)/6000)&&p.hp<p.mhp){dirtyR.current=true;}
      // Track coins for rich achievement
      const coins2=p.inv.find(x=>x.i==="coins");if(coins2&&coins2.c>=10000)checkAchievement("rich");
      // Track visited regions
      let curReg="";
      if(p.y>=22&&p.y<38&&p.x>=12&&p.x<32)curReg="Lumbridge";
      else if(p.y>=7&&p.y<20&&p.x>=12&&p.x<35)curReg="Varrock";
      else if(p.y>=35&&p.y<55&&p.x>=55)curReg="AlKharid";
      else if(p.y>=22&&p.y<30&&p.x>=36&&p.x<46)curReg="Barbarian";
      else if(p.y>=55&&p.x>=8&&p.x<24)curReg="Mine";
      else if(p.y>=18&&p.y<35&&p.x>=55)curReg="Fishing";
      else if(p.y>=55&&p.y<65&&p.x>=26&&p.x<40)curReg="Draynor";
      else if(p.y>=35&&p.y<50&&p.x>=22&&p.x<38)curReg="Falador";
      else if(p.y>=47&&p.y<55&&p.x>=23&&p.x<32)curReg="MiningGuild";
      else if(p.y>=80&&p.x>=44&&p.x<72)curReg="Karamja";
      else if(p.y>=70&&p.x>=30&&p.x<45)curReg="Agility";
      else if(p.y>=45&&p.y<65&&p.x<14)curReg="DarkForest";
      if(curReg&&!p.visitedRegions.has(curReg)){p.visitedRegions.add(curReg);if(p.visitedRegions.size>=12)checkAchievement("explorer");}
      // Auto-save every 60s
      if(Math.floor(g.tk/60000)!==Math.floor((g.tk-dt)/60000)){try{localStorage.setItem("dunescape_save",JSON.stringify({ver:SAVE_VERSION,sk:p.sk,inv:p.inv,eq:p.eq,bank:p.bank,hp:p.hp,mhp:p.mhp,prayer:p.prayer,maxPrayer:p.maxPrayer,quests:p.quests,desertKills:p.desertKills,goblinKills:p.goblinKills||0,totalXp:p.totalXp,x:p.x,y:p.y,runE:p.runE,achievements:p.achievements,autoRetaliate:p.autoRetaliate,slayerTask:p.slayerTask,haunted:p.haunted,jogreKills:p.jogreKills,demonKills:p.demonKills,jadKills:p.jadKills,relicParts:p.relicParts,buffs:p.buffs,ironman:p.ironman,visitedRegions:[...p.visitedRegions],cookCount:p.cookCount,activePrayers:p.activePrayers||[],shipmentFish:p.shipmentFish||0,iceWarriorKills:p.iceWarriorKills||0}));}catch(e){}}
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
        if(mx<0||mx>=MW||my<0||my>=MH){c.fillStyle="#0d0403";c.fillRect(tx*TILE,ty*TILE,TILE,TILE);continue;}
        const t=map[my][mx],cols=TC[t]||["#333"];c.fillStyle=cols[(mx*7+my*13)%cols.length];c.fillRect(tx*TILE,ty*TILE,TILE,TILE);
        // Rocky ground details (pebbles + cracks)
        if(t===T.G&&((mx*11+my*7)%17===0)){c.fillStyle="rgba(140,50,15,0.55)";c.beginPath();c.arc(tx*TILE+10,ty*TILE+18,3,0,6.28);c.fill();c.beginPath();c.arc(tx*TILE+22,ty*TILE+12,2,0,6.28);c.fill();c.beginPath();c.arc(tx*TILE+16,ty*TILE+24,2.5,0,6.28);c.fill();}
        if(t===T.G&&((mx*13+my*11)%23===0)){c.strokeStyle="rgba(60,15,5,0.45)";c.lineWidth=1;c.beginPath();c.moveTo(tx*TILE+8,ty*TILE+10);c.lineTo(tx*TILE+18,ty*TILE+20);c.stroke();c.beginPath();c.moveTo(tx*TILE+20,ty*TILE+8);c.lineTo(tx*TILE+26,ty*TILE+16);c.stroke();}
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
        c.fillStyle="rgba(255,120,0,0.2)";c.fillRect(sx+4,sy+16,24,16);
        c.font="14px sans-serif";c.textAlign="center";c.fillText(ITEMS[gi.i].i,sx+16,sy+28);
        c.font="bold 7px sans-serif";c.fillStyle="#ffe080";c.fillText(ITEMS[gi.i].n.substring(0,10),sx+16,sy+38);
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
          c.fillStyle="#6a3818";c.fillRect(sx+12+shake,sy+16,8,14);
          c.fillStyle=o.sub==="oak"?"#5a6a18":o.sub==="willow"?"#4a7820":o.sub==="yew"?"#2a5010":"#4a7a1a";
          c.beginPath();c.arc(sx+16+shake,sy+10,o.sub==="yew"?16:14,0,6.28);c.fill();
          c.fillStyle=o.sub==="oak"?"#6a7a22":o.sub==="willow"?"#5a8828":o.sub==="yew"?"#3a6018":"#5a8820";
          c.beginPath();c.arc(sx+12+shake,sy+8,o.sub==="yew"?10:8,0,6.28);c.fill();
        }
        if(o.t==="rock"){
          const rc=o.res==="copper"?"#a06028":o.res==="tin"?"#aaa":o.res==="iron"?"#8a5a3a":o.res==="coal"?"#3a3a3a":o.res==="gold_ore"?"#d4a030":"#4466aa";
          const shake=g.p.act==="gathering"&&g.p.actTgt?.obj===o?Math.sin(g.tk*0.03)*1.5:0;
          c.fillStyle="#6a3820";c.beginPath();c.arc(sx+16+shake,sy+18,12,0,6.28);c.fill();
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
        if(o.t==="crafting_table"){c.fillStyle="#7a5a30";c.fillRect(sx+4,sy+10,24,18);c.fillStyle="#9a7a40";c.fillRect(sx+4,sy+8,24,4);c.fillStyle="#fff";c.font="bold 6px sans-serif";c.textAlign="center";c.fillText("CRAFT",sx+16,sy+22);}
        if(o.t==="cactus"){
          c.fillStyle="#4a7a18";c.fillRect(sx+13,sy+6,6,22);
          c.fillRect(sx+7,sy+14,6,4);c.fillRect(sx+19,sy+18,6,4);
          c.fillRect(sx+6,sy+8,5,10);c.fillRect(sx+21,sy+12,5,8);
          c.fillStyle="#5a8a22";c.fillRect(sx+14,sy+4,4,6);
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
        if(f.type==="arrow"||f.type==="magic"){
          const t2=Math.min(1,f.age/f.life);
          const pfx=(f.sx-cx)*TILE+16+(f.tx-f.sx)*TILE*t2;
          const pfy=(f.sy-cy)*TILE+16+(f.ty-f.sy)*TILE*t2;
          c.globalAlpha=alpha;c.fillStyle=f.color;
          c.beginPath();c.arc(pfx,pfy,f.type==="magic"?5:2.5,0,6.28);c.fill();
          if(f.type==="magic"){c.fillStyle="#fff";c.beginPath();c.arc(pfx,pfy,2,0,6.28);c.fill();}
          c.globalAlpha=1;
        }
      }
      // NPC chatter bubbles
      for(const ch of g.npcChatter){const n=g.npcs.find(n2=>n2.id===ch.npcId);if(!n)continue;const sx=(n.x-cx)*TILE,sy=(n.y-cy)*TILE;if(sx<-TILE||sx>CW+TILE||sy<-TILE||sy>CH+TILE)continue;const alpha=Math.min(1,(ch.time-Date.now())/1000);c.globalAlpha=alpha;c.fillStyle="rgba(255,255,220,0.95)";const tw=c.measureText(ch.text).width+12;c.fillRect(sx+16-tw/2,sy-28,tw,16);c.fillStyle="#333";c.font="bold 8px sans-serif";c.textAlign="center";c.fillText(ch.text,sx+16,sy-17);c.globalAlpha=1;}
      // Temp merchant
      if(g.tempMerchant){const tm=g.tempMerchant;const sx=(tm.x-cx)*TILE,sy=(tm.y-cy)*TILE;if(sx>=-TILE&&sx<=CW+TILE&&sy>=-TILE&&sy<=CH+TILE){c.fillStyle="#a0c060";c.beginPath();c.arc(sx+16,sy+16,10,0,6.28);c.fill();c.fillStyle="#da0";c.font="bold 9px sans-serif";c.textAlign="center";c.fillText("Merchant",sx+16,sy-2);}}
      // Sandstorm overlay
      if(g.sandstorm){c.fillStyle="rgba(200,160,80,0.25)";c.fillRect(0,0,CW,CH);}
      // Night overlay
      const nightAlpha2=g.isNight?0.38:g.dayTime>0.6?(g.dayTime-0.6)/0.1*0.38:g.dayTime<0.15?(0.15-g.dayTime)/0.05*0.38:0;
      if(nightAlpha2>0){c.fillStyle=`rgba(0,10,30,${nightAlpha2})`;c.fillRect(0,0,CW,CH);}
      // Death tile marker
      if(g.deathTile&&Date.now()<g.deathTile.time){
        const sx=(g.deathTile.x-cx)*TILE,sy=(g.deathTile.y-cy)*TILE;
        const rem=Math.ceil((g.deathTile.time-Date.now())/1000);
        c.fillStyle="rgba(200,0,0,0.2)";c.fillRect(sx,sy,TILE,TILE);
        c.fillStyle="#f44";c.font="bold 8px sans-serif";c.textAlign="center";c.fillText("⚰️"+rem+"s",sx+16,sy+12);
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
      else if(p.y>=55&&p.y<65&&p.x>=26&&p.x<40)loc="Draynor Village";
      else if(p.y>=35&&p.y<50&&p.x>=22&&p.x<38)loc="Falador";
      else if(p.y>=47&&p.y<55&&p.x>=23&&p.x<32)loc="Mining Guild";
      else if(p.y>=80&&p.x>=44&&p.x<72)loc="Karamja";
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
        const t=map[my][mx];c.fillStyle=t===T.W?"#1a2848":t===T.WA?"#2a1408":t===T.S?"#4a3828":t===T.SA?"#c8a840":t===T.PA||t===T.D?"#7a3818":t===T.DG?"#3a0c03":t===T.DESERT?"#d4b870":t===T.LAVA?"#c03010":"#8a2005";
        c.fillRect(mmx+mx*sc,mmy+my*sc,Math.ceil(sc*2),Math.ceil(sc*2));
      }
      c.fillStyle="#fff";c.fillRect(mmx+p.x*sc-1,mmy+p.y*sc-1,3,3);
      g.mons.forEach(m=>{if(!m.dead){c.fillStyle="#f00";c.fillRect(mmx+m.x*sc,mmy+m.y*sc,2,2);}});
      g.npcs.forEach(n=>{c.fillStyle="#0ff";c.fillRect(mmx+n.x*sc,mmy+n.y*sc,2,2);});
      c.fillStyle="#c8a84e";c.font="bold 10px sans-serif";c.textAlign="center";c.fillText("N",mmx+ms/2,mmy-4);
    }

    function loop(){const now=Date.now(),dt=Math.min(now-g.lt,200);g.lt=now;update(dt);draw();if(dirtyR.current){dirtyR.current=false;fr(n=>n+1);}fR.current=requestAnimationFrame(loop);}
    cv.addEventListener("click",handleClick);cv.addEventListener("contextmenu",handleRClick);
    fR.current=requestAnimationFrame(loop);
    return()=>{cancelAnimationFrame(fR.current);cv.removeEventListener("click",handleClick);cv.removeEventListener("contextmenu",handleRClick);window.removeEventListener("keydown",onKeyMove);};
  },[addC]);

  const g=gR.current,p=g?.player||g?.p;
  const cLvl=p?Math.floor((lvl(p.sk.Attack)+lvl(p.sk.Strength)+lvl(p.sk.Defence)+lvl(p.sk.Hitpoints))/4):1;
  const totalLvl=p?SKILLS.reduce((a,s)=>a+lvl(p.sk[s]),0):16;

  function initAudio(){
    if(audioR.current)return;
    try{const ctx=new(window.AudioContext||window.webkitAudioContext)();const osc=ctx.createOscillator();const gain=ctx.createGain();osc.type="sine";osc.frequency.value=55;gain.gain.value=0.04;osc.connect(gain);gain.connect(ctx.destination);osc.start();audioR.current={ctx,drone:{osc,gain}};}catch(e){}
  }
  function eat(idx){if(!p)return;const s=p.inv[idx];if(!s)return;const d=ITEMS[s.i];
    if(d.buff){
      if(d.buff.restore){p.prayer=Math.min(p.maxPrayer,p.prayer+Math.floor(p.maxPrayer*0.25)+7);addC("Prayer restored.");}
      else{if(!p.buffs)p.buffs={};p.buffs[d.buff.skill]={amt:d.buff.amt,ends:Date.now()+d.buff.dur};addC("You feel the effect of the "+d.n+".");}
      if(d.s&&s.c>1)s.c--;else p.inv.splice(idx,1);fr(n=>n+1);return;
    }
    if(d.heal){if(p.hp>=p.mhp)return;p.hp=Math.min(p.mhp,p.hp+d.heal);addC("You eat "+d.n+". +"+d.heal+" HP");if(d.s&&s.c>1)s.c--;else p.inv.splice(idx,1);}}
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
    if(g&&gR.current?.checkAch)gR.current.checkAch("fire_starter");
    const ol=lvl(p.sk.Firemaking);p.sk.Firemaking+=lt.xp;p.totalXp+=lt.xp;
    g.fx.push({type:"xp",x:p.x,y:p.y,text:"+"+lt.xp+" Firemaking",color:SKILL_COLORS.Firemaking,life:1500,age:0});
    const nl=lvl(p.sk.Firemaking);if(nl>ol){addC("🎉 Firemaking level "+nl+"!");}}
  function bankDeposit(idx,e){if(!p)return;const s=p.inv[idx];if(!s)return;
    let amt=1;if(e?.shiftKey)amt=Math.min(10,s.c);if(e?.ctrlKey)amt=s.c;
    const be=p.bank.find(b=>b.i===s.i);if(be)be.c+=amt;else p.bank.push({i:s.i,c:amt});
    if(s.c<=amt)p.inv.splice(idx,1);else s.c-=amt;fr(n=>n+1);}
  function bankDepositAll(){if(!p)return;while(p.inv.length>0){const s=p.inv[0];const be=p.bank.find(b=>b.i===s.i);if(be)be.c+=s.c;else p.bank.push({i:s.i,c:s.c});p.inv.splice(0,1);}addC("All items deposited.");fr(n=>n+1);}
  function bankWithdraw(idx,e){if(!p)return;const s=p.bank[idx];if(!s)return;
    const d=ITEMS[s.i];let amt=1;if(e?.shiftKey)amt=10;if(e?.ctrlKey)amt=s.c;
    amt=Math.min(amt,s.c);
    if(d.s){const ei=p.inv.find(x=>x.i===s.i);if(ei)ei.c+=amt;else{if(p.inv.length>=28){addC("Inventory full.");return;}p.inv.push({i:s.i,c:amt});}s.c-=amt;if(s.c<=0)p.bank.splice(idx,1);}
    else{for(let i2=0;i2<amt;i2++){if(p.inv.length>=28){addC("Inventory full.");break;}p.inv.push({i:s.i,c:1});s.c--;if(s.c<=0){p.bank.splice(idx,1);break;}}}
    fr(n=>n+1);}
  function doSmith(bar,rec){if(!p)return;smithQueueR.current={bar,rec};setSmithOpen(false);}
  function doCraft(rec){if(!p)return;craftQueueR.current=rec;setCraftOpen(false);}
  function buyItem(si){if(!p)return;
    if(p.ironman){addC("Ironman mode: you cannot buy from shops.");return;}
    const coins=p.inv.find(x=>x.i==="coins");const have=coins?coins.c:0;if(have<si.cost){addC("Need "+si.cost+" coins.");return;}
    if(coins.c>si.cost)coins.c-=si.cost;else p.inv.splice(p.inv.indexOf(coins),1);
    if(ITEMS[si.i].s){const e=p.inv.find(x=>x.i===si.i);if(e){e.c++;fr(n=>n+1);return;}};if(p.inv.length>=28){addC("Inventory full.");return;}p.inv.push({i:si.i,c:1});addC("Bought: "+ITEMS[si.i].n);fr(n=>n+1);}
  function sellItem(itemId){if(!p)return;const price=SELL_PRICES[itemId]||5;const coins=p.inv.find(x=>x.i==="coins");if(coins)coins.c+=price;else{if(p.inv.length<28)p.inv.push({i:"coins",c:price});}const idx=p.inv.findIndex(x=>x.i===itemId);if(idx>=0){const s2=p.inv[idx];if(ITEMS[itemId].s&&s2.c>1)s2.c--;else p.inv.splice(idx,1);}addC("Sold "+ITEMS[itemId].n+" for "+price+" gp.");fr(n=>n+1);}
  function useHerblore(idx){if(!p||!gR.current)return;const g2=gR.current;const s=p.inv[idx];if(!s)return;
    if(s.i==="herb"){const hl=lvl(p.sk.Herblore||0);if(hl<1){addC("You need Herblore level 1.");return;}p.inv.splice(idx,1);if(p.inv.length<28)p.inv.push({i:"clean_herb",c:1});addC("You clean the herb.");const ol=lvl(p.sk.Herblore||0);p.sk.Herblore=(p.sk.Herblore||0)+3;p.totalXp+=3;const nl=lvl(p.sk.Herblore);if(nl>ol)addC("🎉 Herblore level "+nl+"!");g2.fx.push({type:"xp",x:p.x,y:p.y,text:"+3 Herblore",color:SKILL_COLORS.Herblore,life:1500,age:0});fr(n=>n+1);return;}
    if(s.i==="clean_herb"){herbIdxR.current=idx;setHerbOpen(true);}
  }
  function doHerblore(rec){if(!p||!gR.current)return;const g2=gR.current;
    const hl=lvl(p.sk.Herblore||0);if(hl<rec.lvl){addC("Need Herblore level "+rec.lvl+".");setHerbOpen(false);return;}
    const herbNeed=rec.needs.clean_herb||1;
    const herbCount=p.inv.reduce((a,x)=>x.i==="clean_herb"?a+(x.c||1):a,0);
    if(herbCount<herbNeed){addC("Need "+herbNeed+" clean herb"+(herbNeed>1?"s":"")+".");setHerbOpen(false);return;}
    if(!hasI_react("vial")){addC("Need a vial of water.");setHerbOpen(false);return;}
    let toRem=herbNeed;for(let i=p.inv.length-1;i>=0&&toRem>0;i--){if(p.inv[i].i==="clean_herb"){const tk=Math.min(toRem,p.inv[i].c);p.inv[i].c-=tk;toRem-=tk;if(p.inv[i].c<=0)p.inv.splice(i,1);}}
    const vi=p.inv.findIndex(x=>x.i==="vial");if(vi>=0)p.inv.splice(vi,1);
    const pot=p.inv.find(x=>x.i===rec.out);if(pot)pot.c++;else if(p.inv.length<28)p.inv.push({i:rec.out,c:1});
    p.sk.Herblore=(p.sk.Herblore||0)+rec.xp;p.totalXp+=rec.xp;
    const ol=lvl(p.sk.Herblore-rec.xp);const nl=lvl(p.sk.Herblore);if(nl>ol)addC("🎉 Herblore level "+nl+"!");
    g2.fx.push({type:"xp",x:p.x,y:p.y,text:"+"+rec.xp+" Herblore",color:SKILL_COLORS.Herblore,life:1500,age:0});
    addC("You brew a "+ITEMS[rec.out].n+".");setHerbOpen(false);fr(n=>n+1);
  }
  function hasI_react(id){return p?.inv.some(x=>x.i===id);}
  function doFletch(rec){if(!p||!gR.current)return;const g2=gR.current;
    const fl=lvl(p.sk.Fletching||0);if(fl<rec.lvl){addC("Need Fletching level "+rec.lvl+".");setFletchOpen(false);return;}
    if(!hasI_react(rec.tool)){addC("Need a "+ITEMS[rec.tool].n+".");setFletchOpen(false);return;}
    let ok=true;Object.entries(rec.needs).forEach(([id,cnt])=>{if(!p.inv.find(x=>x.i===id&&x.c>=(cnt||1)))ok=false;});
    if(!ok){addC("You don't have the required materials.");setFletchOpen(false);return;}
    Object.entries(rec.needs).forEach(([id,cnt])=>{for(let j=0;j<(cnt||1);j++){const idx=p.inv.findIndex(x=>x.i===id);if(idx>=0){if(p.inv[idx].c>1)p.inv[idx].c--;else p.inv.splice(idx,1);}}});
    const outCnt=rec.outCount||1;const existing=p.inv.find(x=>x.i===rec.out);if(existing)existing.c+=outCnt;else if(p.inv.length<28)p.inv.push({i:rec.out,c:outCnt});
    p.sk.Fletching=(p.sk.Fletching||0)+rec.xp;p.totalXp+=rec.xp;
    const ol=lvl(p.sk.Fletching-rec.xp);const nl=lvl(p.sk.Fletching);if(nl>ol)addC("🎉 Fletching level "+nl+"!");
    g2.fx.push({type:"xp",x:p.x,y:p.y,text:"+"+rec.xp+" Fletching",color:SKILL_COLORS.Fletching,life:1500,age:0});
    addC("You fletch: "+ITEMS[rec.out].n+(outCnt>1?" x"+outCnt:"")+".");setFletchOpen(false);fr(n=>n+1);
  }
  function togglePrayer(id){if(!p)return;const pl=lvl(p.sk.Prayer);const pr=PRAYERS.find(x=>x.id===id);if(!pr)return;if(pl<pr.lvl){addC("Need Prayer level "+pr.lvl+".");return;}if(p.prayer<=0){addC("You have no Prayer points.");return;}const active=p.activePrayers||[];const idx=active.indexOf(id);if(idx>=0)p.activePrayers=active.filter(x=>x!==id);else p.activePrayers=[...active,id];fr(n=>n+1);}
  function saveGame(){if(!p||!gR.current)return;try{localStorage.setItem("dunescape_save",JSON.stringify({ver:SAVE_VERSION,sk:p.sk,inv:p.inv,eq:p.eq,bank:p.bank,hp:p.hp,mhp:p.mhp,prayer:p.prayer,maxPrayer:p.maxPrayer,quests:p.quests,desertKills:p.desertKills,goblinKills:p.goblinKills||0,totalXp:p.totalXp,x:p.x,y:p.y,runE:p.runE,achievements:p.achievements,autoRetaliate:p.autoRetaliate,slayerTask:p.slayerTask,haunted:p.haunted,jogreKills:p.jogreKills,demonKills:p.demonKills,jadKills:p.jadKills,relicParts:p.relicParts,buffs:p.buffs,ironman:p.ironman,visitedRegions:[...(p.visitedRegions||[])],cookCount:p.cookCount,activePrayers:p.activePrayers||[],shipmentFish:p.shipmentFish||0,iceWarriorKills:p.iceWarriorKills||0}));addC("Game saved!");}catch(e){}}

  const invSlots=[];
  if(p)for(let i=0;i<28;i++){const s=p.inv[i];const d=s?ITEMS[s.i]:null;const isLog=s&&["logs","oak_logs","willow_logs","yew_logs"].includes(s.i);
    const tooltipText=d?`${d.n}${d.heal?` | Heals: ${d.heal}HP`:''}${d.atk?` | Atk: +${d.atk}`:''}${d.str?` | Str: +${d.str}`:''}${d.def?` | Def: +${d.def}`:''}${d.rng?` | Rng: ${d.rng}tiles`:''}${d.mgc?' | Magic weapon':''}${d.buff?' | Buff: '+d.buff.skill:''}`:''
    invSlots.push(<div key={i} title={tooltipText} style={{width:38,height:38,background:s?"rgba(90,25,8,0.55)":"rgba(35,10,5,0.35)",border:"1px solid rgba(200,168,78,0.12)",display:"flex",alignItems:"center",justifyContent:"center",cursor:s?"pointer":"default",borderRadius:3,position:"relative",fontSize:17}}
      onClick={e=>{if(!s)return;if(bankOpen){bankDeposit(i,e);return;}if(sellOpen&&SELL_PRICES[s.i]){sellItem(s.i);return;}if(d.buff||d.heal)eat(i);else if(d.slot)equip(i);else if(s.i==="bones"||s.i==="big_bones"||s.i==="dragon_bones")bury(i);else if(isLog&&p?.inv.some(x=>x.i==="knife"))setFletchOpen(true);else if(isLog)firemaking(i);else if(s.i==="herb"||s.i==="clean_herb")useHerblore(i);}}
      onContextMenu={e=>{e.preventDefault();if(!s)return;if(bankOpen){bankDeposit(i,e);return;}drop(i);}}
    >{s&&<span>{d.i}</span>}{s&&d.s&&s.c>1&&<span style={{position:"absolute",top:0,left:2,fontSize:8,color:"#ff0",fontWeight:700}}>{s.c>99999?"99k+":s.c}</span>}
      {s&&<span style={{position:"absolute",bottom:0,right:1,fontSize:6,color:"#aa9",maxWidth:34,overflow:"hidden",whiteSpace:"nowrap"}}>{d.n}</span>}
    </div>);}

  return (
    <div style={{width:"100vw",height:"100vh",background:"#120604",display:"flex",flexDirection:"column",overflow:"hidden",fontFamily:"'Segoe UI',sans-serif",userSelect:"none"}}>
      {/* HUD */}
      <div style={{height:36,background:"linear-gradient(180deg,#280e06,#1c0804)",borderBottom:"2px solid #7a2010",display:"flex",alignItems:"center",padding:"0 10px",gap:10,flexShrink:0,overflow:"hidden"}}>
        <span style={{color:"#d4a030",fontWeight:900,fontSize:15,letterSpacing:3,fontFamily:"'Courier New',monospace",textShadow:"1px 1px 0 #7a2808,2px 2px 0 #2a0804",textTransform:"uppercase"}}>Dunescape</span>
        {p&&<>
          <span style={{color:"#0c0",fontSize:11}}>❤️{p.hp}/{p.mhp}</span>
          <span style={{color:"#4af",fontSize:11}}>🙏{p.prayer}/{p.maxPrayer}</span>
          <span style={{color:p.run?"#0f0":"#888",fontSize:11,cursor:"pointer"}} onClick={()=>{if(p)p.run=!p.run;fr(n=>n+1);}}>{p.run?"🏃":"🚶"}{Math.floor(p.runE)}%</span>
          <span style={{color:"#da4",fontSize:11}}>⚔️{cLvl}</span>
          <span style={{color:"#888",fontSize:10}}>Total:{totalLvl}</span>
          {p.ironman&&<span style={{color:"#888",fontSize:10}}>🔒</span>}
          {gR.current?.isNight?<span style={{fontSize:10}}>🌙</span>:<span style={{fontSize:10}}>☀️</span>}
          {p.slayerTask&&<span style={{color:"#8a2020",fontSize:9}}>🗡️{p.slayerTask.monster} {p.slayerTask.remaining}/{p.slayerTask.count}</span>}
          <div style={{marginLeft:"auto",display:"flex",gap:4,alignItems:"center"}}>
            <button onClick={()=>{if(p){p.autoRetaliate=!p.autoRetaliate;fr(n=>n+1);}}} style={{background:p.autoRetaliate?"#1a1808":"transparent",border:"1px solid #6a2010",color:p.autoRetaliate?"#ff0":"#555",fontSize:8,padding:"2px 4px",cursor:"pointer",borderRadius:3,fontWeight:600}}>{p.autoRetaliate?"⚔️AR":"🚫AR"}</button>
            {["Accurate","Aggressive","Defensive"].map((s,i)=><button key={i} onClick={()=>{if(p)p.style=i;fr(n=>n+1);}}
              style={{background:p.style===i?"#5a1808":"transparent",border:"1px solid #6a2010",color:p.style===i?"#ff0":"#555",fontSize:8,padding:"2px 4px",cursor:"pointer",borderRadius:3,fontWeight:600}}>{s}</button>)}
            <button onClick={saveGame} style={{background:"#1a3010",border:"1px solid #3a6020",color:"#4c0",fontSize:8,padding:"2px 4px",cursor:"pointer",borderRadius:3,fontWeight:600}}>💾</button>
            <button onClick={()=>{const blob=new Blob([localStorage.getItem("dunescape_save")||"{}"],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="dunescape_save.json";a.click();}} style={{background:"#0a1a2a",border:"1px solid #2a4a6a",color:"#6af",fontSize:8,padding:"2px 4px",cursor:"pointer",borderRadius:3,fontWeight:600}}>📤</button>
            <label style={{background:"#0a1a2a",border:"1px solid #2a4a6a",color:"#6af",fontSize:8,padding:"2px 4px",cursor:"pointer",borderRadius:3,fontWeight:600}}>📥<input type="file" accept=".json" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{try{const d=JSON.parse(ev.target.result);localStorage.setItem("dunescape_save",JSON.stringify(d));window.location.reload();}catch(err){}};r.readAsText(f);}}/></label>
            <button onClick={()=>{audioOnR.current=!audioOnR.current;if(audioOnR.current)initAudio();fr(n=>n+1);}} style={{background:"#0a1a0a",border:"1px solid #2a4a2a",color:"#4af",fontSize:8,padding:"2px 4px",cursor:"pointer",borderRadius:3}}>{audioOnR.current?"🔊":"🔇"}</button>
            <button onClick={()=>setMapOpen(v=>!v)} style={{background:"#0a1a2a",border:"1px solid #2a4a6a",color:"#6af",fontSize:8,padding:"2px 4px",cursor:"pointer",borderRadius:3,fontWeight:600}}>🗺️</button>
          </div>
        </>}
      </div>
      {/* Main */}
      <div style={{flex:1,display:"flex",overflow:"hidden",minHeight:0}}>
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",background:"#0d0403",position:"relative",minWidth:0}}>
          <canvas ref={cvR} width={CW} height={CH} style={{imageRendering:"pixelated",cursor:"crosshair",maxWidth:"100%",maxHeight:"100%",border:"2px solid #5a1808"}} />
          {ctx_menu&&<div style={{position:"absolute",left:ctx_menu.x,top:ctx_menu.y,background:"rgba(12,4,2,0.97)",border:"1px solid #7a2010",borderRadius:4,minWidth:150,zIndex:50,boxShadow:"0 4px 24px rgba(0,0,0,0.8)"}}>
            <div style={{background:"#280e06",padding:"3px 8px",fontSize:8,color:"#888",letterSpacing:1}}>Choose Option</div>
            {ctx_menu.opts.map((o,i)=><div key={i} onClick={()=>{o.action();setCtx(null);}} style={{padding:"4px 10px",fontSize:11,color:o.color||"#ddd",cursor:"pointer",borderBottom:"1px solid rgba(90,74,48,0.2)"}}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(200,168,78,0.12)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>{o.label}</div>)}
          </div>}
        </div>
        {/* Side panel */}
        <div style={{width:195,background:"linear-gradient(180deg,#1e0a06,#180804)",borderLeft:"2px solid #5a1808",display:"flex",flexDirection:"column",flexShrink:0}}>
          <div style={{display:"flex",borderBottom:"1px solid #5a1808"}}>
            {[["inv","🎒"],["skills","⚔️"],["equip","🛡️"],["quest","📜"],["pray","🙏"],["settings","⚙️"]].map(([t,ic])=>
              <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:"4px 0",background:tab===t?"#280e06":"transparent",border:"none",color:tab===t?"#c8a84e":"#5a2010",cursor:"pointer",fontSize:11,borderBottom:tab===t?"2px solid #c8a84e":"2px solid transparent"}}>{ic}</button>)}
          </div>
          <div style={{flex:1,overflow:"auto",padding:5}}>
            {tab==="inv"&&<div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:2}}>{invSlots}</div>
              <div style={{marginTop:6,padding:"4px 2px",borderTop:"1px solid rgba(200,168,78,0.1)"}}>
                <div style={{fontSize:8,color:"#c8a84e",fontWeight:700,marginBottom:3}}>⏰ Offline Task</div>
                <select value={offlineTaskSel} onChange={e=>setOfflineTaskSel(Number(e.target.value))} style={{width:"100%",background:"#1a0804",color:"#ddd",border:"1px solid #5a1808",fontSize:8,padding:2,borderRadius:3}}>
                  {OFFLINE_TASKS.map((t,i)=><option key={i} value={i}>{t.label}</option>)}
                </select>
                <button onClick={()=>{const t=OFFLINE_TASKS[offlineTaskSel];localStorage.setItem("dunescape_offline",JSON.stringify({task:t,leftAt:Date.now()}));addC("⏰ Offline task set: "+t.label);}} style={{marginTop:3,width:"100%",background:"#1a2010",border:"1px solid #3a5020",color:"#4c0",fontSize:8,padding:"2px 0",cursor:"pointer",borderRadius:3}}>Set & Activate</button>
              </div>
            </div>}
            {tab==="skills"&&p&&<div style={{display:"flex",flexDirection:"column",gap:2}}>
              {SKILLS.map(s=>{const l=lvl(p.sk[s]),cur=p.sk[s],nxt=xpLvl(l+1),prv=xpLvl(l),pct=l>=99?1:(cur-prv)/(nxt-prv);
                const track=xpTrackR.current[s]||[];const now=Date.now();
                const recent=track.filter(e=>now-e.t<3600000);
                let xphr=0;if(recent.length>=2){const el=(now-recent[0].t)/3600000;xphr=Math.round(recent.reduce((a,e)=>a+e.xp,0)/el);}
                return <div key={s} style={{background:"rgba(70,20,5,0.45)",padding:"3px 5px",borderRadius:3,border:"1px solid rgba(200,168,78,0.08)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:SKILL_COLORS[s]||"#c8a84e",fontWeight:600}}><span>{s}</span><span>{l}/99</span></div>
                  <div style={{height:3,background:"#120604",borderRadius:2,marginTop:1}}><div style={{height:"100%",background:l>=99?"#da0":SKILL_COLORS[s]||"#4a8a2a",borderRadius:2,width:(pct*100)+"%",transition:"width 0.3s",opacity:0.8}}/></div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:7,color:"#554",marginTop:1}}>
                    <span>{cur.toLocaleString()} / {l>=99?"--":nxt.toLocaleString()}</span>
                    {xphr>0&&<span style={{color:"#8a0"}}>{xphr>=1000?(xphr/1000).toFixed(1)+"k":xphr}/hr</span>}
                  </div>
                </div>;})}
              <div style={{textAlign:"center",fontSize:9,color:"#888",marginTop:4}}>Total XP: {(p.totalXp||0).toLocaleString()}</div>
            </div>}
            {tab==="equip"&&p&&<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,paddingTop:8}}>
              <div style={{color:"#c8a84e",fontSize:10,fontWeight:700,letterSpacing:1}}>EQUIPMENT</div>
              {["head","body","legs"].map(s=><div key={s} onClick={()=>unequip(s)} style={{width:42,height:42,background:p.eq[s]?"rgba(90,25,8,0.55)":"rgba(40,10,5,0.25)",border:"1px solid rgba(200,168,78,0.12)",borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:p.eq[s]?16:8,color:p.eq[s]?"#fff":"#444",cursor:p.eq[s]?"pointer":"default"}}>{p.eq[s]?ITEMS[p.eq[s]].i:s}</div>)}
              <div style={{display:"flex",gap:6}}>
                {["weapon","shield"].map(s=><div key={s} onClick={()=>unequip(s)} style={{width:42,height:42,background:p.eq[s]?"rgba(90,25,8,0.55)":"rgba(40,10,5,0.25)",border:"1px solid rgba(200,168,78,0.12)",borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:p.eq[s]?16:8,color:p.eq[s]?"#fff":"#444",cursor:p.eq[s]?"pointer":"default"}}>{p.eq[s]?ITEMS[p.eq[s]].i:s}</div>)}
              </div>
              <div onClick={()=>unequip("ring")} title={p.eq.ring?`${ITEMS[p.eq.ring].n}${ITEMS[p.eq.ring].def?` | Def: +${ITEMS[p.eq.ring].def}`:''}${ITEMS[p.eq.ring].str?` | Str: +${ITEMS[p.eq.ring].str}`:''}`:'ring'} style={{width:42,height:42,background:p.eq.ring?"rgba(90,25,8,0.55)":"rgba(40,10,5,0.25)",border:"1px solid rgba(200,168,78,0.12)",borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:p.eq.ring?16:8,color:p.eq.ring?"#fff":"#444",cursor:p.eq.ring?"pointer":"default"}}>{p.eq.ring?ITEMS[p.eq.ring].i:"ring"}</div>
              <div onClick={()=>unequip("cape")} style={{width:42,height:42,background:p.eq.cape?"rgba(90,25,8,0.55)":"rgba(40,10,5,0.25)",border:"1px solid rgba(200,168,78,0.12)",borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",fontSize:p.eq.cape?16:8,color:p.eq.cape?"#fff":"#444",cursor:p.eq.cape?"pointer":"default"}}>{p.eq.cape?ITEMS[p.eq.cape].i:"cape"}</div>
              {p.eq.weapon&&(()=>{const cw=ITEMS[p.eq.weapon];const isMelee=!cw.rng&&!cw.mgc&&(cw.atk||cw.str);const isRng=!!cw.rng;const isMgc=!!cw.mgc;return <div style={{textAlign:"center",marginTop:4}}>
                <button onContextMenu={e=>{e.preventDefault();if(!p.specialCd){if(isMelee){p.specialNext=true;addC("⚡ Power Strike ready - next hit deals 2x damage!");p.specialCd=30000;}else if(isRng){p.eagleEye=3;addC("👁️ Eagle Eye: next 3 shots always hit!");p.specialCd=30000;}else if(isMgc){p.manaBurst=true;addC("💥 Mana Burst ready - next cast hits all nearby!");p.specialCd=30000;}fr(n=>n+1);}else addC("Special attack on cooldown: "+Math.ceil(p.specialCd/1000)+"s");}} style={{background:p.specialCd?"#2a1810":"#3a1808",border:"1px solid "+(p.specialCd?"#4a3820":"#c8a84e"),color:p.specialCd?"#555":"#ff0",fontSize:7,padding:"3px 6px",cursor:"pointer",borderRadius:3}}>⚡ Special {p.specialCd?Math.ceil(p.specialCd/1000)+"s":"Ready"}</button>
              </div>})()}
              <div style={{fontSize:9,color:"#8a7a5a",textAlign:"center",lineHeight:1.5,marginTop:4}}>
                Atk:+{p.eq.weapon?ITEMS[p.eq.weapon].atk||0:0} Str:+{(p.eq.weapon?ITEMS[p.eq.weapon].str||0:0)+(p.eq.ring&&ITEMS[p.eq.ring]?.str?ITEMS[p.eq.ring].str:0)}<br/>
                Def:+{["shield","head","body","legs"].reduce((a,s)=>a+(p.eq[s]?ITEMS[p.eq[s]].def||0:0),0)}
              </div>
            </div>}
            {tab==="quest"&&p&&<div style={{padding:4}}>
              <div style={{color:"#c8a84e",fontSize:10,fontWeight:700,letterSpacing:1,marginBottom:6}}>QUESTS ({Object.values(p.quests).filter(v=>v===2).length}/{Object.keys(p.quests).length})</div>
              {[
                {key:"cook",name:"Cook's Assistant",desc:p.quests.cook===0?"Talk to the Cook in Lumbridge.":p.quests.cook===1?"Find: egg, milk, flour.":"Complete!"},
                {key:"desert",name:"Desert Vow",desc:p.quests.desert===0?"Talk to Ali in Al Kharid.":p.quests.desert===1?"Scorpions: "+(p.desertKills||0)+"/3":"Complete!"},
                {key:"goblin",name:"Goblin Trouble",desc:!p.quests.goblin?"Talk to Barbarian Chief.":p.quests.goblin===1?"Goblins: "+(p.goblinKills||0)+"/5":"Complete!"},
                {key:"rune",name:"The Rune Mystery",desc:!p.quests.rune?"Talk to Sedridor in Varrock.":p.quests.rune===1?"Collect 10 air runes.":"Complete!"},
                {key:"miner",name:"Troubled Miner",desc:!p.quests.miner?"Talk to Doric at the mine.":p.quests.miner===1?"Mine 5 mithril ore.":"Complete!"},
                {key:"haunted",name:"Haunted Forest",desc:!p.quests.haunted?"Talk to Old Hermit (Dark Forest).":p.quests.haunted===1?"Necromancers: "+(p.haunted||0)+"/5":"Complete!"},
                {key:"karamja",name:"Karamja Expedition",desc:!p.quests.karamja?"Talk to Luthas in Karamja.":p.quests.karamja===1?"Jogres: "+(p.jogreKills||0)+"/3":"Complete!"},
                {key:"knight",name:"Knight's Honor",desc:!p.quests.knight?"Talk to Sir Amik in Falador.":p.quests.knight===1?"Lesser Demons: "+(p.demonKills||0)+"/3":"Complete!"},
                {key:"relic",name:"Lost Relic",desc:!p.quests.relic?"Talk to Archaeologist in Varrock.":p.quests.relic===1?"Relic parts: "+(p.relicParts||0)+"/3":"Complete!"},
                {key:"awakening",name:"The Final Awakening",desc:!p.quests.awakening?"Talk to the Seer in Varrock.":p.quests.awakening===1?"TzTok-Jad: "+(p.jadKills||0)+"/3":"Complete!"},
                {key:"shipment",name:"The Lost Shipment",desc:!p.quests.shipment?"Talk to Dock Master in Draynor.":p.quests.shipment===1?"Need 10 lobsters + 5 swordfish.":"Complete!"},
                {key:"forge",name:"Falador's Forge",desc:!p.quests.forge?"Talk to Forgemaster in Falador.":p.quests.forge===1?"Smith a mithril platebody.":"Complete!"},
                {key:"wildernessHunt",name:"Wilderness Hunter",desc:!p.quests.wildernessHunt?"Talk to Wilderness Scout (north).":p.quests.wildernessHunt===1?"Ice Warriors: "+(p.iceWarriorKills||0)+"/5":"Complete!"},
              ].map(q=><div key={q.key} style={{background:"rgba(70,20,5,0.45)",padding:"5px 8px",borderRadius:4,marginBottom:3,border:"1px solid rgba(200,168,78,0.08)"}}>
                <div style={{fontSize:10,color:p.quests[q.key]===2?"#0c0":p.quests[q.key]>=1?"#ff0":"#c44",fontWeight:600}}>{p.quests[q.key]===2?"✅":"📜"} {q.name}</div>
                <div style={{fontSize:8,color:"#888",marginTop:1}}>{q.desc}</div>
              </div>)}
              <div style={{color:"#c8a84e",fontSize:10,fontWeight:700,letterSpacing:1,marginTop:8,marginBottom:4}}>ACHIEVEMENTS ({(p.achievements||[]).length}/{ACHIEVEMENTS.length})</div>
              {ACHIEVEMENTS.map(a=>{const done=(p.achievements||[]).includes(a.id);return <div key={a.id} style={{background:"rgba(70,20,5,0.45)",padding:"3px 6px",borderRadius:3,marginBottom:2,border:"1px solid rgba(200,168,78,0.06)",opacity:done?1:0.4}}>
                <div style={{fontSize:9,color:done?"#da0":"#666",fontWeight:600}}>{a.icon} {a.name}</div>
                <div style={{fontSize:7,color:"#666"}}>{a.desc}</div>
              </div>;})}
            </div>}
            {tab==="pray"&&p&&<div style={{padding:4}}>
              <div style={{color:"#c8a84e",fontSize:10,fontWeight:700,letterSpacing:1,marginBottom:4}}>PRAYER {Math.ceil(p.prayer)}/{p.maxPrayer}</div>
              <div style={{height:5,background:"#120604",borderRadius:3,marginBottom:6}}><div style={{height:"100%",background:"#4488cc",borderRadius:3,width:(p.prayer/p.maxPrayer*100)+"%"}}/></div>
              <div style={{display:"flex",flexDirection:"column",gap:2}}>
                {PRAYERS.map(pr=>{const active=(p.activePrayers||[]).includes(pr.id);const canUse=lvl(p.sk.Prayer)>=pr.lvl;return <div key={pr.id} onClick={()=>togglePrayer(pr.id)}
                  style={{display:"flex",alignItems:"center",gap:4,padding:"3px 5px",borderRadius:3,background:active?"rgba(68,136,204,0.25)":"rgba(70,20,5,0.3)",border:"1px solid "+(active?"#4488cc":"rgba(200,168,78,0.08)"),cursor:canUse?"pointer":"default",opacity:canUse?1:0.4}}>
                  <span style={{fontSize:12}}>{pr.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:8,color:active?"#8af":"#c8a84e",fontWeight:600}}>{pr.name}</div>
                    <div style={{fontSize:7,color:"#666"}}>{pr.desc} · Lvl {pr.lvl} · {pr.drain}/30s</div>
                  </div>
                  {active&&<span style={{fontSize:8,color:"#4af"}}>ON</span>}
                </div>;})}
              </div>
              <div style={{fontSize:8,color:"#555",marginTop:6,lineHeight:1.5}}>Bury bones for Prayer XP. Recharge at an altar.</div>
            </div>}
            {tab==="settings"&&p&&<div style={{padding:6,display:"flex",flexDirection:"column",gap:6}}>
              <div style={{color:"#c8a84e",fontSize:10,fontWeight:700,letterSpacing:1}}>SETTINGS</div>
              <label style={{fontSize:9,color:"#ddd",display:"flex",alignItems:"center",gap:4}}>
                <input type="checkbox" checked={p.autoRetaliate||false} onChange={e=>{p.autoRetaliate=e.target.checked;fr(n=>n+1);}}/>
                Auto-Retaliate
              </label>
              <label style={{fontSize:9,color:"#ddd",display:"flex",alignItems:"center",gap:4}}>
                <input type="checkbox" checked={p.run||false} onChange={e=>{p.run=e.target.checked;fr(n=>n+1);}}/>
                Run Mode
              </label>
              <label style={{fontSize:9,color:"#ddd",display:"flex",alignItems:"center",gap:4}}>
                <input type="checkbox" checked={audioOnR.current} onChange={e=>{audioOnR.current=e.target.checked;if(e.target.checked)initAudio();fr(n=>n+1);}}/>
                Sound Effects
              </label>
              <div style={{fontSize:9,color:"#ddd"}}>UI Scale:
                {["S","M","L"].map((sz,i)=><button key={sz} onClick={()=>{setUiScale(i===0?0.85:i===1?1:1.15);}} style={{marginLeft:4,background:uiScale===(i===0?0.85:i===1?1:1.15)?"#5a1808":"transparent",border:"1px solid #5a2010",color:"#da0",fontSize:8,padding:"1px 4px",cursor:"pointer",borderRadius:2}}>{sz}</button>)}
              </div>
              <div style={{fontSize:9,color:p.ironman?"#c8a84e":"#666"}}>Mode: {p.ironman?"🔒 Ironman":"Normal"}</div>
              {!p.ironman&&<button onClick={()=>{if(confirm("Enable Ironman? Cannot buy from shops.")){p.ironman=true;fr(n=>n+1);}}} style={{background:"#2a1010",border:"1px solid #7a2010",color:"#c44",fontSize:8,padding:"3px 6px",cursor:"pointer",borderRadius:3}}>Enable Ironman</button>}
              <button onClick={saveGame} style={{background:"#1a3010",border:"1px solid #3a6020",color:"#4c0",fontSize:8,padding:"3px 6px",cursor:"pointer",borderRadius:3}}>💾 Save Now</button>
              <button onClick={()=>{const blob=new Blob([localStorage.getItem("dunescape_save")||"{}"],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="dunescape_save.json";a.click();}} style={{background:"#0a1a2a",border:"1px solid #2a4a6a",color:"#6af",fontSize:8,padding:"3px 6px",cursor:"pointer",borderRadius:3}}>📤 Export Save</button>
              <button onClick={()=>{if(confirm("Reset ALL progress? Cannot be undone!")){localStorage.removeItem("dunescape_save");window.location.reload();}}} style={{background:"#3a0808",border:"1px solid #8a2010",color:"#f44",fontSize:8,padding:"3px 6px",cursor:"pointer",borderRadius:3}}>🗑️ Reset Save</button>
            </div>}
          </div>
        </div>
      </div>
      {/* Bank */}
      {bankOpen&&p&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setBankOpen(false)}>
        <div style={{background:"linear-gradient(180deg,#1e0a06,#180804)",border:"2px solid #7a2010",borderRadius:8,padding:14,minWidth:320,maxWidth:520}} onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
            <span style={{color:"#c8a84e",fontWeight:700,fontSize:14}}>🏦 Bank</span>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>{bankDepositAll();}} style={{background:"#3a5a2a",border:"1px solid #5a8a3a",color:"#af0",padding:"3px 10px",cursor:"pointer",borderRadius:4,fontSize:10,fontWeight:600}}>Deposit All</button>
              <button onClick={()=>setBankOpen(false)} style={{background:"#4a1010",border:"none",color:"#c8a84e",padding:"3px 10px",cursor:"pointer",borderRadius:4}}>✕</button>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(8,1fr)",gap:2,marginBottom:10}}>
            {p.bank.filter(s=>ITEMS[s.i]).map((s,i)=><div key={i} onClick={e=>{bankWithdraw(p.bank.indexOf(s),e);}} title={ITEMS[s.i].n+" x"+s.c+" | Shift:10 Ctrl:all"} style={{width:36,height:36,background:"rgba(80,20,5,0.45)",border:"1px solid rgba(200,168,78,0.1)",borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,cursor:"pointer",position:"relative"}}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(200,168,78,0.15)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(80,20,5,0.45)"}>
              {ITEMS[s.i].i}{s.c>1&&<span style={{position:"absolute",top:0,left:2,fontSize:7,color:"#ff0",fontWeight:700}}>{s.c>9999?"9k+":s.c}</span>}
              <span style={{position:"absolute",bottom:0,right:1,fontSize:5,color:"#aa9",maxWidth:32,overflow:"hidden",whiteSpace:"nowrap"}}>{ITEMS[s.i].n}</span>
            </div>)}
          </div>
          <div style={{color:"#777",fontSize:9}}>Click bank items to withdraw. Click inventory to deposit. {p.bank.length} items stored.</div>
        </div>
      </div>}
      {/* Shop */}
      {shopOpen&&p&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>{setShopOpen(false);setSellOpen(false);}}>
        <div style={{background:"linear-gradient(180deg,#1e0a06,#180804)",border:"2px solid #7a2010",borderRadius:8,padding:14,minWidth:340,maxWidth:540}} onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
            <span style={{color:"#c8a84e",fontWeight:700,fontSize:14}}>🏪 General Store</span>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>setSellOpen(false)} style={{background:!sellOpen?"#5a1808":"transparent",border:"1px solid #7a2010",color:!sellOpen?"#ff0":"#888",padding:"3px 8px",cursor:"pointer",borderRadius:4,fontSize:9,fontWeight:600}}>🛒 Buy</button>
              <button onClick={()=>setSellOpen(true)} style={{background:sellOpen?"#5a1808":"transparent",border:"1px solid #7a2010",color:sellOpen?"#ff0":"#888",padding:"3px 8px",cursor:"pointer",borderRadius:4,fontSize:9,fontWeight:600}}>💰 Sell</button>
              <button onClick={()=>{setShopOpen(false);setSellOpen(false);}} style={{background:"#4a1010",border:"none",color:"#c8a84e",padding:"3px 10px",cursor:"pointer",borderRadius:4}}>✕</button>
            </div>
          </div>
          {!sellOpen&&<div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:3}}>
            {SHOP_ITEMS.map((si,i)=><div key={i} onClick={()=>{buyItem(si);}} style={{background:"rgba(80,20,5,0.35)",border:"1px solid rgba(200,168,78,0.1)",borderRadius:4,padding:5,textAlign:"center",cursor:"pointer"}}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(200,168,78,0.12)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(80,20,5,0.35)"}>
              <div style={{fontSize:16}}>{ITEMS[si.i].i}</div>
              <div style={{fontSize:7,color:"#c8a84e",fontWeight:600}}>{ITEMS[si.i].n}</div>
              <div style={{fontSize:8,color:"#da0"}}>{si.cost}gp</div>
            </div>)}
          </div>}
          {sellOpen&&<div><div style={{fontSize:9,color:"#888",marginBottom:6}}>Click items to sell. Selling at 40% of buy price (min 5gp).</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:3}}>
              {p.inv.filter(s=>SELL_PRICES[s.i]).map((s,i)=><div key={i} onClick={()=>sellItem(s.i)} style={{background:"rgba(80,20,5,0.35)",border:"1px solid rgba(200,168,78,0.1)",borderRadius:4,padding:5,textAlign:"center",cursor:"pointer"}}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(200,168,78,0.12)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(80,20,5,0.35)"}>
                <div style={{fontSize:16}}>{ITEMS[s.i].i}</div>
                <div style={{fontSize:7,color:"#c8a84e",fontWeight:600}}>{ITEMS[s.i].n}</div>
                <div style={{fontSize:8,color:"#0c0"}}>{SELL_PRICES[s.i]}gp</div>
              </div>)}
            </div>
          </div>}
          <div style={{color:"#888",fontSize:9,marginTop:6}}>Coins: {p.inv.find(x=>x.i==="coins")?.c||0}gp</div>
        </div>
      </div>}
      {/* Smithing */}
      {smithOpen&&p&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setSmithOpen(false)}>
        <div style={{background:"linear-gradient(180deg,#1e0a06,#180804)",border:"2px solid #7a2010",borderRadius:8,padding:14,minWidth:320,maxWidth:480}} onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
            <span style={{color:"#c8a84e",fontWeight:700,fontSize:14}}>🔨 Smithing Anvil</span>
            <button onClick={()=>setSmithOpen(false)} style={{background:"#4a1010",border:"none",color:"#c8a84e",padding:"3px 10px",cursor:"pointer",borderRadius:4}}>✕</button>
          </div>
          {Object.entries(SMITH_RECIPES).map(([bar,recs])=>{
            const hasBar=p.inv.some(x=>x.i===bar);const barCount=p.inv.reduce((a,x)=>x.i===bar?a+x.c:a,0);
            return <div key={bar} style={{marginBottom:10}}>
              <div style={{color:hasBar?"#c8a84e":"#554",fontSize:10,fontWeight:700,marginBottom:4}}>{ITEMS[bar].n} {hasBar?"(x"+barCount+")":"(none)"}</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:3}}>
                {recs.map((rec,i)=><div key={i} onClick={()=>{if(hasBar)doSmith(bar,rec);else addC("You need a "+ITEMS[bar].n+".");fr(n=>n+1);}}
                  style={{background:hasBar?"rgba(80,20,5,0.5)":"rgba(40,10,5,0.25)",border:"1px solid rgba(200,168,78,"+(hasBar?"0.2":"0.06")+")",borderRadius:4,padding:"5px 2px",textAlign:"center",cursor:hasBar?"pointer":"default",opacity:hasBar?1:0.5}}
                  onMouseEnter={e=>{if(hasBar)e.currentTarget.style.background="rgba(200,168,78,0.15)";}} onMouseLeave={e=>{if(hasBar)e.currentTarget.style.background="rgba(80,20,5,0.5)";}}>
                  <div style={{fontSize:16}}>{ITEMS[rec.out].i}</div>
                  <div style={{fontSize:6,color:"#c8a84e",fontWeight:600,marginTop:1}}>{ITEMS[rec.out].n.replace("Bronze ","").replace("Iron ","").replace("Steel ","")}</div>
                  <div style={{fontSize:7,color:"#888"}}>{rec.xp} xp</div>
                </div>)}
              </div>
            </div>;})}
          <div style={{color:"#666",fontSize:9,marginTop:4}}>Click an item to smith it. Requires bar in inventory.</div>
        </div>
      </div>}
      {/* Crafting Modal */}
      {craftOpen&&p&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setCraftOpen(false)}>
        <div style={{background:"linear-gradient(180deg,#1e0a06,#180804)",border:"2px solid #7a2010",borderRadius:8,padding:14,minWidth:320,maxWidth:480}} onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
            <span style={{color:"#c8a84e",fontWeight:700,fontSize:14}}>🧵 Crafting Table</span>
            <button onClick={()=>setCraftOpen(false)} style={{background:"#4a1010",border:"none",color:"#c8a84e",padding:"3px 10px",cursor:"pointer",borderRadius:4}}>✕</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:4}}>
            {CRAFT_RECIPES.map((rec,i)=>{
              const cl=lvl(p.sk.Crafting||0);
              const canLevel=cl>=rec.lvl;
              const hasMats=Object.entries(rec.needs).every(([id,cnt])=>p.inv.find(x=>x.i===id&&x.c>=(cnt||1)));
              const hasTool=p.inv.some(x=>x.i===rec.tool);
              const canCraft=canLevel&&hasMats&&hasTool;
              return <div key={i} onClick={()=>{if(canCraft)doCraft(rec);else addC(!canLevel?"Need Crafting "+rec.lvl:!hasTool?"Need "+ITEMS[rec.tool].n:"Need materials.");fr(n=>n+1);}}
                style={{background:canCraft?"rgba(80,20,5,0.5)":"rgba(40,10,5,0.25)",border:"1px solid rgba(200,168,78,"+(canCraft?"0.2":"0.06")+")",borderRadius:4,padding:6,textAlign:"center",cursor:canCraft?"pointer":"default",opacity:canCraft?1:0.5}}
                title={Object.entries(rec.needs).map(([id,cnt])=>ITEMS[id].n+(cnt>1?" x"+cnt:"")).join(", ")+" + "+ITEMS[rec.tool].n}>
                <div style={{fontSize:18}}>{ITEMS[rec.out].i}</div>
                <div style={{fontSize:7,color:"#c8a84e",fontWeight:600}}>{ITEMS[rec.out].n}</div>
                <div style={{fontSize:7,color:"#888"}}>Lvl {rec.lvl} | {rec.xp}xp</div>
                <div style={{fontSize:6,color:"#666"}}>{ITEMS[rec.tool].i}{Object.entries(rec.needs).map(([id,cnt])=>" "+ITEMS[id].i+(cnt>1?"x"+cnt:"")).join("")}</div>
              </div>;})}
          </div>
        </div>
      </div>}
      {/* Fletching Modal */}
      {fletchOpen&&p&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setFletchOpen(false)}>
        <div style={{background:"linear-gradient(180deg,#1e0a06,#180804)",border:"2px solid #7a2010",borderRadius:8,padding:14,minWidth:320,maxWidth:480}} onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
            <span style={{color:"#c8a84e",fontWeight:700,fontSize:14}}>🔪 Fletching</span>
            <button onClick={()=>setFletchOpen(false)} style={{background:"#4a1010",border:"none",color:"#c8a84e",padding:"3px 10px",cursor:"pointer",borderRadius:4}}>✕</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:4}}>
            {FLETCH_RECIPES.map((rec,i)=>{
              const fl=lvl(p.sk.Fletching||0);const canLevel=fl>=rec.lvl;
              const hasTool=p.inv.some(x=>x.i===rec.tool);
              const hasMats=Object.entries(rec.needs).every(([id,cnt])=>p.inv.find(x=>x.i===id&&x.c>=(cnt||1)));
              const canFletch=canLevel&&hasTool&&hasMats;
              return <div key={i} onClick={()=>doFletch(rec)}
                style={{background:canFletch?"rgba(80,20,5,0.5)":"rgba(40,10,5,0.25)",border:"1px solid rgba(200,168,78,"+(canFletch?"0.2":"0.06")+")",borderRadius:4,padding:"6px 4px",textAlign:"center",cursor:canFletch?"pointer":"default",opacity:canFletch?1:0.5}}
                title={Object.entries(rec.needs).map(([id,cnt])=>ITEMS[id].n+(cnt>1?" x"+cnt:"")).join(", ")+" + "+ITEMS[rec.tool].n}
                onMouseEnter={e=>{if(canFletch)e.currentTarget.style.background="rgba(200,168,78,0.15)";}} onMouseLeave={e=>{if(canFletch)e.currentTarget.style.background="rgba(80,20,5,0.5)";}}>
                <div style={{fontSize:18}}>{ITEMS[rec.out].i}</div>
                <div style={{fontSize:7,color:"#c8a84e",fontWeight:600}}>{ITEMS[rec.out].n}{rec.outCount>1&&" x"+rec.outCount}</div>
                <div style={{fontSize:7,color:"#888"}}>Lvl {rec.lvl} | {rec.xp}xp</div>
                <div style={{fontSize:6,color:"#666"}}>{Object.entries(rec.needs).map(([id,cnt])=>ITEMS[id].i+(cnt>1?"x"+cnt:"")).join(" ")}</div>
              </div>;})}
          </div>
        </div>
      </div>}
      {/* Herblore Modal */}
      {herbOpen&&p&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setHerbOpen(false)}>
        <div style={{background:"linear-gradient(180deg,#1e0a06,#180804)",border:"2px solid #7a2010",borderRadius:8,padding:14,minWidth:300,maxWidth:420}} onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
            <span style={{color:"#c8a84e",fontWeight:700,fontSize:14}}>🌿 Herblore</span>
            <button onClick={()=>setHerbOpen(false)} style={{background:"#4a1010",border:"none",color:"#c8a84e",padding:"3px 10px",cursor:"pointer",borderRadius:4}}>✕</button>
          </div>
          <div style={{fontSize:9,color:"#888",marginBottom:8}}>Clean herb: {p.inv.reduce((a,x)=>x.i==="clean_herb"?a+(x.c||1):a,0)} | Vial of water: {p.inv.reduce((a,x)=>x.i==="vial"?a+(x.c||1):a,0)}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:4}}>
            {HERB_RECIPES.map((rec,i)=>{const hl=lvl(p.sk.Herblore||0);const canLevel=hl>=rec.lvl;const herbCount=p.inv.reduce((a,x)=>x.i==="clean_herb"?a+(x.c||1):a,0);const hasVial=p.inv.some(x=>x.i==="vial");const canBrew=canLevel&&herbCount>=(rec.needs.clean_herb||1)&&hasVial;
              return <div key={i} onClick={()=>doHerblore(rec)}
                style={{background:canBrew?"rgba(80,20,5,0.5)":"rgba(40,10,5,0.25)",border:"1px solid rgba(200,168,78,"+(canBrew?"0.2":"0.06")+")",borderRadius:4,padding:"8px 4px",textAlign:"center",cursor:canBrew?"pointer":"default",opacity:canBrew?1:0.5}}
                onMouseEnter={e=>{if(canBrew)e.currentTarget.style.background="rgba(200,168,78,0.15)";}} onMouseLeave={e=>{if(canBrew)e.currentTarget.style.background=canBrew?"rgba(80,20,5,0.5)":"rgba(40,10,5,0.25)";}}>
                <div style={{fontSize:18}}>{ITEMS[rec.out].i}</div>
                <div style={{fontSize:7,color:"#c8a84e",fontWeight:600}}>{ITEMS[rec.out].n}</div>
                <div style={{fontSize:7,color:"#888"}}>Lvl {rec.lvl} | {rec.xp}xp</div>
                <div style={{fontSize:6,color:"#666"}}>{rec.needs.clean_herb||1}🌿 + 🧪vial</div>
              </div>;})}
          </div>
        </div>
      </div>}
      {/* World Map Modal */}
      {mapOpen&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:200,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}} onClick={()=>setMapOpen(false)}>
        <div style={{border:"2px solid #7a2010",borderRadius:8,padding:4,background:"#0d0403"}} onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",justifyContent:"space-between",padding:"4px 8px",marginBottom:4}}>
            <span style={{color:"#c8a84e",fontWeight:700,fontSize:13}}>🗺️ World Map</span>
            <span style={{color:"#888",fontSize:9}}>Press M or ESC to close</span>
          </div>
          <WorldMapCanvas gR={gR} mapCvR={mapCvR}/>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,padding:"6px 8px",fontSize:8,color:"#888"}}>
            {[["●","#fff","You"],["●","#f44","Monster"],["●","#0ff","NPC"],["●","#da0","Point of interest"]].map(([sym,col,lbl])=>
              <span key={lbl}><span style={{color:col}}>{sym}</span> {lbl}</span>)}
          </div>
        </div>
      </div>}
      {/* Chat */}
      <div style={{height:88,background:"linear-gradient(180deg,#160804,#120604)",borderTop:"2px solid #5a1808",padding:"2px 8px",overflow:"auto",flexShrink:0}}>
        {chat.slice(-16).map((m,i)=><div key={i} style={{fontSize:11,color:i===chat.slice(-16).length-1?"#ddd":i>chat.slice(-16).length-4?"#999":"#666",lineHeight:1.35}}>{m}</div>)}
      </div>
    </div>
  );
}

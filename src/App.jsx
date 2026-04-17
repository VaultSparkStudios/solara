import React, { useState, useEffect, useRef, useCallback } from "react";
import { isSupabaseConfigured, loadSupabaseClient } from './supabase.js';
import { MENU_SECTIONS as MENU_SECTION_ITEMS } from "./game/content.js";
import {
  getDailyStreak,
  hasPlayedDailyToday,
  loadCustomLayouts as loadStoredCustomLayouts,
  loadEchoReactions,
  loadLocalEchoes,
  loadPreferences as loadStoredPreferences,
  markDailyPlayedToday,
  saveCustomLayouts,
  updateDailyStreak,
} from "./game/clientStore.js";
import { getGuideStepLabel, getObjectiveState, getWorldActionItems } from "./game/objectives.js";
import { getFirstSessionPlan } from "./game/firstSession.js";
import {
  fetchDailyLeaderboardRecords,
  fetchEchoFeed,
  fetchGraveRecords,
  fetchSunStateRecord,
  incrementDeathCounterRecord,
  offerSunstoneRecord,
  persistLocalEcho,
  reactToEchoRecord,
  submitDailyScoreRecord,
  submitGraveRecord,
  submitRemoteEcho,
} from "./game/sharedWorldService.js";
import { buildSavePayload, createSaveSanitizer } from "./game/save.js";
import { getRunDebrief, getSessionDelta, getSharedWorldBriefing } from "./game/feedback.js";
import { applyRunBlessing, getSharedWorldSnapshot } from "./game/sharedWorld.js";
import { createDeathMemoryCard, getLandmarkName } from "./game/innovationSystems.js";
import {
  sanitizeEchoPayload,
  sanitizeGravePayload,
} from "./game/trust.js";
import {
  applyMonsterWorldState,
  getCombatBonuses,
  getDynamicWorldEvent,
  getMerchantPriceScale,
  resetRunScopedBonuses,
} from "./game/worldRuntime.js";
import { buildWorldFeed } from "./game/worldFeed.js";
import SharedWorldStatus from "./components/SharedWorldStatus.jsx";
import RunDebriefCard from "./components/RunDebriefCard.jsx";
import SessionDeltaCard from "./components/SessionDeltaCard.jsx";
import WorldFeedCard from "./components/WorldFeedCard.jsx";

const MenuLorePanels = React.lazy(() => import("./components/MenuLorePanels.jsx"));

const TILE=32,MW=100,MH=100,BASE_VTX=17,BASE_VTY=14,CW=BASE_VTX*TILE,CH=BASE_VTY*TILE;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const getViewportMetrics=cv=>{
  const width=cv?.width||CW;
  const height=cv?.height||CH;
  const spanX=Math.max(BASE_VTX,width/TILE);
  const spanY=Math.max(BASE_VTY,height/TILE);
  return{
    width,
    height,
    spanX,
    spanY,
    tilesX:Math.ceil(spanX)+1,
    tilesY:Math.ceil(spanY)+1,
  };
};
const getCenteredCam=(x,y,cv)=>{
  const {spanX,spanY}=getViewportMetrics(cv);
  return{
    x:clamp(x-spanX/2,0,Math.max(0,MW-spanX)),
    y:clamp(y-spanY/2,0,Math.max(0,MH-spanY)),
  };
};
const followCamera=(camX,camY,px,py,cv)=>{
  const {spanX,spanY}=getViewportMetrics(cv);
  const deadZoneX=Math.max(2,Math.floor(spanX*0.2));
  const deadZoneY=Math.max(2,Math.floor(spanY*0.2));
  let nextX=camX;
  let nextY=camY;
  const localX=px-camX;
  const localY=py-camY;
  if(localX<deadZoneX)nextX=px-deadZoneX;
  else if(localX>spanX-deadZoneX-1)nextX=px-(spanX-deadZoneX-1);
  if(localY<deadZoneY)nextY=py-deadZoneY;
  else if(localY>spanY-deadZoneY-1)nextY=py-(spanY-deadZoneY-1);
  return{
    x:clamp(nextX,0,Math.max(0,MW-spanX)),
    y:clamp(nextY,0,Math.max(0,MH-spanY)),
  };
};
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

const SKILLS=["Attack","Strength","Defence","Hitpoints","Ranged","Prayer","Magic","Cooking","Woodcutting","Fishing","Mining","Smithing","Crafting","Firemaking","Agility","Thieving","Herblore","Slayer","Fletching","Farming","Runecrafting"];
const SKILL_COLORS={Attack:"#c03030",Strength:"#00a000",Defence:"#4466cc",Hitpoints:"#cc3030",Ranged:"#408030",Prayer:"#6080b0",Magic:"#3040c0",Cooking:"#8a4a10",Woodcutting:"#2a6a10",Fishing:"#2a5aaa",Mining:"#6a6050",Smithing:"#6a6a6a",Crafting:"#8a6a30",Firemaking:"#d06010",Agility:"#305080",Thieving:"#5a2080",Herblore:"#2a8a50",Slayer:"#8a2020",Fletching:"#a08020",Farming:"#4a8a20",Runecrafting:"#6040a0"};
const SAVE_VERSION=5;
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
  bones:{n:"Bones",i:"🦴",s:false,examine:"The remains of a creature."},big_bones:{n:"Big bones",i:"🦴",s:false,examine:"These bones are big. Very big."},dragon_bones:{n:"Dragon bones",i:"🦴",s:false,examine:"Extremely powerful prayer bones from a dragon."},
  coins:{n:"Coins",i:"🪙",s:true,examine:"Shiny gold coins. The currency of the realm."},feather:{n:"Feather",i:"🪶",s:true,examine:"A light feather, useful for fletching arrows."},
  bread:{n:"Bread",i:"🍞",s:false,heal:5},cake:{n:"Cake",i:"🎂",s:false,heal:12},beer:{n:"Beer",i:"🍺",s:false,heal:1},
  tinderbox:{n:"Tinderbox",i:"🔥",s:false},
  bronze_sword:{n:"Bronze sword",i:"⚔️",s:false,slot:"weapon",atk:4,str:3,examine:"A basic bronze sword. Better than nothing."},
  iron_sword:{n:"Iron sword",i:"⚔️",s:false,slot:"weapon",atk:10,str:7,examine:"A sturdy iron sword."},
  steel_sword:{n:"Steel sword",i:"⚔️",s:false,slot:"weapon",atk:16,str:12,examine:"A well-crafted steel sword."},
  mithril_sword:{n:"Mithril sword",i:"⚔️",s:false,slot:"weapon",atk:22,str:16,examine:"A fine mithril sword, light and sharp."},
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
  air_rune:{n:"Air rune",i:"💨",s:true,examine:"A rune imbued with the essence of air."},water_rune:{n:"Water rune",i:"💧",s:true,examine:"A rune imbued with the essence of water."},fire_rune:{n:"Fire rune",i:"🔥",s:true,examine:"A rune imbued with the essence of fire."},
  nature_rune:{n:"Nature rune",i:"🌿",s:true,examine:"A rune connected to natural forces."},death_rune:{n:"Death rune",i:"☠️",s:true,examine:"A rune that channels the power of death."},
  ring_wealth:{n:"Ring of wealth",i:"💍",s:false,slot:"ring"},amulet_str:{n:"Amulet of strength",i:"📿",s:false,slot:"ring",str:6},
  pot:{n:"Pot",i:"🏺",s:false},bucket:{n:"Bucket",i:"🪣",s:false},
  egg:{n:"Egg",i:"🥚",s:false},milk:{n:"Bucket of milk",i:"🥛",s:false},flour:{n:"Pot of flour",i:"🏺",s:false},
  herb:{n:"Grimy herb",i:"🌿",s:false},vial:{n:"Vial of water",i:"🧪",s:false},
  grimy_tarromin:{n:"Grimy tarromin",i:"🌿",s:false,examine:"A herb that reeks of something unpleasant."},
  tarromin:{n:"Tarromin",i:"🌱",s:false,examine:"A clean tarromin herb, ready for use."},
  grimy_harralander:{n:"Grimy harralander",i:"🌿",s:false,examine:"A grimy herb with a pungent smell."},
  harralander:{n:"Harralander",i:"🌿",s:false,examine:"A clean harralander herb."},
  grimy_kwuarm:{n:"Grimy kwuarm",i:"🌿",s:false,examine:"A foul-smelling grimy herb."},
  kwuarm:{n:"Kwuarm",i:"🌿",s:false,examine:"A potent clean herb used in prayer potions."},
  ranging_potion:{n:"Ranging potion",i:"🧪",s:false,heal:0,buff:{skill:"Ranged",amt:4,dur:240000}},
  jad_pet:{n:"Cinderwake emberling",i:"🔥",s:false,pet:true,bonus:{skill:"Hitpoints",pct:0.05},examine:"A miniature emberling shed from the Cinderwake Colossus. It still looks terrifying."},
  moss_pet:{n:"Moss pet",i:"🌿",s:false,pet:true,bonus:{skill:"Woodcutting",pct:0.05},examine:"A tiny moss creature that follows you loyally."},
  demon_pet:{n:"Demon pet",i:"👹",s:false,pet:true,bonus:{skill:"Attack",pct:0.05},examine:"A tiny demon bound to serve you. Mostly."},
  spider_pet:{n:"Spider pet",i:"🕷️",s:false,pet:true,bonus:{skill:"Agility",pct:0.05},examine:"Eight legs, one loyal companion."},
  arena_trophy:{n:"Arena Trophy",i:"🏆",s:false,examine:"Awarded to champions of the Barbarian Arena."},
  elemental_shard:{n:"Elemental shard",i:"💎",s:true,examine:"A fragment of concentrated elemental energy."},
  shadow_cape:{n:"Shadow Drake Cape",i:"🦇",s:false,slot:"cape",def:12,str:4,examine:"A cape made from shadow drake scales."},
  herb_seed:{n:"Herb seed",i:"🌱",s:false,seed:true,grow:600000,yields:"grimy_tarromin",xp:50,lvl:1,examine:"A seed for growing tarromin herbs."},
  food_seed:{n:"Food seed",i:"🌱",s:false,seed:true,grow:900000,yields:"potato",xp:80,lvl:15,examine:"A seed for growing potatoes."},
  kwuarm_seed:{n:"Kwuarm seed",i:"🌱",s:false,seed:true,grow:1200000,yields:"grimy_kwuarm",xp:120,lvl:30,examine:"A seed for growing kwuarm herbs."},
  potato:{n:"Potato",i:"🥔",s:false,heal:6,examine:"A hearty potato. Good with everything."},
  festival_mask:{n:"Festival Mask",i:"🎭",s:false,slot:"head",def:5,examine:"A colourful mask worn during the Desert Festival."},
  blood_rune:{n:"Blood rune",i:"🔴",s:true,examine:"A rune imbued with the power of blood."},
  ice_shard:{n:"Ice shard",i:"🧊",s:true,examine:"A fragment of magical ice."},
  sand_golem_mask:{n:"Sand Golem Mask",i:"💀",s:false,slot:"head",def:8,examine:"A mask shaped after the fearsome sand golems."},
  lore_1:{n:"Torn Parchment I",i:"📜",s:false,lore:"lore_1",examine:"A weathered piece of parchment with faded writing."},
  lore_2:{n:"Torn Parchment II",i:"📜",s:false,lore:"lore_2",examine:"An old scroll fragment from the Order of the Bone Moon."},
  lore_3:{n:"Torn Parchment III",i:"📜",s:false,lore:"lore_3",examine:"Ancient records about the Cinderwake Colossus."},
  lore_4:{n:"Torn Parchment IV",i:"📜",s:false,lore:"lore_4",examine:"A fragment of the Rune Accord."},
  lore_5:{n:"Torn Parchment V",i:"📜",s:false,lore:"lore_5",examine:"A record about the first people of this land."},
  lore_6:{n:"Torn Parchment VI",i:"📜",s:false,lore:"lore_6",examine:"Notes about the frozen kingdom."},
  lore_7:{n:"Torn Parchment VII",i:"📜",s:false,lore:"lore_7",examine:"A shredded contract fragment."},
  lore_8:{n:"Torn Parchment VIII",i:"📜",s:false,lore:"lore_8",examine:"A note about The White Fort forests."},
  leather:{n:"Leather",i:"🟫",s:false},cowhide:{n:"Cowhide",i:"🟫",s:false},
  shortbow:{n:"Shortbow",i:"🏹",s:false,slot:"weapon",rng:7,aspd:3000},
  longbow:{n:"Longbow",i:"🏹",s:false,slot:"weapon",rng:9,aspd:3600},
  bronze_arrow:{n:"Bronze arrow",i:"🏹",s:true},iron_arrow:{n:"Iron arrow",i:"🏹",s:true},
  steel_arrow:{n:"Steel arrow",i:"🏹",s:true},rune_arrow:{n:"Rune arrow",i:"🏹",s:true},
  air_staff:{n:"Air staff",i:"🪄",s:false,slot:"weapon",mgc:true,mmax:4,aspd:3000},
  fire_staff:{n:"Fire staff",i:"🪄",s:false,slot:"weapon",mgc:true,mmax:8,aspd:3000},
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
  adamant_sword:{n:"Adamant sword",i:"⚔️",s:false,slot:"weapon",atk:30,str:22,examine:"A powerful adamant sword favoured by elite warriors."},
  adamant_helm:{n:"Adamant full helm",i:"⛑️",s:false,slot:"head",def:28},
  adamant_plate:{n:"Adamant platebody",i:"🦺",s:false,slot:"body",def:45},
  adamant_legs:{n:"Adamant platelegs",i:"👖",s:false,slot:"legs",def:33},
  adamant_shield:{n:"Adamant sq shield",i:"🛡️",s:false,slot:"shield",def:30},
  rune_ore:{n:"Rune ore",i:"🪨",s:false},
  rune_bar:{n:"Rune bar",i:"⬜",s:false},
  rune_sword:{n:"Rune sword",i:"⚔️",s:false,slot:"weapon",atk:38,str:30},
  rune_helm:{n:"Rune full helm",i:"⛑️",s:false,slot:"head",def:35},
  rune_plate:{n:"Rune platebody",i:"🦺",s:false,slot:"body",def:58},
  rune_legs:{n:"Rune platelegs",i:"👖",s:false,slot:"legs",def:42},
  rune_shield:{n:"Rune sq shield",i:"🛡️",s:false,slot:"shield",def:38},
  sunstone_shard:{n:"Sunstone Shard",i:"🌟",s:false,examine:"A warm fragment of Solaran crystal. Legends say the sun shed these shards in its last great burning. It hums faintly in your hand."},
};

function genMap(){
  const m=Array.from({length:MH},()=>Array(MW).fill(T.G));
  // River
  for(let y=0;y<MH;y++){const rx=50+Math.floor(Math.sin(y*0.1)*5+Math.cos(y*0.05)*3);for(let d=-2;d<=2;d++)if(rx+d>=0&&rx+d<MW)m[y][rx+d]=T.W;}
  // Bridges
  [[25,0],[50,0],[70,0]].forEach(([y])=>{const rx=50+Math.floor(Math.sin(y*0.1)*5+Math.cos(y*0.05)*3);for(let d=-2;d<=2;d++){m[y][rx+d]=T.BR;if(m[y+1])m[y+1][rx+d]=T.BR;}});
  // Solara's Rest
  for(let y=22;y<38;y++)for(let x=12;x<32;x++)m[y][x]=T.D;
  // Paths network
  const drawPath=(x1,y1,x2,y2)=>{for(let x=Math.min(x1,x2);x<=Math.max(x1,x2);x++){m[y1][x]=T.PA;if(y1+1<MH)m[y1+1][x]=T.PA;}for(let y=Math.min(y1,y2);y<=Math.max(y1,y2);y++){m[y][x2]=T.PA;if(x2+1<MW)m[y][x2+1]=T.PA;}};
  drawPath(10,27,60,27);drawPath(20,10,20,80);drawPath(10,27,10,60);drawPath(20,15,40,15);drawPath(35,27,35,50);
  // The Sanctum
  for(let y=7;y<20;y++)for(let x=12;x<35;x++)m[y][x]=T.D;
  for(let y=8;y<19;y++)for(let x=14;x<33;x++)m[y][x]=T.S;
  // Bld helper
  const bld=(x,y,w,h)=>{for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++){if(dy===0||dy===h-1||dx===0||dx===w-1)m[y+dy][x+dx]=T.WA;else m[y+dy][x+dx]=T.WF;}m[y+h-1][x+Math.floor(w/2)]=T.WF;};
  // Solara's Rest buildings
  bld(13,23,6,5);bld(23,23,6,5);bld(13,30,5,4);bld(23,30,5,4);bld(18,23,4,4);
  // The Sanctum buildings
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
  // Willowmere Village (south of Solara's Rest)
  for(let y=55;y<65;y++)for(let x=26;x<40;x++)m[y][x]=T.D;
  bld(28,56,5,4);bld(34,56,5,4);bld(28,61,5,4);bld(34,62,5,4);
  [[37,57],[38,57]].forEach(([x,y])=>{m[y][x]=T.WF;});
  // Willowmere bank counter
  for(let y=38;y<55;y++){m[y][27]=T.PA;if(28<MW)m[y][28]=T.PA;}
  // Falador (SW of Barbarian Village)
  for(let y=35;y<50;y++)for(let x=22;x<38;x++)m[y][x]=T.S;
  for(let y=36;y<49;y++)for(let x=23;x<37;x++)m[y][x]=T.D;
  bld(24,37,5,4);bld(30,37,5,4);bld(24,43,5,4);bld(30,43,5,4);
  // Falador-Barbarian path
  for(let y=30;y<36;y++){m[y][32]=T.PA;if(33<MW)m[y][33]=T.PA;}
  // White Fort-Willowmere path
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
  // Willowmere willows
  [[25,56],[25,58],[24,60],[25,62],[24,64],[41,57],[41,60],[42,63]].forEach(([x,y])=>o.push({t:"tree",x,y,res:"willow_logs",sk:"Woodcutting",xp:67,tm:2200,hp:1,mhp:1,rsp:12000,id:nid(),sub:"willow",lvl:30}));
  // Willowmere bank
  [[37,57],[38,57]].forEach(([x,y])=>o.push({t:"bank",x,y,id:nid(),hp:1,mhp:1}));
  // Willowmere shop
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
  // Rune ore rocks (Wilderness, very deep — requires lvl 85)
  [[5,1],[8,2],[11,1]].forEach(([x,y])=>o.push({t:"rock",x,y,res:"rune_ore",sk:"Mining",xp:125,tm:6000,hp:1,mhp:1,rsp:35000,id:nid(),lvl:85}));
  // Karamja banana trees (spawn)
  [[51,85],[53,87],[55,88],[57,86]].forEach(([x,y])=>o.push({t:"spawn",x,y,id:nid(),hp:1,mhp:1,item:"banana",rsp:15000}));
  // Karamja bank + range
  o.push({t:"bank",x:51,y:85,id:nid(),hp:1,mhp:1});
  o.push({t:"range",x:58,y:85,id:nid(),hp:1,mhp:1});
  // Crafting table (Solara's Rest)
  o.push({t:"crafting_table",x:22,y:26,id:nid(),hp:1,mhp:1});
  // Farm patches (Task 22)
  [[18,30],[63,45],[32,62],[58,88]].forEach(([x,y])=>o.push({t:"farm_patch",x,y,id:nid(),hp:1,mhp:1,seed:null,readyAt:0,plantedAt:0}));
  // Dungeon entrance (Task 21)
  o.push({t:"dungeon_entrance",x:8,y:55,id:nid(),hp:1,mhp:1});
  // Arena entrance (Task 12)
  o.push({t:"arena",x:41,y:28,id:nid(),hp:1,mhp:1});
  return o;
}

function genNPCs(){
  return [
    {t:"npc",x:20,y:28,nm:"Alder",c:"#cc3",dlg:["Welcome to Solara's Rest!","Click trees, rocks, fish spots to gather.","Fight monsters for combat XP!","Head north to The Sanctum for shops & bank."],id:1,ambient:["Welcome, traveller!","Need directions?","Solara's Rest is safe!"]},
    {t:"npc",x:24,y:28,nm:"Mara",c:"#da4",dlg:["I need help making a cake!","Bring me an egg, bucket of milk, and flour.","The egg is in a building to the east,","flour in a building to the south."],id:2,quest:"cook",ambient:["Need ingredients!","Almost out of cake!","Who took my eggs?"]},
    {t:"npc",x:10,y:59,nm:"Stone-Reader",c:"#57a",dlg:["Welcome to the mine, adventurer!","Mine copper and tin to smelt bronze.","The furnace is in Solara's Rest.","I could use some mithril ore..."],id:3,quest:"miner"},
    {t:"npc",x:58,y:21,nm:"The Tide-Watcher",c:"#4a8",dlg:["Click on fishing spots to fish!","Different spots give different fish."],id:4},
    {t:"npc",x:18,y:11,nm:"The Archivist",c:"#888",dlg:["Welcome to the Bank of The Sanctum.","Click a bank booth to open your bank."],id:5,bank:true,ambient:["Safe storage here.","Invest wisely!","Coins earn no interest."]},
    {t:"npc",x:24,y:11,nm:"Sun Merchant",c:"#a84",dlg:["Welcome to my shop!"],id:6,shop:true,ambient:["Fine wares here!","Best prices in The Sanctum.","Come browse!"]},
    {t:"npc",x:40,y:25,nm:"Outlander Elder",c:"#a64",dlg:["We are the Outlanders!","Strong warriors live here.","Prove yourself in combat!"],id:7,ambient:["VICTORY!","Prove your strength!","Honor in battle!"]},
    {t:"npc",x:62,y:42,nm:"Farris",c:"#da8",dlg:["Welcome to The Amber District!","The desert is dangerous...","Prove yourself: slay 3 Scorpions.","Return to me when done."],id:8,quest:"desert",ambient:["Hot today...","Scorpions are fierce.","The desert has secrets."]},
    {t:"npc",x:34,y:74,nm:"The Course-Keeper",c:"#58a",dlg:["Welcome to the Agility course!","Click obstacles to train Agility.","Higher levels = faster movement!"],id:9},
    {t:"npc",x:17,y:15,nm:"Guard",c:"#666",dlg:["Move along."],id:10,guard:true},
    {t:"npc",x:40,y:26,nm:"Barbarian Chief",c:"#c64",dlg:["Prove your might, warrior!","Kill 5 goblins and I shall reward you.","They infest the village to the east."],id:11,quest:"goblin",ambient:["VICTORY!","Prove your strength!","Honor in battle!"]},
    {t:"npc",x:20,y:14,nm:"Sedridor",c:"#3050c0",dlg:["I study the mysteries of the runes.","Bring me 10 air runes for my research.","You can find them on Dark Wizards."],id:12,quest:"rune",ambient:["Fascinating runes...","Magic is everywhere.","The arcane calls."]},
    {t:"npc",x:36,y:59,nm:"Morgan",c:"#c8a",dlg:["Welcome to Ashfen!","There are willow trees nearby for Woodcutting.","The bank is just to the north."],id:13},
    {t:"npc",x:36,y:60,nm:"Ashfen Archivist",c:"#888",dlg:["Welcome to Ashfen's Archives."],id:14,bank:true},
    {t:"npc",x:29,y:39,nm:"Sir Amik",c:"#ddd",dlg:["Welcome to The White Fort!","The Mining Guild to the south has rich ores.","The bank is nearby for your convenience.","Lesser Demons threaten our lands..."],id:15,quest:"knight"},
    {t:"npc",x:54,y:83,nm:"Luthas",c:"#5a8",dlg:["Welcome to The Southern Isle!","Pick bananas from the trees and sell them.","The fishing docks have great lobsters!","The Jogres in the south are causing trouble..."],id:16,quest:"karamja"},
    {t:"npc",x:56,y:83,nm:"Isle Archivist",c:"#888",dlg:["Welcome to the Isle Archives."],id:17,bank:true},
    {t:"npc",x:4,y:48,nm:"Old Hermit",c:"#8a7a5a",dlg:["The forest is haunted...","Necromancers lurk among the dark trees.","Please, drive them away!"],id:18,quest:"haunted",ambient:["The forest weeps...","Darkness grows...","Beware the shadows."]},
    {t:"npc",x:22,y:12,nm:"Archaeologist",c:"#a89060",dlg:["I've been searching for a lost relic.","It was broken into 3 parts, scattered across the land.","Check stalls and chests — they may be hidden there."],id:19,quest:"relic",ambient:["Fascinating history here.","Ancient secrets abound.","The past speaks to me."]},
    {t:"npc",x:17,y:14,nm:"Seer",c:"#9060c0",dlg:["I have foreseen a great darkness...","Only one who has faced the Cinderwake Colossus three times can stop it.","Are you that warrior?"],id:20,quest:"awakening",ambient:["The future is unclear...","I see great power in you.","Destiny calls..."]},
    {t:"npc",x:21,y:11,nm:"Mazchna",c:"#8a2020",dlg:["I am the Slayer Master.","I assign tasks to prove your worth.","Right-click me for a slayer assignment!"],id:21,slayer:true,ambient:["Slay with purpose.","The hunt never ends.","Prove your worth!"]},
    {t:"npc",x:35,y:60,nm:"Dock Master",c:"#5a8a60",dlg:["The supply ship is overdue!","Bring me 10 lobsters and 5 swordfish","and I'll reward you handsomely."],id:22,quest:"shipment",ambient:["The sea looks rough...","Any fresh catches today?","Supplies are running low."]},
    {t:"npc",x:31,y:38,nm:"Forgemaster",c:"#a86040",dlg:["The White Fort garrison needs new armour.","Craft me a mithril platebody","and I'll reward you well."],id:23,quest:"forge",ambient:["Hear that ring of steel?","Mithril is hard to work...","Finest smiths work here."]},
    {t:"npc",x:25,y:3,nm:"Ashlands Scout",c:"#c04030",dlg:["The Ashlands are full of riches...","And dangers. Prove your courage:","slay 5 Ice Warriors and return."],id:24,quest:"wildernessHunt",ambient:["Don't stray too far north...","Ice Warriors patrol this area.","Stay vigilant out there."]},
    {t:"npc",x:26,y:13,nm:"The Oracle",c:"#c0a0e0",dlg:["The sun weakens. I can feel it.","Every death dims its light a little more.","I will speak plainly when the time comes.","For now — keep your Sunstone Shard close."],id:26,ambient:["The sun... it flickers.","I have seen the Ashlands dark. I pray I do not see it again.","When the sun dies, so does memory."]},
    {t:"npc",x:65,y:43,nm:"Desert Merchant",c:"#a0c060",dlg:["Fine wares from across the desert!","My stock changes with each visit.","I move between towns regularly."],id:25,shop:true,caravan:true,ambient:["Rare goods here!","Just arrived!","Moving on soon..."]},
  ];
}

function genMons(){
  return [
    ...[[30,16],[32,18],[28,18],[31,14]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Chicken",c:"#ddb",hp:8,mhp:8,atk:1,def:1,str:1,xp:3,weak:"melee",examine:"A clucking bird. Not much of a fighter.",drops:[{i:"bones",c:1},{i:"feather",c:1,a:[1,5]},{i:"raw_shrimp",c:0.2},{i:"food_seed",c:0.05}],rsp:6000,id:Math.random(),at:0,dead:false,agro:false,lvl:1})),
    ...[[38,32],[40,34],[42,30],[39,36],[41,38],[43,33]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Cow",c:"#8a6a40",hp:20,mhp:20,atk:1,def:1,str:1,xp:8,weak:"melee",examine:"A large bovine. Produces milk and cowhide.",drops:[{i:"bones",c:1},{i:"cowhide",c:1},{i:"coins",c:0.3,a:[1,5]},{i:"food_seed",c:0.05}],rsp:10000,id:Math.random(),at:0,dead:false,agro:false,lvl:2})),
    ...[[43,26],[45,28],[47,24],[44,30]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Goblin",c:"#5a8a30",hp:13,mhp:13,atk:2,def:2,str:2,xp:5,weak:"melee",examine:"A small, green-skinned creature that loves to cause mischief.",drops:[{i:"bones",c:1},{i:"coins",c:0.8,a:[3,25]},{i:"bronze_helm",c:0.04},{i:"beer",c:0.1},{i:"grimy_tarromin",c:0.08},{i:"herb_seed",c:0.03}],rsp:8000,id:Math.random(),at:0,dead:false,agro:false,lvl:2})),
    ...[[5,48],[7,51],[4,54],[8,56],[6,59]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Giant Spider",c:"#444",hp:40,mhp:40,atk:5,def:3,str:4,xp:16,weak:"magic",examine:"Eight legs, eight reasons to run.",drops:[{i:"bones",c:1},{i:"coins",c:0.6,a:[5,40]},{i:"iron_sword",c:0.03},{i:"nature_rune",c:0.1,a:[1,3]},{i:"sapphire",c:0.05},{i:"spider_pet",c:0.008}],rsp:12000,id:Math.random(),at:0,dead:false,agro:true,lvl:4})),
    ...[[3,50],[9,53],[6,61]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Hill Giant",c:"#7a5a3a",hp:88,mhp:88,atk:8,def:6,str:7,xp:35,weak:"ranged",examine:"Giants were the first people of this land. They do not forgive what was taken from them.",drops:[{i:"big_bones",c:1},{i:"coins",c:0.9,a:[10,80]},{i:"iron_shield",c:0.04},{i:"iron_plate",c:0.02},{i:"death_rune",c:0.05,a:[1,2]},{i:"emerald",c:0.03},{i:"lore_5",c:0.02},{i:"moss_pet",c:0.005}],rsp:18000,id:Math.random(),at:0,dead:false,agro:true,lvl:7})),
    ...[[65,42],[67,44],[70,40],[72,43]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Scorpion",c:"#8a4020",hp:30,mhp:30,atk:4,def:3,str:3,xp:12,weak:"ranged",examine:"A deadly arachnid from the desert sands.",drops:[{i:"coins",c:0.5,a:[1,20]}],rsp:10000,id:Math.random(),at:0,dead:false,agro:true,lvl:3})),
    ...[[68,48],[70,50],[72,46]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Desert Wolf",c:"#b09050",hp:50,mhp:50,atk:6,def:4,str:5,xp:22,weak:"melee",examine:"A lean predator adapted to the harsh desert.",drops:[{i:"bones",c:1},{i:"coins",c:0.7,a:[8,50]},{i:"herb",c:0.08}],rsp:14000,id:Math.random(),at:0,dead:false,agro:true,lvl:5})),
    ...[[20,3],[25,2],[30,4]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Skeleton",c:"#c8c0b0",hp:63,mhp:63,atk:7,def:5,str:6,xp:28,weak:"melee",examine:"Here lies a warrior of the Dune Wars, cursed to wander until the desert reclaims all.",drops:[{i:"bones",c:1},{i:"coins",c:0.8,a:[10,60]},{i:"iron_helm",c:0.05},{i:"fire_rune",c:0.2,a:[2,8]},{i:"elemental_shard",c:0.15,a:[1,3]},{i:"lore_1",c:0.02}],rsp:15000,id:Math.random(),at:0,dead:false,agro:true,lvl:6})),
    ...[[35,2],[38,3]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Dark Wizard",c:"#3030a0",hp:45,mhp:45,atk:9,def:3,str:8,xp:25,weak:"ranged",examine:"Fragments of the Rune Accord. Page 7: The air runes were never meant to be free.",drops:[{i:"coins",c:0.7,a:[15,70]},{i:"nature_rune",c:0.15,a:[2,5]},{i:"air_rune",c:0.4,a:[5,15]},{i:"death_rune",c:0.08,a:[1,3]},{i:"elemental_shard",c:0.15,a:[1,3]},{i:"lore_4",c:0.02}],rsp:16000,id:Math.random(),at:0,dead:false,agro:true,lvl:7,atkType:"magic"})),
    ...[[27,57],[29,60],[31,57],[33,62]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Zombie",c:"#607850",hp:55,mhp:55,atk:6,def:4,str:5,xp:22,weak:"melee",examine:"Once a soldier, now a shambling horror.",drops:[{i:"bones",c:1},{i:"coins",c:0.6,a:[5,30]},{i:"iron_sword",c:0.05},{i:"nature_rune",c:0.1,a:[1,3]},{i:"grimy_tarromin",c:0.08}],rsp:12000,id:Math.random(),at:0,dead:false,agro:true,lvl:5})),
    ...[[25,40],[27,42],[30,44],[33,40],[35,45]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"White Knight",c:"#d8d8d0",hp:100,mhp:100,atk:10,def:8,str:9,xp:40,weak:"magic",examine:"A proud guardian of The White Fort's walls.",drops:[{i:"bones",c:1},{i:"coins",c:0.9,a:[20,100]},{i:"iron_sword",c:0.08},{i:"steel_shield",c:0.02},{i:"bronze_arrow",c:0.3,a:[5,20]}],rsp:18000,id:Math.random(),at:0,dead:false,agro:false,lvl:9})),
    ...[[53,86],[56,88],[59,86],[62,88],[60,84]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Jogre",c:"#5a7a3a",hp:138,mhp:138,atk:12,def:7,str:11,xp:58,weak:"ranged",examine:"A brutish jungle creature with enormous fists.",drops:[{i:"jogre_bone",c:1},{i:"coins",c:0.8,a:[10,60]},{i:"herb",c:0.15},{i:"steel_arrow",c:0.25,a:[5,15]}],rsp:20000,id:Math.random(),at:0,dead:false,agro:true,lvl:11})),
    ...[[64,90],[67,87],[65,93]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Cinderwake Colossus",c:"#c04010",hp:500,mhp:500,atk:20,def:15,str:18,xp:150,weak:"ranged",examine:"Ancient records speak of a fire god sleeping beneath The Southern Isle. The Cinderwake Colossus is its dreaming eye.",drops:[{i:"coins",c:1,a:[100,300]},{i:"rune_arrow",c:0.5,a:[10,30]},{i:"fire_staff",c:0.02},{i:"ruby",c:0.15},{i:"jad_pet",c:0.003},{i:"lore_3",c:0.05}],rsp:60000,id:Math.random(),at:0,dead:false,agro:true,lvl:20,phase:0,phaseTimer:0,phaseDur:8000,atkType:"magic"})),
    ...[[40,32],[42,34],[44,32],[46,34]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Hobgoblin",c:"#6a4a20",hp:75,mhp:75,atk:8,def:5,str:7,xp:28,weak:"ranged",examine:"A larger, meaner cousin of the goblin.",drops:[{i:"bones",c:1},{i:"coins",c:0.8,a:[8,40]},{i:"iron_helm",c:0.04},{i:"bronze_arrow",c:0.3,a:[5,15]},{i:"grimy_harralander",c:0.06}],rsp:10000,id:Math.random(),at:0,dead:false,agro:true,lvl:10})),
    ...[[4,46],[8,48],[5,52],[10,50]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Flesh Crawler",c:"#8a6040",hp:70,mhp:70,atk:9,def:4,str:8,xp:25,weak:"magic",examine:"A grotesque creature that lurks in dark places.",drops:[{i:"coins",c:0.6,a:[5,25]},{i:"herb",c:0.12},{i:"nature_rune",c:0.08,a:[1,3]}],rsp:10000,id:Math.random(),at:0,dead:false,agro:true,lvl:10})),
    ...[[62,32],[64,28],[63,34]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Rock Crab",c:"#9a8060",hp:138,mhp:138,atk:7,def:12,str:6,xp:32,weak:"magic",examine:"Its hard shell is impervious to blades.",drops:[{i:"coins",c:0.5,a:[3,18]}],rsp:12000,id:Math.random(),at:0,dead:false,agro:false,lvl:13})),
    ...[[58,38],[60,40],[63,38]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Bandit",c:"#5a4030",hp:105,mhp:105,atk:10,def:6,str:9,xp:30,weak:"melee",examine:"A desperate criminal willing to kill for coin.",drops:[{i:"coins",c:0.9,a:[15,55]},{i:"iron_sword",c:0.06},{i:"bread",c:0.2},{i:"grimy_harralander",c:0.06}],rsp:11000,id:Math.random(),at:0,dead:false,agro:false,lvl:12})),
    ...[[26,52],[29,54],[32,52]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Moss Giant",c:"#4a7a2a",hp:250,mhp:250,atk:13,def:9,str:12,xp:55,weak:"ranged",examine:"The White Fort forest was clear-cut in the Year of Iron. The giants remember.",drops:[{i:"big_bones",c:1},{i:"coins",c:0.85,a:[20,100]},{i:"nature_rune",c:0.15,a:[2,6]},{i:"steel_shield",c:0.03},{i:"lore_8",c:0.02},{i:"moss_pet",c:0.005}],rsp:20000,id:Math.random(),at:0,dead:false,agro:true,lvl:16})),
    ...[[38,64],[41,66],[44,64]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Lesser Demon",c:"#c03a1a",hp:213,mhp:213,atk:14,def:8,str:13,xp:65,weak:"melee",examine:"Contract Fragment: ...in exchange for power, the summoner shall provide 1,000 souls...",drops:[{i:"coins",c:0.8,a:[20,120]},{i:"fire_rune",c:0.3,a:[5,20]},{i:"nature_rune",c:0.1,a:[2,5]},{i:"iron_plate",c:0.04},{i:"grimy_kwuarm",c:0.05},{i:"lore_7",c:0.02},{i:"demon_pet",c:0.005}],rsp:22000,id:Math.random(),at:0,dead:false,agro:true,lvl:15})),
    ...[[15,3],[25,4],[18,2]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Ice Warrior",c:"#80c0e0",hp:288,mhp:288,atk:16,def:14,str:14,xp:80,weak:"melee",examine:"The Ashlands were once a kingdom. The Ice Warriors are its last frozen soldiers.",drops:[{i:"bones",c:1},{i:"coins",c:0.8,a:[25,120]},{i:"steel_helm",c:0.04},{i:"water_rune",c:0.4,a:[5,20]},{i:"elemental_shard",c:0.15,a:[1,3]},{i:"lore_6",c:0.02}],rsp:22000,id:Math.random(),at:0,dead:false,agro:true,lvl:18})),
    ...[[3,55],[11,57],[7,63]].map(([x,y])=>({x,y,ox:x,oy:y,t:"mon",nm:"Necromancer",c:"#6030a0",hp:150,mhp:150,atk:15,def:5,str:12,xp:60,weak:"melee",examine:"The Order of the Bone Moon once ruled these sands. Their rituals corrupted the oases.",drops:[{i:"death_rune",c:0.4,a:[3,10]},{i:"nature_rune",c:0.2,a:[2,6]},{i:"coins",c:0.7,a:[15,70]},{i:"air_rune",c:0.5,a:[5,15]},{i:"grimy_kwuarm",c:0.05},{i:"elemental_shard",c:0.15,a:[1,3]},{i:"lore_2",c:0.02}],rsp:18000,id:Math.random(),at:0,dead:false,agro:true,lvl:14,atkType:"magic"})),
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
  rune_bar:[{out:"rune_sword",xp:150},{out:"rune_helm",xp:150},{out:"rune_plate",xp:150},{out:"rune_legs",xp:150},{out:"rune_shield",xp:150}],
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
  {needs:{tarromin:1,vial:1},out:"attack_potion",xp:25,lvl:3},
  {needs:{harralander:1,vial:1},out:"strength_potion",xp:40,lvl:12},
  {needs:{harralander:1,vial:1},out:"ranging_potion",xp:48,lvl:22},
  {needs:{kwuarm:1,vial:1},out:"prayer_potion",xp:38,lvl:38},
  // legacy backward compat
  {needs:{clean_herb:1,vial:1},out:"attack_potion",xp:25,lvl:3},
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
  {monster:"Cinderwake Colossus",count:2,xp:2000},
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
  {id:"jad_killer",name:"Cinderwake Slayer",desc:"Kill the Cinderwake Colossus",icon:"🌋"},
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

const MAP_LOCS=[["Solara's Rest",20,28],["The Sanctum",22,12],["Amber District",65,43],["Outlander Camp",41,25],["Mine",14,60],["Fishing",60,25],["Ashfen",32,59],["The White Fort",29,42],["Mining Guild",26,51],["Southern Isle",57,87],["Agility",37,74],["Dark Forest",7,54]];

const DAILY_CHALLENGES=[
  {type:"cook",item:"lobster",count:10,skill:"Cooking",xp:500,reward:200},
  {type:"cook",item:"swordfish",count:5,skill:"Cooking",xp:400,reward:300},
  {type:"kill",monster:"Goblin",count:15,skill:"Attack",xp:300,reward:150},
  {type:"kill",monster:"Lesser Demon",count:3,skill:"Strength",xp:1000,reward:500},
  {type:"mine",resource:"mithril",count:10,skill:"Mining",xp:800,reward:400},
  {type:"mine",resource:"coal",count:20,skill:"Mining",xp:500,reward:200},
  {type:"fish",resource:"raw_lobster",count:15,skill:"Fishing",xp:700,reward:350},
  {type:"chop",resource:"yew_logs",count:10,skill:"Woodcutting",xp:600,reward:300},
  {type:"smith",item:"steel_sword",count:5,skill:"Smithing",xp:500,reward:250},
];

const UNLOCKS=[
  {id:"auto_bury",name:"Soul Harvest",desc:"Bones auto-bury on kill",cost:2,icon:"🦴"},
  {id:"fast_run",name:"Desert Wind",desc:"Run energy regens 25% faster",cost:2,icon:"💨"},
  {id:"burn_less",name:"Master Chef",desc:"Never burn food 20+ levels above requirement",cost:2,icon:"🍳"},
  {id:"bonus_wc",name:"Lumberjack",desc:"+5% Woodcutting XP",cost:1,icon:"🪵"},
  {id:"bonus_mine",name:"Deep Miner",desc:"+5% Mining XP",cost:1,icon:"⛏️"},
  {id:"bonus_fish",name:"Sea Legs",desc:"+5% Fishing XP",cost:1,icon:"🎣"},
  {id:"xtra_inv",name:"Pack Rat",desc:"Gain 4 extra inventory slots (32 total)",cost:3,icon:"🎒"},
  {id:"prayer_eff",name:"Devoted",desc:"Prayer drains 20% slower",cost:2,icon:"🙏"},
];

const FACTIONS={
  guard:{name:"Solara's Rest Guard",color:"#6688cc",rewards:[
    {rep:10,desc:"Guard shop discount 10%",id:"guard_discount"},
    {rep:25,desc:"Guard armor unlocked",id:"guard_armor"},
    {rep:50,desc:"Training dummy (AFK XP)",id:"guard_dummy"},
  ]},
  merchant:{name:"Amber District Merchants",color:"#d4a030",rewards:[
    {rep:10,desc:"Shop sells extra items",id:"merchant_rune"},
    {rep:25,desc:"Bank interest: 1% coins/hr",id:"bank_interest"},
    {rep:50,desc:"Desert shortcut unlocked",id:"merchant_travel"},
  ]},
  bandit:{name:"Ashlands Bandits",color:"#c04020",rewards:[
    {rep:10,desc:"Bandits become non-aggressive",id:"bandit_peace"},
    {rep:25,desc:"Ashlands drop rate +10%",id:"bandit_drops"},
    {rep:50,desc:"Special rune from Ashlands kills",id:"bandit_rune"},
  ]},
};

const DUNGEON_ROOMS=[
  {monsters:[{nm:"Giant Spider",count:3}],skillReq:{skill:"Agility",lvl:30},msg:"You squeeze through a narrow passage..."},
  {monsters:[{nm:"Flesh Crawler",count:4}],skillReq:{skill:"Thieving",lvl:40},msg:"You pick the lock on the door..."},
  {monsters:[{nm:"Hill Giant",count:2}],skillReq:{skill:"Strength",lvl:50},msg:"You force the heavy door open..."},
  {monsters:[{nm:"Necromancer",count:3}],skillReq:{skill:"Prayer",lvl:43},msg:"Sacred inscription... your prayer protects you..."},
  {monsters:[{nm:"Shadow Drake",count:1,hp:400,mhp:400,atk:18,def:12,str:16,xp:200,lvl:25,c:"#303050",drops:[{i:"shadow_cape",c:0.25},{i:"coins",c:1,a:[200,500]}],rsp:90000,agro:true,atkType:"melee"}],msg:"Final room — a Shadow Drake lurks!"},
];

// === PHASE 4: ROGUELITE ENGINE ===
const ROGUE_ROOMS=[
  {tier:1,monsters:[{nm:"Goblin",count:4}],msg:"A pack of goblins blocks your path."},
  {tier:1,monsters:[{nm:"Chicken",count:8}],msg:"An angry flock descends on you!"},
  {tier:1,monsters:[{nm:"Scorpion",count:3}],msg:"Scorpions scuttle from the shadows."},
  {tier:1,monsters:[{nm:"Cow",count:4}],msg:"Enraged cattle stampede through the room."},
  {tier:2,monsters:[{nm:"Giant Spider",count:3}],msg:"Webs cover the ceiling..."},
  {tier:2,monsters:[{nm:"Zombie",count:4}],msg:"The dead rise again."},
  {tier:2,monsters:[{nm:"Flesh Crawler",count:3}],msg:"Something writhes in the dark."},
  {tier:2,monsters:[{nm:"Hobgoblin",count:3}],msg:"Armed hobgoblins stand guard."},
  {tier:2,monsters:[{nm:"Desert Wolf",count:3}],msg:"Wolves circle in the gloom."},
  {tier:3,monsters:[{nm:"Hill Giant",count:2}],msg:"The ground shakes with heavy steps."},
  {tier:3,monsters:[{nm:"Necromancer",count:3}],msg:"Dark magic pulses through the room."},
  {tier:3,monsters:[{nm:"Moss Giant",count:2}],msg:"Ancient guardians stir."},
  {tier:3,monsters:[{nm:"Rock Crab",count:3}],msg:"The rocks are alive!"},
  {tier:4,monsters:[{nm:"White Knight",count:3}],msg:"Fallen knights corrupted by shadow."},
  {tier:4,monsters:[{nm:"Lesser Demon",count:2}],msg:"Hellfire fills the chamber."},
  {tier:4,monsters:[{nm:"Ice Warrior",count:2}],msg:"Frozen warriors emerge from the walls."},
  {tier:4,monsters:[{nm:"Necromancer",count:2},{nm:"Dark Wizard",count:2}],msg:"An unholy conclave of dark mages."},
];
const ROGUE_BOSS={monsters:[{nm:"Shadow Drake",count:1,hp:400,mhp:400,atk:18,def:12,str:16,xp:200,lvl:25,c:"#303050",drops:[{i:"shadow_cape",c:0.25},{i:"coins",c:1,a:[200,500]}],rsp:90000,agro:true,atkType:"melee"}],msg:"A Shadow Drake blocks the way forward!"};
const RELICS=[
  {id:"solar_fragment",n:"Solar Fragment",i:"☀️",bonus:{hp:5},desc:"+5 max HP per run"},
  {id:"ember_ring",n:"Ember Ring",i:"🔥",bonus:{str:2},desc:"+2 Strength in runs"},
  {id:"shade_cloak",n:"Shade Cloak",i:"🌑",bonus:{def:2},desc:"+2 Defence in runs"},
  {id:"comet_shard",n:"Comet Shard",i:"☄️",bonus:{atk:2},desc:"+2 Attack in runs"},
  {id:"oracle_eye",n:"Oracle's Eye",i:"👁️",bonus:{pray:3},desc:"+3 max Prayer in runs"},
];
const getRogueRoom=(wave,rng)=>{if(wave>0&&wave%10===0){return ROGUE_BOSS;}const tier=wave<10?1:wave<20?2:wave<30?3:4;const pool=ROGUE_ROOMS.filter(r=>r.tier<=tier);return pool[Math.floor(rng()*pool.length)];};
const scaleRogueMon=(stats,wave)=>{const s=1+wave*0.06;return{hp:Math.floor((stats.hp||50)*s),mhp:Math.floor((stats.mhp||50)*s),atk:Math.floor((stats.atk||5)*s),def:Math.floor((stats.def||3)*s),str:Math.floor((stats.str||5)*s),xp:Math.floor((stats.xp||10)*s)};};
const getRogueRelicReward=(wave)=>{if(wave<10)return null;return RELICS[Math.floor(wave/10-1)%RELICS.length];};

// === PHASE 1: SEASON CONFIG ===
const CURRENT_SEASON=Number(import.meta.env.VITE_SEASON_NUMBER)||1;
const CURRENT_SEASON_NAME=import.meta.env.VITE_SEASON_NAME||'The Wandering Comet';
const ONBOARDING_SLIDES=[
  {icon:"☀️",accent:"#f0c060",title:"The Sun Is Dying",body:"Every recorded death dims a shared sun. As it falls, merchants, monsters, rituals, and daily pressure change for everyone.",hint:"Watch the sun meter. It is the season's heartbeat."},
  {icon:"🔥",accent:"#d8a86a",title:"Your First Route",body:"Equip your sword, talk to Mara in Solara's Rest, gather her hearth ingredients, then spend the reward on today's Daily Rite.",hint:"The tracker will keep pointing at the next useful action."},
  {icon:"✝",accent:"#c68856",title:"Your Grave Stays Behind",body:"When you fall, your grave appears on the world map. Leave an epitaph, receive offerings, and help form named grave constellations.",hint:"Deaths become landmarks, warnings, and shrines."},
  {icon:"⚔️",accent:"#e06040",title:"Choose Your Side",body:"Sunkeepers preserve the light. Eclipsers welcome the dark. Your faction shapes leaderboards, echo rivals, and world pressure.",hint:"Faction identity drives the community meta."},
  {icon:"🌅",accent:"#d8a86a",title:"Your Chronicle Begins",body:"Run the Daily Rite, push the Roguelite gauntlet, react to echoes, and share your Prophecy Scroll. The world remembers.",hint:"Press Play. Your first death matters."},
];
const DEFAULT_UI_SCALE=1;
const defaultPanelOpen=()=>typeof window==="undefined"?true:window.innerWidth>=1180;
const loadPreferences=()=>loadStoredPreferences(defaultPanelOpen());
const SIDE_PANEL_TABS=[
  {id:"inv",icon:"🎒",label:"Inventory",desc:"Food, materials, tools, and loot you can use right now."},
  {id:"skills",icon:"⚔️",label:"Skills",desc:"Your progression, XP bars, and any prestige-ready skills."},
  {id:"equip",icon:"🛡️",label:"Gear",desc:"Equipped weapon, armour, and empty slots you can fill."},
  {id:"quest",icon:"📜",label:"Quests",desc:"Main quests, side quests, and your current goals."},
  {id:"pray",icon:"🙏",label:"Prayers",desc:"Combat prayers, drain rates, and protection options."},
  {id:"bestiary",icon:"📖",label:"Bestiary",desc:"Monster knowledge, weaknesses, and encounter notes."},
  {id:"daily",icon:"☀️",label:"Daily Rites",desc:"Shared daily dungeon, roguelite mode, and leaderboards."},
  {id:"settings",icon:"⚙️",label:"Settings",desc:"Customize interface, audio, presentation, and reference tools."},
];
const MENU_REFERENCE_ITEMS=[
  {id:"play",label:"Play",desc:"Reopen the main play hub and entry options."},
  {id:"how",label:"How To Play",desc:"Read the first-five-minutes onboarding flow again."},
  {id:"knowledge",label:"Knowledge Base",desc:"Review the world premise and async shared-sun systems."},
  {id:"features",label:"Features",desc:"See the current async multiplayer pillars at a glance."},
  {id:"updates",label:"Update Log",desc:"Review recent build changes and shipped improvements."},
  {id:"settings",label:"Front-Door Settings",desc:"Open the title-screen preferences page."},
];
const LAYOUT_PRESETS=[
  {
    id:"guided",
    label:"Guided",
    desc:"Keeps coaching surfaces visible for onboarding and active questing.",
    config:{showGuide:true,showObjectiveTracker:true,showGhostHud:true,tooltipsOn:true,compactHud:false,panelOpen:true,showMenuReference:true,resetObjective:true,resetGhost:true},
  },
  {
    id:"minimal",
    label:"Minimal",
    desc:"Clears most helper chrome so the map and combat dominate the screen.",
    config:{showGuide:false,showObjectiveTracker:false,showGhostHud:false,tooltipsOn:false,compactHud:true,panelOpen:false,showMenuReference:false,resetObjective:true,resetGhost:true},
  },
  {
    id:"explorer",
    label:"Explorer",
    desc:"Keeps references and map context while reducing heavier helper cards.",
    config:{showGuide:false,showObjectiveTracker:true,showGhostHud:false,tooltipsOn:true,compactHud:false,panelOpen:true,showMenuReference:true,resetObjective:false,resetGhost:true},
  },
];
const CUSTOM_LAYOUT_SLOTS=["slot1","slot2","slot3"];
const loadCustomLayouts=()=>loadStoredCustomLayouts(CUSTOM_LAYOUT_SLOTS);
const getDefaultCustomLayoutLabel=slot=>`Custom ${slot.replace("slot","")}`;
const LAYOUT_BASE_KEYS=["showGuide","showObjectiveTracker","showGhostHud","tooltipsOn","compactHud","panelOpen","showMenuReference"];
const layoutBaseMatch=(cfg,state)=>LAYOUT_BASE_KEYS.every(k=>cfg[k]===state[k]);
const layoutFullMatch=(cfg,state)=>layoutBaseMatch(cfg,state)&&JSON.stringify(cfg.objectivePosition||null)===JSON.stringify(state.objectivePosition||null)&&JSON.stringify(cfg.ghostPosition||null)===JSON.stringify(state.ghostPosition||null);

function makeTravelerSigil(){
  const parts=["ASH","SUN","RITE","ECHO","EMBER","VEIL","DUSK","AURIC"];
  const pick=()=>parts[Math.floor(Math.random()*parts.length)];
  const num=Math.floor(Math.random()*900+100);
  return `${pick()}-${pick()}-${num}`;
}

// === PHASE 1: SEEDED PRNG (mulberry32) ===
const mulberry32=(seed)=>{return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};};
const hashSeed=(str)=>{let h=0;for(let i=0;i<str.length;i++){const c=str.charCodeAt(i);h=((h<<5)-h)+c;h=h&h;}return Math.abs(h);};
const getDailySeed=()=>{const d=new Date();return`solara-${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;};
const getDayNumber=()=>{const start=new Date('2026-03-27');const now=new Date();return Math.max(1,Math.floor((now-start)/86400000)+1);};
const getDailyBossName=()=>{const h=hashSeed(getDailySeed()+'-boss');const pfx=["Vexar","Solveth","Kael","Morthis","Dravan","Zephon","Ashan","Corrath","Duvak","Elrith","Faeron","Grauth"];const sfx=["the Ash-Born","of the Dim Flame","the Sunless","the Twilight Herald","the Eclipse-Born","the Shadow","of the Final Dark","the Eternal","the Burning","the Doomed","the Forgotten","the Last Light"];return pfx[h%pfx.length]+" "+sfx[Math.floor(h/pfx.length)%sfx.length];};
const generateDailyRooms=()=>{const rng=mulberry32(hashSeed(getDailySeed()));return Array.from({length:30},(_,i)=>i===29?4:Math.floor(rng()*(DUNGEON_ROOMS.length-1)));};
const generateShareCard=(playerName,waveReached,faction)=>{const bars=Math.min(5,Math.floor(waveReached/6));const row=Array(5).fill('').map((_,i)=>i<bars?'🔥':'☀️').join('');const fStr=faction?faction.charAt(0).toUpperCase()+faction.slice(1):'No faction';return`☀️ Solara: Sunfall — Day ${getDayNumber()} ${row}\nWave ${waveReached}/30 · ${fStr} · Season ${CURRENT_SEASON}: ${CURRENT_SEASON_NAME}\n\nPlay free → vaultsparkstudios.github.io/solara/\n#SolaraSunfall`;};
const generateRogueShareCard=(playerName,waveReached,bestWave,relicCount,sunBrightness)=>{const bars=Math.max(1,Math.min(6,Math.floor(waveReached/5)));const row=Array(6).fill('').map((_,i)=>i<bars?'🌒':'⬛').join('');const phase=sunBrightness>80?'Full Dawn':sunBrightness>60?'Amber Warning':sunBrightness>40?'The Twilight':sunBrightness>20?'The Dimming':'The Eclipse';return`🌘 Solara: Sunfall — Roguelite Push\n${playerName||'Adventurer'} · Wave ${waveReached} · Best ${bestWave}\n${row} · Relics ${relicCount} · ${phase} ${Math.round(sunBrightness)}%\n\nEvery death dims the shared sun.\nPlay free → vaultsparkstudios.github.io/solara/\n#SolaraSunfall #Roguelite`;};
const generateProphecyScrollPNG=(opts)=>{
  if(typeof document==='undefined')return null;
  const{playerName,sigil,waveReached=0,faction='neutral',sunBrightness=100,type='daily',dayNumber=1,bestWave=0,relicCount=0}=opts;
  const W=400,H=580;
  const cv=document.createElement('canvas');cv.width=W;cv.height=H;
  const ctx=cv.getContext('2d');
  // Background
  const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#1e0a06');bg.addColorStop(0.5,'#0d0403');bg.addColorStop(1,'#160605');
  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  // Borders
  ctx.strokeStyle='#5a1808';ctx.lineWidth=2;ctx.strokeRect(10,10,W-20,H-20);
  ctx.strokeStyle='rgba(200,168,78,0.25)';ctx.lineWidth=1;ctx.strokeRect(14,14,W-28,H-28);
  // Corner accents
  ctx.strokeStyle='rgba(200,168,78,0.4)';ctx.lineWidth=1.5;
  [[14,14],[W-14,14],[14,H-14],[W-14,H-14]].forEach(([cx,cy])=>{const sx=cx===14?1:-1,sy=cy===14?1:-1;ctx.beginPath();ctx.moveTo(cx+sx*14,cy);ctx.lineTo(cx,cy);ctx.lineTo(cx,cy+sy*14);ctx.stroke();});
  // Title
  ctx.textAlign='center';
  ctx.fillStyle='#c8a84e';ctx.font='bold 13px "Courier New",monospace';ctx.fillText('SOLARA: SUNFALL',W/2,46);
  ctx.fillStyle='#7a5090';ctx.font='10px "Courier New",monospace';ctx.fillText(`Season ${CURRENT_SEASON}: ${CURRENT_SEASON_NAME}`,W/2,62);
  ctx.fillStyle='#5a3030';ctx.font='9px "Courier New",monospace';ctx.fillText(type==='roguelite'?'ROGUELITE PUSH':`DAY ${dayNumber}`,W/2,78);
  // Sun glow
  const sunX=W/2,sunY=155,sunR=48,bright=Math.max(0,Math.min(100,sunBrightness));
  const sunHex=bright>60?'#c8a84e':bright>30?'#c87828':'#7a3010';
  const grd=ctx.createRadialGradient(sunX,sunY,0,sunX,sunY,sunR);
  grd.addColorStop(0,sunHex+'99');grd.addColorStop(0.55,sunHex+'22');grd.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=grd;ctx.beginPath();ctx.arc(sunX,sunY,sunR,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle=sunHex;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(sunX,sunY,sunR*0.65,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle=sunHex+'55';ctx.lineWidth=1;
  for(let i=0;i<8;i++){const a=(i/8)*Math.PI*2,r1=sunR*0.78,r2=sunR*1.08;ctx.beginPath();ctx.moveTo(sunX+Math.cos(a)*r1,sunY+Math.sin(a)*r1);ctx.lineTo(sunX+Math.cos(a)*r2,sunY+Math.sin(a)*r2);ctx.stroke();}
  ctx.fillStyle=sunHex;ctx.font='bold 13px "Courier New",monospace';ctx.fillText(`${Math.round(bright)}%`,sunX,sunY+5);
  // Player name
  ctx.fillStyle='#b4a0dc';ctx.font='bold 17px "Courier New",monospace';ctx.fillText((sigil?sigil+' ':'')+(playerName||'Adventurer'),W/2,226);
  // Wave (large)
  ctx.fillStyle='#c8a84e';ctx.font='bold 40px "Courier New",monospace';ctx.fillText(`Wave ${waveReached}`,W/2,278);
  // Sub info
  if(type==='roguelite'){ctx.fillStyle='#7a5090';ctx.font='10px "Courier New",monospace';ctx.fillText(`Best: ${bestWave} · Relics: ${relicCount}`,W/2,300);}
  else{ctx.fillStyle='#7a5050';ctx.font='10px "Courier New",monospace';ctx.fillText('of 30 waves',W/2,300);}
  // Faction badge
  const fColor=faction==='sunkeeper'?'#f0c040':faction==='eclipser'?'#8060c0':'#666';
  const fLabel=faction==='sunkeeper'?'[ Sunkeeper ]':faction==='eclipser'?'[ Eclipser ]':'[ Neutral ]';
  ctx.fillStyle=fColor;ctx.font='11px "Courier New",monospace';ctx.fillText(fLabel,W/2,324);
  // Divider
  ctx.strokeStyle='rgba(200,168,78,0.18)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(70,342);ctx.lineTo(W-70,342);ctx.stroke();
  // Tagline
  ctx.fillStyle='#6a5848';ctx.font='italic 10px "Courier New",monospace';ctx.fillText(type==='roguelite'?'The darkness claimed another push.':'Another light joins the archive.',W/2,364);
  ctx.fillStyle='#5a4030';ctx.font='9px "Courier New",monospace';ctx.fillText('Every death dims the shared sun.',W/2,382);
  // Footer
  ctx.fillStyle='#5a3070';ctx.font='9px "Courier New",monospace';ctx.fillText('vaultsparkstudios.github.io/solara/',W/2,H-44);
  ctx.fillStyle='#3a2050';ctx.font='9px "Courier New",monospace';ctx.fillText('#SolaraSunfall',W/2,H-28);
  return cv.toDataURL('image/png');
};
const shareProphecyScroll=async(dataUrl,type='daily')=>{
  const fname=`solara-${type}-scroll.png`;
  if(typeof navigator!=='undefined'&&navigator.canShare){
    try{const res=await fetch(dataUrl);const blob=await res.blob();const file=new File([blob],fname,{type:'image/png'});if(navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'Solara: Sunfall'});return;}}catch(e){}
  }
  const link=document.createElement('a');link.download=fname;link.href=dataUrl;link.click();
};
const sanitizeSaveData=createSaveSanitizer({items:ITEMS,saveVersion:SAVE_VERSION});

// Innovation #12: Faction Recruitment Share Card
const generateFactionShareCard=(faction,sunBrightness)=>{const sun=Math.round(sunBrightness);const phase=sun>80?'Full Dawn':sun>60?'Amber Warning':sun>40?'The Twilight':sun>20?'The Dimming':'The Eclipse';const calls={sunkeeper:['Join the Sunkeepers. Every death counts. Every Rite helps.','The sun needs defenders. We fight so it burns.','I chose the light. The sun is at '+sun+'%. Will you help?'],eclipser:['I chose the Eclipse. Darkness is transformation.','The Eclipsers embrace the end. The sun dimming is destiny.','I walk in shadow. The sun burns at '+sun+'%. Come join the end.'],neutral:['I play Solara: Sunfall. '+sun+'% sun remains this season.','Solara: Sunfall — where every death dims a shared sun. Now at '+sun+'%.','The '+phase+'. '+sun+'% sun. Your death shapes the world.']};const lines=calls[faction]||calls.neutral;const msg=lines[getDayNumber()%lines.length];return`${faction==='sunkeeper'?'☀️':faction==='eclipser'?'🌑':'🌅'} ${msg}\n\nSeason ${CURRENT_SEASON}: ${CURRENT_SEASON_NAME} · ${phase}\n\nPlay → vaultsparkstudios.github.io/solara/\n#SolaraSunfall #${faction==='sunkeeper'?'Sunkeeper':faction==='eclipser'?'Eclipser':'Solara'}`;};

// Innovation #11: Prophetic Epitaph Suggestion
const PROPHECY_TEMPLATES=[
  (w,f,n)=>`${n} walked as far as Wave ${w}. The Oracle says: further than most, not far enough.`,
  (w,f,n)=>`Wave ${w} was the last chapter. A ${f||'wanderer'}'s story, written in dust.`,
  (w,f,n)=>`The ${f==='sunkeeper'?'sun':f==='eclipser'?'dark':'desert'} remembers ${n}. Wave ${w}. Always Wave ${w}.`,
  (w,f,n)=>`Fell at ${w}. The Oracle watched. She does not weep, but she remembers.`,
  (w,f,n)=>`${w<10?'Barely begun':'Half-gone'} at Wave ${w}. The sun is dimmer for it.`,
  (w,f,n)=>`Wave ${w} asked too much. ${n} gave what they had. The grave holds the rest.`,
  (w,f,n)=>`The ${f==='eclipser'?'Eclipse claims':'sun mourns'} ${n}. Wave ${w} was the answer to a question they didn't ask.`,
  (w,f,n)=>`A ${f||'wanderer'} who reached Wave ${w} once. The world map knows their name.`,
];
const generateProphecy=(wave,faction,playerName)=>{const t=PROPHECY_TEMPLATES[hashSeed(playerName+(wave||0))%PROPHECY_TEMPLATES.length];return t(wave||0,faction||'neutral',playerName||'Adventurer');};

const CARAVAN_ITEMS=[[{i:"rune_arrow",cost:20},{i:"emerald",cost:280},{i:"ruby",cost:500}],[{i:"death_rune",cost:180},{i:"prayer_potion",cost:350},{i:"ranging_potion",cost:300}],[{i:"elemental_shard",cost:50},{i:"kwuarm_seed",cost:200},{i:"festival_mask",cost:600}]];

const LORE_ENTRIES=[
  {id:"lore_1",monster:"Skeleton",text:"'Here lies a warrior of the Dune Wars, cursed to wander until the desert reclaims all.'"},
  {id:"lore_2",monster:"Necromancer",text:"'The Order of the Bone Moon once ruled these sands. Their rituals corrupted the oases.'"},
  {id:"lore_3",monster:"Cinderwake Colossus",text:"'Ancient records speak of a fire god sleeping beneath The Southern Isle. The Cinderwake Colossus is its dreaming eye.'"},
  {id:"lore_4",monster:"Dark Wizard",text:"'Fragments of the Rune Accord. Page 7: The air runes were never meant to be free.'"},
  {id:"lore_5",monster:"Hill Giant",text:"'Giants were the first people of this land. They do not forgive what was taken from them.'"},
  {id:"lore_6",monster:"Ice Warrior",text:"'The Ashlands were once a kingdom. The Ice Warriors are its last frozen soldiers.'"},
  {id:"lore_7",monster:"Lesser Demon",text:"'Contract Fragment: ...in exchange for power, the summoner shall provide 1,000 souls...'"},
  {id:"lore_8",monster:"Moss Giant",text:"'The White Fort forest was clear-cut in the Year of Iron. The giants remember.'"},
];

const SEASONAL_EVENTS=[
  {name:"Desert Festival",months:[3,4],icon:"🎪",monsters:[{nm:"Festival Guard",hp:60,mhp:60,atk:6,def:4,str:5,xp:20,c:"#d4a030",drops:[{i:"coins",c:1,a:[20,80]},{i:"festival_mask",c:0.05}],rsp:30000,agro:false,lvl:6,ox:65,oy:43,x:65,y:43}],shopItems:[{i:"festival_mask",cost:500}]},
  {name:"Blood Moon",months:[10,11],icon:"🌑",monsters:[{nm:"Blood Crawler",hp:120,mhp:120,atk:14,def:6,str:12,xp:55,c:"#800020",drops:[{i:"blood_rune",c:0.3,a:[1,5]},{i:"coins",c:0.8,a:[15,60]}],rsp:20000,agro:true,lvl:15,ox:45,oy:26,x:45,y:26}],shopItems:[{i:"blood_rune",cost:200}]},
  {name:"Frozen Wastes",months:[12,1,2],icon:"❄️",monsters:[{nm:"Frost Wraith",hp:150,mhp:150,atk:15,def:8,str:13,xp:65,c:"#80c0e0",drops:[{i:"ice_shard",c:0.5,a:[1,3]},{i:"coins",c:0.7,a:[20,80]}],rsp:20000,agro:true,lvl:16,atkType:"magic",ox:20,oy:3,x:20,y:3}],shopItems:[{i:"ice_shard",cost:100}]},
  {name:"Sandstorm Season",months:[6,7,8],icon:"🌪️",monsters:[],shopItems:[{i:"sand_golem_mask",cost:400}]},
];

const QUEST_TEMPLATES=[
  {type:"kill",npcId:2,npcNm:"Cook",npcRegion:"Solara's Rest",monsters:["Goblin","Cow","Chicken"],counts:[10,5,15],rewards:{xp:200,coins:150}},
  {type:"gather",npcId:6,npcNm:"Shopkeeper",npcRegion:"The Sanctum",resources:["logs","coal","iron"],counts:[20,10,15],rewards:{xp:300,coins:200}},
  {type:"cook",npcId:22,npcNm:"Dock Master",npcRegion:"Ashfen",items:["raw_lobster","raw_swordfish","raw_trout"],counts:[8,5,15],rewards:{xp:400,coins:250}},
];

function WorldMapCanvas({gR,mapCvR,graves,gravesTick,onGraveClick}){
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
    // Phase 2 + SIL: Graves — render ✝ markers with clustering
    if(graves&&graves.length>0){
      c.font=`bold ${Math.max(6,Math.floor(sc*1.4))}px sans-serif`;c.textAlign="center";
      // Cluster graves within 3 tile radius
      const clusters=[];const assigned=new Set();
      graves.forEach((gr,i)=>{
        if(assigned.has(i))return;
        const cluster={cx:gr.x,cy:gr.y,members:[gr]};assigned.add(i);
        graves.forEach((g2,j)=>{if(assigned.has(j))return;if(Math.abs(g2.x-gr.x)<=3&&Math.abs(g2.y-gr.y)<=3){cluster.members.push(g2);assigned.add(j);}});
        clusters.push(cluster);
      });
      clusters.forEach(cl=>{
        const px=cl.cx*sc+sc/2,py=cl.cy*sc+sc;
        if(cl.members.length>=15){
          // Innovation #7: Landmark — 15+ graves → named location
          const lmKey=Math.round(cl.cx/5)+'_'+Math.round(cl.cy/5);
          const lmName=getLandmarkName(lmKey);
          c.fillStyle="rgba(255,200,100,0.95)";c.font=`bold ${Math.max(8,Math.floor(sc*1.8))}px sans-serif`;
          c.fillText("💀",px,py);
          c.fillStyle="#fff";c.font=`bold ${Math.max(4,Math.floor(sc*0.8))}px sans-serif`;
          c.fillText(cl.members.length,px+sc*0.6,py-sc*0.6);
          c.fillStyle="rgba(255,220,120,0.9)";c.font=`bold ${Math.max(5,Math.floor(sc*0.9))}px sans-serif`;
          c.textAlign="center";c.fillText(lmName,px,py+sc*1.4);
        }else if(cl.members.length>=5){
          const hasShrine=cl.members.some(m=>(m.sunstone_offerings||0)>=50);
          c.fillStyle=hasShrine?"rgba(255,200,100,0.95)":"rgba(220,180,255,0.9)";c.font=`bold ${Math.max(7,Math.floor(sc*1.6))}px sans-serif`;
          c.fillText("💀",px,py);
          c.fillStyle="#fff";c.font=`bold ${Math.max(4,Math.floor(sc*0.8))}px sans-serif`;
          c.fillText(cl.members.length,px+sc*0.6,py-sc*0.6);
        }else{
          // SIL: Shrine glow — check max offerings in cluster
          const maxOff=Math.max(...cl.members.map(m=>m.sunstone_offerings||0));
          if(maxOff>=200){
            c.fillStyle="rgba(255,180,60,1)";c.font=`bold ${Math.max(7,Math.floor(sc*1.6))}px sans-serif`;
            c.shadowColor="#ff0";c.shadowBlur=8;c.fillText("✦",px,py);c.shadowBlur=0;
          }else if(maxOff>=50){
            c.fillStyle="rgba(255,200,100,0.95)";c.font=`bold ${Math.max(7,Math.floor(sc*1.5))}px sans-serif`;
            c.fillText("✦",px,py);
          }else{
            c.fillStyle="rgba(180,160,220,0.85)";c.font=`bold ${Math.max(6,Math.floor(sc*1.4))}px sans-serif`;
            c.fillText("✝",px,py);
          }
        }
      });
    }
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
  },[graves,gravesTick]);
  const handleMapClick=useCallback((e)=>{
    if(!onGraveClick||!graves||graves.length===0)return;
    const cv=mapCvR.current;if(!cv)return;
    const rect=cv.getBoundingClientRect();
    const mx=(e.clientX-rect.left)/rect.width*MW;
    const my=(e.clientY-rect.top)/rect.height*MH;
    const sc=cv.width/MW;const hitR=Math.max(1.5,sc*1.5)/sc;
    const hit=graves.find(gr=>Math.abs(gr.x-mx)<hitR&&Math.abs(gr.y-my)<hitR);
    if(hit)onGraveClick(hit);
  },[graves,onGraveClick,mapCvR]);
  return <canvas ref={mapCvR} width={size} height={size} onClick={handleMapClick} style={{display:"block",imageRendering:"pixelated",cursor:"crosshair"}}/>;
}

export default function DS(){
  const initialPrefs=loadPreferences();
  const cvR=useRef(null),gR=useRef(null),fR=useRef(null),smithQueueR=useRef(null);
  const viewportHostR=useRef(null);
  const mapCvR=useRef(null),walkR=useRef(null),xpTrackR=useRef({});
  const dirtyR=useRef(false);
  const audioR=useRef(null),audioOnR=useRef(initialPrefs.audioOn);
  const craftQueueR=useRef(null);
  const dailyRunRef=useRef(null); // Phase 1: daily run state {wave,startTime,rooms,done,deathWave,shareCard}
  const rogueRunRef=useRef(null); // Phase 4: roguelite run state {wave,rng,done,deathWave,startTime,mode}
  const [rogueTick,setRogueTick]=useState(0); // triggers re-render when roguelite state changes
  const dailyLbRef=useRef([]); // Phase 1: leaderboard cache
  const gravesRef=useRef([]); // Phase 2: cached graves from Supabase
  const [showEpitaphModal,setShowEpitaphModal]=useState(false);
  const [epitaphDraft,setEpitaphDraft]=useState("");
  const [pendingGrave,setPendingGrave]=useState(null); // Phase 2: {x,y,wave,faction,playerName}
  const [gravePopup,setGravePopup]=useState(null); // Phase 2: grave clicked on world map
  const [gravesTick,setGravesTick]=useState(0); // triggers WorldMapCanvas re-render
  const [sunBrightness,setSunBrightness]=useState(100); // Phase 3: 0–100, dims with deaths
  const sunBrightnessRef=useRef(100); // mirrors sunBrightness for game-loop access
  const [totalDeaths,setTotalDeaths]=useState(0); // Phase 3: global death count
  const prevTotalDeathsRef=useRef(0); // SIL: track previous deaths for milestone detection
  const [deathMilestone,setDeathMilestone]=useState(null); // SIL: milestone flash message
  const [tab,setTab]=useState("inv");
  const [mapOpen,setMapOpen]=useState(false);
  const [menuOpen,setMenuOpen]=useState(true);
  const [onboardingStep,setOnboardingStep]=useState(null);
  const [menuSection,setMenuSection]=useState("play");
  const [panelOpen,setPanelOpen]=useState(initialPrefs.panelOpen);
  const [showGuide,setShowGuide]=useState(initialPrefs.showGuide);
  const [travelerNameDraft,setTravelerNameDraft]=useState(()=>{try{return localStorage.getItem("solara_profile_name")||"Adventurer";}catch(e){return "Adventurer";}});
  const [travelerSigilDraft,setTravelerSigilDraft]=useState(()=>{try{return localStorage.getItem("solara_traveler_sigil")||makeTravelerSigil();}catch(e){return makeTravelerSigil();}});
  const [echoes,setEchoes]=useState([]);
  const [chat,setChat]=useState(["Welcome to Solara: Sunfall!","Left-click to interact. Right-click for options.","🌟 You carry a Sunstone Shard. The Oracle in The Sanctum speaks of it."]);
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
  const [uiScale,setUiScale]=useState(initialPrefs.uiScale);
  const [audioEnabled,setAudioEnabled]=useState(initialPrefs.audioOn);
  const [musicOn,setMusicOn]=useState(initialPrefs.musicOn);
  const [showGhostHud,setShowGhostHud]=useState(initialPrefs.showGhostHud);
  const [ghostPosition,setGhostPosition]=useState(initialPrefs.ghostPosition);
  const [showObjectiveTracker,setShowObjectiveTracker]=useState(initialPrefs.showObjectiveTracker);
  const [objectivePosition,setObjectivePosition]=useState(initialPrefs.objectivePosition);
  const [layoutPreset,setLayoutPreset]=useState("guided");
  const [customLayouts,setCustomLayouts]=useState(()=>loadCustomLayouts());
  const [customLayoutDrafts,setCustomLayoutDrafts]=useState(()=>Object.fromEntries(CUSTOM_LAYOUT_SLOTS.map(slot=>[slot,loadCustomLayouts()[slot]?.label||getDefaultCustomLayoutLabel(slot)])));
  const [showLayoutManager,setShowLayoutManager]=useState(false);
  const [layoutImportDraft,setLayoutImportDraft]=useState("");
  const [tooltipsOn,setTooltipsOn]=useState(initialPrefs.tooltipsOn);
  const [compactHud,setCompactHud]=useState(initialPrefs.compactHud);
  const [showMenuReference,setShowMenuReference]=useState(initialPrefs.showMenuReference);
  const [ambientMotion,setAmbientMotion]=useState(initialPrefs.ambientMotion);
  const [offlineTaskSel,setOfflineTaskSel]=useState(0);
  const [tooltip,setTooltip]=useState(null);// {text, x, y}
  const chatR=useRef([]);chatR.current=chat;
  const [dailyTick,setDailyTick]=useState(0); // triggers re-render when daily run state changes
  // Innovation #2: Oracle subscription
  const [oracleSubEmail,setOracleSubEmail]=useState("");
  const [oracleSubbed,setOracleSubbed]=useState(()=>{try{return!!localStorage.getItem('solara_oracle_sub');}catch(e){return false;}});
  const supabaseRef=useRef(null);
  const [backendConnected,setBackendConnected]=useState(false);
  const [systemModal,setSystemModal]=useState(null);
  // Innovation #13: Ambient audio ref
  const ambientAudioR=useRef({ctx:null,osc:null,gainNode:null,active:false});
  const saveHealthRef=useRef({issues:[]});
  const objectiveDragRef=useRef(null);
  const ghostDragRef=useRef(null);
  const hudHeight=compactHud?42:56;

  const dismissGuide=useCallback(()=>setShowGuide(false),[]);

  const addC=useCallback(m=>{const c=[...chatR.current.slice(-100),m];setChat(c);},[]);
  const showSystemNotice=useCallback((title,body,accent="#c8a84e")=>{
    setSystemModal({type:"notice",title,body,accent});
  },[]);
  const requestConfirm=useCallback(({title,body,confirmLabel="Confirm",danger=false,onConfirm})=>{
    setSystemModal({type:"confirm",title,body,confirmLabel,danger,onConfirm,accent:danger?"#f06050":"#c8a84e"});
  },[]);
  const showUiTooltip=useCallback((event,name,examine,stats)=>{
    if(!tooltipsOn)return;
    setTooltip({
      x:event.clientX,
      y:event.clientY,
      name,
      examine,
      stats,
    });
  },[tooltipsOn]);
  const clearUiTooltip=useCallback(()=>setTooltip(null),[]);
  const persistIdentity=useCallback((name,sigil)=>{
    const cleanName=(name||"Adventurer").trim().slice(0,16)||"Adventurer";
    const cleanSigil=(sigil||makeTravelerSigil()).trim().slice(0,24)||makeTravelerSigil();
    setTravelerNameDraft(cleanName);
    setTravelerSigilDraft(cleanSigil);
    try{
      localStorage.setItem("solara_profile_name",cleanName);
      localStorage.setItem("solara_traveler_sigil",cleanSigil);
    }catch(e){}
    const g2=gR.current;
    if(g2?.p){
      g2.p.playerName=cleanName;
      g2.p.travelerSigil=cleanSigil;
      fr(n=>n+1);
    }
    return {name:cleanName,sigil:cleanSigil};
  },[]);

  useEffect(()=>{
    let cancelled=false;
    if(!isSupabaseConfigured){
      supabaseRef.current=null;
      setBackendConnected(false);
      return ()=>{cancelled=true;};
    }
    loadSupabaseClient()
      .then(client=>{
        if(cancelled)return;
        supabaseRef.current=client;
        setBackendConnected(!!client);
      })
      .catch(()=>{
        if(cancelled)return;
        supabaseRef.current=null;
        setBackendConnected(false);
      });
    return ()=>{cancelled=true;};
  },[]);

  // Keyboard shortcuts: M=map, ESC=close, R=run
  useEffect(()=>{
    const onKey=e=>{
      if(e.key==="m"||e.key==="M"){setMapOpen(v=>!v);return;}
      if(e.key==="Escape"){setMapOpen(false);setBankOpen(false);setShopOpen(false);setSmithOpen(false);setCraftOpen(false);setSellOpen(false);setHerbOpen(false);setFletchOpen(false);}
      if(e.key==="Tab"){e.preventDefault();setPanelOpen(v=>!v);return;}
      if(e.key==="r"||e.key==="R"){const g2=gR.current;if(g2){g2.p.run=!g2.p.run;fr(n=>n+1);}}
    };
    window.addEventListener("keydown",onKey);
    return()=>window.removeEventListener("keydown",onKey);
  },[]);

  // Phase 3: apply canvas desaturation filter when sun brightness changes
  useEffect(()=>{
    sunBrightnessRef.current=sunBrightness;
    const cv=cvR.current;if(!cv)return;
    const saturation=(0.15+(sunBrightness/100)*0.85).toFixed(2);
    const warmth=sunBrightness>60?1:0.7+(sunBrightness/60)*0.3;
    const sepia=(1-warmth).toFixed(2);
    cv.style.filter=`saturate(${saturation}) sepia(${sepia})`;
  },[sunBrightness]);

  // Innovation #13: Ambient music — phase-adaptive, tied to sunBrightness
  useEffect(()=>{
    const amb=ambientAudioR.current;
    if(!audioEnabled||!musicOn){
      try{
        if(amb.gainNode&&amb.ctx){
          amb.gainNode.gain.setTargetAtTime(0.0001,amb.ctx.currentTime,0.35);
        }
      }catch(e){}
      return;
    }
    try{
      if(!amb.ctx){amb.ctx=new (window.AudioContext||window.webkitAudioContext)();}
      const ctx=amb.ctx;
      if(ctx.state==='suspended')ctx.resume();
      const root=sunBrightness>80?220:sunBrightness>60?196:sunBrightness>40?174:sunBrightness>20?155:130;
      const harmony=root*(sunBrightness>45?1.5:1.333);
      const vol=(sunBrightness>80?0.03:sunBrightness>60?0.04:sunBrightness>40?0.05:sunBrightness>20?0.06:0.07)*(ambientMotion?1:0.72);
      if(!amb.osc){
        amb.osc=ctx.createOscillator();
        amb.harmonyOsc=ctx.createOscillator();
        amb.gainNode=ctx.createGain();
        amb.filter=ctx.createBiquadFilter();
        amb.filter.type='lowpass';
        amb.osc.type='triangle';
        amb.harmonyOsc.type='sine';
        amb.osc.frequency.value=root;
        amb.harmonyOsc.frequency.value=harmony;
        amb.filter.frequency.value=sunBrightness>50?420:300;
        amb.gainNode.gain.value=0.0001;
        amb.osc.connect(amb.filter);
        amb.harmonyOsc.connect(amb.filter);
        amb.filter.connect(amb.gainNode);
        amb.gainNode.connect(ctx.destination);
        amb.osc.start();
        amb.harmonyOsc.start();
        amb.active=true;
      }
      amb.osc.frequency.setTargetAtTime(root,ctx.currentTime,2.0);
      amb.harmonyOsc.frequency.setTargetAtTime(harmony,ctx.currentTime,2.6);
      amb.filter.frequency.setTargetAtTime(sunBrightness>50?420:sunBrightness>25?320:240,ctx.currentTime,2.0);
      amb.gainNode.gain.setTargetAtTime(vol,ctx.currentTime,2.0);
    }catch(e){}
    return()=>{
      try{
        const amb2=ambientAudioR.current;
        if(amb2.gainNode&&amb2.active)amb2.gainNode.gain.setTargetAtTime(0.001,amb2.ctx?.currentTime||0,0.5);
      }catch(e){}
    };
  },[ambientMotion,audioEnabled,musicOn,sunBrightness]);

  const getPlayerFaction=useCallback((p)=>{if(!p?.rep)return'neutral';const {guard=0,merchant=0,bandit=0}=p.rep;const max=Math.max(guard,merchant,bandit);if(max<=0)return'neutral';if(guard===max)return'guard';if(merchant===max)return'merchant';return'bandit';},[]);
  const grantEchoSupply=useCallback((p2,blessing)=>{
    if(!p2||!blessing)return;
    const itemMap={emberspur:"strength_potion",graveward:"bread",oracle_hum:"prayer_potion",fortune_ash:"coins"};
    const itemId=itemMap[blessing.id];
    if(!itemId)return;
    const stackable=!!ITEMS[itemId]?.s;
    const amount=itemId==="coins"?25:itemId==="bread"?2:1;
    if(stackable){
      const existing=p2.inv.find(x=>x.i===itemId);
      if(existing)existing.c+=amount;
      else if(p2.inv.length<28)p2.inv.push({i:itemId,c:amount});
      else return;
    }else{
      for(let i=0;i<amount;i++){
        if(p2.inv.length>=28)return;
        p2.inv.push({i:itemId,c:1});
      }
    }
    addC(`🕯️ Echo supply received: ${ITEMS[itemId].n}${amount>1?` x${amount}`:""}.`);
  },[addC]);
  const getWorldSnapshot=useCallback((overrides={})=>getSharedWorldSnapshot({
    sunBrightness: overrides.sunBrightness ?? sunBrightnessRef.current,
    totalDeaths: overrides.totalDeaths ?? prevTotalDeathsRef.current ?? totalDeaths,
    leaderboard: overrides.leaderboard ?? dailyLbRef.current,
    echoes: overrides.echoes ?? echoes,
    graves: overrides.graves ?? gravesRef.current,
    playerName: overrides.playerName ?? gR.current?.p?.playerName ?? travelerNameDraft ?? "Adventurer",
    dayNumber: overrides.dayNumber ?? getDayNumber(),
  }),[echoes,totalDeaths,travelerNameDraft]);
  const applySpawnState=useCallback((monster,context="world")=>{
    const snapshot=getWorldSnapshot();
    return applyMonsterWorldState(monster,snapshot,context);
  },[getWorldSnapshot]);
  const spawnEchoRival=useCallback((snapshot, baseMonster, contextTag)=>{
    if(!snapshot?.rival||!baseMonster)return null;
    const rivalBase={...baseMonster,x:10,y:56,ox:8,oy:55,id:Math.random(),at:0,dead:false,agro:true,temp:true,dungeon:true,isEchoRival:true,echoRival:true};
    if(contextTag==="roguelite")rivalBase.rogueRun=true;
    if(contextTag==="daily")rivalBase.dailyRun=true;
    return applyMonsterWorldState(rivalBase,snapshot,"dungeon");
  },[]);
  const fetchEchoes=useCallback(async()=>{
    const supabase=supabaseRef.current;
    try{
      const merged=await fetchEchoFeed({supabase,limit:12,localLimit:24});
      setEchoes(merged);
    }catch(e){
      try{setEchoes(loadLocalEchoes(12));}catch(e2){setEchoes([]);}
    }
  },[]);
  const submitEcho=useCallback(async(kind,headline,summary,waveReached=0)=>{
    const supabase=supabaseRef.current;
    const g2=gR.current;if(!g2?.p)return;
    const p2=g2.p;
    const echo=sanitizeEchoPayload({
      id:`echo-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      player_name:p2.playerName||travelerNameDraft||"Adventurer",
      traveler_sigil:p2.travelerSigil||travelerSigilDraft,
      kind,
      headline,
      summary,
      wave_reached:waveReached||0,
      faction:getPlayerFaction(p2),
      created_at:new Date().toISOString(),
    });
    echo.id=`echo-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    echo.created_at=new Date().toISOString();
    persistLocalEcho(echo,24);
    setEchoes(prev=>[echo,...prev].slice(0,12));
    if(!supabase)return;
    try{
      await submitRemoteEcho({supabase,echo,season:CURRENT_SEASON,dateSeed:getDailySeed()});
      setTimeout(()=>fetchEchoes(),800);
    }catch(e){}
  },[fetchEchoes,getPlayerFaction,travelerNameDraft,travelerSigilDraft]);

  const reactToEcho=useCallback(async(echoId,reaction)=>{
    const supabase=supabaseRef.current;
    try{
      const result=await reactToEchoRecord({supabase,echoId,reaction});
      if(!result.accepted||!result.reaction)return;
      setEchoes(prev=>prev.map(e=>e.id===echoId?{...e,[`${result.reaction}_count`]:(e[`${result.reaction}_count`]||0)+1}:e));
    }catch(e){}
  },[]);

  const fetchDailyLeaderboard=useCallback(async()=>{
    const supabase=supabaseRef.current;
    if(!supabase){return;}
    try{
      const data=await fetchDailyLeaderboardRecords({supabase,dateSeed:getDailySeed(),limit:10});
      dailyLbRef.current=data||[];setDailyTick(n=>n+1);
    }catch(e){console.warn('[Solara] Leaderboard fetch failed:',e);}
  },[]);

  const submitDailyScore=useCallback(async(playerName,waveReached,faction)=>{
    const supabase=supabaseRef.current;
    if(!supabase)return;
    try{
      await submitDailyScoreRecord({supabase,playerName,waveReached,faction,dateSeed:getDailySeed(),season:CURRENT_SEASON});
      setTimeout(()=>fetchDailyLeaderboard(),1000);
    }catch(e){console.warn('[Solara] Score submit failed:',e);}
  },[fetchDailyLeaderboard]);

  const startDailyRun=useCallback(()=>{
    const g2=gR.current;if(!g2)return;
    const rooms=generateDailyRooms();
    const worldState=getWorldSnapshot();
    const mechanics=worldState.director?.mechanics;
    const run={wave:0,startTime:Date.now(),rooms,done:false,deathWave:null,shareCard:null,mechanics};
    dailyRunRef.current=run;
    g2.mons=g2.mons.filter(m=>!m.dungeon);
    g2.dungeon={active:false,room:0,cleared:false,monsters:[]};
    g2.p.x=9;g2.p.y=55;g2.p.path=[];g2.p.act=null;g2.p.cmb=null;g2.p.actTgt=null;
    resetRunScopedBonuses(g2.p);
    if(worldState.blessing){
      applyRunBlessing(g2.p,worldState.blessing);
      grantEchoSupply(g2.p,worldState.blessing);
      addC(`👻 Echo blessing: ${worldState.blessing.label} — ${worldState.blessing.description}`);
    }
    if(mechanics){
      addC(`🧭 Director route: ${mechanics.label} — ${mechanics.objective}`);
      addC(`⚖️ Run tuning: enemies x${mechanics.enemyScale}, rewards x${mechanics.rewardMultiplier}, rival pressure x${mechanics.rivalWeight}.`);
    }
    run.prophecy=worldState.prophecy?.active||null;
    run.rival=worldState.rival||null;
    run.rivalSpawned=false;
    if(run.prophecy){
      const mods=run.prophecy.modifiers||{};
      g2.p.echoAtkBonus=(g2.p.echoAtkBonus||0)+(mods.attack||0);
      g2.p.echoDefBonus=(g2.p.echoDefBonus||0)+(mods.defence||0);
      g2.p.echoStrBonus=(g2.p.echoStrBonus||0)+(mods.strength||0);
      g2.p.echoLuckBonus=(g2.p.echoLuckBonus||0)+(mods.luck||0);
      if(mods.prayer){g2.p.prayer=Math.min(g2.p.maxPrayer,g2.p.prayer+mods.prayer);}
      run.ritualFavor=mods.ritualFavor||0;
      addC(`📜 Prophecy drawn: ${run.prophecy.title} — ${run.prophecy.text}`);
    }
    if(run.rival)addC(`${run.rival.icon} Rival marked: ${run.rival.playerName} waits beyond the threshold.`);
    if(worldState.crisis)addC(`☀️ Crisis directive: ${worldState.crisis.title}. ${worldState.crisis.detail}`);
    addC(`${worldState.event.icon} ${worldState.event.label}: ${worldState.event.description}`);
    updateDailyStreak(getDailySeed());
    markDailyPlayedToday(getDailySeed());
    setDailyTick(n=>n+1);setTab("inv");
  },[addC,getWorldSnapshot,grantEchoSupply]);

  // Phase 4: Start roguelite run
  const startRogueRun=useCallback(()=>{
    const g2=gR.current;if(!g2)return;
    if(dailyRunRef.current&&!dailyRunRef.current.done){addC("Finish your Daily Rite first!");return;}
    if(rogueRunRef.current&&!rogueRunRef.current.done){addC("You already have a roguelite run in progress!");return;}
    const p=g2.p;const seed=Date.now();const rng=mulberry32(seed);
    // Apply relic bonuses
    const relics=p.rogueliteStats?.relics||[];
    let bonusHp=0,bonusStr=0,bonusDef=0,bonusAtk=0,bonusPray=0;
    relics.forEach(rId=>{const r=RELICS.find(x=>x.id===rId);if(!r)return;bonusHp+=(r.bonus.hp||0);bonusStr+=(r.bonus.str||0);bonusDef+=(r.bonus.def||0);bonusAtk+=(r.bonus.atk||0);bonusPray+=(r.bonus.pray||0);});
    const worldState=getWorldSnapshot();
    const mechanics=worldState.director?.mechanics;
    const run={seed,rng,wave:0,startTime:Date.now(),done:false,deathWave:null,mode:'roguelite',
      bonusHp,bonusStr,bonusDef,bonusAtk,bonusPray,preRunHp:p.hp,preRunMhp:p.mhp,preRunPrayer:p.maxPrayer,mechanics};
    rogueRunRef.current=run;
    // Apply relic bonuses to player
    resetRunScopedBonuses(p);
    p.mhp+=bonusHp;p.hp=p.mhp;p.maxPrayer+=bonusPray;p.prayer=p.maxPrayer;
    if(worldState.blessing){
      applyRunBlessing(p,worldState.blessing);
      grantEchoSupply(p,worldState.blessing);
      addC(`👻 Echo blessing: ${worldState.blessing.label} — ${worldState.blessing.description}`);
    }
    if(mechanics){
      addC(`🧭 Director route: ${mechanics.label} — ${mechanics.objective}`);
      addC(`⚖️ Run tuning: enemies x${mechanics.enemyScale}, rewards x${mechanics.rewardMultiplier}, rival pressure x${mechanics.rivalWeight}.`);
    }
    run.prophecy=worldState.prophecy?.active||null;
    run.rival=worldState.rival||null;
    run.rivalSpawned=false;
    if(run.prophecy){
      const mods=run.prophecy.modifiers||{};
      p.echoAtkBonus=(p.echoAtkBonus||0)+(mods.attack||0);
      p.echoDefBonus=(p.echoDefBonus||0)+(mods.defence||0);
      p.echoStrBonus=(p.echoStrBonus||0)+(mods.strength||0);
      p.echoLuckBonus=(p.echoLuckBonus||0)+(mods.luck||0);
      if(mods.prayer){p.prayer=Math.min(p.maxPrayer,p.prayer+mods.prayer);}
      run.ritualFavor=mods.ritualFavor||0;
      addC(`📜 Prophecy drawn: ${run.prophecy.title} — ${run.prophecy.text}`);
    }
    if(run.rival)addC(`${run.rival.icon} Rival marked: ${run.rival.playerName} will intrude on this run.`);
    if(worldState.crisis)addC(`☀️ Crisis directive: ${worldState.crisis.title}. ${worldState.crisis.detail}`);
    addC(`${worldState.event.icon} ${worldState.event.label}: ${worldState.event.description}`);
    g2.mons=g2.mons.filter(m=>!m.rogueRun);
    g2.dungeon={active:false,room:0,cleared:false,monsters:[]};
    p.x=9;p.y=55;p.path=[];p.act=null;p.cmb=null;p.actTgt=null;
    addC("⚔️ Roguelite Run begins! Survive as long as you can.");
    addC("🏛️ Relics active: "+relics.length+" (+"+(bonusHp?"HP:"+bonusHp+" ":"")+(bonusStr?"STR:"+bonusStr+" ":"")+(bonusDef?"DEF:"+bonusDef+" ":"")+(bonusAtk?"ATK:"+bonusAtk+" ":"")+")");
    setRogueTick(n=>n+1);setTab("inv");
  },[addC,getWorldSnapshot,grantEchoSupply]);

  // Phase 4: End roguelite run
  const endRogueRun=useCallback((wave)=>{
    const g2=gR.current;if(!g2)return;
    const p=g2.p;const run=rogueRunRef.current;if(!run||run.done)return;
    run.done=true;run.deathWave=wave;
    // Restore pre-run stats
    p.mhp=run.preRunMhp;p.hp=p.mhp;p.maxPrayer=run.preRunPrayer;p.prayer=p.maxPrayer;
    // Clean up roguelite monsters
    g2.mons=g2.mons.filter(m=>!m.rogueRun);
    g2.dungeon={active:false,room:0,cleared:false,monsters:[]};
    // Update roguelite stats
    if(!p.rogueliteStats)p.rogueliteStats={bestWave:0,totalRuns:0,relics:[]};
    p.rogueliteStats.totalRuns++;
    if(wave>p.rogueliteStats.bestWave)p.rogueliteStats.bestWave=wave;
    // Award relic
    const relic=getRogueRelicReward(wave);
    if(relic&&!p.rogueliteStats.relics.includes(relic.id)){
      p.rogueliteStats.relics.push(relic.id);
      addC("🏆 Relic earned: "+relic.i+" "+relic.n+" — "+relic.desc);
    }
    run.shareCard=generateRogueShareCard(p.playerName||"Adventurer",wave,p.rogueliteStats.bestWave,p.rogueliteStats.relics.length,sunBrightnessRef.current);
    addC("💀 Roguelite run ended at Wave "+wave+". Best: "+p.rogueliteStats.bestWave);
    submitEcho("roguelite","Roguelite echo — Wave "+wave,`${p.playerName||"Adventurer"} fell on a roguelite push at Wave ${wave}.`,wave);
    // Submit grave for roguelite deaths too
    setPendingGrave({x:p.x,y:p.y,wave,faction:getPlayerFaction(p),playerName:p.playerName||"Adventurer"});
    setShowEpitaphModal(true);
    setRogueTick(n=>n+1);
  },[addC,getPlayerFaction,submitEcho]);

  // Phase 3: Sun state
  const fetchSunState=useCallback(async()=>{
    const supabase=supabaseRef.current;
    if(!supabase)return;
    try{
      const data=await fetchSunStateRecord({supabase});
      if(data){
        setSunBrightness(Math.max(0,Math.min(100,Number(data.brightness))));
        const newDeaths=Number(data.total_deaths)||0;
        const prev=prevTotalDeathsRef.current;
        const milestones=[100,500,1000,5000,10000,50000,100000];
        for(const m of milestones){if(prev<m&&newDeaths>=m){setDeathMilestone(m);setTimeout(()=>setDeathMilestone(null),5000);addC(`☀️ The world has claimed ${m.toLocaleString()} lives. The sun dims.`);break;}}
        prevTotalDeathsRef.current=newDeaths;
        setTotalDeaths(newDeaths);
      }
    }catch(e){console.warn('[Solara] Sun state fetch failed:',e);}
  },[addC]);

  // Phase 2: Graves
  const fetchGraves=useCallback(async()=>{
    const supabase=supabaseRef.current;
    if(!supabase)return;
    try{
      const newGraves=await fetchGraveRecords({supabase,season:CURRENT_SEASON,limit:200});
      // SIL: recent deaths ticker — announce new graves in chat (max 3)
      if(gravesRef.current.length>0){
        const oldIds=new Set(gravesRef.current.map(g=>g.id));
        const fresh=newGraves.filter(g=>!oldIds.has(g.id));
        fresh.slice(0,3).forEach(g=>addC(`☠️ ${g.player_name} fell at Wave ${g.wave_reached||0}. A grave marks the world.`));
      }
      gravesRef.current=newGraves;setGravesTick(n=>n+1);
    }catch(e){console.warn('[Solara] Graves fetch failed:',e);}
  },[addC]);

  const submitGrave=useCallback(async(epitaph)=>{
    const supabase=supabaseRef.current;
    setShowEpitaphModal(false);setEpitaphDraft("");
    if(!pendingGrave){return;}
    const {x,y,wave,faction,playerName}=pendingGrave;
    setPendingGrave(null);
    const grave=sanitizeGravePayload({player_name:playerName,epitaph,x,y,faction,wave_reached:wave});
    const worldState=getWorldSnapshot({playerName});
    const constellationName=worldState.constellations?.[0]?.name||"";
    const memoryCard=createDeathMemoryCard({playerName:grave.player_name,sigil:travelerSigilDraft,waveReached:grave.wave_reached,faction:grave.faction,sunBrightness:sunBrightnessRef.current,epitaph:grave.epitaph,eventLabel:worldState.event?.label||"Steady Flame",constellationName});
    if(!supabase){
      submitEcho("death_memory",`Death memory - Wave ${grave.wave_reached}`,memoryCard,grave.wave_reached);
      return;
    }
    try{
      await submitGraveRecord({supabase,grave,season:CURRENT_SEASON,dateSeed:getDailySeed()});
      // Phase 3: increment global death counter → dims the sun
      incrementDeathCounterRecord({supabase}).catch(e=>console.warn('[Solara] Death counter failed:',e));
      submitEcho("death_memory",`Death memory - Wave ${grave.wave_reached}`,memoryCard,grave.wave_reached);
      setTimeout(()=>fetchGraves(),1000);
      setTimeout(()=>fetchSunState(),2000);
    }catch(e){console.warn('[Solara] Grave submit failed:',e);}
  },[pendingGrave,fetchGraves,fetchSunState,getWorldSnapshot,submitEcho,travelerSigilDraft]);

  // SIL: Sunstone offering
  const offerSunstone=useCallback(async(grave)=>{
    const supabase=supabaseRef.current;
    const g2=gR.current;if(!g2)return;
    const p=g2.p;const idx=p.inv.findIndex(x=>x.i==="sunstone_shard");
    if(idx===-1){return;}
    // Remove shard from inventory
    if(p.inv[idx].c>1){p.inv[idx].c--;}else{p.inv.splice(idx,1);}
    fr(n=>n+1);
    setGravePopup(prev=>prev?{...prev,sunstone_offerings:(prev.sunstone_offerings||0)+1}:prev);
    if(supabase){
      try{
        const result=await offerSunstoneRecord({supabase,grave});
        if(result.becameMajorShrine){addC("✦ This grave has become a Major Shrine!");}
        else if(result.becameShrine){addC("✦ This grave has become a Shrine!");}
      }
      catch(e){console.warn('[Solara] Sunstone offer failed:',e);}
    }
    // Update local graves cache
    gravesRef.current=gravesRef.current.map(g=>g.id===grave.id?{...g,sunstone_offerings:(g.sunstone_offerings||0)+1}:g);
  },[fr]);

  // Phase 2: fetch graves on mount + every 5 min
  useEffect(()=>{
    fetchGraves();
    const iv=setInterval(()=>fetchGraves(),300000);
    return()=>clearInterval(iv);
  },[fetchGraves]);

  // Phase 3: fetch sun state on mount + every 5 min
  useEffect(()=>{
    fetchSunState();
    const iv=setInterval(()=>fetchSunState(),300000);
    return()=>clearInterval(iv);
  },[fetchSunState]);

  useEffect(()=>{
    fetchEchoes();
    const iv=setInterval(()=>fetchEchoes(),120000);
    return()=>clearInterval(iv);
  },[fetchEchoes]);

  useEffect(()=>{
    const map=genMap(),objects=genObjs(map),npcs=genNPCs(),mons=genMons();
    const g={map,objects,npcs,mons,
      p:{x:20,y:28,path:[],mt:0,ms:200,
        sk:Object.fromEntries(SKILLS.map(s=>[s,s==="Hitpoints"?1154:0])),
        hp:10,mhp:10,prayer:1,maxPrayer:1,
        inv:[{i:"bronze_sword",c:1},{i:"wooden_shield",c:1},{i:"bronze_axe",c:1},{i:"tinderbox",c:1},{i:"bread",c:5},{i:"coins",c:50},{i:"sunstone_shard",c:1}],
        eq:{weapon:null,shield:null,head:null,body:null,legs:null,ring:null,cape:null},
        bank:[{i:"coins",c:200}],
        act:null,actTm:0,actTgt:null,cmb:null,at:0,as:2400,face:"s",run:false,runE:100,
        style:0,quests:{cook:0,desert:0,goblin:0,rune:0,miner:0,haunted:0,karamja:0,knight:0,relic:0,awakening:0,shipment:0,forge:0,wildernessHunt:0},
        desertKills:0,goblinKills:0,totalXp:0,
        autoRetaliate:true,specialCd:0,specialNext:false,eagleEye:0,manaBurst:false,
        achievements:[],cookCount:0,visitedRegions:new Set(),
        haunted:0,jogreKills:0,demonKills:0,jadKills:0,relicParts:0,
        slayerTask:null,slayerKills:0,monsterKills:{},
        shipmentFish:0,iceWarriorKills:0,
        activePrayers:[],
        buffs:{},ironman:false,
        // Task 8: Pet system
        pet:null,
        // Task 9: Daily challenge
        dailyChallengeProgress:0,
        // Task 10: QP + unlocks
        questPoints:0,unlocks:[],
        // Task 11: Faction rep
        rep:{guard:0,merchant:0,bandit:0},
        // Task 17: Skill synergy
        lastFireTile:null,
        // Task 20: Prestige
        prestige:{},
        // Task 22: Farming
        farmPatches:[],
        // Task 23: Player name
        playerName:"Adventurer",
        travelerSigil:travelerSigilDraft,
        // Task 24: Desert camp
        camp:null,campBank:[],
        // Task 25: Combo meter (session-only, init here for safety)
        comboMeter:0,lastCombatStyle:null,
        // Task 26: Appearance
        appearance:{skin:"#f0d8a0",hair:"#333",outfit:"#2266cc"},
        // Task 27: Lore codex
        codex:[],
        // Task 28: Runecrafting — skill init handled by SKILLS array
        // Task 18: Side quests
        sideQuests:[],
      },
      cam:getCenteredCam(20,28,cvR.current),tk:0,lt:Date.now(),dlg:null,dlgL:0,rspQ:[],
      fx:[],groundItems:[],fires:[],deathTile:null,
      npcChatter:[],nextChatterTime:Date.now()+15000,
      worldEvent:null,nextEventTime:Date.now()+600000,
      dayTime:0,isNight:false,sandstorm:false,tempMerchant:null,
    };
    g.p.hp=Math.max(1,g.p.hp||lvl(g.p.sk.Hitpoints));g.p.mhp=lvl(g.p.sk.Hitpoints);
    g.p.prayer=Math.min(g.p.prayer||lvl(g.p.sk.Prayer),lvl(g.p.sk.Prayer));g.p.maxPrayer=lvl(g.p.sk.Prayer);
    g.p.playerName=travelerNameDraft||g.p.playerName;
    g.p.travelerSigil=travelerSigilDraft||g.p.travelerSigil;
    // Arena state
    g.arena={active:false,wave:0,kills:0,maxWave:10,waveMonsters:[]};
    // Dungeon state
    g.dungeon={active:false,room:0,cleared:false,monsters:[]};
    // Caravan state
    g.caravanPos=0;g.caravanTimer=0;
    gR.current=g;

    // === SOLARA SAVE MIGRATION SHIM ===
    // Migrates from the legacy save key to Solara save format.
    const migrateLegacySave = () => {
      const legacyKey = 'dunescape_save';
      const newKey = 'solara_save';
      const oldData = localStorage.getItem(legacyKey);
      const newData = localStorage.getItem(newKey);
      if (oldData && !newData) {
        try {
          const save = JSON.parse(oldData);
          save.saveVersion = 5;
          save.migratedFrom = 'legacy';
          save.migratedAt = Date.now();
          localStorage.setItem(newKey, JSON.stringify(save));
          localStorage.removeItem(legacyKey);
          console.log('[Solara] Legacy save migrated successfully.');
        } catch (err) {
          console.warn('[Solara] Legacy save migration failed. Starting fresh.', err);
        }
      }
    };
    migrateLegacySave();
    // === END MIGRATION SHIM ===

    // Load saved state
    try{const sv=localStorage.getItem("solara_save");if(sv){const parsedSave=JSON.parse(sv);const sanitizedSave=sanitizeSaveData(parsedSave,travelerNameDraft||"Adventurer",travelerSigilDraft);if(!sanitizedSave.data)throw new Error("Invalid save payload");const sp=sanitizedSave.data;saveHealthRef.current.issues=sanitizedSave.issues;const p2=g.p;Object.assign(p2,sp);p2.hp=Math.min(p2.hp,p2.mhp);p2.prayer=Math.min(p2.prayer,p2.maxPrayer);p2.path=[];p2.act=null;p2.actTgt=null;p2.cmb=null;if(!p2.quests)p2.quests={};['desert','cook','goblin','rune','miner','haunted','karamja','knight','relic','awakening'].forEach(q=>{if(p2.quests[q]==null)p2.quests[q]=0;});if(!p2.desertKills)p2.desertKills=0;if(!p2.goblinKills)p2.goblinKills=0;if(!p2.achievements)p2.achievements=[];if(!p2.buffs)p2.buffs={};if(p2.autoRetaliate==null)p2.autoRetaliate=true;if(!p2.slayerTask)p2.slayerTask=null;if(!p2.sk.Herblore)p2.sk.Herblore=0;if(!p2.sk.Slayer)p2.sk.Slayer=0;if(!p2.sk.Fletching)p2.sk.Fletching=0;if(!p2.sk.Farming)p2.sk.Farming=0;if(!p2.sk.Runecrafting)p2.sk.Runecrafting=0;if(!p2.eq.cape)p2.eq.cape=null;if(!p2.activePrayers)p2.activePrayers=[];['shipment','forge','wildernessHunt'].forEach(q=>{if(p2.quests[q]==null)p2.quests[q]=0;});if(!p2.shipmentFish)p2.shipmentFish=0;if(!p2.iceWarriorKills)p2.iceWarriorKills=0;if(!p2.monsterKills)p2.monsterKills={};p2.visitedRegions=new Set(sp.visitedRegions||[]);p2.haunted=p2.haunted||0;p2.jogreKills=p2.jogreKills||0;p2.demonKills=p2.demonKills||0;p2.jadKills=p2.jadKills||0;p2.relicParts=p2.relicParts||0;p2.cookCount=p2.cookCount||0;
      // New field defaults (v4)
      if(!p2.pet)p2.pet=null;if(!p2.questPoints)p2.questPoints=0;if(!p2.unlocks)p2.unlocks=[];if(!p2.rep)p2.rep={guard:0,merchant:0,bandit:0};if(!p2.lastFireTile)p2.lastFireTile=null;if(!p2.prestige)p2.prestige={};if(!p2.farmPatches)p2.farmPatches=[];if(!p2.playerName)p2.playerName=travelerNameDraft||"Adventurer";if(!p2.travelerSigil)p2.travelerSigil=travelerSigilDraft;if(!p2.camp)p2.camp=null;if(!p2.campBank)p2.campBank=[];if(!p2.appearance)p2.appearance={skin:"#f0d8a0",hair:"#333",outfit:"#2266cc"};if(!p2.codex)p2.codex=[];if(!p2.sideQuests)p2.sideQuests=[];if(!p2.dailyChallengeProgress)p2.dailyChallengeProgress=0;if(!p2.rogueliteStats)p2.rogueliteStats={bestWave:0,totalRuns:0,relics:[]};p2.comboMeter=0;p2.lastCombatStyle=null;
      addC(sanitizedSave.issues.length?"Save loaded. Invalid fields were repaired.":"Save loaded. Welcome back!");}

    // Offline progression
    const savedOffline=localStorage.getItem("solara_offline");
    if(savedOffline){try{const {task,leftAt}=JSON.parse(savedOffline);const elapsed=Math.min(Date.now()-leftAt,8*3600*1000);if(elapsed>30000&&task){const ticks=Math.floor(elapsed/task.interval);const gained=Math.min(ticks,task.maxItems);for(let i=0;i<gained;i++)addI(task.resource,1);const xpGained=gained*task.xpPer;g.p.sk[task.skill]=(g.p.sk[task.skill]||0)+xpGained;g.p.totalXp+=xpGained;addC("⏰ Offline: "+gained+" "+task.resource+" collected ("+Math.floor(elapsed/60000)+"min offline)");}}catch(e2){}localStorage.removeItem("solara_offline");}
    }catch(e){}

    // Daily challenge setup (Task 9)
    {const today=new Date().toDateString();const savedDaily=localStorage.getItem("solara_daily");let dailyChallenge=null;if(savedDaily){try{const d=JSON.parse(savedDaily);if(d.date===today){dailyChallenge=d;g.p.dailyChallengeProgress=d.progress||0;}}catch(e2){}}if(!dailyChallenge){const idx=Math.abs(today.split('').reduce((a,c2)=>a+c2.charCodeAt(0),0))%DAILY_CHALLENGES.length;dailyChallenge={...DAILY_CHALLENGES[idx],date:today,progress:0,done:false};localStorage.setItem("solara_daily",JSON.stringify(dailyChallenge));}g.dailyChallenge=dailyChallenge;}

    // Side quests init (Task 18)
    {const p2=g.p;if(!p2.sideQuests||p2.sideQuests.length===0){p2.sideQuests=QUEST_TEMPLATES.map((t,i)=>{const opts=t.monsters||t.resources||t.items||["item"];const pick=Math.floor(Math.random()*opts.length);return {id:"side_"+i,type:t.type,target:opts[pick],count:t.counts?.[pick]||10,progress:0,done:false,reward:t.rewards,npcId:t.npcId,npcNm:t.npcNm};});}}

    // Seasonal events init (Task 29)
    {const month=new Date().getMonth()+1;const ev=SEASONAL_EVENTS.find(e=>e.months.includes(month));if(ev&&ev.monsters.length>0){ev.monsters.forEach(md=>{const m={...md,id:Math.random(),at:0,dead:false,temp:true};g.mons.push(m);});addC(ev.icon+" "+ev.name+" is active! Special creatures roam the world.");g.seasonalEvent=ev;}}

    const cv=cvR.current,c=cv.getContext("2d");
    const syncCanvasSize=()=>{
      const host=viewportHostR.current;
      if(!host||!cv)return;
      const nextW=Math.max(CW,Math.floor(host.clientWidth));
      const nextH=Math.max(CH,Math.floor(host.clientHeight));
      if(cv.width!==nextW||cv.height!==nextH){
        cv.width=nextW;
        cv.height=nextH;
        dirtyR.current=true;
      }
    };
    syncCanvasSize();
    let resizeObs=null;
    if(typeof ResizeObserver!=="undefined"&&viewportHostR.current){
      resizeObs=new ResizeObserver(()=>syncCanvasSize());
      resizeObs.observe(viewportHostR.current);
    }

    // === HELPERS ===
    function addI(id,cnt){const p=g.p,d=ITEMS[id];if(!d)return false;if(d.s){const e=p.inv.find(x=>x.i===id);if(e){e.c+=(cnt||1);dirtyR.current=true;return true;}}const maxInv=p.unlocks?.includes('xtra_inv')?32:28;if(p.inv.length>=maxInv){addC("Your inventory is full.");return false;}p.inv.push({i:id,c:cnt||1});dirtyR.current=true;return true;}
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
    g.giveXp=giveXp;
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
      // Prestige bonus (Task 20)
      const prestigeBonus=(p.prestige?.[sk]||0)*0.01;
      // Pet bonus (Task 8)
      const petBonus=(p.pet&&ITEMS[p.pet]?.bonus?.skill===sk)?ITEMS[p.pet].bonus.pct:0;
      // Unlock bonuses (Task 10)
      let unlockBonus=0;if(sk==="Woodcutting"&&p.unlocks?.includes("bonus_wc"))unlockBonus+=0.05;if(sk==="Mining"&&p.unlocks?.includes("bonus_mine"))unlockBonus+=0.05;if(sk==="Fishing"&&p.unlocks?.includes("bonus_fish"))unlockBonus+=0.05;
      amt=Math.round(amt*(1+prestigeBonus+petBonus+unlockBonus));
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
      // A* with min-heap (Task 4)
      if(!walkable(tx,ty)){for(const[dx,dy]of[[0,-1],[0,1],[-1,0],[1,0],[1,1],[-1,-1],[1,-1],[-1,1]])if(walkable(tx+dx,ty+dy)){tx+=dx;ty+=dy;break;}if(!walkable(tx,ty))return[];}
      if(sx===tx&&sy===ty)return[];
      const h=(x,y)=>Math.abs(x-tx)+Math.abs(y-ty);
      const heap=[[h(sx,sy),0,sx,sy]];
      const gCost=new Map();gCost.set(sx+','+sy,0);
      const parent=new Map();
      const heapPush=n=>{heap.push(n);let i=heap.length-1;while(i>0){const p2=Math.floor((i-1)/2);if(heap[p2][0]<=heap[i][0])break;[heap[p2],heap[i]]=[heap[i],heap[p2]];i=p2;}};
      const heapPop=()=>{const top=heap[0];const last=heap.pop();if(heap.length){heap[0]=last;let i=0;while(true){let s=i,l=2*i+1,r=2*i+2;if(l<heap.length&&heap[l][0]<heap[s][0])s=l;if(r<heap.length&&heap[r][0]<heap[s][0])s=r;if(s===i)break;[heap[s],heap[i]]=[heap[i],heap[s]];i=s;}}return top;};
      while(heap.length){
        const[,g2,cx,cy]=heapPop();
        if(cx===tx&&cy===ty){
          const path2=[];let cur=tx+','+ty;const startK=sx+','+sy;
          while(cur!==startK){path2.unshift({x:parseInt(cur),y:parseInt(cur.split(',')[1])});const par=parent.get(cur);if(!par)break;cur=par;}
          return path2;
        }
        const gc=gCost.get(cx+','+cy);if(gc!==g2)continue;
        for(const[dx,dy]of[[0,-1],[0,1],[-1,0],[1,0]]){
          const nx=cx+dx,ny=cy+dy,k=nx+','+ny,ng=g2+1;
          if(!walkable(nx,ny))continue;
          if(!gCost.has(k)||gCost.get(k)>ng){gCost.set(k,ng);parent.set(k,cx+','+cy);heapPush([ng+h(nx,ny),ng,nx,ny]);}
        }
        if(gCost.size>8000)return[];
      }
      return[];
    }
    g.findPath=(sx,sy,tx,ty)=>findPath(sx,sy,tx,ty);
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
      if(type==="farm"){p.path=pathToAdjacent(target.x,target.y);p.actTgt={type:"farm",obj:target};return;}
      if(type==="dungeon"){p.path=pathToAdjacent(target.x,target.y);p.actTgt={type:"dungeon",obj:target};return;}
      if(type==="arena"){p.path=pathToAdjacent(target.x,target.y);p.actTgt={type:"arena",obj:target};return;}
      if(type==="camp_bank"){p.path=pathToAdjacent(target.x,target.y);p.actTgt={type:"camp_bank",obj:target};return;}
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
        else if(o.t==="spawn")doAction("spawn_pickup",o);else if(o.t==="crafting_table")doAction("craft",o);
        else if(o.t==="farm_patch")doAction("farm",o);
        else if(o.t==="dungeon_entrance")doAction("dungeon",o);
        else if(o.t==="arena")doAction("arena",o);
        else if(o.t==="camp_chest")doAction("camp_bank",o);
        return;
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
      for(const m of g.mons)if(!m.dead&&m.x===tx&&m.y===ty){
        opts.push({label:"Attack "+m.nm+" (Lvl "+m.lvl+")",color:"#f00",action:()=>doAction("attack",m)});
        opts.push({label:"Examine "+m.nm,color:"#8a8",action:()=>addC(m.examine||"It's a "+m.nm+".")});
      }
      for(const gi of g.groundItems)if(gi.x===tx&&gi.y===ty){
        opts.push({label:"Take "+ITEMS[gi.i].n,color:"#fa0",action:()=>doAction("pickup",gi)});
        opts.push({label:"Examine "+ITEMS[gi.i].n,color:"#8a8",action:()=>addC(ITEMS[gi.i].examine||"It's "+ITEMS[gi.i].n+".")});
      }
      for(const f of g.fires)if(f.x===tx&&f.y===ty){opts.push({label:"Cook on fire",color:"#f80",action:()=>doAction("cook_fire",{x:f.x,y:f.y,t:"fire"})});}
      for(const o of g.objects)if(o.x===tx&&o.y===ty&&o.hp>0){
        if(o.t==="tree")opts.push({label:"Chop "+(o.sub==="normal"?"Tree":o.sub.charAt(0).toUpperCase()+o.sub.slice(1)),color:"#0f0",action:()=>doAction("chop",o)});
        if(o.t==="rock")opts.push({label:"Mine Rock ("+ITEMS[o.res].n+")",color:"#aaa",action:()=>doAction("mine",o)});
        if(o.t==="fish")opts.push({label:"Fish",color:"#0af",action:()=>doAction("fish",o)});
        if(o.t==="range")opts.push({label:"Cook",color:"#f80",action:()=>doAction("cook",o)});
        if(o.t==="furnace")opts.push({label:"Smelt",color:"#fa0",action:()=>doAction("smelt",o)});
        if(o.t==="anvil")opts.push({label:"Smith",color:"#aaa",action:()=>doAction("smith",o)});
        if(o.t==="altar"){opts.push({label:"Pray",color:"#ccf",action:()=>doAction("pray",o)});opts.push({label:"Craft runes",color:"#6040a0",action:()=>{const p2=g.p;const shards=p2.inv.find(x=>x.i==="elemental_shard");if(!shards){addC("You need elemental shards.");return;}const rl=lvl(p2.sk.Runecrafting||0);const per=Math.max(1,Math.floor(rl/20)+1);const total=shards.c*per;const vi=p2.inv.findIndex(x=>x.i==="elemental_shard");if(vi>=0)p2.inv.splice(vi,1);const runeType=rl<20?"air_rune":rl<40?"water_rune":rl<60?"fire_rune":"nature_rune";addI(runeType,total);giveXp("Runecrafting",shards.c*8);addC("You craft "+total+" "+ITEMS[runeType].n+"s from "+shards.c+" shards.");dirtyR.current=true;}});}
        if(o.t==="bank")opts.push({label:"Bank",color:"#da0",action:()=>doAction("bank",o)});
        if(o.t==="stall")opts.push({label:"Steal from stall",color:"#a4f",action:()=>doAction("steal",o)});
        if(o.t==="agility")opts.push({label:"Cross "+o.sub,color:"#4af",action:()=>doAction("agility",o)});
        if(o.t==="spawn")opts.push({label:"Take "+ITEMS[o.item].n,color:"#fa0",action:()=>doAction("spawn_pickup",o)});
        if(o.t==="crafting_table")opts.push({label:"Craft",color:"#8af",action:()=>doAction("craft",o)});
        if(o.t==="farm_patch")opts.push({label:o.seed?"Harvest patch":"Plant seed",color:"#4a8a20",action:()=>doAction("farm",o)});
        if(o.t==="dungeon_entrance")opts.push({label:"Enter dungeon",color:"#6040a0",action:()=>doAction("dungeon",o)});
        if(o.t==="arena")opts.push({label:"Enter arena",color:"#c04020",action:()=>doAction("arena",o)});
        if(o.t==="camp_chest")opts.push({label:"Open camp chest",color:"#c8a84e",action:()=>doAction("camp_bank",o)});
      }
      opts.push({label:"Walk here",color:"#ff0",action:()=>doAction("walk",{x:tx,y:ty})});
      opts.push({label:"Set camp here",color:"#a08020",action:()=>{const p2=g.p;p2.camp={x:tx,y:ty};addC("Camp set at ("+tx+","+ty+").");dirtyR.current=true;}});
      opts.push({label:"Cancel",color:"#888",action:()=>setCtx(null)});
      setCtx({x:e.clientX-rect.left,y:e.clientY-rect.top,opts});
    }

    // === UPDATE ===
    function update(dt){
      if(menuOpen)return;
      const p=g.p;g.tk+=dt;
      // Day/night cycle (10 min)
      g.dayTime=(g.tk%600000)/600000;
      g.isNight=g.dayTime>0.7||g.dayTime<0.1;
      // Special cooldown
      if(p.specialCd>0)p.specialCd=Math.max(0,p.specialCd-dt);
      // Cinderwake phase switching
      g.mons.forEach(m=>{if(m.nm==="Cinderwake Colossus"&&!m.dead){m.phaseTimer=(m.phaseTimer||0)+dt;const dur=m.hp<m.mhp*0.5?4000:(m.phaseDur||8000);if(m.phaseTimer>=dur){m.phaseTimer=0;const phases=["magic","ranged","melee"];m.phase=((m.phase||0)+1)%3;m.atkType=phases[m.phase];const warn={magic:"⚠️ Cinderwake channels sunfire! Pray Magic!",ranged:"⚠️ Cinderwake hurls molten spines! Pray Missiles!",melee:"⚠️ Cinderwake charges! Pray Melee!"};addC(warn[m.atkType]);dirtyR.current=true;}}});
      // Caravan movement (Task 19)
      g.caravanTimer+=dt;if(g.caravanTimer>=300000){g.caravanTimer=0;g.caravanPos=(g.caravanPos+1)%3;const pos=[[65,43],[22,12],[20,28]][g.caravanPos];const names=["The Amber District","The Sanctum","Solara's Rest"];const cn=g.npcs.find(n=>n.caravan);if(cn){cn.x=pos[0];cn.y=pos[1];}addC("🐪 The desert caravan has moved to "+names[g.caravanPos]+"!");dirtyR.current=true;}
      // Arena wave check (Task 12)
      if(g.arena.active){const alive=g.arena.waveMonsters.filter(m=>!m.dead);if(alive.length===0){if(g.arena.wave>=g.arena.maxWave){g.arena.active=false;addI("arena_trophy",1);giveXp("Attack",5000);giveXp("Strength",5000);addC("🏆 Arena complete! You defeated all 10 waves! Trophy awarded.");dirtyR.current=true;}else{g.arena.wave++;addC("⚔️ Wave "+g.arena.wave+"/"+g.arena.maxWave+" begins!");const waveMons=g.arena.wave<=3?["Goblin"]:g.arena.wave<=5?["Hobgoblin"]:g.arena.wave<=7?["Bandit"]:g.arena.wave<=9?["Moss Giant"]:["Cinderwake Colossus"];const waveCount=g.arena.wave<=9?5:1;const baseMon=g.mons.find(m=>m.nm===waveMons[0]);const newWave=[];for(let wi=0;wi<waveCount;wi++){const wm={...(baseMon||{nm:waveMons[0],c:"#f00",hp:30,mhp:30,atk:5,def:3,str:4,xp:10,drops:[],rsp:0,lvl:5}),x:38+wi*2,y:27,ox:40,oy:27,id:Math.random(),at:0,dead:false,agro:true,temp:true};g.mons.push(wm);newWave.push(wm);}g.arena.waveMonsters=newWave;dirtyR.current=true;}}}
      // Camp bank interest (Task 11 / Task 24)
      if(p.rep?.merchant>=25&&Math.floor(g.tk/3600000)!==Math.floor((g.tk-dt)/3600000)){const coins=p.inv.find(x=>x.i==="coins");if(coins)coins.c=Math.floor(coins.c*1.01);}
      // Faction rep: guard from White Knight kills tracked in doKill
      // Farming updates (Task 22)
      g.objects.forEach(o=>{if(o.t==="farm_patch"&&o.seed&&o.readyAt>0&&Date.now()>=o.readyAt&&!o.grown){o.grown=true;dirtyR.current=true;}});
      // Clear expired buffs
      if(p.buffs){Object.keys(p.buffs).forEach(k=>{if(Date.now()>=p.buffs[k].ends)delete p.buffs[k];});}
      // Prayer drain
      if(p.activePrayers&&p.activePrayers.length>0){
        const totalDrain=p.activePrayers.reduce((a,id)=>{const pr=PRAYERS.find(x=>x.id===id);return a+(pr?pr.drain:0);},0);
        const prayMult=p.unlocks?.includes("prayer_eff")?0.8:1;
        if(Math.floor(g.tk/1000)!==Math.floor((g.tk-dt)/1000)){p.prayer=Math.max(0,p.prayer-totalDrain/30*prayMult);}
        if(p.prayer<=0){p.activePrayers=[];addC("You have run out of Prayer points.");dirtyR.current=true;}
      }
      // World events
      if(Date.now()>=g.nextEventTime&&!g.worldEvent){
        const snapshot=getWorldSnapshot();
        const ev=getDynamicWorldEvent(snapshot);
        if(ev.monsterName){
          const base=g.mons.find(m=>m.nm===ev.monsterName&&!m.dead)||g.mons.find(m=>m.nm===ev.monsterName)||g.mons.find(m=>m.nm==="Goblin");
          for(let i=0;i<(ev.count||4);i++){
            const spawned=applySpawnState({...base,x:40+Math.floor(Math.random()*28),y:20+Math.floor(Math.random()*24),ox:40,oy:26,id:Math.random(),at:0,dead:false,agro:true,temp:true},"world");
            g.mons.push(spawned);
          }
        }else if(ev.merchant){
          g.tempMerchant={x:68,y:43,items:[{i:"rune_arrow",cost:15},{i:"emerald",cost:300},{i:"steel_sword",cost:200}]};
        }else if(ev.type==="sandstorm"){
          g.sandstorm=true;
        }
        addC(ev.msg);
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
      else if(p.runE<100){const agiBonus=lvl(p.sk.Agility)*0.001;const runRegen=p.unlocks?.includes("fast_run")?1.25:1;p.runE=Math.min(100,p.runE+dt*(0.004+agiBonus)*runRegen);}
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
            if(at.type==="talk"){
              // SIL: Oracle state machine — dialogue responds to sun brightness
              if(at.npc.nm==="The Oracle"){
                const br=sunBrightnessRef.current;
                const oracleDlg=br>75?["The sun still burns. For now.","But every death leaves a mark on it.","I count the graves. I count the dimming.","Keep your Sunstone Shard close, traveller."]:br>50?["The sun falters. Can you not feel the warmth fading?","The deaths mount. The light retreats.","We are running out of time, and most do not know it.","Your Sunstone Shard grows warmer. That is not coincidence."]:br>25?["The sun has passed its zenith and will not return without sacrifice.",""+Math.round(100-br)+"% of its light is already gone.","I have watched this world for centuries. This is the worst I have seen.","There is still time. Barely. Fight well."]:["The sun burns at "+Math.round(br)+"%. I pray you feel that weight.","I have seen this before. I did not survive it.","If the sun reaches zero, the season ends. All is shadow.","You are the last light, traveller. Do not waste it."];
                g.dlg={...at.npc,dlg:oracleDlg};
              }else{g.dlg=at.npc;}
              g.dlgL=0;p.actTgt=null;
              if(at.npc.quest==="cook"){
                if(p.quests.cook===0){p.quests.cook=1;addC("📜 Quest started: Mara's Hearth!");}
                else if(p.quests.cook===1&&hasI("egg")&&hasI("milk")&&hasI("flour")){
                  remI("egg");remI("milk");remI("flour");p.quests.cook=2;giveXp("Cooking",300);addI("coins",500);
                  addC("✅ Quest complete: Mara's Hearth!");addC("Reward: 300 Cooking XP, 500 coins.");
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
              else if(p.quests.rune===1&&runeCount>=10){remI("air_rune",10);p.quests.rune=2;giveXp("Magic",1000);addI("air_staff",1);addC("✅ Quest complete: The Rune Mystery!");addC("Reward: 1000 Magic XP, air staff.");completeQuest();}
              else if(p.quests.rune===1){const have=p.inv.reduce((a,x)=>x.i==="air_rune"?a+x.c:a,0);addC("Air runes in inventory: "+have+"/10. Find more on Dark Wizards.");}
            }
            if(at.npc.quest==="miner"){
              if(!p.quests.miner){p.quests.miner=1;addC("📜 Quest: Troubled Miner! Mine 5 mithril ore for Doric.");}
              else if(p.quests.miner===1){const have=p.inv.reduce((a,x)=>x.i==="mithril"?a+x.c:a,0)+p.bank.reduce((a,x)=>x.i==="mithril"?a+x.c:a,0);if(have>=5){remI("mithril",5);p.quests.miner=2;giveXp("Mining",1500);addI("steel_pick",1);addI("coins",600);addC("✅ Troubled Miner complete! +1500 Mining XP, steel pickaxe, 600gp.");completeQuest();}else addC("Mine more mithril: "+have+"/5.");}
            }
            if(at.npc.quest==="haunted"){
              if(!p.quests.haunted){p.quests.haunted=1;addC("📜 Quest: Haunted Forest! Kill 5 Necromancers for the Old Hermit.");}
              else if(p.quests.haunted===1){const kc=p.haunted||0;if(kc>=5){p.quests.haunted=2;giveXp("Prayer",800);addI("death_rune",20);addC("✅ Haunted Forest complete! +800 Prayer XP, 20 death runes.");completeQuest();}else addC("Necromancers slain: "+kc+"/5.");}
            }
            if(at.npc.quest==="karamja"){
              if(!p.quests.karamja){p.quests.karamja=1;addC("📜 Quest: Southern Isle Expedition! Kill 3 Jogres and return.");}
              else if(p.quests.karamja===1){const kc=p.jogreKills||0;if(kc>=3){p.quests.karamja=2;giveXp("Fishing",1200);addI("lobster",10);addI("coins",500);addC("✅ Southern Isle Expedition complete! +1200 Fishing XP, 10 lobsters.");completeQuest();}else addC("Jogres slain: "+kc+"/3.");}
            }
            if(at.npc.quest==="knight"){
              if(!p.quests.knight){p.quests.knight=1;addC("📜 Quest: Knight's Honor! Defeat 3 Lesser Demons for Sir Amik.");}
              else if(p.quests.knight===1){const kc=p.demonKills||0;if(kc>=3){p.quests.knight=2;giveXp("Defence",2000);addI("steel_plate",1);addC("✅ Knight's Honor complete! +2000 Defence XP, steel platebody.");completeQuest();}else addC("Lesser Demons slain: "+kc+"/3.");}
            }
            if(at.npc.quest==="relic"){
              if(!p.quests.relic){p.quests.relic=1;p.relicParts=0;addC("📜 Quest: Lost Relic! Find 3 relic parts scattered across the world.");}
              else if(p.quests.relic===1&&p.relicParts>=3){p.quests.relic=2;giveXp("Thieving",1500);giveXp("Agility",1500);addI("ring_wealth",1);addC("✅ Lost Relic complete! Ring of wealth, +1500 Thieving & Agility XP.");completeQuest();}
              else if(p.quests.relic===1){addC("Relic parts found: "+p.relicParts+"/3. Search chests and stalls.");}
            }
            if(at.npc.quest==="awakening"){
              if(!p.quests.awakening){p.quests.awakening=1;addC("📜 Quest: The Final Awakening! Defeat the Cinderwake Colossus 3 times.");}
              else if(p.quests.awakening===1){const kc=p.jadKills||0;if(kc>=3){p.quests.awakening=2;giveXp("Attack",5000);giveXp("Strength",5000);giveXp("Defence",5000);addI("dragon_bones",10);addI("coins",2000);addC("✅ The Final Awakening complete! +5000 Combat XP, dragon bones, 2000gp.");completeQuest();}else addC("Cinderwake Colossus defeated: "+kc+"/3.");}
            }
            if(at.npc.quest==="cook"&&p.quests.cook===2){checkAchievement("first_quest");}
            if(at.npc.quest==="desert"&&p.quests.desert===2){checkAchievement("first_quest");}
            if(at.npc.quest==="goblin"&&p.quests.goblin===2){checkAchievement("first_quest");}
            if(at.npc.quest==="shipment"){
              if(!p.quests.shipment){p.quests.shipment=1;p.shipmentFish=0;addC("📜 Quest: The Lost Shipment! Bring 10 lobsters and 5 swordfish to the Dock Master.");}
              else if(p.quests.shipment===1){
                const lob=p.inv.reduce((a,x)=>x.i==="lobster"?a+x.c:a,0)+p.bank.reduce((a,x)=>x.i==="lobster"?a+x.c:a,0);
                const sword=p.inv.reduce((a,x)=>x.i==="swordfish"?a+x.c:a,0)+p.bank.reduce((a,x)=>x.i==="swordfish"?a+x.c:a,0);
                if(lob>=10&&sword>=5){remI("lobster",Math.min(10,p.inv.reduce((a,x)=>x.i==="lobster"?a+x.c:a,0)));remI("swordfish",Math.min(5,p.inv.reduce((a,x)=>x.i==="swordfish"?a+x.c:a,0)));p.quests.shipment=2;giveXp("Fishing",2000);giveXp("Cooking",1000);addI("coins",800);addC("✅ The Lost Shipment complete! +2000 Fishing XP, +1000 Cooking XP, 800gp.");completeQuest();}
                else addC("Still need: "+(Math.max(0,10-lob))+" lobster, "+(Math.max(0,5-sword))+" swordfish.");
              }
            }
            if(at.npc.quest==="forge"){
              if(!p.quests.forge){p.quests.forge=1;addC("📜 Quest: The White Fort's Forge! Smith a mithril platebody for the Forgemaster.");}
              else if(p.quests.forge===1){const have=p.inv.some(x=>x.i==="mithril_plate")||p.bank.some(x=>x.i==="mithril_plate");if(have){remI("mithril_plate");p.quests.forge=2;giveXp("Smithing",3000);addI("adamant_bar",3);addC("✅ The White Fort's Forge complete! +3000 Smithing XP, 3 adamant bars.");completeQuest();}else addC("Bring me a mithril platebody. Smelt mithril bars at the furnace, then smith it at the anvil.");}
            }
            if(at.npc.quest==="wildernessHunt"){
              if(!p.quests.wildernessHunt){p.quests.wildernessHunt=1;p.iceWarriorKills=0;addC("📜 Quest: Ashlands Hunter! Kill 5 Ice Warriors in the Ashlands.");}
              else if(p.quests.wildernessHunt===1){const kc=p.iceWarriorKills||0;if(kc>=5){p.quests.wildernessHunt=2;giveXp("Attack",2500);giveXp("Strength",2500);addI("adamant_sword",1);addI("coins",1000);addC("✅ Ashlands Hunter complete! +2500 Atk/Str XP, adamant sword, 1000gp.");completeQuest();}else addC("Ice Warriors slain: "+kc+"/5. Head deep into the Ashlands (north).");}
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
            // Farming (Task 22)
            else if(at.type==="farm"){
              const o=at.obj;const fl=lvl(p.sk.Farming||0);
              if(o.grown&&o.seed){
                const sd=ITEMS[o.seed];
                if(fl<(sd?.lvl||1)){addC("Need Farming level "+(sd.lvl||1)+".");p.actTgt=null;return;}
                addI(sd.yields||"grimy_tarromin",1);giveXp("Farming",sd.xp||50);
                addC("You harvest: "+ITEMS[sd.yields||"grimy_tarromin"].n+".");
                o.seed=null;o.readyAt=0;o.grown=false;
              }else if(!o.seed){
                const seed=p.inv.find(x=>ITEMS[x.i]?.seed);
                if(!seed){addC("You need a seed to plant.");p.actTgt=null;return;}
                const sd=ITEMS[seed.i];
                if(fl<(sd.lvl||1)){addC("Need Farming level "+(sd.lvl||1)+".");p.actTgt=null;return;}
                o.seed=seed.i;o.readyAt=Date.now()+sd.grow;o.grown=false;
                const vi=p.inv.findIndex(x=>x.i===seed.i);if(vi>=0){if(p.inv[vi].c>1)p.inv[vi].c--;else p.inv.splice(vi,1);}
                addC("You plant a "+sd.n+". Return in "+(sd.grow/60000).toFixed(0)+" minutes.");
                giveXp("Farming",sd.xp*0.1|0);
              }else{addC("The patch is still growing...");}
              p.actTgt=null;
            }
            // Dungeon (Task 21 + Phase 4 roguelite)
            else if(at.type==="dungeon"){
              const isDailyRun=dailyRunRef.current&&!dailyRunRef.current.done;
              const isRogueRun=rogueRunRef.current&&!rogueRunRef.current.done;
              const activeRun=isRogueRun?rogueRunRef.current:isDailyRun?dailyRunRef.current:null;
              const snapshot=getWorldSnapshot();
              let room;
              if(isRogueRun){
                room=getRogueRoom(rogueRunRef.current.wave,rogueRunRef.current.rng);
                addC("⚔️ Roguelite — Wave "+(rogueRunRef.current.wave+1)+" · "+room.msg);
              }else if(isDailyRun){
                const roomIdx=dailyRunRef.current.rooms[dailyRunRef.current.wave];
                room=DUNGEON_ROOMS[roomIdx];
                const req=room.skillReq;if(req&&lvl(p.sk[req.skill]||0)<req.lvl){addC("Need "+req.skill+" level "+req.lvl+" to enter this room.");p.actTgt=null;return;}
                addC("☀️ Daily Rite — Wave "+(dailyRunRef.current.wave+1)+"/30 · "+room.msg);
              }else{
                room=DUNGEON_ROOMS[g.dungeon.room||0];
                addC(room.msg);
              }
              g.dungeon.active=true;
              const dungMons=[];const waveNum=isRogueRun?rogueRunRef.current.wave:0;
              room.monsters.forEach(md=>{const base=g.mons.find(m=>m.nm===md.nm&&!m.dead&&!m.dungeon);for(let di=0;di<(md.count||1);di++){let dm={...(base||{nm:md.nm,c:md.c||"#606",hp:md.hp||50,mhp:md.hp||50,atk:md.atk||8,def:md.def||5,str:md.str||7,xp:md.xp||30,drops:md.drops||[],rsp:0,lvl:md.lvl||10}),x:8+di*2,y:55+di,ox:8,oy:55,id:Math.random(),at:0,dead:false,agro:true,temp:true,dungeon:true};
              if(isRogueRun){const scaled=scaleRogueMon(dm,waveNum);Object.assign(dm,scaled);dm.rogueRun=true;}
              if(isDailyRun){dm.dailyRun=true;if(dailyRunRef.current.wave===29&&md.nm==="Shadow Drake")dm.nm=getDailyBossName();}
              dm=applySpawnState(dm,"dungeon");
              g.mons.push(dm);dungMons.push(dm);}});
              if(activeRun?.rival&&!activeRun.rivalSpawned){
                const rivalBase=g.mons.find(m=>m.nm===activeRun.rival.monsterName&&!m.dead&&!m.dungeon)||g.mons.find(m=>m.nm===activeRun.rival.monsterName)||g.mons.find(m=>m.nm==="Bandit")||g.mons[0];
                const rivalMon=spawnEchoRival(snapshot,rivalBase,isRogueRun?"roguelite":"daily");
                if(rivalMon){
                  g.mons.push(rivalMon);
                  dungMons.push(rivalMon);
                  activeRun.rivalSpawned=true;
                  addC(`${activeRun.rival.icon} ${activeRun.rival.playerName}'s echo invades this chamber.`);
                }
              }
              g.dungeon.monsters=dungMons;dirtyR.current=true;p.actTgt=null;
            }
            // Arena (Task 12)
            else if(at.type==="arena"){
              if(g.arena.active){addC("Arena is already active!");p.actTgt=null;return;}
              g.arena={active:true,wave:1,kills:0,maxWave:10,waveMonsters:[]};
              addC("⚔️ The Arena begins! Wave 1/10 - Goblins!");
              const waveBase=g.mons.find(m=>m.nm==="Goblin");const waveArr=[];
              for(let wi=0;wi<5;wi++){const wm=applySpawnState({...(waveBase||{nm:"Goblin",c:"#5a8a30",hp:13,mhp:13,atk:2,def:2,str:2,xp:5,drops:[{i:"coins",c:0.8,a:[3,25]}],rsp:0,lvl:2}),x:38+wi*2,y:27,ox:40,oy:27,id:Math.random(),at:0,dead:false,agro:true,temp:true},"world");g.mons.push(wm);waveArr.push(wm);}
              g.arena.waveMonsters=waveArr;dirtyR.current=true;p.actTgt=null;
            }
            // Camp bank (Task 24)
            else if(at.type==="camp_bank"){
              setBankOpen(true);p.actTgt=null;
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
            if(obj.sk==="Mining"){checkAchievement("first_ore");// Synergy: track self-mined ores (Task 17)
              if(!p.selfMinedOres)p.selfMinedOres={};p.selfMinedOres[obj.res]=(p.selfMinedOres[obj.res]||0)+1;}
            if(obj.sk==="Fishing")checkAchievement("first_fish");
            // Daily challenge tracking (Task 9)
            if(g.dailyChallenge&&!g.dailyChallenge.done){const dc=g.dailyChallenge;if((dc.type==="mine"&&dc.resource===obj.res)||(dc.type==="fish"&&dc.resource===obj.res)||(dc.type==="chop"&&dc.resource===obj.res)){dc.progress=(dc.progress||0)+1;p.dailyChallengeProgress=dc.progress;if(dc.progress>=dc.count){dc.done=true;giveXp(dc.skill,dc.xp);addI("coins",dc.reward);addC("📅 Daily challenge complete! +"+dc.xp+" "+dc.skill+" XP, +"+dc.reward+"gp!");checkAchievement("first_quest");}localStorage.setItem("solara_daily",JSON.stringify(dc));dirtyR.current=true;}}
            // Side quest tracking gather (Task 18)
            if(p.sideQuests){p.sideQuests.filter(sq=>sq.type==="gather"&&!sq.done&&sq.target===obj.res).forEach(sq=>{sq.progress++;if(sq.progress>=sq.count){sq.done=true;giveXp("Mining",sq.reward.xp||100);addI("coins",sq.reward.coins||50);addC("✅ Side quest complete! +"+sq.reward.coins+" coins.");}});}
            }
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
          // Fire synergy (Task 17): +10% XP cooking at own fire
          const isOwnFire=p.actTgt?.obj?.t==="fire"&&p.lastFireTile&&p.actTgt.obj.x===p.lastFireTile.x&&p.actTgt.obj.y===p.lastFireTile.y;
          const cookXp=Math.round(rec.xp*(isOwnFire?1.1:1));
          // burn_less unlock (Task 10): never burn if 20+ levels above req
          const neverBurn=p.unlocks?.includes("burn_less")&&cl>=rec.lvl+20;
          const successChance=0.4+cl*0.025;
          if(neverBurn||Math.random()<successChance){addI(rec.out,1);addC("You cook the "+ITEMS[raw].n+"."+(isOwnFire?" (fire synergy!)":""));giveXp("Cooking",cookXp);playSound("cook");p.cookCount=(p.cookCount||0)+1;if(p.cookCount>=50)checkAchievement("deep_cook");
            // Daily/side quest tracking
            if(g.dailyChallenge&&!g.dailyChallenge.done){const dc=g.dailyChallenge;if(dc.type==="cook"&&rec.out===dc.item){dc.progress=(dc.progress||0)+1;p.dailyChallengeProgress=dc.progress;if(dc.progress>=dc.count){dc.done=true;giveXp(dc.skill,dc.xp);addI("coins",dc.reward);addC("📅 Daily challenge complete!");}localStorage.setItem("solara_daily",JSON.stringify(dc));dirtyR.current=true;}}
            if(p.sideQuests){p.sideQuests.filter(sq=>sq.type==="cook"&&!sq.done&&sq.target===raw).forEach(sq=>{sq.progress++;if(sq.progress>=sq.count){sq.done=true;giveXp("Cooking",sq.reward.xp||100);addI("coins",sq.reward.coins||50);addC("✅ Side quest complete!");}});}
          }
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
        else if(hasI("rune_ore")&&p.inv.reduce((a,x)=>x.i==="coal"?a+x.c:a,0)>=4){if(lvl(p.sk.Smithing)<85){addC("Need Smithing level 85 to smelt rune.");p.act=null;}else{remI("rune_ore");remI("coal");remI("coal");remI("coal");remI("coal");addI("rune_bar",1);addC("You smelt a rune bar.");giveXp("Smithing",50);}}
        else if(hasI("iron")){remI("iron");if(Math.random()<0.5){addI("iron_bar",1);addC("You smelt an iron bar.");giveXp("Smithing",12);}else addC("The iron ore is impure...");}
        else{p.act=null;p.actTgt=null;addC("No ores to smelt.");}
      }}
      // Smithing (queue from modal, Task 3 multi-qty)
      if(smithQueueR.current){const {bar,rec,qty}=smithQueueR.current;
        if(qty>1&&smithQueueR.current.remaining==null)smithQueueR.current.remaining=qty;
        if(hasI(bar)){remI(bar);if(addI(rec.out,1)){
          // smithing synergy: if player self-mined this ore type (Task 17)
          const oreMap={bronze_bar:"copper",iron_bar:"iron",steel_bar:"iron",mithril_bar:"mithril",adamant_bar:"adamant_ore"};const ore=oreMap[bar];const bonusXp=ore&&p.selfMinedOres?.[ore]>0?5:0;if(bonusXp&&ore){p.selfMinedOres[ore]=Math.max(0,(p.selfMinedOres[ore]||0)-1);}
          addC("You smith: "+ITEMS[rec.out].n);giveXp("Smithing",rec.xp+bonusXp);
          // Daily challenge tracking
          if(g.dailyChallenge&&!g.dailyChallenge.done){const dc=g.dailyChallenge;if(dc.type==="smith"&&dc.item===rec.out){dc.progress=(dc.progress||0)+1;if(dc.progress>=dc.count){dc.done=true;giveXp(dc.skill,dc.xp);addI("coins",dc.reward);addC("📅 Daily challenge complete!");}localStorage.setItem("solara_daily",JSON.stringify(dc));dirtyR.current=true;}}
        }}
        else{addC("You no longer have the required bar.");smithQueueR.current=null;return;}
        if(smithQueueR.current){if(smithQueueR.current.remaining!=null){smithQueueR.current.remaining--;if(smithQueueR.current.remaining<=0)smithQueueR.current=null;}else smithQueueR.current=null;}
      }
      // Crafting (queue from modal, Task 3 multi-qty)
      if(craftQueueR.current){const {rec,qty}=craftQueueR.current.rec?craftQueueR.current:{rec:craftQueueR.current,qty:1};
        craftQueueR.current=null;
        const cl=lvl(p.sk.Crafting);
        if(cl<rec.lvl){addC("Need Crafting level "+rec.lvl+".");}
        else{const hasTool=hasI(rec.tool);if(!hasTool){addC("You need a "+ITEMS[rec.tool].n+" to craft this.");}
        else{let ok=true;Object.entries(rec.needs).forEach(([id,cnt])=>{if(!p.inv.find(x=>x.i===id&&x.c>=(cnt||1)))ok=false;});
          if(!ok){addC("You don't have the required materials.");}
          else{Object.entries(rec.needs).forEach(([id,cnt])=>remI(id,cnt));if(addI(rec.out,1)){addC("You craft: "+ITEMS[rec.out].n);giveXp("Crafting",rec.xp);checkAchievement("crafter");
          if(qty>1){const remaining=qty-1;const hasMats2=Object.entries(rec.needs).every(([id,cnt])=>p.inv.find(x=>x.i===id&&x.c>=(cnt||1)));if(hasMats2)craftQueueR.current={rec,qty:remaining};}}}}
      }
      // Combat
      if(p.act==="combat"&&p.cmb){
        const mon=p.cmb;if(mon.dead){p.act=null;p.cmb=null;p.actTgt=null;return;}
        const combatBonus=getCombatBonuses(p);
        if(mon.x>p.x)p.face="e";else if(mon.x<p.x)p.face="w";else if(mon.y>p.y)p.face="s";else p.face="n";
        const cw=p.eq.weapon?ITEMS[p.eq.weapon]:null;
        const attackRange=cw?.rng||(cw?.mgc?9:1);
        // Move closer if out of range
        if(dist(p,mon)>attackRange){if(p.path.length===0)p.path=pathToAdjacent(mon.x,mon.y);}
        p.at+=dt;
        if(p.at>=(cw?.aspd||2400)&&dist(p,mon)<=attackRange){p.at=0;
            const doKill=(tgtMon)=>{
              const km=tgtMon||mon;
              km.dead=true;addC("You killed the "+km.nm+"!");p.monsterKills=p.monsterKills||{};p.monsterKills[km.nm]=(p.monsterKills[km.nm]||0)+1;
              if(km.echoRival){
                addI("coins",150);
                giveXp("Attack",150);
                giveXp("Strength",150);
                addC("⚔️ Echo rival defeated. The chronicle answers with bonus spoils.");
              }
              // Combo meter reset (Task 25)
              p.comboMeter=0;p.lastCombatStyle=null;
            if(p.quests.desert===1&&km.nm==="Scorpion"){p.desertKills++;addC("Scorpions slain: "+p.desertKills+"/3.");}
            if(p.quests.goblin===1&&km.nm==="Goblin"){p.goblinKills++;addC("Goblins slain: "+p.goblinKills+"/5.");}
            if(km.nm==="Necromancer"&&p.quests.haunted===1){p.haunted=(p.haunted||0)+1;}
            if(km.nm==="Jogre"&&p.quests.karamja===1){p.jogreKills=(p.jogreKills||0)+1;}
            if(km.nm==="Lesser Demon"&&p.quests.knight===1){p.demonKills=(p.demonKills||0)+1;}
            if(km.nm==="Cinderwake Colossus"){p.jadKills=(p.jadKills||0)+1;if(p.quests.awakening===1)addC("Cinderwake Colossus defeated: "+p.jadKills+"/3.");checkAchievement("jad_killer");}
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
            // Faction rep updates (Task 11)
            if(km.nm==="White Knight"){p.rep.guard=(p.rep.guard||0)+0.1;p.rep.bandit=Math.max(0,(p.rep.bandit||0)-1);}
            if(km.nm==="Bandit"){p.rep.merchant=(p.rep.merchant||0)+1;}
            if(["Skeleton","Dark Wizard","Ice Warrior"].includes(km.nm)){p.rep.bandit=(p.rep.bandit||0)+1;}
            // Daily challenge kill tracking (Task 9)
            if(g.dailyChallenge&&!g.dailyChallenge.done){const dc=g.dailyChallenge;if(dc.type==="kill"&&dc.monster===km.nm){dc.progress=(dc.progress||0)+1;p.dailyChallengeProgress=dc.progress;if(dc.progress>=dc.count){dc.done=true;giveXp(dc.skill,dc.xp);addI("coins",dc.reward);addC("📅 Daily challenge complete! +"+dc.xp+" "+dc.skill+" XP!");}localStorage.setItem("solara_daily",JSON.stringify(dc));dirtyR.current=true;}}
            // Side quest kill tracking (Task 18)
            if(p.sideQuests){p.sideQuests.filter(sq=>sq.type==="kill"&&!sq.done&&sq.target===km.nm).forEach(sq=>{sq.progress++;if(sq.progress>=sq.count){sq.done=true;giveXp("Attack",sq.reward.xp||100);addI("coins",sq.reward.coins||50);addC("✅ Side quest complete!");}});}
            km.drops.forEach(d=>{
              let chance=d.c;
              // bandit_drops faction perk (Task 11): +10% drop rate in wilderness
              if(p.rep?.bandit>=25&&p.y<7)chance=Math.min(1,chance*1.1);
              if(Math.random()<chance){const a=d.a?d.a[0]+Math.floor(Math.random()*(d.a[1]-d.a[0])):1;
              // Lore codex pickup (Task 27)
              if(ITEMS[d.i]?.lore&&!p.codex?.includes(ITEMS[d.i].lore)){if(!p.codex)p.codex=[];p.codex.push(ITEMS[d.i].lore);addC("📜 Lore entry unlocked: "+ITEMS[d.i].n+"!");}
              dropToGround(d.i,a,km.x,km.y);addC("Drop: "+ITEMS[d.i]?.n+(a>1?" x"+a:""));if(d.i==="dragon_bones")checkAchievement("dragon_bone");}});
            // Auto-bury bones (Task 10: auto_bury unlock)
            if(p.unlocks?.includes("auto_bury")){const boneItem=km.drops.find(d=>d.i==="bones"||d.i==="big_bones"||d.i==="dragon_bones");if(boneItem&&Math.random()<boneItem.c){const xpAmt=boneItem.i==="dragon_bones"?72:boneItem.i==="big_bones"?15:4;giveXp("Prayer",xpAmt);addC("Bones auto-buried. +"+xpAmt+" Prayer XP.");}}
            if(km.rogueRun){
              // Roguelite run monster — remove permanently
              g.mons=g.mons.filter(m=>m.id!==km.id);
              if(!tgtMon){p.act=null;p.cmb=null;p.actTgt=null;}
            }else if(!km.dailyRun){
              if(!tgtMon){g.rspQ.push({mon:km,time:Date.now()+km.rsp});p.act=null;p.cmb=null;p.actTgt=null;}
              else g.rspQ.push({mon:km,time:Date.now()+km.rsp});
            }else{
              // Daily run monster — remove from world permanently, no respawn
              g.mons=g.mons.filter(m=>m.id!==km.id);
              if(!tgtMon){p.act=null;p.cmb=null;p.actTgt=null;}
            }
            dirtyR.current=true;
          }
          // Combo meter (Task 25)
          {const currentStyle=cw?.rng?"ranged":cw?.mgc?"magic":"melee";
          if(p.lastCombatStyle&&p.lastCombatStyle!==currentStyle){p.comboMeter=Math.min(3,(p.comboMeter||0)+1);}
          p.lastCombatStyle=currentStyle;}
          if(cw?.rng){
            // Ranged combat
            const arrowPrio=["rune_arrow","steel_arrow","iron_arrow","bronze_arrow"];
            const arrow=arrowPrio.find(a=>hasI(a));
            if(!arrow){addC("You have no arrows! Equip some to use a bow.");p.act=null;p.cmb=null;return;}
            remI(arrow,1);
            const rl=lvl(p.sk.Ranged);
            const prayRng=(p.activePrayers||[]).reduce((a,id)=>{const pr=PRAYERS.find(x=>x.id===id);return a+(pr?.rngBonus||0);},0);
            const rngBuff=p.buffs?.Ranged&&Date.now()<p.buffs.Ranged.ends?p.buffs.Ranged.amt:0;
            const hitC=p.eagleEye>0?1:Math.max(0.05,(0.32+(rl+rngBuff+combatBonus.attack)*0.016-mon.def*0.006+combatBonus.luck*0.01))*(1+prayRng);
            if(p.eagleEye>0)p.eagleEye--;
            // Weakness bonus (Task 15)
            const rngWeak=mon.weak==="ranged"?1.2:1;
            g.fx.push({type:"arrow",sx:p.x,sy:p.y,tx:mon.x,ty:mon.y,color:"#c8a860",life:400,age:0});
            if(Math.random()<hitC){
              let maxH=Math.max(1,Math.floor((rl+rngBuff+combatBonus.attack)*(0.55+prayRng*0.5)))+1;let hit=Math.floor(Math.random()*maxH*rngWeak)+1;
              // Combo strike (Task 25)
              if(p.comboMeter>=3){hit=Math.floor(hit*1.8);p.comboMeter=0;addC("💥 COMBO STRIKE! "+hit+" damage!");g.fx.push({type:"xp",x:mon.x,y:mon.y,text:"COMBO!",color:"#ff8000",life:1500,age:0,big:true});}
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
            const hitC=Math.max(0.05,0.38+(ml+combatBonus.attack)*0.013-mon.def*0.004+combatBonus.luck*0.01);
            const mgcWeak=mon.weak==="magic"?1.2:1;
            g.fx.push({type:"magic",sx:p.x,sy:p.y,tx:mon.x,ty:mon.y,color:isFireStaff?"#f86020":"#80a0ff",life:500,age:0});
            if(Math.random()<hitC){
              if(p.manaBurst){
                p.manaBurst=false;
                g.mons.filter(m=>!m.dead&&Math.abs(m.x-mon.x)<=3&&Math.abs(m.y-mon.y)<=3).forEach(m2=>{const h2=Math.max(1,Math.floor(Math.random()*spMax/2)+1);m2.hp-=h2;addHitSplat(m2.x,m2.y,h2,false);playSound("hit");if(m2.hp<=0)doKill(m2);});
              }else{
                let hit=Math.floor(Math.random()*(spMax+combatBonus.attack)*mgcWeak)+1;
                // Combo strike (Task 25)
                if(p.comboMeter>=3){hit=Math.floor(hit*1.8);p.comboMeter=0;addC("💥 COMBO STRIKE! "+hit+" damage!");g.fx.push({type:"xp",x:mon.x,y:mon.y,text:"COMBO!",color:"#ff8000",life:1500,age:0,big:true});}
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
            const al=Math.floor(lvl(p.sk.Attack)*(1+prayAtk))+buffAmt+combatBonus.attack,sl=Math.floor(lvl(p.sk.Strength)*(1+prayStr))+strBuff+combatBonus.strength;
            const wb=cw?{a:cw.atk||0,s:cw.str||0}:{a:0,s:0};
            const rb=p.eq.ring&&ITEMS[p.eq.ring]?.str?ITEMS[p.eq.ring].str:0;
            const hitC=Math.max(0.05,0.35+al*0.018+wb.a*0.013-mon.def*0.007+combatBonus.luck*0.01);
            const meleeWeak=mon.weak==="melee"?1.2:1;
            if(Math.random()<hitC){
              const maxH=Math.max(1,Math.floor(sl*0.55+wb.s*0.88+rb*0.75))+1;let hit=Math.floor(Math.random()*maxH*meleeWeak)+1;
              if(p.specialNext){hit*=2;p.specialNext=false;addC("⚡ Power Strike! "+hit+" damage!");}
              // Combo strike (Task 25)
              if(p.comboMeter>=3){hit=Math.floor(hit*1.8);p.comboMeter=0;addC("💥 COMBO STRIKE! "+hit+" damage!");g.fx.push({type:"xp",x:mon.x,y:mon.y,text:"COMBO!",color:"#ff8000",life:1500,age:0,big:true});}
              mon.hp-=hit;addHitSplat(mon.x,mon.y,hit,false);playSound("hit");
              if(mon.hp<=0)doKill();
            }else addHitSplat(mon.x,mon.y,0,false);
          }
        }
        if(!mon.dead){mon.at+=dt;if(mon.at>=2400){mon.at=0;
          const dl=lvl(p.sk.Defence);const db=(()=>{let d=0;["shield","head","body","legs"].forEach(s=>{if(p.eq[s])d+=(ITEMS[p.eq[s]].def||0);});return d;})();
          const prayDef=(p.activePrayers||[]).reduce((a,id)=>{const pr=PRAYERS.find(x=>x.id===id);return a+(pr?.defBonus||0);},0);
          const block=0.15+(dl+combatBonus.defence)*(0.018+prayDef*0.002)+db*0.01+prayDef*0.12;
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
              // Phase 4: Roguelite run death hook (before epitaph so endRogueRun handles grave)
              if(rogueRunRef.current&&!rogueRunRef.current.done){
                const run=rogueRunRef.current;
                endRogueRun(run.wave);
              }
              // Phase 2: Epitaph modal — queue grave, show modal (skip if roguelite already queued it)
              else{const wave=dailyRunRef.current&&!dailyRunRef.current.done?dailyRunRef.current.wave:0;
              submitEcho("death","A grave was cut into the ash",`${p.playerName||"Adventurer"} fell at (${deathX},${deathY}) and left another mark on the season.`,wave);
              setPendingGrave({x:deathX,y:deathY,wave,faction:getPlayerFaction(p),playerName:p.playerName||"Adventurer"});
              setShowEpitaphModal(true);}
              // Phase 1: Daily run death hook
              if(dailyRunRef.current&&!dailyRunRef.current.done){
                const run=dailyRunRef.current;
                run.done=true;run.deathWave=run.wave;
                run.shareCard=generateShareCard(p.playerName||"Adventurer",run.wave,getPlayerFaction(p));
                addC("💀 Daily Rite ended at Wave "+run.wave+". Score recorded.");
                submitEcho("daily","Daily Rite failed at Wave "+run.wave,`${p.playerName||"Adventurer"} reached Wave ${run.wave} in today's communal dungeon.`,run.wave);
                submitDailyScore(p.playerName||"Adventurer",run.wave,getPlayerFaction(p));
                g.dungeon={active:false,room:0,cleared:false,monsters:[]};
                g.mons=g.mons.filter(m=>!m.dailyRun);
                setDailyTick(n=>n+1);
              }
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
          // bandit_peace perk (Task 11)
          const isBanditPeace=m.nm==="Bandit"&&p.rep?.bandit>=10;
          if(aggroRange>0&&!isBanditPeace&&dist(m,p)<aggroRange&&!p.cmb){p.cmb=m;p.act="combat";p.at=0;p.path=[];p.actTgt=null;addC("⚠️ The "+m.nm+" attacks you!");return;}
          if(Math.random()<0.35){const dx=Math.floor(Math.random()*3)-1,dy=Math.floor(Math.random()*3)-1;
            const nx=m.x+dx,ny=m.y+dy;if(walkable(nx,ny)&&Math.abs(nx-m.ox)<6&&Math.abs(ny-m.oy)<6){m.x=nx;m.y=ny;}}
        });
      }
      // Phase 1: Daily run wave-advance check
      if(dailyRunRef.current&&!dailyRunRef.current.done&&g.dungeon.active){
        const aliveInDungeon=g.mons.filter(m=>m.dailyRun&&!m.dead);
        if(aliveInDungeon.length===0&&(g.dungeon.monsters||[]).length>0){
          const run=dailyRunRef.current;
          // Clean up dead daily run monsters
          g.mons=g.mons.filter(m=>!m.dailyRun);
          g.dungeon.monsters=[];
          run.wave++;
          if(run.wave>=30){
            run.done=true;run.deathWave=30;
            run.shareCard=generateShareCard(p.playerName||"Adventurer",30,getPlayerFaction(p));
            addC("🏆 Daily Rite complete! Wave 30 cleared! The sun brightens.");
            submitEcho("daily","Daily Rite completed",`${p.playerName||"Adventurer"} cleared all 30 waves of the Daily Rite.`,30);
            g.dungeon={active:false,room:0,cleared:true,monsters:[]};
            submitDailyScore(p.playerName||"Adventurer",30,getPlayerFaction(p));
          }else{
            const nextRoom=DUNGEON_ROOMS[run.rooms[run.wave]];
            addC("✅ Wave "+run.wave+" cleared! Entering Wave "+(run.wave+1)+"/30...");
            addC(nextRoom.msg);
            const dungMons=[];
            nextRoom.monsters.forEach(md=>{const base=g.mons.find(m=>m.nm===md.nm&&!m.dungeon&&!m.dead);for(let di=0;di<(md.count||1);di++){let dm={...(base||{nm:md.nm,c:"#606",hp:md.hp||50,mhp:md.hp||50,atk:md.atk||8,def:md.def||5,str:md.str||7,xp:md.xp||30,drops:md.drops||[],rsp:0,lvl:md.lvl||10}),x:8+di*2,y:55+di,ox:8,oy:55,id:Math.random(),at:0,dead:false,agro:true,temp:true,dungeon:true,dailyRun:true};if(run.wave===29&&md.nm==="Shadow Drake")dm.nm=getDailyBossName();dm=applySpawnState(dm,"dungeon");g.mons.push(dm);dungMons.push(dm);}});
            g.dungeon.monsters=dungMons;
          }
          dirtyR.current=true;setDailyTick(n=>n+1);
        }
      }
      // Phase 4: Roguelite wave-advance check
      if(rogueRunRef.current&&!rogueRunRef.current.done&&g.dungeon.active){
        const aliveRogue=g.mons.filter(m=>m.rogueRun&&!m.dead);
        if(aliveRogue.length===0&&(g.dungeon.monsters||[]).length>0){
          const run=rogueRunRef.current;
          g.mons=g.mons.filter(m=>!m.rogueRun);
          g.dungeon.monsters=[];
          run.wave++;
          addC("✅ Wave "+run.wave+" cleared! Entering Wave "+(run.wave+1)+"...");
          // Auto-enter next room
          const nextRoom=getRogueRoom(run.wave,run.rng);
          addC(nextRoom.msg);
          const dungMons=[];
          nextRoom.monsters.forEach(md=>{const base=g.mons.find(m=>m.nm===md.nm&&!m.dungeon&&!m.dead);for(let di=0;di<(md.count||1);di++){let dm={...(base||{nm:md.nm,c:md.c||"#606",hp:md.hp||50,mhp:md.hp||50,atk:md.atk||8,def:md.def||5,str:md.str||7,xp:md.xp||30,drops:md.drops||[],rsp:0,lvl:md.lvl||10}),x:8+di*2,y:55+di,ox:8,oy:55,id:Math.random(),at:0,dead:false,agro:true,temp:true,dungeon:true,rogueRun:true};const scaled=scaleRogueMon(dm,run.wave);Object.assign(dm,scaled);dm=applySpawnState(dm,"dungeon");g.mons.push(dm);dungMons.push(dm);}});
          g.dungeon.monsters=dungMons;
          dirtyR.current=true;setRogueTick(n=>n+1);
        }
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
      if(p.y>=22&&p.y<38&&p.x>=12&&p.x<32)curReg="SolarasRest";
      else if(p.y>=7&&p.y<20&&p.x>=12&&p.x<35)curReg="TheSanctum";
      else if(p.y>=35&&p.y<55&&p.x>=55)curReg="AlKharid";
      else if(p.y>=22&&p.y<30&&p.x>=36&&p.x<46)curReg="Barbarian";
      else if(p.y>=55&&p.x>=8&&p.x<24)curReg="Mine";
      else if(p.y>=18&&p.y<35&&p.x>=55)curReg="Fishing";
      else if(p.y>=55&&p.y<65&&p.x>=26&&p.x<40)curReg="Willowmere";
      else if(p.y>=35&&p.y<50&&p.x>=22&&p.x<38)curReg="Falador";
      else if(p.y>=47&&p.y<55&&p.x>=23&&p.x<32)curReg="MiningGuild";
      else if(p.y>=80&&p.x>=44&&p.x<72)curReg="Karamja";
      else if(p.y>=70&&p.x>=30&&p.x<45)curReg="Agility";
      else if(p.y>=45&&p.y<65&&p.x<14)curReg="DarkForest";
      if(curReg&&!p.visitedRegions.has(curReg)){p.visitedRegions.add(curReg);if(p.visitedRegions.size>=12)checkAchievement("explorer");}
      // Auto-save every 60s
      if(Math.floor(g.tk/60000)!==Math.floor((g.tk-dt)/60000)){try{
        localStorage.setItem("solara_save",JSON.stringify({ver:SAVE_VERSION,sk:p.sk,inv:p.inv,eq:p.eq,bank:p.bank,hp:p.hp,mhp:p.mhp,prayer:p.prayer,maxPrayer:p.maxPrayer,quests:p.quests,desertKills:p.desertKills,goblinKills:p.goblinKills||0,totalXp:p.totalXp,x:p.x,y:p.y,runE:p.runE,achievements:p.achievements,autoRetaliate:p.autoRetaliate,slayerTask:p.slayerTask,haunted:p.haunted,jogreKills:p.jogreKills,demonKills:p.demonKills,jadKills:p.jadKills,relicParts:p.relicParts,buffs:p.buffs,ironman:p.ironman,visitedRegions:[...p.visitedRegions],cookCount:p.cookCount,activePrayers:p.activePrayers||[],shipmentFish:p.shipmentFish||0,iceWarriorKills:p.iceWarriorKills||0,monsterKills:p.monsterKills||{},
          pet:p.pet,questPoints:p.questPoints||0,unlocks:p.unlocks||[],rep:p.rep||{guard:0,merchant:0,bandit:0},lastFireTile:p.lastFireTile,prestige:p.prestige||{},farmPatches:g.objects.filter(o=>o.t==="farm_patch").map(o=>({id:o.id,seed:o.seed,readyAt:o.readyAt,grown:o.grown})),playerName:p.playerName||"Adventurer",travelerSigil:p.travelerSigil||travelerSigilDraft,camp:p.camp,campBank:p.campBank||[],appearance:p.appearance||{skin:"#f0d8a0",hair:"#333",outfit:"#2266cc"},codex:p.codex||[],sideQuests:p.sideQuests||[],dailyChallengeProgress:p.dailyChallengeProgress||0,rogueliteStats:p.rogueliteStats||{bestWave:0,totalRuns:0,relics:[]}}));
        // Leaderboard (Task 23)
        const lb=JSON.parse(localStorage.getItem("solara_leaderboard")||"[]");const entry={name:p.playerName||"Adventurer",totalXp:p.totalXp,totalLvl:SKILLS.reduce((a,s)=>a+lvl(p.sk[s]||0),0),date:new Date().toLocaleDateString()};const existing=lb.find(e=>e.name===entry.name);if(existing){if(entry.totalXp>existing.totalXp)Object.assign(existing,entry);}else lb.push(entry);lb.sort((a,b)=>b.totalXp-a.totalXp);localStorage.setItem("solara_leaderboard",JSON.stringify(lb.slice(0,10)));
      }catch(e){}}

      // Update FX
      g.fx=g.fx.filter(f=>{f.age+=dt;return f.age<f.life;});
      // Camera
      g.cam=followCamera(g.cam.x,g.cam.y,p.x,p.y,cv);
    }
    } // end update()

    // === DRAW ===
    function draw(){
      const p=g.p;
      const {width,height,tilesX,tilesY}=getViewportMetrics(cv);
      const cx=Math.floor(g.cam.x),cy=Math.floor(g.cam.y);
      const offX=-Math.round((g.cam.x-cx)*TILE),offY=-Math.round((g.cam.y-cy)*TILE);
      c.clearRect(0,0,width,height);
      // Terrain
      for(let ty=0;ty<tilesY;ty++)for(let tx=0;tx<tilesX;tx++){
        const mx=cx+tx,my=cy+ty;
        const drawX=offX+tx*TILE,drawY=offY+ty*TILE;
        if(mx<0||mx>=MW||my<0||my>=MH){c.fillStyle="#0d0403";c.fillRect(drawX,drawY,TILE,TILE);continue;}
        const t=map[my][mx],cols=TC[t]||["#333"];c.fillStyle=cols[(mx*7+my*13)%cols.length];c.fillRect(drawX,drawY,TILE,TILE);
        // Rocky ground details (pebbles + cracks)
        if(t===T.G&&((mx*11+my*7)%17===0)){c.fillStyle="rgba(140,50,15,0.55)";c.beginPath();c.arc(drawX+10,drawY+18,3,0,6.28);c.fill();c.beginPath();c.arc(drawX+22,drawY+12,2,0,6.28);c.fill();c.beginPath();c.arc(drawX+16,drawY+24,2.5,0,6.28);c.fill();}
        if(t===T.G&&((mx*13+my*11)%23===0)){c.strokeStyle="rgba(60,15,5,0.45)";c.lineWidth=1;c.beginPath();c.moveTo(drawX+8,drawY+10);c.lineTo(drawX+18,drawY+20);c.stroke();c.beginPath();c.moveTo(drawX+20,drawY+8);c.lineTo(drawX+26,drawY+16);c.stroke();}
        // Desert details
        if(t===T.DESERT&&((mx*3+my*5)%11===0)){c.fillStyle="rgba(180,150,80,0.3)";c.fillRect(drawX+5,drawY+20,22,3);}
        // Water animation
        if(t===T.W){const wv=Math.sin(g.tk*0.002+mx*0.5+my*0.3)*8;c.fillStyle="rgba(80,150,220,0.15)";c.fillRect(drawX,drawY+12+wv,TILE,4);}
      }
      // Fires
      for(const f of g.fires){const sx=Math.round((f.x-g.cam.x)*TILE),sy=Math.round((f.y-g.cam.y)*TILE);if(sx<-TILE||sx>width+TILE||sy<-TILE||sy>height+TILE)continue;
        const flicker=Math.sin(g.tk*0.01+f.x)*3;
        c.fillStyle="#f80";c.beginPath();c.arc(sx+16,sy+16+flicker,8,0,6.28);c.fill();
        c.fillStyle="#ff0";c.beginPath();c.arc(sx+16,sy+14+flicker,5,0,6.28);c.fill();
        c.fillStyle="rgba(255,100,0,0.15)";c.beginPath();c.arc(sx+16,sy+16,18,0,6.28);c.fill();
      }
      // Ground items
      for(const gi of g.groundItems){const sx=Math.round((gi.x-g.cam.x)*TILE),sy=Math.round((gi.y-g.cam.y)*TILE);if(sx<-TILE||sx>width+TILE||sy<-TILE||sy>height+TILE)continue;
        c.fillStyle="rgba(255,120,0,0.2)";c.fillRect(sx+4,sy+16,24,16);
        c.font="14px sans-serif";c.textAlign="center";c.fillText(ITEMS[gi.i].i,sx+16,sy+28);
        c.font="bold 7px sans-serif";c.fillStyle="#ffe080";c.fillText(ITEMS[gi.i].n.substring(0,10),sx+16,sy+38);
      }
      // Objects
      for(const o of g.objects){
        const sx=Math.round((o.x-g.cam.x)*TILE),sy=Math.round((o.y-g.cam.y)*TILE);if(sx<-TILE||sx>width+TILE||sy<-TILE||sy>height+TILE)continue;
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
        if(o.t==="farm_patch"){
          const now2=Date.now();
          c.fillStyle="#6a4a20";c.fillRect(sx+2,sy+4,28,24);
          c.strokeStyle="#4a2a10";c.lineWidth=1;
          for(let r=0;r<4;r++){c.beginPath();c.moveTo(sx+2,sy+8+r*6);c.lineTo(sx+30,sy+8+r*6);c.stroke();}
          if(o.seed&&o.readyAt>0){
            if(now2>=o.readyAt){
              c.fillStyle="#4a8a20";c.fillRect(sx+4,sy+6,24,20);
              c.fillStyle="#6aaa30";for(let r=0;r<3;r++)for(let cc2=0;cc2<4;cc2++){c.beginPath();c.arc(sx+6+cc2*7,sy+12+r*6,2.5,0,6.28);c.fill();}
              c.fillStyle="#da0";c.font="bold 7px sans-serif";c.textAlign="center";c.fillText("READY!",sx+16,sy+34);
            } else {
              const prog=(now2-o.plantedAt)/(o.readyAt-o.plantedAt);
              c.fillStyle="#3a6a18";c.fillRect(sx+4,sy+6,Math.floor(24*prog),20);
              c.fillStyle="#5a8a28";c.font="7px sans-serif";c.textAlign="center";c.fillText("🌱"+(Math.floor(prog*100))+"%",sx+16,sy+34);
            }
          } else {
            c.fillStyle="#888";c.font="bold 7px sans-serif";c.textAlign="center";c.fillText("PATCH",sx+16,sy+20);
          }
        }
        if(o.t==="dungeon_entrance"){
          c.fillStyle="#2a1808";c.fillRect(sx+4,sy+4,24,26);
          c.fillStyle="#3a1a0a";c.fillRect(sx+10,sy+12,12,18);
          c.strokeStyle="#6040a0";c.lineWidth=2;c.strokeRect(sx+4,sy+4,24,26);
          c.fillStyle="#8060c0";c.font="bold 8px sans-serif";c.textAlign="center";c.fillText("⬇",sx+16,sy+24);
          c.fillStyle="#8060c0";c.font="bold 7px sans-serif";c.fillText("DUNGEON",sx+16,sy+36);
        }
        if(o.t==="arena"){
          c.fillStyle="#5a1808";c.beginPath();c.arc(sx+16,sy+16,14,0,6.28);c.fill();
          c.strokeStyle="#c8a84e";c.lineWidth=2;c.beginPath();c.arc(sx+16,sy+16,14,0,6.28);c.stroke();
          c.fillStyle="#da0";c.font="bold 9px sans-serif";c.textAlign="center";c.fillText("⚔",sx+16,sy+20);
          const arenaG=gR.current;if(arenaG?.arena?.active){c.fillStyle="#f44";c.font="bold 7px sans-serif";c.fillText("Wave "+arenaG.arena.wave,sx+16,sy+32);}
          else{c.fillStyle="#c8a84e";c.font="bold 7px sans-serif";c.fillText("ARENA",sx+16,sy+32);}
        }
      }
      // Monsters
      for(const m of g.mons){if(m.dead)continue;const sx=Math.round((m.x-g.cam.x)*TILE),sy=Math.round((m.y-g.cam.y)*TILE);if(sx<-TILE||sx>width+TILE||sy<-TILE||sy>height+TILE)continue;
        if(p.slayerTask&&m.nm===p.slayerTask.monster){c.strokeStyle="#ff8000";c.lineWidth=2.5;c.beginPath();c.arc(sx+16,sy+16,13,0,6.28);c.stroke();}
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
      for(const n of g.npcs){const sx=Math.round((n.x-g.cam.x)*TILE),sy=Math.round((n.y-g.cam.y)*TILE);if(sx<-TILE||sx>width+TILE||sy<-TILE||sy>height+TILE)continue;
        c.fillStyle="rgba(0,0,0,0.1)";c.beginPath();c.ellipse(sx+16,sy+28,8,3,0,0,6.28);c.fill();
        c.fillStyle=n.c;c.beginPath();c.arc(sx+16,sy+20,8,0,6.28);c.fill();
        c.fillStyle="#f0d8a0";c.beginPath();c.arc(sx+16,sy+10,7,0,6.28);c.fill();
        c.fillStyle="#333";c.beginPath();c.arc(sx+14,sy+9,1.5,0,6.28);c.fill();c.beginPath();c.arc(sx+18,sy+9,1.5,0,6.28);c.fill();
        c.fillStyle="#0ff";c.font="bold 9px sans-serif";c.textAlign="center";c.fillText(n.nm,sx+16,sy-2);
      }
      // Player
      const px=Math.round((p.x-g.cam.x)*TILE),py=Math.round((p.y-g.cam.y)*TILE);
      // Pet follower (Task 8) — drawn just behind player
      if(p.pet&&ITEMS[p.pet]){
        const petBob=Math.sin(g.tk*0.015+1)*2;
        c.font="16px sans-serif";c.textAlign="center";c.fillText(ITEMS[p.pet].i,px-18,py+30+petBob);
        c.fillStyle="rgba(255,200,80,0.15)";c.beginPath();c.arc(px-18,py+32,8,0,6.28);c.fill();
      }
      const skinC=p.appearance?.skin||"#f0d8a0";
      const hairC=p.appearance?.hair||"#333";
      const outfitC=p.appearance?.outfit||"#2266cc";
      c.fillStyle="rgba(0,0,0,0.12)";c.beginPath();c.ellipse(px+16,py+28,8,3,0,0,6.28);c.fill();
      const legC=p.eq.legs?"#6a5830":outfitC;c.fillStyle=legC;
      const walkAnim=p.path.length>0?Math.sin(g.tk*0.012)*3:0;
      c.fillRect(px+10,py+22-walkAnim,5,8);c.fillRect(px+17,py+22+walkAnim,5,8);
      const bodyC=p.eq.body?"#6a5a40":outfitC;c.fillStyle=bodyC;c.beginPath();c.arc(px+16,py+18,9,0,6.28);c.fill();
      // Arms swing in combat
      const swing=p.act==="combat"?Math.sin(g.tk*0.01)*6:0;
      c.fillStyle=bodyC;c.fillRect(px+2,py+14+swing,5,10);c.fillRect(px+25,py+14-swing,5,10);
      c.fillStyle=p.eq.head?"#6a6a6a":skinC;c.beginPath();c.arc(px+16,py+8,7,0,6.28);c.fill();
      if(!p.eq.head){const ed={n:[0,-1],s:[0,1],e:[1,0],w:[-1,0]}[p.face];
        c.fillStyle=hairC;c.beginPath();c.arc(px+14+ed[0],py+7+ed[1]*0.5,1.5,0,6.28);c.fill();
        c.beginPath();c.arc(px+18+ed[0],py+7+ed[1]*0.5,1.5,0,6.28);c.fill();
        c.fillStyle=hairC;c.fillRect(px+9,py+3,14,4);}
      else{c.fillStyle="#555";c.beginPath();c.arc(px+16,py+8,7.5,3.4,6.0);c.fill();}
      if(p.eq.weapon){const ed={n:[0,-1],s:[0,1],e:[1,0],w:[-1,0]}[p.face];
        c.strokeStyle="#b07030";c.lineWidth=2.5;c.beginPath();c.moveTo(px+26+ed[0]*3,py+12+swing);c.lineTo(px+26+ed[0]*10,py+4+swing);c.stroke();}
      if(p.eq.shield){c.fillStyle="#7a5a20";c.beginPath();c.arc(px+4,py+18-swing,5,0,6.28);c.fill();c.fillStyle="#9a7a30";c.beginPath();c.arc(px+4,py+18-swing,3,0,6.28);c.fill();}
      const playerLabel=p.playerName||"You";
      c.fillStyle="#0f0";c.font="bold 9px sans-serif";c.textAlign="center";c.fillText(playerLabel,px+16,py-12);
      c.fillStyle="#300";c.fillRect(px+4,py-9,24,5);c.fillStyle="#0c0";c.fillRect(px+4,py-9,24*p.hp/p.mhp,5);
      if(p.prayer>0){c.fillStyle="#114";c.fillRect(px+4,py-4,24,2);c.fillStyle="#48c";c.fillRect(px+4,py-4,24*p.prayer/p.maxPrayer,2);}
      // Combo meter dots (Task 25)
      if((p.comboMeter||0)>0){for(let ci=0;ci<3;ci++){c.fillStyle=ci<p.comboMeter?"#ff8000":"rgba(255,128,0,0.2)";c.beginPath();c.arc(px+10+ci*6,py-22,3,0,6.28);c.fill();}}
      // Action bar
      if(p.act==="gathering"||p.act==="cooking"||p.act==="smelting"||p.act==="smithing"){
        const total=p.actTgt?.obj?.tm||(p.act==="cooking"?1500:p.act==="smelting"?2200:1800);
        c.fillStyle="rgba(0,0,0,0.6)";c.fillRect(px-2,py+32,36,5);c.fillStyle="#ff0";c.fillRect(px-2,py+32,36*Math.min(1,p.actTm/total),5);
      }
      // Visual effects
      for(const f of g.fx){
        const fsx=Math.round((f.x-g.cam.x)*TILE)+16,fsy=Math.round((f.y-g.cam.y)*TILE);const alpha=1-f.age/f.life;
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
          const pfx=Math.round((f.sx-g.cam.x)*TILE)+16+(f.tx-f.sx)*TILE*t2;
          const pfy=Math.round((f.sy-g.cam.y)*TILE)+16+(f.ty-f.sy)*TILE*t2;
          c.globalAlpha=alpha;c.fillStyle=f.color;
          c.beginPath();c.arc(pfx,pfy,f.type==="magic"?5:2.5,0,6.28);c.fill();
          if(f.type==="magic"){c.fillStyle="#fff";c.beginPath();c.arc(pfx,pfy,2,0,6.28);c.fill();}
          c.globalAlpha=1;
        }
      }
      // NPC chatter bubbles
      for(const ch of g.npcChatter){const n=g.npcs.find(n2=>n2.id===ch.npcId);if(!n)continue;const sx=Math.round((n.x-g.cam.x)*TILE),sy=Math.round((n.y-g.cam.y)*TILE);if(sx<-TILE||sx>width+TILE||sy<-TILE||sy>height+TILE)continue;const alpha=Math.min(1,(ch.time-Date.now())/1000);c.globalAlpha=alpha;c.fillStyle="rgba(255,255,220,0.95)";const tw=c.measureText(ch.text).width+12;c.fillRect(sx+16-tw/2,sy-28,tw,16);c.fillStyle="#333";c.font="bold 8px sans-serif";c.textAlign="center";c.fillText(ch.text,sx+16,sy-17);c.globalAlpha=1;}
      // Temp merchant
      if(g.tempMerchant){const tm=g.tempMerchant;const sx=Math.round((tm.x-g.cam.x)*TILE),sy=Math.round((tm.y-g.cam.y)*TILE);if(sx>=-TILE&&sx<=width+TILE&&sy>=-TILE&&sy<=height+TILE){c.fillStyle="#a0c060";c.beginPath();c.arc(sx+16,sy+16,10,0,6.28);c.fill();c.fillStyle="#da0";c.font="bold 9px sans-serif";c.textAlign="center";c.fillText("Merchant",sx+16,sy-2);}}
      // Sandstorm overlay
      if(g.sandstorm){c.fillStyle="rgba(200,160,80,0.25)";c.fillRect(0,0,width,height);}
      // Night overlay
      const nightAlpha2=g.isNight?0.38:g.dayTime>0.6?(g.dayTime-0.6)/0.1*0.38:g.dayTime<0.15?(0.15-g.dayTime)/0.05*0.38:0;
      if(nightAlpha2>0){c.fillStyle=`rgba(0,10,30,${nightAlpha2})`;c.fillRect(0,0,width,height);}
      // Death tile marker
      if(g.deathTile&&Date.now()<g.deathTile.time){
        const sx=Math.round((g.deathTile.x-g.cam.x)*TILE),sy=Math.round((g.deathTile.y-g.cam.y)*TILE);
        const rem=Math.ceil((g.deathTile.time-Date.now())/1000);
        c.fillStyle="rgba(200,0,0,0.2)";c.fillRect(sx,sy,TILE,TILE);
        c.fillStyle="#f44";c.font="bold 8px sans-serif";c.textAlign="center";c.fillText("⚰️"+rem+"s",sx+16,sy+12);
      }
      // Dialogue
      if(g.dlg){const n=g.dlg;
        c.fillStyle="rgba(8,8,6,0.93)";c.fillRect(16,height-110,width-32,94);
        c.strokeStyle="#c8a84e";c.lineWidth=2;c.strokeRect(16,height-110,width-32,94);
        c.fillStyle="#ff0";c.font="bold 13px sans-serif";c.textAlign="left";c.fillText(n.nm+":",30,height-90);
        c.fillStyle="#ddd";c.font="12px sans-serif";c.fillText(n.dlg[Math.min(g.dlgL,n.dlg.length-1)],30,height-68);
        c.fillStyle="#888";c.font="10px sans-serif";c.fillText("Click to continue...",30,height-38);
      }
      // Location
      let loc="Ashlands";
      if(p.y>=22&&p.y<38&&p.x>=12&&p.x<32)loc="Solara's Rest";
      else if(p.y>=7&&p.y<20&&p.x>=12&&p.x<35)loc="The Sanctum";
      else if(p.y>=55&&p.x>=8&&p.x<24)loc="The Mine";
      else if(p.y>=18&&p.y<35&&p.x>=55)loc="Fishing Coast";
      else if(p.y>=45&&p.y<65&&p.x<14)loc="Dark Forest";
      else if(p.y>=35&&p.y<55&&p.x>=55)loc="The Amber District";
      else if(p.y>=22&&p.y<30&&p.x>=36&&p.x<46)loc="The Outlander Camp";
      else if(p.y>=55&&p.y<65&&p.x>=26&&p.x<40)loc="Ashfen";
      else if(p.y>=35&&p.y<50&&p.x>=22&&p.x<38)loc="The White Fort";
      else if(p.y>=47&&p.y<55&&p.x>=23&&p.x<32)loc="Mining Guild";
      else if(p.y>=80&&p.x>=44&&p.x<72)loc="The Southern Isle";
      else if(p.y>=70&&p.x>=30&&p.x<45)loc="Agility Course";
      else if(p.y>=35&&p.y<50&&p.x>=35&&p.x<50)loc="Fields";
      else if(p.y<7)loc="⚠️ The Ashlands";
      c.fillStyle="rgba(0,0,0,0.6)";c.fillRect(2,2,100,18);
      c.fillStyle=loc.includes("Ashlands")?"#f44":"#ff0";c.font="bold 10px sans-serif";c.textAlign="left";c.fillText(loc,6,14);
      // Minimap
      const ms=88,mmx=width-ms-4,mmy=4;
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
    // Mobile touch support (Task 13)
    let touchStartT=0,touchStartX=0,touchStartY=0;
    const onTouchStart=e=>{e.preventDefault();const t=e.touches[0];touchStartT=Date.now();touchStartX=t.clientX;touchStartY=t.clientY;};
    const onTouchEnd=e=>{e.preventDefault();const t=e.changedTouches[0];const dx=t.clientX-touchStartX,dy=t.clientY-touchStartY;if(Math.abs(dx)>5||Math.abs(dy)>5)return;// not a tap
      const held=Date.now()-touchStartT>500;const synth=new MouseEvent(held?"contextmenu":"click",{clientX:t.clientX,clientY:t.clientY,bubbles:true,cancelable:true});cv.dispatchEvent(synth);};
    cv.addEventListener("touchstart",onTouchStart,{passive:false});
    cv.addEventListener("touchend",onTouchEnd,{passive:false});
    fR.current=requestAnimationFrame(loop);
    return()=>{cancelAnimationFrame(fR.current);cv.removeEventListener("click",handleClick);cv.removeEventListener("contextmenu",handleRClick);cv.removeEventListener("touchstart",onTouchStart);cv.removeEventListener("touchend",onTouchEnd);window.removeEventListener("keydown",onKeyMove);if(resizeObs)resizeObs.disconnect();};
  },[addC,menuOpen,submitEcho,travelerNameDraft,travelerSigilDraft]);

  const g=gR.current,p=g?.player||g?.p;
  const supabase=supabaseRef.current;
  const cLvl=p?Math.floor((lvl(p.sk.Attack)+lvl(p.sk.Strength)+lvl(p.sk.Defence)+lvl(p.sk.Hitpoints))/4):1;
  const totalLvl=p?SKILLS.reduce((a,s)=>a+lvl(p.sk[s]),0):16;
  const hasExistingSave=(()=>{try{return !!localStorage.getItem("solara_save");}catch(e){return false;}})();
  const isFreshAdventurer=!!p&&(p.totalXp||0)<=0&&Object.values(p.quests||{}).every(v=>!v);
  const playedDailyToday=hasPlayedDailyToday(getDailySeed());
  const echoReactLocal=loadEchoReactions();
  const sharedWorld=getWorldSnapshot({sunBrightness,totalDeaths,playerName:p?.playerName||travelerNameDraft});
  const merchantPriceScale=getMerchantPriceScale(sharedWorld,p?.rep?.merchant||0);
  const hasSunstoneShard=!!p?.inv?.some(x=>x.i==="sunstone_shard");
  const worldActionItems=getWorldActionItems({sharedWorld,hasSunstoneShard});
  const firstSessionPlan=getFirstSessionPlan({player:p,isFreshAdventurer,playedDailyToday,backendConnected});
  const recentEchoGhosts=echoes.slice(0,3).map((echo,i)=>({id:echo.id||`ghost-${i}`,headline:echo.headline,player:echo.player_name||"Unknown",sigil:echo.traveler_sigil||"??",kind:echo.kind||"echo",offset:i,commend:echo.commend_count||0,heed:echo.heed_count||0,mourn:echo.mourn_count||0,reacted:echoReactLocal[echo.id]||null}));
  const objectiveState=getObjectiveState({
    player:p,
    isFreshAdventurer,
    dailyRun:dailyRunRef.current,
    rogueRun:rogueRunRef.current,
    sharedWorld,
    hasSunstoneShard,
  });
  const sharedWorldBriefing=getSharedWorldBriefing({
    sharedWorld,
    hasSunstoneShard,
    backendConnected,
    playedDailyToday,
    objectiveState,
  });
  const dailyDebrief=getRunDebrief({
    mode:"daily",
    run:dailyRunRef.current,
    sharedWorld,
    objectiveState,
    hasSunstoneShard,
  });
  const rogueDebrief=getRunDebrief({
    mode:"roguelite",
    run:rogueRunRef.current,
    sharedWorld,
    objectiveState,
    hasSunstoneShard,
  });
  const sessionDelta=getSessionDelta({
    sharedWorld,
    dailyRun:dailyRunRef.current,
    rogueRun:rogueRunRef.current,
    playedDailyToday,
    backendConnected,
    objectiveState,
    echoCount:echoes.length,
    graveCount:gravesRef.current.length,
  });
  const worldFeed=buildWorldFeed({
    sharedWorld,
    latestRun:dailyRunRef.current?.done?dailyRunRef.current:rogueRunRef.current?.done?rogueRunRef.current:null,
    backendConnected,
    echoCount:echoes.length,
    graveCount:gravesRef.current.length,
  });
  const handleWorldFeedAction=useCallback((item)=>{
    if(!item?.action)return;
    if(item.action.tab)setTab(item.action.tab);
    if(item.action.target){
      setMapOpen(true);
      setObjectivePosition(null);
      addC(`World feed marked a route near (${item.action.target.x}, ${item.action.target.y}).`);
    }else if(item.action.label){
      addC(`World feed: ${item.action.label}.`);
    }
  },[addC]);

  useEffect(()=>{
    if(!p)return;
    if((p.playerName||"Adventurer")!==travelerNameDraft||!p.travelerSigil){
      p.playerName=travelerNameDraft||p.playerName||"Adventurer";
      p.travelerSigil=p.travelerSigil||travelerSigilDraft;
      fr(n=>n+1);
    }
  },[p,travelerNameDraft,travelerSigilDraft]);

  useEffect(()=>{
    const onMove=e=>{
      if(objectiveDragRef.current){
        const width=340;
        const height=126;
        const nextX=clamp(e.clientX-objectiveDragRef.current.offsetX,12,Math.max(12,window.innerWidth-width-12));
        const nextY=clamp(e.clientY-objectiveDragRef.current.offsetY,hudHeight+12,Math.max(hudHeight+12,window.innerHeight-height-104));
        setObjectivePosition({x:nextX,y:nextY});
      }
      if(ghostDragRef.current){
        const width=220;
        const height=Math.min(240,Math.max(90,recentEchoGhosts.length*82));
        const nextX=clamp(e.clientX-ghostDragRef.current.offsetX,12,Math.max(12,window.innerWidth-width-12));
        const nextY=clamp(e.clientY-ghostDragRef.current.offsetY,hudHeight+12,Math.max(hudHeight+12,window.innerHeight-height-104));
        setGhostPosition({x:nextX,y:nextY});
      }
    };
    const stopDrag=()=>{objectiveDragRef.current=null;ghostDragRef.current=null;};
    window.addEventListener("pointermove",onMove);
    window.addEventListener("pointerup",stopDrag);
    return()=>{
      window.removeEventListener("pointermove",onMove);
      window.removeEventListener("pointerup",stopDrag);
    };
  },[hudHeight,recentEchoGhosts.length]);

  useEffect(()=>{
    const state={showGuide,showObjectiveTracker,showGhostHud,tooltipsOn,compactHud,panelOpen,showMenuReference,objectivePosition,ghostPosition};
    const match=LAYOUT_PRESETS.find(preset=>layoutBaseMatch(preset.config,state));
    if(match){setLayoutPreset(match.id);return;}
    const customMatch=Object.entries(customLayouts).find(([,entry])=>entry?.config&&layoutFullMatch(entry.config,state));
    setLayoutPreset(customMatch?customMatch[0]:"custom");
  },[compactHud,customLayouts,ghostPosition,objectivePosition,panelOpen,showGhostHud,showGuide,showMenuReference,showObjectiveTracker,tooltipsOn]);

  useEffect(()=>{
    audioOnR.current=audioEnabled;
    if(audioEnabled)initAudio();
    try{
      localStorage.setItem("solara_preferences",JSON.stringify({
        showGuide,
        panelOpen,
        uiScale,
        audioOn:audioEnabled,
        musicOn,
        showGhostHud,
        ghostPosition,
        showObjectiveTracker,
        objectivePosition,
        tooltipsOn,
        compactHud,
        showMenuReference,
        ambientMotion,
      }));
    }catch(e){}
  },[ambientMotion,audioEnabled,compactHud,ghostPosition,musicOn,objectivePosition,panelOpen,showGhostHud,showGuide,showMenuReference,showObjectiveTracker,tooltipsOn,uiScale]);

  function initAudio(){
    if(audioR.current)return;
    try{
      const ctx=new(window.AudioContext||window.webkitAudioContext)();
      audioR.current={ctx};
    }catch(e){}
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
    if(gR.current?.giveXp)gR.current.giveXp("Prayer",xpAmt);fr(n=>n+1);}
  function firemaking(idx){if(!p||!g)return;const s=p.inv[idx];if(!s)return;
    const logTypes={logs:{xp:40,lvl:1},oak_logs:{xp:60,lvl:15},willow_logs:{xp:90,lvl:30},yew_logs:{xp:202,lvl:60}};
    const lt=logTypes[s.i];if(!lt)return;if(!p.inv.some(x=>x.i==="tinderbox")){addC("You need a tinderbox.");return;}
    const fl=lvl(p.sk.Firemaking);if(fl<lt.lvl){addC("Need Firemaking level "+lt.lvl+".");return;}
    p.inv.splice(idx,1);g.fires.push({x:p.x,y:p.y,time:Date.now()+45000});addC("You light a fire.");
    p.lastFireTile={x:p.x,y:p.y};// Task 17 synergy tracking
    if(gR.current?.checkAch)gR.current.checkAch("fire_starter");
    // Task 6: Auto-cook on fire
    const rawFood=p.inv.find(x=>COOK_RECIPES[x.i]);if(rawFood){addC("You begin cooking on the fire.");p.act="cooking";p.actTm=0;p.actTgt={type:"cook",obj:{x:p.x,y:p.y,t:"fire"},raw:rawFood.i};}
    if(gR.current?.giveXp)gR.current.giveXp("Firemaking",lt.xp);fr(n=>n+1);}
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
  function doSmith(bar,rec,qty){if(!p)return;smithQueueR.current={bar,rec,qty:qty||1,remaining:qty||1};setSmithOpen(false);}
  function doCraft(rec,qty){if(!p)return;craftQueueR.current={rec,qty:qty||1};setCraftOpen(false);}
  function buyItem(si){if(!p)return;
    if(p.ironman){addC("Ironman mode: you cannot buy from shops.");return;}
    const liveCost=Math.max(1,Math.round(si.cost*merchantPriceScale));
    const coins=p.inv.find(x=>x.i==="coins");const have=coins?coins.c:0;if(have<liveCost){addC("Need "+liveCost+" coins.");return;}
    if(coins.c>liveCost)coins.c-=liveCost;else p.inv.splice(p.inv.indexOf(coins),1);
    if(ITEMS[si.i].s){const e=p.inv.find(x=>x.i===si.i);if(e){e.c++;fr(n=>n+1);return;}};if(p.inv.length>=28){addC("Inventory full.");return;}p.inv.push({i:si.i,c:1});addC("Bought: "+ITEMS[si.i].n);fr(n=>n+1);}
  function sellItem(itemId){if(!p)return;const price=SELL_PRICES[itemId]||5;const coins=p.inv.find(x=>x.i==="coins");if(coins)coins.c+=price;else{if(p.inv.length<28)p.inv.push({i:"coins",c:price});}const idx=p.inv.findIndex(x=>x.i===itemId);if(idx>=0){const s2=p.inv[idx];if(ITEMS[itemId].s&&s2.c>1)s2.c--;else p.inv.splice(idx,1);}addC("Sold "+ITEMS[itemId].n+" for "+price+" gp.");fr(n=>n+1);}
  function useHerblore(idx){if(!p||!gR.current)return;const g2=gR.current;const s=p.inv[idx];if(!s)return;
    // Grimy herbs → clean (Task 1)
    const grimyMap={herb:"clean_herb",grimy_tarromin:"tarromin",grimy_harralander:"harralander",grimy_kwuarm:"kwuarm"};
    if(grimyMap[s.i]){const hl=lvl(p.sk.Herblore||0);if(hl<1){addC("You need Herblore level 1.");return;}const cleanId=grimyMap[s.i];p.inv.splice(idx,1);if(p.inv.length<28)p.inv.push({i:cleanId,c:1});addC("You clean the herb.");const ol=lvl(p.sk.Herblore||0);p.sk.Herblore=(p.sk.Herblore||0)+3;p.totalXp+=3;const nl=lvl(p.sk.Herblore);if(nl>ol)addC("🎉 Herblore level "+nl+"!");g2.fx.push({type:"xp",x:p.x,y:p.y,text:"+3 Herblore",color:SKILL_COLORS.Herblore,life:1500,age:0});fr(n=>n+1);return;}
    if(s.i==="clean_herb"||s.i==="tarromin"||s.i==="harralander"||s.i==="kwuarm"){herbIdxR.current=idx;setHerbOpen(true);}
  }
  function doHerblore(rec){if(!p||!gR.current)return;const g2=gR.current;
    const hl=lvl(p.sk.Herblore||0);if(hl<rec.lvl){addC("Need Herblore level "+rec.lvl+".");setHerbOpen(false);return;}
    // Check all required ingredients (Task 1)
    const missingIngr=Object.entries(rec.needs).find(([id,cnt])=>!p.inv.find(x=>x.i===id&&x.c>=(cnt||1)));
    if(missingIngr){addC("Need: "+ITEMS[missingIngr[0]]?.n||missingIngr[0]);setHerbOpen(false);return;}
    if(!hasI_react("vial")){addC("Need a vial of water.");setHerbOpen(false);return;}
    // Remove all ingredients (vial is in rec.needs so remove it too)
    Object.entries(rec.needs).forEach(([id,cnt])=>{let toRem=cnt||1;for(let i=p.inv.length-1;i>=0&&toRem>0;i--){if(p.inv[i].i===id){const tk=Math.min(toRem,p.inv[i].c);p.inv[i].c-=tk;toRem-=tk;if(p.inv[i].c<=0)p.inv.splice(i,1);}}});
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
  function saveGame(){if(!p||!gR.current)return null;try{const payload=buildSavePayload({player:p,world:gR.current,saveVersion:SAVE_VERSION,fallbackSigil:travelerSigilDraft});localStorage.setItem("solara_save",JSON.stringify(payload));addC("Game saved!");return payload;}catch(e){addC("Save failed.");return null;}}
  function exportSaveFile(){try{const blob=new Blob([localStorage.getItem("solara_save")||"{}"],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="solara_save.json";a.click();}catch(e){addC("Export failed.");}}
  function importSavePayload(raw,{reload=true}={}){
    const sanitized=sanitizeSaveData(raw,travelerNameDraft||"Adventurer",travelerSigilDraft);
    if(!sanitized.data)throw new Error("invalid");
    localStorage.setItem("solara_save",JSON.stringify(sanitized.data));
    const body=sanitized.issues.length?`Imported with repairs:\n- ${sanitized.issues.join('\n- ')}`:"Save imported successfully.";
    addC(sanitized.issues.length?"Save imported with repairs.":"Save imported successfully.");
    showSystemNotice("Save Import",body,sanitized.issues.length?"#d8a84e":"#7fd37f");
    if(reload)window.location.reload();
    return sanitized;
  }
  function importSaveFile(file){
    if(!file)return;
    const r=new FileReader();
    r.onload=ev=>{
      try{
        const raw=JSON.parse(ev.target.result);
        importSavePayload(raw);
      }catch(err){
        addC("Import failed. Save file was invalid.");
        showSystemNotice("Import Failed","The selected file is not a valid Solara save.","#f06050");
      }
    };
    r.readAsText(file);
  }
  function autoEquipStarterLoadout(){
    if(!p)return;
    if((p.totalXp||0)>0)return;
    if(!p.eq.weapon){
      const wIdx=p.inv.findIndex(x=>x.i==="bronze_sword");
      if(wIdx>=0){p.eq.weapon="bronze_sword";p.inv.splice(wIdx,1);}
    }
    if(!p.eq.shield){
      const sIdx=p.inv.findIndex(x=>x.i==="wooden_shield");
      if(sIdx>=0){p.eq.shield="wooden_shield";p.inv.splice(sIdx,1);}
    }
  }
  function enterWorld(openTab){
    const identity=persistIdentity(travelerNameDraft,travelerSigilDraft);
    if(p){
      p.playerName=identity.name;
      p.travelerSigil=identity.sigil;
      autoEquipStarterLoadout();
      if(openTab)setTab(openTab);
      if(gR.current)gR.current.cam=getCenteredCam(p.x,p.y,cvR.current);
      saveGame();
    }
    // Show onboarding funnel for first-time players
    const onboardingDone=(()=>{try{return localStorage.getItem("solara_onboarding_done")==="1";}catch(e){return false;}})();
    if(!hasExistingSave&&!onboardingDone&&!openTab){
      setOnboardingStep(0);
      setMenuOpen(false);
      return;
    }
    setMenuOpen(false);
    setShowGuide(true);
    fr(n=>n+1);
  }
  function finishOnboarding(){
    try{localStorage.setItem("solara_onboarding_done","1");}catch(e){}
    setOnboardingStep(null);
    setShowGuide(true);
    fr(n=>n+1);
  }
  function startFreshChronicle(){
    requestConfirm({
      title:"Start Fresh Chronicle",
      body:"Your current local progress, offline task, daily challenge, and onboarding state will be cleared.",
      confirmLabel:"Start Fresh",
      danger:true,
      onConfirm:()=>{
        try{
          localStorage.removeItem("solara_save");
          localStorage.removeItem("solara_offline");
          localStorage.removeItem("solara_daily");
          localStorage.removeItem("solara_onboarding_done");
        }catch(e){}
        window.location.reload();
      },
    });
  }

  const invSlots=[];
  if(p)for(let i=0;i<28;i++){const s=p.inv[i];const d=s?ITEMS[s.i]:null;const isLog=s&&["logs","oak_logs","willow_logs","yew_logs"].includes(s.i);
    const statsText=d?[d.heal?`Heals: ${d.heal} HP`:null,d.atk?`Atk: +${d.atk}`:null,d.str?`Str: +${d.str}`:null,d.def?`Def: +${d.def}`:null,d.rng?`Rng: ${d.rng}`:null,d.mgc?"Magic weapon":null,d.buff?"Buff: "+d.buff.skill:null,d.pet?"Pet companion":null,d.seed?"Seed (farming)":null].filter(Boolean).join(" | "):null;
    invSlots.push(<div key={i} style={{width:38,height:38,background:s?"rgba(90,25,8,0.55)":"rgba(35,10,5,0.35)",border:"1px solid rgba(200,168,78,0.12)",display:"flex",alignItems:"center",justifyContent:"center",cursor:s?"pointer":"default",borderRadius:3,position:"relative",fontSize:17}}
      onMouseMove={e=>{if(s&&d)setTooltip({name:d.n+(s.c>1?" x"+s.c:""),stats:statsText,examine:d.examine,x:e.clientX,y:e.clientY});}}
      onMouseLeave={()=>setTooltip(null)}
      onClick={e=>{if(!s)return;if(bankOpen){bankDeposit(i,e);return;}if(sellOpen&&SELL_PRICES[s.i]){sellItem(s.i);return;}
        if(d.pet){const g2=gR.current;if(g2){const p2=g2.p;p2.pet=s.i;p2.inv.splice(i,1);addC("🐾 "+d.n+" now follows you!");fr(n=>n+1);}return;}
        if(d.buff||d.heal)eat(i);else if(d.slot)equip(i);else if(s.i==="bones"||s.i==="big_bones"||s.i==="dragon_bones")bury(i);else if(isLog&&p?.inv.some(x=>x.i==="knife"))setFletchOpen(true);else if(isLog)firemaking(i);else if(s.i==="herb"||s.i==="clean_herb"||s.i==="grimy_tarromin"||s.i==="grimy_harralander"||s.i==="grimy_kwuarm"||s.i==="tarromin"||s.i==="harralander"||s.i==="kwuarm")useHerblore(i);}}
      onContextMenu={e=>{e.preventDefault();if(!s)return;if(bankOpen){bankDeposit(i,e);return;}drop(i);}}
    >{s&&<span>{d.i}</span>}{s&&d.s&&s.c>1&&<span style={{position:"absolute",top:0,left:2,fontSize:8,color:"#ff0",fontWeight:700}}>{s.c>99999?"99k+":s.c}</span>}
      {s&&<span style={{position:"absolute",bottom:0,right:1,fontSize:6,color:"#aa9",maxWidth:34,overflow:"hidden",whiteSpace:"nowrap"}}>{d.n}</span>}
    </div>);}

  const guideStepLabel=getGuideStepLabel({
    player:p,
    isFreshAdventurer,
    dailyRun:dailyRunRef.current,
    rogueRun:rogueRunRef.current,
    sharedWorld,
    hasSunstoneShard,
  });
  const sidePanelWidth=panelOpen?210:0;
  const defaultObjectivePosition=typeof window==="undefined"?{x:12,y:96}:{x:window.innerWidth>900?window.innerWidth-372:12,y:window.innerHeight>760?window.innerHeight-176:96};
  const objectiveStyle=objectivePosition?{left:objectivePosition.x,top:objectivePosition.y}:{left:defaultObjectivePosition.x,top:defaultObjectivePosition.y};
  const resetObjectivePosition=()=>setObjectivePosition(null);
  const defaultGhostPosition=typeof window==="undefined"?{x:12,y:96}:{x:window.innerWidth>900?window.innerWidth-244:12,y:Math.max(hudHeight+18,96)};
  const ghostStyle=ghostPosition?{left:ghostPosition.x,top:ghostPosition.y}:{left:defaultGhostPosition.x,top:defaultGhostPosition.y};
  const resetGhostPosition=()=>setGhostPosition(null);
  const captureLayoutConfig=useCallback(()=>({
    showGuide,
    showObjectiveTracker,
    showGhostHud,
    tooltipsOn,
    compactHud,
    panelOpen,
    showMenuReference,
    objectivePosition,
    ghostPosition,
  }),[compactHud,ghostPosition,objectivePosition,panelOpen,showGhostHud,showGuide,showMenuReference,showObjectiveTracker,tooltipsOn]);
  const applyLayoutConfig=useCallback((config,label="custom")=>{
    if(!config)return;
    setLayoutPreset(label);
    setShowGuide(!!config.showGuide);
    setShowObjectiveTracker(!!config.showObjectiveTracker);
    setShowGhostHud(!!config.showGhostHud);
    setTooltipsOn(!!config.tooltipsOn);
    setCompactHud(!!config.compactHud);
    setPanelOpen(!!config.panelOpen);
    setShowMenuReference(!!config.showMenuReference);
    setObjectivePosition(config.objectivePosition&&Number.isFinite(config.objectivePosition.x)&&Number.isFinite(config.objectivePosition.y)?config.objectivePosition:null);
    setGhostPosition(config.ghostPosition&&Number.isFinite(config.ghostPosition.x)&&Number.isFinite(config.ghostPosition.y)?config.ghostPosition:null);
  },[]);
  const saveCustomLayout=useCallback((slot)=>{
    const label=(customLayoutDrafts[slot]||getDefaultCustomLayoutLabel(slot)).trim().slice(0,24)||getDefaultCustomLayoutLabel(slot);
    const next={
      ...customLayouts,
      [slot]:{
        id:slot,
        label,
        savedAt:new Date().toISOString(),
        config:captureLayoutConfig(),
      },
    };
    setCustomLayouts(next);
    setCustomLayoutDrafts(prev=>({...prev,[slot]:label}));
    saveCustomLayouts(next);
    setLayoutPreset(slot);
  },[captureLayoutConfig,customLayoutDrafts,customLayouts]);
  const loadCustomLayout=useCallback((slot)=>{
    const entry=customLayouts[slot];
    if(entry?.config)applyLayoutConfig(entry.config,slot);
  },[applyLayoutConfig,customLayouts]);
  const renameCustomLayout=useCallback((slot,label)=>{
    const clean=(label||"").trim().slice(0,24)||getDefaultCustomLayoutLabel(slot);
    setCustomLayoutDrafts(prev=>({...prev,[slot]:clean}));
    if(!customLayouts[slot])return;
    const next={
      ...customLayouts,
      [slot]:{
        ...customLayouts[slot],
        label:clean,
      },
    };
    setCustomLayouts(next);
    saveCustomLayouts(next);
  },[customLayouts]);
  const applyLayoutPreset=useCallback((presetId)=>{
    const preset=LAYOUT_PRESETS.find(item=>item.id===presetId);
    if(!preset)return;
    const cfg=preset.config;
    applyLayoutConfig(cfg,presetId);
    if(cfg.resetObjective)setObjectivePosition(null);
    if(cfg.resetGhost)setGhostPosition(null);
  },[applyLayoutConfig]);
  const exportLayout=useCallback(()=>{
    try{
      const cfg=captureLayoutConfig();
      const json=JSON.stringify({v:1,...cfg});
      const code=btoa(json);
      if(navigator.clipboard?.writeText)navigator.clipboard.writeText(code);
      addC("Layout code copied to clipboard. Share it with other players!","important");
    }catch(e){addC("Could not export layout.","error");}
  },[captureLayoutConfig,addC]);
  const importLayout=useCallback((code)=>{
    try{
      const json=atob(code.trim());
      const cfg=JSON.parse(json);
      if(!cfg||typeof cfg!=="object")throw new Error("bad");
      applyLayoutConfig(cfg,"imported");
      addC("Layout imported successfully!","important");
    }catch(e){addC("Invalid layout code.","error");}
  },[applyLayoutConfig,addC]);
  const startObjectiveDrag=e=>{
    if(e.target.closest("button"))return;
    const base=objectivePosition||defaultObjectivePosition;
    objectiveDragRef.current={offsetX:e.clientX-base.x,offsetY:e.clientY-base.y};
    e.preventDefault();
  };
  const startGhostDrag=e=>{
    if(e.target.closest("button"))return;
    const base=ghostPosition||defaultGhostPosition;
    ghostDragRef.current={offsetX:e.clientX-base.x,offsetY:e.clientY-base.y};
    e.preventDefault();
  };
  const hudButtonStyle={
    background:"rgba(20,10,8,0.95)",
    border:"1px solid #6a3012",
    color:"#f0c060",
    fontSize:compactHud?10:12,
    minWidth:compactHud?28:34,
    padding:compactHud?"4px 6px":"6px 8px",
    cursor:"pointer",
    borderRadius:6,
    fontWeight:700,
    lineHeight:1,
  };
  const styleModes=[
    {id:0,label:"Acc",desc:"Accurate style. Lean into hit chance and steadier melee contact."},
    {id:1,label:"Agg",desc:"Aggressive style. Pushes harder for damage momentum."},
    {id:2,label:"Def",desc:"Defensive style. Trade some pace for sturdier progression."},
  ];

  return (
    <div style={{width:"100vw",height:"100vh",background:"#120604",display:"flex",flexDirection:"column",overflow:"hidden",fontFamily:"'Segoe UI',sans-serif",userSelect:"none",zoom:uiScale}}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}@keyframes sunPulse{0%,100%{opacity:1;text-shadow:0 0 4px currentColor}50%{opacity:0.55;text-shadow:none}}`}</style>
      {/* HUD */}
      <div style={{minHeight:hudHeight,background:"linear-gradient(180deg,#341209,#1c0804)",borderBottom:"2px solid #7a2010",display:"flex",alignItems:"center",padding:compactHud?"4px 10px":"6px 12px",gap:12,flexShrink:0,overflow:"hidden"}}>
        <div style={{display:"flex",flexDirection:"column",minWidth:compactHud?160:220}}>
          <span style={{color:"#d4a030",fontWeight:900,fontSize:compactHud?17:20,letterSpacing:compactHud?2:3,fontFamily:"'Courier New',monospace",textShadow:"1px 1px 0 #7a2808,2px 2px 0 #2a0804",textTransform:"uppercase",lineHeight:1}}>Solara: Sunfall</span>
          {!compactHud&&<span style={{color:"#8f765c",fontSize:9,letterSpacing:1.2,textTransform:"uppercase"}}>Shared-sun roguelite chronicle</span>}
        </div>
        {p&&<>
          <div style={{display:"flex",alignItems:"center",gap:compactHud?6:8,flexWrap:"wrap"}}>
            <span style={{color:"#0c0",fontSize:compactHud?11:13}} title="Current health and max health">❤️{p.hp}/{p.mhp}</span>
            <span style={{color:"#4af",fontSize:compactHud?11:13}} title="Prayer points and max prayer">🙏{p.prayer}/{p.maxPrayer}</span>
            <button onClick={()=>{if(p)p.run=!p.run;fr(n=>n+1);}} style={{...hudButtonStyle,color:p.run?"#8cff88":"#aaa"}} title="Toggle run mode for faster movement at the cost of run energy" onMouseEnter={e=>showUiTooltip(e,"Run Mode","Sprint across the world faster while draining run energy.","Current: "+(p.run?"Enabled":"Disabled"))} onMouseLeave={clearUiTooltip}>{p.run?"🏃":"🚶"} {Math.floor(p.runE)}%</button>
            <span style={{color:"#da4",fontSize:compactHud?11:13}} title="Combat level">⚔️{cLvl}</span>
            <span style={{color:"#888",fontSize:compactHud?10:11}} title="Total combined skill level">Total {totalLvl}</span>
            {p.ironman&&<span style={{color:"#888",fontSize:compactHud?10:11}} title="Ironman mode is enabled">🔒</span>}
            {gR.current?.isNight?<span style={{fontSize:compactHud?11:13}} title="Night cycle active">🌙</span>:<span style={{fontSize:compactHud?11:13}} title="Day cycle active">☀️</span>}
            {supabase&&<span style={{fontSize:compactHud?10:11,color:sunBrightness>60?"#f0c040":sunBrightness>30?"#c08020":"#802010",fontWeight:700,animation:`sunPulse ${sunBrightness>80?'4s':sunBrightness>60?'3s':sunBrightness>40?'2s':sunBrightness>20?'1.2s':'0.7s'} ease-in-out infinite`}} title={`Global sun: ${sunBrightness.toFixed(1)}% · ${totalDeaths.toLocaleString()} deaths`}>☀{Math.round(sunBrightness)}%</span>}
            {deathMilestone&&<span style={{fontSize:8,color:"#f84",fontWeight:700,animation:"pulse 1s ease-in-out infinite",textShadow:"0 0 6px #f40"}}>☀ {deathMilestone.toLocaleString()} lives claimed</span>}
            {p.slayerTask&&<span style={{color:"#8a2020",fontSize:9}} title="Current Slayer assignment">🗡️{p.slayerTask.monster} {p.slayerTask.remaining}/{p.slayerTask.count}</span>}
          </div>
          <div style={{marginLeft:"auto",display:"flex",gap:compactHud?4:6,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
            <button onClick={()=>setMenuOpen(true)} style={hudButtonStyle} title="Open the main menu and reference pages" onMouseEnter={e=>showUiTooltip(e,"Main Menu","Jump back to Play, How To Play, Knowledge Base, Features, Update Log, and front-door settings.","No progress is lost.")} onMouseLeave={clearUiTooltip}>⌂</button>
            <button onClick={()=>setShowGuide(v=>!v)} style={{...hudButtonStyle,background:showGuide?"#3a2208":"rgba(20,10,8,0.95)"}} title="Show or hide the quickstart guidance overlay" onMouseEnter={e=>showUiTooltip(e,"Quickstart Overlay","Toggles the starter coaching card while you play.","Current: "+(showGuide?"Visible":"Hidden"))} onMouseLeave={clearUiTooltip}>?</button>
            <button onClick={()=>setPanelOpen(v=>!v)} style={{...hudButtonStyle,color:panelOpen?"#f0c060":"#8a755d"}} title="Toggle utility panel (Tab)" onMouseEnter={e=>showUiTooltip(e,"Utility Panel","Collapse or reopen the right-side interface tabs.","Shortcut: Tab")} onMouseLeave={clearUiTooltip}>☰</button>
            <button onClick={()=>{if(p){p.autoRetaliate=!p.autoRetaliate;fr(n=>n+1);}}} style={{...hudButtonStyle,color:p.autoRetaliate?"#ffde7a":"#9a8b74"}} title="Toggle auto-retaliate" onMouseEnter={e=>showUiTooltip(e,"Auto-Retaliate","Automatically counterattack monsters that hit you.","Current: "+(p.autoRetaliate?"Enabled":"Disabled"))} onMouseLeave={clearUiTooltip}>{p.autoRetaliate?"⚔️AR":"🚫AR"}</button>
            {styleModes.map(mode=><button key={mode.id} onClick={()=>{if(p)p.style=mode.id;fr(n=>n+1);}} style={{...hudButtonStyle,background:p.style===mode.id?"#5a1808":"rgba(20,10,8,0.95)",color:p.style===mode.id?"#ffef9d":"#c4a17b"}} title={mode.desc} onMouseEnter={e=>showUiTooltip(e,mode.label==="Acc"?"Accurate":mode.label==="Agg"?"Aggressive":"Defensive",mode.desc,"Combat style selector")} onMouseLeave={clearUiTooltip}>{mode.label}</button>)}
            <button onClick={saveGame} style={{...hudButtonStyle,background:"#1a3010",border:"1px solid #3a6020",color:"#74df74"}} title="Save your current chronicle immediately" onMouseEnter={e=>showUiTooltip(e,"Save Chronicle","Writes the current run, inventory, quests, and settings to local storage.","Safe manual checkpoint")} onMouseLeave={clearUiTooltip}>💾</button>
            <button onClick={exportSaveFile} style={{...hudButtonStyle,background:"#0a1a2a",border:"1px solid #2a4a6a",color:"#8ac7ff"}} title="Export your save to a JSON file" onMouseEnter={e=>showUiTooltip(e,"Export Save","Download a portable save backup you can keep outside the browser.","JSON export")} onMouseLeave={clearUiTooltip}>📤</button>
            <label style={{...hudButtonStyle,background:"#0a1a2a",border:"1px solid #2a4a6a",color:"#8ac7ff"}} title="Import a previously exported save file" onMouseEnter={e=>showUiTooltip(e,"Import Save","Load a JSON save backup into the current browser profile.","Repaired automatically when possible")} onMouseLeave={clearUiTooltip}>📥<input type="file" accept=".json" style={{display:"none"}} onChange={e=>importSaveFile(e.target.files[0])}/></label>
            <button onClick={()=>setAudioEnabled(v=>!v)} style={{...hudButtonStyle,background:"#0a1a0a",border:"1px solid #2a4a2a",color:audioEnabled?"#7ae0ff":"#7b8b93"}} title="Toggle sound effects" onMouseEnter={e=>showUiTooltip(e,"Sound Effects","Turns hit sounds, XP stings, and other feedback on or off.","Current: "+(audioEnabled?"Enabled":"Muted"))} onMouseLeave={clearUiTooltip}>{audioEnabled?"🔊":"🔇"}</button>
            <button onClick={()=>setMusicOn(v=>!v)} style={{...hudButtonStyle,background:"#10162a",border:"1px solid #304a7a",color:musicOn?"#a8beff":"#7b8297"}} title="Toggle ambient music" onMouseEnter={e=>showUiTooltip(e,"Ambient Music","Controls the evolving soundtrack tied to the sun phase.","Current: "+(musicOn?"Enabled":"Muted"))} onMouseLeave={clearUiTooltip}>{musicOn?"🎼":"🎵"}</button>
            <button onClick={()=>setMapOpen(v=>!v)} style={{...hudButtonStyle,background:"#0a1a2a",border:"1px solid #2a4a6a",color:"#8ac7ff"}} title="Open the world map and grave markers" onMouseEnter={e=>showUiTooltip(e,"World Map","Inspect regions, graves, shrines, and your current position.","Click graves for epitaphs")} onMouseLeave={clearUiTooltip}>🗺️</button>
          </div>
        </>}
      </div>
      {/* Main */}
      <div style={{flex:1,display:"flex",overflow:"hidden",minHeight:0,position:"relative"}}>
        <div ref={viewportHostR} style={{flex:1,display:"flex",alignItems:"stretch",justifyContent:"stretch",background:"#0d0403",position:"relative",minWidth:0,overflow:"hidden"}}>
          <canvas ref={cvR} width={CW} height={CH} style={{imageRendering:"pixelated",cursor:"crosshair",width:"100%",height:"100%",display:"block",border:"2px solid #5a1808",touchAction:"none",background:"#0d0403"}} />
          {showGuide&&p&&<div style={{position:"absolute",top:12,left:12,maxWidth:320,background:"rgba(10,4,3,0.92)",border:"1px solid rgba(200,168,78,0.35)",borderRadius:10,padding:"12px 14px",boxShadow:"0 12px 28px rgba(0,0,0,0.45)",zIndex:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,gap:12}}>
              <div>
                <div style={{color:"#f0c060",fontSize:12,fontWeight:800,letterSpacing:1}}>QUICKSTART</div>
                <div style={{color:"#88745a",fontSize:8}}>Playable route, controls, and next move</div>
              </div>
              <button onClick={dismissGuide} style={{background:"transparent",border:"none",color:"#775",cursor:"pointer",fontSize:12,padding:0,lineHeight:1}}>✕</button>
            </div>
            <div style={{color:"#ddd",fontSize:9,lineHeight:1.5,marginBottom:8}}>{guideStepLabel}</div>
            <div style={{display:"grid",gap:5,fontSize:8,color:"#9f9485",marginBottom:10}}>
              <div>Move: `WASD` / arrow keys or left-click the ground</div>
              <div>Interact: left-click an NPC, tree, rock, door, or monster</div>
              <div>Options: right-click anything for context actions</div>
              <div>Goal: use `☀️` for Daily Rite or `📜` for starter quests</div>
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              <button onClick={()=>{setTab("daily");setPanelOpen(true);}} style={{background:"linear-gradient(180deg,#3a1808,#241005)",border:"1px solid #c8a84e",color:"#f0c060",fontSize:8,padding:"4px 8px",cursor:"pointer",borderRadius:4,fontWeight:700}}>Open Daily</button>
              <button onClick={()=>{setTab("equip");setPanelOpen(true);}} style={{background:"#1c120a",border:"1px solid #5a3010",color:"#ddd",fontSize:8,padding:"4px 8px",cursor:"pointer",borderRadius:4,fontWeight:600}}>Open Gear</button>
              <button onClick={()=>{setTab("quest");setPanelOpen(true);}} style={{background:"#1c120a",border:"1px solid #5a3010",color:"#ddd",fontSize:8,padding:"4px 8px",cursor:"pointer",borderRadius:4,fontWeight:600}}>Open Quests</button>
            </div>
          </div>}
          {!showGuide&&p&&<div style={{position:"absolute",top:12,left:12,display:"flex",gap:8,alignItems:"center",background:"rgba(10,4,3,0.78)",border:"1px solid rgba(200,168,78,0.18)",borderRadius:999,padding:"6px 10px",zIndex:15}}>
            <span style={{fontSize:8,color:"#f0c060",fontWeight:700}}>Next:</span>
            <span style={{fontSize:8,color:"#c0b3a0"}}>{guideStepLabel}</span>
          </div>}
          {p&&objectiveState&&showObjectiveTracker&&<div onPointerDown={startObjectiveDrag} style={{position:"absolute",width:340,maxWidth:340,background:"rgba(10,4,3,0.9)",border:`1px solid ${objectiveState.accent}55`,borderRadius:12,padding:"10px 12px",boxShadow:"0 10px 26px rgba(0,0,0,0.35)",zIndex:16,cursor:"grab",touchAction:"none",...objectiveStyle}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:4}}>
              <div style={{fontSize:9,color:objectiveState.accent,fontWeight:800,letterSpacing:1}}>OBJECTIVE TRACKER</div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{fontSize:8,color:"#8f7d68"}}>{objectiveState.dir} · {objectiveState.distance} tiles</div>
                <button onClick={resetObjectivePosition} style={{background:"transparent",border:"1px solid rgba(200,168,78,0.16)",color:"#a89276",fontSize:8,padding:"2px 5px",cursor:"pointer",borderRadius:999}} title="Reset tracker position">⟲</button>
                <button onClick={()=>setShowObjectiveTracker(false)} style={{background:"transparent",border:"1px solid rgba(200,168,78,0.16)",color:"#a89276",fontSize:8,padding:"2px 5px",cursor:"pointer",borderRadius:999}} title="Hide objective tracker">✕</button>
              </div>
            </div>
            <div style={{fontSize:11,color:"#ddd",fontWeight:700,marginBottom:3}}>{objectiveState.title}</div>
            <div style={{fontSize:8,color:"#b8a994",lineHeight:1.5,marginBottom:8}}>{objectiveState.detail}</div>
            {objectiveState.steps&&<div style={{display:"grid",gap:3,marginBottom:8}}>
              {objectiveState.steps.map((step,i)=><div key={step} style={{fontSize:7,color:"#8f7d68",lineHeight:1.35}}>{i+1}. {step}</div>)}
            </div>}
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              <button onClick={()=>{setTab(objectiveState.tab);setPanelOpen(true);}} style={{background:"#1c120a",border:`1px solid ${objectiveState.accent}66`,color:objectiveState.accent,fontSize:8,padding:"4px 8px",cursor:"pointer",borderRadius:4,fontWeight:700}}>Open {objectiveState.tab}</button>
              <button onClick={()=>setMapOpen(true)} style={{background:"#120d18",border:"1px solid #5a4a7a",color:"#c8a0ff",fontSize:8,padding:"4px 8px",cursor:"pointer",borderRadius:4,fontWeight:600}}>Open Map</button>
            </div>
            <div style={{fontSize:7,color:"#7d6b5b",marginTop:7}}>Drag this card anywhere. Reset returns it to the default corner.</div>
            {saveHealthRef.current.issues.length>0&&<div style={{fontSize:7,color:"#c68856",lineHeight:1.45,marginTop:7}}>Save safety: {saveHealthRef.current.issues.join(" ")}</div>}
          </div>}
          {p&&showGhostHud&&recentEchoGhosts.length>0&&<div onPointerDown={startGhostDrag} style={{position:"absolute",width:220,display:"grid",gap:6,zIndex:16,cursor:"grab",touchAction:"none",...ghostStyle}}>
            {recentEchoGhosts.map(ghost=><div key={ghost.id} style={{background:"rgba(18,10,22,0.82)",border:"1px solid rgba(200,160,255,0.18)",borderRadius:10,padding:"8px 10px",boxShadow:"0 8px 22px rgba(0,0,0,0.28)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
                <div style={{fontSize:8,color:"#c8a0ff",fontWeight:800,letterSpacing:1}}>GHOST MANIFESTATION</div>
                <div style={{fontSize:7,color:"#7f6d95"}}>{ghost.sigil}</div>
              </div>
              <div style={{fontSize:9,color:"#ddd",marginTop:3,lineHeight:1.45}}>{ghost.headline}</div>
              <div style={{fontSize:7,color:"#8f82a3",marginTop:4}}>{ghost.player} · {ghost.kind}</div>
              <div onPointerDown={e=>e.stopPropagation()} style={{display:"flex",gap:3,marginTop:5}}>
                {!ghost.reacted&&<><button onClick={()=>reactToEcho(ghost.id,'commend')} style={{background:"rgba(180,255,80,0.07)",border:"1px solid rgba(180,255,80,0.2)",color:"#b0e060",fontSize:7,padding:"1px 5px",cursor:"pointer",borderRadius:3}}>✦{ghost.commend>0?` ${ghost.commend}`:""}</button><button onClick={()=>reactToEcho(ghost.id,'heed')} style={{background:"rgba(80,160,255,0.07)",border:"1px solid rgba(80,160,255,0.2)",color:"#60a0e0",fontSize:7,padding:"1px 5px",cursor:"pointer",borderRadius:3}}>👁{ghost.heed>0?` ${ghost.heed}`:""}</button><button onClick={()=>reactToEcho(ghost.id,'mourn')} style={{background:"rgba(180,80,200,0.07)",border:"1px solid rgba(180,80,200,0.2)",color:"#b070c0",fontSize:7,padding:"1px 5px",cursor:"pointer",borderRadius:3}}>✝{ghost.mourn>0?` ${ghost.mourn}`:""}</button></>}
                {ghost.reacted&&<span style={{color:"#7a6a90",fontSize:7}}>You {ghost.reacted}ed this echo.</span>}
              </div>
            </div>)}
            <div style={{display:"flex",justifyContent:"flex-end",gap:6}}>
              <button onClick={resetGhostPosition} style={{background:"transparent",border:"1px solid rgba(200,168,78,0.16)",color:"#a89276",fontSize:8,padding:"2px 5px",cursor:"pointer",borderRadius:999}} title="Reset ghost card position">⟲</button>
              <button onClick={()=>setShowGhostHud(false)} style={{background:"transparent",border:"1px solid rgba(200,168,78,0.16)",color:"#a89276",fontSize:8,padding:"2px 5px",cursor:"pointer",borderRadius:999}} title="Hide ghost cards">✕</button>
            </div>
            <div style={{fontSize:7,color:"#7d6b8d",textAlign:"right"}}>Drag this stack anywhere.</div>
          </div>}
          {/* Mobile D-pad (Task 13) */}
          {typeof window!=="undefined"&&/Mobi|Android/i.test(navigator.userAgent)&&p&&<div style={{position:"absolute",bottom:10,left:10,display:"grid",gridTemplateColumns:"repeat(3,40px)",gridTemplateRows:"repeat(3,40px)",gap:2,userSelect:"none"}}>
            {[["",null],["▲","n","ArrowUp"],["",null],["◄","w","ArrowLeft"],["·",null,null],["►","e","ArrowRight"],["",null],["▼","s","ArrowDown"],["",null]].map(([lbl,dir,key],i)=>dir?<button key={i} onTouchStart={e=>{e.preventDefault();if(key){const synth=new KeyboardEvent("keydown",{key,bubbles:true});window.dispatchEvent(synth);}}} onTouchEnd={e=>{e.preventDefault();if(key){const synth=new KeyboardEvent("keyup",{key,bubbles:true});window.dispatchEvent(synth);}}}
              style={{background:"rgba(30,10,5,0.85)",border:"1px solid #5a1808",color:"#c8a84e",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",borderRadius:4,touchAction:"none"}}>{lbl}</button>:<div key={i}/>)}
          </div>}
          {ctx_menu&&<div style={{position:"absolute",left:ctx_menu.x,top:ctx_menu.y,background:"rgba(12,4,2,0.97)",border:"1px solid #7a2010",borderRadius:4,minWidth:150,zIndex:50,boxShadow:"0 4px 24px rgba(0,0,0,0.8)"}}>
            <div style={{background:"#280e06",padding:"3px 8px",fontSize:8,color:"#888",letterSpacing:1}}>Choose Option</div>
            {ctx_menu.opts.map((o,i)=><div key={i} onClick={()=>{o.action();setCtx(null);}} style={{padding:"4px 10px",fontSize:11,color:o.color||"#ddd",cursor:"pointer",borderBottom:"1px solid rgba(90,74,48,0.2)"}}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(200,168,78,0.12)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>{o.label}</div>)}
          </div>}
        </div>
        {/* Side panel */}
        <div style={{width:sidePanelWidth,background:"linear-gradient(180deg,#1e0a06,#180804)",borderLeft:panelOpen?"2px solid #5a1808":"none",display:"flex",flexDirection:"column",flexShrink:0,transition:"width 0.2s ease",overflow:"hidden"}}>
          <div style={{display:"flex",borderBottom:"1px solid #5a1808"}}>
            {SIDE_PANEL_TABS.map(item=>{
              const pulse=item.id==="daily"&&!playedDailyToday&&(!dailyRunRef.current||dailyRunRef.current.done);
              return <button key={item.id} onClick={()=>setTab(item.id)} title={`${item.label} — ${item.desc}`} onMouseEnter={e=>showUiTooltip(e,item.label,item.desc,item.id==="daily"?"Includes Daily Rite, roguelite, and leaderboards.":"Panel tab")} onMouseLeave={clearUiTooltip} style={{flex:1,padding:"7px 0",background:tab===item.id?"#280e06":pulse?"rgba(120,72,12,0.32)":"transparent",border:"none",color:tab===item.id?"#c8a84e":pulse?"#f0c060":"#7a3b18",cursor:"pointer",fontSize:14,borderBottom:tab===item.id?"2px solid #c8a84e":"2px solid transparent",boxShadow:pulse?"inset 0 0 10px rgba(240,192,96,0.25)":"none",animation:pulse?"pulse 1.5s ease-in-out infinite":"none"}}>{item.icon}</button>;
            })}
          </div>
          <div style={{flex:1,overflow:"auto",padding:5}}>
            {tab==="inv"&&<div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:2}}>{invSlots}</div>
              <div style={{marginTop:6,padding:"4px 2px",borderTop:"1px solid rgba(200,168,78,0.1)"}}>
                <div style={{fontSize:8,color:"#c8a84e",fontWeight:700,marginBottom:3}}>⏰ Offline Task</div>
                <select value={offlineTaskSel} onChange={e=>setOfflineTaskSel(Number(e.target.value))} style={{width:"100%",background:"#1a0804",color:"#ddd",border:"1px solid #5a1808",fontSize:8,padding:2,borderRadius:3}}>
                  {OFFLINE_TASKS.map((t,i)=><option key={i} value={i}>{t.label}</option>)}
                </select>
                <button onClick={()=>{const t=OFFLINE_TASKS[offlineTaskSel];localStorage.setItem("solara_offline",JSON.stringify({task:t,leftAt:Date.now()}));addC("⏰ Offline task set: "+t.label);}} style={{marginTop:3,width:"100%",background:"#1a2010",border:"1px solid #3a5020",color:"#4c0",fontSize:8,padding:"2px 0",cursor:"pointer",borderRadius:3}}>Set & Activate</button>
              </div>
            </div>}
            {tab==="skills"&&p&&<div style={{display:"flex",flexDirection:"column",gap:2}}>
              {SKILLS.map(s=>{const l=lvl(p.sk[s]),cur=p.sk[s],nxt=xpLvl(l+1),prv=xpLvl(l),pct=l>=99?1:(cur-prv)/(nxt-prv);
                const track=xpTrackR.current[s]||[];const now=Date.now();
                const recent=track.filter(e=>now-e.t<3600000);
                let xphr=0;if(recent.length>=2){const el=(now-recent[0].t)/3600000;xphr=Math.round(recent.reduce((a,e)=>a+e.xp,0)/el);}
                const prestLvl=(p.prestige||{})[s]||0;
                return <div key={s} style={{background:"rgba(70,20,5,0.45)",padding:"3px 5px",borderRadius:3,border:"1px solid rgba(200,168,78,0.08)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:SKILL_COLORS[s]||"#c8a84e",fontWeight:600}}>
                    <span>{s}{prestLvl>0&&<span style={{color:"#da0",fontSize:7}}> ✦{prestLvl}</span>}</span>
                    <span>{l}/99</span>
                  </div>
                  <div style={{height:3,background:"#120604",borderRadius:2,marginTop:1}}><div style={{height:"100%",background:l>=99?"#da0":SKILL_COLORS[s]||"#4a8a2a",borderRadius:2,width:(pct*100)+"%",transition:"width 0.3s",opacity:0.8}}/></div>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:7,color:"#554",marginTop:1}}>
                    <span>{cur.toLocaleString()} / {l>=99?"--":nxt.toLocaleString()}</span>
                    {xphr>0&&<span style={{color:"#8a0"}}>{xphr>=1000?(xphr/1000).toFixed(1)+"k":xphr}/hr</span>}
                  </div>
                  {l>=99&&<button onClick={()=>{if(!p||!gR.current)return;requestConfirm({title:"Prestige "+s,body:"Reset "+s+" to level 1 for a permanent +1% XP bonus.",confirmLabel:"Prestige",onConfirm:()=>{const g2=gR.current;p.sk[s]=0;p.prestige=p.prestige||{};p.prestige[s]=(p.prestige[s]||0)+1;addC("✦ Prestige! "+s+" reset. Bonus: +"+(p.prestige[s])+"% XP");g2.fx.push({type:"xp",x:p.x,y:p.y,text:"PRESTIGE!",color:"#da0",life:2000,age:0,big:true});fr(n=>n+1);}});}} style={{marginTop:2,width:"100%",background:"linear-gradient(90deg,#3a2808,#1a1008)",border:"1px solid #da0",color:"#da0",fontSize:7,padding:"1px 0",cursor:"pointer",borderRadius:2,fontWeight:700}}>✦ Prestige {s}</button>}
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
              <div style={{width:"100%",borderTop:"1px solid rgba(200,168,78,0.12)",paddingTop:6,marginTop:4}}>
                <div style={{color:"#c8a84e",fontSize:9,fontWeight:700,marginBottom:3,textAlign:"center"}}>PET COMPANION</div>
                {p.pet?<div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(70,20,5,0.45)",padding:"4px 8px",borderRadius:4,border:"1px solid rgba(200,168,78,0.12)"}}>
                  <span style={{fontSize:18}}>{ITEMS[p.pet]?.i}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:9,color:"#da0",fontWeight:600}}>{ITEMS[p.pet]?.n}</div>
                    {ITEMS[p.pet]?.bonus&&<div style={{fontSize:7,color:"#8a0"}}>+{Math.round((ITEMS[p.pet].bonus.pct||0)*100)}% {ITEMS[p.pet].bonus.skill} XP</div>}
                  </div>
                  <button onClick={()=>{if(p.inv.length<28){p.inv.push({i:p.pet,c:1});p.pet=null;fr(n=>n+1);}else addC("Inventory full.");}} style={{background:"#3a1008",border:"1px solid #7a2010",color:"#c44",fontSize:7,padding:"2px 4px",cursor:"pointer",borderRadius:2}}>Remove</button>
                </div>:<div style={{fontSize:8,color:"#555",textAlign:"center"}}>No pet. Rare drops from bosses.</div>}
              </div>
            </div>}
            {tab==="quest"&&p&&<div style={{padding:4}}>
              <div style={{color:"#c8a84e",fontSize:10,fontWeight:700,letterSpacing:1,marginBottom:6}}>QUESTS ({Object.values(p.quests).filter(v=>v===2).length}/{Object.keys(p.quests).length})</div>
              {[
                {key:"cook",name:"Mara's Hearth",desc:p.quests.cook===0?"Talk to Mara in Solara's Rest.":p.quests.cook===1?"Find: egg, milk, flour.":"Complete!"},
                {key:"desert",name:"Desert Vow",desc:p.quests.desert===0?"Talk to Farris in The Amber District.":p.quests.desert===1?"Scorpions: "+(p.desertKills||0)+"/3":"Complete!"},
                {key:"goblin",name:"Goblin Trouble",desc:!p.quests.goblin?"Talk to Outlander Chief.":p.quests.goblin===1?"Goblins: "+(p.goblinKills||0)+"/5":"Complete!"},
                {key:"rune",name:"The Rune Mystery",desc:!p.quests.rune?"Talk to Sedridor in The Sanctum.":p.quests.rune===1?"Collect 10 air runes.":"Complete!"},
                {key:"miner",name:"Troubled Miner",desc:!p.quests.miner?"Talk to Stone-Reader at the mine.":p.quests.miner===1?"Mine 5 mithril ore.":"Complete!"},
                {key:"haunted",name:"Haunted Forest",desc:!p.quests.haunted?"Talk to Old Hermit (Dark Forest).":p.quests.haunted===1?"Necromancers: "+(p.haunted||0)+"/5":"Complete!"},
                {key:"karamja",name:"Southern Isle Expedition",desc:!p.quests.karamja?"Talk to Luthas in The Southern Isle.":p.quests.karamja===1?"Jogres: "+(p.jogreKills||0)+"/3":"Complete!"},
                {key:"knight",name:"Knight's Honor",desc:!p.quests.knight?"Talk to Sir Amik in The White Fort.":p.quests.knight===1?"Lesser Demons: "+(p.demonKills||0)+"/3":"Complete!"},
                {key:"relic",name:"Lost Relic",desc:!p.quests.relic?"Talk to Archaeologist in The Sanctum.":p.quests.relic===1?"Relic parts: "+(p.relicParts||0)+"/3":"Complete!"},
                {key:"awakening",name:"The Final Awakening",desc:!p.quests.awakening?"Talk to the Seer in The Sanctum.":p.quests.awakening===1?"Cinderwake Colossus: "+(p.jadKills||0)+"/3":"Complete!"},
                {key:"shipment",name:"The Lost Shipment",desc:!p.quests.shipment?"Talk to Dock Master in Ashfen.":p.quests.shipment===1?"Need 10 lobsters + 5 swordfish.":"Complete!"},
                {key:"forge",name:"The White Fort's Forge",desc:!p.quests.forge?"Talk to Forgemaster in The White Fort.":p.quests.forge===1?"Smith a mithril platebody.":"Complete!"},
                {key:"wildernessHunt",name:"Ashlands Hunter",desc:!p.quests.wildernessHunt?"Talk to Ashlands Scout (north).":p.quests.wildernessHunt===1?"Ice Warriors: "+(p.iceWarriorKills||0)+"/5":"Complete!"},
              ].map(q=><div key={q.key} style={{background:"rgba(70,20,5,0.45)",padding:"5px 8px",borderRadius:4,marginBottom:3,border:"1px solid rgba(200,168,78,0.08)"}}>
                <div style={{fontSize:10,color:p.quests[q.key]===2?"#0c0":p.quests[q.key]>=1?"#ff0":"#c44",fontWeight:600}}>{p.quests[q.key]===2?"✅":"📜"} {q.name}</div>
                <div style={{fontSize:8,color:"#888",marginTop:1}}>{q.desc}</div>
              </div>)}
              <div style={{color:"#c8a84e",fontSize:10,fontWeight:700,letterSpacing:1,marginTop:8,marginBottom:4}}>ACHIEVEMENTS ({(p.achievements||[]).length}/{ACHIEVEMENTS.length})</div>
              {ACHIEVEMENTS.map(a=>{const done=(p.achievements||[]).includes(a.id);return <div key={a.id} style={{background:"rgba(70,20,5,0.45)",padding:"3px 6px",borderRadius:3,marginBottom:2,border:"1px solid rgba(200,168,78,0.06)",opacity:done?1:0.4}}>
                <div style={{fontSize:9,color:done?"#da0":"#666",fontWeight:600}}>{a.icon} {a.name}</div>
                <div style={{fontSize:7,color:"#666"}}>{a.desc}</div>
              </div>;})}
              {/* Daily Challenge */}
              {(()=>{const dc=gR.current?.dailyChallenge;if(!dc)return null;
                const prog=p.dailyChallengeProgress||0;const pct=Math.min(1,prog/dc.count);
                return <div style={{marginTop:8}}>
                  <div style={{color:"#c8a84e",fontSize:10,fontWeight:700,letterSpacing:1,marginBottom:4}}>DAILY CHALLENGE ⭐</div>
                  <div style={{background:"rgba(40,20,5,0.6)",padding:"6px 8px",borderRadius:4,border:"1px solid rgba(200,168,78,0.15)"}}>
                    <div style={{fontSize:9,color:"#ff0",fontWeight:600}}>{dc.type==="cook"?"Cook "+dc.count+" "+ITEMS[dc.item]?.n:dc.type==="kill"?"Kill "+dc.count+" "+dc.monster:dc.type==="mine"?"Mine "+dc.count+" "+ITEMS[dc.resource]?.n:dc.type==="fish"?"Fish "+dc.count+" "+ITEMS[dc.resource]?.n:dc.type==="chop"?"Chop "+dc.count+" "+ITEMS[dc.resource]?.n:"Smith "+dc.count+" "+ITEMS[dc.item]?.n}</div>
                    <div style={{height:5,background:"#120604",borderRadius:2,marginTop:3}}><div style={{height:"100%",background:"#da0",borderRadius:2,width:(pct*100)+"%"}}/></div>
                    <div style={{fontSize:8,color:"#888",marginTop:2}}>{prog}/{dc.count} · Reward: +{dc.xp} XP & {dc.reward} gp</div>
                  </div>
                </div>;})()}
              {/* Side Quests */}
              {(p.sideQuests||[]).length>0&&<div style={{marginTop:8}}>
                <div style={{color:"#c8a84e",fontSize:10,fontWeight:700,letterSpacing:1,marginBottom:4}}>SIDE QUESTS</div>
                {(p.sideQuests||[]).map((sq,i)=><div key={i} style={{background:"rgba(70,20,5,0.45)",padding:"4px 6px",borderRadius:3,marginBottom:2,border:"1px solid rgba(200,168,78,0.06)"}}>
                  <div style={{fontSize:9,color:sq.done?"#0c0":"#c8a84e",fontWeight:600}}>{sq.done?"✅":"📋"} {sq.title}</div>
                  <div style={{fontSize:7,color:"#888",marginTop:1}}>{sq.desc}{!sq.done&&<span> ({sq.progress||0}/{sq.target})</span>}</div>
                </div>)}
              </div>}
              {/* Factions */}
              <div style={{marginTop:8}}>
                <div style={{color:"#c8a84e",fontSize:10,fontWeight:700,letterSpacing:1,marginBottom:4}}>FACTIONS</div>
                {Object.entries(FACTIONS).map(([key,f])=>{const rep=(p.rep||{})[key]||0;return <div key={key} style={{background:"rgba(70,20,5,0.45)",padding:"4px 8px",borderRadius:4,marginBottom:3,border:"1px solid rgba(200,168,78,0.08)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:f.color,fontWeight:600}}><span>{f.name}</span><span>{Math.floor(rep)} rep</span></div>
                  <div style={{height:3,background:"#120604",borderRadius:2,marginTop:2}}><div style={{height:"100%",background:f.color,borderRadius:2,width:Math.min(100,rep/50*100)+"%"}}/></div>
                  {f.rewards.map(r=><div key={r.id} style={{fontSize:7,color:rep>=r.rep?"#8a0":"#444",marginTop:2}}>{rep>=r.rep?"✅":"🔒"} {r.desc} (req: {r.rep})</div>)}
                </div>;})}
              </div>
              {/* Innovation #12: Faction Recruitment Share Card */}
              <div style={{marginTop:6}}>
                <button onClick={async()=>{const faction=getPlayerFaction(p);const card=generateFactionShareCard(faction,sunBrightness);if(navigator.share){try{await navigator.share({text:card});return;}catch(e){}}try{await navigator.clipboard.writeText(card);addC("📋 Faction card copied — recruit your side!");}catch(e){addC(card);}}} style={{width:"100%",background:"rgba(40,20,5,0.6)",border:"1px solid rgba(200,168,78,0.2)",color:"#c8a84e",fontSize:8,padding:"4px 0",cursor:"pointer",borderRadius:3,fontWeight:600}}>📣 Share Faction Card</button>
              </div>
              {/* Lore Codex */}
              {(p.codex||[]).length>0&&<div style={{marginTop:8}}>
                <div style={{color:"#c8a84e",fontSize:10,fontWeight:700,letterSpacing:1,marginBottom:4}}>LORE CODEX ({(p.codex||[]).length}/{LORE_ENTRIES.length})</div>
                {LORE_ENTRIES.filter(le=>(p.codex||[]).includes(le.id)).map(le=><div key={le.id} style={{background:"rgba(20,10,5,0.7)",padding:"4px 8px",borderRadius:3,marginBottom:3,border:"1px solid rgba(200,168,78,0.08)"}}>
                  <div style={{fontSize:8,color:"#888",fontStyle:"italic",lineHeight:1.4}}>{le.text}</div>
                  <div style={{fontSize:7,color:"#554",marginTop:2}}>— found on {le.monster}</div>
                </div>)}
              </div>}
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
            {tab==="bestiary"&&p&&<div style={{padding:4}}>
              <div style={{color:"#c8a84e",fontSize:10,fontWeight:700,letterSpacing:1,marginBottom:4}}>BESTIARY ({Object.keys(p.monsterKills||{}).length} discovered)</div>
              {(()=>{
                const allMons=genMons();
                const seen=new Map();
                allMons.forEach(m=>{if(!seen.has(m.nm))seen.set(m.nm,m);});
                return [...seen.values()].sort((a,b)=>a.lvl-b.lvl).map(m=>{
                  const kc=(p.monsterKills||{})[m.nm]||0;
                  return <div key={m.nm} style={{background:"rgba(70,20,5,0.45)",padding:"4px 6px",borderRadius:3,marginBottom:2,border:"1px solid rgba(200,168,78,0.08)",opacity:kc>0?1:0.45}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:10,color:kc>0?m.c:"#555",fontWeight:700}}>{kc>0?m.nm:"???"}</span>
                      <span style={{fontSize:8,color:"#888"}}>Lvl {m.lvl} · {kc>0?<span style={{color:"#da0"}}>{kc} kills</span>:"unseen"}</span>
                    </div>
                    {kc>0&&<div style={{fontSize:7,color:"#777",marginTop:1}}>HP:{m.mhp} Atk:{m.atk} Def:{m.def} Str:{m.str} · Weak: {m.weak||"none"}</div>}
                    {kc>0&&m.examine&&<div style={{fontSize:7,color:"#888",marginTop:1,fontStyle:"italic"}}>{m.examine}</div>}
                    {kc>0&&<div style={{fontSize:7,color:"#666",marginTop:1}}>Drops: {m.drops.slice(0,4).map(d=>{const it=ITEMS[d.i];const rate=d.c>=1?"always":d.c>=0.1?"common":d.c>=0.02?"uncommon":"rare";return (it?.n||d.i)+" ("+rate+")";}).join(", ")}{m.drops.length>4&&", ..."}</div>}
                  </div>;
                });
              })()}
            </div>}
            {tab==="daily"&&<div style={{display:"flex",flexDirection:"column",gap:6}}>
              {/* Header */}
              <div style={{textAlign:"center",borderBottom:"1px solid rgba(200,168,78,0.1)",paddingBottom:4}}>
                <div style={{color:"#c8a84e",fontSize:10,fontWeight:700,letterSpacing:1}}>☀️ DAILY RITE</div>
                <div style={{color:"#888",fontSize:7}}>Day {getDayNumber()} · {getDailySeed()}</div>
                <div style={{color:"#555",fontSize:7}}>Season {CURRENT_SEASON}: {CURRENT_SEASON_NAME}</div>
                {getDailyStreak(getDailySeed())>0&&<div style={{color:"#c8a84e",fontSize:8,marginTop:2,fontWeight:600}}>🔥 {getDailyStreak(getDailySeed())}-day streak</div>}
              </div>
              <SharedWorldStatus title="WORLD BRIEFING" briefing={sharedWorldBriefing} />
              <SessionDeltaCard delta={sessionDelta} />
              <WorldFeedCard feed={worldFeed} onAction={handleWorldFeedAction} />
              {sharedWorld.prophecy?.options?.length>0&&<div style={{background:"rgba(20,10,5,0.55)",border:"1px solid rgba(200,168,78,0.12)",borderRadius:4,padding:6,marginTop:-2,display:"grid",gap:3}}>
                <div style={{fontSize:8,color:"#c8a84e",fontWeight:700,letterSpacing:1}}>PROPHECY DECK</div>
                <div style={{fontSize:7,color:"#8f7d68",lineHeight:1.4}}>Active and alternate omens for today's world pressure.</div>
                <div style={{display:"grid",gap:3}}>
                  {sharedWorld.prophecy.options.map((card,i)=><div key={card.id} style={{background:i===0?"rgba(50,24,6,0.8)":"rgba(0,0,0,0.16)",border:"1px solid "+(i===0?card.accent:"rgba(200,168,78,0.08)"),borderRadius:4,padding:"4px 5px"}}>
                    <div style={{fontSize:7,color:card.accent,fontWeight:700}}>{i===0?"Active Prophecy":"Prophecy Option"}: {card.title}</div>
                    <div style={{fontSize:7,color:"#8f7d68",lineHeight:1.4,marginTop:1}}>{card.text}</div>
                  </div>)}
                </div>
              </div>}
              <div style={{background:"rgba(12,6,5,0.55)",border:"1px solid rgba(200,168,78,0.08)",borderRadius:4,padding:6,display:"grid",gap:4}}>
                <div style={{color:"#f0c060",fontSize:8,fontWeight:700,letterSpacing:1}}>BEST NEXT ACTIONS</div>
                {worldActionItems.map(item=><div key={item.title} style={{background:"rgba(0,0,0,0.16)",border:"1px solid rgba(200,168,78,0.06)",borderRadius:4,padding:"4px 5px"}}>
                  <div style={{fontSize:7,color:item.accent,fontWeight:700}}>{item.title}</div>
                  <div style={{fontSize:7,color:"#8f7d68",lineHeight:1.4,marginTop:1}}>{item.detail}</div>
                </div>)}
              </div>
              {/* Run state */}
              {!dailyRunRef.current&&<div>
                <button onClick={startDailyRun} style={{width:"100%",background:"linear-gradient(180deg,#3a1808,#280e04)",border:"2px solid #c8a84e",color:"#da0",fontSize:10,padding:"8px 4px",cursor:"pointer",borderRadius:4,fontWeight:700,marginBottom:3,boxShadow:!playedDailyToday?"0 0 14px rgba(240,192,96,0.28)":"none",animation:!playedDailyToday?"pulse 1.5s ease-in-out infinite":"none"}}>☀️ {playedDailyToday?"Replay Today's Dungeon":"Play Today's Dungeon"}</button>
                <div style={{fontSize:7,color:"#555",textAlign:"center",lineHeight:1.4}}>30 waves · seeded by today's date<br/>same dungeon for all players worldwide</div>
              </div>}
              {dailyRunRef.current&&!dailyRunRef.current.done&&<div style={{background:"rgba(40,20,5,0.6)",border:"1px solid #5a3010",borderRadius:4,padding:"6px 4px",textAlign:"center"}}>
                <div style={{color:"#da0",fontSize:12,fontWeight:700}}>⚔️ Wave {dailyRunRef.current.wave}/30</div>
                <div style={{fontSize:8,color:"#888",marginTop:2}}>Go to the dungeon entrance (south of The Mine)!</div>
                <div style={{height:4,background:"#120604",borderRadius:2,marginTop:4}}><div style={{height:"100%",background:"#c8a84e",borderRadius:2,width:((dailyRunRef.current.wave/30)*100)+"%"}}/></div>
              </div>}
              {dailyRunRef.current&&dailyRunRef.current.done&&<div style={{background:"rgba(40,20,5,0.6)",border:"1px solid rgba(200,168,78,0.2)",borderRadius:4,padding:6}}>
                <RunDebriefCard debrief={dailyDebrief} />
                <div style={{color:dailyRunRef.current.deathWave>=30?"#da0":"#f44",fontSize:11,fontWeight:700,textAlign:"center",marginBottom:4}}>
                  {dailyRunRef.current.deathWave>=30?"🏆 COMPLETED!":"💀 Wave "+dailyRunRef.current.deathWave+"/30"}
                </div>
                {dailyRunRef.current.shareCard&&<>
                  <pre style={{fontSize:7,color:"#8a7a5a",background:"rgba(0,0,0,0.4)",padding:4,borderRadius:3,marginBottom:4,whiteSpace:"pre-wrap",wordBreak:"break-word",fontFamily:"'Courier New',monospace"}}>{dailyRunRef.current.shareCard}</pre>
                  <button onClick={async()=>{const t=dailyRunRef.current.shareCard;if(navigator.share){try{await navigator.share({text:t});}catch(e){}}else{try{await navigator.clipboard.writeText(t);addC("📋 Score copied to clipboard!");}catch(e){addC("Copy failed — see above for your score card.");}};}} style={{width:"100%",background:"#1a3010",border:"1px solid #3a6020",color:"#4c0",fontSize:8,padding:"3px 0",cursor:"pointer",borderRadius:3,fontWeight:600}}>📋 Copy &amp; Share</button>
                  <button onClick={()=>{const p2=gR.current?.p;const run=dailyRunRef.current;const url=generateProphecyScrollPNG({playerName:p2?.playerName||travelerNameDraft,sigil:p2?.travelerSigil||travelerSigilDraft,waveReached:run.deathWave||0,faction:getPlayerFaction(p2),sunBrightness:sunBrightnessRef.current,type:'daily',dayNumber:getDayNumber()});if(url)shareProphecyScroll(url,'daily');}} style={{width:"100%",background:"#101a20",border:"1px solid #206080",color:"#60c0f0",fontSize:8,padding:"3px 0",cursor:"pointer",borderRadius:3,fontWeight:600,marginTop:3}}>📸 Download Scroll</button>
                </>}
              </div>}
              {/* Phase 4: Roguelite Run */}
              <div style={{borderTop:"1px solid rgba(200,168,78,0.08)",paddingTop:6,marginTop:4}}>
                <div style={{color:"#8060c0",fontSize:10,fontWeight:700,letterSpacing:1,textAlign:"center",marginBottom:3}}>⚔️ ROGUELITE RUN</div>
                {!rogueRunRef.current||rogueRunRef.current.done?<div>
                  <button onClick={startRogueRun} style={{width:"100%",background:"linear-gradient(180deg,#1a0830,#0e0418)",border:"2px solid #8060c0",color:"#c8a0ff",fontSize:10,padding:"8px 4px",cursor:"pointer",borderRadius:4,fontWeight:700,marginBottom:3}}>⚔️ Start Roguelite Run</button>
                  <div style={{fontSize:7,color:"#555",textAlign:"center",lineHeight:1.4}}>Infinite waves · difficulty scales · earn relics<br/>Boss every 10 waves · relics persist between runs</div>
                  {p&&<div style={{marginTop:4}}>
                    <div style={{fontSize:7,color:"#888"}}>Runs: {p.rogueliteStats?.totalRuns||0} · Best: Wave {p.rogueliteStats?.bestWave||0}</div>
                    {(p.rogueliteStats?.relics||[]).length>0&&<div style={{fontSize:7,color:"#c8a0ff",marginTop:2}}>Relics: {p.rogueliteStats.relics.map(rId=>{const r=RELICS.find(x=>x.id===rId);return r?r.i+" "+r.n:rId;}).join(", ")}</div>}
                    {(p.rogueliteStats?.relics||[]).length===0&&<div style={{fontSize:7,color:"#444",marginTop:2}}>No relics yet. Reach wave 10 to earn your first!</div>}
                  </div>}
                  {rogueRunRef.current&&rogueRunRef.current.done&&<div style={{background:"rgba(40,10,30,0.5)",border:"1px solid rgba(128,96,192,0.2)",borderRadius:4,padding:4,marginTop:3}}>
                    <RunDebriefCard debrief={rogueDebrief} />
                    <div style={{color:"#f44",fontSize:10,fontWeight:700,textAlign:"center"}}>💀 Fell at Wave {rogueRunRef.current.deathWave}</div>
                    {rogueRunRef.current.shareCard&&<>
                      <pre style={{fontSize:7,color:"#a996c8",background:"rgba(0,0,0,0.28)",padding:4,borderRadius:3,marginTop:4,whiteSpace:"pre-wrap",wordBreak:"break-word",fontFamily:"'Courier New',monospace"}}>{rogueRunRef.current.shareCard}</pre>
                      <button onClick={async()=>{const t=rogueRunRef.current.shareCard;if(navigator.share){try{await navigator.share({text:t});return;}catch(e){}}try{await navigator.clipboard.writeText(t);addC("📋 Roguelite share card copied.");}catch(e){addC("Copy failed — share card shown above.");}}} style={{width:"100%",background:"#241038",border:"1px solid #8060c0",color:"#c8a0ff",fontSize:8,padding:"3px 0",cursor:"pointer",borderRadius:3,fontWeight:600,marginTop:4}}>📋 Copy Roguelite Share</button>
                      <button onClick={()=>{const p2=gR.current?.p;const run=rogueRunRef.current;const url=generateProphecyScrollPNG({playerName:p2?.playerName||travelerNameDraft,sigil:p2?.travelerSigil||travelerSigilDraft,waveReached:run.deathWave||0,faction:getPlayerFaction(p2),sunBrightness:sunBrightnessRef.current,type:'roguelite',bestWave:p2?.rogueliteStats?.bestWave||0,relicCount:(p2?.rogueliteStats?.relics||[]).length});if(url)shareProphecyScroll(url,'roguelite');}} style={{width:"100%",background:"#180a28",border:"1px solid #604090",color:"#b090e0",fontSize:8,padding:"3px 0",cursor:"pointer",borderRadius:3,fontWeight:600,marginTop:3}}>📸 Download Scroll</button>
                    </>}
                  </div>}
                </div>:<div style={{background:"rgba(40,10,30,0.5)",border:"1px solid #8060c0",borderRadius:4,padding:"6px 4px",textAlign:"center"}}>
                  <div style={{color:"#c8a0ff",fontSize:12,fontWeight:700}}>⚔️ Wave {rogueRunRef.current.wave+1}</div>
                  <div style={{fontSize:8,color:"#888",marginTop:2}}>Go to the dungeon entrance!</div>
                  <div style={{fontSize:7,color:"#555",marginTop:2}}>Difficulty: {rogueRunRef.current.wave<10?"Normal":rogueRunRef.current.wave<20?"Hard":rogueRunRef.current.wave<30?"Brutal":"Nightmare"}</div>
                </div>}
              </div>
              {/* Leaderboard */}
              <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                  <div style={{color:"#c8a84e",fontSize:9,fontWeight:700}}>TODAY'S TOP RUNS</div>
                  <button onClick={fetchDailyLeaderboard} style={{background:"transparent",border:"none",color:"#6af",fontSize:9,cursor:"pointer",padding:0}} title="Refresh leaderboard">↻</button>
                </div>
                {!supabase&&<div style={{fontSize:7,color:"#444",textAlign:"center",lineHeight:1.4}}>Leaderboard available once<br/>Supabase is configured.</div>}
                {supabase&&dailyLbRef.current.length===0&&<div style={{fontSize:7,color:"#555",textAlign:"center"}}>No scores yet today. Be the first!</div>}
                {(()=>{const lb=dailyLbRef.current;if(!lb.length)return null;const factions={sunkeeper:{label:"☀ Sunkeepers",color:"#f0c040",entries:[]},eclipser:{label:"🌑 Eclipsers",color:"#8060c0",entries:[]},neutral:{label:"⚖ Unaligned",color:"#888",entries:[]}};lb.forEach(e=>{const f=e.faction==='sunkeeper'?'sunkeeper':e.faction==='eclipser'?'eclipser':'neutral';factions[f].entries.push(e);});return Object.entries(factions).filter(([,v])=>v.entries.length>0).map(([k,v])=><div key={k} style={{marginBottom:3}}>
                  <div style={{fontSize:7,color:v.color,fontWeight:700,marginBottom:1}}>{v.label}</div>
                  {v.entries.map((e,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:8,color:i===0?v.color:"#777",padding:"1px 4px",borderBottom:"1px solid rgba(200,168,78,0.04)"}}>
                    <span>{e.player_name}</span><span style={{color:e.wave_reached>=30?"#da0":"inherit"}}>W{e.wave_reached}{e.wave_reached>=30?" 🏆":""}</span>
                  </div>)}
                </div>);})()}
              </div>
              {/* Innovation #5: Faction Rivalry Dashboard */}
              <div style={{borderTop:"1px solid rgba(200,168,78,0.08)",paddingTop:6,marginTop:4}}>
                <div style={{color:"#c8a84e",fontSize:9,fontWeight:700,marginBottom:4}}>FACTION BALANCE</div>
                {!supabase&&<div style={{fontSize:7,color:"#444",textAlign:"center",lineHeight:1.4}}>Live balance once Supabase is configured.</div>}
                {supabase&&<div>
                  {(()=>{const lbFactions=dailyLbRef.current;const sk=lbFactions.filter(e=>e.faction==='sunkeeper').length;const ec=lbFactions.filter(e=>e.faction==='eclipser').length;const tot=sk+ec||1;const skPct=Math.round(sk/tot*100);const ecPct=100-skPct;return<div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:7,marginBottom:2}}>
                      <span style={{color:"#f0c040"}}>☀ Sunkeepers {skPct}%</span>
                      <span style={{color:"#8060c0"}}>🌑 Eclipsers {ecPct}%</span>
                    </div>
                    <div style={{height:5,background:"#120604",borderRadius:3,overflow:"hidden",display:"flex"}}>
                      <div style={{width:skPct+"%",background:"linear-gradient(90deg,#c8a84e,#f0c040)",transition:"width 0.8s"}}/>
                      <div style={{flex:1,background:"linear-gradient(90deg,#5030a0,#8060c0)"}}/>
                    </div>
                    <div style={{fontSize:7,color:"#555",marginTop:3,textAlign:"center"}}>Based on today's leaderboard · Sun: {Math.round(sunBrightness)}%</div>
                  </div>;})()}
                </div>}
                {!supabase&&<div style={{marginTop:4,display:"flex",justifyContent:"space-between",fontSize:7,color:"#333"}}>
                  <span>☀ Sunkeepers</span><span>🌑 Eclipsers</span>
                </div>}
              </div>
              {/* Innovation #14: Sunfall Event Boss Tracker */}
              {sunBrightness<=10&&<div style={{borderTop:"1px solid rgba(200,168,78,0.08)",paddingTop:6,marginTop:4,background:"rgba(60,0,0,0.3)",borderRadius:4,padding:6}}>
                <div style={{color:"#f44",fontSize:9,fontWeight:700,marginBottom:4,textAlign:"center"}}>⚠️ GRAND SUNFALL EVENT</div>
                <div style={{fontSize:7,color:"#caa",textAlign:"center",marginBottom:4,lineHeight:1.4}}>The sun is nearly extinguished. The Harbinger stirs.</div>
                <div style={{color:"#888",fontSize:7,marginBottom:2}}>Community HP Remaining</div>
                <div style={{height:8,background:"#1a0404",borderRadius:4,overflow:"hidden",border:"1px solid #4a1010"}}>
                  <div style={{height:"100%",width:Math.max(2,sunBrightness*10)+"%",background:"linear-gradient(90deg,#ff2020,#ff6040)",transition:"width 2s",boxShadow:"0 0 8px #ff4040"}}/>
                </div>
                <div style={{fontSize:7,color:"#f44",marginTop:2,textAlign:"center"}}>{Math.round(sunBrightness*10)}% Harbinger HP · {totalDeaths.toLocaleString()} fallen this season</div>
              </div>}
              {/* Innovation #2: Oracle Subscription */}
              <div style={{borderTop:"1px solid rgba(200,168,78,0.08)",paddingTop:6,marginTop:4}}>
                <div style={{color:"#c8a84e",fontSize:9,fontWeight:700,marginBottom:3}}>🔔 ORACLE ALERTS</div>
                {oracleSubbed?<div style={{fontSize:7,color:"#4a0",textAlign:"center",padding:"3px 0"}}>✓ Subscribed. The Oracle will call when the sun crosses a threshold.</div>:<div>
                  <div style={{fontSize:7,color:"#666",marginBottom:3,lineHeight:1.4}}>Get notified when the Oracle broadcasts (60%, 40%, 20% sun).</div>
                  <input type="email" value={oracleSubEmail} onChange={e=>setOracleSubEmail(e.target.value)} placeholder="your@email.com" style={{width:"100%",boxSizing:"border-box",background:"#120604",color:"#ddd",border:"1px solid #5a2010",fontSize:8,padding:"3px 5px",borderRadius:3,marginBottom:3,outline:"none"}}/>
                  <button onClick={()=>{if(!oracleSubEmail.includes('@')){addC("Enter a valid email for Oracle alerts.");return;}localStorage.setItem('solara_oracle_sub',oracleSubEmail);setOracleSubbed(true);addC("🔔 Oracle alerts registered. The Oracle will find you.");}} style={{width:"100%",background:"#2a1040",border:"1px solid #7a4090",color:"#c8a0ff",fontSize:8,padding:"3px 0",cursor:"pointer",borderRadius:3,fontWeight:600}}>Subscribe to Oracle Broadcasts</button>
                </div>}
              </div>
            </div>}
            {tab==="settings"&&p&&<div style={{padding:6,display:"flex",flexDirection:"column",gap:6}}>
              <div style={{color:"#c8a84e",fontSize:10,fontWeight:700,letterSpacing:1}}>SETTINGS</div>
              <div style={{fontSize:8,color:"#8f7d68",lineHeight:1.5}}>Customize identity, audio, interface density, runtime helpers, and quick links back to the front-door pages without leaving the game.</div>
              <div style={{fontSize:9,color:"#ddd"}}>Character Name:
                <input type="text" value={p.playerName||"Adventurer"} maxLength={16} onChange={e=>{persistIdentity(e.target.value,p.travelerSigil||travelerSigilDraft);}} style={{marginLeft:4,background:"#120604",color:"#ff0",border:"1px solid #5a2010",fontSize:8,padding:"2px 4px",borderRadius:2,width:90}}/>
              </div>
              <div style={{fontSize:9,color:"#ddd"}}>Traveler Sigil:
                <input type="text" value={p.travelerSigil||travelerSigilDraft} maxLength={24} onChange={e=>{persistIdentity(p.playerName||travelerNameDraft,e.target.value.toUpperCase());}} style={{marginLeft:4,background:"#120604",color:"#c8a0ff",border:"1px solid #5a2010",fontSize:8,padding:"2px 4px",borderRadius:2,width:130}}/>
              </div>
              <div style={{fontSize:8,color:backendConnected?"#6c6":"#a86",lineHeight:1.4}}>{backendConnected?"Shared-world backend connected.":"Shared-world backend not connected. Echoes and identity still save locally."}</div>
              <div style={{fontSize:9,color:"#c8a84e",fontWeight:700,marginTop:2}}>APPEARANCE</div>
              {[["Skin","skin","#f0d8a0"],["Hair","hair","#333"],["Outfit","outfit","#2266cc"]].map(([label,key,def])=><label key={key} style={{fontSize:8,color:"#ddd",display:"flex",alignItems:"center",gap:4}}>
                {label}: <input type="color" value={(p.appearance||{})[key]||def} onChange={e=>{p.appearance=p.appearance||{};p.appearance[key]=e.target.value;fr(n=>n+1);}} style={{width:28,height:18,border:"none",background:"transparent",cursor:"pointer",padding:0}}/>
              </label>)}
              <div style={{fontSize:9,color:"#c8a84e",fontWeight:700,marginTop:2}}>AUDIO</div>
              <label style={{fontSize:9,color:"#ddd",display:"flex",alignItems:"center",gap:4}}>
                <input type="checkbox" checked={audioEnabled} onChange={e=>setAudioEnabled(e.target.checked)}/>
                Sound Effects
              </label>
              <label style={{fontSize:9,color:"#ddd",display:"flex",alignItems:"center",gap:4}}>
                <input type="checkbox" checked={musicOn} onChange={e=>setMusicOn(e.target.checked)}/>
                Ambient Music
              </label>
              <label style={{fontSize:9,color:"#ddd",display:"flex",alignItems:"center",gap:4}}>
                <input type="checkbox" checked={ambientMotion} onChange={e=>setAmbientMotion(e.target.checked)}/>
                Dynamic Music Swell
              </label>
              <div style={{fontSize:7,color:"#666",lineHeight:1.4}}>The soundtrack shifts with the global sun phase. Muting music keeps effects available if you still want combat feedback.</div>
              <div style={{fontSize:9,color:"#c8a84e",fontWeight:700,marginTop:2}}>INTERFACE</div>
              <div style={{background:"rgba(20,10,5,0.6)",padding:"6px 7px",borderRadius:4,border:"1px solid rgba(200,168,78,0.08)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:4}}>
                  <div style={{fontSize:9,color:"#c8a84e",fontWeight:700}}>LAYOUT PRESETS</div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{fontSize:7,color:"#8f7d68",textTransform:"uppercase"}}>{layoutPreset}</div>
                    <button onClick={()=>setShowLayoutManager(true)} style={{background:"transparent",border:"1px solid #5a2010",color:"#da0",fontSize:7,padding:"2px 5px",cursor:"pointer",borderRadius:999}}>Manage</button>
                  </div>
                </div>
                <div style={{display:"grid",gap:4}}>
                  {LAYOUT_PRESETS.map(preset=><button key={preset.id} onClick={()=>applyLayoutPreset(preset.id)} style={{textAlign:"left",background:layoutPreset===preset.id?"#261108":"#140906",border:"1px solid #5a2010",color:"#ddd",fontSize:8,padding:"5px 6px",cursor:"pointer",borderRadius:4}}>
                    <div style={{color:layoutPreset===preset.id?"#f0c060":"#d8c2a8",fontWeight:700,marginBottom:1}}>{preset.label}</div>
                    <div style={{color:"#77685b",fontSize:7,lineHeight:1.4}}>{preset.desc}</div>
                  </button>)}
                </div>
                <div style={{fontSize:8,color:"#c8a84e",fontWeight:700,marginTop:6,marginBottom:4}}>CUSTOM LAYOUTS</div>
                <div style={{display:"grid",gap:4}}>
                  {CUSTOM_LAYOUT_SLOTS.map(slot=>{
                    const entry=customLayouts[slot];
                    return <div key={slot} style={{background:"rgba(12,6,4,0.7)",border:"1px solid rgba(200,168,78,0.08)",borderRadius:4,padding:"5px 6px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:6,marginBottom:4}}>
                        <input type="text" value={customLayoutDrafts[slot]||entry?.label||getDefaultCustomLayoutLabel(slot)} maxLength={24} onChange={e=>setCustomLayoutDrafts(prev=>({...prev,[slot]:e.target.value}))} onBlur={e=>renameCustomLayout(slot,e.target.value)} style={{flex:1,background:"#120604",color:layoutPreset===slot?"#f0c060":"#d8c2a8",border:"1px solid #5a2010",fontSize:8,fontWeight:700,padding:"2px 4px",borderRadius:3,minWidth:0}}/>
                        <div style={{fontSize:7,color:"#6f6256"}}>{entry?.savedAt?new Date(entry.savedAt).toLocaleDateString():"empty"}</div>
                      </div>
                      <div style={{display:"flex",gap:4}}>
                        <button onClick={()=>saveCustomLayout(slot)} style={{flex:1,background:"#241208",border:"1px solid #5a2010",color:"#ddd",fontSize:7,padding:"3px 4px",cursor:"pointer",borderRadius:3}}>Save Current</button>
                        <button onClick={()=>loadCustomLayout(slot)} disabled={!entry} style={{flex:1,background:entry?"#161d12":"#151110",border:"1px solid #3a5020",color:entry?"#bfe0a8":"#6d655d",fontSize:7,padding:"3px 4px",cursor:entry?"pointer":"default",borderRadius:3}}>Load</button>
                      </div>
                    </div>;
                  })}
                </div>
              </div>
              <label style={{fontSize:9,color:"#ddd",display:"flex",alignItems:"center",gap:4}}>
                <input type="checkbox" checked={p.autoRetaliate||false} onChange={e=>{p.autoRetaliate=e.target.checked;fr(n=>n+1);}}/>
                Auto-Retaliate
              </label>
              <label style={{fontSize:9,color:"#ddd",display:"flex",alignItems:"center",gap:4}}>
                <input type="checkbox" checked={p.run||false} onChange={e=>{p.run=e.target.checked;fr(n=>n+1);}}/>
                Run Mode
              </label>
              <label style={{fontSize:9,color:"#ddd",display:"flex",alignItems:"center",gap:4}}>
                <input type="checkbox" checked={showGuide} onChange={e=>setShowGuide(e.target.checked)}/>
                Quickstart Overlay
              </label>
              <label style={{fontSize:9,color:"#ddd",display:"flex",alignItems:"center",gap:4}}>
                <input type="checkbox" checked={showObjectiveTracker} onChange={e=>setShowObjectiveTracker(e.target.checked)}/>
                Objective Tracker
              </label>
              {showObjectiveTracker&&<div style={{fontSize:8,color:"#8f7d68",lineHeight:1.5}}>Tracker Position: drag the objective card in-world. <button onClick={resetObjectivePosition} style={{marginLeft:4,background:"transparent",border:"1px solid #5a2010",color:"#da0",fontSize:8,padding:"1px 4px",cursor:"pointer",borderRadius:2}}>Reset</button></div>}
              <label style={{fontSize:9,color:"#ddd",display:"flex",alignItems:"center",gap:4}}>
                <input type="checkbox" checked={showGhostHud} onChange={e=>setShowGhostHud(e.target.checked)}/>
                Ghost Manifestations
              </label>
              {showGhostHud&&<div style={{fontSize:8,color:"#8f7d68",lineHeight:1.5}}>Ghost Position: drag the ghost stack in-world. <button onClick={resetGhostPosition} style={{marginLeft:4,background:"transparent",border:"1px solid #5a2010",color:"#da0",fontSize:8,padding:"1px 4px",cursor:"pointer",borderRadius:2}}>Reset</button></div>}
              <label style={{fontSize:9,color:"#ddd",display:"flex",alignItems:"center",gap:4}}>
                <input type="checkbox" checked={tooltipsOn} onChange={e=>setTooltipsOn(e.target.checked)}/>
                Hover Tooltips
              </label>
              <label style={{fontSize:9,color:"#ddd",display:"flex",alignItems:"center",gap:4}}>
                <input type="checkbox" checked={compactHud} onChange={e=>setCompactHud(e.target.checked)}/>
                Compact Top Banner
              </label>
              <label style={{fontSize:9,color:"#ddd",display:"flex",alignItems:"center",gap:4}}>
                <input type="checkbox" checked={panelOpen} onChange={e=>setPanelOpen(e.target.checked)}/>
                Utility Panel Open
              </label>
              <label style={{fontSize:9,color:"#ddd",display:"flex",alignItems:"center",gap:4}}>
                <input type="checkbox" checked={showMenuReference} onChange={e=>setShowMenuReference(e.target.checked)}/>
                Menu Reference Shortcuts
              </label>
              <div style={{fontSize:9,color:"#ddd"}}>UI Scale:
                {["S","M","L"].map((sz,i)=><button key={sz} onClick={()=>{setUiScale(i===0?0.85:i===1?1:1.15);}} style={{marginLeft:4,background:uiScale===(i===0?0.85:i===1?1:1.15)?"#5a1808":"transparent",border:"1px solid #5a2010",color:"#da0",fontSize:8,padding:"1px 4px",cursor:"pointer",borderRadius:2}}>{sz}</button>)}
              </div>
              {showMenuReference&&<div style={{background:"rgba(20,10,5,0.6)",padding:"6px 7px",borderRadius:4,border:"1px solid rgba(200,168,78,0.08)"}}>
                <div style={{fontSize:9,color:"#c8a84e",fontWeight:700,marginBottom:4}}>MAIN MENU REFERENCE</div>
                <div style={{display:"grid",gap:4}}>
                  {MENU_REFERENCE_ITEMS.map(item=><button key={item.id} onClick={()=>{setMenuSection(item.id);setMenuOpen(true);}} style={{textAlign:"left",background:"#140906",border:"1px solid #5a2010",color:"#ddd",fontSize:8,padding:"5px 6px",cursor:"pointer",borderRadius:4}}>
                    <div style={{color:"#f0c060",fontWeight:700,marginBottom:1}}>{item.label}</div>
                    <div style={{color:"#77685b",fontSize:7,lineHeight:1.4}}>{item.desc}</div>
                  </button>)}
                </div>
              </div>}
              {/* QP Unlocks */}
              <div style={{fontSize:9,color:"#c8a84e",fontWeight:700,marginTop:2}}>QUEST POINT UNLOCKS ({p.questPoints||0} QP)</div>
              {UNLOCKS.map(u=>{const owned=(p.unlocks||[]).includes(u.id);return <div key={u.id} style={{background:"rgba(40,20,5,0.5)",padding:"3px 6px",borderRadius:3,border:"1px solid rgba(200,168,78,0.08)",display:"flex",alignItems:"center",gap:4}}>
                <span style={{fontSize:11}}>{u.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:8,color:owned?"#da0":"#ddd",fontWeight:600}}>{u.name}</div>
                  <div style={{fontSize:7,color:"#666"}}>{u.desc} · {u.cost} QP</div>
                </div>
                {!owned&&<button onClick={()=>{if((p.questPoints||0)>=u.cost){p.questPoints-=u.cost;p.unlocks=p.unlocks||[];p.unlocks.push(u.id);addC("Unlocked: "+u.name);fr(n=>n+1);}else addC("Need "+u.cost+" QP.");}} style={{background:"#3a1808",border:"1px solid #7a2010",color:"#c8a84e",fontSize:7,padding:"1px 4px",cursor:"pointer",borderRadius:2}}>Buy</button>}
                {owned&&<span style={{fontSize:8,color:"#0c0"}}>✓</span>}
              </div>;})}
              {/* Camp */}
              <div style={{fontSize:9,color:"#c8a84e",fontWeight:700,marginTop:2}}>DESERT CAMP</div>
              {p.camp?<div style={{background:"rgba(40,20,5,0.5)",padding:"4px 6px",borderRadius:3,fontSize:8,color:"#ddd",border:"1px solid rgba(200,168,78,0.08)"}}>
                Camp at ({p.camp.x},{p.camp.y}) · Bank: {(p.campBank||[]).length} stacks
                <button onClick={()=>{if(p&&gR.current){const g2=gR.current;p.x=p.camp.x;p.y=p.camp.y;g2.cam=getCenteredCam(p.x,p.y,cvR.current);addC("You return to your camp.");fr(n=>n+1);}}} style={{marginLeft:4,background:"#1a3010",border:"1px solid #3a5020",color:"#4c0",fontSize:7,padding:"1px 3px",cursor:"pointer",borderRadius:2}}>Goto</button>
              </div>:<div style={{fontSize:8,color:"#555"}}>No camp. Right-click empty ground to set camp.</div>}
              {/* Hall of Fame */}
              {(()=>{const lb=JSON.parse(localStorage.getItem("solara_leaderboard")||"[]");if(!lb.length)return null;
                return <div><div style={{fontSize:9,color:"#c8a84e",fontWeight:700,marginTop:2}}>HALL OF FAME</div>
                  {lb.slice(0,5).map((e,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:8,color:i===0?"#da0":"#888",padding:"1px 0"}}>
                    <span>{i+1}. {e.name}</span><span>{(e.xp||0).toLocaleString()} XP</span>
                  </div>)}
                </div>;})()}
              <div style={{fontSize:9,color:"#c8a84e",fontWeight:700,marginTop:2}}>RECENT ECHOES</div>
              <div style={{display:"grid",gap:3}}>
                {echoes.slice(0,3).map(e=><div key={e.id} style={{background:"rgba(20,10,5,0.6)",padding:"4px 6px",borderRadius:3,border:"1px solid rgba(200,168,78,0.06)"}}>
                  <div style={{fontSize:8,color:"#ddd"}}>{e.headline}</div>
                  <div style={{fontSize:7,color:"#666",marginTop:1}}>{e.player_name} · {e.traveler_sigil||"no-sigil"}</div>
                </div>)}
                {echoes.length===0&&<div style={{fontSize:8,color:"#555"}}>No echoes yet. Deaths and runs will begin filling this feed.</div>}
              </div>
              <div style={{fontSize:9,color:p.ironman?"#c8a84e":"#666"}}>Mode: {p.ironman?"🔒 Ironman":"Normal"}</div>
              {!p.ironman&&<button onClick={()=>requestConfirm({title:"Enable Ironman",body:"Ironman blocks shop buying for this chronicle.",confirmLabel:"Enable",danger:true,onConfirm:()=>{p.ironman=true;fr(n=>n+1);}})} style={{background:"#2a1010",border:"1px solid #7a2010",color:"#c44",fontSize:8,padding:"3px 6px",cursor:"pointer",borderRadius:3}}>Enable Ironman</button>}
              <button onClick={saveGame} style={{background:"#1a3010",border:"1px solid #3a6020",color:"#4c0",fontSize:8,padding:"3px 6px",cursor:"pointer",borderRadius:3}}>💾 Save Now</button>
              <button onClick={exportSaveFile} style={{background:"#0a1a2a",border:"1px solid #2a4a6a",color:"#6af",fontSize:8,padding:"3px 6px",cursor:"pointer",borderRadius:3}}>📤 Export Save</button>
              <button onClick={()=>requestConfirm({title:"Reset Save",body:"Delete all local progress for this browser. This cannot be undone.",confirmLabel:"Reset",danger:true,onConfirm:()=>{localStorage.removeItem("solara_save");window.location.reload();}})} style={{background:"#3a0808",border:"1px solid #8a2010",color:"#f44",fontSize:8,padding:"3px 6px",cursor:"pointer",borderRadius:3}}>🗑️ Reset Save</button>
            </div>}
          </div>
        </div>
      </div>
      {/* Bank */}
      {showLayoutManager&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.76)",zIndex:140,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setShowLayoutManager(false)}>
        <div style={{background:"linear-gradient(180deg,#1e0a06,#180804)",border:"2px solid #7a2010",borderRadius:10,padding:16,width:"min(720px,92vw)",maxHeight:"80vh",overflow:"auto"}} onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:12}}>
            <div>
              <div style={{color:"#c8a84e",fontWeight:800,fontSize:15,letterSpacing:1}}>Layout Manager</div>
              <div style={{color:"#8f7d68",fontSize:9}}>Switch, save, rename, and restore overlay layouts without fighting the narrow settings column.</div>
            </div>
            <button onClick={()=>setShowLayoutManager(false)} style={{background:"#4a1010",border:"none",color:"#c8a84e",padding:"4px 10px",cursor:"pointer",borderRadius:4}}>✕</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12}}>
            <div style={{background:"rgba(20,10,5,0.6)",padding:"8px",borderRadius:6,border:"1px solid rgba(200,168,78,0.08)"}}>
              <div style={{fontSize:10,color:"#c8a84e",fontWeight:700,marginBottom:6}}>Built-In Presets</div>
              <div style={{display:"grid",gap:6}}>
                {LAYOUT_PRESETS.map(preset=><button key={preset.id} onClick={()=>applyLayoutPreset(preset.id)} style={{textAlign:"left",background:layoutPreset===preset.id?"#261108":"#140906",border:"1px solid #5a2010",color:"#ddd",fontSize:9,padding:"8px 9px",cursor:"pointer",borderRadius:5}}>
                  <div style={{color:layoutPreset===preset.id?"#f0c060":"#d8c2a8",fontWeight:700,marginBottom:2}}>{preset.label}</div>
                  <div style={{color:"#77685b",fontSize:8,lineHeight:1.45}}>{preset.desc}</div>
                </button>)}
              </div>
            </div>
            <div style={{background:"rgba(20,10,5,0.6)",padding:"8px",borderRadius:6,border:"1px solid rgba(200,168,78,0.08)"}}>
              <div style={{fontSize:10,color:"#c8a84e",fontWeight:700,marginBottom:6}}>Custom Slots</div>
              <div style={{display:"grid",gap:6}}>
                {CUSTOM_LAYOUT_SLOTS.map(slot=>{
                  const entry=customLayouts[slot];
                  return <div key={slot} style={{background:"rgba(12,6,4,0.72)",border:"1px solid rgba(200,168,78,0.08)",borderRadius:5,padding:"7px 8px"}}>
                    <input type="text" value={customLayoutDrafts[slot]||entry?.label||getDefaultCustomLayoutLabel(slot)} maxLength={24} onChange={e=>setCustomLayoutDrafts(prev=>({...prev,[slot]:e.target.value}))} onBlur={e=>renameCustomLayout(slot,e.target.value)} style={{width:"100%",boxSizing:"border-box",background:"#120604",color:layoutPreset===slot?"#f0c060":"#d8c2a8",border:"1px solid #5a2010",fontSize:9,fontWeight:700,padding:"4px 6px",borderRadius:4,marginBottom:5}}/>
                    <div style={{fontSize:8,color:"#6f6256",marginBottom:6}}>{entry?.savedAt?`Saved ${new Date(entry.savedAt).toLocaleString()}`:"No layout saved yet"}</div>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>saveCustomLayout(slot)} style={{flex:1,background:"#241208",border:"1px solid #5a2010",color:"#ddd",fontSize:8,padding:"5px 6px",cursor:"pointer",borderRadius:4}}>Save Current</button>
                      <button onClick={()=>loadCustomLayout(slot)} disabled={!entry} style={{flex:1,background:entry?"#161d12":"#151110",border:"1px solid #3a5020",color:entry?"#bfe0a8":"#6d655d",fontSize:8,padding:"5px 6px",cursor:entry?"pointer":"default",borderRadius:4}}>Load</button>
                    </div>
                  </div>;
                })}
              </div>
            </div>
            <div style={{background:"rgba(20,10,5,0.6)",padding:"8px",borderRadius:6,border:"1px solid rgba(200,168,78,0.08)"}}>
              <div style={{fontSize:10,color:"#c8a84e",fontWeight:700,marginBottom:6}}>Share Layout</div>
              <div style={{display:"grid",gap:8}}>
                <button onClick={exportLayout} style={{background:"#241208",border:"1px solid #5a2010",color:"#ddd",fontSize:9,padding:"8px 9px",cursor:"pointer",borderRadius:5,fontWeight:700}}>📋 Copy Layout Code</button>
                <div style={{fontSize:8,color:"#6f6256"}}>Copies your current layout as a shareable code string.</div>
                <input type="text" placeholder="Paste a layout code here…" value={layoutImportDraft} onChange={e=>setLayoutImportDraft(e.target.value)} style={{width:"100%",boxSizing:"border-box",background:"#120604",color:"#d8c2a8",border:"1px solid #5a2010",fontSize:9,padding:"6px 8px",borderRadius:4}}/>
                <button onClick={()=>{if(layoutImportDraft.trim()){importLayout(layoutImportDraft);setLayoutImportDraft("");}}} disabled={!layoutImportDraft.trim()} style={{background:layoutImportDraft.trim()?"#161d12":"#151110",border:"1px solid #3a5020",color:layoutImportDraft.trim()?"#bfe0a8":"#6d655d",fontSize:9,padding:"8px 9px",cursor:layoutImportDraft.trim()?"pointer":"default",borderRadius:5,fontWeight:700}}>📥 Import Layout</button>
              </div>
            </div>
          </div>
        </div>
      </div>}
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
              <div style={{fontSize:8,color:"#da0"}}>{Math.max(1,Math.round(si.cost*merchantPriceScale))}gp</div>
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
                {recs.map((rec,i)=><div key={i} onClick={e=>{if(hasBar){const qty=e.shiftKey?barCount:1;doSmith(bar,rec,qty);}else addC("You need a "+ITEMS[bar].n+".");fr(n=>n+1);}}
                  style={{background:hasBar?"rgba(80,20,5,0.5)":"rgba(40,10,5,0.25)",border:"1px solid rgba(200,168,78,"+(hasBar?"0.2":"0.06")+")",borderRadius:4,padding:"5px 2px",textAlign:"center",cursor:hasBar?"pointer":"default",opacity:hasBar?1:0.5}}
                  onMouseEnter={e=>{if(hasBar)e.currentTarget.style.background="rgba(200,168,78,0.15)";}} onMouseLeave={e=>{if(hasBar)e.currentTarget.style.background="rgba(80,20,5,0.5)";}}>
                  <div style={{fontSize:16}}>{ITEMS[rec.out].i}</div>
                  <div style={{fontSize:6,color:"#c8a84e",fontWeight:600,marginTop:1}}>{ITEMS[rec.out].n.replace("Bronze ","").replace("Iron ","").replace("Steel ","")}</div>
                  <div style={{fontSize:7,color:"#888"}}>{rec.xp} xp</div>
                </div>)}
              </div>
            </div>;})}
          <div style={{color:"#666",fontSize:9,marginTop:4}}>Click to smith 1. Shift+click to smith all bars.</div>
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
          <div style={{fontSize:9,color:"#888",marginBottom:8}}>Herbs — Tarromin: {p.inv.reduce((a,x)=>x.i==="tarromin"?a+(x.c||1):a,0)} | Harralander: {p.inv.reduce((a,x)=>x.i==="harralander"?a+(x.c||1):a,0)} | Kwuarm: {p.inv.reduce((a,x)=>x.i==="kwuarm"?a+(x.c||1):a,0)} | Vial: {p.inv.reduce((a,x)=>x.i==="vial"?a+(x.c||1):a,0)}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:4}}>
            {HERB_RECIPES.map((rec,i)=>{const hl=lvl(p.sk.Herblore||0);const canLevel=hl>=rec.lvl;
              const hasVial=p.inv.some(x=>x.i==="vial");
              const hasMats=Object.entries(rec.needs).every(([id,cnt])=>p.inv.find(x=>x.i===id&&x.c>=(cnt||1)));
              const canBrew=canLevel&&hasMats&&hasVial;
              const herbId=Object.keys(rec.needs).find(k=>k!=="vial")||"clean_herb";
              return <div key={i} onClick={()=>doHerblore(rec)}
                style={{background:canBrew?"rgba(80,20,5,0.5)":"rgba(40,10,5,0.25)",border:"1px solid rgba(200,168,78,"+(canBrew?"0.2":"0.06")+")",borderRadius:4,padding:"8px 4px",textAlign:"center",cursor:canBrew?"pointer":"default",opacity:canBrew?1:0.5}}
                onMouseEnter={e=>{if(canBrew)e.currentTarget.style.background="rgba(200,168,78,0.15)";}} onMouseLeave={e=>{if(canBrew)e.currentTarget.style.background=canBrew?"rgba(80,20,5,0.5)":"rgba(40,10,5,0.25)";}}>
                <div style={{fontSize:18}}>{ITEMS[rec.out].i}</div>
                <div style={{fontSize:8,color:"#c8a84e",fontWeight:600}}>{ITEMS[rec.out].n}</div>
                <div style={{fontSize:7,color:"#888"}}>Lvl {rec.lvl} | {rec.xp}xp</div>
                <div style={{fontSize:7,color:"#555"}}>{ITEMS[herbId]?.i||"🌿"} {ITEMS[herbId]?.n||"herb"} + vial</div>
              </div>;})}
          </div>
        </div>
      </div>}
      {/* Styled Tooltip (Task 16) */}
      {tooltip&&<div style={{position:"fixed",left:tooltip.x+10,top:tooltip.y-8,background:"rgba(12,4,2,0.97)",border:"1px solid #7a2010",borderRadius:4,padding:"5px 8px",maxWidth:200,zIndex:300,pointerEvents:"none",boxShadow:"0 4px 16px rgba(0,0,0,0.7)"}}>
        {tooltip.name&&<div style={{fontSize:10,color:"#c8a84e",fontWeight:700,marginBottom:2}}>{tooltip.name}</div>}
        {tooltip.stats&&<div style={{fontSize:8,color:"#aaa",marginBottom:2}}>{tooltip.stats}</div>}
        {tooltip.examine&&<div style={{fontSize:8,color:"#888",fontStyle:"italic",lineHeight:1.4}}>{tooltip.examine}</div>}
      </div>}
      {/* World Map Modal */}
      {mapOpen&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:200,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}} onClick={()=>{setMapOpen(false);setGravePopup(null);}}>
        <div style={{border:"2px solid #7a2010",borderRadius:8,padding:4,background:"#0d0403",position:"relative"}} onClick={e=>e.stopPropagation()}>
          <div style={{display:"flex",justifyContent:"space-between",padding:"4px 8px",marginBottom:4}}>
            <span style={{color:"#c8a84e",fontWeight:700,fontSize:13}}>🗺️ World Map</span>
            <span style={{color:"#888",fontSize:9}}>Press M or ESC to close · Click ✝ to read epitaphs</span>
          </div>
          <WorldMapCanvas gR={gR} mapCvR={mapCvR} graves={gravesRef.current} gravesTick={gravesTick} onGraveClick={setGravePopup}/>
          <div style={{display:"flex",flexWrap:"wrap",gap:8,padding:"6px 8px",fontSize:8,color:"#888"}}>
            {[["●","#fff","You"],["●","#f44","Monster"],["●","#0ff","NPC"],["●","#da0","Point of interest"],["✝","#b4a0dc","Grave"]].map(([sym,col,lbl])=>
              <span key={lbl}><span style={{color:col}}>{sym}</span> {lbl}</span>)}
            {supabase&&<span style={{marginLeft:"auto",color:"#444"}}>{gravesRef.current.length} grave{gravesRef.current.length!==1?"s":""}</span>}
          </div>
          {/* Phase 2: Grave popup */}
          {gravePopup&&<div style={{position:"absolute",bottom:60,left:"50%",transform:"translateX(-50%)",background:"rgba(12,4,2,0.97)",border:"1px solid #7a4090",borderRadius:6,padding:"8px 12px",minWidth:200,maxWidth:280,zIndex:10}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
              <span style={{color:"#b4a0dc",fontSize:11,fontWeight:700}}>✝ {gravePopup.player_name}</span>
              <button onClick={()=>setGravePopup(null)} style={{background:"transparent",border:"none",color:"#666",fontSize:12,cursor:"pointer",padding:0,lineHeight:1}}>✕</button>
            </div>
            <div style={{fontSize:10,color:"#c8a84e",fontStyle:"italic",lineHeight:1.5,marginBottom:4}}>"{gravePopup.epitaph||'They fell without words.'}"</div>
            <div style={{fontSize:8,color:"#666",lineHeight:1.4,marginBottom:6}}>
              Wave {gravePopup.wave_reached||0} · {gravePopup.faction||'neutral'} · {gravePopup.date_seed||'unknown date'}
            </div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:7,color:"#555"}}>🌟 {gravePopup.sunstone_offerings||0} offering{(gravePopup.sunstone_offerings||0)!==1?"s":""}</span>
              <div style={{display:"flex",gap:4}}>
                <button onClick={async()=>{const card=gravePopup.memory_card||createDeathMemoryCard({playerName:gravePopup.player_name,sigil:gravePopup.traveler_sigil||travelerSigilDraft,waveReached:gravePopup.wave_reached||0,faction:gravePopup.faction||"neutral",sunBrightness:sunBrightnessRef.current,epitaph:gravePopup.epitaph||"",eventLabel:sharedWorld.event?.label||"Steady Flame"});if(navigator.share){try{await navigator.share({text:card});return;}catch(e){}}try{await navigator.clipboard.writeText(card);addC("📋 Death memory copied.");}catch(e){addC(card);}}} style={{background:"#182028",border:"1px solid #406080",color:"#9fd0ff",fontSize:7,padding:"2px 6px",cursor:"pointer",borderRadius:3,fontWeight:600}}>📋 Memory</button>
                {gR.current?.p?.inv?.some(x=>x.i==="sunstone_shard")&&<button onClick={()=>offerSunstone(gravePopup)} style={{background:"#2a1040",border:"1px solid #7a4090",color:"#c8a0ff",fontSize:7,padding:"2px 6px",cursor:"pointer",borderRadius:3,fontWeight:600}}>🌟 Offer Shard</button>}
              </div>
            </div>
          </div>}
        </div>
      </div>}
      {/* Phase 2: Epitaph Modal */}
      {showEpitaphModal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:250,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{background:"#0d0403",border:"2px solid #7a4090",borderRadius:8,padding:20,width:320,maxWidth:"90vw",textAlign:"center"}}>
          <div style={{color:"#b4a0dc",fontSize:16,fontWeight:700,marginBottom:4}}>✝ You Have Fallen</div>
          <div style={{color:"#888",fontSize:10,marginBottom:12,lineHeight:1.5}}>Your grave will mark the world forever.<br/>Leave your last words. (optional, 80 chars)</div>
          <input
            autoFocus
            maxLength={80}
            value={epitaphDraft}
            onChange={e=>setEpitaphDraft(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter")submitGrave(epitaphDraft);if(e.key==="Escape")submitGrave("");}}
            placeholder="They died as they lived..."
            style={{width:"100%",boxSizing:"border-box",background:"#1a0808",border:"1px solid #5a3060",borderRadius:4,color:"#ddd",fontSize:11,padding:"6px 8px",marginBottom:8,outline:"none"}}
          />
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <span style={{fontSize:8,color:"#555"}}>{epitaphDraft.length}/80</span>
            {/* Innovation #11: Prophecy suggestion */}
            <button onClick={()=>{if(pendingGrave){const p2=generateProphecy(pendingGrave.wave,pendingGrave.faction,pendingGrave.playerName);setEpitaphDraft(p2.slice(0,80));}}} style={{background:"#2a1040",border:"1px solid #5a3080",color:"#b090e0",fontSize:7,padding:"2px 6px",cursor:"pointer",borderRadius:3}}>✨ Suggest Prophecy</button>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"center"}}>
            <button onClick={()=>submitGrave(epitaphDraft)} style={{background:"#5a2080",border:"none",color:"#fff",borderRadius:4,padding:"6px 16px",fontSize:11,cursor:"pointer",fontWeight:700}}>Leave Epitaph</button>
            <button onClick={()=>submitGrave("")} style={{background:"transparent",border:"1px solid #444",color:"#666",borderRadius:4,padding:"6px 12px",fontSize:11,cursor:"pointer"}}>Skip</button>
          </div>
        </div>
      </div>}
      {onboardingStep!==null&&<div style={{position:"fixed",inset:0,zIndex:500,background:"radial-gradient(circle at top, rgba(180,110,40,0.12), transparent 40%), linear-gradient(180deg, rgba(4,2,2,0.97), rgba(8,4,3,0.99))",display:"flex",alignItems:"center",justifyContent:"center",padding:24,boxSizing:"border-box"}}>
        <div style={{width:"min(520px,100%)",textAlign:"center"}}>
          <div style={{fontSize:56,marginBottom:12,filter:`drop-shadow(0 0 18px ${ONBOARDING_SLIDES[onboardingStep].accent}66)`}}>{ONBOARDING_SLIDES[onboardingStep].icon}</div>
          <div style={{color:ONBOARDING_SLIDES[onboardingStep].accent,fontSize:11,letterSpacing:3,fontWeight:800,marginBottom:8}}>STEP {onboardingStep+1} OF {ONBOARDING_SLIDES.length}</div>
          <div style={{color:"#fff",fontSize:28,fontWeight:900,lineHeight:1.15,marginBottom:14}}>{ONBOARDING_SLIDES[onboardingStep].title}</div>
          <div style={{color:"#c8b9a6",fontSize:14,lineHeight:1.7,marginBottom:10,maxWidth:420,margin:"0 auto 10px"}}>{ONBOARDING_SLIDES[onboardingStep].body}</div>
          <div style={{color:"#8f7d68",fontSize:11,fontStyle:"italic",marginBottom:28}}>{ONBOARDING_SLIDES[onboardingStep].hint}</div>
          <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:18}}>
            {ONBOARDING_SLIDES.map((_,i)=><div key={i} style={{width:10,height:10,borderRadius:"50%",background:i===onboardingStep?ONBOARDING_SLIDES[onboardingStep].accent:"rgba(200,168,78,0.2)",transition:"background 0.3s"}}/>)}
          </div>
          <div style={{display:"flex",gap:12,justifyContent:"center"}}>
            {onboardingStep>0&&<button onClick={()=>setOnboardingStep(s=>s-1)} style={{background:"rgba(0,0,0,0.3)",border:"1px solid rgba(200,168,78,0.2)",color:"#b7a387",padding:"10px 22px",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:700}}>Back</button>}
            {onboardingStep<ONBOARDING_SLIDES.length-1&&<button onClick={()=>setOnboardingStep(s=>s+1)} style={{background:"linear-gradient(180deg,#4a220c,#2a1006)",border:"1px solid #c8a84e",color:"#f0c060",padding:"10px 28px",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:800}}>Next</button>}
            {onboardingStep===ONBOARDING_SLIDES.length-1&&<button onClick={finishOnboarding} style={{background:"linear-gradient(180deg,#4a220c,#2a1006)",border:"1px solid #c8a84e",color:"#f0c060",padding:"10px 28px",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:800}}>Enter the World</button>}
          </div>
          <button onClick={finishOnboarding} style={{background:"transparent",border:"none",color:"#6f5f4d",cursor:"pointer",fontSize:10,marginTop:16,padding:4}}>Skip intro</button>
        </div>
      </div>}
      {systemModal&&<div style={{position:"fixed",inset:0,zIndex:650,background:"rgba(0,0,0,0.82)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,boxSizing:"border-box"}} onClick={()=>setSystemModal(null)}>
        <div style={{width:"min(420px,100%)",background:"#0d0403",border:"1px solid "+(systemModal.accent||"#c8a84e"),borderRadius:8,padding:16,boxShadow:"0 20px 60px rgba(0,0,0,0.55)"}} onClick={e=>e.stopPropagation()}>
          <div style={{color:systemModal.accent||"#c8a84e",fontSize:14,fontWeight:900,marginBottom:8}}>{systemModal.title}</div>
          <div style={{color:"#c8b9a6",fontSize:11,lineHeight:1.55,whiteSpace:"pre-wrap",marginBottom:14}}>{systemModal.body}</div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            {systemModal.type==="confirm"&&<button onClick={()=>setSystemModal(null)} style={{background:"transparent",border:"1px solid #4a3024",color:"#8f7d68",borderRadius:6,padding:"7px 12px",fontSize:11,cursor:"pointer"}}>Cancel</button>}
            <button onClick={()=>{const action=systemModal.onConfirm;setSystemModal(null);if(action)action();}} style={{background:systemModal.danger?"#3a0808":"#2a1808",border:"1px solid "+(systemModal.accent||"#c8a84e"),color:systemModal.danger?"#ff9a8a":"#f0c060",borderRadius:6,padding:"7px 14px",fontSize:11,cursor:"pointer",fontWeight:800}}>{systemModal.type==="confirm"?(systemModal.confirmLabel||"Confirm"):"Close"}</button>
          </div>
        </div>
      </div>}
      {menuOpen&&<div style={{position:"fixed",inset:0,zIndex:400,background:"radial-gradient(circle at top, rgba(180,110,40,0.18), transparent 32%), linear-gradient(180deg, rgba(8,4,3,0.96), rgba(4,2,2,0.98))",display:"flex",alignItems:"stretch",justifyContent:"center",padding:24,boxSizing:"border-box"}}>
        <div style={{width:"min(1160px,100%)",display:"grid",gridTemplateColumns:"260px 1fr",gap:18,minHeight:0}}>
          <div style={{background:"rgba(18,8,6,0.92)",border:"1px solid rgba(200,168,78,0.22)",borderRadius:18,padding:18,display:"flex",flexDirection:"column",gap:12,boxShadow:"0 24px 60px rgba(0,0,0,0.35)"}}>
            <div>
              <div style={{color:"#f0c060",fontSize:12,letterSpacing:3,fontWeight:800}}>SOLARA: SUNFALL</div>
              <div style={{color:"#ddd",fontSize:24,fontWeight:900,lineHeight:1.05,marginTop:6}}>Shared-world roguelite RPG</div>
              <div style={{color:"#8f7d68",fontSize:11,lineHeight:1.55,marginTop:8}}>Every death should matter to everyone. This front door frames the async communal version of that idea.</div>
            </div>
            <div style={{display:"grid",gap:6}}>
              {MENU_SECTION_ITEMS.map(sec=><button key={sec.id} onClick={()=>setMenuSection(sec.id)} style={{textAlign:"left",background:menuSection===sec.id?"linear-gradient(90deg,#3a1808,#231006)":"rgba(0,0,0,0.16)",border:"1px solid "+(menuSection===sec.id?"#c8a84e":"rgba(200,168,78,0.08)"),color:menuSection===sec.id?"#f0c060":"#b7a387",padding:"10px 12px",cursor:"pointer",borderRadius:10,fontSize:12,fontWeight:700}}>{sec.label}</button>)}
            </div>
            <SharedWorldStatus title="Shared World Status" briefing={sharedWorldBriefing} compact />
            <SessionDeltaCard delta={sessionDelta} compact />
            <WorldFeedCard feed={worldFeed} compact onAction={handleWorldFeedAction} />
          </div>
          <div style={{background:"rgba(10,4,3,0.9)",border:"1px solid rgba(200,168,78,0.18)",borderRadius:18,padding:22,overflow:"auto",boxShadow:"0 24px 60px rgba(0,0,0,0.35)"}}>
            {menuSection==="play"&&<div style={{display:"grid",gap:18}}>
              <div>
                <div style={{color:"#f0c060",fontSize:11,letterSpacing:2,fontWeight:800}}>PLAY</div>
                <div style={{color:"#ddd",fontSize:28,fontWeight:900,marginTop:6}}>Enter the season with a real identity</div>
                <div style={{color:"#927e67",fontSize:12,lineHeight:1.6,marginTop:8}}>This build treats Solara as an async shared world: daily rites, persistent graves, communal sun-state, and player echoes rather than real-time co-op.</div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12}}>
                <div style={{background:"rgba(0,0,0,0.22)",border:"1px solid rgba(200,168,78,0.08)",borderRadius:14,padding:14}}>
                  <div style={{fontSize:10,color:"#f0c060",fontWeight:700,marginBottom:8}}>Traveler Identity</div>
                  <div style={{fontSize:9,color:"#8f7d68",marginBottom:4}}>Name</div>
                  <input type="text" maxLength={16} value={travelerNameDraft} onChange={e=>setTravelerNameDraft(e.target.value)} style={{width:"100%",boxSizing:"border-box",background:"#120604",border:"1px solid #5a2010",borderRadius:8,color:"#ffecb0",padding:"8px 10px",fontSize:12,marginBottom:10}}/>
                  <div style={{fontSize:9,color:"#8f7d68",marginBottom:4}}>Traveler Sigil</div>
                  <div style={{display:"flex",gap:8}}>
                    <input type="text" maxLength={24} value={travelerSigilDraft} onChange={e=>setTravelerSigilDraft(e.target.value.toUpperCase())} style={{flex:1,boxSizing:"border-box",background:"#120604",border:"1px solid #5a2010",borderRadius:8,color:"#c8a0ff",padding:"8px 10px",fontSize:12}}/>
                    <button onClick={()=>setTravelerSigilDraft(makeTravelerSigil())} style={{background:"#221006",border:"1px solid #5a3010",color:"#ddd",borderRadius:8,padding:"0 10px",cursor:"pointer",fontSize:11}}>↻</button>
                  </div>
                </div>
                <div style={{background:"rgba(0,0,0,0.22)",border:"1px solid rgba(200,168,78,0.08)",borderRadius:14,padding:14}}>
                  <div style={{fontSize:10,color:"#f0c060",fontWeight:700,marginBottom:8}}>Session Options</div>
                  <div style={{display:"grid",gap:8}}>
                    <button onClick={()=>enterWorld()} style={{background:"linear-gradient(180deg,#4a220c,#2a1006)",border:"1px solid #c8a84e",color:"#f0c060",padding:"10px 12px",borderRadius:10,cursor:"pointer",fontSize:12,fontWeight:800}}>{hasExistingSave?"Continue Chronicle":"Enter the World"}</button>
                    <button onClick={()=>enterWorld("daily")} style={{background:"#1b1408",border:"1px solid #5a3010",color:"#ddd",padding:"10px 12px",borderRadius:10,cursor:"pointer",fontSize:12,fontWeight:700}}>Go straight to Daily Rite</button>
                    <button onClick={startFreshChronicle} style={{background:"#260909",border:"1px solid #7a2010",color:"#f58",padding:"10px 12px",borderRadius:10,cursor:"pointer",fontSize:12,fontWeight:700}}>Start Fresh Chronicle</button>
                  </div>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12}}>
                <div style={{background:"rgba(0,0,0,0.22)",border:"1px solid rgba(200,168,78,0.08)",borderRadius:14,padding:14}}>
                  <div style={{fontSize:10,color:"#f0c060",fontWeight:700,marginBottom:8}}>Backend Readiness</div>
                  <div style={{fontSize:11,color:"#ddd",marginBottom:6}}>{backendConnected?"Live async services detected":"Live async services pending setup"}</div>
                  <div style={{fontSize:9,color:"#8f7d68",lineHeight:1.6}}>Expected shared tables: `daily_scores`, `graves`, `sun_state`, `player_echoes`. Without them, this build still stores echoes locally and keeps the solo runtime playable.</div>
                </div>
                <div style={{background:"rgba(0,0,0,0.22)",border:"1px solid rgba(200,168,78,0.08)",borderRadius:14,padding:14}}>
                  <div style={{fontSize:10,color:"#f0c060",fontWeight:700,marginBottom:8}}>Recent Echoes</div>
                  <div style={{display:"grid",gap:7}}>
                    {echoes.slice(0,4).map(e=>{const myR=echoReactLocal[e.id];return(<div key={e.id} style={{borderBottom:"1px solid rgba(200,168,78,0.06)",paddingBottom:6}}>
                      <div style={{fontSize:10,color:"#ddd"}}>{e.headline}</div>
                      <div style={{fontSize:8,color:"#7f6e5d",marginTop:2}}>{e.player_name} · {e.traveler_sigil||"no-sigil"} · {e.faction||"neutral"}</div>
                      <div style={{display:"flex",gap:3,marginTop:4}}>
                        {!myR&&<><button onClick={()=>reactToEcho(e.id,'commend')} style={{background:"rgba(180,255,80,0.06)",border:"1px solid rgba(180,255,80,0.18)",color:"#a0cc50",fontSize:7,padding:"1px 5px",cursor:"pointer",borderRadius:3}}>✦ Commend{(e.commend_count||0)>0?` ${e.commend_count}`:""}</button><button onClick={()=>reactToEcho(e.id,'heed')} style={{background:"rgba(80,160,255,0.06)",border:"1px solid rgba(80,160,255,0.18)",color:"#5090d0",fontSize:7,padding:"1px 5px",cursor:"pointer",borderRadius:3}}>👁 Heed{(e.heed_count||0)>0?` ${e.heed_count}`:""}</button><button onClick={()=>reactToEcho(e.id,'mourn')} style={{background:"rgba(180,80,200,0.06)",border:"1px solid rgba(180,80,200,0.18)",color:"#9060a0",fontSize:7,padding:"1px 5px",cursor:"pointer",borderRadius:3}}>✝ Mourn{(e.mourn_count||0)>0?` ${e.mourn_count}`:""}</button></>}
                        {myR&&<span style={{color:"#6f5f7d",fontSize:7}}>You {myR}ed this echo.</span>}
                      </div>
                    </div>);})}
                    {echoes.length===0&&<div style={{fontSize:9,color:"#6f6256"}}>No echoes recorded yet. This build will start generating them from deaths and runs.</div>}
                  </div>
                </div>
              </div>
            </div>}
            {(menuSection==="how"||menuSection==="knowledge"||menuSection==="features"||menuSection==="updates")&&<React.Suspense fallback={<div style={{fontSize:11,color:"#8f7d68"}}>Loading chronicle records...</div>}><MenuLorePanels menuSection={menuSection}/></React.Suspense>}
            {menuSection==="settings"&&<div style={{display:"grid",gap:14,maxWidth:560}}>
              <div>
                <div style={{color:"#f0c060",fontSize:11,letterSpacing:2,fontWeight:800}}>SETTINGS</div>
                <div style={{color:"#ddd",fontSize:26,fontWeight:900,marginTop:6}}>Front-door preferences</div>
              </div>
              <label style={{fontSize:12,color:"#ddd",display:"flex",alignItems:"center",gap:8}}>
                <input type="checkbox" checked={showGuide} onChange={e=>setShowGuide(e.target.checked)}/>
                Show quickstart overlay when entering the world
              </label>
              <label style={{fontSize:12,color:"#ddd",display:"flex",alignItems:"center",gap:8}}>
                <input type="checkbox" checked={panelOpen} onChange={e=>setPanelOpen(e.target.checked)}/>
                Open utility panel by default
              </label>
              <div style={{fontSize:12,color:"#ddd"}}>UI Scale:
                {["S","M","L"].map((sz,i)=><button key={sz} onClick={()=>{setUiScale(i===0?0.85:i===1?1:1.15);}} style={{marginLeft:6,background:uiScale===(i===0?0.85:i===1?1:1.15)?"#5a1808":"transparent",border:"1px solid #5a2010",color:"#da0",fontSize:10,padding:"2px 6px",cursor:"pointer",borderRadius:6}}>{sz}</button>)}
              </div>
              <div style={{fontSize:10,color:"#8f7d68",lineHeight:1.6}}>In-world settings remain available after you enter. This screen exists so the game finally has a proper front door before runtime begins.</div>
            </div>}
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

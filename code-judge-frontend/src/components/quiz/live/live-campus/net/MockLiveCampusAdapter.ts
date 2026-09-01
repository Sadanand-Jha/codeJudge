"use client";
import { LiveCampusAdapter, PlayerMovedPayload, PlayerLocationPayload } from "./LiveCampusAdapter";
import { Player, WORLD_W, WORLD_H, Location, HouseId, INTERIOR_W, INTERIOR_H } from "../types";
import { HOUSES, ROADS } from "../world/worldData";
import { getInterior } from "../world/interiorsData";

const ENABLE_NPCS = false; // NPCs disabled per request — set true to re-enable mock bots
const NAMES = ["Aanya","Rohan","Meera","Arjun","Sadanand","Kavya","Vikram","Sara","Aman","Neha","Ishaan","Priya","Dev","Ananya","Riya","Kabir"];
function randName(i:number){ return NAMES[i%NAMES.length] + " " + (Math.floor(Math.random()*900)+100); }

type Bot = Player & { location: Location; targetX?:number, targetY?:number, buildingTimer?:number };

export class MockLiveCampusAdapter implements LiveCampusAdapter {
  worldId = "";
  private quizId = "";
  private local!: Player & { location: Location };
  private subsJoined: Array<(p:Player)=>void> = [];
  private subsMoved: Array<(p:PlayerMovedPayload)=>void> = [];
  private subsLeft: Array<(p:{id:string})=>void> = [];
  private subsStopped: Array<(p:{id:string})=>void> = [];
  private subsLoc: Array<(p:PlayerLocationPayload)=>void> = [];
  private subsInteract: Array<(p:any)=>void> = [];
  private timers: Array<ReturnType<typeof setInterval> | ReturnType<typeof setTimeout>> = [];
  private bots: Bot[] = [];

  async joinWorld(quizId:string, local:Player){
    this.quizId=quizId; this.worldId=`quiz_${quizId}`;
    this.local={...local, location:{type:"campus"}} as any;
    if (!ENABLE_NPCS) return; // no bots when disabled
    const count = 8 + Math.floor(Math.random()*3);
    for (let i=0;i<count;i++){
      const p: Bot = {
        id: `bot-${i}-${Date.now()}-${i}`,
        name: randName(i),
        avatarUrl: `/images/avatar-${(i%7)+1}.png`,
        avatarId: (i%7)+1,
        x: 600 + Math.random()*(WORLD_W-1200),
        y: 600 + Math.random()*(WORLD_H-1200),
        vx:0, vy:0,
        dir: "down",
        anim:"idle",
        lastUpdated: Date.now(),
        location:{type:"campus"},
        targetX: undefined, targetY: undefined,
      };
      this.bots.push(p);
    }
    setTimeout(()=>{
      this.bots.forEach(b=> this.subsJoined.forEach(cb=>cb({...b})));
    }, 300);
    this.startBotLoop();
  }

  leaveWorld(){
    this.timers.forEach(t=> clearInterval(t as any));
    this.timers=[];
    this.bots.forEach(b=> this.subsLeft.forEach(cb=>cb({id:b.id})));
    this.bots=[];
  }

  sendMovement(payload:{x:number,y:number,dir:any,anim:any, location?:Location}){
    if(this.local){
      this.local.x=payload.x; this.local.y=payload.y; this.local.dir=payload.dir; this.local.anim=payload.anim;
      if(payload.location) this.local.location = payload.location;
    }
  }
  sendLocationChange(location: Location){
    if(this.local) this.local.location = location;
    // broadcast for mock echo? not needed for local
  }
  sendInteraction(payload:{type:string,targetId?:string,message?:string}){
    const evt={fromId: this.local?.id ?? "local", toId: payload.targetId, type: payload.type, message: payload.message};
    this.subsInteract.forEach(cb=>cb(evt));
  }

  onPlayerJoined(cb:(p:Player)=>void){ this.subsJoined.push(cb); return ()=>{ this.subsJoined=this.subsJoined.filter(c=>c!==cb); } }
  onPlayerMoved(cb:(p:PlayerMovedPayload)=>void){ this.subsMoved.push(cb); return ()=>{ this.subsMoved=this.subsMoved.filter(c=>c!==cb); } }
  onPlayerStopped(cb:(p:{id:string})=>void){ this.subsStopped.push(cb); return ()=>{ this.subsStopped=this.subsStopped.filter(c=>c!==cb); } }
  onPlayerLeft(cb:(p:{id:string})=>void){ this.subsLeft.push(cb); return ()=>{ this.subsLeft=this.subsLeft.filter(c=>c!==cb); } }
  onPlayerLocationChanged(cb:(p:PlayerLocationPayload)=>void){ this.subsLoc.push(cb); return ()=>{ this.subsLoc=this.subsLoc.filter(c=>c!==cb); } }
  onPlayerInteraction(cb:(p:any)=>void){ this.subsInteract.push(cb); return ()=>{ this.subsInteract=this.subsInteract.filter(c=>c!==cb); } }

  private startBotLoop(){
    if (!ENABLE_NPCS) return;
    const t = setInterval(()=>{
      this.bots.forEach(bot=>{
        // building bots behavior
        if(bot.location.type==="building"){
          bot.buildingTimer = (bot.buildingTimer||0)+1;
          // random interior walk
          if(Math.random()<0.22){
            const interior = getInterior((bot.location as {type:"building", buildingId: HouseId}).buildingId);
            const nx = 60 + Math.random()*(interior.w-120);
            const ny = 60 + Math.random()*(interior.h-120);
            bot.targetX=nx; bot.targetY=ny; bot.anim="walk";
            const dx=nx-bot.x, dy=ny-bot.y;
            bot.dir = Math.abs(dx)>Math.abs(dy) ? (dx>0?"right":"left") : (dy>0?"down":"up");
          }
          if(bot.targetX!=null && bot.targetY!=null){
            const dx=bot.targetX-bot.x, dy=bot.targetY-bot.y, d=Math.hypot(dx,dy);
            if(d<6){ bot.anim="idle"; bot.targetX=undefined; this.subsStopped.forEach(cb=>cb({id:bot.id})); }
            else { bot.x+=dx*0.13; bot.y+=dy*0.13; this.subsMoved.forEach(cb=>cb({id:bot.id, x:bot.x, y:bot.y, dir:bot.dir, anim:bot.anim, location: bot.location})); }
          }
          // exit after 80-180 ticks (~7-16s)
          if((bot.buildingTimer||0) > 90 + Math.random()*90){
            const bid = (bot.location as {type:"building", buildingId: HouseId}).buildingId;
            const house = HOUSES.find(h=>h.id===bid);
            if(house){
              bot.location={type:"campus"};
              bot.x = house.door.x + house.door.w/2 + (Math.random()*40-20);
              bot.y = house.door.y + 44;
              bot.targetX=undefined; bot.buildingTimer=0;
              this.subsLoc.forEach(cb=>cb({id:bot.id, location: bot.location, x:bot.x, y:bot.y}));
              this.subsMoved.forEach(cb=>cb({id:bot.id, x:bot.x, y:bot.y, dir:bot.dir, anim:"idle", location: bot.location}));
            }
          }
          return;
        }
        // campus bots
        // chance to enter nearby house
        if(Math.random()<0.018){
          // find nearest house
          let nearest: typeof HOUSES[0] | null = null; let best=9999;
          for(const h of HOUSES){ const d=Math.hypot(bot.x-(h.door.x+h.door.w/2), bot.y-(h.door.y+h.door.h/2)); if(d<best){best=d; nearest=h} }
          if(nearest && best<520){
            bot.targetX = nearest.door.x+nearest.door.w/2; bot.targetY= nearest.door.y+10;
            bot.anim="walk";
            bot.dir="down";
          }
        }
        // check if reached door
        for(const h of HOUSES){
          const dx=bot.x-(h.door.x+h.door.w/2), dy=bot.y-(h.door.y+h.door.h/2);
          if(Math.hypot(dx,dy)<26 && bot.location.type==="campus"){
            // enter building
            const interior = getInterior(h.id);
            bot.location={type:"building", buildingId:h.id};
            bot.x = interior.spawn.x; bot.y = interior.spawn.y;
            bot.targetX=undefined; bot.buildingTimer=0;
            this.subsLoc.forEach(cb=>cb({id:bot.id, location: bot.location, x:bot.x, y:bot.y}));
            return;
          }
        }
        if (Math.random() < 0.16){
          let nx:number, ny:number;
          if(Math.random()<0.6){
            const r = ROADS[Math.floor(Math.random()*ROADS.length)];
            nx = r.x + Math.random()*r.w;
            ny = r.y + Math.random()*r.h;
          } else {
            const angle = Math.random()*Math.PI*2;
            const dist = 80 + Math.random()*140;
            nx = bot.x + Math.cos(angle)*dist;
            ny = bot.y + Math.sin(angle)*dist;
          }
          nx = Math.max(30, Math.min(WORLD_W-30, nx));
          ny = Math.max(30, Math.min(WORLD_H-30, ny));
          bot.targetX = nx; bot.targetY = ny; bot.anim = "walk";
          const dx = nx - bot.x, dy = ny - bot.y;
          bot.dir = Math.abs(dx) > Math.abs(dy) ? (dx>0?"right":"left") : (dy>0?"down":"up");
        } else if (Math.random()<0.07){
          bot.anim="idle"; this.subsStopped.forEach(cb=>cb({id:bot.id})); return;
        }
        if (bot.targetX!=null && bot.targetY!=null){
          const dx = bot.targetX - bot.x; const dy = bot.targetY - bot.y; const dist = Math.hypot(dx,dy);
          if (dist < 8) { bot.anim="idle"; bot.targetX=undefined; bot.targetY=undefined; this.subsStopped.forEach(cb=>cb({id:bot.id})); return; }
          bot.x += dx*0.11; bot.y += dy*0.11;
          this.subsMoved.forEach(cb=>cb({id:bot.id, x: bot.x, y: bot.y, dir: bot.dir, anim: bot.anim, location: bot.location}));
        }
      });
    }, 90);
    this.timers.push(t);

    const t2 = setInterval(()=>{
      if (Math.random()<0.04 && this.bots.length < 14){
        const i = this.bots.length;
        const p: Bot = { id:`bot-dyn-${Date.now()}`, name: randName(i), avatarUrl:`/images/avatar-${(i%7)+1}.png`, avatarId:(i%7)+1, x: 800+Math.random()*1600, y: 600+Math.random()*1000, vx:0, vy:0, dir:"down", anim:"idle", lastUpdated: Date.now(), location:{type:"campus"} };
        this.bots.push(p); this.subsJoined.forEach(cb=>cb({...p}));
      }
      if (Math.random()<0.03 && this.bots.length>6){
        const idx = Math.floor(Math.random()*this.bots.length);
        const [removed] = this.bots.splice(idx,1);
        if(removed) this.subsLeft.forEach(cb=>cb({id:removed.id}));
      }
    }, 6000);
    this.timers.push(t2);
  }
}

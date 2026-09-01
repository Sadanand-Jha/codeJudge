"use client";
import { BuildingInterior, HouseId, INTERIOR_W, INTERIOR_H } from "../types";

const WALL = 14;

function walls(): Array<{x:number,y:number,w:number,h:number}> {
  return [
    { x:0, y:0, w: INTERIOR_W, h: WALL },
    { x:0, y:INTERIOR_H-WALL, w: INTERIOR_W, h: WALL },
    { x:0, y:0, w: WALL, h: INTERIOR_H },
    { x: INTERIOR_W-WALL, y:0, w: WALL, h: INTERIOR_H },
  ];
}

export const INTERIORS: Record<HouseId, BuildingInterior> = {
  library: {
    id:"library", label:"Library", w: INTERIOR_W, h: INTERIOR_H,
    spawn:{x: INTERIOR_W/2, y: INTERIOR_H-70},
    exit:{x: INTERIOR_W/2-36, y: INTERIOR_H-WALL-26, w:72, h:26},
    exitLabel:"Exit",
    objects:[
      ...walls().map(r=>({ ...r, type:"wall" as const, collidable:true })),
      // perimeter shelves + central reading
      { x: 40, y: 40, w: 200, h: 22, type:"shelf", collidable:true, label:"Fiction" },
      { x: 620, y: 40, w: 200, h: 22, type:"shelf", collidable:true, label:"Tech" },
      { x: 40, y: 120, w: 22, h: 240, type:"shelf", collidable:true },
      { x: INTERIOR_W-62, y: 120, w: 22, h: 240, type:"shelf", collidable:true },
      // reading tables with desk lamps
      { x: 150, y: 180, w: 150, h: 84, type:"table", collidable:true },
      { x: 560, y: 180, w: 150, h: 84, type:"table", collidable:true },
      { x: 150, y: 340, w: 150, h: 84, type:"table", collidable:true },
      { x: 560, y: 340, w: 150, h: 84, type:"table", collidable:true },
      // study computers near window
      { x: 320, y: 80, w: 220, h: 28, type:"desk", collidable:true },
      { x: 340, y: 58, w: 48, h: 18, type:"computer", collidable:false, label:"pc" },
      { x: 410, y: 58, w: 48, h: 18, type:"computer", collidable:false, label:"pc" },
      { x: 480, y: 58, w: 48, h: 18, type:"computer", collidable:false, label:"pc" },
      // cozy corners
      { x: 320, y: 430, w: 90, h: 70, type:"sofa", collidable:true },
      { x: 450, y: 430, w: 90, h: 70, type:"sofa", collidable:true },
      { x: 60, y: 430, w: 36, h: 36, type:"plant", collidable:false },
      { x: 760, y: 430, w: 36, h: 36, type:"plant", collidable:false },
      // chairs
      { x: 170, y: 275, w: 26, h: 26, type:"chair", collidable:false },
      { x: 580, y: 275, w: 26, h: 26, type:"chair", collidable:false },
      { x: 170, y: 435, w: 26, h: 26, type:"chair", collidable:false },
      { x: 580, y: 435, w: 26, h: 26, type:"chair", collidable:false },
      { x: 360, y: 505, w: 140, h: 18, type:"rug", collidable:false },
    ],
  },
  discussion: {
    id:"discussion", label:"Discussion Room", w: INTERIOR_W, h: INTERIOR_H,
    spawn:{x: INTERIOR_W/2, y: INTERIOR_H-70},
    exit:{x: INTERIOR_W/2-36, y: INTERIOR_H-WALL-26, w:72, h:26},
    exitLabel:"Exit",
    objects:[
      ...walls().map(r=>({ ...r, type:"wall" as const, collidable:true })),
      // large round table center
      { x: 280, y: 160, w: 300, h: 160, type:"table", collidable:true, label:"Round Table" },
      // laptops on table
      { x: 310, y: 150, w: 44, h: 16, type:"computer", collidable:false, label:"laptop" },
      { x: 380, y: 150, w: 44, h: 16, type:"computer", collidable:false, label:"laptop" },
      { x: 450, y: 150, w: 44, h: 16, type:"computer", collidable:false, label:"laptop" },
      { x: 505, y: 150, w: 44, h: 16, type:"computer", collidable:false, label:"laptop" },
      { x: 120, y: 80, w: 110, h: 22, type:"board", collidable:true },
      { x: 630, y: 80, w: 110, h: 22, type:"board", collidable:true },
      { x: 60, y: 140, w: 22, h: 180, type:"shelf", collidable:true },
      { x: INTERIOR_W-82, y: 140, w: 22, h: 180, type:"shelf", collidable:true },
      { x: 140, y: 400, w: 110, h: 65, type:"sofa", collidable:true },
      { x: 610, y: 400, w: 110, h: 65, type:"sofa", collidable:true },
      { x: 340, y: 400, w: 180, h: 22, type:"rug", collidable:false },
      { x: 380, y: 360, w: 100, h: 22, type:"plant", collidable:false },
    ],
  },
  codingLab: {
    id:"codingLab", label:"Coding Lab", w: INTERIOR_W, h: INTERIOR_H,
    spawn:{x: INTERIOR_W/2, y: INTERIOR_H-70},
    exit:{x: INTERIOR_W/2-36, y: INTERIOR_H-WALL-26, w:72, h:26},
    exitLabel:"Exit",
    objects:[
      ...walls().map(r=>({ ...r, type:"wall" as const, collidable:true })),
      // teacher zone
      { x: 300, y: 50, w: 260, h: 28, type:"desk", collidable:true, label:"Teacher Desk" },
      { x: 320, y: 30, w: 52, h: 20, type:"computer", collidable:false, label:"pc" },
      { x: 390, y: 30, w: 52, h: 20, type:"computer", collidable:false, label:"pc" },
      { x: 480, y: 30, w: 70, h: 20, type:"board", collidable:true },
      // rows with aisle
      { x: 60, y: 160, w: 330, h: 28, type:"desk", collidable:true },
      { x: 470, y: 160, w: 330, h: 28, type:"desk", collidable:true },
      { x: 60, y: 260, w: 330, h: 28, type:"desk", collidable:true },
      { x: 470, y: 260, w: 330, h: 28, type:"desk", collidable:true },
      { x: 60, y: 360, w: 330, h: 28, type:"desk", collidable:true },
      { x: 470, y: 360, w: 330, h: 28, type:"desk", collidable:true },
      // working computers per desk
      { x: 88, y: 140, w: 48, h: 18, type:"computer", collidable:false, label:"pc" },
      { x: 168, y: 140, w: 48, h: 18, type:"computer", collidable:false, label:"pc" },
      { x: 248, y: 140, w: 48, h: 18, type:"computer", collidable:false, label:"pc" },
      { x: 498, y: 140, w: 48, h: 18, type:"computer", collidable:false, label:"pc" },
      { x: 578, y: 140, w: 48, h: 18, type:"computer", collidable:false, label:"pc" },
      { x: 658, y: 140, w: 48, h: 18, type:"computer", collidable:false, label:"pc" },
      { x: 88, y: 240, w: 48, h: 18, type:"computer", collidable:false, label:"pc" },
      { x: 168, y: 240, w: 48, h: 18, type:"computer", collidable:false, label:"pc" },
      { x: 248, y: 240, w: 48, h: 18, type:"computer", collidable:false, label:"pc" },
      { x: 498, y: 240, w: 48, h: 18, type:"computer", collidable:false, label:"pc" },
      { x: 578, y: 240, w: 48, h: 18, type:"computer", collidable:false, label:"pc" },
      { x: 658, y: 240, w: 48, h: 18, type:"computer", collidable:false, label:"pc" },
      { x: 88, y: 340, w: 48, h: 18, type:"computer", collidable:false, label:"pc" },
      { x: 168, y: 340, w: 48, h: 18, type:"computer", collidable:false, label:"pc" },
      { x: 248, y: 340, w: 48, h: 18, type:"computer", collidable:false, label:"pc" },
      { x: 498, y: 340, w: 48, h: 18, type:"computer", collidable:false, label:"pc" },
      { x: 578, y: 340, w: 48, h: 18, type:"computer", collidable:false, label:"pc" },
      { x: 658, y: 340, w: 48, h: 18, type:"computer", collidable:false, label:"pc" },
      // chairs visual
      { x: 130, y: 200, w: 26, h: 26, type:"chair", collidable:false },
      { x: 290, y: 200, w: 26, h: 26, type:"chair", collidable:false },
      { x: 550, y: 200, w: 26, h: 26, type:"chair", collidable:false },
      { x: 710, y: 200, w: 26, h: 26, type:"chair", collidable:false },
      { x: 130, y: 300, w: 26, h: 26, type:"chair", collidable:false },
      { x: 290, y: 300, w: 26, h: 26, type:"chair", collidable:false },
      { x: 550, y: 300, w: 26, h: 26, type:"chair", collidable:false },
      { x: 710, y: 300, w: 26, h: 26, type:"chair", collidable:false },
      { x: 360, y: 470, w: 140, h: 18, type:"rug", collidable:false },
      { x: 60, y: 70, w: 28, h: 40, type:"plant", collidable:false },
      { x: 770, y: 70, w: 28, h: 40, type:"plant", collidable:false },
    ],
  },
  lounge: {
    id:"lounge", label:"Lounge", w: INTERIOR_W, h: INTERIOR_H,
    spawn:{x: INTERIOR_W/2, y: INTERIOR_H-70},
    exit:{x: INTERIOR_W/2-36, y: INTERIOR_H-WALL-26, w:72, h:26},
    exitLabel:"Exit",
    objects:[
      ...walls().map(r=>({ ...r, type:"wall" as const, collidable:true })),
      { x: 160, y: 150, w: 170, h: 95, type:"sofa", collidable:true },
      { x: 520, y: 150, w: 170, h: 95, type:"sofa", collidable:true },
      { x: 340, y: 300, w: 180, h: 70, type:"table", collidable:true },
      // laptops on coffee table
      { x: 360, y: 295, w: 40, h: 14, type:"computer", collidable:false, label:"laptop" },
      { x: 420, y: 295, w: 40, h: 14, type:"computer", collidable:false, label:"laptop" },
      { x: 80, y: 80, w: 22, h: 160, type:"counter", collidable:true, label:"Vending" },
      { x: 120, y: 140, w: 48, h: 18, type:"computer", collidable:false, label:"pc" },
      { x: 680, y: 360, w: 90, h: 40, type:"shelf", collidable:true },
      { x: 120, y: 400, w: 28, h: 28, type:"chair", collidable:true },
      { x: 660, y: 180, w: 30, h: 30, type:"plant", collidable:false },
      { x: 160, y: 420, w: 120, h: 18, type:"rug", collidable:false },
      { x: 540, y: 420, w: 120, h: 18, type:"rug", collidable:false },
      { x: 380, y: 100, w: 100, h: 18, type:"window", collidable:false },
    ],
  },
  quizHall: {
    id:"quizHall", label:"Quiz Hall", w: INTERIOR_W, h: INTERIOR_H,
    spawn:{x: INTERIOR_W/2, y: INTERIOR_H-70},
    exit:{x: INTERIOR_W/2-36, y: INTERIOR_H-WALL-26, w:72, h:26},
    exitLabel:"Exit",
    objects:[
      ...walls().map(r=>({ ...r, type:"wall" as const, collidable:true })),
      { x: 340, y: 60, w: 180, h: 40, type:"desk", collidable:true, label:"Podium" },
      { x: 360, y: 40, w: 48, h: 18, type:"computer", collidable:false, label:"pc" },
      { x: 420, y: 40, w: 48, h: 18, type:"computer", collidable:false, label:"pc" },
      { x: 80, y: 140, w: 700, h: 22, type:"desk", collidable:true },
      { x: 100, y: 120, w: 48, h: 18, type:"computer", collidable:false, label:"pc" },
      { x: 180, y: 120, w: 48, h: 18, type:"computer", collidable:false, label:"pc" },
      { x: 260, y: 120, w: 48, h: 18, type:"computer", collidable:false, label:"pc" },
      { x: 500, y: 120, w: 48, h: 18, type:"computer", collidable:false, label:"pc" },
      { x: 580, y: 120, w: 48, h: 18, type:"computer", collidable:false, label:"pc" },
      { x: 660, y: 120, w: 48, h: 18, type:"computer", collidable:false, label:"pc" },
      { x: 80, y: 220, w: 700, h: 22, type:"desk", collidable:true },
      { x: 100, y: 200, w: 48, h: 18, type:"computer", collidable:false, label:"pc" },
      { x: 180, y: 200, w: 48, h: 18, type:"computer", collidable:false, label:"pc" },
      { x: 580, y: 200, w: 48, h: 18, type:"computer", collidable:false, label:"pc" },
      { x: 660, y: 200, w: 48, h: 18, type:"computer", collidable:false, label:"pc" },
      { x: 80, y: 300, w: 700, h: 22, type:"desk", collidable:true },
      { x: 80, y: 380, w: 700, h: 22, type:"desk", collidable:true },
      { x: 100, y: 280, w: 48, h: 18, type:"computer", collidable:false, label:"pc" },
      { x: 660, y: 280, w: 48, h: 18, type:"computer", collidable:false, label:"pc" },
      { x: 80, y: 460, w: 700, h: 22, type:"desk", collidable:true },
      { x: 340, y: 500, w: 180, h: 14, type:"board", collidable:false },
      { x: 360, y: 470, w: 140, h: 18, type:"rug", collidable:false },
      // plants at entrance
      { x: 60, y: 500, w: 30, h: 30, type:"plant", collidable:false },
      { x: 770, y: 500, w: 30, h: 30, type:"plant", collidable:false },
    ],
  },
  arcade: {
    id:"arcade", label:"Arcade", w: INTERIOR_W, h: INTERIOR_H,
    spawn:{x: INTERIOR_W/2, y: INTERIOR_H-70},
    exit:{x: INTERIOR_W/2-36, y: INTERIOR_H-WALL-26, w:72, h:26},
    exitLabel:"Exit",
    objects:[
      ...walls().map(r=>({ ...r, type:"wall" as const, collidable:true })),
      // neon arcade cabinets along walls
      { x: 60, y: 80, w: 48, h: 36, type:"server", collidable:true, label:"Arcade" },
      { x: 140, y: 80, w: 48, h: 36, type:"server", collidable:true, label:"Arcade" },
      { x: 220, y: 80, w: 48, h: 36, type:"server", collidable:true, label:"Arcade" },
      { x: 600, y: 80, w: 48, h: 36, type:"server", collidable:true, label:"Arcade" },
      { x: 680, y: 80, w: 48, h: 36, type:"server", collidable:true, label:"Arcade" },
      // gaming desks
      { x: 200, y: 200, w: 140, h: 70, type:"desk", collidable:true },
      { x: 520, y: 200, w: 140, h: 70, type:"desk", collidable:true },
      { x: 200, y: 340, w: 140, h: 70, type:"desk", collidable:true },
      { x: 520, y: 340, w: 140, h: 70, type:"desk", collidable:true },
      { x: 220, y: 180, w: 52, h: 20, type:"computer", collidable:false, label:"pc" },
      { x: 540, y: 180, w: 52, h: 20, type:"computer", collidable:false, label:"pc" },
      { x: 220, y: 320, w: 52, h: 20, type:"computer", collidable:false, label:"pc" },
      { x: 540, y: 320, w: 52, h: 20, type:"computer", collidable:false, label:"pc" },
      // lounge corner
      { x: 360, y: 430, w: 140, h: 60, type:"sofa", collidable:true },
      { x: 340, y: 500, w: 180, h: 18, type:"rug", collidable:false },
      { x: 60, y: 400, w: 28, h: 28, type:"plant", collidable:false },
      // chairs
      { x: 230, y: 280, w: 26, h: 26, type:"chair", collidable:false },
      { x: 550, y: 280, w: 26, h: 26, type:"chair", collidable:false },
    ],
  },
  studio: {
    id:"studio", label:"Create Studio", w: INTERIOR_W, h: INTERIOR_H,
    spawn:{x: INTERIOR_W/2, y: INTERIOR_H-70},
    exit:{x: INTERIOR_W/2-36, y: INTERIOR_H-WALL-26, w:72, h:26},
    exitLabel:"Exit",
    objects:[
      ...walls().map(r=>({ ...r, type:"wall" as const, collidable:true })),
      // large creative tables
      { x: 120, y: 120, w: 220, h: 100, type:"table", collidable:true },
      { x: 520, y: 120, w: 220, h: 100, type:"table", collidable:true },
      { x: 140, y: 100, w: 52, h: 20, type:"computer", collidable:false, label:"pc" },
      { x: 210, y: 100, w: 52, h: 20, type:"computer", collidable:false, label:"pc" },
      { x: 540, y: 100, w: 52, h: 20, type:"computer", collidable:false, label:"pc" },
      { x: 610, y: 100, w: 52, h: 20, type:"computer", collidable:false, label:"pc" },
      { x: 120, y: 300, w: 220, h: 100, type:"table", collidable:true },
      { x: 520, y: 300, w: 220, h: 100, type:"table", collidable:true },
      { x: 140, y: 280, w: 52, h: 20, type:"computer", collidable:false, label:"pc" },
      { x: 540, y: 280, w: 52, h: 20, type:"computer", collidable:false, label:"pc" },
      // design tools
      { x: 360, y: 480, w: 140, h: 18, type:"rug", collidable:false },
      { x: 60, y: 80, w: 28, h: 40, type:"cabinet", collidable:true, label:"Supplies" },
      { x: 770, y: 80, w: 28, h: 80, type:"cabinet", collidable:true },
      { x: 360, y: 60, w: 140, h: 22, type:"board", collidable:true },
      { x: 120, y: 450, w: 40, h: 40, type:"plant", collidable:false },
      { x: 700, y: 450, w: 40, h: 40, type:"plant", collidable:false },
    ],
  },
  serverHub: {
    id:"serverHub", label:"Server Hub", w: INTERIOR_W, h: INTERIOR_H,
    spawn:{x: INTERIOR_W/2, y: INTERIOR_H-70},
    exit:{x: INTERIOR_W/2-36, y: INTERIOR_H-WALL-26, w:72, h:26},
    exitLabel:"Exit",
    objects:[
      ...walls().map(r=>({ ...r, type:"wall" as const, collidable:true })),
      // server racks
      { x: 60, y: 80, w: 42, h: 120, type:"server", collidable:true, label:"Rack A" },
      { x: 130, y: 80, w: 42, h: 120, type:"server", collidable:true, label:"Rack B" },
      { x: 700, y: 80, w: 42, h: 120, type:"server", collidable:true, label:"Rack C" },
      { x: 770, y: 80, w: 42, h: 120, type:"server", collidable:true, label:"Rack D" },
      // central console
      { x: 300, y: 120, w: 260, h: 28, type:"desk", collidable:true, label:"Console" },
      { x: 320, y: 100, w: 52, h: 20, type:"computer", collidable:false, label:"pc" },
      { x: 400, y: 100, w: 52, h: 20, type:"computer", collidable:false, label:"pc" },
      { x: 480, y: 100, w: 52, h: 20, type:"computer", collidable:false, label:"pc" },
      // monitoring wall
      { x: 300, y: 50, w: 260, h: 20, type:"board", collidable:true, label:"Dash" },
      // side workstations
      { x: 260, y: 300, w: 160, h: 70, type:"desk", collidable:true },
      { x: 440, y: 300, w: 160, h: 70, type:"desk", collidable:true },
      { x: 280, y: 280, w: 52, h: 20, type:"computer", collidable:false, label:"pc" },
      { x: 460, y: 280, w: 52, h: 20, type:"computer", collidable:false, label:"pc" },
      { x: 340, y: 430, w: 180, h: 18, type:"rug", collidable:false },
      { x: 60, y: 300, w: 30, h: 30, type:"plant", collidable:false },
      { x: 770, y: 300, w: 30, h: 30, type:"plant", collidable:false },
    ],
  },
};

export function getInterior(id: HouseId){ return INTERIORS[id]; }

export function interiorCollides(id: HouseId, nx:number, ny:number, radius:number){
  const interior = INTERIORS[id];
  if(!interior) return false;
  for(const o of interior.objects){
    if(!o.collidable) continue;
    if(o.type==="wall" && o.y===INTERIOR_H-WALL){
      const gapL = interior.exit.x - 8;
      const gapR = interior.exit.x + interior.exit.w + 8;
      if(nx > gapL && nx < gapR && ny > INTERIOR_H - 60) continue;
    }
    const cx = Math.max(o.x, Math.min(nx, o.x+o.w));
    const cy = Math.max(o.y, Math.min(ny, o.y+o.h));
    const dx = nx - cx, dy = ny - cy;
    if(dx*dx+dy*dy < (radius+2)*(radius+2)) return true;
  }
  if (nx-radius< WALL || nx+radius> INTERIOR_W-WALL) return true;
  if (ny-radius< WALL || ny+radius> INTERIOR_H-WALL+10) return true;
  return false;
}

export function interiorSlide(id:HouseId, x:number,y:number, dx:number, dy:number){
  let nx = x+dx, ny=y+dy;
  if(!interiorCollides(id,nx,ny,14)) return {x:nx,y:ny};
  if(!interiorCollides(id,nx,y,14)) return {x:nx,y};
  if(!interiorCollides(id,x,ny,14)) return {x,y:ny};
  return {x,y};
}

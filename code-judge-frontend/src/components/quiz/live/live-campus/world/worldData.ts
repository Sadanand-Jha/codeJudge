"use client";
import { WORLD_W, WORLD_H, House, WorldObject, HouseId, District } from "../types";

// Cozy curated campus — 8 beautiful houses around central plaza
// World remains 6400x4400 but curated play area is centered 400..2800 x 80..1700

export const DISTRICTS: District[] = [
  { id:"campus", label:"Coding Campus", bounds:{x:400,y:80,w:2400,h:1600}, color:"#DDECC6" },
  { id:"central", label:"Central Plaza", bounds:{x:1380,y:860,w:440,h:360}, color:"#FFF3D6" },
];

// 8 Beautiful Houses — each with distinct architecture
export const HOUSES: House[] = [
  { id: "codingLab", label: "Coding Lab", icon: "💻", x: 1465, y: 150, w: 290, h: 190, door: { x: 1592, y: 340, w: 48, h: 28 }, color: "#F2E6CC" },
  // North row flanking lab
  { id: "serverHub", label: "Server Hub", icon: "🖥️", x: 1060, y: 180, w: 240, h: 155, door: { x: 1168, y: 335, w: 36, h: 22 }, color: "#DDE8F0" },
  { id: "studio", label: "Create Studio", icon: "🎨", x: 1880, y: 180, w: 240, h: 155, door: { x: 1988, y: 335, w: 36, h: 22 }, color: "#FDE68A" },
  // Mid row
  { id: "library", label: "Library", icon: "📚", x: 560, y: 580, w: 220, h: 150, door: { x: 658, y: 730, w: 36, h: 22 }, color: "#E8D5B7" },
  { id: "arcade", label: "Arcade", icon: "🎮", x: 1060, y: 600, w: 210, h: 145, door: { x: 1152, y: 745, w: 36, h: 22 }, color: "#E0D8F5" },
  { id: "lounge", label: "Lounge", icon: "☕", x: 1880, y: 600, w: 210, h: 145, door: { x: 1972, y: 745, w: 36, h: 22 }, color: "#E9D7E8" },
  { id: "discussion", label: "Discussion", icon: "💬", x: 2360, y: 580, w: 220, h: 150, door: { x: 2458, y: 730, w: 36, h: 22 }, color: "#C7D8EB" },
  // South — grand hall
  { id: "quizHall", label: "Quiz Hall", icon: "🏛️", x: 1420, y: 1280, w: 360, h: 170, door: { x: 1582, y: 1450, w: 48, h: 26 }, color: "#FDE68A" },
];

export const EXTRA_BUILDINGS: WorldObject[] = [];

export const ROADS: Array<{ x:number, y:number, w:number, h:number, type: "main"|"secondary"|"street", lanes?:number }> = [
  { x: 400, y: 380, w: 2400, h: 54, type: "main", lanes: 1 },
  // stubs to each door
  { x: 1598, y: 368, w: 36, h: 28, type: "street" },
  { x: 1176, y: 360, w: 20, h: 26, type: "street" },
  { x: 1996, y: 360, w: 20, h: 26, type: "street" },
  { x: 666, y: 730, w: 20, h: 22, type: "street" },
  { x: 1160, y: 745, w: 20, h: 22, type: "street" },
  { x: 1980, y: 745, w: 20, h: 22, type: "street" },
  { x: 2466, y: 730, w: 20, h: 22, type: "street" },
  { x: 1592, y: 1450, w: 28, h: 22, type: "street" },
];

export const PLAZA = { x: 1380, y: 900, w: 440, h: 320 };

export const PARKING_LOTS: WorldObject[] = [];

function curatedCampusDecor(): WorldObject[] {
  return [
    // Benches — around plaza + near trees
    { id: "bench-plaza-n", x: 1490, y: 840, w: 88, h: 20, type: "bench", collidable: true },
    { id: "bench-plaza-n2", x: 1720, y: 840, w: 88, h: 20, type: "bench", collidable: true },
    { id: "bench-south-w", x: 620, y: 1080, w: 80, h: 20, type: "bench", collidable: true },
    { id: "bench-south-e", x: 2400, y: 1080, w: 80, h: 20, type: "bench", collidable: true },
    { id: "bench-west", x: 480, y: 880, w: 20, h: 80, type: "bench", collidable: true },
    { id: "bench-east", x: 2660, y: 880, w: 20, h: 80, type: "bench", collidable: true },

    // Lamps
    { id: "lamp-top-w", x: 620, y: 360, w: 14, h: 14, type: "lamp", collidable: true },
    { id: "lamp-top-cw", x: 1040, y: 360, w: 14, h: 14, type: "lamp", collidable: true },
    { id: "lamp-top-ce", x: 2140, y: 360, w: 14, h: 14, type: "lamp", collidable: true },
    { id: "lamp-top-e", x: 2520, y: 360, w: 14, h: 14, type: "lamp", collidable: true },
    { id: "lamp-plaza-w", x: 1260, y: 980, w: 14, h: 14, type: "lamp", collidable: true },
    { id: "lamp-plaza-e", x: 1900, y: 980, w: 14, h: 14, type: "lamp", collidable: true },

    { id: "fountain", x: 1578, y: 1028, w: 52, h: 52, type: "fountain", collidable: true, label: "fountain" },

    // Trees
    { id: "tree-bg-1", x: 480, y: 70, w: 62, h: 62, type: "tree", collidable: true, label: "small" },
    { id: "tree-bg-2", x: 2560, y: 70, w: 68, h: 68, type: "tree", collidable: true, label: "small" },
    { id: "tree-bg-3", x: 860, y: 90, w: 56, h: 56, type: "tree", collidable: true, label: "small" },
    { id: "tree-bg-4", x: 2180, y: 95, w: 58, h: 58, type: "tree", collidable: true, label: "small" },
    { id: "tree-hero-w", x: 340, y: 480, w: 108, h: 108, type: "tree", collidable: true, label: "hero" },
    { id: "tree-hero-e", x: 2700, y: 500, w: 106, h: 106, type: "tree", collidable: true, label: "hero" },
    { id: "tree-hero-s1", x: 440, y: 1380, w: 118, h: 118, type: "tree", collidable: true, label: "hero" },
    { id: "tree-hero-s2", x: 2640, y: 1360, w: 116, h: 116, type: "tree", collidable: true, label: "hero" },
    { id: "tree-blossom", x: 380, y: 620, w: 116, h: 116, type: "tree", collidable: true, label: "blossom" },
    { id: "tree-blossom-e", x: 2720, y: 680, w: 88, h: 88, type: "tree", collidable: true, label: "blossom" },
    { id: "tree-m1", x: 840, y: 440, w: 64, h: 64, type: "tree", collidable: true, label: "accent" },
    { id: "tree-m2", x: 2180, y: 440, w: 62, h: 62, type: "tree", collidable: true, label: "accent" },
    { id: "tree-m3", x: 840, y: 1100, w: 60, h: 60, type: "tree", collidable: true, label: "accent" },
    { id: "tree-m4", x: 2180, y: 1100, w: 62, h: 62, type: "tree", collidable: true, label: "accent" },
    { id: "tree-m5", x: 1220, y: 1360, w: 58, h: 58, type: "tree", collidable: true, label: "accent" },
    { id: "tree-m6", x: 1880, y: 1360, w: 60, h: 60, type: "tree", collidable: true, label: "accent" },

    // Bushes / flowers
    { id: "bush-1", x: 640, y: 310, w: 40, h: 26, type: "bush", collidable: false, label: "bush" },
    { id: "bush-2", x: 2480, y: 310, w: 40, h: 26, type: "bush", collidable: false, label: "bush" },
    { id: "bush-3", x: 640, y: 980, w: 34, h: 22, type: "bush", collidable: false, label: "flower" },
    { id: "bush-4", x: 2500, y: 960, w: 36, h: 22, type: "bush", collidable: false, label: "flower" },
    { id: "bush-5", x: 520, y: 1080, w: 32, h: 20, type: "bush", collidable: false, label: "bush" },
    { id: "bush-6", x: 2620, y: 1070, w: 34, h: 20, type: "bush", collidable: false, label: "flower" },
    { id: "bush-7", x: 1380, y: 300, w: 42, h: 24, type: "bush", collidable: false, label: "bush" },
    { id: "bush-8", x: 1760, y: 300, w: 40, h: 24, type: "bush", collidable: false, label: "bush" },
    { id: "bush-9", x: 980, y: 300, w: 36, h: 22, type: "bush", collidable: false, label: "flower" },
    { id: "bush-10", x: 2080, y: 300, w: 36, h: 22, type: "bush", collidable: false, label: "flower" },

    { id: "rock-1", x: 560, y: 1050, w: 34, h: 24, type: "rock", collidable: false },
    { id: "rock-2", x: 2560, y: 1040, w: 38, h: 26, type: "rock", collidable: false },
    { id: "rock-3", x: 1320, y: 1380, w: 30, h: 20, type: "rock", collidable: false },
    { id: "rock-4", x: 1880, y: 1400, w: 34, h: 22, type: "rock", collidable: false },
    { id: "rock-5", x: 520, y: 700, w: 28, h: 20, type: "rock", collidable: false },
    { id: "rock-6", x: 2620, y: 700, w: 28, h: 20, type: "rock", collidable: false },
    { id: "rock-s1", x: 1160, y: 1050, w: 28, h: 18, type: "rock", collidable: false },
    { id: "rock-s2", x: 1940, y: 1050, w: 28, h: 18, type: "rock", collidable: false },

    { id: "flower-1", x: 740, y: 520, w: 10, h: 10, type: "bush", collidable: false, label: "speck" },
    { id: "flower-2", x: 2400, y: 520, w: 10, h: 10, type: "bush", collidable: false, label: "speck" },
    { id: "flower-3", x: 740, y: 1200, w: 10, h: 10, type: "bush", collidable: false, label: "speck" },
    { id: "flower-4", x: 2400, y: 1200, w: 10, h: 10, type: "bush", collidable: false, label: "speck" },
  ];
}

function fences(): WorldObject[] {
  const list: WorldObject[] = [];
  for(let x=460; x<880; x+=72) list.push({ id:`fence-t-${x}`, x, y: 46, w: 56, h: 10, type:"fence", collidable: false });
  for(let x=2300; x<2720; x+=72) list.push({ id:`fence-t2-${x}`, x, y: 46, w: 56, h: 10, type:"fence", collidable: false });
  return list;
}

export const WORLD_OBJECTS: WorldObject[] = [
  ...HOUSES.map(h => ({ id: `house-${h.id}`, x: h.x, y: h.y, w: h.w, h: h.h, type: "house" as const, collidable: true, label: h.label })),
  ...curatedCampusDecor(),
  ...fences(),
];

export function getHouseAt(x: number, y: number): House | null {
  for (const h of HOUSES) {
    const dx = x - (h.door.x + h.door.w/2);
    const dy = y - (h.door.y + h.door.h/2);
    if (Math.hypot(dx, dy) < 96) return h;
  }
  return null;
}

export function isOnRoad(x:number,y:number){
  return ROADS.some(r=> x>=r.x && x<=r.x+r.w && y>=r.y && y<=r.y+r.h) || 
         (x>PLAZA.x && x<PLAZA.x+PLAZA.w && y>PLAZA.y && y<PLAZA.y+PLAZA.h);
}

import { CHUNK_SIZE } from "../types";
export function getChunkKey(x:number, y:number){ return `${Math.floor(x/CHUNK_SIZE)},${Math.floor(y/CHUNK_SIZE)}`; }
export function getVisibleChunkKeys(cam:{x:number,y:number,w:number,h:number}){
  const keys: string[] = [];
  const sx = Math.floor((cam.x-200)/CHUNK_SIZE), ex = Math.floor((cam.x+cam.w+200)/CHUNK_SIZE);
  const sy = Math.floor((cam.y-200)/CHUNK_SIZE), ey = Math.floor((cam.y+cam.h+200)/CHUNK_SIZE);
  for(let cx=sx; cx<=ex; cx++) for(let cy=sy; cy<=ey; cy++) keys.push(`${cx},${cy}`);
  return keys;
}

"use client";
import { WORLD_OBJECTS } from "./worldData";
import { WORLD_W, WORLD_H, PLAYER_RADIUS } from "../types";

export function rectsOverlap(ax:number,ay:number,aw:number,ah:number, bx:number,by:number,bw:number,bh:number){
  return ax < bx+bw && ax+aw > bx && ay < by+bh && ay+ah > by;
}

export function circleRectCollides(cx:number,cy:number, r:number, rx:number,ry:number,rw:number,rh:number){
  const closestX = Math.max(rx, Math.min(cx, rx+rw));
  const closestY = Math.max(ry, Math.min(cy, ry+rh));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx*dx + dy*dy < r*r;
}

export function wouldCollide(nx:number, ny:number){
  // world bounds
  if (nx - PLAYER_RADIUS < 0 || nx + PLAYER_RADIUS > WORLD_W) return true;
  if (ny - PLAYER_RADIUS < 0 || ny + PLAYER_RADIUS > WORLD_H) return true;
  for (const o of WORLD_OBJECTS){
    if (!o.collidable) continue;
    if (circleRectCollides(nx, ny, PLAYER_RADIUS+2, o.x, o.y, o.w, o.h)) return true;
  }
  return false;
}

export function slideMove(x:number,y:number, dx:number, dy:number){
  // try full move, else slide on x, else y
  let nx = x + dx;
  let ny = y + dy;
  if (!wouldCollide(nx, ny)) return {x: nx, y: ny};
  if (!wouldCollide(nx, y)) return {x: nx, y};
  if (!wouldCollide(x, ny)) return {x, y: ny};
  return {x, y};
}

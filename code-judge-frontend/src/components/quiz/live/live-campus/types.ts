"use client";

export type Direction = "up" | "down" | "left" | "right";
export type AnimState = "idle" | "walk";

export interface Player {
  id: string;
  name: string;
  rollNumber?: string;
  avatarUrl?: string;
  avatarId?: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  dir: Direction;
  anim: AnimState;
  isLocal?: boolean;
  lastUpdated: number;
  location?: Location;
  // interpolation targets for remotes
  targetX?: number;
  targetY?: number;
}

export type HouseId = "library" | "discussion" | "codingLab" | "lounge" | "quizHall" | "arcade" | "studio" | "serverHub";

export interface House {
  id: HouseId;
  label: string;
  icon: string;
  x: number;
  y: number;
  w: number;
  h: number;
  door: { x: number; y: number; w: number; h: number }; // world door trigger rect center
  color: string;
}

export type Location =
  | { type: "campus" }
  | { type: "building"; buildingId: HouseId };

// interior
export interface InteriorRect {
  x: number; y: number; w: number; h: number;
  type: "wall" | "desk" | "table" | "shelf" | "sofa" | "chair" | "counter" | "board" | "computer" | "plant" | "rug" | "server" | "cabinet" | "window";
  collidable: boolean;
  label?: string;
}
export interface BuildingInterior {
  id: HouseId;
  label: string;
  w: number; h: number;
  spawn: { x:number, y:number }; // entry point inside
  exit: { x:number, y:number, w:number, h:number };
  objects: InteriorRect[];
  exitLabel: string;
}

export interface WorldObject {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: "house" | "tree" | "bench" | "rock" | "lamp" | "fence" | "shop" | "apartment" | "cafe" | "parking" | "sign" | "bush" | "fountain";
  collidable: boolean;
  label?: string;
}

// ── Open-world entity system (extensible for future vehicles/NPCs) ──
export type EntityType =
  | "player"
  | "building"
  | "house"
  | "shop"
  | "tree"
  | "road"
  | "furniture"
  | "interactive"
  | "vehicle" // future
  | "npc" // future
  | "decoration";

export interface WorldPosition { x:number; y:number; }

export interface WorldEntity {
  id: string;
  type: EntityType;
  position: WorldPosition;
  rotation?: number;
  size: { w:number; h:number };
  collision: boolean;
  interaction?: { prompt: string; action: string };
  meta?: Record<string,unknown>;
}

export type DistrictId = "campus" | "residential" | "commercial" | "park" | "central";
export interface District { id: DistrictId; label:string; bounds:{x:number,y:number,w:number,h:number}; color:string; }

export const WORLD_W = 6400;
export const WORLD_H = 4400;
export const PLAYER_RADIUS = 18;
export const PLAYER_SPEED = 220; // px/s
export const INTERACT_RADIUS = 88;

export const INTERIOR_W = 860;
export const INTERIOR_H = 560;

export const CHUNK_SIZE = 800;

export type LiveCampusMode = "classic" | "live-campus";

// Vehicle-ready placeholder (future, not rendered yet)
export type VehicleType = "car" | "bike" | "scooter" | "bus";
export interface VehicleEntity extends WorldEntity { type:"vehicle"; vehicleType: VehicleType; speed:number; }

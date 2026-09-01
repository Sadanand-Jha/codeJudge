"use client";
import { Player, Direction, AnimState, Location } from "../types";

export type PlayerJoinedPayload = Player;
export type PlayerMovedPayload = { id:string, x:number, y:number, dir:Direction, anim:AnimState, location?: Location };
export type PlayerLeftPayload = { id:string };
export type PlayerInteractionPayload = { fromId:string, toId?:string, type:string, message?:string };
export type PlayerLocationPayload = { id:string, location: Location, x?:number, y?:number };

export type Unsub = () => void;

export interface LiveCampusAdapter {
  worldId: string;
  joinWorld(quizId:string, local:Player): Promise<void>;
  leaveWorld(): void;
  sendMovement(payload:{x:number,y:number,dir:Direction,anim:AnimState, location?: Location}): void;
  sendLocationChange(location: Location, spawn?: {x:number,y:number}): void;
  sendInteraction(payload:{type:string, targetId?:string, message?:string}): void;
  onPlayerJoined(cb:(p:Player)=>void):Unsub;
  onPlayerMoved(cb:(p:PlayerMovedPayload)=>void):Unsub;
  onPlayerStopped(cb:(p:{id:string})=>void):Unsub;
  onPlayerLeft(cb:(p:PlayerLeftPayload)=>void):Unsub;
  onPlayerLocationChanged(cb:(p:PlayerLocationPayload)=>void):Unsub;
  onPlayerInteraction(cb:(p:PlayerInteractionPayload)=>void):Unsub;
}

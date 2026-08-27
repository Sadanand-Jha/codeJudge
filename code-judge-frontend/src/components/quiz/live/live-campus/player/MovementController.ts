"use client";
import { Direction, AnimState, PLAYER_SPEED } from "../types";
import { slideMove } from "../world/CollisionSystem";

export interface MovementState {
  x:number; y:number; dir:Direction; anim:AnimState; moving:boolean;
}

export class MovementController {
  private keys = new Set<string>();
  private lastSent = 0;
  private sendThrottleMs = 85; // ~12 Hz
  constructor(
    private getPos: ()=>{x:number,y:number},
    private setPos: (x:number,y:number,dir:Direction,anim:AnimState)=>void,
    private onSend: (payload:{x:number,y:number,dir:Direction,anim:AnimState})=>void,
  ){}

  attach(){
    const onDown = (e:KeyboardEvent)=>{
      const k = e.key.toLowerCase();
      if (["arrowup","arrowdown","arrowleft","arrowright","w","a","s","d"," "].includes(k) || k==="e") {
        // prevent scroll on arrows
        if (["arrowup","arrowdown","arrowleft","arrowright"," "].includes(e.key.toLowerCase())) e.preventDefault();
      }
      if (["arrowup","w"].includes(k)) this.keys.add("up");
      if (["arrowdown","s"].includes(k)) this.keys.add("down");
      if (["arrowleft","a"].includes(k)) this.keys.add("left");
      if (["arrowright","d"].includes(k)) this.keys.add("right");
    };
    const onUp = (e:KeyboardEvent)=>{
      const k = e.key.toLowerCase();
      if (["arrowup","w"].includes(k)) this.keys.delete("up");
      if (["arrowdown","s"].includes(k)) this.keys.delete("down");
      if (["arrowleft","a"].includes(k)) this.keys.delete("left");
      if (["arrowright","d"].includes(k)) this.keys.delete("right");
    };
    const onBlur = ()=> this.keys.clear();
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", onBlur);
    return ()=>{
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
    };
  }

  /** joystick override for mobile */
  setJoystick(dir: Direction | null, active:boolean){
    if (!active || !dir){
      this.keys.delete("joy-up");this.keys.delete("joy-down");this.keys.delete("joy-left");this.keys.delete("joy-right");
      return;
    }
    this.keys.delete("joy-up");this.keys.delete("joy-down");this.keys.delete("joy-left");this.keys.delete("joy-right");
    this.keys.add("joy-"+dir);
  }

  isKey(k:string){ return this.keys.has(k); }

  update(dt:number){
    const pos = this.getPos();
    let dx=0, dy=0;
    if (this.keys.has("up")||this.keys.has("joy-up")) dy -=1;
    if (this.keys.has("down")||this.keys.has("joy-down")) dy +=1;
    if (this.keys.has("left")||this.keys.has("joy-left")) dx -=1;
    if (this.keys.has("right")||this.keys.has("joy-right")) dx +=1;
    const moving = dx!==0 || dy!==0;
    let dir: Direction = "down";
    let anim: AnimState = moving ? "walk" : "idle";
    if (moving){
      const len = Math.hypot(dx,dy);
      dx/=len; dy/=len;
      if (Math.abs(dx) > Math.abs(dy)) dir = dx>0 ? "right" : "left";
      else dir = dy>0 ? "down" : "up";
    } else {
      // keep last dir (queried via get)
      const cur = pos as any;
      dir = (cur.dir as Direction) || "down";
    }
    let nx = pos.x + dx * PLAYER_SPEED * dt;
    let ny = pos.y + dy * PLAYER_SPEED * dt;
    if (moving){
      const res = slideMove(pos.x, pos.y, nx - pos.x, ny - pos.y);
      nx = res.x; ny = res.y;
    } else {
      nx = pos.x; ny = pos.y;
    }
    this.setPos(nx, ny, dir, anim);
    const now = performance.now();
    if (moving && now - this.lastSent > this.sendThrottleMs){
      this.lastSent = now;
      this.onSend({x:nx, y:ny, dir, anim});
    } else if (!moving && this.lastSent !== 0){
      // send stopped once
      if (now - this.lastSent > 120){
        this.lastSent = now;
        this.onSend({x:nx, y:ny, dir, anim:"idle"});
      }
    }
    return {x:nx,y:ny,dir,anim,moving};
  }
}

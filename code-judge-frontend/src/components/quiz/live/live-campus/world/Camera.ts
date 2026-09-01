"use client";
import { WORLD_W, WORLD_H } from "../types";

export class Camera {
  x = 0;
  y = 0;
  w = 0;
  h = 0;
  baseW = 0;
  baseH = 0;
  zoom = 1;
  targetX = 0;
  targetY = 0;
  lerp = 0.12;
  constructor(w:number,h:number){
    this.baseW=w; this.baseH=h;
    this.w=w; this.h=h;
  }
  setViewport(w:number,h:number){
    this.baseW=w; this.baseH=h;
    this.w = w / this.zoom;
    this.h = h / this.zoom;
  }
  setZoom(z:number){
    this.zoom = Math.max(0.7, Math.min(1.35, z));
    this.w = this.baseW / this.zoom;
    this.h = this.baseH / this.zoom;
  }
  follow(px:number, py:number){
    this.targetX = px - this.w/2;
    this.targetY = py - this.h/2;
  }
  update(){
    this.x += (this.targetX - this.x)*this.lerp;
    this.y += (this.targetY - this.y)*this.lerp;
    this.x = Math.max(0, Math.min(WORLD_W - this.w, this.x));
    this.y = Math.max(0, Math.min(WORLD_H - this.h, this.y));
  }
  setImmediate(px:number,py:number){
    this.targetX = px - this.w/2;
    this.targetY = py - this.h/2;
    this.x = Math.max(0, Math.min(WORLD_W - this.w, this.targetX));
    this.y = Math.max(0, Math.min(WORLD_H - this.h, this.targetY));
  }
  isVisible(wx:number, wy:number, ww:number, wh:number){
    return wx+ww > this.x-300 && wx < this.x+this.w+300 && wy+wh > this.y-300 && wy < this.y+this.h+300;
  }
  getScale(){ return this.zoom; }
}

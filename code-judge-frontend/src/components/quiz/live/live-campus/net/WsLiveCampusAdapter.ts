"use client";
import { LiveCampusAdapter } from "./LiveCampusAdapter";
import { Player } from "../types";

/**
 * Stub for real WebSocket implementation.
 * Replace MockLiveCampusAdapter with this when backend is ready.
 * Contract matches the mock so UI doesn't change.
 */
export class WsLiveCampusAdapter implements LiveCampusAdapter {
  private ws?: WebSocket;
  private quizId?: string;
  private callbacks = {
    joined: [] as Array<(p:Player)=>void>,
    moved: [] as Array<(p:any)=>void>,
    stopped: [] as Array<(p:any)=>void>,
    left: [] as Array<(p:any)=>void>,
    loc: [] as Array<(p:any)=>void>,
    interact: [] as Array<(p:any)=>void>,
  };

  worldId = "";
  async joinWorld(quizId:string, local:Player){
    this.quizId = quizId; this.worldId=`quiz_${quizId}`;
    // TODO: const url = `${process.env.NEXT_PUBLIC_WS_URL}/ws/waiting/${quizId}?token=...`
    // this.ws = new WebSocket(url);
    // this.ws.onmessage = (ev)=>{
    //   const msg = JSON.parse(ev.data);
    //   switch(msg.type){
    //     case "PLAYER_JOINED": this.callbacks.joined.forEach(cb=>cb(msg.payload)); break;
    //     case "PLAYER_MOVED": this.callbacks.moved.forEach(cb=>cb(msg.payload)); break;
    //     case "PLAYER_STOPPED": this.callbacks.stopped.forEach(cb=>cb(msg.payload)); break;
    //     case "PLAYER_LEFT": this.callbacks.left.forEach(cb=>cb(msg.payload)); break;
    //     case "PLAYER_ENTERED_BUILDING": this.callbacks.loc.forEach(cb=>cb(msg.payload)); break;
    //     case "PLAYER_LEFT_BUILDING": this.callbacks.loc.forEach(cb=>cb(msg.payload)); break;
    //     case "PLAYER_INTERACTION": this.callbacks.interact.forEach(cb=>cb(msg.payload)); break;
    //   }
    // }
    console.info("[WsLiveCampusAdapter] joinWorld stub", quizId, local.id);
  }
  leaveWorld(){
    this.ws?.close();
    this.ws=undefined;
  }
  sendMovement(payload:{x:number,y:number,dir:any,anim:any, location?:any}){
    // this.ws?.send(JSON.stringify({type:"PLAYER_MOVED", payload: {...payload, worldId:this.worldId}}));
  }
  sendLocationChange(location:any){
    // this.ws?.send(JSON.stringify({type:"PLAYER_LOCATION_CHANGED", payload:{ location, worldId:this.worldId }}));
  }
  sendInteraction(payload:{type:string,targetId?:string,message?:string}){
    // this.ws?.send(JSON.stringify({type:"PLAYER_INTERACTION", payload}));
  }
  onPlayerJoined(cb:(p:Player)=>void){ this.callbacks.joined.push(cb); return ()=>{this.callbacks.joined=this.callbacks.joined.filter(c=>c!==cb)}}
  onPlayerMoved(cb:(p:any)=>void){ this.callbacks.moved.push(cb); return ()=>{this.callbacks.moved=this.callbacks.moved.filter(c=>c!==cb)}}
  onPlayerStopped(cb:(p:any)=>void){ this.callbacks.stopped.push(cb); return ()=>{this.callbacks.stopped=this.callbacks.stopped.filter(c=>c!==cb)}}
  onPlayerLeft(cb:(p:any)=>void){ this.callbacks.left.push(cb); return ()=>{this.callbacks.left=this.callbacks.left.filter(c=>c!==cb)}}
  onPlayerLocationChanged(cb:(p:any)=>void){ this.callbacks.loc.push(cb); return ()=>{this.callbacks.loc=this.callbacks.loc.filter(c=>c!==cb)}}
  onPlayerInteraction(cb:(p:any)=>void){ this.callbacks.interact.push(cb); return ()=>{this.callbacks.interact=this.callbacks.interact.filter(c=>c!==cb)}}
}

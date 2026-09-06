"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useTheme } from "@/context/ThemeContext";
import { Player, WORLD_W, WORLD_H, Location, HouseId, INTERIOR_W, INTERIOR_H, PLAYER_RADIUS } from "./types";
import { HOUSES, getHouseAt } from "./world/worldData";
import { Camera } from "./world/Camera";
import { drawWorld, drawInterior, drawPlayers } from "./world/Renderer";
import { MovementController } from "./player/MovementController";
import { WaitingRoomOverlay } from "./overlays/WaitingRoomOverlay";
import { ControlsOverlay } from "./overlays/ControlsOverlay";
import { MiniMap } from "./overlays/MiniMap";
import { MockLiveCampusAdapter } from "./net/MockLiveCampusAdapter";
import { LiveCampusAdapter } from "./net/LiveCampusAdapter";
import { getAvatarUrlById } from "@/config/dicebear";
import { useAuthStore } from "@/store/authStore";
import { getInterior, interiorSlide } from "./world/interiorsData";
import { slideMove, wouldCollide } from "./world/CollisionSystem";
import { useQuizGameConfig } from "@/hooks/useQuizGameConfig";
import type { QuizGameConfig } from "@/services/quiz";

interface Props {
  quizId: string;
  quizName: string;
  startsIn: string;
  totalCapacity?: number;
  /** Optional pre-loaded config — if not provided, LiveCampus will fetch it (loading state required). */
  gameConfig?: QuizGameConfig | null;
}

export default function LiveCampus({ quizId, quizName, startsIn, totalCapacity=100, gameConfig: propConfig }: Props){
  const { theme } = useTheme();
  const isDark = theme==="dark";
  const user = useAuthStore(s=> s.user);
  // Load persisted game config before initializing the game (live quiz: Quiz -> QuizGameConfig -> Live Game).
  // Do not start with stale/default if backend request is still pending.
  const numericQuizId = (() => {
    const n = Number(quizId);
    return Number.isFinite(n) && String(n) === String(quizId).trim() ? String(n) : null;
  })();
  const fetched = useQuizGameConfig(numericQuizId ?? undefined);
  // If quizId is a code (non-numeric) we cannot fetch by id; treat as no persisted config and use defaults locally.
  const hasNumericId = numericQuizId !== null;
  const fallbackForCode: QuizGameConfig | null = !hasNumericId && !propConfig
    ? { quizId: 0, enabled: true, movementEnabled: true, movementSpeed: 5, lives: 3, pointsEnabled: true, powerupsEnabled: false, respawnEnabled: true, damageEnabled: false }
    : null;
  const effectiveConfig: QuizGameConfig | null = propConfig ?? (hasNumericId ? fetched.config : fallbackForCode);
  const configLoading = !propConfig && hasNumericId && fetched.loading;
  const configError = !propConfig && hasNumericId ? fetched.error : null;
  const gameCfgRef = useRef<QuizGameConfig | null>(effectiveConfig);
  useEffect(() => { gameCfgRef.current = effectiveConfig; }, [effectiveConfig]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camRef = useRef<Camera | null>(null);
  const camInteriorRef = useRef<Camera | null>(null);
  const playersRef = useRef<Map<string, Player>>(new Map());
  const localIdRef = useRef<string>("local-"+(user?.id ?? "anon"));
  const adapterRef = useRef<LiveCampusAdapter | null>(null);
  const movementRef = useRef<MovementController | null>(null);
  const rafRef = useRef<number | null>(null);
  const locationRef = useRef<Location>({type:"campus"});
  const [location, setLocation] = useState<Location>({type:"campus"});
  const [online, setOnline] = useState(1);
  const [housePrompt, setHousePrompt] = useState<null | {label:string, id:HouseId}>(null);
  const [exitPrompt, setExitPrompt] = useState(false);
  const [playerPrompt, setPlayerPrompt] = useState<null | {name:string, id:string}>(null);
  const [interactPrompt, setInteractPrompt] = useState<string|null>(null);
  const [modal, setModal] = useState<string | null>(null);
  const [waveToast, setWaveToast] = useState<string | null>(null);
  const [transition, setTransition] = useState(0); // 0 no, 1 fading
  const [zoom, setZoom] = useState(1.05);
  const [mapTick, setMapTick] = useState(0);
  const joyDirRef = useRef<string | null>(null);

  const localName = user?.displayName || user?.username || "You";

  const getLocal = useCallback(()=> {
    const m = playersRef.current.get(localIdRef.current);
    if(m) return m;
    const p: Player = {
      id: localIdRef.current,
      name: localName,
      avatarUrl: user?.avatarUrl || getAvatarUrlById(Number(user?.id ? (parseInt(String(user.id).slice(-2),10)%7)+1 : 1)),
      avatarId: 1,
      // spawn near plaza center, not world center, for cozy campus
      x: 1600, y: 860,
      vx:0, vy:0, dir:"down", anim:"idle", isLocal:true, lastUpdated: Date.now(),
      location:{type:"campus"},
    };
    playersRef.current.set(p.id, p);
    return p;
  }, [localName, user]);

  // keep refs synced
  useEffect(()=>{ locationRef.current = location; }, [location]);
  useEffect(()=>{
    camRef.current?.setZoom(zoom);
    camInteriorRef.current?.setZoom(1); // interior stays 1
  }, [zoom]);
  useEffect(()=>{ const id=setInterval(()=> setMapTick(t=>t+1), 500); return ()=>clearInterval(id); }, []);

  const enterBuilding = useCallback((houseId: HouseId)=>{
    const interior = getInterior(houseId);
    setTransition(1);
    setTimeout(()=>{
      const local = playersRef.current.get(localIdRef.current);
      if(local){
        local.location = {type:"building", buildingId: houseId};
        local.x = interior.spawn.x; local.y = interior.spawn.y;
        (local as any)._loc = local.location;
      }
      locationRef.current = {type:"building", buildingId: houseId};
      setLocation({type:"building", buildingId: houseId});
      adapterRef.current?.sendLocationChange({type:"building", buildingId: houseId});
      // reset interior camera
      if(camInteriorRef.current){
        camInteriorRef.current.setImmediate(interior.spawn.x, interior.spawn.y);
      }
      setTransition(0);
    }, 280);
  }, []);

  /**
   * Exit the current building and place the player on the campus outside the door.
   * Detects which wall the door is on (top/bottom/left/right) and positions the
   * player outside the building's collidable rect with enough clearance to avoid
   * getting stuck. Previously used a fixed Y offset which caused players to spawn
   * inside the building for non-bottom doors (CodingLab, Lounge, QuizHall).
   */
  const exitBuilding = useCallback(()=>{
    const cur = locationRef.current as any;
    if(cur.type!=="building") return;
    const houseId: HouseId = cur.buildingId;
    const house = HOUSES.find(h=>h.id===houseId);
    setTransition(1);
    setTimeout(()=>{
      const local = playersRef.current.get(localIdRef.current);
      if(local && house){
        local.location = {type:"campus"};
        (local as any)._loc = local.location;
        const doorCenterX = house.door.x + house.door.w / 2;
        const doorCenterY = house.door.y + house.door.h / 2;
        const houseBottom = house.y + house.h;
        const houseRight = house.x + house.w;
        const clear = PLAYER_RADIUS + 6;
        if (doorCenterY >= houseBottom - 10) {
          local.x = doorCenterX;
          local.y = houseBottom + clear;
        } else if (doorCenterY <= house.y + 10) {
          local.x = doorCenterX;
          local.y = house.y - clear;
        } else if (doorCenterX <= house.x + 10) {
          local.x = house.x - clear;
          local.y = doorCenterY;
        } else if (doorCenterX >= houseRight - 10) {
          local.x = houseRight + clear;
          local.y = doorCenterY;
        } else {
          local.x = doorCenterX;
          local.y = houseBottom + clear;
        }
      }
      locationRef.current = {type:"campus"};
      setLocation({type:"campus"});
      adapterRef.current?.sendLocationChange({type:"campus"});
      if(camRef.current && house){
        camRef.current.setImmediate(house.door.x, house.door.y+20);
      }
      setTransition(0);
    }, 280);
  }, []);

  // If config is still loading, do not initialize the game with potentially incorrect mechanics.
  // Wait for the fetch to complete; show loading outside.
  useEffect(()=>{
    if (configLoading) return;
    const canvas = canvasRef.current;
    if(!canvas) return;
    const ctx = canvas.getContext("2d");
    if(!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = ()=>{
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr,0,0,dpr,0,0);
      const w = rect.width, h= rect.height;
      if(!camRef.current) camRef.current = new Camera(w,h);
      else camRef.current.setViewport(w,h);
      if(!camInteriorRef.current) camInteriorRef.current = new Camera(w,h);
      else camInteriorRef.current.setViewport(w,h);
      const local = getLocal();
      const loc = locationRef.current;
      if(loc.type==="campus") camRef.current.setImmediate(local.x, local.y);
      else camInteriorRef.current.setImmediate(local.x, local.y);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    window.addEventListener("resize", resize);

    const adapter = new MockLiveCampusAdapter();
    adapterRef.current = adapter;
    const local = getLocal();
    adapter.joinWorld(quizId, local);

    const unsubs: Array<()=>void> = [];
    unsubs.push(adapter.onPlayerJoined(p=>{
      if(p.id===localIdRef.current) return;
      const loc = (p as any).location ?? {type:"campus"};
      (p as any)._loc = loc;
      p.location = loc;
      playersRef.current.set(p.id, {...p, targetX:p.x, targetY:p.y, location: loc} as any);
      setOnline(playersRef.current.size);
    }));
    unsubs.push(adapter.onPlayerMoved(payload=>{
      const ex = playersRef.current.get(payload.id);
      const loc = (payload as any).location ?? ex?.location ?? {type:"campus"};
      if(!ex) {
        const np: Player = { id:payload.id, name:"Student", x:payload.x, y:payload.y, vx:0, vy:0, dir:payload.dir, anim:payload.anim, lastUpdated: Date.now(), targetX:payload.x, targetY:payload.y, location: loc } as any;
        (np as any)._loc = loc;
        playersRef.current.set(payload.id, np);
      } else {
        (ex as any)._loc = loc;
        ex.location = loc as any;
        ex.targetX = payload.x; ex.targetY = payload.y; ex.dir = payload.dir; ex.anim = payload.anim; ex.lastUpdated = Date.now();
      }
    }));
    unsubs.push(adapter.onPlayerLocationChanged(payload=>{
      const ex = playersRef.current.get(payload.id);
      if(ex){
        ex.location = payload.location as any;
        (ex as any)._loc = payload.location;
        if(payload.x!=null) { ex.x = payload.x; ex.targetX = payload.x; }
        if(payload.y!=null) { ex.y = payload.y; ex.targetY = payload.y; }
      }
    }));
    unsubs.push(adapter.onPlayerStopped(({id})=>{
      const ex = playersRef.current.get(id); if(ex) ex.anim="idle";
    }));
    unsubs.push(adapter.onPlayerLeft(({id})=>{
      playersRef.current.delete(id); setOnline(playersRef.current.size);
    }));
    unsubs.push(adapter.onPlayerInteraction((evt:any)=>{
      if (evt.fromId !== localIdRef.current && evt.type==="wave"){
        const from = playersRef.current.get(evt.fromId);
        setWaveToast(`${from?.name ?? "Someone"} waved at you 👋`);
        setTimeout(()=> setWaveToast(null), 2500);
      }
      if (evt.fromId===localIdRef.current && evt.type==="wave"){
        setWaveToast(`You waved 👋`);
        setTimeout(()=> setWaveToast(null), 1800);
      }
    }));

    // Persisted game config is the source of truth — never use hardcoded PLAYER_SPEED alone.
    // Game behavior is driven by the saved configuration
    const cfg = gameCfgRef.current;
    const movement = new MovementController(
      ()=> {
        const l = playersRef.current.get(localIdRef.current)!;
        return {x:l.x, y:l.y, dir: l.dir} as any;
      },
      (x,y,dir,anim)=>{
        const l = playersRef.current.get(localIdRef.current);
        if(!l) return;
        l.x=x; l.y=y; l.dir=dir; l.anim=anim; l.lastUpdated=Date.now();
        (l as any)._loc = locationRef.current;
      },
      (payload)=> {
        const loc = locationRef.current;
        adapter.sendMovement({...payload, location: loc} as any);
      },
      cfg
    );
    // keep movement's config in sync if fetched later (e.g. after initial render)
    if (cfg) movement.setGameConfig(cfg);
    movementRef.current = movement;
    const detachKeys = movement.attach();

    // Override movement update for interior collision
    const origUpdate = movement.update.bind(movement);
    movement.update = (dt:number)=>{
      const localP = playersRef.current.get(localIdRef.current);
      if(!localP) return origUpdate(dt);
      const loc = locationRef.current;
      if(loc.type==="campus"){
        // use original which uses campus slideMove
        return origUpdate(dt);
      } else {
        // interior movement: manual
        const keys = (movement as any).keys as Set<string>;
        let dx=0, dy=0;
        if(keys.has("up")||keys.has("joy-up")) dy-=1;
        if(keys.has("down")||keys.has("joy-down")) dy+=1;
        if(keys.has("left")||keys.has("joy-left")) dx-=1;
        if(keys.has("right")||keys.has("joy-right")) dx+=1;
        const moving = dx!==0||dy!==0;
        let dir = localP.dir;
        let anim: any = moving?"walk":"idle";
        if(moving){
          const len=Math.hypot(dx,dy); dx/=len; dy/=len;
          if(Math.abs(dx)>Math.abs(dy)) dir=dx>0?"right":"left"; else dir=dy>0?"down":"up";
        }
        // Use persisted movementSpeed for interiors too (mirrors campus calculation)
        const interiorCfg = gameCfgRef.current;
        if (interiorCfg && !interiorCfg.movementEnabled) {
          localP.anim = "idle" as any;
          return {x: localP.x, y: localP.y, dir: localP.dir, anim:"idle" as any, moving:false} as any;
        }
        const interiorBase = 200;
        const speed = interiorCfg ? (interiorCfg.movementSpeed / 5) * interiorBase : interiorBase;
        let nx = localP.x + dx*speed*dt;
        let ny = localP.y + dy*speed*dt;
        if(moving){
          const res = interiorSlide(loc.buildingId, localP.x, localP.y, nx-localP.x, ny-localP.y);
          nx=res.x; ny=res.y;
        }
        localP.x=nx; localP.y=ny; localP.dir=dir as any; localP.anim=anim;
        (localP as any)._loc = loc;
        // throttled send
        const now = performance.now();
        const lastSent = (movement as any).lastSent ?? 0;
        if(moving && now - lastSent > 85){
          (movement as any).lastSent = now;
          adapter.sendMovement({x:nx,y:ny,dir:dir as any,anim, location: loc} as any);
        } else if(!moving && lastSent!==0 && now-lastSent>120){
          (movement as any).lastSent = now;
          adapter.sendMovement({x:nx,y:ny,dir:dir as any,anim:"idle", location: loc} as any);
        }
        return {x:nx,y:ny,dir,anim,moving} as any;
      }
    };

    const onKeyE = (e:KeyboardEvent)=>{
      const k = e.key.toLowerCase();
      if(k==="r"){
        // Respect persisted respawnEnabled — if false, R does nothing
        if (gameCfgRef.current && !gameCfgRef.current.respawnEnabled) {
          setWaveToast("Respawn disabled by game config");
          setTimeout(()=> setWaveToast(null), 1500);
          return;
        }
        // unstuck: teleport to spawn / campus center
        const loc = locationRef.current;
        const localP = playersRef.current.get(localIdRef.current);
        if(!localP) return;
        if(loc.type==="building"){
          const interior = getInterior(loc.buildingId);
          localP.x = interior.spawn.x; localP.y = interior.spawn.y;
          if(camInteriorRef.current) camInteriorRef.current.setImmediate(localP.x, localP.y);
          setWaveToast("Respawned — you were unstuck ✓");
          setTimeout(()=> setWaveToast(null), 1800);
        } else {
          localP.x = 1600; localP.y = 1060;
          if(camRef.current) camRef.current.setImmediate(localP.x, localP.y);
          setWaveToast("Respawned to plaza ✓");
          setTimeout(()=> setWaveToast(null), 1800);
        }
        return;
      }
      /**
       * Spacebar jump — emergency unstuck mechanic for campus mode.
       * Only activates when the player is currently inside a collision (stuck).
       * Teleports the player 120px in the direction they're facing. If the jump
       * position is also blocked, falls back to rescuing them to the campus plaza.
       */
      if(k===" "){
        const loc = locationRef.current;
        const localP = playersRef.current.get(localIdRef.current);
        if(!localP) return;
        if(loc.type==="building") return;
        if(!wouldCollide(localP.x, localP.y)) return;
        const dir = localP.dir || "down";
        const jumpDist = 120;
        let jx = localP.x, jy = localP.y;
        if(dir==="up") jy -= jumpDist;
        else if(dir==="down") jy += jumpDist;
        else if(dir==="left") jx -= jumpDist;
        else if(dir==="right") jx += jumpDist;
        jx = Math.max(PLAYER_RADIUS, Math.min(WORLD_W - PLAYER_RADIUS, jx));
        jy = Math.max(PLAYER_RADIUS, Math.min(WORLD_H - PLAYER_RADIUS, jy));
        if(!wouldCollide(jx, jy)){
          localP.x = jx; localP.y = jy;
          if(camRef.current) camRef.current.setImmediate(jx, jy);
          adapter.sendMovement({x:jx, y:jy, dir, anim:"idle", location: loc} as any);
          setWaveToast("Jumped free! ✓");
          setTimeout(()=> setWaveToast(null), 1800);
        } else {
          localP.x = 1600; localP.y = 1060;
          if(camRef.current) camRef.current.setImmediate(1600, 1060);
          adapter.sendMovement({x:1600, y:1060, dir:"down", anim:"idle", location: loc} as any);
          setWaveToast("Rescued to plaza ✓");
          setTimeout(()=> setWaveToast(null), 1800);
        }
        return;
      }
      if(k!=="e") return;
      const loc = locationRef.current;
      const localP = playersRef.current.get(localIdRef.current);
      if(!localP) return;
      if(loc.type==="campus"){
        const hp = getHouseAt(localP.x, localP.y);
        if(hp){ enterBuilding(hp.id); return; }
        // check player interact
        const near = findNearestPlayer();
        if(near){
          adapter.sendInteraction({type:"wave", targetId: near.id});
          setModal(`${near.name}\n\nWaiting for the quiz...\nTap Wave to say hi!`);
        } else if(interactPrompt){
          setModal(`${interactPrompt} will be available soon.`);
        }
      } else {
        // interior: check exit
        const interior = getInterior(loc.buildingId);
        const dx = localP.x - (interior.exit.x+interior.exit.w/2);
        const dy = localP.y - (interior.exit.y+interior.exit.h/2);
        if(Math.hypot(dx,dy)<64){ exitBuilding(); return; }
        // house-specific interact near furniture
        const nearObj = findNearestInteriorInteract(loc.buildingId, localP.x, localP.y);
        if(nearObj){
          setModal(`${nearObj} — coming soon!`);
        } else {
          const near = findNearestPlayer();
          if(near){
            adapter.sendInteraction({type:"wave", targetId: near.id});
            setModal(`${near.name}\n\nWaiting for the quiz...\nTap Wave to say hi!`);
          }
        }
      }
    };
    window.addEventListener("keydown", onKeyE);

    function findNearestPlayer(): Player | null{
      const localP = playersRef.current.get(localIdRef.current);
      if(!localP) return null;
      const loc = locationRef.current;
      let best: Player|null=null; let bestD=88;
      for(const p of playersRef.current.values()){
        if(p.id===localIdRef.current) continue;
        const ploc = (p as any)._loc ?? p.location ?? {type:"campus"};
        if(ploc.type!==loc.type) continue;
        if(ploc.type==="building" && loc.type==="building" && ploc.buildingId!==loc.buildingId) continue;
        const d=Math.hypot(p.x-localP.x, p.y-localP.y);
        if(d<bestD){ bestD=d; best=p; }
      }
      return best;
    }
    function findNearestInteriorInteract(bId:HouseId, x:number,y:number): string|null{
      const map:any = {
        codingLab: [{x:400,y:80,label:"Use Computer",rx:80},{x:120,y:200,label:"Use Computer",rx:40}],
        library: [{x:180,y:220,label:"Browse Books",rx:50}],
        lounge: [{x:340,y:300,label:"Sit",rx:50}],
      };
      const arr = map[bId] as Array<any>|undefined;
      if(!arr) return null;
      for(const a of arr){ if(Math.hypot(x-a.x, y-a.y)<a.rx) return a.label; }
      return null;
    }

    let last = performance.now();
    const loop = (now:number)=>{
      const dt = Math.min(0.05, (now - last)/1000);
      last = now;

      movement.update(dt);

      const localP = playersRef.current.get(localIdRef.current);
      const loc = locationRef.current;
      // camera follow per location
      if(localP){
        if(loc.type==="campus" && camRef.current){
          camRef.current.follow(localP.x, localP.y); camRef.current.update();
        } else if(loc.type==="building" && camInteriorRef.current){
          camInteriorRef.current.follow(localP.x, localP.y); camInteriorRef.current.update();
          // clamp interior cam to interior size
          camInteriorRef.current.x = Math.max(0, Math.min(INTERIOR_W - camInteriorRef.current.w, camInteriorRef.current.x));
          camInteriorRef.current.y = Math.max(0, Math.min(INTERIOR_H - camInteriorRef.current.h, camInteriorRef.current.y));
        }
      }
      for(const [id,p] of playersRef.current){
        if(id===localIdRef.current) continue;
        if(p.targetX!=null && p.targetY!=null){
          const ploc = (p as any)._loc ?? p.location;
          const lloc = locationRef.current;
          // only interpolate if same world
          const same = ploc?.type===lloc.type && (ploc.type==="campus" || ploc.buildingId=== (lloc as any).buildingId);
          if(!same) continue;
          p.x += (p.targetX - p.x)*0.16;
          p.y += (p.targetY - p.y)*0.16;
        }
      }

      // draw
      const cam = loc.type==="campus" ? camRef.current! : camInteriorRef.current!;
      // filter players by location — with performance cap (max 15 visible roamers + local)
      const allForLoc = Array.from(playersRef.current.values()).filter(p=>{
        const ploc = (p as any)._loc ?? p.location ?? {type:"campus"};
        if(ploc.type!==loc.type) return false;
        if(ploc.type==="building" && loc.type==="building" && ploc.buildingId!== (loc as any).buildingId) return false;
        return true;
      });
      // keep local always, cap remotes to nearest 14 to local (or first 14 if no local)
      const MAX_REMOTES = 14;
      let players: Player[];
      if(allForLoc.length <= MAX_REMOTES+1){
        players = allForLoc;
      } else {
        const local = allForLoc.find(p=>p.id===localIdRef.current);
        const remotes = allForLoc.filter(p=>p.id!==localIdRef.current);
        // sort remotes by distance to local (nearest first) for natural distribution
        if(local){
          remotes.sort((a,b)=> Math.hypot(a.x-local.x, a.y-local.y) - Math.hypot(b.x-local.x, b.y-local.y));
        }
        players = local ? [local, ...remotes.slice(0, MAX_REMOTES)] : remotes.slice(0, MAX_REMOTES+1);
      }
      // ensure local has _loc for renderer tag scale
      if(localP) (localP as any)._loc = loc;
      const rect = canvas.getBoundingClientRect();
      ctx.setTransform(dpr,0,0,dpr,0,0);
      if(loc.type==="campus"){
        drawWorld(ctx as CanvasRenderingContext2D, cam, isDark, rect.width, rect.height);
      } else {
        // draw interior background
        ctx.fillStyle = isDark ? "#0a0f0a" : "#E8F5E2";
        ctx.fillRect(0,0, rect.width, rect.height);
        drawInterior(ctx as CanvasRenderingContext2D, cam, (loc as any).buildingId, isDark, now);
      }
      drawPlayers(ctx as CanvasRenderingContext2D, cam, players, localIdRef.current, isDark, now);

      // prompts
      if(localP){
        if(loc.type==="campus"){
          const hp = getHouseAt(localP.x, localP.y);
          const hpLabel = hp ? hp.label : null;
          (loop as any)._lastHouse = (loop as any)._lastHouse ?? null;
          if((loop as any)._lastHouse !== hpLabel){
            (loop as any)._lastHouse = hpLabel;
            if(hp) setHousePrompt({label: hp.label, id: hp.id}); else setHousePrompt(null);
          }
          const nearest = findNearestPlayer();
          const curNearest = nearest ? nearest.id : null;
          (loop as any)._lastNearestId = (loop as any)._lastNearestId ?? null;
          if((loop as any)._lastNearestId !== curNearest){
            (loop as any)._lastNearestId = curNearest;
            if(nearest) setPlayerPrompt({name: nearest.name, id: nearest.id}); else setPlayerPrompt(null);
          }
          // furniture prompt
          setInteractPrompt(null);
          // exit not in campus
          setExitPrompt(false);
        } else {
          // interior prompts
          setHousePrompt(null);
          setPlayerPrompt(null);
          const interior = getInterior((loc as any).buildingId);
          const dx = localP.x - (interior.exit.x+interior.exit.w/2);
          const dy = localP.y - (interior.exit.y+interior.exit.h/2);
          const nearExit = Math.hypot(dx,dy)<64;
          (loop as any)._lastExit = (loop as any)._lastExit ?? false;
          if((loop as any)._lastExit !== nearExit){ (loop as any)._lastExit = nearExit; setExitPrompt(nearExit); }
          const nearObj = findNearestInteriorInteract((loc as any).buildingId, localP.x, localP.y);
          (loop as any)._lastObj = (loop as any)._lastObj ?? null;
          if((loop as any)._lastObj !== nearObj){ (loop as any)._lastObj = nearObj; setInteractPrompt(nearObj); }
          const nearest = findNearestPlayer();
          if(nearest) setPlayerPrompt({name: nearest.name, id: nearest.id}); else setPlayerPrompt(null);
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return ()=>{
      if(rafRef.current) cancelAnimationFrame(rafRef.current);
      ro.disconnect(); window.removeEventListener("resize", resize as any);
      detachKeys(); window.removeEventListener("keydown", onKeyE);
      unsubs.forEach(fn=>fn()); adapter.leaveWorld();
    };
  }, [quizId, getLocal, isDark, enterBuilding, exitBuilding]);

  useEffect(()=>{ canvasRef.current?.focus(); }, [location]);

  // Keep movement controller in sync when config finishes loading (avoids stale defaults)
  useEffect(() => {
    if (movementRef.current && effectiveConfig) {
      movementRef.current.setGameConfig(effectiveConfig);
    }
  }, [effectiveConfig]);

  const handleJoy = (dir:string|null, active:boolean)=>{
    movementRef.current?.setJoystick(dir as any, active);
  };

  const locLabel = location.type==="campus" ? "📍 Campus" : `📍 ${getInterior((location as any).buildingId).label}`;

  // Do not start game with stale config; show loading/error states
  if (configLoading) {
    return (
      <div className="relative w-full h-full flex items-center justify-center" style={{ background: isDark ? "#1b3a23" : "#BFE07A" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#E91E63] border-t-transparent" />
          <p className="text-sm text-text-muted">Loading game configuration…</p>
          <p className="text-xs text-text-muted">Quiz → QuizGameConfig → Live Game</p>
        </div>
      </div>
    );
  }
  if (configError) {
    return (
      <div className="relative w-full h-full flex items-center justify-center p-6" style={{ background: isDark ? "#1b3a23" : "#BFE07A" }}>
        <div className="max-w-md rounded-2xl border border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 p-6 text-center">
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Unable to load game configuration</p>
          <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{configError}</p>
          <p className="mt-2 text-[11px] text-text-muted">The game cannot start with potentially incorrect mechanics. Please retry.</p>
          <button onClick={() => fetched.refetch()} className="mt-3 rounded-xl bg-[#E91E63] px-4 py-2 text-xs font-semibold text-white">Retry</button>
        </div>
      </div>
    );
  }
  // If game is explicitly disabled via config, show disabled state (but still allow campus as waiting room)
  const gameDisabled = effectiveConfig?.enabled === false && numericQuizId !== null;
  // Note: enabled=false means TopDown game is disabled; we still show campus as waiting room but indicate disabled.

  // compute all campus players for minimap (mapTick forces refresh)
  void mapTick;
  const allPlayersForMap = Array.from(playersRef.current.values());

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: isDark ? "#1b3a23" : "#BFE07A" }}>
      <canvas
        ref={canvasRef}
        tabIndex={0}
        className="absolute inset-0 w-full h-full outline-none"
        style={{ touchAction:"none" }}
        onClick={()=> canvasRef.current?.focus()}
        onWheel={(e)=>{
          e.preventDefault();
          const delta = e.deltaY > 0 ? -0.07 : 0.07;
          setZoom(z=> Math.max(0.85, Math.min(1.35, z+delta)));
        }}
      />
      <WaitingRoomOverlay quizName={quizName} ready={online} total={totalCapacity} startsIn={startsIn} isDark={isDark} roomCode={quizId}/>
      <ControlsOverlay online={online} isDark={isDark}/>
      {/* Minimap */}
      {location.type==="campus" && <MiniMap players={allPlayersForMap} localId={localIdRef.current} isDark={isDark} />}
      {/* Zoom controls */}
      <div className="absolute top-[132px] right-3 z-20 hidden xl:flex flex-col gap-1">
        <button onClick={()=> setZoom(z=> Math.min(1.35, z+0.08))} className={`w-8 h-8 rounded-lg border flex items-center justify-center font-bold ${isDark? "bg-black/40 border-white/10 text-white":"bg-white/85 border-black/10 text-[#1a1a2e]"}`}>+</button>
        <button onClick={()=> setZoom(z=> Math.max(0.85, z-0.08))} className={`w-8 h-8 rounded-lg border flex items-center justify-center font-bold ${isDark? "bg-black/40 border-white/10 text-white":"bg-white/85 border-black/10 text-[#1a1a2e]"}`}>−</button>
        <span className={`text-[9px] text-center font-medium ${isDark?"text-white/60":"text-black/60"}`}>{Math.round(zoom*100)}%</span>
      </div>
      {/* location indicator */}
      <div className="absolute left-3 top-[100px] z-20 pointer-events-none flex items-center gap-2">
        <div className={`rounded-full border px-3 py-1 text-xs font-bold backdrop-blur-xl ${isDark? "bg-black/40 border-white/10 text-white":"bg-white/85 border-black/10 text-[#1a1a2e]"}`}>{locLabel}</div>
        {location.type!=="building" && <span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium backdrop-blur-xl ${isDark? "bg-black/30 border-white/10 text-white/70":"bg-white/70 border-black/10 text-black/60"}`}>Stuck? Press <span className="font-bold text-[#EC4899]">Space</span> to jump</span>}
      </div>
      {/* Persisted game config HUD — demonstrates that TopDown uses DB values, not hardcoded constants */}
      {effectiveConfig && (
        <div className="absolute left-3 top-[132px] z-20 pointer-events-none flex flex-wrap items-center gap-1.5 max-w-[72%]">
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold backdrop-blur-xl ${effectiveConfig.movementEnabled ? "bg-emerald-500/90 text-white border-emerald-500" : "bg-red-500/90 text-white border-red-500"}`}>
            {effectiveConfig.movementEnabled ? `Movement · ${effectiveConfig.movementSpeed}` : "Movement OFF"}
          </span>
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold backdrop-blur-xl ${isDark ? "bg-black/40 border-white/10 text-white" : "bg-white/85 border-black/10 text-[#1a1a2e]"}`}>
            Lives {effectiveConfig.lives} {effectiveConfig.respawnEnabled ? "↻" : "×"}
          </span>
          {effectiveConfig.pointsEnabled && <span className="rounded-full bg-amber-500/90 text-white border border-amber-500 px-2.5 py-1 text-[10px] font-bold backdrop-blur-xl">Points</span>}
          {effectiveConfig.powerupsEnabled && <span className="rounded-full bg-violet-500/90 text-white border border-violet-500 px-2.5 py-1 text-[10px] font-bold backdrop-blur-xl">Power-ups</span>}
          {effectiveConfig.damageEnabled && <span className="rounded-full bg-red-600/90 text-white border border-red-600 px-2.5 py-1 text-[10px] font-bold backdrop-blur-xl">Damage</span>}
          {gameDisabled && <span className="rounded-full bg-zinc-500/90 text-white border border-zinc-500 px-2.5 py-1 text-[10px] font-bold backdrop-blur-xl">Game Disabled</span>}
        </div>
      )}
      {/* transition fade */}
      {transition>0 && <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm transition-opacity duration-300" style={{opacity: transition}} />}

      {location.type==="campus" && housePrompt && !modal && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[92px] z-20 pointer-events-none">
          <div className={`rounded-xl border px-3 py-2 shadow-xl backdrop-blur-xl flex flex-col items-center ${isDark? "bg-black/55 border-white/10 text-white":"bg-white/90 border-black/10 text-[#1a1a2e]"}`}>
            <span className="text-xs font-bold">{housePrompt.label}</span>
            <span className="text-[10px] opacity-70">Press <span className="px-1 rounded bg-[#EC4899] text-white font-bold">E</span> to enter</span>
          </div>
        </div>
      )}
      {location.type==="building" && exitPrompt && !modal && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[92px] z-20 pointer-events-none">
          <div className={`rounded-xl border px-3 py-2 shadow-xl backdrop-blur-xl flex flex-col items-center ${isDark? "bg-black/55 border-white/10 text-white":"bg-white/90 border-black/10 text-[#1a1a2e]"}`}>
            <span className="text-xs font-bold">Exit</span>
            <span className="text-[10px] opacity-70">Press <span className="px-1 rounded bg-[#EC4899] text-white font-bold">E</span> to exit</span>
          </div>
        </div>
      )}
      {!housePrompt && !exitPrompt && interactPrompt && !modal && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[92px] z-20 pointer-events-none">
          <div className={`rounded-xl border px-3 py-2 shadow-xl backdrop-blur-xl flex flex-col items-center ${isDark? "bg-black/55 border-white/10 text-white":"bg-white/90 border-black/10 text-[#1a1a2e]"}`}>
            <span className="text-xs font-bold">{interactPrompt}</span>
            <span className="text-[10px] opacity-70">Press <span className="px-1 rounded bg-[#EC4899] text-white font-bold">E</span></span>
          </div>
        </div>
      )}
      {!housePrompt && !exitPrompt && !interactPrompt && playerPrompt && !modal && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[92px] z-20 pointer-events-none">
          <div className={`rounded-xl border px-3 py-2 shadow-xl backdrop-blur-xl flex flex-col items-center ${isDark? "bg-black/55 border-white/10 text-white":"bg-white/90 border-black/10 text-[#1a1a2e]"}`}>
            <span className="text-xs font-bold">{playerPrompt.name}</span>
            <span className="text-[10px] opacity-70">Press <span className="px-1 rounded bg-[#EC4899] text-white font-bold">E</span> to interact</span>
          </div>
        </div>
      )}

      {modal && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 p-4" onClick={()=>setModal(null)}>
          <div className={`w-full max-w-sm rounded-2xl border p-5 shadow-2xl ${isDark? "bg-[#111217] border-white/10 text-white":"bg-white border-black/10 text-[#1a1a2e]"}`} onClick={e=>e.stopPropagation()}>
            <h3 className="font-bold">Live Campus</h3>
            <p className="text-sm mt-2 whitespace-pre-wrap opacity-80">{modal}</p>
            <div className="flex gap-2 mt-4">
              {playerPrompt && modal.includes("Waiting for") && (
                <button onClick={()=>{
                  adapterRef.current?.sendInteraction({type:"wave", targetId: playerPrompt.id});
                  setModal(null);
                }} className="flex-1 h-9 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] text-white text-sm font-bold">Wave 👋</button>
              )}
              <button onClick={()=>setModal(null)} className={`flex-1 h-9 rounded-xl border text-sm font-semibold ${isDark? "border-white/10 bg-white/[0.04] text-white":"border-black/10 bg-black/[0.03] text-[#1a1a2e]"}`}>Close</button>
            </div>
          </div>
        </div>
      )}
      {waveToast && (
        <div className="absolute left-1/2 top-14 -translate-x-1/2 z-20 pointer-events-none">
          <div className="rounded-full bg-black/70 text-white px-4 py-2 text-xs font-semibold backdrop-blur">{waveToast}</div>
        </div>
      )}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 lg:hidden">
        <div className="flex flex-col items-center gap-1 select-none touch-manipulation">
          <button onTouchStart={()=>handleJoy("up", true)} onTouchEnd={()=>handleJoy("up", false)} onMouseDown={()=>handleJoy("up", true)} onMouseUp={()=>handleJoy("up", false)} onMouseLeave={()=>handleJoy("up", false)} className={`w-9 h-9 rounded-lg border flex items-center justify-center active:scale-95 ${isDark? "bg-black/40 border-white/10 text-white":"bg-white/80 border-black/10 text-[#1a1a2e]"}`}>↑</button>
          <div className="flex gap-1">
            <button onTouchStart={()=>handleJoy("left", true)} onTouchEnd={()=>handleJoy("left", false)} onMouseDown={()=>handleJoy("left", true)} onMouseUp={()=>handleJoy("left", false)} onMouseLeave={()=>handleJoy("left", false)} className={`w-9 h-9 rounded-lg border flex items-center justify-center ${isDark? "bg-black/40 border-white/10 text-white":"bg-white/80 border-black/10"}`}>←</button>
            <div className="w-9 h-9 rounded-lg bg-[#EC4899]/20 border border-[#EC4899]/30 flex items-center justify-center text-[#EC4899]">●</div>
            <button onTouchStart={()=>handleJoy("right", true)} onTouchEnd={()=>handleJoy("right", false)} onMouseDown={()=>handleJoy("right", true)} onMouseUp={()=>handleJoy("right", false)} onMouseLeave={()=>handleJoy("right", false)} className={`w-9 h-9 rounded-lg border flex items-center justify-center ${isDark? "bg-black/40 border-white/10 text-white":"bg-white/80 border-black/10"}`}>→</button>
          </div>
          <button onTouchStart={()=>handleJoy("down", true)} onTouchEnd={()=>handleJoy("down", false)} onMouseDown={()=>handleJoy("down", true)} onMouseUp={()=>handleJoy("down", false)} onMouseLeave={()=>handleJoy("down", false)} className={`w-9 h-9 rounded-lg border flex items-center justify-center ${isDark? "bg-black/40 border-white/10 text-white":"bg-white/80 border-black/10"}`}>↓</button>
        </div>
        <button onClick={()=>{
          const loc = locationRef.current;
          const localP = playersRef.current.get(localIdRef.current);
          if(!localP) return;
          if(loc.type==="campus"){
            const hp = getHouseAt(localP.x, localP.y);
            if(hp) enterBuilding(hp.id);
            else if(playerPrompt) { adapterRef.current?.sendInteraction({type:"wave", targetId: playerPrompt.id}); setWaveToast(`You waved at ${playerPrompt.name} 👋`); setTimeout(()=>setWaveToast(null),1800); }
            else if(interactPrompt) setModal(`${interactPrompt} — coming soon!`);
          } else {
            const interior = getInterior((loc as any).buildingId);
            const dx = localP.x - (interior.exit.x+interior.exit.w/2);
            const dy = localP.y - (interior.exit.y+interior.exit.h/2);
            if(Math.hypot(dx,dy)<64) exitBuilding();
          }
        }} className="rounded-full bg-[#EC4899] text-white px-4 py-1.5 text-xs font-bold shadow">Interact E</button>
      </div>
    </div>
  );
}

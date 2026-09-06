"use client";
import { Camera } from "./Camera";
import { HOUSES, WORLD_OBJECTS, ROADS, PLAZA } from "./worldData";
import { WORLD_W, WORLD_H, Player } from "../types";
import { getInterior } from "./interiorsData";

// Premium Cozy Campus Renderer — Duolingo + Among Us lobby + cozy indie
// Priorities: depth → atmosphere → composition → character quality → subtle animation → performance

export function drawWorld(ctx: CanvasRenderingContext2D, cam: Camera, isDark:boolean, vpW?:number, vpH?:number){
  ctx.save();
  // vpW/vpH = actual canvas CSS dimensions (passed from render loop).
  // cam.w/cam.h = world-visible area (smaller than canvas when zoom > 1).
  // We MUST fill the full canvas, not just cam.w/h, to avoid background bleed-through at edges.
  const viewW = vpW ?? cam.w;
  const viewH = vpH ?? cam.h;
  // Grass base — sophisticated warm greens
  const grassBase = isDark ? "#1b3a23" : "#BFE07A";
  const grassDark = isDark ? "#142a1a" : "#A9D46A";
  ctx.fillStyle = grassBase;
  ctx.fillRect(0,0, viewW, viewH);
  ctx.translate(-cam.x, -cam.y);

  drawGrassTexture(ctx, cam, isDark, grassDark);

  // Layer 0: distant ground shadows / ambient occlusion near buildings
  drawAmbientShadows(ctx, cam, isDark);

  // Roads — subtle top cobble strip + stone path stubs
  drawRoads(ctx, isDark, cam);

  // Curved stone pathway from Coding Lab into campus (hero path)
  drawHeroStonePath(ctx, isDark, cam);

  // Plaza
  drawPlaza(ctx, isDark, cam);

  // --- Objects sorted by y for depth layering (painter's algorithm) ---
  const objs = [...WORLD_OBJECTS].filter(o=> cam.isVisible(o.x,o.y,o.w,o.h)).sort((a,b)=> (a.y+a.h) - (b.y+b.h));
  for (const o of objs){
    // ground shadow first
    drawGroundShadow(ctx, o, isDark);
  }
  for (const o of objs){
    if (o.type==="house"){
      drawHouse(ctx, o.x,o.y,o.w,o.h, o.label, isDark, cam);
    } else if (o.type==="tree"){
      drawTree(ctx, o.x,o.y,o.w,o.h, isDark, o.label, cam);
    } else if (o.type==="bench"){
      drawBench(ctx,o.x,o.y,o.w,o.h, isDark);
    } else if (o.type==="rock"){
      drawRock(ctx,o.x,o.y,o.w,o.h, isDark, o.label);
    } else if (o.type==="lamp"){
      drawLamp(ctx,o.x,o.y,o.w,o.h, isDark, cam);
    } else if (o.type==="fence"){
      drawFence(ctx,o.x,o.y,o.w,o.h, isDark);
    } else if (o.type==="bush"){
      drawBush(ctx,o.x,o.y,o.w,o.h, isDark, o.label);
    }
  }

  // subtle vignette / border — soft, not harsh
  ctx.strokeStyle = isDark ? "rgba(0,0,0,0.28)" : "rgba(60,90,30,0.14)";
  ctx.lineWidth = 16;
  ctx.strokeRect(8,8,WORLD_W-16, WORLD_H-16);
  ctx.restore();
}

function drawGrassTexture(ctx:CanvasRenderingContext2D, cam:Camera, isDark:boolean, dark:string){
  // Base variation — darker mottling for depth, not flat
  ctx.fillStyle = isDark ? "rgba(0,0,0,0.14)" : "rgba(70,120,40,0.10)";
  for(let x= Math.floor(cam.x/140)*140; x< cam.x+cam.w+140; x+=140){
    for(let y= Math.floor(cam.y/140)*140; y< cam.y+cam.h+140; y+=140){
      const h = hash2(x,y);
      if(h % 5 === 0){
        const r = 18 + (h % 22);
        ctx.beginPath(); ctx.ellipse(x+ 40 + (h%40), y+ 30 + ((h*7)%40), r, r*0.62, 0,0,Math.PI*2); ctx.fill();
      }
    }
  }
  // Lighter highlight tufts
  ctx.fillStyle = isDark ? "rgba(160,210,160,0.07)" : "rgba(255,255,255,0.16)";
  for(let x= Math.floor(cam.x/110)*110; x< cam.x+cam.w+110; x+=110){
    for(let y= Math.floor(cam.y/110)*110; y< cam.y+cam.h+110; y+=110){
      const h=hash2(x+13,y+29);
      if(h % 7 === 1){
        ctx.beginPath(); ctx.arc(x+18, y+54, 1.4,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(x+62, y+22, 1.0,0,Math.PI*2); ctx.fill();
      }
    }
  }
  // Micro speckles / tiny grass blades
  ctx.fillStyle = isDark ? "rgba(90,170,90,0.09)" : "rgba(55,115,45,0.08)";
  for(let x= Math.floor(cam.x/44)*44; x< cam.x+cam.w+44; x+=44){
    for(let y= Math.floor(cam.y/44)*44; y< cam.y+cam.h+44; y+=44){
      if( (x*7 + y*13) % 89 === 0){ ctx.fillRect(x+9, y+10, 1, 2.4); }
      if( (x*11 + y*17) % 97 === 0){ ctx.fillRect(x+22, y+28, 1, 1.6); }
    }
  }
  // Small flower dots + clover shadows across grass (like reference image)
  for(let x= Math.floor(cam.x/90)*90; x< cam.x+cam.w+90; x+=90){
    for(let y= Math.floor(cam.y/90)*90; y< cam.y+cam.h+90; y+=90){
      const h=hash2(x+71,y+53);
      if(h%11===3){
        const fx = x + 24 + (h%48); const fy = y+ 18 + ((h*3)%44);
        // tiny white/yellow flower
        if(!isDark){
          ctx.fillStyle = h%2===0 ? "rgba(255,255,255,0.92)" : "rgba(255,220,120,0.95)";
          ctx.beginPath(); ctx.arc(fx, fy, 1.7,0,Math.PI*2); ctx.fill();
          ctx.fillStyle = "rgba(70,120,40,0.22)"; ctx.beginPath(); ctx.ellipse(fx, fy+3, 3.2,1.6,0,0,Math.PI*2); ctx.fill();
        }
      }
    }
  }
  // Soft radial falloff near edges for depth
  const cx=WORLD_W/2, cy=WORLD_H/2;
  const grad = ctx.createRadialGradient(cx, cy, Math.min(WORLD_W,WORLD_H)*0.28, cx, cy, Math.max(WORLD_W,WORLD_H)*0.78);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, isDark ? "rgba(0,0,0,0.18)" : "rgba(60,80,30,0.07)");
  ctx.fillStyle=grad;
  ctx.fillRect(cam.x-20, cam.y-20, cam.w+40, cam.h+40);
}

function drawAmbientShadows(ctx:CanvasRenderingContext2D, cam:Camera, isDark:boolean){
  // large soft shadow under Coding Lab for depth
  const cl = HOUSES.find(h=>h.id==="codingLab");
  if(cl){
    ctx.fillStyle = isDark ? "rgba(0,0,0,0.22)" : "rgba(0,0,0,0.11)";
    ctx.beginPath(); ctx.ellipse(cl.x+cl.w/2, cl.y+cl.h+18, cl.w*0.58, 26,0,0,Math.PI*2); ctx.fill();
    // secondary shadow offset
    ctx.fillStyle = isDark ? "rgba(0,0,0,0.10)" : "rgba(0,0,0,0.06)";
    ctx.beginPath(); ctx.ellipse(cl.x+cl.w/2+12, cl.y+cl.h+28, cl.w*0.38, 12,0,0,Math.PI*2); ctx.fill();
  }
  // small AO under each secondary house
  for(const h of HOUSES){
    if(h.id==="codingLab") continue;
    ctx.fillStyle = "rgba(0,0,0,0.09)";
    ctx.beginPath(); ctx.ellipse(h.x+h.w/2, h.y+h.h+10, h.w*0.42, 11,0,0,Math.PI*2); ctx.fill();
  }
}

function drawRoads(ctx:CanvasRenderingContext2D, isDark:boolean, cam:Camera){
  for(const r of ROADS){
    if(!cam.isVisible(r.x,r.y,r.w,r.h)) continue;
    // main cobble road — subtle, not highway
    if(r.type==="main"){
      // base cobble
      ctx.fillStyle = isDark ? "#2f332f" : "#D9CFC0";
      roundRect(ctx, r.x, r.y, r.w, r.h, 10); ctx.fill();
      // cobble pebble texture
      ctx.fillStyle = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";
      for(let px=r.x+8; px<r.x+r.w-8; px+=18){
        for(let py=r.y+6; py<r.y+r.h-6; py+=14){
          const h=hash2(px,py);
          if(h%3===0){
            ctx.beginPath(); ctx.ellipse(px+ (h%8), py+ (h%6), 3.2,2.2, (h%3)*0.4,0,Math.PI*2); ctx.strokeStyle = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"; ctx.lineWidth=0.7; ctx.stroke();
          }
        }
      }
      // curbs
      ctx.strokeStyle = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"; ctx.lineWidth=1.2; roundRect(ctx, r.x, r.y, r.w, r.h, 10); ctx.stroke();
      // curb lines top/bottom
      ctx.fillStyle = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"; ctx.fillRect(r.x+6, r.y+1, r.w-12, 1.2); ctx.fillRect(r.x+6, r.y+r.h-2, r.w-12, 1.2);
    } else {
      // street stubs — tiny stone
      ctx.fillStyle = isDark ? "#2a2f2a" : "#DFD8CC";
      roundRect(ctx, r.x, r.y, r.w, r.h, 5); ctx.fill();
      ctx.strokeStyle="rgba(0,0,0,0.07)"; ctx.lineWidth=1; ctx.stroke();
    }
  }
}

function drawHeroStonePath(ctx:CanvasRenderingContext2D, isDark:boolean, cam:Camera){
  // Curved stone path from Coding Lab door southwards, meandering gently, irregular stones
  const lab = HOUSES.find(h=>h.id==="codingLab")!;
  const startX = lab.door.x + lab.door.w/2;
  const startY = lab.door.y + 26;
  // define bezier-like centerline waypoints that curve
  const pts: Array<{x:number,y:number,w:number}> = [
    {x:startX, y:startY+6, w:42},
    {x:startX+2, y:startY+32, w:48},
    {x:startX-6, y:startY+70, w:52},
    {x:startX+8, y:startY+120, w:50},
    {x:startX-10, y:startY+170, w:46},
    {x:startX+6, y:startY+220, w:44},
    {x:startX-4, y:startY+280, w:40},
    {x:startX+10, y:startY+340, w:36},
    {x:startX, y:startY+400, w:28},
    {x:startX-8, y:startY+460, w:22},
  ];
  // path bed shadow
  ctx.fillStyle = isDark ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.07)";
  ctx.beginPath();
  let lx = pts[0].x - pts[0].w/2, rx = pts[0].x + pts[0].w/2;
  ctx.moveTo(lx, pts[0].y);
  for(let i=1;i<pts.length;i++){ ctx.lineTo(pts[i].x - pts[i].w/2, pts[i].y); }
  for(let i=pts.length-1;i>=0;i--){ ctx.lineTo(pts[i].x + pts[i].w/2, pts[i].y); }
  ctx.closePath(); ctx.fill();
  // draw irregular stones along path with offset
  const stones: Array<{x:number,y:number,rx:number,ry:number,rot:number}> = [];
  for(let i=0;i<pts.length-1;i++){
    const a=pts[i], b=pts[i+1];
    const steps = i<2 ? 7 : 5;
    for(let s=0;s<steps;s++){
      const t = s/steps;
      const x = a.x + (b.x-a.x)*t + (hash2(i*19,s*31)%16 -8)*0.55;
      const y = a.y + (b.y-a.y)*t + (hash2(i*13,s*17)%10 -5)*0.6;
      const rx = 11 + (hash2(i*7,s*11)%9);
      const ry = 7 + (hash2(i*11,s*7)%6);
      const rot = ((hash2(i*23,s*29)% 40)-20)* Math.PI/180;
      stones.push({x,y,rx,ry,rot});
    }
  }
  for(const s of stones){
    if(!cam.isVisible(s.x-s.rx, s.y-s.ry, s.rx*2, s.ry*2)) continue;
    ctx.save();
    ctx.translate(s.x, s.y); ctx.rotate(s.rot);
    // stone shadow
    ctx.fillStyle = "rgba(0,0,0,0.10)"; ctx.beginPath(); ctx.ellipse(0.7, 1.2, s.rx*0.92, s.ry*0.78,0,0,Math.PI*2); ctx.fill();
    // stone body — warm off-white/grey
    ctx.fillStyle = isDark ? "#3a3a36" : "#EFE8D8";
    ctx.strokeStyle = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"; ctx.lineWidth=0.9;
    ctx.beginPath(); ctx.ellipse(0,0, s.rx, s.ry,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
    // highlight
    ctx.fillStyle = isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.65)";
    ctx.beginPath(); ctx.ellipse(-s.rx*0.22, -s.ry*0.22, s.rx*0.42, s.ry*0.32,0,0,Math.PI*2); ctx.fill();
    ctx.restore();
    // moss gap tint between stones — tiny grass peeking
    if(hash2(Math.floor(s.x),Math.floor(s.y))%4===0){
      ctx.fillStyle = isDark ? "rgba(90,150,90,0.14)" : "rgba(100,150,70,0.13)";
      ctx.beginPath(); ctx.arc(s.x+ s.rx*0.38, s.y+ s.ry*0.32, 1.1,0,Math.PI*2); ctx.fill();
    }
  }
}

function drawPlaza(ctx:CanvasRenderingContext2D, isDark:boolean, cam:Camera){
  if(!cam.isVisible(PLAZA.x, PLAZA.y, PLAZA.w, PLAZA.h)) return;
  // plaza base — warm light stone, subtle texture
  ctx.fillStyle = isDark ? "#23282a" : "#F3EAD6";
  roundRect(ctx, PLAZA.x, PLAZA.y, PLAZA.w, PLAZA.h, 18); ctx.fill();
  ctx.strokeStyle = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"; ctx.lineWidth=1.4; ctx.stroke();
  // inner stone tiles (very subtle)
  ctx.strokeStyle = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.032)"; ctx.lineWidth=0.7;
  for(let x=PLAZA.x+18; x<PLAZA.x+PLAZA.w; x+=54){ ctx.beginPath(); ctx.moveTo(x, PLAZA.y+14); ctx.lineTo(x, PLAZA.y+PLAZA.h-14); ctx.stroke(); }
  for(let y=PLAZA.y+18; y<PLAZA.y+PLAZA.h; y+=54){ ctx.beginPath(); ctx.moveTo(PLAZA.x+14, y); ctx.lineTo(PLAZA.x+PLAZA.w-14, y); ctx.stroke(); }
  const cx = PLAZA.x+PLAZA.w/2, cy=PLAZA.y+PLAZA.h/2;
  // fountain shadow
  ctx.fillStyle="rgba(0,0,0,0.13)"; ctx.beginPath(); ctx.ellipse(cx, cy+16, 34, 12,0,0,Math.PI*2); ctx.fill();
  // fountain — tiered
  const fountainGrad = ctx.createRadialGradient(cx-6, cy-10, 4, cx, cy, 24);
  if(isDark){ fountainGrad.addColorStop(0,"#3a6a86"); fountainGrad.addColorStop(1,"#1d3a4a"); } else { fountainGrad.addColorStop(0,"#A8D8EA"); fountainGrad.addColorStop(1,"#6FB5D6"); }
  ctx.fillStyle = fountainGrad; ctx.beginPath(); ctx.arc(cx, cy, 22,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = isDark ? "#4a8aaa" : "#C8E8F4"; ctx.beginPath(); ctx.arc(cx, cy, 12,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = isDark ? "rgba(255,255,255,0.85)" : "#fff"; ctx.beginPath(); ctx.arc(cx-4, cy-5, 3.6,0,Math.PI*2); ctx.fill();
  // water ripple rings — very subtle
  ctx.strokeStyle = isDark ? "rgba(120,190,210,0.22)" : "rgba(90,160,190,0.18)"; ctx.lineWidth=0.8;
  ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, 32.5, 0, Math.PI*2); ctx.stroke();
  // plaza label — small, premium
  ctx.fillStyle = isDark ? "rgba(255,255,255,0.62)" : "rgba(60,50,30,0.62)";
  ctx.font="700 8px Inter, system-ui"; ctx.textAlign="center"; ctx.fillText("CAMPUS PLAZA", cx, PLAZA.y+16);
}

function drawGroundShadow(ctx:CanvasRenderingContext2D, o:any, isDark:boolean){
  const alpha = isDark ? 0.18 : 0.10;
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  if(o.type==="tree"){
    const r = Math.max(18, o.w*0.42);
    ctx.beginPath(); ctx.ellipse(o.x+o.w/2, o.y+o.h+8, r, r*0.38,0,0,Math.PI*2); ctx.fill();
    if(o.label==="hero" || o.label==="blossom"){
      ctx.fillStyle=`rgba(0,0,0,${alpha*0.6})`;
      ctx.beginPath(); ctx.ellipse(o.x+o.w/2+10, o.y+o.h+16, r*0.58, r*0.22,0,0,Math.PI*2); ctx.fill();
    }
  } else if(o.type==="bench"||o.type==="rock"){
    ctx.beginPath(); ctx.ellipse(o.x+o.w/2, o.y+o.h+4, o.w*0.44, 7,0,0,Math.PI*2); ctx.fill();
  } else if(o.type==="lamp"){
    ctx.beginPath(); ctx.ellipse(o.x+o.w/2, o.y+o.h+5, 8, 3.5,0,0,Math.PI*2); ctx.fill();
  } else if(o.type==="bush"){
    ctx.fillStyle=`rgba(0,0,0,${alpha*0.7})`;
    ctx.beginPath(); ctx.ellipse(o.x+o.w/2, o.y+o.h+2, o.w*0.42, 4,0,0,Math.PI*2); ctx.fill();
  }
}

function drawHouse(ctx:CanvasRenderingContext2D, x:number,y:number,w:number,h:number,label?:string, isDark?:boolean, cam?:Camera){
  const house = HOUSES.find(h=>h.label===label);
  const id = house?.id;
  if(id==="codingLab"){ drawCodingLabPremium(ctx,x,y,w,h,isDark||false); return; }
  if(id==="library"){ drawLibraryPremium(ctx,x,y,w,h,isDark||false, house!); return; }
  if(id==="arcade"){ drawArcadePremium(ctx,x,y,w,h,isDark||false, house!); return; }
  if(id==="lounge"){ drawLoungePremium(ctx,x,y,w,h,isDark||false, house!); return; }
  if(id==="discussion"){ drawDiscussionPremium(ctx,x,y,w,h,isDark||false, house!); return; }
  if(id==="serverHub"){ drawServerHubPremium(ctx,x,y,w,h,isDark||false, house!); return; }
  if(id==="studio"){ drawStudioPremium(ctx,x,y,w,h,isDark||false, house!); return; }
  if(id==="quizHall"){ drawQuizHallPremium(ctx,x,y,w,h,isDark||false, house!); return; }
  // fallback
  ctx.fillStyle = "rgba(0,0,0,0.09)"; ctx.beginPath(); ctx.ellipse(x+w/2, y+h+9, w*0.42, 12,0,0,Math.PI*2); ctx.fill();
  const base = house?.color ?? "#E8D5B7";
  ctx.fillStyle = isDark ? adjustDark(base,-16) : base;
  roundRect(ctx,x,y,w,h,12); ctx.fill();
  ctx.strokeStyle="rgba(0,0,0,0.065)"; ctx.lineWidth=1.2; ctx.stroke();
  if(house){
    const d=house.door;
    ctx.fillStyle = isDark ? "#1e1208" : "#3d2312";
    roundRect(ctx, d.x, d.y-10, d.w, 18, 3); ctx.fill();
  }
  if(label){
    ctx.save();
    ctx.font="700 9px Inter, system-ui"; ctx.textAlign="center";
    const tw = ctx.measureText(label).width+18;
    ctx.fillStyle = isDark ? "rgba(0,0,0,0.38)" : "rgba(255,255,255,0.92)";
    roundRect(ctx, x+w/2 - tw/2, y+h-12, tw, 12, 6); ctx.fill();
    ctx.fillStyle = isDark ? "#fff" : "#1a1a2e";
    ctx.fillText(label, x+w/2, y+h-3);
    ctx.restore();
  }
}

function drawLibraryPremium(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,isDark:boolean, house:any){
  ctx.fillStyle="rgba(0,0,0,0.10)"; ctx.beginPath(); ctx.ellipse(x+w/2,y+h+10,w*0.46,12,0,0,Math.PI*2); ctx.fill();
  const wallGrad=ctx.createLinearGradient(x,y+22,x,y+h);
  if(isDark){ wallGrad.addColorStop(0,"#3a3020"); wallGrad.addColorStop(1,"#2a2016"); } else { wallGrad.addColorStop(0,"#FFF4E0"); wallGrad.addColorStop(1,"#E8D5B7"); }
  ctx.fillStyle=wallGrad; roundRect(ctx,x,y+20,w,h-20,10); ctx.fill();
  ctx.strokeStyle=isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)"; ctx.lineWidth=1.2; ctx.stroke();
  // gable roof with stone trim
  ctx.fillStyle=isDark?"#4a3520":"#8B5A3A"; ctx.beginPath(); ctx.moveTo(x-8,y+34); ctx.lineTo(x+w/2,y+6); ctx.lineTo(x+w+8,y+34); ctx.closePath(); ctx.fill();
  ctx.fillStyle=isDark?"#5a3a20":"#A67C52"; ctx.fillRect(x-8,y+34,w+16,4);
  // arched windows
  const winY=y+44, winW=42, winH=36;
  for(const wx of [x+18, x+w-60]){
    ctx.fillStyle=isDark?"#2a1a0a":"#FFF6D6"; roundRect(ctx,wx,winY+6,winW,winH-6,6); ctx.fill();
    // arch top
    ctx.beginPath(); ctx.arc(wx+winW/2,winY+8,winW/2,Math.PI,0); ctx.fillStyle=isDark?"#2a1a0a":"#FFF6D6"; ctx.fill();
    ctx.strokeStyle=isDark?"#5a3a20":"#7A4A2A"; ctx.lineWidth=1.6; ctx.stroke();
    // muntin
    ctx.beginPath(); ctx.moveTo(wx+winW/2,winY); ctx.lineTo(wx+winW/2,winY+winH); ctx.moveTo(wx,winY+winH/2); ctx.lineTo(wx+winW,winY+winH/2); ctx.strokeStyle="rgba(0,0,0,0.10)"; ctx.lineWidth=1; ctx.stroke();
    // warm glow + book silhouettes
    ctx.fillStyle=isDark?"rgba(255,200,100,0.14)":"rgba(255,180,60,0.12)"; ctx.fillRect(wx+4,winY+12,winW-8,winH-12);
    ctx.fillStyle=isDark?"rgba(0,0,0,0.28)":"rgba(60,30,10,0.18)"; ctx.fillRect(wx+10,winY+20,5,14); ctx.fillRect(wx+18,winY+18,4,16); ctx.fillRect(wx+26,winY+22,5,12);
    // sill
    ctx.fillStyle=isDark?"#3a2410":"#8B6A3A"; ctx.fillRect(wx-2,winY+winH,winW+4,4);
  }
  // stone base + ivy hint
  ctx.fillStyle=isDark?"#2a2218":"#C9B99A"; roundRect(ctx,x-2,y+h-12,w+4,12,3); ctx.fill();
  // wooden door with book sign
  const d=house.door; ctx.fillStyle=isDark?"#2a1a0a":"#4A2A12"; roundRect(ctx,d.x,d.y-8,d.w,20,3); ctx.fill(); ctx.fillStyle="#C9A86A"; ctx.beginPath(); ctx.arc(d.x+d.w-7,d.y+2,2,0,Math.PI*2); ctx.fill();
  // sign
  ctx.fillStyle=isDark?"#1a1206":"#3D2312"; roundRect(ctx,x+w/2-48,y+10,96,14,5); ctx.fill(); ctx.fillStyle="#FFD8A0"; ctx.font="700 7px Inter"; ctx.textAlign="center"; ctx.fillText("📚 LIBRARY",x+w/2,y+19);
  // label pill
  ctx.save(); ctx.font="700 8px Inter"; ctx.textAlign="center"; const tw=ctx.measureText(house.label).width+16; ctx.fillStyle=isDark?"rgba(0,0,0,0.38)":"rgba(255,255,255,0.92)"; roundRect(ctx,x+w/2-tw/2,y+h-11,tw,11,6); ctx.fill(); ctx.fillStyle=isDark?"#fff":"#1a1a2e"; ctx.fillText(house.label,x+w/2,y+h-3); ctx.restore();
}

function drawServerHubPremium(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,isDark:boolean, house:any){
  ctx.fillStyle="rgba(0,0,0,0.12)"; ctx.beginPath(); ctx.ellipse(x+w/2,y+h+10,w*0.48,13,0,0,Math.PI*2); ctx.fill();
  const g=ctx.createLinearGradient(x,y+18,x,y+h);
  if(isDark){ g.addColorStop(0,"#1a2530"); g.addColorStop(1,"#0f1a26"); } else { g.addColorStop(0,"#EEF4FF"); g.addColorStop(1,"#DDE8F0"); }
  ctx.fillStyle=g; roundRect(ctx,x,y+18,w,h-18,10); ctx.fill();
  ctx.strokeStyle=isDark?"rgba(80,140,255,0.14)":"rgba(0,0,0,0.06)"; ctx.lineWidth=1.3; ctx.stroke();
  // flat tech roof with neon trim
  ctx.fillStyle=isDark?"#0f1a26":"#2a3a52"; ctx.fillRect(x-6,y+18,w+12,14);
  ctx.fillStyle=isDark?"rgba(56,189,248,0.85)":"rgba(59,130,246,0.55)"; ctx.fillRect(x-6,y+30,w+12,2);
  ctx.fillStyle=isDark?"rgba(56,189,248,0.35)":"rgba(59,130,246,0.18)"; ctx.fillRect(x-6,y+18,4,h-18);
  // large glass window with server glow
  const gx=x+16, gy=y+44, gw=w-32, gh=48;
  ctx.fillStyle=isDark?"#0a1a2a":"#0f2a44"; roundRect(ctx,gx,gy,gw,gh,6); ctx.fill();
  ctx.strokeStyle=isDark?"rgba(56,189,248,0.22)":"rgba(59,130,246,0.22)"; ctx.lineWidth=1.2; ctx.stroke();
  // server rack silhouettes + blinking leds
  for(let sx=gx+8; sx<gx+gw-8; sx+=28){
    ctx.fillStyle=isDark?"#0f172a":"#1e293b"; ctx.fillRect(sx,gy+6,18,gh-12);
    ctx.fillStyle=sx%56===8?"#22C55E":"#38BDF8"; const blink=Math.sin(Date.now()*0.004+sx)*0.5+0.5; ctx.globalAlpha=0.6+blink*0.4; ctx.beginPath(); ctx.arc(sx+9,gy+10,2,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1;
    for(let ly=gy+18; ly<gy+gh-6; ly+=6){ ctx.fillStyle="rgba(255,255,255,0.06)"; ctx.fillRect(sx+3,ly,12,2); }
  }
  // satellite dish
  ctx.fillStyle=isDark?"#2a3a4a":"#CBD5E1"; ctx.beginPath(); ctx.arc(x+w-18,y+12,10,0,Math.PI*2); ctx.fill(); ctx.strokeStyle="rgba(0,0,0,0.12)"; ctx.stroke();
  ctx.fillStyle=isDark?"#38BDF8":"#3B82F6"; ctx.beginPath(); ctx.arc(x+w-18,y+12,3,0,Math.PI*2); ctx.fill();
  const d=house.door; ctx.fillStyle=isDark?"#0a1a2a":"#1e293b"; roundRect(ctx,d.x,d.y-6,d.w,18,3); ctx.fill(); ctx.fillStyle="#38BDF8"; ctx.fillRect(d.x+4,d.y+2,d.w-8,2);
  ctx.save(); ctx.font="700 7px Inter"; ctx.textAlign="center"; ctx.fillStyle=isDark?"#7DD3FC":"#0EA5E9"; roundRect(ctx,x+w/2-44,y+6,88,12,5); ctx.fillStyle=isDark?"#0f172a":"#fff"; ctx.fill(); ctx.fillStyle=isDark?"#7DD3FC":"#0EA5E9"; ctx.fillText("🖥️ SERVER HUB",x+w/2,y+14); ctx.restore();
  ctx.save(); ctx.font="700 8px Inter"; ctx.textAlign="center"; const tw=ctx.measureText(house.label).width+16; ctx.fillStyle=isDark?"rgba(0,0,0,0.42)":"rgba(255,255,255,0.92)"; roundRect(ctx,x+w/2-tw/2,y+h-11,tw,11,6); ctx.fill(); ctx.fillStyle=isDark?"#fff":"#1a1a2e"; ctx.fillText(house.label,x+w/2,y+h-3); ctx.restore();
}

function drawStudioPremium(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,isDark:boolean, house:any){
  ctx.fillStyle="rgba(0,0,0,0.10)"; ctx.beginPath(); ctx.ellipse(x+w/2,y+h+10,w*0.46,12,0,0,Math.PI*2); ctx.fill();
  const gg=ctx.createLinearGradient(x,y+20,x,y+h);
  if(isDark){ gg.addColorStop(0,"#3a2f1a"); gg.addColorStop(1,"#2a2010"); } else { gg.addColorStop(0,"#FFF8E0"); gg.addColorStop(1,"#FDE68A"); }
  ctx.fillStyle=gg; roundRect(ctx,x,y+20,w,h-20,11); ctx.fill(); ctx.strokeStyle=isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)"; ctx.lineWidth=1.2; ctx.stroke();
  ctx.fillStyle=isDark?"#5a4210":"#F59E0B"; ctx.beginPath(); ctx.moveTo(x-8,y+32); ctx.lineTo(x+w/2,y+8); ctx.lineTo(x+w+8,y+32); ctx.closePath(); ctx.fill();
  // large art window
  const wx=x+18, wy=y+46, ww=56, wh=38;
  for(const xx of [wx, x+w-74]){
    ctx.fillStyle=isDark?"#1a1406":"#FFFBEB"; roundRect(ctx,xx,wy,ww,wh,6); ctx.fill(); ctx.strokeStyle=isDark?"#6a4a0a":"#92400E"; ctx.lineWidth=1.4; ctx.stroke();
    // palette hint
    ctx.fillStyle="#EC4899"; ctx.beginPath(); ctx.arc(xx+16,wy+18,8,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#3B82F6"; ctx.beginPath(); ctx.arc(xx+22,wy+12,4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#22C55E"; ctx.beginPath(); ctx.arc(xx+28,wy+22,5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="#F59E0B"; ctx.beginPath(); ctx.arc(xx+18,wy+26,3,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="rgba(0,0,0,0.08)"; ctx.fillRect(xx+4,wy+wh-6,ww-8,2);
  }
  // easel icon
  ctx.strokeStyle=isDark?"#6a4a0a":"#92400E"; ctx.lineWidth=1.2; ctx.beginPath(); ctx.moveTo(x+w/2-10,y+22); ctx.lineTo(x+w/2+10,y+22); ctx.stroke();
  const d=house.door; ctx.fillStyle=isDark?"#2a1a06":"#92400E"; roundRect(ctx,d.x,d.y-8,d.w,20,3); ctx.fill(); ctx.fillStyle="#FDE68A"; ctx.fillRect(d.x+3,d.y+2, d.w-6,2);
  ctx.save(); ctx.font="700 7px Inter"; ctx.textAlign="center"; ctx.fillStyle=isDark?"#FDE68A":"#92400E"; roundRect(ctx,x+w/2-46,y+8,92,12,5); ctx.fillStyle=isDark?"#2a1a06":"#fff"; ctx.fill(); ctx.fillStyle=isDark?"#FDE68A":"#92400E"; ctx.fillText("🎨 CREATE STUDIO",x+w/2,y+16); ctx.restore();
  ctx.save(); ctx.font="700 8px Inter"; ctx.textAlign="center"; const tw=ctx.measureText(house.label).width+16; ctx.fillStyle=isDark?"rgba(0,0,0,0.38)":"rgba(255,255,255,0.92)"; roundRect(ctx,x+w/2-tw/2,y+h-11,tw,11,6); ctx.fill(); ctx.fillStyle=isDark?"#fff":"#1a1a2e"; ctx.fillText(house.label,x+w/2,y+h-3); ctx.restore();
}

function drawArcadePremium(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,isDark:boolean, house:any){
  ctx.fillStyle="rgba(0,0,0,0.11)"; ctx.beginPath(); ctx.ellipse(x+w/2,y+h+10,w*0.44,11,0,0,Math.PI*2); ctx.fill();
  const grad=ctx.createLinearGradient(x,y+22,x,y+h);
  if(isDark){ grad.addColorStop(0,"#1e1a2e"); grad.addColorStop(1,"#120f1e"); } else { grad.addColorStop(0,"#F5F0FF"); grad.addColorStop(1,"#E0D8F5"); }
  ctx.fillStyle=grad; roundRect(ctx,x,y+22,w,h-22,10); ctx.fill(); ctx.strokeStyle=isDark?"rgba(168,85,247,0.18)":"rgba(0,0,0,0.06)"; ctx.lineWidth=1.3; ctx.stroke();
  // neon roof
  ctx.fillStyle=isDark?"#2a1a4a":"#6D28D9"; ctx.fillRect(x-6,y+22,w+12,10);
  ctx.fillStyle=isDark?"#EC4899":"#EC4899"; ctx.fillRect(x-6,y+30,w+12,2); ctx.shadowColor="#EC4899"; ctx.shadowBlur=6; ctx.fillRect(x-6,y+30,w+12,2); ctx.shadowBlur=0;
  // big glass arcade window
  const ax=x+18, ay=y+44, aw=w-36, ah=40;
  ctx.fillStyle=isDark?"#0a0a14":"#1a102e"; roundRect(ctx,ax,ay,aw,ah,7); ctx.fill(); ctx.strokeStyle=isDark?"rgba(236,72,153,0.22)":"rgba(109,40,217,0.18)"; ctx.lineWidth=1.2; ctx.stroke();
  for(let px=ax+8; px<ax+aw-8; px+=42){
    const hue=px%84===8?"#22D3EE":"#EC4899";
    ctx.fillStyle=isDark?"#1a1030":"#2a1a4a"; ctx.fillRect(px,ay+6,28,ah-12);
    ctx.fillStyle=hue; ctx.globalAlpha=0.82; ctx.fillRect(px+3,ay+9,22,10); ctx.globalAlpha=1;
    const flick=Math.sin(Date.now()*0.006+px)*0.5+0.5; ctx.fillStyle="rgba(255,255,255,"+(0.12+flick*0.10)+")"; ctx.fillRect(px+5,ay+22,18,2);
  }
  const d=house.door; ctx.fillStyle=isDark?"#1a102e":"#4C1D95"; roundRect(ctx,d.x,d.y-8,d.w,20,3); ctx.fill(); ctx.fillStyle="#EC4899"; ctx.fillRect(d.x+2,d.y+4,d.w-4,2);
  ctx.save(); ctx.font="700 7px Inter"; ctx.textAlign="center"; ctx.fillStyle=isDark?"#F0ABFC":"#6D28D9"; roundRect(ctx,x+w/2-36,y+8,72,12,5); ctx.fillStyle=isDark?"#1a1030":"#fff"; ctx.fill(); ctx.fillStyle=isDark?"#F0ABFC":"#6D28D9"; ctx.fillText("🎮 ARCADE",x+w/2,y+16); ctx.restore();
  ctx.save(); ctx.font="700 8px Inter"; ctx.textAlign="center"; const tw=ctx.measureText(house.label).width+16; ctx.fillStyle=isDark?"rgba(0,0,0,0.40)":"rgba(255,255,255,0.92)"; roundRect(ctx,x+w/2-tw/2,y+h-11,tw,11,6); ctx.fill(); ctx.fillStyle=isDark?"#fff":"#1a1a2e"; ctx.fillText(house.label,x+w/2,y+h-3); ctx.restore();
}

function drawLoungePremium(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,isDark:boolean, house:any){
  ctx.fillStyle="rgba(0,0,0,0.10)"; ctx.beginPath(); ctx.ellipse(x+w/2,y+h+10,w*0.44,11,0,0,Math.PI*2); ctx.fill();
  const gg=ctx.createLinearGradient(x,y+24,x,y+h);
  if(isDark){ gg.addColorStop(0,"#2e1f2e"); gg.addColorStop(1,"#1f1420"); } else { gg.addColorStop(0,"#FFF0F5"); gg.addColorStop(1,"#E9D7E8"); }
  ctx.fillStyle=gg; roundRect(ctx,x,y+24,w,h-24,10); ctx.fill(); ctx.strokeStyle=isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)"; ctx.lineWidth=1.2; ctx.stroke();
  ctx.fillStyle=isDark?"#4a2a3a":"#9B4A6A"; ctx.fillRect(x-6,y+24,w+12,10);
  // striped awning
  for(let sx=x-6; sx<x+w+6; sx+=14){ ctx.fillStyle=sx%28===8? "#F9A8D4":"#fff"; ctx.fillRect(sx,y+24,14,10); }
  // large cafe windows
  const wx=x+14, wy=y+42, ww=w-28, wh=36;
  ctx.fillStyle=isDark?"#1a0f1a":"#FFF7ED"; roundRect(ctx,wx,wy,ww,wh,7); ctx.fill(); ctx.strokeStyle=isDark?"#6a3a4a":"#9B4A6A"; ctx.lineWidth=1.4; ctx.stroke();
  ctx.fillStyle=isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.04)"; ctx.fillRect(wx+ww/3,wy,1,wh); ctx.fillRect(wx+2*ww/3,wy,1,wh);
  // coffee steam hint
  ctx.strokeStyle=isDark?"rgba(255,255,255,0.18)":"rgba(0,0,0,0.10)"; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(wx+18,wy+16); ctx.quadraticCurveTo(wx+20,wy+8,wx+18,wy+4); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(wx+26,wy+18); ctx.quadraticCurveTo(wx+28,wy+10,wx+26,wy+6); ctx.stroke();
  const d=house.door; ctx.fillStyle=isDark?"#2a1020":"#7A2A4A"; roundRect(ctx,d.x,d.y-8,d.w,20,3); ctx.fill(); ctx.fillStyle="#F9A8D4"; ctx.beginPath(); ctx.arc(d.x+d.w-7,d.y+2,2,0,Math.PI*2); ctx.fill();
  ctx.save(); ctx.font="700 7px Inter"; ctx.textAlign="center"; ctx.fillStyle=isDark?"#F9A8D4":"#9B4A6A"; roundRect(ctx,x+w/2-32,y+8,64,12,5); ctx.fillStyle=isDark?"#1f1420":"#fff"; ctx.fill(); ctx.fillStyle=isDark?"#F9A8D4":"#9B4A6A"; ctx.fillText("☕ LOUNGE",x+w/2,y+16); ctx.restore();
  ctx.save(); ctx.font="700 8px Inter"; ctx.textAlign="center"; const tw=ctx.measureText(house.label).width+16; ctx.fillStyle=isDark?"rgba(0,0,0,0.38)":"rgba(255,255,255,0.92)"; roundRect(ctx,x+w/2-tw/2,y+h-11,tw,11,6); ctx.fill(); ctx.fillStyle=isDark?"#fff":"#1a1a2e"; ctx.fillText(house.label,x+w/2,y+h-3); ctx.restore();
}

function drawDiscussionPremium(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,isDark:boolean, house:any){
  ctx.fillStyle="rgba(0,0,0,0.09)"; ctx.beginPath(); ctx.ellipse(x+w/2,y+h+10,w*0.44,11,0,0,Math.PI*2); ctx.fill();
  const grad=ctx.createLinearGradient(x,y+26,x,y+h);
  if(isDark){ grad.addColorStop(0,"#1a2a3a"); grad.addColorStop(1,"#12202e"); } else { grad.addColorStop(0,"#F0F7FF"); grad.addColorStop(1,"#C7D8EB"); }
  ctx.fillStyle=grad; roundRect(ctx,x,y+26,w,h-26,10); ctx.fill(); ctx.strokeStyle=isDark?"rgba(120,180,255,0.12)":"rgba(0,0,0,0.06)"; ctx.lineWidth=1.2; ctx.stroke();
  ctx.fillStyle=isDark?"#1a2a3a":"#2a4a6a"; ctx.fillRect(x-6,y+26,w+12,8);
  // glass curtain
  const gx=x+14, gy=y+42, gw=w-28, gh=42;
  ctx.fillStyle=isDark?"rgba(120,180,255,0.12)":"rgba(255,255,255,0.72)"; roundRect(ctx,gx,gy,gw,gh,7); ctx.fill(); ctx.strokeStyle=isDark?"rgba(120,180,255,0.22)":"rgba(59,130,246,0.18)"; ctx.lineWidth=1.2; ctx.stroke();
  // vertical mullions
  ctx.fillStyle=isDark?"rgba(120,180,255,0.18)":"rgba(59,130,246,0.14)"; for(let mx=gx+gw/3; mx<gx+gw; mx+=gw/3){ ctx.fillRect(mx-0.5,gy,1,gh); }
  // people silhouettes
  ctx.fillStyle=isDark?"rgba(255,255,255,0.16)":"rgba(30,60,100,0.14)"; ctx.beginPath(); ctx.arc(gx+28,gy+26,10,0,Math.PI*2); ctx.fill(); ctx.fillRect(gx+22,gy+26,12,14);
  ctx.beginPath(); ctx.arc(gx+gw-28,gy+26,10,0,Math.PI*2); ctx.fill(); ctx.fillRect(gx+gw-34,gy+26,12,14);
  // table hint
  ctx.fillStyle=isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)"; ctx.fillRect(gx+gw/2-18,gy+gh-8,36,4);
  const d=house.door; ctx.fillStyle=isDark?"#0f1a2a":"#1e3a5a"; roundRect(ctx,d.x,d.y-8,d.w,20,3); ctx.fill();
  ctx.save(); ctx.font="700 6px Inter"; ctx.textAlign="center"; ctx.fillStyle=isDark?"#93C5FD":"#1e3a5a"; roundRect(ctx,x+w/2-44,y+10,88,12,5); ctx.fillStyle=isDark?"#0f1a2a":"#fff"; ctx.fill(); ctx.fillStyle=isDark?"#93C5FD":"#1e3a5a"; ctx.fillText("💬 DISCUSSION",x+w/2,y+18); ctx.restore();
  ctx.save(); ctx.font="700 8px Inter"; ctx.textAlign="center"; const tw=ctx.measureText(house.label).width+16; ctx.fillStyle=isDark?"rgba(0,0,0,0.38)":"rgba(255,255,255,0.92)"; roundRect(ctx,x+w/2-tw/2,y+h-11,tw,11,6); ctx.fill(); ctx.fillStyle=isDark?"#fff":"#1a1a2e"; ctx.fillText(house.label,x+w/2,y+h-3); ctx.restore();
}

function drawQuizHallPremium(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,isDark:boolean, house:any){
  ctx.fillStyle="rgba(0,0,0,0.14)"; ctx.beginPath(); ctx.ellipse(x+w/2,y+h+14,w*0.52,14,0,0,Math.PI*2); ctx.fill();
  const grad=ctx.createLinearGradient(x,y+28,x,y+h);
  if(isDark){ grad.addColorStop(0,"#3a2f10"); grad.addColorStop(1,"#2a2008"); } else { grad.addColorStop(0,"#FFFBEB"); grad.addColorStop(1,"#FDE68A"); }
  ctx.fillStyle=grad; roundRect(ctx,x,y+28,w,h-28,10); ctx.fill(); ctx.strokeStyle=isDark?"rgba(255,215,80,0.14)":"rgba(0,0,0,0.06)"; ctx.lineWidth=1.4; ctx.stroke();
  // pediment
  ctx.fillStyle=isDark?"#4a3808":"#92400E"; ctx.beginPath(); ctx.moveTo(x-10,y+28); ctx.lineTo(x+w/2,y+6); ctx.lineTo(x+w+10,y+28); ctx.closePath(); ctx.fill();
  ctx.fillStyle=isDark?"#FCD34D":"#FDE68A"; ctx.beginPath(); ctx.arc(x+w/2,y+16,7,0,Math.PI*2); ctx.fill(); ctx.strokeStyle=isDark?"#92400E":"#92400E"; ctx.lineWidth=1.2; ctx.stroke();
  ctx.fillStyle=isDark?"#1a1206":"#fff"; ctx.font="700 6px Inter"; ctx.textAlign="center"; ctx.fillText("★",x+w/2,y+18);
  // pillars
  const pillW=10, pillH=52, pillY=y+36;
  for(const px of [x+26, x+w/2-8, x+w-36]){
    const g2=ctx.createLinearGradient(px,pillY,px+pillW,pillY);
    if(isDark){ g2.addColorStop(0,"#4a3808"); g2.addColorStop(0.5,"#6a4a08"); g2.addColorStop(1,"#4a3808"); } else { g2.addColorStop(0,"#FDF6E3"); g2.addColorStop(0.5,"#fff"); g2.addColorStop(1,"#FDE68A"); }
    ctx.fillStyle=g2; ctx.fillRect(px,pillY,pillW,pillH); ctx.strokeStyle="rgba(0,0,0,0.10)"; ctx.strokeRect(px,pillY,pillW,pillH);
    // capital
    ctx.fillStyle=isDark?"#5a4208":"#92400E"; ctx.fillRect(px-2,pillY-3,pillW+4,4); ctx.fillRect(px-2,pillY+pillH,pillW+4,4);
  }
  // grand windows between pillars
  ctx.fillStyle=isDark?"rgba(255,240,180,0.12)":"rgba(255,255,255,0.62)"; ctx.fillRect(x+40,y+44, w-80, 24);
  // steps
  ctx.fillStyle=isDark?"#2a2210":"#D8CFC0"; roundRect(ctx,x+w/2-52,y+h-10,104,8,2); ctx.fill(); roundRect(ctx,x+w/2-44,y+h-4,88,6,2); ctx.fill();
  const d=house.door; ctx.fillStyle=isDark?"#1a1206":"#4A2A08"; roundRect(ctx,d.x,d.y-6,d.w,16,3); ctx.fill(); ctx.fillStyle="#FCD34D"; ctx.beginPath(); ctx.arc(d.x+d.w-8,d.y+2,1.8,0,Math.PI*2); ctx.fill();
  ctx.save(); ctx.font="700 7px Inter"; ctx.textAlign="center"; ctx.fillStyle=isDark?"#FDE68A":"#92400E"; roundRect(ctx,x+w/2-40,y+10,80,11,5); ctx.fillStyle=isDark?"#2a1a06":"#fff"; ctx.fill(); ctx.fillStyle=isDark?"#FDE68A":"#92400E"; ctx.fillText("🏛️ QUIZ HALL",x+w/2,y+18); ctx.restore();
  ctx.save(); ctx.font="700 8px Inter"; ctx.textAlign="center"; const tw=ctx.measureText(house.label).width+16; ctx.fillStyle=isDark?"rgba(0,0,0,0.42)":"rgba(255,255,255,0.94)"; roundRect(ctx,x+w/2-tw/2,y+h-9,tw,11,6); ctx.fill(); ctx.fillStyle=isDark?"#fff":"#1a1a2e"; ctx.fillText(house.label,x+w/2,y+h-2); ctx.restore();
}

function drawCodingLabPremium(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number, isDark:boolean){
  // Warm cream walls with subtle variation
  // Main body — slightly inset with foundation
  const bodyY = y+24;
  const bodyH = h-24;
  // foundation / plinth
  ctx.fillStyle = isDark ? "#2a2118" : "#C9B99A";
  roundRect(ctx, x-2, y+h-16, w+4, 16, 4); ctx.fill();
  // steps in front of door
  const doorCX = x+w/2;
  ctx.fillStyle = isDark ? "#2f2f33" : "#D8D0BE";
  roundRect(ctx, doorCX-28, y+h-12, 56, 10, 3); ctx.fill();
  roundRect(ctx, doorCX-34, y+h-6, 68, 8, 3); ctx.fill();
  ctx.strokeStyle="rgba(0,0,0,0.08)"; ctx.lineWidth=0.8; ctx.stroke();

  // walls — cream with fabric texture via subtle gradient
  const wallGrad = ctx.createLinearGradient(x, bodyY, x, bodyY+bodyH);
  if(isDark){ wallGrad.addColorStop(0,"#3a3328"); wallGrad.addColorStop(1,"#2a241c"); } else { wallGrad.addColorStop(0,"#FFF6E2"); wallGrad.addColorStop(1,"#F2E0BE"); }
  ctx.fillStyle = wallGrad;
  roundRect(ctx, x, bodyY, w, bodyH, 12); ctx.fill();
  ctx.strokeStyle = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"; ctx.lineWidth=1.3; ctx.stroke();
  // wall highlight top edge
  ctx.strokeStyle = isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.55)"; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(x+10, bodyY+8); ctx.lineTo(x+w-10, bodyY+8); ctx.stroke();

  // Roof — red tiled, premium
  ctx.save();
  ctx.fillStyle = isDark ? "#6a2a1a" : "#C94A32";
  ctx.beginPath(); ctx.moveTo(x-10, bodyY+6); ctx.lineTo(x+w/2, y-6); ctx.lineTo(x+w+10, bodyY+6); ctx.closePath(); ctx.fill();
  // roof tiles lines
  ctx.strokeStyle = isDark ? "rgba(0,0,0,0.22)" : "rgba(0,0,0,0.10)"; ctx.lineWidth=0.9;
  for(let tx=x-4; tx<x+w+6; tx+=16){
    const t = (tx - (x+w/2)) / (w/2);
    const ry = bodyY+6 + Math.abs(t)* (y-6 - (bodyY+6));
    // approximate tile lines following roof slope
    ctx.beginPath(); ctx.moveTo(tx, bodyY+6); ctx.lineTo(tx+8, y+2); ctx.stroke();
  }
  // roof ridge tile cap
  ctx.fillStyle = isDark ? "#4a1e12" : "#A63A26"; ctx.beginPath(); ctx.moveTo(x+w/2-18, y-6); ctx.lineTo(x+w/2+18, y-6); ctx.lineTo(x+w/2+14, y-2); ctx.lineTo(x+w/2-14, y-2); ctx.closePath(); ctx.fill();
  // roof shadow under eaves
  ctx.fillStyle = "rgba(0,0,0,0.16)"; ctx.beginPath(); ctx.moveTo(x-8, bodyY+6); ctx.lineTo(x-10, bodyY+10); ctx.lineTo(x+w+10, bodyY+10); ctx.lineTo(x+w+8, bodyY+6); ctx.closePath(); ctx.fill();
  ctx.restore();

  // Round oculus window top (like reference)
  const oculusX = x+w/2, oculusY = bodyY+14;
  ctx.fillStyle = isDark ? "#1d2a36" : "#2E4A6B";
  ctx.beginPath(); ctx.arc(oculusX, oculusY, 13,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle = isDark ? "#5a3a1a" : "#8B5A3A"; ctx.lineWidth=2; ctx.stroke();
  // cross panes
  ctx.strokeStyle = isDark ? "#8B5A3A" : "#6B3A20"; ctx.lineWidth=1.4;
  ctx.beginPath(); ctx.moveTo(oculusX-11, oculusY); ctx.lineTo(oculusX+11, oculusY); ctx.moveTo(oculusX, oculusY-11); ctx.lineTo(oculusX, oculusY+11); ctx.stroke();
  ctx.fillStyle = isDark ? "rgba(120,180,210,0.22)" : "rgba(255,255,255,0.32)"; ctx.beginPath(); ctx.arc(oculusX-4,oculusY-4,3,0,Math.PI*2); ctx.fill();

  // Windows — warm lit, with sill, muntins, glow
  const winY = bodyY+34;
  const winW = 52, winH=38;
  const leftX = x+22, rightX = x+w-22-winW;
  for(const wx of [leftX, rightX]){
    // outer glow
    ctx.shadowColor = isDark ? "rgba(255,180,60,0.28)" : "rgba(255,180,60,0.18)"; ctx.shadowBlur=12;
    ctx.fillStyle = isDark ? "#FFD06A" : "#FFE8A8";
    ctx.fillRect(wx, winY, winW, winH);
    ctx.shadowBlur=0;
    // frame
    ctx.strokeStyle = isDark ? "#5a3a1a" : "#7A4A2A"; ctx.lineWidth=2; ctx.strokeRect(wx, winY, winW, winH);
    // cross
    ctx.strokeStyle = isDark ? "#5a3a1a" : "#8B5A3A"; ctx.lineWidth=1.3;
    ctx.beginPath(); ctx.moveTo(wx+winW/2, winY); ctx.lineTo(wx+winW/2, winY+winH); ctx.moveTo(wx, winY+winH/2); ctx.lineTo(wx+winW, winY+winH/2); ctx.stroke();
    // sill
    ctx.fillStyle = isDark ? "#2a1a0a" : "#8B6A4A"; ctx.fillRect(wx-2, winY+winH, winW+4, 5);
    // reflection highlight
    ctx.fillStyle = "rgba(255,255,255,0.24)"; ctx.fillRect(wx+2, winY+2, winW-4, 6);
    // warm inner light
    ctx.fillStyle = "rgba(255,200,80,0.18)"; ctx.fillRect(wx+3, winY+3, winW-6, winH-6);
  }

  // Door — premium blue with panels + brass handle, red awning
  const doorX = doorCX - 24, doorY = bodyY+48, doorW=48, doorH=54;
  // awning
  ctx.fillStyle = isDark ? "#8a2a2a" : "#D64545";
  ctx.beginPath(); ctx.moveTo(doorX-10, doorY-10); ctx.lineTo(doorX+doorW+10, doorY-10); ctx.lineTo(doorX+doorW+6, doorY-2); ctx.lineTo(doorX-6, doorY-2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.14)"; ctx.fillRect(doorX-6, doorY-2, doorW+12, 2);
  // awning scallop edge
  ctx.fillStyle = isDark ? "#6a1e1e" : "#C03A3A";
  for(let sx=doorX-6; sx<doorX+doorW+6; sx+=10){
    ctx.beginPath(); ctx.arc(sx+5, doorY-1, 5, 0, Math.PI, false); ctx.fill();
  }
  // door body
  const doorGrad = ctx.createLinearGradient(doorX, doorY, doorX+doorW, doorY);
  if(isDark){ doorGrad.addColorStop(0,"#2a4a9a"); doorGrad.addColorStop(1,"#1e356a"); } else { doorGrad.addColorStop(0,"#3A6ED8"); doorGrad.addColorStop(1,"#2A4DB8"); }
  ctx.fillStyle = doorGrad; roundRect(ctx, doorX, doorY, doorW, doorH, 4); ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.14)"; ctx.lineWidth=1.2; ctx.stroke();
  // panels
  ctx.strokeStyle = "rgba(0,0,0,0.18)"; ctx.lineWidth=1;
  ctx.strokeRect(doorX+6, doorY+6, doorW-12, 12); ctx.strokeRect(doorX+6, doorY+22, doorW-12, 12);
  // vertical divider
  ctx.beginPath(); ctx.moveTo(doorCX, doorY+6); ctx.lineTo(doorCX, doorY+34); ctx.stroke();
  // handle
  ctx.fillStyle = "#FFC857"; ctx.beginPath(); ctx.arc(doorX+doorW-10, doorY+26, 3.4,0,Math.PI*2); ctx.fill();
  ctx.fillStyle="#8B6A20"; ctx.beginPath(); ctx.arc(doorX+doorW-10, doorY+26, 1.4,0,Math.PI*2); ctx.fill();
  // door highlight
  ctx.fillStyle="rgba(255,255,255,0.18)"; ctx.fillRect(doorX+2, doorY+2, 6, doorH-4);

  // Signboard — dark wood premium, like reference "Coding Lab" sign
  const signW = 118, signH=28, signX = doorCX - signW/2, signY = bodyY-2;
  ctx.fillStyle = "rgba(0,0,0,0.20)"; roundRect(ctx, signX+1, signY+2, signW, signH, 6); ctx.fill();
  ctx.fillStyle = isDark ? "#2a1a0a" : "#3D2312"; roundRect(ctx, signX, signY, signW, signH, 6); ctx.fill();
  ctx.strokeStyle = isDark ? "#5a3a1a" : "#8B5A3A"; ctx.lineWidth=1.2; ctx.stroke();
  // brass rivets
  ctx.fillStyle="#C9A86A"; ctx.beginPath(); ctx.arc(signX+7, signY+7, 1.8,0,Math.PI*2); ctx.arc(signX+signW-7, signY+7, 1.8,0,Math.PI*2); ctx.arc(signX+7, signY+signH-7, 1.8,0,Math.PI*2); ctx.arc(signX+signW-7, signY+signH-7, 1.8,0,Math.PI*2); ctx.fill();
  ctx.fillStyle="#fff"; ctx.font="700 12px Inter, system-ui"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("Coding Lab", doorCX, signY+signH/2+1);

  // Welcome board to the right of door (like reference image) — smaller wooden sign
  const wbX = x+w+10, wbY = bodyY+48, wbW=76, wbH=58;
  ctx.fillStyle="rgba(0,0,0,0.16)"; roundRect(ctx, wbX+1, wbY+2, wbW, wbH, 6); ctx.fill();
  ctx.fillStyle = isDark ? "#2a1a06" : "#4A2A0A"; roundRect(ctx, wbX, wbY, wbW, wbH, 6); ctx.fill();
  ctx.strokeStyle="rgba(201,168,106,0.35)"; ctx.lineWidth=1; ctx.stroke();
  // text lines
  ctx.fillStyle="#FFD28A"; ctx.font="700 7px Inter, system-ui"; ctx.textAlign="left"; ctx.fillText("Welcome!", wbX+8, wbY+12);
  ctx.fillStyle="rgba(255,255,255,0.88)"; ctx.font="600 6.5px Inter, system-ui"; ctx.fillText("Waiting for", wbX+8, wbY+26); ctx.fillText("participants...", wbX+8, wbY+34);
  // small paws icons
  ctx.font="7px serif"; ctx.fillText("🐾", wbX+6, wbY+12);
  // stone base under sign
  ctx.fillStyle = isDark ? "#2f332f" : "#C9BFAE"; roundRect(ctx, wbX-4, wbY+wbH-6, wbW+8, 8, 3); ctx.fill();

  // Side garden — bushes flanking steps
  for(const side of [-1, 1]){
    const bx = doorCX + side*58, by = y+h-18;
    ctx.fillStyle = isDark ? "#1d4a2a" : "#3a8a3a";
    ctx.beginPath(); ctx.ellipse(bx, by, 18, 14,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = isDark ? "#2a6a3a" : "#4fa64f";
    ctx.beginPath(); ctx.ellipse(bx+ (side*6), by-4, 12,10,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = isDark ? "#3a8a3a" : "#6fca6f";
    ctx.beginPath(); ctx.arc(bx+ side*2, by-8, 4,0,Math.PI*2); ctx.fill();
  }
}

function drawTree(ctx:CanvasRenderingContext2D, x:number,y:number,w:number,h:number, isDark?:boolean, variant?:string, cam?:Camera){
  // subtle sway based on time + hash (very gentle)
  const sway = Math.sin(Date.now()*0.0006 + hash2(x,y)*0.12)* (variant==="hero" ? 1.4 : variant==="blossom" ? 1.0 : 0.6);
  const cx = x+w/2 + sway, cy = y+h/2;
  // trunk — warm brown with highlight
  ctx.fillStyle = isDark ? "#3a2210" : "#6B3A1A";
  const trunkW = Math.max(8, w*0.12), trunkH = Math.max(14, h*0.32);
  ctx.fillRect(cx - trunkW/2, y+h - trunkH, trunkW, trunkH);
  // trunk highlight
  ctx.fillStyle = isDark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.18)";
  ctx.fillRect(cx - trunkW/2, y+h - trunkH, 2.4, trunkH);
  ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.fillRect(cx + trunkW/2 -2, y+h - trunkH, 1.8, trunkH);

  if(variant==="blossom"){
    // pink sakura — layered pink puffs, premium
    const layers = [
      {ox:-12, oy:8, r:26, c: isDark? "#7a345a" : "#E8A0C8"},
      {ox:14, oy:6, r:28, c: isDark? "#8a3a66" : "#F0B0D0"},
      {ox:0, oy:-10, r:32, c: isDark? "#9a4070" : "#F7C0DA"},
      {ox:-8, oy:-6, r:18, c: isDark? "#b05080" : "#FAD0E0"},
      {ox:10, oy:-2, r:16, c: "#FAD8E8"},
    ];
    for(const l of layers){
      const g = ctx.createRadialGradient(cx+l.ox-4, cy+l.oy-6, 4, cx+l.ox, cy+l.oy, l.r);
      if(isDark){ g.addColorStop(0, lighten(l.c,18)); g.addColorStop(1, l.c); } else { g.addColorStop(0,"#FFF2F8"); g.addColorStop(1, l.c); }
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx+l.ox, cy+l.oy, l.r,0,Math.PI*2); ctx.fill();
    }
    // tiny blossoms highlight
    ctx.fillStyle="rgba(255,255,255,0.42)"; ctx.beginPath(); ctx.arc(cx-6, cy-14, 2.6,0,Math.PI*2); ctx.fill();
    return;
  }

  // regular green — multi-blob layered canopy for depth
  const isHero = variant==="hero";
  const isSmall = variant==="small";
  const baseR = isHero ? 34 : isSmall ? 18 : 22;
  const darkGreen = isDark ? "#0f3d1e" : "#1E7A34";
  const midGreen = isDark ? "#1a6a2e" : "#2FA84A";
  const lightGreen = isDark ? "#2a8a3e" : "#4FC26A";
  const blobs: Array<{ox:number,oy:number,r:number,c:string}> = isHero ? [
    {ox:-16, oy:10, r:28, c: midGreen},
    {ox:18, oy:8, r:26, c: midGreen},
    {ox:0, oy:-14, r:32, c: lightGreen},
    {ox:-10, oy:-4, r:20, c: darkGreen},
    {ox:12, oy:-8, r:18, c: darkGreen},
  ] : isSmall ? [
    {ox:0, oy:2, r: baseR, c: midGreen},
    {ox:-8, oy:6, r: baseR*0.72, c: darkGreen},
    {ox:8, oy:5, r: baseR*0.68, c: darkGreen},
  ] : [
    {ox:-10, oy:6, r:20, c: midGreen},
    {ox:10, oy:7, r:19, c: midGreen},
    {ox:0, oy:-10, r:23, c: lightGreen},
  ];
  for(const b of blobs){
    const g = ctx.createRadialGradient(cx+b.ox-5, cy+b.oy-8, 5, cx+b.ox, cy+b.oy, b.r);
    g.addColorStop(0, lighten(b.c, isDark? -6: 18));
    g.addColorStop(1, b.c);
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx+b.ox, cy+b.oy, b.r,0,Math.PI*2); ctx.fill();
  }
  // subtle canopy shadow between blobs
  ctx.fillStyle="rgba(0,0,0,0.07)"; ctx.beginPath(); ctx.ellipse(cx, cy+14, baseR*0.62, 7,0,0,Math.PI*2); ctx.fill();
  // highlight speck
  ctx.fillStyle="rgba(255,255,255,0.16)"; ctx.beginPath(); ctx.arc(cx-8, cy-12, 2.2,0,Math.PI*2); ctx.fill();
}

function drawBench(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,isDark?:boolean){
  const horiz = w>h;
  // shadow under
  // planks — warm wood with grain
  const wood = isDark? "#5a3818" : "#8B5A2B";
  const woodLight = isDark? "#7a4a1a" : "#A67C4A";
  ctx.fillStyle = wood; roundRect(ctx,x,y,w,h,4); ctx.fill();
  // slats
  ctx.fillStyle = woodLight;
  if(horiz){
    for(let i=2; i<w-2; i+= w/4){ /* leave but simple */ }
    roundRect(ctx,x+3,y-5,w-6,7,3); ctx.fill();
    // grain lines
    ctx.strokeStyle="rgba(0,0,0,0.10)"; ctx.lineWidth=0.7;
    ctx.beginPath(); ctx.moveTo(x+6,y+ h/2 -3); ctx.lineTo(x+w-6, y+ h/2 -3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+6,y+ h/2 +2); ctx.lineTo(x+w-6, y+ h/2 +2); ctx.stroke();
  } else {
    roundRect(ctx,x-5,y+3,7,h-6,3); ctx.fill();
  }
  // legs
  ctx.fillStyle="#2a1a0a";
  if(horiz){ ctx.fillRect(x+8, y+h-8, 4,9); ctx.fillRect(x+w-12, y+h-8,4,9); } else { ctx.fillRect(x+w-7, y+8, 9,4); ctx.fillRect(x+w-7, y+h-12,9,4); }
  // highlight top
  ctx.fillStyle="rgba(255,255,255,0.14)"; if(horiz) ctx.fillRect(x+3,y, w-6,1.6); else ctx.fillRect(x-5,y+3,1.6,h-6);
}

function drawRock(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,isDark?:boolean,label?:string){
  if(label==="fountain") return;
  // mossy rock — warm grey with moss tint
  ctx.fillStyle = isDark? "#3a3a32" : "#9AA08E";
  ctx.beginPath(); ctx.ellipse(x+w/2,y+h/2,w/2, h/2.05, 0.18,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle="rgba(0,0,0,0.10)"; ctx.lineWidth=0.8; ctx.stroke();
  // moss top
  ctx.fillStyle = isDark ? "rgba(70,120,70,0.28)" : "rgba(100,160,90,0.22)";
  ctx.beginPath(); ctx.ellipse(x+w/2 -2, y+h/2 -3, w*0.36, h*0.28, 0,0,Math.PI*2); ctx.fill();
  // highlight
  ctx.fillStyle = isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.42)";
  ctx.beginPath(); ctx.ellipse(x+w/2 -5, y+h/2 -5, w*0.18, h*0.14,0,0,Math.PI*2); ctx.fill();
  // tiny grass around base
  ctx.fillStyle = isDark ? "rgba(80,150,80,0.16)" : "rgba(90,150,70,0.18)";
  ctx.beginPath(); ctx.ellipse(x+w/2, y+h+2, w*0.42, 4,0,0,Math.PI*2); ctx.fill();
}

function drawLamp(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,isDark?:boolean, cam?:Camera){
  const cx = x+w/2;
  // pole — slender vintage black
  ctx.fillStyle = isDark? "#1a1a20" : "#1F2A3A";
  ctx.fillRect(cx-2, y-18, 4, 26);
  // base
  ctx.fillStyle = isDark? "#2a2a2e" : "#3A4558"; ctx.beginPath(); ctx.ellipse(cx, y+10, 7,3,0,0,Math.PI*2); ctx.fill();
  // lamp head — warm
  ctx.fillStyle = isDark? "#1a1a12" : "#0F1A2A"; ctx.beginPath(); ctx.moveTo(cx-8, y-6); ctx.lineTo(cx+8, y-6); ctx.lineTo(cx+5, y-18); ctx.lineTo(cx-5, y-18); ctx.closePath(); ctx.fill();
  // glass glow
  ctx.fillStyle = isDark? "#FFD86A" : "#FFCC4A"; ctx.beginPath(); ctx.ellipse(cx, y-12, 6, 5,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle="rgba(255,220,120,0.26)"; ctx.beginPath(); ctx.arc(cx, y-12, 16,0,Math.PI*2); ctx.fill();
  ctx.fillStyle="rgba(255,220,120,0.12)"; ctx.beginPath(); ctx.arc(cx, y-12, 26,0,Math.PI*2); ctx.fill();
  // highlight
  ctx.fillStyle="rgba(255,255,255,0.34)"; ctx.beginPath(); ctx.ellipse(cx-2, y-14, 1.8,1.2,0,0,Math.PI*2); ctx.fill();
}

function drawFence(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,isDark?:boolean){
  ctx.fillStyle = isDark? "rgba(90,70,30,0.32)":"rgba(100,80,40,0.14)";
  roundRect(ctx,x,y,w,h,3); ctx.fill();
  ctx.strokeStyle = isDark? "rgba(255,255,255,0.05)":"rgba(0,0,0,0.05)"; ctx.lineWidth=0.8; ctx.stroke();
}

function drawBush(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,isDark?:boolean, label?:string){
  if(label==="speck"){
    // tiny flower speck — handled in grass, but also draw here for plaza edges
    ctx.fillStyle = hash2(x,y)%2===0 ? "rgba(255,255,255,0.95)" : "rgba(255,220,90,0.95)";
    ctx.beginPath(); ctx.arc(x+4, y+4, 1.7,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="rgba(70,120,40,0.26)"; ctx.beginPath(); ctx.arc(x+4, y+6, 1.1,0,Math.PI*2); ctx.fill();
    return;
  }
  const cx = x+w/2, cy=y+h/2;
  if(label==="flower"){
    // bush with flower cluster
    ctx.fillStyle = isDark ? "#1e4a2a" : "#3a8a3a"; ctx.beginPath(); ctx.ellipse(cx, cy, w/2, h/2,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = isDark ? "#2a6a3a" : "#4FB04F"; ctx.beginPath(); ctx.ellipse(cx+4, cy-3, w*0.32, h*0.38,0,0,Math.PI*2); ctx.fill();
    // flowers
    const colors = ["#FFD6E8","#FFF6A0","#FFB088","#E0E0FF"];
    for(let i=0;i<3;i++){
      const fx = cx + (hash2(x+i*31, y+i*19)%w - w/2)*0.62;
      const fy = cy - h/4 + (hash2(x+i*17, y+i*29)% (h/2));
      ctx.fillStyle = colors[(hash2(x,y)+i)%colors.length];
      ctx.beginPath(); ctx.arc(fx, fy, 1.9,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="#FFD84A"; ctx.beginPath(); ctx.arc(fx,fy,0.7,0,Math.PI*2); ctx.fill();
    }
  } else {
    // plain bush — two overlapping blobs
    ctx.fillStyle = isDark ? "#1d4a22" : "#3E8C3E"; ctx.beginPath(); ctx.ellipse(cx-3, cy, w*0.42, h*0.46,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = isDark ? "#264e2a" : "#4FA64F"; ctx.beginPath(); ctx.ellipse(cx+5, cy-1, w*0.34, h*0.40,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="rgba(255,255,255,0.10)"; ctx.beginPath(); ctx.arc(cx-4, cy-3, 1.6,0,Math.PI*2); ctx.fill();
  }
  // grass occlusion small
  ctx.fillStyle="rgba(0,0,0,0.08)"; ctx.beginPath(); ctx.ellipse(cx, y+h+2, w*0.38, 3,0,0,Math.PI*2); ctx.fill();
}

function hash2(x:number,y:number){ return Math.abs(((Math.floor(x)*73856093) ^ (Math.floor(y)*19349663)) % 100000); }
function lighten(hex:string, amt:number){
  const c=hex.replace("#",""); const n=parseInt(c,16); let r=(n>>16)&0xff, g=(n>>8)&0xff, b=n&0xff;
  r=Math.max(0,Math.min(255,r+amt)); g=Math.max(0,Math.min(255,g+amt)); b=Math.max(0,Math.min(255,b+amt));
  return `rgb(${r},${g},${b})`;
}
function roundRect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath();
}
function adjustDark(hex:string, amt:number){
  const c = hex.replace("#",""); const n=parseInt(c,16); let r=(n>>16)&0xff,g=(n>>8)&0xff,b=n&0xff;
  r=Math.max(0,Math.min(255,r+amt)); g=Math.max(0,Math.min(255,g+amt)); b=Math.max(0,Math.min(255,b+amt));
  return `rgb(${r},${g},${b})`;
}

// ── interiors ── premium with working animated computers
export function drawInterior(ctx:CanvasRenderingContext2D, cam:Camera, buildingId: string, isDark:boolean, t?:number){
  const now = t ?? Date.now();
  const interior = getInterior(buildingId as any);
  if(!interior) return;
  ctx.save();
  ctx.translate(-cam.x, -cam.y);
  // floor — warm parquet / carpet
  const isLab = interior.id==="codingLab";
  const isServer = interior.id==="serverHub";
  const isArcade = interior.id==="arcade";
  const isStudio = interior.id==="studio";
  ctx.fillStyle = isDark ? (isServer ? "#0f1a1f" : isArcade ? "#120f1e" : isStudio ? "#1a1406" : "#1a251a") : (isLab ? "#fdf8ec" : isServer ? "#eef2f7" : isArcade ? "#f5f0ff" : "#fdf8ec");
  roundRect(ctx, 0,0, interior.w, interior.h, 16); ctx.fill();
  ctx.strokeStyle = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"; ctx.lineWidth=1.5; ctx.stroke();
  // floor grid / wood planks
  ctx.strokeStyle = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)"; ctx.lineWidth=1;
  for(let x=60; x<interior.w; x+=80){ ctx.beginPath(); ctx.moveTo(x,14); ctx.lineTo(x, interior.h-14); ctx.stroke(); }
  for(let y=60; y<interior.h; y+=80){ ctx.beginPath(); ctx.moveTo(14,y); ctx.lineTo(interior.w-14,y); ctx.stroke(); }
  // subtle ceiling light falloff
  const lightGrad = ctx.createRadialGradient(interior.w/2, 80, 20, interior.w/2, 80, 320);
  lightGrad.addColorStop(0, isDark? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.45)");
  lightGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle=lightGrad; ctx.fillRect(14,14, interior.w-28, 180);
  for(const o of interior.objects){
    if(o.type==="wall"){
      ctx.fillStyle = isDark ? "#1e2328" : "#e8e0c8";
      if(o.y===interior.h-14){
        const gapL = interior.exit.x - 8, gapR = interior.exit.x+interior.exit.w+8;
        ctx.fillRect(0, o.y, gapL, o.h);
        ctx.fillRect(gapR, o.y, interior.w-gapR, o.h);
      } else {
        ctx.fillRect(o.x,o.y,o.w,o.h);
      }
      ctx.strokeStyle="rgba(0,0,0,0.08)"; ctx.strokeRect(o.x,o.y,o.w,o.h);
      // wall trim top
      if(o.y===0){ ctx.fillStyle=isDark?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.5)"; ctx.fillRect(14, 14, interior.w-28,1); }
    } else if(o.type==="desk" || o.type==="table"){
      ctx.fillStyle = isDark ? "#2a2520" : (o.type==="table" ? "#e8ddd0" : "#d8cbb0");
      roundRect(ctx,o.x,o.y,o.w,o.h,6); ctx.fill();
      ctx.strokeStyle="rgba(0,0,0,0.08)"; ctx.stroke();
      // edge highlight
      ctx.fillStyle="rgba(255,255,255,0.10)"; ctx.fillRect(o.x+2,o.y, o.w-4,1.2);
      // keyboard hint on desks
      if(o.type==="desk" && o.h<30){
        ctx.fillStyle=isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.06)"; roundRect(ctx,o.x+o.w/2-22,o.y+16,44,5,2); ctx.fill();
      }
    } else if(o.type==="computer"){
      drawWorkingComputer(ctx,o.x,o.y,o.w,o.h,isDark,now,o.label||"pc");
    } else if(o.type==="server"){
      // server rack — dark tower with blinking LEDs and vents
      ctx.fillStyle=isDark?"#0a0f14":"#1e293b"; roundRect(ctx,o.x,o.y,o.w,o.h,4); ctx.fill();
      ctx.strokeStyle=isDark?"rgba(56,189,248,0.22)":"rgba(59,130,246,0.18)"; ctx.lineWidth=1; ctx.stroke();
      // vent lines
      ctx.fillStyle="rgba(255,255,255,0.06)"; for(let vy=o.y+8; vy<o.y+o.h-8; vy+=10){ ctx.fillRect(o.x+4,vy,o.w-8,2); }
      // LEDs blinking
      const blinkPhase = Math.sin(now*0.005 + o.x*0.12) >0;
      ctx.fillStyle= blinkPhase ? "#22C55E" : "#38BDF8"; ctx.shadowColor=blinkPhase?"#22C55E":"#38BDF8"; ctx.shadowBlur=6; ctx.beginPath(); ctx.arc(o.x+o.w/2, o.y+10,3,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
      ctx.fillStyle="rgba(255,255,255,0.12)"; ctx.fillRect(o.x+6,o.y+22,o.w-12,2); ctx.fillRect(o.x+6,o.y+30,o.w-12,2);
      if(o.label==="Arcade"){ // arcade cabinet screen
        ctx.fillStyle="#EC4899"; ctx.fillRect(o.x+6,o.y+38,o.w-12,28);
        ctx.fillStyle="#fff"; ctx.font="700 6px Inter"; ctx.textAlign="center"; ctx.fillText("PLAY",o.x+o.w/2,o.y+54);
        const flick=Math.sin(now*0.008+o.x)*0.5+0.5; ctx.fillStyle=`rgba(255,255,255,${0.10+flick*0.12})`; ctx.fillRect(o.x+6,o.y+38,o.w-12,6);
      }
    } else if(o.type==="shelf"){
      ctx.fillStyle = isDark? "#3a3020":"#b89a6a";
      roundRect(ctx,o.x,o.y,o.w,o.h,4); ctx.fill();
      ctx.fillStyle="rgba(0,0,0,0.10)"; ctx.fillRect(o.x,o.y+o.h-3,o.w,3);
      ctx.fillStyle = isDark? "#5a4a2a":"#8b5a2b";
      for(let i=0;i<3;i++){
        const bx = o.w>o.h ? o.x+10+i*34 : o.x+4;
        const by = o.w>o.h ? o.y+4 : o.y+10+i*34;
        const bw = o.w>o.h ? 12 : o.w-8;
        const bh = o.w>o.h ? o.h-8 : 12;
        const col = ["#8B5CF6","#EC4899","#3B82F6","#22C55E","#F59E0B"][i%5];
        ctx.fillStyle=col; ctx.globalAlpha=0.85; roundRect(ctx,bx,by,bw,bh,2); ctx.fill(); ctx.globalAlpha=1;
        ctx.fillStyle="rgba(255,255,255,0.18)"; ctx.fillRect(bx,by, bw,2);
      }
    } else if(o.type==="sofa"){
      ctx.fillStyle = isDark? "#4a2a4a":"#d9a8d0";
      roundRect(ctx,o.x,o.y,o.w,o.h,10); ctx.fill();
      ctx.fillStyle = isDark? "#6a3a5a":"#e8c0e0";
      roundRect(ctx,o.x+8,o.y+8,o.w-16,o.h-26,6); ctx.fill();
      ctx.fillStyle="rgba(255,255,255,0.10)"; ctx.beginPath(); ctx.arc(o.x+18,o.y+18,2,0,Math.PI*2); ctx.fill();
    } else if(o.type==="chair"){
      ctx.fillStyle = isDark? "#3a3a3a":"#9a8a7a";
      roundRect(ctx,o.x,o.y,o.w,o.h,6); ctx.fill();
      ctx.fillStyle="rgba(255,255,255,0.08)"; ctx.fillRect(o.x+3,o.y+2,o.w-6,2);
      ctx.fillStyle="#2a2a2a"; ctx.beginPath(); ctx.ellipse(o.x+o.w/2,o.y+o.h+2,10,3,0,0,Math.PI*2); ctx.fillStyle="rgba(0,0,0,0.12)"; ctx.fill();
    } else if(o.type==="board"){
      ctx.fillStyle = isDark? "#0f1a14":"#f0f4e0";
      ctx.fillRect(o.x,o.y,o.w,o.h);
      ctx.strokeStyle="rgba(0,0,0,0.12)"; ctx.strokeRect(o.x,o.y,o.w,o.h);
      // board content per room
      ctx.fillStyle="rgba(0,0,0,0.55)"; ctx.font="600 7px Inter"; ctx.textAlign="center";
      if(interior.id==="serverHub") ctx.fillText("⬢ SYSTEM DASHBOARD ⬢", o.x+o.w/2, o.y+o.h/2+2);
      else if(interior.id==="codingLab") ctx.fillText("{ code }", o.x+o.w/2, o.y+o.h/2+2);
      else ctx.fillText("BOARD", o.x+o.w/2, o.y+o.h/2+3);
      // marker tray
      ctx.fillStyle="#C9A86A"; ctx.fillRect(o.x+o.w/2-18,o.y+o.h-4,36,3);
    } else if(o.type==="counter"){
      ctx.fillStyle = isDark? "#2a2a30":"#e0d8c0";
      roundRect(ctx,o.x,o.y,o.w,o.h,6); ctx.fill();
      ctx.fillStyle="#ff8a2a"; ctx.beginPath(); ctx.arc(o.x+o.w/2, o.y+14, 6,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="rgba(255,255,255,0.22)"; ctx.beginPath(); ctx.arc(o.x+o.w/2-2,o.y+12,2,0,Math.PI*2); ctx.fill();
    } else if(o.type==="plant"){
      // potted plant — terracotta pot + bush
      ctx.fillStyle=isDark?"#2a1a0a":"#C97A3A"; ctx.beginPath(); ctx.moveTo(o.x+4,o.y+16); ctx.lineTo(o.x+o.w-4,o.y+16); ctx.lineTo(o.x+o.w-8,o.y+o.h); ctx.lineTo(o.x+8,o.y+o.h); ctx.closePath(); ctx.fill();
      ctx.fillStyle=isDark?"#1e4a2a":"#2FA84A"; ctx.beginPath(); ctx.arc(o.x+o.w/2, o.y+8, o.w*0.42,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(o.x+o.w/2-6, o.y+12, o.w*0.28,0,Math.PI*2); ctx.fillStyle=isDark?"#264e2a":"#4FC26A"; ctx.fill();
      ctx.fillStyle="rgba(255,255,255,0.14)"; ctx.beginPath(); ctx.arc(o.x+o.w/2-4,o.y+6,2,0,Math.PI*2); ctx.fill();
      ctx.fillStyle="rgba(0,0,0,0.12)"; ctx.beginPath(); ctx.ellipse(o.x+o.w/2,o.y+o.h+2,10,3,0,0,Math.PI*2); ctx.fill();
    } else if(o.type==="rug"){
      ctx.fillStyle=isDark?"rgba(168,85,247,0.12)":"rgba(236,72,153,0.08)"; roundRect(ctx,o.x,o.y,o.w,o.h,6); ctx.fill();
      ctx.strokeStyle=isDark?"rgba(168,85,247,0.14)":"rgba(236,72,153,0.10)"; ctx.lineWidth=0.8; ctx.stroke();
      // pattern dots
      ctx.fillStyle=isDark?"rgba(168,85,247,0.18)":"rgba(236,72,153,0.12)"; for(let rx=o.x+10; rx<o.x+o.w; rx+=18){ for(let ry=o.y+6; ry<o.y+o.h; ry+=10){ ctx.beginPath(); ctx.arc(rx,ry,1,0,Math.PI*2); ctx.fill(); }}
    } else if(o.type==="cabinet"){
      ctx.fillStyle=isDark?"#3a2a1a":"#D8C4A0"; roundRect(ctx,o.x,o.y,o.w,o.h,4); ctx.fill(); ctx.strokeStyle="rgba(0,0,0,0.10)"; ctx.stroke();
      ctx.fillStyle=isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)"; ctx.fillRect(o.x+4,o.y+o.h/2-1,o.w-8,1.5);
      ctx.fillStyle="#C9A86A"; ctx.beginPath(); ctx.arc(o.x+o.w/2, o.y+o.h/2,2.2,0,Math.PI*2); ctx.fill();
    } else if(o.type==="window"){
      ctx.fillStyle=isDark?"rgba(120,180,255,0.10)":"rgba(120,180,255,0.14)"; roundRect(ctx,o.x,o.y,o.w,o.h,4); ctx.fill(); ctx.strokeStyle=isDark?"rgba(120,180,255,0.18)":"rgba(59,130,246,0.18)"; ctx.lineWidth=1; ctx.stroke();
      ctx.fillStyle="rgba(255,255,255,0.22)"; ctx.fillRect(o.x+4,o.y+4,o.w-8,2);
    }
  }
  const ex = interior.exit;
  ctx.fillStyle = isDark? "#0f172a":"#fffbeb";
  roundRect(ctx, ex.x, ex.y, ex.w, ex.h, 6); ctx.fill();
  ctx.strokeStyle = "#EC4899"; ctx.lineWidth=1.5; ctx.stroke();
  ctx.fillStyle = isDark? "#fff":"#1a1a2e"; ctx.font="700 10px Inter"; ctx.textAlign="center"; ctx.fillText("🚪 EXIT", ex.x+ex.w/2, ex.y+15);
  ctx.fillStyle = isDark? "rgba(255,255,255,0.92)":"rgba(26,26,46,0.92)"; ctx.font="700 13px Inter"; ctx.textAlign="center"; ctx.fillText(interior.label, interior.w/2, 30);
  // room title underline accent
  ctx.fillStyle=interior.id==="codingLab"?"#38BDF8": interior.id==="serverHub"?"#60A5FA": interior.id==="arcade"?"#EC4899": interior.id==="studio"?"#F59E0B":"rgba(0,0,0,0.10)"; ctx.fillRect(interior.w/2-26,34,52,2);
  ctx.restore();
}

function drawWorkingComputer(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,isDark:boolean,now:number,kind:string){
  const isLaptop = kind==="laptop";
  const monW=w, monH=h;
  // shadow under
  ctx.fillStyle="rgba(0,0,0,0.12)"; ctx.beginPath(); ctx.ellipse(x+monW/2, y+monH+2, monW*0.42,2.5,0,0,Math.PI*2); ctx.fill();
  if(isLaptop){
    // laptop base
    ctx.fillStyle=isDark?"#2a2f3a":"#D1D5DB"; roundRect(ctx,x,y+6,monW,monH-6,3); ctx.fill();
    ctx.fillStyle=isDark?"#0f172a":"#0f172a"; roundRect(ctx,x+2,y,monW-4,monH-8,2); ctx.fill();
    // screen
    const sx=x+4, sy=y+2, sw=monW-8, sh=monH-12;
    // animated code bg — slight hue shift
    const hue = (now*0.02 + x*0.5)%360;
    ctx.fillStyle=isDark? `hsl(${200+hue%20} 60% 14%)` : "#0f172a"; ctx.fillRect(sx,sy,sw,sh);
    // code lines
    ctx.fillStyle= isDark?"#7DD3FC":"#22D3EE"; ctx.globalAlpha=0.9;
    for(let i=0;i<2;i++){
      const ly=sy+4+i*5;
      const lw= 8 + (hash2(x+i, y)% (sw-12));
      ctx.fillRect(sx+3, ly, lw, 1.2);
      ctx.fillStyle= i%2===0?"#A7F3D0":"#F9A8D4";
    }
    ctx.globalAlpha=1;
    // blinking cursor
    const blink = Math.floor(now/520)%2===0;
    if(blink){ ctx.fillStyle="#fff"; ctx.fillRect(sx+ sw-10, sy+ sh-4, 6,1.5); }
    // keyboard
    ctx.fillStyle=isDark?"#1e293b":"#E5E7EB"; ctx.fillRect(x+6, y+monH-5, monW-12,3);
    // glow
    ctx.shadowColor=isDark?"rgba(56,189,248,0.28)":"rgba(34,211,238,0.22)"; ctx.shadowBlur=8; ctx.strokeStyle="rgba(56,189,248,0.18)"; ctx.lineWidth=1; roundRect(ctx,x+2,y,monW-4,monH-8,2); ctx.stroke(); ctx.shadowBlur=0;
  } else {
    // desktop monitor — stand
    ctx.fillStyle=isDark?"#2a2f3a":"#9CA3AF"; ctx.fillRect(x+monW/2-5, y+monH-4,10,4);
    ctx.fillStyle=isDark?"#1f2937":"#D1D5DB"; ctx.beginPath(); ctx.ellipse(x+monW/2, y+monH+1,12,2,0,0,Math.PI*2); ctx.fill();
    // bezel
    ctx.fillStyle=isDark?"#0f172a":"#111827"; roundRect(ctx,x,y,monW,monH,3); ctx.fill();
    ctx.strokeStyle="rgba(255,255,255,0.08)"; ctx.lineWidth=0.8; ctx.stroke();
    // screen
    const sx=x+3, sy=y+3, sw=monW-6, sh=monH-8;
    // subtle animated gradient
    const grad=ctx.createLinearGradient(sx,sy,sx+sw,sy);
    const t=(Math.sin(now*0.0006 + x*0.01)*0.5+0.5);
    if(isDark){ grad.addColorStop(0, `rgba(15,${30+t*8},42,1)`); grad.addColorStop(1, `rgba(10,${20+t*6},30,1)`); } else { grad.addColorStop(0,"#0f172a"); grad.addColorStop(1,"#1e293b"); }
    ctx.fillStyle=grad; ctx.fillRect(sx,sy,sw,sh);
    // code lines — syntax colored
    const colors=["#38BDF8","#A78BFA","#34D399","#FBBF24","#F472B6"];
    for(let i=0;i<3;i++){
      const ly=sy+4+i*4;
      const lw= 6 + (hash2(x*3+i, y*2)% (sw-10));
      ctx.fillStyle=colors[(hash2(x,y)+i)%colors.length]; ctx.globalAlpha=0.92;
      ctx.fillRect(sx+3, ly, lw, 1.1);
    }
    ctx.globalAlpha=1;
    // blinking block cursor
    const blink=Math.floor(now/480)%2===0;
    if(blink){ ctx.fillStyle="#fff"; ctx.globalAlpha=0.92; ctx.fillRect(sx+ sw-8, sy+ sh-3,5,1.4); ctx.globalAlpha=1; }
    // screen glare
    ctx.fillStyle="rgba(255,255,255,0.07)"; ctx.fillRect(sx,sy,sw,2);
    ctx.fillStyle="rgba(255,255,255,0.04)"; ctx.fillRect(sx,sy,2,sh);
    // glow
    const glowInt = 0.22 + Math.sin(now*0.003 + x*0.02)*0.06;
    ctx.shadowColor=`rgba(56,189,248,${glowInt})`; ctx.shadowBlur=7; ctx.strokeStyle="rgba(56,189,248,0.12)"; ctx.lineWidth=1; roundRect(ctx,x,y,monW,monH,3); ctx.stroke(); ctx.shadowBlur=0;
  }
}

export function drawPlayers(ctx:CanvasRenderingContext2D, cam:Camera, players: Player[], localId:string, isDark:boolean, bobTime:number){
  // Sort by y for depth
  const sorted = [...players].sort((a,b)=> a.y - b.y);
  for(const p of sorted){
    if (!cam.isVisible(p.x-40,p.y-40,80,80)) continue;
    if (p.id===localId) continue;
    drawOnePlayer(ctx, cam, p, false, isDark, bobTime);
  }
  const local = players.find(p=>p.id===localId);
  if(local) drawOnePlayer(ctx, cam, local, true, isDark, bobTime);
}

function drawOnePlayer(ctx:CanvasRenderingContext2D, cam:Camera, p:Player, isLocal:boolean, isDark:boolean, t:number){
  const sx = p.x - cam.x;
  const sy = p.y - cam.y;
  const phase = (parseInt(p.id.slice(-3),36)%100)/100 * Math.PI*2;
  const bobAmp = p.anim==="walk" ? 2.6 : 1.2;
  const bobFreq = p.anim==="walk" ? 0.014 : 0.0045;
  const bob = Math.sin(t*bobFreq + phase) * bobAmp;
  const sway = Math.sin(t*0.0025 + phase)* (p.anim==="walk"? 1.2:0.5);
  const dirOffset = p.dir==="left" ? -2.5 : p.dir==="right" ? 2.5 : 0;

  ctx.save();
  ctx.translate(sx, sy);
  // soft ground shadow — larger, diffused, realistic
  ctx.fillStyle = isLocal ? "rgba(0,0,0,0.22)" : "rgba(0,0,0,0.16)";
  ctx.beginPath(); ctx.ellipse(sway*0.3, 18, isLocal? 15:11.5, 5.2,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.08)"; ctx.beginPath(); ctx.ellipse(sway*0.5, 18, isLocal? 22:16, 4,0,0,Math.PI*2); ctx.fill();

  ctx.translate(dirOffset + sway, bob);

  const name = p.name.length>18 ? p.name.slice(0,16)+"…": p.name;
  const fontSize = isLocal? 11 : 10;
  const isInterior = (p as any)._loc?.type==="building" || false;
  const tagScale = isInterior ? 0.88 : 1;

  // spawn pop — if very new, scale from 0.7
  const age = Date.now() - (p.lastUpdated || Date.now());
  const pop = age < 420 ? 0.7 + 0.3*(age/420) + Math.sin(age*0.02)*0.04 : 1;
  ctx.save(); ctx.scale(pop, pop);

  // name pill — translucent white/cards with shadow like reference
  ctx.font = `${isLocal? "700":"600"} ${Math.round(fontSize*tagScale)}px Inter, system-ui`;
  const tw = ctx.measureText(name).width;
  const tagW = tw + 14;
  const tagH = isLocal? 16:14;
  const tagY = -44 - (isLocal?2:0);
  // pill shadow
  ctx.fillStyle = "rgba(0,0,0,0.10)"; roundRect(ctx, -tagW/2*tagScale+0.6, tagY+1.2, tagW*tagScale, tagH*tagScale, 8); ctx.fill();
  // pill body — soft white with slight translucency
  ctx.fillStyle = isLocal ? "rgba(255,255,255,0.96)" : "rgba(255,255,255,0.92)";
  if(isDark) ctx.fillStyle = isLocal ? "rgba(28,28,34,0.96)" : "rgba(28,28,34,0.88)";
  roundRect(ctx, -tagW/2*tagScale, tagY, tagW*tagScale, tagH*tagScale, 8); ctx.fill();
  ctx.strokeStyle = isLocal? "rgba(236,72,153,0.22)" : isDark? "rgba(255,255,255,0.08)":"rgba(0,0,0,0.06)"; ctx.lineWidth=1; ctx.stroke();
  ctx.fillStyle = isDark ? "#fff" : "#1a1a2e";
  ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.save(); ctx.scale(tagScale, tagScale); ctx.fillText(name, 0, (tagY+tagH/2+0.3)/tagScale); ctx.restore();
  ctx.restore();

  const r = isLocal? 17: 14.5;
  // outer ring + subtle drop shadow
  ctx.shadowColor="rgba(0,0,0,0.18)"; ctx.shadowBlur=8; ctx.shadowOffsetY=3;
  ctx.beginPath(); ctx.arc(0,0,r+1.2,0,Math.PI*2); ctx.fillStyle="rgba(0,0,0,0.06)"; ctx.fill();
  ctx.shadowBlur=0; ctx.shadowOffsetY=0;
  ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2);
  ctx.fillStyle = "#171923"; ctx.fill();
  ctx.lineWidth = isLocal? 2.6:1.9;
  ctx.strokeStyle = isLocal? "#EC4899" : isDark? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.12)";
  ctx.stroke();
  if(isLocal){
    ctx.shadowColor="rgba(236,72,153,0.32)"; ctx.shadowBlur=10;
    ctx.stroke(); ctx.shadowBlur=0;
  }
  ctx.save(); ctx.clip();
  const img = imageCache.get(p.avatarUrl||"");
  if (img && img.complete && img.naturalWidth>0){
    ctx.drawImage(img, -r, -r, r*2, r*2);
  } else {
    ctx.fillStyle = avatarBg(p.id);
    ctx.fillRect(-r,-r,r*2,r*2);
    // outfit hint — small collar
    ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fillRect(-r, r*0.32, r*2, r*0.52);
    ctx.fillStyle="#fff"; ctx.font=`${isLocal?"14px":"12px"} system-ui, serif`; ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(initials(p.name), 0, -1.2);
    if(p.avatarUrl && !imageCache.has(p.avatarUrl)){
      const im = new Image(); im.src=p.avatarUrl; imageCache.set(p.avatarUrl, im);
    }
  }
  ctx.restore();
  // subtle inner highlight ring
  ctx.strokeStyle="rgba(255,255,255,0.18)"; ctx.lineWidth=0.8; ctx.beginPath(); ctx.arc(0,0,r-0.6,0,Math.PI*2); ctx.stroke();
  // status dot — amber waiting, green walking
  const statusCol = p.anim==="walk" ? "#22C55E" : "#F59E0B";
  ctx.fillStyle = statusCol;
  ctx.strokeStyle = isDark? "#0a0f0a":"#fff"; ctx.lineWidth=1.7;
  ctx.beginPath(); ctx.arc(r-3.2, r-5.8, 4.0,0,Math.PI*2); ctx.fill(); ctx.stroke();
  // status inner highlight
  ctx.fillStyle="rgba(255,255,255,0.42)"; ctx.beginPath(); ctx.arc(r-4.2, r-7, 1.1,0,Math.PI*2); ctx.fill();

  ctx.restore();
}
const imageCache = new Map<string, HTMLImageElement>();
function avatarBg(id:string){
  const palettes = ["#EC4899","#8B5CF6","#06B6D4","#F59E0B","#22C55E","#3B82F6","#E85D75","#F97316"];
  let h=0; for(let i=0;i<id.length;i++) h=(h*31+id.charCodeAt(i))%palettes.length;
  return palettes[h];
}
function initials(name:string){
  const parts=name.trim().split(/\s+/); if(parts.length>=2) return (parts[0][0]+parts[1][0]).toUpperCase(); return name.slice(0,2).toUpperCase();
}

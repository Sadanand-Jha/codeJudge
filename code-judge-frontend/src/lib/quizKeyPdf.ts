import type { KeyPdfResult } from "./quizCrypto";
import QRCode from "qrcode";

const PAGE_STYLES = String.raw`:root{--navy:#1B1446;--purple:#6C3CF0;--yellow:#FDCB3F;--bg:#F3F2FC;--muted:#6B6890;--line:#E1DDF7}
*{box-sizing:border-box;margin:0;padding:0}
@page{size:A4;margin:0}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:"Poppins",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--navy);background:#DAD7EE;padding:28px 0}
.page{width:210mm;height:297mm;margin:0 auto;position:relative;overflow:hidden;background:var(--bg);box-shadow:0 10px 40px rgba(27,20,70,.25)}
.mono{font-family:"JetBrains Mono","DejaVu Sans Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}

/* header */
.header{position:relative;height:238px;background:#1B1446;overflow:hidden;border-bottom:9px solid var(--yellow)}
.poly{position:absolute;inset:0;width:100%;height:100%}
.hrow{position:absolute;left:46px;right:46px;top:30px;display:flex;align-items:center;justify-content:space-between}
.brand{display:flex;align-items:center;gap:10px}
.brand .wm{font-weight:700;font-size:23px;color:#fff;letter-spacing:-.4px}
.brand .wm i{font-style:normal;color:var(--yellow)}
.pill{border:1.6px solid var(--yellow);color:var(--yellow);border-radius:99px;padding:5px 14px 5px 11px;font-size:9.5px;font-weight:700;letter-spacing:1.1px;display:flex;gap:7px;align-items:center}
.htitle{position:absolute;left:46px;top:104px;right:170px}
.htitle h1{font-size:31px;line-height:1.12;font-weight:700;color:#fff;letter-spacing:-.8px}
.htitle h1 em{font-style:normal;color:var(--yellow)}
.htitle p{margin-top:10px;font-size:11.5px;color:#B9B2E6}
.badge{position:absolute;right:52px;top:92px;width:98px;height:98px;border-radius:26px;background:var(--yellow);border:3.5px solid #0F0A30;box-shadow:7px 7px 0 var(--purple);display:flex;align-items:center;justify-content:center;transform:rotate(6deg)}

/* body */
.main{position:absolute;left:46px;right:46px;top:262px}
.qrow{display:flex;align-items:flex-end;justify-content:space-between;gap:12px}
.tag{display:inline-flex;align-items:center;gap:7px;font-size:9px;font-weight:700;letter-spacing:1.3px;color:var(--purple);background:#E9E2FF;border:1.6px solid var(--purple);border-radius:99px;padding:3px 11px;margin-bottom:8px}
.qrow h2{font-size:36px;font-weight:700;letter-spacing:-1.1px;line-height:1.1;word-break:break-word}
.ids{display:flex;gap:8px;padding-bottom:4px;flex:none}
.chip{font-size:10.5px;font-weight:500;color:var(--muted);background:#fff;border:1.8px solid var(--line);border-radius:99px;padding:4px 13px;white-space:nowrap}
.chip b{color:var(--navy);font-weight:700}
.grid{display:flex;gap:22px;margin-top:26px;align-items:stretch}
.card{background:#fff;border:3px solid var(--navy);border-radius:22px}
.keycard{flex:1;padding:20px 22px 16px;box-shadow:8px 8px 0 var(--yellow)}
.lab{display:inline-flex;align-items:center;gap:7px;background:var(--purple);color:#fff;font-size:9px;font-weight:700;letter-spacing:1.2px;padding:5px 12px 5px 9px;border-radius:99px;border:2px solid var(--navy)}
.keywrap{margin-top:16px;background:#F5F3FF;border:2px dashed #C9BDF7;border-radius:16px;padding:14px 10px}
.keyrow{display:flex;align-items:center;justify-content:center;gap:3px;margin:7px 0}
.blk{font-weight:700;font-size:15.5px;color:var(--navy);background:#fff;border:2px solid var(--navy);border-radius:9px;padding:6px 6px;box-shadow:2.5px 2.5px 0 #CFC4FA;letter-spacing:.2px}
.dash{color:var(--purple);font-weight:700;width:10px;text-align:center;font-size:13px}
.fp{margin-top:12px;display:flex;gap:8px;align-items:flex-start;font-size:7.4px;color:var(--muted)}
.fp .k{font-weight:700;letter-spacing:.8px;color:var(--navy);white-space:nowrap;padding-top:1px}
.fp .v{display:flex;gap:6px;flex-wrap:wrap}
.qrcard{width:186px;flex:none;padding:16px 16px 13px;box-shadow:8px 8px 0 var(--purple);text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center}
.qrbox{width:140px;height:140px;padding:8px;border:2.2px solid var(--navy);border-radius:14px;background:#fff}
.qrbox svg{width:100%;height:100%;display:block}
.scan{margin-top:11px;display:flex;gap:6px;align-items:center;font-size:9.5px;font-weight:700;letter-spacing:1.3px}
.qrcard small{display:block;margin-top:3px;font-size:7.6px;color:var(--muted)}
.how{margin-top:32px;border-width:2.5px;box-shadow:6px 6px 0 #D9D1FF;padding:20px 24px 14px}
.how h3{font-size:15px;font-weight:700;letter-spacing:-.3px;display:flex;align-items:center;gap:9px;margin-bottom:12px}
.how ol{list-style:none}
.how li{display:flex;gap:13px;align-items:flex-start;padding:8px 0;border-top:1.6px dashed var(--line)}
.how li:first-child{border-top:0}
.num{flex:none;width:25px;height:25px;border-radius:50%;background:var(--yellow);border:2.2px solid var(--navy);font-weight:700;font-size:11.5px;display:flex;align-items:center;justify-content:center;margin-top:1px}
.how p{font-size:11px;line-height:1.55;color:#3A3560}
.how p b{color:var(--navy);font-weight:700}
.soft{color:var(--muted)}
.imp{margin-top:30px;background:#FFF3CF;border:3px solid var(--navy);border-radius:22px;box-shadow:7px 7px 0 #F4A62A;padding:17px 22px;display:flex;gap:16px;align-items:center}
.impi{flex:none;width:50px;height:50px;border-radius:15px;background:var(--yellow);border:2.8px solid var(--navy);display:flex;align-items:center;justify-content:center;transform:rotate(-5deg)}
.imp h4{font-size:10px;letter-spacing:1.5px;font-weight:700;color:#9A4A00;margin-bottom:4px}
.imp p{font-size:11px;line-height:1.55;color:#5B3A0A;font-weight:500}
.foot{position:absolute;left:46px;right:46px;bottom:26px;border-top:2px solid var(--line);padding-top:12px;display:flex;justify-content:space-between;align-items:center;font-size:8.2px;color:var(--muted)}
.foot .l{display:flex;align-items:center;gap:8px}


/* ===== page 2 ===== */
.page + .page{margin-top:28px}
.h2{height:160px}
.h2 .htitle{top:82px;right:170px}
.h2 .htitle h1{font-size:27px;letter-spacing:-.7px;white-space:nowrap}
.h2 .htitle p{margin-top:7px;font-size:11px}
.badge.sm{width:76px;height:76px;border-radius:21px;top:68px;right:56px;box-shadow:6px 6px 0 var(--purple);border-width:3px}
.main2{position:absolute;left:46px;right:46px;top:178px}
.rule{display:flex;gap:15px;align-items:center;background:var(--navy);border-radius:20px;box-shadow:6px 6px 0 var(--yellow);padding:11px 20px}
.rule .ri{flex:none;width:42px;height:42px;border-radius:13px;background:var(--yellow);display:flex;align-items:center;justify-content:center}
.rule p{color:#E8E4FF;font-size:11.5px;line-height:1.5}
.rule p b{display:block;color:var(--yellow);font-size:9.5px;letter-spacing:1.6px;margin-bottom:2px}
.pair{display:flex;align-items:stretch;gap:0;margin-top:20px}
.pair .card{flex:1;padding:14px 18px 14px}
.kcard{box-shadow:6px 6px 0 var(--purple)} .lcard{box-shadow:6px 6px 0 var(--yellow)}
.neq{flex:none;width:34px;display:flex;align-items:center;justify-content:center;z-index:2}
.neq span{width:34px;height:34px;border-radius:50%;background:var(--yellow);border:2.5px solid var(--navy);font-weight:700;font-size:17px;display:flex;align-items:center;justify-content:center;line-height:1;padding-bottom:2px}
.chip2{display:inline-flex;align-items:center;gap:6px;font-size:8.6px;font-weight:700;letter-spacing:1.2px;padding:4px 11px 4px 8px;border-radius:99px;border:2px solid var(--navy)}
.chip2.p{background:var(--purple);color:#fff} .chip2.y{background:var(--yellow);color:var(--navy)}
.pair h5{font-size:14.5px;font-weight:700;letter-spacing:-.3px;margin:10px 0 5px}
.pair p{font-size:10.4px;line-height:1.55;color:#3A3560}
.mask{margin-top:11px;display:flex;align-items:center;gap:8px;background:#F5F3FF;border:2px dashed #C9BDF7;border-radius:12px;padding:8px 11px;font-size:11px;font-weight:700;letter-spacing:2px;color:var(--navy)}
.mask.l{background:#FFF8DE;border-color:#F0D77A;letter-spacing:0;font-weight:600;font-size:10.4px}
.dd{display:flex;gap:20px;margin-top:20px}
.dd .card{flex:1;border-width:2.5px;padding:0;overflow:hidden}
.dd .do{box-shadow:6px 6px 0 #BDEBD7} .dd .dont{box-shadow:6px 6px 0 #FFC8CA}
.dd .hd{display:flex;align-items:center;gap:8px;padding:9px 16px;color:#fff;font-weight:700;font-size:11px;letter-spacing:1.5px;border-bottom:2.5px solid var(--navy)}
.do .hd{background:#12805C} .dont .hd{background:#E5484D}
.dd ul{list-style:none;padding:4px 16px 6px}
.dd li{display:flex;gap:10px;align-items:flex-start;padding:4.5px 0;font-size:10.2px;line-height:1.45;color:#3A3560;border-top:1.6px dashed var(--line)}
.dd li:first-child{border-top:0}
.dd li b{color:var(--navy);font-weight:700}
.dd .ic{flex:none;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-top:1px;border:2px solid var(--navy)}
.do .ic{background:#7EE0B5} .dont .ic{background:#FF8F93}
.tl{display:flex;gap:14px;margin-top:20px}
.tl .card{flex:1;border-width:2.5px;padding:11px 15px 9px;box-shadow:5px 5px 0 #D9D1FF}
.tl .ph{display:inline-block;font-size:8.6px;font-weight:700;letter-spacing:1.3px;padding:3px 10px;border-radius:99px;background:var(--navy);color:var(--yellow)}
.tl .card.now{background:#FFF8DE;box-shadow:5px 5px 0 var(--yellow)}
.tl .card.now .ph{background:var(--yellow);color:var(--navy);border:1.8px solid var(--navy)}
.tl ul{list-style:none;margin-top:9px}
.tl li{position:relative;padding-left:14px;font-size:9.9px;line-height:1.5;color:#3A3560;margin-top:3px}
.tl li::before{content:"";position:absolute;left:0;top:6px;width:6px;height:6px;border-radius:50%;background:var(--purple)}
.tl li b{color:var(--navy)}
.leak{margin-top:20px}
.leak.imp{padding:12px 20px}

/* print / save-as-PDF button (screen only) */
.printbtn{position:fixed;right:22px;bottom:22px;font:700 13px "Poppins",sans-serif;background:var(--yellow);color:var(--navy);border:3px solid var(--navy);border-radius:14px;padding:11px 18px;box-shadow:5px 5px 0 var(--purple);cursor:pointer}
.printbtn:active{transform:translate(3px,3px);box-shadow:2px 2px 0 var(--purple)}
@media print{body{background:none;padding:0}.page{box-shadow:none;margin:0;break-after:page}.page + .page{margin-top:0;break-after:auto}.printbtn{display:none}}
@font-face{font-family:"Poppins";src:url("/fonts/Poppins-Regular.ttf") format("truetype");font-weight:400;font-style:normal;font-display:block}
@font-face{font-family:"Poppins";src:url("/fonts/Poppins-Medium.ttf") format("truetype");font-weight:500;font-style:normal;font-display:block}
@font-face{font-family:"Poppins";src:url("/fonts/Poppins-Bold.ttf") format("truetype");font-weight:700;font-style:normal;font-display:block}
@font-face{font-family:"JetBrains Mono";src:url("/fonts/JetBrainsMono-Bold.ttf") format("truetype");font-weight:700;font-style:normal;font-display:block}
body{padding:0!important;background:#F3F2FC!important}
.page{margin:0!important;box-shadow:none!important}
.page + .page{margin-top:0!important}
.qrow > div:first-child{flex:1 1 auto;min-width:0}
.qrow h2{overflow-wrap:anywhere;word-break:break-word}
.qrow h2.long{font-size:30px;letter-spacing:-.9px}
`;

interface Page1Data {
  title: string;
  titleClass: string;
  quizId: string;
  serverId: string;
  keyBlocks: string;
  fingerprintGroups: string;
  qrSvg: string;
  stamp: string;
}

const renderPage1 = (data: Page1Data): string => String.raw`<div class="page" id="page">
  <div class="header">
    <svg class="poly" viewBox="0 0 794 238" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><polygon points="0,0 85,0 106,57" fill="#1B1446"/><polygon points="0,0 106,57 0,87" fill="#2B2268"/><polygon points="85,0 180,0 164,57" fill="#2B2268"/><polygon points="85,0 164,57 106,57" fill="#3A2F8C"/><polygon points="180,0 291,0 284,90" fill="#2B2268"/><polygon points="180,0 284,90 164,57" fill="#2B2268"/><polygon points="291,0 351,0 325,106" fill="#1B1446"/><polygon points="291,0 325,106 284,90" fill="#31277A"/><polygon points="351,0 442,0 470,88" fill="#3A2F8C"/><polygon points="351,0 470,88 325,106" fill="#201858"/><polygon points="442,0 535,0 536,60" fill="#221A5A"/><polygon points="442,0 536,60 470,88" fill="#3A2F8C"/><polygon points="535,0 598,0 588,81" fill="#251C60"/><polygon points="535,0 588,81 536,60" fill="#251C60"/><polygon points="598,0 707,0 679,62" fill="#1B1446"/><polygon points="598,0 679,62 588,81" fill="#251C60"/><polygon points="707,0 794,0 794,65" fill="#251C60"/><polygon points="707,0 794,65 679,62" fill="#1B1446"/><polygon points="0,87 106,57 86,155" fill="#2B2268"/><polygon points="0,87 86,155 0,133" fill="#221A5A"/><polygon points="106,57 164,57 198,160" fill="#1B1446"/><polygon points="106,57 198,160 86,155" fill="#201858"/><polygon points="164,57 284,90 273,159" fill="#201858"/><polygon points="164,57 273,159 198,160" fill="#3A2F8C"/><polygon points="284,90 325,106 363,156" fill="#1B1446"/><polygon points="284,90 363,156 273,159" fill="#1B1446"/><polygon points="325,106 470,88 427,186" fill="#1B1446"/><polygon points="325,106 427,186 363,156" fill="#2B2268"/><polygon points="470,88 536,60 560,178" fill="#221A5A"/><polygon points="470,88 560,178 427,186" fill="#2B2268"/><polygon points="536,60 588,81 630,148" fill="#201858"/><polygon points="536,60 630,148 560,178" fill="#3A2F8C"/><polygon points="588,81 679,62 689,147" fill="#31277A"/><polygon points="588,81 689,147 630,148" fill="#201858"/><polygon points="679,62 794,65 794,135" fill="#2B2268"/><polygon points="679,62 794,135 689,147" fill="#31277A"/><polygon points="0,133 86,155 105,238" fill="#201858"/><polygon points="0,133 105,238 0,238" fill="#3A2F8C"/><polygon points="86,155 198,160 170,238" fill="#221A5A"/><polygon points="86,155 170,238 105,238" fill="#201858"/><polygon points="198,160 273,159 286,238" fill="#2B2268"/><polygon points="198,160 286,238 170,238" fill="#3A2F8C"/><polygon points="273,159 363,156 346,238" fill="#2B2268"/><polygon points="273,159 346,238 286,238" fill="#1B1446"/><polygon points="363,156 427,186 469,238" fill="#2B2268"/><polygon points="363,156 469,238 346,238" fill="#2B2268"/><polygon points="427,186 560,178 551,238" fill="#201858"/><polygon points="427,186 551,238 469,238" fill="#1B1446"/><polygon points="560,178 630,148 587,238" fill="#251C60"/><polygon points="560,178 587,238 551,238" fill="#221A5A"/><polygon points="630,148 689,147 688,238" fill="#221A5A"/><polygon points="630,148 688,238 587,238" fill="#31277A"/><polygon points="689,147 794,135 794,238" fill="#251C60"/><polygon points="689,147 794,238 688,238" fill="#1B1446"/></svg>
    <div class="hrow">
      <div class="brand"><svg width="50" height="50" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
<g fill="#6C3CF0">
 <circle cx="100" cy="92" r="58"/><circle cx="58" cy="100" r="40"/><circle cx="142" cy="100" r="40"/>
 <circle cx="72" cy="56" r="36"/><circle cx="128" cy="56" r="36"/><circle cx="100" cy="46" r="34"/>
 <circle cx="100" cy="128" r="46"/>
 <polygon points="52,128 24,176 96,148"/>
</g>
<g fill="none" stroke="#A98BFF" stroke-width="5" stroke-linecap="round" opacity=".85">
 <path d="M70 38 Q62 54 74 66"/><path d="M100 30 Q94 50 102 64"/><path d="M130 38 Q138 54 126 66"/>
 <path d="M44 86 Q50 76 60 74"/><path d="M156 86 Q150 76 140 74"/>
</g>
<g><circle cx="76" cy="98" r="25" fill="#FFF4DC" stroke="#F7B24A" stroke-width="6"/>
<circle cx="124" cy="98" r="25" fill="#FFF4DC" stroke="#F7B24A" stroke-width="6"/>
<circle cx="79" cy="102" r="10.5" fill="#14102E"/><circle cx="121" cy="102" r="10.5" fill="#14102E"/>
<circle cx="82" cy="98" r="3.6" fill="#fff"/><circle cx="124" cy="98" r="3.6" fill="#fff"/></g>
<ellipse cx="46" cy="124" rx="11" ry="7.5" fill="#FF9DBA" opacity=".65"/><ellipse cx="154" cy="124" rx="11" ry="7.5" fill="#FF9DBA" opacity=".65"/>
<path d="M86 130 Q100 144 114 130" fill="none" stroke="#FFE8D2" stroke-width="5.5" stroke-linecap="round"/>
<polygon fill="#FDCB3F" points="172.0,15.0 175.9,26.1 187.0,30.0 175.9,33.9 172.0,45.0 168.1,33.9 157.0,30.0 168.1,26.1"/><polygon fill="#FDCB3F" points="22.0,44.0 24.1,49.9 30.0,52.0 24.1,54.1 22.0,60.0 19.9,54.1 14.0,52.0 19.9,49.9"/><polygon fill="#FDCB3F" points="184.0,64.0 185.6,68.4 190.0,70.0 185.6,71.6 184.0,76.0 182.4,71.6 178.0,70.0 182.4,68.4"/>
</svg><span class="wm">Quiz<i>Support</i></span></div>
      <div class="pill"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FDCB3F" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10.5" width="16" height="10.5" rx="3"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.7" r="1.2" fill="#FDCB3F"/></svg> KEEP THIS SAFE</div>
    </div>
    <div class="htitle"><h1>End-to-end encrypted<br><em>quiz key</em></h1>
      <p>Keep this PDF safe. Without it, your quiz questions cannot be opened.</p></div>
    <div class="badge"><svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#1B1446" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4.5"/><path d="M11.4 11.6 20 3"/><path d="M16 7l3 3"/></svg></div>
  </div>

  <div class="main">
    <div class="qrow">
      <div><span class="tag"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6C3CF0" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10.5" width="16" height="10.5" rx="3"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.7" r="1.2" fill="#6C3CF0"/></svg> ENCRYPTED QUIZ</span><h2 id="quizTitle"${data.titleClass}>${escapeHtml(data.title)}</h2></div>
      <div class="ids">
        <span class="chip">Quiz ID <b id="quizId">${escapeHtml(data.quizId)}</b></span>
        <span class="chip">Server ID <b id="serverId">${escapeHtml(data.serverId)}</b></span>
      </div>
    </div>

    <div class="grid">
      <div class="card keycard">
        <span class="lab"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FDCB3F" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4.5"/><path d="M11.4 11.6 20 3"/><path d="M16 7l3 3"/></svg> TEACHER KEY · PASTE THIS TO UNLOCK</span>
        <div class="keywrap mono" id="keyBox">${data.keyBlocks}</div>
        <div class="fp"><span class="k">FINGERPRINT</span><span class="v mono" id="fpBox">${data.fingerprintGroups}</span></div>
      </div>
      <div class="card qrcard">
        <div class="qrbox" id="qrBox">${data.qrSvg}</div>
        <div class="scan"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1B1446" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M4 12h16"/></svg> SCAN TO COPY</div>
        <small>Scan with your phone to copy the key</small>
      </div>
    </div>

    <div class="card how">
      <h3><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#6C3CF0" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10.5" width="16" height="10.5" rx="3"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.7" r="1.2" fill="#6C3CF0"/></svg> How to unlock this quiz</h3>
      <ol>
        <li><span class="num">1</span><p>Keep this PDF safe. This key and your login are what open your quiz questions.</p></li>
        <li><span class="num">2</span><p>To view the encrypted copy, open <b>Quiz Studio</b> and choose <b>“Open encrypted copy”</b> on the Review &amp; publish step.</p></li>
        <li><span class="num">3</span><p>Paste the full key <span class="soft">(spaces and dashes are ignored)</span>.</p></li>
        <li><span class="num">4</span><p>The key is checked in your browser and is <b>never uploaded</b>.</p></li>
      </ol>
    </div>

    <div class="imp">
      <div class="impi"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1B1446" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5 22 20.5H2z"/><path d="M12 10v5"/><circle cx="12" cy="17.8" r=".6" fill="#1B1446"/></svg></div>
      <div><h4>IMPORTANT · DON’T LOSE THIS KEY</h4>
      <p>QuizSupport cannot recover this key. If you lose it, your quiz questions will no longer be accessible — not even to you. Saving encrypted content again creates a new key and replaces the old encrypted copy.</p></div>
    </div>
  </div>

  <div class="foot">
    <div class="l"><svg width="20" height="20" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
<g fill="#6C3CF0">
 <circle cx="100" cy="92" r="58"/><circle cx="58" cy="100" r="40"/><circle cx="142" cy="100" r="40"/>
 <circle cx="72" cy="56" r="36"/><circle cx="128" cy="56" r="36"/><circle cx="100" cy="46" r="34"/>
 <circle cx="100" cy="128" r="46"/>
 <polygon points="52,128 24,176 96,148"/>
</g>
<g fill="none" stroke="#A98BFF" stroke-width="5" stroke-linecap="round" opacity=".85">
 <path d="M70 38 Q62 54 74 66"/><path d="M100 30 Q94 50 102 64"/><path d="M130 38 Q138 54 126 66"/>
 <path d="M44 86 Q50 76 60 74"/><path d="M156 86 Q150 76 140 74"/>
</g>
<g><circle cx="76" cy="98" r="25" fill="#FFF4DC" stroke="#F7B24A" stroke-width="6"/>
<circle cx="124" cy="98" r="25" fill="#FFF4DC" stroke="#F7B24A" stroke-width="6"/>
<circle cx="79" cy="102" r="10.5" fill="#14102E"/><circle cx="121" cy="102" r="10.5" fill="#14102E"/>
<circle cx="82" cy="98" r="3.6" fill="#fff"/><circle cx="124" cy="98" r="3.6" fill="#fff"/></g>
<ellipse cx="46" cy="124" rx="11" ry="7.5" fill="#FF9DBA" opacity=".65"/><ellipse cx="154" cy="124" rx="11" ry="7.5" fill="#FF9DBA" opacity=".65"/>
<path d="M86 130 Q100 144 114 130" fill="none" stroke="#FFE8D2" stroke-width="5.5" stroke-linecap="round"/>
<polygon fill="#FDCB3F" points="172.0,15.0 175.9,26.1 187.0,30.0 175.9,33.9 172.0,45.0 168.1,33.9 157.0,30.0 168.1,26.1"/><polygon fill="#FDCB3F" points="22.0,44.0 24.1,49.9 30.0,52.0 24.1,54.1 22.0,60.0 19.9,54.1 14.0,52.0 19.9,49.9"/><polygon fill="#FDCB3F" points="184.0,64.0 185.6,68.4 190.0,70.0 185.6,71.6 184.0,76.0 182.4,71.6 178.0,70.0 182.4,68.4"/>
</svg><span>Generated in your browser by QuizSupport. The key was not sent to the server.</span></div>
    <div id="stamp">${escapeHtml(data.stamp)}</div>
  </div>
</div>`;

const PAGE_2 = String.raw`<div class="page" id="page2">
  <div class="header h2">
    <svg class="poly" viewBox="0 0 794 160" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><polygon points="0,0 96,0 97,102" fill="#31277A"/><polygon points="0,0 97,102 0,105" fill="#3A2F8C"/><polygon points="96,0 191,0 153,78" fill="#3A2F8C"/><polygon points="96,0 153,78 97,102" fill="#201858"/><polygon points="191,0 283,0 249,82" fill="#201858"/><polygon points="191,0 249,82 153,78" fill="#3A2F8C"/><polygon points="283,0 380,0 357,53" fill="#201858"/><polygon points="283,0 357,53 249,82" fill="#2B2268"/><polygon points="380,0 456,0 424,68" fill="#251C60"/><polygon points="380,0 424,68 357,53" fill="#1B1446"/><polygon points="456,0 555,0 555,95" fill="#251C60"/><polygon points="456,0 555,95 424,68" fill="#2B2268"/><polygon points="555,0 588,0 597,97" fill="#201858"/><polygon points="555,0 597,97 555,95" fill="#201858"/><polygon points="588,0 704,0 683,87" fill="#251C60"/><polygon points="588,0 683,87 597,97" fill="#1B1446"/><polygon points="704,0 794,0 794,59" fill="#251C60"/><polygon points="704,0 794,59 683,87" fill="#251C60"/><polygon points="0,105 97,102 57,160" fill="#221A5A"/><polygon points="0,105 57,160 0,160" fill="#31277A"/><polygon points="97,102 153,78 199,160" fill="#31277A"/><polygon points="97,102 199,160 57,160" fill="#1B1446"/><polygon points="153,78 249,82 247,160" fill="#31277A"/><polygon points="153,78 247,160 199,160" fill="#3A2F8C"/><polygon points="249,82 357,53 335,160" fill="#3A2F8C"/><polygon points="249,82 335,160 247,160" fill="#251C60"/><polygon points="357,53 424,68 471,160" fill="#1B1446"/><polygon points="357,53 471,160 335,160" fill="#251C60"/><polygon points="424,68 555,95 552,160" fill="#251C60"/><polygon points="424,68 552,160 471,160" fill="#221A5A"/><polygon points="555,95 597,97 605,160" fill="#251C60"/><polygon points="555,95 605,160 552,160" fill="#2B2268"/><polygon points="597,97 683,87 734,160" fill="#3A2F8C"/><polygon points="597,97 734,160 605,160" fill="#251C60"/><polygon points="683,87 794,59 794,160" fill="#201858"/><polygon points="683,87 794,160 734,160" fill="#2B2268"/></svg>
    <div class="hrow">
      <div class="brand"><svg width="50" height="50" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
<g fill="#6C3CF0">
 <circle cx="100" cy="92" r="58"/><circle cx="58" cy="100" r="40"/><circle cx="142" cy="100" r="40"/>
 <circle cx="72" cy="56" r="36"/><circle cx="128" cy="56" r="36"/><circle cx="100" cy="46" r="34"/>
 <circle cx="100" cy="128" r="46"/>
 <polygon points="52,128 24,176 96,148"/>
</g>
<g fill="none" stroke="#A98BFF" stroke-width="5" stroke-linecap="round" opacity=".85">
 <path d="M70 38 Q62 54 74 66"/><path d="M100 30 Q94 50 102 64"/><path d="M130 38 Q138 54 126 66"/>
 <path d="M44 86 Q50 76 60 74"/><path d="M156 86 Q150 76 140 74"/>
</g>
<g><circle cx="76" cy="98" r="25" fill="#FFF4DC" stroke="#F7B24A" stroke-width="6"/>
<circle cx="124" cy="98" r="25" fill="#FFF4DC" stroke="#F7B24A" stroke-width="6"/>
<circle cx="79" cy="102" r="10.5" fill="#14102E"/><circle cx="121" cy="102" r="10.5" fill="#14102E"/>
<circle cx="82" cy="98" r="3.6" fill="#fff"/><circle cx="124" cy="98" r="3.6" fill="#fff"/></g>
<ellipse cx="46" cy="124" rx="11" ry="7.5" fill="#FF9DBA" opacity=".65"/><ellipse cx="154" cy="124" rx="11" ry="7.5" fill="#FF9DBA" opacity=".65"/>
<path d="M86 130 Q100 144 114 130" fill="none" stroke="#FFE8D2" stroke-width="5.5" stroke-linecap="round"/>
<polygon fill="#FDCB3F" points="172.0,15.0 175.9,26.1 187.0,30.0 175.9,33.9 172.0,45.0 168.1,33.9 157.0,30.0 168.1,26.1"/><polygon fill="#FDCB3F" points="22.0,44.0 24.1,49.9 30.0,52.0 24.1,54.1 22.0,60.0 19.9,54.1 14.0,52.0 19.9,49.9"/><polygon fill="#FDCB3F" points="184.0,64.0 185.6,68.4 190.0,70.0 185.6,71.6 184.0,76.0 182.4,71.6 178.0,70.0 182.4,68.4"/>
</svg><span class="wm">Quiz<i>Support</i></span></div>
      <div class="pill"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FDCB3F" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v5.5c0 4.6-3.2 8.2-8 9.5-4.8-1.3-8-4.9-8-9.5V6z"/><path d="M8.8 12.2l2.2 2.2 4.2-4.4"/></svg> TEACHER’S GUIDE</div>
    </div>
    <div class="htitle"><h1>Don’t lose the key. <em>Share only the link.</em></h1>
      <p>Read this before you publish your quiz or send anything to students.</p></div>
    <div class="badge sm"><svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#1B1446" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"/></svg></div>
  </div>

  <div class="main2">
    <div class="rule">
      <div class="ri"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1B1446" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v5.5c0 4.6-3.2 8.2-8 9.5-4.8-1.3-8-4.9-8-9.5V6z"/><path d="M8.8 12.2l2.2 2.2 4.2-4.4"/></svg></div>
      <p><b>THE ONE THING TO REMEMBER</b>This key is the only way to open your quiz questions. If it is lost, the questions cannot be accessed again. Keep it safe, and give students only the quiz link.</p>
    </div>

    <div class="pair">
      <div class="card kcard">
        <span class="chip2 p"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FDCB3F" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4.5"/><path d="M11.4 11.6 20 3"/><path d="M16 7l3 3"/></svg> THE KEY</span>
        <h5>Stays with you. Only you.</h5>
        <p>Opening the quiz takes two things: this key and your teacher login. You’ll be asked for this key every time you open the quiz. The key is for you alone — students never need it.</p>
        <div class="mask mono"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6C3CF0" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10.5" width="16" height="10.5" rx="3"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.7" r="1.2" fill="#6C3CF0"/></svg> •••• •••• •••• ••••</div>
      </div>
      <div class="neq"><span>≠</span></div>
      <div class="card lcard">
        <span class="chip2 y"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#1B1446" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"/></svg> THE QUIZ LINK</span>
        <h5>This is what students get.</h5>
        <p>Share only the quiz link. That is all students need to take the quiz — no key required.</p>
        <div class="mask l"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B7791F" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"/></svg> Your quiz link — share this one</div>
      </div>
    </div>

    <div class="dd">
      <div class="card do">
        <div class="hd"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg> DO</div>
        <ul>
          <li><span class="ic"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#1B1446" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span><b>Save this PDF in a private place</b> — your own device or a locked folder.</span></li>
          <li><span class="ic"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#1B1446" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span><b>Keep a safe backup copy.</b> If the key is lost, the questions can’t be accessed again.</span></li>
          <li><span class="ic"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#1B1446" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span><b>Share only the quiz link</b> with students. That’s all they need.</span></li>
          <li><span class="ic"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#1B1446" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span><b>Open the encrypted copy only from your own login,</b> inside Quiz Studio.</span></li>
          <li><span class="ic"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#1B1446" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span><b>Print it and store it safely</b> if you prefer paper.</span></li>
        </ul>
      </div>
      <div class="card dont">
        <div class="hd"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg> DON’T</div>
        <ul>
          <li><span class="ic"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#1B1446" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg></span><span><b>Don’t lose or delete this PDF.</b> QuizSupport cannot recover the key.</span></li>
          <li><span class="ic"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#1B1446" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg></span><span><b>Don’t send the key, QR code or PDF</b> to students, class groups or parents.</span></li>
          <li><span class="ic"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#1B1446" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg></span><span><b>Don’t paste the key</b> in chats, email or the quiz description.</span></li>
          <li><span class="ic"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#1B1446" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg></span><span><b>Don’t leave screenshots of the key</b> lying around — images get forwarded.</span></li>
          <li><span class="ic"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#1B1446" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg></span><span><b>Don’t open this PDF</b> while screen-sharing or projecting in class.</span></li>
        </ul>
      </div>
    </div>

    <div class="tl">
      <div class="card">
        <span class="ph">BEFORE THE QUIZ</span>
        <ul>
          <li>Save this PDF somewhere safe — and make a backup.</li>
          <li>Copy the <b>quiz link</b> — not the key.</li>
          <li>Send the link to your students.</li>
        </ul>
      </div>
      <div class="card now">
        <span class="ph">DURING THE QUIZ</span>
        <ul>
          <li>Students need <b>only the link.</b></li>
          <li>Don’t post the key in the group or chat — <b>not even now.</b></li>
          <li>If someone asks for the key, say no — only you need it.</li>
        </ul>
      </div>
      <div class="card">
        <span class="ph">AFTER THE QUIZ</span>
        <ul>
          <li>Keep this PDF — you need it to reopen the encrypted copy.</li>
          <li><b>Lose it, and the questions can’t be accessed again.</b></li>
          <li>Reusing the quiz later? Keep the PDF until you’re done with it.</li>
        </ul>
      </div>
    </div>

    <div class="imp leak">
      <div class="impi"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1B1446" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5 22 20.5H2z"/><path d="M12 10v5"/><circle cx="12" cy="17.8" r=".6" fill="#1B1446"/></svg></div>
      <div><h4>IF YOU LOSE THE KEY</h4>
      <p>QuizSupport cannot recover it, and the quiz questions will no longer be accessible. Saving encrypted content again creates a new key and replaces the old encrypted copy — so always keep the newest PDF and discard older ones.</p></div>
    </div>
  </div>

  <div class="foot">
    <div class="l"><svg width="20" height="20" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
<g fill="#6C3CF0">
 <circle cx="100" cy="92" r="58"/><circle cx="58" cy="100" r="40"/><circle cx="142" cy="100" r="40"/>
 <circle cx="72" cy="56" r="36"/><circle cx="128" cy="56" r="36"/><circle cx="100" cy="46" r="34"/>
 <circle cx="100" cy="128" r="46"/>
 <polygon points="52,128 24,176 96,148"/>
</g>
<g fill="none" stroke="#A98BFF" stroke-width="5" stroke-linecap="round" opacity=".85">
 <path d="M70 38 Q62 54 74 66"/><path d="M100 30 Q94 50 102 64"/><path d="M130 38 Q138 54 126 66"/>
 <path d="M44 86 Q50 76 60 74"/><path d="M156 86 Q150 76 140 74"/>
</g>
<g><circle cx="76" cy="98" r="25" fill="#FFF4DC" stroke="#F7B24A" stroke-width="6"/>
<circle cx="124" cy="98" r="25" fill="#FFF4DC" stroke="#F7B24A" stroke-width="6"/>
<circle cx="79" cy="102" r="10.5" fill="#14102E"/><circle cx="121" cy="102" r="10.5" fill="#14102E"/>
<circle cx="82" cy="98" r="3.6" fill="#fff"/><circle cx="124" cy="98" r="3.6" fill="#fff"/></g>
<ellipse cx="46" cy="124" rx="11" ry="7.5" fill="#FF9DBA" opacity=".65"/><ellipse cx="154" cy="124" rx="11" ry="7.5" fill="#FF9DBA" opacity=".65"/>
<path d="M86 130 Q100 144 114 130" fill="none" stroke="#FFE8D2" stroke-width="5.5" stroke-linecap="round"/>
<polygon fill="#FDCB3F" points="172.0,15.0 175.9,26.1 187.0,30.0 175.9,33.9 172.0,45.0 168.1,33.9 157.0,30.0 168.1,26.1"/><polygon fill="#FDCB3F" points="22.0,44.0 24.1,49.9 30.0,52.0 24.1,54.1 22.0,60.0 19.9,54.1 14.0,52.0 19.9,49.9"/><polygon fill="#FDCB3F" points="184.0,64.0 185.6,68.4 190.0,70.0 185.6,71.6 184.0,76.0 182.4,71.6 178.0,70.0 182.4,68.4"/>
</svg><span>Keep this guide together with the key page. Generated in your browser by QuizSupport.</span></div>
    <div>Page 2 of 2</div>
  </div>
</div>`;

export interface KeyPdfRenderInput {
  keyHex: string;
  fingerprint: string;
  quizId: string;
  serverQuizId: string;
  title: string;
  fileName: string;
  version?: number;
  generatedAt?: string | Date;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      default:
        return "&quot;";
    }
  });
}

function buildKeyBlocks(keyHex: string): string {
  const blocks = keyHex.match(/.{1,8}/g) ?? [];
  const rows: string[] = [];
  for (let index = 0; index < blocks.length; index += 4) {
    const row = blocks
      .slice(index, index + 4)
      .map((block) => `<span class="blk">${escapeHtml(block)}</span>`)
      .join('<span class="dash">–</span>');
    rows.push(`<div class="keyrow">${row}</div>`);
  }
  return rows.join("");
}

function buildFingerprintGroups(fingerprint: string): string {
  return (fingerprint.replace(/\s+/g, "").match(/.{1,16}/g) ?? [])
    .map((group) => `<span>${escapeHtml(group)}</span>`)
    .join("");
}

function buildQrSvg(keyHex: string): string {
  const qr = QRCode.create(keyHex, { errorCorrectionLevel: "M" });
  const size = qr.modules.size;
  const data = qr.modules.data;
  let rects = "";
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (data[y * size + x]) {
        rects += `<rect x="${x}" y="${y}" width="1.02" height="1.02"/>`;
      }
    }
  }
  return `<svg viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" fill="#1B1446" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`;
}

function formatGeneratedAt(value: string | Date | undefined): string {
  if (value instanceof Date) return value.toLocaleString("en-US");
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleString("en-US");
    return value;
  }
  return new Date().toLocaleString("en-US");
}

export function buildKeyPdfDocument(input: KeyPdfRenderInput): string {
  const title = input.title.trim() || "Untitled Quiz";
  const titleClass = title.length > 30 ? " long" : "";
  const version = input.version ?? 1;
  const stamp = `Page 1 of 2  |  Version ${version}  |  ${formatGeneratedAt(
    input.generatedAt
  )}`;

  const page1 = renderPage1({
    title,
    titleClass,
    quizId: input.quizId,
    serverId: input.serverQuizId,
    keyBlocks: buildKeyBlocks(input.keyHex),
    fingerprintGroups: buildFingerprintGroups(input.fingerprint),
    qrSvg: buildQrSvg(input.keyHex),
    stamp,
  });

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>QuizSupport – Encrypted Quiz Key</title>
<style>${PAGE_STYLES}</style>
</head>
<body>
${page1}
${PAGE_2}
</body>
</html>`;
}

function waitForFonts(doc: Document): Promise<void> {
  const fonts = doc.fonts;
  if (!fonts) return Promise.resolve();
  const loads = [
    fonts.load('400 16px "Poppins"'),
    fonts.load('500 16px "Poppins"'),
    fonts.load('700 16px "Poppins"'),
    fonts.load('700 16px "JetBrains Mono"'),
  ];
  return Promise.allSettled(loads)
    .then(() => fonts.ready)
    .then(() => undefined)
    .catch(() => undefined);
}

function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame !== "function") {
      resolve();
      return;
    }
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/**
 * Render the two-page key document in an isolated iframe, rasterise each A4
 * page and assemble the result into a PDF. Everything stays in the browser.
 */
export async function renderKeyPdf(
  input: KeyPdfRenderInput
): Promise<KeyPdfResult> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("The key PDF can only be generated in the browser.");
  }

  const html = buildKeyPdfDocument(input);
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.setAttribute("tabindex", "-1");
  frame.style.cssText =
    "position:fixed;left:-12000px;top:0;width:820px;height:2400px;border:0;opacity:0;pointer-events:none;";

  try {
    const loaded = new Promise<void>((resolve, reject) => {
      frame.addEventListener("load", () => resolve(), { once: true });
      frame.addEventListener(
        "error",
        () => reject(new Error("Could not prepare the key PDF.")),
        { once: true }
      );
    });
    frame.srcdoc = html;
    document.body.appendChild(frame);
    await loaded;

    const frameDoc = frame.contentDocument;
    if (!frameDoc) throw new Error("Could not prepare the key PDF.");
    await waitForFonts(frameDoc);
    await nextPaint();

    const pages = Array.from(frameDoc.querySelectorAll<HTMLElement>(".page"));
    if (pages.length < 2) throw new Error("Could not prepare the key PDF.");

    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas"),
      import("jspdf"),
    ]);

    const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
    doc.setProperties({
      title: "QuizSupport – Encrypted Quiz Key",
      subject: "QuizSupport end-to-end encrypted quiz key",
      author: "QuizSupport",
      creator: "QuizSupport",
    });

    for (let index = 0; index < pages.length; index += 1) {
      const page = pages[index];
      const bounds = page.getBoundingClientRect();
      const canvas = await html2canvas(page, {
        scale: 3,
        backgroundColor: "#F3F2FC",
        useCORS: true,
        logging: false,
        width: Math.round(bounds.width),
        height: Math.round(bounds.height),
        windowWidth: 820,
        windowHeight: 2400,
        scrollX: 0,
        scrollY: 0,
      });

      if (index > 0) doc.addPage();
      doc.addImage(
        canvas.toDataURL("image/png"),
        "PNG",
        0,
        0,
        210,
        297,
        undefined,
        "FAST"
      );
      canvas.width = 0;
      canvas.height = 0;
    }

    doc.save(input.fileName);
    return { fileName: input.fileName, keyFingerprint: input.fingerprint };
  } finally {
    frame.remove();
  }
}

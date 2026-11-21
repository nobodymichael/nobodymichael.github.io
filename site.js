/* nobodymichael: wspólny skrypt dla wszystkich stron.
   Na stronie wystarczy w <head>:  <script src="site.js"></script>
   (w podfolderze: <script src="../site.js"></script>) */
(function(){
  /* ====== TU WPISZ SWOJE ADRESY ====== */
  var DONATE=[
    {id:"BTC", name:"Bitcoin",  addr:""},
    {id:"ETH", name:"Ethereum", addr:""},
    {id:"SOL", name:"Solana",   addr:""},
    {id:"TRX", name:"Tron",     addr:""}
  ];
  /* =================================== */

  var KEY="theme", root=document.documentElement;
  var BASE=(document.currentScript&&document.currentScript.src||"").replace(/[^\/]*$/,"");
  function stored(){try{return localStorage.getItem(KEY)||"auto";}catch(e){return "auto";}}
  function apply(m){ if(m==="auto") root.removeAttribute("data-theme"); else root.setAttribute("data-theme",m); }
  apply(stored());

  function svg(p,s){return '<svg viewBox="0 0 24 24" width="'+(s||20)+'" height="'+(s||20)+'" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>';}
  var ICON={
    sun:svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>'),
    moon:svg('<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>'),
    auto:svg('<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>'),
    heart:svg('<path d="M12 20s-7-4.500-7-10a4 4 0 0 1 7-2.500A4 4 0 0 1 19 10c0 5.500-7 10-7 10z" fill="currentColor"/>',18)
  };
  var COIN={
    BTC:svg('<circle cx="12" cy="12" r="10"/><text x="12" y="17.5" font-size="15" font-weight="800" text-anchor="middle" fill="currentColor" stroke="none" font-family="Helvetica,Arial,sans-serif">&#8383;</text>',22),
    ETH:svg('<path d="M12 2l6 10-6 3.500L6 12zM12 16.500l6-3.500-6 9-6-9z" fill="currentColor" stroke="none"/>',22),
    SOL:svg('<path d="M6.500 5.500h14l-3 3.500h-14zM3.500 10.300h14l3 3.500h-14zM6.500 15.100h14l-3 3.500h-14z" fill="currentColor" stroke="none"/>',22),
    TRX:svg('<path d="M3 4l18 3-9 15zM3 4l9 7 9-4M12 11l-1 11"/>',22)
  };
  function $(i){return document.getElementById(i);}
  function esc(s){return s.replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}

  /* --- motyw --- */
  var LABEL={auto:"Motyw: automatyczny",light:"Motyw: jasny",dark:"Motyw: ciemny"}, NEXT={auto:"light",light:"dark",dark:"auto"};
  function themeBtn(){
    var b=document.createElement("button"); b.className="icon-btn"; b.type="button";
    function paint(){var m=stored(); b.innerHTML=ICON[m==="light"?"sun":m==="dark"?"moon":"auto"]; b.title=b.ariaLabel=LABEL[m]+" (kliknij, aby zmienić)";}
    b.onclick=function(){var m=NEXT[stored()]; try{localStorage.setItem(KEY,m);}catch(e){} apply(m); paint();};
    paint(); return b;
  }

  /* --- Donate --- */
  var dlg, cur;
  function ensureQr(cb){
    if(window.qrcode) return cb();
    var s=document.createElement("script"); s.src=BASE+"qrcode.js"; s.onload=cb; document.head.appendChild(s);
  }
  function qrSvg(t){
    var qr=qrcode(0,"M"); qr.addData(t); qr.make();
    var n=qr.getModuleCount(), q=2, d="";
    for(var r=0;r<n;r++) for(var c=0;c<n;c++) if(qr.isDark(r,c)) d+="M"+(c+q)+" "+(r+q)+"h1v1h-1z";
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+(n+q*2)+' '+(n+q*2)+'" shape-rendering="crispEdges"><path d="'+d+'" fill="#191919"/></svg>';
  }
  function show(c){
    cur=c; var v=$("dview"), cp=$("dcopy");
    if(!c.addr){v.innerHTML='<p class="dnote">Brak adresu '+c.id+'. Wpisz go na górze pliku site.js.</p>'; cp.disabled=true; return;}
    cp.disabled=false; cp.textContent="Kopiuj adres";
    ensureQr(function(){ if(cur!==c) return; v.innerHTML='<div class="dqr">'+qrSvg(c.addr)+'</div><div class="addr">'+esc(c.addr)+'</div>'; });
  }
  function copy(){
    var t=cur.addr, ok=function(){var b=$("dcopy"); b.textContent="Skopiowano \u2713"; setTimeout(function(){b.textContent="Kopiuj adres";},1600);};
    if(navigator.clipboard&&window.isSecureContext) navigator.clipboard.writeText(t).then(ok,fallback); else fallback();
    function fallback(){var a=document.createElement("textarea"); a.value=t; a.style.position="fixed"; a.style.opacity="0"; document.body.appendChild(a); a.select(); try{document.execCommand("copy"); ok();}catch(e){} a.remove();}
  }
  function build(){
    dlg=document.createElement("dialog"); dlg.className="donate";
    dlg.innerHTML='<h2>Donate</h2><p class="dnote">Wybierz kryptowalutę. Kod QR powstaje lokalnie w przeglądarce.</p><div class="chips" id="dcoins" role="radiogroup"></div><div id="dview"></div><div class="drow"><button class="btn" id="dcopy" type="button">Kopiuj adres</button><button class="btn ghost" id="dclose" type="button">Zamknij</button></div>';
    document.body.appendChild(dlg);
    var g=$("dcoins"), first=DONATE.filter(function(c){return c.addr;})[0]||DONATE[0];
    DONATE.forEach(function(c,i){
      var inp=document.createElement("input"), lb=document.createElement("label");
      inp.type="radio"; inp.name="coin"; inp.id="coin_"+i; inp.checked=(c===first); inp.onchange=function(){show(c);};
      lb.htmlFor=inp.id; lb.innerHTML=(COIN[c.id]||"")+"<span>"+c.id+"</span>"; lb.title=c.name;
      g.appendChild(inp); g.appendChild(lb);
    });
    $("dcopy").onclick=function(){if(cur&&cur.addr) copy();};
    $("dclose").onclick=function(){dlg.close();};
    dlg.addEventListener("click",function(e){if(e.target===dlg) dlg.close();});
    show(first);
  }
  function openDonate(){ if(!dlg) build(); if(!dlg.open) dlg.showModal(); }

  /* --- start --- */
  function init(){
    var h=document.querySelector("header");
    if(!h){h=document.createElement("header"); document.body.insertBefore(h,document.body.firstChild);}
    var box=document.createElement("div"); box.className="hdr";
    var d=document.createElement("button"); d.className="btn small"; d.type="button"; d.innerHTML='<span class="heart">'+ICON.heart+'</span>Donate'; d.onclick=openDonate;
    box.appendChild(d); box.appendChild(themeBtn()); h.appendChild(box);
    /* lista narzędzi: wystarczy <li><a href="exif/">exif cleaner</a></li> */
    document.querySelectorAll(".tools a").forEach(function(a){
      if(a.querySelector("strong")) return;
      var s=document.createElement("strong"); s.textContent=a.textContent.trim(); a.textContent=""; a.appendChild(s);
    });
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init); else init();
})();

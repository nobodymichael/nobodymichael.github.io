/* nobodymichael: wspólny skrypt dla wszystkich stron.
   Na stronie wystarczy w <head>:  <script src="../assets/site.js"></script>
   (w głównym folderze: <script src="assets/site.js"></script>) */
(function(){
  /* ====== TU WPISZ SWOJE ADRESY ====== */
  var DONATE=[
    {id:"BTC", name:"Bitcoin",  net:"Native SegWit (BTC)", addr:"bc1qvgam9y07puc29dq5g646dgyc603hqvy06uc36j"},
    {id:"ETH", name:"Ethereum", net:"ERC-20 / EVM",         addr:"0x437E14fd07BbCD3AD923B39a4c7bB89E8ccBD5a7"},
    {id:"SOL", name:"Solana",   net:"Solana Mainnet",       addr:"4u6XcbSN6CVGkUAZ6ej9r5SHgvKECQif5RBUU5UDMCpN"},
    {id:"TRX", name:"Tron",     net:"TRC-20",               addr:"TREsDGqxv2vzresMsU3yoDojqzhr1eBkYy"},
    {id:"XMR", name:"Monero",   net:"Monero Network",       addr:"test"}
  ];
  /* =================================== */

  var COINS=DONATE.filter(function(c){return c.addr;});
  var BASE=(document.currentScript&&document.currentScript.src||"").replace(/[^\/]*$/,"");
  var mq=window.matchMedia?window.matchMedia("(prefers-color-scheme: light)"):null;

  function injectDonateStyles(){
    if(document.getElementById("nm-donate-dyn-css")) return;
    var st=document.createElement("style");
    st.id="nm-donate-dyn-css";
    st.textContent=[
      ".dmeta{display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin:.9rem 0 .25rem;padding:.55rem .75rem;border-radius:12px;background:var(--field);border:1.5px solid var(--edge);font-size:.84rem}",
      ".dmeta strong{font-weight:800}",
      ".dnet{font-family:var(--mono);font-size:.76rem;color:var(--muted);padding:.18rem .5rem;border-radius:8px;border:1px solid var(--edge);background:rgba(245,50,44,.08)}",
      ".dqr-wrap{display:grid;place-items:center;margin:1rem 0 .75rem;transition:opacity .22s ease,transform .22s ease}",
      ".dqr-wrap.hidden-qr{display:none}",
      ".dqr-wrap.swap{opacity:0;transform:scale(.96)}",
      ".dqr{width:min(100%,14.5rem);background:#fff;border-radius:16px;padding:.75rem;box-shadow:0 10px 24px rgba(0,0,0,.25)}",
      ".dqr svg{display:block;width:100%;height:auto}",
      ".addr.copied{border-color:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.2)}",
      ".addr .edge-ch{color:var(--red2);font-weight:800}",
      ".dtools{display:flex;justify-content:space-between;align-items:center;gap:.5rem;margin-top:.55rem;font-size:.8rem;color:var(--muted)}",
      ".dlink-btn{background:none;border:0;color:var(--ink);font:700 .8rem/1.2 var(--mono);cursor:pointer;padding:.2rem .35rem;border-radius:8px;text-decoration:underline;text-underline-offset:3px}",
      ".dlink-btn:hover{color:var(--red2)}"
    ].join("\n");
    document.head.appendChild(st);
  }

  function syncMeta(){
    var meta=document.querySelector('meta[name="theme-color"]');
    if(meta) meta.setAttribute("content",mq&&mq.matches?"#FBF9F4":"#0d0e0f");
  }
  syncMeta();
  if(mq&&mq.addEventListener) mq.addEventListener("change",syncMeta);

  function svg(p,s){return '<svg viewBox="0 0 24 24" width="'+(s||20)+'" height="'+(s||20)+'" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>';}
  var ICON={
    heart:svg('<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" fill="currentColor" stroke="none"/>',18),
    dm:svg('<path d="M22 2L11 13"/><path d="M22 2L15 22l-4-9-9-4 20-7z"/>',17)
  };
  var COIN={
    BTC:svg('<circle cx="12" cy="12" r="10"/><text x="12" y="17.5" font-size="15" font-weight="800" text-anchor="middle" fill="currentColor" stroke="none" font-family="Helvetica,Arial,sans-serif">&#8383;</text>',22),
    ETH:svg('<path d="M12 2l6 10-6 3.5L6 12zM12 16.5l6-3.5-6 9-6-9z" fill="currentColor" stroke="none"/>',22),
    SOL:svg('<path d="M6.5 5.5h14l-3 3.5h-14zM3.5 10.3h14l3 3.5h-14zM6.5 15.1h14l-3 3.5h-14z" fill="currentColor" stroke="none"/>',22),
    TRX:svg('<path d="M3 4l18 3-9 15zM3 4l9 7 9-4M12 11l-1 11"/>',22),
    XMR:svg('<circle cx="12" cy="12" r="10"/><path d="M5.5 15.5V8.5l6.5 6.5 6.5-6.5v7"/>',22)
  };
  function $(i){return document.getElementById(i);}
  function esc(s){return s.replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
  function formatAddrHtml(a){
    if(a.length<=10) return esc(a);
    var head=esc(a.slice(0,5)), mid=esc(a.slice(5,-5)), tail=esc(a.slice(-5));
    return '<span class="edge-ch">'+head+'</span>'+mid+'<span class="edge-ch">'+tail+'</span>';
  }

  /* --- Donate --- */
  var dlg, cur, qrVisible=true;
  function ensureQr(cb){
    if(window.qrcode) return cb();
    var s=document.createElement("script"); s.src=BASE+"qrcode.js"; s.onload=cb; document.head.appendChild(s);
  }
  window.nmQr=function(t,o){
    o=o||{}; var qr=qrcode(0,o.ec||"M"); qr.addData(t); qr.make();
    var n=qr.getModuleCount(), q=o.q==null?4:o.q, w=n+q*2, d="";
    for(var r=0;r<n;r++) for(var c=0;c<n;c++) if(qr.isDark(r,c)) d+="M"+(c+q)+" "+(r+q)+"h1v1h-1z";
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+w+'" shape-rendering="crispEdges">'+(o.paper?'<rect width="'+w+'" height="'+w+'" fill="'+o.paper+'"/>':'')+'<path d="'+d+'" fill="'+(o.ink||"#191919")+'"/></svg>';
  };
  function show(c){
    cur=c;
    var v=$("dview"), cp=$("dcopy");
    cp.textContent="Kopiuj adres";
    ensureQr(function(){
      if(cur!==c) return;
      var qrSvg=nmQr(c.addr,{q:2});
      v.innerHTML=
        '<div class="dmeta"><strong>'+esc(c.name)+' ('+esc(c.id)+')</strong><span class="dnet">'+esc(c.net||c.id)+'</span></div>'+
        '<div class="dqr-wrap swap'+(qrVisible?'':' hidden-qr')+'" id="dqrWrap"><div class="dqr">'+qrSvg+'</div></div>'+
        '<div class="addr" id="daddr">'+formatAddrHtml(c.addr)+'</div>'+
        '<div class="dtools"><span>Sprawdź początek i koniec adresu</span><button type="button" class="dlink-btn" id="dtoggleqr">'+(qrVisible?'Ukryj QR':'Pokaż QR')+'</button></div>';
      var w=$("dqrWrap");
      if(w&&qrVisible) requestAnimationFrame(function(){w.classList.remove("swap");});
      var tBtn=$("dtoggleqr");
      if(tBtn) tBtn.onclick=function(){
        qrVisible=!qrVisible;
        var box=$("dqrWrap");
        if(box) box.classList.toggle("hidden-qr",!qrVisible);
        tBtn.textContent=qrVisible?"Ukryj QR":"Pokaż QR";
      };
    });
  }
  function copy(){
    if(!cur) return;
    var t=cur.addr;
    var ok=function(){
      var b=$("dcopy"), ad=$("daddr");
      if(b){b.textContent="Skopiowano \u2713"; setTimeout(function(){b.textContent="Kopiuj adres";},1600);}
      if(ad){ad.classList.add("copied"); setTimeout(function(){ad.classList.remove("copied");},1200);}
    };
    if(navigator.clipboard&&window.isSecureContext) navigator.clipboard.writeText(t).then(ok,fallback); else fallback();
    function fallback(){var a=document.createElement("textarea"); a.value=t; a.style.position="fixed"; a.style.opacity="0"; document.body.appendChild(a); a.select(); try{document.execCommand("copy"); ok();}catch(e){} a.remove();}
  }
  function build(){
    injectDonateStyles();
    dlg=document.createElement("dialog"); dlg.className="donate";
    dlg.innerHTML='<h2>Donate</h2><p class="dnote">Wybierz sieć i kryptowalutę. Kod QR powstaje lokalnie w przeglądarce.</p><div class="chips" id="dcoins" role="radiogroup"></div><div id="dview"></div><div class="drow"><button class="btn" id="dcopy" type="button">Kopiuj adres</button><button class="btn ghost" id="dclose" type="button">Zamknij</button></div>';
    document.body.appendChild(dlg);
    var g=$("dcoins"), first=COINS[0];
    COINS.forEach(function(c,i){
      var inp=document.createElement("input"), lb=document.createElement("label");
      inp.type="radio"; inp.name="coin"; inp.id="coin_"+i; inp.checked=(c===first); inp.onchange=function(){show(c);};
      lb.htmlFor=inp.id; lb.innerHTML=(COIN[c.id]||"")+"<span>"+c.id+"</span>"; lb.title=c.name+" ("+(c.net||c.id)+")";
      g.appendChild(inp); g.appendChild(lb);
    });
    $("dcopy").onclick=copy;
    $("dclose").onclick=function(){dlg.close();};
    dlg.addEventListener("click",function(e){if(e.target===dlg) dlg.close();});
    show(first);
  }
  function openDonate(){ if(!dlg) build(); if(!dlg.open) dlg.showModal(); }

  /* --- strzałka powrotu na podstronach --- */
  function ensureBack(h){
    if(document.body.classList.contains("home")) return;
    if(h.querySelector(".back-btn")) return;
    var brand=h.querySelector(".brand");
    var href=(brand&&brand.getAttribute("href"))||"../";
    var left=document.createElement("div"); left.className="hdr-left";
    var back=document.createElement("a");
    back.className="back-btn";
    back.href=href;
    back.title=back.ariaLabel="Wróć na stronę główną";
    back.textContent="<";
    left.appendChild(back);
    if(brand){
      brand.parentNode.insertBefore(left,brand);
      left.appendChild(brand);
    }else{
      h.insertBefore(left,h.firstChild);
    }
  }

  /* --- start --- */
  function init(){
    var h=document.querySelector("header");
    if(!h){h=document.createElement("header"); document.body.insertBefore(h,document.body.firstChild);}
    ensureBack(h);

    var box=document.createElement("div"); box.className="hdr";
    var tg=document.createElement("a");
    tg.className="icon-btn"; tg.href="https://t.me/placekwlb"; tg.target="_blank"; tg.rel="noopener";
    tg.innerHTML=ICON.dm+'<span>Kontakt</span>';
    box.appendChild(tg);

    var d=document.createElement("button");
    d.className="btn small donate-btn"; d.type="button";
    d.innerHTML='<span class="heart">'+ICON.heart+'</span><span>Donate</span>';
    d.onclick=openDonate;
    if(COINS.length) box.appendChild(d);

    h.appendChild(box);

    document.querySelectorAll(".tools a").forEach(function(a){
      if(a.querySelector("strong")) return;
      var s=document.createElement("strong"); s.textContent=a.textContent.trim(); a.textContent=""; a.appendChild(s);
    });
    document.querySelectorAll("textarea").forEach(function(t){
      t.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init); else init();
  document.addEventListener("input", function(e){
    if (!e.target || e.target.tagName !== "TEXTAREA") return;
    e.target.style.height = "auto";
    e.target.style.height = e.target.scrollHeight + "px";
    e.target.style.overflowY = e.target.scrollHeight > 224 ? "auto" : "hidden";
  });
})();

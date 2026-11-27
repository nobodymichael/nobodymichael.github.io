(() => {
  const panel = document.querySelector('#history');
  const asset = panel.querySelector('select');
  const range = panel.querySelector('[name=days]');
  const slider = panel.querySelector('input');
  const plot = panel.querySelector('canvas');
  const note = panel.querySelector('.history-note');
  const quote = panel.querySelector('output');
  const day = 86400000;
  const format = new Intl.NumberFormat('pl-PL', {maximumFractionDigits: 2});
  const colors = {ratio:'#ead19b', btc:'#efb76e', eth:'#b4b8ff', xau:'#f2d181', xag:'#d3dce7'};
  let points = [], version = 0, active = false;
  const snapshots = new Map();

  async function getSnapshot(date) {
    if (snapshots.has(date)) return snapshots.get(date);
    const key = 'pulse-history-v1-' + date;
    if (date !== 'latest') {
      try {
        const cached = JSON.parse(localStorage.getItem(key));
        if (cached?.date === date && cached.usd?.xau > 0) return cached;
      } catch {}
    }
    const job = (async () => {
      for (const url of [
        'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@'+date+'/v1/currencies/usd.min.json',
        'https://'+date+'.currency-api.pages.dev/v1/currencies/usd.min.json'
      ]) {
        try {
          const res = await fetch(url,{signal:AbortSignal.timeout(7000)});
          if (!res.ok) continue;
          const data = await res.json();
          if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date) || !data.usd || (date !== 'latest' && data.date !== date)) continue;
          const compact = {date:data.date,usd:{}};
          for(const id of ['xau','xag','btc','eth']) compact.usd[id]=Number(data.usd[id]);
          try {localStorage.setItem('pulse-history-v1-'+data.date,JSON.stringify(compact))} catch {}
          return compact;
        } catch {}
      }
      throw Error('Brak odczytu');
    })();
    snapshots.set(date,job);
    try {return await job} catch(e){snapshots.delete(date);throw e}
  }
  function value(snapshot) {
    const rates=snapshot?.usd;
    if(!rates)return NaN;
    return asset.value==='ratio' ? rates.xag/rates.xau : 1/rates[asset.value];
  }
  function draw() {
    if(!points.length)return;
    const canvasWidth=plot.clientWidth;
    if(!canvasWidth)return;
    const h=185,w=canvasWidth,dpr=Math.min(3,devicePixelRatio||1);
    plot.width=w*dpr;plot.height=h*dpr;
    const ctx=plot.getContext('2d');ctx.scale(dpr,dpr);
    const values=points.map(p=>p.value).filter(Number.isFinite);
    const lo=Math.min(...values),hi=Math.max(...values), pad=(hi-lo)*.08 || Math.max(hi*.005,.01);
    ctx.font='11px system-ui';const left=Math.max(ctx.measureText(format.format(hi+pad)).width,ctx.measureText(format.format(lo-pad)).width)+12;
    const x=i=>left+(w-left-10)*i/(points.length-1);
    const y=v=>12+(hi+pad-v)/(hi-lo+2*pad)*(h-44);
    for(const v of [lo-pad,(lo+hi)/2,hi+pad]){
      ctx.fillStyle='#b5b7b1';ctx.fillText(format.format(v),0,y(v)+4);
      ctx.strokeStyle='#343631';ctx.beginPath();ctx.moveTo(left,y(v));ctx.lineTo(w-8,y(v));ctx.stroke();
    }
    ctx.strokeStyle=ctx.fillStyle=colors[asset.value];ctx.lineWidth=2.5;ctx.beginPath();
    let connected=false;
    points.forEach((p,i)=>{if(!Number.isFinite(p.value)){connected=false;return}if(connected)ctx.lineTo(x(i),y(p.value));else ctx.moveTo(x(i),y(p.value));connected=true});
    ctx.stroke();
    points.forEach((p,i)=>{if(Number.isFinite(p.value)){ctx.beginPath();ctx.arc(x(i),y(p.value),1.8,0,Math.PI*2);ctx.fill()}});
    const i=Number(slider.value),p=points[i];
    ctx.strokeStyle='#adafa5';ctx.beginPath();ctx.moveTo(x(i),8);ctx.lineTo(x(i),h-25);ctx.stroke();
    ctx.fillStyle='#c8c9c2';ctx.fillText(points[0].date,left,h-3);ctx.textAlign='right';ctx.fillText(points.at(-1).date,w-6,h-3);
    quote.textContent=p.date+' · '+(Number.isFinite(p.value)?format.format(p.value)+(asset.value==='ratio'?' oz Ag / oz Au':' USD'):'brak odczytu');
    slider.setAttribute('aria-valuetext',quote.textContent);
    plot.onpointerdown=e=>{slider.value=Math.max(0,Math.min(points.length-1,Math.round((e.clientX-plot.getBoundingClientRect().left-left)/(w-left-10)*(points.length-1))));draw()};
  }
  async function load(){
    active=true;const id=++version;points=[];plot.hidden=slider.hidden=true;quote.textContent='';
    note.textContent='Pobieranie dziennych odczytów…';
    try{
      const last=await getSnapshot('latest'),end=Date.parse(last.date+'T00:00:00Z'),n=Number(range.value);
      const result=Array.from({length:n},(_,i)=>({date:new Date(end-(n-1-i)*day).toISOString().slice(0,10)}));
      let index=n-1;
      async function worker(){while(index>=0 && id===version){const p=result[index--];try{p.raw=p.date===last.date?last:await getSnapshot(p.date)}catch{}}}
      await Promise.all(Array.from({length:5},worker));if(id!==version)return;
      for(const p of result){const v=value(p.raw);p.value=Number.isFinite(v)&&v>0?v:NaN}
      const good=result.filter(p=>Number.isFinite(p.value));if(good.length<2)throw Error();
      points=result;slider.max=n-1;slider.value=result.lastIndexOf(good.at(-1));plot.hidden=slider.hidden=false;
      note.textContent='Currency API · odczyty dzienne · '+good.length+' z '+n+' dni';draw();
    }catch{if(id===version)note.textContent='Historia niedostępna. Spróbuj ponownie.'}
  }
  panel.addEventListener('toggle',()=>{if(panel.open&&!active)load();else if(panel.open)draw()});
  asset.onchange=range.onchange=load;slider.oninput=draw;panel.querySelector('button').onclick=()=>{snapshots.delete('latest');load()};
  new ResizeObserver(draw).observe(panel);
})();

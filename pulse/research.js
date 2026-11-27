(()=>{
 const $=id=>document.getElementById(id);
 const markets={btc:['Bitcoin','bitcoin'],eth:['Ethereum','ethereum'],sol:['Solana','solana'],link:['Chainlink','chainlink'],xau:['Złoto','XAU'],xag:['Srebro','XAG']};
 const day=86400000,periods=[1,7,30],fmt=new Intl.NumberFormat('pl-PL',{maximumFractionDigits:2});
 const el=(tag,text)=>Object.assign(document.createElement(tag),{textContent:text});
 const percent=v=>(v>0?'+':'')+fmt.format(v)+'%';
 const valid=v=>Number.isFinite(v)&&v>0;
 let quotes={},history=[],sort='7',descending=true,version=0;
 let levels=[];
 try{levels=JSON.parse(localStorage.getItem('pulse-levels')||'[]').filter(t=>valid(t.price)&&(Object.hasOwn(markets,t.asset)||t.asset==='ratio')&&['below','above'].includes(t.side))}catch{}
 function persist(){try{localStorage.setItem('pulse-levels',JSON.stringify(levels))}catch{}}
 function chart(key){$(key==='ratio'?'gold-silver':'asset-'+markets[key][1])?.click()}
 $('inspect-ratio').onclick=()=>chart('ratio');
 for(const [key,[name]] of Object.entries(markets))$('level-asset').add(new Option(name,key));
 $('level-asset').add(new Option('Gold/Silver Ratio','ratio'));
 $('level-asset').onchange=()=>{$('target-label').firstElementChild.textContent=$('level-asset').value==='ratio'?'Wartość ratio':'Cena w USD'};
 $('level-form').onsubmit=e=>{
  e.preventDefault();const price=$('level-price').valueAsNumber,asset=$('level-asset').value,side=$('level-side').value;
  if(!valid(price))return;
  if(!levels.some(t=>t.price===price&&t.asset===asset&&t.side===side))levels.push({asset,side,price});
  persist();$('level-price').value='';showLevels();
 };
 function priceFor(key){
  const recent=q=>q&&valid(q.price)&&!q.stale&&Date.now()-q.time<15*60000;
  if(key!=='ratio'){const q=quotes[markets[key][1]];return recent(q)?q.price:null}
  const a=quotes.XAU,b=quotes.XAG;return recent(a)&&recent(b)&&Math.abs(a.time-b.time)<=600000?a.price/b.price:null;
 }
 function showLevels(){
  const root=$('level-rows');root.replaceChildren();
  if(!levels.length){root.append(el('small','Brak zapisanych poziomów.'));return}
  levels.forEach((t,i)=>{
   const price=priceFor(t.asset),row=el('div','');row.className='level-row';
   const title=t.asset==='ratio'?'XAU/XAG':t.asset.toUpperCase();
   const target=el('strong',title+' '+(t.side==='below'?'≤ ':'≥ ')+fmt.format(t.price)+(t.asset==='ratio'?'':' USD'));
   const reached=price!==null&&(t.side==='below'?price<=t.price:price>=t.price);
   const state=el('span',price===null?'Brak świeżej ceny':reached?'Warunek spełniony':'Do celu '+percent((t.price/price-1)*100));
   if(reached)state.className='hit';const remove=el('button','×');remove.setAttribute('aria-label','Usuń poziom '+title);remove.onclick=()=>{levels.splice(i,1);persist();showLevels()};
   row.append(target,state,remove);root.append(row);
  });
 }
 document.addEventListener('pulse-quotes',e=>{quotes=e.detail;showLevels()});
 showLevels();
 function inBase(s,key,base){
  const rates=s?.usd;if(!valid(rates?.[key]))return null;
  const numerator=base==='usd'?1:rates[base];return valid(numerator)?numerator/rates[key]:null;
 }
 function renderMatrix(){
  const root=$('matrix');root.replaceChildren();const base=$('benchmark').value;
  const rows=Object.keys(markets).filter(k=>k!==base).map(key=>{
   const end=inBase(history[30],key,base),values={};
   for(const d of periods){const start=inBase(history[30-d],key,base);values[d]=start&&end?(end/start-1)*100:null}
   const curve=history.map(s=>inBase(s,key,base)).filter(valid);
   values.peak=end&&curve.length===31?(end/Math.max(...curve)-1)*100:null;
   return {key,values};
  }).sort((a,b)=>{const x=a.values[sort],y=b.values[sort];return x===null?Number(y!==null):y===null?-1:(descending?y-x:x-y)});
  for(const {key,values} of rows){
   const row=root.insertRow(),name=el('button',key.toUpperCase()+' ↗');name.setAttribute('aria-label','Wykres '+markets[key][0]);name.onclick=()=>chart(key);row.insertCell().append(name);
   for(const d of [...periods,'peak']){const v=values[d],cell=row.insertCell();cell.textContent=v===null?'—':percent(v);if(v!==null)cell.className=v>0?'pos':v<0?'neg':''}
  }
  document.querySelectorAll('[data-days]').forEach(b=>{b.parentElement.setAttribute('aria-sort',b.dataset.days===sort?(descending?'descending':'ascending'):'none')});
 }
 document.querySelectorAll('[data-days]').forEach(b=>b.onclick=()=>{const d=b.dataset.days;descending=sort===d?!descending:true;sort=d;renderMatrix()});
 $('benchmark').onchange=renderMatrix;
 function metal(){
  const series=history.map(s=>inBase(s,'xau','xag')),values=series.filter(valid),canvas=$('metal-history'),stats=$('metal-stats');
  stats.replaceChildren();canvas.hidden=values.length<2;
  if(values.length<2){$('metal-source').textContent='Za mało odczytów do porównania.';return}
  const sorted=values.slice().sort((a,b)=>a-b),lo=sorted[0],hi=sorted.at(-1),mid=Math.floor(sorted.length/2);
  const median=sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2;
  for(const [label,value] of [['Minimum',lo],['Mediana',median],['Maksimum',hi]]){const item=el('div','');item.append(el('small',label),el('strong',fmt.format(value)));stats.append(item)}
  const w=canvas.clientWidth||300,h=112,dpr=Math.min(3,devicePixelRatio||1);canvas.width=w*dpr;canvas.height=h*dpr;const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
  const x=i=>6+(w-12)*i/30,y=v=>hi===lo?h/2:8+(h-16)*(hi-v)/(hi-lo);
  ctx.strokeStyle='#56534a';ctx.setLineDash([3,4]);ctx.beginPath();ctx.moveTo(0,y(median));ctx.lineTo(w,y(median));ctx.stroke();ctx.setLineDash([]);
  ctx.strokeStyle='#e6cc92';ctx.fillStyle='#eadbb9';ctx.lineWidth=2;ctx.beginPath();let connected=false;
  series.forEach((v,i)=>{if(!valid(v)){connected=false;return}if(connected)ctx.lineTo(x(i),y(v));else ctx.moveTo(x(i),y(v));connected=true});ctx.stroke();
  series.forEach((v,i)=>{if(valid(v)){ctx.beginPath();ctx.arc(x(i),y(v),1.8,0,Math.PI*2);ctx.fill()}});
  const end=history[30],latest=series[30];$('metal-source').textContent=(valid(latest)?'Ostatni: '+fmt.format(latest)+' · '+end.date+' · ':'')+'Currency API · '+values.length+'/31 odczytów · linia przerywana: mediana';
 }
 let loadedAt=0,started=false;
 async function load(){
  started=true;const ticket=++version;$('scan-source').textContent='Pobieranie historii…';$('metal-source').textContent='Pobieranie zakresu…';
  try{
   PulseHistory.refresh();const last=await PulseHistory.getSnapshot('latest');if(ticket!==version)return;
   const end=Date.parse(last.date+'T00:00:00Z'),series=Array(31).fill(null);series[30]=last;
   async function sample(i){const d=new Date(end-(30-i)*day).toISOString().slice(0,10);try{series[i]=await PulseHistory.getSnapshot(d)}catch{}}
   await Promise.all([0,23,29].map(sample));if(ticket!==version)return;
   history=series;renderMatrix();$('scan-source').textContent='Currency API · do '+last.date+' · ceny dzienne';
   const queue=Array.from({length:29},(_,i)=>i+1).filter(i=>i!==23&&i!==29);
   async function worker(){while(queue.length&&ticket===version)await sample(queue.shift())}
   await Promise.all(Array.from({length:4},worker));if(ticket===version){renderMatrix();metal();loadedAt=Date.now();document.dispatchEvent(new CustomEvent('pulse-series',{detail:series}))}
  }catch{if(ticket===version){document.dispatchEvent(new CustomEvent('pulse-series',{detail:[]}));$('scan-source').textContent='Historia niedostępna. Użyj „Odśwież”, aby ponowić.';$('metal-source').textContent='Historia niedostępna.'}}
 }
 $('refresh').addEventListener('click',load);const startHistory=()=>{if(!started)load()};
 const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();startHistory()}},{rootMargin:'120px'});observer.observe($('scanner'));observer.observe($('metal-range'));
 $('tool-tabs').addEventListener('click',e=>{if(['compare','dca'].includes(e.target.closest('button')?.dataset.tool))startHistory()});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&loadedAt&&Date.now()-loadedAt>3600000)load()});
 new ResizeObserver(()=>{if(history.some(Boolean))metal()}).observe($('metal-history').parentElement);
})();

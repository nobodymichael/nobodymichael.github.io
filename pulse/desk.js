(()=>{
 const ids={bitcoin:'BTC',ethereum:'ETH',solana:'SOL',chainlink:'LINK',XAU:'XAU',XAG:'XAG'};
 const keys=Object.keys(ids),$=id=>document.getElementById(id);
 const read=(key,otherwise)=>{try{return JSON.parse(localStorage.getItem('pulse-desk-'+key))??otherwise}catch{return otherwise}};
 const write=(key,val)=>{try{localStorage.setItem('pulse-desk-'+key,JSON.stringify(val))}catch{}};
 const n=new Intl.NumberFormat('pl-PL',{maximumFractionDigits:2});
 const button=(text,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=fn;return b};
 let quotes={},unit=read('unit','USD'),filter=read('filter','Wszystkie'),book=read('book',{}),pending=0;
 const saved=read('stars',[]),stars=new Set(Array.isArray(saved)?saved:[]);
 const categories=['Wszystkie','Krypto','Metale','★ Obserwowane'];
 if(!categories.includes(filter))filter='Wszystkie';
 if(!['PLN','USD'].includes(unit))unit='USD';
 if(!book||typeof book!=='object')book={};
 const conversion=()=>unit==='PLN'?Number(quotes.usd?.price):1;
 const money=v=>Number.isFinite(v)?n.format(v)+' '+unit:'—';
 function switcher(id,items,current,select){
  $(id).replaceChildren(...items.map(v=>{const b=button(v,()=>select(v));b.setAttribute('aria-pressed',String(current===v));return b}));
 }
 function estimate(){
  const k=$('budget-asset').value,amount=$('budget-pln').valueAsNumber,price=Number(quotes[k]?.price),fx=Number(quotes.usd?.price);
  const valid=Number.isFinite(amount)&&amount>=0&&price>0&&fx>0;
  $('budget-units').textContent=valid?(amount/(price*fx)).toLocaleString('pl-PL',{maximumFractionDigits:8})+' '+ids[k]:'—';
  $('budget-source').textContent=price>0&&fx>0?'1 '+ids[k]+' = '+n.format(price*fx)+' PLN · '+quotes[k].source+' · '+new Date(quotes[k].time).toLocaleString('pl-PL')+' · NBP '+quotes.usd.date:'Potrzebne notowanie aktywa i kurs USD/PLN z NBP.';
 }
 keys.forEach(k=>$('budget-asset').add(new Option(ids[k],k)));
 $('budget-pln').oninput=$('budget-asset').onchange=estimate;
 function show(){
  estimate();
  switcher('filter',categories,filter,v=>{filter=v;write('filter',v);show()});
  switcher('unit',['USD','PLN'],unit,v=>{unit=v;write('unit',v);show()});
  let visible=0;
  for(const key of keys){
   const card=$('asset-'+key);if(!card)continue;
   let wrap=card.parentElement;
   if(!wrap.classList.contains('quote-wrap')){
    wrap=document.createElement('div');wrap.className='quote-wrap';card.before(wrap);wrap.append(card);
    const star=button('☆',()=>{if(stars.has(key))stars.delete(key);else stars.add(key);write('stars',[...stars]);show()});star.className='star';wrap.append(star);
   }
   const star=wrap.querySelector('.star');star.textContent=stars.has(key)?'★':'☆';star.setAttribute('aria-pressed',String(stars.has(key)));star.setAttribute('aria-label','Obserwuj '+ids[key]);
   const metal=key==='XAU'||key==='XAG';
   wrap.hidden=!(filter==='Wszystkie'||(filter===categories[3]?stars.has(key):filter==='Metale'?metal:!metal));
   if(!wrap.hidden)visible++;
   const q=quotes[key];if(q?.price>0)card.querySelector('.price').textContent=money(q.price*conversion());
  }
  $('list-note').hidden=visible>0;$('list-note').textContent='Dotknij gwiazdki przy aktywie, aby dodać je do obserwowanych.';
  $('quotes').querySelector('.section-title span').textContent=unit+' · metale za uncję'+(unit==='PLN'?' · NBP '+(quotes.usd?.date||'—'):'');
  const held=keys.filter(k=>Number(book[k])>0),rows=$('book-rows');rows.replaceChildren();
  const values=held.map(k=>book[k]*Number(quotes[k]?.price)*conversion());
  const complete=values.every(v=>Number.isFinite(v)&&v>0),total=values.reduce((a,b)=>a+b,0);
  $('book-value').textContent=held.length&&complete?money(total):'—';
  $('book-note').textContent=!held.length?'Dodaj ilości aktywów, aby zobaczyć wycenę i udział każdej pozycji.':complete?'Wycena pozycji · '+unit:'Oczekiwanie na komplet kursów';
  held.forEach((k,i)=>{const r=document.createElement('div');r.className='book-row';const left=document.createElement('b'),right=document.createElement('span');left.textContent=ids[k];right.textContent=money(values[i])+(complete?' · '+n.format(100*values[i]/total)+'%':'');r.append(left,right);rows.append(r)});
  const times=held.map(k=>quotes[k]?.time).filter(t=>Number.isFinite(t));
  $('book-source').textContent=times.length?'Najstarsze notowanie: '+new Date(Math.min(...times)).toLocaleString('pl-PL')+(unit==='PLN'?' · USD/PLN NBP '+(quotes.usd?.date||'—'):''):'';
 }
 document.addEventListener('pulse-quotes',e=>{quotes=e.detail;show()});
 $('edit-book').onclick=()=>{
  const fields=$('book-fields');fields.replaceChildren();
  for(const k of keys){const label=document.createElement('label'),input=document.createElement('input');label.textContent=ids[k]+(['XAU','XAG'].includes(k)?' · uncje':'');input.name=k;input.type='text';input.inputMode='decimal';input.pattern='[0-9]+([.,][0-9]+)?';input.placeholder='0';input.value=book[k]||'';label.append(input);fields.append(label)}
  $('book-dialog').showModal();
 };
 $('book-form').onsubmit=e=>{
  if(e.submitter?.value!=='save')return;
  const next={};for(const k of keys){const input=e.target.elements[k],q=Number(input.value.replace(',','.'));if(!Number.isFinite(q)){e.preventDefault();input.focus();return}if(q>0)next[k]=q}
  book=next;write('book',book);show();
 };
 async function ranking(){
  const ticket=++pending,period=Number($('return-days').value),rows=$('return-rows');rows.replaceChildren();$('return-note').textContent='Pobieranie historii…';
  try{
   const last=await PulseHistory.getSnapshot('latest'),start=new Date(Date.parse(last.date+'T00:00:00Z')-period*86400000).toISOString().slice(0,10);
   const first=await PulseHistory.getSnapshot(start);if(ticket!==pending)return;
   const returns=Object.values(ids).map(sym=>{const k=sym.toLowerCase(),a=first.usd[k],b=last.usd[k];return {sym,p:a>0&&b>0?(a/b-1)*100:NaN}}).filter(x=>Number.isFinite(x.p)).sort((a,b)=>b.p-a.p);
   if(!returns.length)throw Error();
   const scale=Math.max(1,...returns.map(x=>Math.abs(x.p)));
   for(const {sym,p} of returns){const row=document.createElement('div');row.className='return-row';const name=document.createElement('b'),track=document.createElement('div'),bar=document.createElement('i'),val=document.createElement('span');name.textContent=sym;track.className='return-track';bar.className=p>=0?'gain':'loss';bar.style.width=Math.abs(p)/scale*49+'%';val.textContent=(p>0?'+':'')+n.format(p)+'%';track.append(bar);row.append(name,track,val);rows.append(row)}
   $('return-note').textContent='Currency API · '+first.date+' → '+last.date;
  }catch{if(ticket===pending)$('return-note').replaceChildren('Historia niedostępna. ',button('Ponów',ranking))}
 }
 $('return-days').onchange=ranking;window.addEventListener('DOMContentLoaded',ranking);show();
})();

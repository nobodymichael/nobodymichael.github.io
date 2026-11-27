(()=>{
 const ids={bitcoin:'BTC',ethereum:'ETH',solana:'SOL',chainlink:'LINK',XAU:'XAU',XAG:'XAG'};
 const keys=Object.keys(ids),$=id=>document.getElementById(id);
 const read=(key,otherwise)=>{try{return JSON.parse(localStorage.getItem('pulse-desk-'+key))??otherwise}catch{return otherwise}};
 const write=(key,val)=>{try{localStorage.setItem('pulse-desk-'+key,JSON.stringify(val))}catch{}};
 const n=new Intl.NumberFormat('pl-PL',{maximumFractionDigits:2});
 const button=(text,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=fn;return b};
 let quotes={},unit=read('unit','USD'),filter=read('filter','Wszystkie');
 const saved=read('stars',[]),stars=new Set(Array.isArray(saved)?saved:[]);
 const categories=['Wszystkie','Krypto','Metale','★ Obserwowane'];
 if(!categories.includes(filter))filter='Wszystkie';
 if(!['PLN','USD'].includes(unit))unit='USD';
 const conversion=()=>unit==='PLN'?Number(quotes.usd?.price):1;
 const money=v=>Number.isFinite(v)?n.format(v)+' '+unit:'—';
 function switcher(id,items,current,select){
  $(id).replaceChildren(...items.map(v=>{const b=button(v,()=>select(v));b.setAttribute('aria-pressed',String(current===v));return b}));
 }
 const search=$('find');
 search.addEventListener('input',show);
 function show(){
  const query=search.value.trim().toLocaleLowerCase('pl');
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
   if(query && !(card.querySelector('.asset-name').textContent+' '+ids[key]).toLocaleLowerCase('pl').includes(query))wrap.hidden=true;
   if(!wrap.hidden)visible++;
   const q=quotes[key];if(q?.price>0)card.querySelector('.price').textContent=money(q.price*conversion());
  }
  $('list-note').hidden=visible>0;$('list-note').textContent=query?'Brak wyników. Zmień wyszukiwanie lub filtr.':'Dotknij gwiazdki przy aktywie, aby dodać je do obserwowanych.';
  $('quotes').querySelector('.section-title span').textContent=unit+' · metale za uncję'+(unit==='PLN'?' · NBP '+(quotes.usd?.date||'—'):'');
 }
 document.addEventListener('pulse-quotes',e=>{quotes=e.detail;show()});
 show();
})();

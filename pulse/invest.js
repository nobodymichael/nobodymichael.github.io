(() => {
  const $ = id => document.getElementById(id);
  const assets = {btc:['Bitcoin','bitcoin'],eth:['Ethereum','ethereum'],sol:['Solana','solana'],link:['Chainlink','chainlink'],xau:['Złoto','XAU'],xag:['Srebro','XAG']};
  const fmt = (v,d=2) => v.toLocaleString('pl-PL',{maximumFractionDigits:d});
  const pln = v => fmt(v)+' zł';
  const field = id => $(id).valueAsNumber;
  const holdingsKey = 'pulse-purchase-lots-v1';
  let lots=[], quotes={}, series=null, tool='portfolio';
  const positive = n => Number.isFinite(n)&&n>0;
  try { lots=JSON.parse(localStorage.getItem(holdingsKey)||'[]').filter(l=>Object.hasOwn(assets,l.asset)&&positive(l.qty)&&positive(l.cost)); } catch {}
  function storeLots(next){
    try {localStorage.setItem(holdingsKey,JSON.stringify(next));lots=next;portfolio();return true}
    catch {$('port-total').textContent='Brak miejsca lub dostępu do zapisu.';return false}
  }
  for(const id of ['lot-asset','first','second','dca-asset','from','to']){
    const options=Object.entries(assets).map(([k,[name]])=>[k,name+' · '+k.toUpperCase()]);
    if(id==='from'||id==='to')options.push(['usd','USD'],['pln','PLN'],['eur','EUR']);
    for(const [key,label] of options)$(id).add(new Option(label,key));
  }
  $('second').value='xau';$('to').value='pln';
  function usd(k){
    if(k==='usd')return 1;
    const fx=quotes.usd?.price;
    if(k==='pln'||k==='eur')return positive(fx)?(k==='eur'?quotes.eur?.price:1)/fx:NaN;
    return quotes[assets[k][1]]?.price;
  }
  function quoteNote(keys){
    const sources=new Set(keys.flatMap(k=>k==='eur'?['eur','usd']:k==='pln'?['usd']:k==='usd'?[]:[assets[k][1]]));
    return [...sources].some(k=>quotes[k]?.stale||Date.now()-quotes[k]?.fetched>600000)?' · zapisane notowania':'';
  }
  function row(parent,heading,detail){
    const div=document.createElement('div'),title=document.createElement('strong'),text=document.createElement('span');
    div.className='holding';title.textContent=heading;text.textContent=detail;div.append(title,text);parent.append(div);return div;
  }
  function portfolio(){
    const groups=new Map();let cost=0,value=0,complete=true;
    $('positions').replaceChildren();$('lots').replaceChildren();
    lots.forEach((lot,i)=>{
      const g=groups.get(lot.asset)||{qty:0,cost:0};g.qty+=lot.qty;g.cost+=lot.cost;groups.set(lot.asset,g);cost+=lot.cost;
      const r=row($('lots'),lot.asset.toUpperCase(),fmt(lot.qty,8)+' jedn. · '+pln(lot.cost));
      const remove=document.createElement('button');remove.textContent='Usuń zakup';remove.onclick=()=>storeLots(lots.filter((_,index)=>index!==i));r.append(remove);
    });
    const rows=[];
    for(const [k,g] of groups){
      const marked=g.qty*usd(k)*quotes.usd?.price;
      if(Number.isFinite(marked))value+=marked;else complete=false;
      rows.push({k,g,marked});
    }
    for(const {k,g,marked} of rows){
      const detail=[fmt(g.qty,8)+' jedn.','śr. koszt '+pln(g.cost/g.qty)+'/jedn.'];
      if(Number.isFinite(marked)){detail.push('wartość '+pln(marked),'wynik '+pln(marked-g.cost));if(complete&&value>0)detail.push(fmt(marked/value*100,1)+'% portfela')}
      else detail.push('wycena niedostępna');
      row($('positions'),assets[k][0],detail.join(' · '));
    }
    $('export').disabled=!lots.length;
    $('port-total').textContent=!lots.length?'Dodaj pierwszy zakup, aby zobaczyć wycenę i skład portfela.':'Koszt '+pln(cost)+(complete?' · Wartość '+pln(value)+' · Wynik '+pln(value-cost)+' ('+fmt((value/cost-1)*100)+'%)':' · Brak pełnej wyceny')+quoteNote([...groups.keys(),'pln']);
  }
  $('lot-form').onsubmit=e=>{e.preventDefault();const qty=field('lot-qty'),cost=field('lot-cost');if(positive(qty)&&positive(cost)&&storeLots([...lots,{asset:$('lot-asset').value,qty,cost}])){$('lot-qty').value='';$('lot-cost').value=''}};
  $('export').onclick=()=>{
    const csv=['Aktywo;Jednostki;Koszt PLN',...lots.map(l=>[l.asset.toUpperCase(),l.qty,l.cost].map(v=>String(v).replace('.',',')).join(';'))].join('\r\n');
    const url=URL.createObjectURL(new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='pulse-zakupy.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
  };
  function convert(){
    const a=$('from').value,b=$('to').value,n=field('amount'),rate=a===b?1:usd(a)/usd(b);
    $('conversion').textContent=!Number.isFinite(n)||n<0?'Wpisz ilość równą zero lub większą.':positive(rate)?fmt(n,8)+' '+a.toUpperCase()+' = '+fmt(n*rate,8)+' '+b.toUpperCase()+(a===b?'':quoteNote([a,b])):'Brak kursu potrzebnego do przeliczenia.';
  }
  $('swap').onclick=()=>{const a=$('from').value;$('from').value=$('to').value;$('to').value=a;convert()};
  function scenario(){
    const n=field('capital'),s=field('shock');
    $('scenario-result').textContent=n>=0&&s>=-100?'Po zmianie '+pln(n*(1+s/100))+' · Różnica '+pln(n*s/100):'Wpisz wartość pozycji i zmianę od −100% wzwyż.';
  }
  const price=(i,k)=>positive(series?.[i]?.usd[k])?1/series[i].usd[k]:NaN;
  const noHistory=()=>series===null?'Pobieranie dziennych odczytów…':'Brak wymaganych odczytów. Spróbuj odświeżyć dane.';
  function dca(){
    const k=$('dca-asset').value,n=field('installment'),out=$('dca-result');
    if(!positive(n)){out.textContent='Wpisz dodatnią kwotę.';return}
    const prices=[2,9,16,23].map(i=>price(i,k)),last=price(30,k);
    if(![...prices,last].every(positive)){out.textContent=noHistory();return}
    const qty=prices.reduce((sum,p)=>sum+n/p,0),v=qty*last;
    out.textContent='Wpłaty '+fmt(4*n)+' USD · '+fmt(qty,8)+' '+k.toUpperCase()+' · Średnia cena '+fmt(4*n/qty)+' USD · Wartość '+fmt(v)+' USD · Wynik '+fmt(v-4*n)+' USD · Jednorazowy zakup za '+fmt(4*n)+' USD w pierwszym dniu byłby dziś wart '+fmt(4*n*last/prices[0])+' USD · '+series[30].date;
  }
  function compare(){
    const keys=[$('first').value,$('second').value],start=30-Number($('period').value),out=$('pair-result'),c=$('pair-chart');
    const curves=keys.map(k=>Array.from({length:31-start},(_,i)=>100*price(start+i,k)/price(start,k)));
    c.hidden=keys[0]===keys[1]||!curves.every(a=>positive(a[0])&&positive(a.at(-1)));
    if(c.hidden){out.textContent=keys[0]===keys[1]?'Wybierz dwa różne aktywa.':noHistory();return}
    const colors=['#edcc86','#a5cadf'],w=c.clientWidth,h=155;if(!w)return;
    const scale=Math.min(2,devicePixelRatio);c.width=w*scale;c.height=h*scale;
    const g=c.getContext('2d');g.scale(scale,scale);
    const values=curves.flat().filter(positive),hi=Math.max(...values)+.1,lo=Math.min(...values)-.1;
    const x=i=>40+i*(w-47)/(30-start),y=v=>8+(hi-v)*(h-20)/(hi-lo);
    for(const level of [hi,100,lo]){g.fillStyle='#b7bcbd';g.fillText(fmt(level,1),1,y(level)+4);g.strokeStyle='#3d4446';g.beginPath();g.moveTo(39,y(level));g.lineTo(w,y(level));g.stroke()}
    curves.forEach((a,j)=>{g.strokeStyle=colors[j];g.lineWidth=2;g.beginPath();a.forEach((v,i)=>{if(positive(v)){if(!i||!positive(a[i-1]))g.moveTo(x(i),y(v));else g.lineTo(x(i),y(v))}});g.stroke()});
    out.textContent=series[start].date+' → '+series[30].date+' · '+keys.map((k,i)=>k.toUpperCase()+(i?' (błękit) ':' (złoto) ')+fmt(curves[i].at(-1)-100)+'%').join(' · ');
  }
  const draw={portfolio,compare,dca,convert,scenario};
  $('tool-tabs').onclick=e=>{const btn=e.target.closest('[data-tool]');if(!btn)return;tool=btn.dataset.tool;
    for(const b of $('tool-tabs').children){const active=b===btn;b.setAttribute('aria-pressed',String(active));$(b.dataset.tool).hidden=!active}draw[tool]()};
  $('investor').addEventListener('input',()=>{if(tool!=='portfolio')draw[tool]()});
  document.addEventListener('pulse-quotes',e=>{quotes=e.detail;if(tool==='portfolio'||tool==='convert')draw[tool]()});
  document.addEventListener('pulse-series',e=>{series=e.detail;if(tool==='compare'||tool==='dca')draw[tool]()});
  new ResizeObserver(()=>{if(tool==='compare')compare()}).observe($('compare'));
  $('heat').onchange=()=>$('scanner').classList.toggle('heat-on',$('heat').checked);$('heat').onchange();portfolio();
})();
(() => {
  const aliases={rynek:'quotes',analiza:'scanner',cele:'levels',wskazniki:'gold-silver',waluty:'usd'};
  function restoreLink(){const id=aliases[location.hash.slice(1)];if(id)document.getElementById(id)?.scrollIntoView()}
  window.addEventListener('hashchange',restoreLink);window.addEventListener('load',restoreLink);
})();

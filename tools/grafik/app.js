import {getDocument,GlobalWorkerOptions} from './vendor/pdf.min.mjs';
import {readPage} from './parser.js';
GlobalWorkerOptions.workerSrc=new URL('./vendor/pdf.worker.min.mjs',import.meta.url).href;
const el=id=>document.getElementById(id);
const element=(tag,text)=>Object.assign(document.createElement(tag),{textContent:text});
let schedule, owner, selected=new Set(), revision=0;
const dayDate=i=>new Date(schedule.year,schedule.month-1,i+1,12);
const dayText=i=>dayDate(i).toLocaleDateString('pl-PL',{weekday:'short',day:'2-digit',month:'2-digit'});
const title=()=>dayDate(0).toLocaleDateString('pl-PL',{year:'numeric',month:'long'});
const chosen=()=>[owner,...[...selected].filter(i=>i!==owner).sort((a,b)=>a-b)];
el('file').onchange=async()=>{
  const version=++revision,file=el('file').files[0];
  schedule=null;selected.clear();el('picker').hidden=el('preview').hidden=el('daily').hidden=true;el('vault-save').hidden=true;
  if(!file){el('status').textContent='';return}
  el('status').textContent='Odczytuję grafik…';
  let pdf;
  try{
    pdf=await getDocument({data:await file.arrayBuffer(),isEvalSupported:false}).promise;
    let data;
    for(let i=1;i<=pdf.numPages;i++){
      const page=await pdf.getPage(i),part=readPage((await page.getTextContent()).items);
      if(!data)data=part;
      else if(data.year===part.year && data.month===part.month)data.people.push(...part.people);
      else throw Error('Plik zawiera kilka różnych miesięcy.');
    }
    if(version!==revision)return;
    data.people.forEach(person=>{person.manager=false});
    const counts=new Map();
    for(const person of data.people){
      const [surname,first]=person.name.trim().toLocaleLowerCase('pl').split(/\s+/);
      const given=first?.replace(/(^|-)(\p{L})/gu,(_,dash,c)=>dash+c.toLocaleUpperCase('pl'));
      person.label=[given,surname[0].toLocaleUpperCase('pl')].filter(Boolean).join(' ');
      counts.set(person.label,(counts.get(person.label)||0)+1);
    }
    const seen=new Map();
    for(const person of data.people){
      const key=person.label;
      if(counts.get(key)>1){seen.set(key,(seen.get(key)||0)+1);person.label+=' ('+seen.get(key)+')'}
    }
    data.people=data.people.map(({label,manager,shifts})=>({label,manager,shifts}));
    install(data);el('file').value='';

  }catch(e){if(version===revision)el('status').textContent='Nie udało się odczytać grafiku. '+(e.name==='PasswordException'?'Plik wymaga hasła.':'Wybierz PDF z tabelą „Grafik planowany za okres” i zaznaczalnym tekstem.')}
  finally{if(pdf)await pdf.destroy()}
};
el('me').onchange=()=>{
  const val=el('me').value;owner=val===''?null:Number(val);
  el('others').replaceChildren();el('others').parentElement.hidden=owner===null;
  el('preview').hidden=el('daily').hidden=owner===null;el('vault-save').hidden=owner===null;
  if(owner===null)return;
  selected=new Set(schedule.people.map((_,i)=>i).filter(i=>i!==owner));
  schedule.people.forEach((p,i)=>{
    if(i===owner)return;
    const label=element('label',''),box=document.createElement('input');box.type='checkbox';box.checked=selected.has(i);
    box.onchange=()=>{if(box.checked)selected.add(i);else selected.delete(i);preview()};
    label.append(box,p.label);el('others').append(label);
  });
  preview();renderDaily();
};
let font;
async function loadFont(){
  if(font)return font;
  const response=await fetch('./vendor/sans.ttf');if(!response.ok)throw Error();
  const bytes=new Uint8Array(await response.arrayBuffer());
  let str='';for(const byte of bytes)str+=String.fromCharCode(byte);
  return font=btoa(str);
}
el('download').onclick=async()=>{
  const button=el('download'),version=revision;button.disabled=true;
  try{
    const typeface=await loadFont();if(version!==revision||owner===null)return;
    const doc=new window.jspdf.jsPDF({unit:'mm',format:view==='axis'?'a4':'a3',orientation:view!=='axis'?'landscape':'portrait',compress:true});
    doc.addFileToVFS('sans.ttf',typeface);doc.addFont('sans.ttf','Grafik','normal');doc.setFont('Grafik');
    exportPages(doc);
    doc.save('grafik-'+(view!=='axis'?'tabela-':'os-czasu-')+schedule.year+'-'+String(schedule.month).padStart(2,'0')+'.pdf');
  }catch{el('status').textContent='Nie udało się wygenerować PDF-u. Spróbuj ponownie.'}finally{button.disabled=false}
};
let view=matchMedia('(max-width: 650px)').matches?'mobile':'grid',period=0;
const groups=()=>[['Zespół',chosen().filter(i=>!schedule.people[i].manager)],['Kierownicy i zastępcy',chosen().filter(i=>schedule.people[i].manager)]].filter(([,ids])=>ids.length);
function personName(i){
 return schedule.people[i].label+(i===owner?' · Ty':'');
}
const palette={morning:'#b7e2ff',late:'#ffe492',night:'#d8d0fa',off:'#edf0f3',other:'#edf0f3'};
function shiftInfo(i,d){
 const s=schedule.people[i].shifts[d],m=s.text.match(/^(\d\d?):(\d\d)–(\d\d?):(\d\d)/);
 if(!m)return {...s,kind:s.off?'off':'other'};
 const start=Number(m[1])+Number(m[2])/60,end=Number(m[3])+Number(m[4])/60;
 return {...s,start,end:end<start?end+24:end,kind:end<start?'night':start<12?'morning':'late'};
}
function scale(d){
 const shifts=chosen().map(i=>shiftInfo(i,d)).filter(v=>v.start!==undefined);
 const start=Math.floor(Math.min(6,...shifts.map(v=>v.start))/2)*2;
 const end=Math.ceil(Math.max(22,...shifts.map(v=>v.end))/2)*2;
 const ticks=[start];for(let h=start+4;h<=end;h+=4)ticks.push(h);
 if(ticks.at(-1)!==end)ticks.push(end);
 return {start,end,ticks,pos:h=>(h-start)/(end-start)};
}
const tick=h=>String(h%24).padStart(2,'0')+(h>=24?'+1':'');
const monthDays=()=>Array.from({length:schedule.days},(_,i)=>i);
function mobileMonth(sheet){
 for(const d of monthDays()){
  const card=element('details',''),summary=element('summary',''),mine=shiftInfo(owner,d);
  card.className='daycard';
  const badge=element('span',mine.text);badge.className='shift '+mine.kind;
  summary.className='mine';summary.append(element('strong',dayText(d)),badge);card.append(summary);
  for(const [name,ids] of groups()){
   card.append(element('h3',name));
   for(const i of ids){
    const row=element('div',''),s=shiftInfo(i,d),time=element('span',s.text);
    time.className='shift '+s.kind;row.className=i===owner?'personline mine':'personline';row.append(element('span',personName(i)),time);card.append(row);
   }
  }
  sheet.append(card);
 }
}
function preview(){
 for(const mode of ['grid','mobile','axis'])el(mode).setAttribute('aria-pressed',String(view===mode));
 el('month').textContent=title();
 const select=el('period');select.hidden=view!=='axis';
 select.replaceChildren();
 if(view==='axis'){for(const d of monthDays())select.add(new Option(dayText(d),d));select.value=period}
 const sheet=el('sheet');sheet.replaceChildren();
 if(view==='mobile'){mobileMonth(sheet);return}
 if(view==='grid'){
  const days=monthDays(),table=element('table',''),head=table.createTHead().insertRow();
  for(const text of ['Osoba',...days.map(dayText)])head.append(element('th',text));
  for(const [group,ids] of groups()){
   const body=table.createTBody(),row=body.insertRow(),label=element('th',group);label.colSpan=days.length+1;row.className='group';row.append(label);
   for(const i of ids){const r=body.insertRow();if(i===owner)r.className='mine';r.append(element('th',personName(i)));
    for(const d of days){const s=shiftInfo(i,d),badge=element('span',s.text);badge.className='shift '+s.kind;r.insertCell().append(badge)}}
  }sheet.append(table);
 }else{
  const panel=element('div',''),sc=scale(period),ticks=element('div','');panel.className='timeline';ticks.className='ticks';
  for(const h of sc.ticks){const label=element('span',tick(h));label.style.left=sc.pos(h)*100+'%';ticks.append(label)}panel.append(ticks);
  for(const [group,ids] of groups()){
   const header=element('h3',group);header.className='sectionname';panel.append(header);
   for(const i of ids){const s=shiftInfo(i,period),row=element('div',''),name=element('strong',personName(i)),track=element('div','');
    row.className=i===owner?'lane mine':'lane';track.className='track';track.style.setProperty('--step',400/(sc.end-sc.start)+'%');name.append(element('small',s.text));
    if(s.start!==undefined){const bar=element('span','');bar.className='bar '+s.kind;bar.style.left=sc.pos(s.start)*100+'%';bar.style.width=(sc.pos(s.end)-sc.pos(s.start))*100+'%';track.append(bar)}
    row.append(name,track);panel.append(row);
   }
  }sheet.append(panel);
 }
}
for(const mode of ['grid','mobile','axis'])el(mode).onclick=()=>{view=mode;preview()};
el('period').onchange=()=>{period=Number(el('period').value);preview()};
function exportPages(doc){
 const grid=view!=='axis',width=doc.internal.pageSize.getWidth(),height=doc.internal.pageSize.getHeight();
 let pages=0;
 function text(value,x,y,size=10,color='#182d46',max=Infinity){
  doc.setFontSize(size);doc.setFontSize(size*Math.min(1,max/Math.max(.1,doc.getTextWidth(value))));doc.setTextColor(color);doc.text(value,x,y);
 }
 function header(label){
  if(pages++)doc.addPage();
  text(grid?'Tabela':'Oś czasu',12,17,22);text(title()+'   /   '+label,12,25,11);
  let x=12;
  for(const [kind,label] of [['morning','Rano'],['late','Popołudnie'],['night','Noc'],['off','Wolne']]){
   doc.setFillColor(palette[kind]);doc.circle(x+1,32,1.8,'F');text(label,x+5,33,9);x+=doc.getTextWidth(label)+13;
  }
  text('(+1)  następny dzień',12,height-6,8);text(String(pages),width-17,height-6,8);
 }
 const count=grid?1:schedule.days;
 for(let period=0;period<count;period++){
  const days=grid?monthDays():[period],sc=grid?null:scale(period);
  const nameEnd=grid?48:65,span=width-nameEnd-13,cw=span/days.length;
  function startPage(){
   header(grid?dayText(days[0])+' – '+dayText(days.at(-1)):dayText(period));
   if(grid)days.forEach((d,j)=>text(dayText(d),nameEnd+j*cw+.5,43,9,'#182d46',cw-1));
   else sc.ticks.forEach(h=>text(tick(h),nameEnd+sc.pos(h)*span-2,43,8));
   return 47;
  }
  let y=startPage();
  function groupLabel(label){
   doc.setFillColor('#edf3f8');doc.rect(12,y,width-24,6,'F');text(label,14,y+4.3,9);y+=7;
  }
  for(const [group,ids] of groups()){
   if(y+16>height-13)y=startPage();groupLabel(group);
   for(const i of ids){
    const rh=grid?Math.min(13,(height-62-7*groups().length)/chosen().length):10;
    if(y+rh>height-13){y=startPage();groupLabel(group)}
    if(i===owner){doc.setFillColor('#e7f99d');doc.rect(12,y,width-24,rh,'F')}
    text(personName(i),13,y+4.5,9,'#182d46',nameEnd-15);
    if(grid)days.forEach((d,j)=>{
     const s=shiftInfo(i,d),x=nameEnd+j*cw;
     doc.setFillColor(palette[s.kind]);doc.roundedRect(x,y,cw-.6,rh-.7,.8,.8,'F');
     const lines=s.start===undefined?[s.text]:s.text.split('–');
     lines.forEach((line,k)=>text(line,x+.7,y+(k+1)*rh/(lines.length+1)+.8,8,'#152c41',cw-2));
    });
    else{
     const s=shiftInfo(i,period);text(s.text,13,y+8,8,'#445976',nameEnd-15);
     doc.setDrawColor('#d4dce4');sc.ticks.forEach(h=>{const x=nameEnd+span*sc.pos(h);doc.line(x,y,x,y+rh)});
     if(s.start!==undefined){doc.setFillColor(palette[s.kind]);doc.rect(nameEnd+span*sc.pos(s.start),y+2,(sc.pos(s.end)-sc.pos(s.start))*span,5,'F')}
    }
    if(i===owner){doc.setFillColor('#afce34');doc.rect(12,y+rh-.8,width-24,.75,'F')}
    y+=rh;
   }
  }
 }
}

const vaultKey='nobody-prism-roster-v1', iterations=600000;
let dayIndex=0, lockTimer, vaultBusy=false, epoch=0;
function hasVault(){try{return !!localStorage.getItem(vaultKey)}catch{return false}}
function syncVault(){const stored=hasVault();el('vault-open').hidden=!stored||!!schedule;el('vault-delete').hidden=!stored;el('vault-lock').hidden=!schedule;el('import-panel').hidden=stored&&!schedule;el('vault-save').hidden=owner===null||owner===undefined;el('vault-pass').value=''}
function dateIndex(offset){const d=new Date();d.setDate(d.getDate()+offset);return d.getFullYear()===schedule.year&&d.getMonth()+1===schedule.month?d.getDate()-1:-1}
function install(data,chosenOwner=null){schedule=data;owner=null;selected.clear();period=0;
 const me=el('me');me.replaceChildren(new Option('Wybierz siebie',''));data.people.forEach((p,i)=>me.add(new Option(p.label,i)));el('others').replaceChildren();el('others').parentElement.hidden=true;
 const managerList=el('managers');managerList.replaceChildren();data.people.forEach((p,i)=>{const label=element('label',''),box=document.createElement('input');box.type='checkbox';box.checked=!!p.manager;box.onchange=()=>{p.manager=box.checked;renderDaily();if(owner!==null)preview()};label.append(box,p.label);managerList.append(label)});
 el('daily-date').replaceChildren(...monthDays().map(d=>new Option(dayText(d),d)));dayIndex=dateIndex(1);if(dayIndex<0)dayIndex=dateIndex(0);if(dayIndex<0)dayIndex=0;el('daily-date').value=dayIndex;
 el('picker').hidden=false;el('status').textContent=title()+' · Osoby w grafiku: '+data.people.length;
 if(Number.isInteger(chosenOwner)&&chosenOwner>=0&&chosenOwner<data.people.length){me.value=String(chosenOwner);me.onchange()}syncVault();touch();
}
function mins(v){const h=Math.floor(v/60),m=v%60;return (h? h+' godz. ':'')+(m?m+' min':h?'':'0 min')}
function time(v){const n=Math.round(v*60);return String(Math.floor(n/60)%24).padStart(2,'0')+':'+String(n%60).padStart(2,'0')+(n>=1440?' (+1)':'')}
function intervals(i,d){const a=[];for(const shiftDay of [d-1,d,d+1]){if(shiftDay<0||shiftDay>=schedule.days)continue;const s=shiftInfo(i,shiftDay);if(s.start!==undefined&&s.end>s.start)a.push([s.start+(shiftDay-d)*24,s.end+(shiftDay-d)*24]);}return a}
function card(label,sub){const div=element('div','');div.className='prism-shift';div.append(element('strong',label),element('small',sub));return div}
function renderDaily(){if(!schedule||owner===null||owner===undefined)return;const d=dayIndex,mine=shiftInfo(owner,d),summary=el('day-summary'),team=el('day-team');summary.replaceChildren();team.replaceChildren();summary.append(card(dayText(d),mine.text));
 el('today').disabled=dateIndex(0)<0;el('tomorrow').disabled=dateIndex(1)<0;
 if(mine.start===undefined||mine.end<=mine.start){team.append(element('p','Brak godzin Twojej zmiany w grafiku na ten dzień.'));return}
 const a=mine.start,b=mine.end;summary.append(element('p','Czas zmiany: '+mins(Math.round((b-a)*60))+' (bez odliczania przerw)'));
 const rows=schedule.people.flatMap((p,i)=>{if(i===owner)return [];return intervals(i,d).map(([x,y])=>({p,x,y,start:Math.max(a,x),end:Math.min(b,y)})).filter(r=>r.end>r.start)}).sort((x,y)=>x.start-y.start||y.end-x.end);
 const mgr=rows.filter(r=>r.p.manager),other=rows.filter(r=>!r.p.manager);
 const roleKnown=schedule.people.some(p=>p.manager);team.append(element('h3','Kierownicy na Twojej zmianie'));
 if(!roleKnown)team.append(element('p','Najpierw oznacz kierowników w ustawieniach grafiku.'));else if(!mgr.length)team.append(element('p','Brak pokrywających się zmian oznaczonych kierowników w dostępnych danych.'));
 let covered=a;for(const r of mgr){if(r.start>covered)break;covered=Math.max(covered,r.end)}if(roleKnown&&mgr.length)team.append(element('p',covered>=b?'Pokrycie całej Twojej zmiany przez oznaczonych kierowników.':'Niepełne pokrycie Twojej zmiany przez oznaczonych kierowników.'));
 function row(r){const div=card(r.p.label,time(r.x<0?r.x+24:r.x)+' – '+time(r.y<0?r.y+24:r.y)+' · razem '+mins(Math.round((r.end-r.start)*60)));const track=element('div',''),bar=element('span','');track.className='prism-overlap';bar.style.left=(r.start-a)/(b-a)*100+'%';bar.style.width=(r.end-r.start)/(b-a)*100+'%';track.append(bar);div.append(track);return div}
 mgr.forEach(r=>team.append(row(r)));team.append(element('h3','Z kim pracujesz?'));if(!other.length)team.append(element('p','Brak pokrywających się zmian pozostałych osób.'));other.forEach(r=>team.append(row(r)));
 if((d===0&&a<12)||(d===schedule.days-1&&b>24))team.append(element('small','Na granicy miesiąca poprzedni lub kolejny grafik może zawierać dodatkowe zmiany.'));
}
function setDay(d){if(d<0||!schedule)return;dayIndex=d;el('daily-date').value=d;renderDaily()}
el('today').onclick=()=>setDay(dateIndex(0));el('tomorrow').onclick=()=>setDay(dateIndex(1));el('daily-date').onchange=()=>setDay(Number(el('daily-date').value));
const bytesTo64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s)},from64=s=>Uint8Array.from(atob(s),x=>x.charCodeAt(0));
async function keyFor(pass,salt){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(pass),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations,hash:'SHA-256'},key,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
function vaultStatus(t){el('vault-status').textContent=t}
el('vault-save').onclick=async()=>{if(vaultBusy||!schedule||owner===null)return;const pass=el('vault-pass').value;el('vault-pass').value='';if(pass.length<14){vaultStatus('Użyj silnego, unikalnego hasła (min. 14 znaków).');return}if(hasVault()&&!confirm('Zastąpić poprzedni zaszyfrowany grafik?'))return;vaultBusy=true;const e=epoch;try{const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),plain=new TextEncoder().encode(JSON.stringify({schedule,owner}));const key=await keyFor(pass,salt);const cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,plain));plain.fill(0);if(e!==epoch)return;localStorage.setItem(vaultKey,JSON.stringify({v:1,salt:bytesTo64(salt),iv:bytesTo64(iv),cipher:bytesTo64(cipher)}));syncVault();vaultStatus('Zapisano szyfrowany grafik na tym urządzeniu.')}catch{vaultStatus('Nie udało się zapisać grafiku. Sprawdź pamięć i bezpieczne połączenie.')}finally{vaultBusy=false}};
el('vault-open').onclick=async()=>{if(vaultBusy)return;const pass=el('vault-pass').value;el('vault-pass').value='';vaultBusy=true;const e=epoch;try{const v=JSON.parse(localStorage.getItem(vaultKey));if(v.v!==1)throw Error();const key=await keyFor(pass,from64(v.salt)),plain=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:from64(v.iv)},key,from64(v.cipher))),payload=JSON.parse(new TextDecoder().decode(plain));plain.fill(0);if(e!==epoch)return;install(payload.schedule,payload.owner);vaultStatus('Odblokowano lokalny grafik.')}catch{vaultStatus('Nie udało się odblokować. Sprawdź hasło i zapis.')}finally{vaultBusy=false}};
function lock(){++epoch;++revision;clearTimeout(lockTimer);schedule=null;owner=null;selected.clear();for(const id of ['picker','preview','daily'])el(id).hidden=true;for(const id of ['me','others','managers','sheet','day-summary','day-team','daily-date','period'])el(id).replaceChildren();el('file').value='';el('status').textContent='';el('month').textContent='';syncVault();vaultStatus('Zablokowano.')}
el('vault-lock').onclick=lock;el('vault-delete').onclick=()=>{if(confirm('Usunąć zaszyfrowany grafik z tego urządzenia?')){try{localStorage.removeItem(vaultKey);lock();vaultStatus('Usunięto zapis lokalny.')}catch{vaultStatus('Nie można usunąć zapisu.')}}};
function touch(){if(!schedule)return;clearTimeout(lockTimer);lockTimer=setTimeout(lock,5*60*1000)}
for(const event of ['pointerdown','keydown','touchstart'])document.addEventListener(event,touch,{passive:true});
let hiddenAt=0;document.addEventListener('visibilitychange',()=>{if(document.hidden)hiddenAt=Date.now();else if(schedule&&hiddenAt&&Date.now()-hiddenAt>=5*60*1000)lock();});
addEventListener('pagehide',()=>{if(schedule)lock()});syncVault();

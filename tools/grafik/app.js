import {getDocument,GlobalWorkerOptions} from './vendor/pdf.min.mjs';
import {readPage} from './parser.js';
GlobalWorkerOptions.workerSrc=new URL('./vendor/pdf.worker.min.mjs',import.meta.url).href;
const el=id=>document.getElementById(id);
const element=(tag,text)=>Object.assign(document.createElement(tag),{textContent:text});
let schedule, owner, selected=new Set(), revision=0;
const dayDate=i=>new Date(schedule.year,schedule.month-1,i+1,12);
const dayText=i=>dayDate(i).toLocaleDateString('pl-PL',{weekday:'short',day:'2-digit',month:'2-digit'});
const fullDay=i=>dayDate(i).toLocaleDateString('pl-PL',{weekday:'long',day:'numeric',month:'long'});
const title=()=>dayDate(0).toLocaleDateString('pl-PL',{year:'numeric',month:'long'});
const chosen=()=>[owner,...[...selected].filter(i=>i!==owner).sort((a,b)=>a-b)];
el('file').onchange=async()=>{
  const version=++revision,file=el('file').files[0];
  schedule=null;selected.clear();for(const id of ['picker','preview','daily','viewbar','print-panel'])el(id).hidden=true;owner=null;el('vault-save').hidden=true;
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
function filterCount(){
 el('selection-count').textContent=owner===null?'Wybierz siebie':chosen().length+' / '+schedule.people.length;
}
function filterSearch(){
 const q=el('people-search').value.trim().toLocaleLowerCase('pl');let shown=0;
 for(const label of el('others').children){const visible=label.dataset.name.includes(q);label.hidden=!visible;if(visible)shown++}
 el('search-empty').hidden=shown>0||!q;
}
function renderPeople(){
 const box=el('others');box.replaceChildren();
 schedule.people.forEach((p,i)=>{
 if(i===owner)return;
 const label=element('label',''),input=document.createElement('input');input.type='checkbox';input.checked=selected.has(i);
 label.dataset.name=p.label.toLocaleLowerCase('pl');
 input.addEventListener('change',()=>{if(input.checked)selected.add(i);else selected.delete(i);filterCount();refreshView()});
 label.append(input,element('span',p.label+(p.manager?' · K':'')));box.append(label);
 });
 filterCount();filterSearch();
}
function selectPeople(ids){selected=new Set(ids.filter(i=>i!==owner));renderPeople();refreshView()}
el('people-search').oninput=filterSearch;
el('select-all').onclick=()=>selectPeople(schedule.people.map((_,i)=>i));
el('select-none').onclick=()=>selectPeople([]);
el('select-managers').onclick=()=>selectPeople(schedule.people.flatMap((p,i)=>p.manager?[i]:[]));
el('apply-people').onclick=()=>{if(owner!==null){el('people-settings').open=false;el('viewbar').scrollIntoView({block:'start',behavior:'smooth'})}};
el('me').onchange=()=>{
 const val=el('me').value,prior=owner;owner=val===''?null:Number(val);
 if(owner!==null){if(prior===null)selected=new Set(schedule.people.map((_,i)=>i).filter(i=>i!==owner));else{selected.add(prior);selected.delete(owner)}}
 el('filter-picker').hidden=owner===null;
 if(owner!==null)renderPeople();else filterCount();
 el('vault-save').hidden=owner===null;refreshView();
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
    const doc=new window.jspdf.jsPDF({unit:'mm',format:'a4',orientation:'landscape',compress:true});
    doc.addFileToVFS('sans.ttf',typeface);doc.addFont('sans.ttf','Grafik','normal');doc.setFont('Grafik');
    const mode=el('export-mode').value;exportPages(doc,mode);
    doc.save('grafik-bw-'+mode+'-'+schedule.year+'-'+String(schedule.month).padStart(2,'0')+'.pdf');el('print-status').textContent='Wygenerowano PDF: '+doc.getNumberOfPages()+' str.';
  }catch{el('print-status').textContent='Nie udało się wygenerować PDF-u. Spróbuj ponownie.'}finally{button.disabled=false}
};
let view='day',period=0;
const weekStart=d=>d-((dayDate(d).getDay()+6)%7);
const weekDays=d=>monthDays().filter(x=>x>=weekStart(d)&&x<weekStart(d)+7);
const weeks=()=>{const out=[];for(const d of monthDays())if(d===0||dayDate(d).getDay()===1)out.push(d);return out};
function refreshView(){const ready=!!schedule&&Number.isInteger(owner);el('viewbar').hidden=el('print-panel').hidden=!ready;el('daily').hidden=!ready||view!=='day';el('preview').hidden=!ready||view==='day';for(const mode of ['day','grid','mobile','axis'])el(mode).setAttribute('aria-pressed',String(view===mode));if(!ready)return;if(view==='day')renderDaily();else preview()}
const groups=()=>[['Zespół',chosen().filter(i=>!schedule.people[i].manager)],['Kierownicy i zastępcy',chosen().filter(i=>schedule.people[i].manager)]].filter(([,ids])=>ids.length);
function personName(i){
 return schedule.people[i].label+(i===owner?' · Ty':'');
}

function shiftInfo(i,d){
 const s=schedule.people[i].shifts[d]||{text:'Brak wpisu',off:false},m=s.text.match(/^(\d\d?):(\d\d)–(\d\d?):(\d\d)/);
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
  summary.className='mine';summary.append(element('strong',fullDay(d)),badge);card.append(summary);
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
 el('month').textContent=title();
 const select=el('period'),isGrid=view==='grid',isAxis=view==='axis';
 el('period-controls').hidden=!(isGrid||isAxis);el('table-hint').hidden=!isGrid;
 select.replaceChildren();
 if(isGrid){el('period-label').textContent='Tydzień';for(const d of weeks()){const ds=weekDays(d);select.add(new Option(dayText(ds[0])+' – '+dayText(ds.at(-1)),d))}period=weekDays(dayIndex)[0]}
 if(isAxis){el('period-label').textContent='Dzień';for(const d of monthDays())select.add(new Option(fullDay(d),d));period=dayIndex}
 if(isGrid||isAxis){select.value=period;el('period-prev').disabled=select.selectedIndex===0;el('period-next').disabled=select.selectedIndex===select.options.length-1}
 const sheet=el('sheet');sheet.replaceChildren();sheet.scrollLeft=0;sheet.scrollTop=0;
 if(view==='mobile'){mobileMonth(sheet);return}
 if(isGrid){
  const days=weekDays(dayIndex),table=element('table',''),head=table.createTHead().insertRow();
  head.append(element('th','Osoba'));
  for(const d of days){const th=element('th',''),date=dayDate(d);th.scope='col';if(date.getDay()===0||date.getDay()===6)th.className='weekend';const number=element('span',String(d+1).padStart(2,'0'));number.className='day-number';const weekday=element('span',date.toLocaleDateString('pl-PL',{weekday:'short'}));weekday.className='day-weekday';th.append(number,weekday);head.append(th)}
  for(const [group,ids] of groups()){
   const body=table.createTBody(),row=body.insertRow(),label=element('th',group);label.colSpan=days.length+1;row.className='group';row.append(label);
   for(const i of ids){const tr=body.insertRow();if(i===owner)tr.className='mine';const name=element('th',personName(i));name.scope='row';tr.append(name);for(const d of days){const shift=shiftInfo(i,d),badge=element('span',shift.text);badge.className='shift '+shift.kind;tr.insertCell().append(badge)}}
  }sheet.append(table);
 }else{
  const panel=element('div',''),sc=scale(dayIndex),ticks=element('div','');panel.className='timeline';ticks.className='ticks';
  for(const h of sc.ticks){const label=element('span',tick(h));label.style.left=sc.pos(h)*100+'%';ticks.append(label)}panel.append(ticks);
  for(const [group,ids] of groups()){
   const header=element('h3',group);header.className='sectionname';panel.append(header);
   for(const i of ids){const shift=shiftInfo(i,dayIndex),row=element('div',''),name=element('strong',personName(i)),track=element('div','');row.className=i===owner?'lane mine':'lane';track.className='track';track.style.setProperty('--step',400/(sc.end-sc.start)+'%');name.append(element('small',shift.text));
    if(shift.start!==undefined){const bar=element('span','');bar.className='bar '+shift.kind;bar.style.left=sc.pos(shift.start)*100+'%';bar.style.width=(sc.pos(shift.end)-sc.pos(shift.start))*100+'%';track.append(bar)}row.append(name,track);panel.append(row);
   }
  }sheet.append(panel);
 }
}
for(const mode of ['day','grid','mobile','axis'])el(mode).onclick=()=>{view=mode;refreshView()};
el('period').onchange=()=>setDay(Number(el('period').value));
function movePeriod(n){const sel=el('period'),i=sel.selectedIndex+n;if(i>=0&&i<sel.options.length)setDay(Number(sel.options[i].value))}
el('period-prev').onclick=()=>movePeriod(-1);el('period-next').onclick=()=>movePeriod(1);
function exportPages(doc,mode){
 const grid=mode==='month'||mode==='week',width=doc.internal.pageSize.getWidth(),height=doc.internal.pageSize.getHeight(),margin=10,right=width-margin,bottom=height-13;
 const blocks=grid?(mode==='week'?[weekDays(dayIndex)]:weeks().map(weekDays)):(mode==='day'?[[dayIndex]]:monthDays().map(d=>[d]));
 let pages=0;
 function text(value,x,y,size=9,max=Infinity,align='left'){
  value=String(value);doc.setFontSize(size);doc.setFontSize(size*Math.min(1,max/Math.max(.1,doc.getTextWidth(value))));doc.setTextColor(0);doc.text(value,x,y,{align})
 }
 function lines(value,w,size=9){doc.setFontSize(size);return doc.splitTextToSize(String(value),w)}
 function drawLines(values,x,y,size=9){values.forEach((value,k)=>text(value,x,y+k*4,size))}
 function line(x1,y1,x2,y2,weight=.18){doc.setDrawColor(0);doc.setLineWidth(weight);doc.line(x1,y1,x2,y2)}
 function header(label){
  if(pages++)doc.addPage();doc.setTextColor(0);
  text('GRAFIK / '+(grid?'Tabela tygodniowa':'Oś czasu'),margin,14,17);text(title()+'  ·  '+label,margin,21,11);
  text('R rano  /  P popołudnie  /  N noc  /  W wolne  /  (+1) kolejny dzień',margin,28,8.5);
  text('TY = Twój wiersz (grubsza ramka). Wybrane osoby: '+chosen().length,margin,33,8.5);
  text(String(pages),right,height-6,9,Infinity,'right');text('NOBODY. / GRAFIK',margin,height-6,8);
 }
 const kinds={morning:'R',late:'P',night:'N',off:'W',other:'—'};
 for(const days of blocks){
  const sc=grid?null:scale(days[0]),nameEnd=grid?57:77,span=right-nameEnd,cw=span/days.length;
  function startPage(){
   header(grid?dayText(days[0])+' – '+dayText(days.at(-1)):fullDay(days[0]));
   text('OSOBA',margin+2,43,9);
   if(grid){days.forEach((d,j)=>{const x=nameEnd+j*cw;const date=dayDate(d);text(String(d+1).padStart(2,'0'),x+cw/2,40,12,Infinity,'center');text(date.toLocaleDateString('pl-PL',{weekday:'short'}),x+cw/2,45,9,Infinity,'center');if([0,6].includes(date.getDay()))line(x+2,47,x+cw-2,47,.65)})}
   else sc.ticks.forEach(h=>text(tick(h),nameEnd+sc.pos(h)*span,44,8,Infinity,'center'));
   line(margin,49,right,49,.35);return 50;
  }
  let y=startPage();
  function groupLabel(label){doc.setFillColor(232);doc.rect(margin,y,right-margin,7,'F');text(label,margin+2,y+5,9);line(margin,y+7,right,y+7);y+=7}
  for(const [group,ids] of groups()){
   if(y+22>bottom)y=startPage();groupLabel(group);
   for(const i of ids){
    const shiftLines=grid?days.map(d=>{const sh=shiftInfo(i,d);return lines(kinds[sh.kind]+'  '+sh.text,cw-4,9)}):[];
    const sh=grid?null:shiftInfo(i,days[0]);
    const name=lines((i===owner?'TY · ':'')+schedule.people[i].label,nameEnd-margin-5,9);
    const notes=grid?[]:lines(kinds[sh.kind]+'  '+sh.text,nameEnd-margin-5,8);
    const rh=grid?Math.max(14,Math.max(name.length,...shiftLines.map(a=>a.length))*4+5):Math.max(14,(name.length+notes.length)*4+5);
    if(y+rh>bottom){y=startPage();groupLabel(group)}
    if(i===owner){doc.setDrawColor(0);doc.setLineWidth(.6);doc.rect(margin,y,right-margin,rh);doc.setLineWidth(.18)}
    drawLines(name,margin+2,y+4.5,9);
    line(nameEnd,y,nameEnd,y+rh);
    if(grid){
     days.forEach((d,j)=>{const x=nameEnd+j*cw;drawLines(shiftLines[j],x+2,y+4.5,9);line(x+cw,y,x+cw,y+rh)});
    }else{
     drawLines(notes,margin+2,y+4.5+name.length*4,8);
     sc.ticks.forEach(h=>line(nameEnd+span*sc.pos(h),y,nameEnd+span*sc.pos(h),y+rh,.12));
     if(sh.start!==undefined){const x=nameEnd+span*sc.pos(sh.start),w=(sc.pos(sh.end)-sc.pos(sh.start))*span;
      doc.setDrawColor(0);doc.setLineWidth(.35);doc.setFillColor(sh.kind==='morning'?255:sh.kind==='late'?210:140);doc.rect(x,y+3,w,7,'FD');
      if(w>7)text(kinds[sh.kind],x+w/2,y+8,9,Infinity,'center');
     }
    }
    line(margin,y+rh,right,y+rh,i===owner?.6:.18);y+=rh;
   }
  }
 }
}

const vaultKey='nobody-prism-roster-v1', iterations=600000;
let dayIndex=0, lockTimer, vaultBusy=false, epoch=0;
function hasVault(){try{return !!localStorage.getItem(vaultKey)}catch{return false}}
function syncVault(){const stored=hasVault();el('vault-indicator').textContent=schedule?'Odblokowany':stored?'Zablokowany':'Brak zapisu';el('vault-open').hidden=!stored||!!schedule;el('vault-delete').hidden=!stored;el('vault-lock').hidden=!schedule;el('import-panel').hidden=stored&&!schedule;el('vault-save').hidden=owner===null||owner===undefined;el('vault-pass').value=''}
function dateIndex(offset){const d=new Date();d.setDate(d.getDate()+offset);return d.getFullYear()===schedule.year&&d.getMonth()+1===schedule.month?d.getDate()-1:-1}
function install(data,chosenOwner=null,savedSelection=null){schedule=data;owner=null;selected.clear();period=0;view='day';el('people-settings').open=true;el('people-search').value='';el('manager-details').open=false;
 const me=el('me');me.replaceChildren(new Option('Wybierz siebie',''));data.people.forEach((p,i)=>me.add(new Option(p.label,i)));el('others').replaceChildren();el('filter-picker').hidden=true;
 const managerList=el('managers');managerList.replaceChildren();data.people.forEach((p,i)=>{const label=element('label',''),box=document.createElement('input');box.type='checkbox';box.checked=!!p.manager;box.onchange=()=>{p.manager=box.checked;if(owner!==null){renderPeople();refreshView()}};label.append(box,p.label);managerList.append(label)});
 el('daily-date').replaceChildren(...monthDays().map(d=>new Option(fullDay(d),d)));dayIndex=dateIndex(0);if(dayIndex<0)dayIndex=dateIndex(1);if(dayIndex<0)dayIndex=0;el('daily-date').value=dayIndex;
 el('picker').hidden=false;el('status').textContent=title()+' · Osoby w grafiku: '+data.people.length;
 if(Number.isInteger(chosenOwner)&&chosenOwner>=0&&chosenOwner<data.people.length){me.value=String(chosenOwner);me.onchange();if(Array.isArray(savedSelection))selectPeople(savedSelection.filter(i=>Number.isInteger(i)&&i>=0&&i<data.people.length));el('people-settings').open=false}else refreshView();syncVault();if(schedule)el('vault-details').open=false;touch();
}
function mins(v){const h=Math.floor(v/60),m=v%60;return (h? h+' godz. ':'')+(m?m+' min':h?'':'0 min')}
function time(v){const n=Math.round(v*60);return String(Math.floor(n/60)%24).padStart(2,'0')+':'+String(n%60).padStart(2,'0')+(n>=1440?' (+1)':'')}
function intervals(i,d){const a=[];for(const shiftDay of [d-1,d,d+1]){if(shiftDay<0||shiftDay>=schedule.days)continue;const s=shiftInfo(i,shiftDay);if(s.start!==undefined&&s.end>s.start)a.push([s.start+(shiftDay-d)*24,s.end+(shiftDay-d)*24]);}return a}
function card(label,sub){const div=element('div','');div.className='prism-shift';div.append(element('strong',label),element('small',sub));return div}
function renderDaily(){if(!schedule||owner===null||owner===undefined)return;const d=dayIndex,mine=shiftInfo(owner,d),summary=el('day-summary'),team=el('day-team');summary.replaceChildren();team.replaceChildren();const main=element('div','');main.className='day-main';const date=element('div',fullDay(d));date.className='day-date';const shift=element('strong',mine.text);shift.className='day-time';main.append(date,shift);summary.append(main);el('day-prev').disabled=d===0;el('day-next').disabled=d===schedule.days-1;
 el('today').disabled=dateIndex(0)<0;el('tomorrow').disabled=dateIndex(1)<0;
 if(mine.start===undefined||mine.end<=mine.start){team.append(element('p','Brak godzin Twojej zmiany w grafiku na ten dzień.'));return}
 const a=mine.start,b=mine.end;const duration=element('span','Czas zmiany: '+mins(Math.round((b-a)*60))+' (bez odliczania przerw)');duration.className='hint';main.append(duration);
 const rows=chosen().flatMap(i=>{if(i===owner)return [];const p=schedule.people[i];return intervals(i,d).map(([x,y])=>({p,x,y,start:Math.max(a,x),end:Math.min(b,y)})).filter(r=>r.end>r.start)}).sort((x,y)=>x.start-y.start||y.end-x.end);
 const mgr=rows.filter(r=>r.p.manager),other=rows.filter(r=>!r.p.manager);
 const roleKnown=schedule.people.some(p=>p.manager);team.append(element('h3','Wybrani kierownicy na Twojej zmianie'));
 if(!roleKnown)team.append(element('p','Najpierw oznacz kierowników w ustawieniach grafiku.'));else if(!mgr.length)team.append(element('p','Brak pokrywających się zmian wybranych kierowników.'));
 let covered=a;for(const r of mgr){if(r.start>covered)break;covered=Math.max(covered,r.end)}if(roleKnown&&mgr.length)team.append(element('p',covered>=b?'Pokrycie całej Twojej zmiany przez wybranych kierowników.':'Niepełne pokrycie Twojej zmiany przez wybranych kierowników.'));
 function row(r){const div=card(r.p.label,time(r.x<0?r.x+24:r.x)+' – '+time(r.y<0?r.y+24:r.y));const overlap=element('span','Razem: '+mins(Math.round((r.end-r.start)*60)));overlap.className='overlap-text';div.append(overlap);const track=element('div',''),bar=element('span','');track.className='prism-overlap';bar.style.left=(r.start-a)/(b-a)*100+'%';bar.style.width=(r.end-r.start)/(b-a)*100+'%';track.append(bar);div.append(track);return div}
 mgr.forEach(r=>team.append(row(r)));team.append(element('h3','Z kim pracujesz?'));if(!other.length)team.append(element('p','Brak pokrywających się zmian wybranych osób.'));other.forEach(r=>team.append(row(r)));
 if((d===0&&a<12)||(d===schedule.days-1&&b>24))team.append(element('small','Na granicy miesiąca poprzedni lub kolejny grafik może zawierać dodatkowe zmiany.'));
}
function setDay(d){if(!schedule||!Number.isInteger(d)||d<0||d>=schedule.days)return;dayIndex=d;el('daily-date').value=d;refreshView()}
el('day-prev').onclick=()=>setDay(dayIndex-1);el('day-next').onclick=()=>setDay(dayIndex+1);
el('today').onclick=()=>setDay(dateIndex(0));el('tomorrow').onclick=()=>setDay(dateIndex(1));el('daily-date').onchange=()=>setDay(Number(el('daily-date').value));
const bytesTo64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s)},from64=s=>Uint8Array.from(atob(s),x=>x.charCodeAt(0));
async function keyFor(pass,salt){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(pass),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations,hash:'SHA-256'},key,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
function vaultStatus(t){el('vault-status').textContent=t}
el('vault-save').onclick=async()=>{if(vaultBusy||!schedule||owner===null)return;const pass=el('vault-pass').value;el('vault-pass').value='';if(pass.length<14){vaultStatus('Użyj silnego, unikalnego hasła (min. 14 znaków).');return}if(hasVault()&&!confirm('Zastąpić poprzedni zaszyfrowany grafik?'))return;vaultBusy=true;const e=epoch;try{const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),plain=new TextEncoder().encode(JSON.stringify({schedule,owner,selected:[...selected]}));const key=await keyFor(pass,salt);const cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,plain));plain.fill(0);if(e!==epoch)return;localStorage.setItem(vaultKey,JSON.stringify({v:1,salt:bytesTo64(salt),iv:bytesTo64(iv),cipher:bytesTo64(cipher)}));syncVault();vaultStatus('Zapisano szyfrowany grafik na tym urządzeniu.')}catch{vaultStatus('Nie udało się zapisać grafiku. Sprawdź pamięć i bezpieczne połączenie.')}finally{vaultBusy=false}};
el('vault-open').onclick=async()=>{if(vaultBusy)return;const pass=el('vault-pass').value;el('vault-pass').value='';vaultBusy=true;const e=epoch;try{const v=JSON.parse(localStorage.getItem(vaultKey));if(v.v!==1)throw Error();const key=await keyFor(pass,from64(v.salt)),plain=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:from64(v.iv)},key,from64(v.cipher))),payload=JSON.parse(new TextDecoder().decode(plain));plain.fill(0);if(e!==epoch)return;install(payload.schedule,payload.owner,payload.selected);vaultStatus('Odblokowano lokalny grafik.')}catch{vaultStatus('Nie udało się odblokować. Sprawdź hasło i zapis.')}finally{vaultBusy=false}};
function lock(){++epoch;++revision;clearTimeout(lockTimer);schedule=null;owner=null;selected.clear();for(const id of ['picker','preview','daily','viewbar','print-panel'])el(id).hidden=true;for(const id of ['me','others','managers','sheet','day-summary','day-team','daily-date','period'])el(id).replaceChildren();el('file').value='';el('status').textContent='';el('month').textContent='';el('people-search').value='';el('selection-count').textContent='';el('print-status').textContent='';el('search-empty').hidden=true;el('vault-details').open=true;syncVault();vaultStatus('Zablokowano.')}
el('vault-lock').onclick=lock;el('vault-delete').onclick=()=>{if(confirm('Usunąć zaszyfrowany grafik z tego urządzenia?')){try{localStorage.removeItem(vaultKey);lock();vaultStatus('Usunięto zapis lokalny.')}catch{vaultStatus('Nie można usunąć zapisu.')}}};
function touch(){if(!schedule)return;clearTimeout(lockTimer);lockTimer=setTimeout(lock,5*60*1000)}
for(const event of ['pointerdown','keydown','touchstart'])document.addEventListener(event,touch,{passive:true});
let hiddenAt=0;document.addEventListener('visibilitychange',()=>{if(document.hidden)hiddenAt=Date.now();else if(schedule&&hiddenAt&&Date.now()-hiddenAt>=5*60*1000)lock();});
addEventListener('pagehide',()=>{if(schedule)lock()});syncVault();

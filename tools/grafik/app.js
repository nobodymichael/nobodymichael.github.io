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
  schedule=null;selected.clear();el('picker').hidden=el('preview').hidden=true;
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
    const managers=new Set(['8799bd50a8e7f34b7a9b78ad9f227f07382faedeffb2a5a817152b985bd07058', '89cceb271dfb0da3b63eb693322ed4c36efff0a3701230148f9f08ca786131e7', 'a0336462ea67466ebd71214cdb63d28467050462e18bda12e887bb2ddd4deaee']);
    await Promise.all(data.people.map(async person=>{
      const words=person.name.toLocaleUpperCase('pl').trim().split(/\s+/).sort().join(' ');
      const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(words)));
      person.manager=managers.has(Array.from(digest,b=>b.toString(16).padStart(2,'0')).join(''));
    }));
    if(version!==revision)return;
    schedule=data;owner=null;period=0;
    const me=el('me');me.replaceChildren(new Option('Wybierz siebie',''));
    data.people.forEach((p,i)=>me.add(new Option(p.name,i)));
    el('others').replaceChildren();el('others').parentElement.hidden=true;
    el('picker').hidden=false;el('status').textContent=title()+' · Osoby w grafiku: '+data.people.length;
  }catch(e){if(version===revision)el('status').textContent='Nie udało się odczytać grafiku. '+(e.name==='PasswordException'?'Plik wymaga hasła.':'Wybierz PDF z tabelą „Grafik planowany za okres” i zaznaczalnym tekstem.')}
  finally{if(pdf)await pdf.destroy()}
};
el('me').onchange=()=>{
  const val=el('me').value;owner=val===''?null:Number(val);
  el('others').replaceChildren();el('others').parentElement.hidden=owner===null;
  el('preview').hidden=owner===null;
  if(owner===null)return;
  selected.delete(owner);
  schedule.people.forEach((p,i)=>{
    if(i===owner)return;
    const label=element('label',''),box=document.createElement('input');box.type='checkbox';box.checked=selected.has(i);
    box.onchange=()=>{if(box.checked)selected.add(i);else selected.delete(i);preview()};
    label.append(box,p.name);el('others').append(label);
  });
  preview();
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
 const words=schedule.people[i].name.toLocaleLowerCase('pl').split(/\s+/);
 return [...words.slice(1),words[0]].map(w=>w.replace(/(^|-)(\p{L})/gu,(_,p,c)=>p+c.toLocaleUpperCase('pl'))).join(' ')+(i===owner?' · Ty':'');
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
  summary.append(element('strong',dayText(d)),badge);card.append(summary);
  for(const [name,ids] of groups()){
   card.append(element('h3',name));
   for(const i of ids){
    const row=element('div',''),s=shiftInfo(i,d),time=element('span',s.text);
    time.className='shift '+s.kind;row.className='personline';row.append(element('span',personName(i)),time);card.append(row);
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
   for(const i of ids){const r=body.insertRow();r.append(element('th',personName(i)));
    for(const d of days){const s=shiftInfo(i,d),badge=element('span',s.text);badge.className='shift '+s.kind;r.insertCell().append(badge)}}
  }sheet.append(table);
 }else{
  const panel=element('div',''),sc=scale(period),ticks=element('div','');panel.className='timeline';ticks.className='ticks';
  for(const h of sc.ticks){const label=element('span',tick(h));label.style.left=sc.pos(h)*100+'%';ticks.append(label)}panel.append(ticks);
  for(const [group,ids] of groups()){
   const header=element('h3',group);header.className='sectionname';panel.append(header);
   for(const i of ids){const s=shiftInfo(i,period),row=element('div',''),name=element('strong',personName(i)),track=element('div','');
    row.className='lane';track.className='track';track.style.setProperty('--step',400/(sc.end-sc.start)+'%');name.append(element('small',s.text));
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
    y+=rh;
   }
  }
 }
}

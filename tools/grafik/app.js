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
    schedule=data;owner=null;
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
function preview(){
  el('month').textContent=title();const ids=chosen(),table=document.querySelector('table');
  table.replaceChildren();const head=table.createTHead().insertRow();
  ['Dzień',...ids.map(i=>schedule.people[i].name)].forEach(s=>head.append(element('th',s)));
  const body=table.createTBody();
  for(let d=0;d<schedule.days;d++){
    const row=body.insertRow();row.append(element('th',dayText(d)));
    for(const i of ids){const shift=schedule.people[i].shifts[d],td=row.insertCell();td.textContent=shift.text;td.classList.toggle('off',shift.off)}
  }
}
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
    const doc=new window.jspdf.jsPDF({unit:'mm',format:'a4',compress:true});
    doc.addFileToVFS('sans.ttf',typeface);doc.addFont('sans.ttf','Grafik','normal');doc.setFont('Grafik');
    const companions=chosen().slice(1),pages=Math.max(1,Math.ceil(companions.length/3));
    for(let page=0;page<pages;page++){
      if(page)doc.addPage();
      const ids=[owner,...companions.slice(page*3,page*3+3)],cw=160/ids.length;
      doc.setTextColor('#345f55');doc.setFontSize(9);doc.text('GRAFIK PRACY',12,15);
      doc.setFontSize(22);doc.setTextColor('#172d2a');doc.text(title(),12,26);
      doc.setFontSize(9);doc.text((page+1)+' / '+pages,197,24,{align:'right'});
      doc.setFillColor('#21483e');doc.roundedRect(12,31,186,13,2,2,'F');
      doc.setTextColor('#ffffff');doc.text('Dzień',15,39);
      ids.forEach((id,j)=>{doc.setFontSize(8);doc.text(doc.splitTextToSize(schedule.people[id].name,cw-4),40+j*cw,37)});
      for(let d=0;d<schedule.days;d++){
        const y=44+d*7.55,weekend=[0,6].includes(dayDate(d).getDay());
        doc.setFillColor(weekend?'#e6eeeb':d%2?'#f5f7f6':'#ffffff');doc.rect(12,y,186,7.55,'F');
        doc.setFontSize(9);doc.setTextColor('#253c36');doc.text(dayText(d),15,y+5);
        ids.forEach((id,j)=>{
          const shift=schedule.people[id].shifts[d];doc.setTextColor(shift.off?'#63756e':j?'#202e2a':'#085742');
          doc.setFontSize(9);const width=doc.getTextWidth(shift.text);if(width>cw-4)doc.setFontSize(9*(cw-4)/width);
          doc.text(shift.text,40+j*cw,y+5);
        });
      }
      doc.setFontSize(8);doc.setTextColor('#546861');doc.text('(+1)  koniec zmiany następnego dnia',12,286);
    }
    doc.save('grafik-'+schedule.year+'-'+String(schedule.month).padStart(2,'0')+'.pdf');
  }catch{el('status').textContent='Nie udało się wygenerować PDF-u. Spróbuj ponownie.'}finally{button.disabled=false}
};

'use strict';
const $ = id => document.getElementById(id);
let opener = null;
document.querySelectorAll('[data-open=console]').forEach(button=>button.addEventListener('click',()=>{
  const dialog=$(button.dataset.open);if(dialog.open)return;opener=button;
  if(dialog.id==='console'){$('command').value='';$('command-status').textContent='awaiting input_';}
  dialog.showModal();if(dialog.id==='console')$('command').focus();
}));
document.querySelectorAll('dialog').forEach(dialog=>{
  dialog.querySelector('[data-close]')?.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
  dialog.addEventListener('close',()=>{opener?.focus();opener=null;});
});
$('command-form').addEventListener('submit',event=>{
  event.preventDefault();const command=$('command').value.trim().toLowerCase();
  const routes=new Map([['grafik','tools/grafik/'],['qrgen','qrgen/'],['exif','exif/'],['pulse','pulse/'],['lebercut','/lebercut/']]);
  if(routes.has(command)){if(window.prismLaunch)window.prismLaunch(routes.get(command),command);else location.assign(routes.get(command));}
  else {const replies=new Map([['wallet','MODULE OFFLINE // not in repository'],['sudo','Permission denied. Nice try.'],['whoami','nobody. just like the rest of us.'],['ping','pong // 0 ms (mentally)'],['42','The answer to life, the universe, and everything.'],['touch grass','Outdoor mode unlocked. Close the browser.'],['matrix','Wake up, nobody.'],['pizza','ERROR 418 // pizza not found.'],['help','Some things are better discovered than documented.'],['hello','Hello, nobody.'],['clear','awaiting input_']]);$('command-status').textContent=replies.get(command)||'ERR // unknown command';if(command==='clear')$('command').value='';if(command==='matrix'){const d=$('console');d.classList.remove('terminal-pulse');void d.offsetWidth;d.classList.add('terminal-pulse')}}
});
$('year').textContent=String(new Date().getFullYear());

// PRISM launch overlay; navigation only after an ordinary same-tab activation.
(()=>{const apps={qrgen:['QRGEN','qr-icon.svg','40,201,255','GENEROWANIE KODÓW'],exif:['EXIF','exif-icon.svg','175,99,255','METADATA ANALYZER'],lebercut:['LEBERCUT','leber-icon.svg','75,122,255','OPTYMALIZACJA CIĘCIA'],pulse:['PULSE','pulse-icon.svg','38,220,174','MARKET OVERVIEW'],grafik:['GRAFIK','calendar-icon.svg','255,185,83','HARMONOGRAM']};let pending=false;window.prismLaunch=(url,kind)=>{if(pending)return;const a=apps[kind];if(!a||matchMedia('(prefers-reduced-motion: reduce)').matches){location.assign(url);return}pending=true;const el=document.createElement('div');el.className='prism-launch';el.dataset.kind=kind;el.style.setProperty('--launch',a[2]);el.setAttribute('role','status');const img=new Image();img.src=new URL('assets/'+a[1],location.href).href;img.alt='';const name=document.createElement('strong');name.textContent=a[0];const sub=document.createElement('small');sub.textContent=a[3];el.append(img,name,sub);document.body.append(el);setTimeout(()=>location.assign(url),900)};document.querySelectorAll('.tool-widget').forEach(a=>a.addEventListener('click',e=>{if(e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.defaultPrevented)return;const kind=a.getAttribute('href').split('/').filter(Boolean).pop();if(apps[kind]){e.preventDefault();window.prismLaunch(a.href,kind)}}));addEventListener('pageshow',()=>{document.querySelector('.prism-launch')?.remove();pending=false})})();

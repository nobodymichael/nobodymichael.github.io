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
  if(routes.has(command))location.assign(routes.get(command));
  else {const replies=new Map([['wallet','MODULE OFFLINE // not in repository'],['sudo','Permission denied. Nice try.'],['whoami','nobody. just like the rest of us.'],['ping','pong // 0 ms (mentally)'],['42','The answer to life, the universe, and everything.'],['touch grass','Outdoor mode unlocked. Close the browser.'],['matrix','Wake up, nobody.'],['pizza','ERROR 418 // pizza not found.'],['help','Some things are better discovered than documented.'],['hello','Hello, nobody.'],['clear','awaiting input_']]);$('command-status').textContent=replies.get(command)||'ERR // unknown command';if(command==='clear')$('command').value='';if(command==='matrix'){const d=$('console');d.classList.remove('terminal-pulse');void d.offsetWidth;d.classList.add('terminal-pulse')}}
});
$('year').textContent=String(new Date().getFullYear());

'use strict';
const coins = [
  {id:'BTC',network:'Bitcoin · Native SegWit',address:'bc1qvgam9y07puc29dq5g646dgyc603hqvy06uc36j'},
  {id:'ETH',network:'Ethereum · EVM',address:'0x437E14fd07BbCD3AD923B39a4c7bB89E8ccBD5a7'},
  {id:'SOL',network:'Solana Mainnet',address:'4u6XcbSN6CVGkUAZ6ej9r5SHgvKECQif5RBUU5UDMCpN'},
  {id:'TRX',network:'Tron · TRC-20',address:'TREsDGqxv2vzresMsU3yoDojqzhr1eBkYy'}
];
const $ = id => document.getElementById(id);
let active = coins[0];
let opener = null;
function choose(coin) {
  active = coin;
  $('network').textContent = coin.network;
  $('address').textContent = coin.address;
  $('wallet-qr').src = `assets/${coin.id.toLowerCase()}-qr.svg`;
  $('copy-status').textContent = '';
  $('coins').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed',String(b.dataset.coin === coin.id)));
}
for (const coin of coins) {
  const button = document.createElement('button');
  button.type = 'button';button.dataset.coin = coin.id;button.textContent = coin.id;
  button.addEventListener('click',()=>choose(coin));$('coins').append(button);
}
choose(active);
$('copy').addEventListener('click',async()=>{
  try { await navigator.clipboard.writeText(active.address);$('copy-status').textContent='Skopiowano adres ✓'; }
  catch { $('copy-status').textContent='Nie udało się skopiować. Zaznacz adres ręcznie.'; }
});
document.querySelectorAll('[data-open]').forEach(button=>button.addEventListener('click',()=>{
  const dialog=$(button.dataset.open);if(dialog.open)return;opener=button;
  if(dialog.id==='console'){$('command').value='';$('command-status').textContent='awaiting input_';}
  dialog.showModal();if(dialog.id==='console')$('command').focus();
}));
document.querySelectorAll('dialog').forEach(dialog=>{
  dialog.querySelector('[data-close]').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
  dialog.addEventListener('close',()=>{opener?.focus();opener=null;});
});
$('command-form').addEventListener('submit',event=>{
  event.preventDefault();const command=$('command').value.trim().toLowerCase();
  const routes=new Map([['qrgen','tools/qr.html'],['exif','tools/exif.html']]);
  if(routes.has(command))location.assign(routes.get(command));
  else {const replies=new Map([['wallet','MODULE OFFLINE // not in repository'],['sudo','Permission denied. Nice try.'],['whoami','nobody. just like the rest of us.'],['ping','pong // 0 ms (mentally)'],['42','The answer to life, the universe, and everything.'],['touch grass','Outdoor mode unlocked. Close the browser.'],['matrix','Wake up, nobody.'],['pizza','ERROR 418 // pizza not found.'],['help','Some things are better discovered than documented.'],['hello','Hello, nobody.'],['clear','awaiting input_']]);$('command-status').textContent=replies.get(command)||'ERR // unknown command';if(command==='clear')$('command').value='';if(command==='matrix'){const d=$('console');d.classList.remove('terminal-pulse');void d.offsetWidth;d.classList.add('terminal-pulse')}}
});
$('year').textContent=String(new Date().getFullYear());
if(matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches){
  document.querySelectorAll('.tool-card').forEach(card=>card.addEventListener('pointermove',e=>{
    const r=card.getBoundingClientRect();card.style.setProperty('--mx',`${e.clientX-r.left}px`);card.style.setProperty('--my',`${e.clientY-r.top}px`);
  },{passive:true}));
}

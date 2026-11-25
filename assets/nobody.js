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
  else $('command-status').textContent=command==='wallet'?'MODULE OFFLINE // not in repository':'ERR // unknown command';
});
$('year').textContent=String(new Date().getFullYear());
if(matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches){
  document.querySelectorAll('.tool-card').forEach(card=>card.addEventListener('pointermove',e=>{
    const r=card.getBoundingClientRect();card.style.setProperty('--mx',`${e.clientX-r.left}px`);card.style.setProperty('--my',`${e.clientY-r.top}px`);
  },{passive:true}));
}

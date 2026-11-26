'use strict';(()=>{
let timer;window.carbonNotify=(msg)=>{document.querySelector('.carbon-toast')?.remove();const el=document.createElement('div');el.className='carbon-toast';el.setAttribute('role','status');el.textContent=msg;document.body.append(el);clearTimeout(timer);timer=setTimeout(()=>el.remove(),2900)};const donateButton = document.querySelector('body[data-app=nobody] header [data-open=support]');
if (!donateButton) return;
function drawAddress(canvas, address) {
  const qr = window.NobodyQR(address);
  const size = qr.getModuleCount();
  const quietZone = 4;
  const scale = 8;
  canvas.width = canvas.height = (size + 2 * quietZone) * scale;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000';
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (qr.isDark(row, col)) ctx.fillRect((col + quietZone) * scale, (row + quietZone) * scale, scale, scale);
    }
  }
}
const coins=[['BTC','Bitcoin · Native SegWit','bc1qvgam9y07puc29dq5g646dgyc603hqvy06uc36j'],['ETH','Ethereum · EVM','0x437E14fd07BbCD3AD923B39a4c7bB89E8ccBD5a7'],['SOL','Solana Mainnet','4u6XcbSN6CVGkUAZ6ej9r5SHgvKECQif5RBUU5UDMCpN'],['TRX','Tron · TRC-20','TREsDGqxv2vzresMsU3yoDojqzhr1eBkYy']];const d=document.createElement('dialog');d.className='carbon-dialog';d.setAttribute('aria-label','Wesprzyj projekt');d.innerHTML='<button class="carbon-close" aria-label="Zamknij">×</button><small>SUPPORT / ON-CHAIN</small><h2>Wesprzyj projekt.</h2><p>Wybierz sieć i sprawdź adres przed wysłaniem.</p><div class="carbon-networks"></div><div class="carbon-wallet"><small></small><canvas role="img" aria-label="Kod QR adresu" style="display:block;width:160px;height:160px;margin:10px auto;image-rendering:pixelated"></canvas><code></code></div><button class="carbon-copy">Kopiuj adres</button><p class="carbon-feedback" role="status"></p>';document.body.append(d);let active;function choose(c){active=c;d.querySelector('.carbon-wallet small').textContent=c[1];drawAddress(d.querySelector('canvas'), c[2]);d.querySelector('code').textContent=c[2];d.querySelector('.carbon-feedback').textContent='';d.querySelectorAll('.carbon-networks button').forEach(b=>b.setAttribute('aria-pressed',String(b.textContent===c[0])))}for(const c of coins){const b=document.createElement('button');b.textContent=c[0];b.onclick=()=>choose(c);d.querySelector('.carbon-networks').append(b)}choose(coins[0]);d.querySelector('.carbon-close').onclick=()=>d.close();d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}});d.querySelector('.carbon-copy').onclick=async()=>{try{await navigator.clipboard.writeText(active[2]);d.querySelector('.carbon-feedback').textContent='Skopiowano adres ✓';window.carbonNotify('Adres skopiowany')}catch{d.querySelector('.carbon-feedback').textContent='Zaznacz i skopiuj adres ręcznie.'}};const button = donateButton.cloneNode(true);
button.removeAttribute('data-open');
donateButton.replaceWith(button);
button.addEventListener('click', () => d.showModal());
})();

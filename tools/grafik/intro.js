(()=>{
 const intro=document.querySelector('#intro');
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const matrix=intro.querySelector('.matrix');
 for(let row=0;row<4;row++)for(let col=0;col<5;col++){
  const cell=document.createElement('i');
  cell.style.setProperty('--r',row);cell.style.setProperty('--c',col);
  cell.style.setProperty('--offset',[1,3,0,2][row]);
  cell.style.background=row%2?'#ffd352':'#40a6ff';matrix.append(cell);
 }
 intro.hidden=false;
 const dismiss=()=>{intro.hidden=true;document.querySelector('main').inert=false};
 addEventListener('DOMContentLoaded',()=>{document.querySelector('main').inert=!intro.hidden});
 intro.querySelector('button').onclick=dismiss;
 setTimeout(dismiss,2300);
})();

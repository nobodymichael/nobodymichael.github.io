import * as T from './three.js';
import {buildRoomster} from './vehicle.js';
const $=id=>document.getElementById(id);
try{start()}catch(e){$('play').textContent='Nie można uruchomić WebGL';console.error(e)}
function start(){
 const canvas=$('world'),renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(1.65,devicePixelRatio));const scene=new T.Scene(),camera=new T.PerspectiveCamera(54,1,.12,360);
 const pm=new T.PMREMGenerator(renderer),studio=new T.RoomEnvironment();scene.environment=pm.fromScene(studio,.08).texture;studio.dispose();pm.dispose();
 scene.add(new T.HemisphereLight(0xffecdf,0x9996ac,2));const sun=new T.DirectionalLight(0xffc18a,2.3);sun.position.set(-50,53,-42);scene.add(sun);
 const staticWorld=new T.Group();scene.add(staticWorld);const mats=new Map(),cube=new T.BoxGeometry(1,1,1),obstacles=[];
 function mat(color){if(!mats.has(color))mats.set(color,new T.MeshStandardMaterial({color,roughness:.79}));return mats.get(color)}
 function box(p,x,y,z,w,h,d,color){const o=new T.Mesh(cube,mat(color));o.position.set(x,y,z);o.scale.set(w,h,d);p.add(o);return o}
 function merge(parent){
  // Static surfaces sharing a material can use one draw call.
  parent.updateMatrixWorld(true);const batches=new Map();
  parent.traverse(o=>{if(!o.isMesh||Array.isArray(o.material))return;const g=o.geometry,buf=batches.get(o.material)||{pos:[],norm:[],uv:[]};batches.set(o.material,buf);
   const pos=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,idx=g.index,v=new T.Vector3();
   for(let i=0;i<(idx?idx.count:pos.count);i++){const j=idx?idx.getX(i):i;v.fromBufferAttribute(pos,j).applyMatrix4(o.matrixWorld);buf.pos.push(v.x,v.y,v.z);v.fromBufferAttribute(n,j).transformDirection(o.matrixWorld);buf.norm.push(v.x,v.y,v.z);buf.uv.push(uv?.getX(j)||0,uv?.getY(j)||0)}
  });
  parent.clear();for(const [m,b] of batches){const g=new T.BufferGeometry();for(const [key,arr,dim] of [['position',b.pos,3],['normal',b.norm,3],['uv',b.uv,2]])g.setAttribute(key,new T.Float32BufferAttribute(arr,dim));parent.add(new T.Mesh(g,m))}
 }
 const roads=[-72,-36,0,36,72],scale=36;
 box(staticWorld,0,-.17,0,194,.3,194,0x45434a);
 for(const r of roads)for(let n=-83;n<=83;n+=5){
  if(!roads.some(a=>Math.abs(a-n)<5)){box(staticWorld,r,.008,n,.11,.018,2.2,0xc9bfa9);box(staticWorld,n,.008,r,2.2,.018,.11,0xc9bfa9)}
 }
 let seed=624;function rand(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296}
 function sign(label,bg,x,y,z,w,h,rot=0){
  const c=document.createElement('canvas');c.width=512;c.height=112;const ctx=c.getContext('2d');ctx.fillStyle=bg;ctx.fillRect(0,0,512,112);ctx.fillStyle='#faf0d4';ctx.font='bold 54px sans-serif';ctx.textAlign='center';ctx.fillText(label,256,75,485);
  const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const o=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex,side:T.DoubleSide}));o.position.set(x,y,z);o.rotation.y=rot;staticWorld.add(o);
 }
 const shop=['PIEKARNIA','KINO ŚWIT','CZĘŚCI','FOTO','BAR MLECZNY','POCZTA','MARKET','DWORZEC'];
 function tree(x,z){box(staticWorld,x,1.05,z,.34,2.1,.34,0x675446);const crown=new T.Mesh(new T.SphereGeometry(1,7,5),mat(rand()>.5?0x465a50:0x526850));crown.position.set(x,3,z);crown.scale.set(1.5,2,1.5);staticWorld.add(crown)}
 for(let i=0;i<4;i++)for(let j=0;j<4;j++){
  const x=-54+i*scale,z=-54+j*scale;
  box(staticWorld,x,.075,z,26,.16,26,0xa8a1a0);
  for(const off of [-6.4,6.4]){
   const w=10+rand()*1.4,d=17+rand()*4,h=5+Math.floor(rand()*4)*2.6,cx=x+off;
   box(staticWorld,cx,h/2+.15,z,w,h,d,[0x9c756a,0xc3ad99,0xbaafa5,0x937f78,0xa19d99][Math.floor(rand()*5)]);
   box(staticWorld,cx,h+.17,z,w+.3,.36,d+.3,0x565961);
   obstacles.push({x:cx,z,w:w/2,d:d/2});
   for(let k=0;k<3;k++)for(let y=2.9;y<h;y+=2.65){
    for(const s of [-1,1])box(staticWorld,cx+(k-1)*3,y,z+s*(d/2+.045),1.28,1.32,.09,rand()>.63?0xffcf81:0x4b5861);
   }
   for(let k=-2;k<=2;k++)for(let y=2.9;y<h;y+=2.65)box(staticWorld,cx+Math.sign(off)*(w/2+.035),y,z+k*3.1,.09,1.35,1.4,rand()>.65?0xeab781:0x53616a);
   box(staticWorld,cx,1.22,z+d/2+.07,1.35,2.15,.14,0x39434b);
   if(off<0)sign(shop[(i*3+j)%shop.length],'#334d4c',cx,2.65,z+d/2+.14,5,1);
  }
  tree(x-10,z+11.4);tree(x+10,z-11.4);
  box(staticWorld,x+12.5,2.45,z+12.5,.13,4.9,.13,0x454752);box(staticWorld,x+12.5,4.91,z+13.1,.16,.16,1.3,0x65666a);box(staticWorld,x+12.5,4.84,z+13.7,.46,.13,.7,0xffe3a8);
 }
 for(const x of roads)for(const z of roads)for(let i=-2;i<=2;i++){
  box(staticWorld,x+i*1.15,.014,z+6.1,.55,.026,1.5,0xcfc8b7);
 }
 for(let k=0;k<60;k++){const a=k*Math.PI/30,r=112+rand()*20,h=6+rand()*17;box(staticWorld,Math.sin(a)*r,h/2,Math.cos(a)*r,5+rand()*9,h,8,0x827e87)}
 for(const x of [-61,-50,-42]){
  const o=new T.Mesh(new T.CylinderGeometry(1.15,1.8,34,12),mat(0x975f53));o.position.set(x,17,94);staticWorld.add(o);
  for(const y of [25,30]){const ring=new T.Mesh(new T.CylinderGeometry(1.41,1.43,1.6,12),mat(0xc7b4a6));ring.position.set(x,y,94);staticWorld.add(ring)}
 }
 merge(staticWorld);
 const car=new T.Group();buildRoomster(car);merge(car);scene.add(car);car.position.set(-2,0,-12);
 const person=new T.Group();scene.add(person);
 box(person,0,1.13,0,.50,.62,.28,0x3b6760);box(person,0,1.60,0,.29,.32,.27,0xc69f84);box(person,0,1.79,.01,.31,.11,.31,0x352f31);
 const limbs=[];for(const s of [-1,1]){limbs.push(box(person,s*.14,.47,0,.19,.80,.21,0x344253));box(person,s*.32,1.1,0,.13,.55,.18,0x3b6760)}
 person.position.set(-3.65,0,-11);
 const cars=[];
 for(let i=0;i<4;i++){
  const o=new T.Group();const col=[0xaab6b6,0x744943,0xd2ba91,0x485968][i];box(o,0,.56,0,1.5,.64,3.4,col);box(o,0,1.02,-.1,1.24,.55,1.8,0x4e6065);
  for(const s of [-1,1])for(const t of [-1,1])box(o,s*.71,.28,t*1.07,.25,.51,.49,0x22272a);
  merge(o);scene.add(o);cars.push({o,road:[-72,-36,36,72][i],offset:i*39,speed:(i%2?1:-1)*(4+i*.55)});
 }
 const beacon=new T.Group();scene.add(beacon);const ring=new T.Mesh(new T.TorusGeometry(2.0,.11,8,56),new T.MeshBasicMaterial({color:0x8af4ca}));ring.rotation.x=Math.PI/2;beacon.add(ring);
 const marker=new T.Mesh(new T.BoxGeometry(.46,.46,.46),new T.MeshBasicMaterial({color:0x9bffdb}));beacon.add(marker);
 const destinations=[['Kino Świt',-2,0],['Magazyn huty',-2,36],['Poczta',36,0],['Dworzec',72,-36],['Stacja paliw',-36,-72],['Rynek',0,72]];
 let route=0,collected=false,free=false,paused=true,driving=false,yaw=0,footYaw=0,velocity=0,last=0,clock=0,earned=0,started=false,noticeUntil=0;
 try{earned=Math.max(0,Number(localStorage.getItem('roomster-earnings'))||0)}catch{}$('earn').textContent=earned+' zł';
 const keys=new Set(),held=new Map();
 function note(msg){$('notice').textContent=msg;noticeUntil=clock+2.7}
 function toggleCar(){
  if(paused)return;
  if(driving){if(Math.abs(velocity)>1.5){note('Zatrzymaj auto, żeby wysiąść');return}
   const spots=[[2,0],[-2,0],[0,3],[0,-3]];
   for(const [a,b] of spots){const x=car.position.x+a*Math.cos(yaw)+b*Math.sin(yaw),z=car.position.z-a*Math.sin(yaw)+b*Math.cos(yaw);if(!blocked(x,z,.35)){person.position.set(x,0,z);driving=false;person.visible=true;footYaw=yaw;velocity=0;return}}
   note('Brak miejsca przy drzwiach');
  }else if(person.position.distanceTo(car.position)<3.6){driving=true;person.visible=false;note('Škoda Roomster')}
 }
 function blocked(x,z,r){return Math.abs(x)>84-r||Math.abs(z)>84-r||obstacles.some(b=>Math.abs(x-b.x)<b.w+r&&Math.abs(z-b.z)<b.d+r)}
 function tryMove(obj,dx,dz,r){
  const x=obj.position.x+dx,z=obj.position.z+dz;
  if(blocked(x,z,r)||cars.some(c=>Math.abs(x-c.o.position.x)<.78+r&&Math.abs(z-c.o.position.z)<1.7+r))return false;
  obj.position.x=x;obj.position.z=z;return true;
 }
 function getGoal(){return destinations[(route+(collected?1:0))%destinations.length]}
 function driveJob(){
  if(!driving||free||Math.abs(velocity)>1.2)return;
  const [,x,z]=getGoal();if(Math.hypot(x-car.position.x,z-car.position.z)>3.3)return;
  if(!collected){collected=true;note('Paczka odebrana')}else{earned+=250;try{localStorage.setItem('roomster-earnings',earned)}catch{}$('earn').textContent=earned+' zł';route=(route+2)%destinations.length;collected=false;note('Dostawa ukończona · +250 zł')}
 }
 function traffic(dt){
  for(const c of cars){let next=c.offset+c.speed*dt;const z=((next%164)+164)%164-82;
   const x=c.road+(c.speed>0?-2.45:2.45);
   if(Math.abs(car.position.x-x)<2&&Math.abs(car.position.z-z)<4||person.visible&&Math.abs(person.position.x-x)<1.5&&Math.abs(person.position.z-z)<2.6)continue;
   c.offset=next;c.o.position.set(x,0,z);c.o.rotation.y=c.speed>0?0:Math.PI;
  }
 }
 function update(dt){
  const on=k=>keys.has(k)||[...held.values()].includes(k);
  const steer=Number(on('left'))-Number(on('right')),throttle=Number(on('up'))-Number(on('down'));
  if(driving){
   if(throttle)velocity+=throttle*(throttle*velocity<0?21:8.6)*dt;
   else velocity=Math.sign(velocity)*Math.max(0,Math.abs(velocity)-dt*4);
   velocity=Math.max(-6,Math.min(23,velocity));
   yaw+=steer*dt*Math.sign(velocity)*Math.min(1.65,Math.abs(velocity)*.32);
   if(!tryMove(car,Math.sin(yaw)*velocity*dt,Math.cos(yaw)*velocity*dt,1.14))velocity=0;
   car.rotation.y=yaw+Math.PI/2;
  }else{
   footYaw+=steer*2.7*dt;const walk=throttle*4.5*dt;tryMove(person,Math.sin(footYaw)*walk,Math.cos(footYaw)*walk,.35);
   person.rotation.y=footYaw;limbs.forEach((l,i)=>l.rotation.x=throttle*Math.sin(clock*9+i*Math.PI)*.32);
  }
  traffic(dt);driveJob();
 }
 const minimap=$('map').getContext('2d'),mapPos=v=>100+v*1.08;
 function drawMap(p,a){
  const g=minimap;g.fillStyle='#202b32';g.fillRect(0,0,200,200);g.strokeStyle='#697879';g.lineWidth=7;
  for(const v of roads){g.beginPath();g.moveTo(mapPos(v),9);g.lineTo(mapPos(v),191);g.moveTo(9,mapPos(v));g.lineTo(191,mapPos(v));g.stroke()}
  const dot=(x,z,color,r)=>{g.fillStyle=color;g.beginPath();g.arc(mapPos(x),mapPos(z),r,0,Math.PI*2);g.fill()};
  if(!free){const [,x,z]=getGoal();dot(x,z,'#93f9c6',7)}
  if(!driving)dot(car.position.x,car.position.z,'#f1b576',6);
  g.save();g.translate(mapPos(p.x),mapPos(p.z));g.rotate(-a);g.fillStyle='#fff';g.beginPath();g.moveTo(0,8);g.lineTo(5,-5);g.lineTo(0,-3);g.lineTo(-5,-5);g.closePath();g.fill();g.restore();
 }
 const cameraGoal=new T.Vector3(),focus=new T.Vector3();
 function cameraAt(dt,instant=false){
  const pos=driving?car.position:person.position,angle=driving?yaw:footYaw,dist=driving?8.9:5.2;
  let d=dist;for(let n=1;n<dist;n+=.4){if(blocked(pos.x-Math.sin(angle)*n,pos.z-Math.cos(angle)*n,.15)){d=Math.max(1.1,n-.4);break}}
  cameraGoal.set(pos.x-Math.sin(angle)*d,driving?4.0:2.9,pos.z-Math.cos(angle)*d);camera.position.lerp(cameraGoal,instant?1:1-Math.exp(-dt*6));
  focus.set(pos.x+Math.sin(angle)*2.2,driving?.95:1.1,pos.z+Math.cos(angle)*2.2);camera.lookAt(focus);
 }
 function hud(){
  const p=driving?car.position:person.position,[name,x,z]=getGoal();beacon.visible=!free;beacon.position.set(x,.10,z);marker.position.y=2.6+Math.sin(clock*2)*.24;marker.rotation.y=clock;
  $('objective').textContent=!driving&&!free?'Wsiądź do Roomstera':free?'Swobodna jazda':(collected?'Dostarcz paczkę · ':'Odbierz paczkę · ')+name;
  $('distance').textContent=!driving&&!free?'Auto · '+Math.round(p.distanceTo(car.position))+' m':free?'Zwiedzaj miasto':Math.round(Math.hypot(x-p.x,z-p.z))+' m · zatrzymaj się w znaczniku';
  $('district').textContent=p.z>28?'DZIELNICA HUTNICZA':p.x>22?'DWORZEC':'ŚRÓDMIEŚCIE';
  $('speed').textContent=driving?Math.round(Math.abs(velocity)*3.6):'Pieszo';$('unit').textContent=driving?'km/h':'';
  $('use').hidden=!driving&&p.distanceTo(car.position)>=3.6;$('use').textContent=driving?'Wysiądź · E':'Wsiądź · E';$('gas').textContent=driving?'Gaz':'Idź';$('brake').textContent=driving?'Hamuj':'Cofnij';
  if(clock>noticeUntil)$('notice').textContent='';drawMap(p,driving?yaw:footYaw);
 }
 function release(){keys.clear();held.clear()}
 function menu(){paused=true;release();$('menu').hidden=false;$('play').textContent='Kontynuuj';$('free').textContent=free?'Podejmij zlecenie':'Swobodna jazda'}
 function resume(){started=true;paused=false;$('menu').hidden=true;cameraAt(0,true)}
 $('play').disabled=$('free').disabled=false;$('play').textContent='Rozpocznij zlecenie';$('play').onclick=resume;
 $('free').onclick=()=>{free=!free;resume()};$('pause').onclick=menu;$('use').onclick=toggleCar;
 const mapping={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
 addEventListener('keydown',e=>{if(e.code==='Escape'&&started&&!e.repeat){paused?resume():menu();return}if(paused)return;if(e.code==='KeyE'&&!e.repeat)toggleCar();if(mapping[e.code]){e.preventDefault();keys.add(mapping[e.code])}});
 addEventListener('keyup',e=>keys.delete(mapping[e.code]));
 document.querySelectorAll('[data-key]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);held.set(e.pointerId,b.dataset.key)};b.onlostpointercapture=b.onpointercancel=b.onpointerup=e=>held.delete(e.pointerId)});
 addEventListener('blur',()=>{if(!paused)menu()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&!paused)menu()});
 function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}addEventListener('resize',resize);resize();car.rotation.y=yaw+Math.PI/2;traffic(0);
 camera.position.set(-8,2.8,-6);camera.lookAt(car.position.x,.85,car.position.z);hud();renderer.render(scene,camera);
 renderer.setAnimationLoop(t=>{const elapsed=Math.min(.06,(t-last)/1000);last=t;if(paused)return;clock+=elapsed;
  for(let i=0;i<3;i++)update(elapsed/3);
  cameraAt(elapsed);hud();renderer.render(scene,camera);
 });
}

import {buildRoomster} from './vehicle.js';
import * as T from './three.js';

const $=id=>document.getElementById(id), canvas=document.querySelector('canvas');
try { garage(); } catch(error) { $('loading').hidden=false; $('loading').textContent='Model wymaga obsługi WebGL. Włącz akcelerację grafiki i odśwież stronę.'; console.error(error); }

function garage(){
 const scene=new T.Scene(),car=new T.Group();scene.add(car);
 const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 const camera=new T.PerspectiveCamera(31,1,.05,80),controls=new T.OrbitControls(camera,canvas);
 controls.target.set(0,.75,0);controls.enablePan=false;controls.enableDamping=true;controls.minDistance=3.4;controls.maxDistance=12;controls.maxPolarAngle=Math.PI*.485;
 const studio=new T.RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(studio,.04).texture;studio.dispose();pmrem.dispose();
 scene.add(new T.HemisphereLight(0xffffff,0x858879,1.45));
 const sun=new T.DirectionalLight(0xfff9ed,3.1);sun.position.set(-3,7,4);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
 Object.assign(sun.shadow.camera,{left:-4,right:4,top:4,bottom:-4});sun.shadow.normalBias=.015;scene.add(sun);
 const ground=new T.Mesh(new T.PlaneGeometry(60,60),new T.ShadowMaterial({opacity:.19}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
 const parts=buildRoomster(car),buttons=new Map();let selected=null,dirty=true;controls.addEventListener('change',()=>dirty=true);
 const action=$('action');
 function refresh(){
  dirty=true;
  for(const [item,b] of buttons)b.setAttribute('aria-pressed',String(item===selected));
  if(!selected){$('selected').textContent='Wybierz część';$('state').textContent='';action.textContent='Wybierz część';action.disabled=true;return}
  const p=selected;action.disabled=false;$('selected').textContent=(p.section==='Koła'?'Koło · ':p.section==='Drzwi'?'Drzwi · ':'')+p.name;
  $('state').textContent=p.wheel?['Zamontowane · 5 śrub','Śruby wykręcone','Koło zdjęte','Koło na piaście'][p.step]:p.open?'Otwarte':'Zamknięte';
  action.textContent=p.wheel?['Odkręć 5 śrub','Zdejmij koło','Załóż koło','Dokręć 5 śrub'][p.step]:p.open?'Zamknij':'Otwórz';
 }
 function select(p){selected=p;refresh()}
 function operate(){if(!selected)return;if(selected.wheel)selected.step=(selected.step+1)%4;else selected.open=!selected.open;refresh()}
 action.onclick=operate;
 for(const cat of ['Drzwi','Klapy','Koła']){
  const h=document.createElement('h3');h.textContent=cat;const g=document.createElement('div');g.className='group';$('parts').append(h,g);
  for(const p of parts.filter(p=>p.section===cat)){
   const b=document.createElement('button');b.textContent=p.name;b.setAttribute('aria-label',cat+' · '+p.name);b.onclick=()=>select(p);g.append(b);buttons.set(p,b);
  }
 }
 let view='front';function setCamera(which){
  view=which;const ratio=canvas.clientWidth/canvas.clientHeight;
  const pos=which==='rear'?[5.0,2.4,4.5]:which==='side'?[0,1.5,6.4]:[-4.5,2.35,5.0];
  const factor=Math.max(.86,1.35/ratio);
  controls.maxDistance=Math.max(12,10*factor);controls.target.set(0,.74,0);
  camera.position.set(pos[0]*factor,.74+(pos[1]-.74)*factor,pos[2]*factor);controls.update();
 }
 for(const id of ['front','side','rear'])$(id).onclick=()=>setCamera(id);
 $('reset').onclick=()=>{for(const p of parts){if(p.wheel)p.step=0;else p.open=false}select(null);setCamera('front')};
 const ray=new T.Raycaster();let down=null;
 canvas.addEventListener('pointerdown',e=>{down=e.isPrimary?[e.clientX,e.clientY]:null});
 canvas.addEventListener('pointercancel',()=>down=null);
 canvas.addEventListener('pointerup',e=>{
  if(!down||Math.hypot(down[0]-e.clientX,down[1]-e.clientY)>6){down=null;return}down=null;
  const r=canvas.getBoundingClientRect();ray.setFromCamera(new T.Vector2(2*(e.clientX-r.left)/r.width-1,1-2*(e.clientY-r.top)/r.height),camera);
  let obj=ray.intersectObject(car,true)[0]?.object;while(obj&&!obj.userData.part)obj=obj.parent;
  if(obj){select(obj.userData.part);operate()}
 });
 function size(){dirty=true;renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);camera.aspect=canvas.clientWidth/canvas.clientHeight;camera.updateProjectionMatrix();setCamera(view)}
 new ResizeObserver(size).observe(canvas);size();refresh();
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;let last=0;
 renderer.setAnimationLoop(ms=>{
  const k=reduced?1:1-Math.exp(-Math.min(100,ms-last)/130);last=ms;
  for(const p of parts){
   if(!p.wheel){p.t+=((p.open?1:0)-p.t)*k;p.pivot.rotation[p.axis]=p.angle*p.t;continue}
   p.t+=((p.step===2?1:0)-p.t)*k;p.wheel.position.z=p.z+p.s*.78*p.t;
   p.boltT+=((p.step===0?0:1)-p.boltT)*k;
   p.bolts.forEach(b=>{b.position.z=p.s*(.132+.11*p.boltT);b.rotation.y=p.boltT*14;b.visible=p.boltT<.975});
  }
  controls.update();if(dirty||parts.some(p=>p.wheel?Math.abs(p.t-(p.step===2?1:0))>.0001||Math.abs(p.boltT-(p.step===0?0:1))>.0001:Math.abs(p.t-(p.open?1:0))>.0001)){renderer.render(scene,camera);dirty=false}
 });$('loading').hidden=true;
}

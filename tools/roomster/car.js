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
 const mat=(color,metalness=0,roughness=.48)=>new T.MeshStandardMaterial({color,metalness,roughness,side:T.DoubleSide});
 const silver=mat(0xbec5c7,.58,.32),chrome=mat(0xcbd2d6,.94,.17),rubber=mat(0x16191a,0,.92),black=mat(0x202427,.14,.48),liner=mat(0x313638,.08,.78),seat=mat(0x444b4d,0,.98),alloy=mat(0xb4bbc0,.77,.27),red=mat(0xb72227,.3,.24),lamp=mat(0xd4e3e4,.56,.17);
 const glass=mat(0x64848c,.42,.15);glass.transparent=true;glass.opacity=.46;glass.depthWrite=false;
 function mesh(parent,geometry,material,x=0,y=0,z=0){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=material!==glass;m.receiveShadow=material!==glass;parent.add(m);return m}
 function box(p,m,x,y,z,w,h,d,r=.018){return mesh(p,new T.RoundedBoxGeometry(w,h,d,2,Math.min(r,w/2,h/2,d/2)),m,x,y,z)}
 function face(p,m,verts){const g=new T.BufferGeometry();const xyz=[];for(let i=1;i<verts.length-1;i++)xyz.push(...verts[0],...verts[i],...verts[i+1]);g.setAttribute('position',new T.Float32BufferAttribute(xyz,3));g.computeVertexNormals();return mesh(p,g,m)}
 function side(p,m,coords,z){const shape=new T.Shape();coords.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();const g=new T.ShapeGeometry(shape);return mesh(p,g,m,0,0,z)}
 function rod(p,m,a,b,r=.018){const av=new T.Vector3(...a),bv=new T.Vector3(...b),v=bv.clone().sub(av),c=av.add(bv).multiplyScalar(.5);
 const obj=mesh(p,new T.CylinderGeometry(r,r,v.length(),12),m,c.x,c.y,c.z);obj.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return obj}
 function cylinder(p,m,x,y,z,r,d,n=36){const o=mesh(p,new T.CylinderGeometry(r,r,d,n),m,x,y,z);o.rotation.x=Math.PI/2;return o}
 function orb(p,m,x,y,z,w,h,d){const o=mesh(p,new T.SphereGeometry(1,20,12),m,x,y,z);o.scale.set(w,h,d);return o}
 function roofStrip(p,m,sections){for(let i=1;i<sections.length;i++){const [x,y,w]=sections[i-1],[X,Y,W]=sections[i];for(const s of [-1,1]){
 face(p,m,[[x,y,-0.001*s],[X,Y,-0.001*s],[X,Y-.018,W*.83*s],[x,y-.018,w*.83*s]]);
 face(p,m,[[x,y-.018,w*.83*s],[X,Y-.018,W*.83*s],[X,Y-.052,W*s],[x,y-.052,w*s]]);
 }}}
 const parts=[],buttons=new Map();let selected=null,dirty=true;controls.addEventListener('change',()=>dirty=true);
 function hinged(id,name,section,x,y,z,axis,angle){
  const pivot=new T.Group(),p=new T.Group();car.add(pivot);pivot.position.set(x,y,z);pivot.add(p);p.position.set(-x,-y,-z);
  const item={id,name,section,pivot,axis,angle,open:false,t:0};pivot.userData.part=item;parts.push(item);return p;
 }
 // Floor and pillars stay in place as the independent panels move.
 box(car,liner,0,.39,0,3.85,.14,1.46,.05);
 box(car,black,-1.37,.51,0,1.12,.19,1.36,.06);
 box(car,black,1.55,.52,0,.70,.19,1.37);
 for(const s of [-1,1]){
  box(car,silver,0,.35,.76*s,2.02,.12,.13,.045);
  rod(car,silver,[-.85,1.02,.78*s],[-.30,1.53,.69*s],.051);
  rod(car,black,[.34,.48,.78*s],[.28,1.57,.70*s],.048);
  rod(car,silver,[1.36,.85,.79*s],[1.29,1.64,.72*s],.051);
  const rearGlass=[[1.34,1.03],[1.95,1.05],[1.88,1.53],[1.32,1.57]];
  side(car,black,[[1.26,.95],[2.005,.96],[1.965,1.59],[1.29,1.65]],.754*s);
  side(car,mat(0x35484f,.57,.2),rearGlass,.764*s);
  rod(car,silver,[1.98,.95,.77*s],[1.90,1.61,.73*s],.060);
  // Mudguards with actual cutouts and a rolled lip.
  for(const [cx,min,max,top] of [[-1.29,-2.08,-.86,.91],[1.31,1.29,2.03,.99]]){
   const arch=[];for(let j=0;j<=24;j++){const a=Math.PI*j/24;arch.push([cx+.365*Math.cos(a),.33+.365*Math.sin(a)])}
   const boundary=arch.filter(([x])=>x>=min&&x<=max);
   const outline=cx<0?[[min+.035,.60],[min+.075,.76],[-1.90,.864],[-1.40,.916],[max,.975]]:[[min,top],[max-.038,top],[max,.87]];
   const shape=[...outline,[max,.34],...boundary,[min+.035,boundary.at(-1)?.[1]??.34]];
   for(let k=1;k<outline.length;k++){const [ax,ay]=outline[k-1],[bx,by]=outline[k];
    face(car,silver,[[ax,ay,.795*s],[bx,by,.795*s],[bx,by+.012,.76*s],[ax,ay+.012,.76*s]]);
   }
   side(car,silver,shape,.795*s);
   for(let j=1;j<arch.length;j++){const [ax,ay]=arch[j-1],[bx,by]=arch[j];if((ax+bx)/2>=min)rod(car,silver,[ax,ay,.799*s],[bx,by,.799*s],.011)}
  }
 }
 roofStrip(car,silver,[[-.34,1.54,.70],[-.12,1.59,.715],[.38,1.62,.72],[.71,1.685,.735],[1.63,1.68,.74],[1.94,1.63,.73]]);
 face(car,glass,[[-.90,1.015,-.777],[-.90,1.015,.777],[-.32,1.524,.687],[-.32,1.524,-.687]]);
 for(const z of [-.36,.36])rod(car,black,[-.88,1.035,z-.25],[-.81,1.09,z+.25],.011);
 for(const s of [-1,1]){
  for(const x of [.40,1.65])box(car,black,x,1.68,s*.58,.13,.065,.06);
  rod(car,alloy,[.38,1.714,s*.58],[1.69,1.708,s*.58],.022);
 }
 const hood=hinged('hood','Maska','Klapy',-.89,.99,0,'z',-1.04);
 roofStrip(hood,silver,[[-2.04,.822,.72],[-1.88,.90,.78],[-1.32,.968,.79],[-.90,1.01,.774]]);
 box(car,black,-1.44,.725,0,.68,.27,.67,.07);box(car,alloy,-1.44,.868,0,.51,.046,.48,.02);
 for(let j=0;j<4;j++)box(car,liner,-1.63+j*.115,.90,0,.04,.024,.41);
 box(car,black,-1.32,.74,-.53,.36,.23,.26);orb(car,mat(0xe5e1c8),-1.34,.76,.52,.13,.10,.11);
 box(car,silver,-2.015,.48,0,.22,.29,1.55,.09);
 box(car,black,-2.128,.46,0,.025,.12,1.1,.01);
 box(car,chrome,-2.047,.735,0,.11,.235,.77,.05);box(car,black,-2.105,.735,0,.025,.19,.71,.012);
 for(let j=-6;j<=6;j++)box(car,alloy,-2.123,.735,j*.05,.014,.15,.012,.004);
 function plate(p,x,y,back){
  const c=document.createElement('canvas');c.width=512;c.height=106;const g=c.getContext('2d');
  g.fillStyle='#dfe1db';g.fillRect(0,0,512,106);g.fillStyle='#20549d';g.fillRect(0,0,32,106);g.fillStyle='#172022';g.font='bold 63px sans-serif';g.textAlign='center';g.fillText('ROOMSTER',271,77);
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;const m=new T.MeshBasicMaterial({map:t});const o=mesh(p,new T.PlaneGeometry(.48,.102),m,x,y,0);o.rotation.y=back?Math.PI/2:-Math.PI/2;
 }
 plate(car,-2.145,.48,false);
 for(const s of [-1,1]){
  const housing=box(car,black,-2.008,.763,.56*s,.175,.169,.41,.055);housing.rotation.y=-s*.37;
  const light=box(car,lamp,-2.031,.77,.563*s,.159,.145,.391,.048);light.rotation.y=-s*.37;
  face(car,lamp,[[-2.094,.809,s*.379],[-2.066,.838,s*.60],[-1.854,.854,s*.788],[-1.913,.752,s*.794],[-2.07,.714,s*.64],[-2.097,.715,s*.398]]);
  for(const dz of [-.08,.06])orb(car,chrome,-2.093,.793,(.56+dz)*s,.026,.05,.059);
  orb(car,lamp,-2.115,.48,.625*s,.022,.047,.051);
 }
 rod(car,black,[1.50,1.68,0],[1.64,1.87,0],.008);
 const badge=mat(0x36704b,.5,.28);orb(car,chrome,-2.104,.851,0,.036,.053,.053);orb(car,badge,-2.135,.851,0,.012,.039,.039);
 box(car,liner,-.63,.91,0,.40,.20,1.43,.065);
 const steer=mesh(car,new T.TorusGeometry(.13,.02,10,36),black,-.41,1.006,.40);steer.rotation.y=1.28;
 rod(car,black,[-.56,.91,.40],[-.40,1.0,.40],.045);
 box(car,liner,.05,.58,0,.56,.22,.18,.035);
 for(const x of [-.03,.85])for(const z of [-.39,.39]){
  box(car,seat,x,.65,z,.44,.16,.47,.07);const b=box(car,seat,x+.17,.88,z,.13,.51,.44,.055);b.rotation.z=-.1;box(car,liner,x+.20,1.18,z,.12,.18,.25,.045);
 }
 const hatch=hinged('boot','Bagażnik','Klapy',1.92,1.60,0,'z',1.48);
 box(hatch,silver,2.014,.81,0,.09,.53,1.36,.045);
 face(hatch,mat(0x30414a,.57,.19),[[2.04,1.04,-.68],[2.04,1.04,.68],[1.932,1.565,.68],[1.932,1.565,-.68]]);
 box(hatch,silver,1.94,1.58,0,.13,.09,1.46,.032);box(hatch,black,2.07,.91,0,.045,.042,.38);plate(hatch,2.065,.78,true);
 rod(hatch,black,[2.048,1.09,-.05],[2.041,1.13,.47],.014);
 box(car,silver,2.014,.44,0,.19,.21,1.55,.07);
 for(const s of [-1,1]){box(car,red,2.010,1.02,s*.735,.105,.52,.13,.046);box(car,lamp,2.069,1.00,s*.735,.014,.084,.10)}
 for(const s of [1,-1]){
  const suffix=s===1?'lewe':'prawe';
  for(const front of [true,false]){
   const x=front?-.87:.33,end=front?.30:1.29;
   const door=hinged((front?'front':'rear')+s,(front?'Przednie ':'Tylne ')+suffix,'Drzwi',x,.80,s*.797,'y',-s*1.14);
   const lower=front?[[x,.40],[end,.40],[end,1.05],[-.86,1.015]]:[[x,.40],[.952,.40],[.985,.51],[1.055,.602],[1.16,.667],[1.29,.694],[1.29,.981],[x,.945]];
   side(door,silver,lower,.808*s);side(door,liner,lower,.764*s);
   for(let i=0;i<lower.length;i++){const a=lower[i],b=lower[(i+1)%lower.length];face(door,silver,[[...a,.765*s],[...a,.808*s],[...b,.808*s],[...b,.765*s]])}
   const w=front?[[-.835,1.025],[-.30,1.513],[.267,1.54],[.27,1.058]]:[[.36,.956],[.362,1.55],[.73,1.619],[1.255,1.61],[1.255,.985]];
   const wz=y=>s*(.8-(y-.98)*.133);
   face(door,glass,w.map(([x,y])=>[x,y,wz(y)]));
   for(let i=0;i<w.length;i++){const [x1,y1]=w[i],[x2,y2]=w[(i+1)%w.length];rod(door,i===1?silver:black,[x1,y1,wz(y1)],[x2,y2,wz(y2)],front?.021:.024)}
   box(door,black,end-.17,front?.96:.89,.817*s,.157,.037,.022,.01);box(door,silver,end-.17,front?.973:.904,.836*s,.14,.029,.028,.011);
   const trimStart=front?-.84:.35,trimEnd=front?.28:1.10;
   box(door,black,(trimStart+trimEnd)/2,.59,.814*s,trimEnd-trimStart,.038,.019,.012);
   rod(door,silver,[x+.035,.83,.810*s],[end-.035,.86,.810*s],.007);
   box(door,liner,front?-.24:.68,.75,.744*s,.27,.056,.06);
   if(front){rod(door,black,[-.71,1.045,.79*s],[-.69,1.055,.925*s],.03);orb(door,silver,-.69,1.08,.945*s,.106,.065,.084);orb(door,chrome,-.603,1.081,.953*s,.014,.046,.068)}
  }
  for(const cx of [-1.29,1.31]){
   const z=.798*s,cy=.328;
   cylinder(car,black,cx,cy,z-s*.105,.27,.07);
   cylinder(car,alloy,cx,cy,z-s*.01,.177,.047);cylinder(car,liner,cx,cy,z+s*.019,.08,.051);
   box(car,liner,cx+.13,cy+.06,z+.015*s,.082,.13,.064);
   const wheel=new T.Group();car.add(wheel);wheel.position.set(cx,cy,z);
   const tire=mesh(wheel,new T.TorusGeometry(.248,.079,16,52),rubber);tire.scale.z=1.22;
   cylinder(wheel,black,0,0,0,.243,.152);cylinder(wheel,alloy,0,0,.076*s,.204,.022);
   cylinder(wheel,liner,0,0,.090*s,.184,.016);
   for(let i=0;i<5;i++){const a=i*Math.PI*2/5;
    for(const offset of [-.023,.023]){const r=.119;const spoke=box(wheel,alloy,r*Math.cos(a)-offset*Math.sin(a),r*Math.sin(a)+offset*Math.cos(a),.106*s,.157,.031,.035,.012);spoke.rotation.z=a+offset*4}
   }
   cylinder(wheel,alloy,0,0,.111*s,.083,.025);cylinder(wheel,black,0,0,.129*s,.032,.011);
   const bolts=[];
   for(let i=0;i<5;i++){const a=i*Math.PI*2/5;bolts.push(cylinder(wheel,chrome,.054*Math.cos(a),.054*Math.sin(a),.132*s,.013,.015,6))}
   const name=(cx<0?'Przednie ':'Tylne ')+suffix;
   const item={id:'wheel'+cx+s,name,section:'Koła',wheel,bolts,s,z,step:0,t:0,boltT:0};
   wheel.userData.part=item;parts.push(item);
  }
 }
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

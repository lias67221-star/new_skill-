import * as T from 'three';
import {room, hotspots, skillBooks, makeCamera, setCamera, initialYaw, initialPitch, sideYaw, orbitLimits} from './build-room.js';

const canvas=document.querySelector('#room-canvas');
const status=document.querySelector('#room-status');
const width=1672, height=941;
let renderer;
try {
  renderer=new T.WebGLRenderer({canvas,antialias:true});
} catch {
  status.hidden=false;
  canvas.hidden=true;
}
if (renderer) mountRoom();

function mountRoom(){
  const camera=makeCamera();
  renderer.setSize(width,height,false);
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.06;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=T.PCFShadowMap;
  renderer.shadowMap.autoUpdate=false;
  renderer.shadowMap.needsUpdate=true;
  const scene=document.querySelector('#scene');
  const desktop=document.querySelector('#win');
  const button=document.querySelector('#room-orbit');
  const hint=document.querySelector('#room-hint');
  const shelfBooks=document.querySelector('#shelf-books');
  const npc=document.querySelector('#npc-bubble');
  room.updateMatrixWorld(true);

  function bounds(object) {
    return new T.Box3().setFromObject(object);
  }
  function worldBox(object,x,y,z,w,h,d){
    const center=object.localToWorld(new T.Vector3(x,y,z));
    return new T.Box3().setFromCenterAndSize(center,new T.Vector3(w,h,d));
  }
  const anchors=[
    worldBox(hotspots.upload,0,0,0,.08,.28,.35),
    bounds(hotspots.monitor),
    worldBox(hotspots.shelf,-1.12,.64,.205,.07,.30,.31),
    bounds(hotspots.sign),
    bounds(hotspots.prompt),
    bounds(hotspots.robot),
    worldBox(hotspots.store,0,.486,.29,1.12,.74,.07)
  ];
  const buttons=[...document.querySelectorAll('.hotspot')];
  const bookBounds=skillBooks.map(bounds);
  const bookRest=skillBooks.map(skill=>skill.position.z);
  const bookPull=skillBooks.map(()=>0);
  const shelfOut=hotspots.shelf.getWorldDirection(new T.Vector3());
  const shiftedBounds=new T.Box3();
  const shift=new T.Vector3();
  let hoveredBook=-1, focusedBook=-1;
  for (const skill of skillBooks) {
    for (const child of skill.children) child.castShadow=false;
    for (const index of [0,2]) skill.children[index].material=skill.children[index].material.clone();
  }
  const view=new T.Vector2(initialYaw,initialPitch);
  const current=view.clone(), goal=view.clone();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let gesture, suppressClick=false, frame=0, dirty=true;
  let bookButtons=[];
  const scratch=new T.Vector3();
  function project(box,el,pad=4) {
    let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
    for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
      scratch.set(x,y,z).project(camera);
      const px=(scratch.x+1)*width*.5,py=(1-scratch.y)*height*.5;
      left=Math.min(left,px);right=Math.max(right,px);
      top=Math.min(top,py);bottom=Math.max(bottom,py);
    }
    el.style.left=`${left-pad}px`;
    el.style.top=`${top-pad}px`;
    el.style.width=`${right-left+pad*2}px`;
    el.style.height=`${bottom-top+pad*2}px`;
    return {left,top,right,bottom};
  }
  function schedule(){
    if(!frame)frame=requestAnimationFrame(render);
  }
  function render(){
    frame=0;
    goal.copy(view);
    if(desktop.classList.contains('open')) goal.set(initialYaw,initialPitch);
    if(!dirty&&current.distanceToSquared(goal)<1e-8)return;
    dirty=false;
    current.lerp(goal,reduced.matches?1:.26);
    setCamera(camera,current.x,current.y);
    const activeBook=gesture?.dragging?-1:(hoveredBook>=0?hoveredBook:focusedBook);
    for(let i=0;i<skillBooks.length;i++){
      const destination=i===activeBook ? .162 : 0;
      const pull=T.MathUtils.lerp(bookPull[i],destination,reduced.matches?1:.25);
      bookPull[i]=Math.abs(pull-destination)<.001?destination:pull;
      skillBooks[i].position.z=bookRest[i]+bookPull[i];
      if(bookPull[i]!==destination)dirty=true;
    }
    renderer.render(room,camera);
    buttons.forEach((el,i)=>project(anchors[i],el,i===0?2:5));
    bookButtons.forEach((el,i)=>{
      shift.copy(shelfOut).multiplyScalar(bookPull[i]);
      shiftedBounds.copy(bookBounds[i]).translate(shift).union(bookBounds[i]);
      project(shiftedBounds,el,0);
      el.style.zIndex=i===activeBook?'3':'';
    });
    if(npc.classList.contains('open')){
      const robot=buttons[5];
      const x=parseFloat(robot.style.left)+parseFloat(robot.style.width)*.5;
      const y=parseFloat(robot.style.top);
      npc.style.left=`${T.MathUtils.clamp(x-233,10,width-405)}px`;
      npc.style.top=`${Math.max(12,y-npc.offsetHeight-22)}px`;
    }
    if(dirty||current.distanceToSquared(goal)>=1e-8)schedule();
  }
  function syncBooks(){
    hoveredBook=-1;
    focusedBook=-1;
    bookButtons=[...shelfBooks.children].slice(0,skillBooks.length);
    bookButtons.forEach((el,i)=>{
      el.onpointerenter=e=>{if(e.pointerType==='mouse'){hoveredBook=i;updateBooks();}};
      el.onpointerleave=()=>{if(hoveredBook===i){hoveredBook=-1;updateBooks();}};
      el.onfocus=()=>{focusedBook=i;updateBooks();};
      el.onblur=()=>{if(focusedBook===i){focusedBook=-1;updateBooks();}};
    });
    skillBooks.forEach((skill,i)=>{
      const el=bookButtons[i];
      skill.visible=Boolean(el);
      if(el?.dataset.color){
        for (const index of [0,2]) skill.children[index].material.color.set(el.dataset.color);
      }
    });
    renderer.shadowMap.needsUpdate=true;
    dirty=true;
    schedule();
  }
  function updateBooks(){
    dirty=true;
    schedule();
  }
  function angle(x,y){
    view.set(T.MathUtils.clamp(x,orbitLimits.minYaw,orbitLimits.maxYaw),T.MathUtils.clamp(y,orbitLimits.minPitch,orbitLimits.maxPitch));
    const neutral=Math.abs(view.x-initialYaw)<.001&&Math.abs(view.y-initialPitch)<.001;
    button.textContent=neutral?'查看侧面':'复位视角';
    schedule();
  }
  button.addEventListener('click',()=>{
    if(view.x===initialYaw&&view.y===initialPitch)angle(sideYaw,.27);
    else angle(initialYaw,initialPitch);
  });
  scene.addEventListener('pointerdown',e=>{
    if(e.button!==0||!e.isPrimary||e.target.closest('.room-control,.npc-bubble'))return;
    suppressClick=false;
    gesture={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:view.x,pitch:view.y,dragging:false};
  });
  scene.addEventListener('pointermove',e=>{
    if(!gesture||gesture.id!==e.pointerId)return;
    const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
    if(!gesture.dragging&&Math.hypot(dx,dy)<6)return;
    if(!gesture.dragging){
      gesture.dragging=true;
      suppressClick=true;
      scene.setPointerCapture(e.pointerId);
      scene.classList.add('room-dragging');
      hoveredBook=-1;
      updateBooks();
    }
    const size=Math.max(scene.getBoundingClientRect().width,360);
    angle(gesture.yaw-dx/size*1.8,gesture.pitch+dy/size*1.15);
  });
  function endGesture(e){
    if(!gesture||e.pointerId!==gesture.id)return;
    gesture=undefined;
    scene.classList.remove('room-dragging');
  }
  window.addEventListener('pointerup',endGesture);
  scene.addEventListener('pointercancel',endGesture);
  scene.addEventListener('lostpointercapture',endGesture);
  scene.addEventListener('click',e=>{
    if(!suppressClick||e.detail===0)return;
    suppressClick=false;
    e.preventDefault();
    e.stopImmediatePropagation();
  },true);
  scene.addEventListener('keydown',e=>{
    if(e.target!==scene)return;
    if(e.key==='ArrowLeft')angle(view.x-.07,view.y);
    else if(e.key==='ArrowRight')angle(view.x+.07,view.y);
    else if(e.key==='ArrowUp')angle(view.x,view.y+.05);
    else if(e.key==='ArrowDown')angle(view.x,view.y-.05);
    else if(e.key==='Home')angle(initialYaw,initialPitch);
    else return;
    e.preventDefault();
  });
  new MutationObserver(syncBooks).observe(shelfBooks,{childList:true});
  new MutationObserver(()=>{
    dirty=true;
    schedule();
  }).observe(npc,{attributeFilter:['class']});
  new MutationObserver(schedule).observe(desktop,{attributeFilter:['class']});
  button.hidden=false;
  hint.hidden=false;
  scene.tabIndex=0;
  scene.classList.add('room-ready');
  syncBooks();
}

import * as THREE from 'https://cdn.skypack.dev/three';
import { emojiForEmotion, showHousehold, updateOverlay } from './ui.js';

const canvas=document.getElementById('c');
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x20242a);
const camera=new THREE.OrthographicCamera(-12,12,8,-8,0.1,1000);
camera.position.set(10,10,10); camera.lookAt(0,0,0);
const renderer=new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setSize(innerWidth,innerHeight);
window.addEventListener('resize',()=>renderer.setSize(innerWidth,innerHeight));
scene.add(new THREE.AmbientLight(0xffffff,.4));
const light=new THREE.DirectionalLight(0xffffff,1); light.position.set(5,10,5); scene.add(light);
scene.add(new THREE.GridHelper(24,24));

const sims={}, labels={}, bubbles={}, mailboxes={}, responders={};
const raycaster=new THREE.Raycaster(); const mouse=new THREE.Vector2();

function worldToScreen(pos){ const v=pos.clone().project(camera); return {x:(v.x*.5+.5)*innerWidth, y:(-v.y*.5+.5)*innerHeight}; }
function makeDiv(cls){ const d=document.createElement('div'); d.className=cls; document.body.appendChild(d); return d; }
function createSim(id){
  const mesh=new THREE.Mesh(new THREE.CapsuleGeometry(.35,.7,4,8), new THREE.MeshStandardMaterial({color:0x42d392}));
  scene.add(mesh); sims[id]=mesh; labels[id]=makeDiv('label'); bubbles[id]=makeDiv('bubble'); bubbles[id].style.display='none';
}
function updateSim(id,c){
  if(!sims[id]) createSim(id);
  const mesh=sims[id]; mesh.position.set(c.x-10,.5,c.y-7);
  const p=worldToScreen(mesh.position.clone().add(new THREE.Vector3(0,1.4,0)));
  labels[id].style.left=p.x+'px'; labels[id].style.top=p.y+'px'; labels[id].innerText=`${emojiForEmotion(c.emotion)} ${c.name}`;
  const txt=c.last_utterance || (c.is_on_phone?'📱':'');
  if(txt){ const bp=worldToScreen(mesh.position.clone().add(new THREE.Vector3(0,2.1,0))); bubbles[id].style.display='block'; bubbles[id].style.left=bp.x+'px'; bubbles[id].style.top=bp.y+'px'; bubbles[id].innerText=txt; } else bubbles[id].style.display='none';
}
function updateMailboxes(state){
  for(const m of state.mailboxes||[]){
    if(!mailboxes[m.id]){ const mesh=new THREE.Mesh(new THREE.BoxGeometry(.45,.45,.45), new THREE.MeshStandardMaterial({color:0xffd166})); mesh.userData={type:'mailbox', household_id:m.household_id}; scene.add(mesh); mailboxes[m.id]=mesh; }
    mailboxes[m.id].position.set(m.x-10,.3,m.y-7);
  }
}
function updateResponders(state){
  for(const r of state.responders||[]){
    if(!responders[r.id]){ const color=r.type==='police'?0x4dabf7:r.type==='medical'?0xff6b6b:0xff922b; const mesh=new THREE.Mesh(new THREE.BoxGeometry(.65,.35,.65), new THREE.MeshStandardMaterial({color})); scene.add(mesh); responders[r.id]=mesh; }
    responders[r.id].position.set((r.location?.x||0)-10,.25,(r.location?.y||0)-7);
  }
}
function updateDayNight(cal) {
  const hour = cal?.hour ?? 12;

  const t = hour / 24;
  const intensity = Math.max(0.15, Math.sin(t * Math.PI));

  const day = new THREE.Color(0x87ceeb);
  const night = new THREE.Color(0x0b0f1a);

  scene.background = day.clone().lerp(night, 1 - intensity);

  light.intensity = intensity * 1.2;
}
canvas.addEventListener('click', (ev)=>{
  mouse.x=(ev.clientX/innerWidth)*2-1; mouse.y=-(ev.clientY/innerHeight)*2+1; raycaster.setFromCamera(mouse,camera);
  const hits=raycaster.intersectObjects(Object.values(mailboxes));
  if(hits[0]) showHousehold(hits[0].object.userData.household_id);
});
const ws=new WebSocket(`ws://${location.host}/ws`);
ws.onopen=()=>{ document.getElementById('overlay').innerHTML='Connected'; ws.send('hello'); };
ws.onmessage = (e)=>{
  const state = JSON.parse(e.data);

  updateOverlay(state);
  updateDayNight(state.calendar);

  updateMailboxes(state);
  updateResponders(state);

  for(const [id,c] of Object.entries(state.characters||{})) {
    updateSim(id,c);
  }
};

function animate(){ requestAnimationFrame(animate); renderer.render(scene,camera); }
animate();

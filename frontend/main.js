import * as THREE from 'https://cdn.skypack.dev/three';
import { emojiForEmotion, showHousehold, updateOverlay } from './ui.js';
import { GLTFLoader } from 'https://cdn.skypack.dev/three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const clock = new THREE.Clock();
const mixers = {};
const actions = {};
const models = {};
const canvas=document.getElementById('c');
const buses = {};
const cars = {};
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

function applyFacing(mesh, dir) {
  const map = {
    north: Math.PI,
    south: 0,
    east: -Math.PI/2,
    west: Math.PI/2
  };

  mesh.rotation.y = map[dir] ?? 0;
}
function playAnimation(id, name){

  const map = actions[id];
  if(!map) return;

  const lower = name.toLowerCase();

  let action = map[lower];

  if(!action){
    // fallback
    action = map["idle"];
  }

  if(!action) return;

  Object.values(map).forEach(a=>{
    if(a !== action){
      a.fadeOut(0.2);
    }
  });

  action.reset().fadeIn(0.2).play();
}

function updateCars(state){

  for(const p of state.props || []){

    if(p.type !== "car") continue;

    if(!cars[p.id]){
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1,0.5,0.5),
        new THREE.MeshStandardMaterial({color:0x4444ff})
      );
      scene.add(mesh);
      cars[p.id] = mesh;
    }

    cars[p.id].position.set(p.x-10,.3,p.y-7);
  }
}

function updateBuses(state){

  for(const [id,e] of Object.entries(state.entities || {})){

    if(!e.components?.bus) continue;

    const pos = e.components.position;

    if(!buses[id]){
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.5,0.7,0.7),
        new THREE.MeshStandardMaterial({color:0xffaa00})
      );
      scene.add(mesh);
      buses[id] = mesh;
    }

    buses[id].position.set(pos.x-10, .4, pos.y-7);
  }
}
const sims={}, labels={}, bubbles={}, mailboxes={}, responders={};
const raycaster=new THREE.Raycaster(); const mouse=new THREE.Vector2();

function worldToScreen(pos){ const v=pos.clone().project(camera); return {x:(v.x*.5+.5)*innerWidth, y:(-v.y*.5+.5)*innerHeight}; }
function makeDiv(cls){ const d=document.createElement('div'); d.className=cls; document.body.appendChild(d); return d; }
function createSim(id){

  loader.load('/resources/characters/base.glb', (gltf)=>{

    const model = gltf.scene;

    scene.add(model);

    const mixer = new THREE.AnimationMixer(model);

    const clips = gltf.animations;

    const map = {};

    clips.forEach(clip=>{
      map[clip.name.toLowerCase()] = mixer.clipAction(clip);
    });

    mixers[id] = mixer;
    actions[id] = map;
    models[id] = model;

    sims[id] = model;

    labels[id] = makeDiv('label');
    bubbles[id] = makeDiv('bubble');
    bubbles[id].style.display='none';

    playAnimation(id, "idle");
  });
}
function updateSim(id,c){

  if(!sims[id]) {
    createSim(id);
    return; // wait until model loads
  }

  const mesh = sims[id];
  if(!mesh) return;

  // =========================
  // POSITION
  // =========================
  mesh.position.set(c.x-10,.5,c.y-7);

  // =========================
  // FACING
  // =========================
  if (c.facing) {
    applyFacing(mesh, c.facing);
  }

  // =========================
  // 🎬 ANIMATION LOGIC (INSERT HERE)
  // =========================
  let anim = "idle";

  // movement
  if (c.is_moving) {
    anim = "walk";
  }

  // activity overrides
  if (c.activity) {
    const a = c.activity.name;

    if (a === "sleep") anim = "sleep";
    else if (a === "use_toilet") anim = "sit";
    else if (a === "wait_bus") anim = "idle";
    else if (a === "appointment") anim = "talk";
  }

  // transport override
  if (c.transport?.mode === "car") {
    anim = "drive";
  }

  if(c.phone?.notifications?.length){
    showPhoneIcon(c);
}

  // play animation
  playAnimation(id, anim);

  // =========================
  // UI (leave untouched)
  // =========================
  labels[id].textContent = c.name || id;
  bubbles[id].textContent = c.speech || "";

  const p = mesh.position.clone().project(camera);
  const x = (p.x * .5 + .5) * innerWidth;
  const y = (-p.y * .5 + .5) * innerHeight;

  labels[id].style.transform = `translate(${x}px,${y-20}px)`;
  bubbles[id].style.transform = `translate(${x}px,${y-40}px)`;
}
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
  updateCars(state)
  updateBuses(state);
  updateMailboxes(state);
  updateResponders(state);

  for(const [id,c] of Object.entries(state.characters||{})) {
    updateSim(id,c);
  }
};

function animate(){ requestAnimationFrame(animate); renderer.render(scene,camera); }
animate();

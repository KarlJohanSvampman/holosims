import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { emojiForEmotion, showHousehold, updateOverlay } from './ui.js';
import { getAnchorWorldPosition, findAnchor, playPropAnimation } from './interactions.js';
const loader = new GLTFLoader();
const clock = new THREE.Clock();
const characterControllers = {};
const models = {};
const canvas=document.getElementById('c');
const buses = {};
const cars = {};
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x20242a);
const camera=new THREE.OrthographicCamera(-12,12,8,-8,0.1,1000);
camera.position.set(10,10,10); camera.lookAt(0,0,0);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("c") });
//const renderer=new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setSize(innerWidth,innerHeight);
window.addEventListener('resize',()=>renderer.setSize(innerWidth,innerHeight));
scene.add(new THREE.AmbientLight(0xffffff,.4));
const light=new THREE.DirectionalLight(0xffffff,1); light.position.set(5,10,5); scene.add(light);
scene.add(new THREE.GridHelper(24,24));


function update(delta) {
  for (const p of Object.values(propRegistry)) {
    if (p.mixer) p.mixer.update(delta);
  }
}

function chooseVariant(value){

  if(!value) return null;

  // single animation
  if(typeof value === "string"){
    return value;
  }

  // random array
  if(Array.isArray(value)){
    return value[
      Math.floor(Math.random() * value.length)
    ];
  }

  return null;
}
 
function applyFacing(mesh, dir) {
  const map = {
    north: Math.PI,
    south: 0,
    east: -Math.PI/2,
    west: Math.PI/2
  };

  mesh.rotation.y = map[dir] ?? 0;
}

// =========================
// 🎬 ANIMATION CONTROLLER
// =========================

function createAnimationController(model, mixer, clips){

  const actions = {};

  clips.forEach((clip)=>{
    actions[clip.name.toLowerCase()] = mixer.clipAction(clip);
  });

  return {
    mixer,
    actions,

    baseAction: null,
    upperAction: null,

    currentBase: null,
    currentUpper: null
  };
}


// =========================
// BASE LAYER
// =========================
function playBaseAnimation(id, clipName){

  const ctrl = characterControllers[id];
  if(!ctrl) return;

  clipName = clipName.toLowerCase();

  if(ctrl.currentBase === clipName) return;

  const next = ctrl.actions[clipName]
    || ctrl.actions["idle"];

  if(!next) return;

  if(ctrl.baseAction){
    ctrl.baseAction.fadeOut(0.25);
  }

  next.reset();
  next.fadeIn(0.25);
  next.play();

  ctrl.baseAction = next;
  ctrl.currentBase = clipName;
}


// =========================
// UPPER BODY LAYER
// =========================
function playUpperAnimation(id, clipName){

  const ctrl = characterControllers[id];
  if(!ctrl) return;

  clipName = clipName.toLowerCase();

  if(ctrl.currentUpper === clipName) return;

  const next = ctrl.actions[clipName];

  if(!next) return;

  if(ctrl.upperAction){
    ctrl.upperAction.fadeOut(0.2);
  }

  next.reset();
  next.fadeIn(0.2);
  next.play();

  ctrl.upperAction = next;
  ctrl.currentUpper = clipName;
}


// =========================
// CLEAR UPPER LAYER
// =========================
function clearUpperAnimation(id){

  const ctrl = characterControllers[id];
  if(!ctrl) return;

  if(ctrl.upperAction){
    ctrl.upperAction.fadeOut(0.2);
  }

  ctrl.upperAction = null;
  ctrl.currentUpper = null;
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

    const controller = createAnimationController(
      model,
      mixer,
      gltf.animations
    );

    characterControllers[id] = controller;

    models[id] = model;
    sims[id] = model;

    labels[id] = makeDiv('label');
    bubbles[id] = makeDiv('bubble');

    bubbles[id].style.display='none';

    playBaseAnimation(id, "idle");
  });
}

function updateSim(id, c) {

  // =========================
  // CREATE IF MISSING
  // =========================
  if (!sims[id]) {
    createSim(id);
    return;
  }

  const mesh = sims[id];
  if (!mesh) return;

  // =========================
  // BASE POSITION
  // =========================
  mesh.position.set(c.x - 10, 0.5, c.y - 7);

  // =========================
  // FACING
  // =========================
  if (c.facing) {
    applyFacing(mesh, c.facing);
  }

  // =========================
  // DEFAULT BASE ANIMATION
  // =========================
  let baseAnim = "idle";

  // locomotion
  if (c.is_moving) {
    baseAnim = "walk";
  }

  // transport
  if (c.transport?.mode === "car") {
    baseAnim = "drive";
  }

  // seated / lying states
  if (c.activity?.name) {

    if (
      [
        "sit",
        "sleep",
        "lie",
        "lie_down"
      ].includes(c.activity.name)
    ) {
      baseAnim = c.activity.name;
    }
  }

  // =========================
  // PLAY BASE LAYER
  // =========================
  playBaseAnimation(id, baseAnim);

  // =========================
  // CLEAR UPPER LAYER
  // =========================
  clearUpperAnimation(id);

  // =========================
  // INTERACTION SYSTEM
  // =========================
  if (c.activity?.prop_id) {

    const prop = propRegistry[c.activity.prop_id];

    if (prop) {

      // -----------------
      // FIND ANCHOR
      // -----------------
      const anchor = prop.anchors.find(
        a => a.name === c.activity.anchor
      );

      if (anchor) {

        // -----------------
        // SNAP TO ANCHOR
        // -----------------
        const pos = getAnchorWorldPosition(anchor);

        mesh.position.copy(pos);

        // slight vertical offset
        mesh.position.y += 0.01;

        // -----------------
        // FACING
        // -----------------
        if (c.facing) {
          applyFacing(mesh, c.facing);
        }

        // -----------------
        // ANIMATION PHASES
        // -----------------
        const phase = c.activity.phase || "loop";

        const animMap = anchor.interaction?.animations || {};

        let clipName = null;

        if (phase === "start") {
          clipName = chooseVariant(animMap.start);
        }
        else if (phase === "loop") {
          clipName = chooseVariant(animMap.loop);
        }
        else if (phase === "stop") {
          clipName = chooseVariant(animMap.stop);
        }
        else if (phase === "interrupt") {
          clipName = chooseVariant(animMap.interrupted);
        }

        // -----------------
        // CHARACTER ANIMATION
        // -----------------
        if (clipName) {

          const lower = clipName.toLowerCase();

          // full-body interactions
          if (
            [
              "sit",
              "sleep",
              "lie_down",
              "wake_up"
            ].includes(lower)
          ) {

            playBaseAnimation(id, lower);
          }

          // upper-body overlays
          else {

            playUpperAnimation(id, lower);
          }
        }

        // -----------------
        // PROP ANIMATION
        // -----------------
        playPropAnimation(prop, anchor, phase);
      }
    }
  }

  // =========================
  // SECONDARY ACTIVITY
  // =========================
  if (c.secondary_activity?.name) {

    const secondary = c.secondary_activity.name.toLowerCase();

    const upperAllowed = [
      "talk",
      "wave",
      "eat",
      "drink",
      "phone",
      "type"
    ];

    if (upperAllowed.includes(secondary)) {
      playUpperAnimation(id, secondary);
    }
  }

  // =========================
  // PHONE NOTIFICATIONS
  // =========================
  if (c.phone?.notifications?.length) {
    showPhoneIcon(c);
  }

  // =========================
  // UI LABELS
  // =========================
  labels[id].textContent = c.name || id;

  const speech =
    c.last_utterance
    || c.speech
    || "";

  bubbles[id].textContent = speech;

  // =========================
  // LABEL POSITION
  // =========================
  const p = mesh.position.clone().project(camera);

  const x = (p.x * 0.5 + 0.5) * innerWidth;
  const y = (-p.y * 0.5 + 0.5) * innerHeight;

  labels[id].style.transform =
    `translate(${x}px,${y - 20}px)`;

  // =========================
  // BUBBLE POSITION
  // =========================
  bubbles[id].style.transform =
    `translate(${x}px,${y - 40}px)`;

  // =========================
  // SHOW / HIDE BUBBLE
  // =========================
  if (speech) {
    bubbles[id].style.display = "block";
  } else {
    bubbles[id].style.display = "none";
  }
}
  const p=worldToScreen(mesh.position.clone().add(new THREE.Vector3(0,1.4,0)));
  labels[id].style.left=p.x+'px'; labels[id].style.top=p.y+'px'; labels[id].innerText=`${emojiForEmotion(c.emotion)} ${c.name}`;
  const txt=c.last_utterance || (c.is_on_phone?'📱':'');
  if(txt){ const bp=worldToScreen(mesh.position.clone().add(new THREE.Vector3(0,2.1,0))); bubbles[id].style.display='block'; bubbles[id].style.left=bp.x+'px'; bubbles[id].style.top=bp.y+'px'; bubbles[id].innerText=txt; } else bubbles[id].style.display='none';

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
const WS_URL = `ws://${location.hostname}:8000/ws`;
const ws = new WebSocket(WS_URL);ws.onopen=()=>{ document.getElementById('overlay').innerHTML='Connected'; ws.send('hello'); };
ws.onmessage = (e)=>{
  const state = JSON.parse(e.data);
´

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

function animate(){

  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  // update character mixers
  for(const ctrl of Object.values(characterControllers)){
    ctrl.mixer.update(delta);
  }

  // update prop mixers
  update(delta);

  renderer.render(scene,camera);
}
animate();

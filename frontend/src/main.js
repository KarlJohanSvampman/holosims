import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { emojiForEmotion, showHousehold, updateOverlay } from './ui.js';
import { getAnchorWorldPosition, findAnchor, playPropAnimation } from './interactions.js';
import { initEditor } from "./editor.js";
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
window.addEventListener('resize',()=>{

  camera.aspect =
    innerWidth / innerHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(
    innerWidth,
    innerHeight
  );
});
scene.add(new THREE.AmbientLight(0xffffff,.4));
const light=new THREE.DirectionalLight(0xffffff,1); light.position.set(5,10,5); scene.add(light);
scene.add(new THREE.GridHelper(24,24));
let definitions = {};
const propRegistry = {};
const loadingCharacters = {};
const interactionStates = {};
function update(delta) {
  for(const id in propRegistry){

    const prop = propRegistry[id];

    if(!prop) continue;

    if(!prop.mixer) continue;

    prop.mixer.update(delta);
  }
}

function getPropTemplate(state, prop){

  return (
    state
    ?.definitions
    ?.prop_templates
    ?.[prop.template]
  );
}

function createFallbackPropMesh(prop){

  const geo = new THREE.BoxGeometry(1, 1, 1);

  const mat = new THREE.MeshStandardMaterial({
    color: 0xff00ff
  });

  const mesh = new THREE.Mesh(geo, mat);

  mesh.position.set(
    prop.x - 10,
    0.5,
    prop.y - 7
  );

  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}


function loadProp(state, prop){

  // already loaded/loading
  if(propRegistry[prop.id]) return;

  propRegistry[prop.id] = {
    loading: true
  };

  const template = getPropTemplate(state, prop);

  // -------------------------
  // MISSING TEMPLATE
  // -------------------------
  if(!template){

    console.warn(
      "Missing prop template:",
      prop.template
    );

    const fallback =
      createFallbackPropMesh(prop);

    scene.add(fallback);

    propRegistry[prop.id] = {

      id: prop.id,

      mesh: fallback,

      mixer: null,

      actions: {},

      anchors: [],

      template: null,

      fallback: true
    };

    return;
  }

  // -------------------------
  // MISSING MODEL PATH
  // -------------------------
  if(!template.model){

    console.warn(
      "Template missing model:",
      template
    );

    const fallback =
      createFallbackPropMesh(prop);

    scene.add(fallback);

    propRegistry[prop.id] = {

      id: prop.id,

      mesh: fallback,

      mixer: null,

      actions: {},

      anchors: [],

      template,

      fallback: true
    };

    return;
  }

  // -------------------------
  // LOAD GLTF
  // -------------------------
  loader.load(

    template.model,

    // SUCCESS
    (gltf)=>{

      const model = gltf.scene;

      // -------------------------
      // POSITION
      // -------------------------
      model.position.set(
        prop.x - 10,
        0,
        prop.y - 7
      );

      // -------------------------
      // ROTATION
      // -------------------------
      model.rotation.y =
        prop.rotation || 0;

      // -------------------------
      // SHADOWS
      // -------------------------
      model.traverse((o)=>{

        if(o.isMesh){

          o.castShadow = true;
          o.receiveShadow = true;
        }
      });

      // -------------------------
      // MIXER
      // -------------------------
      const mixer =
        new THREE.AnimationMixer(model);

      const actions = {};

      gltf.animations.forEach((clip)=>{

        actions[
          clip.name.toLowerCase()
        ] = mixer.clipAction(clip);
      });

      // -------------------------
      // ANCHORS + IK
      // -------------------------
      const anchors = [];

      model.traverse((o)=>{

        if(!o.name) return;

        const lower =
          o.name.toLowerCase();

        // -------------------------
        // ANCHOR DETECTION
        // -------------------------
        if(lower.startsWith("anchor_")){

          const interactionName =
            o.userData.interaction
            || "interact";

          // -------------------------
          // IK TARGETS
          // -------------------------
          const ikTargets = {};

          o.traverse((child)=>{

            if(!child.name) return;

            const childLower =
              child.name.toLowerCase();

            if(childLower.startsWith("ik_")){

              ikTargets[
                childLower
              ] = child;
            }
          });

          anchors.push({

            name: o.name,

            object: o,

            interactionName,

            ikTargets
          });
        }
      });

      // -------------------------
      // REGISTRY
      // -------------------------
      propRegistry[prop.id] = {

        id: prop.id,

        mesh: model,

        mixer,

        actions,

        anchors,

        template,

        fallback: false
      };

      scene.add(model);
    },

    // PROGRESS
    undefined,

    // ERROR
    (err)=>{

      console.error(
        "Failed to load prop model:",
        template.model,
        err
      );

      const fallback =
        createFallbackPropMesh(prop);

      scene.add(fallback);

      propRegistry[prop.id] = {

        id: prop.id,

        mesh: fallback,

        mixer: null,

        actions: {},

        anchors: [],

        template,

        fallback: true
      };
    }
  );
}

function updateProps(state){

  const activeIds = new Set(
  (state.props || []).map(p => p.id)
  );

  for(const id of Object.keys(propRegistry)){

    if(!activeIds.has(id)){



      const p = propRegistry[id];

      for(const key of Object.keys(propAnimationStates)){

        if(key.startsWith(id + "_")){
          delete propAnimationStates[key];
      }
    }

      if(p.mesh){
        scene.remove(p.mesh);
      }

      delete propRegistry[id];
    }
  }
  

  for(const prop of state.props || []){

    // create if missing
    if(!propRegistry[prop.id]){
      loadProp(state, prop);
      continue;
    }

    const p = propRegistry[prop.id];
    
    if(p.loading) continue;
    // sync transform
    p.mesh.position.set(
      prop.x - 10,
      0,
      prop.y - 7
    );

    p.mesh.rotation.y =
      prop.rotation || 0;
  }
}


function alignBoneToTarget(
  controller,
  boneName,
  targetObject,
  alpha = 0.15
){

  if(!targetObject) return;

  const bone =
    controller.bones?.[
      boneName.toLowerCase()
    ];

  if(!bone) return;

  const targetPos =
    new THREE.Vector3();

  targetObject.getWorldPosition(
    targetPos
  );

  bone.parent.worldToLocal(
    targetPos
  );

  bone.position.lerp(
    targetPos,
    alpha
  );
}

function lookBoneAtTarget(
  controller,
  boneName,
  targetObject,
  alpha = 0.08
){

  const bone =
    controller.bones?.[
      boneName.toLowerCase()
    ];

  if(!bone || !targetObject) return;

  const targetPos =
    new THREE.Vector3();

  targetObject.getWorldPosition(
    targetPos
  );

  bone.lookAt(targetPos);

  bone.rotation.x *= alpha;
  bone.rotation.y *= alpha;
}

function cleanupInteractionStates(state){

  const active = new Set();

  for(
    const c of Object.values(
      state.characters || {}
    )
  ){

    const iid =
      c.activity?.interaction_id;

    if(iid){
      active.add(iid);
    }
  }

  for(
    const iid of Object.keys(
      interactionStates
    )
  ){

    if(!active.has(iid)){
      delete interactionStates[iid];
    }
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

    const template = getPropTemplate(state, p);

    if(template?.category !== "vehicles") continue;

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

function createFallbackCharacter(character){

  const root = new THREE.Group();

  // -------------------------
  // BODY
  // -------------------------
  const bodyGeo =
    new THREE.CapsuleGeometry(
      0.35,
      1.0,
      4,
      8
    );

  const bodyMat =
    new THREE.MeshStandardMaterial({
      color: 0x00ffff
    });

  const body =
    new THREE.Mesh(
      bodyGeo,
      bodyMat
    );

  body.position.y = 1;

  body.castShadow = true;
  body.receiveShadow = true;

  root.add(body);

  // -------------------------
  // HEAD
  // -------------------------
  const headGeo =
    new THREE.SphereGeometry(
      0.22,
      16,
      16
    );

  const head =
    new THREE.Mesh(
      headGeo,
      bodyMat
    );

  head.position.y = 1.9;

  head.castShadow = true;

  root.add(head);

  // -------------------------
  // POSITION
  // -------------------------
  root.position.set(
    character.x - 10,
    0,
    character.y - 7
  );

  return root;
}


function createSim(id, character){

  // -------------------------
  // TEMPLATE
  // -------------------------
  const template =
    definitions
    ?.character_templates
    ?.[character.template];

  const modelPath =
    template?.model;

  // -------------------------
  // MISSING TEMPLATE/MODEL
  // -------------------------
  if(!modelPath){

    console.warn(
      "Missing character model:",
      character.template
    );

    const fallback =
      createFallbackCharacter(character);

    scene.add(fallback);

    sims[id] = fallback;
    models[id] = fallback;

    characterControllers[id] = {
      mixer: null,
      actions: {},
      bones: {},
      fallback: true
    };

    labels[id] = makeDiv("label");
    bubbles[id] = makeDiv("bubble");

    bubbles[id].style.display =
      "none";

    delete loadingCharacters[id];

    return;
  }

  // -------------------------
  // LOAD MODEL
  // -------------------------
  loader.load(

    modelPath,

    // SUCCESS
    (gltf)=>{

      const model = gltf.scene;

      // -------------------------
      // SHADOWS
      // -------------------------
      model.traverse((o)=>{

        if(o.isMesh){

          o.castShadow = true;
          o.receiveShadow = true;
        }
      });

      // -------------------------
      // POSITION
      // -------------------------
      model.position.set(
        character.x - 10,
        0,
        character.y - 7
      );

      scene.add(model);

      // -------------------------
      // MIXER
      // -------------------------
      const mixer =
        new THREE.AnimationMixer(model);

      // -------------------------
      // CONTROLLER
      // -------------------------
      const controller =
        createAnimationController(
          model,
          mixer,
          gltf.animations
        );

      // -------------------------
      // BONES
      // -------------------------
      const bones = {};

      model.traverse((o)=>{

        if(o.isBone){

          bones[
            o.name.toLowerCase()
          ] = o;
        }
      });

      controller.bones = bones;

      characterControllers[id] =
        controller;

      // -------------------------
      // REGISTRY
      // -------------------------
      models[id] = model;
      sims[id] = model;

      // -------------------------
      // UI
      // -------------------------
      labels[id] =
        makeDiv("label");

      bubbles[id] =
        makeDiv("bubble");

      bubbles[id].style.display =
        "none";

      // -------------------------
      // DEFAULT ANIMATION
      // -------------------------
      playBaseAnimation(
        id,
        "idle"
      );

      delete loadingCharacters[id];
    },

    // PROGRESS
    undefined,

    // ERROR
    (err)=>{

      console.error(
        "Failed to load character:",
        modelPath,
        err
      );

      // -------------------------
      // FALLBACK CHARACTER
      // -------------------------
      const fallback =
        createFallbackCharacter(
          character
        );

      scene.add(fallback);

      sims[id] = fallback;
      models[id] = fallback;

      characterControllers[id] = {

        mixer: null,

        actions: {},

        bones: {},

        fallback: true
      };

      labels[id] =
        makeDiv("label");

      bubbles[id] =
        makeDiv("bubble");

      bubbles[id].style.display =
        "none";

      delete loadingCharacters[id];
    }
  );
}

function updateSim(id, c) {

  // =========================
  // CREATE IF MISSING
  // =========================
  if (!sims[id]) {

    if(!loadingCharacters[id]){
      loadingCharacters[id] = true;
      createSim(id, c);
    }

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
  let hasUpperAnimation = false;

  // =========================
// INTERACTION SYSTEM
// =========================
if (c.activity?.prop_id) {

  const prop = propRegistry[c.activity.prop_id];

  if (prop && !prop.loading) {

    // -----------------
    // FIND ANCHOR
    // -----------------
    const anchor = prop.anchors.find(
      a => a.name === c.activity.anchor
    );

    if (anchor) {

      // =========================
      // SNAP TO ANCHOR
      // =========================
      const pos = getAnchorWorldPosition(anchor);

      mesh.position.copy(pos);

      // slight vertical offset
      mesh.position.y += 0.01;

      // =========================
      // FACING
      // =========================
      if (c.facing) {
        applyFacing(mesh, c.facing);
      }

      // =========================
      // ANIMATION PHASES
      // =========================
      const phase = c.activity.phase || "loop";

      const interactionTemplate =
        definitions
        ?.interaction_templates
        ?.[anchor.interactionName];

      const animMap =
        interactionTemplate?.animations || {};

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

      // =========================
      // CHARACTER ANIMATION
      // =========================
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

          hasUpperAnimation = true;

          playUpperAnimation(
            id,
            lower
          );
        }
      }

      // =========================
      // PROP ANIMATION
      // =========================
      const interactionId =
        c.activity.interaction_id;

      if(interactionId){

        const stateKey =
          `${interactionId}_${phase}`;

        const previous =
          interactionStates[
            interactionId
          ];

        // trigger once per phase
        if(previous !== stateKey){

          playPropAnimation(
            prop,
            interactionTemplate,
            phase
          );

          interactionStates[
            interactionId
          ] = stateKey;
        }
      }

      // ==================================================
      // 🔥 PROCEDURAL IK (NEW)
      // ==================================================
      const controller =
        characterControllers[id];

      if(controller){

        // -------------------------
        // RIGHT HAND
        // -------------------------
        const rightHandTarget =
          anchor.ikTargets?.[
            "ik_righthand"
          ];

        if(rightHandTarget){

          alignBoneToTarget(
            controller,
            "ik_righthand",
            rightHandTarget,
            0.15
          );
        }

        // -------------------------
        // LEFT HAND
        // -------------------------
        const leftHandTarget =
          anchor.ikTargets?.[
            "ik_lefthand"
          ];

        if(leftHandTarget){

          alignBoneToTarget(
            controller,
            "ik_lefthand",
            leftHandTarget,
            0.15
          );
        }

        // -------------------------
        // HEAD LOOK
        // -------------------------
        const lookTarget =
          anchor.ikTargets?.[
            "ik_lookat"
          ];

        if(lookTarget){

          lookBoneAtTarget(
            controller,
            "ik_head",
            lookTarget,
            0.08
          );
        }

        // -------------------------
        // FOOT IK
        // -------------------------
        const footL =
          anchor.ikTargets?.[
            "ik_foot_l"
          ];

        const footR =
          anchor.ikTargets?.[
            "ik_foot_r"
          ];

        if(footL){

          alignBoneToTarget(
            controller,
            "ik_leftfoot",
            footL,
            0.1
          );
        }

        if(footR){

          alignBoneToTarget(
            controller,
            "ik_rightfoot",
            footR,
            0.1
          );
        }
      }
    }
  }
}

  // =========================
  // CLEAR UPPER LAYER
  // =========================
  if(!hasUpperAnimation){
    clearUpperAnimation(id);
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

  if(!hasUpperAnimation){
    clearUpperAnimation(id);
  }
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
const WS_URL = `ws://${location.hostname}:8000/ws`;
const ws = new WebSocket(WS_URL);ws.onopen=()=>{ document.getElementById('overlay').innerHTML='Connected'; ws.send('hello'); };
ws.onmessage = (e)=>{
  const state = JSON.parse(e.data);
  definitions = state.definitions || {};
  updateOverlay(state);
  updateDayNight(state.calendar);
  updateCars(state)
  updateBuses(state);
  updateMailboxes(state);
  updateResponders(state);
  updateProps(state);
  cleanupInteractionStates(state);
  for(const [id,c] of Object.entries(state.characters||{})) {
    updateSim(id,c);
  }
};

function animate(){

  requestAnimationFrame(animate);

  const delta = clock.getDelta();

  // update character mixers
  for(const id in characterControllers){

    const controller =
      characterControllers[id];

    if(!controller) continue;

    if(!controller.mixer) continue;

    controller.mixer.update(delta);
  }

  // update prop mixers
  update(delta);

  renderer.render(scene,camera);
}

initEditor({
  scene,
  camera,
  renderer,
  propRegistry,
  sims
});

animate();

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x20242a);

export const camera =
  new THREE.OrthographicCamera(
    -12,
    12,
    8,
    -8,
    0.1,
    1000
  );

camera.position.set(10,10,10);
camera.lookAt(0,0,0);

export const renderer =
  new THREE.WebGLRenderer({
    canvas: document.getElementById("c"),
    antialias: true
  });

renderer.setSize(
  innerWidth,
  innerHeight
);

window.addEventListener(
  "resize",
  ()=>{

    camera.updateProjectionMatrix();

    renderer.setSize(
      innerWidth,
      innerHeight
    );
  }
);

scene.add(
  new THREE.AmbientLight(
    0xffffff,
    0.5
  )
);

const light =
  new THREE.DirectionalLight(
    0xffffff,
    1
  );

light.position.set(5,10,5);

scene.add(light);

scene.add(
  new THREE.GridHelper(100,100)
);

const loader =
  new GLTFLoader();

const clock =
  new THREE.Clock();

export const sims = {};
export const propRegistry = {};
export const tileRegistry = {};

let definitions = {};


// =====================================================
// TILES
// =====================================================

function updateTiles(state){

  const tiles =
    Array.isArray(state.tiles)
    ? state.tiles
    : Object.values(state.tiles || {});

  const active = new Set();

  for(const tile of tiles){

    const key =
      `${tile.x},${tile.y}`;

    active.add(key);

    if(tileRegistry[key]){
      continue;
    }

    const mesh =
      new THREE.Mesh(

        new THREE.PlaneGeometry(1,1),

        new THREE.MeshStandardMaterial({

          color:
            tile.walkable
            ? 0x557799
            : 0xaa3333,

          side:
            THREE.DoubleSide
        })
      );

    mesh.rotation.x =
      -Math.PI / 2;

    mesh.position.set(
      tile.x - 10,
      0,
      tile.y - 7
    );

    scene.add(mesh);

    tileRegistry[key] = mesh;
  }

  for(const key in tileRegistry){

    if(active.has(key)){
      continue;
    }

    scene.remove(
      tileRegistry[key]
    );

    delete tileRegistry[key];
  }
}


// =====================================================
// PROPS
// =====================================================

function createFallbackProp(prop){

  const mesh =
    new THREE.Mesh(

      new THREE.BoxGeometry(1,1,1),

      new THREE.MeshStandardMaterial({
        color: 0xff00ff
      })
    );

  mesh.position.set(
    prop.x - 10,
    0.5,
    prop.y - 7
  );

  return mesh;
}

function loadProp(prop){

  const template =
    definitions
    ?.prop_templates
    ?.[prop.template];

  if(!template?.model){

    const mesh =
      createFallbackProp(prop);

    scene.add(mesh);

    propRegistry[prop.id] = {
      mesh,
      fallback: true
    };

    return;
  }

  loader.load(

    template.model,

    (gltf)=>{

      const model =
        gltf.scene;

      model.position.set(
        prop.x - 10,
        0,
        prop.y - 7
      );

      scene.add(model);

      propRegistry[prop.id] = {
        mesh: model,
        mixer:
          new THREE.AnimationMixer(model)
      };
    },

    undefined,

    ()=>{

      const mesh =
        createFallbackProp(prop);

      scene.add(mesh);

      propRegistry[prop.id] = {
        mesh,
        fallback: true
      };
    }
  );
}

function updateProps(state){

  for(const prop of state.props || []){

    if(!propRegistry[prop.id]){

      loadProp(prop);

      continue;
    }

    const mesh =
      propRegistry[prop.id].mesh;

    mesh.position.set(
      prop.x - 10,
      0,
      prop.y - 7
    );
  }
}


// =====================================================
// CHARACTERS
// =====================================================

function createFallbackCharacter(c){

  const mesh =
    new THREE.Mesh(

      new THREE.CapsuleGeometry(
        0.35,
        1
      ),

      new THREE.MeshStandardMaterial({
        color: 0x00ffff
      })
    );

  mesh.position.set(
    c.x - 10,
    1,
    c.y - 7
  );

  return mesh;
}

function createSim(id, c){

  const template =
    definitions
    ?.character_templates
    ?.[c.template];

  if(!template?.model){

    const mesh =
      createFallbackCharacter(c);

    scene.add(mesh);

    sims[id] = mesh;

    return;
  }

  loader.load(

    template.model,

    (gltf)=>{

      const model =
        gltf.scene;

      model.position.set(
        c.x - 10,
        0,
        c.y - 7
      );

      scene.add(model);

      sims[id] = model;
    },

    undefined,

    ()=>{

      const mesh =
        createFallbackCharacter(c);

      scene.add(mesh);

      sims[id] = mesh;
    }
  );
}

function updateCharacters(state){

  for(const [id,c] of Object.entries(
    state.characters || {}
  )){

    if(!sims[id]){

      createSim(id,c);

      continue;
    }

    sims[id].position.set(
      c.x - 10,
      0,
      c.y - 7
    );
  }
}


// =====================================================
// WS
// =====================================================

const ws =
  new WebSocket(
    `ws://${location.hostname}:8000/ws`
  );

ws.onmessage = (e)=>{

  const state =
    JSON.parse(e.data);

  definitions =
    state.definitions || {};

  updateTiles(state);

  updateProps(state);

  updateCharacters(state);
};


// =====================================================
// CAMERA
// =====================================================

let dragging = false;
let lastX = 0;
let lastY = 0;

renderer.domElement.addEventListener(
  "mousedown",
  (e)=>{

    dragging = true;

    lastX = e.clientX;
    lastY = e.clientY;
  }
);

window.addEventListener(
  "mouseup",
  ()=> dragging = false
);

window.addEventListener(
  "mousemove",
  (e)=>{

    if(!dragging){
      return;
    }

    const dx =
      e.clientX - lastX;

    const dy =
      e.clientY - lastY;

    camera.position.x -= dx * 0.02;
    camera.position.z -= dy * 0.02;

    lastX = e.clientX;
    lastY = e.clientY;
  }
);

window.addEventListener(
  "wheel",
  (e)=>{

    camera.zoom *=
      e.deltaY > 0
      ? 0.9
      : 1.1;

    camera.updateProjectionMatrix();
  }
);


// =====================================================
// LOOP
// =====================================================

function animate(){

  requestAnimationFrame(
    animate
  );

  const delta =
    clock.getDelta();

  for(const p of Object.values(
    propRegistry
  )){

    p.mixer?.update(delta);
  }

  renderer.render(
    scene,
    camera
  );
}

animate();
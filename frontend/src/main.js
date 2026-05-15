import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls }
from "three/examples/jsm/controls/OrbitControls.js";
const selectable = [];
const canvas = document.getElementById("c");
const raycaster =
  new THREE.Raycaster();

const mouse =
  new THREE.Vector2();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x20242a);


const floorRegistry = {};

const textureLoader =
  new THREE.TextureLoader();

const materialCache = {};

const camera = new THREE.OrthographicCamera(
  -20,
  20,
  12,
  -12,
  0.1,
  1000
);

camera.position.set(20, 20, 20);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true
});

renderer.setSize(window.innerWidth, window.innerHeight);

const controls = new OrbitControls(
  camera,
  renderer.domElement
);

controls.enableDamping = true;

window.addEventListener("resize", ()=>{

  renderer.setSize(
    window.innerWidth,
    window.innerHeight
  );

  camera.updateProjectionMatrix();
});

scene.add(
  new THREE.AmbientLight(0xffffff, 0.6)
);

const light = new THREE.DirectionalLight(
  0xffffff,
  1
);

light.position.set(10,20,10);

scene.add(light);

scene.add(
  new THREE.GridHelper(100,100)
);

const loader = new GLTFLoader();

const sims = {};
const props = {};
const tiles = {};

let definitions = {};

function getMaterialTexture(materialId){

  if(materialCache[materialId]){
    return materialCache[materialId];
  }

  const materialTemplate =
    definitions
    ?.material_templates
    ?.[materialId];

  if(!materialTemplate?.texture){
    return null;
  }

  const tex = textureLoader.load(
    materialTemplate.texture
  );

  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;

  tex.repeat.set(1,1);

  materialCache[materialId] = tex;

  return tex;
}

function createFloorMaterial(tileFloor){

  const texture =
    getMaterialTexture(
      tileFloor.material
    );

  if(texture){

    return new THREE.MeshStandardMaterial({
      map: texture
    });
  }

  let color = 0x777777;

  if(tileFloor.type === "grass"){
    color = 0x447744;
  }

  if(tileFloor.type === "staircase"){
    color = 0xaa8833;
  }

  return new THREE.MeshStandardMaterial({
    color
  });
}

function createFloorMesh(x, y, tileFloor){

  const geo =
    new THREE.PlaneGeometry(1,1);

  const mat =
    createFloorMaterial(tileFloor);

  const mesh =
    new THREE.Mesh(geo, mat);

  mesh.rotation.x =
    -Math.PI / 2;

  mesh.position.set(
    x - 10,
    0,
    y - 7
  );

  mesh.receiveShadow = true;

  return mesh;
}

function updateFloorplanFloors(state){

  const active = new Set();

  const floorplans =
    state.floorplans || [];

  for(const fp of floorplans){

    for(const key in fp.tiles){

      const tile = fp.tiles[key];

      if(!tile.floor) continue;

      const [x,y] = key
        .split(",")
        .map(Number);

      const worldKey =
        `${fp.id}_${x}_${y}`;

      active.add(worldKey);

      if(!floorRegistry[worldKey]){

        const mesh =
          createFloorMesh(
            x + fp.x,
            y + fp.y,
            tile.floor
          );

        scene.add(mesh);

        floorRegistry[worldKey] = mesh;
      }
    }
  }

  // cleanup
  for(const key in floorRegistry){

    if(active.has(key)) continue;

    scene.remove(
      floorRegistry[key]
    );

    delete floorRegistry[key];
  }
}


function createTile(tile){

  const mesh = new THREE.Mesh(

    new THREE.PlaneGeometry(1,1),

    new THREE.MeshStandardMaterial({

      color:
        tile.walkable
        ? 0x557799
        : 0xaa3333,

      side: THREE.DoubleSide
    })
  );

  mesh.rotation.x = -Math.PI / 2;

  mesh.position.set(
    tile.x - 10,
    0,
    tile.y - 7
  );
  mesh.userData = {

  type: "tile",

  x: tile.x,
  y: tile.y
};

selectable.push(mesh);
  scene.add(mesh);



  return mesh;
}

function updateTiles(state){

  const arr =
    Array.isArray(state.tiles)
    ? state.tiles
    : Object.values(state.tiles || {});

  for(const tile of arr){

    const key =
      `${tile.x},${tile.y}`;

    if(!tiles[key]){

      tiles[key] =
        createTile(tile);
    }
  }
}

function createFallbackProp(prop){

  const mesh = new THREE.Mesh(

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
  mesh.userData = {

    type: "prop",

    id: prop.id,

    template: prop.template
  };

  selectable.push(mesh);
  scene.add(mesh);

  return mesh;
}

function updateProps(state){

  for(const prop of state.props || []){

    if(props[prop.id]){

      props[prop.id].position.set(
        prop.x - 10,
        0.5,
        prop.y - 7
      );

      continue;
    }

    const template =
      definitions
      ?.prop_templates
      ?.[prop.template];

    if(!template?.model){

      props[prop.id] =
        createFallbackProp(prop);

      continue;
    }

    loader.load(

      template.model,

      (gltf)=>{

        const model = gltf.scene;

        model.position.set(
          prop.x - 10,
          0,
          prop.y - 7
        );
        model.userData = {

            type: "prop",

            id: prop.id,

            template: prop.template
          };

        selectable.push(model);
        scene.add(model);

        props[prop.id] = model;
      },

      undefined,

      ()=>{

        props[prop.id] =
          createFallbackProp(prop);
      }
    );
  }

   
}

function createFallbackCharacter(c){

  const mesh = new THREE.Mesh(

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
  mesh.userData = {

    type: "character",

    id: c.id,

    name: c.name
  };

  selectable.push(mesh);
  scene.add(mesh);

  return mesh;
}

function updateCharacters(state){

  for(const [id,c]
    of Object.entries(
      state.characters || {}
    )
  ){

    if(sims[id]){

      sims[id].position.set(
        c.x - 10,
        1,
        c.y - 7
      );

      continue;
    }

    const template =
      definitions
      ?.character_templates
      ?.[c.template];

    if(!template?.model){

      sims[id] =
        createFallbackCharacter(c);

      continue;
    }

    loader.load(

      template.model,

      (gltf)=>{

        const model = gltf.scene;

        model.position.set(
          c.x - 10,
          0,
          c.y - 7
        );
        model.userData = {

          type: "character",

          id: c.id,

          name: c.name
        };

        selectable.push(model);
        scene.add(model);

        sims[id] = model;
      },

      undefined,

      ()=>{

        sims[id] =
          createFallbackCharacter(c);
      }
    );
  }
}
renderer.domElement.addEventListener(

  "pointerdown",

  (event)=>{

    mouse.x =
      (event.clientX /
      window.innerWidth) * 2 - 1;

    mouse.y =
      -(event.clientY /
      window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(
      mouse,
      camera
    );

    const hits =
      raycaster.intersectObjects(
        selectable,
        true
      );

    if(!hits.length){

      document
        .getElementById(
          "viewerSelection"
        ).innerHTML =
          "Nothing selected";

      return;
    }

    let obj = hits[0].object;

    while(
      obj &&
      !obj.userData?.type
    ){
      obj = obj.parent;
    }

    if(!obj) return;

    const d = obj.userData;

    document
      .getElementById(
        "viewerSelection"
      ).innerHTML = `

        <b>${d.type}</b><br>

        ${d.id || ""}<br>

        ${d.name || ""}
      `;
  }
);
const ws = new WebSocket(
  `ws://${location.hostname}:8000/ws`
);

ws.onmessage = (e)=>{

  const state =
    JSON.parse(e.data);

  definitions =
    state.definitions || {};

  updateTiles(state);
  updateProps(state);
  updateFloorplanFloors(state);
  updateCharacters(state);
};

function animate(){

  requestAnimationFrame(animate);
  controls.update();
  renderer.render(
    scene,
    camera
  );
}

animate();
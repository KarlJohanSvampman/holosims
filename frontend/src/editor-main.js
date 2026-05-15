import * as THREE from "three";
import { OrbitControls }
from "three/examples/jsm/controls/OrbitControls.js";

const canvas =
  document.getElementById("c");

const scene =
  new THREE.Scene();

scene.background =
  new THREE.Color(0x20242a);

const camera =
  new THREE.PerspectiveCamera(
    60,
    window.innerWidth /
    window.innerHeight,
    0.1,
    1000
  );

camera.position.set(10,10,10);

const renderer =
  new THREE.WebGLRenderer({

    canvas,
    antialias: true
  });

renderer.setSize(
  window.innerWidth,
  window.innerHeight
);

const controls =
  new OrbitControls(
    camera,
    renderer.domElement
  );

controls.enableDamping = true;

scene.add(
  new THREE.AmbientLight(
    0xffffff,
    1
  )
);

scene.add(
  new THREE.GridHelper(100,100)
);

const raycaster =
  new THREE.Raycaster();

const mouse =
  new THREE.Vector2();

const tiles = {};

function createTile(x,y){

  const mesh =
    new THREE.Mesh(

      new THREE.PlaneGeometry(1,1),

      new THREE.MeshBasicMaterial({

        color: 0x557799,

        side:
          THREE.DoubleSide
      })
    );

  mesh.rotation.x =
    -Math.PI / 2;

  mesh.position.set(x,0,y);

  mesh.userData = {

    type: "tile",

    x,
    y
  };

  scene.add(mesh);

  tiles[`${x},${y}`] = mesh;
}

for(let x=-20;x<20;x++){

  for(let y=-20;y<20;y++){

    createTile(x,y);
  }
}

renderer.domElement
.addEventListener(

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
        Object.values(tiles)
      );

    if(!hits.length){
      return;
    }

    const tile =
      hits[0].object;

    document
      .getElementById(
        "editorSelection"
      ).innerHTML = `

        <b>Tile</b><br>

        ${tile.userData.x},
        ${tile.userData.y}
      `;

    document
      .getElementById(
        "inspectorContent"
      ).innerHTML = `

        <h3>Tile</h3>

        X:
        ${tile.userData.x}

        <br>

        Y:
        ${tile.userData.y}
      `;
  }
);

function animate(){

  requestAnimationFrame(
    animate
  );

  controls.update();

  renderer.render(
    scene,
    camera
  );
}

animate();
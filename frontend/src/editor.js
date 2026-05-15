import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export let editorState = {
  selected: null,
  mode: "select",
  hovered: null
};

export function initEditor({
  scene,
  camera,
  renderer,
  propRegistry,
  sims
}) {

  // =====================================
  // ORBIT CONTROLS
  // =====================================

  const controls = new OrbitControls(
    camera,
    renderer.domElement
  );

  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  // =====================================
  // RAYCASTING
  // =====================================

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  renderer.domElement.addEventListener(
    "pointerdown",
    (event)=>{

      mouse.x =
        (event.clientX / window.innerWidth) * 2 - 1;

      mouse.y =
        -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(
        mouse,
        camera
      );

      const objects = [];

      // props
      for(const id in propRegistry){

        const p = propRegistry[id];

        if(p?.mesh){

          p.mesh.userData.editor = {
            type: "prop",
            id
          };

          objects.push(p.mesh);
        }
      }

      // tiles
      for(const key in window.tileRegistry){

        const tile =
          window.tileRegistry[key];

        if(tile){

          objects.push(tile);
        }
      }



      // sims
      for(const id in sims){

        const s = sims[id];

        if(s){

          s.userData.editor = {
            type: "character",
            id
          };

          objects.push(s);
        }
      }

      const hits =
        raycaster.intersectObjects(
          objects,
          true
        );

      if(!hits.length){

        clearSelection();
        return;
      }

      let o = hits[0].object;

      while(o){

        if(o.userData?.editor){

          selectObject(
            o.userData.editor
          );

          return;
        }

        o = o.parent;
      }
    }
  );

  // =====================================
  // SELECTION HIGHLIGHT
  // =====================================


function selectObject(data){

  editorState.selected = data;

  const panel =
    document.getElementById(
      "editorSelection"
    );

  const inspector =
    document.getElementById(
      "inspectorContent"
    );

  if(!inspector){
    console.warn(
      "Missing inspectorContent element"
    );
    return;
  }

  if(panel){

    panel.innerHTML = `
      <b>${data.type}</b><br>
      ${data.id || ""}
    `;
  }

  // =====================================
  // TILE
  // =====================================

  if(data.type === "tile"){

    inspector.innerHTML = `

      <h4>Tile</h4>

      x: ${data.x}<br>
      y: ${data.y}<br><br>

      <button id="paintFloor">
        Paint Floor
      </button>

      <button id="paintGrass">
        Paint Grass
      </button>
    `;

    // -------------------------
    // EVENTS
    // -------------------------

    document
      .getElementById("paintFloor")
      ?.addEventListener(
        "click",
        ()=>{

          console.log(
            "paint floor",
            data
          );
        }
      );

    document
      .getElementById("paintGrass")
      ?.addEventListener(
        "click",
        ()=>{

          console.log(
            "paint grass",
            data
          );
        }
      );

    return;
  }

  // =====================================
  // PROP
  // =====================================

  if(data.type === "prop"){

    inspector.innerHTML = `

      <h4>Prop</h4>

      ID: ${data.id}<br><br>

      <button id="deleteProp">
        Delete
      </button>

      <button id="rotateProp">
        Rotate
      </button>
    `;

    // -------------------------
    // DELETE
    // -------------------------

    document
      .getElementById("deleteProp")
      ?.addEventListener(
        "click",
        ()=>{

          console.log(
            "delete prop",
            data.id
          );
        }
      );

    // -------------------------
    // ROTATE
    // -------------------------

    document
      .getElementById("rotateProp")
      ?.addEventListener(
        "click",
        ()=>{

          console.log(
            "rotate prop",
            data.id
          );
        }
      );

    return;
  }

  // =====================================
  // CHARACTER
  // =====================================

  if(data.type === "character"){

    inspector.innerHTML = `

      <h4>Character</h4>

      ID: ${data.id}<br><br>

      <button id="focusCharacter">
        Focus Camera
      </button>
    `;

    document
      .getElementById("focusCharacter")
      ?.addEventListener(
        "click",
        ()=>{

          console.log(
            "focus character",
            data.id
          );
        }
      );

    return;
  }

  // =====================================
  // FALLBACK
  // =====================================

  inspector.innerHTML = `
    <i>No inspector available</i>
  `;
}


  function clearSelection(){

    editorState.selected = null;

    const panel =
      document.getElementById(
        "editorSelection"
      );

    if(panel){

      panel.innerHTML =
        "Nothing selected";
    }
  }

  // =====================================
  // DEBUG OVERLAY
  // =====================================

  const debug =
    document.createElement("div");

  debug.style.position = "fixed";
  debug.style.bottom = "10px";
  debug.style.left = "10px";
  debug.style.padding = "8px";
  debug.style.background =
    "rgba(0,0,0,0.7)";
  debug.style.color = "white";
  debug.style.fontFamily =
    "monospace";
  debug.style.fontSize = "12px";
  debug.style.zIndex = "9999";

  document.body.appendChild(debug);

  // =====================================
  // UPDATE LOOP
  // =====================================

  function update(){

    controls.update();

    debug.innerHTML = `
      props:
      ${Object.keys(propRegistry).length}
      <br>
      sims:
      ${Object.keys(sims).length}
      <br>
      selected:
      ${editorState.selected
        ? editorState.selected.id
        : "none"}
    `;

    requestAnimationFrame(update);
  }

  update();
}

